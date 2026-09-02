"""
performance_optimizer.py
Fallout 4 Advanced AI — Performance Optimizer Bridge Module
============================================================

The bridge-side performance brain. Monitors the game's actual performance,
detects drops, and adjusts settings in real time to keep FPS stable.

What it does:
  - Monitors Papyrus log for performance state reports
  - Detects when scripts are running too frequently (stress mode)
  - Writes optimized settings to Fallout4Custom.ini
  - Calculates ideal shadow caster count for this PC
  - Detects PRP installation (previs repair pack)
  - Detects lighting mods and adjusts shadow budget accordingly
  - Provides performance report for Mossy's Performance panel
  - Benchmarks the system on first run to establish baseline
  - Writes GlobalVariable values for Papyrus to read (via JSON file)

THE SHADOW CASTER STRATEGY
===========================
iShadowCasterCount in Fallout4.ini controls how many lights cast dynamic shadows.
Default is 4. Lighting mods can push this to 32+, destroying FPS.

Our approach:
  1. Detect PC GPU tier (VRAM, from system info)
  2. Detect how many lighting mods are active
  3. Calculate a safe iShadowCasterCount for this specific PC+modlist
  4. Write it to Fallout4Custom.ini (doesn't touch user's main INI)
  5. Monitor for performance drops and reduce if needed
  6. Never set it higher than what the PC can handle

GPU TIERS (estimated from VRAM — rough guide):
  < 4GB VRAM:   iShadowCasterCount = 2-3 (severe budget)
  4-6GB VRAM:   iShadowCasterCount = 4-6 (conservative)
  6-8GB VRAM:   iShadowCasterCount = 6-10 (moderate)
  8-12GB VRAM:  iShadowCasterCount = 10-16 (generous)
  12GB+ VRAM:   iShadowCasterCount = 16-24 (enthusiast)

PRP INTEGRATION
===============
PRP (Previs Repair Pack) rebuilds precombine/previs data that mods invalidate.
When PRP is detected, we know the game is running cleaner previs.
We can then:
  - Slightly increase shadow caster budget (better base performance)
  - Enable more lighting features
  - Reduce LOD aggressiveness
"""

import os
import re
import json
import sqlite3
import datetime
import platform
import subprocess
from pathlib import Path
from typing import Optional

DOCUMENTS       = Path.home() / "Documents" / "My Games" / "Fallout4"
MEMORY_DB_PATH  = DOCUMENTS / "AdvancedAI_Memory.db"
CUSTOM_INI_PATH = DOCUMENTS / "Fallout4Custom.ini"
PERF_STATE_FILE = DOCUMENTS / "AdvancedAI_PerfState.json"
SETTINGS_FILE   = DOCUMENTS / "AdvancedAI_Settings.json"

# ─────────────────────────────────────────────────────────────────────────────
# Performance Schema
# ─────────────────────────────────────────────────────────────────────────────

PERF_SCHEMA = """
CREATE TABLE IF NOT EXISTS performance_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    mode            INTEGER,         -- 0=idle 1=normal 2=combat 3=stress
    scan_count      INTEGER,
    tick_count      INTEGER,
    stress_flag     INTEGER,
    active_lights   INTEGER,
    real_time       TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ini_settings_applied (
    key             TEXT PRIMARY KEY,
    value           TEXT,
    reason          TEXT,
    applied_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gpu_profile (
    key             TEXT PRIMARY KEY,
    value           TEXT
);
"""

def init_perf_schema():
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.executescript(PERF_SCHEMA)
    conn.commit()
    conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# System Detection
# ─────────────────────────────────────────────────────────────────────────────

def detect_gpu_vram() -> int:
    """Attempt to detect GPU VRAM in MB. Returns 4096 as safe default."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["wmic", "path", "win32_VideoController", "get", "AdapterRAM"],
                capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.splitlines():
                line = line.strip()
                if line.isdigit() and int(line) > 100000000:
                    return int(line) // (1024 * 1024)  # Convert bytes to MB
    except Exception:
        pass
    return 4096  # Safe default: assume 4GB

def detect_cpu_cores() -> int:
    """Get available CPU cores."""
    try:
        return os.cpu_count() or 4
    except Exception:
        return 4

def get_system_profile() -> dict:
    """Get a complete system performance profile."""
    vram_mb   = detect_gpu_vram()
    cpu_cores = detect_cpu_cores()

    # GPU tier based on VRAM
    if vram_mb < 4096:
        gpu_tier = "low"
        tier_name = "Low (<4GB VRAM)"
    elif vram_mb < 6144:
        gpu_tier = "medium"
        tier_name = "Medium (4-6GB VRAM)"
    elif vram_mb < 8192:
        gpu_tier = "high"
        tier_name = "High (6-8GB VRAM)"
    elif vram_mb < 12288:
        gpu_tier = "ultra"
        tier_name = "Ultra (8-12GB VRAM)"
    else:
        gpu_tier = "extreme"
        tier_name = "Extreme (12GB+ VRAM)"

    return {
        "vram_mb":    vram_mb,
        "gpu_tier":   gpu_tier,
        "tier_name":  tier_name,
        "cpu_cores":  cpu_cores,
        "detected_at": datetime.datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Shadow Caster Budget Calculator
# ─────────────────────────────────────────────────────────────────────────────

# Base shadow caster counts by GPU tier
SHADOW_CASTER_BASE = {
    "low":     3,
    "medium":  5,
    "high":    8,
    "ultra":   12,
    "extreme": 18,
}

# Reductions for lighting mod load
LIGHTING_MOD_PENALTY = {
    # Each lighting mod type reduces budget:
    "interior_lighting":  -1,   # Interior lighting overhauls add many lights
    "exterior_lighting":  -1,
    "heavy_lighting_mod": -2,   # Very dense light mods
    "enb_active":         -2,   # ENB uses its own shadow system — reduce ours
}

def calculate_shadow_budget(gpu_tier: str, lighting_mods: list,
                              prp_active: bool = False,
                              stress_active: bool = False) -> dict:
    """Calculate the optimal iShadowCasterCount for this system."""
    base = SHADOW_CASTER_BASE.get(gpu_tier, 4)

    # PRP bonus: cleaner previs = better base performance
    prp_bonus = 2 if prp_active else 0

    # Lighting mod penalties
    mod_penalty = 0
    for mod in lighting_mods:
        mod_lower = mod.lower()
        if any(kw in mod_lower for kw in ["interior lighting", "interior light", "illum", "lux"]):
            mod_penalty += abs(LIGHTING_MOD_PENALTY["interior_lighting"])
        elif any(kw in mod_lower for kw in ["enb", "reshade"]):
            mod_penalty += abs(LIGHTING_MOD_PENALTY["enb_active"])
        elif any(kw in mod_lower for kw in ["lighting", "light", "glow", "illuminat"]):
            mod_penalty += abs(LIGHTING_MOD_PENALTY["exterior_lighting"])

    # Stress penalty
    stress_penalty = 2 if stress_active else 0

    final = max(2, base + prp_bonus - mod_penalty - stress_penalty)
    final = min(final, 24)  # Hard cap

    return {
        "gpu_tier":      gpu_tier,
        "base":          base,
        "prp_bonus":     prp_bonus,
        "mod_penalty":   mod_penalty,
        "stress_penalty": stress_penalty,
        "recommended":   final,
        "min_safe":      max(2, final - 2),
        "max_safe":      min(24, final + 2),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Fallout4Custom.ini Writer
# ─────────────────────────────────────────────────────────────────────────────

PERFORMANCE_INI_SECTIONS = {
    "[Display]": [
        # Shadow quality settings
        ("iShadowCasterCount",     None,   "Set by AAI based on GPU + mod load"),
        ("fShadowDistance",        None,   "Shadow draw distance — reduce for FPS"),
        ("iShadowMapResolution",   None,   "Shadow map resolution — reduce for FPS"),
    ],
    "[Papyrus]": [
        # Script performance
        ("fUpdateBudgetMS",       "1.2",   "Script update budget — 1.2ms is safe"),
        ("fExtraTaskletBudgetMS", "1.2",   "Extra script budget"),
        ("iMaxAllocatedMemoryBytes", "524288000", "512MB Papyrus memory — helps stability"),
        ("bEnableLogging",        None,    "Set by user — debug logging"),
        ("bEnableTrace",          "0",     "Trace logging OFF for performance"),
        ("bLoadDebugInformation", "0",     "Debug info OFF for performance"),
    ],
    "[General]": [
        ("iNumHWThreads",          None,  "Let game detect CPU threads — don't override"),
        ("bPreemptivelyUnloadCells","1",  "Unload unused cells — helps memory"),
    ],
    "[HAVOK]": [
        ("iMaxDesiredDeadObjectsPerFrame","5","Limit physics object cleanup per frame"),
        ("fMaxTimeComplexity",    "0.016", "Physics time step limit"),
    ],
}

def write_performance_ini(shadow_caster_count: int,
                           shadow_distance: int = 3000,
                           shadow_resolution: int = 2048,
                           custom_settings: dict = None) -> dict:
    """
    Write optimized settings to Fallout4Custom.ini.
    Only writes to Custom INI — never touches Fallout4.ini.
    """
    import configparser

    config = configparser.ConfigParser()
    config.optionxform = str  # Preserve case

    # Read existing Custom INI if present
    if CUSTOM_INI_PATH.exists():
        try:
            config.read(CUSTOM_INI_PATH, encoding="utf-8")
        except Exception:
            pass

    changes_made = []

    # Ensure sections exist
    for section in ["Display", "Papyrus", "General", "HAVOK"]:
        if not config.has_section(section):
            config.add_section(section)

    # Shadow caster count (THE most important setting)
    old_shadow = config.get("Display", "iShadowCasterCount", fallback="4")
    config.set("Display", "iShadowCasterCount", str(shadow_caster_count))
    if old_shadow != str(shadow_caster_count):
        changes_made.append(f"iShadowCasterCount: {old_shadow} → {shadow_caster_count}")

    # Shadow distance
    config.set("Display", "fShadowDistance", str(shadow_distance))

    # Shadow map resolution
    config.set("Display", "iShadowMapResolution", str(shadow_resolution))

    # Papyrus budget
    config.set("Papyrus", "fUpdateBudgetMS", "1.2")
    config.set("Papyrus", "fExtraTaskletBudgetMS", "1.2")
    config.set("Papyrus", "iMaxAllocatedMemoryBytes", "524288000")
    config.set("Papyrus", "bEnableTrace", "0")
    config.set("Papyrus", "bLoadDebugInformation", "0")

    # Cell preloading
    config.set("General", "bPreemptivelyUnloadCells", "1")

    # Apply any custom overrides
    if custom_settings:
        for section, kvs in custom_settings.items():
            if not config.has_section(section):
                config.add_section(section)
            for key, val in kvs.items():
                config.set(section, key, str(val))

    # Write
    with open(CUSTOM_INI_PATH, "w", encoding="utf-8") as f:
        config.write(f)

    # Log to DB
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    for change in changes_made:
        c.execute("""
            INSERT OR REPLACE INTO ini_settings_applied (key, value, reason)
            VALUES (?,?,?)
        """, (change, str(shadow_caster_count), "AAI Performance Optimizer"))
    conn.commit()
    conn.close()

    print(f"[Perf] Fallout4Custom.ini updated: {len(changes_made)} changes")
    for change in changes_made:
        print(f"[Perf]   {change}")

    return {
        "ini_path":          str(CUSTOM_INI_PATH),
        "shadow_casters":    shadow_caster_count,
        "shadow_distance":   shadow_distance,
        "shadow_resolution": shadow_resolution,
        "changes":           changes_made,
        "applied_at":        datetime.datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Full Optimization Run
# ─────────────────────────────────────────────────────────────────────────────

def run_optimization(mod_profile: dict = None, stress_active: bool = False) -> dict:
    """
    Run the full performance optimization pass.
    Called on startup and when stress is detected.
    """
    print("[Perf] Running performance optimization...")

    # 1. Get system profile
    sys_profile = get_system_profile()
    print(f"[Perf] GPU tier: {sys_profile['tier_name']} ({sys_profile['vram_mb']}MB VRAM)")

    # 2. Detect PRP
    prp_active = _detect_prp()
    print(f"[Perf] PRP (Previs Repair Pack): {'Detected ✓' if prp_active else 'Not found'}")

    # 3. Get lighting mods
    lighting_mods = []
    if mod_profile:
        lighting_mods = mod_profile.get("categories", {}).get("lighting", [])
    print(f"[Perf] Lighting mods: {len(lighting_mods)}")

    # 4. Calculate shadow budget
    shadow_budget = calculate_shadow_budget(
        sys_profile["gpu_tier"], lighting_mods, prp_active, stress_active
    )
    print(f"[Perf] Shadow caster budget: {shadow_budget['recommended']} "
          f"(base={shadow_budget['base']}, "
          f"prp_bonus=+{shadow_budget['prp_bonus']}, "
          f"mod_penalty=-{shadow_budget['mod_penalty']})")

    # 5. Calculate shadow distance based on GPU
    shadow_dist = {
        "low": 2000, "medium": 3000, "high": 4000,
        "ultra": 5000, "extreme": 7000
    }.get(sys_profile["gpu_tier"], 3000)

    # 6. Calculate shadow resolution
    shadow_res = {
        "low": 1024, "medium": 2048, "high": 2048,
        "ultra": 4096, "extreme": 4096
    }.get(sys_profile["gpu_tier"], 2048)

    # Reduce resolution if stress
    if stress_active:
        shadow_res = max(1024, shadow_res // 2)
        shadow_dist = max(2000, shadow_dist - 1000)

    # 7. Write INI
    ini_result = write_performance_ini(
        shadow_budget["recommended"],
        shadow_dist,
        shadow_res
    )

    # 8. Write settings for Papyrus to read
    settings = {
        "shadow_budget":     shadow_budget["recommended"],
        "shadow_radius":     float(min(shadow_dist * 0.15, 512)),  # LOD radius
        "light_budget":      shadow_budget["recommended"] * 6,     # Total light budget
        "update_freq_normal": 0.15,
        "update_freq_idle":   0.5,
        "update_freq_combat": 0.08,
        "update_freq_stress": 0.5,
        "min_interval_ms":    150,
        "prp_detected":       prp_active,
        "gpu_tier":           sys_profile["gpu_tier"],
        "optimized_at":       datetime.datetime.now().isoformat(),
    }

    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=2)

    result = {
        "system": sys_profile,
        "shadow_budget": shadow_budget,
        "ini": ini_result,
        "settings": settings,
        "prp_active": prp_active,
        "lighting_mods": lighting_mods,
        "recommendations": _generate_recommendations(
            sys_profile, shadow_budget, prp_active, lighting_mods
        ),
    }

    print(f"[Perf] Optimization complete. Settings written.")
    return result

def _detect_prp() -> bool:
    """Detect if PRP (Previs Repair Pack) is installed."""
    from mod_detector import detect_mods
    try:
        profile = detect_mods()
        mods = [m["name"].lower() for m in profile.get("detected_mods", [])]
        return any(
            "prp" in m or "previs repair" in m or "previsibines" in m
            for m in mods
        )
    except Exception:
        pass

    # Also check Data folder directly
    data_paths = [
        Path("C:/Program Files (x86)/Steam/steamapps/common/Fallout 4/Data"),
        Path("D:/SteamLibrary/steamapps/common/Fallout 4/Data"),
    ]
    for data_path in data_paths:
        if data_path.exists():
            prp_files = list(data_path.glob("PRP*.esp")) + list(data_path.glob("PRP*.esm"))
            if prp_files:
                return True
    return False

def _generate_recommendations(sys_profile: dict, shadow_budget: dict,
                                prp_active: bool, lighting_mods: list) -> list:
    """Generate human-readable performance recommendations for Mossy."""
    recs = []

    if not prp_active:
        recs.append({
            "priority": "HIGH",
            "title": "Install PRP (Previs Repair Pack)",
            "detail": "PRP rebuilds precombines that mods have invalidated. "
                      "It's the single biggest FPS improvement you can make. "
                      "Nexus: https://www.nexusmods.com/fallout4/mods/46403",
            "impact": "+10-30 FPS in dense areas",
        })

    if len(lighting_mods) >= 3:
        recs.append({
            "priority": "MEDIUM",
            "title": f"Lighting mod load is high ({len(lighting_mods)} mods)",
            "detail": f"Your {len(lighting_mods)} lighting mods compete for "
                      f"the shadow caster budget. AAI has reduced iShadowCasterCount "
                      f"to {shadow_budget['recommended']} to compensate. "
                      f"Consider consolidating to 1-2 lighting mods.",
            "impact": "Shadow caster budget already adjusted",
        })

    if sys_profile["gpu_tier"] == "low":
        recs.append({
            "priority": "HIGH",
            "title": "Low VRAM detected — conservative settings applied",
            "detail": "With less than 4GB VRAM, we've applied conservative shadow settings. "
                      "Disable God Rays (bVolumetricLightingEnabled=0) for additional FPS. "
                      "Consider Boston FPS Fix on Nexus.",
            "impact": "Stability over quality",
        })

    recs.append({
        "priority": "INFO",
        "title": "Shadow caster count set to " + str(shadow_budget["recommended"]),
        "detail": f"iShadowCasterCount={shadow_budget['recommended']} written to "
                  f"Fallout4Custom.ini. This is optimized for your GPU tier ({sys_profile['tier_name']}) "
                  f"and mod load. Vanilla default is 4.",
        "impact": f"Balanced between quality and performance",
    })

    if prp_active:
        recs.append({
            "priority": "INFO",
            "title": "PRP detected — +2 shadow caster bonus applied",
            "detail": "PRP's clean previs data means the renderer wastes less work. "
                      "We've applied a +2 shadow caster bonus as a result.",
            "impact": "Better quality lighting than without PRP",
        })

    return recs

# ─────────────────────────────────────────────────────────────────────────────
# Log Parser
# ─────────────────────────────────────────────────────────────────────────────

PERF_STATE_PAT = re.compile(
    r'PERF_STATE\|mode=(\d+)\|interval=([\d.]+)\|scan_count=(\d+)\|'
    r'ticks=(\d+)\|stress=(\d+)\|lights=(\d+)'
)

_consecutive_stress = 0

def parse_perf_log_line(content: str) -> Optional[dict]:
    """Parse performance state log lines and trigger optimization if needed."""
    global _consecutive_stress

    m = PERF_STATE_PAT.search(content)
    if not m:
        return None

    mode       = int(m.group(1))
    scan_count = int(m.group(3))
    stress     = int(m.group(5))
    lights     = int(m.group(6))

    # Track stress
    if mode == 3 or stress > 0:
        _consecutive_stress += 1
    else:
        _consecutive_stress = max(0, _consecutive_stress - 1)

    # If stressed for 5+ consecutive ticks, run optimization
    if _consecutive_stress >= 5:
        print(f"[Perf] Stress detected for {_consecutive_stress} ticks — re-optimizing...")
        try:
            run_optimization(stress_active=True)
        except Exception as e:
            print(f"[Perf] Optimization error: {e}")
        _consecutive_stress = 0

    # Log to DB
    conn = sqlite3.connect(MEMORY_DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO performance_log (mode, scan_count, stress_flag, active_lights)
        VALUES (?,?,?,?)
    """, (mode, scan_count, stress, lights))
    conn.commit()
    conn.close()

    return {
        "type":       "perf_state",
        "mode":       ["idle", "normal", "combat", "stress"][mode] if mode < 4 else "unknown",
        "scan_count": scan_count,
        "stress":     bool(stress),
        "lights":     lights,
        "consecutive_stress": _consecutive_stress,
    }

def get_performance_report() -> dict:
    """Full performance status report for Mossy's Performance panel."""
    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Recent mode distribution (last 100 ticks)
    c.execute("""
        SELECT mode, COUNT(*) as count FROM performance_log
        ORDER BY id DESC LIMIT 100
        GROUP BY mode
    """)
    mode_dist = {r["mode"]: r["count"] for r in c.fetchall()}

    # Average light count
    c.execute("SELECT AVG(active_lights) as avg FROM performance_log ORDER BY id DESC LIMIT 50")
    avg_lights = (c.fetchone() or {}).get("avg", 0) or 0

    conn.close()

    sys_profile = get_system_profile()
    shadow_budget = calculate_shadow_budget(sys_profile["gpu_tier"], [], _detect_prp())

    # Read current INI shadow count
    current_shadow_count = _read_current_shadow_count()

    return {
        "system_profile":      sys_profile,
        "prp_detected":        _detect_prp(),
        "current_shadow_casters": current_shadow_count,
        "recommended_casters": shadow_budget["recommended"],
        "avg_active_lights":   round(avg_lights, 0),
        "mode_distribution":   mode_dist,
        "consecutive_stress":  _consecutive_stress,
        "ini_path":            str(CUSTOM_INI_PATH),
        "settings_file":       str(SETTINGS_FILE),
        "generated_at":        datetime.datetime.now().isoformat(),
    }

def _read_current_shadow_count() -> int:
    """Read the current iShadowCasterCount from Custom INI."""
    import configparser
    config = configparser.ConfigParser()
    config.optionxform = str
    if CUSTOM_INI_PATH.exists():
        try:
            config.read(CUSTOM_INI_PATH, encoding="utf-8")
            return int(config.get("Display", "iShadowCasterCount", fallback="4"))
        except Exception:
            pass
    return 4
