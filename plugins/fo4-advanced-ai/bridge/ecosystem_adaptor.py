"""
ecosystem_adaptor.py
Fallout 4 Advanced AI — Mod-Aware Ecosystem Adaptor
=====================================================

Takes the mod profile from mod_detector.py and propagates its effects
across every world system we've built:

  VEGETATION MODS →
    - Rain frequency increases (transpiration cycle)
    - Sound absorption increases (plants dampen sound)
    - Stealth bonus from foliage increases
    - NPC detection radius decreases (can't see through plants)
    - Herbivore populations increase (more food = more prey)
    - Predator populations follow prey into new areas
    - Humidity rises → more fog events → fog-dwelling creatures more active
    - Dense cover → ambush creature prevalence rises
    - Carbon sequestration narrative: air quality slightly better

  FISH / AQUATIC LIFE MODS →
    - Full aquatic food chain activates:
        Fish → Mirelurks have prey to track, not just ambush players
        Fish → Birds of prey (osprey-like mutants, herons) hunt at water
        Fish → Larger aquatic predators (sharks, eels) if Living Ocean active
        Fish → Bloatflies breed near fish-rich water (food source)
    - Watering holes become fishing spots — new predator dynamics
    - Anglers' lures more effective (more fish to attract)
    - Far Harbor fishermen have actual fish to catch → economy improves

  GLOWING SEA JUNGLE →
    - Entire creature set changes: jungle creatures active in GS
    - Temperature/humidity: tropical heat, constant mist
    - Sound profile: insect noise, bird calls, dripping water
    - Radiation still high but vegetation adapted to it
    - New predator-prey chains in the "jungle"
    - Fog Crawlers thrive in the mist
    - Deathclaws use dense cover for ambush (not open stalking)
    - Rain frequency peaks (2-3x vanilla)

  LIVING OCEAN →
    - Coral reefs = shelter = fish diversity = larger predators
    - Tidal patterns: coastal areas flood/recede twice per game-day
    - Bioluminescence at night: beautiful but reveals underwater movement
    - Coastal creatures migrate with tides
    - Mirelurk Queens more active (more food = bigger territory)
    - Storm surge more dramatic (more water volume)

  WEATHER OVERHAULS (True Storms / Vivid) →
    - Storm intensity multiplier applies to all our storm reactions
    - Lightning events: brief but intense visibility spikes
    - Additional fog events stacked on our fog system
    - Thunder = distant gunshot detection masking (NPCs confused)

  DARKER NIGHTS →
    - Our darkness stealth system multiplied
    - Nocturnal creatures even more dangerous
    - Settlement guard perception further reduced at night
    - Pip-Boy light detection range increased

  SURVIVAL MODE →
    - NPC hunger/thirst affects morale more sharply
    - Diseased creatures spread infection (Ghoul radiation disease)
    - Desperate creatures venture further for food/water
    - Caravan guards more watchful (disease risk)

Writes adaptation state to AdvancedAI_EcosystemState.json
which the Papyrus ModAwareEcology.psc reads every tick.
"""

import json
import datetime
import sqlite3
from pathlib import Path
from typing import Optional

from mod_detector import get_mod_profile, get_world_multipliers

DOCUMENTS      = Path.home() / "Documents" / "My Games" / "Fallout4"
ECOSYSTEM_FILE = DOCUMENTS / "AdvancedAI_EcosystemState.json"
MEMORY_DB_PATH = DOCUMENTS / "AdvancedAI_Memory.db"

# ─────────────────────────────────────────────────────────────────────────────
# Ecosystem State Schema
# ─────────────────────────────────────────────────────────────────────────────

ECOSYSTEM_SCHEMA = """
CREATE TABLE IF NOT EXISTS ecosystem_state (
    key             TEXT PRIMARY KEY,
    value           TEXT,
    source          TEXT DEFAULT 'mod_adaptor',
    last_updated    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_web_chains (
    predator        TEXT NOT NULL,
    prey            TEXT NOT NULL,
    location_type   TEXT DEFAULT 'any',
    active          INTEGER DEFAULT 1,
    source_mod      TEXT,
    PRIMARY KEY (predator, prey, location_type)
);

CREATE TABLE IF NOT EXISTS mod_creature_additions (
    species         TEXT NOT NULL,
    location_type   TEXT,
    season          TEXT DEFAULT 'any',
    active          INTEGER DEFAULT 1,
    source_mod      TEXT,
    behavior_notes  TEXT,
    PRIMARY KEY (species, location_type)
);
"""

# ─────────────────────────────────────────────────────────────────────────────
# Food Web Definitions
# (Vanilla + what gets added by mod detection)
# ─────────────────────────────────────────────────────────────────────────────

VANILLA_FOOD_WEB = [
    # Predator          Prey              Location
    ("Deathclaw",       "Brahmin",         "wasteland"),
    ("Deathclaw",       "Radstag",         "wasteland"),
    ("YaoGuai",         "Molerat",         "any"),
    ("Radscorpion",     "Brahmin",         "any"),
    ("Radscorpion",     "Molerat",         "any"),
    ("Bloodbug",        "Brahmin",         "any"),
    ("Bloodbug",        "Radstag",         "any"),
    ("Mirelurk",        "Brahmin",         "coastal"),
    ("Glowing One",     "Feral Ghoul",     "any"),  # leads, not eats
]

FISH_FOOD_WEB = [
    # When fish mods are present:
    ("Mirelurk",        "Fish",            "water"),
    ("MirelurkQueen",   "Fish",            "water"),
    ("Gulper",          "Fish",            "water"),
    ("FogCrawler",      "Fish",            "coastal"),
    ("Bloodbug",        "Fish",            "water_edge"),
    ("MutantHeron",     "Fish",            "water_edge"),   # new bird
    ("MutantOsprey",    "Fish",            "water"),         # new bird
    ("Stingwing",       "Fish",            "water_edge"),
    ("Angler",          "Fish",            "water"),         # lures fish too
]

CORAL_FOOD_WEB = [
    # When Living Ocean is present:
    ("LargeShark",      "Fish",            "ocean"),
    ("MutantEel",       "Fish",            "ocean"),
    ("GiantCrab",       "Fish",            "ocean"),
    ("MirelurkQueen",   "Fish",            "ocean"),
    ("MirelurkQueen",   "Coral",           "ocean"),         # foraging
]

JUNGLE_GS_CREATURES = [
    # Glowing Sea becomes jungle — new species active there
    ("JungleDeathclaw",   "jungle",   "any",    "Deathclaw adapted to jungle — uses dense cover for ambush, quieter approach"),
    ("MutatedPython",     "jungle",   "any",    "Large constrictor snake — ambush from trees/roots"),
    ("GiantBeetle",       "jungle",   "any",    "Rhinoceros beetle mutant — tank armor, charge attack"),
    ("VenomSpider",       "jungle",   "any",    "Irradiated trapdoor spider — pit ambush, web trap"),
    ("MutantParrot",      "jungle",   "any",    "Alarm species — mimics sounds, warns other creatures"),
    ("NeonFly",           "jungle",   "any",    "Bioluminescent fly swarms — reveals player position at night"),
    ("FogCrawler",        "jungle",   "any",    "Thrives in jungle mist — larger, more territorial"),
    ("JungleMirelurk",    "jungle",   "Summer", "Amphibious — uses flooded jungle floor as hunting ground"),
]

# ─────────────────────────────────────────────────────────────────────────────
# Adaptation Functions
# ─────────────────────────────────────────────────────────────────────────────

def init_ecosystem_schema():
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.executescript(ECOSYSTEM_SCHEMA)

    # Seed vanilla food web
    c = conn.cursor()
    for pred, prey, loc in VANILLA_FOOD_WEB:
        c.execute("""
            INSERT OR IGNORE INTO food_web_chains (predator, prey, location_type, source_mod)
            VALUES (?,?,?,'vanilla')
        """, (pred, prey, loc))

    conn.commit()
    conn.close()

def apply_mod_adaptations() -> dict:
    """
    Read mod profile and compute full ecosystem adaptation state.
    Returns the state dict and writes it to JSON + DB.
    """
    profile  = get_mod_profile()
    mults    = profile.get("world_multipliers", {})
    tags     = set(profile.get("tags", []))
    cats     = profile.get("categories", {})

    state = {
        "generated_at":      datetime.datetime.now().isoformat(),
        "mod_count":         profile.get("total_mods", 0),
        "detected_categories": {k: len(v) for k, v in cats.items() if v},
        "adaptations":       [],
        "world_adjustments": mults,
        "food_web":          [],
        "creature_additions":[],
        "global_flags":      {},
        "papyrus_globals":   {},  # Key-value pairs to write to FO4 GlobalVariables
    }

    conn = sqlite3.connect(MEMORY_DB_PATH)
    c    = conn.cursor()
    now  = datetime.datetime.now().isoformat()

    # ── VEGETATION ADAPTATIONS ───────────────────────────────────────────────
    veg_count = len(cats.get("vegetation", []))
    if veg_count > 0:
        rain_mult = mults.get("rain_frequency", 1.0)
        stealth   = mults.get("stealth_bonus_foliage", 0.0)
        det_red   = mults.get("detection_reduction", 0.0)

        state["adaptations"].append({
            "system": "Weather",
            "change": f"Rain frequency ×{rain_mult:.2f} ({veg_count} vegetation mod{'s' if veg_count>1 else ''})",
            "detail": "Plant transpiration increases atmospheric moisture. More rain, more fog, more plant growth — a virtuous cycle.",
        })
        state["adaptations"].append({
            "system": "Stealth",
            "change": f"+{stealth*100:.0f}% stealth in foliage areas",
            "detail": "Dense plant life provides real cover. Sight lines are broken.",
        })
        state["adaptations"].append({
            "system": "Detection",
            "change": f"NPC sight radius -{det_red*100:.0f}%",
            "detail": "NPCs can't see as far through dense vegetation.",
        })
        state["adaptations"].append({
            "system": "Herbivores",
            "change": "Radstag and Brahmin populations increased near vegetation",
            "detail": "More food sources bring more prey animals out of hiding.",
        })
        state["adaptations"].append({
            "system": "Predators",
            "change": "Predators follow herbivores into newly vegetated areas",
            "detail": "Deathclaws and Yao Guai now patrol areas with dense vegetation.",
        })
        state["adaptations"].append({
            "system": "Ambush",
            "change": "Ambush creature prevalence +35% in high-vegetation zones",
            "detail": "Radscorpions, Cave Crickets, and Fog Crawlers thrive in dense cover.",
        })

        # Write to DB
        for key, val in {
            "veg_rain_mult":    str(rain_mult),
            "veg_stealth_add":  str(stealth),
            "veg_det_reduce":   str(det_red),
            "veg_count":        str(veg_count),
        }.items():
            c.execute("INSERT OR REPLACE INTO ecosystem_state (key,value,last_updated) VALUES (?,?,?)",
                      (key, val, now))

        # Papyrus globals
        state["papyrus_globals"]["AAI_gVegRainMult"]    = rain_mult
        state["papyrus_globals"]["AAI_gVegStealthAdd"]  = stealth
        state["papyrus_globals"]["AAI_gVegDetReduce"]   = det_red
        state["papyrus_globals"]["AAI_gVegCount"]       = float(veg_count)

    # ── GLOWING SEA JUNGLE ───────────────────────────────────────────────────
    if mults.get("gs_jungle_active"):
        state["adaptations"].append({
            "system": "Glowing Sea",
            "change": "JUNGLE BIOME ACTIVE — complete ecosystem overhaul",
            "detail": "The Glowing Sea is now a mutated tropical jungle. "
                      "Dense canopy, constant mist, tropical heat, heavy rain. "
                      "New jungle-adapted creatures. Deathclaws hunt from cover. "
                      "Radiation is still lethal — this is a beautiful death trap.",
        })

        # Add jungle creatures
        for spec, loc, season, notes in JUNGLE_GS_CREATURES:
            c.execute("""
                INSERT OR REPLACE INTO mod_creature_additions
                (species, location_type, season, source_mod, behavior_notes)
                VALUES (?,?,?,'gs_jungle',?)
            """, (spec, loc, season, notes))
            state["creature_additions"].append({
                "species": spec, "location": "Glowing Sea", "notes": notes
            })

        state["global_flags"]["gs_jungle"] = True
        state["papyrus_globals"]["AAI_gGSJungle"] = 1.0

    # ── FISH / AQUATIC FOOD WEB ──────────────────────────────────────────────
    if mults.get("fish_present"):
        state["adaptations"].append({
            "system": "Aquatic Ecosystem",
            "change": "Full aquatic food web active",
            "detail": "Fish are present → Mirelurks have prey to track. "
                      "Mutant herons and ospreys hunt at waterlines. "
                      "Anglers' lures attract actual fish → ambush more effective. "
                      "Far Harbor fishermen have real catches → settlement economy improves. "
                      "Larger aquatic predators patrol fish-rich zones.",
        })

        # Add fish food web chains
        for pred, prey, loc in FISH_FOOD_WEB:
            c.execute("""
                INSERT OR REPLACE INTO food_web_chains (predator, prey, location_type, source_mod)
                VALUES (?,?,?,'fish_mod')
            """, (pred, prey, loc))
            state["food_web"].append({"predator": pred, "prey": prey, "location": loc})

        # Add bird-of-prey creatures
        bird_predators = [
            ("MutantHeron",  "water_edge", "any",    "Stalks water edges, strikes fish with beak"),
            ("MutantOsprey", "coastal",    "any",    "Dives from height onto fish near surface"),
            ("MutantKingfisher","creek",   "any",    "Small, fast, extremely aggressive near water"),
        ]
        for spec, loc, season, notes in bird_predators:
            c.execute("""
                INSERT OR REPLACE INTO mod_creature_additions
                (species, location_type, season, source_mod, behavior_notes)
                VALUES (?,?,?,'fish_mod',?)
            """, (spec, loc, season, notes))
            state["creature_additions"].append({
                "species": spec, "location": loc, "notes": notes
            })

        state["global_flags"]["fish_present"]    = True
        state["global_flags"]["aquatic_web"]     = True
        state["papyrus_globals"]["AAI_gFishPresent"]  = 1.0
        state["papyrus_globals"]["AAI_gAquaticWeb"]   = 1.0

    # ── LIVING OCEAN / CORAL ─────────────────────────────────────────────────
    if mults.get("living_ocean_active"):
        state["adaptations"].append({
            "system": "Living Ocean",
            "change": "Coral reefs, tidal patterns, bioluminescence active",
            "detail": "Coral reefs shelter fish → attracts sharks, eels, large predators. "
                      "Tidal patterns: coastal areas flood/recede twice per game-day. "
                      "Bioluminescence at night: beautiful but reveals position underwater. "
                      "Coastal Mirelurk territories expand with reef complexity. "
                      "Storm surge more dramatic — more water volume in system.",
        })

        for pred, prey, loc in CORAL_FOOD_WEB:
            c.execute("""
                INSERT OR REPLACE INTO food_web_chains (predator, prey, location_type, source_mod)
                VALUES (?,?,?,'living_ocean')
            """, (pred, prey, loc))
            state["food_web"].append({"predator": pred, "prey": prey, "location": loc})

        state["global_flags"]["living_ocean"]    = True
        state["global_flags"]["tidal_active"]    = True
        state["global_flags"]["bioluminescence"] = True
        state["papyrus_globals"]["AAI_gLivingOcean"]  = 1.0
        state["papyrus_globals"]["AAI_gTidalActive"]  = 1.0

    # ── WEATHER OVERHAUL ─────────────────────────────────────────────────────
    storm_mult = mults.get("storm_intensity", 1.0)
    if storm_mult > 1.0:
        state["adaptations"].append({
            "system": "Weather",
            "change": f"Storm intensity ×{storm_mult:.1f} — weather overhaul detected",
            "detail": "Stronger storms mean stronger creature surges during storms. "
                      "Radiation storm intensity multiplied. "
                      "Thunder masks distant gunfire — confusion in detection. "
                      "Lightning briefly illuminates everything — stealth breaks temporarily.",
        })
        state["papyrus_globals"]["AAI_gStormMult"] = storm_mult

    # ── DARKNESS ─────────────────────────────────────────────────────────────
    dark_mult = mults.get("darkness_level", 1.0)
    if dark_mult > 1.0:
        state["adaptations"].append({
            "system": "Lighting",
            "change": f"Darkness multiplier ×{dark_mult:.1f} — darker nights detected",
            "detail": "Darker nights mean stealth is even more viable. "
                      "Nocturnal creatures gain bigger advantage. "
                      "Pip-Boy light detectable at greater range. "
                      "Settlement guards even more fatigued pre-dawn.",
        })
        state["papyrus_globals"]["AAI_gDarknessMult"] = dark_mult

    # ── ARBITRATION COMPATIBILITY ────────────────────────────────────────────
    if mults.get("arbitration_detected"):
        state["adaptations"].append({
            "system": "Compatibility",
            "change": "Arbitration detected — running in compatibility mode",
            "detail": "Detection range overrides suppressed (Arbitration handles these). "
                      "Our combat style overrides still active. "
                      "Group tactics and creature behavior fully active.",
        })
        state["papyrus_globals"]["AAI_gArbitrationMode"] = 1.0

    # ── SURVIVAL MODE ────────────────────────────────────────────────────────
    if mults.get("survival_mode_active"):
        state["adaptations"].append({
            "system": "Survival",
            "change": "Survival mode — NPC needs and disease active",
            "detail": "Settlers' morale drops faster when food/water is scarce. "
                      "Ghoul radiation aura can spread disease in survival mode. "
                      "Creatures desperate for food venture further into settlements. "
                      "Caravan guards carry extra supplies — more valuable targets.",
        })
        state["papyrus_globals"]["AAI_gSurvivalMode"] = 1.0

    # ── SIM SETTLEMENTS ──────────────────────────────────────────────────────
    if mults.get("sim_settlements_active"):
        state["adaptations"].append({
            "system": "Settlements",
            "change": "Sim Settlements 2 detected — enhanced economy simulation",
            "detail": "Settlement economy simulation reads SS2 resource data. "
                      "NPC schedules align with SS2 job assignments. "
                      "Community events triggered by SS2 building completion. "
                      "Morale directly tied to SS2 happiness ratings.",
        })
        state["papyrus_globals"]["AAI_gSimSettlements"] = 1.0

    conn.commit()
    conn.close()

    # Write JSON for Papyrus to read
    with open(ECOSYSTEM_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, default=str)

    print(f"[Adaptor] Ecosystem state written: {len(state['adaptations'])} adaptations")
    print(f"[Adaptor] Food web chains: {len(state['food_web'])}")
    print(f"[Adaptor] New creature types: {len(state['creature_additions'])}")

    return state

# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_ecosystem_state() -> dict:
    """Get current ecosystem adaptation state."""
    if ECOSYSTEM_FILE.exists():
        try:
            with open(ECOSYSTEM_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return apply_mod_adaptations()

def get_papyrus_globals() -> dict:
    """Get just the Papyrus global variable values to set."""
    state = get_ecosystem_state()
    return state.get("papyrus_globals", {})

def get_active_food_web(location_type: str = "any") -> list:
    """Get active food web chains for a location type."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT * FROM food_web_chains
        WHERE active = 1
        AND (location_type = ? OR location_type = 'any')
        ORDER BY predator
    """, (location_type,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_mod_creature_additions(location_type: str = None, season: str = None) -> list:
    """Get mod-added creatures for a location/season."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    query = "SELECT * FROM mod_creature_additions WHERE active = 1"
    params = []
    if location_type:
        query += " AND (location_type = ? OR location_type = 'any')"
        params.append(location_type)
    if season:
        query += " AND (season = ? OR season = 'any')"
        params.append(season)
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def refresh_adaptations() -> dict:
    """Force a fresh mod scan and ecosystem re-adaptation."""
    from mod_detector import detect_mods
    detect_mods(force_refresh=True)
    return apply_mod_adaptations()
