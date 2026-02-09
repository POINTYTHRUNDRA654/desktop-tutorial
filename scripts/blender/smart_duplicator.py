"""
Smart Duplicator - Duplicate objects with smart positioning
"""

import bpy
import mathutils

bl_info = {
    "name": "Smart Duplicator",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Smart Duplicate",
    "description": "Smart duplication with offset patterns",
    "category": "Object",
}

class FO4_OT_SmartDuplicate(bpy.types.Operator):
    """Smart Duplicate Objects"""
    bl_idname = "object.fo4_smart_duplicate"
    bl_label = "Smart Duplicate"
    bl_options = {'REGISTER', 'UNDO'}
    
    count: bpy.props.IntProperty(
        name="Count",
        description="Number of duplicates",
        default=3,
        min=1,
        max=100
    )
    
    offset_x: bpy.props.FloatProperty(
        name="Offset X",
        description="X offset between duplicates",
        default=2.0
    )
    
    offset_y: bpy.props.FloatProperty(
        name="Offset Y",
        description="Y offset between duplicates",
        default=0.0
    )
    
    offset_z: bpy.props.FloatProperty(
        name="Offset Z",
        description="Z offset between duplicates",
        default=0.0
    )
    
    rotate_z: bpy.props.FloatProperty(
        name="Rotate Z",
        description="Z rotation increment (degrees)",
        default=0.0,
        subtype='ANGLE'
    )
    
    def execute(self, context):
        selected = context.selected_objects
        if not selected:
            self.report({'WARNING'}, "No objects selected")
            return {'CANCELLED'}
        
        duplicated = []
        offset_vector = mathutils.Vector((self.offset_x, self.offset_y, self.offset_z))
        
        for obj in selected:
            for i in range(1, self.count + 1):
                # Duplicate
                obj.select_set(True)
                context.view_layer.objects.active = obj
                bpy.ops.object.duplicate()
                dup = context.active_object
                
                # Apply offset
                dup.location += offset_vector * i
                
                # Apply rotation
                if self.rotate_z != 0:
                    dup.rotation_euler.z += self.rotate_z * i
                
                duplicated.append(dup.name)
        
        print(f"\n=== Smart Duplicate ({len(duplicated)}) ===")
        for name in duplicated:
            print(f"  ✅ {name}")
        
        self.report({'INFO'}, f"Created {len(duplicated)} duplicates")
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_SmartDuplicate.bl_idname, text="Smart Duplicate")

def register():
    bpy.utils.register_class(FO4_OT_SmartDuplicate)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_SmartDuplicate)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
