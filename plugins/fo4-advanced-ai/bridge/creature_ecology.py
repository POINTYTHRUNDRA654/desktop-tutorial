"""
creature_ecology.py
Fallout 4 Advanced AI — Creature Ecology Bridge Module
=======================================================

Tracks creature populations, territories, kill pressure, and bird behaviors.
The bridge stores what the game engine can't hold:

  - Per-species kill counts and population pressure
  - Territory ownership per location
  - Creature migration patterns (which species appear where over time)
  - Bird flocking data and ambient behavior schedules
  - Ecosystem health metrics (is an area overhunted? under pressure?)
  - Adaptive difficulty per creature type

All data written to AdvancedAI_Memory.db and exposed via HTTP endpoints.
"""

import sqlite3
import json
import datetime
import random
from pathlib import Path
from typing import Optional

MEMORY_DB_PATH = Path.home() / "Documents" / "My Games" / "Fallout4" / "AdvancedAI_Memory.db"

# ─────────────────────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────────────────────

ECOLOGY_SCHEMA = """

-- Population kill tracking per species
CREATE TABLE IF NOT EXISTS creature_kills (
    species         TEXT NOT NULL,
    location        TEXT NOT NULL DEFAULT 'global',
    kill_count      INTEGER DEFAULT 0,
    last_kill_time  TEXT,
    first_kill_time TEXT,
    PRIMARY KEY (species, location)
);

-- Territory ownership
CREATE TABLE IF NOT EXISTS creature_territories (
    location        TEXT NOT NULL,
    dominant_species TEXT NOT NULL,
    rival_species   TEXT,           -- competing for this territory
    contested       INTEGER DEFAULT 0,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (location, dominant_species)
);

-- Individual creature death log
CREATE TABLE IF NOT EXISTS creature_deaths (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    species         TEXT NOT NULL,
    location        TEXT,
    killer          TEXT,          -- 'player', 'rival_creature', 'environment'
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Population pressure (high kills = stressed ecosystem)
CREATE TABLE IF NOT EXISTS population_pressure (
    species         TEXT PRIMARY KEY,
    total_kills     INTEGER DEFAULT 0,
    pressure_level  REAL DEFAULT 0.0,   -- 0.0 = healthy, 1.0 = critically hunted
    last_recalc     TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Bird / aerial creature schedules and flock data
CREATE TABLE IF NOT EXISTS bird_schedules (
    species         TEXT NOT NULL,
    location        TEXT NOT NULL,
    active_hours    TEXT NOT NULL,   -- JSON: [6, 7, 8, 18, 19, 20]
    flock_size_min  INTEGER DEFAULT 1,
    flock_size_max  INTEGER DEFAULT 5,
    behavior        TEXT DEFAULT 'ambient',  -- 'ambient', 'hunt', 'migrate', 'roost'
    last_seen       TEXT,
    PRIMARY KEY (species, location)
);

-- Migration patterns (creatures moving between cells)
CREATE TABLE IF NOT EXISTS migration_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    species         TEXT NOT NULL,
    from_location   TEXT,
    to_location     TEXT,
    reason          TEXT,  -- 'overhunted', 'territorial_loss', 'seasonal', 'following_prey'
    game_time       REAL,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Ecosystem health per location
CREATE TABLE IF NOT EXISTS ecosystem_health (
    location        TEXT PRIMARY KEY,
    apex_predator   TEXT,           -- dominant predator species here
    prey_density    REAL DEFAULT 0.5,   -- 0=no prey, 1=abundant
    predator_density REAL DEFAULT 0.5,
    scavenger_count INTEGER DEFAULT 0,
    health_score    REAL DEFAULT 0.7,   -- overall ecosystem health
    last_battle     TEXT,
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP
);

"""

def init_ecology_schema():
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.executescript(ECOLOGY_SCHEMA)
    conn.commit()
    conn.close()

    # Seed default bird schedules
    _seed_bird_schedules()
    print("[Ecology] Schema initialized")

# ─────────────────────────────────────────────────────────────────────────────
# Birds & Aerial Creatures
# The Commonwealth's sky life:
#   - Mutant seagulls / Radgulls (ambient, near water and cities)
#   - Stingwings (hunting, dusk/dawn)
#   - Bloatflies (scavengers, post-battle)
#   - Bloodbugs (crepuscular, near water/settlements)
#   - Mutant bats (nocturnal, caves/ruins)
# ─────────────────────────────────────────────────────────────────────────────

BIRD_PROFILES = {
    "Radgull": {
        "description": "Mutant seagulls — ambient presence near coasts, Diamond City, and open water",
        "active_hours": [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        "flock_size_min": 3,
        "flock_size_max": 12,
        "behavior": "ambient",
        "locations": ["Diamond City", "Harbor", "Coast", "River", "Docks"],
        "flee_radius": 300.0,       # Flee player if too close
        "aggression": 0.0,          # Passive
        "detection": "sight_only",
        "interesting_behaviors": [
            "Circles overhead looking for food",
            "Lands on market stalls to steal food",
            "Scatters explosively when gunfire starts",
            "Follows fishing settlers at the docks",
            "Rests on rooftops at night",
        ]
    },
    "Stingwing": {
        "description": "Mutant dragonfly-like — predatory, venomous, hunts in pairs at dusk",
        "active_hours": [5, 6, 18, 19, 20, 21],  # Crepuscular
        "flock_size_min": 1,
        "flock_size_max": 3,
        "behavior": "hunt",
        "locations": ["Swamp", "River", "Glowing Sea", "Wetland"],
        "flee_radius": 0.0,
        "aggression": 0.75,
        "detection": "smell_and_sight",
        "interesting_behaviors": [
            "Hovers motionless above water waiting for prey",
            "Dives from above to sting before prey can react",
            "Males and females hunt cooperatively",
            "Territorial against other flying creatures",
            "Retreats into reeds when severely injured",
        ]
    },
    "Bloatfly": {
        "description": "Mutant flies — scavengers that appear after death, can swarm defensively",
        "active_hours": list(range(0, 24)),  # Active all day
        "flock_size_min": 2,
        "flock_size_max": 8,
        "behavior": "scavenge",
        "locations": ["Wasteland", "Settlement", "Battlefield"],
        "flee_radius": 400.0,  # Flee easily
        "aggression": 0.3,
        "detection": "smell",
        "interesting_behaviors": [
            "Swarms attract other Bloatflies — sound like a hive",
            "Appears within minutes of a creature dying",
            "Defends corpse territory against other scavengers",
            "Explodes when killed, spraying larva",
            "Ignores player unless provoked or very hungry",
        ]
    },
    "Bloodbug": {
        "description": "Mutant mosquitos — ambush feeders, drawn to blood and warmth",
        "active_hours": [4, 5, 6, 19, 20, 21, 22, 23, 0],  # Crepuscular + night
        "flock_size_min": 2,
        "flock_size_max": 6,
        "behavior": "hunt",
        "locations": ["Swamp", "Settlement", "River", "Forest"],
        "flee_radius": 500.0,
        "aggression": 0.6,
        "detection": "smell_blood",  # Smell blood from very far
        "interesting_behaviors": [
            "Attracted to wounded creatures and players",
            "Can smell blood from 2000 units away",
            "Drains health and then retreats to digest",
            "Lays eggs in standing water — near ponds",
            "Swarms attack from multiple directions",
        ]
    },
    "MutantBat": {
        "description": "Radiation-mutated bats — nocturnal, blind, echolocate, cave dwellers",
        "active_hours": [20, 21, 22, 23, 0, 1, 2, 3, 4],  # Strictly nocturnal
        "flock_size_min": 4,
        "flock_size_max": 20,
        "behavior": "ambient_and_defend",
        "locations": ["Cave", "Vault", "Ruins", "Underground"],
        "flee_radius": 200.0,
        "aggression": 0.5,
        "detection": "echolocation",  # Sound-based, ignores stealth
        "interesting_behaviors": [
            "Hangs from ceilings during the day — disturbing them triggers swarm",
            "Echolocates — stealth is useless, but stillness helps",
            "Swarms out of cave entrances at dusk",
            "Raids settlements for brahmin blood at night",
            "Can't operate in bright light — flares stun them",
        ]
    },
    "Cazadore": {
        "description": "Mutant wasps (Nuka-World) — highly venomous, extremely aggressive, hunt in packs",
        "active_hours": [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
        "flock_size_min": 3,
        "flock_size_max": 8,
        "behavior": "hunt",
        "locations": ["NukaWorld", "Wasteland", "Desert"],
        "flee_radius": 0.0,
        "aggression": 0.95,
        "detection": "smell_and_vibration",
        "interesting_behaviors": [
            "Never retreats — hunts to the death",
            "Venom causes persistent hallucination effect",
            "Nests in ruined vehicles and buildings",
            "Alpha Cazadore is twice the size",
            "Attacks in coordinated waves — not all at once",
        ]
    },

    # ── CROWS & RAVENS ───────────────────────────────────────────────────────
    "MutantCrow": {
        "description": "Radiation-warped crows — highly intelligent, omen of danger, scatter before combat",
        "active_hours": [6, 7, 8, 9, 10, 15, 16, 17, 18],  # Morning and late afternoon
        "flock_size_min": 2,
        "flock_size_max": 15,
        "behavior": "ambient_scout",
        "locations": ["Ruins", "Wasteland", "Settlement", "Church", "Graveyard", "Forest"],
        "flee_radius": 600.0,   # Very cautious — flee long before danger
        "aggression": 0.0,
        "detection": "sight_and_hearing",
        "interesting_behaviors": [
            "Perches on power lines, rusted signs, and church steeples",
            "Explodes into flight when gunfire or combat starts — early warning for nearby NPCs",
            "NPCs who hear crows scatter can become suspicious (detection alert)",
            "Pecks at unburied corpses after combat",
            "Follows predators like Deathclaw to scavenge kills",
            "Collects shiny objects — may grab loose caps or small items",
            "Caws loudly when player is sneaking near enemy camps (can blow cover)",
            "Roosts in dead trees at dusk — distinctive silhouette",
            "Murder of crows overhead = sign something died nearby",
        ],
        "alarm_behavior": "NPCs within 1500 units become Suspicious when crows scatter",
        "scavenger_tier": 1,  # Arrives first after battle
    },
    "MutantRaven": {
        "description": "Larger than crows, solitary, near Glowing Sea and irradiated zones",
        "active_hours": list(range(0, 24)),  # All day, truly resilient
        "flock_size_min": 1,
        "flock_size_max": 3,
        "behavior": "ambient_and_omen",
        "locations": ["Glowing Sea", "Radiation Zone", "Vault", "Ruin"],
        "flee_radius": 400.0,
        "aggression": 0.0,
        "detection": "sight",
        "interesting_behaviors": [
            "Single raven perched near the entrance of dangerous vaults",
            "Watches the player — turns its head to track movement",
            "Radiation-resistant — found only where radiation is high",
            "Massive wingspan, mistaken for something worse at a distance",
            "Calls out when player takes damage — attracted by blood",
        ],
    },

    # ── FAR HARBOR DLC ───────────────────────────────────────────────────────
    "NovaDove": {
        "description": "Mutant doves — Far Harbor coastal birds, call in fog",
        "active_hours": [5, 6, 7, 8, 17, 18, 19, 20],
        "flock_size_min": 3,
        "flock_size_max": 8,
        "behavior": "ambient",
        "locations": ["Far Harbor", "Harbor", "Coast", "Fog"],
        "flee_radius": 500.0,
        "aggression": 0.0,
        "detection": "sight",
        "interesting_behaviors": [
            "Their cooing carries through the fog — eerie sound design cue",
            "Roosts on lobster trap floats and dock pilings",
            "Scatter when fog crawlers surface",
            "Locals of Far Harbor consider them good luck",
        ],
    },
    "FogGull": {
        "description": "Far Harbor sea gulls — aggressive scavengers near the harbor",
        "active_hours": [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        "flock_size_min": 4,
        "flock_size_max": 20,
        "behavior": "scavenge",
        "locations": ["Far Harbor", "Harbor", "Dock", "Coast"],
        "flee_radius": 200.0,
        "aggression": 0.1,  # Will peck if cornered
        "detection": "sight",
        "interesting_behaviors": [
            "Dive-bombs fishing boats and docks stealing fish",
            "Massive flocks circle above Mirelurk kills",
            "Bold enough to land on settlers' heads to steal food",
            "Scatter explosively from Fog Crawler attacks",
        ],
    },

    # ── NUKA-WORLD DLC ───────────────────────────────────────────────────────
    "NukaHummingbird": {
        "description": "Irradiated hummingbirds — tiny, fast, mildly venomous in Nuka-World",
        "active_hours": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        "flock_size_min": 1,
        "flock_size_max": 4,
        "behavior": "ambient",
        "locations": ["NukaWorld", "Safari Zone", "Kiddie Kingdom"],
        "flee_radius": 800.0,
        "aggression": 0.05,
        "detection": "sight",
        "interesting_behaviors": [
            "Hovers near Nuka-Cola puddles and sugar sources",
            "So fast they're nearly impossible to hit",
            "Mildly venomous sting if startled — not lethal",
            "Attracted to the player's Nuka-Cola bottles",
        ],
    },

    # ── AUTOMATRON DLC ───────────────────────────────────────────────────────
    "RobotDrone": {
        "description": "The Mechanist's aerial drones — scout and relay units",
        "active_hours": list(range(0, 24)),  # Always active
        "flock_size_min": 1,
        "flock_size_max": 3,
        "behavior": "patrol_and_scout",
        "locations": ["Industrial", "RobotFactory", "Wasteland"],
        "flee_radius": 0.0,
        "aggression": 0.7,
        "detection": "electronic_sensors",
        "interesting_behaviors": [
            "Broadcasts enemy positions to nearby robots",
            "Calls in reinforcements before entering combat",
            "Can be hacked via terminals to turn friendly",
            "Emits a distinctive whirring that players can hear approaching",
        ],
    },
}

def _seed_bird_schedules():
    """Seed the bird schedule table with default data."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()

    for species, profile in BIRD_PROFILES.items():
        for location in profile["locations"]:
            c.execute("""
                INSERT OR IGNORE INTO bird_schedules
                (species, location, active_hours, flock_size_min, flock_size_max, behavior)
                VALUES (?,?,?,?,?,?)
            """, (species, location,
                  json.dumps(profile["active_hours"]),
                  profile["flock_size_min"],
                  profile["flock_size_max"],
                  profile["behavior"]))

    conn.commit()
    conn.close()

def get_bird_activity(location: str, game_hour: float) -> list:
    """
    Return which bird/aerial species should be active at this location and time.
    Called when player enters a location — tells the game what to spawn.
    """
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Fuzzy location match
    c.execute("""
        SELECT * FROM bird_schedules
        WHERE ? LIKE '%' || location || '%' OR location LIKE '%' || ? || '%'
    """, (location, location))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    hour_int = int(game_hour % 24)
    active = []
    for row in rows:
        hours = json.loads(row["active_hours"])
        if hour_int in hours:
            profile = BIRD_PROFILES.get(row["species"], {})
            flock_size = random.randint(row["flock_size_min"], row["flock_size_max"])
            active.append({
                "species": row["species"],
                "behavior": row["behavior"],
                "flock_size": flock_size,
                "description": profile.get("description", ""),
                "flee_radius": profile.get("flee_radius", 300.0),
                "aggression": profile.get("aggression", 0.0),
                "interesting_behavior": random.choice(profile.get("interesting_behaviors", ["Flying overhead"])),
            })

    return active

def get_all_bird_profiles() -> dict:
    """Return the full bird profile database."""
    return BIRD_PROFILES

# ─────────────────────────────────────────────────────────────────────────────
# Kill Tracking & Population Pressure
# ─────────────────────────────────────────────────────────────────────────────

def record_creature_kill(species: str, location: str, killer: str = "player",
                          game_time: float = 0):
    """Record a creature kill and update population pressure."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()

    # Upsert kill count
    c.execute("""
        INSERT INTO creature_kills (species, location, kill_count, last_kill_time, first_kill_time)
        VALUES (?,?,1,?,?)
        ON CONFLICT(species, location) DO UPDATE SET
            kill_count = kill_count + 1,
            last_kill_time = ?
    """, (species, location, now, now, now))

    # Log individual death
    c.execute("""
        INSERT INTO creature_deaths (species, location, killer, game_time)
        VALUES (?,?,?,?)
    """, (species, location, killer, game_time))

    # Recalculate pressure
    c.execute("SELECT SUM(kill_count) FROM creature_kills WHERE species = ?", (species,))
    total_kills = c.fetchone()[0] or 0

    # Pressure rises with kills, logarithmically
    import math
    pressure = min(math.log(total_kills + 1) / math.log(100), 1.0)

    c.execute("""
        INSERT OR REPLACE INTO population_pressure (species, total_kills, pressure_level, last_recalc)
        VALUES (?,?,?,?)
    """, (species, total_kills, pressure, now))

    conn.commit()
    conn.close()
    return total_kills, pressure

def get_population_pressure(species: str) -> dict:
    """Get population pressure for a species."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM population_pressure WHERE species = ?", (species,))
    row = c.fetchone()
    conn.close()

    if not row:
        return {"species": species, "total_kills": 0, "pressure_level": 0.0,
                "status": "Healthy", "game_effect": "Normal behavior"}

    r = dict(row)
    pressure = r["pressure_level"]

    if pressure < 0.2:
        status = "Healthy"
        effect = "Normal behavior"
    elif pressure < 0.4:
        status = "Hunted"
        effect = "Slight aggression boost — survivors are warier"
    elif pressure < 0.6:
        status = "Stressed"
        effect = "Increased aggression, tighter pack grouping"
    elif pressure < 0.8:
        status = "Depleted"
        effect = "Survivors are desperate — attack on sight, fight to the death"
    else:
        status = "Critical"
        effect = "Near local extinction — rare encounters but extremely dangerous"

    return {**r, "status": status, "game_effect": effect,
            "aggression_modifier": 1.0 + (pressure * 0.5),
            "confidence_modifier": 1.0 + (pressure * 0.3)}

def get_all_populations() -> list:
    """Get population data for all tracked species."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT species FROM population_pressure ORDER BY pressure_level DESC")
    species_list = [r[0] for r in c.fetchall()]
    conn.close()
    return [get_population_pressure(s) for s in species_list]

# ─────────────────────────────────────────────────────────────────────────────
# Territory Management
# ─────────────────────────────────────────────────────────────────────────────

def claim_territory(location: str, species: str, rival: str = ""):
    """Mark a location as dominated by a species."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO creature_territories
        (location, dominant_species, rival_species, contested)
        VALUES (?,?,?,?)
    """, (location, species, rival, 1 if rival else 0))
    conn.commit()
    conn.close()

def get_territory_info(location: str) -> dict:
    """Get territory ownership for a location."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM creature_territories WHERE location LIKE ?", (f"%{location}%",))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"location": location, "territories": rows}

# ─────────────────────────────────────────────────────────────────────────────
# Ecosystem Health
# ─────────────────────────────────────────────────────────────────────────────

def update_ecosystem_health(location: str, had_battle: bool = False):
    """Recalculate ecosystem health for a location after events."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    now = datetime.datetime.now().isoformat()

    # Get kill data for this location
    c.execute("""
        SELECT species, kill_count FROM creature_kills
        WHERE location LIKE ? ORDER BY kill_count DESC LIMIT 1
    """, (f"%{location}%",))
    top_killed = c.fetchone()

    c.execute("""
        SELECT SUM(kill_count) as total FROM creature_kills WHERE location LIKE ?
    """, (f"%{location}%",))
    total_kills = (c.fetchone() or {}).get("total", 0) or 0

    # Simple health model
    health = max(0.1, 1.0 - (total_kills / 100.0))
    if had_battle:
        health = max(0.1, health - 0.1)

    c.execute("""
        INSERT OR REPLACE INTO ecosystem_health
        (location, prey_density, predator_density, health_score, last_battle, last_updated)
        VALUES (?,?,?,?,?,?)
    """, (location,
          max(0.1, health + 0.1),  # prey slightly more abundant than predators
          max(0.1, health - 0.1),
          health,
          now if had_battle else None,
          now))

    conn.commit()
    conn.close()
    return health

def get_ecosystem_health(location: str) -> dict:
    """Get ecosystem health report for a location."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM ecosystem_health WHERE location LIKE ?", (f"%{location}%",))
    row = c.fetchone()
    conn.close()

    if not row:
        return {"location": location, "health_score": 0.7,
                "status": "Unknown", "description": "No data collected yet"}

    r = dict(row)
    score = r["health_score"]

    if score > 0.8:
        status, desc = "Thriving", "Rich ecosystem with balanced predator/prey dynamics"
    elif score > 0.6:
        status, desc = "Stable", "Healthy but showing signs of player impact"
    elif score > 0.4:
        status, desc = "Stressed", "Population imbalance detected — predators or prey depleted"
    elif score > 0.2:
        status, desc = "Degraded", "Ecosystem significantly disrupted — expect unusual spawns"
    else:
        status, desc = "Collapsed", "Near-empty — rare but extremely dangerous lone survivors"

    return {**r, "status": status, "description": desc}

# ─────────────────────────────────────────────────────────────────────────────
# Log Parser — reads Papyrus creature death events
# ─────────────────────────────────────────────────────────────────────────────

import re

CREATURE_DEATH_PATTERN = re.compile(
    r'CREATURE_DEATH\|species=([^|]+)\|location=([^|]+)\|game_time=([\d.]+)'
)
ECOLOGY_BATTLE_PATTERN = re.compile(
    r'ECOLOGY_BATTLE\|location=([^|]+)\|corpses=(\d+)\|game_time=([\d.]+)'
)

def parse_ecology_log_line(content: str):
    """Parse ecology-tagged log lines from the Papyrus log."""
    # Creature death
    m = CREATURE_DEATH_PATTERN.search(content)
    if m:
        total, pressure = record_creature_kill(
            species=m.group(1),
            location=m.group(2),
            killer="player",
            game_time=float(m.group(3))
        )
        return {"type": "creature_kill", "species": m.group(1),
                "total_kills": total, "pressure": pressure}

    # Battle ended
    m = ECOLOGY_BATTLE_PATTERN.search(content)
    if m:
        health = update_ecosystem_health(m.group(1), had_battle=True)
        return {"type": "battle", "location": m.group(1),
                "corpses": int(m.group(2)), "ecosystem_health": health}

    return None
