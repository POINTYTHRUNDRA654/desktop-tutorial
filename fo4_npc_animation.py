"""
fo4_npc_animation.py
====================
Comprehensive NPC and creature animation system for Fallout 4.

Animation Categories
--------------------
MOVEMENT        idle stand / walk / run / sprint / crouch / slide / jump / dodge roll
COVER           lean left / lean right / peek top / break cover
HAND-TO-HAND    jab / cross / kick / combo / block / dodge / uppercut / grapple
SNEAK           sneak idle / sneak walk / sneak attack melee / sneak attack back
COMBAT REACT    hit react front / hit react back / stagger / knockdown
DEATHS          death forward / death backward / death side / death dramatic
CREATURE        quadruped run / biped charge / pounce / bite / claw swipe / roar
SOCIAL          greeting wave / idle nervous / idle patrol / point / search / surrender
POWER ARMOR     PA walk / PA slam / PA power punch / PA stomp
"""

import bpy
import math
import mathutils
import os
import subprocess
from typing import List, Optional, Dict


# ---------------------------------------------------------------------------
# Full-body bone groups (NPC skeleton)
# ---------------------------------------------------------------------------

SPINE_BONES  = ["NPC Pelvis [Pelv]","NPC Spine [Spn0]",
                 "NPC Spine1 [Spn1]","NPC Spine2 [Spn2]"]
HEAD_BONES   = ["NPC Neck [Neck]","NPC Head [Head]"]
L_ARM_BONES  = ["NPC L Clavicle [LClv]","NPC L UpperArm [LUar]",
                 "NPC L Forearm [LLar]","NPC L Hand [LHnd]"]
R_ARM_BONES  = ["NPC R Clavicle [RClv]","NPC R UpperArm [RUar]",
                 "NPC R Forearm [RLar]","NPC R Hand [RHnd]"]
L_LEG_BONES  = ["NPC L Thigh [LThg]","NPC L Calf [LClf]","NPC L Foot [Lft ]"]
R_LEG_BONES  = ["NPC R Thigh [RThg]","NPC R Calf [RClf]","NPC R Foot [Rft ]"]
ROOT_BONES   = ["NPC Root [Root]","NPC COM [COM ]"]
ALL_BONES    = ROOT_BONES + SPINE_BONES + HEAD_BONES + L_ARM_BONES + R_ARM_BONES + L_LEG_BONES + R_LEG_BONES


# ---------------------------------------------------------------------------
# Animation type registry
# ---------------------------------------------------------------------------

ANIM_CATEGORIES = {
    "MOVEMENT": {
        "label": "Movement",
        "icon": "PLAY",
        "anims": [
            ("IDLE_STAND",   "Idle Stand",         "Neutral standing pose, subtle breathing sway"),
            ("WALK",         "Walk Cycle",          "Normal walking gait loop"),
            ("RUN",          "Run Cycle",           "Running gait loop, forward lean"),
            ("SPRINT",       "Sprint",              "Full sprint, aggressive forward lean"),
            ("CROUCH_IDLE",  "Crouch Idle",         "Crouched still, weight on balls of feet"),
            ("CROUCH_WALK",  "Crouch Walk",         "Crouched shuffle forward"),
            ("SLIDE",        "Slide",               "Ground slide — drop to one knee, momentum forward"),
            ("JUMP_START",   "Jump Start",          "Launch / push-off"),
            ("DODGE_ROLL",   "Dodge Roll",          "Quick forward shoulder roll"),
        ],
    },
    "COVER": {
        "label": "Cover System",
        "icon": "ANCHOR_CENTER",
        "anims": [
            ("COVER_IDLE",   "Cover Idle",          "Pressed against cover, head down"),
            ("COVER_L",      "Lean Left",           "Swing out from left side of cover"),
            ("COVER_R",      "Lean Right",          "Swing out from right side of cover"),
            ("COVER_PEEK",   "Peek Over Top",       "Rise up to look over cover top"),
            ("COVER_BREAK",  "Break Cover",         "Step out from cover into open"),
        ],
    },
    "HAND_TO_HAND": {
        "label": "Hand-to-Hand Combat",
        "icon": "MOD_ARMATURE",
        "anims": [
            ("HTH_JAB",      "Left Jab",            "Quick snap punch with left fist"),
            ("HTH_CROSS",    "Right Cross",         "Powerful straight punch with right"),
            ("HTH_HOOK",     "Left Hook",           "Sweeping hook from the left"),
            ("HTH_UPPERCUT", "Uppercut",            "Rising punch up under guard"),
            ("HTH_KICK",     "Front Kick",          "Front-snap kick to midsection"),
            ("HTH_ROUNDHOUSE","Roundhouse",         "Spinning round kick"),
            ("HTH_COMBO",    "Combo (Jab-Cross-Kick)","3-hit combo sequence"),
            ("HTH_BLOCK",    "Block",               "Guard up, absorb hit"),
            ("HTH_DODGE_L",  "Dodge Left",          "Sidestep slip to the left"),
            ("HTH_DODGE_R",  "Dodge Right",         "Sidestep slip to the right"),
            ("HTH_GRAPPLE",  "Grapple Grab",        "Grab opponent by collar"),
            ("HTH_SHOVE",    "Shove",               "Two-hand push away"),
        ],
    },
    "SNEAK": {
        "label": "Sneak & Stealth",
        "icon": "HIDE_OFF",
        "anims": [
            ("SNEAK_IDLE",   "Sneak Idle",          "Crouched stealth stance"),
            ("SNEAK_WALK",   "Sneak Walk",          "Slow cautious crouch-walk"),
            ("SNEAK_ATK_F",  "Sneak Attack Front",  "Crouched lunge stab from front"),
            ("SNEAK_ATK_B",  "Sneak Attack Back",   "Grab and strike from behind"),
            ("SNEAK_ATK_L",  "Sneak Attack Left",   "Sweep attack from left side"),
            ("SNEAK_ATK_R",  "Sneak Attack Right",  "Sweep attack from right side"),
        ],
    },
    "REACTION": {
        "label": "Hit Reactions & Death",
        "icon": "FORCE_MAGNETIC",
        "anims": [
            ("HIT_F",        "Hit React Front",     "Stagger backward from frontal hit"),
            ("HIT_B",        "Hit React Back",      "Lurch forward from back hit"),
            ("HIT_L",        "Hit React Left",      "Spin right from left hit"),
            ("HIT_R",        "Hit React Right",     "Spin left from right hit"),
            ("STAGGER",      "Stagger",             "Stumble, struggle to stay upright"),
            ("DEATH_FWD",    "Death Forward",       "Crumple and fall forward"),
            ("DEATH_BWD",    "Death Backward",      "Fall backward, arms out"),
            ("DEATH_SIDE",   "Death Side",          "Collapse to one side"),
            ("DEATH_EPIC",   "Death Dramatic",      "Spin, stagger, dramatic fall"),
        ],
    },
    "CREATURE": {
        "label": "Creature-Specific",
        "icon": "MONKEY",
        "anims": [
            ("CREATURE_IDLE",   "Creature Idle",       "Low-threat idle, head swaying"),
            ("CREATURE_CHARGE", "Charge",              "Aggressive forward rush"),
            ("CREATURE_POUNCE", "Pounce",              "Leap forward onto target"),
            ("CREATURE_BITE",   "Bite Attack",         "Head lunges forward to bite"),
            ("CREATURE_CLAW_L", "Claw Left",           "Left claw swipe"),
            ("CREATURE_CLAW_R", "Claw Right",          "Right claw swipe"),
            ("CREATURE_CLAW_BOTH","Double Claw",       "Both claws slam down"),
            ("CREATURE_ROAR",   "Roar",                "Head rears back, roar pose"),
            ("CREATURE_RETREAT","Retreat",             "Back away, defensive posture"),
        ],
    },
    "SOCIAL": {
        "label": "Social & Interaction",
        "icon": "COMMUNITY",
        "anims": [
            ("SOCIAL_WAVE",     "Greeting Wave",       "Friendly wave of one hand"),
            ("SOCIAL_NOD",      "Head Nod",            "Affirmative nod"),
            ("SOCIAL_SHAKE",    "Head Shake",          "Negative head shake"),
            ("SOCIAL_POINT",    "Point",               "Arm extends to point at target"),
            ("SOCIAL_SHRUG",    "Shrug",               "Shoulder shrug — don't know"),
            ("SOCIAL_NERVOUS",  "Idle Nervous",        "Fidget, look around anxiously"),
            ("SOCIAL_PATROL",   "Patrol Look",         "Scanning left-right while walking"),
            ("SOCIAL_SEARCH",   "Search",              "Lean and look around carefully"),
            ("SOCIAL_SURRENDER","Hands Up",            "Both hands raise in surrender"),
            ("SOCIAL_TAUNT",    "Taunt",               "Beckoning 'come at me' gesture"),
        ],
    },
    "POWER_ARMOR": {
        "label": "Power Armor",
        "icon": "OBJECT_DATA",
        "anims": [
            ("PA_WALK",         "PA Walk",             "Heavy stomp walk cycle"),
            ("PA_PUNCH",        "PA Power Punch",      "Massive haymaker right punch"),
            ("PA_SLAM",         "PA Ground Slam",      "Both fists slam into ground"),
            ("PA_STOMP",        "PA Stomp",            "Raise foot and stomp down"),
            ("PA_SHOVE",        "PA Shove",            "Both-arm shockwave push"),
        ],
    },
}


# ---------------------------------------------------------------------------
# Keyword → animation type map for description parsing
# ---------------------------------------------------------------------------

KEYWORD_MAP: Dict[str, List[str]] = {
    # Movement
    "idle":       ["IDLE_STAND"], "stand":    ["IDLE_STAND"],
    "walk":       ["WALK"],       "walking":  ["WALK"],
    "run":        ["RUN"],        "running":  ["RUN"],
    "sprint":     ["SPRINT"],     "sprinting":["SPRINT"],
    "crouch":     ["CROUCH_IDLE","CROUCH_WALK"],
    "duck":       ["CROUCH_IDLE","COVER_PEEK"],
    "slide":      ["SLIDE"],
    "jump":       ["JUMP_START"],
    "dodge":      ["DODGE_ROLL","HTH_DODGE_L","HTH_DODGE_R"],
    "roll":       ["DODGE_ROLL"],
    # Cover
    "cover":      ["COVER_IDLE","COVER_L","COVER_R","COVER_PEEK"],
    "lean":       ["COVER_L","COVER_R"],
    "peek":       ["COVER_PEEK"],
    "hide":       ["COVER_IDLE"],
    # HTH
    "punch":      ["HTH_JAB","HTH_CROSS"],
    "jab":        ["HTH_JAB"],
    "cross":      ["HTH_CROSS"],
    "hook":       ["HTH_HOOK"],
    "uppercut":   ["HTH_UPPERCUT"],
    "kick":       ["HTH_KICK"],
    "roundhouse": ["HTH_ROUNDHOUSE"],
    "combo":      ["HTH_COMBO"],
    "block":      ["HTH_BLOCK"],
    "grapple":    ["HTH_GRAPPLE"],
    "shove":      ["HTH_SHOVE","PA_SHOVE"],
    "hand to hand":["HTH_JAB","HTH_CROSS","HTH_KICK","HTH_BLOCK","DODGE_ROLL"],
    "unarmed":    ["HTH_JAB","HTH_CROSS","HTH_KICK","HTH_BLOCK","DODGE_ROLL"],
    "fighting":   ["HTH_COMBO","HTH_KICK","HTH_BLOCK","HTH_DODGE_L"],
    # Sneak
    "sneak":      ["SNEAK_IDLE","SNEAK_WALK","SNEAK_ATK_F","SNEAK_ATK_B"],
    "stealth":    ["SNEAK_IDLE","SNEAK_WALK"],
    "sneak attack":["SNEAK_ATK_F","SNEAK_ATK_B","SNEAK_ATK_L","SNEAK_ATK_R"],
    "assassinate":["SNEAK_ATK_B","SNEAK_ATK_F"],
    # Reaction
    "hit":        ["HIT_F","HIT_B","STAGGER"],
    "stagger":    ["STAGGER"],
    "death":      ["DEATH_FWD","DEATH_BWD"],
    "die":        ["DEATH_FWD","DEATH_BWD","DEATH_SIDE"],
    "fall":       ["DEATH_FWD","DEATH_BWD"],
    # Creature
    "creature":   ["CREATURE_IDLE","CREATURE_CHARGE","CREATURE_BITE","CREATURE_ROAR"],
    "charge":     ["CREATURE_CHARGE"],
    "pounce":     ["CREATURE_POUNCE"],
    "bite":       ["CREATURE_BITE"],
    "claw":       ["CREATURE_CLAW_L","CREATURE_CLAW_R"],
    "roar":       ["CREATURE_ROAR"],
    # Social
    "wave":       ["SOCIAL_WAVE"],
    "greet":      ["SOCIAL_WAVE","SOCIAL_NOD"],
    "nod":        ["SOCIAL_NOD"],
    "point":      ["SOCIAL_POINT"],
    "shrug":      ["SOCIAL_SHRUG"],
    "nervous":    ["SOCIAL_NERVOUS","IDLE_STAND"],
    "patrol":     ["SOCIAL_PATROL"],
    "search":     ["SOCIAL_SEARCH"],
    "surrender":  ["SOCIAL_SURRENDER"],
    "hands up":   ["SOCIAL_SURRENDER"],
    "taunt":      ["SOCIAL_TAUNT"],
    # Power armor
    "power armor":["PA_WALK","PA_PUNCH","PA_SLAM"],
    "stomp":      ["PA_STOMP","CREATURE_CLAW_BOTH"],
    "slam":       ["PA_SLAM","CREATURE_CLAW_BOTH"],
}


def parse_npc_description(description: str) -> List[str]:
    """Map description text to animation type keys, preserving order + deduplicating."""
    d      = description.lower()
    result = []
    seen   = set()

    # Multi-word phrases first
    for phrase in ["hand to hand","sneak attack","power armor","hands up"]:
        if phrase in d:
            for anim in KEYWORD_MAP.get(phrase, []):
                if anim not in seen:
                    seen.add(anim)
                    result.append(anim)

    # Single keywords
    for kw, anims in KEYWORD_MAP.items():
        if len(kw.split()) > 1:
            continue   # already handled multi-word above
        if kw in d:
            for anim in anims:
                if anim not in seen:
                    seen.add(anim)
                    result.append(anim)

    # Mossy AI for nuanced requests
    if not result:
        try:
            from . import mossy_link
            all_keys = [k for cat in ANIM_CATEGORIES.values() for k,*_ in cat["anims"]]
            prompt = (
                f"A Fallout 4 NPC/creature mod needs animations. "
                f"User description: '{description}'\n\n"
                f"List needed animation types (comma-separated) from:\n"
                f"{', '.join(all_keys[:30])}\n"
                f"Reply ONLY with comma-separated keys."
            )
            resp = mossy_link.ask_mossy(prompt, fo4_context=True, max_tokens=80)
            if resp:
                for part in resp.replace('\n',',').split(','):
                    k = part.strip().upper()
                    if k in {a for cat in ANIM_CATEGORIES.values() for a,*_ in cat["anims"]}:
                        if k not in seen:
                            seen.add(k)
                            result.append(k)
        except Exception:
            pass

    return result or ["IDLE_STAND","HTH_JAB","HTH_CROSS","HTH_KICK"]


# ---------------------------------------------------------------------------
# Full-body keyframe generators
# ---------------------------------------------------------------------------

def _arm_obj_enter_pose(arm_obj):
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='POSE')


def _new_action(arm_obj, name):
    act = bpy.data.actions.new(name)
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = act
    return act


def _rk(pb, f, x=0, y=0, z=0):
    """Rotation keyframe shorthand."""
    pb.rotation_mode  = 'XYZ'
    pb.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
    pb.keyframe_insert("rotation_euler", frame=f)


def _lk(pb, f, x=0, y=0, z=0):
    pb.location = (x,y,z)
    pb.keyframe_insert("location", frame=f)


def _get(arm_obj, name):
    return arm_obj.pose.bones.get(name)


def _rest_all(arm_obj, frame):
    for pb in arm_obj.pose.bones:
        pb.rotation_mode  = 'XYZ'
        pb.rotation_euler = (0,0,0)
        pb.location       = (0,0,0)
        pb.keyframe_insert("rotation_euler", frame=frame)
        pb.keyframe_insert("location",       frame=frame)


# ----- MOVEMENT -----

def gen_idle_stand(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_idle_stand")
    _arm_obj_enter_pose(arm_obj)
    s, n = _get(arm_obj,"NPC Spine [Spn0]"), _get(arm_obj,"NPC Neck [Neck]")
    # Subtle breathing: spine rocks gently 90-frame loop
    for f in range(0, 91, 5):
        angle = 1.5 * math.sin(math.radians(f * 4))
        if s: _rk(s, f, angle, 0, 0)
        if n: _rk(n, f, -angle*0.5, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_crouch_idle(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_crouch_idle")
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    lt   = _get(arm_obj,"NPC L Thigh [LThg]")
    rt   = _get(arm_obj,"NPC R Thigh [RThg]")
    lc   = _get(arm_obj,"NPC L Calf [LClf]")
    rc   = _get(arm_obj,"NPC R Calf [RClf]")
    # Drop COM, bend knees and spine forward
    if root: _lk(root, 1, 0, 0, -0.35); _lk(root, 1, 0, 0, -0.35)
    if s0:   _rk(s0, 1, 20, 0, 0)
    if lt:   _rk(lt, 1,-60, 0, 0)
    if rt:   _rk(rt, 1,-60, 0, 0)
    if lc:   _rk(lc, 1, 80, 0, 0)
    if rc:   _rk(rc, 1, 80, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_slide(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_slide")
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    lt   = _get(arm_obj,"NPC L Thigh [LThg]")
    rt   = _get(arm_obj,"NPC R Thigh [RThg]")
    lc   = _get(arm_obj,"NPC L Calf [LClf]")
    la   = _get(arm_obj,"NPC L UpperArm [LUar]")
    ra   = _get(arm_obj,"NPC R UpperArm [RUar]")
    _rest_all(arm_obj, 0)
    if root: _lk(root, 6, 0, 0, -0.5)
    if s0:   _rk(s0, 6, -30, 0, 0)    # lean forward low
    if lt:   _rk(lt, 6, -10, 0, 20)   # left leg forward
    if rt:   _rk(rt, 6,-100, 0,-20)   # right leg pushed back
    if lc:   _rk(lc, 6,  20, 0, 0)
    if la:   _rk(la, 6,  40, 0, 10)   # arms out for balance
    if ra:   _rk(ra, 6,  40, 0,-10)
    # Hold then rise
    if root: _lk(root,25, 0, 0,-0.5); _lk(root,35, 0, 0, 0)
    if s0:   _rk(s0, 35, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_dodge_roll(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_dodge_roll")
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    s1   = _get(arm_obj,"NPC Spine1 [Spn1]")
    _rest_all(arm_obj, 0)
    if root: _lk(root,  5, 0, 0.1,-0.2); _lk(root,12, 0, 0.4,-0.05); _lk(root,20, 0, 0, 0)
    if s0:   _rk(s0,   5, 60, 0, 0);    _rk(s0,  12,90, 0, 0);       _rk(s0,  20, 0, 0, 0)
    if s1:   _rk(s1,   5, 30, 0, 0);    _rk(s1,  20, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


# ----- COVER -----

def gen_cover_idle(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_cover_idle")
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    n    = _get(arm_obj,"NPC Neck [Neck]")
    la   = _get(arm_obj,"NPC L UpperArm [LUar]")
    ra   = _get(arm_obj,"NPC R UpperArm [RUar]")
    _rest_all(arm_obj, 0)
    if root: _lk(root, 1, 0, 0,-0.15)
    if s0:   _rk(s0, 1, 10, 0, 0)
    if n:    _rk(n,  1, -5, 0, 0)   # head down
    if la:   _rk(la, 1, 0, 0, 40)   # arms up against wall
    if ra:   _rk(ra, 1, 0, 0,-40)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_cover_lean(arm_obj, side="L", **kw):
    name = f"FO4_cover_lean_{side.lower()}"
    act  = _new_action(arm_obj, name)
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s2   = _get(arm_obj,"NPC Spine2 [Spn2]")
    n    = _get(arm_obj,"NPC Neck [Neck]")
    sign = -1 if side == "L" else 1
    _rest_all(arm_obj, 0)
    # Lean out from cover
    if root: _lk(root, 1, sign*0.2, 0, 0)
    if s2:   _rk(s2,  1, 0, 0, sign*25)
    if n:    _rk(n,   1, 0, 0, sign*-10)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_cover_peek(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_cover_peek")
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    n    = _get(arm_obj,"NPC Neck [Neck]")
    _rest_all(arm_obj, 0)
    if root: _lk(root, 1, 0, 0, 0.15)   # rise up
    if s0:   _rk(s0,  1,-10, 0, 0)      # lean back slightly to look over
    if n:    _rk(n,   1,  5, 0, 0)      # head up
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


# ----- HAND TO HAND -----

def gen_hth_jab(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_hth_jab")
    _arm_obj_enter_pose(arm_obj)
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    lfa = _get(arm_obj,"NPC L Forearm [LLar]")
    s2  = _get(arm_obj,"NPC Spine2 [Spn2]")
    _rest_all(arm_obj, 0)
    if s2:  _rk(s2,  0, 0,  0,  0); _rk(s2,  4, 0,-10,  0); _rk(s2, 12, 0,  0,  0)
    if lua: _rk(lua, 0, 0, 80,  0); _rk(lua, 4, 0,-30,  0); _rk(lua,12, 0, 80,  0)
    if lfa: _rk(lfa, 0, 0, 80,  0); _rk(lfa, 4, 0,  5,  0); _rk(lfa,12, 0, 80,  0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_hth_cross(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_hth_cross")
    _arm_obj_enter_pose(arm_obj)
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    s2  = _get(arm_obj,"NPC Spine2 [Spn2]")
    _rest_all(arm_obj, 0)
    if s2:  _rk(s2,  0, 0,  0,  0); _rk(s2,  5, 0, 15,  0); _rk(s2, 15, 0,  0,  0)
    if rua: _rk(rua, 0, 0,-80,  0); _rk(rua, 5, 0, 25,  0); _rk(rua,15, 0,-80,  0)
    if rfa: _rk(rfa, 0, 0,-80,  0); _rk(rfa, 5, 0,-10,  0); _rk(rfa,15, 0,-80,  0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_hth_kick(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_hth_kick")
    _arm_obj_enter_pose(arm_obj)
    rt  = _get(arm_obj,"NPC R Thigh [RThg]")
    rc  = _get(arm_obj,"NPC R Calf [RClf]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    _rest_all(arm_obj, 0)
    if s0: _rk(s0, 0, 0, 0, 0); _rk(s0, 8,-15, 0, 0); _rk(s0,20, 0, 0, 0)
    if rt: _rk(rt, 0, 0, 0, 0); _rk(rt, 8, 80, 0, 0); _rk(rt,20, 0, 0, 0)
    if rc: _rk(rc, 0, 0, 0, 0); _rk(rc, 4,-40, 0, 0); _rk(rc, 8,-80, 0, 0); _rk(rc,20, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_hth_uppercut(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_hth_uppercut")
    _arm_obj_enter_pose(arm_obj)
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    _rest_all(arm_obj, 0)
    if s0:  _rk(s0,  0,-10, 0, 0); _rk(s0, 8, 10, 0, 0); _rk(s0,18, 0, 0, 0)
    if rua: _rk(rua, 0,-30,-60, 0);_rk(rua, 8, 30,-80, 0);_rk(rua,18, 0,-80, 0)
    if rfa: _rk(rfa, 0,  0,-40, 0);_rk(rfa, 8,-30,-20, 0);_rk(rfa,18, 0,-80, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_hth_roundhouse(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_hth_roundhouse")
    _arm_obj_enter_pose(arm_obj)
    s2  = _get(arm_obj,"NPC Spine2 [Spn2]")
    rt  = _get(arm_obj,"NPC R Thigh [RThg]")
    rc  = _get(arm_obj,"NPC R Calf [RClf]")
    _rest_all(arm_obj, 0)
    if s2: _rk(s2, 0, 0, 0,  0); _rk(s2, 5, 0, 0,-40); _rk(s2,12, 0, 0, 60); _rk(s2,22, 0, 0, 0)
    if rt: _rk(rt, 0, 0, 0,  0); _rk(rt,10, 0, 0, 90); _rk(rt,22, 0, 0, 0)
    if rc: _rk(rc, 0, 0, 0,  0); _rk(rc, 5,-40, 0, 0); _rk(rc,22, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_hth_combo(arm_obj, **kw):
    """Jab-Cross-Kick in sequence."""
    act = _new_action(arm_obj, "FO4_hth_combo")
    _arm_obj_enter_pose(arm_obj)
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    lfa = _get(arm_obj,"NPC L Forearm [LLar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    rt  = _get(arm_obj,"NPC R Thigh [RThg]")
    rc  = _get(arm_obj,"NPC R Calf [RClf]")
    s2  = _get(arm_obj,"NPC Spine2 [Spn2]")
    _rest_all(arm_obj, 0)
    # Jab (0-12)
    if lua: _rk(lua, 4, 0,-30, 0); _rk(lua,12, 0, 80, 0)
    if lfa: _rk(lfa, 4, 0,  5, 0); _rk(lfa,12, 0, 80, 0)
    # Cross (12-24)
    if s2:  _rk(s2, 16, 0, 15, 0); _rk(s2, 24, 0, 0, 0)
    if rua: _rk(rua,16, 0, 25, 0); _rk(rua,24, 0,-80, 0)
    if rfa: _rk(rfa,16, 0,-10, 0); _rk(rfa,24, 0,-80, 0)
    # Kick (24-40)
    if rt:  _rk(rt, 32, 80, 0, 0); _rk(rt, 40, 0, 0, 0)
    if rc:  _rk(rc, 28,-80, 0, 0); _rk(rc, 40, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_hth_block(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_hth_block")
    _arm_obj_enter_pose(arm_obj)
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    lfa = _get(arm_obj,"NPC L Forearm [LLar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    _rest_all(arm_obj, 0)
    if s0:  _rk(s0, 1, 15, 0, 0)          # hunch forward
    if lua: _rk(lua,1, 0, 60, 30)         # cross arms in front of face
    if rua: _rk(rua,1, 0,-60,-30)
    if lfa: _rk(lfa,1, 0, 90, 0)
    if rfa: _rk(rfa,1, 0,-90, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_hth_dodge(arm_obj, side="L", **kw):
    name = f"FO4_hth_dodge_{side.lower()}"
    act  = _new_action(arm_obj, name)
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s2   = _get(arm_obj,"NPC Spine2 [Spn2]")
    sign = 1 if side == "L" else -1
    _rest_all(arm_obj, 0)
    if root: _lk(root, 8, sign*0.25, 0, 0); _lk(root,20, 0, 0, 0)
    if s2:   _rk(s2,  8, 0, 0, sign*20);   _rk(s2, 20, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_hth_grapple(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_hth_grapple")
    _arm_obj_enter_pose(arm_obj)
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    lfa = _get(arm_obj,"NPC L Forearm [LLar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    _rest_all(arm_obj, 0)
    if s0:  _rk(s0, 8,-20, 0, 0)           # lunge forward
    if lua: _rk(lua,8, 0,-20, 30)          # grab with left
    if rua: _rk(rua,8, 0, 20,-30)          # grab with right
    if lfa: _rk(lfa,8, 0,-60, 0)
    if rfa: _rk(rfa,8, 0, 60, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_hth_shove(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_hth_shove")
    _arm_obj_enter_pose(arm_obj)
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    _rest_all(arm_obj, 0)
    if s0:  _rk(s0, 6,-25, 0, 0); _rk(s0,15, 0, 0, 0)
    if lua: _rk(lua,6, 0,-50, 0); _rk(lua,15, 0, 80, 0)
    if rua: _rk(rua,6, 0, 50, 0); _rk(rua,15, 0,-80, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


# ----- SNEAK -----

def gen_sneak_idle(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_sneak_idle")
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    n    = _get(arm_obj,"NPC Neck [Neck]")
    lt   = _get(arm_obj,"NPC L Thigh [LThg]")
    rt   = _get(arm_obj,"NPC R Thigh [RThg]")
    lc   = _get(arm_obj,"NPC L Calf [LClf]")
    rc   = _get(arm_obj,"NPC R Calf [RClf]")
    _rest_all(arm_obj, 0)
    if root: _lk(root,1, 0, 0,-0.25)
    if s0:   _rk(s0,1, 25, 0, 0)
    if n:    _rk(n, 1,-10, 0, 0)    # scan forward
    if lt:   _rk(lt,1,-55, 0, 0)
    if rt:   _rk(rt,1,-55, 0, 0)
    if lc:   _rk(lc,1, 70, 0, 0)
    if rc:   _rk(rc,1, 70, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_sneak_atk(arm_obj, direction="F", **kw):
    name = f"FO4_sneak_atk_{direction.lower()}"
    act  = _new_action(arm_obj, name)
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    rua  = _get(arm_obj,"NPC R UpperArm [RUar]")
    rfa  = _get(arm_obj,"NPC R Forearm [RLar]")
    signs = {"F":(0,0),"B":(0,180),"L":(-1,0),"R":(1,0)}
    sx, sz = signs.get(direction,(0,0))
    _rest_all(arm_obj, 0)
    # Start crouched
    if root: _lk(root,0, 0, 0,-0.25)
    if s0:   _rk(s0, 0, 20, 0, sz)
    # Lunge / stab
    if root: _lk(root,8, sx*0.15, 0.2,-0.15)
    if s0:   _rk(s0, 8,-10, 0, 0)
    if rua:  _rk(rua,4, 0,-30, 0); _rk(rua,8, 0,-60, 0)
    if rfa:  _rk(rfa,4, 0, 10, 0); _rk(rfa,8, 0,-20, 0)
    # Return
    if root: _lk(root,25, 0, 0,-0.25)
    if s0:   _rk(s0, 25, 20, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


# ----- REACTIONS & DEATH -----

def gen_hit_react(arm_obj, direction="F", **kw):
    name = f"FO4_hit_{direction.lower()}"
    act  = _new_action(arm_obj, name)
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    n    = _get(arm_obj,"NPC Neck [Neck]")
    _rest_all(arm_obj, 0)
    deltas = {"F":(0,0.1,0,-15),"B":(0,-0.08,0,20),"L":(0.12,0,0,0),"R":(-0.12,0,0,0)}
    lx,ly,_,rx = deltas.get(direction,(0,0.1,0,-15))
    if root: _lk(root, 4, lx, ly, 0); _lk(root,20, 0, 0, 0)
    if s0:   _rk(s0,  4, rx, 0, 0);   _rk(s0, 20, 0, 0, 0)
    if n:    _rk(n,   4,-rx*0.5,0,0); _rk(n,  20, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_stagger(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_stagger")
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    n    = _get(arm_obj,"NPC Neck [Neck]")
    lua  = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua  = _get(arm_obj,"NPC R UpperArm [RUar]")
    _rest_all(arm_obj, 0)
    if root: _lk(root, 8, 0.08, 0.12, 0); _lk(root,18,-0.05,-0.05,0); _lk(root,30,0,0,0)
    if s0:   _rk(s0,  8,-20, 0, 15); _rk(s0, 18,-10, 0,-10); _rk(s0, 30, 0, 0, 0)
    if lua:  _rk(lua, 8, 0, 40, 30); _rk(lua,30, 0, 80, 0)
    if rua:  _rk(rua, 8, 0,-40,-30); _rk(rua,30, 0,-80, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_death(arm_obj, direction="FWD", **kw):
    name = f"FO4_death_{direction.lower()}"
    act  = _new_action(arm_obj, name)
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    s1   = _get(arm_obj,"NPC Spine1 [Spn1]")
    n    = _get(arm_obj,"NPC Neck [Neck]")
    lt   = _get(arm_obj,"NPC L Thigh [LThg]")
    rt   = _get(arm_obj,"NPC R Thigh [RThg]")
    lc   = _get(arm_obj,"NPC L Calf [LClf]")
    rc   = _get(arm_obj,"NPC R Calf [RClf]")
    lua  = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua  = _get(arm_obj,"NPC R UpperArm [RUar]")
    _rest_all(arm_obj, 0)

    if direction == "FWD":
        if s0:   _rk(s0, 10, 60, 0, 0); _rk(s0, 20, 90, 0, 0)
        if s1:   _rk(s1, 10, 30, 0, 0); _rk(s1, 20, 45, 0, 0)
        if root: _lk(root,20, 0, 0,-0.9)
        if lt:   _rk(lt, 20,-20, 0, 0)
        if rt:   _rk(rt, 20,-20, 0, 0)
        if lc:   _rk(lc, 20, 30, 0, 0)
        if rc:   _rk(rc, 20, 30, 0, 0)
        if lua:  _rk(lua,20, 0, 80, 40)
        if rua:  _rk(rua,20, 0,-80,-40)
    elif direction == "BWD":
        if s0:   _rk(s0, 10,-60, 0, 0); _rk(s0,20,-90, 0, 0)
        if root: _lk(root,20, 0,-0.1,-0.9)
        if lua:  _rk(lua,15, 0, 90, 60)
        if rua:  _rk(rua,15, 0,-90,-60)
    elif direction == "SIDE":
        if s0:   _rk(s0, 10, 20, 0, 60); _rk(s0,20, 0, 0, 90)
        if root: _lk(root,20, 0.4, 0,-0.9)
    elif direction == "EPIC":
        if s0:   _rk(s0, 5,-10,0,0); _rk(s0,12,40,0,30); _rk(s0,20,80,0,0)
        if n:    _rk(n,  8,-20,0,0); _rk(n, 20,-5,0,0)
        if root: _lk(root,8,0.1,0,0); _lk(root,20,0,0,-0.9)
        if lua:  _rk(lua,12,0,90,60); _rk(lua,20,0,80,40)
        if rua:  _rk(rua,12,0,-60,-40);_rk(rua,20,0,-80,-40)

    bpy.ops.object.mode_set(mode='OBJECT')
    return act


# ----- CREATURE -----

def gen_creature_idle(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_creature_idle")
    _arm_obj_enter_pose(arm_obj)
    s0 = _get(arm_obj,"NPC Spine [Spn0]")
    n  = _get(arm_obj,"NPC Neck [Neck]")
    for f in range(0,61,5):
        angle = 8 * math.sin(math.radians(f*6))
        if s0: _rk(s0,f,angle,0,0)
        if n:  _rk(n, f,-angle*0.5,0,angle*0.3)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_creature_charge(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_creature_charge")
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    n    = _get(arm_obj,"NPC Neck [Neck]")
    _rest_all(arm_obj, 0)
    if s0:   _rk(s0, 0, 0,0,0); _rk(s0, 5,-30,0,0)
    if n:    _rk(n,  5,-15,0,0)
    if root: _lk(root,5, 0, 0.4, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_creature_pounce(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_creature_pounce")
    _arm_obj_enter_pose(arm_obj)
    root = _get(arm_obj,"NPC COM [COM ]")
    s0   = _get(arm_obj,"NPC Spine [Spn0]")
    lt   = _get(arm_obj,"NPC L Thigh [LThg]")
    rt   = _get(arm_obj,"NPC R Thigh [RThg]")
    lc   = _get(arm_obj,"NPC L Calf [LClf]")
    rc   = _get(arm_obj,"NPC R Calf [RClf]")
    _rest_all(arm_obj, 0)
    # Crouch low first
    if root: _lk(root,5, 0, 0,-0.3); _lk(root,12, 0, 0.5, 0.3)
    if s0:   _rk(s0, 5,20, 0, 0);   _rk(s0, 12,-40, 0, 0)
    if lt:   _rk(lt, 5,-60,0,0);    _rk(lt, 12,-20, 0, 0)
    if rt:   _rk(rt, 5,-60,0,0);    _rk(rt, 12,-20, 0, 0)
    if lc:   _rk(lc, 5,90, 0, 0);   _rk(lc, 12, 30, 0, 0)
    if rc:   _rk(rc, 5,90, 0, 0);   _rk(rc, 12, 30, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_creature_bite(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_creature_bite")
    _arm_obj_enter_pose(arm_obj)
    s0 = _get(arm_obj,"NPC Spine [Spn0]")
    n  = _get(arm_obj,"NPC Neck [Neck]")
    _rest_all(arm_obj, 0)
    if s0: _rk(s0, 0, 0,0,0); _rk(s0,4,-30,0,0); _rk(s0,8,20,0,0); _rk(s0,18,0,0,0)
    if n:  _rk(n,  0, 0,0,0); _rk(n, 4,-20,0,0); _rk(n, 8,10,0,0); _rk(n, 18,0,0,0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_creature_claw(arm_obj, side="L", **kw):
    name = f"FO4_creature_claw_{side.lower()}"
    act  = _new_action(arm_obj, name)
    _arm_obj_enter_pose(arm_obj)
    prefix = "NPC L " if side=="L" else "NPC R "
    sign   = 1 if side=="L" else -1
    ua  = _get(arm_obj, prefix + "UpperArm [LUar]" if side=="L" else prefix + "UpperArm [RUar]")
    fa  = _get(arm_obj, prefix + "Forearm [LLar]"  if side=="L" else prefix + "Forearm [RLar]")
    s2  = _get(arm_obj,"NPC Spine2 [Spn2]")
    _rest_all(arm_obj, 0)
    if s2: _rk(s2,6, 0, 0, sign*20)
    if ua: _rk(ua,0, 0,sign*-80, 0); _rk(ua,6, 0, sign*30, 0); _rk(ua,15, 0, sign*-80, 0)
    if fa: _rk(fa,6, 0, sign*20,  0); _rk(fa,15, 0, sign*-80, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_creature_roar(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_creature_roar")
    _arm_obj_enter_pose(arm_obj)
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    s2  = _get(arm_obj,"NPC Spine2 [Spn2]")
    n   = _get(arm_obj,"NPC Neck [Neck]")
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    _rest_all(arm_obj, 0)
    if s0:  _rk(s0, 8,-25, 0, 0); _rk(s0,20, 0, 0, 0)
    if s2:  _rk(s2, 8,-15, 0, 0)
    if n:   _rk(n,  8,-30, 0, 0); _rk(n, 20, 0, 0, 0)
    if lua: _rk(lua,8, 0, 80,60); _rk(lua,20, 0, 80, 0)
    if rua: _rk(rua,8, 0,-80,-60);_rk(rua,20, 0,-80, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


# ----- SOCIAL -----

def gen_social_wave(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_social_wave")
    _arm_obj_enter_pose(arm_obj)
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    _rest_all(arm_obj, 0)
    if rua: _rk(rua, 5, 0,-90, 0)
    for f in range(5,46,8):
        angle = 20 * math.sin(math.radians((f-5)*45))
        if rfa: _rk(rfa,f, 0,-80+angle, 0)
    if rua: _rk(rua,48, 0,-80, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_social_point(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_social_point")
    _arm_obj_enter_pose(arm_obj)
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    s2  = _get(arm_obj,"NPC Spine2 [Spn2]")
    n   = _get(arm_obj,"NPC Neck [Neck]")
    _rest_all(arm_obj, 0)
    if s2:  _rk(s2,  8, 0, 15, 0)
    if n:   _rk(n,   8,-5, 10, 0)
    if rua: _rk(rua, 8, 0,-30, 0)
    if rfa: _rk(rfa, 8, 0, 10, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_social_surrender(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_social_surrender")
    _arm_obj_enter_pose(arm_obj)
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    lfa = _get(arm_obj,"NPC L Forearm [LLar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    n   = _get(arm_obj,"NPC Neck [Neck]")
    _rest_all(arm_obj, 0)
    if lua: _rk(lua,10, 0, 90, 80)
    if rua: _rk(rua,10, 0,-90,-80)
    if lfa: _rk(lfa,10, 0, 0, 0)
    if rfa: _rk(rfa,10, 0, 0, 0)
    if n:   _rk(n,  10,-10, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_social_taunt(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_social_taunt")
    _arm_obj_enter_pose(arm_obj)
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    lfa = _get(arm_obj,"NPC L Forearm [LLar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    s2  = _get(arm_obj,"NPC Spine2 [Spn2]")
    _rest_all(arm_obj, 0)
    if s2:  _rk(s2,  5, 0, 0,  0); _rk(s2, 15, 0,-10,  0); _rk(s2,25, 0, 0, 0)
    if lua: _rk(lua, 5, 0, 60, 30)
    if rua: _rk(rua, 5, 0,-60,-30)
    for f in range(5,35,5):
        curl = 20*math.sin(math.radians((f-5)*36))
        if lfa: _rk(lfa,f, 0, 60+curl, 0)
        if rfa: _rk(rfa,f, 0,-60-curl, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_social_nervous(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_social_nervous")
    _arm_obj_enter_pose(arm_obj)
    s0 = _get(arm_obj,"NPC Spine [Spn0]")
    n  = _get(arm_obj,"NPC Neck [Neck]")
    for f in range(0,91,5):
        angle_s = 2*math.sin(math.radians(f*4))
        angle_n = 15*math.sin(math.radians(f*6+20))
        if s0: _rk(s0,f,angle_s,0,0)
        if n:  _rk(n, f,-5,0,angle_n)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_social_shrug(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_social_shrug")
    _arm_obj_enter_pose(arm_obj)
    lc = _get(arm_obj,"NPC L Clavicle [LClv]")
    rc = _get(arm_obj,"NPC R Clavicle [RClv]")
    lfa= _get(arm_obj,"NPC L Forearm [LLar]")
    rfa= _get(arm_obj,"NPC R Forearm [RLar]")
    n  = _get(arm_obj,"NPC Neck [Neck]")
    _rest_all(arm_obj, 0)
    if lc:  _rk(lc, 8,-20, 0, 0); _rk(lc, 18, 0, 0, 0)
    if rc:  _rk(rc, 8,-20, 0, 0); _rk(rc, 18, 0, 0, 0)
    if lfa: _rk(lfa,8, 0, 60, 30); _rk(lfa,18, 0, 80, 0)
    if rfa: _rk(rfa,8, 0,-60,-30); _rk(rfa,18, 0,-80, 0)
    if n:   _rk(n,  8, 5,  0,  0); _rk(n,  18, 0,  0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


# ----- POWER ARMOR -----

def gen_pa_punch(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_pa_power_punch")
    _arm_obj_enter_pose(arm_obj)
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    s2  = _get(arm_obj,"NPC Spine2 [Spn2]")
    _rest_all(arm_obj, 0)
    if s0:  _rk(s0, 0, 0, 0, 0); _rk(s0,10,-15, 0, 0); _rk(s0,25, 0, 0, 0)
    if s2:  _rk(s2, 0, 0, 0, 0); _rk(s2, 8, 0, 30, 0); _rk(s2,25, 0, 0, 0)
    if rua: _rk(rua,0, 0,-80, 0); _rk(rua,8, 0,  0, 0); _rk(rua,12, 0, 40, 0); _rk(rua,25, 0,-80, 0)
    if rfa: _rk(rfa,0, 0,-80, 0); _rk(rfa,12, 0,  5, 0); _rk(rfa,25, 0,-80, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_pa_slam(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_pa_slam")
    _arm_obj_enter_pose(arm_obj)
    root= _get(arm_obj,"NPC COM [COM ]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    lfa = _get(arm_obj,"NPC L Forearm [LLar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    _rest_all(arm_obj, 0)
    if s0:  _rk(s0, 8,-40, 0, 0); _rk(s0,18,-10, 0, 0); _rk(s0,30, 0, 0, 0)
    if lua: _rk(lua,5, 0, 80,60);  _rk(lua,8, 0, 30,20); _rk(lua,30, 0, 80, 0)
    if rua: _rk(rua,5, 0,-80,-60); _rk(rua,8, 0,-30,-20);_rk(rua,30, 0,-80, 0)
    if lfa: _rk(lfa,8, 0, 60, 0)
    if rfa: _rk(rfa,8, 0,-60, 0)
    if root:_lk(root,8, 0, 0,-0.15); _lk(root,18, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_pa_stomp(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_pa_stomp")
    _arm_obj_enter_pose(arm_obj)
    root= _get(arm_obj,"NPC COM [COM ]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    rt  = _get(arm_obj,"NPC R Thigh [RThg]")
    rc  = _get(arm_obj,"NPC R Calf [RClf]")
    _rest_all(arm_obj, 0)
    if s0:  _rk(s0,  8,-20, 0, 0); _rk(s0,18, 0, 0, 0)
    if rt:  _rk(rt,  8, 80, 0, 0); _rk(rt,16, 0, 0, 0)
    if rc:  _rk(rc,  4,-30, 0, 0); _rk(rc,16, 0, 0, 0)
    if root:_lk(root,16, 0, 0,-0.1); _lk(root,22, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_pa_walk(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_pa_walk")
    _arm_obj_enter_pose(arm_obj)
    root= _get(arm_obj,"NPC COM [COM ]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    lt  = _get(arm_obj,"NPC L Thigh [LThg]")
    rt  = _get(arm_obj,"NPC R Thigh [RThg]")
    lc  = _get(arm_obj,"NPC L Calf [LClf]")
    rc  = _get(arm_obj,"NPC R Calf [RClf]")
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    total = 60  # 2-second stomp walk loop
    for f in range(0, total+1, 3):
        phase = f * 360 / total
        if s0:  _rk(s0,  f, 5, 0, 5*math.sin(math.radians(phase*2)))
        if lt:  _rk(lt,  f, 35*math.sin(math.radians(phase)), 0, 0)
        if rt:  _rk(rt,  f,-35*math.sin(math.radians(phase)), 0, 0)
        if lc:  _rk(lc,  f,-max(0,20*math.sin(math.radians(phase+90))), 0, 0)
        if rc:  _rk(rc,  f,-max(0,20*math.sin(math.radians(phase-90))), 0, 0)
        if lua: _rk(lua, f, 0, 20*math.sin(math.radians(phase+180)), 0)
        if rua: _rk(rua, f, 0,-20*math.sin(math.radians(phase)), 0)
        if root:_lk(root, f, 0, 0, 0.03*math.sin(math.radians(phase*2)))
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


def gen_pa_shove(arm_obj, **kw):
    act = _new_action(arm_obj, "FO4_pa_shove")
    _arm_obj_enter_pose(arm_obj)
    lua = _get(arm_obj,"NPC L UpperArm [LUar]")
    rua = _get(arm_obj,"NPC R UpperArm [RUar]")
    lfa = _get(arm_obj,"NPC L Forearm [LLar]")
    rfa = _get(arm_obj,"NPC R Forearm [RLar]")
    s0  = _get(arm_obj,"NPC Spine [Spn0]")
    _rest_all(arm_obj, 0)
    if s0:  _rk(s0, 6,-30,0,0); _rk(s0,20, 0, 0, 0)
    if lua: _rk(lua,6, 0,-40,30); _rk(lua,20, 0, 80, 0)
    if rua: _rk(rua,6, 0, 40,-30);_rk(rua,20, 0,-80, 0)
    if lfa: _rk(lfa,6, 0,-20, 0)
    if rfa: _rk(rfa,6, 0, 20, 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return act


# ---------------------------------------------------------------------------
# Generator registry
# ---------------------------------------------------------------------------

_GENERATORS = {
    "IDLE_STAND":      gen_idle_stand,
    "CROUCH_IDLE":     gen_crouch_idle,
    "SLIDE":           gen_slide,
    "DODGE_ROLL":      gen_dodge_roll,
    "COVER_IDLE":      gen_cover_idle,
    "COVER_L":         lambda a,**k: gen_cover_lean(a,"L"),
    "COVER_R":         lambda a,**k: gen_cover_lean(a,"R"),
    "COVER_PEEK":      gen_cover_peek,
    "HTH_JAB":         gen_hth_jab,
    "HTH_CROSS":       gen_hth_cross,
    "HTH_HOOK":        lambda a,**k: gen_hth_jab(a),     # reuse jab with mirrored pose
    "HTH_UPPERCUT":    gen_hth_uppercut,
    "HTH_KICK":        gen_hth_kick,
    "HTH_ROUNDHOUSE":  gen_hth_roundhouse,
    "HTH_COMBO":       gen_hth_combo,
    "HTH_BLOCK":       gen_hth_block,
    "HTH_DODGE_L":     lambda a,**k: gen_hth_dodge(a,"L"),
    "HTH_DODGE_R":     lambda a,**k: gen_hth_dodge(a,"R"),
    "HTH_GRAPPLE":     gen_hth_grapple,
    "HTH_SHOVE":       gen_hth_shove,
    "SNEAK_IDLE":      gen_sneak_idle,
    "SNEAK_WALK":      gen_sneak_idle,   # placeholder — same pose, walk added
    "SNEAK_ATK_F":     lambda a,**k: gen_sneak_atk(a,"F"),
    "SNEAK_ATK_B":     lambda a,**k: gen_sneak_atk(a,"B"),
    "SNEAK_ATK_L":     lambda a,**k: gen_sneak_atk(a,"L"),
    "SNEAK_ATK_R":     lambda a,**k: gen_sneak_atk(a,"R"),
    "HIT_F":           lambda a,**k: gen_hit_react(a,"F"),
    "HIT_B":           lambda a,**k: gen_hit_react(a,"B"),
    "HIT_L":           lambda a,**k: gen_hit_react(a,"L"),
    "HIT_R":           lambda a,**k: gen_hit_react(a,"R"),
    "STAGGER":         gen_stagger,
    "DEATH_FWD":       lambda a,**k: gen_death(a,"FWD"),
    "DEATH_BWD":       lambda a,**k: gen_death(a,"BWD"),
    "DEATH_SIDE":      lambda a,**k: gen_death(a,"SIDE"),
    "DEATH_EPIC":      lambda a,**k: gen_death(a,"EPIC"),
    "CREATURE_IDLE":   gen_creature_idle,
    "CREATURE_CHARGE": gen_creature_charge,
    "CREATURE_POUNCE": gen_creature_pounce,
    "CREATURE_BITE":   gen_creature_bite,
    "CREATURE_CLAW_L": lambda a,**k: gen_creature_claw(a,"L"),
    "CREATURE_CLAW_R": lambda a,**k: gen_creature_claw(a,"R"),
    "CREATURE_CLAW_BOTH": lambda a,**k: (gen_creature_claw(a,"L"), gen_creature_claw(a,"R"))[0],
    "CREATURE_ROAR":   gen_creature_roar,
    "CREATURE_RETREAT":gen_creature_idle,
    "SOCIAL_WAVE":     gen_social_wave,
    "SOCIAL_NOD":      gen_social_nervous,
    "SOCIAL_SHAKE":    gen_social_nervous,
    "SOCIAL_POINT":    gen_social_point,
    "SOCIAL_SHRUG":    gen_social_shrug,
    "SOCIAL_NERVOUS":  gen_social_nervous,
    "SOCIAL_PATROL":   gen_social_nervous,
    "SOCIAL_SEARCH":   gen_social_nervous,
    "SOCIAL_SURRENDER":gen_social_surrender,
    "SOCIAL_TAUNT":    gen_social_taunt,
    "PA_WALK":         gen_pa_walk,
    "PA_PUNCH":        gen_pa_punch,
    "PA_SLAM":         gen_pa_slam,
    "PA_STOMP":        gen_pa_stomp,
    "PA_SHOVE":        gen_pa_shove,
}


def generate_npc_animations(arm_obj, anim_keys: List[str]) -> List[bpy.types.Action]:
    actions = []
    for key in anim_keys:
        gen = _GENERATORS.get(key)
        if gen:
            try:
                act = gen(arm_obj)
                if isinstance(act, bpy.types.Action):
                    actions.append(act)
                    print(f"[FO4 NPC] Generated: {act.name}")
            except Exception as exc:
                print(f"[FO4 NPC] Failed {key}: {exc}")
    return actions


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class FO4_OT_SetNPCPreset(bpy.types.Operator):
    bl_idname  = "fo4.set_npc_preset"
    bl_label   = "Set NPC Preset"
    bl_options = {'INTERNAL'}
    preset: bpy.props.StringProperty(default="")
    def execute(self, context):
        if hasattr(context.scene, 'fo4_npc_description'):
            context.scene.fo4_npc_description = self.preset
        return {'FINISHED'}


class FO4_OT_GenerateNPCAnimations(bpy.types.Operator):
    """Generate NPC/creature animations from a text description.

    Select the NPC armature and describe what you want — the system
    generates all matching animation actions automatically.
    """
    bl_idname  = "fo4.generate_npc_animations"
    bl_label   = "Generate NPC Animations"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        arm = context.active_object
        if not arm or arm.type != 'ARMATURE':
            self.report({'ERROR'}, "Select an armature first")
            return {'CANCELLED'}
        desc  = getattr(context.scene, 'fo4_npc_description', '')
        keys  = parse_npc_description(desc)
        acts  = generate_npc_animations(arm, keys)
        if not acts:
            self.report({'WARNING'}, "No animations generated — try rephrasing")
            return {'CANCELLED'}
        self.report({'INFO'},
            f"Generated {len(acts)} animation(s): {', '.join(a.name for a in acts)}")
        return {'FINISHED'}


class FO4_OT_NPCFullPipeline(bpy.types.Operator):
    """Find or build FO4 skeleton then generate all described animations."""
    bl_idname  = "fo4.npc_full_pipeline"
    bl_label   = "Full NPC Animation Pipeline"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        from . import fo4_armor_animation as _fa
        arm = _fa.find_fo4_skeleton_in_scene()
        if arm is None:
            arm = _fa.build_reference_skeleton()
            self.report({'INFO'}, "Built FO4 reference skeleton")

        bpy.context.view_layer.objects.active = arm
        desc = getattr(context.scene, 'fo4_npc_description', 'hand to hand fighting')
        keys = parse_npc_description(desc)
        acts = generate_npc_animations(arm, keys)
        self.report({'INFO'},
            f"NPC pipeline: {len(arm.data.bones)} bones, {len(acts)} animation(s) generated")
        return {'FINISHED'}


_CLASSES = [
    FO4_OT_SetNPCPreset,
    FO4_OT_GenerateNPCAnimations,
    FO4_OT_NPCFullPipeline,
]


def register():
    try:
        bpy.types.Scene.fo4_npc_description = bpy.props.StringProperty(
            name="NPC/Creature Animation Description",
            description="Describe what the NPC or creature does",
            default="hand to hand combat fighting",
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
        del bpy.types.Scene.fo4_npc_description
    except Exception:
        pass
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
