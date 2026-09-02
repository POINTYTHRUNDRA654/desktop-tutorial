"""
settlement_evolution.py — Settlement Civilization Progression
=============================================================
Mossy Industries — Rebuilding the Commonwealth, one settlement at a time.

THE VISION:
  As you advance in the Minutemen and protect settlements from attacks,
  they evolve from rubble into actual communities with personalities.

  STAGE 0 — RUINS
    Nothing. Collapsed buildings. Danger.

  STAGE 1 — CLAIMED  (1-4 settlers, 0-1 attacks survived)
    A few survivors found this place. Sleeping bags, a campfire, one guard.
    Settlers talk about just surviving. Fearful of everything.
    No economy yet. Defense: basically zero.

  STAGE 2 — OUTPOST  (5-12 settlers, 2+ attacks survived)
    Proper beds, perimeter fence, water purifier.
    Trade post begins. A dedicated guard. Minutemen visit occasionally.
    Settlers talk about caravan routes, raider activity, trade goods.
    The settlement has a NAME. People have roles.

  STAGE 3 — TOWN     (13-24 settlers, 5+ attacks survived, defense ≥ 60)
    A proper wall with turrets. Medical clinic. A tavern or shop.
    Named NPCs with schedules. Settlers give player quests.
    Influence spreads — nearby settlements start a supply line.
    Settlers talk about politics, growing the town, Minutemen patrols.
    The town RADIO station goes up (beacon → recruitment → growth).

  STAGE 4 — CITY     (25-40 settlers, 10+ attacks survived, defense ≥ 120)
    Multiple districts. Permanent guards with patrol routes.
    Economy: trade caravans stop here by default.
    The settlement sends Minutemen patrols to neighboring cells.
    Settlers debate city expansion, governance, relations with Diamond City.
    Stage 4 settlements can absorb refugees and send their own expeditions.

  STAGE 5 — CITADEL  (The Castle / Sanctuary / HQ level)
    Full command center. Artillery. Regional protection radius.
    Generates its own income. Has diplomatic relations with other factions.
    NPCs here are the equivalent of Rivet City in Fallout 3 — layered,
    complex, with ongoing politics and sub-stories.

MINUTEMEN RANK GATES:
  Rank 0 (none): Stage 1 only
  Rank 1 (Private): Stage 2
  Rank 2 (Corporal): Stage 2-3
  Rank 3 (Sergeant): Stage 3
  Rank 4 (Lieutenant): Stage 3-4
  Rank 5 (General): Stage 4-5

State written to H:\\Mossy Memory\\SettlementEvolution.json for Papyrus.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────

_MOSSY_MEMORY = Path(r"H:\Mossy Memory")
_DOCS_FALLBACK = Path.home() / "Documents" / "My Games" / "Fallout4"
MEMORY_DB   = (_MOSSY_MEMORY / "AdvancedAI_Memory.db" if _MOSSY_MEMORY.exists()
               else _DOCS_FALLBACK / "AdvancedAI_Memory.db")
EVOLUTION_FILE = (_MOSSY_MEMORY / "SettlementEvolution.json" if _MOSSY_MEMORY.exists()
                  else _DOCS_FALLBACK / "SettlementEvolution.json")

# ─────────────────────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS settlement_evolution (
    settlement_name     TEXT PRIMARY KEY,
    stage               INTEGER DEFAULT 0,
    population          INTEGER DEFAULT 0,
    defense             INTEGER DEFAULT 0,
    attacks_survived    INTEGER DEFAULT 0,
    food                INTEGER DEFAULT 0,
    water               INTEGER DEFAULT 0,
    happiness           INTEGER DEFAULT 50,
    has_radio_beacon    INTEGER DEFAULT 0,
    has_clinic          INTEGER DEFAULT 0,
    has_shop            INTEGER DEFAULT 0,
    has_tavern          INTEGER DEFAULT 0,
    has_wall            INTEGER DEFAULT 0,
    has_artillery       INTEGER DEFAULT 0,
    minuteman_rank      INTEGER DEFAULT 0,
    last_attack         TEXT DEFAULT '',
    last_stage_change   TEXT DEFAULT '',
    last_updated        TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settlement_npcs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    settlement_name TEXT NOT NULL,
    npc_name        TEXT NOT NULL,
    npc_role        TEXT NOT NULL,
    npc_faction     TEXT DEFAULT 'Minutemen',
    personality     TEXT DEFAULT 'neutral',
    stage_added     INTEGER DEFAULT 1,
    active          INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settlement_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    settlement_name TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    event_detail    TEXT DEFAULT '',
    stage_at_time   INTEGER DEFAULT 0,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);
"""


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(MEMORY_DB)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.executescript(_SCHEMA)
    return c


# ─────────────────────────────────────────────────────────────────────────────
# Stage Definitions
# ─────────────────────────────────────────────────────────────────────────────

STAGE_PROFILES: dict[int, dict] = {
    0: {
        "name": "Ruins",
        "description": "Abandoned. Dangerous. No living presence.",
        "npc_topics": [],
        "structures": [],
        "economy": "none",
        "minutemen_visits": 0,
        "conversation_tone": "none",
    },
    1: {
        "name": "Claimed",
        "description": "A small group of survivors taking shelter. Just trying to make it to tomorrow.",
        "pop_range": (1, 4),
        "defense_target": 10,
        "npc_topics": [
            "Just surviving day to day",
            "Fear of raiders nearby",
            "Running low on food",
            "Whether this place can be defended",
            "Someone we lost getting here",
        ],
        "structures": ["sleeping_bags", "campfire", "basic_food", "basic_water"],
        "economy": "subsistence",
        "minutemen_visits": 0,
        "conversation_tone": "fearful, exhausted, desperate",
        "settler_roles": ["survivor", "scout"],
    },
    2: {
        "name": "Outpost",
        "description": "A working settlement with basic infrastructure and a dedicated guard.",
        "pop_range": (5, 12),
        "defense_target": 40,
        "npc_topics": [
            "Trade caravans coming through",
            "Raider activity on the road to Diamond City",
            "Supply needs — what to grow more of",
            "The last Minutemen patrol that stopped by",
            "That new family that joined last week",
            "Building a proper fence finally",
        ],
        "structures": ["beds", "perimeter_fence", "water_purifier", "trade_post", "turret_1"],
        "economy": "basic_trade",
        "minutemen_visits": 1,  # Per week
        "conversation_tone": "cautiously optimistic, practical, community-focused",
        "settler_roles": ["farmer", "guard", "trader", "craftsperson"],
    },
    3: {
        "name": "Town",
        "description": "A real community with walls, shops, and a name people know.",
        "pop_range": (13, 24),
        "defense_target": 80,
        "npc_topics": [
            "The town's name and how it was chosen",
            "Politics — who should be in charge",
            "The clinic finally opened",
            "News from Diamond City",
            "That supply route to the south settlement",
            "Building a radio beacon to recruit more settlers",
            "Caravan merchants we've befriended",
            "The wall expansion — east side still not finished",
        ],
        "structures": ["concrete_walls", "clinic", "shop", "turret_network", "radio_beacon", "patrol_routes"],
        "economy": "caravan_stop",
        "minutemen_visits": 3,
        "conversation_tone": "communal, political, hopeful, building something real",
        "settler_roles": ["doctor", "merchant", "guard_captain", "farmer", "builder", "teacher"],
        "requires": {"has_radio_beacon": True},
    },
    4: {
        "name": "City",
        "description": "A significant power center. Caravans stop here by default. Minutemen patrol from here.",
        "pop_range": (25, 40),
        "defense_target": 150,
        "npc_topics": [
            "The city district expansion plans",
            "Diplomatic contact with Diamond City",
            "Sending a patrol to help a neighboring settlement",
            "The influx of refugees from Quincy",
            "Our trade agreement with Bunker Hill",
            "The Minutemen squad based here full-time",
            "Building a proper hospital wing",
            "Power generation — fusion cores running low",
        ],
        "structures": ["district_walls", "hospital", "marketplace", "garrison",
                       "artillery_prep", "patrol_dispatch", "power_grid"],
        "economy": "regional_hub",
        "minutemen_visits": 7,  # Daily
        "conversation_tone": "civic pride, political complexity, regional influence",
        "settler_roles": ["mayor", "general_store", "doctor", "Minutemen_officer",
                          "diplomat", "power_engineer", "archivist"],
    },
    5: {
        "name": "Citadel",
        "description": "The beating heart of the new Commonwealth. Command, commerce, and culture.",
        "pop_range": (40, 80),
        "defense_target": 300,
        "npc_topics": [
            "The General's last orders",
            "Relations with the Brotherhood of Steel",
            "The Institute — what do we do about them",
            "Artillery range covers three regions now",
            "Rebuilding the infrastructure — water treatment plant",
            "Sending an expedition north to clear the highway",
            "The archives we're preserving — pre-war knowledge",
            "New recruits arriving from the far north",
        ],
        "structures": ["command_center", "artillery_battery", "great_wall",
                       "archives", "hospital_wing", "power_plant", "diplomatic_wing"],
        "economy": "commonwealth_center",
        "minutemen_visits": 14,  # Twice daily
        "conversation_tone": "civilization, legacy, purpose, the weight of what's being built",
        "settler_roles": ["general", "historian", "head_surgeon", "commander",
                          "head_engineer", "ambassador", "quartermaster"],
    },
}

MINUTEMAN_RANK_GATES: dict[int, dict] = {
    0: {"name": "None", "max_stage": 1},
    1: {"name": "Private", "max_stage": 2},
    2: {"name": "Corporal", "max_stage": 2},
    3: {"name": "Sergeant", "max_stage": 3},
    4: {"name": "Lieutenant", "max_stage": 4},
    5: {"name": "General", "max_stage": 5},
}


# ─────────────────────────────────────────────────────────────────────────────
# State Management
# ─────────────────────────────────────────────────────────────────────────────

def update_settlement(
    settlement_name: str,
    population: int,
    defense: int,
    food: int,
    water: int,
    happiness: int,
    attacks_survived: int = 0,
    minuteman_rank: int = 0,
    structures: Optional[dict] = None,
) -> dict:
    """
    Update a settlement's state and determine if it should advance stages.
    Returns the current settlement state with stage info.
    """
    structures = structures or {}
    now = datetime.utcnow().isoformat()

    # Load current state
    try:
        with _conn() as conn:
            row = conn.execute(
                "SELECT * FROM settlement_evolution WHERE settlement_name = ?",
                (settlement_name,)
            ).fetchone()
            current = dict(row) if row else {}
    except Exception:
        current = {}

    prev_stage = current.get("stage", 0)
    prev_attacks = current.get("attacks_survived", 0)
    total_attacks = max(attacks_survived, prev_attacks)

    # Calculate new stage
    new_stage = _calculate_stage(
        population=population,
        defense=defense,
        attacks_survived=total_attacks,
        minuteman_rank=minuteman_rank,
        structures=structures,
        happiness=happiness,
    )

    stage_changed = new_stage != prev_stage

    # Write updated state
    try:
        with _conn() as conn:
            conn.execute("""
                INSERT INTO settlement_evolution
                    (settlement_name, stage, population, defense, attacks_survived,
                     food, water, happiness, minuteman_rank,
                     has_radio_beacon, has_clinic, has_shop, has_wall, has_artillery,
                     last_stage_change, last_updated)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(settlement_name) DO UPDATE SET
                    stage = excluded.stage,
                    population = excluded.population,
                    defense = excluded.defense,
                    attacks_survived = excluded.attacks_survived,
                    food = excluded.food,
                    water = excluded.water,
                    happiness = excluded.happiness,
                    minuteman_rank = excluded.minuteman_rank,
                    has_radio_beacon = excluded.has_radio_beacon,
                    has_clinic = excluded.has_clinic,
                    has_shop = excluded.has_shop,
                    has_wall = excluded.has_wall,
                    has_artillery = excluded.has_artillery,
                    last_stage_change = CASE
                        WHEN excluded.stage != settlement_evolution.stage
                        THEN excluded.last_stage_change
                        ELSE settlement_evolution.last_stage_change
                    END,
                    last_updated = excluded.last_updated
            """, (
                settlement_name, new_stage, population, defense, total_attacks,
                food, water, happiness, minuteman_rank,
                int(structures.get("radio_beacon", False)),
                int(structures.get("clinic", False)),
                int(structures.get("shop", False)),
                int(structures.get("wall", False)),
                int(structures.get("artillery", False)),
                now if stage_changed else current.get("last_stage_change", ""),
                now,
            ))

        if stage_changed:
            _log_event(settlement_name, "stage_change",
                       f"Advanced from stage {prev_stage} to stage {new_stage}", new_stage)
    except Exception as e:
        print(f"[SettlementEvolution] Update error: {e}")

    profile = STAGE_PROFILES.get(new_stage, STAGE_PROFILES[0])

    result = {
        "settlement_name": settlement_name,
        "stage": new_stage,
        "stage_name": profile["name"],
        "stage_description": profile["description"],
        "stage_changed": stage_changed,
        "previous_stage": prev_stage if stage_changed else new_stage,
        "population": population,
        "defense": defense,
        "attacks_survived": total_attacks,
        "minuteman_rank": minuteman_rank,
        "conversation_tone": profile.get("conversation_tone", "neutral"),
        "npc_topics": profile.get("npc_topics", []),
        "settler_roles": profile.get("settler_roles", []),
        "next_stage_requirements": _next_stage_requirements(new_stage, population,
                                                             defense, total_attacks,
                                                             minuteman_rank),
    }

    # Write to file for Papyrus
    _write_evolution_state(settlement_name, result)
    return result


def _calculate_stage(
    population: int,
    defense: int,
    attacks_survived: int,
    minuteman_rank: int,
    structures: dict,
    happiness: int,
) -> int:
    """Determine settlement stage from metrics and Minutemen rank."""
    max_stage = MINUTEMAN_RANK_GATES.get(minuteman_rank, {"max_stage": 1})["max_stage"]

    # Stage 5
    if (population >= 40 and defense >= 250 and attacks_survived >= 15
            and structures.get("artillery") and max_stage >= 5):
        return 5

    # Stage 4
    if (population >= 25 and defense >= 120 and attacks_survived >= 10
            and structures.get("wall") and max_stage >= 4):
        return 4

    # Stage 3
    if (population >= 13 and defense >= 60 and attacks_survived >= 5
            and structures.get("radio_beacon") and max_stage >= 3):
        return 3

    # Stage 2
    if (population >= 5 and defense >= 20 and attacks_survived >= 2
            and max_stage >= 2):
        return 2

    # Stage 1
    if population >= 1:
        return 1

    return 0


def _next_stage_requirements(
    current_stage: int,
    population: int,
    defense: int,
    attacks_survived: int,
    minuteman_rank: int,
) -> dict:
    """Return what's needed to advance to the next stage."""
    next_stage = current_stage + 1
    if next_stage > 5:
        return {"complete": True, "message": "Maximum stage reached. This is a Citadel."}

    next_profile = STAGE_PROFILES.get(next_stage, {})
    rank_needed = next(
        (rank for rank, gate in MINUTEMAN_RANK_GATES.items() if gate["max_stage"] >= next_stage),
        5
    )
    rank_name = MINUTEMAN_RANK_GATES.get(rank_needed, {}).get("name", "General")

    pop_min, _ = next_profile.get("pop_range", (population, population))
    def_target = next_profile.get("defense_target", defense)
    attack_targets = {2: 2, 3: 5, 4: 10, 5: 15}
    attack_target = attack_targets.get(next_stage, 0)

    needs = []
    if population < pop_min:
        needs.append(f"Population: {population}/{pop_min} settlers")
    if defense < def_target:
        needs.append(f"Defense: {defense}/{def_target}")
    if attacks_survived < attack_target:
        needs.append(f"Survive attacks: {attacks_survived}/{attack_target}")
    if minuteman_rank < rank_needed:
        needs.append(f"Minutemen rank: need {rank_name}")

    reqs = next_profile.get("requires", {})
    if reqs.get("has_radio_beacon"):
        needs.append("Build a radio beacon")

    return {
        "next_stage": next_stage,
        "next_stage_name": next_profile.get("name", ""),
        "needs": needs,
        "progress_pct": max(0, 100 - len(needs) * 25),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Context Generation for LLM
# ─────────────────────────────────────────────────────────────────────────────

def build_settlement_lore_context(settlement_name: str) -> str:
    """
    Build a rich context string describing the settlement's evolution for LLM injection.
    Used by conversation_generator so NPCs talk about things appropriate to their stage.
    """
    try:
        with _conn() as conn:
            row = conn.execute(
                "SELECT * FROM settlement_evolution WHERE settlement_name = ?",
                (settlement_name,)
            ).fetchone()
            if not row:
                return f"{settlement_name} is a newly claimed location. Settlers are just getting started."
            state = dict(row)
    except Exception:
        return f"{settlement_name} is a settlement in the Commonwealth."

    stage = state.get("stage", 1)
    profile = STAGE_PROFILES.get(stage, STAGE_PROFILES[1])
    attacks = state.get("attacks_survived", 0)

    context = (
        f"{settlement_name} is a {profile['name']} (Stage {stage}/5).\n"
        f"Population: {state.get('population', 0)} | Defense: {state.get('defense', 0)} | "
        f"Happiness: {state.get('happiness', 50)}%\n"
        f"Attacks survived: {attacks}\n"
        f"Settlement tone: {profile.get('conversation_tone', 'neutral')}\n"
        f"What people talk about here:\n"
    )
    for topic in profile.get("npc_topics", [])[:4]:
        context += f"  - {topic}\n"

    if attacks > 5:
        context += (
            f"\nThis settlement has survived {attacks} attacks. "
            "The settlers are hardened. They remember every attack. "
            "They've built something worth fighting for."
        )

    return context


def get_all_settlements_state() -> list[dict]:
    """Return current state of all settlements for global overview."""
    try:
        with _conn() as conn:
            rows = conn.execute("SELECT * FROM settlement_evolution ORDER BY stage DESC").fetchall()
        return [dict(r) for r in rows]
    except Exception:
        return []


def _log_event(settlement_name: str, event_type: str, detail: str, stage: int) -> None:
    try:
        with _conn() as conn:
            conn.execute("""
                INSERT INTO settlement_events (settlement_name, event_type, event_detail, stage_at_time)
                VALUES (?,?,?,?)
            """, (settlement_name, event_type, detail, stage))
    except Exception:
        pass


def _write_evolution_state(settlement_name: str, state: dict) -> None:
    """Write/update settlement in the global evolution JSON file."""
    all_states = {}
    if EVOLUTION_FILE.exists():
        try:
            all_states = json.loads(EVOLUTION_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    all_states[settlement_name] = state
    try:
        EVOLUTION_FILE.write_text(json.dumps(all_states, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[SettlementEvolution] Write error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Minutemen Network Overview
# ─────────────────────────────────────────────────────────────────────────────

MINUTEMAN_RANKS = {
    0: "Civilian",
    1: "Private",
    2: "Corporal",
    3: "Sergeant",
    4: "Lieutenant",
    5: "General",
}


def get_minuteman_commonwealth_overview(minuteman_rank: int) -> dict:
    """
    Generate a narrative overview of the Minutemen's status in the Commonwealth
    based on player rank and settled settlements.
    """
    rank_name = MINUTEMAN_RANKS.get(minuteman_rank, "General")
    settlements = get_all_settlements_state()

    total = len(settlements)
    by_stage = {s: sum(1 for x in settlements if x.get("stage", 0) == s) for s in range(6)}
    cities   = by_stage.get(4, 0) + by_stage.get(5, 0)
    towns    = by_stage.get(3, 0)
    outposts = by_stage.get(2, 0)

    if minuteman_rank >= 5:
        narrative = (
            f"Under General {rank_name}'s command, the Minutemen have rebuilt {total} settlements "
            f"across the Commonwealth — including {cities} cities or citadels, {towns} towns, "
            f"and {outposts} outposts. "
            "Caravans travel protected roads again. Settlers wave Minutemen flags on their walls. "
            "The word is spreading: the Commonwealth is coming back."
        )
    elif minuteman_rank >= 3:
        narrative = (
            f"Under Sergeant-level Minutemen leadership, {total} settlements are active. "
            f"{towns} towns and {outposts} outposts dot the map. "
            "The Minutemen are becoming a real force again. "
            "Raiders think twice before attacking a defended settlement."
        )
    elif minuteman_rank >= 1:
        narrative = (
            f"The Minutemen are rebuilding. {outposts} outposts established, "
            f"{towns} growing into towns. "
            "People are starting to believe this might actually work."
        )
    else:
        narrative = "The Minutemen are barely a rumor. Settlers survive on their own."

    return {
        "rank": rank_name,
        "rank_level": minuteman_rank,
        "total_settlements": total,
        "cities": cities,
        "towns": towns,
        "outposts": outposts,
        "narrative": narrative,
    }
