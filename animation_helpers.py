"""
Animation helper functions for Fallout 4 mod creation
"""

import bpy
from mathutils import Vector

class AnimationHelpers:
    """Helper functions for animation setup and validation"""
    
    @staticmethod
    def setup_fo4_armature():
        """Create a basic Fallout 4 compatible armature"""
        # Create armature
        bpy.ops.object.armature_add(location=(0, 0, 0))
        armature_obj = bpy.context.active_object
        armature_obj.name = "FO4_Armature"
        armature = armature_obj.data
        armature.name = "FO4_Armature"
        
        # Enter edit mode to add bones
        bpy.ops.object.mode_set(mode='EDIT')
        
        # Get the default bone
        edit_bones = armature.edit_bones
        root_bone = edit_bones[0]
        root_bone.name = "Root"
        
        # Add basic skeleton structure
        # Spine
        spine = edit_bones.new("Spine")
        spine.head = Vector((0, 0, 1))
        spine.tail = Vector((0, 0, 1.5))
        spine.parent = root_bone
        
        # Head
        head = edit_bones.new("Head")
        head.head = Vector((0, 0, 1.5))
        head.tail = Vector((0, 0, 2))
        head.parent = spine
        
        # Left arm
        left_upper_arm = edit_bones.new("LeftUpperArm")
        left_upper_arm.head = Vector((0.5, 0, 1.4))
        left_upper_arm.tail = Vector((1, 0, 1.4))
        left_upper_arm.parent = spine
        
        left_lower_arm = edit_bones.new("LeftLowerArm")
        left_lower_arm.head = Vector((1, 0, 1.4))
        left_lower_arm.tail = Vector((1.5, 0, 1.4))
        left_lower_arm.parent = left_upper_arm
        
        # Right arm
        right_upper_arm = edit_bones.new("RightUpperArm")
        right_upper_arm.head = Vector((-0.5, 0, 1.4))
        right_upper_arm.tail = Vector((-1, 0, 1.4))
        right_upper_arm.parent = spine
        
        right_lower_arm = edit_bones.new("RightLowerArm")
        right_lower_arm.head = Vector((-1, 0, 1.4))
        right_lower_arm.tail = Vector((-1.5, 0, 1.4))
        right_lower_arm.parent = right_upper_arm
        
        # Left leg
        left_upper_leg = edit_bones.new("LeftUpperLeg")
        left_upper_leg.head = Vector((0.3, 0, 1))
        left_upper_leg.tail = Vector((0.3, 0, 0.5))
        left_upper_leg.parent = root_bone
        
        left_lower_leg = edit_bones.new("LeftLowerLeg")
        left_lower_leg.head = Vector((0.3, 0, 0.5))
        left_lower_leg.tail = Vector((0.3, 0, 0))
        left_lower_leg.parent = left_upper_leg
        
        # Right leg
        right_upper_leg = edit_bones.new("RightUpperLeg")
        right_upper_leg.head = Vector((-0.3, 0, 1))
        right_upper_leg.tail = Vector((-0.3, 0, 0.5))
        right_upper_leg.parent = root_bone
        
        right_lower_leg = edit_bones.new("RightLowerLeg")
        right_lower_leg.head = Vector((-0.3, 0, 0.5))
        right_lower_leg.tail = Vector((-0.3, 0, 0))
        right_lower_leg.parent = right_upper_leg
        
        bpy.ops.object.mode_set(mode='OBJECT')
        
        return armature_obj
    
    @staticmethod
    def auto_weight_paint(mesh_obj, armature_obj):
        """Automatically weight paint mesh to armature"""
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        if armature_obj.type != 'ARMATURE':
            return False, "Target is not an armature"
        
        # Select mesh and armature
        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        armature_obj.select_set(True)
        bpy.context.view_layer.objects.active = armature_obj
        
        # Parent with automatic weights
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        
        return True, "Automatic weights applied successfully"
    
    @staticmethod
    def validate_animation(armature_obj):
        """Validate armature and animation for Fallout 4"""
        issues = []
        
        if armature_obj.type != 'ARMATURE':
            issues.append("Object is not an armature")
            return False, issues
        
        armature = armature_obj.data
        
        # Check bone count
        if len(armature.bones) == 0:
            issues.append("Armature has no bones")
        elif len(armature.bones) > 256:
            issues.append(f"Too many bones: {len(armature.bones)} (FO4 limit: 256)")
        
        # Check for root bone
        root_bones = [b for b in armature.bones if b.parent is None]
        if len(root_bones) == 0:
            issues.append("No root bone found")
        elif len(root_bones) > 1:
            issues.append(f"Multiple root bones found: {len(root_bones)}")
        
        # Check for animation data
        if armature_obj.animation_data:
            if armature_obj.animation_data.action:
                action = armature_obj.animation_data.action
                
                # Check frame range
                frame_start = int(action.frame_range[0])
                frame_end = int(action.frame_range[1])
                
                if frame_end - frame_start > 3600:
                    issues.append(f"Animation too long: {frame_end - frame_start} frames")
        else:
            issues.append("No animation data found (this is OK if no animation is needed)")
        
        # Check bone naming conventions
        for bone in armature.bones:
            if ' ' in bone.name:
                issues.append(f"Bone name contains spaces: '{bone.name}'")
        
        if not issues:
            return True, ["Armature is valid for Fallout 4"]
        
        return False, issues
    
    @staticmethod
    def create_idle_animation(armature_obj, duration=60):
        """Create a simple idle animation"""
        if armature_obj.type != 'ARMATURE':
            return False, "Object is not an armature"
        
        # Create new action
        action = bpy.data.actions.new(name=f"{armature_obj.name}_Idle")
        
        if not armature_obj.animation_data:
            armature_obj.animation_data_create()
        
        armature_obj.animation_data.action = action
        
        # Set frame range
        bpy.context.scene.frame_start = 0
        bpy.context.scene.frame_end = duration
        
        # Add keyframes for subtle movement
        bpy.context.scene.frame_set(0)
        armature_obj.keyframe_insert(data_path="location", frame=0)
        
        bpy.context.scene.frame_set(duration)
        armature_obj.keyframe_insert(data_path="location", frame=duration)
        
        return True, "Idle animation created"

def register():
    """Register animation helper functions"""
    pass

def unregister():
    """Unregister animation helper functions"""
    pass
