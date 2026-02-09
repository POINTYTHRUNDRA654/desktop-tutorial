"""
Texture Packer - Pack all external textures into .blend file
"""

import bpy
import os

bl_info = {
    "name": "Texture Packer",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Pack Textures",
    "description": "Pack all external textures into .blend file",
    "category": "Material",
}

class FO4_OT_PackTextures(bpy.types.Operator):
    """Pack All Textures"""
    bl_idname = "image.fo4_pack_textures"
    bl_label = "Pack Textures"
    bl_options = {'REGISTER', 'UNDO'}
    
    unpack_first: bpy.props.BoolProperty(
        name="Unpack First",
        description="Unpack textures before repacking (refresh from disk)",
        default=False
    )
    
    def execute(self, context):
        packed = []
        already_packed = []
        missing = []
        
        for img in bpy.data.images:
            if not img.filepath:
                continue
            
            abs_path = bpy.path.abspath(img.filepath)
            
            # Check if already packed
            if img.packed_file:
                already_packed.append(img.name)
                if self.unpack_first:
                    img.unpack(method='USE_ORIGINAL')
                else:
                    continue
            
            # Check if file exists
            if not os.path.exists(abs_path):
                missing.append((img.name, abs_path))
                continue
            
            # Pack the image
            try:
                img.pack()
                packed.append(img.name)
            except Exception as e:
                missing.append((img.name, str(e)))
        
        # Report
        print(f"\n=== Texture Packing ===")
        print(f"  Total Images: {len(bpy.data.images)}")
        print(f"  Already Packed: {len(already_packed)}")
        print(f"  Newly Packed: {len(packed)}")
        print(f"  Missing/Error: {len(missing)}")
        
        if packed:
            print(f"\n=== Packed Textures ===")
            for name in packed:
                print(f"  ✅ {name}")
        
        if missing:
            print(f"\n=== Missing/Error ===")
            for name, error in missing:
                print(f"  ⚠️ {name}: {error}")
        
        if packed:
            self.report({'INFO'}, f"Packed {len(packed)} textures")
        elif already_packed:
            self.report({'INFO'}, f"All {len(already_packed)} textures already packed")
        else:
            self.report({'WARNING'}, "No textures to pack")
        
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_PackTextures.bl_idname, text="Pack Textures")

def register():
    bpy.utils.register_class(FO4_OT_PackTextures)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_PackTextures)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
