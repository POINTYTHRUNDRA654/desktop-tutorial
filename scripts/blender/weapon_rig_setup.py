"""
Weapon Rig Setup - Quick setup for weapon rigging in Fallout 4
"""

import bpy
import mathutils

bl_info = {
    "name": "Weapon Rig Setup",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Weapon Rig",
    "description": "Quick setup for weapon rigging in Fallout 4",
    "category": "Armature",
}

class FO4_OT_SetupWeaponRig(bpy.types.Operator):
    """Setup Weapon Rig"""
    bl_idname = "armature.fo4_setup_weapon_rig"
    bl_label = "Setup Weapon Rig"
    bl_options = {'REGISTER', 'UNDO'}
    
    create_bones: bpy.props.BoolProperty(
        name="Create Standard Bones",
        description="Create standard weapon bones",
        default=True
    )
    
    parent_to_rig: bpy.props.BoolProperty(
        name="Parent Mesh to Rig",
        description="Parent selected meshes to armature",
        default=True
    )
    
    def execute(self, context):
        # Get selected mesh
        meshes = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not meshes:
            self.report({'WARNING'}, "No mesh objects selected")
            return {'CANCELLED'}
        
        # Create armature
        bpy.ops.object.armature_add(enter_editmode=True)
        arm_obj = context.active_object
        arm_obj.name = "WeaponRig"
        armature = arm_obj.data
        armature.name = "WeaponRig"
        
        if self.create_bones:
            # Standard FO4 weapon bones
            bone_names = [
                ("Weapon", (0, 0, 0)),
                ("Barrel", (0, 0.5, 0)),
                ("Trigger", (0, -0.1, 0)),
                ("Magazine", (0, 0, -0.2)),
                ("Sight", (0, 0.3, 0.1)),
            ]
            
            # Remove default bone
            if armature.edit_bones:
                armature.edit_bones.remove(armature.edit_bones[0])
            
            # Create bones
            for bone_name, location in bone_names:
                bone = armature.edit_bones.new(bone_name)
                bone.head = mathutils.Vector(location)
                bone.tail = mathutils.Vector((location[0], location[1] + 0.1, location[2]))
                
                # Parent hierarchy
                if bone_name != "Weapon":
                    bone.parent = armature.edit_bones["Weapon"]
        
        # Exit edit mode
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # Parent meshes to armature
        if self.parent_to_rig:
            for mesh in meshes:
                mesh.parent = arm_obj
                mesh.parent_type = 'ARMATURE'
                
                # Add armature modifier
                mod = mesh.modifiers.new(name="Armature", type='ARMATURE')
                mod.object = arm_obj
        
        print(f"\n=== Weapon Rig Created ===")
        print(f"  Armature: {arm_obj.name}")
        print(f"  Bones: {len(armature.bones)}")
        if self.parent_to_rig:
            print(f"  Parented Meshes: {len(meshes)}")
        
        self.report({'INFO'}, f"Created weapon rig with {len(armature.bones)} bones")
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_SetupWeaponRig.bl_idname, text="Setup Weapon Rig")

def register():
    bpy.utils.register_class(FO4_OT_SetupWeaponRig)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_SetupWeaponRig)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
