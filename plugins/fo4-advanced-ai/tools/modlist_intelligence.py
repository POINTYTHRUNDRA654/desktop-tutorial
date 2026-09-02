#!/usr/bin/env python3
"""Modlist intelligence system for Fallout 4 advanced playthroughs.

Subcommands:
  track           Record or update a mod in the local load order database
  list            Print the tracked mod database
  ba2-scan        Report BA2 archive counts and merge recommendations
  dll-scan        Detect F4SE plugin DLL conflicts
  script-pressure Score Papyrus script load risk per mod
  conflict-report Categorize an xEdit conflict report by record type
  crash-log       Summarize an Addictol / Buffout4 crash log

Database is stored as tools/modlist_db.json (gitignored).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


# Resolve DB alongside the script so it works regardless of drive letter.
DB_PATH = Path(__file__).resolve().parent / "modlist_db.json"


# ──────────────────────────────────────────────────────────────────────────────
# Database helpers
# ──────────────────────────────────────────────────────────────────────────────

def load_db() -> dict:
    if DB_PATH.exists():
        try:
            return json.loads(DB_PATH.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    return {"mods": []}


def save_db(db: dict) -> None:
    DB_PATH.write_text(json.dumps(db, indent=2), encoding="utf-8")


def find_mod(db: dict, name: str) -> dict | None:
    for mod in db["mods"]:
        if mod["name"].lower() == name.lower():
            return mod
    return None


# ──────────────────────────────────────────────────────────────────────────────
# 1. track — Record a mod in the load order database
# ──────────────────────────────────────────────────────────────────────────────

def cmd_track(args: argparse.Namespace) -> int:
    """Add or update a mod entry in the local modlist database."""
    db = load_db()
    existing = find_mod(db, args.name)
    entry: dict[str, Any] = existing or {"name": args.name}

    if args.nexus_id is not None:
        entry["nexus_id"] = args.nexus_id
    if args.version:
        entry["version"] = args.version
    if args.install_phase:
        entry["install_phase"] = args.install_phase
    if args.plugins:
        entry["plugins"] = [p.strip() for p in args.plugins.split(",") if p.strip()]
    if args.ba2_count is not None:
        entry["ba2_count"] = args.ba2_count
    if args.has_scripts is not None:
        entry["has_scripts"] = bool(args.has_scripts)
    if args.has_f4se_dll is not None:
        entry["has_f4se_dll"] = bool(args.has_f4se_dll)
    if args.esl_safe is not None:
        entry["esl_safe"] = bool(args.esl_safe)
    if args.merge_safe is not None:
        entry["merge_safe"] = bool(args.merge_safe)
    if args.conflict_risk:
        entry["conflict_risk"] = args.conflict_risk
    if args.patch_notes:
        entry["patch_notes"] = args.patch_notes
    if args.test_status:
        entry["test_status"] = args.test_status

    entry["updated"] = datetime.now().strftime("%Y-%m-%d")

    if existing is None:
        db["mods"].append(entry)
        print(f"[track] Added: {args.name}")
    else:
        print(f"[track] Updated: {args.name}")

    save_db(db)
    return 0


# ──────────────────────────────────────────────────────────────────────────────
# 2. list — Print the mod database
# ──────────────────────────────────────────────────────────────────────────────

def cmd_list(args: argparse.Namespace) -> int:
    """Print tracked mods with optional phase/risk filters."""
    db = load_db()
    mods: list[dict] = db["mods"]

    if not mods:
        print("[list] No mods tracked. Use 'track' to add entries.")
        return 0

    if args.phase:
        mods = [m for m in mods if m.get("install_phase", "").lower() == args.phase.lower()]
    if args.risk:
        mods = [m for m in mods if m.get("conflict_risk", "").lower() == args.risk.lower()]

    header = f"{'Name':<42} {'Phase':<12} {'Risk':<8} {'BA2':>4} {'Scripts':>7} {'Status'}"
    print(f"\n{header}")
    print("-" * len(header))
    for mod in mods:
        name = mod["name"][:41]
        phase = mod.get("install_phase", "-")[:11]
        risk = mod.get("conflict_risk", "-")[:7]
        ba2 = str(mod.get("ba2_count", "-"))[:4]
        scripts = "yes" if mod.get("has_scripts") else "-"
        status = mod.get("test_status", "-")
        print(f"{name:<42} {phase:<12} {risk:<8} {ba2:>4} {scripts:>7} {status}")

    print(f"\nTotal: {len(mods)} mod(s)  |  DB: {DB_PATH}")
    return 0


# ──────────────────────────────────────────────────────────────────────────────
# 3. ba2-scan — BA2 archive limit tracker
# ──────────────────────────────────────────────────────────────────────────────

BA2_WARN = 200
BA2_CRITICAL = 250

# BA2s from official content or previs packs — never unpack these
NEVER_UNPACK_SUBSTRINGS = [
    "fallout4",
    "dlcrobotworkshop",
    "dlccoast",
    "dlcnukaworld",
    "dlcworkshop",
    "dlcshared",
    "ppf",
    "previsibines",
    "previs",
]


def _classify_ba2(stem: str) -> str:
    s = stem.lower()
    if "texture" in s:
        return "textures"
    if "sound" in s or "music" in s or "voice" in s:
        return "sounds"
    if "interface" in s or " ui" in s:
        return "interface"
    return "main"


def cmd_ba2_scan(args: argparse.Namespace) -> int:
    mods_dir = Path(args.mods_dir)
    if not mods_dir.exists():
        print(f"[ba2-scan] Directory not found: {mods_dir}")
        return 1

    total = 0
    per_mod: list[dict] = []

    for mod_dir in sorted(mods_dir.iterdir()):
        if not mod_dir.is_dir():
            continue
        ba2s = list(mod_dir.rglob("*.ba2"))
        if not ba2s:
            continue

        counts: dict[str, int] = {"textures": 0, "sounds": 0, "main": 0, "interface": 0}
        for ba2 in ba2s:
            counts[_classify_ba2(ba2.stem)] += 1

        total += len(ba2s)
        folder_lower = mod_dir.name.lower()
        never = any(s in folder_lower for s in NEVER_UNPACK_SUBSTRINGS)

        per_mod.append({
            "name": mod_dir.name,
            "total": len(ba2s),
            **counts,
            "never_unpack": never,
        })

    per_mod.sort(key=lambda x: x["total"], reverse=True)

    level = (
        "CRITICAL" if total >= BA2_CRITICAL
        else "WARNING" if total >= BA2_WARN
        else "OK"
    )

    print(f"\n=== BA2 Archive Scan ===")
    print(f"Total BA2s : {total}  [{level}]   (warn={BA2_WARN}  critical={BA2_CRITICAL})")
    print()
    print(f"{'Mod':<50} {'Tot':>4} {'Tex':>4} {'Snd':>4} {'Main':>4}  Note")
    print("-" * 90)

    for e in per_mod[:60]:
        note = ""
        if e["never_unpack"]:
            note = "NEVER UNPACK (engine/official)"
        elif e["textures"] >= 1 and e["main"] == 0 and e["sounds"] == 0:
            note = "texture-only — merge candidate (CAO)"
        elif e["sounds"] >= 1 and e["main"] == 0 and e["textures"] == 0:
            note = "sound-only — merge candidate"
        elif e["total"] >= 5:
            note = f"many BA2s ({e['total']}) — review"
        print(
            f"{e['name'][:49]:<50} {e['total']:>4} {e['textures']:>4}"
            f" {e['sounds']:>4} {e['main']:>4}  {note}"
        )

    if len(per_mod) > 60:
        print(f"  ... {len(per_mod) - 60} more mods (all smaller)")

    tex_candidates = [
        e for e in per_mod
        if e["textures"] >= 1 and e["main"] == 0 and not e["never_unpack"]
    ]
    if tex_candidates:
        print(f"\nTexture-only merge candidates ({len(tex_candidates)}):")
        for e in tex_candidates[:20]:
            print(f"  {e['name']} ({e['textures']} texture BA2s)")

    return 0


# ──────────────────────────────────────────────────────────────────────────────
# 4. dll-scan — F4SE DLL conflict scanner
# ──────────────────────────────────────────────────────────────────────────────

# Only one member of each group should be present
DLL_CONFLICT_GROUPS: dict[str, list[str]] = {
    "crash_logger": [
        "buffout4.dll",
        "buffout4ng.dll",
        "crash logger.dll",
        "crashlogger.dll",
        "addictol.dll",
    ],
    "memory_manager": [
        "bakascrapheap.dll",
        "baka_scrapheap.dll",
        "heap_initializer.dll",
        "heapinitializer.dll",
    ],
    "address_library": [
        "addrlib_ng.dll",
        "version.dll",
    ],
}

DEPRECATED_DLLS = ["mfgfix.dll", "bigguns.dll", "loadaccelerator.dll"]

# These require Address Library to be present
ADDR_LIB_DEPS = [
    "buffout4.dll", "buffout4ng.dll", "addictol.dll",
    "crash logger.dll", "crashlogger.dll",
    "bakascrapheap.dll", "baka_scrapheap.dll",
]


def cmd_dll_scan(args: argparse.Namespace) -> int:
    plugins_dir = Path(args.plugins_dir)
    if not plugins_dir.exists():
        print(f"[dll-scan] Directory not found: {plugins_dir}")
        return 1

    dlls = [f for f in plugins_dir.iterdir() if f.suffix.lower() == ".dll"]
    names = {d.name.lower() for d in dlls}

    print(f"\n=== F4SE Plugin DLL Scan ===")
    print(f"Directory : {plugins_dir}")
    print(f"DLLs found: {len(dlls)}\n")

    issues: list[str] = []
    warnings: list[str] = []

    for group, members in DLL_CONFLICT_GROUPS.items():
        present = [m for m in members if m in names]
        if len(present) > 1:
            issues.append(
                f"CONFLICT [{group.replace('_', ' ')}]: {', '.join(present)} — keep only one"
            )
        elif present:
            print(f"  [{group}] active: {present[0]}")

    has_addr_lib = any(a in names for a in DLL_CONFLICT_GROUPS["address_library"])
    missing_addr_deps = [d for d in ADDR_LIB_DEPS if d in names]
    if missing_addr_deps and not has_addr_lib:
        issues.append(
            f"MISSING ADDRESS LIBRARY — required by: {', '.join(missing_addr_deps)}"
        )

    has_buffout = any(b in names for b in ["buffout4.dll", "buffout4ng.dll"])
    has_baka = any(b in names for b in ["bakascrapheap.dll", "baka_scrapheap.dll"])
    if has_buffout and has_baka:
        issues.append(
            "CONFLICT: Buffout4 + Baka ScrapHeap both present — Buffout4 manages its own heap; remove Baka ScrapHeap"
        )

    for dep in DEPRECATED_DLLS:
        if dep in names:
            warnings.append(f"DEPRECATED: {dep} — check for a modern replacement")

    print(f"\nAll installed DLLs ({len(dlls)}):")
    for dll in sorted(dlls, key=lambda d: d.name.lower()):
        print(f"  {dll.name}")

    print()
    if issues:
        print("ISSUES:")
        for issue in issues:
            print(f"  [!] {issue}")
    else:
        print("  No critical DLL conflicts detected.")

    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print(f"  [~] {w}")

    return 0


# ──────────────────────────────────────────────────────────────────────────────
# 5. script-pressure — Papyrus script load scanner
# ──────────────────────────────────────────────────────────────────────────────

HIGH_FREQ_PATTERNS = [
    r"RegisterForUpdate\s*\(\s*[0-9]*\.?[0-9]+\s*\)",
    r"RegisterForUpdateGameTime\s*\(",
    r"OnUpdate\s*\(\s*\)",
    r"Utility\.Wait\s*\(\s*0\.",
]

WORKSHOP_PATTERNS = [r"WorkshopScript", r"WorkshopParentScript", r"WorkshopObjectScript"]
MCM_PATTERNS = [r"MCM_ConfigBase", r"SKI_ConfigBase", r"MCMScript"]


def _score_psc(psc_path: Path) -> dict:
    try:
        text = psc_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return {}
    return {
        "high_freq": any(re.search(p, text, re.IGNORECASE) for p in HIGH_FREQ_PATTERNS),
        "workshop": any(re.search(p, text, re.IGNORECASE) for p in WORKSHOP_PATTERNS),
        "mcm": any(re.search(p, text, re.IGNORECASE) for p in MCM_PATTERNS),
        "on_update": "OnUpdate" in text,
    }


def cmd_script_pressure(args: argparse.Namespace) -> int:
    mods_dir = Path(args.mods_dir)
    if not mods_dir.exists():
        print(f"[script-pressure] Directory not found: {mods_dir}")
        return 1

    results: list[dict] = []

    for mod_dir in sorted(mods_dir.iterdir()):
        if not mod_dir.is_dir():
            continue
        pex = list(mod_dir.rglob("*.pex"))
        psc = list(mod_dir.rglob("*.psc"))
        if not pex and not psc:
            continue

        workshop = on_update = high_freq = mcm = 0
        for f in psc:
            m = _score_psc(f)
            workshop += int(bool(m.get("workshop")))
            on_update += int(bool(m.get("on_update")))
            high_freq += int(bool(m.get("high_freq")))
            mcm += int(bool(m.get("mcm")))

        score = len(pex) + high_freq * 10 + workshop * 8 + on_update * 3 + mcm * 2
        risk = "HIGH" if score >= 30 else ("MEDIUM" if score >= 15 else "LOW")

        results.append({
            "name": mod_dir.name,
            "pex": len(pex),
            "psc": len(psc),
            "on_update": on_update,
            "workshop": workshop,
            "high_freq": high_freq,
            "mcm": mcm,
            "score": score,
            "risk": risk,
        })

    results.sort(key=lambda x: x["score"], reverse=True)

    print(f"\n=== Papyrus Script Pressure Scan ===")
    print(
        f"{'Mod':<46} {'pex':>4} {'psc':>4} {'OnUpd':>5} {'WrkSh':>5} {'HiFreq':>6}  Risk"
    )
    print("-" * 85)

    for r in results[:60]:
        print(
            f"{r['name'][:45]:<46} {r['pex']:>4} {r['psc']:>4}"
            f" {r['on_update']:>5} {r['workshop']:>5} {r['high_freq']:>6}  {r['risk']}"
        )

    if len(results) > 60:
        print(f"  ... {len(results) - 60} more mods with scripts")

    high = [r for r in results if r["risk"] == "HIGH"]
    if high:
        print(f"\nHIGH RISK ({len(high)}):")
        for r in high:
            print(
                f"  {r['name']} — score={r['score']}"
                f" (pex={r['pex']}, workshop={r['workshop']}, high_freq={r['high_freq']})"
            )

    return 0


# ──────────────────────────────────────────────────────────────────────────────
# 6. conflict-report — xEdit conflict report categorizer
# ──────────────────────────────────────────────────────────────────────────────

CONFLICT_CATEGORIES: dict[str, list[str]] = {
    "leveled_list":  ["LVLI", "LVLN", "LVSP"],
    "worldspace":    ["WRLD", "CELL", "LAND"],
    "placed_ref":    ["REFR", "ACHR"],
    "navmesh":       ["NAVM", "NAVI"],
    "quest":         ["QUST"],
    "dialogue":      ["DIAL", "INFO"],
    "npc":           ["NPC_"],
    "faction":       ["FACT"],
    "keyword":       ["KYWD"],
    "workshop":      ["WRKF", "FLST"],
    "previs":        ["PREC", "PVIS"],
    "script_scene":  ["SCEN"],
}

CONFLICT_RECOMMENDATIONS: dict[str, str] = {
    "leveled_list":  "Merge with Wrye Bash LeveledListPatcher or zEdit patcher",
    "worldspace":    "Review in xEdit; overlapping cells need a manual patch",
    "placed_ref":    "Usually safe if different cells; check navmesh adjacency",
    "navmesh":       "HIGH PRIORITY — navmesh conflicts cause CTDs; patch carefully in xEdit",
    "quest":         "Check for overlapping stages and aliases",
    "dialogue":      "Low risk if topics don't share FormIDs; patch if records overlap",
    "npc":           "Common; patch appearance separately with EasyNPC",
    "faction":       "Usually low risk; verify rank definitions",
    "keyword":       "Safe if appending keywords rather than replacing",
    "workshop":      "HIGH PRIORITY — workshop conflicts break settlement system",
    "previs":        "HIGH PRIORITY — kills FPS; run PRP or regenerate previs after patching",
    "script_scene":  "Check for duplicate scene/script properties",
}


def _categorize_line(line: str) -> str | None:
    upper = line.upper()
    for cat, sigs in CONFLICT_CATEGORIES.items():
        if any(sig in upper for sig in sigs):
            return cat
    return None


def cmd_conflict_report(args: argparse.Namespace) -> int:
    report_path = Path(args.report_file)
    if not report_path.exists():
        print(f"[conflict-report] File not found: {report_path}")
        return 1

    try:
        lines = report_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError as exc:
        print(f"[conflict-report] Cannot read file: {exc}")
        return 1

    counts: dict[str, int] = {cat: 0 for cat in CONFLICT_CATEGORIES}
    counts["other"] = 0
    plugin_cats: dict[str, set] = {}

    for line in lines:
        cat = _categorize_line(line) or "other"
        counts[cat] += 1
        for plugin in re.findall(r"\[([^\]]+\.es[plm])\]", line, re.IGNORECASE):
            plugin_cats.setdefault(plugin, set()).add(cat)

    total = sum(counts.values())
    print(f"\n=== xEdit Conflict Report ===")
    print(f"File  : {report_path.name}")
    print(f"Lines : {len(lines)}   categorized: {total}\n")

    print(f"{'Category':<16} {'Count':>6}  Recommendation")
    print("-" * 80)
    for cat, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):
        if count == 0:
            continue
        rec = CONFLICT_RECOMMENDATIONS.get(cat, "Review manually")
        print(f"{cat:<16} {count:>6}  {rec}")

    if plugin_cats:
        top = sorted(plugin_cats.items(), key=lambda x: len(x[1]), reverse=True)[:15]
        print(f"\nPlugins with most conflict categories:")
        for plugin, cats in top:
            print(f"  {plugin}: {', '.join(sorted(cats))}")

    return 0


# ──────────────────────────────────────────────────────────────────────────────
# 7. crash-log — Addictol / Buffout4 crash log interpreter
# ──────────────────────────────────────────────────────────────────────────────

CRASH_PATTERNS: list[tuple[str, str]] = [
    (r"tbb\.dll",                   "Threading (TBB) crash — possible Papyrus stack overflow"),
    (r"usvfs",                      "MO2 virtual filesystem crash — check MO2 version or plugin count"),
    (r"F4SE\.dll",                  "F4SE internal crash — verify F4SE version matches game runtime"),
    (r"hkbStateMachineNode",        "Animation graph crash — animation manager mod conflict likely"),
    (r"BSNavmesh|NavmeshTriangle",  "Navmesh crash — unpatched navmesh conflict in a worldspace cell"),
    (r"BSResource.*SB[0-9]",        "Archive (BA2) crash — possibly a corrupt BA2 file"),
    (r"Papyrus.*Stack|StackOverflow","Papyrus stack overflow — script loop or overloaded queue"),
    (r"BGSDefaultObject",           "Default object crash — a required master plugin is missing"),
    (r"NiNode|NiAVObject|NiTriShape","NIF/mesh crash — broken mesh or LOD in a mod"),
    (r"BGSLocation",                "Location data crash — workshop or settlement system conflict"),
    (r"REFR|ActorCause",            "Reference/actor crash — NPC data conflict or deleted reference"),
    (r"bhkRigidBody|hkpWorld",      "Havok physics crash — broken collision or physics mod conflict"),
    (r"WorkshopScript|WorkshopNPC", "Workshop script crash — SS2 or settlement mod conflict"),
    (r"BSWin32TaskScheduler",       "Windows task scheduler crash — possible timer-heavy script mod"),
    (r"XAudio2|FAudio",             "Audio crash — sound BA2 corruption or audio driver issue"),
]


def cmd_crash_log(args: argparse.Namespace) -> int:
    log_path = Path(args.log_file)
    if not log_path.exists():
        print(f"[crash-log] File not found: {log_path}")
        return 1

    try:
        text = log_path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(f"[crash-log] Cannot read file: {exc}")
        return 1

    lines = text.splitlines()
    print(f"\n=== Crash Log Summary ===")
    print(f"File : {log_path.name}")
    print(f"Size : {log_path.stat().st_size // 1024} KB  /  {len(lines)} lines\n")

    m = re.search(r"Unhandled native exception.*?0x([0-9A-Fa-f]+)", text)
    if m:
        print(f"Crash address : 0x{m.group(1)}")

    m = re.search(r"Exception type:\s*(.+)", text)
    if m:
        print(f"Exception     : {m.group(1).strip()}")

    stack_start = text.find("PROBABLE CALL STACK:")
    if stack_start == -1:
        stack_start = text.find("CALL STACK:")
    if stack_start != -1:
        stack_lines = text[stack_start:stack_start + 1600].splitlines()[1:16]
        print(f"\nTop call stack frames:")
        for line in stack_lines:
            if line.strip():
                print(f"  {line}")

    print(f"\nDiagnosis:")
    findings = [expl for pat, expl in CRASH_PATTERNS if re.search(pat, text, re.IGNORECASE)]
    if findings:
        for finding in findings:
            print(f"  [!] {finding}")
    else:
        print("  No known crash pattern matched — manual analysis required.")

    plugin_start = text.find("PLUGINS:")
    if plugin_start != -1:
        plugins = re.findall(r"\[\s*[0-9A-Fa-f]+\]\s+(.+)", text[plugin_start:plugin_start + 5000])
        print(f"\nLoaded plugins at crash time: {len(plugins)}")
        show = plugins if len(plugins) <= 30 else plugins[:15]
        for p in show:
            print(f"  {p.strip()}")
        if len(plugins) > 30:
            print(f"  ... {len(plugins) - 15} more")

    m = re.search(r"Physical Memory.*?(\d+\.\d+)\s*GB\s*/\s*(\d+\.\d+)\s*GB", text)
    if m:
        used, total = float(m.group(1)), float(m.group(2))
        print(f"\nMemory at crash: {used:.1f} GB used / {total:.1f} GB total")
        if total > 0 and used / total > 0.85:
            print("  [!] Memory usage was critical — possible OOM condition")

    return 0


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="modlist_intelligence",
        description="Modlist intelligence system for Fallout 4 advanced playthroughs.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # track
    tp = sub.add_parser("track", help="Record or update a mod in the load order database")
    tp.add_argument("name", help="Mod name")
    tp.add_argument("--nexus-id", dest="nexus_id", type=int)
    tp.add_argument("--version")
    tp.add_argument("--install-phase", dest="install_phase",
                    help="e.g. core, environment, gameplay, late")
    tp.add_argument("--plugins", help="Comma-separated plugin names (.esp/.esm/.esl)")
    tp.add_argument("--ba2-count", dest="ba2_count", type=int)
    tp.add_argument("--has-scripts", dest="has_scripts", type=int, choices=[0, 1])
    tp.add_argument("--has-f4se-dll", dest="has_f4se_dll", type=int, choices=[0, 1])
    tp.add_argument("--esl-safe", dest="esl_safe", type=int, choices=[0, 1])
    tp.add_argument("--merge-safe", dest="merge_safe", type=int, choices=[0, 1])
    tp.add_argument("--conflict-risk", dest="conflict_risk",
                    choices=["none", "low", "medium", "high"])
    tp.add_argument("--patch-notes", dest="patch_notes")
    tp.add_argument("--test-status", dest="test_status",
                    choices=["untested", "passing", "issues", "failing"])

    # list
    lp = sub.add_parser("list", help="Print the tracked mod database")
    lp.add_argument("--phase", help="Filter by install phase")
    lp.add_argument("--risk", help="Filter by conflict risk")

    # ba2-scan
    bp = sub.add_parser("ba2-scan", help="Scan MO2 mods dir for BA2 counts and recommendations")
    bp.add_argument("mods_dir", help="Path to MO2 mods directory")

    # dll-scan
    dp = sub.add_parser("dll-scan", help="Detect F4SE plugin DLL conflicts")
    dp.add_argument("plugins_dir", help="Path to Data/F4SE/Plugins")

    # script-pressure
    sp = sub.add_parser("script-pressure", help="Score Papyrus script load risk per mod")
    sp.add_argument("mods_dir", help="Path to MO2 mods directory")

    # conflict-report
    cp = sub.add_parser("conflict-report", help="Categorize an xEdit conflict report")
    cp.add_argument("report_file", help="Path to xEdit conflict report text file")

    # crash-log
    clp = sub.add_parser("crash-log", help="Summarize an Addictol / Buffout4 crash log")
    clp.add_argument("log_file", help="Path to crash log file")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    dispatch = {
        "track":           cmd_track,
        "list":            cmd_list,
        "ba2-scan":        cmd_ba2_scan,
        "dll-scan":        cmd_dll_scan,
        "script-pressure": cmd_script_pressure,
        "conflict-report": cmd_conflict_report,
        "crash-log":       cmd_crash_log,
    }

    handler = dispatch.get(args.command)
    if handler:
        return handler(args)
    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
