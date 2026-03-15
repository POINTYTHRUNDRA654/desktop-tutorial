"""
Mesh helper functions for Fallout 4 mod creation
"""

import bpy
import bmesh
from mathutils import Vector

class MeshHelpers:
    """Helper functions for mesh creation and optimization"""
    
    @staticmethod
    def create_base_mesh(mesh_type='CUBE'):
        """Create a base mesh optimized for Fallout 4"""
        bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
        obj = bpy.context.active_object
        obj.name = "FO4_Mesh"
        
        # Apply scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        
        # Add UV map
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name="UVMap")
        
        return obj
    
    @staticmethod
    def optimize_mesh(obj):
        """Optimize mesh for Fallout 4"""
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        # Switch to object mode
        if bpy.context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        
        # Select the object
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        
        # Apply transformations
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        
        # Remove doubles
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.0001)
        
        # Recalculate normals
        bpy.ops.mesh.normals_make_consistent(inside=False)
        
        # Triangulate (Fallout 4 uses triangles)
        bpy.ops.mesh.quads_convert_to_tris()
        
        bpy.ops.object.mode_set(mode='OBJECT')
        
        return True, "Mesh optimized successfully"
    
    @staticmethod
    def validate_mesh(obj):
        """Validate mesh for Fallout 4 compatibility"""
        if obj.type != 'MESH':
            return False, ["Object is not a mesh"]
        
        issues = []
        mesh = obj.data
        
        # Check vertex count
        if len(mesh.vertices) == 0:
            issues.append("Mesh has no vertices")
        
        # Check poly count
        poly_count = len(mesh.polygons)
        if poly_count == 0:
            issues.append("Mesh has no polygons")
        elif poly_count > 65535:
            issues.append(f"Poly count too high: {poly_count} (max 65535 for FO4)")
        
        # Check for UV map
        if not mesh.uv_layers:
            issues.append("Mesh has no UV map")
        
        # Check for loose vertices
        bm = bmesh.new()
        bm.from_mesh(mesh)
        loose_verts = [v for v in bm.verts if not v.link_edges]
        if loose_verts:
            issues.append(f"Found {len(loose_verts)} loose vertices")
        bm.free()
        
        # Check scale
        if obj.scale != Vector((1.0, 1.0, 1.0)):
            issues.append("Object scale not applied (should be 1,1,1)")
        
        if not issues:
            return True, ["Mesh is valid for Fallout 4"]
        
        return False, issues
    
    @staticmethod
    def add_collision_mesh(obj):
        """Add a collision mesh for the object"""
        if obj.type != 'MESH':
            return None
        
        # Duplicate object for collision
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.duplicate()
        
        collision_obj = bpy.context.active_object
        collision_obj.name = f"{obj.name}_collision"
        
        # Simplify collision mesh
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.dissolve_limited(angle_limit=0.1)
        bpy.ops.object.mode_set(mode='OBJECT')
        
        return collision_obj

def register():
    """Register mesh helper functions"""
    pass

def unregister():
    """Unregister mesh helper functions"""
    pass
