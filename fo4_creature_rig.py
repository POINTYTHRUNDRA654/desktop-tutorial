"""
fo4_creature_rig.py
===================
Custom skeleton builder for Fallout 4 creature and flora rigs.

Presets
-------
CARNIVOROUS_PLANT — Venus Mantrap / carnivorous plant skeleton:
  Root
  └─ Stem                           main stalk, anchors to ground
     ├─ Stem_Mid                    mid-stalk flex (wind/sway)
     │  └─ Stem_Top                 top of stalk
     │     ├─ Leaf_L_01 … 03        left leaf fronds (wind sway)
     │     ├─ Leaf_R_01 … 03        right leaf fronds (wind sway)
     │     └─ Head                  trap head pivot
     │        ├─ Jaw_Upper          upper jaw / trap lobe
     │        │  └─ Jaw_Upper_Tip   tooth tip (for bite FX)
     │        └─ Jaw_Lower          lower jaw / trap lobe
     │           └─ Jaw_Lower_Tip   tooth tip
     └─ Root_Tendril_L/R            ground tendrils (optional)

  Havok physics:
    Stem / Stem_Mid / Stem_Top     → L_ANIMSTATIC, KEYFRAMED (wind-driven)
    Leaf_* bones                   → L_TREES (layer 35), KEYFRAMED
    Head                           → L_ANIMSTATIC, KEYFRAMED
    Jaw_Upper / Jaw_Lower          → L_ANIMSTATIC, KEYFRAMED (snapping jaws)
    Trigger volume (separate UCX_) → L_CLOUD_TRAP (layer 56), KEYFRAMED

  FO4 creature bone naming convention:
    Use plain bone names (no "NPC " prefix) for creatures/flora.
    The Creation Kit maps bone names via the creature's skeleton .hkx file.

GENERIC_FLORA — simple wind-swaying plant:
  Root → Stem → Branch_L/R × 3 → Leaf_* × N

GENERIC_CREATURE — four-legged creature base:
  Root → COM → Pelvis → Spine chain → Head + 4 legs

TENTACLE — articulated tentacle (e.g., Mirelurk appendage):
  Root → Seg_01 → Seg_02 → … → Seg_08 → Tip

Animation types for carnivorous plants:
  idle          — gentle sway, jaws slightly open
  idle_hungry   — more active sway, jaw fully open (waiting for prey)
  snap_attack   — fast jaw close, shake, then reset
  snap_reset    — jaw opens back to idle_hungry position
  death         — plant collapses / withers

Use fo4_animation_export.py to convert these animations to FO4 HKX format.
"""

from __future__ import annotations

import math
from typing import List, Tuple

try:
    import bpy
    from bpy.types import Operator
    from bpy.props import (
        StringProperty, BoolProperty, FloatProperty,
        EnumProperty, IntProperty,
    )
    from mathutils import Vector, Matrix
except ImportError:
    bpy      = None  # type: ignore[assignment]
    Operator = object  # type: ignore[assignment]

# FO4 Havok layer IDs (from animation_helper/havakphysics)
_L_STATIC       = 1
_L_ANIMSTATIC   = 2
_L_CLUTTER      = 6
_L_TREES        = 35
_L_CLOUD_TRAP   = 56   # trigger volumes / cloud traps

# Bone size constants (FO4 game units)
_STEM_LENGTH    = 60.0    # total stem height (~86 cm, typical Mantrap)
_JAW_LENGTH     = 15.0    # jaw bone length
_LEAF_LENGTH    = 20.0    # frond length
_TENDRIL_LEN    = 10.0


def _add_bone(arm, name: str, head: Vector, tail: Vector,
              parent_name: str = None) -> "bpy.types.EditBone":
    """Add a bone to armature in edit mode. Returns the EditBone."""
    b = arm.edit_bones.new(name)
    b.head = head
    b.tail = tail
    b.use_deform = True
    if parent_name:
        b.parent = arm.edit_bones[parent_name]
        b.use_connect = (b.parent.tail == b.head)
    return b


def _set_havok_props(obj, bone_name: str,
                     layer: int = _L_ANIMSTATIC,
                     motion: str = "KEYFRAMED",
                     mass: float = 0.0) -> None:
    """Write Havok custom properties to a pose bone."""
    try:
        pb = obj.pose.bones.get(bone_name)
        if pb:
            pb["fo4_collision_layer"]  = layer
            pb["fo4_motion_type"]      = motion
            pb["fo4_havok_mass"]       = mass
            pb["fo4_havok_friction"]   = 0.3
            pb["fo4_havok_restitution"] = 0.1
            pb["fo4_havok_quality"]    = "KEYFRAMED" if motion == "KEYFRAMED" else "FIXED"
    except Exception as e:
        print(f"[Creature Rig] Havok props error on {bone_name}: {e}")


def _add_bone_constraint(obj, bone_name: str,
                          constraint_type: str = 'LIMIT_ROTATION',
                          **kwargs) -> None:
    """Add a constraint to a pose bone."""
    try:
        pb = obj.pose.bones.get(bone_name)
        if not pb:
            return
        c = pb.constraints.new(constraint_type)
        for k, v in kwargs.items():
            setattr(c, k, v)
    except Exception as e:
        print(f"[Creature Rig] Constraint error on {bone_name}: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Skeleton builders
# ══════════════════════════════════════════════════════════════════════════════

def build_carnivorous_plant(
    name: str = "CarnivorousPlant",
    stem_height: float = _STEM_LENGTH,
    leaf_count: int = 3,
    include_tendrils: bool = True,
    location: Vector = None,
) -> "bpy.types.Object":
    """
    Build a carnivorous plant skeleton at the active cursor or given location.

    Parameters
    ----------
    name          : Armature object name.
    stem_height   : Total stem height in FO4 game units.
    leaf_count    : Number of leaf bones per side (2–4 recommended).
    include_tendrils : Whether to add ground tendril bones.
    location      : World location for the armature origin.

    Returns the new armature object.
    """
    loc = location or Vector((0, 0, 0))
    bpy.ops.object.armature_add(location=loc)
    obj = bpy.context.active_object
    obj.name = name
    arm = obj.data
    arm.name = name
    arm.display_type = 'STICK'

    bpy.ops.object.mode_set(mode='EDIT')

    # Segment heights
    mid_h  = stem_height * 0.45
    top_h  = stem_height * 0.75
    head_h = stem_height * 0.90

    # ── Root ─────────────────────────────────────────────────────────────────
    root = arm.edit_bones[0]
    root.name = "Root"
    root.head  = Vector((0, 0, 0))
    root.tail  = Vector((0, 0, 2))

    # ── Stem chain ────────────────────────────────────────────────────────────
    _add_bone(arm, "Stem",
              Vector((0, 0, 0)), Vector((0, 0, mid_h)),
              parent_name="Root")

    _add_bone(arm, "Stem_Mid",
              Vector((0, 0, mid_h)), Vector((0, 0, top_h)),
              parent_name="Stem")

    _add_bone(arm, "Stem_Top",
              Vector((0, 0, top_h)), Vector((0, 0, head_h)),
              parent_name="Stem_Mid")

    # ── Head / trap pivot ────────────────────────────────────────────────────
    _add_bone(arm, "Head",
              Vector((0, 0, head_h)), Vector((0, _JAW_LENGTH * 0.3, head_h)),
              parent_name="Stem_Top")

    # ── Upper jaw ─────────────────────────────────────────────────────────────
    _add_bone(arm, "Jaw_Upper",
              Vector((0, 0, head_h)), Vector((0, _JAW_LENGTH, head_h + 3)),
              parent_name="Head")

    _add_bone(arm, "Jaw_Upper_Tip",
              Vector((0, _JAW_LENGTH, head_h + 3)),
              Vector((0, _JAW_LENGTH + 4, head_h + 4)),
              parent_name="Jaw_Upper")

    # ── Lower jaw ─────────────────────────────────────────────────────────────
    _add_bone(arm, "Jaw_Lower",
              Vector((0, 0, head_h)), Vector((0, _JAW_LENGTH, head_h - 3)),
              parent_name="Head")

    _add_bone(arm, "Jaw_Lower_Tip",
              Vector((0, _JAW_LENGTH, head_h - 3)),
              Vector((0, _JAW_LENGTH + 4, head_h - 4)),
              parent_name="Jaw_Lower")

    # ── Leaf fronds ───────────────────────────────────────────────────────────
    leaf_count = max(1, min(leaf_count, 6))
    for i in range(leaf_count):
        angle   = math.radians(30 + i * (100 / max(leaf_count - 1, 1)))
        spread  = _LEAF_LENGTH * math.sin(angle)
        rise    = _LEAF_LENGTH * math.cos(angle) * 0.5
        z_base  = top_h + i * 1.5

        for side, sign in (("L", 1.0), ("R", -1.0)):
            bname = f"Leaf_{side}_{i+1:02d}"
            _add_bone(arm, bname,
                      Vector((0, 0, z_base)),
                      Vector((sign * spread, spread * 0.3, z_base + rise)),
                      parent_name="Stem_Top")

    # ── Ground tendrils (optional) ────────────────────────────────────────────
    if include_tendrils:
        for side, sign in (("L", 1.0), ("R", -1.0)):
            _add_bone(arm, f"Tendril_{side}",
                      Vector((0, 0, 0)),
                      Vector((sign * _TENDRIL_LEN, _TENDRIL_LEN * 0.5, -2)),
                      parent_name="Root")

    bpy.ops.object.mode_set(mode='OBJECT')

    # ── Havok physics properties ──────────────────────────────────────────────
    # Stem bones — keyframed animation (wind driven)
    for bname in ("Stem", "Stem_Mid", "Stem_Top"):
        _set_havok_props(obj, bname, layer=_L_ANIMSTATIC, motion="KEYFRAMED")

    # Head / jaw — keyframed, mass 0 (snap driven by animation/script)
    for bname in ("Head", "Jaw_Upper", "Jaw_Upper_Tip",
                  "Jaw_Lower", "Jaw_Lower_Tip"):
        _set_havok_props(obj, bname, layer=_L_ANIMSTATIC, motion="KEYFRAMED")

    # Leaf bones — trees layer (35) for correct wind shader interaction
    for pb in obj.pose.bones:
        if pb.name.startswith("Leaf_"):
            _set_havok_props(obj, pb.name, layer=_L_TREES, motion="KEYFRAMED")
        if pb.name.startswith("Tendril_"):
            _set_havok_props(obj, pb.name, layer=_L_ANIMSTATIC, motion="KEYFRAMED")

    # ── Jaw rotation limits (realistic snap range) ────────────────────────────
    # Upper jaw opens upward max 45°, closes fully at 0°
    _add_bone_constraint(obj, "Jaw_Upper", 'LIMIT_ROTATION',
                         use_limit_x=True,
                         min_x=math.radians(-5),
                         max_x=math.radians(45),
                         owner_space='LOCAL')
    # Lower jaw opens downward max 45°
    _add_bone_constraint(obj, "Jaw_Lower", 'LIMIT_ROTATION',
                         use_limit_x=True,
                         min_x=math.radians(-45),
                         max_x=math.radians(5),
                         owner_space='LOCAL')

    # ── Custom properties for CK / export identification ─────────────────────
    obj["fo4_skeleton_type"]    = "CARNIVOROUS_PLANT"
    obj["fo4_stem_height"]      = stem_height
    obj["fo4_leaf_count"]       = leaf_count
    obj["fo4_snap_bone_upper"]  = "Jaw_Upper"
    obj["fo4_snap_bone_lower"]  = "Jaw_Lower"
    obj["fo4_trigger_layer"]    = _L_CLOUD_TRAP

    arm.display_type = 'STICK'
    print(f"[Creature Rig] Carnivorous plant skeleton '{name}' created "
          f"({len(obj.pose.bones)} bones)")
    return obj


def build_generic_flora(
    name: str = "FloraRig",
    height: float = 40.0,
    branch_count: int = 3,
) -> "bpy.types.Object":
    """
    Simple swaying plant skeleton — stem + branches + leaves.
    Good for grass, ferns, shrubs, non-carnivorous plants.
    """
    bpy.ops.object.armature_add(location=Vector((0, 0, 0)))
    obj = bpy.context.active_object
    obj.name = name
    arm = obj.data
    arm.name = name

    bpy.ops.object.mode_set(mode='EDIT')

    root = arm.edit_bones[0]
    root.name = "Root"
    root.head = Vector((0, 0, 0))
    root.tail = Vector((0, 0, 2))

    _add_bone(arm, "Stem",
              Vector((0, 0, 0)), Vector((0, 0, height * 0.5)), "Root")
    _add_bone(arm, "Stem_Top",
              Vector((0, 0, height * 0.5)), Vector((0, 0, height)), "Stem")

    for i in range(branch_count):
        angle  = math.radians(i * (360 / branch_count))
        bx     = math.cos(angle) * height * 0.3
        by     = math.sin(angle) * height * 0.3
        z_base = height * (0.4 + i * 0.15)
        for side, sx, sy in (("A", bx, by), ("B", -bx, -by)):
            bname = f"Branch_{i+1:02d}_{side}"
            _add_bone(arm, bname,
                      Vector((0, 0, z_base)),
                      Vector((sx, sy, z_base + height * 0.2)),
                      "Stem_Top")
            _add_bone(arm, f"Leaf_{bname}",
                      Vector((sx, sy, z_base + height * 0.2)),
                      Vector((sx * 1.5, sy * 1.5, z_base + height * 0.35)),
                      bname)

    bpy.ops.object.mode_set(mode='OBJECT')

    for pb in obj.pose.bones:
        layer = _L_TREES if "Leaf" in pb.name or "Branch" in pb.name else _L_ANIMSTATIC
        _set_havok_props(obj, pb.name, layer=layer, motion="KEYFRAMED")

    obj["fo4_skeleton_type"] = "GENERIC_FLORA"
    return obj


def build_tentacle(
    name: str = "TentacleRig",
    segments: int = 8,
    seg_length: float = 8.0,
) -> "bpy.types.Object":
    """
    Articulated tentacle skeleton — useful for Mirelurk appendages,
    plant tentacles, alien creature limbs.
    """
    bpy.ops.object.armature_add(location=Vector((0, 0, 0)))
    obj = bpy.context.active_object
    obj.name = name
    arm = obj.data
    arm.name = name

    bpy.ops.object.mode_set(mode='EDIT')

    root = arm.edit_bones[0]
    root.name = "Root"
    root.head = Vector((0, 0, 0))
    root.tail = Vector((0, 0, 2))

    prev = "Root"
    for i in range(segments):
        bname = f"Seg_{i+1:02d}" if i < segments - 1 else "Tip"
        z = i * seg_length
        _add_bone(arm, bname,
                  Vector((0, 0, z)), Vector((0, 0, z + seg_length)),
                  prev)
        prev = bname

    bpy.ops.object.mode_set(mode='OBJECT')

    for pb in obj.pose.bones:
        _set_havok_props(obj, pb.name, layer=_L_ANIMSTATIC, motion="KEYFRAMED")
        _add_bone_constraint(obj, pb.name, 'LIMIT_ROTATION',
                             use_limit_x=True,
                             min_x=math.radians(-45),
                             max_x=math.radians(45),
                             use_limit_z=True,
                             min_z=math.radians(-45),
                             max_z=math.radians(45),
                             owner_space='LOCAL')

    obj["fo4_skeleton_type"] = "TENTACLE"
    obj["fo4_segment_count"] = segments
    return obj


def build_quadruped(
    name: str = "QuadrupedRig",
    body_length: float = 80.0,
    leg_height: float = 40.0,
) -> "bpy.types.Object":
    """
    Generic four-legged creature skeleton — good as a base for dogs,
    Radscorpions, Deathclaws, custom beasts.
    """
    bpy.ops.object.armature_add(location=Vector((0, 0, 0)))
    obj = bpy.context.active_object
    obj.name = name
    arm = obj.data
    arm.name = name

    bpy.ops.object.mode_set(mode='EDIT')
    h = leg_height
    bl = body_length

    root = arm.edit_bones[0]
    root.name = "Root"
    root.head = Vector((0, 0, 0))
    root.tail = Vector((0, 0, 2))

    _add_bone(arm, "COM",     Vector((0, 0, h)),    Vector((0, 0, h+2)),     "Root")
    _add_bone(arm, "Pelvis",  Vector((bl*.5, 0, h)), Vector((bl*.5, 0, h+5)), "COM")
    _add_bone(arm, "Spine",   Vector((bl*.5, 0, h+5)), Vector((0, 0, h+8)),  "Pelvis")
    _add_bone(arm, "Spine1",  Vector((0, 0, h+8)),  Vector((-bl*.4, 0, h+10)), "Spine")
    _add_bone(arm, "Chest",   Vector((-bl*.4, 0, h+10)), Vector((-bl*.5, 0, h+12)), "Spine1")
    _add_bone(arm, "Neck",    Vector((-bl*.5, 0, h+12)), Vector((-bl*.6, 0, h+18)), "Chest")
    _add_bone(arm, "Head",    Vector((-bl*.6, 0, h+18)), Vector((-bl*.7, 0, h+25)), "Neck")

    for side, sx in (("L", 1.0), ("R", -1.0)):
        # Front legs
        fl_hip = Vector((-bl*.4, sx*8, h))
        fl_knee = fl_hip + Vector((0, sx*2, -h*.45))
        fl_foot = fl_knee + Vector((0, sx*1, -h*.5))
        _add_bone(arm, f"FrontLeg_{side}_Upper", fl_hip,   fl_knee, "Chest")
        _add_bone(arm, f"FrontLeg_{side}_Lower", fl_knee,  fl_foot, f"FrontLeg_{side}_Upper")
        _add_bone(arm, f"FrontFoot_{side}",      fl_foot,  fl_foot + Vector((0, sx*3, -2)), f"FrontLeg_{side}_Lower")

        # Hind legs
        hl_hip = Vector((bl*.4, sx*8, h))
        hl_knee = hl_hip + Vector((0, sx*2, -h*.45))
        hl_foot = hl_knee + Vector((0, sx*1, -h*.5))
        _add_bone(arm, f"HindLeg_{side}_Upper", hl_hip,   hl_knee, "Pelvis")
        _add_bone(arm, f"HindLeg_{side}_Lower", hl_knee,  hl_foot, f"HindLeg_{side}_Upper")
        _add_bone(arm, f"HindFoot_{side}",      hl_foot,  hl_foot + Vector((0, sx*3, -2)), f"HindLeg_{side}_Lower")

    _add_bone(arm, "Tail_01", Vector((bl*.6, 0, h+5)), Vector((bl*.8, 0, h+3)), "Pelvis")
    _add_bone(arm, "Tail_02", Vector((bl*.8, 0, h+3)), Vector((bl*.95, 0, h+1)), "Tail_01")
    _add_bone(arm, "Tail_Tip", Vector((bl*.95, 0, h+1)), Vector((bl*1.1, 0, h-1)), "Tail_02")

    bpy.ops.object.mode_set(mode='OBJECT')

    for pb in obj.pose.bones:
        _set_havok_props(obj, pb.name, layer=_L_ANIMSTATIC, motion="KEYFRAMED")

    obj["fo4_skeleton_type"] = "QUADRUPED"
    return obj


# ══════════════════════════════════════════════════════════════════════════════
# Operators
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_BuildCarnivorousPlantRig(Operator):
    """
    Create a complete carnivorous plant skeleton for Fallout 4.

    Includes:
      • Stem chain with mid / top flex bones (wind sway)
      • Left + right leaf fronds (Trees layer, wind shader compatible)
      • Snap trap: Jaw_Upper / Jaw_Lower with rotation limits
      • Ground tendrils (optional)
      • Havok physics properties on every bone
      • Rotation constraints matching realistic plant movement

    After building: animate in Blender, then use
    'Export Creature Animation → FO4 HKX' to produce the .hkx file.
    """
    bl_idname  = "fo4.build_carnivorous_plant_rig"
    bl_label   = "Create Carnivorous Plant Skeleton"
    bl_description = (
        "Build a full Fallout 4 carnivorous plant skeleton — stem, leaves, "
        "snap jaws with Havok physics. Animate then export as HKX."
    )
    bl_options = {'REGISTER', 'UNDO'}

    name: StringProperty(name="Skeleton Name", default="CarnivorousPlant")
    stem_height: FloatProperty(
        name="Stem Height (FO4 units)",
        description="Total plant height. FO4 units: vanilla Mantrap ≈ 60.",
        default=60.0, min=10.0, max=300.0,
    )
    leaf_count: IntProperty(
        name="Leaf Bones per Side",
        description="Number of leaf frond bones on each side (2–6)",
        default=3, min=1, max=6,
    )
    include_tendrils: BoolProperty(
        name="Include Ground Tendrils",
        description="Add tendril bones at the base for ground-grasping animation",
        default=True,
    )

    def execute(self, context):
        loc = context.scene.cursor.location.copy()
        obj = build_carnivorous_plant(
            name=self.name,
            stem_height=self.stem_height,
            leaf_count=self.leaf_count,
            include_tendrils=self.include_tendrils,
            location=loc,
        )
        self.report({'INFO'},
            f"✓ Carnivorous plant skeleton '{obj.name}' created "
            f"({len(obj.pose.bones)} bones). "
            "Next: weight paint your mesh, then animate snap/idle sequences.")
        return {'FINISHED'}


class FO4_OT_BuildFloraRig(Operator):
    """Create a simple swaying flora skeleton (shrub / fern / grass).

    WARNING — FOR AUTHORING / PREVIEW ONLY.
    Standard FO4 foliage (grass, ferns, shrubs, non-carnivorous plants) does
    NOT use a skeleton or HKX animation.  The game reads the 'Wind' vertex
    group weight to drive procedural in-engine sway — no armature is needed or
    exported.  This rig is intended for visual reference and weight-painting
    preview inside Blender.  You MUST remove this armature and run
    'Apply Vegetation Wind' (fo4.apply_vegetation_wind) before NIF export so
    the mesh is classified correctly as VEGETATION rather than CREATURE.
    Only carnivorous / interactive plants need a real creature rig — use
    'Create Carnivorous Plant Skeleton' for those.
    """
    bl_idname  = "fo4.build_flora_rig"
    bl_label   = "Create Flora Skeleton (Preview Only)"
    bl_description = (
        "Preview armature for weight painting. "
        "Remove before NIF export — FO4 wind vegetation uses vertex groups, not skeletons."
    )
    bl_options = {'REGISTER', 'UNDO'}

    name: StringProperty(name="Name", default="FloraRig")
    height: FloatProperty(name="Height (FO4 units)", default=40.0, min=5.0, max=200.0)
    branch_count: IntProperty(name="Branch Count", default=3, min=1, max=8)

    def execute(self, context):
        obj = build_generic_flora(self.name, self.height, self.branch_count)
        self.report(
            {'WARNING'},
            f"Flora skeleton '{obj.name}' created for PREVIEW only. "
            "Remove armature and use 'Apply Vegetation Wind' before NIF export.",
        )
        return {'FINISHED'}


class FO4_OT_BuildTentacleRig(Operator):
    """Create an articulated tentacle skeleton."""
    bl_idname  = "fo4.build_tentacle_rig"
    bl_label   = "Create Tentacle Skeleton"
    bl_description = "Build a multi-segment articulated tentacle skeleton with rotation limits."
    bl_options = {'REGISTER', 'UNDO'}

    name: StringProperty(name="Name", default="TentacleRig")
    segments: IntProperty(name="Segments", default=8, min=3, max=20)
    seg_length: FloatProperty(name="Segment Length (FO4 units)", default=8.0, min=2.0)

    def execute(self, context):
        obj = build_tentacle(self.name, self.segments, self.seg_length)
        self.report({'INFO'}, f"✓ Tentacle skeleton '{obj.name}' created ({self.segments+1} bones).")
        return {'FINISHED'}


class FO4_OT_BuildQuadrupedRig(Operator):
    """Create a generic four-legged creature skeleton."""
    bl_idname  = "fo4.build_quadruped_rig"
    bl_label   = "Create Quadruped Skeleton"
    bl_description = "Build a four-legged creature base skeleton (dog, Deathclaw, custom beast)."
    bl_options = {'REGISTER', 'UNDO'}

    name: StringProperty(name="Name", default="QuadrupedRig")
    body_length: FloatProperty(name="Body Length (FO4 units)", default=80.0, min=20.0)
    leg_height: FloatProperty(name="Leg Height (FO4 units)", default=40.0, min=10.0)

    def execute(self, context):
        obj = build_quadruped(self.name, self.body_length, self.leg_height)
        self.report({'INFO'}, f"✓ Quadruped skeleton '{obj.name}' created ({len(obj.pose.bones)} bones).")
        return {'FINISHED'}


class FO4_OT_SetupSnapAnimation(Operator):
    """
    Create the three keyframe sequences needed for a carnivorous plant:
      Frame   0–30:  Idle (gentle sway, jaws open ~30°)
      Frame  60–90:  Snap attack (jaws close fast, shake, open)
      Frame 120–150: Idle hungry (jaws fully open, more active sway)

    Requires an armature with Jaw_Upper and Jaw_Lower bones.
    """
    bl_idname  = "fo4.setup_snap_animation"
    bl_label   = "Setup Snap Animation Keyframes"
    bl_description = (
        "Auto-keyframe idle, snap-attack, and hungry sequences for a "
        "carnivorous plant armature. Works with the FO4 Carnivorous Plant skeleton."
    )
    bl_options = {'REGISTER', 'UNDO'}

    sway_amount: FloatProperty(
        name="Sway Amount (degrees)",
        description="Maximum stem sway angle for idle animation",
        default=5.0, min=0.5, max=30.0,
    )
    snap_speed: IntProperty(
        name="Snap Frames",
        description="How many frames the snap takes (less = faster/scarier)",
        default=6, min=2, max=15,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'ARMATURE':
            self.report({'ERROR'}, "Select the plant armature first.")
            return {'CANCELLED'}

        has_jaws = ("Jaw_Upper" in obj.pose.bones and
                    "Jaw_Lower" in obj.pose.bones)
        has_stem = "Stem" in obj.pose.bones

        if not has_jaws and not has_stem:
            self.report({'ERROR'},
                "Armature must have Jaw_Upper/Jaw_Lower and/or Stem bones. "
                "Use 'Create Carnivorous Plant Skeleton' first.")
            return {'CANCELLED'}

        context.view_layer.objects.active = obj
        obj.select_set(True)

        sway_rad  = math.radians(self.sway_amount)
        jaw_open  = math.radians(35.0)
        jaw_closed = math.radians(2.0)

        def _key_bone(bone_name: str, frame: int, rot_x: float = 0.0,
                      rot_z: float = 0.0) -> None:
            pb = obj.pose.bones.get(bone_name)
            if not pb:
                return
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler.x = rot_x
            pb.rotation_euler.z = rot_z
            pb.keyframe_insert("rotation_euler", frame=frame)

        # ── IDLE (frames 0–30, gentle sway) ───────────────────────────────────
        if has_stem:
            for f, sx, sz in [
                (0,   0,           0),
                (8,   sway_rad*.5, sway_rad*.3),
                (15,  sway_rad,    sway_rad*.5),
                (22, -sway_rad*.5, -sway_rad*.3),
                (30,  0,           0),
            ]:
                _key_bone("Stem",     f, sx, sz)
                _key_bone("Stem_Mid", f, sx*.6, sz*.6)
                _key_bone("Stem_Top", f, sx*.3, sz*.3)

        if has_jaws:
            # Idle: jaws open ~35°
            for f in (0, 30):
                _key_bone("Jaw_Upper", f,  jaw_open)
                _key_bone("Jaw_Lower", f, -jaw_open)

        # ── SNAP ATTACK (frames 60–90) ────────────────────────────────────────
        if has_jaws:
            sf = 60
            _key_bone("Jaw_Upper", sf,       jaw_open)    # open
            _key_bone("Jaw_Lower", sf,      -jaw_open)
            _key_bone("Jaw_Upper", sf + self.snap_speed,  jaw_closed)   # SNAP
            _key_bone("Jaw_Lower", sf + self.snap_speed, -jaw_closed)
            # Hold closed briefly, then reopen
            _key_bone("Jaw_Upper", sf + self.snap_speed + 8,  jaw_closed)
            _key_bone("Jaw_Lower", sf + self.snap_speed + 8, -jaw_closed)
            _key_bone("Jaw_Upper", sf + 30, jaw_open)     # reopen
            _key_bone("Jaw_Lower", sf + 30, -jaw_open)

        if has_stem:
            # Shake on snap
            for f, sx in [(60, 0), (62, sway_rad*2), (64, -sway_rad*2),
                          (66, sway_rad*1.5), (68, -sway_rad), (70, 0)]:
                _key_bone("Stem_Top", f, 0, sx)

        # ── IDLE HUNGRY (frames 120–150, more active, jaws wide open) ─────────
        if has_stem:
            hungry_sway = sway_rad * 1.5
            for f, sx, sz in [
                (120, 0,              0),
                (128, hungry_sway*.7, hungry_sway*.4),
                (135, hungry_sway,    hungry_sway*.6),
                (142, -hungry_sway*.7, -hungry_sway*.4),
                (150, 0,              0),
            ]:
                _key_bone("Stem",     f, sx, sz)
                _key_bone("Stem_Mid", f, sx*.7, sz*.7)
                _key_bone("Stem_Top", f, sx*.4, sz*.4)

        if has_jaws:
            jaw_hungry = math.radians(45.0)
            for f in (120, 150):
                _key_bone("Jaw_Upper", f,  jaw_hungry)
                _key_bone("Jaw_Lower", f, -jaw_hungry)

        self.report({'INFO'},
            "✓ Snap animation keyframes created:\n"
            "  Frames 0–30:   Idle (gentle sway)\n"
            "  Frames 60–90:  Snap attack\n"
            "  Frames 120–150: Idle hungry (jaws wide)\n"
            "Use 'Export Creature Animation → FO4 HKX' to convert for game use.")
        return {'FINISHED'}


# ── Registration ───────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_BuildCarnivorousPlantRig,
    FO4_OT_BuildFloraRig,
    FO4_OT_BuildTentacleRig,
    FO4_OT_BuildQuadrupedRig,
    FO4_OT_SetupSnapAnimation,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[Creature Rig] Could not register {cls.__name__}: {e}")
    print("[Creature Rig] Creature/flora rig builders registered.")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
