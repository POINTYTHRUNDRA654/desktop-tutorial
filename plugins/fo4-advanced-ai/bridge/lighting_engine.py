"""
lighting_engine.py
Fallout 4 Advanced AI — Lighting Engine Bridge Module
======================================================

Manages the power grid simulation and lighting state on the PC side.
The game tells us what happened; we track state and tell it what to do.

  - Power grid state (which zones have power, generator health)
  - Light zone database (which cells have managed lighting)
  - Lighting mod compatibility (how many lights each mod adds per cell)
  - Power event history (outages, restorations, damage events)
  - Bioluminescence schedule (which creatures glow at night)
  - Shadow LOD recommendations (which lights should cast shadows)
  - Dynamic light budget per cell (adjusts based on performance)

Imported by mossy_fo4_bridge.py.
"""

import sqlite3
import json
import datetime
from pathlib import Path
from typing import Optional
import re

MEMORY_DB_PATH  = Path.home() / "Documents" / "My Games" / "Fallout4" / "AdvancedAI_Memory.db"

# ─────────────────────────────────────────────────────────────────────────────
# Power Grid Database
# ─────────────────────────────────────────────────────────────────────────────

LIGHTING_SCHEMA = """
CREATE TABLE IF NOT EXISTS power_zones (
    zone_name       TEXT PRIMARY KEY,
    is_powered      INTEGER DEFAULT 1,
    generator_health REAL DEFAULT 1.0,
    backup_battery  REAL DEFAULT 1.0,
    last_outage     TEXT,
    last_restored   TEXT,
    power_source    TEXT DEFAULT 'generator'
);

CREATE TABLE IF NOT EXISTS power_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_name       TEXT NOT NULL,
    event_type      TEXT NOT NULL,  -- outage/restoration/damage/generator_on/generator_off
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS light_zones (
    cell_name       TEXT PRIMARY KEY,
    power_zone      TEXT,
    light_count     INTEGER DEFAULT 0,
    modded_lights   INTEGER DEFAULT 0,
    shadow_budget   INTEGER DEFAULT 2,
    is_interior     INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bioluminescence_schedule (
    species         TEXT NOT NULL,
    glow_color      TEXT DEFAULT 'blue',
    night_only      INTEGER DEFAULT 1,
    intensity       REAL DEFAULT 0.3,
    underwater_only INTEGER DEFAULT 0,
    source_mod      TEXT DEFAULT 'vanilla',
    PRIMARY KEY (species)
);
"""

# Power zones matching Papyrus GlobalVariable names
POWER_ZONES_DEFAULT = [
    ("Diamond City",    1, 1.0, "fusion_reactor"),
    ("Goodneighbor",    1, 0.8, "multiple_generators"),
    ("Far Harbor",      1, 0.9, "generator"),
    ("Sanctuary Hills", 0, 0.0, "none"),           # Starts dark — player builds power
    ("The Castle",      0, 0.0, "none"),            # Player must restore power
    ("Bunker Hill",     1, 1.0, "generator"),
    ("Prydwen",         1, 1.0, "fusion_core"),
    ("Institute",       1, 1.0, "nuclear"),
    ("Vault 81",        1, 0.95,"fusion_generator"),
    ("Vault 111",       0, 0.0, "depleted"),         # Always dark
]

BIOLUMINESCENCE_DEFAULT = [
    # (species, color, night_only, intensity, underwater_only)
    ("GlowingOne",       "green",  False, 0.8, False),   # Vanilla
    ("Nukalurk",         "orange", False, 0.6, False),   # Nuka-World
    ("FogCrawler",       "white",  True,  0.3, False),   # Subtle glow
    ("Angler",           "blue",   True,  0.7, False),   # Lure light
    # Added by mods:
    ("Fish",             "blue",   True,  0.2, True),    # Living Ocean fish
    ("Coral",            "cyan",   True,  0.4, True),    # Living Ocean coral
    ("NeonFly",          "green",  True,  0.5, False),   # GS Jungle
    ("MutantFirefly",    "yellow", True,  0.6, False),   # Various mods
    ("JellyfishMutant",  "purple", True,  0.5, True),    # Living Ocean
]

def init_lighting_schema():
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.executescript(LIGHTING_SCHEMA)
    c = conn.cursor()

    for name, powered, health, source in POWER_ZONES_DEFAULT:
        c.execute("""
            INSERT OR IGNORE INTO power_zones (zone_name, is_powered, generator_health, power_source)
            VALUES (?,?,?,?)
        """, (name, powered, health, source))

    for species, color, night, intensity, underwater in BIOLUMINESCENCE_DEFAULT:
        c.execute("""
            INSERT OR IGNORE INTO bioluminescence_schedule
            (species, glow_color, night_only, intensity, underwater_only)
            VALUES (?,?,?,?,?)
        """, (species, color, 1 if night else 0, intensity, 1 if underwater else 0))

    conn.commit()
    conn.close()
    print("[Lighting] Lighting engine schema initialized")

# ─────────────────────────────────────────────────────────────────────────────
# Power Grid Management
# ─────────────────────────────────────────────────────────────────────────────

def set_zone_power(zone_name: str, powered: bool, reason: str = "", game_time: float = 0):
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()

    c.execute("""
        UPDATE power_zones SET
            is_powered = ?,
            last_outage = CASE WHEN ? = 0 THEN ? ELSE last_outage END,
            last_restored = CASE WHEN ? = 1 THEN ? ELSE last_restored END
        WHERE zone_name = ?
    """, (1 if powered else 0,
          0 if not powered else 1, now,
          1 if powered else 0, now,
          zone_name))

    c.execute("""
        INSERT INTO power_events (zone_name, event_type, game_time)
        VALUES (?,?,?)
    """, (zone_name, "restoration" if powered else "outage", game_time))

    conn.commit()
    conn.close()

def get_all_power_states() -> dict:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM power_zones ORDER BY zone_name")
    zones = {r["zone_name"]: dict(r) for r in c.fetchall()}
    conn.close()

    for name, data in zones.items():
        data["status_label"] = "Powered" if data["is_powered"] else "Dark"
        data["generator_label"] = (
            "Operational" if data["generator_health"] >= 0.8 else
            "Damaged"     if data["generator_health"] >= 0.4 else
            "Critical"    if data["generator_health"] > 0.0 else
            "Offline"
        )

    return zones

# ─────────────────────────────────────────────────────────────────────────────
# Bioluminescence
# ─────────────────────────────────────────────────────────────────────────────

def get_active_bioluminescence(game_hour: float, is_underwater: bool = False,
                                mod_tags: list = None) -> list:
    """Get creatures/objects currently glowing."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    is_night = game_hour < 5.5 or game_hour > 21.0

    query = "SELECT * FROM bioluminescence_schedule WHERE 1=1"
    params = []

    if not is_night:
        query += " AND night_only = 0"
    if not is_underwater:
        query += " AND underwater_only = 0"

    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    # Filter by active mods
    if mod_tags:
        filtered = []
        for row in rows:
            if row["source_mod"] == "vanilla":
                filtered.append(row)
            elif "living_ocean" in mod_tags and row["species"] in ["Fish","Coral","JellyfishMutant"]:
                filtered.append(row)
            elif "gs_jungle" in mod_tags and row["species"] in ["NeonFly"]:
                filtered.append(row)
            elif row["source_mod"] == "vanilla":
                filtered.append(row)
        return filtered

    return rows

# ─────────────────────────────────────────────────────────────────────────────
# Lighting Mod Compatibility
# ─────────────────────────────────────────────────────────────────────────────

LIGHTING_MOD_LIGHT_COUNTS = {
    # Estimated number of additional shadow-capable lights per cell
    "Ultra Interior Lighting":  8,
    "Enhanced Lights and FX":   12,
    "Darker Nights":            2,
    "Natural Lighting":         3,
    "LUX":                      15,
    "Illuminated":              10,
    "Settlement Lights":        5,
    "Working Lights":           6,
}

def estimate_cell_light_load(cell_name: str, active_lighting_mods: list,
                              base_light_count: int = 10) -> dict:
    """Estimate total light load for a cell with mods active."""
    additional_lights = 0
    mod_breakdown = []

    for mod in active_lighting_mods:
        for known_mod, count in LIGHTING_MOD_LIGHT_COUNTS.items():
            if known_mod.lower() in mod.lower():
                additional_lights += count
                mod_breakdown.append({"mod": mod, "lights_added": count})
                break
        else:
            # Unknown lighting mod — estimate conservatively
            additional_lights += 4
            mod_breakdown.append({"mod": mod, "lights_added": 4, "estimated": True})

    total = base_light_count + additional_lights

    # Shadow budget for this cell (most lights don't need shadows)
    shadow_budget = max(2, min(total // 5, 8))

    return {
        "cell_name":         cell_name,
        "base_lights":       base_light_count,
        "modded_lights":     additional_lights,
        "total_lights":      total,
        "shadow_budget":     shadow_budget,
        "mod_breakdown":     mod_breakdown,
        "recommendation":    "High" if total > 30 else "Medium" if total > 15 else "Low",
    }

# ─────────────────────────────────────────────────────────────────────────────
# Full Lighting Snapshot for Mossy
# ─────────────────────────────────────────────────────────────────────────────

def get_lighting_snapshot(game_hour: float, mod_tags: list = None) -> dict:
    """Complete lighting state for Mossy's Lighting panel."""
    power_states = get_all_power_states()
    biolum = get_active_bioluminescence(game_hour, False, mod_tags)
    is_night = game_hour < 5.5 or game_hour > 21.0

    return {
        "game_hour":       game_hour,
        "is_night":        is_night,
        "power_zones":     power_states,
        "powered_count":   sum(1 for z in power_states.values() if z["is_powered"]),
        "dark_count":      sum(1 for z in power_states.values() if not z["is_powered"]),
        "bioluminescence": biolum,
        "generated_at":    datetime.datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Log Parser
# ─────────────────────────────────────────────────────────────────────────────

POWER_ZONE_PAT  = re.compile(r'POWER_ZONE\|zone=([^|]+)\|powered=(\w+)')
GENERATOR_PAT   = re.compile(r'GENERATOR_DAMAGED\|zone=([^|]+)')
LIGHT_STATE_PAT = re.compile(r'LIGHTING_STATE\|hour=([\d.]+)\|night=(\w+)\|shadow_budget=(\d+)\|active_shadows=(\d+)')

def parse_lighting_log_line(content: str) -> Optional[dict]:
    m = POWER_ZONE_PAT.search(content)
    if m:
        powered = m.group(2).lower() == "true" or m.group(2) == "1"
        set_zone_power(m.group(1), powered)
        return {"type": "power_zone", "zone": m.group(1), "powered": powered}

    m = GENERATOR_PAT.search(content)
    if m:
        conn = sqlite3.connect(MEMORY_DB_PATH)
        c = conn.cursor()
        c.execute("""
            UPDATE power_zones SET generator_health = MAX(0, generator_health - 0.3)
            WHERE zone_name = ?
        """, (m.group(1),))
        conn.commit()
        conn.close()
        return {"type": "generator_damaged", "zone": m.group(1)}

    m = LIGHT_STATE_PAT.search(content)
    if m:
        return {
            "type": "lighting_state",
            "game_hour": float(m.group(1)),
            "is_night": m.group(2).lower() == "true",
            "shadow_budget": int(m.group(3)),
            "active_shadows": int(m.group(4)),
        }

    return None
