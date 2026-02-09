"""
Animation FPS Validator - Ensures animations are at exactly 30 FPS for Fallout 4
"""

import bpy

bl_info = {
    "name": "Animation FPS Validator",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Animation FPS",
    "description": "Validates and fixes animation FPS to 30 for Fallout 4",
    "category": "Animation",
}

class FO4_OT_ValidateAnimationFPS(bpy.types.Operator):
    """Validate and Fix Animation FPS for FO4"""
    bl_idname = "anim.fo4_validate_fps"
    bl_label = "Validate FO4 Animation FPS"
    bl_options = {'REGISTER', 'UNDO'}
    
    auto_fix: bpy.props.BoolProperty(
        name="Auto-Fix FPS",
        description="Automatically set scene FPS to 30",
        default=True
    )
    
    check_frame_range: bpy.props.BoolProperty(
        name="Check Frame Range",
        description="Report frame range information",
        default=True
    )
    
    def execute(self, context):
        scene = context.scene
        current_fps = scene.render.fps
        target_fps = 30
        
        issues = []
        fixes = []
        
        # Check FPS
        if current_fps != target_fps:
            issues.append(f"FPS is {current_fps}, but FO4 requires exactly {target_fps} FPS")
            
            if self.auto_fix:
                scene.render.fps = target_fps
                scene.render.fps_base = 1.0
                fixes.append(f"Set FPS to {target_fps}")
        
        # Check frame range
        if self.check_frame_range:
            frame_start = scene.frame_start
            frame_end = scene.frame_end
            frame_count = frame_end - frame_start + 1
            duration_seconds = frame_count / target_fps
            
            print(f"\n=== Animation Info ===")
            print(f"  Frame Range: {frame_start} to {frame_end}")
            print(f"  Frame Count: {frame_count}")
            print(f"  Duration: {duration_seconds:.2f} seconds")
            print(f"  FPS: {scene.render.fps}")
        
        # Check for keyframes
        animated_objects = []
        for obj in scene.objects:
            if obj.animation_data and obj.animation_data.action:
                animated_objects.append(obj.name)
        
        if animated_objects:
            print(f"\n=== Animated Objects ({len(animated_objects)}) ===")
            for obj_name in animated_objects:
                print(f"  • {obj_name}")
        else:
            issues.append("No animated objects found in scene")
        
        # Report results
        if fixes:
            self.report({'INFO'}, f"Fixed: {', '.join(fixes)}")
        elif issues:
            self.report({'WARNING'}, f"Issues: {', '.join(issues)}")
        else:
            self.report({'INFO'}, f"✅ Animation FPS is correct ({target_fps} FPS)")
        
        if issues:
            print(f"\n=== Issues Found ===")
            for issue in issues:
                print(f"  ⚠️ {issue}")
        
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_ValidateAnimationFPS.bl_idname, text="Validate FO4 Animation FPS")

def register():
    bpy.utils.register_class(FO4_OT_ValidateAnimationFPS)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_ValidateAnimationFPS)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
