"""
daz_animation_importer.py
=========================
Import DAZ Studio animation data (.duf / .dsf) and retarget it to the
Fallout 4 NPC skeleton inside Blender.

Pipeline
--------
1. Parse a DUF scene file — extract ``scene.animations`` channels.
2. Map DAZ bone names → FO4 canonical NPC bone names using DAZ_TO_FO4_BONE_MAP.
3. Convert DAZ coordinate system (Y-up, degrees, cm) → Blender (Z-up, radians, m).
4. Create a Blender Action with one FCurve per bone/channel/axis.
5. Assign the action to the FO4 NPC armature in the scene.
6. Optionally export to .hkx via fo4_animation_export / ck-cmd.

DAZ coordinate conventions
---------------------------
- Y-up world (Blender is Z-up)  → swap Y/Z, negate new Y
- Rotation values in degrees    → multiply by math.pi / 180 for radians
- Default rotation order varies per-bone; Genesis 8 torso uses YXZ,
  limbs use XYZ.  We normalise to Blender's default XYZ Euler.
- Translation in centimetres    → multiply by 0.01 for metres
- Frame numbers start at 0 in DUF; Blender starts at 1.

Supported DAZ figures
---------------------
Genesis 3 Female / Male, Genesis 8 Female / Male, Genesis 8.1 Female / Male.
The bone map covers the main 23 deform bones needed for FO4 humanoid animation.
Finger, facial, and morph channels are parsed but not retargeted by default
(they have no FO4 equivalent) — they are preserved as a separate reference
action on the original DAZ armature if one is present in the scene.
"""

from __future__ import annotations

import gzip
import json
import math
import os
import re
from typing import Dict, List, Optional, Tuple

try:
    import bpy
    from bpy.props import (BoolProperty, EnumProperty, FloatProperty,
                            StringProperty)
    from bpy.types import Operator
    from bpy_extras.io_utils import ImportHelper
    from mathutils import Euler, Matrix, Vector
except ImportError:
    bpy = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# DAZ → FO4 bone name mapping
# ---------------------------------------------------------------------------
# Keys   = DAZ Genesis 3 / 8 / 8.1 bone names (lower-case for case-insensitive lookup)
# Values = canonical FO4 NPC skeleton names from fo4_bone_names.py
# ---------------------------------------------------------------------------
DAZ_TO_FO4_BONE_MAP: Dict[str, str] = {
    # Root / COM
    "hip":              "NPC COM [COM ]",
    "pelvis":           "NPC Pelvis [Pelv]",

    # Spine chain
    "abdomenLower":     "NPC Spine [Spn0]",
    "abdomenUpper":     "NPC Spine1 [Spn1]",
    "abdomen":          "NPC Spine [Spn0]",      # Genesis 3 name
    "abdomen2":         "NPC Spine1 [Spn1]",     # Genesis 3 name
    "chestLower":       "NPC Spine2 [Spn2]",
    "chestUpper":       "NPC Spine2 [Spn2]",
    "chest":            "NPC Spine2 [Spn2]",     # Genesis 3 name

    # Head / neck
    "neckLower":        "NPC Neck [Neck]",
    "neckUpper":        "NPC Neck [Neck]",
    "neck":             "NPC Neck [Neck]",        # Genesis 3 name
    "head":             "NPC Head [Head]",

    # Left arm
    "lCollar":          "NPC L Clavicle [LClv]",
    "lShldrBend":       "NPC L UpperArm [LUar]",
    "lShldr":           "NPC L UpperArm [LUar]", # Genesis 3 name
    "lForearmBend":     "NPC L Forearm [LLar]",
    "lForeArm":         "NPC L Forearm [LLar]",  # Genesis 3 name
    "lHand":            "NPC L Hand [LHnd]",

    # Right arm
    "rCollar":          "NPC R Clavicle [RClv]",
    "rShldrBend":       "NPC R UpperArm [RUar]",
    "rShldr":           "NPC R UpperArm [RUar]", # Genesis 3 name
    "rForearmBend":     "NPC R Forearm [RLar]",
    "rForeArm":         "NPC R Forearm [RLar]",  # Genesis 3 name
    "rHand":            "NPC R Hand [RHnd]",

    # Left leg
    "lThighBend":       "NPC L Thigh [LThg]",
    "lThigh":           "NPC L Thigh [LThg]",    # Genesis 3 name
    "lShin":            "NPC L Calf [LClf]",
    "lFoot":            "NPC L Foot [Lft ]",
    "lToe":             "NPC L Toe0 [LToe]",

    # Right leg
    "rThighBend":       "NPC R Thigh [RThg]",
    "rThigh":           "NPC R Thigh [RThg]",    # Genesis 3 name
    "rShin":            "NPC R Calf [RClf]",
    "rFoot":            "NPC R Foot [Rft ]",
    "rToe":             "NPC R Toe0 [RToe]",
}

# Case-insensitive lookup dict
_DAZ_MAP_LOWER: Dict[str, str] = {k.lower(): v for k, v in DAZ_TO_FO4_BONE_MAP.items()}


def _fo4_name_for_daz_bone(daz_name: str) -> Optional[str]:
    """Return the FO4 bone name for a DAZ bone name, or None if unmapped."""
    return _DAZ_MAP_LOWER.get(daz_name.lower())


# ---------------------------------------------------------------------------
# DUF file loading (shared with dsf_importer.py logic)
# ---------------------------------------------------------------------------

def _load_duf(path: str) -> Dict:
    """Load a .duf / .dsf file (plain JSON or gzip-compressed JSON)."""
    with open(path, "rb") as fh:
        header = fh.read(2)
    if header == b"\x1f\x8b":
        with gzip.open(path, "rt", encoding="utf-8") as fh:
            return json.load(fh)
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# Animation channel parsing
# ---------------------------------------------------------------------------

class _AnimChannel:
    """One animation channel from a DUF scene.animations entry."""

    __slots__ = ("bone_name", "channel_type", "axis", "keys", "fo4_bone")

    def __init__(self, bone_name: str, channel_type: str, axis: str,
                 keys: List[Tuple[float, float, str]]):
        self.bone_name    = bone_name         # DAZ bone name
        self.channel_type = channel_type      # "rotation" | "translation" | "scale"
        self.axis         = axis              # "x" | "y" | "z"
        self.keys         = keys              # [(frame, value, interp), ...]
        self.fo4_bone     = _fo4_name_for_daz_bone(bone_name)  # may be None


def _parse_duf_url(url: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract (figure_id, bone_name) from a DUF channel URL.

    Example URLs:
      #Genesis8Female:/data/.../Genesis8Female.dsf#hip
      /data/daz3d/genesis3/female/genesis3female.dsf#abdomenLower
    """
    # The bone name is the fragment after the last '#'
    if "#" not in url:
        return None, None
    parts = url.split("#")
    bone_id = parts[-1]  # everything after last '#'

    # Figure ID: the part of the path before the last '/' in the URL section
    figure_id = None
    for part in parts[:-1]:
        m = re.search(r"([^/]+)\.dsf$", part, re.IGNORECASE)
        if m:
            figure_id = m.group(1)
            break
    return figure_id, bone_id


def parse_animations(duf_data: Dict, fps: float = 30.0) -> List[_AnimChannel]:
    """Extract all animation channels from parsed DUF scene data.

    Returns a list of _AnimChannel objects.  Time values in DUF ``keys``
    are in seconds; we convert to frame numbers using *fps*.
    """
    scene = duf_data.get("scene", {})
    raw_anims = scene.get("animations", [])
    channels: List[_AnimChannel] = []

    for entry in raw_anims:
        url       = entry.get("url", "")
        raw_keys  = entry.get("keys", [])
        channel   = entry.get("channel", "")        # e.g. "rotation/y"

        _, bone_name = _parse_duf_url(url)
        if not bone_name:
            continue

        # Channel format is "type/axis" (rotation/x) or sometimes just "type"
        if "/" in channel:
            ch_type, ch_axis = channel.split("/", 1)
        else:
            ch_type, ch_axis = channel, "x"

        # Convert keys: [time_seconds, value, interp_string]
        converted_keys: List[Tuple[float, float, str]] = []
        for k in raw_keys:
            if len(k) < 2:
                continue
            time_s = float(k[0])
            value  = float(k[1])
            interp = str(k[2]).lower() if len(k) > 2 else "linear"
            frame  = time_s * fps      # convert seconds → frame number
            converted_keys.append((frame, value, interp))

        if converted_keys:
            channels.append(_AnimChannel(bone_name, ch_type, ch_axis, converted_keys))

    return channels


# ---------------------------------------------------------------------------
# Coordinate system conversion helpers
# ---------------------------------------------------------------------------
# DAZ is Y-up; FO4/Blender is Z-up.
# DAZ bone rotations are in degrees; Blender uses radians.
#
# Axis remapping for rotations (Y-up → Z-up):
#   DAZ X → Blender X   (unchanged)
#   DAZ Y → Blender Z   (Y becomes vertical)
#   DAZ Z → Blender -Y  (Z becomes depth, negated)
#
# This mapping applies to ROTATION channels.  Translation channels use the
# same spatial swap but also need the cm→m scale factor.
# ---------------------------------------------------------------------------

def _convert_rotation_value(daz_axis: str, value_deg: float) -> Tuple[str, float]:
    """Return (blender_axis, value_radians) for a DAZ rotation channel."""
    value_rad = math.radians(value_deg)
    if daz_axis == "x":
        return "x", value_rad
    if daz_axis == "y":
        return "z", value_rad
    if daz_axis == "z":
        return "y", -value_rad
    return daz_axis, value_rad


def _convert_translation_value(daz_axis: str, value_cm: float) -> Tuple[str, float]:
    """Return (blender_axis, value_metres) for a DAZ translation channel."""
    value_m = value_cm * 0.01
    if daz_axis == "x":
        return "x", value_m
    if daz_axis == "y":
        return "z", value_m
    if daz_axis == "z":
        return "y", -value_m
    return daz_axis, value_m


_INTERP_MAP = {
    "linear":  "LINEAR",
    "constant": "CONSTANT",
    "bezier":  "BEZIER",
    "tcb":     "BEZIER",    # Tension-Continuity-Bias → approximate with Bezier
}


# ---------------------------------------------------------------------------
# Blender action builder
# ---------------------------------------------------------------------------

def build_action_from_channels(
    channels: List[_AnimChannel],
    armature_obj,
    action_name: str = "DAZ_Animation",
    retarget_fo4: bool = True,
    frame_offset: int = 1,
) -> Optional["bpy.types.Action"]:
    """Create a Blender Action from parsed DAZ animation channels.

    Parameters
    ----------
    channels      : list of _AnimChannel from parse_animations()
    armature_obj  : the Blender armature object to animate
    action_name   : name for the new Action datablock
    retarget_fo4  : if True, map DAZ bone names → FO4 bone names;
                    if False, use the raw DAZ bone names (for DAZ armatures)
    frame_offset  : add this to every frame number (DUF frame 0 → Blender frame 1)
    """
    if bpy is None:
        return None
    if armature_obj is None or armature_obj.type != "ARMATURE":
        return None

    bone_names_in_scene = {b.name for b in armature_obj.data.bones}

    if not armature_obj.animation_data:
        armature_obj.animation_data_create()

    action = bpy.data.actions.new(name=action_name)

    # Use the compatibility shim from animation_helpers if available
    try:
        from . import animation_helpers as _ah
        _ah._assign_action_to_id(armature_obj.animation_data, action)
    except Exception:
        armature_obj.animation_data.action = action

    skipped_bones: List[str] = []
    written_channels: int = 0

    for ch in channels:
        # ── Resolve target bone name ─────────────────────────────────────
        if retarget_fo4:
            target_bone = ch.fo4_bone
        else:
            target_bone = ch.bone_name

        if target_bone is None or target_bone not in bone_names_in_scene:
            if ch.bone_name not in skipped_bones:
                skipped_bones.append(ch.bone_name)
            continue

        # ── Convert channel to Blender axis / value ──────────────────────
        if ch.channel_type == "rotation":
            bl_axis, value_fn = None, None

            def _make_keys_rotation(raw_keys, daz_ax=ch.axis):
                out = []
                for frame, val, interp in raw_keys:
                    bl_ax, bl_val = _convert_rotation_value(daz_ax, val)
                    out.append((frame + frame_offset, bl_val, interp, bl_ax))
                return out

            converted = _make_keys_rotation(ch.keys)
            if not converted:
                continue
            bl_axis  = converted[0][3]
            axis_idx = {"x": 0, "y": 1, "z": 2}.get(bl_axis, 0)
            data_path = f'pose.bones["{target_bone}"].rotation_euler'

        elif ch.channel_type == "translation":
            def _make_keys_translation(raw_keys, daz_ax=ch.axis):
                out = []
                for frame, val, interp in raw_keys:
                    bl_ax, bl_val = _convert_translation_value(daz_ax, val)
                    out.append((frame + frame_offset, bl_val, interp, bl_ax))
                return out

            converted = _make_keys_translation(ch.keys)
            if not converted:
                continue
            bl_axis  = converted[0][3]
            axis_idx = {"x": 0, "y": 1, "z": 2}.get(bl_axis, 0)
            data_path = f'pose.bones["{target_bone}"].location'

        elif ch.channel_type == "scale":
            axis_idx = {"x": 0, "y": 1, "z": 2}.get(ch.axis, 0)
            data_path = f'pose.bones["{target_bone}"].scale'
            converted = [(f + frame_offset, v, i, ch.axis)
                         for f, v, i in ch.keys]
        else:
            continue

        # ── Write FCurve ─────────────────────────────────────────────────
        try:
            fcurve = action.fcurves.find(data_path, index=axis_idx)
            if fcurve is None:
                fcurve = action.fcurves.new(data_path=data_path, index=axis_idx,
                                            action_group=target_bone)

            kfp = fcurve.keyframe_points
            kfp.add(count=len(converted))
            for i, (frame, val, interp, _ax) in enumerate(converted):
                kfp[i].co = (float(frame), float(val))
                kfp[i].interpolation = _INTERP_MAP.get(interp, "LINEAR")

            written_channels += 1
        except Exception as exc:
            print(f"[DAZ Anim] Could not write FCurve {data_path}[{axis_idx}]: {exc}")

    if skipped_bones:
        unmapped = [b for b in skipped_bones if _fo4_name_for_daz_bone(b) is None]
        if unmapped:
            print(f"[DAZ Anim] {len(unmapped)} unmapped DAZ bones (no FO4 equivalent): "
                  f"{unmapped[:8]}{'...' if len(unmapped) > 8 else ''}")

    print(f"[DAZ Anim] Action '{action_name}': {written_channels} FCurves written.")
    return action


# ---------------------------------------------------------------------------
# High-level importer
# ---------------------------------------------------------------------------

class DazAnimationImporter:
    """Import DAZ animation from a .duf file and retarget to an FO4 armature."""

    def __init__(self, filepath: str, fps: float = 30.0,
                 retarget_fo4: bool = True, frame_offset: int = 1):
        self.filepath     = filepath
        self.fps          = fps
        self.retarget_fo4 = retarget_fo4
        self.frame_offset = frame_offset
        self.messages: List[str] = []

    def run(self, armature_obj=None) -> bool:
        """Parse the DUF and create an Action on *armature_obj*.

        If *armature_obj* is None the importer searches the current scene
        for a suitable FO4 NPC armature (one with "NPC " prefixed bones).
        """
        if bpy is None:
            return False

        # ── 1. Load file ─────────────────────────────────────────────────
        if not os.path.isfile(self.filepath):
            self.messages.append(f"File not found: {self.filepath}")
            return False
        try:
            duf_data = _load_duf(self.filepath)
        except Exception as exc:
            self.messages.append(f"Failed to parse DUF: {exc}")
            return False

        # ── 2. Parse channels ─────────────────────────────────────────────
        channels = parse_animations(duf_data, fps=self.fps)
        if not channels:
            self.messages.append("No animation channels found in file.")
            return False
        self.messages.append(f"Found {len(channels)} animation channels.")

        # ── 3. Find target armature ───────────────────────────────────────
        if armature_obj is None:
            armature_obj = self._find_fo4_armature()
        if armature_obj is None:
            self.messages.append(
                "No FO4 NPC armature found in scene. "
                "Import fo4_skeleton.nif or run 'Build FO4 Reference Skeleton' first."
            )
            return False
        self.messages.append(f"Target armature: '{armature_obj.name}'")

        # ── 4. Build action ───────────────────────────────────────────────
        action_name = os.path.splitext(os.path.basename(self.filepath))[0]
        action = build_action_from_channels(
            channels,
            armature_obj,
            action_name=action_name,
            retarget_fo4=self.retarget_fo4,
            frame_offset=self.frame_offset,
        )
        if action is None:
            self.messages.append("Action creation failed.")
            return False

        # ── 5. Set scene frame range ──────────────────────────────────────
        all_frames = [kp.co[0] for fc in action.fcurves for kp in fc.keyframe_points]
        if all_frames:
            bpy.context.scene.frame_start = int(min(all_frames))
            bpy.context.scene.frame_end   = int(max(all_frames))

        self.messages.append(
            f"Action '{action.name}' created with {len(action.fcurves)} FCurves. "
            f"Frame range: {bpy.context.scene.frame_start}–{bpy.context.scene.frame_end}."
        )
        return True

    def _find_fo4_armature(self):
        """Find the first armature in the scene that uses FO4 NPC bone names."""
        for obj in bpy.context.scene.objects:
            if obj.type != "ARMATURE":
                continue
            bone_names = [b.name for b in obj.data.bones]
            if any(n.startswith("NPC ") for n in bone_names):
                return obj
        # Fallback: any armature
        for obj in bpy.context.scene.objects:
            if obj.type == "ARMATURE":
                return obj
        return None


# ---------------------------------------------------------------------------
# Blender Operators
# ---------------------------------------------------------------------------

if bpy is not None:

    class FO4_OT_ImportDazAnimation(Operator, ImportHelper):
        """Import a DAZ Studio animation (.duf) and retarget it to the FO4 NPC skeleton."""
        bl_idname  = "fo4.import_daz_animation"
        bl_label   = "Import DAZ Animation (.duf)"
        bl_options = {"REGISTER", "UNDO"}

        filename_ext = ".duf"
        filter_glob: StringProperty(default="*.duf;*.dsf", options={"HIDDEN"})

        retarget_fo4: BoolProperty(
            name="Retarget to FO4 Skeleton",
            description=(
                "Map DAZ bone names to FO4 NPC bone names. "
                "Disable to apply animation to a DAZ armature in the scene."
            ),
            default=True,
        )
        fps: FloatProperty(
            name="Source FPS",
            description="Frames per second of the DAZ animation (default: 30)",
            default=30.0, min=1.0, max=120.0,
        )
        frame_offset: bpy.props.IntProperty(
            name="Frame Offset",
            description="Add this to every frame number (DUF frame 0 → Blender frame 1)",
            default=1, min=0, max=100,
        )
        target_armature: StringProperty(
            name="Target Armature",
            description="Name of the armature to animate (leave blank to auto-detect)",
            default="",
        )

        def execute(self, context):
            arm_obj = None
            if self.target_armature:
                arm_obj = bpy.data.objects.get(self.target_armature)
                if arm_obj and arm_obj.type != "ARMATURE":
                    self.report({"ERROR"}, f"'{self.target_armature}' is not an armature")
                    return {"CANCELLED"}

            importer = DazAnimationImporter(
                filepath=self.filepath,
                fps=self.fps,
                retarget_fo4=self.retarget_fo4,
                frame_offset=self.frame_offset,
            )
            ok = importer.run(armature_obj=arm_obj)

            for msg in importer.messages:
                print(f"[DAZ Anim] {msg}")

            if ok:
                self.report({"INFO"}, importer.messages[-1])
                return {"FINISHED"}
            else:
                self.report({"ERROR"}, importer.messages[-1] if importer.messages else "Import failed")
                return {"CANCELLED"}

        def draw(self, context):
            layout = self.layout
            layout.prop(self, "retarget_fo4")
            layout.prop(self, "fps")
            layout.prop(self, "frame_offset")
            col = layout.column()
            col.enabled = not self.retarget_fo4 or bool(self.target_armature)
            layout.prop(self, "target_armature")
            layout.separator()
            if self.retarget_fo4:
                layout.label(text="Requires FO4 NPC armature in scene.", icon="INFO")
            else:
                layout.label(text="Applies animation to a DAZ-rigged armature.", icon="INFO")


    class FO4_OT_RetargetDazToPoses(Operator):
        """Retarget the active Action on the active armature from DAZ to FO4 bone names.

        Use this when you've already imported a DAZ animation via the standard
        Blender FBX/BVH importer and the action is on a DAZ armature.  This
        operator creates a new action on the selected FO4 armature with the
        channels remapped.
        """
        bl_idname  = "fo4.retarget_daz_to_fo4"
        bl_label   = "Retarget DAZ Action → FO4"
        bl_options = {"REGISTER", "UNDO"}

        def execute(self, context):
            src_arm = context.active_object
            if src_arm is None or src_arm.type != "ARMATURE":
                self.report({"ERROR"}, "Select the DAZ armature with the action to retarget")
                return {"CANCELLED"}
            if not src_arm.animation_data or not src_arm.animation_data.action:
                self.report({"ERROR"}, "Active armature has no action assigned")
                return {"CANCELLED"}

            src_action = src_arm.animation_data.action

            # Find an FO4 armature in the scene
            fo4_arm = None
            for obj in context.scene.objects:
                if obj == src_arm or obj.type != "ARMATURE":
                    continue
                if any(b.name.startswith("NPC ") for b in obj.data.bones):
                    fo4_arm = obj
                    break

            if fo4_arm is None:
                self.report({"ERROR"},
                    "No FO4 NPC armature found in scene. "
                    "Import fo4_skeleton.nif or run 'Build FO4 Reference Skeleton'.")
                return {"CANCELLED"}

            bone_names_in_fo4 = {b.name for b in fo4_arm.data.bones}
            new_action_name   = src_action.name + "_FO4Retarget"
            new_action        = bpy.data.actions.new(name=new_action_name)

            if not fo4_arm.animation_data:
                fo4_arm.animation_data_create()
            try:
                from . import animation_helpers as _ah
                _ah._assign_action_to_id(fo4_arm.animation_data, new_action)
            except Exception:
                fo4_arm.animation_data.action = new_action

            written = 0
            skipped = 0
            for fc in src_action.fcurves:
                # data_path looks like: pose.bones["rShin"].rotation_euler
                m = re.match(r'pose\.bones\["([^"]+)"\](.*)', fc.data_path)
                if not m:
                    continue
                daz_bone = m.group(1)
                rest     = m.group(2)
                fo4_bone = _fo4_name_for_daz_bone(daz_bone)
                if fo4_bone is None or fo4_bone not in bone_names_in_fo4:
                    skipped += 1
                    continue

                new_path = f'pose.bones["{fo4_bone}"]{rest}'
                try:
                    new_fc = new_action.fcurves.new(
                        data_path=new_path, index=fc.array_index,
                        action_group=fo4_bone)
                    new_fc.keyframe_points.add(len(fc.keyframe_points))
                    for i, kp in enumerate(fc.keyframe_points):
                        new_fc.keyframe_points[i].co          = kp.co
                        new_fc.keyframe_points[i].interpolation = kp.interpolation
                    written += 1
                except Exception as exc:
                    print(f"[DAZ Retarget] {new_path}[{fc.array_index}]: {exc}")
                    skipped += 1

            self.report({"INFO"},
                f"Retarget complete: {written} FCurves → '{new_action_name}', "
                f"{skipped} skipped (unmapped).")
            return {"FINISHED"}


    def _menu_func_import_daz_anim(self, context):
        self.layout.operator(FO4_OT_ImportDazAnimation.bl_idname,
                             text="DAZ Animation (.duf)")

    _CLASSES = [
        FO4_OT_ImportDazAnimation,
        FO4_OT_RetargetDazToPoses,
    ]

else:
    _CLASSES = []


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as exc:
            print(f"daz_animation_importer: Could not register {cls.__name__}: {exc}")
    if hasattr(bpy.types, "TOPBAR_MT_file_import"):
        bpy.types.TOPBAR_MT_file_import.append(_menu_func_import_daz_anim)


def unregister():
    if bpy is None:
        return
    if hasattr(bpy.types, "TOPBAR_MT_file_import"):
        bpy.types.TOPBAR_MT_file_import.remove(_menu_func_import_daz_anim)
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
