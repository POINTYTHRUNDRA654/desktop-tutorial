"""
Batch Renamer - Batch rename objects with patterns
"""

import bpy

bl_info = {
    "name": "Batch Renamer",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Batch Rename",
    "description": "Batch rename objects with patterns",
    "category": "Object",
}

class FO4_OT_BatchRename(bpy.types.Operator):
    """Batch Rename Objects"""
    bl_idname = "object.fo4_batch_rename"
    bl_label = "Batch Rename"
    bl_options = {'REGISTER', 'UNDO'}
    
    prefix: bpy.props.StringProperty(
        name="Prefix",
        description="Add prefix to names",
        default=""
    )
    
    suffix: bpy.props.StringProperty(
        name="Suffix",
        description="Add suffix to names",
        default=""
    )
    
    find: bpy.props.StringProperty(
        name="Find",
        description="Text to find",
        default=""
    )
    
    replace: bpy.props.StringProperty(
        name="Replace",
        description="Replace with",
        default=""
    )
    
    add_numbers: bpy.props.BoolProperty(
        name="Add Numbers",
        description="Add sequential numbers",
        default=False
    )
    
    start_number: bpy.props.IntProperty(
        name="Start Number",
        description="Starting number for sequence",
        default=1,
        min=0
    )
    
    def execute(self, context):
        selected = context.selected_objects
        if not selected:
            self.report({'WARNING'}, "No objects selected")
            return {'CANCELLED'}
        
        renamed = []
        for i, obj in enumerate(selected):
            old_name = obj.name
            new_name = old_name
            
            # Find and replace
            if self.find and self.replace is not None:
                new_name = new_name.replace(self.find, self.replace)
            
            # Add prefix/suffix
            if self.prefix:
                new_name = self.prefix + new_name
            if self.suffix:
                new_name = new_name + self.suffix
            
            # Add numbers
            if self.add_numbers:
                number = self.start_number + i
                new_name = f"{new_name}_{number:03d}"
            
            obj.name = new_name
            renamed.append((old_name, new_name))
        
        # Report
        print(f"\n=== Batch Rename ({len(renamed)}) ===")
        for old, new in renamed:
            print(f"  {old} → {new}")
        
        self.report({'INFO'}, f"Renamed {len(renamed)} objects")
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_BatchRename.bl_idname, text="Batch Rename")

def register():
    bpy.utils.register_class(FO4_OT_BatchRename)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_BatchRename)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
