"""
water_simulation.py
Fallout 4 Advanced AI — Water Simulation Bridge Module
=======================================================

Everything about water that Papyrus can't hold:

  - Water body database (every named body of water, its properties)
  - Seasonal water level schedule (spring high / summer low / winter ice)
  - Flood risk map (which locations flood, under what conditions)
  - Radiation levels per water body (with storm multipliers)
  - Watering hole schedule (who drinks where and when)
  - Water event history (floods, ice events, storm surges)
  - Far Harbor specific: sea ice, fog density, tidal patterns
  - Sound propagation over water (exact calculators)
  - Creature water territory (who owns which water body by season)
  - Mossy Water Monitor panel data

Imported by mossy_fo4_bridge.py.
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
# Water Body Database
# ─────────────────────────────────────────────────────────────────────────────

WATER_BODIES = {
    # Base Game
    "Charles River": {
        "type":         "river",
        "dlc":          "base",
        "location":     "Central Commonwealth",
        "base_rad":     0.3,     # rads/sec base
        "flow_speed":   0.6,     # 0-1 scale
        "depth":        "deep",  # shallow/medium/deep
        "seasonal_levels": {
            "Spring": 1.3,   # 30% higher from snowmelt
            "Summer": 0.7,   # 30% lower drought
            "Fall":   1.0,   # Normal
            "Winter": 0.85,  # Slightly lower, ice at edges
        },
        "ice_in_winter": True,
        "flood_risk":    0.6,    # 0-1 probability in heavy rain
        "aquatic_species": ["Mirelurk", "MirelurkQueen", "Bloodbug"],
        "watering_hole": True,
        "notes": "Main waterway. Flooded areas near Diamond City in spring.",
    },
    "Mystic River": {
        "type":         "river",
        "dlc":          "base",
        "location":     "Northern Commonwealth",
        "base_rad":     0.5,
        "flow_speed":   0.7,
        "depth":        "deep",
        "seasonal_levels": {"Spring": 1.4, "Summer": 0.65, "Fall": 1.0, "Winter": 0.8},
        "ice_in_winter": True,
        "flood_risk":    0.5,
        "aquatic_species": ["Mirelurk", "MirelurkHunter"],
        "watering_hole": True,
        "notes": "Flows past Bunker Hill. Mirelurk heavy near Old North Church.",
    },
    "Concord Creek": {
        "type":         "creek",
        "dlc":          "base",
        "location":     "Concord",
        "base_rad":     0.8,     # Near blast sites
        "flow_speed":   0.3,
        "depth":        "shallow",
        "seasonal_levels": {"Spring": 1.5, "Summer": 0.4, "Fall": 1.0, "Winter": 0.6},
        "ice_in_winter": True,
        "flood_risk":    0.8,    # Low-lying, floods easily
        "aquatic_species": ["Bloodbug", "Radroach"],
        "watering_hole": True,
        "notes": "Dries almost completely in summer drought. Flash flood risk in spring.",
    },
    "Sanctuary Hills River": {
        "type":         "river",
        "dlc":          "base",
        "location":     "Sanctuary Hills",
        "base_rad":     0.2,
        "flow_speed":   0.4,
        "depth":        "medium",
        "seasonal_levels": {"Spring": 1.6, "Summer": 0.6, "Fall": 1.0, "Winter": 0.75},
        "ice_in_winter": True,
        "flood_risk":    0.9,    # Settlement at risk
        "aquatic_species": ["Mirelurk", "Bloodbug", "Radstag"],
        "watering_hole": True,
        "notes": "Settlement bridge floods in spring. Radstag drink here at dawn.",
    },
    "Glowing Sea Pools": {
        "type":         "pool",
        "dlc":          "base",
        "location":     "Glowing Sea",
        "base_rad":     12.0,    # Lethal
        "flow_speed":   0.0,     # Stagnant
        "depth":        "shallow",
        "seasonal_levels": {"Spring": 1.1, "Summer": 0.9, "Fall": 1.0, "Winter": 1.0},
        "ice_in_winter": False,  # Too irradiated to freeze
        "flood_risk":    0.0,
        "aquatic_species": ["GlowingOne", "FogCrawler"],
        "watering_hole": False,
        "notes": "Lethal radiation. Storm multiplies to 36+ rads/sec. Avoid.",
    },
    "Coastal Atlantic": {
        "type":         "ocean",
        "dlc":          "base",
        "location":     "Eastern Coast",
        "base_rad":     0.4,
        "flow_speed":   0.8,
        "depth":        "deep",
        "seasonal_levels": {"Spring": 1.1, "Summer": 0.95, "Fall": 1.05, "Winter": 1.0},
        "ice_in_winter": False,  # Salt water, rarely freezes
        "flood_risk":    0.3,    # Storm surge
        "aquatic_species": ["Mirelurk", "MirelurkQueen", "Gulper"],
        "watering_hole": False,
        "notes": "Storm surge during rad storms. Mirelurk queens nest here.",
    },
    # Far Harbor DLC
    "Far Harbor Sea": {
        "type":         "ocean",
        "dlc":          "far_harbor",
        "location":     "Far Harbor Island",
        "base_rad":     0.8,
        "flow_speed":   0.6,
        "depth":        "deep",
        "seasonal_levels": {"Spring": 1.2, "Summer": 1.0, "Fall": 1.0, "Winter": 0.95},
        "ice_in_winter": True,   # Far Harbor freezes partially
        "flood_risk":    0.4,
        "aquatic_species": ["Mirelurk", "FogCrawler", "Gulper", "Angler"],
        "watering_hole": False,
        "notes": "Partially freezes in winter. Fog dramatically reduces visibility. Anglers lurk at edges.",
    },
    "Northwood Ridge Quarry Lake": {
        "type":         "lake",
        "dlc":          "far_harbor",
        "location":     "Far Harbor",
        "base_rad":     1.2,
        "flow_speed":   0.0,
        "depth":        "deep",
        "seasonal_levels": {"Spring": 1.3, "Summer": 0.8, "Fall": 1.0, "Winter": 0.9},
        "ice_in_winter": True,
        "flood_risk":    0.2,
        "aquatic_species": ["Gulper", "Mirelurk", "FogCrawler"],
        "watering_hole": False,
        "notes": "Abandoned quarry. Gulpers claim this as primary territory.",
    },
    "Atom's Spring": {
        "type":         "spring",
        "dlc":          "far_harbor",
        "location":     "Children of Atom, Far Harbor",
        "base_rad":     5.0,     # Sacred to Children of Atom
        "flow_speed":   0.1,
        "depth":        "shallow",
        "seasonal_levels": {"Spring": 1.2, "Summer": 0.9, "Fall": 1.0, "Winter": 1.0},
        "ice_in_winter": False,  # Too radioactive
        "flood_risk":    0.0,
        "aquatic_species": ["GlowingOne"],
        "watering_hole": False,
        "notes": "Sacred irradiated spring. Children of Atom bathe in it.",
    },
    # Nuka-World DLC
    "Nuka-Cola Lake": {
        "type":         "lake",
        "dlc":          "nuka_world",
        "location":     "Nuka-World",
        "base_rad":     0.6,     # Nuka-Cola radiation
        "flow_speed":   0.0,
        "depth":        "medium",
        "seasonal_levels": {"Spring": 1.1, "Summer": 0.8, "Fall": 1.0, "Winter": 0.9},
        "ice_in_winter": False,  # Nuka-Cola doesn't freeze normally
        "flood_risk":    0.3,
        "aquatic_species": ["Nukalurk", "Bloodbug"],
        "watering_hole": False,
        "notes": "Nuka-Cola contaminated lake. Nukalurks dominate. Explodes on death.",
    },
    "Safari Zone Swamp": {
        "type":         "swamp",
        "dlc":          "nuka_world",
        "location":     "Nuka-World Safari Zone",
        "base_rad":     0.4,
        "flow_speed":   0.1,
        "depth":        "shallow",
        "seasonal_levels": {"Spring": 1.4, "Summer": 0.7, "Fall": 1.0, "Winter": 0.8},
        "ice_in_winter": False,
        "flood_risk":    0.7,
        "aquatic_species": ["Gatorclaw", "Bloodbug", "Stingwing"],
        "watering_hole": True,
        "notes": "Gatorclaw primary territory. Extremely dangerous swamp.",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Watering Hole Schedule
# Which animals drink where, and when (in-game hours)
# ─────────────────────────────────────────────────────────────────────────────

WATERING_HOLE_SCHEDULE = {
    "Charles River": {
        "dawn": {
            "hours": [5.5, 6.0, 6.5, 7.0],
            "animals": ["Radstag", "Brahmin", "Molerat"],
            "predators_following": ["Deathclaw", "YaoGuai", "Radscorpion"],
            "danger_level": 0.8,
            "description": "Herd animals drink at dawn — predators stake out riverbank",
        },
        "dusk": {
            "hours": [18.5, 19.0, 19.5, 20.0],
            "animals": ["Radstag", "Brahmin"],
            "predators_following": ["Deathclaw", "Bloodbug"],
            "danger_level": 0.9,
            "description": "Dusk drinking — most dangerous. Predators more active.",
        },
        "night": {
            "hours": [22.0, 23.0, 0.0, 1.0],
            "animals": ["Molerat", "Radroach"],
            "predators_following": ["Radscorpion"],
            "danger_level": 0.5,
            "description": "Small nocturnal animals, smaller predators",
        },
    },
    "Sanctuary Hills River": {
        "dawn": {
            "hours": [5.5, 6.0, 7.0],
            "animals": ["Radstag", "Brahmin"],
            "predators_following": ["YaoGuai"],
            "danger_level": 0.7,
            "description": "Settlers' brahmin drink here. Yao Guai follow.",
        },
        "dusk": {
            "hours": [18.0, 19.0, 20.0],
            "animals": ["Radstag"],
            "predators_following": ["Deathclaw"],
            "danger_level": 0.85,
            "description": "Deathclaw ambush at settlement waterline at dusk.",
        },
    },
    "Safari Zone Swamp": {
        "dawn": {
            "hours": [6.0, 7.0, 8.0],
            "animals": ["Brahmin", "Radstag"],
            "predators_following": ["Gatorclaw"],
            "danger_level": 0.95,
            "description": "EXTREME DANGER. Gatorclaw hunts at swamp waterline at dawn.",
        },
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────────────────────

WATER_SCHEMA = """

CREATE TABLE IF NOT EXISTS water_bodies (
    name            TEXT PRIMARY KEY,
    body_type       TEXT,
    dlc             TEXT DEFAULT 'base',
    location        TEXT,
    base_rad        REAL DEFAULT 0.0,
    flow_speed      REAL DEFAULT 0.5,
    depth           TEXT DEFAULT 'medium',
    ice_in_winter   INTEGER DEFAULT 0,
    flood_risk      REAL DEFAULT 0.0,
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS water_seasonal_levels (
    water_body      TEXT NOT NULL,
    season          TEXT NOT NULL,
    level_multiplier REAL DEFAULT 1.0,
    PRIMARY KEY (water_body, season)
);

CREATE TABLE IF NOT EXISTS water_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type      TEXT NOT NULL,  -- flood/ice_formed/ice_melted/storm_surge/drought
    water_body      TEXT,
    intensity       REAL DEFAULT 1.0,
    game_time       REAL,
    season          TEXT,
    weather         TEXT,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved        INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS water_creature_territory (
    water_body      TEXT NOT NULL,
    species         TEXT NOT NULL,
    season          TEXT NOT NULL,
    dominance       REAL DEFAULT 0.5,  -- 0=present 1=dominant
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (water_body, species, season)
);

CREATE TABLE IF NOT EXISTS water_state_current (
    water_body      TEXT PRIMARY KEY,
    current_level   REAL DEFAULT 1.0,
    current_rad     REAL DEFAULT 0.0,
    is_iced         INTEGER DEFAULT 0,
    is_flooding     INTEGER DEFAULT 0,
    storm_active    INTEGER DEFAULT 0,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP
);

"""

def init_water_schema():
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.executescript(WATER_SCHEMA)
    c = conn.cursor()

    # Seed water bodies
    for name, data in WATER_BODIES.items():
        c.execute("""
            INSERT OR IGNORE INTO water_bodies
            (name, body_type, dlc, location, base_rad, flow_speed, depth,
             ice_in_winter, flood_risk, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (name, data["type"], data["dlc"], data["location"],
              data["base_rad"], data["flow_speed"], data["depth"],
              1 if data["ice_in_winter"] else 0,
              data["flood_risk"], data["notes"]))

        # Seed seasonal levels
        for season, level in data["seasonal_levels"].items():
            c.execute("""
                INSERT OR IGNORE INTO water_seasonal_levels (water_body, season, level_multiplier)
                VALUES (?,?,?)
            """, (name, season, level))

        # Seed aquatic territories
        for species in data["aquatic_species"]:
            for season in ["Spring", "Summer", "Fall", "Winter"]:
                c.execute("""
                    INSERT OR IGNORE INTO water_creature_territory
                    (water_body, species, season, dominance)
                    VALUES (?,?,?,?)
                """, (name, species, season, 0.7))

    conn.commit()
    conn.close()
    print("[Water] Water simulation database initialized")

# ─────────────────────────────────────────────────────────────────────────────
# Water State Queries
# ─────────────────────────────────────────────────────────────────────────────

def get_water_state(water_body: str, season: str, weather_code: int) -> dict:
    """Get full current state of a water body."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT * FROM water_bodies WHERE name = ?", (water_body,))
    body = c.fetchone()
    if not body:
        conn.close()
        return {"found": False, "water_body": water_body}
    b = dict(body)

    c.execute("""
        SELECT level_multiplier FROM water_seasonal_levels
        WHERE water_body = ? AND season = ?
    """, (water_body, season))
    level_row = c.fetchone()
    level_mult = level_row[0] if level_row else 1.0

    conn.close()

    # Weather radiation multiplier
    weather_rad_mult = {0: 1.0, 1: 1.0, 2: 1.1, 3: 3.0, 4: 1.5, 5: 0.8}.get(weather_code, 1.0)
    effective_rad = b["base_rad"] * weather_rad_mult

    # Storm surge
    is_flooding  = level_mult >= 1.4 and weather_code in [1, 3]
    is_iced      = season == "Winter" and b["ice_in_winter"]
    storm_active = weather_code in [1, 3]

    danger = _calculate_water_danger(effective_rad, is_flooding, is_iced, storm_active)

    creatures = _get_water_creatures(water_body, season)
    watering  = WATERING_HOLE_SCHEDULE.get(water_body, {})

    return {
        "found":           True,
        "name":            water_body,
        "type":            b["body_type"],
        "dlc":             b["dlc"],
        "location":        b["location"],
        "season":          season,
        "level_multiplier":round(level_mult, 2),
        "effective_rad":   round(effective_rad, 2),
        "base_rad":        b["base_rad"],
        "weather_rad_mult":weather_rad_mult,
        "flow_speed":      b["flow_speed"],
        "depth":           b["depth"],
        "is_flooding":     is_flooding,
        "is_iced":         is_iced,
        "storm_active":    storm_active,
        "flood_risk":      b["flood_risk"],
        "danger_level":    danger["level"],
        "danger_label":    danger["label"],
        "danger_factors":  danger["factors"],
        "aquatic_creatures": creatures,
        "watering_hole_schedule": watering,
        "notes":           b["notes"],
    }

def _calculate_water_danger(rad: float, flooding: bool, iced: bool, storm: bool) -> dict:
    factors = []
    score = 0.0

    if rad >= 10:    score += 0.9; factors.append(f"Lethal radiation ({rad:.1f} rads/sec)")
    elif rad >= 5:   score += 0.6; factors.append(f"Extreme radiation ({rad:.1f} rads/sec)")
    elif rad >= 2:   score += 0.3; factors.append(f"High radiation ({rad:.1f} rads/sec)")
    elif rad >= 0.5: score += 0.1; factors.append(f"Moderate radiation ({rad:.1f} rads/sec)")

    if flooding:     score += 0.4; factors.append("Flash flooding — strong current, displacement risk")
    if iced:         score += 0.2; factors.append("Ice — fall-through risk for heavy creatures, slippery")
    if storm:        score += 0.25; factors.append("Storm surge — aquatic creatures at peak aggression")

    label = ("Lethal" if score >= 1.2 else "Extreme" if score >= 0.8 else
             "Very High" if score >= 0.6 else "High" if score >= 0.4 else
             "Moderate" if score >= 0.2 else "Low")

    return {"level": min(score, 1.5), "label": label, "factors": factors}

def _get_water_creatures(water_body: str, season: str) -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT species, dominance FROM water_creature_territory
        WHERE water_body = ? AND season = ?
        ORDER BY dominance DESC
    """, (water_body, season))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ─────────────────────────────────────────────────────────────────────────────
# Active Watering Hole
# ─────────────────────────────────────────────────────────────────────────────

def get_active_watering_holes(game_hour: float, season: str) -> list:
    """Return watering holes that are active right now and their danger level."""
    active = []
    hour_int = int(game_hour)

    for location, schedule in WATERING_HOLE_SCHEDULE.items():
        for period, data in schedule.items():
            if hour_int in data["hours"] or (game_hour % 1 > 0 and int(game_hour) in data["hours"]):
                # Boost danger in summer (concentrated) and during dusk peak
                danger = data["danger_level"]
                if season == "Summer":  danger = min(danger * 1.2, 1.0)
                if 19 <= game_hour <= 21: danger = min(danger * 1.15, 1.0)

                active.append({
                    "location": location,
                    "period": period,
                    "animals_drinking": data["animals"],
                    "predators_nearby": data["predators_following"],
                    "danger_level": round(danger, 2),
                    "description": data["description"],
                    "advisory": _watering_hole_advisory(danger, data["predators_following"]),
                })

    return active

def _watering_hole_advisory(danger: float, predators: list) -> str:
    if danger >= 0.9:
        return f"EXTREME DANGER — {', '.join(predators)} actively hunting here. Do not approach."
    elif danger >= 0.7:
        return f"HIGH RISK — {', '.join(predators)} in area. Approach with extreme caution."
    elif danger >= 0.5:
        return f"CAUTION — {', '.join(predators[:1])} may be nearby. Stay alert."
    return "Relatively safe. Normal caution advised."

# ─────────────────────────────────────────────────────────────────────────────
# Flood Risk
# ─────────────────────────────────────────────────────────────────────────────

def get_flood_risk_map(season: str, weather_code: int, consecutive_rain_days: float) -> list:
    """Return locations sorted by current flood risk."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT wb.*, wsl.level_multiplier
        FROM water_bodies wb
        LEFT JOIN water_seasonal_levels wsl
            ON wb.name = wsl.water_body AND wsl.season = ?
        ORDER BY wb.flood_risk DESC
    """, (season,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    is_heavy_rain = weather_code in [1, 3]
    flood_map = []
    for body in rows:
        base_risk    = body["flood_risk"]
        level_mult   = body.get("level_multiplier", 1.0)
        rain_factor  = consecutive_rain_days / 2.0 if is_heavy_rain else 0.0

        current_risk = min(base_risk * level_mult * (1 + rain_factor), 1.0)
        is_flooding  = current_risk >= 0.7 and is_heavy_rain and consecutive_rain_days >= 1.5

        flood_map.append({
            "location":     body["name"],
            "area":         body["location"],
            "base_risk":    round(base_risk, 2),
            "current_risk": round(current_risk, 2),
            "is_flooding":  is_flooding,
            "risk_label":   ("Critical" if current_risk >= 0.8 else "High" if current_risk >= 0.6
                             else "Moderate" if current_risk >= 0.4 else "Low"),
            "notes":        body["notes"],
        })

    return flood_map

# ─────────────────────────────────────────────────────────────────────────────
# Sound Over Water
# ─────────────────────────────────────────────────────────────────────────────

def calculate_water_sound_radius(base_radius: float, water_body: str,
                                  weather_code: int, game_hour: float) -> dict:
    """
    Sound travels dramatically farther over open water.
    Returns calculated radius + explanation.
    """
    body_data = WATER_BODIES.get(water_body, {})
    body_type = body_data.get("type", "river")

    # Water type multipliers
    type_mult = {
        "ocean": 1.8,   # Vast open water — extreme carry
        "lake":  1.6,   # Large still surface
        "river": 1.4,   # Flowing — some turbulence reduces carry
        "creek": 1.2,   # Small, some vegetation dampens
        "swamp": 0.9,   # Vegetation absorbs sound
        "pool":  1.1,   # Small, enclosed
        "spring":1.0,
    }.get(body_type, 1.3)

    # Weather effects
    weather_mult = {
        0: 1.0,   # Clear
        1: 0.7,   # Rain on water creates noise — reduces carry
        2: 0.85,  # Fog amplifies close sounds but scatters far ones
        3: 1.2,   # Rad storm — electrical interference amplifies
        4: 0.8,   # Acid rain
        5: 0.5,   # Blizzard — wind noise dominates
    }.get(weather_code, 1.0)

    # Night carries farther over water (no ambient noise)
    is_night  = game_hour < 5.5 or game_hour > 21.0
    night_mult = 1.25 if is_night else 1.0

    final = base_radius * type_mult * weather_mult * night_mult

    factors = [f"Water type ({body_type}): ×{type_mult}"]
    if weather_mult != 1.0:
        wname = {0:"Clear",1:"Rain",2:"Fog",3:"RadStorm",4:"Acid",5:"Blizzard"}.get(weather_code,"?")
        factors.append(f"{wname} weather: ×{weather_mult}")
    if is_night:
        factors.append("Night silence: ×1.25")

    return {
        "base_radius":  base_radius,
        "final_radius": round(final, 0),
        "multiplier":   round(type_mult * weather_mult * night_mult, 2),
        "water_body":   water_body,
        "body_type":    body_type,
        "factors":      factors,
    }

# ─────────────────────────────────────────────────────────────────────────────
# Full Water Snapshot for Mossy
# ─────────────────────────────────────────────────────────────────────────────

def get_water_snapshot(season: str, weather_code: int, game_hour: float,
                        consecutive_rain_days: float = 0) -> dict:
    """Complete water state for Mossy's Water Monitor panel."""
    bodies = []
    for name in WATER_BODIES.keys():
        state = get_water_state(name, season, weather_code)
        bodies.append(state)

    # Sort by danger level
    bodies.sort(key=lambda x: x.get("danger_level", 0), reverse=True)

    active_holes = get_active_watering_holes(game_hour, season)
    flood_map    = get_flood_risk_map(season, weather_code, consecutive_rain_days)

    return {
        "season":               season,
        "weather_code":         weather_code,
        "game_hour":            game_hour,
        "consecutive_rain_days": consecutive_rain_days,
        "water_bodies":         bodies,
        "active_watering_holes": active_holes,
        "flood_risk_map":       flood_map,
        "generated_at":         datetime.datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Log Parser
# ─────────────────────────────────────────────────────────────────────────────

WATER_STATE_PAT = re.compile(
    r'WATER_STATE\|season=(\d+)\|weather=(\d+)\|hour=([\d.]+)\|storm=(\w+)\|flood=(\w+)\|ice=(\w+)\|rain_days=([\d.]+)'
)
WATER_ICE_PAT   = re.compile(r'WATER_ICE\|state=(\w+)\|season=(\w+)')
FLOOD_EVENT_PAT = re.compile(r'FLOOD_EVENT\|rain_days=([\d.]+)\|zones=(\w+)')
WATER_RAD_PAT   = re.compile(r'WATER_RAD\|body=([^|]+)\|base_rad=([\d.]+)\|effective=([\d.]+)')
WATERING_PAT    = re.compile(r'WATERING_HOLE\|state=(\w+)\|hour=([\d.]+)\|season=(\d+)')

SEASON_NAMES = {0: "Spring", 1: "Summer", 2: "Fall", 3: "Winter"}

def parse_water_log_line(content: str) -> Optional[dict]:
    m = WATER_STATE_PAT.search(content)
    if m:
        conn = sqlite3.connect(MEMORY_DB_PATH)
        c = conn.cursor()
        now = datetime.datetime.now().isoformat()
        c.execute("""
            INSERT OR REPLACE INTO water_state_current
            (water_body, storm_active, is_flooding, is_iced, last_updated)
            VALUES ('global', ?, ?, ?, ?)
        """, (1 if m.group(4) == "True" else 0,
              1 if m.group(5) == "True" else 0,
              1 if m.group(6) == "True" else 0,
              now))
        conn.commit()
        conn.close()
        return {
            "type": "water_state",
            "season": SEASON_NAMES.get(int(m.group(1)), "Unknown"),
            "storm": m.group(4) == "True",
            "flood": m.group(5) == "True",
            "ice":   m.group(6) == "True",
        }

    m = FLOOD_EVENT_PAT.search(content)
    if m:
        conn = sqlite3.connect(MEMORY_DB_PATH)
        c = conn.cursor()
        c.execute("""
            INSERT INTO water_events (event_type, intensity, real_time)
            VALUES ('flood', ?, ?)
        """, (float(m.group(1)) / 2.0, datetime.datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return {"type": "flood_event", "rain_days": float(m.group(1))}

    m = WATER_ICE_PAT.search(content)
    if m:
        conn = sqlite3.connect(MEMORY_DB_PATH)
        c = conn.cursor()
        c.execute("""
            INSERT INTO water_events (event_type, season, real_time)
            VALUES (?, ?, ?)
        """, ("ice_" + m.group(1), m.group(2), datetime.datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return {"type": "ice_event", "state": m.group(1)}

    return None
