"""
environment_simulation.py
Fallout 4 Advanced AI — Environment Simulation Bridge Module
=============================================================

Tracks and models everything about the physical environment:

  - Current weather state and history
  - Terrain database (what type of ground each location has)
  - Sound propagation model (how far sounds travel by terrain/weather)
  - Radiation zone map (which areas are irradiated, at what level)
  - Time-based scheduling (what should be happening right now, where)
  - Light level tracking (day/night/moon phase/storm)
  - Fire event history (where fires were, scorch marks, scavenger attraction)
  - Environmental hazard zones (collapsed bridges, flooded areas, toxic pools)

This module is imported by mossy_fo4_bridge.py.
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
# Schema
# ─────────────────────────────────────────────────────────────────────────────

ENV_SCHEMA = """

-- Current and historical weather
CREATE TABLE IF NOT EXISTS weather_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    weather_type    TEXT NOT NULL,
    game_hour       REAL,
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weather_current (
    key             TEXT PRIMARY KEY,
    value           TEXT
);

-- Terrain database
CREATE TABLE IF NOT EXISTS terrain_zones (
    location        TEXT PRIMARY KEY,
    terrain_type    TEXT NOT NULL,   -- outdoor/indoor/water/elevated/dense_cover/wasteland/city/cave
    sound_modifier  REAL DEFAULT 1.0,
    stealth_modifier REAL DEFAULT 1.0,
    radiation_level REAL DEFAULT 0.0,
    notes           TEXT
);

-- Radiation zones (persistent)
CREATE TABLE IF NOT EXISTS radiation_zones (
    zone_name       TEXT PRIMARY KEY,
    center_location TEXT,
    rad_level       REAL DEFAULT 0.0,  -- rads/sec at center
    radius          REAL DEFAULT 500.0,
    zone_type       TEXT DEFAULT 'static',  -- static/storm/creature_aura
    active          INTEGER DEFAULT 1,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Environmental event log
CREATE TABLE IF NOT EXISTS env_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type      TEXT NOT NULL,   -- fire/explosion/flood/rad_surge
    location        TEXT,
    intensity       REAL DEFAULT 1.0,
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved        INTEGER DEFAULT 0
);

-- Time-based schedule (what's active right now)
CREATE TABLE IF NOT EXISTS time_schedule (
    hour_start      REAL NOT NULL,
    hour_end        REAL NOT NULL,
    activity_type   TEXT NOT NULL,
    location_type   TEXT,
    description     TEXT,
    ai_modifier     TEXT  -- JSON: {"aggression": 1.2, "detection": 0.8}
);

-- Current environment state (single-row snapshot)
CREATE TABLE IF NOT EXISTS env_state (
    key             TEXT PRIMARY KEY,
    value           TEXT,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

"""

TERRAIN_DATABASE = {
    # Outdoor open
    "wasteland":      {"sound_mod": 1.5, "stealth_mod": 0.8, "rad": 0.1,
                       "notes": "Open ground, sounds carry far, little cover"},
    "city_ruins":     {"sound_mod": 0.9, "stealth_mod": 1.2, "rad": 0.2,
                       "notes": "Echo in ruins, rubble provides cover"},
    "forest_dense":   {"sound_mod": 0.7, "stealth_mod": 1.4, "rad": 0.05,
                       "notes": "Foliage absorbs sound, excellent concealment"},
    "swamp":          {"sound_mod": 0.8, "stealth_mod": 1.3, "rad": 0.3,
                       "notes": "Mud deadens footsteps, water provides noise cover"},
    "coast_water":    {"sound_mod": 1.2, "stealth_mod": 0.9, "rad": 0.1,
                       "notes": "Wind carries sound across water"},

    # Indoor
    "vault":          {"sound_mod": 1.4, "stealth_mod": 0.7, "rad": 0.0,
                       "notes": "Metal echoes, enclosed — shots heard everywhere"},
    "building_small": {"sound_mod": 0.8, "stealth_mod": 1.1, "rad": 0.0,
                       "notes": "Muffled but close quarters"},
    "cave":           {"sound_mod": 1.6, "stealth_mod": 0.8, "rad": 0.2,
                       "notes": "Extreme echo, darkness advantage"},
    "factory":        {"sound_mod": 1.1, "stealth_mod": 1.0, "rad": 0.05,
                       "notes": "Machinery noise can mask player movement"},

    # Special zones
    "glowing_sea":    {"sound_mod": 1.3, "stealth_mod": 0.9, "rad": 8.0,
                       "notes": "High radiation, mutated creatures more aggressive"},
    "far_harbor_fog": {"sound_mod": 0.6, "stealth_mod": 1.6, "rad": 0.2,
                       "notes": "Fog severely reduces detection but amplifies nearby sound"},
    "nuka_world":     {"sound_mod": 1.2, "stealth_mod": 0.95, "rad": 0.4,
                       "notes": "Nuka-Cola radiation, Cazadore territory"},
}

RADIATION_ZONES_DEFAULT = [
    ("Glowing Sea Core",       "Glowing Sea",        12.0, 2000.0),
    ("Mass Fusion Reactor",    "Mass Fusion",         6.0,  400.0),
    ("Jalbert Brothers Waste", "Jalbert Brothers",    4.0,  300.0),
    ("National Guard Training","National Guard",      3.0,  250.0),
    ("Coastal Cottage",        "Coastal Cottage",     2.0,  200.0),
    ("Crater of Atom",         "Far Harbor",          5.0,  500.0),
    ("Nuka-Cola Plant",        "Nuka-World",          3.0,  350.0),
]

TIME_SCHEDULE_DEFAULT = [
    # (start, end, activity, location_type, description, modifiers)
    (0.0,  5.5,  "deep_night",     None,         "Deepest dark — nocturnal peak, guard fatigue",
     json.dumps({"perception": 0.55, "aggression": 1.1})),
    (4.0,  5.5,  "guard_fatigue",  "settlement", "Guards at lowest alertness before dawn",
     json.dumps({"perception": 0.65})),
    (5.5,  7.5,  "dawn_peak",      None,         "PREDATOR PEAK — all creatures at maximum aggression",
     json.dumps({"aggression": 1.3, "speed": 1.1})),
    (6.0,  8.0,  "market_open",    "settlement", "Markets opening, NPCs active, guards alert",
     json.dumps({})),
    (7.0,  7.5,  "breakfast",      "settlement", "NPCs congregate for food",
     json.dumps({})),
    (8.0,  18.0, "day_activity",   None,         "Peak daytime, full detection, normal aggression",
     json.dumps({"perception": 1.0, "aggression": 1.0})),
    (13.0, 13.5, "lunch",          "settlement", "Midday meal — NPCs gather",
     json.dumps({})),
    (14.0, 14.5, "guard_shift",    "settlement", "Guard shift change — brief vulnerability",
     json.dumps({"perception": 0.85})),
    (18.0, 20.0, "market_close",   "settlement", "Markets closing, evening wind-down",
     json.dumps({})),
    (19.0, 21.0, "dusk_peak",      None,         "PREDATOR PEAK — dusk surge, most dangerous transition",
     json.dumps({"aggression": 1.35, "speed": 1.15})),
    (19.0, 19.5, "dinner",         "settlement", "Evening meal — NPCs at rest",
     json.dumps({})),
    (21.0, 24.0, "night",          None,         "Night — reduced detection, stealth advantage",
     json.dumps({"perception": 0.7, "stealth_bonus": 1.4})),
    (22.0, 22.5, "guard_shift",    "settlement", "Night guard shift begins",
     json.dumps({})),
]

def init_env_schema():
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.executescript(ENV_SCHEMA)
    c = conn.cursor()

    # Seed terrain zones
    for terrain, data in TERRAIN_DATABASE.items():
        c.execute("""
            INSERT OR IGNORE INTO terrain_zones
            (location, terrain_type, sound_modifier, stealth_modifier, radiation_level, notes)
            VALUES (?,?,?,?,?,?)
        """, (terrain, terrain, data["sound_mod"], data["stealth_mod"],
              data["rad"], data["notes"]))

    # Seed radiation zones
    for name, loc, rad, radius in RADIATION_ZONES_DEFAULT:
        c.execute("""
            INSERT OR IGNORE INTO radiation_zones
            (zone_name, center_location, rad_level, radius)
            VALUES (?,?,?,?)
        """, (name, loc, rad, radius))

    # Seed time schedule
    for start, end, act, loc_type, desc, mods in TIME_SCHEDULE_DEFAULT:
        c.execute("""
            INSERT OR IGNORE INTO time_schedule
            (hour_start, hour_end, activity_type, location_type, description, ai_modifier)
            VALUES (?,?,?,?,?,?)
        """, (start, end, act, loc_type, desc, mods))

    conn.commit()
    conn.close()
    print("[Env] Environment simulation schema initialized")

# ─────────────────────────────────────────────────────────────────────────────
# Weather State
# ─────────────────────────────────────────────────────────────────────────────

WEATHER_NAMES = {0: "Clear", 1: "Rain", 2: "Fog", 3: "RadStorm", 4: "AcidRain", 5: "Blizzard"}
WEATHER_EFFECTS = {
    0: {"visibility": 1.0, "sound_carry": 1.0, "stealth_bonus": 0.0, "rad_multiplier": 1.0},
    1: {"visibility": 0.85,"sound_carry": 0.7, "stealth_bonus": 0.3, "rad_multiplier": 1.0},
    2: {"visibility": 0.55,"sound_carry": 1.1, "stealth_bonus": 0.5, "rad_multiplier": 1.1},
    3: {"visibility": 0.7, "sound_carry": 0.9, "stealth_bonus": 0.1, "rad_multiplier": 3.0,
        "creature_surge": True},
    4: {"visibility": 0.8, "sound_carry": 0.8, "stealth_bonus": 0.1, "rad_multiplier": 1.5,
        "armor_damage": True},
    5: {"visibility": 0.35,"sound_carry": 0.5, "stealth_bonus": 0.6, "rad_multiplier": 0.5},
}

def update_weather(weather_code: int, game_hour: float, game_time: float):
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()

    effects = WEATHER_EFFECTS.get(weather_code, WEATHER_EFFECTS[0])

    # Update current state
    for key, val in {
        "weather_code": str(weather_code),
        "weather_name": WEATHER_NAMES.get(weather_code, "Unknown"),
        "game_hour": str(game_hour),
        "visibility": str(effects["visibility"]),
        "sound_carry": str(effects["sound_carry"]),
        "stealth_bonus": str(effects["stealth_bonus"]),
        "rad_multiplier": str(effects["rad_multiplier"]),
    }.items():
        c.execute("""
            INSERT OR REPLACE INTO env_state (key, value, updated_at) VALUES (?,?,?)
        """, (key, val, now))

    # Log history
    c.execute("""
        INSERT INTO weather_history (weather_type, game_hour, game_time)
        VALUES (?,?,?)
    """, (WEATHER_NAMES.get(weather_code, "Unknown"), game_hour, game_time))

    conn.commit()
    conn.close()

def get_current_weather() -> dict:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT key, value FROM env_state WHERE key IN ('weather_code','weather_name','visibility','sound_carry','stealth_bonus','rad_multiplier','game_hour')")
    state = {r["key"]: r["value"] for r in c.fetchall()}
    conn.close()

    code = int(state.get("weather_code", 0))
    effects = WEATHER_EFFECTS.get(code, WEATHER_EFFECTS[0])
    return {
        "code": code,
        "name": state.get("weather_name", "Clear"),
        "game_hour": float(state.get("game_hour", 12)),
        **effects,
    }

# ─────────────────────────────────────────────────────────────────────────────
# Active Schedule
# ─────────────────────────────────────────────────────────────────────────────

def get_active_schedule(game_hour: float, location_type: str = None) -> list:
    """What activities/events are happening right now?"""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    if location_type:
        c.execute("""
            SELECT * FROM time_schedule
            WHERE hour_start <= ? AND hour_end > ?
            AND (location_type IS NULL OR location_type = ?)
        """, (game_hour, game_hour, location_type))
    else:
        c.execute("""
            SELECT * FROM time_schedule
            WHERE hour_start <= ? AND hour_end > ?
        """, (game_hour, game_hour))

    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    # Parse AI modifiers
    for row in rows:
        if row.get("ai_modifier"):
            try:
                row["modifiers"] = json.loads(row["ai_modifier"])
            except:
                row["modifiers"] = {}
    return rows

def get_current_period_name(game_hour: float) -> str:
    """Human-readable name for current time period."""
    if 0 <= game_hour < 4:    return "Deep Night"
    if 4 <= game_hour < 5.5:  return "Pre-Dawn (Guard Fatigue)"
    if 5.5 <= game_hour < 7.5: return "DAWN PEAK (Most Dangerous)"
    if 7.5 <= game_hour < 13: return "Morning"
    if 13 <= game_hour < 14:  return "Midday"
    if 14 <= game_hour < 19:  return "Afternoon"
    if 19 <= game_hour < 21:  return "DUSK PEAK (Most Dangerous)"
    if 21 <= game_hour < 24:  return "Night"
    return "Unknown"

# ─────────────────────────────────────────────────────────────────────────────
# Sound Propagation Calculator
# ─────────────────────────────────────────────────────────────────────────────

def calculate_alert_radius(base_radius: float, terrain_type: str,
                            weather_code: int, game_hour: float) -> dict:
    """
    Calculate how far a sound (gunshot, explosion) travels and alerts NPCs.
    Returns radius + explanation for Mossy's display.
    """
    terrain = TERRAIN_DATABASE.get(terrain_type, TERRAIN_DATABASE["wasteland"])
    weather = WEATHER_EFFECTS.get(weather_code, WEATHER_EFFECTS[0])

    # Is it night?
    is_night = game_hour < 5.5 or game_hour > 21.0
    night_mod = 1.2 if is_night else 1.0   # Night is quieter, sounds carry farther

    # Is it peak hour?
    is_peak = (5.5 <= game_hour <= 7.5) or (19.0 <= game_hour <= 21.0)
    peak_mod = 1.15 if is_peak else 1.0

    final_radius = base_radius * terrain["sound_mod"] * weather["sound_carry"] * night_mod * peak_mod

    factors = []
    if terrain["sound_mod"] > 1.0:
        factors.append(f"Open terrain carries sound farther (+{(terrain['sound_mod']-1)*100:.0f}%)")
    elif terrain["sound_mod"] < 1.0:
        factors.append(f"Dense terrain absorbs sound (-{(1-terrain['sound_mod'])*100:.0f}%)")
    if weather["sound_carry"] < 1.0:
        factors.append(f"Rain/fog masks the sound (-{(1-weather['sound_carry'])*100:.0f}%)")
    if is_night:
        factors.append("Night silence carries sound farther (+20%)")
    if is_peak:
        factors.append("Dawn/dusk — predators already alert (+15%)")

    return {
        "base_radius": base_radius,
        "final_radius": round(final_radius, 0),
        "terrain": terrain_type,
        "weather": WEATHER_NAMES.get(weather_code, "Clear"),
        "factors": factors,
        "time_period": get_current_period_name(game_hour),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Radiation Zone Lookup
# ─────────────────────────────────────────────────────────────────────────────

def get_radiation_at_location(location: str) -> dict:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT * FROM radiation_zones
        WHERE active = 1 AND (
            center_location LIKE ? OR ? LIKE '%' || center_location || '%'
        )
        ORDER BY rad_level DESC LIMIT 1
    """, (f"%{location}%", location))
    row = c.fetchone()
    conn.close()

    weather = get_current_weather()
    rad_mult = weather.get("rad_multiplier", 1.0)

    if not row:
        return {"location": location, "rad_level": 0.0, "effective_rad": 0.0,
                "weather_multiplier": rad_mult, "danger": "Safe"}

    r = dict(row)
    effective = r["rad_level"] * rad_mult
    danger = ("Lethal" if effective >= 10 else "Extreme" if effective >= 5 else
              "High" if effective >= 2 else "Moderate" if effective >= 0.5 else "Low")

    return {**r, "effective_rad": round(effective, 2),
            "weather_multiplier": rad_mult, "danger": danger}

# ─────────────────────────────────────────────────────────────────────────────
# Full Environment Snapshot (for Mossy Living World panel)
# ─────────────────────────────────────────────────────────────────────────────

def get_environment_snapshot(game_hour: float = None, location: str = "") -> dict:
    """Complete environment state snapshot for Mossy's display."""
    if game_hour is None:
        # Try to get from env_state table
        conn = sqlite3.connect(MEMORY_DB_PATH)
        c = conn.cursor()
        c.execute("SELECT value FROM env_state WHERE key='game_hour'")
        row = c.fetchone()
        conn.close()
        game_hour = float(row[0]) if row else 12.0

    weather = get_current_weather()
    schedule = get_active_schedule(game_hour, None)
    rad = get_radiation_at_location(location) if location else {}

    return {
        "game_hour": game_hour,
        "time_period": get_current_period_name(game_hour),
        "is_night": game_hour < 5.5 or game_hour > 21.0,
        "is_peak_hour": (5.5 <= game_hour <= 7.5) or (19.0 <= game_hour <= 21.0),
        "weather": weather,
        "active_schedule": schedule,
        "radiation": rad,
        "snapshot_time": datetime.datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Log Parser
# ─────────────────────────────────────────────────────────────────────────────

ENV_STATE_PAT = re.compile(
    r'ENV_STATE\|hour=([\d.]+)\|night=(\w+)\|peak=(\w+)\|visibility=([\d.]+)\|sound=([\d.]+)\|weather=(\d+)'
)
ENV_EXPLOSION_PAT = re.compile(
    r'ENV_EXPLOSION\|radius=([\d.]+)\|loc_type=([^|]+)\|alerted=(\d+)'
)
RAD_ZONE_PAT = re.compile(
    r'RAD_ZONE\|zone=([^|]+)\|rads=([\d.]+)'
)
CROW_ALARM_PAT = re.compile(
    r'CROW_ALARM\|location=([^|]+)\|alerted=(\d+)'
)

def parse_env_log_line(content: str) -> Optional[dict]:
    m = ENV_STATE_PAT.search(content)
    if m:
        update_weather(int(m.group(6)), float(m.group(1)), 0)
        return {
            "type": "env_state",
            "hour": float(m.group(1)),
            "night": m.group(2) == "True",
            "peak": m.group(3) == "True",
            "visibility": float(m.group(4)),
            "sound_carry": float(m.group(5)),
            "weather_code": int(m.group(6)),
        }

    m = ENV_EXPLOSION_PAT.search(content)
    if m:
        conn = sqlite3.connect(MEMORY_DB_PATH)
        c = conn.cursor()
        c.execute("""
            INSERT INTO env_events (event_type, intensity) VALUES ('explosion', ?)
        """, (float(m.group(1)) / 2000.0,))
        conn.commit()
        conn.close()
        return {"type": "explosion", "radius": float(m.group(1)), "alerted": int(m.group(3))}

    m = CROW_ALARM_PAT.search(content)
    if m:
        return {"type": "crow_alarm", "location": m.group(1), "alerted": int(m.group(2))}

    return None
