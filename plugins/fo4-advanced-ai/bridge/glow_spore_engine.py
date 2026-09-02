"""
glow_spore_engine.py
Fallout 4 Advanced AI — Glow Map & Spore Infection Bridge Module
================================================================

Tracks everything about bioluminescence and spore infection that
Papyrus can't hold in memory:

  INFECTION TRACKING
    - Full infection history per character (player + NPCs)
    - Infection timeline (when exposed, stage progression, cure events)
    - Spore type database with detailed effect tables
    - NPC infection spread graph (who infected who)
    - Cure availability by location
    - Settlement infection risk (if infected NPCs travel)

  GLOW STATE TRACKING
    - Which pulse zones are currently active
    - Current bioluminescence intensity (night/day, weather, stress)
    - Player glow state and timer
    - Vine network alert history
    - Glow map performance metrics

  PLANT ECOSYSTEM
    - Spore plant population (how many are alive, where)
    - Plant respawn tracking (plants regrow over 7 game-days)
    - Plant species distribution per biome
    - Antidote plant locations (rare — only 3-5 per playthrough)

  MOSSY INTEGRATION
    - Infection Monitor panel (real-time infection state)
    - Glow Zone Monitor (pulse zone status)
    - Spore plant map (dangerous zones)
    - Cure finder (nearest cure source)

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
# Spore Type Database
# ─────────────────────────────────────────────────────────────────────────────

SPORE_TYPES = {
    "hallucinogenic": {
        "description":  "Psychotropic fungal spores from the luminescent cap mushrooms",
        "color":        "purple",
        "glow_color":   "#9B59B6",
        "stage_effects": {
            1: "Mild visual distortion at screen edges. Slight disorientation.",
            2: "Enemies may briefly appear as allies. Colors oversaturated.",
            3: "Full hallucinations. Can't distinguish friend from foe. Total confusion.",
            4: "Complete dissociation. Loss of motor control.",
        },
        "cure_effectiveness": {
            "antibiotics":    "Stage 1-2: Full cure. Stage 3: Reduces to Stage 2.",
            "antidote_plant": "Any stage: Full cure.",
            "radaway":        "No effect.",
            "doctor":         "Stage 1-3: Full cure.",
        },
        "spread_to_npcs":   False,
        "immunity_items":   ["Hazmat Suit", "Gas Mask with Filter"],
        "plant_source":     "Luminescent Cap (glowing purple mushrooms)",
        "danger_level":     "High",
    },
    "paralytic": {
        "description":  "Neurotoxic spores from Spore Stalk plants — attack the nervous system",
        "color":        "blue",
        "glow_color":   "#2E86C1",
        "stage_effects": {
            1: "-30% movement speed. AP regenerates 25% slower.",
            2: "-60% movement speed. -2 Agility. AP drain increased.",
            3: "Near immobile (-80% speed). Limbs occasionally unresponsive.",
            4: "Complete paralysis of lower body. Crawling only.",
        },
        "cure_effectiveness": {
            "antibiotics":    "Stage 1-2: Full cure.",
            "antidote_plant": "Any stage: Full cure in 10 seconds.",
            "stimpack":       "Temporary relief — reduces 1 stage for 2 minutes.",
            "doctor":         "Stage 1-3: Full cure.",
        },
        "spread_to_npcs":   False,
        "immunity_items":   ["Hazmat Suit"],
        "plant_source":     "Spore Stalk (tall rigid plants with pod tips)",
        "danger_level":     "High",
    },
    "corrosive": {
        "description":  "Acid-producing spores that eat through armor and exposed skin",
        "color":        "yellow-green",
        "glow_color":   "#27AE60",
        "stage_effects": {
            1: "Armor degrades -5% per minute. Minor skin irritation.",
            2: "Armor -15% per minute. Radiation resistance halved.",
            3: "Armor destroyed in 5 minutes. Exposed skin takes +50% radiation damage.",
            4: "All armor dissolved. Every hit causes additional acid damage.",
        },
        "cure_effectiveness": {
            "antibiotics":    "Stops progression. Armor damage is permanent.",
            "antidote_plant": "Neutralizes acid. Armor can be repaired afterwards.",
            "doctor":         "Stops corrosion but armor repair still needed.",
        },
        "spread_to_npcs":   False,
        "immunity_items":   ["Hazmat Suit", "Power Armor (mostly immune)"],
        "plant_source":     "Acid Fern (low-growing serrated leaves)",
        "danger_level":     "Very High (armor destruction)",
    },
    "radiation": {
        "description":  "Radioactive spores from plants adapted to Glowing Sea radiation levels",
        "color":        "green",
        "glow_color":   "#2ECC71",
        "stage_effects": {
            1: "+2 rads/sec. Minor glow effect on skin.",
            2: "+5 rads/sec. Skin visibly glows. Max HP reduced.",
            3: "+10 rads/sec (Glowing Sea levels). HP reduction. Bioluminescent effect.",
            4: "+20 rads/sec. Becoming a Glowing One. Full glow map effect on player.",
        },
        "cure_effectiveness": {
            "radaway":        "Stage 1: Full cure. Stage 2-3: Reduces by 1 stage.",
            "antidote_plant": "Any stage: Full cure.",
            "antibiotics":    "No effect on radiation spores.",
            "doctor":         "Stage 1-2: Full cure. Stage 3+: Reduces to Stage 2.",
        },
        "spread_to_npcs":   True,  # Radiation spreads via proximity (glowing)
        "immunity_items":   ["Hazmat Suit", "Power Armor", "Rad-X (temporary)"],
        "plant_source":     "Rad Bloom (glowing green flowers near craters)",
        "danger_level":     "Extreme (can turn player into Glowing One at Stage 4)",
    },
    "blinding": {
        "description":  "Spores that attack the optical nerves — progressive vision loss",
        "color":        "white",
        "glow_color":   "#F0F0F0",
        "stage_effects": {
            1: "Slight visual static at screen edges.",
            2: "Vision blurred. Range greatly reduced. Sneak attack penalty.",
            3: "Near-blind. Only dim outlines visible. VATS required for combat.",
            4: "Total blindness. Must use VATS exclusively. Social interactions voice-only.",
        },
        "cure_effectiveness": {
            "antibiotics":    "Stage 1-2: Full cure. Stage 3: Partial (reduce to 2).",
            "antidote_plant": "Any stage: Full cure. Vision restores over 5 seconds.",
            "doctor":         "Stage 1-3: Full cure.",
            "refreshing_bev": "Temporary 30-second clarity at Stage 1-2.",
        },
        "spread_to_npcs":   False,
        "immunity_items":   ["Hazmat Suit", "Full-face mask with filters"],
        "plant_source":     "Ghost Orchid (translucent flowers, nearly invisible)",
        "danger_level":     "High (combat-crippling)",
    },
    "infectious": {
        "description":  "Virulent spores engineered (or evolved) to maximize host-to-host spread",
        "color":        "dark red",
        "glow_color":   "#E74C3C",
        "stage_effects": {
            1: "Fatigue. HP drain 1/sec. Mild fever visual effect.",
            2: "HP drain 2/sec. Stage 3 NPC infection risk. Sweating/shaking.",
            3: "HP drain 4/sec. Infects nearby NPCs passively. Settlements at risk.",
            4: "HP drain 8/sec. Every NPC within 300 units is infected. Mass outbreak.",
        },
        "cure_effectiveness": {
            "antibiotics":    "Stage 1-2: Full cure. Stage 3: Reduces to 2 only.",
            "antidote_plant": "Any stage: Full cure. Also cures nearby infected NPCs.",
            "doctor":         "Stage 1-3: Full cure. Stage 4: Reduces to 2.",
        },
        "spread_to_npcs":   True,   # This one is built to spread
        "immunity_items":   ["Hazmat Suit"],
        "plant_source":     "Plague Blossom (red veined flowers, smell of iron)",
        "danger_level":     "EXTREME (settlement outbreak risk)",
    },
}

# Antidote plant — rare spawn in jungle
ANTIDOTE_PLANT = {
    "name":         "Glowing Root",
    "description":  "A bioluminescent root that produces compounds neutralizing all spore types. "
                    "The jungle's own cure, hidden within its most dangerous areas.",
    "glow_color":   "#F39C12",  # Golden amber glow
    "rarity":       "Very Rare",  # 3-5 per playthrough
    "locations":    ["Deep Glowing Sea Jungle", "Near Crater of Atom", "Vine Network Centers"],
    "respawn_days": 30,           # Regrows every 30 game-days
    "harvest_yield": 1,           # One per plant
    "use_effect":   "Cures all spore types at any stage in under 10 seconds",
    "bonus_effect": "If used at Stage 4: Also cures all nearby infected NPCs",
}

# ─────────────────────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────────────────────

GLOW_SPORE_SCHEMA = """

-- Infection tracking
CREATE TABLE IF NOT EXISTS infection_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id        TEXT NOT NULL,    -- 'player' or NPC form ID
    actor_name      TEXT,
    spore_type      TEXT NOT NULL,
    current_stage   INTEGER DEFAULT 0,
    exposed_at      TEXT NOT NULL,
    stage_1_at      TEXT,
    stage_2_at      TEXT,
    stage_3_at      TEXT,
    stage_4_at      TEXT,
    cured_at        TEXT,
    cure_method     TEXT,
    fatal           INTEGER DEFAULT 0,
    infected_by     TEXT,             -- who spread it (player/NPC id)
    game_time       REAL
);

-- Infection spread graph
CREATE TABLE IF NOT EXISTS infection_spread (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id       TEXT NOT NULL,
    target_id       TEXT NOT NULL,
    spore_type      TEXT,
    spread_location TEXT,
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Spore plant tracking
CREATE TABLE IF NOT EXISTS spore_plants (
    plant_id        TEXT PRIMARY KEY,
    plant_type      TEXT NOT NULL,
    location        TEXT,
    spore_type      TEXT NOT NULL,
    is_alive        INTEGER DEFAULT 1,
    kills_count     INTEGER DEFAULT 0,
    last_fired      TEXT,
    respawn_at      TEXT
);

-- Antidote plant tracking
CREATE TABLE IF NOT EXISTS antidote_plants (
    plant_id        TEXT PRIMARY KEY,
    location        TEXT NOT NULL,
    is_available    INTEGER DEFAULT 1,
    harvested_at    TEXT,
    respawn_at      TEXT
);

-- Glow zone state
CREATE TABLE IF NOT EXISTS glow_zones (
    zone_name       TEXT PRIMARY KEY,
    zone_type       TEXT,             -- fungal/spore/vine/ocean
    pulse_pattern   TEXT DEFAULT 'slow',
    is_active       INTEGER DEFAULT 1,
    intensity       REAL DEFAULT 1.0,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Vine network events
CREATE TABLE IF NOT EXISTS vine_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type      TEXT NOT NULL,    -- alert/plant_fired/plant_died/player_entered
    location        TEXT,
    triggered_by    TEXT,
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

"""

def init_glow_spore_schema():
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.executescript(GLOW_SPORE_SCHEMA)

    # Seed glow zones
    c = conn.cursor()
    zones = [
        ("Fungal_A", "fungal", "slow"),
        ("Fungal_B", "fungal", "slow"),
        ("SporeA",   "spore",  "rapid"),
        ("SporeB",   "spore",  "rapid"),
        ("Vine_A",   "vine",   "cascade"),
        ("Vine_B",   "vine",   "cascade"),
        ("Ocean_A",  "ocean",  "slow"),
        ("Ocean_B",  "ocean",  "slow"),
    ]
    for name, ztype, pattern in zones:
        c.execute("""
            INSERT OR IGNORE INTO glow_zones (zone_name, zone_type, pulse_pattern)
            VALUES (?,?,?)
        """, (name, ztype, pattern))

    conn.commit()
    conn.close()
    print("[Spore] Glow/Spore engine schema initialized")

# ─────────────────────────────────────────────────────────────────────────────
# Infection Tracking
# ─────────────────────────────────────────────────────────────────────────────

def record_infection(actor_id: str, actor_name: str, spore_type: str,
                     infected_by: str = "", game_time: float = 0) -> int:
    """Record a new infection event."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()

    c.execute("""
        INSERT INTO infection_records
        (actor_id, actor_name, spore_type, exposed_at, infected_by, game_time)
        VALUES (?,?,?,?,?,?)
    """, (actor_id, actor_name, spore_type, now, infected_by, game_time))

    record_id = c.lastrowid

    # Log spread if infected by someone
    if infected_by:
        c.execute("""
            INSERT INTO infection_spread (source_id, target_id, spore_type, game_time)
            VALUES (?,?,?,?)
        """, (infected_by, actor_id, spore_type, game_time))

    conn.commit()
    conn.close()
    return record_id

def update_infection_stage(actor_id: str, new_stage: int, game_time: float = 0):
    """Update the infection stage for an actor."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()

    stage_col = {1: "stage_1_at", 2: "stage_2_at", 3: "stage_3_at", 4: "stage_4_at"}.get(new_stage)
    if stage_col:
        c.execute(f"""
            UPDATE infection_records SET
                current_stage = ?,
                {stage_col} = ?
            WHERE actor_id = ? AND cured_at IS NULL
            ORDER BY id DESC LIMIT 1
        """, (new_stage, now, actor_id))

    conn.commit()
    conn.close()

def record_cure(actor_id: str, cure_method: str, game_time: float = 0):
    """Record infection cured."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()
    c.execute("""
        UPDATE infection_records SET
            cured_at = ?,
            cure_method = ?,
            current_stage = 0
        WHERE actor_id = ? AND cured_at IS NULL
        ORDER BY id DESC LIMIT 1
    """, (now, cure_method, actor_id))
    conn.commit()
    conn.close()

def get_active_infections() -> list:
    """Get all currently active infections."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT ir.*,
               st.danger_level,
               st.stage_effects
        FROM infection_records ir
        WHERE ir.cured_at IS NULL AND ir.fatal = 0
        ORDER BY ir.current_stage DESC, ir.exposed_at DESC
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    # Enrich with spore type data
    for r in rows:
        stype = SPORE_TYPES.get(r["spore_type"], {})
        r["danger_level"]      = stype.get("danger_level", "Unknown")
        r["current_effect"]    = stype.get("stage_effects", {}).get(r["current_stage"], "Unknown")
        r["cure_options"]      = stype.get("cure_effectiveness", {})
        r["glow_color"]        = stype.get("glow_color", "#FFFFFF")
        r["time_since_exposed"] = _time_since(r["exposed_at"])

    return rows

def _time_since(timestamp: str) -> str:
    """Human-readable time since a timestamp."""
    try:
        dt = datetime.datetime.fromisoformat(timestamp)
        delta = datetime.datetime.now() - dt
        minutes = int(delta.total_seconds() / 60)
        if minutes < 60:   return f"{minutes}m ago"
        hours = minutes // 60
        if hours < 24:     return f"{hours}h ago"
        return f"{hours // 24}d ago"
    except Exception:
        return "unknown"

# ─────────────────────────────────────────────────────────────────────────────
# Glow Zone Management
# ─────────────────────────────────────────────────────────────────────────────

def update_glow_zone(zone_name: str, is_active: bool, intensity: float = 1.0):
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        UPDATE glow_zones SET is_active = ?, intensity = ?, last_updated = ?
        WHERE zone_name = ?
    """, (1 if is_active else 0, intensity, datetime.datetime.now().isoformat(), zone_name))
    conn.commit()
    conn.close()

def get_glow_zone_status() -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM glow_zones ORDER BY zone_type, zone_name")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ─────────────────────────────────────────────────────────────────────────────
# Vine Network Events
# ─────────────────────────────────────────────────────────────────────────────

def record_vine_event(event_type: str, location: str = "", triggered_by: str = "", game_time: float = 0):
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO vine_events (event_type, location, triggered_by, game_time)
        VALUES (?,?,?,?)
    """, (event_type, location, triggered_by, game_time))
    conn.commit()
    conn.close()

def get_vine_event_history(limit: int = 20) -> list:
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT * FROM vine_events ORDER BY real_time DESC LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ─────────────────────────────────────────────────────────────────────────────
# Antidote Plant Tracking
# ─────────────────────────────────────────────────────────────────────────────

def record_antidote_harvest(plant_id: str, location: str):
    """Record that an antidote plant was harvested — schedule respawn."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now()
    respawn = (now + datetime.timedelta(days=30)).isoformat()

    c.execute("""
        INSERT OR REPLACE INTO antidote_plants (plant_id, location, is_available, harvested_at, respawn_at)
        VALUES (?,?,0,?,?)
    """, (plant_id, location, now.isoformat(), respawn))
    conn.commit()
    conn.close()

def get_antidote_availability() -> dict:
    """Get which antidote plants are currently available."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT * FROM antidote_plants ORDER BY is_available DESC")
    plants = [dict(r) for r in c.fetchall()]

    available_count = sum(1 for p in plants if p["is_available"])
    total_count     = len(plants)

    conn.close()
    return {
        "available":       available_count,
        "total_tracked":   total_count,
        "plants":          plants,
        "scarcity_level": ("Critical" if available_count == 0 else
                           "Scarce" if available_count <= 1 else
                           "Limited" if available_count <= 2 else "Available"),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Mossy Monitor Data
# ─────────────────────────────────────────────────────────────────────────────

def get_infection_snapshot() -> dict:
    """Full infection state for Mossy's Infection Monitor panel."""
    active = get_active_infections()
    player_infections = [i for i in active if i["actor_id"] == "player"]
    npc_infections    = [i for i in active if i["actor_id"] != "player"]
    antidote          = get_antidote_availability()

    player_inf = player_infections[0] if player_infections else None

    return {
        "player_infected":    player_inf is not None,
        "player_infection":   player_inf,
        "npc_infections":     npc_infections,
        "npc_count":          len(npc_infections),
        "outbreak_risk":      len(npc_infections) >= 3,
        "antidote_plants":    antidote,
        "spore_types":        {k: {"description": v["description"],
                                   "danger": v["danger_level"],
                                   "color": v["glow_color"]}
                               for k, v in SPORE_TYPES.items()},
        "antidote_plant_info": ANTIDOTE_PLANT,
        "generated_at":       datetime.datetime.now().isoformat(),
    }

def get_glow_snapshot(game_hour: float, is_night: bool,
                       gs_jungle_active: bool) -> dict:
    """Full glow zone state for Mossy's Glow Monitor panel."""
    zones = get_glow_zone_status()
    vine_history = get_vine_event_history(10)

    # Pulse period labels
    active_zones = [z for z in zones if z["is_active"]]
    pattern_counts = {}
    for z in active_zones:
        p = z["pulse_pattern"]
        pattern_counts[p] = pattern_counts.get(p, 0) + 1

    return {
        "gs_jungle_active":  gs_jungle_active,
        "game_hour":         game_hour,
        "is_night":          is_night,
        "glow_intensity":    1.0 if is_night else 0.35,
        "zones":             zones,
        "active_zone_count": len(active_zones),
        "pattern_distribution": pattern_counts,
        "vine_events":       vine_history,
        "antidote_plant":    ANTIDOTE_PLANT,
        "generated_at":      datetime.datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Log Parser
# ─────────────────────────────────────────────────────────────────────────────

SPORE_INFECT_PAT = re.compile(
    r'SPORE_INFECT\|target=([^|]+)\|type=([^|]+)\|distance=([\d.]+)\|game_time=([\d.]+)'
)
SPORE_STAGE_PAT  = re.compile(
    r'SPORE_STAGE\|stage=(\d+)\|type=([^|]+)\|game_time=([\d.]+)'
)
SPORE_CURED_PAT  = re.compile(r'SPORE_CURED\|game_time=([\d.]+)')
SPORE_NPC_PAT    = re.compile(r'SPORE_NPC\|npc=([^|]+)\|type=([^|]+)\|game_time=([\d.]+)')
VINE_ALERT_PAT   = re.compile(r'VINE_ALERT\|reason=([^|]+)\|radius=([\d.]+)\|creatures_alerted=(\d+)')
GLOW_TRANSFER_PAT = re.compile(r'GLOW_TRANSFER\|player=(\w+)\|night=(\w+)')

def parse_glow_spore_log_line(content: str) -> Optional[dict]:
    """Parse glow/spore tagged log lines."""

    m = SPORE_INFECT_PAT.search(content)
    if m:
        target = m.group(1)
        actor_id = "player" if target == "player" else target
        record_infection(actor_id, target, m.group(2), game_time=float(m.group(4)))
        return {"type": "infection", "actor": target, "spore_type": m.group(2)}

    m = SPORE_STAGE_PAT.search(content)
    if m:
        update_infection_stage("player", int(m.group(1)), float(m.group(3)))
        return {"type": "stage_change", "stage": int(m.group(1)), "spore_type": m.group(2)}

    m = SPORE_CURED_PAT.search(content)
    if m:
        record_cure("player", "in_game_cure", float(m.group(1)))
        return {"type": "cured", "actor": "player"}

    m = SPORE_NPC_PAT.search(content)
    if m:
        record_infection(m.group(1), m.group(1), m.group(2),
                         infected_by="player", game_time=float(m.group(3)))
        return {"type": "npc_infected", "npc": m.group(1), "spore_type": m.group(2)}

    m = VINE_ALERT_PAT.search(content)
    if m:
        record_vine_event("alert", triggered_by=m.group(1))
        return {"type": "vine_alert", "reason": m.group(1),
                "creatures_alerted": int(m.group(3))}

    m = GLOW_TRANSFER_PAT.search(content)
    if m:
        return {"type": "glow_transfer", "at_night": m.group(2) == "True"}

    return None
