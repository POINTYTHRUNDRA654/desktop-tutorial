"""
world_simulation.py
Fallout 4 Advanced AI — World Simulation Bridge Module
=======================================================

Handles everything Papyrus can't hold in memory:

  - Faction power graph (who controls what territory, trending up or down)
  - Economic model (trade routes, resource flow, scarcity pressure)
  - Social relationship graph (who knows who, how they feel about each other)
  - NPC grief tracking (who died, who misses them, how long they've mourned)
  - Threat escalation timeline (what grew while the player wasn't looking)
  - Seasonal world calendar (current season, day of year, migration schedule)
  - Rumor database (what's being talked about, how far it's spread)
  - Lore generation from world events
  - Full world state snapshot for Mossy's Living World panel

This module is imported by mossy_fo4_bridge.py.
Mossy uses these endpoints to power the World Monitor panel.
"""

import sqlite3
import json
import datetime
import math
import random
from pathlib import Path
from typing import Optional

MEMORY_DB_PATH = Path.home() / "Documents" / "My Games" / "Fallout4" / "AdvancedAI_Memory.db"

# ─────────────────────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────────────────────

WORLD_SIM_SCHEMA = """

-- Faction power and territory
CREATE TABLE IF NOT EXISTS faction_power (
    faction         TEXT PRIMARY KEY,
    power_level     REAL DEFAULT 50.0,    -- 0-100
    territory_count INTEGER DEFAULT 0,
    trending        TEXT DEFAULT 'stable', -- 'rising' 'falling' 'stable'
    last_action     TEXT,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faction_territory (
    location        TEXT NOT NULL,
    faction         TEXT NOT NULL,
    control_level   REAL DEFAULT 50.0,   -- 0=contested 100=full control
    acquired_at     TEXT,
    PRIMARY KEY (location, faction)
);

-- Active threats with growth timeline
CREATE TABLE IF NOT EXISTS active_threats (
    threat_id       TEXT PRIMARY KEY,
    threat_name     TEXT NOT NULL,
    location        TEXT,
    initial_level   REAL DEFAULT 10.0,
    current_level   REAL DEFAULT 10.0,
    days_active     INTEGER DEFAULT 0,
    faction         TEXT,
    resolved        INTEGER DEFAULT 0,
    resolved_by     TEXT,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TEXT
);

-- Trade routes and economic flow
CREATE TABLE IF NOT EXISTS trade_routes (
    route_id        TEXT PRIMARY KEY,
    from_location   TEXT NOT NULL,
    to_location     TEXT NOT NULL,
    safety_level    REAL DEFAULT 0.7,    -- 0=dangerous 1=safe
    caravan_freq    REAL DEFAULT 1.0,    -- multiplier on arrival frequency
    last_caravan    TEXT,
    disruptions     INTEGER DEFAULT 0,
    active          INTEGER DEFAULT 1
);

-- Settlement economic state
CREATE TABLE IF NOT EXISTS settlement_economy (
    settlement      TEXT PRIMARY KEY,
    food_ratio      REAL DEFAULT 1.0,
    water_ratio     REAL DEFAULT 1.0,
    caps            REAL DEFAULT 100.0,
    happiness       REAL DEFAULT 50.0,
    morale          INTEGER DEFAULT 100,
    is_scarcity     INTEGER DEFAULT 0,
    population      INTEGER DEFAULT 0,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- NPC social relationships (graph edges)
CREATE TABLE IF NOT EXISTS social_relationships (
    npc_a_id        TEXT NOT NULL,
    npc_b_id        TEXT NOT NULL,
    relationship    TEXT DEFAULT 'acquaintance', -- friend/rival/lover/family/enemy
    strength        REAL DEFAULT 0.5,   -- 0-1
    established_at  TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (npc_a_id, npc_b_id)
);

-- Grief tracking
CREATE TABLE IF NOT EXISTS grief_records (
    griever_id      TEXT NOT NULL,
    deceased_id     TEXT NOT NULL,
    deceased_name   TEXT NOT NULL,
    died_at         TEXT NOT NULL,
    grief_level     REAL DEFAULT 1.0,  -- 1.0 = fresh grief, 0.0 = healed
    relationship    TEXT,
    settlement      TEXT,
    PRIMARY KEY (griever_id, deceased_id)
);

-- Rumor database with spread tracking
CREATE TABLE IF NOT EXISTS rumors (
    rumor_id        TEXT PRIMARY KEY,
    text            TEXT NOT NULL,
    origin_location TEXT,
    birth_time      REAL,    -- game time
    spread_state    TEXT DEFAULT 'local',  -- local/regional/commonwealth/fading/dead
    times_told      INTEGER DEFAULT 0,
    truth_level     REAL DEFAULT 1.0,  -- 1.0 = true, 0.0 = completely false
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seasonal calendar
CREATE TABLE IF NOT EXISTS world_calendar (
    key             TEXT PRIMARY KEY,
    value           TEXT
);

"""

def init_world_schema():
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.executescript(WORLD_SIM_SCHEMA)

    # Seed faction power defaults
    factions = [
        ("Minutemen", 50.0, 3, "stable"),
        ("Brotherhood of Steel", 60.0, 5, "rising"),
        ("Railroad", 35.0, 2, "stable"),
        ("Institute", 70.0, 0, "falling"),  # Hidden power
        ("Raiders", 40.0, 8, "stable"),
        ("Gunners", 45.0, 4, "stable"),
    ]
    c = conn.cursor()
    for name, power, territory, trend in factions:
        c.execute("""
            INSERT OR IGNORE INTO faction_power (faction, power_level, territory_count, trending)
            VALUES (?,?,?,?)
        """, (name, power, territory, trend))

    # Seed major trade routes
    routes = [
        ("DC_Sanctuary",   "Diamond City",  "Sanctuary Hills", 0.8),
        ("DC_GoodNeighbor","Diamond City",  "Goodneighbor",    0.75),
        ("DC_FarHarbor",   "Diamond City",  "Far Harbor",      0.4),
        ("Sanctuary_Abby", "Sanctuary Hills","Abernathy Farm",  0.9),
        ("Quincy_DC",      "Quincy",        "Diamond City",    0.3),  # Dangerous
    ]
    for rid, frm, to, safety in routes:
        c.execute("""
            INSERT OR IGNORE INTO trade_routes (route_id, from_location, to_location, safety_level)
            VALUES (?,?,?,?)
        """, (rid, frm, to, safety))

    conn.commit()
    conn.close()
    print("[World] World simulation schema initialized")

# ─────────────────────────────────────────────────────────────────────────────
# Faction Power
# ─────────────────────────────────────────────────────────────────────────────

def update_faction_power(faction: str, delta: float, reason: str = "", location: str = ""):
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()

    c.execute("""
        INSERT OR IGNORE INTO faction_power (faction, power_level) VALUES (?,50.0)
    """, (faction,))

    c.execute("""
        UPDATE faction_power SET
            power_level = MAX(0, MIN(100, power_level + ?)),
            trending = CASE
                WHEN ? > 0 THEN 'rising'
                WHEN ? < 0 THEN 'falling'
                ELSE 'stable'
            END,
            last_action = ?,
            last_updated = ?
        WHERE faction = ?
    """, (delta, delta, delta, reason, now, faction))

    conn.commit()
    conn.close()

def get_faction_power(faction: str) -> dict:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM faction_power WHERE faction = ?", (faction,))
    row = c.fetchone()
    conn.close()
    if not row:
        return {"faction": faction, "power_level": 50.0, "trending": "stable"}
    return dict(row)

def get_all_faction_power() -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM faction_power ORDER BY power_level DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ─────────────────────────────────────────────────────────────────────────────
# Threat Tracking
# ─────────────────────────────────────────────────────────────────────────────

def register_threat(threat_name: str, location: str, initial_level: float = 10.0,
                    faction: str = "") -> str:
    import uuid
    threat_id = str(uuid.uuid4())[:8]
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO active_threats
        (threat_id, threat_name, location, initial_level, current_level, faction)
        VALUES (?,?,?,?,?,?)
    """, (threat_id, threat_name, location, initial_level, initial_level, faction))
    conn.commit()
    conn.close()
    return threat_id

def update_threats(game_time: float):
    """Called daily — grows all active threats."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()

    c.execute("SELECT * FROM active_threats WHERE resolved = 0")
    threats = c.fetchall()

    for t in threats:
        new_level = min(t[4] + 1.5, 100.0)  # current_level + 1.5/day
        new_days  = t[5] + 1

        c.execute("""
            UPDATE active_threats SET
                current_level = ?,
                days_active = ?
            WHERE threat_id = ?
        """, (new_level, new_days, t[0]))

    conn.commit()
    conn.close()

def resolve_threat(threat_name: str, resolved_by: str = "player"):
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()
    c.execute("""
        UPDATE active_threats SET
            resolved = 1,
            resolved_by = ?,
            resolved_at = ?
        WHERE threat_name = ? AND resolved = 0
    """, (resolved_by, now, threat_name))
    conn.commit()
    conn.close()

def get_active_threats() -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT *, CASE
            WHEN current_level < 30 THEN 'Minor'
            WHEN current_level < 60 THEN 'Moderate'
            WHEN current_level < 80 THEN 'Major'
            ELSE 'Critical'
        END as severity
        FROM active_threats WHERE resolved = 0
        ORDER BY current_level DESC
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ─────────────────────────────────────────────────────────────────────────────
# Social Relationship Graph
# ─────────────────────────────────────────────────────────────────────────────

def set_relationship(npc_a_id: str, npc_b_id: str, relationship: str,
                     strength: float = 0.5):
    """Establish or update a social relationship between two NPCs."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO social_relationships
        (npc_a_id, npc_b_id, relationship, strength)
        VALUES (?,?,?,?)
    """, (npc_a_id, npc_b_id, relationship, strength))
    # Mirror relationship
    c.execute("""
        INSERT OR IGNORE INTO social_relationships
        (npc_a_id, npc_b_id, relationship, strength)
        VALUES (?,?,?,?)
    """, (npc_b_id, npc_a_id, relationship, strength))
    conn.commit()
    conn.close()

def get_relationships(npc_id: str) -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT sr.*, ni.npc_name as other_name
        FROM social_relationships sr
        LEFT JOIN npc_identities ni ON ni.npc_id = sr.npc_b_id
        WHERE sr.npc_a_id = ?
        ORDER BY sr.strength DESC
    """, (npc_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ─────────────────────────────────────────────────────────────────────────────
# Grief System
# ─────────────────────────────────────────────────────────────────────────────

def record_death_and_grief(deceased_id: str, deceased_name: str,
                            settlement: str = "", game_time: float = 0):
    """When an NPC dies, create grief records for all their known relationships."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()

    # Find everyone who knew this NPC
    c.execute("""
        SELECT npc_a_id, relationship, strength
        FROM social_relationships WHERE npc_b_id = ?
    """, (deceased_id,))
    relationships = c.fetchall()

    for rel in relationships:
        grief_level = {
            "lover":        1.0,
            "family":       0.95,
            "friend":       0.7,
            "acquaintance": 0.3,
            "rival":        0.1,
            "enemy":        0.0,
        }.get(rel["relationship"], 0.3) * rel["strength"]

        if grief_level > 0:
            c.execute("""
                INSERT OR REPLACE INTO grief_records
                (griever_id, deceased_id, deceased_name, died_at, grief_level, relationship, settlement)
                VALUES (?,?,?,?,?,?,?)
            """, (rel["npc_a_id"], deceased_id, deceased_name, now,
                  grief_level, rel["relationship"], settlement))

    conn.commit()
    conn.close()
    print(f"[World] Grief records created for death of {deceased_name}: {len(relationships)} mourners")

def decay_grief(days_passed: float = 1.0):
    """Grief decays over time. Call daily."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    # Grief halves roughly every 30 days
    decay_rate = 1.0 - (days_passed / 30.0) * 0.5
    c.execute("""
        UPDATE grief_records SET grief_level = MAX(0, grief_level * ?)
        WHERE grief_level > 0
    """, (decay_rate,))
    conn.commit()
    conn.close()

def get_active_grief(npc_id: str) -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT * FROM grief_records
        WHERE griever_id = ? AND grief_level > 0.05
        ORDER BY grief_level DESC
    """, (npc_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ─────────────────────────────────────────────────────────────────────────────
# Rumor Spread
# ─────────────────────────────────────────────────────────────────────────────

def register_rumor(text: str, origin: str, game_time: float, truth: float = 1.0):
    import uuid
    rid = str(uuid.uuid4())[:8]
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO rumors (rumor_id, text, origin_location, birth_time, truth_level)
        VALUES (?,?,?,?,?)
    """, (rid, text, origin, game_time, truth))
    conn.commit()
    conn.close()
    return rid

def update_rumor_spread(current_game_time: float):
    """Update all rumor spread states based on elapsed game time."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()

    c.execute("SELECT * FROM rumors WHERE spread_state != 'dead'")
    rumors = c.fetchall()

    for rumor in rumors:
        days_old = (current_game_time - (rumor[3] or 0)) * 24.0

        if days_old < 3:      spread = "local"
        elif days_old < 7:    spread = "regional"
        elif days_old < 14:   spread = "commonwealth"
        elif days_old < 30:   spread = "fading"
        else:                  spread = "dead"

        # Rumors can distort over time
        truth_decay = max(0.0, rumor[7] - (days_old * 0.01))

        c.execute("""
            UPDATE rumors SET spread_state = ?, truth_level = ? WHERE rumor_id = ?
        """, (spread, truth_decay, rumor[0]))

    conn.commit()
    conn.close()

def get_active_rumors(spread_state: str = None) -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if spread_state:
        c.execute("SELECT * FROM rumors WHERE spread_state = ? ORDER BY birth_time DESC", (spread_state,))
    else:
        c.execute("SELECT * FROM rumors WHERE spread_state != 'dead' ORDER BY birth_time DESC LIMIT 30")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ─────────────────────────────────────────────────────────────────────────────
# Environment Simulation Log Parser
# ─────────────────────────────────────────────────────────────────────────────

import re

WORLD_TICK_PAT    = re.compile(r'WORLD_TICK\|day=(\d+)\|season=(\w+)\|day_of_year=([\d.]+)\|game_time=([\d.]+)')
THREAT_REG_PAT    = re.compile(r'THREAT_REGISTERED\|name=([^|]+)\|location=([^|]+)\|level=([\d.]+)')
THREAT_RES_PAT    = re.compile(r'THREAT_RESOLVED\|name=([^|]+)\|days_existed=([\d.]+)\|final_level=([\d.]+)')
FACTION_BOOST_PAT = re.compile(r'FACTION_BOOST\|faction=([^|]+)\|amount=([\d.-]+)\|location=([^|]+)\|reason=([^|]+)')
RUMOR_BORN_PAT    = re.compile(r'RUMOR_BORN\|text=([^|]+)\|origin=([^|]+)\|game_time=([\d.]+)')
SEASON_CHANGE_PAT = re.compile(r'SEASON_CHANGE\|from=(\w+)\|to=(\w+)\|day=(\d+)')
SETTLEMENT_ECON_PAT = re.compile(
    r'SETTLEMENT_ECON\|settlement=([^|]+)\|food=([\d.]+)\|water=([\d.]+)\|morale=(\d+)\|scarcity=(\w+)'
)
COMMUNITY_EVENT_PAT = re.compile(
    r'COMMUNITY_EVENT\|settlement=([^|]+)\|event=([^|]+)\|'
)
ENV_STATE_PAT = re.compile(
    r'ENV_STATE\|hour=([\d.]+)\|night=(\w+)\|peak=(\w+)\|visibility=([\d.]+)\|sound=([\d.]+)\|weather=(\d+)'
)
MIGRATION_PAT = re.compile(r'MIGRATION_EVENT\|season=(\w+)\|description=([^|]+)')
MAJOR_THREAT_PAT  = re.compile(r'MAJOR_THREAT_EVENT\|name=([^|]+)\|location=([^|]+)')

def parse_world_log_line(content: str) -> Optional[dict]:
    """Parse world simulation tagged log lines."""

    m = WORLD_TICK_PAT.search(content)
    if m:
        update_threats(float(m.group(4)))
        update_rumor_spread(float(m.group(4)))
        decay_grief(1.0)
        return {"type": "world_tick", "day": int(m.group(1)), "season": m.group(2)}

    m = THREAT_REG_PAT.search(content)
    if m:
        register_threat(m.group(1), m.group(2), float(m.group(3)))
        return {"type": "threat_registered", "name": m.group(1)}

    m = THREAT_RES_PAT.search(content)
    if m:
        resolve_threat(m.group(1))
        register_rumor(f"The Sole Survivor dealt with {m.group(1)}", "Wasteland", 0, truth=1.0)
        return {"type": "threat_resolved", "name": m.group(1)}

    m = FACTION_BOOST_PAT.search(content)
    if m:
        update_faction_power(m.group(1), float(m.group(2)), m.group(4), m.group(3))
        return {"type": "faction_boost", "faction": m.group(1), "amount": float(m.group(2))}

    m = RUMOR_BORN_PAT.search(content)
    if m:
        register_rumor(m.group(1), m.group(2), float(m.group(3)))
        return {"type": "rumor_born", "text": m.group(1)}

    m = SETTLEMENT_ECON_PAT.search(content)
    if m:
        conn = sqlite3.connect(MEMORY_DB_PATH)
        c = conn.cursor()
        c.execute("""
            INSERT OR REPLACE INTO settlement_economy
            (settlement, food_ratio, water_ratio, morale, is_scarcity, last_updated)
            VALUES (?,?,?,?,?,?)
        """, (m.group(1), float(m.group(2)), float(m.group(3)),
              int(m.group(4)), 1 if m.group(5).lower() == "true" else 0,
              datetime.datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return {"type": "settlement_economy", "settlement": m.group(1)}

    m = MIGRATION_PAT.search(content)
    if m:
        register_rumor(m.group(2), "Wasteland", 0, truth=1.0)
        return {"type": "migration", "season": m.group(1)}

    return None

# ─────────────────────────────────────────────────────────────────────────────
# Full World State Snapshot
# (Used by Mossy's Living World panel)
# ─────────────────────────────────────────────────────────────────────────────

def get_world_snapshot() -> dict:
    """Return a complete snapshot of the world state for Mossy."""
    return {
        "factions":          get_all_faction_power(),
        "active_threats":    get_active_threats(),
        "rumors":            get_active_rumors(),
        "settlements":       _get_all_settlement_economy(),
        "trade_routes":      _get_trade_routes(),
        "generated_at":      datetime.datetime.now().isoformat(),
    }

def _get_all_settlement_economy() -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM settlement_economy ORDER BY morale ASC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def _get_trade_routes() -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM trade_routes WHERE active = 1 ORDER BY safety_level DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows
