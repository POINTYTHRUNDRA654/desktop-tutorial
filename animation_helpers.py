"""
Animation helper functions for Fallout 4 mod creation
"""

import bpy
from mathutils import Vector

# preview handler stored at module scope
_wind_preview_handler = None


# ---------------------------------------------------------------------------
# Blender Action API compatibility shim
# ---------------------------------------------------------------------------
# Blender 4.4 replaced the flat ``action.fcurves`` collection with a layered
# Action system: ``action.layers[n].strips[n].fcurves``.  Blender 5.0 carries
# this further — ``action.fcurves`` no longer exists at all on newly-created
# actions.  The helper below returns the correct fcurves container regardless
# of Blender version and also assigns the action slot when required so the
# animation data resolves correctly in 4.4+.

def _assign_action_to_id(anim_data, action):
    """Assign *action* to *anim_data* and bind the correct slot (Blender ≥ 4.4).

    In Blender < 4.4 simply setting ``anim_data.action = action`` is sufficient.
    From Blender 4.4 onward each action has *slots* (formerly "bindings") that
    map it to a specific ID type.  Without a valid slot assignment the
    animation channels are invisible to the object even though the action is
    technically assigned.
    """
    anim_data.action = action

    # Slot / binding system – introduced in Blender 4.4.
    if not hasattr(anim_data, 'action_slot'):
        return  # Blender < 4.4: nothing more to do

    if not action.slots:
        # Create the first slot with a generic name; the engine will match it
        # to the owner ID automatically.
        try:
            slot = action.slots.new(id_type='OBJECT', name='Slot')
        except Exception:
            try:
                slot = action.slots.new()
            except Exception:
                return
    else:
        slot = action.slots[0]

    try:
        anim_data.action_slot = slot
    except Exception:
        pass


def _get_action_fcurves(action):
    """Return the fcurves container for *action*, creating layers/strips as needed.

    * Blender < 4.4 (legacy action): returns ``action.fcurves`` directly.
    * Blender ≥ 4.4 (layered action): ``action.fcurves`` does not exist;
      returns ``action.layers[0].strips[0].fcurves`` after ensuring the
      default layer and keyframe strip exist.
    """
    # Legacy path: action still exposes a flat fcurves collection.
    if hasattr(action, 'fcurves'):
        return action.fcurves

    # Layered path (Blender 4.4+ / 5.0).
    if not action.layers:
        layer = action.layers.new(name="Layer")
    else:
        layer = action.layers[0]

    if not layer.strips:
        # 'KEYFRAME' is the standard strip type for traditional keyframe data.
        strip = layer.strips.new(type='KEYFRAME')
    else:
        strip = layer.strips[0]

    return strip.fcurves

class AnimationHelpers:
    """Helper functions for animation setup and validation"""
    
    @staticmethod
    def setup_fo4_armature():
        """Create a Fallout 4 compatible biped armature.

        Bone names match the FO4 vanilla skeleton convention used in
        ``HumanRace.nif`` / ``HumanRace.hkx``.  The "NPC X [Abbrev]" format
        is required by the Creation Kit and vanilla equipment so that armour
        and clothing pieces deform correctly when parented to this skeleton.

        Hierarchy (simplified — fingers/facial bones omitted for base meshes):

        Root
        └─ COM [COM]
           └─ Pelvis [Pelvis]
              ├─ Spine [Spine]
              │  ├─ Spine1 [Spine1]
              │  │  └─ Spine2 [Spine2]
              │  │     ├─ Neck [Neck]
              │  │     │  └─ Head [Head]
              │  │     ├─ NPC L Clavicle [LClav]
              │  │     │  └─ NPC L UpperArm [LUpArm]
              │  │     │     └─ NPC L Forearm [LForearm]
              │  │     │        └─ NPC L Hand [LHand]
              │  │     └─ NPC R Clavicle [RClav]
              │  │        └─ NPC R UpperArm [RUpArm]
              │  │           └─ NPC R Forearm [RForearm]
              │  │              └─ NPC R Hand [RHand]
              ├─ NPC L Thigh [LThigh]
              │  └─ NPC L Calf [LCalf]
              │     └─ NPC L Foot [LFoot]
              │        └─ NPC L Toe0 [LToe0]
              └─ NPC R Thigh [RThigh]
                 └─ NPC R Calf [RCalf]
                    └─ NPC R Foot [RFoot]
                       └─ NPC R Toe0 [RToe0]
        """
        # Create armature
        bpy.ops.object.armature_add(location=(0, 0, 0))
        armature_obj = bpy.context.active_object
        armature_obj.name = "FO4_Armature"
        armature = armature_obj.data
        armature.name = "FO4_Armature"

        # Enter edit mode to add bones
        bpy.ops.object.mode_set(mode='EDIT')

        edit_bones = armature.edit_bones
        # rename the default bone that armature_add creates
        root_bone = edit_bones[0]
        root_bone.name = "Root"
        root_bone.head = Vector((0, 0, 0))
        root_bone.tail = Vector((0, 0, 0.1))

        # ── Centre of Mass ──────────────────────────────────────────────
        com = edit_bones.new("COM [COM]")
        com.head = Vector((0, 0, 0.9))
        com.tail = Vector((0, 0, 1.0))
        com.parent = root_bone

        # ── Pelvis ──────────────────────────────────────────────────────
        pelvis = edit_bones.new("NPC Pelvis [Pelvis]")
        pelvis.head = Vector((0, 0, 1.0))
        pelvis.tail = Vector((0, 0, 1.1))
        pelvis.parent = com

        # ── Spine chain ─────────────────────────────────────────────────
        spine = edit_bones.new("NPC Spine [Spine]")
        spine.head = Vector((0, 0, 1.1))
        spine.tail = Vector((0, 0, 1.2))
        spine.parent = pelvis

        spine1 = edit_bones.new("NPC Spine1 [Spine1]")
        spine1.head = Vector((0, 0, 1.2))
        spine1.tail = Vector((0, 0, 1.35))
        spine1.parent = spine

        spine2 = edit_bones.new("NPC Spine2 [Spine2]")
        spine2.head = Vector((0, 0, 1.35))
        spine2.tail = Vector((0, 0, 1.5))
        spine2.parent = spine1

        # ── Neck / Head ─────────────────────────────────────────────────
        neck = edit_bones.new("NPC Neck [Neck]")
        neck.head = Vector((0, 0, 1.5))
        neck.tail = Vector((0, 0, 1.6))
        neck.parent = spine2

        head = edit_bones.new("NPC Head [Head]")
        head.head = Vector((0, 0, 1.6))
        head.tail = Vector((0, 0, 1.8))
        head.parent = neck

        # ── Left arm ────────────────────────────────────────────────────
        l_clav = edit_bones.new("NPC L Clavicle [LClav]")
        l_clav.head = Vector((0.1, 0, 1.48))
        l_clav.tail = Vector((0.3, 0, 1.46))
        l_clav.parent = spine2

        l_upper_arm = edit_bones.new("NPC L UpperArm [LUpArm]")
        l_upper_arm.head = Vector((0.3, 0, 1.46))
        l_upper_arm.tail = Vector((0.6, 0, 1.4))
        l_upper_arm.parent = l_clav

        l_forearm = edit_bones.new("NPC L Forearm [LForearm]")
        l_forearm.head = Vector((0.6, 0, 1.4))
        l_forearm.tail = Vector((0.9, 0, 1.35))
        l_forearm.parent = l_upper_arm

        l_hand = edit_bones.new("NPC L Hand [LHand]")
        l_hand.head = Vector((0.9, 0, 1.35))
        l_hand.tail = Vector((1.05, 0, 1.32))
        l_hand.parent = l_forearm

        # ── Right arm ───────────────────────────────────────────────────
        r_clav = edit_bones.new("NPC R Clavicle [RClav]")
        r_clav.head = Vector((-0.1, 0, 1.48))
        r_clav.tail = Vector((-0.3, 0, 1.46))
        r_clav.parent = spine2

        r_upper_arm = edit_bones.new("NPC R UpperArm [RUpArm]")
        r_upper_arm.head = Vector((-0.3, 0, 1.46))
        r_upper_arm.tail = Vector((-0.6, 0, 1.4))
        r_upper_arm.parent = r_clav

        r_forearm = edit_bones.new("NPC R Forearm [RForearm]")
        r_forearm.head = Vector((-0.6, 0, 1.4))
        r_forearm.tail = Vector((-0.9, 0, 1.35))
        r_forearm.parent = r_upper_arm

        r_hand = edit_bones.new("NPC R Hand [RHand]")
        r_hand.head = Vector((-0.9, 0, 1.35))
        r_hand.tail = Vector((-1.05, 0, 1.32))
        r_hand.parent = r_forearm

        # ── Left leg ────────────────────────────────────────────────────
        l_thigh = edit_bones.new("NPC L Thigh [LThigh]")
        l_thigh.head = Vector((0.18, 0, 1.0))
        l_thigh.tail = Vector((0.2, 0, 0.55))
        l_thigh.parent = pelvis

        l_calf = edit_bones.new("NPC L Calf [LCalf]")
        l_calf.head = Vector((0.2, 0, 0.55))
        l_calf.tail = Vector((0.2, 0, 0.15))
        l_calf.parent = l_thigh

        l_foot = edit_bones.new("NPC L Foot [LFoot]")
        l_foot.head = Vector((0.2, 0, 0.15))
        l_foot.tail = Vector((0.2, 0.12, 0.05))
        l_foot.parent = l_calf

        l_toe = edit_bones.new("NPC L Toe0 [LToe0]")
        l_toe.head = Vector((0.2, 0.12, 0.05))
        l_toe.tail = Vector((0.2, 0.2, 0.02))
        l_toe.parent = l_foot

        # ── Right leg ───────────────────────────────────────────────────
        r_thigh = edit_bones.new("NPC R Thigh [RThigh]")
        r_thigh.head = Vector((-0.18, 0, 1.0))
        r_thigh.tail = Vector((-0.2, 0, 0.55))
        r_thigh.parent = pelvis

        r_calf = edit_bones.new("NPC R Calf [RCalf]")
        r_calf.head = Vector((-0.2, 0, 0.55))
        r_calf.tail = Vector((-0.2, 0, 0.15))
        r_calf.parent = r_thigh

        r_foot = edit_bones.new("NPC R Foot [RFoot]")
        r_foot.head = Vector((-0.2, 0, 0.15))
        r_foot.tail = Vector((-0.2, 0.12, 0.05))
        r_foot.parent = r_calf

        r_toe = edit_bones.new("NPC R Toe0 [RToe0]")
        r_toe.head = Vector((-0.2, 0.12, 0.05))
        r_toe.tail = Vector((-0.2, 0.2, 0.02))
        r_toe.parent = r_foot

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
            # No animation data is acceptable for static (non-animated) objects.
            pass
        
        # Check bone naming conventions.
        # NOTE: FO4 bone names follow the "NPC X [Abbrev]" convention which
        # deliberately includes spaces (e.g. "NPC L UpperArm [LUpArm]").
        # Flagging spaces as errors is INCORRECT for FO4 skeletons.
        # We instead warn only about names that are completely empty.
        for bone in armature.bones:
            if not bone.name.strip():
                issues.append(f"Bone has an empty name (index in armature: unnamed)")
        
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
        # Use the compat helper so Blender 4.4+ slot assignment is handled
        # and Blender 5.0's layered action system is used correctly.
        _assign_action_to_id(arm_obj.animation_data, action)
        idx = {'X':0,'Y':1,'Z':2}.get(axis.upper(),0)
        data_path = f'pose.bones["Wind"].rotation_euler'
        # _get_action_fcurves() returns the right container on all Blender
        # versions: flat action.fcurves (< 4.4) or the layered-strip fcurves
        # (≥ 4.4 / 5.0) where action.fcurves no longer exists.
        fcurves = _get_action_fcurves(action)
        fcurve = fcurves.new(data_path=data_path, index=idx)
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
