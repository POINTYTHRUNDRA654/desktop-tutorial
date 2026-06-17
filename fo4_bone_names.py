"""
fo4_bone_names.py
Canonical Fallout 4 NPC skeleton bone names sourced from the vanilla
HumanRace skeleton.nif.  All animation modules should import from here
rather than hard-coding bone-name strings, so that a mismatch in one place
does not silently break the other modules.

Usage:
    from . import fo4_bone_names as _bn
    upper_arm_l = _bn.NPC["L_UPPER_ARM"]   # "NPC L UpperArm [LUar]"
"""

# ---------------------------------------------------------------------------
# Canonical NPC skeleton bone names (from vanilla HumanRace skeleton.nif)
# All abbreviations include the correct trailing spaces where the game uses
# them (e.g. "NPC COM [COM ]", "NPC L Foot [Lft ]").
# ---------------------------------------------------------------------------
NPC = {
    # Root / centre of mass
    "ROOT":        "NPC Root [Root]",
    "COM":         "NPC COM [COM ]",
    "PELVIS":      "NPC Pelvis [Pelv]",

    # Spine chain
    "SPINE0":      "NPC Spine [Spn0]",
    "SPINE1":      "NPC Spine1 [Spn1]",
    "SPINE2":      "NPC Spine2 [Spn2]",

    # Head / neck
    "NECK":        "NPC Neck [Neck]",
    "HEAD":        "NPC Head [Head]",

    # Left arm
    "L_CLAVICLE":  "NPC L Clavicle [LClv]",
    "L_UPPER_ARM": "NPC L UpperArm [LUar]",
    "L_FOREARM":   "NPC L Forearm [LLar]",
    "L_HAND":      "NPC L Hand [LHnd]",

    # Right arm
    "R_CLAVICLE":  "NPC R Clavicle [RClv]",
    "R_UPPER_ARM": "NPC R UpperArm [RUar]",
    "R_FOREARM":   "NPC R Forearm [RLar]",
    "R_HAND":      "NPC R Hand [RHnd]",

    # Left leg
    "L_THIGH":     "NPC L Thigh [LThg]",
    "L_CALF":      "NPC L Calf [LClf]",
    "L_FOOT":      "NPC L Foot [Lft ]",   # note trailing space — matches vanilla
    "L_TOE":       "NPC L Toe0 [LToe]",

    # Right leg
    "R_THIGH":     "NPC R Thigh [RThg]",
    "R_CALF":      "NPC R Calf [RClf]",
    "R_FOOT":      "NPC R Foot [Rft ]",   # note trailing space — matches vanilla
    "R_TOE":       "NPC R Toe0 [RToe]",
}

# Convenience set for fast prefix-based detection
NPC_PREFIX = "NPC "

# All canonical bone names as a frozenset (for O(1) membership tests)
NPC_ALL = frozenset(NPC.values())

# Root bone(s) — only the true skeleton root
NPC_ROOTS = frozenset({"NPC Root [Root]"})

# Per-bone deform limit for a single skinned mesh in FO4 (BSTriShape).
# The game's NIF loader enforces this; exceeding it causes invisible geometry.
FO4_MAX_DEFORM_BONES_PER_MESH = 80

# ---------------------------------------------------------------------------
# Power Armor skeleton — separate from the regular NPC skeleton.
# PA uses HumanRacePowerArmor.nif; bone names are identical to NPC but the
# skeleton HKX and behaviour graph paths differ.
# ---------------------------------------------------------------------------
PA_SKELETON_SUBPATH = "Actors/PowerArmor"

# ---------------------------------------------------------------------------
# Creature / flora conventions:
#   - No "NPC " prefix
#   - Species-specific skeleton HKX under Actors/<creature>/
#   - Carnivorous plants use a creature-style rig; simple foliage uses
#     Wind vertex groups only (no skeleton)
# ---------------------------------------------------------------------------
CREATURE_NO_PREFIX = True   # reminder: creature bones must NOT start with "NPC "

# ---------------------------------------------------------------------------
# Weapon bone names (generic rig — 3rd-person world model)
# ---------------------------------------------------------------------------
WEAPON = {
    "ROOT":     "Weapon",
    "GRIP":     "Grip",
    "TRIGGER":  "Trigger",
    "BARREL":   "Barrel",
    "MUZZLE":   "Muzzle",
    "MAGAZINE": "Magazine",
    "BOLT":     "Bolt",
    "HAMMER":   "Hammer",
    "SCOPE":    "Scope",
}

# 1st-person arm skeleton attachment bones
WEAPON_1P = {
    "WEAPON":       "WEAPON",
    "ANIM_OBJ_A":  "AnimObjectA",
    "ANIM_OBJ_B":  "AnimObjectB",
}
