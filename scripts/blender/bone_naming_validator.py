"""
Bone Naming Validator - Ensures bone names follow FO4 conventions
"""

import bpy
import re

bl_info = {
    "name": "Bone Naming Validator",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Bone Names",
    "description": "Validates bone naming conventions for Fallout 4",
    "category": "Armature",
}

# Common FO4 bone name patterns
FO4_BONE_PATTERNS = [
    r'^Root$',
    r'^COM$',
    r'^Pelvis$',
    r'^Spine[0-9]*$',
    r'^Chest$',
    r'^Neck$',
    r'^Head$',
    r'^(L|R)_.*$',  # Left/Right prefix
    r'^.*\.(L|R)$',  # .L/.R suffix
]

class FO4_OT_ValidateBoneNames(bpy.types.Operator):
    """Validate Bone Naming Conventions"""
    bl_idname = "armature.fo4_validate_bone_names"
    bl_label = "Validate Bone Names"
    bl_options = {'REGISTER', 'UNDO'}
    
    check_invalid_chars: bpy.props.BoolProperty(
        name="Check Invalid Characters",
        description="Check for special characters in bone names",
        default=True
    )
    
    check_length: bpy.props.BoolProperty(
        name="Check Name Length",
        description="Check if bone names are too long",
        default=True
    )
    
    max_length: bpy.props.IntProperty(
        name="Max Name Length",
        description="Maximum bone name length",
        default=63,
        min=1,
        max=255
    )
    
    def execute(self, context):
        issues = []
        
        selected = [obj for obj in context.selected_objects if obj.type == 'ARMATURE']
        if not selected:
            self.report({'WARNING'}, "No armature objects selected")
            return {'CANCELLED'}
        
        for armature in selected:
            bones = armature.data.bones
            
            if not bones:
                issues.append(f"{armature.name}: No bones found")
                continue
            
            for bone in bones:
                # Check invalid characters
                if self.check_invalid_chars:
                    invalid_chars = [':', '/', '\\', '*', '?', '"', '<', '>', '|', '#']
                    if any(char in bone.name for char in invalid_chars):
                        issues.append(f"{armature.name}.{bone.name}: Invalid characters")
                
                # Check length
                if self.check_length and len(bone.name) > self.max_length:
                    issues.append(f"{armature.name}.{bone.name}: Name too long ({len(bone.name)} > {self.max_length})")
                
                # Check for spaces
                if ' ' in bone.name:
                    issues.append(f"{armature.name}.{bone.name}: Contains spaces")
                
                # Check for lowercase (FO4 prefers capitalized)
                if bone.name.islower():
                    issues.append(f"{armature.name}.{bone.name}: All lowercase (prefer capitalized)")
        
        # Report results
        if issues:
            print(f"\n=== Bone Naming Issues ===")
            for issue in issues:
                print(f"  ⚠️ {issue}")
            self.report({'WARNING'}, f"Found {len(issues)} bone naming issues (check console)")
        else:
            self.report({'INFO'}, "✅ All bone names look good!")
        
        # Print bone list
        for armature in selected:
            print(f"\n=== Bones in {armature.name} ({len(armature.data.bones)}) ===")
            for bone in armature.data.bones:
                parent_name = bone.parent.name if bone.parent else "None"
                print(f"  • {bone.name} (parent: {parent_name})")
        
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_ValidateBoneNames.bl_idname, text="Validate Bone Names")

def register():
    bpy.utils.register_class(FO4_OT_ValidateBoneNames)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_ValidateBoneNames)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
