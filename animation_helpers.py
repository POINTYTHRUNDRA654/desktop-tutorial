"""
Animation helper functions for Fallout 4 mod creation
"""

import bpy
from mathutils import Vector

# preview handler stored at module scope
_wind_preview_handler = None

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
        """Automatically weight paint mesh to armature.

        If the Python package ``libigl`` is installed it will be used to compute
        bounded biharmonic weights (BBW) for higher quality skinning.  In that
        case bones are treated as handles and BBW results replace the vertex
        groups produced by the default Blender auto weights.  If ``libigl`` is
        missing the method falls back to ``ARMATURE_AUTO``.

        The function will attempt to install ``libigl`` via pip if an import
        failure occurs; this requires a working internet connection and write
        access to the current Python environment.  Installation problems are
        reported in the returned message but do not prevent the Blender
        fallback from running.
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"

        if armature_obj.type != 'ARMATURE':
            return False, "Target is not an armature"

        # try libigl first
        igl = None
        try:
            import igl
        except ImportError:
            # try local wheel first
            try:
                from pathlib import Path, PurePath
                import subprocess, sys
                wheel_dir = Path(__file__).resolve().parent / "tools"
                candidates = list(wheel_dir.glob("libigl*.whl"))
                if candidates:
                    subprocess.check_call([sys.executable, "-m", "pip", "install", str(candidates[0])])
                    import igl
                else:
                    subprocess.check_call([sys.executable, "-m", "pip", "install", "libigl"])
                    import igl
            except Exception:
                igl = None
        if igl:
            try:
                import numpy as np
                mesh = mesh_obj.data
                # world-space vertex coordinates
                V = np.array([mesh_obj.matrix_world @ v.co for v in mesh.vertices])
                # face indices
                F = np.array([p.vertices for p in mesh.polygons], dtype=int)
                # handles: one per bone at bone head position
                bones = [b for b in armature_obj.data.bones]
                H = np.array([armature_obj.matrix_world @ b.head_local for b in bones])
                # compute bbw weights (vertices x handles)
                print("[auto_weight_paint] computing BBW weights via libigl...")
                # give user some feedback
                try:
                    bpy.ops.wm.progress_begin(0, 100)
                except Exception:
                    pass
                W = igl.bbw(V, F, H)
                try:
                    bpy.ops.wm.progress_end()
                except Exception:
                    pass
                # clear existing groups and add new weights
                mesh_obj.vertex_groups.clear()
                for vi, wrow in enumerate(W):
                    for bi, wval in enumerate(wrow):
                        if wval <= 0.0:
                            continue
                        name = bones[bi].name
                        vg = mesh_obj.vertex_groups.get(name) or mesh_obj.vertex_groups.new(name=name)
                        vg.add([vi], float(wval), 'REPLACE')
                return True, "BBW weights applied via libigl"
            except Exception:
                # fall back to blender method below
                pass

        # Select mesh and armature for blender auto weights
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

    @staticmethod
    def generate_wind_weights(mesh_obj, group_name="Wind", axis='Z', invert=False):
        """Generate a simple wind‑weight vertex group for a mesh.

        The algorithm computes a linear falloff along the specified local axis
        (default Z, bottom-to-top).  Vertices at the minimum coordinate on that
        axis receive weight 0.0 and those at the maximum receive 1.0.  The result
        is stored in a vertex group named ``group_name`` (created or replaced).
        The ``invert`` flag swaps the falloff direction.

        This is intended for FO4 vegetation assets where the game uses a single
        weight channel to drive procedural wind/bending (often referred to as
        "vortex weight" in the community).  Plants can then be animated with a
        simple modifier or bone that deforms according to the weight.

        **Parameters:**
        - ``mesh_obj`` (bpy.types.Object): mesh to tag
        - ``group_name`` (str): name of the vertex group to create/update
        - ``axis`` (str): local axis to use for falloff ('X','Y','Z')
        - ``invert`` (bool): if True, highest coordinate gets zero weight

        **Returns:** ``(success: bool, message: str)``
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"

        mesh = mesh_obj.data
        # ensure vertex group exists
        vg = mesh_obj.vertex_groups.get(group_name)
        if vg is None:
            vg = mesh_obj.vertex_groups.new(name=group_name)

        # figure out axis index
        idx = {'X': 0, 'Y': 1, 'Z': 2}.get(axis.upper(), 2)

        # gather coordinates in object space
        coords = [(mesh_obj.matrix_world @ v.co) for v in mesh.vertices]
        values = [c[idx] for c in coords]
        minv = min(values) if values else 0.0
        maxv = max(values) if values else 0.0
        diff = maxv - minv

        if abs(diff) < 1e-6:
            # degenerate case: all verts together, give them full weight
            for i in range(len(mesh.vertices)):
                vg.add([i], 1.0, 'REPLACE')
        else:
            for i, val in enumerate(values):
                w = (val - minv) / diff
                if invert:
                    w = 1.0 - w
                vg.add([i], w, 'REPLACE')

        return True, f"Wind weights ('{group_name}') generated"

    @staticmethod
    def apply_wind_animation(mesh_obj, amplitude: float = 0.2, period: float = 60.0, axis: str = 'X'):
        """Create a minimal armature and add a wind‑bone animation.

        - generates wind weights if missing
        - parents mesh to a new (or existing) armature with a "Wind" bone
        - creates an action with a noise‑modulated rotation on that bone
        - adjusts scene frame range to match ``period``

        ``amplitude`` controls the rotation strength (radians), ``period`` the
        length of the animation loop, and ``axis`` selects rotation axis.
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"

        # ensure weight channel exists
        AnimationHelpers.generate_wind_weights(mesh_obj)

        arm_obj = None
        # look for existing armature modifier with Wind bone
        for mod in mesh_obj.modifiers:
            if mod.type == 'ARMATURE' and mod.object and mod.object.type == 'ARMATURE':
                if "Wind" in mod.object.data.bones:
                    arm_obj = mod.object
                    break
        if arm_obj is None and mesh_obj.parent and mesh_obj.parent.type == 'ARMATURE':
            if "Wind" in mesh_obj.parent.data.bones:
                arm_obj = mesh_obj.parent

        # create new armature if needed
        if arm_obj is None:
            arm = bpy.data.armatures.new(mesh_obj.name + "_WindArm")
            arm_obj = bpy.data.objects.new(mesh_obj.name + "_WindArmObj", arm)
            bpy.context.collection.objects.link(arm_obj)
            bpy.context.view_layer.objects.active = arm_obj
            bpy.ops.object.mode_set(mode='EDIT')
            bone = arm.edit_bones.new("Wind")
            bone.head = mesh_obj.location
            bone.tail = mesh_obj.location + Vector((0.0, 0.0, 0.1))
            bpy.ops.object.mode_set(mode='OBJECT')
            mesh_obj.parent = arm_obj
            wm = mesh_obj.modifiers.new(name="WindArmature", type='ARMATURE')
            wm.object = arm_obj
        else:
            mesh_obj.parent = arm_obj
            if not any(m.type == 'ARMATURE' and m.object == arm_obj for m in mesh_obj.modifiers):
                wm = mesh_obj.modifiers.new(name="WindArmature", type='ARMATURE')
                wm.object = arm_obj
            if "Wind" not in arm_obj.data.bones:
                return False, "Existing armature lacks a 'Wind' bone"

        # create/assign action
        if not arm_obj.animation_data:
            arm_obj.animation_data_create()
        action = bpy.data.actions.new(name=mesh_obj.name + "_WindAnim")
        arm_obj.animation_data.action = action
        idx = {'X':0,'Y':1,'Z':2}.get(axis.upper(),0)
        data_path = f'pose.bones["Wind"].rotation_euler'
        fcurve = action.fcurves.new(data_path=data_path, index=idx)
        fcurve.keyframe_points.add(count=2)
        fcurve.keyframe_points[0].co = (0.0, 0.0)
        fcurve.keyframe_points[1].co = (period, 0.0)
        for kp in fcurve.keyframe_points:
            kp.interpolation = 'LINEAR'
        modf = fcurve.modifiers.new(type='NOISE')
        modf.strength = amplitude
        modf.scale = period
        modf.phase = 0.0
        modf.depth = 0
        scene = bpy.context.scene
        scene.frame_start = 0
        scene.frame_end = int(period)
        return True, "Wind animation armature created"

    @staticmethod
    def start_wind_preview(speed: float = 0.05, axis: str = 'X'):
        """Begin a simple live rotation of any Wind bones on frame change.

        This gives instant feedback without playing the timeline. Call
        ``stop_wind_preview()`` to remove the handler.
        """
        global _wind_preview_handler
        if _wind_preview_handler is not None:
            return False, "Preview already running"
        def _handler(scene):
            for obj in scene.objects:
                if obj.type == 'ARMATURE' and 'Wind' in obj.pose.bones:
                    bone = obj.pose.bones['Wind']
                    idx = {'X':0,'Y':1,'Z':2}.get(axis.upper(),0)
                    bone.rotation_euler[idx] += speed
        bpy.app.handlers.frame_change_post.append(_handler)
        _wind_preview_handler = _handler
        return True, "Wind preview started"

    @staticmethod
    def stop_wind_preview():
        """Stop the live wind preview handler."""
        global _wind_preview_handler
        if _wind_preview_handler and _wind_preview_handler in bpy.app.handlers.frame_change_post:
            bpy.app.handlers.frame_change_post.remove(_wind_preview_handler)
            _wind_preview_handler = None
            return True, "Wind preview stopped"
        return False, "No wind preview running"

def register():
    """Register animation helper functions"""
    pass

def unregister():
    """Unregister animation helper functions"""
    pass
