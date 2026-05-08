"""
Fallout 4 Tutorial Helper — operators.py
All bpy.types.Operator subclasses for the FO4 pipeline add-on.
Includes: FO4 scene setup, NIF export preparation, collision generator,
UV/texture validation, and the CK Cell → Blender cell import operator.
"""

import bpy
import os
import json
import math
from bpy.props import StringProperty, BoolProperty, FloatProperty
from bpy.types import Operator

# Mossy bridge — bundled with the add-on; gracefully absent if unavailable.
try:
    from . import mossy_link as _mossy
    _MOSSY_AVAILABLE = True
except ImportError:
    _mossy = None  # type: ignore[assignment]
    _MOSSY_AVAILABLE = False


# ---------------------------------------------------------------------------
# FO4 Scene Setup
# ---------------------------------------------------------------------------

class FO4_OT_setup_scene(Operator):
    """Set Blender scene to Fallout 4 standards (metric, 1.0 scale, 30 FPS, 18 mm FOV)"""
    bl_idname = "fo4.setup_scene"
    bl_label = "Set FO4 Scene Standards"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        scene = context.scene
        scene.unit_settings.system = 'METRIC'
        scene.unit_settings.scale_length = 1.0
        scene.unit_settings.length_unit = 'CENTIMETERS'
        scene.render.fps = 30
        for area in context.screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == 'VIEW_3D':
                        space.lens = 18.0
        self.report({'INFO'}, "FO4 scene standards applied (Metric, 1.0 scale, 30 FPS, 18 mm)")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Apply All Transforms
# ---------------------------------------------------------------------------

class FO4_OT_apply_transforms(Operator):
    """Apply all transforms to selected objects (required before NIF export)"""
    bl_idname = "fo4.apply_transforms"
    bl_label = "Apply All Transforms"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        self.report({'INFO'}, "All transforms applied to selected objects")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# NIF Export Preparation Checker
# ---------------------------------------------------------------------------

class FO4_OT_check_nif_ready(Operator):
    """Check selected objects are ready for PyNifly NIF export"""
    bl_idname = "fo4.check_nif_ready"
    bl_label = "Check NIF Export Readiness"

    def execute(self, context):
        issues = []
        for obj in context.selected_objects:
            if obj.type != 'MESH':
                continue
            # Check for unapplied scale
            if any(abs(s - 1.0) > 0.001 for s in obj.scale):
                issues.append(f"{obj.name}: scale not applied {tuple(round(s,3) for s in obj.scale)}")
            # Check for unapplied rotation
            if any(abs(r) > 0.001 for r in obj.rotation_euler):
                issues.append(f"{obj.name}: rotation not applied")
            # Check UV maps exist
            if not obj.data.uv_layers:
                issues.append(f"{obj.name}: no UV map")
            # Check normals are consistent (custom normal check)
            obj.data.calc_normals_split()
            if len(obj.data.loops) == 0:
                issues.append(f"{obj.name}: no geometry")

        if issues:
            for issue in issues:
                self.report({'WARNING'}, issue)
            self.report({'ERROR'}, f"{len(issues)} issue(s) found — fix before exporting NIF")
            if _MOSSY_AVAILABLE and _mossy:
                for issue in issues:
                    _mossy.log_to_mossy('warning', issue, {'operator': 'check_nif_ready'})
        else:
            self.report({'INFO'}, "All selected objects pass NIF export checks ✓")
            if _MOSSY_AVAILABLE and _mossy:
                _mossy.log_to_mossy('info', 'NIF export check passed ✓', {
                    'operator': 'check_nif_ready',
                    'object_count': len([o for o in context.selected_objects if o.type == 'MESH']),
                })
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Collision Mesh Generator
# ---------------------------------------------------------------------------

class FO4_OT_generate_collision(Operator):
    """Generate a convex collision mesh for the active object (FO4 bhkConvexVerticesShape naming)"""
    bl_idname = "fo4.generate_collision"
    bl_label = "Generate Convex Collision"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        # Duplicate and decimate for convex hull collision
        bpy.ops.object.duplicate()
        coll_obj = context.active_object
        coll_obj.name = f"bhkConvexVerticesShape_{obj.name}"

        # Add convex hull modifier
        decimate = coll_obj.modifiers.new(name="Decimate", type='DECIMATE')
        decimate.ratio = 0.1
        decimate.use_collapse_triangulate = True

        # Move to collision layer / collection
        coll_obj.display_type = 'WIRE'
        self.report({'INFO'}, f"Collision mesh created: {coll_obj.name} (apply Decimate before export)")
        if _MOSSY_AVAILABLE and _mossy:
            _mossy.send_event('collision_generated', {'source': obj.name, 'collision': coll_obj.name})
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# UV / Texture Validation
# ---------------------------------------------------------------------------

class FO4_OT_validate_uvs(Operator):
    """Check UV maps on selected objects for FO4 compatibility"""
    bl_idname = "fo4.validate_uvs"
    bl_label = "Validate UVs"

    def execute(self, context):
        issues = []
        for obj in context.selected_objects:
            if obj.type != 'MESH':
                continue
            mesh = obj.data
            if not mesh.uv_layers:
                issues.append(f"{obj.name}: missing UV map")
                continue
            # Check for overlapping/out-of-bounds UVs
            uv_layer = mesh.uv_layers.active
            if uv_layer:
                for loop in mesh.loops:
                    uv = uv_layer.data[loop.index].uv
                    if uv.x < -0.01 or uv.x > 1.01 or uv.y < -0.01 or uv.y > 1.01:
                        issues.append(f"{obj.name}: UV coordinates out of [0,1] range")
                        break

        if issues:
            for issue in issues:
                self.report({'WARNING'}, issue)
        else:
            self.report({'INFO'}, "UV validation passed for all selected objects ✓")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# CK Cell Import — reads xEdit REFR JSON and places NIFs via PyNifly
# ---------------------------------------------------------------------------

class FO4_OT_import_cell_refs(Operator):
    """Import a Fallout 4 cell reference layout from an xEdit-exported JSON file.
    Requires PyNifly to be installed. Places each NIF at its in-game position."""
    bl_idname = "fo4.import_cell_refs"
    bl_label = "Import CK Cell References"
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(
        name="Cell JSON File",
        description="Path to the xEdit-exported cell_refs.json file",
        subtype='FILE_PATH',
    )
    assets_root: StringProperty(
        name="Assets Root",
        description="Root folder containing extracted Meshes\\ directory",
        subtype='DIR_PATH',
    )

    def invoke(self, context, event):
        # Auto-populate assets_root from Mossy settings when not already set
        if not self.assets_root:
            prefs_addon = context.preferences.addons.get(__package__)
            saved_root = prefs_addon.preferences.assets_root if prefs_addon else ''
            if not saved_root and _MOSSY_AVAILABLE and _mossy:
                self.assets_root = _mossy.get_tool_path('fallout4Path') or ''
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        if not self.filepath or not os.path.isfile(self.filepath):
            self.report({'ERROR'}, f"JSON file not found: {self.filepath}")
            return {'CANCELLED'}

        # Check PyNifly 25+ is available (Blender 4.4+ Extensions system)
        has_pynifly = (
            hasattr(bpy.ops, 'import_scene') and
            hasattr(bpy.ops.import_scene, 'pynifly')
        )
        if not has_pynifly:
            self.report({'ERROR'},
                "PyNifly 25+ not found. Install PyNifly from Nexus #52319 "
                "(requires Blender 4.4+ and the Blender Extensions system).")
            return {'CANCELLED'}

        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                refs = json.load(f)
        except Exception as e:
            self.report({'ERROR'}, f"Failed to parse JSON: {e}")
            return {'CANCELLED'}

        assets_root = self.assets_root or os.path.dirname(self.filepath)
        imported = 0
        skipped = 0

        for ref in refs:
            model_rel = ref.get('model', '')
            if not model_rel:
                skipped += 1
                continue

            # Normalise path separators
            model_rel = model_rel.replace('\\', os.sep).replace('/', os.sep)
            nif_path = os.path.join(assets_root, 'Meshes', model_rel)

            if not os.path.isfile(nif_path):
                # Try case-insensitive search on Linux/Mac
                nif_path = _find_case_insensitive(os.path.join(assets_root, 'Meshes'), model_rel)

            if not nif_path or not os.path.isfile(nif_path):
                self.report({'WARNING'}, f"NIF not found: {model_rel}")
                skipped += 1
                continue

            # Import NIF via PyNifly
            try:
                bpy.ops.import_scene.pynifly(filepath=nif_path, game_type='FO4')
            except Exception as e:
                self.report({'WARNING'}, f"PyNifly 25 import failed for {model_rel}: {e}")
                skipped += 1
                continue

            # Position, rotate, scale the imported objects
            pos = ref.get('pos', [0, 0, 0])
            rot = ref.get('rot', [0, 0, 0])
            scale = ref.get('scale', 1.0)
            edid = ref.get('editorID', 'Unknown')

            # FO4 units → Blender: divide by 100 (1 FO4 unit ≈ 1 cm → 0.01 m)
            # Rotation in FO4 is in radians
            for obj in context.selected_objects:
                obj.location = (pos[0] / 100.0, pos[1] / 100.0, pos[2] / 100.0)
                obj.rotation_euler = (rot[0], rot[1], rot[2])
                obj.scale = (scale, scale, scale)
                obj.name = edid if edid else obj.name

            imported += 1

        self.report({'INFO'},
            f"Cell import complete: {imported} objects placed, {skipped} skipped (missing NIF or error)")
        if _MOSSY_AVAILABLE and _mossy:
            _mossy.send_event('cell_imported', {
                'json_file': self.filepath,
                'imported': imported,
                'skipped': skipped,
            })
        return {'FINISHED'}


def _find_case_insensitive(base: str, rel_path: str) -> str:
    """Try to find a file with case-insensitive path matching."""
    parts = rel_path.replace('\\', '/').split('/')
    current = base
    for part in parts:
        if not os.path.isdir(current):
            return ''
        try:
            entries = {e.lower(): e for e in os.listdir(current)}
            match = entries.get(part.lower())
            if match:
                current = os.path.join(current, match)
            else:
                return ''
        except OSError:
            return ''
    return current


# ---------------------------------------------------------------------------
# Export Cell Reference Positions Back to JSON (for xEdit re-import)
# ---------------------------------------------------------------------------

class FO4_OT_export_cell_refs(Operator):
    """Export selected objects' positions as a cell_refs.json for xEdit re-import.
    Produces the same format as the Mossy ExportCellRefsToJSON.pas xEdit script."""
    bl_idname = "fo4.export_cell_refs"
    bl_label = "Export Cell Positions to JSON"

    filepath: StringProperty(
        name="Output JSON",
        description="Where to save the exported cell references",
        subtype='FILE_PATH',
        default="cell_refs_modified.json",
    )

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        refs = []
        for obj in context.selected_objects:
            if obj.type != 'MESH':
                continue
            pos = obj.location
            rot = obj.rotation_euler
            scale_val = (obj.scale.x + obj.scale.y + obj.scale.z) / 3.0
            refs.append({
                "editorID": obj.name,
                "model": "",  # user must fill in model path
                "pos": [round(pos.x * 100, 4), round(pos.y * 100, 4), round(pos.z * 100, 4)],
                "rot": [round(rot.x, 6), round(rot.y, 6), round(rot.z, 6)],
                "scale": round(scale_val, 4),
            })

        try:
            with open(self.filepath, 'w', encoding='utf-8') as f:
                json.dump(refs, f, indent=2)
            self.report({'INFO'}, f"Exported {len(refs)} references to {self.filepath}")
            if _MOSSY_AVAILABLE and _mossy:
                _mossy.send_event('cell_exported', {
                    'json_file': self.filepath,
                    'ref_count': len(refs),
                })
        except Exception as e:
            self.report({'ERROR'}, f"Export failed: {e}")
            if _MOSSY_AVAILABLE and _mossy:
                _mossy.log_to_mossy('error', f"Cell export failed: {e}", {'operator': 'export_cell_refs'})
            return {'CANCELLED'}

        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Mossy Sync — pulls all tool/game paths from Mossy into add-on preferences
# ---------------------------------------------------------------------------

class FO4_OT_sync_from_mossy(Operator):
    """Sync add-on settings from the Mossy desktop app (assets root, PyTorch path, etc.)"""
    bl_idname = "fo4.sync_from_mossy"
    bl_label = "Sync from Mossy"

    def execute(self, context):
        if not _MOSSY_AVAILABLE or not _mossy:
            self.report({'ERROR'}, "mossy_link module not available in this add-on")
            return {'CANCELLED'}

        status = _mossy.get_status()
        if not status.get('running'):
            self.report({'WARNING'}, "Mossy is not running — open the Mossy desktop app first")
            return {'CANCELLED'}

        prefs_addon = context.preferences.addons.get(__package__)
        if not prefs_addon:
            self.report({'WARNING'}, "Add-on preferences not found")
            return {'CANCELLED'}

        paths = _mossy.get_tool_paths()
        synced = []

        # Sync assets_root from fallout4Path if preferences field is empty
        if not prefs_addon.preferences.assets_root and paths.get('fallout4Path'):
            prefs_addon.preferences.assets_root = paths['fallout4Path']
            synced.append(f"Assets root → {paths['fallout4Path']}")

        # Inject PyTorch into sys.path
        if _mossy.setup_pytorch():
            synced.append("PyTorch path injected into sys.path")

        if synced:
            msg = "Synced from Mossy: " + "; ".join(synced)
        else:
            msg = f"Connected to Mossy v{status.get('version', '?')} — no new settings to sync"

        self.report({'INFO'}, msg)
        _mossy.log_to_mossy('info', msg, {'operator': 'sync_from_mossy'})
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

classes = (
    FO4_OT_setup_scene,
    FO4_OT_apply_transforms,
    FO4_OT_check_nif_ready,
    FO4_OT_generate_collision,
    FO4_OT_validate_uvs,
    FO4_OT_import_cell_refs,
    FO4_OT_export_cell_refs,
    FO4_OT_sync_from_mossy,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
