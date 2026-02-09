"""
Creature Rig Validator - Validates creature rigs for Fallout 4
"""

import bpy

bl_info = {
    "name": "Creature Rig Validator",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Creature Rig",
    "description": "Validates creature rigs for Fallout 4",
    "category": "Armature",
}

# Required bones for FO4 creatures
REQUIRED_CREATURE_BONES = [
    "Root",
    "COM",
    "Pelvis",
    "Spine",
]

class FO4_OT_ValidateCreatureRig(bpy.types.Operator):
    """Validate Creature Rig"""
    bl_idname = "armature.fo4_validate_creature_rig"
    bl_label = "Validate Creature Rig"
    bl_options = {'REGISTER', 'UNDO'}
    
    check_required_bones: bpy.props.BoolProperty(
        name="Check Required Bones",
        description="Check for required bone names",
        default=True
    )
    
    check_bone_count: bpy.props.BoolProperty(
        name="Check Bone Count",
        description="Warn if bone count is excessive",
        default=True
    )
    
    max_bone_count: bpy.props.IntProperty(
        name="Max Bone Count",
        description="Maximum recommended bone count",
        default=256,
        min=1,
        max=1000
    )
    
    def execute(self, context):
        selected = [obj for obj in context.selected_objects if obj.type == 'ARMATURE']
        if not selected:
            self.report({'WARNING'}, "No armature objects selected")
            return {'CANCELLED'}
        
        issues = []
        
        for armature in selected:
            bones = armature.data.bones
            bone_names = [b.name for b in bones]
            
            # Check required bones
            if self.check_required_bones:
                for req_bone in REQUIRED_CREATURE_BONES:
                    if req_bone not in bone_names:
                        issues.append(f"{armature.name}: Missing required bone '{req_bone}'")
            
            # Check bone count
            if self.check_bone_count and len(bones) > self.max_bone_count:
                issues.append(f"{armature.name}: {len(bones)} bones exceeds max ({self.max_bone_count})")
            
            # Check for common issues
            # Check root bone
            root_bones = [b for b in bones if not b.parent]
            if len(root_bones) > 1:
                issues.append(f"{armature.name}: Multiple root bones ({len(root_bones)})")
            
            # Print summary
            print(f"\n=== {armature.name} ===")
            print(f"  Total Bones: {len(bones)}")
            print(f"  Root Bones: {len(root_bones)}")
            
            # Check hierarchy depth
            max_depth = 0
            for bone in bones:
                depth = 0
                parent = bone.parent
                while parent:
                    depth += 1
                    parent = parent.parent
                max_depth = max(max_depth, depth)
            print(f"  Max Hierarchy Depth: {max_depth}")
        
        # Report results
        if issues:
            print(f"\n=== Issues Found ===")
            for issue in issues:
                print(f"  ⚠️ {issue}")
            self.report({'WARNING'}, f"Found {len(issues)} issues (check console)")
        else:
            self.report({'INFO'}, "✅ Creature rig validation passed!")
        
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_ValidateCreatureRig.bl_idname, text="Validate Creature Rig")

def register():
    bpy.utils.register_class(FO4_OT_ValidateCreatureRig)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_ValidateCreatureRig)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
