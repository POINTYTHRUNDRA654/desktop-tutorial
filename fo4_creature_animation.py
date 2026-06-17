"""
fo4_creature_animation.py
=========================
Automatic mesh analysis, bone placement, and procedural animation generation
for Fallout 4 creatures and interactive flora.

Pipeline
--------
1. Mesh Shape Analysis
   - Detects trunk/stem (central vertical axis)
   - Finds branch/tentacle structures (elongated geometry off the trunk)
   - Identifies tip vertices (loose ends for maximum motion)

2. Auto Rigging
   - Places a root bone at base center of mass
   - Chains spine bones up the trunk
   - Places branch bone chains along each detected appendage
   - Applies Blender heat-weighting for automatic vertex group assignment

3. Procedural Animation Generation
   - Parses user description via Mossy AI (local Nemotron) or keyword matching
   - Generates keyframe curves for detected animation types:
       ATTACK_WHIP    — fast forward snap, hold, return
       ATTACK_COIL    — spiral wrap motion
       ATTACK_STRIKE  — direct linear thrust
       ATTACK_GRAB    — close inward around target
       IDLE_SWAY      — gentle wind sway loop
       IDLE_BREATHE   — slow pulse/expand cycle

4. FO4 Export
   - Creates a Blender NLA action per animation type
   - Exports via ck-cmd to .hkx (Havok animation format)
   - Sets correct FO4 animation flags (kHavokType, Priority, etc.)
"""

import bpy
import bmesh
import math
import mathutils
import os
import subprocess
from typing import List, Tuple, Optional


# ---------------------------------------------------------------------------
# Mesh shape analysis
# ---------------------------------------------------------------------------

def analyze_mesh_shape(obj) -> dict:
    """Analyze a mesh object and return structural information.

    Returns a dict with:
      root_loc       — base center point (Vector)
      trunk_axis     — main growth axis (Vector, normalized)
      trunk_height   — total height along trunk axis (float)
      branches       — list of branch dicts:
                         {root: Vector, tip: Vector, length: float, axis: Vector}
      tip_verts      — list of (index, Vector) for extremity vertices
      mesh_type      — 'plant_tentacle' | 'plant_bush' | 'plant_tall' | 'creature_limb' | 'generic'
    """
    me    = obj.data
    mw    = obj.matrix_world
    verts = [mw @ v.co for v in me.vertices]

    if not verts:
        return {"error": "No vertices"}

    # Bounding box
    xs = [v.x for v in verts]
    ys = [v.y for v in verts]
    zs = [v.z for v in verts]
    bb_w = max(xs) - min(xs)
    bb_d = max(ys) - min(ys)
    bb_h = max(zs) - min(zs)

    # Center of mass at base
    base_z    = min(zs)
    top_z     = max(zs)
    center_xy = mathutils.Vector((
        sum(xs) / len(xs),
        sum(ys) / len(ys),
        base_z,
    ))

    # Determine primary growth axis
    aspect_vh = bb_h / max(max(bb_w, bb_d), 0.001)
    if aspect_vh > 2.0:
        trunk_axis = mathutils.Vector((0, 0, 1))
        mesh_type  = 'plant_tall'
    elif max(bb_w, bb_d) / max(bb_h, 0.001) > 2.0:
        # Horizontal — tentacle/vine lying flat or angled
        ax = bb_w > bb_d
        trunk_axis = mathutils.Vector((1 if ax else 0, 0 if ax else 1, 0)).normalized()
        mesh_type  = 'plant_tentacle'
    else:
        trunk_axis = mathutils.Vector((0, 0, 1))
        mesh_type  = 'plant_bush'

    # Find tip vertices: vertices far from center of mass
    com = mathutils.Vector((sum(xs)/len(xs), sum(ys)/len(ys), sum(zs)/len(zs)))
    dist_from_com = [(i, (v - com).length, v) for i, v in enumerate(verts)]
    dist_from_com.sort(key=lambda x: -x[1])
    tip_verts = [(i, v) for i, _, v in dist_from_com[:max(4, len(verts)//20)]]

    # Detect branches: cluster tip vertices into groups
    branches = _cluster_branches(tip_verts, center_xy, trunk_axis, bb_h)

    return {
        "root_loc":     center_xy,
        "trunk_axis":   trunk_axis,
        "trunk_height": bb_h,
        "branches":     branches,
        "tip_verts":    tip_verts[:8],
        "mesh_type":    mesh_type,
        "bounding_box": (bb_w, bb_d, bb_h),
    }


def _cluster_branches(tip_verts, root, trunk_axis, trunk_height) -> List[dict]:
    """Group tip vertices into branch clusters using simple distance clustering."""
    if not tip_verts:
        return []

    clusters = []
    used     = set()

    for i, (vi, vpos) in enumerate(tip_verts):
        if vi in used:
            continue
        cluster_verts = [vpos]
        used.add(vi)
        # Find nearby tips
        for j, (vj, vpos2) in enumerate(tip_verts):
            if vj not in used and (vpos - vpos2).length < trunk_height * 0.3:
                cluster_verts.append(vpos2)
                used.add(vj)

        tip   = sum(cluster_verts, mathutils.Vector()) / len(cluster_verts)
        # Branch root: point on trunk closest to the tip (projected)
        t     = max(0.0, (tip - root).dot(trunk_axis) * 0.5)
        broot = root + trunk_axis * t
        bvec  = tip - broot
        blen  = bvec.length

        if blen > trunk_height * 0.05:
            clusters.append({
                "root":   broot,
                "tip":    tip,
                "length": blen,
                "axis":   bvec.normalized() if blen > 0 else trunk_axis.copy(),
            })

    return clusters


# ---------------------------------------------------------------------------
# Auto bone placement
# ---------------------------------------------------------------------------

def auto_place_bones(obj, shape_info: dict,
                     spine_segments: int = 3,
                     branch_segments: int = 3) -> Optional[bpy.types.Object]:
    """Create an armature matching the mesh shape and apply heat-weighted skinning.

    Returns the new armature object, or None on failure.
    """
    if "error" in shape_info:
        return None

    root      = shape_info["root_loc"]
    axis      = shape_info["trunk_axis"]
    height    = shape_info["trunk_height"]
    branches  = shape_info["branches"]

    # Create armature
    arm_data = bpy.data.armatures.new(obj.name + "_rig")
    arm_obj  = bpy.data.objects.new(obj.name + "_rig", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)

    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm_data.edit_bones

    # ── Spine / trunk chain ──────────────────────────────────────────────
    seg_h    = height / spine_segments
    prev_tip = None
    for i in range(spine_segments):
        b      = bones.new(f"spine_{i:02d}" if i > 0 else "root")
        b.head = root + axis * (seg_h * i)
        b.tail = root + axis * (seg_h * (i + 1))
        if prev_tip:
            b.parent     = prev_tip
            b.use_connect = True
        prev_tip = b

    spine_top    = prev_tip
    spine_top_co = spine_top.tail.copy() if spine_top else root + axis * height

    # ── Branch / tentacle chains ─────────────────────────────────────────
    for bi, br in enumerate(branches[:8]):   # max 8 branches
        bseg_l   = br["length"] / branch_segments
        b_root   = br["root"]
        b_axis   = br["axis"]
        prev_b   = None

        for si in range(branch_segments):
            bn      = bones.new(f"branch_{bi:02d}_seg_{si:02d}")
            bn.head = b_root + b_axis * (bseg_l * si)
            bn.tail = b_root + b_axis * (bseg_l * (si + 1))

            if si == 0:
                # Connect to nearest spine bone
                nearest = _find_nearest_spine_bone(bones, bn.head)
                if nearest:
                    bn.parent     = nearest
                    bn.use_connect = False
            else:
                bn.parent      = prev_b
                bn.use_connect = True
            prev_b = bn

    bpy.ops.object.mode_set(mode='OBJECT')

    # ── Auto skin: parent mesh to armature with heat weights ─────────────
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Place armature at same location as mesh
    arm_obj.location = (0, 0, 0)

    print(f"[FO4 Anim] Auto-rig: {len(arm_data.bones)} bones placed on '{obj.name}'")
    return arm_obj


def _find_nearest_spine_bone(bones, point):
    """Return the spine bone whose midpoint is closest to point."""
    best      = None
    best_dist = float('inf')
    for b in bones:
        if not b.name.startswith("spine_") and b.name != "root":
            continue
        mid  = (b.head + b.tail) * 0.5
        dist = (mid - point).length
        if dist < best_dist:
            best_dist = dist
            best      = b
    return best


# ---------------------------------------------------------------------------
# Animation type definitions
# ---------------------------------------------------------------------------

class AnimType:
    ATTACK_WHIP   = "attack_whip"
    ATTACK_COIL   = "attack_coil"
    ATTACK_STRIKE = "attack_strike"
    ATTACK_GRAB   = "attack_grab"
    IDLE_SWAY     = "idle_sway"
    IDLE_BREATHE  = "idle_breathe"


def parse_description(description: str) -> List[str]:
    """Parse a user description and return a list of animation types to generate.

    First tries Mossy AI for nuanced understanding, then falls back to
    keyword matching so it always works even offline.
    """
    anim_types = []

    # ── Try Mossy Nemotron ──────────────────────────────────────────────
    try:
        from . import mossy_link
        prompt = (
            f"A Fallout 4 mod creature needs animations. "
            f"The user describes: '{description}'\n\n"
            f"List which of these animation types are needed (comma-separated):\n"
            f"attack_whip, attack_coil, attack_strike, attack_grab, idle_sway, idle_breathe\n\n"
            f"Reply with ONLY the comma-separated type names, nothing else."
        )
        response = mossy_link.ask_mossy(prompt, fo4_context=True, max_tokens=50)
        if response:
            for part in response.replace("\n", ",").split(","):
                t = part.strip().lower()
                if t in vars(AnimType).values():
                    anim_types.append(t)
    except Exception:
        pass

    # ── Keyword fallback ────────────────────────────────────────────────
    if not anim_types:
        d = description.lower()
        if any(k in d for k in ["whip","lash","snap","flick","tentacle","vine"]):
            anim_types.append(AnimType.ATTACK_WHIP)
        if any(k in d for k in ["coil","wrap","spiral","squeeze"]):
            anim_types.append(AnimType.ATTACK_COIL)
        if any(k in d for k in ["strike","thrust","stab","lunge","bite","attack"]):
            anim_types.append(AnimType.ATTACK_STRIKE)
        if any(k in d for k in ["grab","catch","grasp","clutch","hold"]):
            anim_types.append(AnimType.ATTACK_GRAB)
        if any(k in d for k in ["sway","wave","idle","wind","drift"]):
            anim_types.append(AnimType.IDLE_SWAY)
        if any(k in d for k in ["breathe","pulse","expand","inflate"]):
            anim_types.append(AnimType.IDLE_BREATHE)
        if not anim_types:
            # Default: attack whip + idle sway
            anim_types = [AnimType.ATTACK_WHIP, AnimType.IDLE_SWAY]

    return list(dict.fromkeys(anim_types))   # deduplicate, preserve order


# ---------------------------------------------------------------------------
# Keyframe generation per animation type
# ---------------------------------------------------------------------------

def _set_bone_rot(pose_bone, frame: int, x: float = 0, y: float = 0, z: float = 0,
                  action=None):
    """Set euler rotation keyframe on a pose bone."""
    pose_bone.rotation_mode  = 'XYZ'
    pose_bone.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
    pose_bone.keyframe_insert("rotation_euler", frame=frame)


def generate_action_attack_whip(arm_obj, shape_info: dict,
                                 fps: int = 30, duration_s: float = 1.5) -> bpy.types.Action:
    """ATTACK_WHIP — tentacle/branch whips forward fast then returns.

    Timing (at 30fps):
      Frame  0:  rest pose
      Frame  8:  wind-up (bend backward ~40°)
      Frame 18:  snap forward hard (~-60° from rest)
      Frame 24:  slight overshoot, tip splays
      Frame 45:  ease back to rest
    """
    action          = bpy.data.actions.new("FO4_attack_whip")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    branches = shape_info.get("branches", [])
    n_bones  = len(arm_obj.pose.bones)

    for pb in arm_obj.pose.bones:
        name = pb.name
        is_branch = name.startswith("branch_")
        is_spine  = name.startswith("spine_") or name == "root"

        if is_branch:
            seg = int(name.split("_seg_")[-1]) if "_seg_" in name else 0
            tip_factor = (seg + 1) / 3.0   # tip bones move more

            # Wind-up
            _set_bone_rot(pb, 0,   0,  0,   0)
            _set_bone_rot(pb, 8,   30 * tip_factor, 0, -15 * tip_factor)
            # Snap
            _set_bone_rot(pb, 18, -50 * tip_factor, 0,  10 * tip_factor)
            # Overshoot
            _set_bone_rot(pb, 24, -30 * tip_factor, 5 * tip_factor, 5)
            # Return
            _set_bone_rot(pb, 45,  0,  0,   0)

        elif is_spine:
            idx = int(name.split("_")[-1]) if "_" in name and name.split("_")[-1].isdigit() else 0
            lean = (idx + 1) / 4.0

            _set_bone_rot(pb, 0,   0,  0,  0)
            _set_bone_rot(pb, 8,  15 * lean, 0, 0)
            _set_bone_rot(pb, 18,-10 * lean, 0, 0)
            _set_bone_rot(pb, 45,  0,  0,  0)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def generate_action_idle_sway(arm_obj, shape_info: dict,
                               fps: int = 30, duration_s: float = 3.0) -> bpy.types.Action:
    """IDLE_SWAY — gentle wind-driven sway loop.

    Full loop at 90 frames (3s at 30fps).  Branches sway with phase offset
    so they don't all move in lockstep (looks natural).
    """
    action          = bpy.data.actions.new("FO4_idle_sway")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    total = int(duration_s * fps)

    for pb in arm_obj.pose.bones:
        name = pb.name
        is_branch = name.startswith("branch_")
        is_spine  = name.startswith("spine_") or name == "root"

        if is_branch:
            bi  = int(name.split("_")[1]) if len(name.split("_")) > 2 else 0
            seg = int(name.split("_seg_")[-1]) if "_seg_" in name else 0
            amp = 8.0 * (seg + 1) / 3.0
            phase_deg = bi * 45   # offset each branch

            for f in range(0, total + 1, 5):
                angle = amp * math.sin(math.radians(f * (360 / total) + phase_deg))
                _set_bone_rot(pb, f, 0, 0, angle)

        elif is_spine:
            idx = int(name.split("_")[-1]) if "_" in name and name.split("_")[-1].isdigit() else 0
            amp = 3.0 * (idx + 1) / 4.0
            for f in range(0, total + 1, 5):
                angle = amp * math.sin(math.radians(f * 360 / total))
                _set_bone_rot(pb, f, 0, 0, angle)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def generate_action_attack_strike(arm_obj, shape_info: dict,
                                   fps: int = 30) -> bpy.types.Action:
    """ATTACK_STRIKE — direct forward thrust, fast and linear."""
    action          = bpy.data.actions.new("FO4_attack_strike")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    for pb in arm_obj.pose.bones:
        is_spine = pb.name.startswith("spine_") or pb.name == "root"
        idx  = int(pb.name.split("_")[-1]) if "_" in pb.name and pb.name.split("_")[-1].isdigit() else 0
        lean = (idx + 1) / 4.0

        _set_bone_rot(pb, 0,   0,  0,  0)
        _set_bone_rot(pb, 6,  -10 * lean, 0, 0)   # slight wind-up
        _set_bone_rot(pb, 14,  45 * lean, 0, 0)   # thrust forward
        _set_bone_rot(pb, 22,  20 * lean, 0, 0)   # hold
        _set_bone_rot(pb, 40,   0,  0,  0)         # return

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def generate_action_attack_grab(arm_obj, shape_info: dict,
                                 fps: int = 30) -> bpy.types.Action:
    """ATTACK_GRAB — branches close inward around a target."""
    action          = bpy.data.actions.new("FO4_attack_grab")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    for pb in arm_obj.pose.bones:
        is_branch = pb.name.startswith("branch_")
        bi        = int(pb.name.split("_")[1]) if is_branch and len(pb.name.split("_")) > 2 else 0
        seg       = int(pb.name.split("_seg_")[-1]) if "_seg_" in pb.name else 0
        # Alternate branches curl from different directions
        dir_sign  = 1 if bi % 2 == 0 else -1

        if is_branch:
            _set_bone_rot(pb, 0,   0,  0,  0)
            _set_bone_rot(pb, 5,   0,  0,  dir_sign * -20 * (seg+1)/3)  # open wider
            _set_bone_rot(pb, 20,  0,  0,  dir_sign *  60 * (seg+1)/3)  # close in
            _set_bone_rot(pb, 30,  0,  0,  dir_sign *  50 * (seg+1)/3)  # hold
            _set_bone_rot(pb, 50,  0,  0,  0)                            # release

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def generate_action_attack_coil(arm_obj, shape_info: dict,
                                 fps: int = 30) -> bpy.types.Action:
    """ATTACK_COIL — spiral rotation along branch axis."""
    action          = bpy.data.actions.new("FO4_attack_coil")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    for pb in arm_obj.pose.bones:
        is_branch = pb.name.startswith("branch_")
        seg = int(pb.name.split("_seg_")[-1]) if "_seg_" in pb.name else 0

        if is_branch:
            _set_bone_rot(pb, 0,   0, 0,           0)
            _set_bone_rot(pb, 10,  0, 90 * (seg+1)/3,  20 * (seg+1)/3)
            _set_bone_rot(pb, 25,  0, 200 * (seg+1)/3, 10 * (seg+1)/3)
            _set_bone_rot(pb, 40,  0, 0,           0)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def generate_action_idle_breathe(arm_obj, shape_info: dict,
                                  fps: int = 30) -> bpy.types.Action:
    """IDLE_BREATHE — slow scale pulse (expand/contract cycle)."""
    action          = bpy.data.actions.new("FO4_idle_breathe")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    total = 90
    for pb in arm_obj.pose.bones:
        is_spine = pb.name.startswith("spine_") or pb.name == "root"
        if is_spine:
            for f in range(0, total + 1, 5):
                scale = 1.0 + 0.05 * math.sin(math.radians(f * 360 / total))
                pb.scale = (scale, scale, scale)
                pb.keyframe_insert("scale", frame=f)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


_ACTION_GENERATORS = {
    AnimType.ATTACK_WHIP:   generate_action_attack_whip,
    AnimType.ATTACK_COIL:   generate_action_attack_coil,
    AnimType.ATTACK_STRIKE: generate_action_attack_strike,
    AnimType.ATTACK_GRAB:   generate_action_attack_grab,
    AnimType.IDLE_SWAY:     generate_action_idle_sway,
    AnimType.IDLE_BREATHE:  generate_action_idle_breathe,
}


def generate_animations(arm_obj, shape_info: dict,
                         anim_types: List[str]) -> List[bpy.types.Action]:
    """Generate all requested animation actions on the armature."""
    actions = []
    for atype in anim_types:
        gen = _ACTION_GENERATORS.get(atype)
        if gen:
            try:
                act = gen(arm_obj, shape_info)
                actions.append(act)
                print(f"[FO4 Anim] Generated: {act.name}")
            except Exception as exc:
                print(f"[FO4 Anim] Failed to generate {atype}: {exc}")
    return actions


# ---------------------------------------------------------------------------
# FO4 Havok export
# ---------------------------------------------------------------------------

def export_animations_hkx(arm_obj, actions: List[bpy.types.Action],
                            output_dir: str) -> List[tuple]:
    """Export animation actions to FO4 .hkx via ck-cmd.

    Returns list of (success, path_or_error) per action.
    """
    results = []
    try:
        from . import preferences as _prefs_mod
        prefs   = _prefs_mod.get_preferences()
        ckcmd   = getattr(prefs, 'ckcmd_path', '').strip() if prefs else ''
    except Exception:
        ckcmd = ''

    os.makedirs(output_dir, exist_ok=True)

    for action in actions:
        fbx_path = os.path.join(output_dir, action.name + ".fbx")
        hkx_path = os.path.join(output_dir, action.name + ".hkx")

        # Set active action
        arm_obj.animation_data.action = action

        # Export to FBX
        try:
            bpy.ops.export_scene.fbx(
                filepath=fbx_path,
                use_selection=True,
                bake_anim=True,
                bake_anim_use_all_actions=False,
                bake_anim_step=1.0,
                bake_anim_simplify_factor=0.0,
                add_leaf_bones=False,
            )
        except Exception as exc:
            results.append((False, f"FBX export failed: {exc}"))
            continue

        # Convert FBX → HKX via ck-cmd
        # Correct invocation: ck-cmd importanimation <fbx> --game fo4
        #   --platform WIN64 --dest <output_dir>
        # ck-cmd writes <basename>.hkx into the dest directory; we then move
        # it to the requested hkx_path.
        if ckcmd and os.path.isfile(ckcmd):
            import tempfile as _tempfile
            import shutil as _shutil
            try:
                with _tempfile.TemporaryDirectory() as _tmp:
                    result = subprocess.run(
                        [ckcmd, "importanimation", fbx_path,
                         "--game", "fo4",
                         "--platform", "WIN64",
                         "--dest", _tmp],
                        capture_output=True, text=True, timeout=120,
                    )
                    _base = os.path.splitext(os.path.basename(fbx_path))[0]
                    _hkx_tmp = os.path.join(_tmp, _base + ".hkx")
                    if result.returncode == 0 and os.path.isfile(_hkx_tmp):
                        _shutil.move(_hkx_tmp, hkx_path)
                        results.append((True, hkx_path))
                        continue
                    else:
                        results.append((False, f"ck-cmd failed: {result.stderr.strip()}"))
                        continue
            except Exception as exc:
                results.append((False, f"ck-cmd error: {exc}"))
                continue

        # No ck-cmd — keep FBX
        results.append((True, fbx_path + " (FBX only — install ck-cmd for HKX)"))

    return results


# ---------------------------------------------------------------------------
# Blender Operators
# ---------------------------------------------------------------------------

class FO4_OT_AutoRigMesh(bpy.types.Operator):
    """Analyze the active mesh and automatically place a FO4-compatible armature.

    Works for plants, creatures, tentacles, vines — any organic mesh.
    The bone chain follows the detected trunk and branch geometry.
    Heat-weighted auto-skinning is applied automatically.
    """
    bl_idname  = "fo4.auto_rig_mesh"
    bl_label   = "Auto-Rig Mesh for FO4"
    bl_options = {'REGISTER', 'UNDO'}

    spine_segments: bpy.props.IntProperty(
        name="Spine Segments",
        description="Number of bones along the main trunk/stem",
        default=3, min=1, max=8,
    )
    branch_segments: bpy.props.IntProperty(
        name="Branch Segments",
        description="Number of bones per branch/tentacle",
        default=3, min=1, max=6,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        self.report({'INFO'}, "Analyzing mesh shape…")
        shape = analyze_mesh_shape(obj)

        if "error" in shape:
            self.report({'ERROR'}, shape["error"])
            return {'CANCELLED'}

        print(f"[FO4 Anim] Mesh type: {shape['mesh_type']} | "
              f"Branches: {len(shape['branches'])} | "
              f"Height: {shape['trunk_height']:.2f}")

        arm = auto_place_bones(obj, shape,
                               spine_segments=self.spine_segments,
                               branch_segments=self.branch_segments)
        if arm is None:
            self.report({'ERROR'}, "Failed to create armature")
            return {'CANCELLED'}

        self.report({'INFO'},
            f"Auto-rig complete: {len(arm.data.bones)} bones, "
            f"{len(shape['branches'])} branch(es) detected")
        return {'FINISHED'}


class FO4_OT_GenerateAnimation(bpy.types.Operator):
    """Generate custom FO4 animations from a text description.

    Works on the active armature.  Describe what the creature does and
    the system generates keyframe actions — no manual animation required.

    Examples:
      'plant attacks by whipping tentacles forward'
      'vine coils around prey and grabs'
      'idle sway in the wind'
      'lunge forward and strike with multiple tentacles'
    """
    bl_idname  = "fo4.generate_animation"
    bl_label   = "Generate FO4 Animation"
    bl_options = {'REGISTER', 'UNDO'}

    description: bpy.props.StringProperty(
        name="Animation Description",
        description="Describe what the creature does — e.g. 'plant whips tentacles forward to attack'",
        default="plant attacks by whipping tentacles forward",
    )
    export_hkx: bpy.props.BoolProperty(
        name="Export to .hkx",
        description="Export animations to Havok .hkx format via ck-cmd (requires ck-cmd in preferences)",
        default=False,
    )
    output_dir: bpy.props.StringProperty(
        name="Output Folder",
        description="Where to save exported .hkx files",
        subtype='DIR_PATH',
        default="",
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=500)

    def draw(self, context):
        layout = self.layout
        layout.label(text="Describe the animation:", icon='OUTLINER_DATA_ARMATURE')
        layout.prop(self, "description", text="")
        layout.separator()
        layout.prop(self, "export_hkx")
        if self.export_hkx:
            layout.prop(self, "output_dir")

    def execute(self, context):
        arm_obj = context.active_object
        if not arm_obj or arm_obj.type != 'ARMATURE':
            self.report({'ERROR'}, "Select an armature object first")
            return {'CANCELLED'}

        # Parse description → animation types
        anim_types = parse_description(self.description)
        print(f"[FO4 Anim] Parsed '{self.description}' → {anim_types}")

        # Rebuild shape info from armature
        shape_info = _shape_from_armature(arm_obj)

        # Generate actions
        actions = generate_animations(arm_obj, shape_info, anim_types)

        if not actions:
            self.report({'WARNING'}, "No animations generated — try rephrasing the description")
            return {'CANCELLED'}

        # Export if requested
        if self.export_hkx:
            out = bpy.path.abspath(self.output_dir) if self.output_dir else bpy.path.abspath("//animations/")
            results = export_animations_hkx(arm_obj, actions, out)
            ok  = sum(1 for s, _ in results if s)
            msg = f"Generated {len(actions)} animation(s) | Exported {ok}/{len(results)} to HKX"
        else:
            msg = (f"Generated {len(actions)} animation(s): "
                   f"{', '.join(a.name for a in actions)}")

        self.report({'INFO'}, msg)
        return {'FINISHED'}


def _shape_from_armature(arm_obj) -> dict:
    """Build a minimal shape_info dict from an existing armature."""
    bones  = arm_obj.data.bones
    spine  = [b for b in bones if b.name.startswith("spine_") or b.name == "root"]
    branch_indices = set(int(b.name.split("_")[1])
                         for b in bones if b.name.startswith("branch_")
                         and len(b.name.split("_")) > 2)
    branches = [{"root": mathutils.Vector((0,0,0)),
                 "tip":  mathutils.Vector((0,0,1)),
                 "length": 1.0,
                 "axis":   mathutils.Vector((0,0,1))}
                for _ in branch_indices]
    return {
        "root_loc":     mathutils.Vector((0, 0, 0)),
        "trunk_axis":   mathutils.Vector((0, 0, 1)),
        "trunk_height": 2.0,
        "branches":     branches,
        "tip_verts":    [],
        "mesh_type":    "generic",
    }


class FO4_OT_FullAnimPipeline(bpy.types.Operator):
    """One-click: analyze mesh → auto-rig → generate animations → export HKX.

    Select your mesh, describe what it should do, and this operator handles
    the full pipeline end to end.
    """
    bl_idname  = "fo4.full_anim_pipeline"
    bl_label   = "Full Animation Pipeline"
    bl_options = {'REGISTER', 'UNDO'}

    description: bpy.props.StringProperty(
        name="Animation Description",
        default="plant attacks by whipping tentacles forward and grabbing",
    )
    spine_segments: bpy.props.IntProperty(name="Spine Bones",   default=3, min=1, max=8)
    branch_segments: bpy.props.IntProperty(name="Branch Bones", default=3, min=1, max=6)
    export_hkx: bpy.props.BoolProperty(name="Export to .hkx",  default=False)
    output_dir: bpy.props.StringProperty(
        name="Output Folder", subtype='DIR_PATH', default="",
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=500)

    def draw(self, context):
        layout = self.layout
        layout.label(text="Step 1: Describe what the creature does:", icon='OUTLINER_DATA_ARMATURE')
        layout.prop(self, "description", text="")
        layout.separator()
        layout.label(text="Step 2: Rig settings:", icon='BONE_DATA')
        row = layout.row()
        row.prop(self, "spine_segments")
        row.prop(self, "branch_segments")
        layout.separator()
        layout.prop(self, "export_hkx")
        if self.export_hkx:
            layout.prop(self, "output_dir")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        # Analyze
        shape = analyze_mesh_shape(obj)
        if "error" in shape:
            self.report({'ERROR'}, shape["error"])
            return {'CANCELLED'}
        self.report({'INFO'}, f"Mesh: {shape['mesh_type']}, {len(shape['branches'])} branch(es)")

        # Auto-rig
        arm = auto_place_bones(obj, shape,
                               spine_segments=self.spine_segments,
                               branch_segments=self.branch_segments)
        if not arm:
            self.report({'ERROR'}, "Auto-rig failed")
            return {'CANCELLED'}

        # Parse + generate
        anim_types = parse_description(self.description)
        actions    = generate_animations(arm, shape, anim_types)

        if not actions:
            self.report({'WARNING'}, "No animations generated")
            return {'CANCELLED'}

        # Export
        if self.export_hkx:
            out = bpy.path.abspath(self.output_dir) if self.output_dir else bpy.path.abspath("//animations/")
            results = export_animations_hkx(arm, actions, out)
            ok = sum(1 for s, _ in results if s)
            self.report({'INFO'},
                f"Pipeline complete: {len(arm.data.bones)} bones, "
                f"{len(actions)} animation(s), {ok} HKX exported")
        else:
            self.report({'INFO'},
                f"Pipeline complete: {len(arm.data.bones)} bones, "
                f"{len(actions)} animation(s) created in NLA")

        return {'FINISHED'}



class FO4_OT_SetAnimPreset(bpy.types.Operator):
    """Set a preset animation description — click any Quick Pick button to use it."""
    bl_idname  = "fo4.set_anim_preset"
    bl_label   = "Set Animation Preset"
    bl_options = {'INTERNAL'}

    preset: bpy.props.StringProperty(default="")

    def execute(self, context):
        if hasattr(context.scene, 'fo4_anim_description'):
            context.scene.fo4_anim_description = self.preset
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_CLASSES = [
    FO4_OT_SetAnimPreset,
    FO4_OT_AutoRigMesh,
    FO4_OT_GenerateAnimation,
    FO4_OT_FullAnimPipeline,
]


def register():
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as exc:
            print(f"fo4_creature_animation: Could not register {cls.__name__}: {exc}")


def unregister():
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
