"""fo4_navmesh_generator.py — Auto-generate and validate FO4 navmesh."""
import bpy, bmesh, math, os
from mathutils import Vector

# FO4 navmesh limits
NAVMESH_LIMITS = {
    "max_vertices": 32767,
    "max_triangles": 16384,
    "min_triangle_area": 0.01,  # m² minimum triangle size
    "max_slope_degrees": 45.0,  # walkable slope limit
}

NAVMESH_COVER_TYPES = [
    ("NONE",   "None",        "No cover"),
    ("LEFT",   "Cover Left",  "Left-side cover position"),
    ("RIGHT",  "Cover Right", "Right-side cover position"),
    ("EDGE",   "Cover Edge",  "Edge/ledge cover"),
]


def generate_navmesh_from_scene(source_objects: list,
                                  agent_height: float = 1.8,
                                  agent_radius: float = 0.3,
                                  max_slope: float = 45.0) -> tuple:
    """Generate a navmesh from walkable surfaces in source_objects.

    Uses Blender's built-in remesh + geometry to produce a flat triangle
    mesh suitable for FO4 navmesh export.

    Returns (navmesh_obj, message).
    """
    up = Vector((0, 0, 1))
    walkable_verts = []
    walkable_faces = []
    vert_offset    = 0

    for obj in source_objects:
        if obj.type != 'MESH':
            continue
        if obj.name.startswith("FO4_NAV"):
            continue   # skip existing navmeshes

        mw = obj.matrix_world
        me = obj.data
        bm = bmesh.new()
        bm.from_mesh(me)

        for face in bm.faces:
            world_normal = (mw.to_3x3() @ face.normal).normalized()
            slope = math.degrees(math.acos(max(-1, min(1, world_normal.dot(up)))))
            if slope > max_slope:
                continue
            verts_world = [(mw @ v.co) for v in face.verts]
            # Snap to ground plane (slightly above to avoid z-fighting)
            avg_z = sum(v.z for v in verts_world) / len(verts_world)
            verts_flat = [Vector((v.x, v.y, avg_z + 0.01)) for v in verts_world]
            face_indices = list(range(vert_offset, vert_offset + len(verts_flat)))
            walkable_verts.extend(verts_flat)
            # Triangulate n-gons
            if len(verts_flat) == 3:
                walkable_faces.append(face_indices)
            elif len(verts_flat) == 4:
                walkable_faces.append(face_indices[:3])
                walkable_faces.append([face_indices[0], face_indices[2], face_indices[3]])
            elif len(verts_flat) > 4:
                for i in range(1, len(verts_flat)-1):
                    walkable_faces.append([face_indices[0], face_indices[i], face_indices[i+1]])
            vert_offset += len(verts_flat)
        bm.free()

    if not walkable_faces:
        return None, "No walkable surfaces found (check slope limit and selected objects)"

    # Build navmesh mesh
    nav_mesh = bpy.data.meshes.new("FO4_NavMesh")
    nav_obj  = bpy.data.objects.new("FO4_NavMesh", nav_mesh)
    bpy.context.collection.objects.link(nav_obj)

    nav_mesh.from_pydata([v[:] for v in walkable_verts], [], walkable_faces)
    nav_mesh.update()

    # Merge duplicate vertices
    bm2 = bmesh.new()
    bm2.from_mesh(nav_mesh)
    bmesh.ops.remove_doubles(bm2, verts=bm2.verts, dist=0.05)
    bmesh.ops.triangulate(bm2, faces=bm2.faces)
    bm2.to_mesh(nav_mesh)
    bm2.free()

    nav_obj["fo4_navmesh"]    = True
    nav_obj["fo4_agent_height"] = agent_height
    nav_obj["fo4_agent_radius"] = agent_radius
    nav_obj.display_type      = 'WIRE'

    # Tag with a bright green material
    mat = bpy.data.materials.new("FO4_NavMesh_mat")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.0, 1.0, 0.3, 1.0)
    nav_obj.data.materials.append(mat)

    vcount = len(nav_mesh.vertices)
    fcount = len(nav_mesh.polygons)
    return nav_obj, f"NavMesh: {vcount} verts, {fcount} tris"


def validate_navmesh(nav_obj) -> dict:
    """Validate a navmesh against FO4 limits and geometry rules."""
    issues = []
    me     = nav_obj.data
    vcount = len(me.vertices)
    fcount = len(me.polygons)

    if vcount > NAVMESH_LIMITS["max_vertices"]:
        issues.append({
            "severity": "ERROR",
            "message":  f"Too many vertices: {vcount} (limit: {NAVMESH_LIMITS['max_vertices']})",
            "fix":      "Decimate the navmesh or split into multiple cells",
        })
    if fcount > NAVMESH_LIMITS["max_triangles"]:
        issues.append({
            "severity": "ERROR",
            "message":  f"Too many triangles: {fcount} (limit: {NAVMESH_LIMITS['max_triangles']})",
            "fix":      "Decimate the navmesh",
        })
    # Check all-tris
    non_tris = [p for p in me.polygons if len(p.vertices) != 3]
    if non_tris:
        issues.append({
            "severity": "ERROR",
            "message":  f"{len(non_tris)} non-triangle faces — FO4 navmesh must be all-tris",
            "fix":      "Apply Triangulate modifier",
        })
    # Check manifold (no open edges)
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.edges.ensure_lookup_table()
    open_edges = [e for e in bm.edges if len(e.link_faces) < 2]
    bm.free()
    if open_edges:
        issues.append({
            "severity": "WARNING",
            "message":  f"{len(open_edges)} open edges — navmesh should be manifold for best results",
            "fix":      "Fill holes or use Mesh → Clean Up → Fill Holes",
        })

    return {
        "vertex_count":   vcount,
        "triangle_count": fcount,
        "issues":         issues,
        "errors":         [i for i in issues if i["severity"] == "ERROR"],
        "warnings":       [i for i in issues if i["severity"] == "WARNING"],
        "valid":          not any(i["severity"] == "ERROR" for i in issues),
        "vert_pct":       vcount / NAVMESH_LIMITS["max_vertices"] * 100,
        "tri_pct":        fcount / NAVMESH_LIMITS["max_triangles"] * 100,
    }


def add_cover_marker(location, cover_type: str = "LEFT",
                      angle_degrees: float = 0.0) -> bpy.types.Object:
    """Place a cover marker empty at a position."""
    bpy.ops.object.empty_add(type='ARROWS', location=location)
    emp = bpy.context.active_object
    emp.name = f"FO4_Cover_{cover_type}_{len(bpy.data.objects)}"
    emp.rotation_euler.z = math.radians(angle_degrees)
    emp["fo4_cover_type"] = cover_type
    emp.display_size = 0.3
    return emp


# Operators

class FO4_OT_GenerateNavMesh(bpy.types.Operator):
    """Auto-generate a FO4 navmesh from selected floor/ground objects."""
    bl_idname  = "fo4.generate_navmesh"
    bl_label   = "Generate NavMesh"
    bl_options = {'REGISTER', 'UNDO'}

    max_slope: bpy.props.FloatProperty(
        name="Max Walkable Slope (°)", default=45.0, min=5.0, max=80.0,
    )
    agent_height: bpy.props.FloatProperty(name="Agent Height", default=1.8)
    agent_radius: bpy.props.FloatProperty(name="Agent Radius", default=0.3)

    def execute(self, context):
        objects = list(context.selected_objects) if context.selected_objects \
                  else [o for o in context.scene.objects if o.type == 'MESH']
        nav_obj, msg = generate_navmesh_from_scene(objects, self.agent_height,
                                                    self.agent_radius, self.max_slope)
        if nav_obj is None:
            self.report({'ERROR'}, msg)
            return {'CANCELLED'}
        self.report({'INFO'}, msg)
        return {'FINISHED'}


class FO4_OT_ValidateNavMesh2(bpy.types.Operator):
    """Validate the active navmesh against FO4 limits."""
    bl_idname  = "fo4.validate_navmesh2"
    bl_label   = "Validate NavMesh"
    bl_options = {'REGISTER'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a navmesh object")
            return {'CANCELLED'}
        report = validate_navmesh(obj)
        print(f"\n[NavMesh Validate] {report['vertex_count']} verts "
              f"({report['vert_pct']:.1f}%), {report['triangle_count']} tris "
              f"({report['tri_pct']:.1f}%)")
        for issue in report["issues"]:
            print(f"  {'❌' if issue['severity']=='ERROR' else '⚠'} {issue['message']}")
            if issue.get("fix"): print(f"    Fix: {issue['fix']}")
        if report["valid"]:
            self.report({'INFO'},
                f"NavMesh valid — {report['vertex_count']} verts, "
                f"{report['triangle_count']} tris")
        else:
            self.report({'ERROR'},
                f"{len(report['errors'])} error(s) — see System Console")
        return {'FINISHED'}


class FO4_OT_DecimateNavMesh(bpy.types.Operator):
    """Decimate navmesh to fit within FO4 limits."""
    bl_idname  = "fo4.decimate_navmesh"
    bl_label   = "Decimate NavMesh to FO4 Limits"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select the navmesh object")
            return {'CANCELLED'}
        fcount = len(obj.data.polygons)
        limit  = NAVMESH_LIMITS["max_triangles"]
        if fcount <= limit:
            self.report({'INFO'}, f"NavMesh already within limit ({fcount}/{limit})")
            return {'FINISHED'}
        ratio = limit / fcount * 0.95
        dec   = obj.modifiers.new("NAV_Decimate", 'DECIMATE')
        dec.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=dec.name)
        self.report({'INFO'},
            f"Decimated: {fcount} → {len(obj.data.polygons)} triangles")
        return {'FINISHED'}


class FO4_OT_AddCoverMarker(bpy.types.Operator):
    """Add a cover marker at the 3D cursor position."""
    bl_idname  = "fo4.add_cover_marker"
    bl_label   = "Add Cover Marker"
    bl_options = {'REGISTER', 'UNDO'}

    cover_type: bpy.props.EnumProperty(
        name="Cover Type", items=NAVMESH_COVER_TYPES, default="LEFT",
    )

    def execute(self, context):
        loc = context.scene.cursor.location
        emp = add_cover_marker(loc, self.cover_type)
        self.report({'INFO'}, f"Cover marker added: {emp.name}")
        return {'FINISHED'}


_CLASSES = [
    FO4_OT_GenerateNavMesh,
    FO4_OT_ValidateNavMesh2,
    FO4_OT_DecimateNavMesh,
    FO4_OT_AddCoverMarker,
]


def register():
    for cls in _CLASSES:
        try: bpy.utils.register_class(cls)
        except Exception: pass


def unregister():
    for cls in reversed(_CLASSES):
        try: bpy.utils.unregister_class(cls)
        except Exception: pass
