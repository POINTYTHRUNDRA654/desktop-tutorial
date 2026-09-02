"""
memory_store.py — SQLite-backed persistent NPC memory for Mossy Industries AI.

Replaces the 5-turn rolling JSON files with a real persistent store so NPCs
remember conversations across sessions, locations, and days.

Database: H:\\Mossy Memory\\AdvancedAI_Memory.db  (falls back to Documents if missing)
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# DB Path Resolution — H:\Mossy Memory is the primary (unlimited space)
# ─────────────────────────────────────────────────────────────────────────────

_MOSSY_MEMORY_DRIVE = Path(r"H:\Mossy Memory")
_DOCUMENTS_FALLBACK = Path(os.path.expandvars(r"%USERPROFILE%\Documents\My Games\Fallout4"))

def _resolve_db_path() -> Path:
    """Return H:\\Mossy Memory\\AdvancedAI_Memory.db if drive exists, else Documents fallback."""
    if _MOSSY_MEMORY_DRIVE.exists():
        return _MOSSY_MEMORY_DRIVE / "AdvancedAI_Memory.db"
    _DOCUMENTS_FALLBACK.mkdir(parents=True, exist_ok=True)
    return _DOCUMENTS_FALLBACK / "AdvancedAI_Memory.db"

DB_PATH = _resolve_db_path()

# ─────────────────────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS npc_dialogue_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id          TEXT    NOT NULL,
    npc_name        TEXT    NOT NULL,
    player_line     TEXT    NOT NULL,
    npc_line        TEXT    NOT NULL,
    location        TEXT    DEFAULT '',
    emotion         TEXT    DEFAULT 'neutral',
    session_id      TEXT    DEFAULT '',
    game_timestamp  TEXT    DEFAULT '',
    real_timestamp  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_npc_dialogue_npc_id
    ON npc_dialogue_history (npc_id, real_timestamp DESC);

CREATE TABLE IF NOT EXISTS npc_to_npc_conversations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_a_id        TEXT    NOT NULL,
    npc_a_name      TEXT    NOT NULL,
    npc_b_id        TEXT    NOT NULL,
    npc_b_name      TEXT    NOT NULL,
    location        TEXT    DEFAULT '',
    topic           TEXT    DEFAULT '',
    lines_json      TEXT    NOT NULL,
    real_timestamp  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_npc_convo_pair
    ON npc_to_npc_conversations (npc_a_id, npc_b_id, real_timestamp DESC);

CREATE TABLE IF NOT EXISTS npc_facts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id          TEXT    NOT NULL,
    fact_key        TEXT    NOT NULL,
    fact_value      TEXT    NOT NULL,
    confidence      REAL    DEFAULT 1.0,
    last_updated    TEXT    NOT NULL,
    UNIQUE (npc_id, fact_key)
);

CREATE INDEX IF NOT EXISTS idx_npc_facts
    ON npc_facts (npc_id);
"""


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(_SCHEMA)
    return conn


# ─────────────────────────────────────────────────────────────────────────────
# Player ↔ NPC Dialogue History
# ─────────────────────────────────────────────────────────────────────────────

def save_dialogue_turn(
    npc_name: str,
    player_line: str,
    npc_line: str,
    location: str = "",
    emotion: str = "neutral",
    session_id: str = "",
    game_timestamp: str = "",
) -> None:
    """Persist one player ↔ NPC exchange to SQLite."""
    npc_id = npc_name.lower().replace(" ", "_")
    now = datetime.utcnow().isoformat()
    try:
        with _get_conn() as conn:
            conn.execute(
                """INSERT INTO npc_dialogue_history
                   (npc_id, npc_name, player_line, npc_line,
                    location, emotion, session_id, game_timestamp, real_timestamp)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (npc_id, npc_name, player_line, npc_line,
                 location, emotion, session_id, game_timestamp, now),
            )
    except sqlite3.Error as e:
        print(f"[MemoryStore] Save error: {e}")


def load_dialogue_history(
    npc_name: str,
    limit: int = 10,
    location_filter: Optional[str] = None,
) -> list[dict]:
    """Load the most recent dialogue turns for an NPC.

    Returns list of dicts with keys: player_line, npc_line, location, emotion, real_timestamp.
    Ordered oldest-first so they read naturally as conversation history.
    """
    npc_id = npc_name.lower().replace(" ", "_")
    try:
        with _get_conn() as conn:
            if location_filter:
                rows = conn.execute(
                    """SELECT player_line, npc_line, location, emotion, real_timestamp
                       FROM npc_dialogue_history
                       WHERE npc_id = ? AND location LIKE ?
                       ORDER BY real_timestamp DESC LIMIT ?""",
                    (npc_id, f"%{location_filter}%", limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """SELECT player_line, npc_line, location, emotion, real_timestamp
                       FROM npc_dialogue_history
                       WHERE npc_id = ?
                       ORDER BY real_timestamp DESC LIMIT ?""",
                    (npc_id, limit),
                ).fetchall()
        # Reverse to chronological order
        return [dict(r) for r in reversed(rows)]
    except sqlite3.Error as e:
        print(f"[MemoryStore] Load error: {e}")
        return []


def build_history_string(npc_name: str, limit: int = 8) -> str:
    """Build a formatted conversation history block for LLM injection.

    Includes location context so NPCs reference where past conversations happened.
    """
    turns = load_dialogue_history(npc_name, limit=limit)
    if not turns:
        return ""
    lines = []
    prev_location = None
    for turn in turns:
        loc = turn.get("location", "")
        if loc and loc != prev_location:
            lines.append(f"[At {loc}]")
            prev_location = loc
        lines.append(f"Player: {turn['player_line']}")
        lines.append(f"{npc_name}: {turn['npc_line']}")
    return "\n".join(lines)


def get_npc_fact(npc_name: str, fact_key: str) -> Optional[str]:
    """Retrieve a specific known fact about/from this NPC."""
    npc_id = npc_name.lower().replace(" ", "_")
    try:
        with _get_conn() as conn:
            row = conn.execute(
                "SELECT fact_value FROM npc_facts WHERE npc_id = ? AND fact_key = ?",
                (npc_id, fact_key),
            ).fetchone()
        return row["fact_value"] if row else None
    except sqlite3.Error:
        return None


def set_npc_fact(npc_name: str, fact_key: str, fact_value: str, confidence: float = 1.0) -> None:
    """Store or update a fact about this NPC (e.g. 'last_seen_location', 'mood_trend')."""
    npc_id = npc_name.lower().replace(" ", "_")
    now = datetime.utcnow().isoformat()
    try:
        with _get_conn() as conn:
            conn.execute(
                """INSERT INTO npc_facts (npc_id, fact_key, fact_value, confidence, last_updated)
                   VALUES (?,?,?,?,?)
                   ON CONFLICT(npc_id, fact_key) DO UPDATE SET
                       fact_value=excluded.fact_value,
                       confidence=excluded.confidence,
                       last_updated=excluded.last_updated""",
                (npc_id, fact_key, fact_value, confidence, now),
            )
    except sqlite3.Error as e:
        print(f"[MemoryStore] Fact save error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# NPC ↔ NPC Conversation History
# ─────────────────────────────────────────────────────────────────────────────

def save_npc_conversation(
    npc_a_id: str, npc_a_name: str,
    npc_b_id: str, npc_b_name: str,
    location: str,
    topic: str,
    lines: list[dict],
) -> None:
    """Persist an NPC-to-NPC conversation so NPCs can reference past interactions."""
    # load_npc_conversations()/build_npc_pair_history_string() always derive their
    # lookup key from npc_*_name (lowercased, spaces->underscores) — never trust the
    # caller's raw npc_*_id here, or a caller passing e.g. a formID silently breaks
    # every future lookup for this pair (rows get saved but can never be found).
    npc_a_id = npc_a_name.lower().replace(" ", "_")
    npc_b_id = npc_b_name.lower().replace(" ", "_")
    # Normalize pair order for consistent lookup
    if npc_a_id > npc_b_id:
        npc_a_id, npc_a_name, npc_b_id, npc_b_name = npc_b_id, npc_b_name, npc_a_id, npc_a_name
    now = datetime.utcnow().isoformat()
    try:
        with _get_conn() as conn:
            conn.execute(
                """INSERT INTO npc_to_npc_conversations
                   (npc_a_id, npc_a_name, npc_b_id, npc_b_name,
                    location, topic, lines_json, real_timestamp)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (npc_a_id, npc_a_name, npc_b_id, npc_b_name,
                 location, topic, json.dumps(lines), now),
            )
    except sqlite3.Error as e:
        print(f"[MemoryStore] NPC convo save error: {e}")


def load_npc_conversations(
    npc_a_id: str,
    npc_b_id: Optional[str] = None,
    limit: int = 5,
) -> list[dict]:
    """Load recent NPC-to-NPC conversations involving npc_a, optionally with npc_b."""
    # Normalize for stored pair order
    if npc_b_id and npc_a_id > npc_b_id:
        npc_a_id, npc_b_id = npc_b_id, npc_a_id
    try:
        with _get_conn() as conn:
            if npc_b_id:
                rows = conn.execute(
                    """SELECT npc_a_name, npc_b_name, location, topic, lines_json, real_timestamp
                       FROM npc_to_npc_conversations
                       WHERE npc_a_id = ? AND npc_b_id = ?
                       ORDER BY real_timestamp DESC LIMIT ?""",
                    (npc_a_id, npc_b_id, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """SELECT npc_a_name, npc_b_name, location, topic, lines_json, real_timestamp
                       FROM npc_to_npc_conversations
                       WHERE npc_a_id = ? OR npc_b_id = ?
                       ORDER BY real_timestamp DESC LIMIT ?""",
                    (npc_a_id, npc_a_id, limit),
                ).fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["lines"] = json.loads(d.pop("lines_json", "[]"))
            result.append(d)
        return result
    except sqlite3.Error as e:
        print(f"[MemoryStore] NPC convo load error: {e}")
        return []


def build_npc_pair_history_string(npc_a_name: str, npc_b_name: str, limit: int = 3) -> str:
    """Format past NPC-to-NPC conversations for LLM context injection."""
    npc_a_id = npc_a_name.lower().replace(" ", "_")
    npc_b_id = npc_b_name.lower().replace(" ", "_")
    convos = load_npc_conversations(npc_a_id, npc_b_id, limit=limit)
    if not convos:
        return "These two have never spoken before."
    parts = []
    for convo in reversed(convos):
        loc = convo.get("location", "somewhere")
        topic = convo.get("topic", "unknown")
        parts.append(f"[Previously at {loc}, about {topic}]:")
        for line in convo.get("lines", []):
            speaker = line.get("speaker", "?")
            text = line.get("text", "")
            parts.append(f"  {speaker}: {text}")
    return "\n".join(parts)
