"""
Collision Mesh Generator - Creates collision meshes for Fallout 4 objects
"""

import bpy

bl_info = {
    "name": "Collision Mesh Generator",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Collision",
    "description": "Generates collision meshes for Fallout 4",
    "category": "Mesh",
}

class FO4_OT_GenerateCollision(bpy.types.Operator):
    """Generate Collision Mesh"""
    bl_idname = "mesh.fo4_generate_collision"
    bl_label = "Generate Collision Mesh"
    bl_options = {'REGISTER', 'UNDO'}
    
    collision_type: bpy.props.EnumProperty(
        name="Collision Type",
        description="Type of collision mesh to generate",
        items=[
            ('CONVEX', 'Convex Hull', 'Simple convex hull collision'),
            ('DECIMATED', 'Decimated', 'Simplified version of original'),
            ('BOX', 'Bounding Box', 'Simple box collision'),
        ],
        default='CONVEX'
    )
    
    decimate_ratio: bpy.props.FloatProperty(
        name="Decimate Ratio",
        description="Ratio for decimated collision (lower = simpler)",
        default=0.1,
        min=0.01,
        max=1.0
    )
    
    apply_scale: bpy.props.BoolProperty(
        name="Apply Scale",
        description="Apply object scale before generating collision",
        default=True
    )
    
    def execute(self, context):
        selected = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not selected:
            self.report({'WARNING'}, "No mesh objects selected")
            return {'CANCELLED'}
        
        collision_objects = []
        
        for obj in selected:
            # Apply scale if requested
            if self.apply_scale:
                context.view_layer.objects.active = obj
                bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            
            # Duplicate object for collision
            obj.select_set(True)
            bpy.ops.object.duplicate()
            collision_obj = context.active_object
            collision_obj.name = f"{obj.name}_collision"
            
            # Generate collision based on type
            if self.collision_type == 'CONVEX':
                # Add convex hull modifier
                mod = collision_obj.modifiers.new(name="ConvexHull", type='REMESH')
                mod.mode = 'VOXEL'
                mod.voxel_size = 0.1
                bpy.ops.object.modifier_apply(modifier=mod.name)
                
            elif self.collision_type == 'DECIMATED':
                # Add decimate modifier
                mod = collision_obj.modifiers.new(name="Decimate", type='DECIMATE')
                mod.ratio = self.decimate_ratio
                bpy.ops.object.modifier_apply(modifier=mod.name)
                
            elif self.collision_type == 'BOX':
                # Delete mesh and add cube
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.mesh.delete(type='VERT')
                bpy.ops.object.mode_set(mode='OBJECT')
                
                # Calculate bounding box
                bbox = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
                min_co = mathutils.Vector((min(v.x for v in bbox), min(v.y for v in bbox), min(v.z for v in bbox)))
                max_co = mathutils.Vector((max(v.x for v in bbox), max(v.y for v in bbox), max(v.z for v in bbox)))
                
                # Add cube and scale
                bpy.ops.mesh.primitive_cube_add()
                cube = context.active_object
                cube.location = (min_co + max_co) / 2
                cube.scale = (max_co - min_co) / 2
                
                # Merge with collision object
                collision_obj.select_set(True)
                cube.select_set(True)
                context.view_layer.objects.active = collision_obj
                bpy.ops.object.join()
            
            collision_objects.append(collision_obj.name)
            
            # Move to collision collection
            collection_name = "Collision"
            if collection_name not in bpy.data.collections:
                coll = bpy.data.collections.new(collection_name)
                context.scene.collection.children.link(coll)
            else:
                coll = bpy.data.collections[collection_name]
            
            # Link to collision collection
            for c in collision_obj.users_collection:
                c.objects.unlink(collision_obj)
            coll.objects.link(collision_obj)
        
        # Report results
        print(f"\n=== Collision Meshes Generated ===")
        for name in collision_objects:
            print(f"  ✅ {name}")
        
        self.report({'INFO'}, f"Generated {len(collision_objects)} collision meshes")
        return {'FINISHED'}

# Need mathutils
import mathutils

def menu_func(self, context):
    self.layout.operator(FO4_OT_GenerateCollision.bl_idname, text="Generate Collision Mesh")

def register():
    bpy.utils.register_class(FO4_OT_GenerateCollision)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_GenerateCollision)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
