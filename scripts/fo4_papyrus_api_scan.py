#!/usr/bin/env python3
"""
fo4_papyrus_api_scan.py — Fallout 4 Papyrus Native API Reference Builder
=========================================================================
Parses Bethesda's actual shipped Papyrus source declarations
(Data/Scripts/Source/Base/*.psc) to build a REAL function-signature
reference — not a hardcoded shortlist of "common" function names, but every
function/event/property this game's script objects actually declare.

This is real (not fabricated) because these .psc files ARE the authoritative
declaration of every native function's name, parameters, and return type —
Bethesda ships them specifically so modders can see the API surface. The
function BODY for `native` functions is compiled/hidden, but the signature
(what you call and what it returns) is exactly what a modder needs to write
correct scripts, and what's in these files verbatim.

Output: one JSON with every parsed script (full data), plus a curated
"core_api" subset — the foundational script objects most other scripts
extend or interact with (Actor, ObjectReference, Quest, Game, Utility, etc.)
— formatted as a compact, complete reference block for AI-prompt injection.
"""

import argparse, json, os, re, time
from pathlib import Path

FO4_DATA = Path(os.environ.get("MOSSY_FO4_DATA") or r"E:\Steam\steamapps\common\Fallout 4\Data")
SCRIPTS_BASE = FO4_DATA / "Scripts" / "Source" / "Base"
_OUT_DIR = Path(os.environ.get("MOSSY_SCAN_OUTPUT_DIR") or r"H:\Mossy Memory")
DEFAULT_OUT = _OUT_DIR / "fo4_papyrus_api.json"

# The foundational script objects most other scripts extend or call into —
# curated for the compact AI-facing reference. Everything else still gets
# parsed and saved in the full JSON, just not included in the compact block.
CORE_API_OBJECTS = {
    "Actor", "ObjectReference", "Form", "Quest", "Game", "Utility", "Debug",
    "Cell", "Location", "LocationRefType", "Faction", "Perk", "Keyword",
    "Weapon", "Armor", "MagicEffect", "Spell", "Potion", "Ingredient",
    "Container", "Door", "Furniture", "Message", "MiscObject", "Book",
    "Note", "Terminal", "GlobalVariable", "ActorValue", "EncounterZone",
    "WorldSpace", "Race", "ScriptObject", "Alias", "ReferenceAlias",
    "LocationAlias", "Package", "Idle", "Sound", "SoundDescriptor",
    "ObjectMod", "Ammo", "Explosion", "Projectile", "TextureSet", "Static",
    "Activator", "Light", "Scene", "Topic", "TopicInfo", "Enchantment",
    "ColorForm", "ConstructibleObject", "Workshop", "WorkshopScript",
    "PerkFragment", "QuestFragment", "SceneFragment", "TerminalMenu",
}

FUNC_RE = re.compile(
    r'^\s*(?P<rtype>bool|int|float|string|actor|objectreference|form|quest|'
    r'cell|location|faction|perk|keyword|weapon|armor|magiceffect|spell|'
    r'potion|ingredient|container|door|furniture|message|miscobject|book|'
    r'note|terminal|globalvariable|actorvalue|encounterzone|worldspace|'
    r'race|alias|referencealias|locationalias|package|idle|sound|'
    r'sounddescriptor|objectmod|ammo|explosion|projectile|textureset|'
    r'static|activator|light|scene|topic|topicinfo|enchantment|colorform|'
    r'constructibleobject|workshop|var|'
    r'[a-z_][\w]*(?:\[\])?)?\s*function\s+(?P<name>\w+)\s*\((?P<params>[^)]*)\)\s*'
    r'(?P<mods>[a-z\s]*)$',
    re.IGNORECASE
)
EVENT_RE = re.compile(r'^\s*event\s+(?:(?P<obj>\w+)\.)?(?P<name>\w+)\s*\((?P<params>[^)]*)\)', re.IGNORECASE)
PROP_RE = re.compile(r'^\s*(?P<type>\w+)\s+property\s+(?P<name>\w+)', re.IGNORECASE)
# Most scripts extend a parent (e.g. "Scriptname Actor extends ObjectReference"),
# but foundational static-function libraries like Debug/Utility/Game declare no
# parent at all ("Scriptname Debug Native DebugOnly Hidden") — both forms are real.
SCRIPTNAME_RE = re.compile(r'^\s*scriptname\s+(?P<name>\w+)(?:\s+extends\s+(?P<parent>\w+))?', re.IGNORECASE)


def parse_psc(path: Path) -> dict | None:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None

    lines = text.split("\n")
    header = None
    functions = []
    events = []
    properties = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith(";"):
            continue

        if header is None:
            m = SCRIPTNAME_RE.match(stripped)
            if m:
                header = {"name": m.group("name"), "extends": m.group("parent")}
            continue

        m = EVENT_RE.match(stripped)
        if m:
            events.append({"name": m.group("name"), "params": m.group("params").strip()})
            continue

        m = FUNC_RE.match(stripped)
        if m and "endfunction" not in stripped.lower():
            functions.append({
                "returns": (m.group("rtype") or "").strip() or "None",
                "name": m.group("name"),
                "params": m.group("params").strip(),
                "native": "native" in (m.group("mods") or "").lower(),
            })
            continue

        m = PROP_RE.match(stripped)
        if m:
            properties.append({"type": m.group("type"), "name": m.group("name")})

    if header is None:
        return None

    return {
        "scriptName": header["name"],
        "extends": header["extends"],
        "functions": functions,
        "events": events,
        "properties": properties,
    }


def build_core_api_block(scripts: dict[str, dict]) -> str:
    lines = [
        "REAL FALLOUT 4 PAPYRUS NATIVE API — parsed verbatim from Bethesda's shipped",
        "Scripts/Source/Base/*.psc declarations (not a remembered/guessed function list).",
        "Format: ReturnType FunctionName(params) [native]",
        "",
    ]
    for obj_name in sorted(CORE_API_OBJECTS):
        script = scripts.get(obj_name)
        if not script:
            continue
        parent_label = f"extends {script['extends']}" if script["extends"] else "(no parent — static function library)"
        lines.append(f"─── {obj_name} {parent_label} ───")
        for fn in script["functions"]:
            native_tag = " native" if fn["native"] else ""
            lines.append(f"  {fn['returns']} {fn['name']}({fn['params']}){native_tag}")
        for ev in script["events"]:
            lines.append(f"  Event {ev['name']}({ev['params']})")
        lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Build a real Papyrus native API reference from shipped .psc declarations")
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    if not SCRIPTS_BASE.exists():
        print(f"ERROR: {SCRIPTS_BASE} not found — is Fallout 4 installed with script source?")
        return

    files = sorted(SCRIPTS_BASE.glob("*.psc"))
    print(f"Parsing {len(files)} native Papyrus scripts from {SCRIPTS_BASE}...")

    scripts: dict[str, dict] = {}
    total_functions = 0
    total_events = 0
    for fp in files:
        parsed = parse_psc(fp)
        if parsed:
            scripts[parsed["scriptName"]] = parsed
            total_functions += len(parsed["functions"])
            total_events += len(parsed["events"])

    core_present = sorted(k for k in CORE_API_OBJECTS if k in scripts)
    core_missing = sorted(k for k in CORE_API_OBJECTS if k not in scripts)
    core_api_block = build_core_api_block(scripts)

    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": f"{SCRIPTS_BASE}",
        "total_scripts_parsed": len(scripts),
        "total_functions": total_functions,
        "total_events": total_events,
        "core_api_objects_found": core_present,
        "core_api_objects_missing": core_missing,
        "core_api_block": core_api_block,
        "scripts": scripts,
    }
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Done in {elapsed:.1f}s ===")
    print(f"Scripts parsed: {len(scripts)}")
    print(f"Total functions: {total_functions}")
    print(f"Total events: {total_events}")
    print(f"Core API objects found: {len(core_present)}/{len(CORE_API_OBJECTS)}")
    if core_missing:
        print(f"Core API objects NOT found (may not exist in this game version): {core_missing}")
    print(f"Saved: {out_path}")
    print(f"JSON size: {out_path.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
