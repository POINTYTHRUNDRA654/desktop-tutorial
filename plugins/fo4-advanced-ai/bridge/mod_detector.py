"""
mod_detector.py
Fallout 4 Advanced AI — Mod Load Order Detector
=================================================

Reads the player's Fallout 4 mod list and categorizes every installed mod
so the world simulation can adapt intelligently.

Detection sources (in priority order):
  1. Mod Organizer 2 active profile modlist.txt
  2. Vortex deployment manifest
  3. %LOCALAPPDATA%\\Fallout4\\plugins.txt  (vanilla/Vortex)
  4. Data folder ESP/ESM scan
  5. F4SE plugin folder scan

Categories detected:
  - vegetation    (foliage, plants, trees, overgrowth)
  - creature      (new creatures, creature overhauls)
  - weather       (weather overhauls, True Storms, etc.)
  - water         (water overhauls, living ocean, aquatic)
  - fish          (fish mods specifically — drives aquatic food web)
  - jungle        (jungle/tropical biome conversions)
  - settlement    (settlement overhauls — affects economy sim)
  - combat        (combat overhauls — may conflict or stack with ours)
  - ai_overhaul   (other AI mods — detect to avoid conflicts)
  - lighting      (ENB/lighting — affects darkness stealth calcs)
  - survival      (survival mode changes — affects NPC needs)

Output: mod_profile.json with detected mods, categories, and world multipliers.
"""

import os
import re
import json
import configparser
import datetime
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────

APPDATA_LOCAL   = Path(os.path.expandvars("%LOCALAPPDATA%"))
DOCUMENTS       = Path(os.path.expandvars("%USERPROFILE%")) / "Documents"
FO4_LOCAL       = APPDATA_LOCAL / "Fallout4"
FO4_DOCUMENTS   = DOCUMENTS / "My Games" / "Fallout4"
FO4_DATA        = Path("C:/Program Files (x86)/Steam/steamapps/common/Fallout 4/Data")

MOD_PROFILE_PATH = FO4_DOCUMENTS / "AdvancedAI_ModProfile.json"

# MO2 default locations
MO2_PATHS = [
    Path(os.path.expandvars("%LOCALAPPDATA%")) / "ModOrganizer" / "Fallout 4",
    Path("C:/MO2") / "Fallout4",
    Path("C:/ModOrganizer2") / "Fallout4",
    Path("D:/MO2") / "Fallout4",
    Path("D:/ModOrganizer2") / "Fallout4",
    DOCUMENTS / "ModOrganizer" / "Fallout 4",
]

# ─────────────────────────────────────────────────────────────────────────────
# Known Mod Database
# Maps mod names / keywords to categories and world effects
# ─────────────────────────────────────────────────────────────────────────────

KNOWN_MODS = {
    # ── VEGETATION / FLORA ────────────────────────────────────────────────────
    "LifeFindsAWay":              {"category": ["vegetation", "creature"], "tags": ["fish", "aquatic_life", "bird_life"]},
    "Life Finds a Way":           {"category": ["vegetation", "creature"], "tags": ["fish", "aquatic_life", "bird_life"]},
    "LFAW":                       {"category": ["vegetation", "creature"], "tags": ["fish", "aquatic_life"]},
    "Overgrowth":                 {"category": ["vegetation"],             "tags": ["dense_foliage", "jungle_zones"]},
    "AtomicFlora":                {"category": ["vegetation"],             "tags": ["mutated_plants"]},
    "Atomic Flora":               {"category": ["vegetation"],             "tags": ["mutated_plants"]},
    "Enhanced Vegetation":        {"category": ["vegetation"],             "tags": ["dense_foliage"]},
    "Lush Commonwealth":          {"category": ["vegetation"],             "tags": ["dense_foliage", "grass"]},
    "Fallout 4 Seasons":          {"category": ["vegetation", "weather"],  "tags": ["seasonal_foliage"]},
    "Commonwealth Woodland":      {"category": ["vegetation"],             "tags": ["dense_foliage", "trees"]},
    "Verdant Trees":              {"category": ["vegetation"],             "tags": ["trees"]},
    "Mutated Ferns":              {"category": ["vegetation"],             "tags": ["mutated_plants"]},
    "Tropical Commonwealth":      {"category": ["vegetation", "jungle"],   "tags": ["jungle_zones", "tropical"]},
    "Far Harbor - Jungle":        {"category": ["vegetation", "jungle"],   "tags": ["fh_jungle"]},
    "Glowing Sea Jungle":         {"category": ["vegetation", "jungle"],   "tags": ["gs_jungle", "tropical"]},
    "Glowing Sea - Mutated Jungle": {"category":["vegetation","jungle"],   "tags": ["gs_jungle", "tropical"]},
    "Green Commonwealth":         {"category": ["vegetation"],             "tags": ["dense_foliage"]},
    "Flora Overhaul":             {"category": ["vegetation"],             "tags": ["mutated_plants"]},

    # ── WATER / AQUATIC ────────────────────────────────────────────────────────
    "Living Ocean":               {"category": ["water", "fish"],          "tags": ["coral", "ocean_life", "fish", "tidal"]},
    "Aquatic Commonwealth":       {"category": ["water", "fish"],          "tags": ["fish", "aquatic_life"]},
    "Real Water":                 {"category": ["water"],                  "tags": ["water_physics"]},
    "True Water":                 {"category": ["water"],                  "tags": ["water_physics"]},
    "Visible Water":              {"category": ["water"],                  "tags": ["water_clarity"]},
    "Underwater Commonwealth":    {"category": ["water", "fish"],          "tags": ["fish", "aquatic_life", "coral"]},
    "Marine Life":                {"category": ["water", "fish"],          "tags": ["fish", "ocean_life"]},
    "Underwater Creatures":       {"category": ["water", "fish"],          "tags": ["fish", "aquatic_life"]},
    "Coral Reef Overhaul":        {"category": ["water"],                  "tags": ["coral", "ocean_life"]},
    "Aquatica":                   {"category": ["water", "fish"],          "tags": ["fish", "aquatic_life", "coral"]},

    # ── CREATURE OVERHAULS ─────────────────────────────────────────────────────
    "Mutant Menagerie":           {"category": ["creature"],               "tags": ["new_creatures", "regional_variants"]},
    "Creatures and Monsters":     {"category": ["creature"],               "tags": ["new_creatures"]},
    "Wild Wasteland":             {"category": ["creature"],               "tags": ["new_creatures", "random_encounters"]},
    "Diverse Deathclaws":         {"category": ["creature"],               "tags": ["variant_creatures"]},
    "Raider Overhaul":            {"category": ["creature"],               "tags": ["humanoid_variants"]},
    "Swarms and Threats":         {"category": ["creature"],               "tags": ["swarm_behavior", "new_creatures"]},
    "Expansion Pack Animals":     {"category": ["creature"],               "tags": ["new_creatures"]},
    "Lively Commonwealth":        {"category": ["creature"],               "tags": ["ambient_life"]},
    "Spawning Overhaul":          {"category": ["creature"],               "tags": ["spawn_density"]},
    "SKK Combat Stalkers":        {"category": ["creature", "ai_overhaul"],"tags": ["aggression"]},

    # ── WEATHER ────────────────────────────────────────────────────────────────
    "True Storms":                {"category": ["weather"],                "tags": ["storm_intensity", "lightning", "fog"]},
    "Vivid Weathers":             {"category": ["weather"],                "tags": ["weather_variety", "storms"]},
    "NAC Weather":                {"category": ["weather"],                "tags": ["weather_variety"]},
    "NAC":                        {"category": ["weather"],                "tags": ["weather_variety"]},
    "Fallout 4 Weather":          {"category": ["weather"],                "tags": ["weather_variety"]},
    "Darker Nights":              {"category": ["lighting", "weather"],    "tags": ["darkness"]},
    "Realistic Night":            {"category": ["lighting"],               "tags": ["darkness"]},
    "Fog of War":                 {"category": ["weather"],                "tags": ["fog_density"]},
    "Toxic Raider":               {"category": ["weather"],                "tags": ["acid_rain"]},

    # ── LIGHTING / ENB ─────────────────────────────────────────────────────────
    "Natural Lighting":           {"category": ["lighting"],               "tags": ["realistic_light"]},
    "ENB":                        {"category": ["lighting"],               "tags": ["visual_overhaul"]},
    "Reshade":                    {"category": ["lighting"],               "tags": ["visual_overhaul"]},
    "Enhanced Lights":            {"category": ["lighting"],               "tags": ["interior_light"]},
    "Ultra Interior Lighting":    {"category": ["lighting"],               "tags": ["interior_light"]},

    # ── AI OVERHAULS ───────────────────────────────────────────────────────────
    "Arbitration":                {"category": ["ai_overhaul", "combat"],  "tags": ["detection_tweak", "combat_rebalance"]},
    "Better NPC Combat":          {"category": ["ai_overhaul"],            "tags": ["npc_combat"]},
    "VAFS":                       {"category": ["combat"],                 "tags": ["vats_overhaul"]},
    "Bullet Time":                {"category": ["combat"],                 "tags": ["slow_motion"]},

    # ── SETTLEMENT ─────────────────────────────────────────────────────────────
    "Sim Settlements 2":          {"category": ["settlement"],             "tags": ["npc_economy", "building_ai"]},
    "Sim Settlements":            {"category": ["settlement"],             "tags": ["npc_economy"]},
    "Better Settlers":            {"category": ["settlement"],             "tags": ["settler_variety"]},
    "Immersive Settlers":         {"category": ["settlement"],             "tags": ["settler_schedules"]},
    "Conquest":                   {"category": ["settlement"],             "tags": ["new_settlements"]},

    # ── SURVIVAL ───────────────────────────────────────────────────────────────
    "Survival Mode":              {"category": ["survival"],               "tags": ["hunger", "thirst", "disease"]},
    "Food and Water Needs":       {"category": ["survival"],               "tags": ["hunger", "thirst"]},
    "Diseases":                   {"category": ["survival"],               "tags": ["disease"]},
    "Realistic Needs":            {"category": ["survival"],               "tags": ["hunger", "thirst"]},
}

# ── Keyword-based detection (for mods not in known list) ─────────────────────
CATEGORY_KEYWORDS = {
    "vegetation": ["flora", "plant", "tree", "grass", "foliage", "leaf", "fern",
                   "vegetation", "overgrowth", "jungle", "forest", "botanical",
                   "green", "tropical", "vine", "mushroom", "fungus"],
    "fish":       ["fish", "aquatic life", "marine", "coral", "underwater creature",
                   "ocean life", "river life", "finfish", "shark", "eel"],
    "water":      ["water", "ocean", "river", "lake", "wave", "tide", "aqua",
                   "sea", "swim", "flood", "wetland", "marsh", "swamp"],
    "jungle":     ["jungle", "tropical", "rainforest", "canopy", "overgrowth",
                   "mutated jungle", "glowing jungle", "wild growth"],
    "creature":   ["creature", "monster", "beast", "animal", "spawn", "wildlife",
                   "menagerie", "fauna", "critter", "mutant"],
    "weather":    ["weather", "storm", "rain", "fog", "climate", "atmosphere",
                   "cloud", "thunder", "lightning", "precipitation"],
    "lighting":   ["light", "dark", "night", "ENB", "ambient", "illuminat",
                   "glow", "luminance", "reshade", "visual"],
    "settlement": ["settler", "settlement", "workshop", "town", "village",
                   "community", "sim settlements"],
    "survival":   ["survival", "hunger", "thirst", "food", "water need",
                   "disease", "realistic need", "hardcore"],
    "ai_overhaul":["AI", "combat AI", "detection", "tactics", "behavior",
                   "enemy AI", "NPC combat"],
}

# ─────────────────────────────────────────────────────────────────────────────
# Mod Profile Output Structure
# ─────────────────────────────────────────────────────────────────────────────

def create_empty_profile() -> dict:
    return {
        "generated_at":         datetime.datetime.now().isoformat(),
        "detection_source":     [],
        "total_mods":           0,
        "detected_mods":        [],
        "categories": {
            "vegetation":   [],
            "fish":         [],
            "water":        [],
            "jungle":       [],
            "creature":     [],
            "weather":      [],
            "lighting":     [],
            "settlement":   [],
            "survival":     [],
            "ai_overhaul":  [],
            "combat":       [],
        },
        "tags": set(),
        "world_multipliers": {
            # Environment
            "rain_frequency":        1.0,   # > 1 = more rain
            "fog_density":           1.0,
            "humidity":              1.0,
            "storm_intensity":       1.0,
            "darkness_level":        1.0,

            # Vegetation / Cover
            "vegetation_coverage":   0.0,   # 0-1 scale (0 = vanilla, 1 = max jungle)
            "sound_absorption":      1.0,   # > 1 = more sound absorbed by plants
            "stealth_bonus_foliage": 0.0,   # Added stealth % from cover
            "detection_reduction":   0.0,   # % reduction in NPC sight radius

            # Creature / Ecosystem
            "creature_diversity":    1.0,
            "fish_present":          False,
            "aquatic_food_web":      False,
            "coral_present":         False,
            "gs_jungle_active":      False,  # Glowing Sea is now jungle
            "fh_jungle_active":      False,  # Far Harbor jungle variant
            "living_ocean_active":   False,

            # Water
            "water_clarity":         1.0,
            "tidal_patterns":        False,
            "bioluminescence":       False,

            # AI / Combat
            "arbitration_detected":  False,
            "sim_settlements_active":False,
            "survival_mode_active":  False,
        },
    }

# ─────────────────────────────────────────────────────────────────────────────
# Detection Functions
# ─────────────────────────────────────────────────────────────────────────────

def find_mo2_path() -> Optional[Path]:
    """Find the active MO2 installation for Fallout 4."""
    for path in MO2_PATHS:
        if path.exists() and (path / "profiles").exists():
            return path
    # Also check registry or INI if needed
    return None

def read_mo2_active_profile(mo2_path: Path) -> Optional[str]:
    """Read the currently active MO2 profile name."""
    ini_path = mo2_path / "ModOrganizer.ini"
    if not ini_path.exists():
        return None
    try:
        config = configparser.ConfigParser()
        config.read(ini_path)
        return config.get("General", "selected_profile", fallback=None)
    except Exception:
        return None

def read_mo2_modlist(mo2_path: Path, profile: str) -> list[str]:
    """Read enabled mods from MO2 profile modlist.txt."""
    modlist_path = mo2_path / "profiles" / profile / "modlist.txt"
    if not modlist_path.exists():
        return []
    mods = []
    try:
        with open(modlist_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("+"):  # + = enabled
                    mods.append(line[1:].strip())
    except Exception:
        pass
    return mods

def read_plugins_txt() -> list[str]:
    """Read active plugins from the vanilla Fallout4/plugins.txt."""
    plugins_path = FO4_LOCAL / "plugins.txt"
    if not plugins_path.exists():
        return []
    plugins = []
    try:
        with open(plugins_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("*"):
                    plugins.append(line[1:].strip())
                elif not line.startswith("#") and line:
                    plugins.append(line)
    except Exception:
        pass
    return plugins

def scan_data_folder() -> list[str]:
    """Scan the Fallout 4 Data folder for ESP/ESM/ESL files."""
    found = []
    # Try common FO4 install paths
    data_paths = [
        FO4_DATA,
        Path("D:/SteamLibrary/steamapps/common/Fallout 4/Data"),
        Path("E:/SteamLibrary/steamapps/common/Fallout 4/Data"),
        Path("D:/Games/Fallout 4/Data"),
        Path("C:/Games/Fallout 4/Data"),
        Path("D:/Fallout 4/Data"),
    ]
    for data_path in data_paths:
        if data_path.exists():
            for ext in ["*.esp", "*.esm", "*.esl"]:
                for f in data_path.glob(ext):
                    found.append(f.stem)
            break  # Found it, stop searching
    return found

def read_vortex_manifest() -> list[str]:
    """Try to read Vortex's deployed mod list."""
    vortex_paths = [
        APPDATA_LOCAL / "Vortex" / "fallout4" / "manifest.json",
        DOCUMENTS / "Vortex" / "fallout4" / "manifest.json",
    ]
    mods = []
    for path in vortex_paths:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict) and "mods" in data:
                    for mod_id, mod_data in data["mods"].items():
                        name = mod_data.get("name") or mod_data.get("id") or mod_id
                        mods.append(str(name))
            except Exception:
                pass
    return mods

# ─────────────────────────────────────────────────────────────────────────────
# Categorization
# ─────────────────────────────────────────────────────────────────────────────

def categorize_mod(mod_name: str) -> dict:
    """
    Determine category and tags for a mod by name.
    Returns {"category": [...], "tags": [...], "matched_name": str}
    """
    # Exact match against known mods
    for known_name, data in KNOWN_MODS.items():
        if known_name.lower() in mod_name.lower() or mod_name.lower() in known_name.lower():
            return {
                "name":         mod_name,
                "category":     data["category"],
                "tags":         data.get("tags", []),
                "matched_name": known_name,
                "confidence":   "exact",
            }

    # Keyword detection
    mod_lower = mod_name.lower()
    matched_categories = []
    matched_tags = []

    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in mod_lower:
                if category not in matched_categories:
                    matched_categories.append(category)
                matched_tags.append(kw)
                break

    if matched_categories:
        return {
            "name":         mod_name,
            "category":     matched_categories,
            "tags":         matched_tags,
            "matched_name": mod_name,
            "confidence":   "keyword",
        }

    return {
        "name":         mod_name,
        "category":     ["unknown"],
        "tags":         [],
        "matched_name": mod_name,
        "confidence":   "none",
    }

# ─────────────────────────────────────────────────────────────────────────────
# World Multiplier Calculation
# ─────────────────────────────────────────────────────────────────────────────

def calculate_world_multipliers(profile: dict) -> dict:
    """
    Derive world adjustment multipliers from the detected mod categories and tags.
    These feed into every system: weather, water, creatures, stealth, etc.
    """
    tags = profile["tags"]
    cats = profile["categories"]
    mults = profile["world_multipliers"]

    veg_count = len(cats["vegetation"])
    fish_mods = len(cats["fish"])
    water_mods = len(cats["water"])
    creature_mods = len(cats["creature"])
    weather_mods = len(cats["weather"])
    lighting_mods = len(cats["lighting"])

    # ── VEGETATION → RAIN / HUMIDITY / COVER ─────────────────────────────────
    # Each vegetation mod increases rainfall probability, humidity, and cover
    # Real ecology: more plants → more transpiration → more rain → more plants
    if veg_count >= 1:
        mults["vegetation_coverage"]   = min(veg_count * 0.25, 1.0)
        mults["rain_frequency"]        = 1.0 + (veg_count * 0.15)   # +15% per veg mod
        mults["humidity"]              = 1.0 + (veg_count * 0.10)
        mults["sound_absorption"]      = 1.0 + (veg_count * 0.12)   # Plants absorb sound
        mults["stealth_bonus_foliage"] = min(veg_count * 0.08, 0.40)  # Up to +40% stealth
        mults["detection_reduction"]   = min(veg_count * 0.06, 0.35)  # Up to -35% NPC sight

    # ── JUNGLE SPECIFIC ───────────────────────────────────────────────────────
    if "gs_jungle" in tags:
        mults["gs_jungle_active"]      = True
        mults["rain_frequency"]        = max(mults["rain_frequency"], 2.0)
        mults["humidity"]              = max(mults["humidity"], 1.8)
        mults["vegetation_coverage"]   = 1.0
        mults["sound_absorption"]      = max(mults["sound_absorption"], 1.6)
        mults["detection_reduction"]   = max(mults["detection_reduction"], 0.45)
        mults["fog_density"]           = max(mults["fog_density"], 1.4)  # Humidity = more fog

    if "fh_jungle" in tags:
        mults["fh_jungle_active"]      = True
        mults["humidity"]              = max(mults["humidity"], 1.5)
        mults["fog_density"]           = max(mults["fog_density"], 1.6)  # Already foggy + jungle

    # ── FISH / AQUATIC FOOD WEB ───────────────────────────────────────────────
    if fish_mods >= 1 or "fish" in tags or "aquatic_life" in tags:
        mults["fish_present"]          = True
        mults["aquatic_food_web"]      = True
        # Fish → aquatic predators have prey → more diverse water ecosystem
        mults["creature_diversity"]    = max(mults["creature_diversity"] + 0.3, 1.3)

    # ── LIVING OCEAN / CORAL ──────────────────────────────────────────────────
    if "coral" in tags or "ocean_life" in tags:
        mults["living_ocean_active"]   = True
        mults["coral_present"]         = True
        mults["tidal_patterns"]        = True
        mults["bioluminescence"]       = True
        mults["water_clarity"]         = 1.3  # Coral needs clear water

    # ── WEATHER OVERHAUL ──────────────────────────────────────────────────────
    if weather_mods >= 1:
        mults["storm_intensity"]       = 1.0 + (weather_mods * 0.2)
        mults["fog_density"]           = max(mults["fog_density"], 1.0 + (weather_mods * 0.15))
        if "lightning" in tags:
            mults["storm_intensity"]   = max(mults["storm_intensity"], 1.6)

    # ── DARKNESS ──────────────────────────────────────────────────────────────
    if lighting_mods >= 1 or "darkness" in tags:
        mults["darkness_level"]        = 1.0 + (lighting_mods * 0.25)

    # ── CREATURE DIVERSITY ────────────────────────────────────────────────────
    if creature_mods >= 1:
        mults["creature_diversity"]    = max(mults["creature_diversity"], 1.0 + (creature_mods * 0.2))

    # ── AI / SETTLEMENT / SURVIVAL ────────────────────────────────────────────
    mults["arbitration_detected"]      = bool(cats.get("ai_overhaul"))
    mults["sim_settlements_active"]    = any("sim" in m.lower() for m in cats.get("settlement", []))
    mults["survival_mode_active"]      = bool(cats.get("survival"))

    return mults

# ─────────────────────────────────────────────────────────────────────────────
# Main Detection Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def detect_mods(force_refresh: bool = False) -> dict:
    """
    Detect all installed Fallout 4 mods and return a complete mod profile.
    Caches result to AdvancedAI_ModProfile.json.
    """
    # Check cache (refresh daily or on demand)
    if not force_refresh and MOD_PROFILE_PATH.exists():
        try:
            with open(MOD_PROFILE_PATH, "r") as f:
                cached = json.load(f)
            age = datetime.datetime.now() - datetime.datetime.fromisoformat(cached["generated_at"])
            if age.total_seconds() < 86400:  # 24 hour cache
                print(f"[ModDetect] Using cached profile ({len(cached['detected_mods'])} mods)")
                return cached
        except Exception:
            pass

    print("[ModDetect] Scanning mod load order...")
    profile = create_empty_profile()
    all_mod_names = []

    # 1. MO2
    mo2_path = find_mo2_path()
    if mo2_path:
        active_profile = read_mo2_active_profile(mo2_path)
        if active_profile:
            mo2_mods = read_mo2_modlist(mo2_path, active_profile)
            all_mod_names.extend(mo2_mods)
            profile["detection_source"].append(f"MO2 ({active_profile}): {len(mo2_mods)} mods")
            print(f"[ModDetect] MO2 profile '{active_profile}': {len(mo2_mods)} mods")

    # 2. Vortex
    vortex_mods = read_vortex_manifest()
    if vortex_mods:
        all_mod_names.extend(vortex_mods)
        profile["detection_source"].append(f"Vortex: {len(vortex_mods)} mods")
        print(f"[ModDetect] Vortex: {len(vortex_mods)} mods")

    # 3. plugins.txt
    plugins = read_plugins_txt()
    if plugins:
        all_mod_names.extend(plugins)
        profile["detection_source"].append(f"plugins.txt: {len(plugins)} plugins")
        print(f"[ModDetect] plugins.txt: {len(plugins)} entries")

    # 4. Data folder scan
    esp_files = scan_data_folder()
    if esp_files:
        all_mod_names.extend(esp_files)
        profile["detection_source"].append(f"Data folder: {len(esp_files)} files")
        print(f"[ModDetect] Data folder: {len(esp_files)} ESP/ESM/ESL files")

    # Deduplicate
    all_mod_names = list(dict.fromkeys(all_mod_names))
    profile["total_mods"] = len(all_mod_names)

    # Categorize each mod
    all_tags = set()
    for mod_name in all_mod_names:
        result = categorize_mod(mod_name)
        profile["detected_mods"].append(result)

        for cat in result["category"]:
            if cat in profile["categories"]:
                profile["categories"][cat].append(mod_name)

        for tag in result["tags"]:
            all_tags.add(tag)

    profile["tags"] = list(all_tags)

    # Calculate world multipliers
    profile["world_multipliers"] = calculate_world_multipliers(profile)

    # Generate human-readable summary
    profile["summary"] = generate_summary(profile)

    # Save
    with open(MOD_PROFILE_PATH, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2, default=str)

    print(f"[ModDetect] Profile saved: {len(all_mod_names)} total mods detected")
    print(f"[ModDetect]   Vegetation: {len(profile['categories']['vegetation'])} mods")
    print(f"[ModDetect]   Fish/Aquatic: {len(profile['categories']['fish'])} mods")
    print(f"[ModDetect]   Creature: {len(profile['categories']['creature'])} mods")
    print(f"[ModDetect]   Weather: {len(profile['categories']['weather'])} mods")
    print(f"[ModDetect]   Water: {len(profile['categories']['water'])} mods")

    return profile

def generate_summary(profile: dict) -> list[str]:
    """Generate human-readable summary of world adaptations."""
    summary = []
    m = profile["world_multipliers"]
    cats = profile["categories"]

    if len(cats["vegetation"]) > 0:
        veg = len(cats["vegetation"])
        summary.append(
            f"{veg} vegetation mod{'s' if veg > 1 else ''} detected — "
            f"rain +{(m['rain_frequency']-1)*100:.0f}%, "
            f"stealth cover +{m['stealth_bonus_foliage']*100:.0f}%, "
            f"NPC detection -{m['detection_reduction']*100:.0f}%"
        )

    if m.get("gs_jungle_active"):
        summary.append(
            "Glowing Sea Jungle active — "
            "tropical creature set, extreme humidity, "
            "double rain frequency, heavy fog, dense cover"
        )

    if m.get("fish_present"):
        summary.append(
            "Fish/aquatic life detected — "
            "full aquatic food web active: "
            "birds of prey hunt fish, Mirelurks have prey to track, "
            "water predators patrol reefs and banks"
        )

    if m.get("living_ocean_active"):
        summary.append(
            "Living Ocean detected — "
            "coral reefs, tidal patterns, "
            "bioluminescence at night, diverse marine ecosystem"
        )

    if m.get("storm_intensity", 1.0) > 1.0:
        summary.append(
            f"Weather overhaul detected — "
            f"storm intensity +{(m['storm_intensity']-1)*100:.0f}%, "
            f"fog density +{(m['fog_density']-1)*100:.0f}%"
        )

    if len(cats["creature"]) > 0:
        summary.append(
            f"{len(cats['creature'])} creature mod{'s' if len(cats['creature'])>1 else ''} — "
            f"ecosystem diversity ×{m['creature_diversity']:.1f}"
        )

    if m.get("arbitration_detected"):
        summary.append(
            "Arbitration AI mod detected — "
            "Advanced AI running in compatibility mode "
            "(some detection overrides suppressed to avoid conflict)"
        )

    if m.get("survival_mode_active"):
        summary.append(
            "Survival mode detected — "
            "NPC hunger/thirst behaviors activated, "
            "disease vectors enabled"
        )

    return summary

# ─────────────────────────────────────────────────────────────────────────────
# Quick Access Helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_mod_profile() -> dict:
    """Get the current mod profile (from cache or fresh detection)."""
    return detect_mods(force_refresh=False)

def get_world_multipliers() -> dict:
    """Get just the world multipliers for quick access."""
    profile = get_mod_profile()
    return profile.get("world_multipliers", {})

def is_mod_active(mod_name: str) -> bool:
    """Check if a specific mod is in the detected list."""
    profile = get_mod_profile()
    return any(
        mod_name.lower() in m["name"].lower() or m["name"].lower() in mod_name.lower()
        for m in profile.get("detected_mods", [])
    )

def get_category_mods(category: str) -> list:
    """Get all detected mods in a category."""
    profile = get_mod_profile()
    return profile.get("categories", {}).get(category, [])
