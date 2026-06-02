"""
fo4_weapon_animation.py
=======================
Automatic weapon rigging and animation for Fallout 4.

Pipeline
--------
1. Weapon Type Detection
   Analyzes mesh shape/name to classify:
   PISTOL | RIFLE | SHOTGUN | LAUNCHER | MELEE_BLADE | MELEE_BLUNT | THROWN

2. Standard Weapon Bone Setup
   Places the FO4 standard weapon bone hierarchy:
     Weapon (root)
       └─ Grip        ← hand attachment point
       └─ Trigger      ← trigger pull animation
       └─ Barrel       ← barrel/recoil movement
       └─ Muzzle       ← muzzle flash / suppressor attach
       └─ Magazine     ← reload drop/insert
       └─ Bolt         ← cycling animation (rifle/pistol)
       └─ Hammer       ← hammer cock (pistols)
       └─ Scope        ← scope/optic attachment

3. Animation Generation
   Generates keyframe actions matching weapon type:
     FIRE_PISTOL    — quick snap recoil, slide cycles back
     FIRE_RIFLE     — push-back recoil with muzzle rise
     RELOAD         — mag drop, insert, chamber
     MELEE_SWING    — horizontal arc swing
     MELEE_POWER    — charged wind-up + heavy swing
     EQUIP          — weapon rises into view from holster
     UNEQUIP        — weapon lowers back to holster
     INSPECT        — player inspects weapon (idle look)
     THROWN         — wind-up, release, arc

4. Preset System
   Quick-pick buttons + keyword guide for new users.
"""

import bpy
import bmesh
import math
import mathutils
import os
import subprocess
from typing import List, Optional


# ---------------------------------------------------------------------------
# Weapon bone hierarchy
# ---------------------------------------------------------------------------

# Standard FO4 weapon bone layout with approximate positions
# (relative to weapon root, in Blender units at FO4 scale)
WEAPON_BONE_LAYOUT = {
    "Weapon":   {"head": (0,0,0),      "tail": (0,0,0.05), "parent": None},
    "Grip":     {"head": (0,0,0),      "tail": (0,-0.05,0), "parent": "Weapon"},
    "Trigger":  {"head": (0.02,-0.02,0),"tail":(0.02,-0.04,0),"parent":"Grip"},
    "Barrel":   {"head": (0,0.1,0),    "tail": (0,0.3,0),  "parent": "Weapon"},
    "Muzzle":   {"head": (0,0.3,0),    "tail": (0,0.35,0), "parent": "Barrel"},
    "Magazine": {"head": (0,-0.05,-0.05),"tail":(0,-0.05,-0.12),"parent":"Weapon"},
    "Bolt":     {"head": (0,0.05,0.02),"tail": (0,0.1,0.02), "parent": "Weapon"},
    "Hammer":   {"head": (0,-0.02,0.02),"tail":(0,-0.02,0.04),"parent":"Weapon"},
    "Scope":    {"head": (0,0.1,0.05), "tail": (0,0.15,0.05),"parent":"Weapon"},
}

# Which bones each weapon type actually uses
WEAPON_BONE_SETS = {
    "PISTOL":      ["Weapon","Grip","Trigger","Barrel","Muzzle","Magazine","Bolt","Hammer"],
    "RIFLE":       ["Weapon","Grip","Trigger","Barrel","Muzzle","Magazine","Bolt","Scope"],
    "SHOTGUN":     ["Weapon","Grip","Trigger","Barrel","Muzzle","Magazine","Bolt"],
    "LAUNCHER":    ["Weapon","Grip","Trigger","Barrel","Muzzle","Magazine"],
    "MELEE_BLADE": ["Weapon","Grip"],
    "MELEE_BLUNT": ["Weapon","Grip"],
    "THROWN":      ["Weapon","Grip"],
}

# Weapon type metadata
WEAPON_TYPE_CONFIG = {
    "PISTOL": {
        "label":       "Pistol / Handgun",
        "hand":        "right",
        "two_handed":  False,
        "has_reload":  True,
        "anims":       ["EQUIP","FIRE_PISTOL","RELOAD","UNEQUIP","INSPECT"],
    },
    "RIFLE": {
        "label":       "Rifle / Assault Rifle",
        "hand":        "both",
        "two_handed":  True,
        "has_reload":  True,
        "anims":       ["EQUIP","FIRE_RIFLE","RELOAD","UNEQUIP","INSPECT"],
    },
    "SHOTGUN": {
        "label":       "Shotgun",
        "hand":        "both",
        "two_handed":  True,
        "has_reload":  True,
        "anims":       ["EQUIP","FIRE_RIFLE","RELOAD","UNEQUIP"],
    },
    "LAUNCHER": {
        "label":       "Rocket / Grenade Launcher",
        "hand":        "both",
        "two_handed":  True,
        "has_reload":  True,
        "anims":       ["EQUIP","FIRE_RIFLE","RELOAD","UNEQUIP"],
    },
    "MELEE_BLADE": {
        "label":       "Blade / Knife / Sword",
        "hand":        "right",
        "two_handed":  False,
        "has_reload":  False,
        "anims":       ["EQUIP","MELEE_SWING","MELEE_POWER","UNEQUIP"],
    },
    "MELEE_BLUNT": {
        "label":       "Blunt / Bat / Pipe",
        "hand":        "right",
        "two_handed":  False,
        "has_reload":  False,
        "anims":       ["EQUIP","MELEE_SWING","MELEE_POWER","UNEQUIP"],
    },
    "THROWN": {
        "label":       "Thrown Weapon / Grenade",
        "hand":        "right",
        "two_handed":  False,
        "has_reload":  False,
        "anims":       ["EQUIP","THROWN","UNEQUIP"],
    },
}


# ---------------------------------------------------------------------------
# Weapon type detection
# ---------------------------------------------------------------------------

WEAPON_KEYWORDS = {
    "pistol":     "PISTOL",  "handgun": "PISTOL",  "9mm": "PISTOL",
    "revolver":   "PISTOL",  "10mm":    "PISTOL",  "pipe pistol": "PISTOL",
    "laser pistol":"PISTOL", "plasma pistol":"PISTOL",
    "rifle":      "RIFLE",   "assault": "RIFLE",   "combat rifle": "RIFLE",
    "sniper":     "RIFLE",   "hunting": "RIFLE",   "laser rifle": "RIFLE",
    "plasma rifle":"RIFLE",  "submachine":"PISTOL", "smg":"PISTOL",
    "shotgun":    "SHOTGUN", "double barrel":"SHOTGUN",
    "launcher":   "LAUNCHER","rocket":  "LAUNCHER","grenade launcher":"LAUNCHER",
    "minigun":    "RIFLE",   "gatling": "RIFLE",
    "knife":      "MELEE_BLADE", "blade": "MELEE_BLADE", "sword":"MELEE_BLADE",
    "machete":    "MELEE_BLADE", "shiv":  "MELEE_BLADE", "cleaver":"MELEE_BLADE",
    "bat":        "MELEE_BLUNT", "pipe":  "MELEE_BLUNT", "wrench":"MELEE_BLUNT",
    "hammer":     "MELEE_BLUNT", "club":  "MELEE_BLUNT", "baton":"MELEE_BLUNT",
    "lead pipe":  "MELEE_BLUNT", "pool cue":"MELEE_BLUNT",
    "grenade":    "THROWN",  "molotov":"THROWN",  "mine":"THROWN",
    "throwing":   "THROWN",  "thrown": "THROWN",
}


def detect_weapon_type(obj) -> str:
    """Classify a weapon mesh using name keywords then geometry."""
    name = obj.name.lower()

    # Multi-word checks first
    for phrase in ["pipe pistol","laser pistol","plasma pistol","laser rifle",
                   "plasma rifle","combat rifle","hunting rifle","double barrel",
                   "grenade launcher","rocket launcher","lead pipe","pool cue"]:
        if phrase in name:
            return WEAPON_KEYWORDS[phrase]

    # Single keywords
    for kw, wtype in WEAPON_KEYWORDS.items():
        if kw in name:
            return wtype

    # Geometry fallback: aspect ratio
    me = obj.data
    mw = obj.matrix_world
    vs = [mw @ v.co for v in me.vertices]
    if not vs:
        return "PISTOL"

    xs=[v.x for v in vs]; ys=[v.y for v in vs]; zs=[v.z for v in vs]
    w = max(xs)-min(xs); d = max(ys)-min(ys); h = max(zs)-min(zs)
    longest = max(w, d, h)

    # Long thin mesh → rifle; short compact → pistol; very thin flat → blade
    if longest == h and h > w * 3 and h > d * 3:
        return "MELEE_BLADE"   # thin vertical = blade
    if longest > 0.5 and longest == d or d > w * 2:
        return "RIFLE"         # long along Y = rifle
    return "PISTOL"            # default compact


def parse_weapon_description(description: str) -> str:
    """Map a text description to a weapon type key."""
    d = description.lower()
    for phrase in ["pipe pistol","laser pistol","plasma pistol","laser rifle",
                   "plasma rifle","combat rifle","hunting rifle","double barrel",
                   "grenade launcher","rocket launcher","lead pipe","pool cue",
                   "melee blade","melee blunt"]:
        if phrase in d:
            return WEAPON_KEYWORDS.get(phrase, "PISTOL")
    for kw, wtype in WEAPON_KEYWORDS.items():
        if kw in d:
            return wtype
    # Also try Mossy
    try:
        from . import mossy_link
        prompt = (
            f"A Fallout 4 weapon mod needs classification. "
            f"The user describes: '{description}'\n\n"
            f"Reply with ONLY one of: PISTOL, RIFLE, SHOTGUN, LAUNCHER, "
            f"MELEE_BLADE, MELEE_BLUNT, THROWN"
        )
        response = mossy_link.ask_mossy(prompt, fo4_context=True, max_tokens=10)
        if response:
            r = response.strip().upper()
            if r in WEAPON_TYPE_CONFIG:
                return r
    except Exception:
        pass
    return "PISTOL"


# ---------------------------------------------------------------------------
# Bone placement
# ---------------------------------------------------------------------------

def build_weapon_rig(weapon_obj, weapon_type: str) -> Optional[bpy.types.Object]:
    """Place standard FO4 weapon bones scaled to the mesh bounding box."""
    me = weapon_obj.data
    mw = weapon_obj.matrix_world
    vs = [mw @ v.co for v in me.vertices]
    if not vs:
        return None

    xs=[v.x for v in vs]; ys=[v.y for v in vs]; zs=[v.z for v in vs]
    cx=(max(xs)+min(xs))/2; cy=(max(ys)+min(ys))/2; cz=(max(zs)+min(zs))/2
    w=max(xs)-min(xs); d=max(ys)-min(ys); h=max(zs)-min(zs)
    scale = max(d, w, h, 0.1)   # normalise bone lengths to weapon size

    arm_data = bpy.data.armatures.new(weapon_obj.name + "_weapon_rig")
    arm_obj  = bpy.data.objects.new(weapon_obj.name + "_weapon_rig", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)

    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones

    bone_set = WEAPON_BONE_SETS.get(weapon_type, ["Weapon","Grip"])
    origin   = mathutils.Vector((cx, cy, cz))

    def _v(rel):
        return origin + mathutils.Vector(rel) * scale

    for bname in bone_set:
        layout = WEAPON_BONE_LAYOUT.get(bname)
        if not layout:
            continue
        b      = eb.new(bname)
        b.head = _v(layout["head"])
        b.tail = _v(layout["tail"])
        if layout["parent"] and layout["parent"] in eb:
            b.parent = eb[layout["parent"]]
            if (b.head - eb[layout["parent"]].tail).length < 0.001:
                b.use_connect = True

    bpy.ops.object.mode_set(mode='OBJECT')

    # Parent weapon mesh to rig
    bpy.ops.object.select_all(action='DESELECT')
    weapon_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Store weapon type as custom property
    weapon_obj["fo4_weapon_type"] = weapon_type
    arm_obj["fo4_weapon_type"]    = weapon_type

    config = WEAPON_TYPE_CONFIG[weapon_type]
    weapon_obj["fo4_two_handed"]  = config["two_handed"]

    print(f"[FO4 Weapon] Rig built: {len(arm_data.bones)} bones for {weapon_type}")
    return arm_obj


# ---------------------------------------------------------------------------
# Animation generators
# ---------------------------------------------------------------------------

def _rot_key(pb, frame, x=0, y=0, z=0):
    pb.rotation_mode  = 'XYZ'
    pb.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
    pb.keyframe_insert("rotation_euler", frame=frame)

def _loc_key(pb, frame, x=0, y=0, z=0):
    pb.location = (x, y, z)
    pb.keyframe_insert("location", frame=frame)

def _rest(arm_obj, frame):
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')
    for pb in arm_obj.pose.bones:
        pb.rotation_mode  = 'XYZ'
        pb.rotation_euler = (0,0,0)
        pb.location       = (0,0,0)
        pb.keyframe_insert("rotation_euler", frame=frame)
        pb.keyframe_insert("location",       frame=frame)
    bpy.ops.object.mode_set(mode='OBJECT')


def _new_action(arm_obj, name):
    act = bpy.data.actions.new(name)
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = act
    return act


def gen_fire_pistol(arm_obj, **kwargs) -> bpy.types.Action:
    """Quick snap recoil — slide cycles back, hammer drops."""
    act = _new_action(arm_obj, "FO4_fire_pistol")
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    weapon = arm_obj.pose.bones.get("Weapon")
    bolt   = arm_obj.pose.bones.get("Bolt")
    hammer = arm_obj.pose.bones.get("Hammer")

    if weapon:
        _rot_key(weapon, 0,  0,  0,  0)
        _rot_key(weapon, 3, -12, 0,  3)   # snap up-back on fire
        _rot_key(weapon, 8,   2, 0, -1)   # slight overshoot
        _rot_key(weapon, 15,  0, 0,  0)   # return

    if bolt:                               # slide cycles back then forward
        _loc_key(bolt, 0,  0, 0, 0)
        _loc_key(bolt, 3,  0,-0.04, 0)
        _loc_key(bolt, 8,  0, 0, 0)

    if hammer:
        _rot_key(hammer, 0,  0, 0, 0)
        _rot_key(hammer, 3, 40, 0, 0)     # hammer kicks back
        _rot_key(hammer, 6,  0, 0, 0)     # cocks forward

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_fire_rifle(arm_obj, **kwargs) -> bpy.types.Action:
    """Slower rifle recoil — push back with muzzle rise, bolt cycles."""
    act = _new_action(arm_obj, "FO4_fire_rifle")
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    weapon = arm_obj.pose.bones.get("Weapon")
    bolt   = arm_obj.pose.bones.get("Bolt")

    if weapon:
        _rot_key(weapon, 0,   0, 0, 0)
        _rot_key(weapon, 4,  -8, 0, 2)    # push back + rise
        _rot_key(weapon, 10,  2, 0,-1)    # slight settle
        _rot_key(weapon, 20,  0, 0, 0)

    if bolt:
        _loc_key(bolt, 0, 0, 0, 0)
        _loc_key(bolt, 5, 0,-0.06, 0)
        _loc_key(bolt,12, 0, 0,    0)

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_reload(arm_obj, **kwargs) -> bpy.types.Action:
    """Magazine drops, pause, new mag inserts, chamber."""
    act = _new_action(arm_obj, "FO4_reload")
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    mag  = arm_obj.pose.bones.get("Magazine")
    bolt = arm_obj.pose.bones.get("Bolt")

    if mag:
        _loc_key(mag,  0, 0, 0,    0)
        _loc_key(mag, 10, 0, 0, -0.15)   # mag drops out
        _loc_key(mag, 25, 0, 0, -0.15)   # pause (player grabs new mag)
        _loc_key(mag, 35, 0, 0,    0)    # new mag seats
    if bolt:
        _loc_key(bolt,  0, 0, 0,    0)
        _loc_key(bolt, 38, 0,-0.06, 0)   # rack the bolt
        _loc_key(bolt, 45, 0, 0,    0)

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_melee_swing(arm_obj, **kwargs) -> bpy.types.Action:
    """Horizontal arc swing — fast slash."""
    act = _new_action(arm_obj, "FO4_melee_swing")
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    weapon = arm_obj.pose.bones.get("Weapon")
    if weapon:
        _rot_key(weapon,  0,  0,  0,  60)   # cocked back to right
        _rot_key(weapon,  8,  0, 10, -80)   # fast swing through
        _rot_key(weapon, 14,  0,  5, -60)   # follow-through
        _rot_key(weapon, 25,  0,  0,   0)   # return

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_melee_power(arm_obj, **kwargs) -> bpy.types.Action:
    """Overhead charged smash — wind-up + heavy downward strike."""
    act = _new_action(arm_obj, "FO4_melee_power")
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    weapon = arm_obj.pose.bones.get("Weapon")
    if weapon:
        _rot_key(weapon,  0,  0,  0,   0)
        _rot_key(weapon, 12,-80,  0,  10)  # raise overhead
        _rot_key(weapon, 20,-80,  0,  10)  # hold (charge)
        _rot_key(weapon, 26, 50,  0,  -5)  # smash down hard
        _rot_key(weapon, 32, 20,  0,  -2)  # follow-through
        _rot_key(weapon, 45,  0,  0,   0)  # return

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_equip(arm_obj, **kwargs) -> bpy.types.Action:
    """Weapon rises into view from holster."""
    act = _new_action(arm_obj, "FO4_equip")
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    weapon = arm_obj.pose.bones.get("Weapon")
    if weapon:
        _rot_key(weapon,  0, 60,  0, -20)  # starts low/holstered
        _rot_key(weapon, 12, 10,  0,   5)  # sweeps up fast
        _rot_key(weapon, 18, -3,  0,   1)  # slight overshoot
        _rot_key(weapon, 24,  0,  0,   0)  # settle in aim

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_unequip(arm_obj, **kwargs) -> bpy.types.Action:
    """Weapon lowers back to holster."""
    act = _new_action(arm_obj, "FO4_unequip")
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    weapon = arm_obj.pose.bones.get("Weapon")
    if weapon:
        _rot_key(weapon,  0,  0,  0,   0)
        _rot_key(weapon, 15, 50,  0, -15)  # swings down to holster

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_inspect(arm_obj, **kwargs) -> bpy.types.Action:
    """Player examines weapon — slow tilt/rotate."""
    act = _new_action(arm_obj, "FO4_inspect")
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    weapon = arm_obj.pose.bones.get("Weapon")
    if weapon:
        _rot_key(weapon,  0,  0,   0,  0)
        _rot_key(weapon, 15,  5, -30,  10)  # tilt to look at side
        _rot_key(weapon, 35,  0, -60,   0)  # rotate further
        _rot_key(weapon, 55,  0,   0,   0)  # back to aim

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_thrown(arm_obj, **kwargs) -> bpy.types.Action:
    """Arm cocks back, releases forward."""
    act = _new_action(arm_obj, "FO4_thrown")
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    weapon = arm_obj.pose.bones.get("Weapon")
    if weapon:
        _rot_key(weapon,  0,  0,  0,  0)
        _rot_key(weapon,  8,-40,  0, 20)   # pull back to throw
        _rot_key(weapon, 16,-40,  0, 20)   # hold wind-up
        _rot_key(weapon, 20, 30,  0,-15)   # release forward
        _rot_key(weapon, 25,  0,  0,  0)   # follow-through

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


_ANIM_GENERATORS = {
    "FIRE_PISTOL":  gen_fire_pistol,
    "FIRE_RIFLE":   gen_fire_rifle,
    "RELOAD":       gen_reload,
    "MELEE_SWING":  gen_melee_swing,
    "MELEE_POWER":  gen_melee_power,
    "EQUIP":        gen_equip,
    "UNEQUIP":      gen_unequip,
    "INSPECT":      gen_inspect,
    "THROWN":       gen_thrown,
}


def generate_weapon_animations(arm_obj, weapon_type: str) -> List[bpy.types.Action]:
    """Generate all standard animations for the given weapon type."""
    config  = WEAPON_TYPE_CONFIG.get(weapon_type, {})
    anims   = config.get("anims", ["EQUIP","FIRE_PISTOL","UNEQUIP"])
    actions = []
    for anim_key in anims:
        gen = _ANIM_GENERATORS.get(anim_key)
        if gen:
            try:
                act = gen(arm_obj)
                actions.append(act)
                print(f"[FO4 Weapon] Generated: {act.name}")
            except Exception as exc:
                print(f"[FO4 Weapon] Failed {anim_key}: {exc}")
    return actions


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class FO4_OT_SetWeaponPreset(bpy.types.Operator):
    """Set a weapon description preset."""
    bl_idname  = "fo4.set_weapon_preset"
    bl_label   = "Set Weapon Preset"
    bl_options = {'INTERNAL'}

    preset: bpy.props.StringProperty(default="")

    def execute(self, context):
        if hasattr(context.scene, 'fo4_weapon_description'):
            context.scene.fo4_weapon_description = self.preset
        return {'FINISHED'}


class FO4_OT_AutoRigWeapon(bpy.types.Operator):
    """Auto-detect weapon type and place standard FO4 weapon bones."""
    bl_idname  = "fo4.auto_rig_weapon"
    bl_label   = "Auto-Rig Weapon"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a weapon mesh first")
            return {'CANCELLED'}
        wtype = detect_weapon_type(obj)
        arm   = build_weapon_rig(obj, wtype)
        if not arm:
            self.report({'ERROR'}, "Failed to build weapon rig")
            return {'CANCELLED'}
        config = WEAPON_TYPE_CONFIG[wtype]
        self.report({'INFO'},
            f"Weapon rigged: {config['label']} — "
            f"{len(arm.data.bones)} bones placed")
        return {'FINISHED'}


class FO4_OT_GenerateWeaponAnimations(bpy.types.Operator):
    """Generate all standard FO4 animations for the active weapon armature."""
    bl_idname  = "fo4.generate_weapon_animations"
    bl_label   = "Generate Weapon Animations"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        arm_obj = context.active_object
        if not arm_obj or arm_obj.type != 'ARMATURE':
            self.report({'ERROR'}, "Select the weapon armature first")
            return {'CANCELLED'}
        wtype = arm_obj.get("fo4_weapon_type", "PISTOL")
        acts  = generate_weapon_animations(arm_obj, wtype)
        if not acts:
            self.report({'WARNING'}, "No animations generated")
            return {'CANCELLED'}
        self.report({'INFO'},
            f"Generated {len(acts)} animation(s): {', '.join(a.name for a in acts)}")
        return {'FINISHED'}


class FO4_OT_WeaponFullPipeline(bpy.types.Operator):
    """One-click: detect weapon → rig → generate all animations.

    Select your weapon mesh, optionally type a description, then click.
    """
    bl_idname  = "fo4.weapon_full_pipeline"
    bl_label   = "Full Weapon Pipeline"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a weapon mesh first")
            return {'CANCELLED'}

        desc  = getattr(context.scene, 'fo4_weapon_description', '')
        wtype = parse_weapon_description(desc) if desc.strip() else detect_weapon_type(obj)

        arm = build_weapon_rig(obj, wtype)
        if not arm:
            self.report({'ERROR'}, "Rig failed")
            return {'CANCELLED'}

        acts = generate_weapon_animations(arm, wtype)
        config = WEAPON_TYPE_CONFIG[wtype]
        self.report({'INFO'},
            f"{config['label']} pipeline complete — "
            f"{len(arm.data.bones)} bones, {len(acts)} animations")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_CLASSES = [
    FO4_OT_SetWeaponPreset,
    FO4_OT_AutoRigWeapon,
    FO4_OT_GenerateWeaponAnimations,
    FO4_OT_WeaponFullPipeline,
]


def register():
    try:
        bpy.types.Scene.fo4_weapon_description = bpy.props.StringProperty(
            name="Weapon Description",
            description="Describe your weapon — e.g. '10mm pistol' or 'combat knife'",
            default="",
        )
    except Exception:
        pass
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            pass


def unregister():
    try:
        del bpy.types.Scene.fo4_weapon_description
    except Exception:
        pass
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
