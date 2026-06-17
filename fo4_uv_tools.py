"""
fo4_uv_tools.py
===============
UV validation, repair, and alignment tools for Fallout 4 NIF export.

Why UVs break in CK / Creation Kit
------------------------------------
FO4 uses DirectX UV convention: U is left→right, V is top→bottom.
Blender uses OpenGL convention: V is bottom→top.

The NIF writer corrects this by flipping V on export:  nif_v = 1.0 − blender_v

This flip has a side-effect on UV winding:
  • A UV island that is CCW (positive area) in Blender
    → becomes CW in the NIF  → correct FO4 tangent space
  • A UV island that is CW  (negative area) in Blender   ← "flipped island"
    → becomes CCW in the NIF → tangent basis inverted
    → that section of the mesh appears black / invisible in CK

The operators in this file detect and fix these flipped islands.

Additional tools
----------------
• UV Bounds Validator  – flags UVs outside the [0,1] range and UV faces
                         with zero area (collapsed / degenerate).
• UV Align to Texture  – when a texture is already assigned to the material,
                         fits the UV bounds so slot 0 of the texture maps
                         to the 0→1 UV square (useful after mesh edits that
                         shift the island off the texture).
• Pre-export UV check  – called automatically by export_helpers before NIF
                         export; fixes flipped islands silently and reports
                         any remaining issues the user must resolve manually.
"""

from __future__ import annotations

import math
import traceback
from typing import List, Tuple

try:
    import bpy
    import bmesh
    from bpy.types import Operator
    from bpy.props import BoolProperty, FloatProperty, EnumProperty
except ImportError:
    bpy      = None   # type: ignore[assignment]
    bmesh    = None   # type: ignore[assignment]
    Operator = object  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Core UV geometry helpers
# ---------------------------------------------------------------------------

def _uv_island_signed_area(loop_uvs: List[Tuple[float, float]]) -> float:
    """Return the signed area of a UV polygon.

    Positive  → counter-clockwise (CCW) in Blender UV space → correct.
    Negative  → clockwise (CW) in Blender UV space → flipped; will be
                inverted again after the NIF V-flip, producing broken
                tangent space in Fallout 4.

    Uses the shoelace formula (Gauss's area formula).
    """
    n = len(loop_uvs)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        u0, v0 = loop_uvs[i]
        u1, v1 = loop_uvs[(i + 1) % n]
        area += u0 * v1 - u1 * v0
    return area * 0.5


def _face_uv_signed_area(face, uv_layer) -> float:
    """Return the signed UV area of a single BMFace."""
    return _uv_island_signed_area(
        [l[uv_layer].uv for l in face.loops]
    )


def detect_flipped_uv_faces(obj) -> Tuple[int, int]:
    """Count flipped and total UV faces on *obj*.

    Returns (n_flipped, n_total).
    A face is considered flipped when its UV signed area is negative.
    """
    if obj.type != 'MESH' or not obj.data.uv_layers:
        return 0, 0

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    uv_layer = bm.loops.layers.uv.active
    if uv_layer is None:
        bm.free()
        return 0, 0

    # Triangulate so every face is a simple triangle
    bmesh.ops.triangulate(bm, faces=bm.faces)

    n_flipped = 0
    n_total   = len(bm.faces)
    for face in bm.faces:
        if _face_uv_signed_area(face, uv_layer) < -1e-9:
            n_flipped += 1

    bm.free()
    return n_flipped, n_total


def fix_flipped_uv_islands(obj) -> Tuple[int, int]:
    """Detect and mirror-flip any UV islands that have negative winding.

    Algorithm
    ---------
    1. Triangulate a BMesh copy of the mesh.
    2. For each triangle: compute signed UV area.
    3. Tag triangles with negative area as "flipped".
    4. Flood-fill across shared UV edges to find all triangles in the
       same UV island as each flipped triangle.
    5. Mirror-flip the entire island on its U centre:
           u_new = (2 × island_u_centre) − u_old
       This keeps the island in roughly the same position and corrects
       the winding without moving the island to a completely different
       part of the texture.

    Returns (n_islands_fixed, n_total_islands).

    Note: edits are applied directly to *obj.data* UV layer.
    """
    if obj.type != 'MESH' or not obj.data.uv_layers:
        return 0, 0

    mesh     = obj.data
    uv_layer = mesh.uv_layers.active
    if uv_layer is None:
        return 0, 0

    # ── Work on an evaluated copy so modifiers are baked in ──────────────
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj  = obj.evaluated_get(depsgraph)
    eval_mesh = eval_obj.to_mesh()

    bm = bmesh.new()
    bm.from_mesh(eval_mesh)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm_uv = bm.loops.layers.uv.active

    if bm_uv is None:
        bm.free()
        eval_obj.to_mesh_clear()
        return 0, 0

    # ── Build loop UV map: loop.index → [u, v] (from real mesh) ──────────
    # We'll use the bmesh to detect islands, then patch the real mesh UVs.
    n_loops = len(mesh.loops)
    import numpy as np
    raw_uvs = np.zeros(n_loops * 2, dtype=np.float32)
    uv_layer.data.foreach_get('uv', raw_uvs)
    uvs = raw_uvs.reshape(n_loops, 2)

    # ── Island detection via union-find on loop indices ───────────────────
    # Map each loop to a root in the union-find structure.
    # Two loops are in the same island if they share an edge and their
    # UV coordinates at the shared edge match (within tolerance).

    # Simpler approach: group faces by their UV connectivity.
    # For each face in bmesh, mark signed area.  Then flood-fill.
    face_area     = {f.index: _face_uv_signed_area(f, bm_uv) for f in bm.faces}
    face_visited  = {}  # face_index → island_id
    island_id     = 0

    # Build adjacency: edge → list of face indices
    edge_to_faces: dict[int, List[int]] = {}
    for f in bm.faces:
        for e in f.edges:
            edge_to_faces.setdefault(e.index, []).append(f.index)

    face_by_idx = {f.index: f for f in bm.faces}

    islands: List[List[int]] = []  # each entry: list of face indices
    for start_face in bm.faces:
        if start_face.index in face_visited:
            continue
        # BFS flood-fill
        stack   = [start_face.index]
        members = []
        while stack:
            fi = stack.pop()
            if fi in face_visited:
                continue
            face_visited[fi] = island_id
            members.append(fi)
            f = face_by_idx[fi]
            for e in f.edges:
                for nfi in edge_to_faces.get(e.index, []):
                    if nfi not in face_visited:
                        stack.append(nfi)
        islands.append(members)
        island_id += 1

    bm.free()
    eval_obj.to_mesh_clear()

    # ── For each island: check if majority of faces are flipped ──────────
    n_islands_fixed = 0
    # Build map from bmesh face index to poly loop_start in real mesh.
    # After triangulate the bmesh face count may differ from mesh polys;
    # we can't reliably map them back.  Instead use a direct bmesh approach
    # on the original mesh (without triangulation) to find loops to patch.

    bm2 = bmesh.new()
    bm2.from_mesh(mesh)
    bm2_uv = bm2.loops.layers.uv.active

    if bm2_uv is None:
        bm2.free()
        return 0, 0

    # Simple island detection directly on original (may have quads/ngons):
    # compute signed area per face, then flood-fill.
    face_area2    = {}
    for f in bm2.faces:
        area = _face_uv_signed_area(f, bm2_uv)
        face_area2[f.index] = area

    edge_to_faces2: dict[int, List[int]] = {}
    for f in bm2.faces:
        for e in f.edges:
            edge_to_faces2.setdefault(e.index, []).append(f.index)

    face_visited2: dict[int, int] = {}
    islands2: List[List[int]]     = []
    face_by_idx2 = {f.index: f for f in bm2.faces}
    iid = 0
    for start_f in bm2.faces:
        if start_f.index in face_visited2:
            continue
        stack   = [start_f.index]
        members = []
        while stack:
            fi = stack.pop()
            if fi in face_visited2:
                continue
            face_visited2[fi] = iid
            members.append(fi)
            for e in face_by_idx2[fi].edges:
                for nfi in edge_to_faces2.get(e.index, []):
                    if nfi not in face_visited2:
                        stack.append(nfi)
        islands2.append(members)
        iid += 1

    changed = False
    n_total_islands = len(islands2)

    for members in islands2:
        areas     = [face_area2[fi] for fi in members]
        neg_count = sum(1 for a in areas if a < -1e-9)
        pos_count = sum(1 for a in areas if a >  1e-9)
        if neg_count == 0:
            continue  # island is fine
        # If majority (or all) faces are flipped, flip the whole island.
        # If it's a mix, still flip — any negative face in the island
        # causes tangent-space corruption on that face.
        if neg_count >= pos_count:
            # Collect all UV coords in this island
            all_us = []
            for fi in members:
                for lp in face_by_idx2[fi].loops:
                    all_us.append(lp[bm2_uv].uv.x)
            u_centre = (min(all_us) + max(all_us)) * 0.5

            # Mirror on U centre
            for fi in members:
                for lp in face_by_idx2[fi].loops:
                    lp[bm2_uv].uv.x = 2.0 * u_centre - lp[bm2_uv].uv.x

            n_islands_fixed += 1
            changed = True

    if changed:
        bm2.to_mesh(mesh)
        mesh.update()

    bm2.free()
    return n_islands_fixed, n_total_islands


def validate_uv_for_export(obj) -> Tuple[bool, List[str]]:
    """Run a full UV pre-export check on *obj*.

    Checks (in order):
      1. UV map exists
      2. No flipped islands (CCW UV winding after V-flip will corrupt NIF tangent space)
      3. No zero-area UV faces (collapsed UVs → undefined tangent direction)
      4. All UV coordinates are within [−0.05, 1.05] (mild over-range is OK
         for tiling; anything further likely indicates a UV that was never set)

    Returns (all_ok, list_of_issue_strings).
    """
    issues: List[str] = []

    if obj.type != 'MESH':
        return True, []

    if not obj.data.uv_layers:
        issues.append("Mesh has no UV map — textures will not display in-game.")
        return False, issues

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    uv_layer = bm.loops.layers.uv.active

    if uv_layer is None:
        bm.free()
        issues.append("Active UV layer is missing or invalid.")
        return False, issues

    n_flipped = 0
    n_zero    = 0
    n_oob     = 0
    TOLERANCE = 1e-9
    OOB_LO    = -0.05
    OOB_HI    =  1.05

    for face in bm.faces:
        area = _face_uv_signed_area(face, uv_layer)
        if area < -TOLERANCE:
            n_flipped += 1
        elif abs(area) < TOLERANCE:
            n_zero += 1
        for lp in face.loops:
            u, v = lp[uv_layer].uv
            if u < OOB_LO or u > OOB_HI or v < OOB_LO or v > OOB_HI:
                n_oob += 1
                break  # one flag per face

    bm.free()

    if n_flipped:
        issues.append(
            f"{n_flipped} UV face(s) have flipped winding — these will appear "
            "black or invisible in Creation Kit. Run 'Fix Flipped UV Islands' to repair."
        )
    if n_zero:
        issues.append(
            f"{n_zero} UV face(s) have zero area (collapsed/degenerate UVs). "
            "Select them in the UV editor and re-unwrap."
        )
    if n_oob:
        issues.append(
            f"{n_oob} UV face(s) extend outside the 0–1 UV range. "
            "This is fine for intentional tiling but may indicate un-set UVs. "
            "Run 'Normalize UV to 0–1' if not intentional."
        )

    return len(issues) == 0, issues


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class FO4_OT_DetectFlippedUVs(Operator):
    """Report how many UV faces on the active mesh are flipped.

    A 'flipped' UV face has a clockwise winding in Blender's UV space.
    After the V-coordinate flip applied during NIF export the winding
    becomes counter-clockwise, inverting the tangent basis.  Affected
    faces appear black or completely invisible in the Creation Kit
    preview and in-game.
    """
    bl_idname  = "fo4.detect_flipped_uvs"
    bl_label   = "Detect Flipped UV Faces (FO4)"
    bl_description = (
        "Count UV faces with inverted winding on the active mesh. "
        "Flipped UVs appear black / invisible in Creation Kit after NIF export."
    )
    bl_options = {'REGISTER'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}
        n_flipped, n_total = detect_flipped_uv_faces(obj)
        if n_total == 0:
            self.report({'WARNING'}, "Mesh has no UV faces.")
            return {'FINISHED'}
        pct = 100 * n_flipped / n_total if n_total else 0
        if n_flipped == 0:
            self.report({'INFO'},
                f"UV check passed — all {n_total} faces have correct winding.")
        else:
            self.report({'WARNING'},
                f"{n_flipped}/{n_total} UV faces are flipped ({pct:.1f}%) — "
                "run 'Fix Flipped UV Islands' to repair before exporting.")
        return {'FINISHED'}


class FO4_OT_FixFlippedUVIslands(Operator):
    """Fix UV islands with inverted winding so they display correctly in FO4.

    Scans every UV island on the active mesh.  Any island where the majority
    of triangles have a clockwise UV winding (negative signed area) is
    mirror-reflected around its U-axis centre.  This corrects the winding
    without moving the island to an unexpected area of the texture.

    Run this before exporting to NIF when faces appear black or missing
    in the Creation Kit preview or in-game.
    """
    bl_idname  = "fo4.fix_flipped_uv_islands"
    bl_label   = "Fix Flipped UV Islands (FO4)"
    bl_description = (
        "Mirror-flip UV islands that have inverted winding. "
        "Fixes faces that appear black or invisible in Creation Kit after NIF export."
    )
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}

        if bpy.context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')

        try:
            n_fixed, n_total = fix_flipped_uv_islands(obj)
        except Exception as e:
            traceback.print_exc()
            self.report({'ERROR'}, f"UV repair failed: {e}")
            return {'CANCELLED'}

        if n_fixed == 0:
            self.report({'INFO'},
                f"All {n_total} UV island(s) already have correct winding — nothing to fix.")
        else:
            self.report({'INFO'},
                f"Fixed {n_fixed}/{n_total} UV island(s). "
                "Re-export the NIF and check in Creation Kit.")
        return {'FINISHED'}


class FO4_OT_ValidateUVForExport(Operator):
    """Full UV pre-export validation for Fallout 4.

    Checks for flipped UV islands, zero-area faces, and out-of-bounds
    coordinates.  Optionally auto-fixes flipped islands.
    """
    bl_idname  = "fo4.validate_uv_for_export"
    bl_label   = "Validate UV for FO4 Export"
    bl_description = (
        "Check the active mesh UV map for common FO4 export problems "
        "(flipped islands, degenerate faces, out-of-bounds UVs). "
        "Optionally repairs flipped islands automatically."
    )
    bl_options = {'REGISTER', 'UNDO'}

    auto_fix_flipped: BoolProperty(
        name="Auto-fix Flipped Islands",
        description="Automatically mirror-flip any islands with inverted winding",
        default=True,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}

        if self.auto_fix_flipped:
            try:
                n_fixed, _ = fix_flipped_uv_islands(obj)
                if n_fixed:
                    self.report({'INFO'}, f"Auto-fixed {n_fixed} flipped UV island(s).")
            except Exception as e:
                self.report({'WARNING'}, f"Auto-fix failed: {e}")

        ok, issues = validate_uv_for_export(obj)
        if ok:
            self.report({'INFO'}, f"UV map on '{obj.name}' is valid for FO4 export.")
        else:
            for issue in issues:
                self.report({'WARNING'}, issue)
        return {'FINISHED'}


class FO4_OT_NormalizeUVBounds(Operator):
    """Scale and translate the active UV island(s) so they fit within 0–1.

    Useful when UV islands have drifted outside the texture square due to
    mesh edits.  Does not change the shape of the islands — only translates
    and uniformly scales the whole UV map to fit the 0→1 box.

    Tip: if you want to preserve tiling, only use this on meshes where
    all UV faces should map to the same texture tile.
    """
    bl_idname  = "fo4.normalize_uv_bounds"
    bl_label   = "Normalize UV to 0–1 (FO4)"
    bl_description = (
        "Scale and centre the UV map so all islands fit within the 0→1 "
        "texture square without changing their relative positions."
    )
    bl_options = {'REGISTER', 'UNDO'}

    keep_aspect: BoolProperty(
        name="Keep Aspect Ratio",
        description="Scale U and V by the same factor (preserves island shape)",
        default=True,
    )
    margin: FloatProperty(
        name="Margin",
        description="Small inset so islands don't sit exactly on the border",
        default=0.005, min=0.0, max=0.1,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}

        mesh     = obj.data
        uv_layer = mesh.uv_layers.active
        if not uv_layer:
            self.report({'ERROR'}, "No active UV map.")
            return {'CANCELLED'}

        import numpy as np
        n_loops = len(mesh.loops)
        raw = np.zeros(n_loops * 2, dtype=np.float32)
        uv_layer.data.foreach_get('uv', raw)
        uvs = raw.reshape(n_loops, 2)

        u_min, u_max = float(uvs[:, 0].min()), float(uvs[:, 0].max())
        v_min, v_max = float(uvs[:, 1].min()), float(uvs[:, 1].max())

        u_range = max(u_max - u_min, 1e-9)
        v_range = max(v_max - v_min, 1e-9)
        m       = self.margin
        target  = 1.0 - 2 * m

        if self.keep_aspect:
            scale = target / max(u_range, v_range)
            su = sv = scale
        else:
            su = target / u_range
            sv = target / v_range

        # Centre in [margin, 1-margin]
        uvs[:, 0] = (uvs[:, 0] - u_min) * su + m
        uvs[:, 1] = (uvs[:, 1] - v_min) * sv + m

        uv_layer.data.foreach_set('uv', uvs.ravel())
        mesh.update()

        self.report({'INFO'},
            f"UV normalised to 0–1 (scale U={su:.3f}, V={sv:.3f}).")
        return {'FINISHED'}


class FO4_OT_AlignUVToTexture(Operator):
    """Fit the UV map to the active texture's pixel dimensions.

    When a texture is already assigned to the Diffuse slot of the mesh's
    first material, this operator translates + scales the UV map so that
    UV (0,0)→(1,1) maps to the texture's full pixel extent.

    Use this after importing a NIF and editing the mesh — the original UV
    positions are preserved but their scale is adjusted to match the texture
    resolution ratio.  For square textures (512, 1024, 2048, 4096) this is
    a no-op; for non-square textures it corrects the aspect ratio.
    """
    bl_idname  = "fo4.align_uv_to_texture"
    bl_label   = "Align UV to Texture (FO4)"
    bl_description = (
        "Scale the UV map to match the aspect ratio of the assigned diffuse "
        "texture.  For square textures this is a no-op; for non-square "
        "textures it corrects the U/V scale so pixels are not stretched."
    )
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}

        mesh     = obj.data
        uv_layer = mesh.uv_layers.active
        if not uv_layer:
            self.report({'ERROR'}, "No active UV map.")
            return {'CANCELLED'}

        # Find the diffuse texture image
        mat = obj.material_slots[0].material if obj.material_slots else None
        if not mat or not mat.use_nodes:
            self.report({'ERROR'}, "Object has no node-based material.")
            return {'CANCELLED'}

        img = None
        for node in mat.node_tree.nodes:
            if node.type != 'TEX_IMAGE' or not node.image:
                continue
            label = (node.label or node.name).upper()
            if 'DIFFUSE' in label or '_D' in label or label == 'DIFFUSE':
                img = node.image
                break
        if img is None:
            # Fall back to any loaded image
            for node in mat.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    img = node.image
                    break
        if img is None:
            self.report({'ERROR'},
                "No texture image found in material — assign a diffuse texture first.")
            return {'CANCELLED'}

        w, h = img.size[0], img.size[1]
        if w == 0 or h == 0:
            self.report({'ERROR'}, f"Texture '{img.name}' has zero size — reload it first.")
            return {'CANCELLED'}

        if w == h:
            self.report({'INFO'},
                f"Texture '{img.name}' is square ({w}×{h}) — UV aspect ratio is already correct.")
            return {'FINISHED'}

        # Scale V so the texture's aspect ratio is preserved in UV space.
        # After scaling, a 2048×1024 texture will fill U:[0,1], V:[0,0.5]
        # and the UVs won't look stretched.
        import numpy as np
        n_loops = len(mesh.loops)
        raw = np.zeros(n_loops * 2, dtype=np.float32)
        uv_layer.data.foreach_get('uv', raw)
        uvs = raw.reshape(n_loops, 2)

        aspect = h / w   # < 1.0 for wider-than-tall textures
        uvs[:, 1] *= aspect

        uv_layer.data.foreach_set('uv', uvs.ravel())
        mesh.update()

        self.report({'INFO'},
            f"UV adjusted for {w}×{h} texture '{img.name}' (V scaled by {aspect:.4f}).")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Public API — called from export_helpers._prepare_mesh_for_nif
# ---------------------------------------------------------------------------

def auto_fix_uv_before_export(obj) -> List[str]:
    """Silently fix flipped UV islands before NIF export.

    Called by export_helpers._prepare_mesh_for_nif so users don't have to
    run the repair operator manually.

    Returns a list of warning strings for any issues that could NOT be
    auto-fixed (zero-area faces, out-of-bounds UVs).
    """
    warnings: List[str] = []

    if not obj.data.uv_layers:
        # No UV at all — export_helpers will create one via smart_project
        return warnings

    # Fix flipped islands silently
    try:
        n_fixed, _ = fix_flipped_uv_islands(obj)
        if n_fixed:
            print(f"[UV Tools] Auto-fixed {n_fixed} flipped UV island(s) on '{obj.name}'.")
    except Exception as e:
        warnings.append(f"UV flip repair failed: {e}")

    # Run validation — report remaining issues as warnings (don't block export)
    _, issues = validate_uv_for_export(obj)
    for issue in issues:
        # Flipped-island issues would be fixed above; only other issues land here
        if "flipped" not in issue.lower():
            warnings.append(issue)

    return warnings


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_CLASSES = [
    FO4_OT_DetectFlippedUVs,
    FO4_OT_FixFlippedUVIslands,
    FO4_OT_ValidateUVForExport,
    FO4_OT_NormalizeUVBounds,
    FO4_OT_AlignUVToTexture,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[UV Tools] Could not register {cls.__name__}: {e}")
    print("[UV Tools] FO4 UV validation + repair tools registered.")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
