"""
fo4_seam_tools.py
==================
Interactive, click-driven UV seam authoring for organic / branching meshes
(custom plants, creature limbs, tentacles, pipes -- anything built from a
"trunk + branches" quad-topology, not just plants specifically).

Why this exists
----------------
The addon's existing "Scan & Mark Seams" (FO4_OT_SmartSeamMark, operators.py)
is a *global*, dihedral-angle-based auto-seamer -- good for hard-surface
props, but it has no concept of "this is a branch, ring-seam its base" or
"split this branch lengthwise between these two points". Authoring clean,
low-distortion UVs for a hand-built organic mesh (so photo/hand-painted
textures read correctly) needs exactly those two targeted operations, done
per-branch, under the artist's control -- not a single global heuristic.

Both tools below are thin, click-driven wrappers around Blender's own
proven edge-topology algorithms rather than reimplementing ring/path
walking from scratch:

  Ring Seam Tool   (single click per branch)
    Click anywhere on a branch (near its base, or anywhere along a roughly
    cylindrical section) -> raycasts to the nearest edge under the cursor
    -> extends that edge into a full ring using Blender's native
    mesh.select_edge_ring_multi() (the same algorithm behind
    Ctrl+Alt+Click ring-select) -> marks the resulting ring as a seam.
    On a well-built quad-topology branch this ring wraps exactly around
    the branch's circumference at the clicked point -- e.g. right at
    the point it meets its parent trunk, separating it into its own UV
    island.

  Split Seam Tool  (click one end, then the other)
    Click near one end of a branch, then click near the other end ->
    raycasts each click to its nearest edge -> Blender's native
    mesh.shortest_path_select() computes the shortest edge path between
    those two edges along the mesh surface -> marks that path as a seam,
    splitting the branch lengthwise (like cutting a hot dog bun) so it
    unwraps flat with minimal stretching.

Both tools stay in a modal loop so you can seam every branch on a custom
plant/creature one click (or click-pair) at a time without re-invoking the
operator each time -- Right-click or Esc to finish. Undo (Ctrl+Z) rolls back
one seam operation at a time like any other edit.

Requirements: the mesh should have Edit Mode already reachable (any object
type check happens in poll()); both tools switch to Edge Select automatically.
Works best on quad-dominant topology -- on a triangulated/ngon-heavy mesh the
ring may terminate early at a pole, which is expected native Blender ring-
select behavior, not a bug in this tool.
"""

from __future__ import annotations

try:
    import bpy
    import bmesh
    import bpy_extras.view3d_utils as view3d_utils
    from bpy.types import Operator
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
except ImportError:
    bpy = None          # type: ignore[assignment]
    bmesh = None         # type: ignore[assignment]
    view3d_utils = None  # type: ignore[assignment]
    Operator = object     # type: ignore[assignment]
    Vector = None         # type: ignore[assignment]
    BVHTree = None         # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Shared raycast + nearest-edge helpers
# ---------------------------------------------------------------------------

def _mouse_ray(context, event):
    """Return (origin_world, direction_world) for the mouse position."""
    region = context.region
    rv3d = context.region_data
    coord = (event.mouse_region_x, event.mouse_region_y)
    origin = view3d_utils.region_2d_to_origin_3d(region, rv3d, coord)
    direction = view3d_utils.region_2d_to_vector_3d(region, rv3d, coord)
    return origin, direction


def _raycast_face(context, obj, event):
    """Raycast the mouse against *obj* (local space). Returns (face_index,
    hit location) or None.

    NOTE: this deliberately does NOT use Object.ray_cast(). That call is
    built on the object's evaluated/base mesh and does not reliably hit
    against the *live* Edit Mode bmesh -- verified directly against a real
    running Blender session: Object.ray_cast() returned no hit for rays
    that visibly passed straight through the mesh while it was being
    edited, even at the exact center of the viewport. Building a BVHTree
    from the live bmesh (mathutils.bvhtree.BVHTree.FromBMesh) and casting
    against that hits correctly, so that's what's used here. The BVH is
    rebuilt per-click rather than cached, since the bmesh can change
    (selection/seam edits) between clicks and this tool is only used at
    interactive click rates, not per-frame.

    NOTE 2: this returns a plain face *index*, not the BMFace itself.
    Returning the BMFace looked convenient (one fewer lookup for callers)
    but caused a real, reproducible crash verified against a live click in
    Blender: ``ReferenceError: BMesh data of type BMFace has been removed``
    when the caller used the returned face after making its own separate
    bmesh.from_edit_mesh(obj.data) call. Two calls to
    bmesh.from_edit_mesh() for the same mesh are not guaranteed to hand
    back BMElements that stay valid against each other -- Blender is free
    to rebuild its edit-mesh BMesh wrapper between them (e.g. on a
    redraw/header-text update), which silently invalidates BMFace/BMEdge/
    BMVert references taken from the earlier one. The fix is to never carry
    a BMesh element across two separate from_edit_mesh() acquisitions: hand
    back an index instead, and let the caller re-resolve
    bm.faces[face_index] against whichever single bm instance it is
    actually using for the rest of that click's work.
    """
    origin_world, direction_world = _mouse_ray(context, event)
    if origin_world is None or direction_world is None:
        return None

    mat_inv = obj.matrix_world.inverted()
    origin_local = mat_inv @ origin_world
    direction_local = (mat_inv.to_3x3() @ direction_world).normalized()

    bm = bmesh.from_edit_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    bvh = BVHTree.FromBMesh(bm)
    hit = bvh.ray_cast(origin_local, direction_local)
    if hit is None:
        return None
    location, normal, face_index, distance = hit
    if location is None or face_index is None or face_index < 0:
        return None
    if face_index >= len(bm.faces):
        return None
    return face_index, location


def _point_segment_distance(p, a, b):
    """Distance from point *p* to line segment a-b (all mathutils.Vector)."""
    ab = b - a
    len_sq = ab.length_squared
    if len_sq < 1e-12:
        return (p - a).length
    t = max(0.0, min(1.0, (p - a).dot(ab) / len_sq))
    closest = a + ab * t
    return (p - closest).length


def _nearest_edge_on_face(face, hit_location):
    """Return the BMEdge of *face* whose segment is closest to hit_location."""
    best_edge = None
    best_dist = None
    for edge in face.edges:
        a = edge.verts[0].co
        b = edge.verts[1].co
        d = _point_segment_distance(hit_location, a, b)
        if best_dist is None or d < best_dist:
            best_dist = d
            best_edge = edge
    return best_edge


def _ensure_edit_edge_mode(context, obj):
    """Make sure *obj* is the active object, in Edit Mode, Edge Select."""
    context.view_layer.objects.active = obj
    if obj.mode != 'EDIT':
        bpy.ops.object.mode_set(mode='EDIT')
    context.tool_settings.mesh_select_mode = (False, True, False)


def _select_single_edge(bm, obj, edge):
    """Clear selection, select *edge* alone, and make it active."""
    for e in bm.edges:
        e.select = False
    for v in bm.verts:
        v.select = False
    for f in bm.faces:
        f.select = False
    bm.select_history.clear()
    edge.select = True
    bm.select_history.add(edge)
    bm.select_flush(True)
    bmesh.update_edit_mesh(obj.data)


def _mark_selected_as_seam(bm, obj):
    """Mark every currently-selected edge as a UV seam, then clear selection
    (seams render independent of selection state, so this keeps the
    viewport tidy between clicks)."""
    count = 0
    for e in bm.edges:
        if e.select and not e.seam:
            e.seam = True
            count += 1
        e.select = False
    for v in bm.verts:
        v.select = False
    for f in bm.faces:
        f.select = False
    bm.select_flush(True)
    bmesh.update_edit_mesh(obj.data)
    return count


# ---------------------------------------------------------------------------
# Tool 1: Ring Seam at Point
# ---------------------------------------------------------------------------

class FO4_OT_RingSeamAtPoint(Operator):
    """Click a branch to seam a ring all the way around it at that point.

    Click near the base of a branch (where it meets its parent) to
    separate it into its own UV island, or anywhere along a cylindrical
    section. Uses Blender's native edge-ring algorithm, so it follows the
    mesh's real quad topology rather than an approximate direction guess.
    Stays active for repeated clicks -- seam every branch on the mesh in
    one pass. Right-click or Esc to finish."""
    bl_idname = "fo4.ring_seam_at_point"
    bl_label = "Ring Seam Tool (click a branch)"
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def _set_header(self, context, text):
        try:
            context.area.header_text_set(text)
        except Exception:
            pass

    def invoke(self, context, event):
        if context.area.type != 'VIEW_3D':
            self.report({'ERROR'}, "Run this from the 3D Viewport")
            return {'CANCELLED'}
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        _ensure_edit_edge_mode(context, obj)
        self._obj = obj
        self._seam_count = 0
        self._set_header(
            context,
            "Ring Seam Tool: Left-click a branch to ring-seam it around that "
            "point. Right-click / Esc to finish."
        )
        context.window_manager.modal_handler_add(self)
        return {'RUNNING_MODAL'}

    def modal(self, context, event):
        obj = self._obj
        if obj is None or obj.name not in bpy.data.objects or obj.mode != 'EDIT':
            self._finish(context)
            return {'CANCELLED'}

        if event.type == 'LEFTMOUSE' and event.value == 'PRESS':
            hit = _raycast_face(context, obj, event)
            if hit is not None:
                face_index, location = hit
                bm = bmesh.from_edit_mesh(obj.data)
                bm.faces.ensure_lookup_table()
                face = bm.faces[face_index]
                start_edge = _nearest_edge_on_face(face, location)
                if start_edge is not None:
                    _select_single_edge(bm, obj, start_edge)
                    try:
                        # NOTE: the ring-select operator id is
                        # mesh.select_edge_ring_multi (this is the actual
                        # Ctrl+Alt+Click ring-select operator) -- NOT
                        # mesh.loop_multi_select, which doesn't exist as a
                        # real operator in this Blender build (verified
                        # directly against the running Blender session:
                        # bpy.ops.mesh.loop_multi_select always raised
                        # "AttributeError: ...could not be found" at call
                        # time even though attribute access on bpy.ops
                        # succeeds for any name). select_edge_ring_multi
                        # takes no ring= argument -- it *is* the ring
                        # extension of the current edge selection. The
                        # explicit context override below keeps this
                        # nested bpy.ops call bound to the same
                        # window/area/region this modal is already running
                        # in.
                        with context.temp_override(window=context.window, area=context.area, region=context.region):
                            bpy.ops.mesh.select_edge_ring_multi()
                    except (RuntimeError, AttributeError) as e:
                        self.report({'WARNING'}, f"Ring select failed: {e}")
                    bm = bmesh.from_edit_mesh(obj.data)
                    n = _mark_selected_as_seam(bm, obj)
                    self._seam_count += 1
                    self._set_header(
                        context,
                        f"Ring Seam Tool: {self._seam_count} ring(s) seamed "
                        f"({n} edges this ring). Left-click another branch, "
                        "or Right-click / Esc to finish."
                    )
            return {'RUNNING_MODAL'}

        if event.type in {'RIGHTMOUSE', 'ESC'}:
            self._finish(context)
            self.report({'INFO'}, f"Ring Seam Tool: {self._seam_count} ring(s) seamed.")
            return {'FINISHED'}

        # Let camera navigation (MMB orbit/pan, scroll zoom, numpad views,
        # etc.) pass through untouched.
        return {'PASS_THROUGH'}

    def _finish(self, context):
        self._set_header(context, None)

    def cancel(self, context):
        self._finish(context)


# ---------------------------------------------------------------------------
# Tool 2: Split Seam Between Two Points
# ---------------------------------------------------------------------------

class FO4_OT_SplitSeamBetweenPoints(Operator):
    """Click one end of a branch, then the other, to split it lengthwise.

    Uses Blender's native shortest-edge-path algorithm to seam the most
    direct route between the two clicked points along the mesh surface --
    the same as cutting a hot dog bun lengthwise, so a cylindrical branch
    unwraps flat with minimal stretching. Stays active for repeated
    click-pairs -- split every branch on the mesh in one pass. Right-click
    or Esc to finish."""
    bl_idname = "fo4.split_seam_between_points"
    bl_label = "Split Seam Tool (click two ends)"
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def _set_header(self, context, text):
        try:
            context.area.header_text_set(text)
        except Exception:
            pass

    def invoke(self, context, event):
        if context.area.type != 'VIEW_3D':
            self.report({'ERROR'}, "Run this from the 3D Viewport")
            return {'CANCELLED'}
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        _ensure_edit_edge_mode(context, obj)
        self._obj = obj
        self._first_edge = None
        self._seam_count = 0
        self._set_header(
            context,
            "Split Seam Tool: Left-click one end of a branch, then the "
            "other end. Right-click / Esc to finish."
        )
        context.window_manager.modal_handler_add(self)
        return {'RUNNING_MODAL'}

    def modal(self, context, event):
        obj = self._obj
        if obj is None or obj.name not in bpy.data.objects or obj.mode != 'EDIT':
            self._finish(context)
            return {'CANCELLED'}

        if event.type == 'LEFTMOUSE' and event.value == 'PRESS':
            hit = _raycast_face(context, obj, event)
            if hit is not None:
                face_index, location = hit
                bm = bmesh.from_edit_mesh(obj.data)
                bm.faces.ensure_lookup_table()
                face = bm.faces[face_index]
                edge = _nearest_edge_on_face(face, location)
                if edge is not None:
                    if self._first_edge is None:
                        # First click of the pair: select it alone, remember it.
                        _select_single_edge(bm, obj, edge)
                        self._first_edge = edge
                        self._set_header(
                            context,
                            "Split Seam Tool: first point picked -- now "
                            "left-click the other end. Right-click / Esc to finish."
                        )
                    else:
                        # Second click: add to selection/history (without
                        # clearing the first pick), then let Blender compute
                        # the shortest edge path between them.
                        edge.select = True
                        bm.select_history.add(edge)
                        bm.select_flush(True)
                        bmesh.update_edit_mesh(obj.data)
                        try:
                            # See the matching comment in FO4_OT_RingSeamAtPoint
                            # above: explicit context override makes this
                            # nested bpy.ops call resolve reliably when
                            # invoked from inside this operator's own modal().
                            with context.temp_override(window=context.window, area=context.area, region=context.region):
                                bpy.ops.mesh.shortest_path_select()
                        except (RuntimeError, AttributeError) as e:
                            self.report({'WARNING'}, f"Shortest path failed: {e}")
                        bm = bmesh.from_edit_mesh(obj.data)
                        n = _mark_selected_as_seam(bm, obj)
                        self._seam_count += 1
                        self._first_edge = None
                        self._set_header(
                            context,
                            f"Split Seam Tool: {self._seam_count} split(s) seamed "
                            f"({n} edges last split). Left-click one end of the "
                            "next branch, or Right-click / Esc to finish."
                        )
            return {'RUNNING_MODAL'}

        if event.type in {'RIGHTMOUSE', 'ESC'}:
            self._finish(context)
            self.report({'INFO'}, f"Split Seam Tool: {self._seam_count} split(s) seamed.")
            return {'FINISHED'}

        return {'PASS_THROUGH'}

    def _finish(self, context):
        self._set_header(context, None)

    def cancel(self, context):
        self._finish(context)


# ---------------------------------------------------------------------------
# Convenience: exit edit mode + jump straight to Hybrid Unwrap
# ---------------------------------------------------------------------------

class FO4_OT_FinishBranchSeamsAndUnwrap(Operator):
    """Exit Edit Mode and run Hybrid Unwrap using the seams just placed
    with the Ring / Split Seam tools above."""
    bl_idname = "fo4.finish_branch_seams_and_unwrap"
    bl_label = "Finish Seaming -> Unwrap"
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def execute(self, context):
        obj = context.active_object
        if obj.mode == 'EDIT':
            bpy.ops.object.mode_set(mode='OBJECT')
        try:
            bpy.ops.fo4.hybrid_unwrap()
        except RuntimeError as e:
            self.report({'ERROR'}, f"Hybrid Unwrap failed: {e}")
            return {'CANCELLED'}
        self.report({'INFO'}, "Branch seams applied -- mesh unwrapped.")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_CLASSES = [
    FO4_OT_RingSeamAtPoint,
    FO4_OT_SplitSeamBetweenPoints,
    FO4_OT_FinishBranchSeamsAndUnwrap,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[Seam Tools] Could not register {cls.__name__}: {e}")
    print("[Seam Tools] FO4 branch/part seam tools registered.")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
