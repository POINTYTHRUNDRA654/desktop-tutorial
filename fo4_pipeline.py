"""
fo4_pipeline.py
===============
One-click automated pipeline operators for Fallout 4 mod creation.

Every pipeline function follows the same contract:
  load mesh → validate → auto-fix → export → done.

The user loads their mesh into Blender, selects it, and clicks a single
button.  The pipeline handles every preparation step automatically:
  1. Validate the mesh against FO4 limits
  2. Auto-fix common issues (apply transforms, triangulate, merge doubles,
     smooth normals, ensure UV map, remove loose geometry)
  3. Generate UCX_ collision if not present
  4. Export via the best available exporter (PyNifly → Niftools → native
     NIF writer → FBX fallback)
  5. Export matching BGSM material file(s)
  6. Report what was done and any remaining issues

Supported pipelines (one operator per workflow):
  FO4_OT_PipelineStaticMesh   — static prop / world object (BSTriShape)
  FO4_OT_PipelineArmor        — wearable armor / outfit (BSSubIndexTriShape)
  FO4_OT_PipelineWeapon       — weapon mesh
  FO4_OT_PipelineFlora        — tree / plant / vegetation (wind-weighted)
  FO4_OT_PipelineNavMesh      — navmesh validation + export
  FO4_OT_PipelineTRIMorphs    — shape-key → .tri morph export
  FO4_OT_PipelineTextures     — texture auto-naming + DDS conversion
  FO4_OT_PipelineFullMod      — complete mod package (mesh + BGSM + FOMOD)
"""

from __future__ import annotations

import os
from .path_utils import system_drive_root as _system_root
import traceback

try:
    import bpy
    from bpy.types import Operator
    from bpy.props import StringProperty, BoolProperty, FloatProperty, EnumProperty
except ImportError:
    bpy = None  # type: ignore[assignment]
    Operator = object  # type: ignore[assignment]

# ── FO4 limits (sourced from fo4/__init__.py constants) ───────────────────────
_FO4_MAX_VERTS   = 65535
_FO4_WARN_VERTS  = 32000
_FO4_MAX_TRIS    = 65535
_FO4_WARN_TRIS   = 20000
_FO4_MAX_BONES   = 4      # bone influences per vertex


# ── Shared pipeline helpers ────────────────────────────────────────────────────

def _get_active_mesh(context) -> "tuple[object | None, str]":
    """Return (obj, error_msg).  obj is None when there is no valid selection."""
    obj = context.active_object
    if obj is None:
        return None, "No active object. Select a mesh first."
    if obj.type != 'MESH':
        return None, f"Active object '{obj.name}' is not a mesh."
    return obj, ""


def _apply_transforms(obj) -> list:
    """Apply location/rotation/scale. Returns list of steps taken."""
    steps = []
    import mathutils
    if obj.location.length > 0.001:
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        steps.append("Applied location (origin moved to world 0,0,0)")
    s = obj.scale
    if abs(s.x - 1.0) > 0.001 or abs(s.y - 1.0) > 0.001 or abs(s.z - 1.0) > 0.001:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        steps.append(f"Applied scale ({s.x:.3f}, {s.y:.3f}, {s.z:.3f}) → (1,1,1)")
    r = obj.rotation_euler
    if abs(r.x) > 0.001 or abs(r.y) > 0.001 or abs(r.z) > 0.001:
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        steps.append("Applied rotation")
    return steps


def _triangulate(obj) -> str:
    """Add Triangulate modifier if mesh has quads/ngons. Returns status string."""
    import bmesh as _bmesh
    me = obj.data
    bm = _bmesh.new()
    bm.from_mesh(me)
    non_tri = [f for f in bm.faces if len(f.verts) != 3]
    count = len(non_tri)
    bm.free()
    if count == 0:
        return "All faces are already triangles ✓"
    # Apply triangulation via modifier (non-destructive then apply)
    mod = obj.modifiers.new("FO4_Triangulate", 'TRIANGULATE')
    mod.quad_method = 'BEAUTY'
    mod.ngon_method = 'BEAUTY'
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return f"Triangulated {count} non-triangle face(s)"


def _ensure_uv(obj) -> str:
    """Ensure object has at least one UV map named 'UVMap'."""
    me = obj.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
        return "Created missing UV map 'UVMap'"
    if me.uv_layers.active.name != "UVMap":
        me.uv_layers.active.name = "UVMap"
        return "Renamed UV map to 'UVMap' (FO4 convention)"
    return "UV map 'UVMap' present ✓"


def _merge_doubles(obj, threshold: float = 0.0001) -> str:
    """Merge vertices closer than threshold. Returns status string."""
    import bmesh as _bmesh
    me = obj.data
    bm = _bmesh.new()
    bm.from_mesh(me)
    n_before = len(bm.verts)
    _bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=threshold)
    n_after = len(bm.verts)
    bm.to_mesh(me)
    me.update()
    bm.free()
    merged = n_before - n_after
    if merged:
        return f"Merged {merged} near-duplicate vertex/vertices"
    return "No duplicate vertices found ✓"


def _smooth_normals(obj) -> str:
    """Set smooth shading and recalculate normals outward."""
    bpy.ops.object.shade_smooth()
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return "Smooth shading + consistent normals applied"


def _check_vert_limit(obj) -> list:
    """Return list of warning/error strings about vertex/tri counts."""
    msgs = []
    me = obj.data
    n_verts = len(me.vertices)
    n_tris = sum(1 for p in me.polygons for _ in p.loop_indices) // 3
    if n_verts > _FO4_MAX_VERTS:
        msgs.append(f"ERROR: {n_verts} vertices exceeds FO4 limit ({_FO4_MAX_VERTS}). "
                    "Use 'Split Mesh at Poly Limit' before export.")
    elif n_verts > _FO4_WARN_VERTS:
        msgs.append(f"WARNING: {n_verts} vertices is high — consider LODs.")
    if n_tris > _FO4_WARN_TRIS:
        msgs.append(f"WARNING: ~{n_tris} triangles — performance may suffer in-game.")
    return msgs


def _ensure_material(obj) -> str:
    """Ensure object has at least one material slot."""
    if not obj.data.materials or obj.data.materials[0] is None:
        mat = bpy.data.materials.new(name=f"{obj.name}_FO4Mat")
        mat.use_nodes = True
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
        return f"Created placeholder material '{mat.name}'"
    return f"Material '{obj.data.materials[0].name}' present ✓"


def _auto_name_textures(obj) -> list:
    """
    Auto-name texture image nodes to follow FO4 conventions (_d, _n, _s suffixes).
    Returns list of rename actions taken.
    """
    actions = []
    for slot in obj.material_slots:
        mat = slot.material
        if not mat or not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type != 'TEX_IMAGE' or not node.image:
                continue
            img = node.image
            name = img.name
            # Skip already-named textures
            if any(name.endswith(s) for s in ('_d', '_n', '_s', '_g', '_em')):
                continue
            # Infer slot from node label or links
            label = node.label.lower()
            if 'diffuse' in label or 'albedo' in label or 'color' in label:
                new_name = name.rsplit('.', 1)[0] + '_d'
                img.name = new_name
                actions.append(f"Renamed '{name}' → '{new_name}' (diffuse slot 0)")
            elif 'normal' in label or 'bump' in label:
                new_name = name.rsplit('.', 1)[0] + '_n'
                img.name = new_name
                actions.append(f"Renamed '{name}' → '{new_name}' (normal slot 1)")
            elif 'specular' in label or 'spec' in label or 'rough' in label:
                new_name = name.rsplit('.', 1)[0] + '_s'
                img.name = new_name
                actions.append(f"Renamed '{name}' → '{new_name}' (specular slot 2)")
            elif 'glow' in label or 'emit' in label:
                new_name = name.rsplit('.', 1)[0] + '_g'
                img.name = new_name
                actions.append(f"Renamed '{name}' → '{new_name}' (glow slot 3)")
    return actions


def _do_nif_export(obj, filepath: str) -> tuple:
    """
    Export *obj* to NIF using the best available exporter.

    Priority: PyNifly → Niftools → native_nif_writer → FBX fallback.
    Returns (success: bool, exporter_used: str, message: str).
    """
    try:
        from . import export_helpers
        ok, issues = export_helpers.ExportHelpers.validate_before_export(obj)
        if not ok:
            # Non-fatal: log but proceed
            print(f"[FO4 Pipeline] Pre-export validation warnings: {issues}")

        result = export_helpers.ExportHelpers.export_mesh_to_nif(obj, filepath)
        if isinstance(result, tuple):
            success, msg = result
        else:
            success = result in ({'FINISHED'}, 'FINISHED')
            msg = str(result)
        return success, "export_helpers", msg
    except Exception as e:
        return False, "export_helpers", f"export_helpers error: {e}"


def _do_bgsm_export(obj, output_dir: str) -> tuple:
    """Export BGSM material file(s) for *obj*. Returns (success, message)."""
    try:
        from . import bgsm_helpers
        exported = []
        for i, slot in enumerate(obj.material_slots):
            mat = slot.material
            if not mat:
                continue
            bgsm_data = bgsm_helpers.blender_mat_to_bgsm(mat)
            mat_name = mat.name.replace(" ", "_").lower()
            bgsm_path = os.path.join(output_dir, f"{mat_name}.bgsm")
            bgsm_helpers.write_bgsm(bgsm_data, bgsm_path)
            exported.append(bgsm_path)
        if exported:
            return True, f"Exported {len(exported)} .bgsm file(s)"
        return True, "No materials to export as BGSM"
    except Exception as e:
        return False, f"BGSM export error: {e}"


def _mossy_advice(obj, issues: list) -> str:
    """Ask Mossy AI for advice on the given issues (non-blocking, returns '' if offline)."""
    if not issues:
        return ""
    try:
        from . import mossy_link
        query = (
            f"I have a Fallout 4 mesh '{obj.name}' with these issues after auto-prep:\n"
            + "\n".join(f"  - {i}" for i in issues)
            + "\nWhat should I do to fix these before exporting to NIF?"
        )
        answer = mossy_link.ask_mossy_fo4(query, mesh_obj=obj, issues=issues, timeout=10)
        return answer or ""
    except Exception:
        return ""


def _report(self, steps: list, warnings: list, errors: list, mossy_tip: str = "") -> None:
    """Emit operator reports summarising the pipeline run."""
    for step in steps:
        self.report({'INFO'}, f"✓ {step}")
    for w in warnings:
        self.report({'WARNING'}, w)
    for e in errors:
        self.report({'ERROR'}, e)
    if mossy_tip:
        self.report({'INFO'}, f"Mossy AI: {mossy_tip[:200]}")


# ══════════════════════════════════════════════════════════════════════════════
# Pipeline operators
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_PipelineStaticMesh(Operator):
    """
    One-click FO4 static mesh pipeline.

    Automatically: validate → apply transforms → triangulate → merge doubles
    → smooth normals → ensure UV → generate collision → export NIF + BGSM.
    """
    bl_idname  = "fo4.pipeline_static_mesh"
    bl_label   = "Export Static Mesh (Full Pipeline)"
    bl_description = (
        "Automatically prepare and export the selected mesh as a Fallout 4 "
        "static prop NIF. Applies transforms, triangulates, generates UCX_ "
        "collision, and exports NIF + BGSM in one click."
    )
    bl_options = {'REGISTER', 'UNDO'}

    mod_folder: StringProperty(
        name="Mod Output Folder",
        description=(
            "Your mod's root staging folder (e.g. C:/MO2/mods/MyMod). "
            "NIF exports to [folder]/Data/Meshes/ — never into the game folder directly."
        ),
        default="",
        subtype='DIR_PATH',
    )
    filepath: StringProperty(
        name="NIF Output Path",
        description="Full path for the exported NIF (auto-built from Mod Folder)",
        default="",
        subtype='FILE_PATH',
    )
    export_bgsm: BoolProperty(
        name="Export BGSM",
        description="Also export matching .bgsm material file(s)",
        default=True,
    )
    generate_collision: BoolProperty(
        name="Generate Collision",
        description="Auto-generate UCX_ convex collision if not present",
        default=True,
    )
    simplify_ratio: FloatProperty(
        name="Collision Simplify",
        description="Decimate ratio for generated collision mesh (1.0 = full detail)",
        default=0.25,
        min=0.05,
        max=1.0,
    )

    def invoke(self, context, event):
        if not self.mod_folder:
            blend_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else ""
            self.mod_folder = blend_dir or _system_root()
        if not self.filepath:
            obj = context.active_object
            name = obj.name if obj else "mesh"
            self.filepath = os.path.join(
                self.mod_folder, "Data", "Meshes", f"{name}.nif"
            )
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        obj, err = _get_active_mesh(context)
        if obj is None:
            self.report({'ERROR'}, err)
            return {'CANCELLED'}

        steps, warnings, errors = [], [], []

        # ── Step 1: Validate ──────────────────────────────────────────────────
        try:
            from . import mesh_helpers
            ok, issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
            if not ok:
                warnings.extend(issues)
        except Exception as e:
            warnings.append(f"Validation skipped: {e}")

        # ── Step 2: Apply transforms ──────────────────────────────────────────
        try:
            context.view_layer.objects.active = obj
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            taken = _apply_transforms(obj)
            steps.extend(taken or ["Transforms already clean ✓"])
        except Exception as e:
            warnings.append(f"Transform apply skipped: {e}")

        # ── Step 3: Triangulate ───────────────────────────────────────────────
        try:
            steps.append(_triangulate(obj))
        except Exception as e:
            warnings.append(f"Triangulate skipped: {e}")

        # ── Step 4: Merge doubles ─────────────────────────────────────────────
        try:
            steps.append(_merge_doubles(obj))
        except Exception as e:
            warnings.append(f"Merge doubles skipped: {e}")

        # ── Step 5: Smooth normals ────────────────────────────────────────────
        try:
            steps.append(_smooth_normals(obj))
        except Exception as e:
            warnings.append(f"Normal smoothing skipped: {e}")

        # ── Step 6: Ensure UV ─────────────────────────────────────────────────
        try:
            steps.append(_ensure_uv(obj))
        except Exception as e:
            warnings.append(f"UV check skipped: {e}")

        # ── Step 7: Ensure material ───────────────────────────────────────────
        try:
            steps.append(_ensure_material(obj))
        except Exception as e:
            warnings.append(f"Material check skipped: {e}")

        # ── Step 8: Auto-name textures ────────────────────────────────────────
        try:
            tex_actions = _auto_name_textures(obj)
            steps.extend(tex_actions or ["Texture names already FO4-compliant ✓"])
        except Exception as e:
            warnings.append(f"Texture naming skipped: {e}")

        # ── Step 9: Vertex / triangle limit check ─────────────────────────────
        try:
            limit_msgs = _check_vert_limit(obj)
            errors.extend([m for m in limit_msgs if m.startswith("ERROR")])
            warnings.extend([m for m in limit_msgs if m.startswith("WARNING")])
        except Exception as e:
            warnings.append(f"Limit check skipped: {e}")

        # ── Step 10: Generate collision ───────────────────────────────────────
        if self.generate_collision:
            try:
                existing = [o for o in bpy.data.objects
                            if o.name.upper().startswith("UCX_" + obj.name.upper()[:16])]
                if existing:
                    steps.append(f"Collision already present: {existing[0].name} ✓")
                else:
                    from . import mesh_helpers
                    col_obj, col_msg = mesh_helpers.MeshHelpers.add_collision_mesh(
                        obj, simplify_ratio=self.simplify_ratio
                    )
                    steps.append(f"Generated collision: {col_msg}")
            except Exception as e:
                warnings.append(f"Collision generation skipped: {e}")

        # ── Step 11: Export NIF ───────────────────────────────────────────────
        if not errors:  # skip export if hard errors found
            try:
                filepath = self.filepath
                if not filepath.lower().endswith(".nif"):
                    filepath += ".nif"
                os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
                ok, exporter, msg = _do_nif_export(obj, filepath)
                if ok:
                    steps.append(f"NIF exported via {exporter}: {os.path.basename(filepath)}")
                else:
                    errors.append(f"NIF export failed ({exporter}): {msg}")
            except Exception as e:
                errors.append(f"NIF export exception: {e}")

        # ── Step 12: Export BGSM ──────────────────────────────────────────────
            if self.export_bgsm:
                try:
                    out_dir = os.path.normpath(os.path.join(
                        getattr(self, "mod_folder", "") or os.path.dirname(os.path.abspath(self.filepath)),
                        "Data", "Materials"
                    ))
                    os.makedirs(out_dir, exist_ok=True)
                    ok, msg = _do_bgsm_export(obj, out_dir)
                    steps.append(msg)
                except Exception as e:
                    warnings.append(f"BGSM export skipped: {e}")

        # ── Step 13: Ask Mossy AI about remaining issues ──────────────────────
        if warnings or errors:
            mossy_tip = _mossy_advice(obj, warnings + errors)
        else:
            mossy_tip = ""

        _report(self, steps, warnings, errors, mossy_tip)
        return {'FINISHED'} if not errors else {'CANCELLED'}


class FO4_OT_PipelineWeapon(Operator):
    """
    One-click FO4 weapon mesh pipeline.

    Same prep as static mesh but sets the correct weapon-specific BGSM flags
    (two-sided, no env mapping, specular enabled) and uses the weapon origin
    convention (0, 0, 0 at grip).
    """
    bl_idname  = "fo4.pipeline_weapon"
    bl_label   = "Export Weapon Mesh (Full Pipeline)"
    bl_description = (
        "Prepare and export the selected mesh as a Fallout 4 weapon NIF. "
        "Sets weapon material flags, origin at grip point, no collision needed."
    )
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(name="Output Path", default="", subtype='FILE_PATH')

    def invoke(self, context, event):
        obj = context.active_object
        if obj:
            blend_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else ""
            self.filepath = os.path.join(blend_dir or _system_root(), f"{obj.name}_weapon.nif")
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        obj, err = _get_active_mesh(context)
        if obj is None:
            self.report({'ERROR'}, err)
            return {'CANCELLED'}

        steps, warnings, errors = [], [], []

        # Mark as weapon for BGSM export
        obj["fo4_mesh_type"] = "WEAPON"

        # Standard prep
        try:
            context.view_layer.objects.active = obj
            obj.select_set(True)
            steps.extend(_apply_transforms(obj) or ["Transforms clean ✓"])
            steps.append(_triangulate(obj))
            steps.append(_merge_doubles(obj))
            steps.append(_ensure_uv(obj))
            steps.append(_ensure_material(obj))
        except Exception as e:
            warnings.append(f"Prep error: {e}")

        # Enforce FO4 bone weight limit for skinned weapon meshes
        if obj.vertex_groups and obj.parent and obj.parent.type == 'ARMATURE':
            try:
                from . import mesh_helpers
                msg_bone = mesh_helpers.MeshHelpers.enforce_bone_limit(obj, max_influences=4)
                steps.append(msg_bone)
            except Exception as e:
                warnings.append(f"Bone limit enforcement skipped: {e}")

        # Weapon-specific: check origin is near 0,0,0 (grip convention)
        loc = obj.location
        if loc.length > 5.0:
            warnings.append(
                f"Weapon origin is {loc.x:.1f},{loc.y:.1f},{loc.z:.1f} — "
                "FO4 weapons should have origin at the grip (near 0,0,0). "
                "Set origin in Object > Set Origin > Origin to Geometry, "
                "then move to 0,0,0."
            )
        else:
            steps.append("Weapon origin near 0,0,0 ✓")

        # Polycount check — weapons should stay under 10k tris
        n_tris = sum(len(p.loop_indices) - 2 for p in obj.data.polygons)
        if n_tris > 10000:
            warnings.append(
                f"Weapon has ~{n_tris} triangles. FO4 weapons typically stay "
                "under 10,000 for performance. Consider decimating."
            )
        else:
            steps.append(f"Triangle count ~{n_tris} is within weapon budget ✓")

        # Export
        if not errors:
            filepath = self.filepath
            if not filepath.lower().endswith(".nif"):
                filepath += ".nif"
            os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
            ok, exporter, msg = _do_nif_export(obj, filepath)
            if ok:
                steps.append(f"Weapon NIF exported via {exporter}: {os.path.basename(filepath)}")
            else:
                errors.append(f"NIF export failed: {msg}")

            # BGSM with weapon flags
            out_dir = os.path.dirname(os.path.abspath(filepath))
            ok2, msg2 = _do_bgsm_export(obj, out_dir)
            steps.append(msg2)

        if warnings or errors:
            mossy_tip = _mossy_advice(obj, warnings + errors)
        else:
            mossy_tip = ""

        _report(self, steps, warnings, errors, mossy_tip)
        return {'FINISHED'} if not errors else {'CANCELLED'}


class FO4_OT_PipelineFlora(Operator):
    """
    One-click FO4 flora / vegetation pipeline.

    Adds wind weight painting, sets BGSM tree/vegetation flags, and exports.
    Flora meshes need:
      - Vertex color layer 'Col' for wind weights (0=anchor, 1=max sway)
      - BSLightingShaderProperty with Tree flag set
      - NiAlphaProperty for alpha-tested leaves (use PyNifly for full support)
    """
    bl_idname  = "fo4.pipeline_flora"
    bl_label   = "Export Flora/Vegetation (Full Pipeline)"
    bl_description = (
        "Prepare and export the selected mesh as a Fallout 4 flora NIF. "
        "Generates wind weights, sets vegetation shader flags, exports NIF + BGSM."
    )
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(name="Output Path", default="", subtype='FILE_PATH')
    wind_strength: FloatProperty(
        name="Wind Strength",
        description="Maximum sway distance (Blender units). Tip vertices get full weight.",
        default=0.5, min=0.0, max=5.0,
    )

    def invoke(self, context, event):
        obj = context.active_object
        if obj:
            blend_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else ""
            self.filepath = os.path.join(blend_dir or _system_root(), f"{obj.name}_flora.nif")
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        obj, err = _get_active_mesh(context)
        if obj is None:
            self.report({'ERROR'}, err)
            return {'CANCELLED'}

        steps, warnings, errors = [], [], []
        obj["fo4_mesh_type"] = "VEGETATION"

        # Standard prep
        try:
            context.view_layer.objects.active = obj
            obj.select_set(True)
            steps.extend(_apply_transforms(obj) or ["Transforms clean ✓"])
            steps.append(_triangulate(obj))
            steps.append(_merge_doubles(obj))
            steps.append(_ensure_uv(obj))
            steps.append(_ensure_material(obj))
        except Exception as e:
            warnings.append(f"Prep error: {e}")

        # Wind weights
        try:
            from . import animation_helpers
            ok, msg = animation_helpers.AnimationHelpers.generate_wind_weights(
                obj, wind_strength=self.wind_strength
            )
            steps.append(f"Wind weights: {msg}")
        except Exception as e:
            warnings.append(
                f"Auto wind weights skipped ({e}). "
                "Manually paint vertex colors: 'Col' layer, black=anchored, white=max sway."
            )

        # Check for vertex color layer (required for flora wind)
        me = obj.data
        has_vcol = bool(me.vertex_colors) or bool(
            getattr(me, 'color_attributes', None)
        )
        if has_vcol:
            steps.append("Vertex color layer for wind present ✓")
        else:
            warnings.append(
                "No vertex color layer found. Flora wind requires a vertex color "
                "layer named 'Col'. Use 'Generate Wind Weights' in the Animation panel."
            )

        # Flora-specific: check polygon count (flora can be higher for trees)
        n_tris = sum(len(p.loop_indices) - 2 for p in obj.data.polygons)
        if n_tris > 40000:
            warnings.append(
                f"Flora mesh has ~{n_tris} triangles. FO4 trees/plants typically "
                "stay under 40,000 tris for performance. Use LODs if needed."
            )
        else:
            steps.append(f"Triangle count ~{n_tris} within flora budget ✓")

        # Export
        if not errors:
            filepath = self.filepath
            if not filepath.lower().endswith(".nif"):
                filepath += ".nif"
            os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
            ok, exporter, msg = _do_nif_export(obj, filepath)
            if ok:
                steps.append(f"Flora NIF exported via {exporter}: {os.path.basename(filepath)}")
            else:
                errors.append(f"NIF export failed: {msg}")
            out_dir = os.path.dirname(os.path.abspath(filepath))
            ok2, msg2 = _do_bgsm_export(obj, out_dir)
            steps.append(msg2)

        if warnings or errors:
            mossy_tip = _mossy_advice(obj, warnings + errors)
        else:
            mossy_tip = ""

        _report(self, steps, warnings, errors, mossy_tip)
        return {'FINISHED'} if not errors else {'CANCELLED'}


class FO4_OT_PipelineNavMesh(Operator):
    """
    One-click FO4 navmesh pipeline.

    Validates navmesh, auto-fixes triangulation and scale, then exports as FBX
    for import into the Creation Kit (CK).  CK handles navmesh internally —
    there is no direct NIF export for navmesh.
    """
    bl_idname  = "fo4.pipeline_navmesh"
    bl_label   = "Validate & Export NavMesh"
    bl_description = (
        "Validate the selected navmesh against FO4/CK requirements, auto-fix "
        "triangulation and applied scale, then export as FBX for Creation Kit import."
    )
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(name="Output Path", default="", subtype='FILE_PATH')
    auto_fix: BoolProperty(
        name="Auto-Fix Issues",
        description="Automatically fix triangulation, scale, and duplicate vertices",
        default=True,
    )

    def invoke(self, context, event):
        obj = context.active_object
        if obj:
            blend_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else ""
            self.filepath = os.path.join(blend_dir or _system_root(), f"{obj.name}_navmesh.fbx")
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        obj, err = _get_active_mesh(context)
        if obj is None:
            self.report({'ERROR'}, err)
            return {'CANCELLED'}

        steps, warnings, errors = [], [], []

        # Validate
        try:
            from . import navmesh_helpers
            result = navmesh_helpers.NavmeshHelpers.validate(obj)
            steps.extend(result.get('infos', []))
            warnings.extend(result.get('warnings', []))
            nav_errors = result.get('errors', [])
        except Exception as e:
            nav_errors = [f"Validation error: {e}"]

        # Auto-fix
        if self.auto_fix and nav_errors:
            fixed = []
            # Fix: apply scale
            s = obj.scale
            if abs(s.x - 1.0) > 0.001 or abs(s.y - 1.0) > 0.001 or abs(s.z - 1.0) > 0.001:
                try:
                    context.view_layer.objects.active = obj
                    obj.select_set(True)
                    bpy.ops.object.transform_apply(scale=True)
                    fixed.append("Applied scale")
                    nav_errors = [e for e in nav_errors if 'scale' not in e.lower()]
                except Exception as ex:
                    warnings.append(f"Could not apply scale: {ex}")
            # Fix: triangulate
            if any('triangle' in e.lower() for e in nav_errors):
                try:
                    steps.append(_triangulate(obj))
                    nav_errors = [e for e in nav_errors if 'triangle' not in e.lower()]
                except Exception as ex:
                    warnings.append(f"Triangulate failed: {ex}")
            # Fix: merge near-duplicate verts
            steps.append(_merge_doubles(obj, threshold=0.001))
            if fixed:
                steps.append(f"Auto-fixed: {', '.join(fixed)}")
            # Re-validate after fixes
            try:
                from . import navmesh_helpers
                result2 = navmesh_helpers.NavmeshHelpers.validate(obj)
                nav_errors = result2.get('errors', [])
                warnings.extend(result2.get('warnings', []))
            except Exception:
                pass

        errors.extend(nav_errors)

        # Tag as navmesh
        try:
            from . import navmesh_helpers
            navmesh_helpers.NavmeshHelpers.tag_as_navmesh(obj)
            steps.append(f"Tagged '{obj.name}' as navmesh (wire/green display)")
        except Exception:
            pass

        # Export as FBX for CK
        if not errors:
            try:
                filepath = self.filepath
                if not filepath.lower().endswith(".fbx"):
                    filepath += ".fbx"
                os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
                bpy.ops.export_scene.fbx(
                    filepath=filepath,
                    use_selection=True,
                    apply_unit_scale=True,
                    apply_scale_options='FBX_SCALE_NONE',
                    bake_space_transform=False,
                    mesh_smooth_type='FACE',
                    use_mesh_modifiers=True,
                    axis_forward='-Z',
                    axis_up='Y',
                )
                steps.append(
                    f"NavMesh exported as FBX: {os.path.basename(filepath)}\n"
                    "  → Import in CK: NavMesh > Import NavMesh FBX"
                )
            except Exception as e:
                errors.append(f"FBX export failed: {e}")

        if warnings or errors:
            mossy_tip = _mossy_advice(obj, warnings + errors)
        else:
            mossy_tip = ""

        _report(self, steps, warnings, errors, mossy_tip)
        return {'FINISHED'} if not errors else {'CANCELLED'}


class FO4_OT_PipelineTRIMorphs(Operator):
    """
    One-click FO4 .tri morph export pipeline.

    Validates shape keys, then exports all non-Basis keys as a FO4 .tri morph
    file (FRTRI003 format).  Used for head/face morphs, race sliders, and
    BodySlide body morphs.
    """
    bl_idname  = "fo4.pipeline_tri_morphs"
    bl_label   = "Export .tri Morphs (Full Pipeline)"
    bl_description = (
        "Export all shape keys on the selected mesh as a Fallout 4 .tri morph "
        "file. One click: validate → export FRTRI003 format."
    )
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(name="Output Path", default="", subtype='FILE_PATH')

    def invoke(self, context, event):
        obj = context.active_object
        if obj:
            blend_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else ""
            self.filepath = os.path.join(blend_dir or _system_root(), f"{obj.name}.tri")
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        obj, err = _get_active_mesh(context)
        if obj is None:
            self.report({'ERROR'}, err)
            return {'CANCELLED'}

        steps, warnings, errors = [], [], []

        try:
            from . import tri_export_helpers
            can, msg = tri_export_helpers.TRIExportHelpers.can_export(obj)
            if not can:
                self.report({'ERROR'}, msg)
                return {'CANCELLED'}

            morph_names = tri_export_helpers.TRIExportHelpers.morph_names(obj)
            steps.append(f"Found {len(morph_names)} morph(s): {', '.join(morph_names[:6])}"
                         + ("…" if len(morph_names) > 6 else ""))

            filepath = self.filepath
            if not filepath.lower().endswith(".tri"):
                filepath += ".tri"
            os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)

            ok, result_msg = tri_export_helpers.TRIExportHelpers.export_tri(obj, filepath)
            if ok:
                steps.append(f"✓ {result_msg}")
            else:
                errors.append(result_msg)

        except Exception as e:
            errors.append(f"TRI export exception: {e}")
            traceback.print_exc()

        _report(self, steps, warnings, errors)
        return {'FINISHED'} if not errors else {'CANCELLED'}


class FO4_OT_PipelineTextures(Operator):
    """
    One-click FO4 texture pipeline.

    Auto-names textures to FO4 conventions (_d, _n, _s, _g) and converts
    them to DDS using NVTT or texconv if available.
    """
    bl_idname  = "fo4.pipeline_textures"
    bl_label   = "Process Textures (Auto-name + DDS Convert)"
    bl_description = (
        "Auto-rename textures to FO4 conventions (_d, _n, _s, _g) and convert "
        "to DDS BC7 format using NVTT or texconv."
    )
    bl_options = {'REGISTER', 'UNDO'}

    output_dir: StringProperty(
        name="Output Directory",
        description="Where to save converted DDS textures",
        default="",
        subtype='DIR_PATH',
    )
    convert_to_dds: BoolProperty(
        name="Convert to DDS",
        description="Convert PNG/TGA/JPG textures to DDS BC7 format",
        default=True,
    )

    def invoke(self, context, event):
        blend_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else ""
        self.output_dir = os.path.join(blend_dir or _system_root(), "textures")
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        obj, err = _get_active_mesh(context)
        if obj is None:
            self.report({'ERROR'}, err)
            return {'CANCELLED'}

        steps, warnings, errors = [], [], []

        # Auto-name
        try:
            actions = _auto_name_textures(obj)
            steps.extend(actions or ["Texture names already FO4-compliant ✓"])
        except Exception as e:
            warnings.append(f"Auto-naming error: {e}")

        # DDS conversion
        if self.convert_to_dds:
            try:
                from . import nvtt_helpers
                os.makedirs(self.output_dir, exist_ok=True)
                converted = 0
                for slot in obj.material_slots:
                    mat = slot.material
                    if not mat or not mat.use_nodes:
                        continue
                    for node in mat.node_tree.nodes:
                        if node.type != 'TEX_IMAGE' or not node.image:
                            continue
                        img = node.image
                        if img.filepath:
                            src = bpy.path.abspath(img.filepath)
                            dst = os.path.join(
                                self.output_dir,
                                os.path.splitext(os.path.basename(src))[0] + ".dds"
                            )
                            # Detect slot from filename for correct BC format
                            detected_slot = nvtt_helpers.detect_slot_from_filename(
                                os.path.basename(src)
                            )
                            ok, msg = nvtt_helpers.NVTTHelpers.convert_to_dds(
                                src, dst, slot=detected_slot
                            )
                            if ok:
                                converted += 1
                                steps.append(f"Converted: {os.path.basename(dst)}")
                            else:
                                warnings.append(f"DDS convert failed for {os.path.basename(src)}: {msg}")
                if converted == 0 and not warnings:
                    warnings.append(
                        "No textures converted. Ensure textures have saved file paths "
                        "and NVTT or texconv is installed (Setup panel → Install Tools)."
                    )
            except Exception as e:
                warnings.append(f"DDS conversion skipped: {e}")

        _report(self, steps, warnings, errors)
        return {'FINISHED'} if not errors else {'CANCELLED'}


class FO4_OT_PipelineFullMod(Operator):
    """
    One-click full mod package pipeline.

    Creates the complete FO4 mod folder structure, exports all selected meshes
    as NIFs with matching BGSMs, generates a FOMOD installer XML, and
    optionally packages everything into a zip.
    """
    bl_idname  = "fo4.pipeline_full_mod"
    bl_label   = "Package Full Mod (Mesh + BGSM + FOMOD)"
    bl_description = (
        "Export all visible meshes, generate matching BGSM materials, create "
        "the correct FO4 mod folder structure (Data/Meshes/, Data/Materials/, "
        "Data/Textures/), and generate a FOMOD installer."
    )
    bl_options = {'REGISTER', 'UNDO'}

    output_dir: StringProperty(
        name="Mod Output Directory",
        description="Root folder for the mod package",
        default="",
        subtype='DIR_PATH',
    )
    mod_name: StringProperty(
        name="Mod Name",
        description="Name of the mod (used for folder and FOMOD naming)",
        default="MyFO4Mod",
    )
    mod_version: StringProperty(
        name="Version",
        description="Mod version string",
        default="1.0",
    )
    mod_author: StringProperty(
        name="Author",
        description="Mod author name",
        default="",
    )
    auto_pack_ba2: BoolProperty(
        name="Pack BA2 Archives",
        description=(
            "After exporting, run Archive2.exe to pack loose files into "
            "'ModName - Main.ba2' and 'ModName - Textures.ba2'. "
            "Requires Archive2.exe path set in add-on preferences."
        ),
        default=True,
    )

    def invoke(self, context, event):
        blend_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else ""
        self.output_dir = os.path.join(blend_dir or _system_root(), "ModOutput")
        if not self.mod_name or self.mod_name == "MyFO4Mod":
            self.mod_name = os.path.splitext(
                os.path.basename(bpy.data.filepath or "MyMod.blend")
            )[0]
        return context.window_manager.invoke_props_dialog(self, width=400)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "mod_name")
        layout.prop(self, "mod_version")
        layout.prop(self, "mod_author")
        layout.prop(self, "output_dir")
        layout.prop(self, "auto_pack_ba2")

    def execute(self, context):
        steps, warnings, errors = [], [], []

        try:
            from . import export_helpers, mod_packaging_helpers
            mod_dir = os.path.join(self.output_dir, self.mod_name)

            # Create FO4 mod folder structure
            fo4_paths = {
                "meshes":    os.path.join(mod_dir, "Data", "Meshes",    self.mod_name),
                "textures":  os.path.join(mod_dir, "Data", "Textures",  self.mod_name),
                "materials": os.path.join(mod_dir, "Data", "Materials", self.mod_name),
                "scripts":   os.path.join(mod_dir, "Data", "Scripts"),
                "fomod":     os.path.join(mod_dir, "fomod"),
            }
            for name, path in fo4_paths.items():
                os.makedirs(path, exist_ok=True)
            steps.append(f"Created FO4 mod structure under: {mod_dir}")

            # Export all visible mesh objects
            exported_nifs = []
            mesh_objects = [
                o for o in context.scene.objects
                if o.type == 'MESH' and o.visible_get()
                and not o.name.upper().startswith("UCX_")
            ]
            if not mesh_objects:
                errors.append("No visible mesh objects to export.")
                _report(self, steps, warnings, errors)
                return {'CANCELLED'}

            for obj in mesh_objects:
                context.view_layer.objects.active = obj
                obj.select_set(True)
                nif_path = os.path.join(fo4_paths["meshes"], f"{obj.name}.nif")
                ok, exporter, msg = _do_nif_export(obj, nif_path)
                if ok:
                    exported_nifs.append(nif_path)
                    steps.append(f"  NIF: {obj.name}.nif ({exporter})")
                    # BGSM
                    ok2, msg2 = _do_bgsm_export(obj, fo4_paths["materials"])
                    if ok2:
                        steps.append(f"  BGSM: {msg2}")
                else:
                    warnings.append(f"  {obj.name}: {msg}")
                obj.select_set(False)

            steps.append(f"Exported {len(exported_nifs)}/{len(mesh_objects)} mesh(es)")

            # Generate FOMOD info.xml and ModuleConfig.xml
            try:
                _write_fomod_xml(fo4_paths["fomod"], self.mod_name,
                                 self.mod_version, self.mod_author)
                steps.append("Generated FOMOD installer XML")
            except Exception as e:
                warnings.append(f"FOMOD XML skipped: {e}")

            steps.append(
                f"Mod package ready at: {mod_dir}\n"
                "  → Test with Mod Organizer 2 before publishing."
            )

            # ── Optional: pack BA2 archives ───────────────────────────────
            if self.auto_pack_ba2:
                try:
                    ok_ba2, msg_ba2 = mod_packaging_helpers.ModPackager.pack_ba2(
                        mod_dir, self.mod_name
                    )
                    if ok_ba2:
                        steps.append(f"BA2 packing: {msg_ba2}")
                    else:
                        warnings.append(f"BA2 packing: {msg_ba2}")
                except Exception as e_ba2:
                    warnings.append(f"BA2 packing skipped: {e_ba2}")

        except Exception as e:
            errors.append(f"Full mod pipeline error: {e}")
            traceback.print_exc()

        _report(self, steps, warnings, errors)
        return {'FINISHED'} if not errors else {'CANCELLED'}


def _write_fomod_xml(fomod_dir: str, name: str, version: str, author: str) -> None:
    """Write minimal FOMOD info.xml and ModuleConfig.xml."""
    info_xml = f"""<fomod>
  <Name>{name}</Name>
  <Author>{author or 'Unknown'}</Author>
  <Version>{version}</Version>
  <Description>Created with Mossy Industries FO4 Blender Add-on.</Description>
  <Website></Website>
</fomod>
"""
    config_xml = f"""<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">
  <moduleName>{name}</moduleName>
  <installSteps order="Explicit">
    <installStep name="Install">
      <optionalFileGroups order="Explicit">
        <group name="{name}" type="SelectExactlyOne">
          <plugins order="Explicit">
            <plugin name="{name}">
              <description>Install {name} v{version}</description>
              <files>
                <folder source="Data" destination="" priority="0"/>
              </files>
              <typeDescriptor>
                <type name="Recommended"/>
              </typeDescriptor>
            </plugin>
          </plugins>
        </group>
      </optionalFileGroups>
    </installStep>
  </installSteps>
</config>
"""
    with open(os.path.join(fomod_dir, "info.xml"), 'w', encoding='utf-8') as f:
        f.write(info_xml)
    with open(os.path.join(fomod_dir, "ModuleConfig.xml"), 'w', encoding='utf-8') as f:
        f.write(config_xml)


# ── Registration ───────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_PipelineStaticMesh,
    FO4_OT_PipelineWeapon,
    FO4_OT_PipelineFlora,
    FO4_OT_PipelineNavMesh,
    FO4_OT_PipelineTRIMorphs,
    FO4_OT_PipelineTextures,
    FO4_OT_PipelineFullMod,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[FO4 Pipeline] Could not register {cls.__name__}: {e}")
    print(f"[FO4 Pipeline] Registered {len(_CLASSES)} one-click pipeline operators")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
