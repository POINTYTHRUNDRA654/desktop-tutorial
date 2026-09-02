"""
wildlife_simulation.py — Fallout 4 Advanced AI Wildlife Behavioral Engine
==========================================================================
Mossy Industries — because nature reclaimed this world, and it behaves like it.

Simulates:
  PREDATOR-PREY CHAINS
    Deathclaw → Brahmin, Radstag, human settlers
    Yao Guai  → Radstag, Brahmin, scavengers
    Mirelurk  → fish, Bloatfly, wading humans
    Radscorpion → anything small, ambush from below
    Stingwing → crepuscular hunter, water-adjacent prey

  HERBIVORE / PREY BEHAVIOR
    Radstag: herd animals. 3-8 per group. Graze, alert, flee together.
    Brahmin: herd, slow, domestic — panics loudly (two heads bellow separately)
    Mole Rat: colony burrow, emerge to graze, dive when threatened

  BIRD / AERIAL LIFE
    Real boids flocking algorithm (cohesion, separation, alignment)
    Time-of-day scheduling (Radgulls: dawn to dusk; Bloodbugs: dusk to dawn)
    Roosting at dusk, scatter on gunfire

  SEASONAL ADAPTATION
    Spring:  breeding season — territories shrink, display behavior, young appear
    Summer:  peak activity — all creatures most aggressive / numerous
    Autumn:  migration — Radstags drift south, birds flock to warm locations
    Winter:  scarcity — desperate predators venture closer to settlements,
             Yao Guai hibernate, scavengers dominate

  MOD-AWARE
    Vegetation mods → stealth/ambush predators more common (cover)
    Living Ocean    → coastal predator chains activate
    Jungle GS       → tropical creature set takes over Glowing Sea
    Survival Mode   → all creatures hungrier, desperate, disease risk

All state written to H:\\Mossy Memory\\WildlifeState.json for Papyrus to read.
Combat directives for creatures written to Data/F4AI/creature_directive.json.
"""

from __future__ import annotations

import json
import math
import random
import sqlite3
import time
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
WILDLIFE_STATE_FILE = (_MOSSY_MEMORY / "WildlifeState.json" if _MOSSY_MEMORY.exists()
                       else _DOCS_FALLBACK / "WildlifeState.json")

# ─────────────────────────────────────────────────────────────────────────────
# Predator–Prey Chains
# ─────────────────────────────────────────────────────────────────────────────

PREDATOR_PREY_CHAINS: dict[str, dict] = {
    "Deathclaw": {
        "prey": ["Radstag", "Brahmin", "Mole Rat", "human"],
        "hunt_style": "stalk_and_charge",
        "territory_radius": 3000,
        "pack_hunt": False,
        "ambush_cover": True,
        "day_preference": "any",
        "hunger_cycle_hours": 48,
        "eats_at_kill": True,
        "driven_off_by": ["heavy_weapons", "explosives", "vertibird"],
        "lore": "Apex predator. Claims entire cell as territory. Marks territory with claw marks on trees and ruins.",
    },
    "Yao Guai": {
        "prey": ["Radstag", "Brahmin", "Bloatfly", "scavenger"],
        "hunt_style": "charge_and_maul",
        "territory_radius": 1500,
        "pack_hunt": False,
        "ambush_cover": True,
        "day_preference": "dawn_dusk",
        "hunger_cycle_hours": 24,
        "eats_at_kill": True,
        "driven_off_by": ["fire", "turrets", "large_group"],
        "seasonal_note": "Hibernates in winter. Spring emergence makes them ravenous and dangerous.",
        "lore": "Irradiated bear. Caches food under debris. Returns to the same hunting grounds. Remembers human threats.",
    },
    "Mirelurk": {
        "prey": ["fish", "Bloatfly", "human_wading", "Radgull"],
        "hunt_style": "ambush_submerged",
        "territory_radius": 500,
        "pack_hunt": True,
        "pack_size": (2, 6),
        "ambush_cover": False,
        "day_preference": "any",
        "hunger_cycle_hours": 12,
        "eats_at_kill": True,
        "driven_off_by": ["incendiary_weapons", "fire"],
        "lore": "Ambush from below the waterline. Clutch-guards their egg pile with lethal aggression.",
    },
    "Radscorpion": {
        "prey": ["Mole Rat", "small_creature", "human"],
        "hunt_style": "ambush_underground",
        "territory_radius": 800,
        "pack_hunt": False,
        "ambush_cover": False,
        "day_preference": "night",
        "hunger_cycle_hours": 18,
        "eats_at_kill": False,
        "driven_off_by": ["shock_weapons", "heavy_armor"],
        "lore": "Buries itself and waits. Feels vibrations through the ground. Venom immobilizes prey before dragging it underground.",
    },
    "Stingwing": {
        "prey": ["Bloatfly", "Bloodbug", "small_animal"],
        "hunt_style": "dive_sting",
        "territory_radius": 600,
        "pack_hunt": True,
        "pack_size": (2, 4),
        "ambush_cover": False,
        "day_preference": "crepuscular",
        "hunger_cycle_hours": 8,
        "eats_at_kill": False,
        "driven_off_by": ["explosives", "fire"],
        "lore": "Hunts in mated pairs at dusk and dawn. Territorial against other flyers. Nests in reeds.",
    },
    "Mutant Hound": {
        "prey": ["Radstag", "small_animal", "human"],
        "hunt_style": "pack_chase",
        "territory_radius": 1200,
        "pack_hunt": True,
        "pack_size": (3, 8),
        "ambush_cover": False,
        "day_preference": "any",
        "hunger_cycle_hours": 12,
        "eats_at_kill": True,
        "driven_off_by": ["explosives", "super_mutant_whistle"],
        "lore": "Super Mutant companion animal. Pack hierarchy. Alpha leads the chase, others cut off escape routes.",
    },
    "Fog Crawler": {
        "prey": ["human", "Radstag", "large_creature"],
        "hunt_style": "ambush_fog",
        "territory_radius": 2000,
        "pack_hunt": False,
        "ambush_cover": True,
        "day_preference": "fog_events",
        "hunger_cycle_hours": 72,
        "eats_at_kill": True,
        "driven_off_by": ["explosives"],
        "lore": "Far Harbor only. Uses the supernatural fog as cover. Hunts by vibration. Ancient, patient, enormous.",
    },
}

PREY_PROFILES: dict[str, dict] = {
    "Radstag": {
        "herd_size": (3, 8),
        "graze_area_radius": 800,
        "flee_speed": "fast",
        "flee_trigger_radius": 600,
        "alert_call": True,
        "seasonal_migration": True,
        "migration_direction": "south_in_autumn",
        "behavior_day": "graze_then_water",
        "behavior_night": "shelter_in_trees",
        "interesting_behaviors": [
            "Herd sentinel watches while others graze — rotates every few minutes",
            "Dominant stag marks territory by scraping bark with antlers",
            "Calves stay at center of herd, adults form outer ring",
            "Entire herd bolts at the first alert bark",
            "Returns to same grazing grounds daily if undisturbed",
            "Drinks at water at dawn and dusk — most vulnerable moment",
            "After fleeing, circles wide and returns to original area hours later",
        ],
    },
    "Brahmin": {
        "herd_size": (2, 6),
        "graze_area_radius": 400,
        "flee_speed": "slow",
        "flee_trigger_radius": 400,
        "alert_call": True,
        "two_headed_behavior": True,
        "seasonal_migration": False,
        "behavior_day": "graze_near_settlement",
        "behavior_night": "pen_or_enclosure",
        "interesting_behaviors": [
            "Two heads bellow separately when alarmed — creates dissonant warning call",
            "Will not go out at night without settler supervision",
            "Stays close to familiar handler — follows them through settlement",
            "Highly sensitive to Deathclaw smell — panics from 1500+ units away",
            "After attack on herd, requires 2 game-days to calm down",
            "Produces less milk when happiness is low",
        ],
    },
    "Mole Rat": {
        "colony_size": (4, 12),
        "burrow_radius": 300,
        "flee_trigger_radius": 200,
        "burst_from_ground": True,
        "seasonal_migration": False,
        "behavior_day": "surface_graze",
        "behavior_night": "underground",
        "interesting_behaviors": [
            "Colony has a tunnel network — emerges from multiple burrow entrances simultaneously",
            "Scouts emerge first, signal safety to the colony",
            "Will not surface near fresh blood smell",
            "Dominant male drives colony movement — kill him, colony scatters",
            "Gnaws on structural supports in ruins — can weaken floor sections",
        ],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Boids Flocking Algorithm (for birds)
# ─────────────────────────────────────────────────────────────────────────────

class Vec2:
    """Minimal 2D vector for flocking math."""
    __slots__ = ("x", "y")
    def __init__(self, x: float = 0.0, y: float = 0.0):
        self.x = x; self.y = y
    def __add__(self, o: "Vec2") -> "Vec2": return Vec2(self.x + o.x, self.y + o.y)
    def __sub__(self, o: "Vec2") -> "Vec2": return Vec2(self.x - o.x, self.y - o.y)
    def __mul__(self, s: float) -> "Vec2": return Vec2(self.x * s, self.y * s)
    def length(self) -> float: return math.sqrt(self.x**2 + self.y**2)
    def normalize(self) -> "Vec2":
        l = self.length()
        return Vec2(self.x / l, self.y / l) if l > 0 else Vec2()
    def to_dict(self) -> dict: return {"x": round(self.x, 1), "y": round(self.y, 1)}


def simulate_flock(
    positions: list[tuple[float, float]],
    velocities: list[tuple[float, float]],
    target: Optional[tuple[float, float]] = None,
    scatter_point: Optional[tuple[float, float]] = None,
    cohesion_r: float = 250.0,
    separation_r: float = 60.0,
    alignment_r: float = 150.0,
    max_speed: float = 80.0,
    dt: float = 1.0,
) -> list[dict]:
    """
    Run one tick of Boids flocking for a group of birds.
    Returns list of {position, velocity, heading} for each bird.
    Used to compute bird movement directives sent to Papyrus.
    """
    birds = [
        {"pos": Vec2(px, py), "vel": Vec2(vx, vy)}
        for (px, py), (vx, vy) in zip(positions, velocities)
    ]

    new_birds = []
    for i, b in enumerate(birds):
        cohesion   = Vec2()
        separation = Vec2()
        alignment  = Vec2()
        near_count = 0

        for j, other in enumerate(birds):
            if i == j:
                continue
            diff = other["pos"] - b["pos"]
            dist = diff.length()

            if dist < cohesion_r:
                cohesion = cohesion + other["pos"]
                near_count += 1

            if dist < separation_r and dist > 0:
                separation = separation - (diff.normalize() * (separation_r / dist))

            if dist < alignment_r:
                alignment = alignment + other["vel"]

        if near_count > 0:
            cohesion = (cohesion * (1.0 / near_count) - b["pos"]).normalize() * 0.3

        if alignment.length() > 0:
            alignment = alignment.normalize() * 0.2

        if separation.length() > 0:
            separation = separation.normalize() * 0.5

        # Pull toward target (roost or food)
        target_force = Vec2()
        if target:
            td = Vec2(target[0], target[1]) - b["pos"]
            if td.length() > 50:
                target_force = td.normalize() * 0.4

        # Scatter away from disturbance (gunfire etc.)
        scatter_force = Vec2()
        if scatter_point:
            sd = b["pos"] - Vec2(scatter_point[0], scatter_point[1])
            if sd.length() < 800:
                scatter_force = sd.normalize() * 2.0

        new_vel = b["vel"] + cohesion + separation + alignment + target_force + scatter_force
        if new_vel.length() > max_speed:
            new_vel = new_vel.normalize() * max_speed

        new_pos = b["pos"] + new_vel * dt
        heading = math.degrees(math.atan2(new_vel.y, new_vel.x))

        new_birds.append({
            "position": new_pos.to_dict(),
            "velocity": new_vel.to_dict(),
            "heading": round(heading, 1),
            "speed": round(new_vel.length(), 1),
        })

    return new_birds


# ─────────────────────────────────────────────────────────────────────────────
# Seasonal State
# ─────────────────────────────────────────────────────────────────────────────

def get_season_from_game_day(game_day: int) -> str:
    """Map game day to season. FO4 doesn't have explicit seasons — we simulate with a 90-day cycle."""
    cycle = game_day % 360
    if cycle < 90:   return "spring"
    if cycle < 180:  return "summer"
    if cycle < 270:  return "autumn"
    return "winter"


SEASONAL_MODIFIERS: dict[str, dict] = {
    "spring": {
        "predator_aggression": 1.2,   # Hungrier after winter
        "territory_size": 0.7,         # Smaller — breeding reduces roaming
        "prey_abundance": 1.3,         # Calving season
        "bird_activity": 1.5,          # Breeding season peak
        "migration_active": True,
        "special_behaviors": [
            "Predators displaying territorial aggression — more frequent than usual",
            "Radstag stags fighting for dominance — dueling in open fields",
            "Yao Guai emerging from hibernation — ravenous and unpredictable",
            "Bird pairs building nests — Radgulls colonizing ruins",
            "Mole Rat colonies expanding — new burrows appearing",
        ],
    },
    "summer": {
        "predator_aggression": 1.0,
        "territory_size": 1.0,
        "prey_abundance": 1.0,
        "bird_activity": 1.0,
        "migration_active": False,
        "special_behaviors": [
            "Peak predator activity — full territories maintained",
            "Herds at maximum size — safety in numbers",
            "Bloatfly swarms peak near water bodies",
            "Bloodbugs most aggressive — humidity raises activity",
        ],
    },
    "autumn": {
        "predator_aggression": 1.1,    # Hungry — prey migrating away
        "territory_size": 1.3,          # Extending range as prey moves
        "prey_abundance": 0.8,          # Prey migrating south
        "bird_activity": 1.2,           # Flock sizes peak before migration
        "migration_active": True,
        "special_behaviors": [
            "Radstag herds moving south — large groups crossing open ground",
            "Predators following prey migration — unusual appearances in new areas",
            "Radgull flocks growing massive — up to 40 birds before departure",
            "Yao Guai feeding heavily — preparing for winter",
            "Insects dying off — Stingwings, Bloatflies becoming scarce",
        ],
    },
    "winter": {
        "predator_aggression": 1.4,    # Desperation — scarcity
        "territory_size": 1.5,          # Ranging far for food
        "prey_abundance": 0.5,          # Scarce
        "bird_activity": 0.3,           # Most gone south
        "migration_active": False,
        "special_behaviors": [
            "Yao Guai in hibernation — caves occupied, do NOT disturb",
            "Deathclaws ranging closer to settlements — desperate for prey",
            "Mutant Hound packs larger — safety in numbers, sharing kills",
            "Radscorpions barely active — partially dormant underground",
            "Mole Rats mostly underground — colony in winter mode",
            "Scavenger creatures (Bloatfly, Radroach) dominate — everything else is gone",
            "Settlements see a spike in Brahmin theft and wolf-level predator incursion",
        ],
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Predator Hunt Simulation
# ─────────────────────────────────────────────────────────────────────────────

def generate_hunt_directive(
    predator_species: str,
    predator_id: str,
    predator_location: str,
    prey_species: str,
    prey_distance: float,
    predator_hp_pct: float,
    season: str,
    is_night: bool,
    has_cover: bool,
    mod_tags: list[str],
) -> dict:
    """
    Generate a hunt directive for a creature acting as predator.
    Called by the bridge when a predator detects prey.
    """
    profile = PREDATOR_PREY_CHAINS.get(predator_species)
    if not profile:
        return {"directive": "idle", "reason": "Unknown predator species"}

    season_mod = SEASONAL_MODIFIERS.get(season, SEASONAL_MODIFIERS["summer"])
    aggression = season_mod["predator_aggression"]

    # Winter desperation brings them closer to settlements
    settlement_prey_override = (
        season == "winter" and prey_species in ("human", "Brahmin", "settler")
    )

    # Mod: vegetation cover makes ambush predators bolder
    if "vegetation" in mod_tags and profile.get("ambush_cover"):
        aggression += 0.2

    # Is this creature a pack hunter?
    pack_info = ""
    if profile.get("pack_hunt"):
        min_p, max_p = profile.get("pack_size", (2, 4))
        pack_size = random.randint(min_p, max_p)
        pack_info = f"Pack hunt: {pack_size} individuals. Alpha leads, others flank."

    hunt_style = profile["hunt_style"]
    preferred_time = profile.get("day_preference", "any")

    # Timing mismatch reduces aggression
    if preferred_time == "night" and not is_night:
        aggression *= 0.5
    elif preferred_time == "crepuscular" and is_night:
        aggression *= 0.7
    elif preferred_time == "dawn_dusk" and not is_night:
        aggression *= 0.8

    # Low HP = retreat to den
    if predator_hp_pct < 0.25 and not settlement_prey_override:
        return {
            "directive": "retreat_to_den",
            "predator_id": predator_id,
            "species": predator_species,
            "reason": "Injured — retreating to recover",
            "recovery_hours": random.uniform(4, 12),
        }

    # Decide directive based on distance and style
    if prey_distance > profile["territory_radius"]:
        return {"directive": "patrol_territory", "predator_id": predator_id, "species": predator_species}

    if hunt_style == "stalk_and_charge":
        if prey_distance > 800 and has_cover:
            directive = "stalk"
            action = "Moving downwind, using cover to close distance without alerting prey"
        elif prey_distance > 300:
            directive = "charge"
            action = "Breaking cover — full charge at prey"
        else:
            directive = "attack"
            action = "In kill range — attacking"

    elif hunt_style == "ambush_submerged":
        directive = "submerged_wait" if prey_distance > 200 else "burst_from_water"
        action = "Waiting submerged until prey wades in" if prey_distance > 200 else "Erupting from water"

    elif hunt_style == "ambush_underground":
        directive = "wait_underground" if prey_distance > 150 else "burst_from_ground"
        action = "Sensing ground vibrations, waiting" if prey_distance > 150 else "Erupting from burrow"

    elif hunt_style == "pack_chase":
        directive = "pack_chase"
        action = f"Initiating coordinated chase. {pack_info}"

    elif hunt_style == "dive_sting":
        directive = "hover_and_dive" if prey_distance > 100 else "sting"
        action = "Hovering above, waiting for opening" if prey_distance > 100 else "Diving with stinger"

    elif hunt_style == "ambush_fog":
        directive = "fog_stalk" if has_cover else "charge"
        action = "Drifting through fog toward vibration source" if has_cover else "Direct assault"

    else:
        directive = "charge_and_maul"
        action = "Charging directly"

    return {
        "directive": directive,
        "predator_id": predator_id,
        "species": predator_species,
        "prey_species": prey_species,
        "action": action,
        "pack_info": pack_info,
        "aggression_level": round(aggression, 2),
        "season": season,
        "lore_note": profile.get("lore", ""),
        "driven_off_by": profile.get("driven_off_by", []),
    }


def generate_prey_directive(
    prey_species: str,
    prey_id: str,
    predator_species: str,
    predator_distance: float,
    herd_size: int,
    season: str,
) -> dict:
    """Generate a flee/alert directive for a prey animal that detects a predator."""
    profile = PREY_PROFILES.get(prey_species)
    if not profile:
        return {"directive": "flee", "prey_id": prey_id}

    flee_radius = profile.get("flee_trigger_radius", 400)
    season_mod = SEASONAL_MODIFIERS.get(season, SEASONAL_MODIFIERS["summer"])

    # Scale flee radius with prey abundance (more abundant = more bold; less = more scared)
    adjusted_flee_radius = flee_radius * (1.2 - season_mod["prey_abundance"] * 0.2)

    if predator_distance > adjusted_flee_radius:
        return {
            "directive": "alert",
            "prey_id": prey_id,
            "species": prey_species,
            "action": "Sentinel raised head — ears rotating toward threat",
        }

    # Alert the herd
    alert_call = "Barking alarm call" if profile.get("alert_call") else "Silent scatter"

    if prey_species == "Brahmin" and profile.get("two_headed_behavior"):
        alert_call = "Both heads bellowing simultaneously — dissonant dual alarm"

    return {
        "directive": "herd_flee",
        "prey_id": prey_id,
        "species": prey_species,
        "action": f"{alert_call}. Entire herd of {herd_size} fleeing together.",
        "flee_direction": "away_from_predator",
        "regroup_after_minutes": random.uniform(8, 20),
        "behaviors": random.sample(profile.get("interesting_behaviors", []), min(2, len(profile.get("interesting_behaviors", [])))),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Bird Scheduling
# ─────────────────────────────────────────────────────────────────────────────

BIRD_PROFILES: dict[str, dict] = {
    "Radgull": {
        "active_hours": list(range(6, 19)),
        "flock_size": (4, 15),
        "behavior": "ambient",
        "habitats": ["coast", "diamond_city", "market", "river", "dock"],
        "scatter_trigger": "gunfire",
        "roost_time": 19,
        "interesting_behaviors": [
            "Circles over market stalls looking to steal food",
            "Lands on rooftops and gateposts — sentinels",
            "Scatters explosively upward on first gunshot",
            "Follows fishing settlers along docks",
            "Massive flocking in autumn before migration south",
        ],
    },
    "Stingwing": {
        "active_hours": [5, 6, 18, 19, 20, 21],
        "flock_size": (1, 4),
        "behavior": "hunt",
        "habitats": ["swamp", "river", "wetland"],
        "scatter_trigger": None,
        "roost_time": 22,
        "interesting_behaviors": [
            "Hovers motionless above water — impossible to predict strike",
            "Male-female hunting pairs coordinate dives",
            "Territorial display: wing-fanning at other flying creatures",
        ],
    },
    "Bloatfly": {
        "active_hours": list(range(0, 24)),
        "flock_size": (3, 10),
        "behavior": "scavenge",
        "habitats": ["wasteland", "battlefield", "settlement_edge"],
        "scatter_trigger": None,
        "interesting_behaviors": [
            "Arrives within 10 minutes of a creature dying",
            "Defends corpse territory against other scavengers",
            "Explodes on death — sprays acidic larva",
        ],
    },
    "Bloodbug": {
        "active_hours": [4, 5, 6, 19, 20, 21, 22, 23, 0],
        "flock_size": (2, 8),
        "behavior": "hunt",
        "habitats": ["swamp", "settlement", "river"],
        "scatter_trigger": None,
        "interesting_behaviors": [
            "Attracted to wounded creatures from 2000 units",
            "Drains blood then retreats to digest — returns",
            "Lays eggs in standing water near settlements",
        ],
    },
    "Mutant Bat": {
        "active_hours": [20, 21, 22, 23, 0, 1, 2, 3, 4],
        "flock_size": (5, 20),
        "behavior": "ambient",
        "habitats": ["ruin", "cave", "vault_exterior"],
        "scatter_trigger": "light",
        "roost_time": 5,
        "interesting_behaviors": [
            "Emerges in massive column from ruin at dusk",
            "Echolocates — disturbed by radar installations",
            "Roosts hanging from ceiling — walk quietly in caves",
        ],
    },
}


def get_bird_schedule(game_hour: int, location: str, season: str, has_gunfire: bool = False) -> list[dict]:
    """Return active bird directives for the current game hour and location."""
    season_mod = SEASONAL_MODIFIERS.get(season, SEASONAL_MODIFIERS["summer"])
    bird_activity_multiplier = season_mod.get("bird_activity", 1.0)

    active = []
    loc_lower = location.lower()

    for species, profile in BIRD_PROFILES.items():
        if game_hour not in profile["active_hours"]:
            continue

        # Check habitat match
        habitat_match = any(h in loc_lower for h in profile.get("habitats", []))
        if not habitat_match and profile.get("habitats"):
            if "wasteland" not in profile.get("habitats", []):
                continue

        if has_gunfire and profile.get("scatter_trigger") == "gunfire":
            active.append({
                "species": species,
                "state": "scatter",
                "direction": "random_upward_panic",
                "behavior": "Explosive scatter — all birds flush simultaneously",
                "flock_size": random.randint(*profile["flock_size"]),
                "returns_in_minutes": random.uniform(5, 15),
            })
            continue

        flock_size = max(1, int(random.randint(*profile["flock_size"]) * bird_activity_multiplier))
        behavior_note = random.choice(profile.get("interesting_behaviors", ["Active"]))

        active.append({
            "species": species,
            "state": "active",
            "behavior": profile["behavior"],
            "behavior_note": behavior_note,
            "flock_size": flock_size,
            "season_modifier": round(bird_activity_multiplier, 2),
        })

    return active


# ─────────────────────────────────────────────────────────────────────────────
# Ecosystem Health & Kill Pressure
# ─────────────────────────────────────────────────────────────────────────────

def record_creature_kill(species: str, location: str, killer: str = "player") -> None:
    """Record a kill — affects population pressure and predator migration."""
    now = datetime.utcnow().isoformat()
    try:
        with sqlite3.connect(MEMORY_DB) as conn:
            conn.execute("""
                INSERT INTO creature_kills (species, location, kill_count, last_kill_time, first_kill_time)
                VALUES (?, ?, 1, ?, ?)
                ON CONFLICT(species, location) DO UPDATE SET
                    kill_count = kill_count + 1,
                    last_kill_time = excluded.last_kill_time
            """, (species, location, now, now))
            conn.execute("""
                INSERT INTO population_pressure (species, total_kills, pressure_level, last_recalc)
                VALUES (?, 1, 0.0, ?)
                ON CONFLICT(species) DO UPDATE SET
                    total_kills = total_kills + 1
            """, (species, now))
            conn.execute("""
                INSERT INTO creature_deaths (species, location, killer, real_time)
                VALUES (?, ?, ?, ?)
            """, (species, location, killer, now))
    except Exception as e:
        print(f"[Wildlife] Kill record error: {e}")


def recalculate_pressure(species: str) -> float:
    """Recalculate population pressure for a species. 0.0=healthy, 1.0=critical."""
    try:
        with sqlite3.connect(MEMORY_DB) as conn:
            row = conn.execute(
                "SELECT total_kills FROM population_pressure WHERE species = ?", (species,)
            ).fetchone()
            if not row:
                return 0.0
            total = row[0]
            # Pressure scale: 0 kills = 0.0, 50 kills = 0.5, 100+ kills = 1.0
            pressure = min(1.0, total / 100.0)
            conn.execute(
                "UPDATE population_pressure SET pressure_level = ?, last_recalc = ? WHERE species = ?",
                (pressure, datetime.utcnow().isoformat(), species)
            )
            return pressure
    except Exception:
        return 0.0


def get_migration_pressure(species: str) -> Optional[str]:
    """If a species is over-hunted in a region, suggest migration target."""
    pressure = recalculate_pressure(species)
    if pressure < 0.6:
        return None  # Population healthy — no migration needed

    # High pressure — suggest nearby area
    nearby_areas = [
        "Concord outskirts", "Lexington surroundings", "Quincy outskirts",
        "Glowing Sea edge", "Nahant Coast", "Malden drainage"
    ]
    return random.choice(nearby_areas)


# ─────────────────────────────────────────────────────────────────────────────
# World State Output for Papyrus
# ─────────────────────────────────────────────────────────────────────────────

def generate_wildlife_state(
    game_hour: int,
    game_day: int,
    location: str,
    has_gunfire: bool = False,
    mod_tags: list[str] = [],
) -> dict:
    """
    Master function — generate complete wildlife state for current location/time.
    Written to WildlifeState.json for Papyrus ModAwareEcology.psc to read.
    """
    season = get_season_from_game_day(game_day)
    is_night = game_hour < 5 or game_hour >= 20
    season_data = SEASONAL_MODIFIERS[season]

    birds = get_bird_schedule(game_hour, location, season, has_gunfire)

    # Mod effects on wildlife
    mod_notes = []
    if "vegetation" in mod_tags:
        mod_notes.append("Dense vegetation — ambush predators more active, prey harder to spot")
    if "living_ocean" in mod_tags:
        mod_notes.append("Living Ocean active — coastal predator chains at full strength")
    if "glowing_sea_jungle" in mod_tags:
        mod_notes.append("Glowing Sea jungle — Fog Crawlers and tropical variants dominating")
    if "survival_mode" in mod_tags:
        mod_notes.append("Survival mode — all creatures hungrier, diseased variants possible")

    state = {
        "generated_at": datetime.utcnow().isoformat(),
        "location": location,
        "game_hour": game_hour,
        "is_night": is_night,
        "season": season,
        "season_notes": season_data["special_behaviors"][:3],
        "predator_aggression_multiplier": season_data["predator_aggression"],
        "prey_abundance_multiplier": season_data["prey_abundance"],
        "migration_active": season_data["migration_active"],
        "active_birds": birds,
        "bird_count": len(birds),
        "mod_effects": mod_notes,
        "ecosystem_health": _get_location_health(location),
    }

    # Write for Papyrus
    try:
        WILDLIFE_STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except OSError as e:
        print(f"[Wildlife] State write error: {e}")

    return state


def _get_location_health(location: str) -> dict:
    """Query ecosystem health for a location from SQLite."""
    try:
        with sqlite3.connect(MEMORY_DB) as conn:
            row = conn.execute(
                "SELECT * FROM ecosystem_health WHERE location = ?", (location,)
            ).fetchone()
            if row:
                return dict(row)
    except Exception:
        pass
    return {
        "location": location,
        "health_score": 0.7,
        "apex_predator": "Deathclaw",
        "prey_density": 0.5,
        "predator_density": 0.5,
    }
