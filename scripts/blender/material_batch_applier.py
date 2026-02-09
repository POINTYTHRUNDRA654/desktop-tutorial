"""
Material Batch Applier - Apply materials to multiple objects at once
"""

import bpy

bl_info = {
    "name": "Material Batch Applier",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Batch Material",
    "description": "Apply materials to multiple objects",
    "category": "Material",
}

class FO4_OT_BatchApplyMaterial(bpy.types.Operator):
    """Batch Apply Material"""
    bl_idname = "material.fo4_batch_apply"
    bl_label = "Batch Apply Material"
    bl_options = {'REGISTER', 'UNDO'}
    
    material_name: bpy.props.StringProperty(
        name="Material Name",
        description="Name of material to apply",
        default=""
    )
    
    replace_existing: bpy.props.BoolProperty(
        name="Replace Existing",
        description="Replace all existing materials",
        default=False
    )
    
    def execute(self, context):
        selected = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not selected:
            self.report({'WARNING'}, "No mesh objects selected")
            return {'CANCELLED'}
        
        # Find material
        if self.material_name not in bpy.data.materials:
            self.report({'ERROR'}, f"Material '{self.material_name}' not found")
            return {'CANCELLED'}
        
        mat = bpy.data.materials[self.material_name]
        applied = []
        
        for obj in selected:
            if self.replace_existing:
                obj.data.materials.clear()
            
            # Add material if not already there
            if mat not in obj.data.materials[:]:
                obj.data.materials.append(mat)
            
            applied.append(obj.name)
        
        print(f"\n=== Material Applied: {self.material_name} ===")
        for name in applied:
            print(f"  ✅ {name}")
        
        self.report({'INFO'}, f"Applied material to {len(applied)} objects")
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_BatchApplyMaterial.bl_idname, text="Batch Apply Material")

def register():
    bpy.utils.register_class(FO4_OT_BatchApplyMaterial)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_BatchApplyMaterial)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
