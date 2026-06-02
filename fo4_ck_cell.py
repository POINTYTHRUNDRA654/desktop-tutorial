"""
fo4_ck_cell.py
==============
Creation Kit cell round-trip pipeline for Fallout 4.

Exact workflow
--------------
The Creation Kit's render window can export selected objects as FBX.
That FBX comes into Blender, you edit it, then it goes back out as NIF.
The game engine reads NIF — it cannot use FBX for static meshes.

  CK render window
    → File > Export (or right-click > Export Selected)
    → saves  MyCell.fbx                         ← single FBX, all references

  Blender
    → Import CK Cell FBX                        ← this module, primary path
    → edit meshes / UVs / materials freely
    → Export Cell Objects → NIF                 ← each object → its own .nif

  Data/Meshes/…
    → game and CK reload the updated NIFs automatically (they reference by path)

Alternative path (no CK render-window export available):
  BA2 archive / loose NIF files
    → Import NIF Folder                         ← this module, secondary path
    → edit
    → Export → NIF

Export-back format
------------------
The game MUST have NIF files.  FBX is NOT loaded by FO4 / the CK for statics.

  • If PyNifly (Blender 4.x/5.x) is installed → export as NIF directly.  Done.
  • If Niftools v0.1.1 (Blender 3.6 LTS) is installed → export as NIF directly.
  • If neither is installed → export as FBX, then run Cathedral Assets Optimizer
    (CAO) on the FBX to convert it to NIF before dropping it in Data/Meshes/.
    CAO is free: https://www.nexusmods.com/skyrimspecialedition/mods/23316

CK FBX export axis convention
------------------------------
The CK exports FBX with:
  Forward  : Y   (into screen)
  Up       : Z   (world up)
  Scale    : FO4 game units (1 unit ≈ 1.43 cm)

Blender FBX import settings that match:
  axis_forward = 'Y'
  axis_up      = 'Z'
  global_scale = 1.0   (keep game units; we set scene unit scale separately)

Custom properties stored on each imported object
-------------------------------------------------
  fo4_nif_path    — game-relative NIF path  (Meshes/Architecture/Vault/...)
  fo4_nif_abs     — absolute NIF path at import time
  fo4_mesh_hash   — SHA-1 of vertex positions (detects edits since import)
  fo4_fbx_source  — absolute path of the source FBX file
  fo4_formid      — FormID from xEdit CSV (if placement data was loaded)
  fo4_editor_id   — EditorID from xEdit CSV
  fo4_cell_scale  — reference scale from CK
"""

from __future__ import annotations

import csv
import hashlib
import math
import os
import struct
import traceback

try:
    import bpy
    from bpy.types import Operator
    from bpy.props import (
        StringProperty, BoolProperty, IntProperty, EnumProperty,
    )
    from mathutils import Vector, Euler
except ImportError:
    bpy      = None       # type: ignore[assignment]
    Operator = object     # type: ignore[assignment]

# ── FO4 unit constants ─────────────────────────────────────────────────────────
# 1 FO4 game unit = 0.0142875 metres  (Havok world scale)
FO4_UNIT_SCALE  = 0.0142875   # metres per FO4 unit
FO4_TO_BLENDER  = FO4_UNIT_SCALE
BLENDER_TO_FO4  = 1.0 / FO4_UNIT_SCALE

# FO4 exterior cell size in game units
FO4_CELL_SIZE   = 4096   # game units per exterior cell (square)

# CK FBX export axis convention
_CK_FBX_FORWARD = 'Y'
_CK_FBX_UP      = 'Z'

# Custom property keys
_PROP_NIF_PATH   = "fo4_nif_path"
_PROP_NIF_ABS    = "fo4_nif_abs"
_PROP_MESH_HASH  = "fo4_mesh_hash"
_PROP_FBX_SOURCE = "fo4_fbx_source"
_PROP_FORMID     = "fo4_formid"
_PROP_EDITOR_ID  = "fo4_editor_id"
_PROP_CELL_SCALE = "fo4_cell_scale"
_PROP_OBJ_NAME   = "fo4_original_name"   # original CK object name

# Collection that holds all imported cell objects
_CELL_COLLECTION = "FO4_Cell_Import"


# ── Mesh hash (change detection) ──────────────────────────────────────────────

def _mesh_hash(obj) -> str:
    """SHA-1 of all vertex co-ordinates — fast change detection."""
    try:
        h = hashlib.sha1()
        for v in obj.data.vertices:
            h.update(struct.pack('<fff', v.co.x, v.co.y, v.co.z))
        return h.hexdigest()
    except Exception:
        return ""


# ── xEdit CSV parser ──────────────────────────────────────────────────────────

def _parse_xedit_csv(filepath: str) -> list:
    """
    Parse an FO4Edit / xEdit cell-reference CSV.

    Generate from FO4Edit:
      Right-click on a CELL record → Export → References as CSV

    Returns list of dicts with keys:
      formid, editor_id, model_path, pos (Vector), rot (Euler), scale (float)
    """
    refs = []
    try:
        with open(filepath, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            norm = {k.strip().lower().replace(' ', '').replace('_', ''): k
                    for k in (reader.fieldnames or [])}

            def _col(row, *names) -> str:
                for n in names:
                    k = norm.get(n, n)
                    v = row.get(k, "").strip()
                    if v:
                        return v
                return ""

            for row in reader:
                model = _col(row, 'modelpath', 'model', 'nifpath', 'mesh')
                if not model:
                    continue
                try:
                    px = float(_col(row, 'posx', 'x', 'positionx') or 0)
                    py = float(_col(row, 'posy', 'y', 'positiony') or 0)
                    pz = float(_col(row, 'posz', 'z', 'positionz') or 0)
                    rx = float(_col(row, 'rotx', 'rotationx') or 0)
                    ry = float(_col(row, 'roty', 'rotationy') or 0)
                    rz = float(_col(row, 'rotz', 'rotationz') or 0)
                    sc = float(_col(row, 'scale') or 1.0)
                except ValueError:
                    px = py = pz = rx = ry = rz = 0.0
                    sc = 1.0
                refs.append({
                    'formid':    _col(row, 'formid', 'formid'),
                    'editor_id': _col(row, 'editorid', 'editorid'),
                    'model_path': model.replace('\\', '/'),
                    'pos':   Vector((px, py, pz)) * FO4_TO_BLENDER,
                    'rot':   Euler((math.radians(rx),
                                    math.radians(ry),
                                    math.radians(rz)), 'XYZ'),
                    'scale': sc,
                })
    except Exception as e:
        print(f"[CK Cell] xEdit CSV parse error: {e}")
    return refs


# ── Collection helper ──────────────────────────────────────────────────────────

def _get_or_create_collection(name: str):
    if name in bpy.data.collections:
        return bpy.data.collections[name]
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


# ── Tag objects with FO4 metadata ─────────────────────────────────────────────

def _tag_objects(objects: list, fbx_source: str, mod_folder: str,
                 ref: "dict | None" = None) -> None:
    """Store FO4 metadata custom properties on imported objects."""
    for obj in objects:
        if obj.type not in ('MESH', 'ARMATURE', 'EMPTY'):
            continue
        obj[_PROP_FBX_SOURCE] = fbx_source
        obj[_PROP_OBJ_NAME]   = obj.name

        if obj.type == 'MESH':
            obj[_PROP_MESH_HASH] = _mesh_hash(obj)

            # Derive a game-relative NIF path from the object name.
            # CK-exported FBX names objects after their base-record EditorID.
            # Users will need to map these to actual NIF paths via xEdit CSV
            # or by naming objects to match their NIF path.
            safe_name = obj.name.replace(" ", "_")
            obj[_PROP_NIF_PATH] = f"Meshes/{safe_name}.nif"

        if ref:
            obj[_PROP_FORMID]    = ref.get('formid', '')
            obj[_PROP_EDITOR_ID] = ref.get('editor_id', '')
            obj[_PROP_CELL_SCALE] = ref.get('scale', 1.0)
            if ref.get('model_path'):
                obj[_PROP_NIF_PATH] = ref['model_path']


# ── NIF path resolver ─────────────────────────────────────────────────────────

def _resolve_nif_path(obj, mod_folder: str) -> str:
    """
    Return the absolute NIF output path for *obj* inside the mod folder.

    Output layout mirrors the FO4 Data folder structure:
      [mod_folder]/Data/Meshes/[relative_path].nif

    Priority for the relative path:
      1. fo4_nif_path custom property (set from xEdit CSV, e.g. "Meshes/Foo/Bar.nif")
      2. fo4_nif_abs custom property  (absolute path from NIF-folder import)
      3. Fallback: Data/Meshes/[object_name].nif

    NEVER writes directly into the game's Data folder — always into the mod's
    own staging folder so MO2/Vortex handles deployment.
    """
    rel = obj.get(_PROP_NIF_PATH, "")
    if rel:
        rel = rel.replace("\\", "/")
        # Strip leading "Meshes/" — we prepend it below inside Data/
        if rel.lower().startswith("meshes/"):
            rel = rel[7:]
        return os.path.normpath(
            os.path.join(mod_folder, "Data", "Meshes", rel)
        )

    abs_nif = obj.get(_PROP_NIF_ABS, "")
    if abs_nif and os.path.isabs(abs_nif):
        # Preserve path relative to original data root inside the mod folder
        fname = os.path.basename(abs_nif)
        return os.path.normpath(
            os.path.join(mod_folder, "Data", "Meshes", fname)
        )

    safe = obj.name.replace(" ", "_")
    return os.path.normpath(
        os.path.join(mod_folder, "Data", "Meshes", f"{safe}.nif")
    )


# ── NIF export — always via export_helpers (PyNifly primary) ──────────────────

def _export_nif(obj, filepath: str) -> "tuple[bool, str, str]":
    """
    Export *obj* as a game-ready NIF.  Returns (success, exporter_used, message).

    Routes through export_helpers.ExportHelpers.export_mesh_to_nif() which
    uses PyNifly (via _build_pynifly_export_kwargs) as the primary exporter.
    PyNifly is integrated into this addon with permission from BadDog.

    Fallback chain (export_helpers handles internally):
      PyNifly → Niftools v0.1.1 → native_nif_writer → FBX (needs CAO)

    The game CANNOT load FBX.  If FBX fallback is used, a clear warning is
    shown and the file is named *_NEEDS_CAO_CONVERT.fbx.
    """
    try:
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
    except Exception:
        pass

    # ── Primary: export_helpers pipeline (PyNifly first via _build_pynifly_export_kwargs)
    try:
        from . import export_helpers
        result = export_helpers.ExportHelpers.export_mesh_to_nif(obj, filepath)
        if isinstance(result, tuple):
            ok, msg = result
            exporter = "PyNifly" if "pynifly" in msg.lower() else "export_helpers"
        else:
            ok  = result in ({'FINISHED'}, 'FINISHED')
            msg = str(result)
            exporter = "export_helpers"
        if ok:
            return True, exporter, f"NIF: {os.path.basename(filepath)}"
        print(f"[CK Cell] export_helpers returned: {msg}")
    except Exception as e:
        print(f"[CK Cell] export_helpers error: {e}")

    # ── FBX last resort — NOT game-ready, needs CAO conversion ──────────────
    fbx_path = os.path.splitext(filepath)[0] + "_NEEDS_CAO_CONVERT.fbx"
    try:
        bpy.ops.export_scene.fbx(
            filepath=fbx_path,
            use_selection=True,
            apply_unit_scale=True,
            axis_forward=_CK_FBX_FORWARD,
            axis_up=_CK_FBX_UP,
            bake_space_transform=False,
        )
        return (
            True, "FBX (needs CAO)",
            f"⚠ Exported FBX (game needs NIF!). "
            f"Convert with Cathedral Assets Optimizer:\n"
            f"  https://www.nexusmods.com/skyrimspecialedition/mods/23316\n"
            f"  Input: {fbx_path}\n"
            f"  Output: {filepath}"
        )
    except Exception as e:
        return False, "none", f"All exporters failed. Install PyNifly. Error: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# Operator 1: Import from CK FBX export (PRIMARY) or NIF folder (secondary)
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_ImportCKCell(Operator):
    """
    Import a CK cell into Blender.

    PRIMARY: point at the FBX the CK's render window exported.
    SECONDARY: point at a folder of NIFs extracted from BA2 archives.

    How to export from CK:
      1. Open the Creation Kit, load your ESP/ESM
      2. Open the cell in the Render Window (double-click the cell in the
         Cell View panel)
      3. Select the objects you want to edit (click + Shift-click, or Ctrl+A)
      4. File > Export  (or right-click > Export Selected)
      5. Save as  MyCell.fbx

    Then use this operator to import that FBX.
    """
    bl_idname  = "fo4.import_ck_cell"
    bl_label   = "Import CK Cell (FBX or NIF folder)"
    bl_description = (
        "Import a Creation Kit cell export into Blender for editing. "
        "PRIMARY: the FBX exported by the CK render window. "
        "SECONDARY: a folder of NIFs extracted from BA2 archives."
    )
    bl_options = {'REGISTER', 'UNDO'}

    # Primary: CK FBX export
    ck_fbx: StringProperty(
        name="CK FBX File",
        description=(
            "FBX exported by the CK render window.  "
            "In CK: Render Window → select objects → File > Export"
        ),
        default="",
        subtype='FILE_PATH',
    )

    # Secondary: BA2-extracted NIF folder
    nif_folder: StringProperty(
        name="NIF Folder (BA2 extract)",
        description="Folder of NIFs extracted from BA2 archives (leave blank if using FBX)",
        default="",
        subtype='DIR_PATH',
    )

    # Optional: xEdit reference CSV for accurate object placement
    xedit_csv: StringProperty(
        name="xEdit CSV (optional)",
        description=(
            "FO4Edit cell-reference CSV for object names and NIF paths. "
            "In FO4Edit: right-click CELL record → Export → References as CSV"
        ),
        default="",
        subtype='FILE_PATH',
    )

    # Data root for deriving game-relative NIF paths
    mod_folder: StringProperty(
        name="Mod Output Folder",
        description="Your mod's root staging folder (e.g. C:/MO2/mods/MyMod). Exports go to [folder]/Data/Meshes/ — never into the game folder.",
        default="",
        subtype='DIR_PATH',
    )

    set_unit_scale: BoolProperty(
        name="Set FO4 Unit Scale",
        description="Set scene unit scale to 0.0143 so 1 BU = 1 FO4 game unit",
        default=True,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=520)

    def draw(self, context):
        layout = self.layout
        box = layout.box()
        box.label(text="PRIMARY — CK render window export:", icon='IMPORT')
        box.label(text="CK: Render Window → select objects → File > Export → .fbx")
        box.prop(self, "ck_fbx")

        layout.separator()
        box2 = layout.box()
        box2.label(text="SECONDARY — NIFs extracted from BA2:", icon='FILEBROWSER')
        box2.prop(self, "nif_folder")

        layout.separator()
        layout.prop(self, "xedit_csv")
        layout.prop(self, "mod_folder")
        layout.prop(self, "set_unit_scale")

        layout.separator()
        layout.label(
            text="After editing: use 'Export Cell Objects → NIF' to push back to game.",
            icon='INFO',
        )

    def execute(self, context):
        if not self.ck_fbx and not self.nif_folder:
            self.report({'ERROR'}, "Provide a CK FBX file or a NIF folder.")
            return {'CANCELLED'}

        mod_folder = self.mod_folder or ""

        # ── Unit scale ────────────────────────────────────────────────────────
        if self.set_unit_scale:
            context.scene.unit_settings.system = 'METRIC'
            context.scene.unit_settings.scale_length = FO4_UNIT_SCALE
            self.report({'INFO'}, f"Scene unit scale → {FO4_UNIT_SCALE} (FO4 game units)")

        # ── Parse optional xEdit CSV ──────────────────────────────────────────
        refs_by_model: dict = {}
        refs_by_editor: dict = {}
        if self.xedit_csv and os.path.isfile(self.xedit_csv):
            refs = _parse_xedit_csv(self.xedit_csv)
            for ref in refs:
                key = ref['model_path'].lower().lstrip('/')
                refs_by_model.setdefault(key, []).append(ref)
                if ref['editor_id']:
                    refs_by_editor[ref['editor_id'].lower()] = ref
            self.report({'INFO'}, f"Loaded {len(refs)} references from xEdit CSV")

        cell_col = _get_or_create_collection(_CELL_COLLECTION)
        cell_col["fo4_mod_folder"] = mod_folder
        imported_total = 0
        failed = []

        # ═══════════════════════════════════════════════════════════════════
        # PATH A: CK FBX import (primary)
        # ═══════════════════════════════════════════════════════════════════
        if self.ck_fbx and os.path.isfile(self.ck_fbx):
            before = set(bpy.data.objects.keys())
            try:
                bpy.ops.import_scene.fbx(
                    filepath=self.ck_fbx,
                    use_manual_orientation=True,
                    axis_forward=_CK_FBX_FORWARD,
                    axis_up=_CK_FBX_UP,
                    global_scale=1.0,        # keep in FO4 game units
                    use_anim=False,          # we don't need animation data
                    ignore_leaf_bones=True,
                    force_connect_children=False,
                    automatic_bone_orientation=False,
                    use_custom_normals=True,
                )
            except Exception as e:
                self.report({'ERROR'}, f"FBX import failed: {e}")
                return {'CANCELLED'}

            new_objs = [bpy.data.objects[k]
                        for k in bpy.data.objects.keys()
                        if k not in before]

            for obj in new_objs:
                # Move to cell collection
                for col in list(obj.users_collection):
                    col.objects.unlink(obj)
                cell_col.objects.link(obj)

                # Try to match to xEdit CSV by EditorID (object name in FBX
                # usually matches the CK EditorID of the placed reference)
                ref = refs_by_editor.get(obj.name.lower())
                if ref and obj.type == 'MESH':
                    # Apply position from CSV if the FBX didn't carry it
                    # (CK FBX exports already have world positions baked in)
                    obj[_PROP_NIF_PATH] = ref['model_path']

                _tag_objects([obj], self.ck_fbx, mod_folder, ref)
                imported_total += 1

            cell_col["fo4_fbx_source"] = self.ck_fbx
            self.report(
                {'INFO'},
                f"Imported {imported_total} object(s) from CK FBX: "
                f"{os.path.basename(self.ck_fbx)}"
            )

        # ═══════════════════════════════════════════════════════════════════
        # PATH B: NIF folder import (secondary — BA2 extracted)
        # ═══════════════════════════════════════════════════════════════════
        elif self.nif_folder:
            nif_files = []
            if os.path.isdir(self.nif_folder):
                for root, _, files in os.walk(self.nif_folder):
                    for fname in files:
                        if fname.lower().endswith('.nif'):
                            nif_files.append(os.path.join(root, fname))
            if not nif_files:
                self.report({'ERROR'}, "No .nif files found in folder.")
                return {'CANCELLED'}

            grid_x = 0
            for nif_path in nif_files:
                before = set(bpy.data.objects.keys())
                ok = False

                # Try PyNifly → Niftools → FBX alongside
                for importer, kwargs in [
                    ('pynifly', {'filepath': nif_path}),
                    ('nif',     {'filepath': nif_path}),
                ]:
                    try:
                        op = getattr(bpy.ops.import_scene, importer, None)
                        if op:
                            op(**kwargs)
                            ok = True
                            break
                    except Exception:
                        pass

                if not ok:
                    failed.append(os.path.basename(nif_path))
                    continue

                new_objs = [bpy.data.objects[k]
                            for k in bpy.data.objects.keys()
                            if k not in before]

                for obj in new_objs:
                    for col in list(obj.users_collection):
                        col.objects.unlink(obj)
                    cell_col.objects.link(obj)

                    # Grid layout
                    obj.location.x = grid_x * 2.0 * FO4_TO_BLENDER

                    # Game-relative path
                    rel = os.path.relpath(nif_path, mod_folder or self.nif_folder)
                    rel = rel.replace('\\', '/')
                    obj[_PROP_NIF_PATH] = rel
                    obj[_PROP_NIF_ABS]  = nif_path
                    _tag_objects([obj], nif_path, mod_folder)
                    imported_total += 1

                grid_x += 1

            if failed:
                self.report({'WARNING'},
                    f"Imported {imported_total} objects. "
                    f"{len(failed)} NIFs failed (install PyNifly or Niftools).")
            else:
                self.report({'INFO'}, f"Imported {imported_total} object(s) from NIF folder.")

        cell_col["fo4_import_count"] = imported_total
        return {'FINISHED'}


# ══════════════════════════════════════════════════════════════════════════════
# Operator 2: Prepare scene for cell editing
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_PrepareCellEdit(Operator):
    """
    Configure Blender for CK cell editing.

    Sets FO4 unit scale, adds a cell reference grid, shows geometry stats,
    and turns collision meshes (UCX_) to wire display.
    """
    bl_idname  = "fo4.prepare_cell_edit"
    bl_label   = "Prepare Scene for Cell Editing"
    bl_description = (
        "Set FO4 unit scale, add exterior cell boundary grid, display cell "
        "stats, and set UCX_ collision meshes to wire display."
    )
    bl_options = {'REGISTER'}

    show_grid: BoolProperty(
        name="Show Cell Grid",
        description="Add reference grid showing FO4 exterior cell boundaries (4096×4096 units)",
        default=True,
    )
    grid_cells: IntProperty(
        name="Grid Size (cells)",
        default=3, min=1, max=9,
    )

    def execute(self, context):
        steps = []

        # Unit scale
        context.scene.unit_settings.system = 'METRIC'
        context.scene.unit_settings.scale_length = FO4_UNIT_SCALE
        steps.append(f"Unit scale: {FO4_UNIT_SCALE}  (1 BU = 1 FO4 game unit)")

        # Stats from cell collection
        col = bpy.data.collections.get(_CELL_COLLECTION)
        if col:
            mesh_objs = [o for o in col.all_objects if o.type == 'MESH']
            tagged    = [o for o in mesh_objs if o.get(_PROP_NIF_PATH)]
            total_v   = sum(len(o.data.vertices) for o in mesh_objs)
            total_t   = sum(
                sum(len(p.loop_indices) - 2 for p in o.data.polygons)
                for o in mesh_objs
            )
            steps.append(
                f"Cell: {len(mesh_objs)} mesh objects  "
                f"({len(tagged)} tagged with NIF paths)  "
                f"| ~{total_v:,} verts  ~{total_t:,} tris"
            )
        else:
            steps.append("No FO4_Cell_Import collection — import a cell first.")

        # Reference grid
        if self.show_grid:
            cell_m   = FO4_CELL_SIZE * FO4_TO_BLENDER
            half     = cell_m * self.grid_cells / 2.0
            gname    = "FO4_CellGrid"
            if gname in bpy.data.objects:
                bpy.data.objects.remove(bpy.data.objects[gname], do_unlink=True)

            import bmesh as _bm
            bm = _bm.new()
            for i in range(self.grid_cells + 1):
                t = -half + i * cell_m
                vs = [bm.verts.new(p) for p in [
                    (t, -half, 0), (t,  half, 0),
                    (-half, t, 0), ( half, t, 0),
                ]]
                bm.edges.new((vs[0], vs[1]))
                bm.edges.new((vs[2], vs[3]))

            me  = bpy.data.meshes.new(gname)
            bm.to_mesh(me)
            bm.free()
            go  = bpy.data.objects.new(gname, me)
            go.display_type = 'WIRE'
            go.hide_select  = True
            go.lock_location = (True, True, True)
            context.scene.collection.objects.link(go)
            steps.append(
                f"Cell grid: {self.grid_cells}×{self.grid_cells}  "
                f"({cell_m:.1f} m per cell = {FO4_CELL_SIZE} game units)"
            )

        # Wire for collision meshes
        ucx = [o for o in context.scene.objects if o.name.upper().startswith("UCX_")]
        for o in ucx:
            o.display_type = 'WIRE'
            o.hide_render   = True
        if ucx:
            steps.append(f"Wire display: {len(ucx)} UCX_ collision mesh(es)")

        for s in steps:
            self.report({'INFO'}, s)
        return {'FINISHED'}


# ══════════════════════════════════════════════════════════════════════════════
# Operator 3: Export all changed objects back to NIF (game-ready)
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_ExportCKCell(Operator):
    """
    Export modified cell objects back to game-ready NIF files.

    Scans every object in FO4_Cell_Import for mesh changes (vertex hash).
    Re-exports only changed objects — or all objects if 'Export All' is set.

    OUTPUT: NIF files at their original Data/Meshes/… paths.
    The game and CK reload these automatically on next launch / asset refresh.

    If PyNifly/Niftools are not installed, exports FBX files that must be
    converted to NIF with Cathedral Assets Optimizer before use.
    """
    bl_idname  = "fo4.export_ck_cell"
    bl_label   = "Export Cell Objects → NIF (Game-Ready)"
    bl_description = (
        "Re-export every modified mesh as a NIF to its original Data/Meshes/ "
        "path.  Game-ready NIF requires PyNifly or Niftools.  Falls back to "
        "FBX (needs CAO conversion) if neither is installed."
    )
    bl_options = {'REGISTER'}

    mod_folder: StringProperty(
        name="Mod Output Folder",
        description="Your mod staging folder. Exports go to [folder]/Data/Meshes/ and [folder]/Data/Materials/.",
        default="",
        subtype='DIR_PATH',
    )
    export_all: BoolProperty(
        name="Export All (not just changed)",
        description="Re-export every tagged mesh even if unchanged since import",
        default=False,
    )
    export_bgsm: BoolProperty(
        name="Export BGSM",
        description="Write matching .bgsm material files under Data/Materials/",
        default=True,
    )
    write_manifest: BoolProperty(
        name="Write cell_changes.txt",
        description="Write a plain-text manifest of every file changed",
        default=True,
    )

    def invoke(self, context, event):
        col = bpy.data.collections.get(_CELL_COLLECTION)
        if col and not self.mod_folder:
            self.mod_folder = col.get("fo4_mod_folder", "")
        return context.window_manager.invoke_props_dialog(self, width=440)

    def draw(self, context):
        layout = self.layout
        layout.label(
            text="OUTPUT: game-ready NIF files (FBX needs CAO convert if no PyNifly)",
            icon='INFO',
        )
        layout.prop(self, "mod_folder")
        layout.prop(self, "export_all")
        layout.prop(self, "export_bgsm")
        layout.prop(self, "write_manifest")

    def execute(self, context):
        if not self.mod_folder:
            self.report({'ERROR'}, "Set the FO4 Data folder.")
            return {'CANCELLED'}

        col = bpy.data.collections.get(_CELL_COLLECTION)
        if not col:
            self.report({'ERROR'},
                f"Collection '{_CELL_COLLECTION}' not found. Import a cell first.")
            return {'CANCELLED'}

        mesh_objs = [o for o in col.all_objects
                     if o.type == 'MESH' and o.get(_PROP_NIF_PATH)]
        if not mesh_objs:
            self.report({'WARNING'}, "No tagged mesh objects. Import a cell first.")
            return {'CANCELLED'}

        exported, skipped, failed = [], [], []
        fbx_fallbacks = []

        for obj in mesh_objs:
            old_hash = obj.get(_PROP_MESH_HASH, "")
            new_hash = _mesh_hash(obj)

            if not self.export_all and old_hash and old_hash == new_hash:
                skipped.append(obj[_PROP_NIF_PATH])
                continue

            abs_nif = _resolve_nif_path(obj, self.mod_folder)
            os.makedirs(os.path.dirname(abs_nif), exist_ok=True)

            ok, exporter, msg = _export_nif(obj, abs_nif)
            if ok:
                obj[_PROP_MESH_HASH] = new_hash
                exported.append((obj[_PROP_NIF_PATH], exporter, msg))
                if "FBX" in exporter:
                    fbx_fallbacks.append(abs_nif)

                # BGSM
                if self.export_bgsm:
                    self._export_bgsm(obj, abs_nif)
            else:
                failed.append((obj[_PROP_NIF_PATH], msg))

        # Manifest
        if self.write_manifest:
            mpath = os.path.join(self.mod_folder, "cell_changes.txt")
            try:
                with open(mpath, 'w', encoding='utf-8') as mf:
                    mf.write("FO4 Cell Export Manifest\n" + "=" * 50 + "\n\n")
                    mf.write(f"Exported ({len(exported)}):\n")
                    for rel, exp, msg in exported:
                        mf.write(f"  [{exp}]  {rel}\n")
                        if "FBX" in exp:
                            mf.write(f"    ⚠ Convert to NIF with CAO before use!\n")
                    mf.write(f"\nUnchanged ({len(skipped)}):\n")
                    for rel in skipped:
                        mf.write(f"  [skip]   {rel}\n")
                    if failed:
                        mf.write(f"\nFailed ({len(failed)}):\n")
                        for rel, err in failed:
                            mf.write(f"  [FAIL]   {rel} — {err}\n")
            except Exception as e:
                self.report({'WARNING'}, f"Manifest write failed: {e}")

        summary = (
            f"Done: {len(exported)} exported, "
            f"{len(skipped)} unchanged, {len(failed)} failed"
        )
        lvl = 'WARNING' if failed or fbx_fallbacks else 'INFO'
        self.report({lvl}, summary)

        if fbx_fallbacks:
            self.report({'WARNING'},
                f"{len(fbx_fallbacks)} file(s) exported as FBX — NOT game-ready yet! "
                "Run Cathedral Assets Optimizer (CAO) to convert FBX → NIF: "
                "https://www.nexusmods.com/skyrimspecialedition/mods/23316")

        if exported and not fbx_fallbacks:
            self.report({'INFO'},
                "NIF files updated. Reload in CK: "
                "File > Data… → untick/retick your .esp to refresh assets.")

        return {'FINISHED'} if not failed else {'CANCELLED'}

    def _export_bgsm(self, obj, nif_abs: str) -> None:
        try:
            from . import bgsm_helpers
            # Mirror Meshes/ → Materials/
            rel  = os.path.relpath(nif_abs, self.mod_folder).replace('\\', '/')
            mrel = rel.replace('Meshes/', 'Materials/', 1).replace('.nif', '.bgsm')
            mabs = os.path.normpath(os.path.join(self.mod_folder, mrel))
            os.makedirs(os.path.dirname(mabs), exist_ok=True)
            for slot in obj.material_slots:
                mat = slot.material
                if mat:
                    bgsm_helpers.write_bgsm(
                        bgsm_helpers.blender_mat_to_bgsm(mat), mabs
                    )
                    break
        except Exception as e:
            print(f"[CK Cell] BGSM export error: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Operator 4: Quick re-export — single selected object
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_ExportCKObject(Operator):
    """
    Re-export the active object to its original NIF path.

    Fast single-object path — useful when you've changed just one mesh and
    don't want to wait for a full cell export scan.
    """
    bl_idname  = "fo4.export_ck_object"
    bl_label   = "Re-export Active Object → CK NIF"
    bl_description = (
        "Export the selected mesh back to its original NIF path. "
        "Requires PyNifly or Niftools for a game-ready NIF; "
        "otherwise exports FBX that must be converted with CAO."
    )
    bl_options = {'REGISTER'}

    mod_folder: StringProperty(
        name="Mod Output Folder", default="", subtype='DIR_PATH',
    )

    def invoke(self, context, event):
        col = bpy.data.collections.get(_CELL_COLLECTION)
        if col and not self.mod_folder:
            self.mod_folder = col.get("fo4_mod_folder", "")
        if not self.mod_folder:
            return context.window_manager.invoke_props_dialog(self, width=380)
        return self.execute(context)

    def draw(self, context):
        self.layout.prop(self, "mod_folder")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first.")
            return {'CANCELLED'}

        nif_rel = obj.get(_PROP_NIF_PATH)
        if not nif_rel:
            self.report({'ERROR'},
                f"'{obj.name}' has no fo4_nif_path tag. "
                "Import via 'Import CK Cell' first, or set the "
                "fo4_nif_path custom property manually (e.g. Meshes/MyMod/Thing.nif).")
            return {'CANCELLED'}

        mod_folder = self.mod_folder
        if not mod_folder:
            self.report({'ERROR'}, "Set the FO4 Data folder.")
            return {'CANCELLED'}

        abs_nif = _resolve_nif_path(obj, mod_folder)
        os.makedirs(os.path.dirname(abs_nif), exist_ok=True)

        ok, exporter, msg = _export_nif(obj, abs_nif)
        if ok:
            obj[_PROP_MESH_HASH] = _mesh_hash(obj)
            level = 'WARNING' if 'FBX' in exporter else 'INFO'
            self.report({level}, f"[{exporter}] {msg}")
            if 'FBX' in exporter:
                self.report({'WARNING'},
                    "FBX exported — NOT game-ready. "
                    "Convert to NIF with Cathedral Assets Optimizer before use.")
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, f"Export failed: {msg}")
            return {'CANCELLED'}


# ── Registration ───────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_ImportCKCell,
    FO4_OT_PrepareCellEdit,
    FO4_OT_ExportCKCell,
    FO4_OT_ExportCKObject,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[CK Cell] Could not register {cls.__name__}: {e}")
    print("[CK Cell] CK cell round-trip pipeline registered (FBX in → NIF out).")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
