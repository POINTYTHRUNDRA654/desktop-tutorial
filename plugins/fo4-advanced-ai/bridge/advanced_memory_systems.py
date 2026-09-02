"""
advanced_memory_systems.py
Fallout 4 Advanced AI — Extended PC Memory Systems
====================================================

All the memory systems that would be impossible to store in Papyrus:

  1. Behavioral Learning    — enemies learn which tactics hurt/help vs the player
  2. World State Memory     — tracks what happened in the world globally
  3. Granular Reputation    — per-faction, per-location, time-decayed rep
  4. Personality Drift      — NPCs change over time based on accumulated events
  5. Combat Pattern Memory  — tracks how the player fights; enemies adapt
  6. Cross-Playthrough Lore — carry world history into new games as rumors

This module is imported by mossy_fo4_bridge.py and extends its SQLite DB.
"""

import sqlite3
import datetime
import json
import math
from pathlib import Path
from typing import Optional

MEMORY_DB_PATH = Path.home() / "Documents" / "My Games" / "Fallout4" / "AdvancedAI_Memory.db"

# ─────────────────────────────────────────────────────────────────────────────
# Schema Extension
# ─────────────────────────────────────────────────────────────────────────────

SCHEMA_EXTENSIONS = """

-- ── 1. Behavioral Learning ────────────────────────────────────────────────
-- Tracks which tactics work/fail against the player per enemy type
CREATE TABLE IF NOT EXISTS tactic_outcomes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    enemy_type      TEXT NOT NULL,   -- e.g. "Raider", "Deathclaw", "SynthCourser"
    tactic          TEXT NOT NULL,   -- e.g. "flank", "charge", "ambush", "suppressive"
    player_level    INTEGER,
    player_weapon   TEXT,            -- weapon category player used
    outcome         TEXT NOT NULL,   -- "success" (enemy survived) / "fail" (enemy died)
    damage_dealt    REAL DEFAULT 0,
    damage_taken    REAL DEFAULT 0,
    encounter_loc   TEXT,
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Aggregated tactic effectiveness per enemy type
CREATE TABLE IF NOT EXISTS tactic_effectiveness (
    enemy_type      TEXT NOT NULL,
    tactic          TEXT NOT NULL,
    success_count   INTEGER DEFAULT 0,
    fail_count      INTEGER DEFAULT 0,
    avg_damage_dealt REAL DEFAULT 0,
    avg_damage_taken REAL DEFAULT 0,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (enemy_type, tactic)
);

-- ── 2. World State Memory ─────────────────────────────────────────────────
-- Global events the whole world can know about
CREATE TABLE IF NOT EXISTS world_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type      TEXT NOT NULL,   -- "cleared_location", "killed_boss", "joined_faction", etc.
    event_subject   TEXT,            -- who/what it happened to
    event_location  TEXT,
    faction_impact  TEXT,            -- which faction it affects (JSON)
    is_public       INTEGER DEFAULT 1, -- can NPCs know about this?
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Location knowledge — which NPCs know what happened where
CREATE TABLE IF NOT EXISTS location_knowledge (
    npc_id          TEXT NOT NULL,
    location_name   TEXT NOT NULL,
    knowledge_type  TEXT NOT NULL,  -- "cleared", "dangerous", "visited", "heard_rumor"
    detail          TEXT,
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (npc_id, location_name, knowledge_type)
);

-- ── 3. Granular Reputation ────────────────────────────────────────────────
-- Per-faction, per-location reputation with time decay
CREATE TABLE IF NOT EXISTS player_reputation (
    faction         TEXT NOT NULL,
    location        TEXT NOT NULL DEFAULT 'global',
    reputation      REAL DEFAULT 0,
    raw_rep         REAL DEFAULT 0,  -- before decay
    last_action_time REAL,           -- game time of last rep-changing action
    decay_rate      REAL DEFAULT 0.002, -- rep lost per in-game hour
    max_rep         REAL DEFAULT 1000,
    min_rep         REAL DEFAULT -1000,
    PRIMARY KEY (faction, location)
);

-- Individual rep events (the history)
CREATE TABLE IF NOT EXISTS reputation_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    faction         TEXT NOT NULL,
    location        TEXT,
    delta           REAL NOT NULL,
    reason          TEXT,
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. Personality Drift ──────────────────────────────────────────────────
-- How an NPC's personality changes over a long playthrough
CREATE TABLE IF NOT EXISTS personality_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id          TEXT NOT NULL,
    snapshot_time   TEXT NOT NULL,
    aggression      REAL,
    morality        REAL,
    loyalty         REAL,
    trust_player    REAL,  -- -1 to 1
    emotional_state TEXT,  -- "happy", "angry", "afraid", "grieving", "hopeful"
    drift_reason    TEXT,  -- what caused this snapshot
    FOREIGN KEY (npc_id) REFERENCES npc_identities(npc_id)
);

-- Current personality state
CREATE TABLE IF NOT EXISTS npc_personality (
    npc_id          TEXT PRIMARY KEY,
    aggression      REAL DEFAULT 0.5,
    morality        REAL DEFAULT 0.5,
    loyalty         REAL DEFAULT 0.5,
    trust_player    REAL DEFAULT 0.0,
    emotional_state TEXT DEFAULT 'neutral',
    drift_events    INTEGER DEFAULT 0,
    FOREIGN KEY (npc_id) REFERENCES npc_identities(npc_id)
);

-- ── 5. Combat Pattern Memory ─────────────────────────────────────────────
-- How the player tends to fight — enemies adapt
CREATE TABLE IF NOT EXISTS player_combat_patterns (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    weapon_category TEXT,    -- "rifle", "pistol", "melee", "explosives", "stealth"
    approach_type   TEXT,    -- "aggressive", "stealth", "sniper", "tank"
    used_vats       INTEGER DEFAULT 0,
    used_cover      INTEGER DEFAULT 0,
    used_stealth    INTEGER DEFAULT 0,
    killed_by_type  TEXT,    -- what killed the player (NULL if player survived)
    enemy_type      TEXT,
    location_type   TEXT,    -- "indoor", "outdoor", "settlement", "dungeon"
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Aggregated player style profile
CREATE TABLE IF NOT EXISTS player_style_profile (
    style_key       TEXT PRIMARY KEY,  -- "primary_weapon", "approach", etc.
    style_value     TEXT,
    confidence      REAL DEFAULT 0.0,  -- 0-1, how sure we are
    sample_count    INTEGER DEFAULT 0,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ── 6. Cross-Playthrough Lore ─────────────────────────────────────────────
-- Things from past playthroughs that can become rumors in new games
CREATE TABLE IF NOT EXISTS lore_archive (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    playthrough_id  TEXT NOT NULL,  -- UUID per playthrough
    lore_type       TEXT NOT NULL,  -- "legend", "rumor", "warning", "myth"
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,  -- The actual rumor/lore text
    faction         TEXT,
    location        TEXT,
    significance    REAL DEFAULT 0.5,  -- 0-1, how notable
    times_shared    INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

-- NPC rumor knowledge — which NPCs have heard which lore
CREATE TABLE IF NOT EXISTS npc_rumors (
    npc_id          TEXT NOT NULL,
    lore_id         INTEGER NOT NULL,
    heard_from      TEXT,  -- "traveler", "radio", "witness"
    trust_level     REAL DEFAULT 0.7,
    spread_count    INTEGER DEFAULT 0,  -- how many times this NPC shared it
    PRIMARY KEY (npc_id, lore_id)
);

"""

def extend_schema():
    """Add advanced memory tables to the database."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.executescript(SCHEMA_EXTENSIONS)
    conn.commit()
    conn.close()
    print("[Memory] Advanced schema initialized")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Behavioral Learning
# ─────────────────────────────────────────────────────────────────────────��───

def record_tactic_outcome(enemy_type: str, tactic: str, outcome: str,
                           player_level: int = 1, player_weapon: str = "unknown",
                           damage_dealt: float = 0, damage_taken: float = 0,
                           location: str = "", game_time: float = 0):
    """Record whether a tactic worked or failed against the player."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()

    c.execute("""
        INSERT INTO tactic_outcomes
        (enemy_type, tactic, player_level, player_weapon, outcome,
         damage_dealt, damage_taken, encounter_loc, game_time)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (enemy_type, tactic, player_level, player_weapon, outcome,
          damage_dealt, damage_taken, location, game_time))

    # Update aggregate table
    if outcome == "success":
        c.execute("""
            INSERT INTO tactic_effectiveness (enemy_type, tactic, success_count, avg_damage_dealt, avg_damage_taken)
            VALUES (?,?,1,?,?)
            ON CONFLICT(enemy_type, tactic) DO UPDATE SET
                success_count = success_count + 1,
                avg_damage_dealt = (avg_damage_dealt * (success_count + fail_count) + ?) / (success_count + fail_count + 1),
                avg_damage_taken = (avg_damage_taken * (success_count + fail_count) + ?) / (success_count + fail_count + 1),
                last_updated = CURRENT_TIMESTAMP
        """, (enemy_type, tactic, damage_dealt, damage_taken, damage_dealt, damage_taken))
    else:
        c.execute("""
            INSERT INTO tactic_effectiveness (enemy_type, tactic, fail_count, avg_damage_dealt, avg_damage_taken)
            VALUES (?,?,1,?,?)
            ON CONFLICT(enemy_type, tactic) DO UPDATE SET
                fail_count = fail_count + 1,
                avg_damage_dealt = (avg_damage_dealt * (success_count + fail_count) + ?) / (success_count + fail_count + 1),
                last_updated = CURRENT_TIMESTAMP
        """, (enemy_type, tactic, damage_dealt, damage_taken, damage_dealt))

    conn.commit()
    conn.close()

def get_best_tactic(enemy_type: str) -> dict:
    """Return the most effective tactic for an enemy type based on history."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("""
        SELECT tactic,
               success_count,
               fail_count,
               avg_damage_dealt,
               CAST(success_count AS REAL) / MAX(success_count + fail_count, 1) as win_rate
        FROM tactic_effectiveness
        WHERE enemy_type = ?
        ORDER BY win_rate DESC, success_count DESC
        LIMIT 5
    """, (enemy_type,))

    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    if not rows:
        return {"enemy_type": enemy_type, "recommended_tactic": "balanced", "confidence": 0.0, "history": []}

    best = rows[0]
    return {
        "enemy_type": enemy_type,
        "recommended_tactic": best["tactic"],
        "win_rate": round(best["win_rate"], 2),
        "confidence": min(best["success_count"] / 10.0, 1.0),  # Confident after 10+ encounters
        "history": rows,
    }

# ─────────────────────────────────────────────────────────────────────────────
# 2. World State Memory
# ─────────────────────────────────────────────────────────────────────────────

def record_world_event(event_type: str, subject: str = "", location: str = "",
                       faction_impact: dict = None, is_public: bool = True,
                       game_time: float = 0):
    """Record a world event that NPCs can know about."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO world_events (event_type, event_subject, event_location,
                                  faction_impact, is_public, game_time)
        VALUES (?,?,?,?,?,?)
    """, (event_type, subject, location,
          json.dumps(faction_impact or {}), 1 if is_public else 0, game_time))
    conn.commit()
    conn.close()

def get_world_state(max_events: int = 20) -> list:
    """Get recent public world events."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT * FROM world_events
        WHERE is_public = 1
        ORDER BY game_time DESC LIMIT ?
    """, (max_events,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def npc_learns_about_location(npc_id: str, location: str, knowledge_type: str,
                               detail: str = "", game_time: float = 0):
    """Give an NPC knowledge about a location."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO location_knowledge
        (npc_id, location_name, knowledge_type, detail, game_time)
        VALUES (?,?,?,?,?)
    """, (npc_id, location, knowledge_type, detail, game_time))
    conn.commit()
    conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# 3. Granular Reputation
# ─────────────────────────────────────────────────────────────────────────────

def modify_reputation(faction: str, delta: float, location: str = "global",
                      reason: str = "", game_time: float = 0):
    """Change player reputation with a faction, at a location."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()

    # Ensure row exists
    c.execute("""
        INSERT OR IGNORE INTO player_reputation (faction, location, reputation, raw_rep)
        VALUES (?,?,0,0)
    """, (faction, location))

    c.execute("""
        UPDATE player_reputation SET
            raw_rep = raw_rep + ?,
            reputation = MAX(min_rep, MIN(max_rep, reputation + ?)),
            last_action_time = ?
        WHERE faction = ? AND location = ?
    """, (delta, delta, game_time, faction, location))

    # Log the event
    c.execute("""
        INSERT INTO reputation_events (faction, location, delta, reason, game_time)
        VALUES (?,?,?,?,?)
    """, (faction, location, delta, reason, game_time))

    conn.commit()
    conn.close()

def get_reputation(faction: str, location: str = "global",
                   current_game_time: float = 0) -> dict:
    """Get decayed reputation with a faction."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("""
        SELECT * FROM player_reputation WHERE faction = ? AND location = ?
    """, (faction, location))
    row = c.fetchone()
    conn.close()

    if not row:
        return {"faction": faction, "location": location, "reputation": 0, "label": "Neutral"}

    r = dict(row)

    # Apply time decay toward 0
    if current_game_time > 0 and r["last_action_time"]:
        hours_passed = (current_game_time - r["last_action_time"]) * 24
        decay = r["decay_rate"] * hours_passed
        if r["reputation"] > 0:
            r["reputation"] = max(0, r["reputation"] - decay)
        elif r["reputation"] < 0:
            r["reputation"] = min(0, r["reputation"] + decay)

    rep = r["reputation"]
    label = ("Idolized" if rep >= 750 else "Liked" if rep >= 250 else
             "Hated" if rep <= -750 else "Disliked" if rep <= -250 else "Neutral")

    return {**r, "reputation": round(rep, 1), "label": label}

def get_all_reputation(current_game_time: float = 0) -> list:
    """Get all faction reputations."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT DISTINCT faction FROM player_reputation")
    factions = [r[0] for r in c.fetchall()]
    conn.close()
    return [get_reputation(f, current_game_time=current_game_time) for f in factions]

# ─────────────────────────────────────────────────────────────────────────────
# 4. Personality Drift
# ─────────────────────────────────────────────────────────────────────────────

def get_npc_personality(npc_id: str) -> dict:
    """Get current personality state for an NPC."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM npc_personality WHERE npc_id = ?", (npc_id,))
    row = c.fetchone()
    conn.close()

    if not row:
        return {
            "npc_id": npc_id, "aggression": 0.5, "morality": 0.5,
            "loyalty": 0.5, "trust_player": 0.0,
            "emotional_state": "neutral", "drift_events": 0
        }
    return dict(row)

def drift_personality(npc_id: str, npc_name: str, event_type: str,
                      delta: dict, reason: str = ""):
    """
    Apply a personality drift to an NPC.

    delta keys: aggression, morality, loyalty, trust_player (all -1 to +1 changes)
    """
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()

    # Ensure personality row exists
    c.execute("""
        INSERT OR IGNORE INTO npc_personality
        (npc_id, aggression, morality, loyalty, trust_player, emotional_state)
        VALUES (?,0.5,0.5,0.5,0.0,'neutral')
    """, (npc_id,))

    # Apply deltas (clamped 0-1 except trust which is -1 to 1)
    for trait, change in delta.items():
        if trait == "trust_player":
            c.execute(f"""
                UPDATE npc_personality SET
                    {trait} = MAX(-1.0, MIN(1.0, {trait} + ?)),
                    drift_events = drift_events + 1
                WHERE npc_id = ?
            """, (change, npc_id))
        elif trait in ("aggression", "morality", "loyalty"):
            c.execute(f"""
                UPDATE npc_personality SET
                    {trait} = MAX(0.0, MIN(1.0, {trait} + ?)),
                    drift_events = drift_events + 1
                WHERE npc_id = ?
            """, (change, npc_id))

    # Record snapshot
    p = get_npc_personality(npc_id)
    c.execute("""
        INSERT INTO personality_snapshots
        (npc_id, snapshot_time, aggression, morality, loyalty, trust_player,
         emotional_state, drift_reason)
        VALUES (?,?,?,?,?,?,?,?)
    """, (npc_id, now, p["aggression"], p["morality"], p["loyalty"],
          p["trust_player"], p["emotional_state"], reason))

    conn.commit()
    conn.close()

def get_personality_history(npc_id: str, limit: int = 20) -> list:
    """Get personality drift history for an NPC."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT * FROM personality_snapshots WHERE npc_id = ?
        ORDER BY snapshot_time DESC LIMIT ?
    """, (npc_id, limit))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ─────────────────────────────────────────────────────────────────────────────
# 5. Combat Pattern Memory
# ─────────────────────────────────────────────────────────────────────────────

def record_combat_pattern(weapon_category: str, approach_type: str,
                           used_vats: bool = False, used_cover: bool = False,
                           used_stealth: bool = False, killed_by_type: str = None,
                           enemy_type: str = "", location_type: str = "outdoor",
                           game_time: float = 0):
    """Record how the player fought in a combat encounter."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()

    c.execute("""
        INSERT INTO player_combat_patterns
        (weapon_category, approach_type, used_vats, used_cover, used_stealth,
         killed_by_type, enemy_type, location_type, game_time)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (weapon_category, approach_type, int(used_vats), int(used_cover),
          int(used_stealth), killed_by_type, enemy_type, location_type, game_time))

    # Update style profile
    _update_style_profile(c)

    conn.commit()
    conn.close()

def _update_style_profile(c):
    """Recalculate player style profile from recent combat data (last 50 encounters)."""
    c.execute("""
        SELECT weapon_category, COUNT(*) as cnt
        FROM player_combat_patterns
        ORDER BY game_time DESC LIMIT 50
        GROUP BY weapon_category ORDER BY cnt DESC LIMIT 1
    """)
    row = c.fetchone()
    if row:
        c.execute("""
            INSERT OR REPLACE INTO player_style_profile (style_key, style_value, sample_count)
            VALUES ('primary_weapon', ?, ?)
        """, (row[0], row[1]))

    c.execute("""
        SELECT approach_type, COUNT(*) as cnt
        FROM player_combat_patterns
        ORDER BY game_time DESC LIMIT 50
        GROUP BY approach_type ORDER BY cnt DESC LIMIT 1
    """)
    row = c.fetchone()
    if row:
        c.execute("""
            INSERT OR REPLACE INTO player_style_profile (style_key, style_value, sample_count)
            VALUES ('primary_approach', ?, ?)
        """, (row[0], row[1]))

def get_player_style() -> dict:
    """Get the player's current combat style profile."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM player_style_profile")
    rows = {r["style_key"]: r["style_value"] for r in c.fetchall()}

    # Get adaptation hints for enemies
    c.execute("""
        SELECT enemy_type, COUNT(*) as encounters,
               SUM(CASE WHEN killed_by_type = enemy_type THEN 1 ELSE 0 END) as player_deaths
        FROM player_combat_patterns
        GROUP BY enemy_type ORDER BY encounters DESC LIMIT 5
    """)
    enemy_data = [dict(r) for r in c.fetchall()]
    conn.close()

    primary_approach = rows.get("primary_approach", "balanced")
    primary_weapon   = rows.get("primary_weapon", "rifle")

    # Generate counter-tactics
    counter = {
        "aggressive": "defensive_spread",
        "stealth":    "area_denial",
        "sniper":     "close_gap",
        "tank":       "flanking",
        "balanced":   "adaptive",
    }.get(primary_approach, "adaptive")

    return {
        "primary_weapon":   primary_weapon,
        "primary_approach": primary_approach,
        "recommended_counter_tactic": counter,
        "weapon_counter": {
            "rifle":     "use_cover_aggressively",
            "pistol":    "maintain_range",
            "melee":     "keep_distance_explosive",
            "explosives":"spread_out",
            "sniper":    "charge_or_flank",
        }.get(primary_weapon, "adaptive"),
        "enemy_data": enemy_data,
    }

# ─────────────────────────────────────────────────────────────────────────────
# 6. Cross-Playthrough Lore
# ─────────────────────────────────────────────────────────────────────────────

def archive_lore(playthrough_id: str, lore_type: str, title: str, content: str,
                 faction: str = "", location: str = "", significance: float = 0.5):
    """Archive a notable event as lore for future playthroughs."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO lore_archive
        (playthrough_id, lore_type, title, content, faction, location, significance)
        VALUES (?,?,?,?,?,?,?)
    """, (playthrough_id, lore_type, title, content, faction, location, significance))
    conn.commit()
    conn.close()

def get_lore_for_new_game(playthrough_id: str, max_items: int = 10) -> list:
    """
    Get high-significance lore from past playthroughs to inject as rumors
    in a new game. Excludes current playthrough.
    """
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT * FROM lore_archive
        WHERE playthrough_id != ?
        ORDER BY significance DESC, times_shared ASC
        LIMIT ?
    """, (playthrough_id, max_items))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def generate_lore_from_events(playthrough_id: str):
    """
    Auto-generate lore entries from significant world events in this playthrough.
    Call this at the end of a session or when starting a new game.
    """
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Get all significant public events
    c.execute("""
        SELECT * FROM world_events WHERE is_public = 1
        ORDER BY game_time DESC
    """)
    events = [dict(r) for r in c.fetchall()]
    conn.close()

    for event in events:
        etype = event["event_type"]
        subj  = event.get("event_subject", "someone")
        loc   = event.get("event_location", "the Commonwealth")

        title, content, significance = None, None, 0.3

        if etype == "cleared_location":
            title = f"The Clearing of {loc}"
            content = f"They say a lone wanderer cleared {loc} of all threats. The place is safe now — or so the rumors go."
            significance = 0.6
        elif etype == "killed_boss":
            title = f"The Death of {subj}"
            content = f"Word spread fast that {subj} at {loc} met their end. People still argue about who did it."
            significance = 0.8
        elif etype == "joined_faction":
            title = f"The Wanderer's Choice"
            content = f"They say the Sole Survivor chose a side — joining {subj}. Some called it destiny."
            significance = 0.7

        if title and content:
            archive_lore(playthrough_id, "legend", title, content,
                        faction=event.get("faction_impact", ""),
                        location=loc, significance=significance)

# ─────────────────────────────────────────────────────────────────────────────
# Unified Context Builder
# (Used by conversation engine to build rich NPC context)
# ─────────────────────────────────────────────────────────────────────────────

def build_rich_npc_context(npc_id: str, npc_name: str,
                            current_location: str = "",
                            current_game_time: float = 0) -> str:
    """
    Build a complete natural language context string for an NPC.
    This is sent to Mossy's AI (Ollama/Gemini) to generate realistic dialogue.
    """
    from mossy_fo4_bridge import get_npc_memory  # imported here to avoid circular

    mem     = get_npc_memory(npc_id)
    pers    = get_npc_personality(npc_id)
    world   = get_world_state(max_events=8)
    style   = get_player_style()

    ctx  = f"=== NPC Profile: {npc_name} ===\n"
    ctx += f"Location: {current_location or 'Unknown'}\n"

    if mem.get("found"):
        ctx += f"Race: {mem['identity'].get('npc_race', 'Human')}\n"
        ctx += f"Faction: {mem['identity'].get('npc_faction', 'Unknown')}\n"
        ctx += f"Relationship with player: {(mem.get('relationship') or {}).get('relationship', 'stranger')}\n"
        ctx += f"Affinity: {mem['identity']['affinity']:.0f} ({_affinity_label(mem['identity']['affinity'])})\n"
        ctx += f"Total player encounters: {(mem.get('relationship') or {}).get('total_encounters', 0)}\n\n"

    ctx += "=== Personality ===\n"
    ctx += f"Aggression: {pers['aggression']:.0%}  "
    ctx += f"Morality: {pers['morality']:.0%}  "
    ctx += f"Loyalty: {pers['loyalty']:.0%}  "
    ctx += f"Trust in player: {pers['trust_player']:.0%}\n"
    ctx += f"Current emotional state: {pers['emotional_state']}\n\n"

    if mem.get("memories"):
        ctx += "=== Recent Memories ===\n"
        for m in mem["memories"][:4]:
            ctx += f"- {m.get('event_label') or 'Event'}: {m.get('detail', '')}\n"
        ctx += "\n"

    if world:
        ctx += "=== World Events They May Know ===\n"
        for w in world[:4]:
            ctx += f"- {w['event_type']}: {w.get('event_subject','')} at {w.get('event_location','')}\n"
        ctx += "\n"

    # Player combat style (so enemies can reference it)
    ctx += "=== Player Combat Style ===\n"
    ctx += f"Primary weapon: {style['primary_weapon']}\n"
    ctx += f"Approach: {style['primary_approach']}\n\n"

    return ctx

def _affinity_label(val: float) -> str:
    if val >= 750:  return "Idolizes"
    if val >= 250:  return "Likes"
    if val <= -750: return "Loathes"
    if val <= -250: return "Dislikes"
    return "Neutral"
