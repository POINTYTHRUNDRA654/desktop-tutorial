"""
fo4_armor_animation.py
======================
Automatic armor/clothing setup for Fallout 4.

Pipeline
--------
1. Armor Type Detection
   Analyzes mesh position and shape to classify:
   HELMET | CHEST | PAULDRON | GAUNTLET | BOOT | FULL_BODY |
   CAPE | ROBE | SKIRT (cloth types get physics simulation)

2. FO4 Skeleton Binding
   Matches the armor piece to the correct NPC skeleton bones.
   Can use an existing armature in the scene or build a reference
   skeleton from FO4's standard bone hierarchy.

3. Cloth Physics (soft pieces only)
   - Marks cloth vertices as soft-body simulation targets
   - Sets up vertex groups for pinning (attach points to skeleton)
   - Adds Blender cloth modifier with FO4-appropriate settings

4. Biped Slot Assignment
   Auto-detects and assigns the correct FO4 biped equipment slot
   (ARMO/ARMA record slot number).

5. Preset System
   Quick-pick buttons and keyword guide so new users get results
   without needing to know FO4 internals.

FO4 Biped Slots Reference
--------------------------
30 = Head / Hair / Eyes
31 = Hair (hat-hair)
32 = Body (torso)
33 = Left Hand
34 = Right Hand
35 = Right Ring Finger (Pip-Boy)
36 = Amulet / Necklace
37 = Ring
38 = Feet / Boots
39 = Calves / Lower Leg
40 = Shoulders / Backpack
41 = Left Upper Arm
42 = Right Upper Arm
43 = Left Lower Arm
44 = Right Lower Arm
45 = Left Upper Leg
46 = Right Upper Leg
48 = Decapitation (head)
"""

import bpy
import bmesh
import math
import mathutils
import os
from typing import List, Optional, Tuple


# ---------------------------------------------------------------------------
# FO4 skeleton bone map
# Key NPC_ bones and the biped slot they primarily influence
# ---------------------------------------------------------------------------

FO4_SKELETON_BONES = {
    # Spine / torso
    "NPC Root [Root]":          None,
    "NPC COM [COM ]":           None,
    "NPC Pelvis [Pelv]":        32,
    "NPC Spine [Spn0]":         32,
    "NPC Spine1 [Spn1]":        32,
    "NPC Spine2 [Spn2]":        32,

    # Head
    "NPC Head [Head]":          30,
    "NPC Neck [Neck]":          30,

    # Left arm
    "NPC L Clavicle [LClv]":    40,
    "NPC L UpperArm [LUar]":    41,
    "NPC L Forearm [LLar]":     43,
    "NPC L Hand [LHnd]":        33,

    # Right arm
    "NPC R Clavicle [RClv]":    40,
    "NPC R UpperArm [RUar]":    42,
    "NPC R Forearm [RLar]":     44,
    "NPC R Hand [RHnd]":        34,

    # Left leg
    "NPC L Thigh [LThg]":       45,
    "NPC L Calf [LClf]":        39,
    "NPC L Foot [Lft ]":        38,

    # Right leg
    "NPC R Thigh [RThg]":       46,
    "NPC R Calf [RClf]":        39,
    "NPC R Foot [Rft ]":        38,
}

# Biped slot names for display
BIPED_SLOT_NAMES = {
    30: "Head",       31: "Hair",       32: "Body",
    33: "Left Hand",  34: "Right Hand", 35: "Pip-Boy",
    36: "Amulet",     37: "Ring",       38: "Feet/Boots",
    39: "Calves",     40: "Shoulders",  41: "Left Upper Arm",
    42: "Right Upper Arm", 43: "Left Forearm", 44: "Right Forearm",
    45: "Left Thigh", 46: "Right Thigh",
}

# Armor type → primary biped slots + required skeleton bones
ARMOR_TYPE_CONFIG = {
    "HELMET": {
        "biped_slots":    [30],
        "bind_bones":     ["NPC Head [Head]", "NPC Neck [Neck]"],
        "cloth_physics":  False,
        "label":          "Helmet / Hat",
    },
    "CHEST": {
        "biped_slots":    [32],
        "bind_bones":     ["NPC Spine [Spn0]", "NPC Spine1 [Spn1]",
                           "NPC Spine2 [Spn2]", "NPC Pelvis [Pelv]"],
        "cloth_physics":  False,
        "label":          "Chest / Cuirass",
    },
    "PAULDRON_L": {
        "biped_slots":    [40, 41],
        "bind_bones":     ["NPC L Clavicle [LClv]", "NPC L UpperArm [LUar]"],
        "cloth_physics":  False,
        "label":          "Left Pauldron",
    },
    "PAULDRON_R": {
        "biped_slots":    [40, 42],
        "bind_bones":     ["NPC R Clavicle [RClv]", "NPC R UpperArm [RUar]"],
        "cloth_physics":  False,
        "label":          "Right Pauldron",
    },
    "GAUNTLET_L": {
        "biped_slots":    [33, 43],
        "bind_bones":     ["NPC L Hand [LHnd]", "NPC L Forearm [LLar]"],
        "cloth_physics":  False,
        "label":          "Left Gauntlet / Glove",
    },
    "GAUNTLET_R": {
        "biped_slots":    [34, 44],
        "bind_bones":     ["NPC R Hand [RHnd]", "NPC R Forearm [RLar]"],
        "cloth_physics":  False,
        "label":          "Right Gauntlet / Glove",
    },
    "BOOT": {
        "biped_slots":    [38, 39],
        "bind_bones":     ["NPC L Foot [Lft ]", "NPC R Foot [Rft ]",
                           "NPC L Calf [LClf]", "NPC R Calf [RClf]"],
        "cloth_physics":  False,
        "label":          "Boots / Greaves",
    },
    "FULL_BODY": {
        "biped_slots":    [32, 33, 34, 38, 39, 40, 41, 42, 43, 44, 45, 46],
        "bind_bones":     list(FO4_SKELETON_BONES.keys()),
        "cloth_physics":  False,
        "label":          "Full Body Outfit",
    },
    "CAPE": {
        "biped_slots":    [40],
        "bind_bones":     ["NPC Spine2 [Spn2]", "NPC L Clavicle [LClv]",
                           "NPC R Clavicle [RClv]"],
        "cloth_physics":  True,
        "label":          "Cape / Cloak",
        "cloth_pin_bones": ["NPC Spine2 [Spn2]"],
    },
    "ROBE": {
        "biped_slots":    [32],
        "bind_bones":     ["NPC Spine [Spn0]", "NPC Spine1 [Spn1]",
                           "NPC Spine2 [Spn2]", "NPC Pelvis [Pelv]"],
        "cloth_physics":  True,
        "label":          "Robe / Long Coat",
        "cloth_pin_bones": ["NPC Spine [Spn0]", "NPC Spine1 [Spn1]"],
    },
    "SKIRT": {
        "biped_slots":    [32, 45, 46],
        "bind_bones":     ["NPC Pelvis [Pelv]", "NPC L Thigh [LThg]",
                           "NPC R Thigh [RThg]"],
        "cloth_physics":  True,
        "label":          "Skirt / Kilt",
        "cloth_pin_bones": ["NPC Pelvis [Pelv]"],
    },
}


# ---------------------------------------------------------------------------
# Armor type detection
# ---------------------------------------------------------------------------

def detect_armor_type(obj) -> str:
    """Classify the mesh as an armor type using bounding box position and shape.

    Returns one of the ARMOR_TYPE_CONFIG keys.
    """
    me  = obj.data
    mw  = obj.matrix_world
    vs  = [mw @ v.co for v in me.vertices]

    if not vs:
        return "CHEST"

    xs = [v.x for v in vs];  ys = [v.y for v in vs];  zs = [v.z for v in vs]
    cx = (max(xs) + min(xs)) / 2
    cy = (max(ys) + min(ys)) / 2
    cz = (max(zs) + min(zs)) / 2
    w  = max(xs) - min(xs)
    d  = max(ys) - min(ys)
    h  = max(zs) - min(zs)

    # Height bands in FO4 standard skeleton (approximate Blender units)
    # Head: z > 1.1,  Chest: 0.4-1.1,  Waist: 0.1-0.4,  Leg: z < 0.1, Foot: z < -0.2
    name_lower = obj.name.lower()

    # Name hints first (most reliable)
    if any(k in name_lower for k in ["helmet","hat","hood","mask","head"]):
        return "HELMET"
    if any(k in name_lower for k in ["cape","cloak","mantle"]):
        return "CAPE"
    if any(k in name_lower for k in ["robe","coat","duster","longcoat"]):
        return "ROBE"
    if any(k in name_lower for k in ["skirt","kilt","loincloth"]):
        return "SKIRT"
    if any(k in name_lower for k in ["boot","shoe","foot","greave","sabatons"]):
        return "BOOT"
    if any(k in name_lower for k in ["glove","gauntlet","hand","bracer"]):
        return "GAUNTLET_L" if "left" in name_lower or "_l" in name_lower else "GAUNTLET_R"
    if any(k in name_lower for k in ["pauldron","shoulder","spaulder"]):
        return "PAULDRON_L" if "left" in name_lower or "_l" in name_lower else "PAULDRON_R"
    if any(k in name_lower for k in ["chest","cuirass","torso","vest","jacket","shirt","body"]):
        return "CHEST"

    # Geometry fallback: use bounding box center height
    if cz > 1.1:
        return "HELMET"
    elif cz > 0.6:
        if cx < -0.1:   return "PAULDRON_L"
        elif cx > 0.1:  return "PAULDRON_R"
        else:           return "CHEST"
    elif cz > 0.0:
        if h > w * 1.5: return "ROBE"
        return "CHEST"
    elif cz > -0.3:
        return "BOOT"
    else:
        return "FULL_BODY"


# ---------------------------------------------------------------------------
# Skeleton finding / creation
# ---------------------------------------------------------------------------

def find_fo4_skeleton_in_scene() -> Optional[bpy.types.Object]:
    """Find an existing FO4 skeleton armature in the scene."""
    for obj in bpy.data.objects:
        if obj.type != 'ARMATURE':
            continue
        bones = {b.name for b in obj.data.bones}
        # Check for key FO4 bone names
        fo4_key_bones = {"NPC Pelvis [Pelv]", "NPC Spine [Spn0]", "NPC Head [Head]"}
        if fo4_key_bones & bones:
            return obj
        # Simpler skeleton check
        if any("NPC" in b for b in bones) or any("COM" in b for b in bones):
            return obj
    return None


def build_reference_skeleton() -> bpy.types.Object:
    """Build a minimal FO4 reference skeleton in Blender.

    Creates the core NPC bones in correct FO4 proportions so armor can
    be weight-painted without needing to import fo4_skeleton.nif first.
    """
    arm_data = bpy.data.armatures.new("FO4_NPC_Skeleton")
    arm_obj  = bpy.data.objects.new("FO4_NPC_Skeleton", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones

    def bone(name, head, tail, parent_name=None):
        b      = eb.new(name)
        b.head = mathutils.Vector(head)
        b.tail = mathutils.Vector(tail)
        if parent_name and parent_name in eb:
            b.parent = eb[parent_name]
            if (mathutils.Vector(head) - eb[parent_name].tail).length < 0.001:
                b.use_connect = True
        return b

    # Root / COM / Pelvis
    bone("NPC Root [Root]",     (0,0,0),     (0,0,0.05))
    bone("NPC COM [COM ]",      (0,0,0.9),   (0,0,0.95),  "NPC Root [Root]")
    bone("NPC Pelvis [Pelv]",   (0,0,0.95),  (0,0,1.05),  "NPC COM [COM ]")

    # Spine chain
    bone("NPC Spine [Spn0]",    (0,0,1.05),  (0,0,1.20),  "NPC Pelvis [Pelv]")
    bone("NPC Spine1 [Spn1]",   (0,0,1.20),  (0,0,1.38),  "NPC Spine [Spn0]")
    bone("NPC Spine2 [Spn2]",   (0,0,1.38),  (0,0,1.52),  "NPC Spine1 [Spn1]")

    # Neck / Head
    bone("NPC Neck [Neck]",     (0,0,1.52),  (0,0,1.62),  "NPC Spine2 [Spn2]")
    bone("NPC Head [Head]",     (0,0,1.62),  (0,0,1.82),  "NPC Neck [Neck]")

    # Left arm
    bone("NPC L Clavicle [LClv]", (-0.05,0,1.50), (-0.20,0,1.52), "NPC Spine2 [Spn2]")
    bone("NPC L UpperArm [LUar]", (-0.20,0,1.52), (-0.45,0,1.38), "NPC L Clavicle [LClv]")
    bone("NPC L Forearm [LLar]",  (-0.45,0,1.38), (-0.68,0,1.25), "NPC L UpperArm [LUar]")
    bone("NPC L Hand [LHnd]",     (-0.68,0,1.25), (-0.80,0,1.18), "NPC L Forearm [LLar]")

    # Right arm (mirror)
    bone("NPC R Clavicle [RClv]", (0.05,0,1.50),  (0.20,0,1.52),  "NPC Spine2 [Spn2]")
    bone("NPC R UpperArm [RUar]", (0.20,0,1.52),  (0.45,0,1.38),  "NPC R Clavicle [RClv]")
    bone("NPC R Forearm [RLar]",  (0.45,0,1.38),  (0.68,0,1.25),  "NPC R UpperArm [RUar]")
    bone("NPC R Hand [RHnd]",     (0.68,0,1.25),  (0.80,0,1.18),  "NPC R Forearm [RLar]")

    # Left leg
    bone("NPC L Thigh [LThg]",  (-0.10,0,0.95), (-0.12,0,0.55),  "NPC Pelvis [Pelv]")
    bone("NPC L Calf [LClf]",   (-0.12,0,0.55), (-0.10,0,0.15),  "NPC L Thigh [LThg]")
    bone("NPC L Foot [Lft ]",   (-0.10,0,0.15), (-0.10,0.15,0.02),"NPC L Calf [LClf]")

    # Right leg (mirror)
    bone("NPC R Thigh [RThg]",  (0.10,0,0.95),  (0.12,0,0.55),   "NPC Pelvis [Pelv]")
    bone("NPC R Calf [RClf]",   (0.12,0,0.55),  (0.10,0,0.15),   "NPC R Thigh [RThg]")
    bone("NPC R Foot [Rft ]",   (0.10,0,0.15),  (0.10,0.15,0.02),"NPC R Calf [RClf]")

    bpy.ops.object.mode_set(mode='OBJECT')
    print(f"[FO4 Armor] Built reference skeleton: {len(arm_data.bones)} bones")
    return arm_obj


# ---------------------------------------------------------------------------
# Binding + cloth setup
# ---------------------------------------------------------------------------

def bind_armor_to_skeleton(armor_obj, skeleton_obj,
                             armor_type: str) -> tuple:
    """Parent armor mesh to skeleton with weight-painted bone binding.

    Returns (success, message).
    """
    config = ARMOR_TYPE_CONFIG.get(armor_type)
    if not config:
        return False, f"Unknown armor type: {armor_type}"

    target_bones = config["bind_bones"]

    # Deselect all, select armor + skeleton
    bpy.ops.object.select_all(action='DESELECT')
    armor_obj.select_set(True)
    skeleton_obj.select_set(True)
    bpy.context.view_layer.objects.active = skeleton_obj

    # Parent with automatic heat-weighted skinning
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Limit weights to only the relevant bones for this armor type
    _limit_vertex_groups(armor_obj, target_bones)

    slots = config["biped_slots"]
    slot_names = [BIPED_SLOT_NAMES.get(s, str(s)) for s in slots]
    return True, (
        f"Bound to skeleton | Bones: {len(target_bones)} | "
        f"Biped slots: {', '.join(slot_names)}"
    )


def _limit_vertex_groups(armor_obj, keep_bones: List[str]) -> None:
    """Remove vertex groups not in keep_bones to keep weights clean."""
    groups_to_remove = [
        vg for vg in armor_obj.vertex_groups
        if vg.name not in keep_bones
    ]
    for vg in groups_to_remove:
        armor_obj.vertex_groups.remove(vg)


def setup_cloth_physics(armor_obj, armor_type: str,
                         pin_bone_names: List[str] = None) -> tuple:
    """Add Blender cloth modifier configured for FO4-appropriate cloth simulation.

    Pin vertices near the attach bones (collar for cape, waist for skirt, etc.)
    so they stay attached while the rest flows freely.

    Returns (success, message).
    """
    config = ARMOR_TYPE_CONFIG.get(armor_type, {})
    if not config.get("cloth_physics"):
        return False, f"{armor_type} does not need cloth physics"

    pin_bones = pin_bone_names or config.get("cloth_pin_bones", [])

    me = armor_obj.data
    bpy.context.view_layer.objects.active = armor_obj

    # Create pin vertex group from top vertices
    pin_vg = armor_obj.vertex_groups.get("cloth_pin") or \
             armor_obj.vertex_groups.new(name="cloth_pin")

    # Find vertices that are close to the "top" of the mesh (pin region)
    mw     = armor_obj.matrix_world
    verts  = [(i, (mw @ v.co).z) for i, v in enumerate(me.vertices)]
    max_z  = max(z for _, z in verts)
    min_z  = min(z for _, z in verts)
    height = max(max_z - min_z, 0.001)
    # Pin top 15% of vertices (attachment zone)
    pin_threshold = min_z + height * 0.85

    pin_indices = [i for i, z in verts if z >= pin_threshold]
    if pin_indices:
        pin_vg.add(pin_indices, 1.0, 'REPLACE')

    # Add cloth modifier
    existing = armor_obj.modifiers.get("FO4_Cloth")
    if existing:
        armor_obj.modifiers.remove(existing)

    cloth_mod = armor_obj.modifiers.new("FO4_Cloth", 'CLOTH')
    cs = cloth_mod.settings
    ps = cloth_mod.collision_settings

    # FO4-appropriate cloth settings
    cs.quality              = 10
    cs.mass                 = 0.3         # light fabric
    cs.tension_stiffness    = 15.0        # medium stiff (leather vs silk)
    cs.compression_stiffness= 15.0
    cs.shear_stiffness      = 5.0
    cs.bending_stiffness    = 0.5         # flows naturally
    cs.tension_damping      = 5.0
    cs.compression_damping  = 5.0
    cs.shear_damping        = 5.0
    cs.bending_damping      = 0.5
    cs.use_internal_springs = True
    cs.vertex_group_mass    = "cloth_pin"  # pinned vertices

    ps.use_collision   = True
    ps.collision_quality = 3

    return True, (
        f"Cloth physics added: {len(pin_indices)} pin vertices, "
        f"top 15% pinned to skeleton"
    )


def setup_armor_piece(armor_obj, armor_type: str,
                       skeleton_obj=None) -> dict:
    """Full armor setup pipeline.

    1. Find or build skeleton
    2. Bind armor to skeleton with heat weights
    3. Limit weights to correct bones
    4. Add cloth physics if needed
    5. Store biped slot as custom property

    Returns result dict.
    """
    result = {"success": False, "steps": [], "biped_slots": [],
              "armor_type": armor_type, "skeleton": None}

    config = ARMOR_TYPE_CONFIG.get(armor_type)
    if not config:
        result["message"] = f"Unknown armor type: {armor_type}"
        return result

    # Get or build skeleton
    if skeleton_obj is None:
        skeleton_obj = find_fo4_skeleton_in_scene()
        if skeleton_obj:
            result["steps"].append(f"Found skeleton: {skeleton_obj.name}")
        else:
            skeleton_obj = build_reference_skeleton()
            result["steps"].append("Built FO4 reference skeleton")

    result["skeleton"] = skeleton_obj

    # Bind
    ok, msg = bind_armor_to_skeleton(armor_obj, skeleton_obj, armor_type)
    result["steps"].append(msg)
    if not ok:
        result["message"] = msg
        return result

    # Cloth physics
    if config.get("cloth_physics"):
        ok2, msg2 = setup_cloth_physics(armor_obj, armor_type)
        result["steps"].append(msg2)

    # Store biped slot as custom property (visible in NIF exporter)
    slots = config["biped_slots"]
    armor_obj["fo4_biped_slots"] = slots
    armor_obj["fo4_armor_type"]  = armor_type
    result["steps"].append(f"Biped slots: {[BIPED_SLOT_NAMES.get(s,s) for s in slots]}")

    result["success"]      = True
    result["biped_slots"]  = slots
    result["message"]      = (
        f"{config['label']} setup complete — "
        f"slots: {', '.join(BIPED_SLOT_NAMES.get(s,'?') for s in slots)}"
    )
    return result


# ---------------------------------------------------------------------------
# Preset descriptions → armor type
# ---------------------------------------------------------------------------

ARMOR_PRESETS = [
    # Rigid armor
    ("Helmet / Hat",            "helmet", "rigid"),
    ("Chest Plate / Cuirass",   "chest plate armor",  "rigid"),
    ("Left Pauldron",           "left shoulder pauldron armor", "rigid"),
    ("Right Pauldron",          "right shoulder pauldron armor", "rigid"),
    ("Left Gauntlet / Glove",   "left hand gauntlet glove", "rigid"),
    ("Right Gauntlet / Glove",  "right hand gauntlet glove", "rigid"),
    ("Boots / Greaves",         "boots greaves foot armor", "rigid"),
    ("Full Body Outfit",        "full body outfit all slots", "rigid"),
    # Cloth
    ("Cape / Cloak",            "flowing cape cloak cloth", "cloth"),
    ("Long Robe / Duster Coat", "long flowing robe coat cloth", "cloth"),
    ("Skirt / Kilt",            "skirt kilt cloth flowing", "cloth"),
]

ARMOR_KEYWORD_MAP = {
    "helmet":      "HELMET",
    "hat":         "HELMET",
    "hood":        "HELMET",
    "mask":        "HELMET",
    "head":        "HELMET",
    "chest":       "CHEST",
    "cuirass":     "CHEST",
    "torso":       "CHEST",
    "vest":        "CHEST",
    "jacket":      "CHEST",
    "shirt":       "CHEST",
    "body":        "CHEST",
    "left shoulder": "PAULDRON_L",
    "right shoulder":"PAULDRON_R",
    "pauldron":    "PAULDRON_L",
    "shoulder":    "PAULDRON_L",
    "left hand":   "GAUNTLET_L",
    "right hand":  "GAUNTLET_R",
    "gauntlet":    "GAUNTLET_L",
    "glove":       "GAUNTLET_L",
    "bracer":      "GAUNTLET_L",
    "boot":        "BOOT",
    "shoe":        "BOOT",
    "greave":      "BOOT",
    "foot":        "BOOT",
    "full body":   "FULL_BODY",
    "outfit":      "FULL_BODY",
    "cape":        "CAPE",
    "cloak":       "CAPE",
    "mantle":      "CAPE",
    "robe":        "ROBE",
    "coat":        "ROBE",
    "duster":      "ROBE",
    "skirt":       "SKIRT",
    "kilt":        "SKIRT",
}


def parse_armor_description(description: str) -> str:
    """Map a user description to an ARMOR_TYPE_CONFIG key."""
    d = description.lower()

    # Multi-word phrases first
    for phrase in ["left shoulder", "right shoulder", "left hand", "right hand",
                   "full body"]:
        if phrase in d:
            return ARMOR_KEYWORD_MAP[phrase]

    # Single keywords
    for kw, atype in ARMOR_KEYWORD_MAP.items():
        if kw in d:
            return atype

    return "CHEST"   # safe default


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class FO4_OT_AutoSetupArmor(bpy.types.Operator):
    """Auto-setup armor/clothing for Fallout 4 in one click.

    Detects armor type from mesh name/shape, builds or finds a skeleton,
    binds the mesh with heat-weighted skinning, adds cloth physics for
    soft pieces, and assigns biped equipment slots.
    """
    bl_idname  = "fo4.auto_setup_armor"
    bl_label   = "Auto-Setup Armor / Clothing"
    bl_options = {'REGISTER', 'UNDO'}

    armor_type: bpy.props.EnumProperty(
        name="Armor Type",
        items=[(k, v["label"], v["label"]) for k, v in ARMOR_TYPE_CONFIG.items()],
        default="CHEST",
        description="Type of armor/clothing piece — auto-detected if left as-is",
    )
    auto_detect: bpy.props.BoolProperty(
        name="Auto-Detect Type",
        description="Let the addon detect armor type from mesh shape/name",
        default=True,
    )
    build_skeleton: bpy.props.BoolProperty(
        name="Build Reference Skeleton",
        description="Build a FO4 reference skeleton if none exists in scene",
        default=True,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        atype = detect_armor_type(obj) if self.auto_detect else self.armor_type
        skel  = find_fo4_skeleton_in_scene()
        if skel is None and not self.build_skeleton:
            self.report({'ERROR'},
                "No FO4 skeleton in scene. Enable 'Build Reference Skeleton' "
                "or import fo4_skeleton.nif first.")
            return {'CANCELLED'}

        result = setup_armor_piece(obj, atype, skeleton_obj=skel)

        for step in result["steps"]:
            print(f"[FO4 Armor] {step}")

        if result["success"]:
            self.report({'INFO'}, result["message"])
        else:
            self.report({'ERROR'}, result["message"])
            return {'CANCELLED'}

        return {'FINISHED'}


class FO4_OT_SetArmorPreset(bpy.types.Operator):
    """Set a preset armor description."""
    bl_idname  = "fo4.set_armor_preset"
    bl_label   = "Set Armor Preset"
    bl_options = {'INTERNAL'}

    preset: bpy.props.StringProperty(default="")

    def execute(self, context):
        if hasattr(context.scene, 'fo4_armor_description'):
            context.scene.fo4_armor_description = self.preset
        return {'FINISHED'}


class FO4_OT_SetupArmorFromDescription(bpy.types.Operator):
    """Setup armor from a text description."""
    bl_idname  = "fo4.setup_armor_from_description"
    bl_label   = "Setup Armor from Description"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        desc  = getattr(context.scene, 'fo4_armor_description',
                        'chest plate armor')
        atype = parse_armor_description(desc)

        result = setup_armor_piece(obj, atype)
        for step in result["steps"]:
            print(f"[FO4 Armor] {step}")

        if result["success"]:
            self.report({'INFO'}, result["message"])
        else:
            self.report({'ERROR'}, result["message"])
            return {'CANCELLED'}
        return {'FINISHED'}


class FO4_OT_BuildFO4Skeleton(bpy.types.Operator):
    """Build a FO4 reference skeleton in the scene."""
    bl_idname  = "fo4.build_fo4_skeleton"
    bl_label   = "Build FO4 Reference Skeleton"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        existing = find_fo4_skeleton_in_scene()
        if existing:
            self.report({'INFO'}, f"FO4 skeleton already in scene: {existing.name}")
            return {'FINISHED'}
        arm = build_reference_skeleton()
        self.report({'INFO'}, f"Built FO4 skeleton: {len(arm.data.bones)} bones")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_CLASSES = [
    FO4_OT_AutoSetupArmor,
    FO4_OT_SetArmorPreset,
    FO4_OT_SetupArmorFromDescription,
    FO4_OT_BuildFO4Skeleton,
]

_SCENE_PROPS = [
    ("fo4_armor_description", bpy.props.StringProperty(
        name="Armor Description",
        description="Describe your armor piece — e.g. 'flowing cape' or 'chest plate'",
        default="chest plate armor",
    )),
    ("fo4_armor_type_detected", bpy.props.StringProperty(
        name="Detected Armor Type", default="",
    )),
]


def register():
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            pass
    for name, prop in _SCENE_PROPS:
        try:
            setattr(bpy.types.Scene, name, prop)
        except Exception:
            pass


def unregister():
    for name, _ in reversed(_SCENE_PROPS):
        try:
            delattr(bpy.types.Scene, name)
        except Exception:
            pass
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
