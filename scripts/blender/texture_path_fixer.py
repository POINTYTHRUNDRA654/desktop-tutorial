"""
Texture Path Fixer - Converts absolute texture paths to relative for portability
"""

import bpy
import os

bl_info = {
    "name": "Texture Path Fixer",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Texture Paths",
    "description": "Fixes absolute texture paths to relative for Fallout 4",
    "category": "Material",
}

class FO4_OT_FixTexturePaths(bpy.types.Operator):
    """Fix Texture Paths to Relative"""
    bl_idname = "material.fo4_fix_texture_paths"
    bl_label = "Fix Texture Paths"
    bl_options = {'REGISTER', 'UNDO'}
    
    make_relative: bpy.props.BoolProperty(
        name="Make Paths Relative",
        description="Convert absolute paths to relative",
        default=True
    )
    
    pack_textures: bpy.props.BoolProperty(
        name="Pack Textures",
        description="Pack external textures into .blend file",
        default=False
    )
    
    def execute(self, context):
        absolute_paths = []
        fixed_paths = []
        missing_files = []
        
        # Check all images
        for img in bpy.data.images:
            if img.filepath:
                filepath = img.filepath
                
                # Check if absolute path
                if os.path.isabs(bpy.path.abspath(filepath)):
                    absolute_paths.append((img.name, filepath))
                    
                    if self.make_relative:
                        try:
                            # Try to make relative
                            img.filepath = bpy.path.relpath(filepath)
                            fixed_paths.append((img.name, img.filepath))
                        except Exception as e:
                            missing_files.append((img.name, str(e)))
                
                # Check if file exists
                abs_path = bpy.path.abspath(filepath)
                if not os.path.exists(abs_path):
                    if (img.name, abs_path) not in missing_files:
                        missing_files.append((img.name, "File not found"))
        
        # Pack textures if requested
        if self.pack_textures:
            try:
                bpy.ops.file.pack_all()
                self.report({'INFO'}, "Packed all textures")
            except Exception as e:
                self.report({'WARNING'}, f"Could not pack textures: {e}")
        
        # Report results
        print(f"\n=== Texture Path Analysis ===")
        print(f"  Total Images: {len(bpy.data.images)}")
        print(f"  Absolute Paths: {len(absolute_paths)}")
        print(f"  Fixed: {len(fixed_paths)}")
        print(f"  Missing Files: {len(missing_files)}")
        
        if absolute_paths:
            print(f"\n=== Absolute Paths Found ===")
            for img_name, path in absolute_paths:
                print(f"  • {img_name}: {path}")
        
        if fixed_paths:
            print(f"\n=== Fixed Paths ===")
            for img_name, path in fixed_paths:
                print(f"  ✅ {img_name}: {path}")
        
        if missing_files:
            print(f"\n=== Missing Files ===")
            for img_name, error in missing_files:
                print(f"  ⚠️ {img_name}: {error}")
        
        # Final report
        if fixed_paths:
            self.report({'INFO'}, f"Fixed {len(fixed_paths)} texture paths")
        elif absolute_paths:
            self.report({'WARNING'}, f"Found {len(absolute_paths)} absolute paths (check console)")
        else:
            self.report({'INFO'}, "✅ All texture paths are relative!")
        
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_FixTexturePaths.bl_idname, text="Fix Texture Paths")

def register():
    bpy.utils.register_class(FO4_OT_FixTexturePaths)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_FixTexturePaths)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
