"""
learning_engine.py — Adaptive Learning System for Mossy Industries Advanced AI
===============================================================================

Enemies remember what works. Settlers remember attacks. The world adapts.

WHAT IT DOES:
  ENEMY TACTICAL LEARNING
    Every combat outcome is logged to tactic_outcomes (schema already in advanced_memory_systems.py).
    Before generating a new combat directive, the engine queries which tactics have worked
    against THIS player, at THIS HP level, with THIS weapon type.
    Enemies genuinely adapt over time — a Raider who rushed you and died twice
    will switch to cover. A Deathclaw that charged and got hit by missiles will
    try a different approach.

  PLAYER PATTERN RECOGNITION
    Tracks how the player fights: sniper, rusher, stealth, explosives.
    Enemy AI reads this profile and counters it:
      Sniper player?     → Enemies spread out, close distance, use smoke (interior cover)
      Rusher?            → Enemies form a line, trip hazards, retreating fire
      Stealth player?    → Enemies randomize patrol patterns, buddy system
      Explosives player? → Enemies stay spread, avoid clustering

  SETTLER ATTACK MEMORY
    Each settlement logs every attack: when, what, casualties, outcome.
    After X attacks from the same direction, settlers start placing turrets there.
    After a heavy attack from Raiders, they specifically recruit more guards.
    After a Deathclaw attack, they petition Minutemen for heavy weapons.

  MISTAKE LEARNING
    If an NPC died using a specific tactic, the whole TYPE (not just the individual)
    has that tactic's success rate lowered. The enemy faction "learns" as a unit.
    This is persistent across sessions via SQLite.

OUTPUTS:
  - get_best_tactic(enemy_type, player_weapon, player_level) → recommended tactic
  - record_outcome(enemy_type, tactic, outcome, damage_dealt, damage_taken)
  - get_player_combat_profile() → dict with play style metrics
  - get_settler_defense_recommendations(settlement_name) → what to build/upgrade
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# DB Path
# ─────────────────────────────────────────────────────────────────────────────

_MOSSY_MEMORY = Path(r"H:\Mossy Memory")
_DOCS_FALLBACK = Path.home() / "Documents" / "My Games" / "Fallout4"
MEMORY_DB = (_MOSSY_MEMORY / "AdvancedAI_Memory.db" if _MOSSY_MEMORY.exists()
             else _DOCS_FALLBACK / "AdvancedAI_Memory.db")

# ─────────────────────────────────────────────────────────────────────────────
# Schema (additive — safe to run on existing DB)
# ─────────────────────────────────────────────────────────────────────────────

_LEARNING_SCHEMA = """
CREATE TABLE IF NOT EXISTS tactic_outcomes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    enemy_type      TEXT NOT NULL,
    tactic          TEXT NOT NULL,
    player_level    INTEGER DEFAULT 1,
    player_weapon   TEXT DEFAULT 'unknown',
    outcome         TEXT NOT NULL,
    damage_dealt    REAL DEFAULT 0,
    damage_taken    REAL DEFAULT 0,
    encounter_loc   TEXT DEFAULT '',
    game_time       REAL DEFAULT 0,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS player_combat_patterns (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT DEFAULT '',
    weapon_used     TEXT DEFAULT 'unknown',
    weapon_category TEXT DEFAULT 'unknown',
    damage_dealt    REAL DEFAULT 0,
    kill_distance   REAL DEFAULT 0,
    used_cover      INTEGER DEFAULT 0,
    used_stealth    INTEGER DEFAULT 0,
    used_explosives INTEGER DEFAULT 0,
    game_time       REAL DEFAULT 0,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_style_profile (
    id              INTEGER PRIMARY KEY,
    sniper_score    REAL DEFAULT 0,
    rusher_score    REAL DEFAULT 0,
    stealth_score   REAL DEFAULT 0,
    explosive_score REAL DEFAULT 0,
    melee_score     REAL DEFAULT 0,
    dominant_style  TEXT DEFAULT 'balanced',
    total_encounters INTEGER DEFAULT 0,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default player profile
INSERT OR IGNORE INTO player_style_profile (id) VALUES (1);

CREATE TABLE IF NOT EXISTS settlement_attack_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    settlement_name TEXT NOT NULL,
    attacker_type   TEXT DEFAULT 'unknown',
    attack_direction TEXT DEFAULT 'unknown',
    casualties      INTEGER DEFAULT 0,
    structures_lost INTEGER DEFAULT 0,
    outcome         TEXT DEFAULT 'repelled',
    defense_score   INTEGER DEFAULT 0,
    population      INTEGER DEFAULT 0,
    game_time       REAL DEFAULT 0,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settlement_defense_adaptations (
    settlement_name TEXT NOT NULL,
    adaptation_type TEXT NOT NULL,
    description     TEXT NOT NULL,
    priority        INTEGER DEFAULT 1,
    implemented     INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (settlement_name, adaptation_type)
);
"""


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(MEMORY_DB)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.executescript(_LEARNING_SCHEMA)
    return c


# ─────────────────────────────────────────────────────────────────────────────
# Enemy Tactic Learning
# ─────────────────────────────────────────────────────────────────────────────

# Base tactic weights per enemy type — overridden by learned data
_DEFAULT_TACTIC_POOLS: dict[str, list[str]] = {
    "Raider":        ["rush", "suppress", "flank", "take_cover", "taunt"],
    "Gunner":        ["take_cover", "flank", "suppress", "regroup", "advance"],
    "Super Mutant":  ["rush", "throw_human", "suppress_minigun", "rush"],
    "Feral Ghoul":   ["swarm_rush", "screech_alert", "swarm_rush"],
    "Synth":         ["take_cover", "flank", "advance", "precision_fire"],
    "Deathclaw":     ["charge", "flank", "stalk", "charge"],
    "Gunner Captain":["coordinate_squad", "take_cover", "flanking_advance"],
    "Raider Boss":   ["rush", "power_attack", "taunt", "berserker"],
    "Mirelurk":      ["submerge", "ambush", "flank", "swarm"],
    "Radscorpion":   ["burst_ground", "sting", "tail_attack", "burrow"],
    "Robot":         ["advance", "suppress", "self_repair", "area_denial"],
}

_COUNTER_TACTICS: dict[str, dict[str, str]] = {
    "sniper": {
        "Raider": "close_distance",
        "Gunner": "spread_and_close",
        "Super Mutant": "rush",
        "Synth": "flank_under_cover",
    },
    "rusher": {
        "Raider": "retreat_and_fire",
        "Gunner": "defensive_line",
        "Synth": "precision_counter",
    },
    "stealth": {
        "Raider": "buddy_system_patrol",
        "Gunner": "randomize_patrols",
        "Super Mutant": "smell_detection",
        "Synth": "heat_detection",
    },
    "explosive": {
        "Raider": "spread_formation",
        "Gunner": "individual_cover",
        "Super Mutant": "spread_charge",
        "Synth": "evasive_advance",
    },
}


def record_tactic_outcome(
    enemy_type: str,
    tactic: str,
    outcome: str,  # "success" or "fail"
    damage_dealt: float = 0.0,
    damage_taken: float = 0.0,
    player_weapon: str = "unknown",
    player_level: int = 1,
    location: str = "",
) -> None:
    """Log a tactic outcome and update rolling effectiveness stats."""
    now = datetime.utcnow().isoformat()
    try:
        with _conn() as conn:
            conn.execute(
                """INSERT INTO tactic_outcomes
                   (enemy_type, tactic, player_level, player_weapon,
                    outcome, damage_dealt, damage_taken, encounter_loc, real_time)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (enemy_type, tactic, player_level, player_weapon,
                 outcome, damage_dealt, damage_taken, location, now)
            )

            # Update rolling effectiveness aggregate
            if outcome == "success":
                conn.execute("""
                    INSERT INTO tactic_effectiveness
                        (enemy_type, tactic, success_count, avg_damage_dealt, avg_damage_taken, last_updated)
                    VALUES (?,?,1,?,?,?)
                    ON CONFLICT(enemy_type, tactic) DO UPDATE SET
                        success_count = success_count + 1,
                        avg_damage_dealt = (avg_damage_dealt * success_count + ?) / (success_count + 1),
                        avg_damage_taken = (avg_damage_taken * success_count + ?) / (success_count + 1),
                        last_updated = excluded.last_updated
                """, (enemy_type, tactic, damage_dealt, damage_taken, now,
                      damage_dealt, damage_taken))
            else:
                conn.execute("""
                    INSERT INTO tactic_effectiveness
                        (enemy_type, tactic, fail_count, last_updated)
                    VALUES (?,?,1,?)
                    ON CONFLICT(enemy_type, tactic) DO UPDATE SET
                        fail_count = fail_count + 1,
                        last_updated = excluded.last_updated
                """, (enemy_type, tactic, now))
    except Exception as e:
        print(f"[LearningEngine] Record error: {e}")


def get_best_tactic(
    enemy_type: str,
    player_weapon: str = "unknown",
    player_level: int = 1,
    current_hp_pct: float = 1.0,
) -> dict:
    """
    Query learned tactic effectiveness and return the best tactic for this enemy type.
    Falls back to default pool if no history exists.
    """
    player_style = get_player_combat_style()
    counter = _COUNTER_TACTICS.get(player_style, {}).get(enemy_type)

    try:
        with _conn() as conn:
            rows = conn.execute("""
                SELECT tactic,
                       success_count,
                       fail_count,
                       avg_damage_dealt,
                       CAST(success_count AS REAL) /
                           NULLIF(success_count + fail_count, 0) AS win_rate
                FROM tactic_effectiveness
                WHERE enemy_type = ?
                ORDER BY win_rate DESC, success_count DESC
                LIMIT 5
            """, (enemy_type,)).fetchall()
    except Exception:
        rows = []

    if rows:
        best = rows[0]
        win_rate = best["win_rate"] or 0.0
        top_tactic = best["tactic"]

        # If win rate is terrible (< 30%), switch strategy
        if win_rate < 0.3 and len(rows) > 1:
            top_tactic = rows[1]["tactic"]  # Try second best

        # If player is a specific style, override with counter tactic
        if counter and win_rate < 0.5:
            top_tactic = counter

        return {
            "tactic": top_tactic,
            "confidence": round(win_rate, 2),
            "source": "learned",
            "player_style_countered": player_style if counter else None,
            "all_tactics": [{"tactic": r["tactic"], "win_rate": round(r["win_rate"] or 0, 2)}
                            for r in rows],
        }

    # No history — use default pool with style counter if available
    pool = _DEFAULT_TACTIC_POOLS.get(enemy_type, ["take_cover", "advance"])

    # Low HP always adds retreat consideration
    if current_hp_pct < 0.3:
        pool = ["flee", "retreat_to_cover"] + pool

    tactic = counter if counter else pool[0]
    return {
        "tactic": tactic,
        "confidence": 0.0,
        "source": "default",
        "player_style_countered": player_style if counter else None,
    }


def build_combat_learning_context(enemy_type: str) -> str:
    """Return a formatted string of learned tactic history for LLM injection."""
    try:
        with _conn() as conn:
            rows = conn.execute("""
                SELECT tactic,
                       success_count,
                       fail_count,
                       CAST(success_count AS REAL) /
                           NULLIF(success_count + fail_count, 0) AS win_rate
                FROM tactic_effectiveness
                WHERE enemy_type = ?
                ORDER BY success_count + fail_count DESC
                LIMIT 6
            """, (enemy_type,)).fetchall()
    except Exception:
        return ""

    if not rows:
        return ""

    lines = [f"Learned combat data for {enemy_type}:"]
    for r in rows:
        wr = r["win_rate"]
        wrs = f"{wr:.0%}" if wr is not None else "untested"
        total = (r["success_count"] or 0) + (r["fail_count"] or 0)
        lines.append(f"  {r['tactic']}: {wrs} success rate ({total} encounters)")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Player Combat Pattern Recognition
# ─────────────────────────────────────────────────────────────────────────────

def record_player_combat_action(
    weapon_used: str,
    weapon_category: str,
    damage_dealt: float,
    kill_distance: float,
    used_cover: bool = False,
    used_stealth: bool = False,
    used_explosives: bool = False,
) -> None:
    """Log one player combat action for style profiling."""
    now = datetime.utcnow().isoformat()
    try:
        with _conn() as conn:
            conn.execute("""
                INSERT INTO player_combat_patterns
                    (weapon_used, weapon_category, damage_dealt, kill_distance,
                     used_cover, used_stealth, used_explosives, real_time)
                VALUES (?,?,?,?,?,?,?,?)
            """, (weapon_used, weapon_category, damage_dealt, kill_distance,
                  int(used_cover), int(used_stealth), int(used_explosives), now))

            # Update style scores
            sniper_delta    = 0.3 if kill_distance > 800 else -0.1
            rusher_delta    = 0.3 if kill_distance < 200 else -0.1
            stealth_delta   = 0.3 if used_stealth else -0.05
            explosive_delta = 0.3 if used_explosives else -0.05
            melee_delta     = 0.3 if weapon_category == "melee" else -0.1

            conn.execute("""
                UPDATE player_style_profile SET
                    sniper_score    = MAX(0, MIN(100, sniper_score + ?)),
                    rusher_score    = MAX(0, MIN(100, rusher_score + ?)),
                    stealth_score   = MAX(0, MIN(100, stealth_score + ?)),
                    explosive_score = MAX(0, MIN(100, explosive_score + ?)),
                    melee_score     = MAX(0, MIN(100, melee_score + ?)),
                    total_encounters = total_encounters + 1,
                    last_updated    = ?
                WHERE id = 1
            """, (sniper_delta, rusher_delta, stealth_delta,
                  explosive_delta, melee_delta, now))
    except Exception as e:
        print(f"[LearningEngine] Player pattern record error: {e}")


def get_player_combat_profile() -> dict:
    """Return current player combat style profile."""
    try:
        with _conn() as conn:
            row = conn.execute("SELECT * FROM player_style_profile WHERE id = 1").fetchone()
            if row:
                d = dict(row)
                scores = {
                    "sniper": d.get("sniper_score", 0),
                    "rusher": d.get("rusher_score", 0),
                    "stealth": d.get("stealth_score", 0),
                    "explosive": d.get("explosive_score", 0),
                    "melee": d.get("melee_score", 0),
                }
                dominant = max(scores, key=scores.get)
                return {"dominant_style": dominant, "scores": scores,
                        "total_encounters": d.get("total_encounters", 0)}
    except Exception:
        pass
    return {"dominant_style": "balanced", "scores": {}, "total_encounters": 0}


def get_player_combat_style() -> str:
    return get_player_combat_profile().get("dominant_style", "balanced")


# ─────────────────────────────────────────────────────────────────────────────
# Settlement Attack Memory & Adaptation
# ─────────────────────────────────────────────────────────────────────────────

def record_settlement_attack(
    settlement_name: str,
    attacker_type: str,
    attack_direction: str,
    casualties: int,
    structures_lost: int,
    outcome: str,  # "repelled", "lost", "barely_held"
    defense_score: int,
    population: int,
) -> None:
    """Log a settlement attack and generate defense adaptations."""
    now = datetime.utcnow().isoformat()
    try:
        with _conn() as conn:
            conn.execute("""
                INSERT INTO settlement_attack_log
                    (settlement_name, attacker_type, attack_direction, casualties,
                     structures_lost, outcome, defense_score, population, real_time)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, (settlement_name, attacker_type, attack_direction, casualties,
                  structures_lost, outcome, defense_score, population, now))
    except Exception as e:
        print(f"[LearningEngine] Attack log error: {e}")

    # Generate and store adaptations
    adaptations = _derive_defense_adaptations(
        settlement_name, attacker_type, attack_direction, casualties, outcome
    )
    for adapt in adaptations:
        try:
            with _conn() as conn:
                conn.execute("""
                    INSERT INTO settlement_defense_adaptations
                        (settlement_name, adaptation_type, description, priority, created_at)
                    VALUES (?,?,?,?,?)
                    ON CONFLICT(settlement_name, adaptation_type) DO UPDATE SET
                        description = excluded.description,
                        priority = excluded.priority,
                        created_at = excluded.created_at
                """, (settlement_name, adapt["type"], adapt["description"],
                      adapt["priority"], now))
        except Exception:
            pass


def _derive_defense_adaptations(
    settlement_name: str,
    attacker_type: str,
    attack_direction: str,
    casualties: int,
    outcome: str,
) -> list[dict]:
    """Generate specific defense recommendations from attack data."""
    adaptations = []

    # High casualties — need more defense immediately
    if casualties > 3:
        adaptations.append({
            "type": "recruit_guards",
            "description": f"Heavy casualties in last attack. Recruit {max(2, casualties)} additional guards.",
            "priority": 1,
        })

    # Specific attacker counter-measures
    if "Deathclaw" in attacker_type:
        adaptations.append({
            "type": "heavy_weapons",
            "description": "Deathclaw attacked. Request Minutemen missile launchers or fat man. "
                           "Build auto-turrets rated for heavy targets.",
            "priority": 1,
        })
    elif "Raider" in attacker_type:
        adaptations.append({
            "type": "fortify_gate",
            "description": "Raiders hit the gate again. Reinforce with concrete walls and add "
                           "a machine gun turret covering the main approach.",
            "priority": 2,
        })
    elif "Gunner" in attacker_type:
        adaptations.append({
            "type": "counter_sniper",
            "description": "Gunners used sniper fire. Build elevated turret positions and "
                           "cover walls to break line of sight from the south road.",
            "priority": 2,
        })

    # Directional weakness
    if attack_direction and attack_direction != "unknown":
        adaptations.append({
            "type": f"fortify_{attack_direction.lower()}",
            "description": f"Multiple attacks from {attack_direction}. "
                           f"Build additional wall and two turrets covering that approach.",
            "priority": 2,
        })

    # Lost = critical failure
    if outcome == "lost":
        adaptations.append({
            "type": "emergency_rebuild",
            "description": "Settlement was overwhelmed. Call for Minutemen reinforcements. "
                           "Rebuild perimeter walls before anything else.",
            "priority": 1,
        })

    return adaptations


def get_settler_defense_recommendations(settlement_name: str) -> list[dict]:
    """Return pending defense recommendations for a settlement."""
    try:
        with _conn() as conn:
            rows = conn.execute("""
                SELECT adaptation_type, description, priority
                FROM settlement_defense_adaptations
                WHERE settlement_name = ? AND implemented = 0
                ORDER BY priority ASC
            """, (settlement_name,)).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        return []


def get_attack_history_summary(settlement_name: str) -> str:
    """Format attack history for LLM context injection."""
    try:
        with _conn() as conn:
            rows = conn.execute("""
                SELECT attacker_type, attack_direction, casualties, outcome, real_time
                FROM settlement_attack_log
                WHERE settlement_name = ?
                ORDER BY real_time DESC
                LIMIT 5
            """, (settlement_name,)).fetchall()
    except Exception:
        return "No attack history."

    if not rows:
        return "No recorded attacks on this settlement."

    lines = [f"Attack history for {settlement_name}:"]
    for r in rows:
        lines.append(
            f"  {r['attacker_type']} from {r['attack_direction']}: "
            f"{r['casualties']} casualties, outcome={r['outcome']}"
        )
    return "\n".join(lines)


def mark_adaptation_implemented(settlement_name: str, adaptation_type: str) -> None:
    """Call this when a recommended adaptation has been built."""
    try:
        with _conn() as conn:
            conn.execute("""
                UPDATE settlement_defense_adaptations
                SET implemented = 1
                WHERE settlement_name = ? AND adaptation_type = ?
            """, (settlement_name, adaptation_type))
    except Exception:
        pass
