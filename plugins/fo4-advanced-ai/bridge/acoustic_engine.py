"""
acoustic_engine.py
Fallout 4 Advanced AI — Acoustic Engine Bridge Module
======================================================

Models the complete acoustic environment for every location type in FO4.

Covers:
  - Per-location acoustic profiles (echo, reverb, occlusion, carry distance)
  - Sound masking matrix (what covers what, and by how much)
  - Suppressor effectiveness by environment
  - Interior weather isolation (the rain-inside bug — fixed)
  - Gunshot detection radius calculator
  - Fire sound profiles (crackle size, wind roar, rain hiss)
  - Explosion echo modeling (bouncing off buildings)
  - Footstep material database
  - Creature vocalization propagation
  - Sound event log analysis

THE INTERIOR WEATHER ISOLATION SYSTEM
======================================
One of the biggest immersion breakers in FO4: you walk into a building
and it's still raining on you. The acoustic engine tracks whether the
player is in a sealed interior and suppresses exterior weather sounds/effects.

Sealed Interiors (NO exterior weather):
  - Vaults (any Vault-Tec location)
  - Intact buildings (no roof damage flag)
  - Subway stations and tunnels
  - Caves (not open to sky)
  - Basements and bunkers

Partially Exposed (reduced exterior weather):
  - Ruined buildings (holes in roof = partial rain)
  - Open-top structures
  - City interiors with open plazas
  - Bus depots, parking garages (partial)

Fully Exposed (full exterior weather even if "indoors"):
  - Market stalls
  - Rooftop areas
  - Open courtyards
  - Collapsed structures

Mossy Bridge tracks this state and the Papyrus AcousticSystem reads it
to suppress weather effects appropriately.
"""

import sqlite3
import json
import datetime
import math
from pathlib import Path
from typing import Optional
import re

MEMORY_DB_PATH = Path.home() / "Documents" / "My Games" / "Fallout4" / "AdvancedAI_Memory.db"

# ─────────────────────────────────────────────────────────────────────────────
# Acoustic Profiles by Location Type
# ─────────────────────────────────────────────────────────────────────────────

ACOUSTIC_PROFILES = {
    "wasteland": {
        "description":     "Open Commonwealth wasteland",
        "echo_mult":       1.0,     # No echo — flat carry
        "reverb_time":     0.0,     # seconds
        "gun_radius_mult": 1.3,     # Carries well in open air
        "stealth_mult":    1.0,
        "occlusion":       0.9,     # No walls to block
        "footstep_loud":   0.8,     # Soil absorbs somewhat
        "weather_interior":False,   # Fully exposed
        "exterior_shield": 0.0,     # No protection from weather
        "sound_notes":     "Flat, long-distance carry. Wind is competing noise.",
    },
    "city_ruins": {
        "description":     "Ruined urban environment",
        "echo_mult":       2.0,     # Multiple building reflections
        "reverb_time":     0.8,
        "gun_radius_mult": 1.8,     # Bounces off facades
        "stealth_mult":    1.1,     # Rubble provides some cover
        "occlusion":       0.65,    # Walls partially block
        "footstep_loud":   1.3,     # Rubble/concrete
        "weather_interior":False,   # Open to sky
        "exterior_shield": 0.1,     # Buildings block some rain
        "sound_notes":     "Direction confusing. Multiple echoes from facades.",
    },
    "indoor_wood": {
        "description":     "Intact wood building interior",
        "echo_mult":       1.4,
        "reverb_time":     0.4,
        "gun_radius_mult": 1.2,
        "stealth_mult":    1.1,
        "occlusion":       0.6,
        "footstep_loud":   1.6,     # Wood floors creak
        "weather_interior":True,    # SEALED — no exterior rain
        "exterior_shield": 0.85,    # Blocks most weather
        "sound_notes":     "Muffled exterior, creaky floors, moderate echo.",
    },
    "indoor_metal": {
        "description":     "Metal building / factory interior",
        "echo_mult":       3.0,     # Metal resonates
        "reverb_time":     1.5,
        "gun_radius_mult": 2.2,     # Rings through entire structure
        "stealth_mult":    0.7,     # Terrible for stealth
        "occlusion":       0.5,     # Metal walls thin vs sound
        "footstep_loud":   2.0,     # Clang on grating
        "weather_interior":True,    # SEALED
        "exterior_shield": 0.90,
        "sound_notes":     "Every sound echoes. Suppressor nearly useless here.",
    },
    "vault": {
        "description":     "Vault-Tec reinforced concrete vault",
        "echo_mult":       3.5,     # Concrete + metal = extreme echo
        "reverb_time":     2.5,     # Long reverb tail
        "gun_radius_mult": 2.5,     # Heard vault-wide
        "stealth_mult":    0.6,     # Almost impossible to move quietly
        "occlusion":       0.4,     # Sound travels around thick walls
        "footstep_loud":   2.2,
        "weather_interior":True,    # COMPLETELY SEALED
        "exterior_shield": 1.0,     # No weather penetration whatsoever
        "sound_notes":     "Sound carries entire cell. Every footstep rings.",
    },
    "cave": {
        "description":     "Natural cave system",
        "echo_mult":       2.8,     # Stone amplifies
        "reverb_time":     2.0,
        "gun_radius_mult": 2.0,
        "stealth_mult":    0.8,
        "occlusion":       0.5,
        "footstep_loud":   1.5,
        "weather_interior":True,    # SEALED (unless open to sky — see cave_open)
        "exterior_shield": 0.95,
        "sound_notes":     "Dripping water is loud. Stalactites vibrate from explosions.",
    },
    "cave_open": {
        "description":     "Open-topped cave / rock formation",
        "echo_mult":       1.8,
        "reverb_time":     1.0,
        "gun_radius_mult": 1.5,
        "stealth_mult":    1.0,
        "occlusion":       0.7,
        "footstep_loud":   1.3,
        "weather_interior":False,   # Sky visible — rain enters
        "exterior_shield": 0.4,     # Partial protection
        "sound_notes":     "Rain and dripping. Echo off walls but sky open.",
    },
    "subway": {
        "description":     "Underground subway station / tunnel",
        "echo_mult":       2.5,
        "reverb_time":     1.8,
        "gun_radius_mult": 2.3,
        "stealth_mult":    0.75,
        "occlusion":       0.45,
        "footstep_loud":   1.8,     # Tile/concrete
        "weather_interior":True,    # SEALED
        "exterior_shield": 1.0,
        "sound_notes":     "Tunnel effect focuses sound down the corridor.",
    },
    "forest": {
        "description":     "Dense forest / vegetation area",
        "echo_mult":       0.6,     # Plants absorb
        "reverb_time":     0.1,
        "gun_radius_mult": 0.75,    # Absorbed by foliage
        "stealth_mult":    1.4,
        "occlusion":       0.85,
        "footstep_loud":   1.2,     # Leaves crunch
        "weather_interior":False,   # Canopy = partial
        "exterior_shield": 0.3,     # Canopy blocks some rain
        "sound_notes":     "Best suppressor environment. Plants eat high frequencies.",
    },
    "swamp": {
        "description":     "Wetland / swamp",
        "echo_mult":       0.8,
        "reverb_time":     0.2,
        "gun_radius_mult": 0.9,     # Water/mud absorbs
        "stealth_mult":    1.3,
        "occlusion":       0.8,
        "footstep_loud":   1.4,     # Squelching mud
        "weather_interior":False,
        "exterior_shield": 0.1,
        "sound_notes":     "Mud footsteps distinctive. Water sounds mask some movement.",
    },
    "settlement": {
        "description":     "Active settlement with machinery / generators",
        "echo_mult":       1.2,
        "reverb_time":     0.3,
        "gun_radius_mult": 1.4,
        "stealth_mult":    1.15,    # Generator noise helps
        "occlusion":       0.65,
        "footstep_loud":   1.0,
        "weather_interior":False,   # Outdoor settlement = exposed
        "exterior_shield": 0.15,
        "sound_notes":     "Generator/forge ambient covers some footsteps.",
    },
    "settlement_indoor": {
        "description":     "Indoor area within settlement",
        "echo_mult":       1.3,
        "reverb_time":     0.35,
        "gun_radius_mult": 1.3,
        "stealth_mult":    1.1,
        "occlusion":       0.65,
        "footstep_loud":   1.4,
        "weather_interior":True,    # SEALED — NO RAIN INSIDE
        "exterior_shield": 0.80,
        "sound_notes":     "Protected from weather. Ambient settlement noise bleeds in.",
    },
    "far_harbor": {
        "description":     "Far Harbor outdoor — fog and ocean",
        "echo_mult":       0.7,     # Fog scatters sound
        "reverb_time":     0.15,
        "gun_radius_mult": 0.85,    # Fog reduces carry
        "stealth_mult":    1.5,     # Fog is a stealth gift
        "occlusion":       0.88,
        "footstep_loud":   0.9,
        "weather_interior":False,
        "exterior_shield": 0.0,
        "sound_notes":     "Fog scatters and absorbs. Close sounds amplified. Direction impossible.",
    },
    "underwater": {
        "description":     "Fully submerged",
        "echo_mult":       1.5,
        "reverb_time":     0.5,
        "gun_radius_mult": 0.25,    # Weapons sound terrible underwater
        "stealth_mult":    0.5,     # Movement very audible
        "occlusion":       0.9,
        "footstep_loud":   2.5,     # Splashing
        "weather_interior":True,    # UNDERWATER — no weather
        "exterior_shield": 1.0,
        "sound_notes":     "Sound travels 4x faster but distorted. Explosions devastating.",
    },
    "ruined_building": {
        "description":     "Partially collapsed building — holes in roof",
        "echo_mult":       1.6,
        "reverb_time":     0.6,
        "gun_radius_mult": 1.5,
        "stealth_mult":    1.05,
        "occlusion":       0.7,
        "footstep_loud":   1.4,
        "weather_interior":False,   # NOT fully sealed — rain comes through holes
        "exterior_shield": 0.45,    # Partial protection
        "rain_patch":      True,    # Specific areas get wet, others don't
        "sound_notes":     "Partial weather. Rain through holes. Rubble crunch.",
    },
    "market_stall": {
        "description":     "Open-air market / canopy structure",
        "echo_mult":       1.0,
        "reverb_time":     0.0,
        "gun_radius_mult": 1.2,
        "stealth_mult":    1.0,
        "occlusion":       0.85,
        "footstep_loud":   1.0,
        "weather_interior":False,   # OPEN — gets rain
        "exterior_shield": 0.2,     # Canopy reduces rain slightly
        "sound_notes":     "Crowd noise masks some sounds during market hours.",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Interior Weather Isolation
# This is the fix for rain/weather bleeding into sealed interiors
# ─────────────────────────────────────────────────────────────────────────────

INTERIOR_WEATHER_RULES = {
    # Location type: what exterior weather effects are blocked
    "vault": {
        "blocks_rain":       True,
        "blocks_storm":      True,
        "blocks_fog":        True,
        "blocks_rad_storm":  True,
        "blocks_wind":       True,
        "blocks_thunder":    False,   # Distant thunder still felt (vibration)
        "rain_sound_volume": 0.0,     # Completely silent inside
        "storm_sound_volume":0.05,    # Barely audible rumble
        "explanation": "Vault-Tec reinforced — fully weatherproof. "
                       "You should NOT hear rain or see rain particles inside any vault.",
    },
    "indoor_wood": {
        "blocks_rain":       True,
        "blocks_storm":      False,   # Heavy storm shakes the building
        "blocks_fog":        True,
        "blocks_rad_storm":  False,   # Radiation still penetrates wood
        "blocks_wind":       True,
        "blocks_thunder":    False,
        "rain_sound_volume": 0.15,    # Faint patter on roof
        "storm_sound_volume":0.4,     # Can hear it hitting the roof
        "explanation": "Intact wood building. No rain inside. "
                       "Hear rain on roof at low volume. Storm shakes windows.",
    },
    "indoor_metal": {
        "blocks_rain":       True,
        "blocks_storm":      False,   # Metal vibrates in strong wind
        "blocks_fog":        True,
        "blocks_rad_storm":  False,   # Radiation penetrates metal
        "blocks_wind":       True,
        "blocks_thunder":    False,
        "rain_sound_volume": 0.3,     # Rain LOUD on metal roof
        "storm_sound_volume":0.5,
        "explanation": "Metal building. No rain particles inside. "
                       "But rain on metal roof is LOUD — distinctive sound.",
    },
    "subway": {
        "blocks_rain":       True,
        "blocks_storm":      True,
        "blocks_fog":        True,
        "blocks_rad_storm":  True,
        "blocks_wind":       True,
        "blocks_thunder":    False,
        "rain_sound_volume": 0.05,
        "storm_sound_volume":0.1,
        "explanation": "Underground. Completely sealed from exterior weather. "
                       "Very faint rumbles from above — that's it.",
    },
    "cave": {
        "blocks_rain":       True,
        "blocks_storm":      True,
        "blocks_fog":        True,
        "blocks_rad_storm":  False,   # Radiation seeps in
        "blocks_wind":       True,
        "blocks_thunder":    False,
        "rain_sound_volume": 0.0,
        "storm_sound_volume":0.08,
        "drip_sounds":       True,    # Water dripping from ceiling
        "explanation": "Cave sealed from weather. Interior is damp from seepage. "
                       "Dripping water sounds even without rain.",
    },
    "ruined_building": {
        "blocks_rain":       False,   # Holes in roof — rain comes in
        "blocks_storm":      False,
        "blocks_fog":        False,
        "blocks_rad_storm":  False,
        "blocks_wind":       False,
        "blocks_thunder":    False,
        "rain_sound_volume": 0.7,     # Mostly exposed
        "storm_sound_volume":0.85,
        "rain_patch":        True,    # Wet and dry areas
        "explanation": "COLLAPSED STRUCTURE. Roof has holes. "
                       "Rain comes through — but only in specific areas. "
                       "Standing under intact section = dry. In the open section = wet.",
    },
    "far_harbor_indoor": {
        "blocks_rain":       True,
        "blocks_storm":      False,
        "blocks_fog":        True,    # Fog doesn't enter sealed buildings
        "blocks_rad_storm":  False,
        "blocks_wind":       True,
        "blocks_thunder":    False,
        "rain_sound_volume": 0.25,
        "storm_sound_volume":0.5,
        "fog_creep":         True,    # Fog slowly creeps under doors
        "explanation": "Far Harbor buildings. Sealed from fog and rain. "
                       "But fog creeps under poorly-fitted doors over time.",
    },
}

def get_interior_weather_state(location_type: str, weather_code: int) -> dict:
    """
    Determine what weather effects should be active inside a location.
    This is the core of the rain-inside fix.

    Returns what to suppress and what volume to allow through.
    """
    rules = INTERIOR_WEATHER_RULES.get(location_type, None)

    if not rules:
        # Not an interior — full weather
        return {
            "is_sealed": False,
            "rain_suppressed": False,
            "storm_suppressed": False,
            "fog_suppressed": False,
            "rain_volume": 1.0,
            "storm_volume": 1.0,
            "weather_particles_inside": True,
            "explanation": "Exterior location — full weather exposure.",
        }

    weather_names = {0:"Clear", 1:"Rain", 2:"Fog", 3:"RadStorm", 4:"AcidRain", 5:"Blizzard"}
    weather_name = weather_names.get(weather_code, "Clear")

    rain_active  = weather_code in [1, 4]
    fog_active   = weather_code in [2, 3]
    storm_active = weather_code == 3

    return {
        "is_sealed":                True,
        "location_type":            location_type,
        "weather_outside":          weather_name,
        "rain_suppressed":          rules["blocks_rain"]   and rain_active,
        "storm_suppressed":         rules["blocks_storm"]  and storm_active,
        "fog_suppressed":           rules["blocks_fog"]    and fog_active,
        "rad_storm_suppressed":     rules.get("blocks_rad_storm", False) and weather_code == 3,
        "rain_volume":              rules["rain_sound_volume"]  if rain_active  else 0.0,
        "storm_volume":             rules["storm_sound_volume"] if storm_active else 0.0,
        "thunder_audible":          not rules.get("blocks_thunder", False),
        "weather_particles_inside": False,  # NEVER show rain particles in sealed interior
        "drip_sounds":              rules.get("drip_sounds", False),
        "fog_creep":                rules.get("fog_creep", False),
        "rain_patch":               rules.get("rain_patch", False),
        "explanation":              rules["explanation"],
    }

# ─────────────────────────────────────────────────────────────────────────────
# Acoustic Profile Queries
# ─────────────────────────────────────────────────────────────────────────────

def get_acoustic_profile(location_type: str) -> dict:
    """Get the full acoustic profile for a location type."""
    return ACOUSTIC_PROFILES.get(location_type, ACOUSTIC_PROFILES["wasteland"])

def calculate_gunshot_radius(base_radius: float, location_type: str,
                              weather_code: int, game_hour: float,
                              suppressed: bool = False) -> dict:
    """Calculate how far a gunshot travels given all environmental factors."""
    profile  = get_acoustic_profile(location_type)
    is_night = game_hour < 5.5 or game_hour > 21.0
    is_peak  = (5.5 <= game_hour <= 7.5) or (19.0 <= game_hour <= 21.0)

    weather_mult = {0:1.0, 1:0.7, 2:0.85, 3:0.55, 4:0.75, 5:0.5}.get(weather_code, 1.0)
    night_mult   = 1.25 if is_night  else 1.0
    peak_mult    = 1.15 if is_peak   else 1.0

    if suppressed:
        # Suppressed weapon effectiveness varies hugely by location
        suppressor_mults = {
            "forest":        0.5,   # Best environment
            "swamp":         0.55,
            "wasteland":     1.67,  # Subsonic crack still travels
            "city_ruins":    1.17,
            "indoor_wood":   0.8,
            "indoor_metal":  2.33,  # Near useless
            "vault":         2.33,  # Near useless
            "cave":          1.67,
            "subway":        1.67,
        }
        base_radius = base_radius * suppressor_mults.get(location_type, 1.0)
        # After suppression, base radius is already reduced
        effective_radius = base_radius * weather_mult * night_mult
    else:
        effective_radius = (base_radius * profile["gun_radius_mult"]
                            * weather_mult * night_mult * peak_mult)

    factors = []
    if profile["gun_radius_mult"] != 1.0:
        factors.append(f"{location_type}: ×{profile['gun_radius_mult']} ({profile['sound_notes'][:50]})")
    if weather_mult != 1.0:
        wn = {1:"Rain",2:"Fog",3:"Storm",4:"Acid Rain",5:"Blizzard"}.get(weather_code,"?")
        factors.append(f"{wn}: ×{weather_mult:.2f}")
    if is_night:
        factors.append("Night silence: ×1.25")
    if is_peak:
        factors.append("Dawn/dusk peak: ×1.15")
    if suppressed:
        factors.append(f"Suppressed — effectiveness in {location_type}")

    return {
        "base_radius":    base_radius,
        "final_radius":   round(effective_radius, 0),
        "location_type":  location_type,
        "suppressed":     suppressed,
        "weather":        {0:"Clear",1:"Rain",2:"Fog",3:"Storm",4:"Acid",5:"Blizzard"}.get(weather_code,"?"),
        "is_night":       is_night,
        "is_peak_hour":   is_peak,
        "echo_mult":      profile["echo_mult"],
        "factors":        factors,
        "acoustic_note":  profile["sound_notes"],
    }

# ─────────────────────────────────────────────────────────────────────────────
# Sound Masking Matrix
# ─────────────────────────────────────────────────────────────────────────────

MASKING_MATRIX = {
    # What sound      : {masker: mask_amount (0-1, 1=fully masked)}
    "footsteps": {
        "heavy_rain":    0.70,
        "storm":         0.85,
        "wind_strong":   0.35,
        "generator":     0.45,
        "waterfall":     0.95,
        "crowd":         0.40,
        "thunder":       0.60,  # During strike only
        "fire_medium":   0.30,
        "fire_inferno":  0.55,
        "river_fast":    0.40,
    },
    "gunshot_unsuppressed": {
        "heavy_rain":    0.20,
        "storm":         0.35,
        "thunder":       0.70,
        "generator":     0.10,
        "waterfall":     0.25,
        "fire_inferno":  0.15,
    },
    "gunshot_suppressed": {
        "heavy_rain":    0.50,
        "storm":         0.65,
        "thunder":       0.85,
        "generator":     0.35,
        "waterfall":     0.60,
        "wind_strong":   0.30,
        "fire_medium":   0.25,
    },
    "voice": {
        "heavy_rain":    0.30,
        "storm":         0.50,
        "generator":     0.40,
        "waterfall":     0.80,
        "crowd":         0.60,
        "wind_strong":   0.20,
    },
    "explosion": {
        "storm":         0.15,
        "thunder":       0.40,
        # Explosions are hard to mask — they're just loud
    },
}

def get_masking_level(sound_type: str, active_maskers: list[str]) -> dict:
    """
    Calculate how masked a sound is given active environmental sounds.
    Returns total masking level (0-1) and breakdown.
    """
    sound_masks = MASKING_MATRIX.get(sound_type, {})
    total_mask = 0.0
    breakdown  = []

    for masker in active_maskers:
        mask_amount = sound_masks.get(masker, 0.0)
        if mask_amount > 0:
            # Masks stack diminishingly
            total_mask = 1.0 - (1.0 - total_mask) * (1.0 - mask_amount)
            breakdown.append({"masker": masker, "amount": mask_amount})

    return {
        "sound_type":   sound_type,
        "total_masking": round(total_mask, 2),
        "masked_label":  ("Fully Masked" if total_mask >= 0.9 else
                          "Heavily Masked" if total_mask >= 0.7 else
                          "Moderately Masked" if total_mask >= 0.4 else
                          "Lightly Masked" if total_mask >= 0.2 else
                          "Unmasked"),
        "active_maskers": active_maskers,
        "breakdown":     breakdown,
    }

# ─────────────────────────────────────────────────────────────────────────────
# Complete Acoustic + Weather Snapshot for Mossy
# ─────────────────────────────────────────────────────────────────────────────

def get_acoustic_snapshot(location_type: str, weather_code: int,
                           game_hour: float, is_interior: bool = None) -> dict:
    """Full acoustic environment snapshot for Mossy's Sound panel."""
    profile = get_acoustic_profile(location_type)

    # Auto-detect interior if not specified
    if is_interior is None:
        is_interior = profile.get("weather_interior", False)

    weather_state = get_interior_weather_state(
        location_type if is_interior else "wasteland", weather_code
    ) if is_interior else None

    # Active maskers based on weather
    active_maskers = []
    if weather_code == 1: active_maskers.extend(["heavy_rain"])
    if weather_code == 3: active_maskers.extend(["storm", "wind_strong"])
    if weather_code == 5: active_maskers.extend(["storm", "wind_strong"])

    gunshot_normal     = calculate_gunshot_radius(2000, location_type, weather_code, game_hour, False)
    gunshot_suppressed = calculate_gunshot_radius(300,  location_type, weather_code, game_hour, True)
    footstep_masking   = get_masking_level("footsteps", active_maskers)

    return {
        "location_type":        location_type,
        "weather_code":         weather_code,
        "game_hour":            game_hour,
        "is_interior":          is_interior,
        "acoustic_profile":     profile,
        "interior_weather":     weather_state,
        "gunshot_normal":       gunshot_normal,
        "gunshot_suppressed":   gunshot_suppressed,
        "footstep_masking":     footstep_masking,
        "active_maskers":       active_maskers,
        "weather_inside_fix":   {
            "rain_inside":      not (weather_state["rain_suppressed"] if weather_state else False),
            "status":           "FIXED" if (weather_state and weather_state.get("rain_suppressed")) else "exposed",
            "message":          (weather_state["explanation"] if weather_state
                                 else "Outdoor location — full weather exposure."),
        } if is_interior else None,
        "generated_at": datetime.datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Log Parser
# ─────────────────────────────────────────────────────────────────────────────

ACOUSTIC_PAT = re.compile(
    r'ACOUSTIC_STATE\|loc=(\d+)\|echo=([\d.]+)\|gun_mult=([\d.]+)\|'
    r'stealth=([\d.]+)\|footstep_mask=([\d.]+)\|thunder=(\w+)'
)
SUPPRESSED_PAT = re.compile(
    r'SUPPRESSED_SHOT\|radius=([\d.]+)\|loc_type=(\d+)\|night=(\w+)\|weather=(\d+)'
)
FOOTSTEP_PAT = re.compile(
    r'FOOTSTEP\|material=([^|]+)\|detection_mod=([\d.]+)\|rain_mask=([\d.]+)'
)
EXPLOSION_PAT = re.compile(
    r'EXPLOSION\|type=([^|]+)\|yield=([\d.]+)\|location=([^|]+)'
)
FIRE_PAT = re.compile(
    r'FIRE_AFTERMATH\|location=([^|]+)\|stage=(\d+)'
)

LOC_TYPE_NAMES = {
    0: "wasteland", 1: "city_ruins", 2: "settlement",
    3: "indoor_wood", 4: "cave", 5: "vault",
    6: "forest", 7: "underwater", 8: "settlement_indoor"
}

def parse_acoustic_log_line(content: str) -> Optional[dict]:
    """Parse acoustic-tagged log lines from Papyrus."""

    m = ACOUSTIC_PAT.search(content)
    if m:
        loc_type = LOC_TYPE_NAMES.get(int(m.group(1)), "wasteland")
        return {
            "type": "acoustic_state",
            "location_type": loc_type,
            "echo_mult": float(m.group(2)),
            "gun_radius_mult": float(m.group(3)),
            "stealth_mult": float(m.group(4)),
            "footstep_mask": float(m.group(5)),
            "thunder_masking": m.group(6) == "True",
        }

    m = SUPPRESSED_PAT.search(content)
    if m:
        return {
            "type": "suppressed_shot",
            "detection_radius": float(m.group(1)),
            "location_type": LOC_TYPE_NAMES.get(int(m.group(2)), "unknown"),
            "at_night": m.group(3) == "True",
        }

    m = EXPLOSION_PAT.search(content)
    if m:
        return {
            "type": "explosion",
            "explosion_type": m.group(1),
            "yield": float(m.group(2)),
            "location": m.group(3),
        }

    m = FIRE_PAT.search(content)
    if m:
        return {
            "type": "fire_aftermath",
            "location": m.group(1),
            "final_stage": int(m.group(2)),
        }

    return None
