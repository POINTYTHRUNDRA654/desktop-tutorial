#!/usr/bin/env python3
"""
fo4_strings_scan.py — Fallout 4 Complete World Data Scanner
============================================================
Extracts EVERY named record from Fallout4.esm + all DLC ESMs:
  - Display names (FULL subrecord) with FormIDs
  - Editor IDs (EDID subrecord) — what modders reference in scripts
  - Exterior cell grid coordinates (XCLC) with FormIDs
  - 30+ record types: locations, NPCs, factions, quests, perks, weapons,
    armor, cells, books, keywords, globals, races, worldspaces, spells, etc.

Outputs:
  H:\\Mossy Memory\\fo4_world_strings.json   — Creative Director context
  H:\\Mossy Memory\\fo4_world_strings.json   — also has "indexed" with formIds
  H:\\Mossy Memory\\knowledge-vault.json     — 20+ vault entries Mossy can search

Usage:
  python fo4_strings_scan.py             (base game + DLC, always)
  python fo4_strings_scan.py --no-vault  (skip vault update)
"""

import argparse, json, os, struct, zlib, sys, time, random, string as _string
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

FO4_DATA      = Path(r"E:\Steam\steamapps\common\Fallout 4\Data")
INTERFACE_BA2 = FO4_DATA / "Fallout4 - Interface.ba2"
MAIN_ESM      = FO4_DATA / "Fallout4.esm"
DEFAULT_OUT   = Path(r"H:\Mossy Memory\fo4_world_strings.json")
VAULT_PATH    = Path(r"H:\Mossy Memory\knowledge-vault.json")

DLC_MAINS = [
    FO4_DATA / "DLCRobot.esm",        # Automatron
    FO4_DATA / "DLCCoast.esm",        # Far Harbor
    FO4_DATA / "DLCNukaWorld.esm",    # Nuka-World
    FO4_DATA / "DLCworkshop01.esm",   # Wasteland Workshop
    FO4_DATA / "DLCworkshop02.esm",   # Contraptions Workshop
    FO4_DATA / "DLCworkshop03.esm",   # Vault-Tec Workshop
]
DLC_BA2S = [
    FO4_DATA / "DLCRobot - Main.ba2",
    FO4_DATA / "DLCCoast - Main.ba2",
    FO4_DATA / "DLCNukaWorld - Main.ba2",
    FO4_DATA / "DLCworkshop01 - Main.ba2",
    FO4_DATA / "DLCworkshop02 - Main.ba2",
    FO4_DATA / "DLCworkshop03 - Main.ba2",
]

# Every record type that can carry a meaningful FULL display name
RECORD_CATEGORIES = {
    # World / geography
    "WRLD": "worldspaces",
    "CELL": "cells",
    "LCTN": "locations",
    # Actors
    "NPC_": "npcs",
    "RACE": "races",
    "CLAS": "actor_classes",
    # Social
    "FACT": "factions",
    # Quests & dialogue
    "QUST": "quests",
    "DIAL": "dialogue_topics",
    # Player progression
    "PERK": "perks",
    "SPEL": "spells",
    "MGEF": "magic_effects",
    "ENCH": "enchantments",
    # Combat
    "WEAP": "weapons",
    "AMMO": "ammo",
    "PROJ": "projectiles",
    "HAZD": "hazards",
    "EXPL": "explosions",
    # Armor / clothing
    "ARMO": "armor",
    "ARMA": "armor_addons",
    "OTFT": "outfits",
    # Items
    "ALCH": "chems",
    "BOOK": "books_and_notes",
    "INGR": "ingredients",
    "MISC": "misc_items",
    "KEYW": "keywords",
    "FLOR": "flora",
    "TREE": "trees",
    # Crafting
    "COBJ": "constructibles",
    # Interactables
    "ACTI": "activators",
    "FURN": "furniture",
    "CONT": "containers",
    "DOOR": "doors",
    "TERM": "terminals",
    "LIGH": "lights",
    "MSTT": "moveable_statics",
    "STAT": "statics",
    # Audio / weather
    "SNDR": "sound_descriptors",
    "MUSC": "music_types",
    "WTHR": "weather_types",
    # Weapon/armor modifications (paint jobs, barrel mods, etc.)
    "OMOD": "object_mods",
    # Actor values — what perk entry points actually modify (SPECIAL, skills, resistances)
    "AVIF": "actor_values",
    # Leveled lists (what NPCs/items can randomly spawn)
    "LVLN": "leveled_npcs",
    "LVLI": "leveled_items",
    # Form lists (used for quest aliases, ownership lists, etc.)
    "FLST": "form_lists",
    # Misc records
    "GLOB": "global_variables",
    "GMST": "game_settings",
    "CSTY": "combat_styles",
    "AMDL": "aim_models",
    "REGN": "regions",
    "PACK": "ai_packages",
    "IDLE": "idle_animations",
    "KYWD": "kywd_records",
}

COMPRESSED_FLAG = 0x00040000

# ---------------------------------------------------------------------------
# BA2 reader
# ---------------------------------------------------------------------------

def _ba2_read_names(data: bytes, num_files: int, name_table_offset: int) -> list[str]:
    names = []
    pos = name_table_offset
    for _ in range(num_files):
        if pos + 2 > len(data):
            break
        nlen = struct.unpack_from("<H", data, pos)[0]
        pos += 2
        if pos + nlen > len(data):
            break
        names.append(data[pos:pos + nlen].decode("utf-8", errors="replace"))
        pos += nlen
    return names


def ba2_extract_strings_files(ba2_path: Path) -> dict[str, bytes]:
    if not ba2_path.exists():
        return {}
    data = ba2_path.read_bytes()
    if data[:4] != b"BTDX":
        return {}
    num_files         = struct.unpack_from("<I", data, 12)[0]
    name_table_offset = struct.unpack_from("<Q", data, 16)[0]
    names = _ba2_read_names(data, num_files, name_table_offset)
    ENTRY_SIZE = 36
    result = {}
    for i, name in enumerate(names):
        name_lower = name.replace("\\", "/").lower()
        if not any(name_lower.endswith(ext) for ext in (".strings", ".dlstrings", ".ilstrings")):
            continue
        base = name_lower.split("/")[-1]
        if not (base.endswith("_en.strings") or base.endswith("_en.dlstrings") or base.endswith("_en.ilstrings")):
            continue
        entry_base = 24 + i * ENTRY_SIZE
        if entry_base + ENTRY_SIZE > len(data):
            continue
        offset      = struct.unpack_from("<Q", data, entry_base + 16)[0]
        packed_size = struct.unpack_from("<I", data, entry_base + 24)[0]
        unpacked    = struct.unpack_from("<I", data, entry_base + 28)[0]
        if packed_size == 0:
            file_bytes = data[offset:offset + unpacked]
        else:
            try:
                file_bytes = zlib.decompress(data[offset:offset + packed_size])
            except Exception:
                continue
        result[base] = file_bytes
        print(f"  Extracted: {name} ({len(file_bytes):,} bytes)")
    return result


# ---------------------------------------------------------------------------
# .STRINGS / .DLSTRINGS / .ILSTRINGS parser
# ---------------------------------------------------------------------------

def parse_strings_file(raw: bytes, is_dl_or_il: bool = False) -> dict[int, str]:
    if len(raw) < 8:
        return {}
    count = struct.unpack_from("<I", raw, 0)[0]
    if count > 500_000:
        return {}
    dir_end   = 8 + count * 8
    data_base = dir_end
    result = {}
    for i in range(count):
        entry_pos = 8 + i * 8
        if entry_pos + 8 > len(raw):
            break
        string_id = struct.unpack_from("<I", raw, entry_pos)[0]
        offset    = struct.unpack_from("<I", raw, entry_pos + 4)[0]
        abs_off   = data_base + offset
        if abs_off >= len(raw):
            continue
        if is_dl_or_il:
            if abs_off + 4 > len(raw):
                continue
            slen = struct.unpack_from("<I", raw, abs_off)[0]
            text_bytes = raw[abs_off + 4:abs_off + 4 + slen]
            if text_bytes.endswith(b"\x00"):
                text_bytes = text_bytes[:-1]
        else:
            null_pos = raw.find(b"\x00", abs_off)
            if null_pos == -1:
                null_pos = len(raw)
            text_bytes = raw[abs_off:null_pos]
        try:
            text = text_bytes.decode("utf-8", errors="replace").strip()
        except Exception:
            continue
        if text and string_id:
            result[string_id] = text
    return result


def build_string_lookup(ba2_files: dict[str, bytes]) -> dict[int, str]:
    lookup: dict[int, str] = {}
    for fname, raw in ba2_files.items():
        is_dl_il = fname.endswith(".dlstrings") or fname.endswith(".ilstrings")
        for sid, text in parse_strings_file(raw, is_dl_or_il=is_dl_il).items():
            if not is_dl_il or sid not in lookup:
                lookup[sid] = text
    return lookup


# ---------------------------------------------------------------------------
# ESM parser — captures FULL name, EDID, FormID, and XCLC for cells
# ---------------------------------------------------------------------------

def _decompress_record(rec_data: bytes, flags: int) -> bytes | None:
    if flags & COMPRESSED_FLAG:
        if len(rec_data) < 4:
            return None
        try:
            return zlib.decompress(rec_data[4:])
        except Exception:
            return None
    return rec_data


def _scan_subrecords(rec_data: bytes) -> dict[bytes, bytes]:
    """Return dict of subrecord_type -> subrecord_data for all subrecords."""
    found: dict[bytes, bytes] = {}
    pos = 0
    while pos + 6 <= len(rec_data):
        sub_type = rec_data[pos:pos + 4]
        sub_size = struct.unpack_from("<H", rec_data, pos + 4)[0]
        pos += 6
        if pos + sub_size > len(rec_data):
            break
        found[sub_type] = rec_data[pos:pos + sub_size]
        pos += sub_size
    return found


def _resolve_full(sub_data: bytes, string_lookup: dict[int, str]) -> str | None:
    if len(sub_data) == 4:
        sid = struct.unpack_from("<I", sub_data, 0)[0]
        return string_lookup.get(sid)
    elif len(sub_data) > 1:
        null_pos = sub_data.find(b"\x00")
        raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
        text = raw_b.decode("utf-8", errors="replace").strip()
        return text if text else None
    return None


def _resolve_edid(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("ascii", errors="replace").strip()
        return text if text else None
    except Exception:
        return None


def parse_esm(esm_path: Path, string_lookup: dict[int, str],
              categories: dict[str, str]) -> dict[str, list[dict]]:
    """
    Walk the ESM binary. For each record in categories, extract:
      - form_id  (hex string)
      - name     (FULL display name, if any)
      - edid     (editor ID, if any)
      - x, y     (grid coords for CELL records, if exterior)
    Returns {category: [entry, ...]}.
    """
    results: dict[str, list[dict]] = {cat: [] for cat in set(categories.values())}
    data   = esm_path.read_bytes()
    length = len(data)
    pos    = 0

    if data[:4] != b"TES4":
        print(f"  WARNING: {esm_path.name} doesn't start with TES4")

    while pos + 24 <= length:
        try:
            rec_type = data[pos:pos + 4].decode("ascii", errors="replace")
        except Exception:
            pos += 1
            continue

        if rec_type == "GRUP":
            if pos + 24 > length:
                break
            pos += 24
            continue

        # Record header:  type(4) dataSize(4) flags(4) formID(4) rev(4) ver(2) unk(2)
        data_size = struct.unpack_from("<I", data, pos + 4)[0]
        flags     = struct.unpack_from("<I", data, pos + 8)[0]
        form_id   = struct.unpack_from("<I", data, pos + 12)[0]
        pos += 24

        if pos + data_size > length:
            break

        if rec_type in categories:
            cat      = categories[rec_type]
            raw_data = data[pos:pos + data_size]
            dec_data = _decompress_record(raw_data, flags)

            if dec_data is not None:
                subs = _scan_subrecords(dec_data)

                name = _resolve_full(subs[b"FULL"], string_lookup) if b"FULL" in subs else None
                edid = _resolve_edid(subs[b"EDID"])                if b"EDID" in subs else None

                # For CELL records also capture exterior grid position
                grid_x = grid_y = None
                if rec_type == "CELL" and b"XCLC" in subs:
                    xclc = subs[b"XCLC"]
                    if len(xclc) >= 8:
                        grid_x = struct.unpack_from("<i", xclc, 0)[0]  # signed int32
                        grid_y = struct.unpack_from("<i", xclc, 4)[0]

                # Accept if we have a name OR an edid (or is a cell with grid coords)
                if name or edid or (grid_x is not None):
                    entry: dict = {"form_id": f"0x{form_id:08X}"}
                    if name: entry["name"] = name
                    if edid: entry["edid"] = edid
                    if grid_x is not None:
                        entry["grid_x"] = grid_x
                        entry["grid_y"] = grid_y
                    results[cat].append(entry)

        pos += data_size

    return results


# ---------------------------------------------------------------------------
# Clean / dedupe
# ---------------------------------------------------------------------------

_JUNK = [
    "UNUSED", "unused", "DO NOT USE", "DELETE", "Test ", "test ",
    "RESERVED", "reserved", "zzzz", "ZZZZ", "xxxx", "XXXX",
    " - OLD", " - Copy", "_OLD", "_Copy",
]


def _clean_entries(entries: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out = []
    for e in entries:
        name = e.get("name", "").strip()
        edid = e.get("edid", "").strip()
        key  = name or edid or e.get("form_id", "")
        if not key or key in seen:
            continue
        if name:
            if len(name) > 100 or any(p in name for p in _JUNK):
                continue
            if not any(c.isalpha() for c in name):
                continue
        if edid and any(p in edid for p in _JUNK):
            continue
        seen.add(key)
        clean = {"form_id": e["form_id"]}
        if name: clean["name"] = name
        if edid: clean["edid"] = edid
        if "grid_x" in e:
            clean["grid_x"] = e["grid_x"]
            clean["grid_y"] = e["grid_y"]
        out.append(clean)
    return sorted(out, key=lambda x: x.get("name", x.get("edid", "")))


# ---------------------------------------------------------------------------
# Creative Director context block
# ---------------------------------------------------------------------------

def _build_cd_context(final: dict[str, list[dict]]) -> str:
    lines = [
        "EXISTING FALLOUT 4 GAME CONTENT — verbatim from game binary (Fallout4.esm + DLCs):",
        "DO NOT reuse any name below as a mod location, NPC, or faction.",
        "",
    ]
    priority = [
        ("locations",      "NAMED LOCATIONS & SETTLEMENTS"),
        ("worldspaces",    "WORLDSPACES"),
        ("cells",          "INTERIOR CELLS (named)"),
        ("factions",       "FACTIONS"),
        ("quests",         "QUESTS"),
        ("npcs",           "NAMED NPCS (sample)"),
        ("races",          "RACES"),
        ("perks",          "PERKS"),
        ("weapons",        "WEAPONS (sample)"),
        ("armor",          "ARMOR (sample)"),
        ("chems",          "CHEMS (sample)"),
        ("books_and_notes","BOOKS & NOTES (sample)"),
        ("keywords",       "KEYWORDS (sample)"),
    ]
    for cat, label in priority:
        entries = final.get(cat, [])
        if not entries:
            continue
        names = [e["name"] for e in entries if "name" in e]
        if not names:
            names = [e["edid"] for e in entries if "edid" in e]
        cap = 60 if cat == "npcs" else 150 if cat in ("cells", "locations") else 80
        if len(names) > cap:
            names = names[:cap]
        lines.append(f"{label}:")
        lines.append(", ".join(names))
        lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Knowledge Vault injection
# ---------------------------------------------------------------------------

def _uid() -> str:
    return "".join(random.choices(_string.ascii_lowercase + _string.digits, k=9))


def _vault_entry(title: str, content: str, tags: list[str]) -> dict:
    return {
        "id":               f"fo4-scan-v3-{_uid()}",
        "title":            title,
        "content":          content,
        "source":           "fo4-strings-scan",
        "creditName":       "Mossy Industries Scanner",
        "creditUrl":        "",
        "trustLevel":       "high",
        "tags":             tags,
        "date":             time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status":           "active",
        "shareWithCommunity": False,
    }


def _fmt_table(entries: list[dict], max_rows: int = 2000) -> str:
    lines = []
    for e in entries[:max_rows]:
        name   = e.get("name", "")
        edid   = e.get("edid", "")
        fid    = e["form_id"]
        if name and edid:
            lines.append(f"{name} [{edid}]: {fid}")
        elif name:
            lines.append(f"{name}: {fid}")
        elif edid:
            lines.append(f"[{edid}]: {fid}")
        elif "grid_x" in e:
            lines.append(f"Cell ({e['grid_x']},{e['grid_y']}): {fid}")
    if len(entries) > max_rows:
        lines.append(f"... +{len(entries) - max_rows} more")
    return "\n".join(lines)


def inject_into_vault(final: dict[str, list[dict]], vault_path: Path) -> int:
    existing: list[dict] = []
    if vault_path.exists():
        try:
            existing = json.loads(vault_path.read_text(encoding="utf-8"))
        except Exception:
            existing = []

    # Remove all previous scan entries (any version)
    existing = [e for e in existing
                if not e.get("id", "").startswith("fo4-scan")]

    new_entries: list[dict] = []

    # ── Cells (interior + exterior with grid coords) ──────────────────────
    cells = final.get("cells", [])
    interior = [e for e in cells if "grid_x" not in e]
    exterior = [e for e in cells if "grid_x" in e]

    if interior:
        content = (
            "FALLOUT 4 INTERIOR CELLS — name, editorID, and FormID from Fallout4.esm + DLCs\n"
            "These are the instanced cell spaces (buildings, vaults, dungeons, interiors).\n"
            "Use FormIDs in Papyrus with Game.GetFormEx(0x...) as well as xEdit.\n\n"
            + _fmt_table(interior)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Interior Cell FormIDs",
            content,
            ["cells", "interior", "formid", "edid", "fo4-scan", "papyrus", "xedit"],
        ))

    if exterior:
        content = (
            "FALLOUT 4 EXTERIOR CELLS — grid position (X,Y) and FormID.\n"
            "Format: Cell (gridX,gridY): 0xFormID\n"
            "The Commonwealth worldspace (0x0000003C) uses these grid coordinates.\n"
            "Use with PlaceAtMe, MoveTo, or xEdit REFR placement.\n\n"
            + _fmt_table(exterior, max_rows=5000)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Exterior Cell Grid Coordinates & FormIDs",
            content,
            ["cells", "exterior", "grid", "formid", "fo4-scan", "commonwealth", "worldspace"],
        ))

    # ── Locations ─────────────────────────────────────────────────────────
    locs = final.get("locations", [])
    if locs:
        content = (
            "FALLOUT 4 NAMED LOCATIONS — LCTN records with FormIDs + EditorIDs.\n"
            "Used for quest aliases, map markers, player location checks (IsInLocation).\n\n"
            + _fmt_table(locs)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Named Location FormIDs",
            content,
            ["locations", "formid", "edid", "settlements", "map", "fo4-scan", "xedit"],
        ))

    # ── NPCs ──────────────────────────────────────────────────────────────
    npcs = final.get("npcs", [])
    if npcs:
        content = (
            "FALLOUT 4 NAMED NPCS — NPC_ records with FormIDs + EditorIDs.\n"
            "Get actor reference in Papyrus: Actor akActor = Game.GetFormEx(0x...) as Actor\n\n"
            + _fmt_table(npcs)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Named NPC FormIDs",
            content,
            ["npcs", "actors", "formid", "edid", "companions", "fo4-scan", "papyrus"],
        ))

    # ── Factions ──────────────────────────────────────────────────────────
    factions = final.get("factions", [])
    if factions:
        content = (
            "FALLOUT 4 FACTIONS — FACT records with FormIDs + EditorIDs.\n"
            "Use: akActor.AddToFaction(Game.GetFormEx(0x...) as Faction)\n\n"
            + _fmt_table(factions)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Faction FormIDs",
            content,
            ["factions", "formid", "edid", "fo4-scan", "papyrus", "relationships"],
        ))

    # ── Quests ────────────────────────────────────────────────────────────
    quests = final.get("quests", [])
    if quests:
        content = (
            "FALLOUT 4 QUESTS — QUST records with FormIDs + EditorIDs.\n"
            "Get quest in Papyrus: Quest q = Game.GetFormEx(0x...) as Quest\n"
            "EditorIDs follow Bethesda naming: MQ101 = main quest, MS01 = misc, etc.\n\n"
            + _fmt_table(quests)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Quest FormIDs",
            content,
            ["quests", "formid", "edid", "fo4-scan", "papyrus", "quest-design"],
        ))

    # ── Perks ─────────────────────────────────────────────────────────────
    perks = final.get("perks", [])
    if perks:
        content = (
            "FALLOUT 4 PERKS — PERK records with FormIDs + EditorIDs.\n\n"
            + _fmt_table(perks)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Perk FormIDs",
            content,
            ["perks", "formid", "edid", "fo4-scan", "player-progression", "leveling"],
        ))

    # ── Weapons, Armor, Ammo ──────────────────────────────────────────────
    weapons = final.get("weapons", [])
    armor   = final.get("armor",   [])
    ammo    = final.get("ammo",    [])
    if weapons or armor or ammo:
        content = (
            "FALLOUT 4 WEAPONS, ARMOR & AMMO — FormIDs + EditorIDs.\n\n"
            "=== WEAPONS ===\n" + _fmt_table(weapons)
            + "\n\n=== ARMOR / CLOTHING ===\n" + _fmt_table(armor)
            + "\n\n=== AMMO ===\n" + _fmt_table(ammo)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Weapon, Armor & Ammo FormIDs",
            content,
            ["weapons", "armor", "ammo", "formid", "edid", "fo4-scan", "items", "combat"],
        ))

    # ── Chems / Consumables / Misc ────────────────────────────────────────
    chems = final.get("chems", [])
    misc  = final.get("misc_items", [])
    ingr  = final.get("ingredients", [])
    if chems or misc or ingr:
        content = (
            "FALLOUT 4 CHEMS, CONSUMABLES, MISC & INGREDIENTS — FormIDs + EditorIDs.\n\n"
            "=== CHEMS & CONSUMABLES ===\n" + _fmt_table(chems)
            + "\n\n=== MISC ITEMS ===\n" + _fmt_table(misc, max_rows=500)
            + "\n\n=== INGREDIENTS ===\n" + _fmt_table(ingr)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Chems, Consumables, Misc & Ingredient FormIDs",
            content,
            ["chems", "consumables", "misc", "ingredients", "formid", "fo4-scan", "items"],
        ))

    # ── Books & Notes ─────────────────────────────────────────────────────
    books = final.get("books_and_notes", [])
    if books:
        content = (
            "FALLOUT 4 BOOKS & NOTES — BOOK records with FormIDs + EditorIDs.\n"
            "Includes skill magazines, holotapes, notes, letters.\n\n"
            + _fmt_table(books)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Books, Magazines & Notes FormIDs",
            content,
            ["books", "notes", "magazines", "holotapes", "formid", "fo4-scan", "items"],
        ))

    # ── Races ─────────────────────────────────────────────────────────────
    races = final.get("races", [])
    if races:
        content = (
            "FALLOUT 4 RACES — RACE records with FormIDs + EditorIDs.\n"
            "When creating new NPCs in CK, set the Race field to one of these.\n"
            "Use in Papyrus: akActor.GetRace() == Game.GetFormEx(0x...) as Race\n\n"
            + _fmt_table(races)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Race FormIDs",
            content,
            ["races", "formid", "edid", "fo4-scan", "npc-creation", "creatures"],
        ))

    # ── Worldspaces ───────────────────────────────────────────────────────
    ws = final.get("worldspaces", [])
    if ws:
        content = (
            "FALLOUT 4 WORLDSPACES — WRLD records.\n"
            "The main Commonwealth is FormID 0x0000003C (edid: Commonwealth).\n"
            "Far Harbor, Nuka-World etc. are separate worldspaces added by DLCs.\n\n"
            + _fmt_table(ws)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Worldspace FormIDs",
            content,
            ["worldspaces", "formid", "edid", "fo4-scan", "exterior", "cells"],
        ))

    # ── Spells / Magic Effects ────────────────────────────────────────────
    spells = final.get("spells",        [])
    mgef   = final.get("magic_effects", [])
    if spells or mgef:
        content = (
            "FALLOUT 4 SPELLS & MAGIC EFFECTS — FormIDs + EditorIDs.\n\n"
            "=== SPELLS ===\n" + _fmt_table(spells)
            + "\n\n=== MAGIC EFFECTS (MGEF) ===\n" + _fmt_table(mgef)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Spell & Magic Effect FormIDs",
            content,
            ["spells", "magic-effects", "formid", "edid", "fo4-scan", "combat", "abilities"],
        ))

    # ── Keywords ──────────────────────────────────────────────────────────
    kw = final.get("keywords", [])
    if kw:
        content = (
            "FALLOUT 4 KEYWORDS — KEYW records with FormIDs + EditorIDs.\n"
            "Keywords are used as tags/flags throughout FO4: HasKeyword(), AddKeyword().\n"
            "Critical for crafting recipes, settlement workshop, faction detection, etc.\n\n"
            + _fmt_table(kw)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Keyword FormIDs",
            content,
            ["keywords", "formid", "edid", "fo4-scan", "crafting", "tags", "workshop"],
        ))

    # ── Dialogue Topics ───────────────────────────────────────────────────
    dial = final.get("dialogue_topics", [])
    if dial:
        content = (
            "FALLOUT 4 DIALOGUE TOPICS — DIAL records with FormIDs + EditorIDs.\n"
            "Used as quest dialogue topic containers in CK.\n\n"
            + _fmt_table(dial)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Dialogue Topic FormIDs",
            content,
            ["dialogue", "topics", "formid", "edid", "fo4-scan", "quest-design"],
        ))

    # ── Globals ───────────────────────────────────────────────────────────
    globs = final.get("global_variables", [])
    if globs:
        content = (
            "FALLOUT 4 GLOBAL VARIABLES — GLOB records with FormIDs + EditorIDs.\n"
            "Used to track game-wide state. Reference in Papyrus:\n"
            "GlobalVariable g = Game.GetFormEx(0x...) as GlobalVariable; g.GetValue()\n\n"
            + _fmt_table(globs)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Global Variable FormIDs",
            content,
            ["globals", "formid", "edid", "fo4-scan", "papyrus", "state"],
        ))

    # ── Sounds, Weather, Music ────────────────────────────────────────────
    sounds  = final.get("sound_descriptors", [])
    weather = final.get("weather_types",     [])
    music   = final.get("music_types",       [])
    if sounds or weather or music:
        content = (
            "FALLOUT 4 AUDIO & WEATHER — FormIDs + EditorIDs.\n\n"
            "=== SOUND DESCRIPTORS ===\n" + _fmt_table(sounds, max_rows=300)
            + "\n\n=== WEATHER TYPES ===\n" + _fmt_table(weather)
            + "\n\n=== MUSIC TYPES ===\n" + _fmt_table(music)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — Sound, Weather & Music FormIDs",
            content,
            ["sounds", "weather", "music", "formid", "edid", "fo4-scan", "audio"],
        ))

    # ── Constructibles (crafting recipes) ─────────────────────────────────
    cobj = final.get("constructibles", [])
    if cobj:
        content = (
            "FALLOUT 4 CONSTRUCTIBLES (COBJ) — crafting recipe records.\n"
            "These define what can be built at workbenches and what ingredients are required.\n\n"
            + _fmt_table(cobj)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — All Constructible/Crafting Recipe FormIDs",
            content,
            ["constructibles", "crafting", "recipes", "formid", "edid", "fo4-scan", "workshop"],
        ))

    # ── EditorID master index — all records, every type ──────────────────
    all_edids: list[dict] = []
    for cat_entries in final.values():
        for e in cat_entries:
            if "edid" in e:
                all_edids.append(e)
    all_edids.sort(key=lambda x: x.get("edid", ""))

    if all_edids:
        content = (
            "FALLOUT 4 COMPLETE EDITOR ID INDEX — all record types, all DLCs.\n"
            "Format: [EditorID]: FormID (display name if available)\n"
            "Use EditorIDs in Creation Kit scripts and xEdit filters.\n\n"
            + _fmt_table(all_edids, max_rows=10000)
        )
        new_entries.append(_vault_entry(
            "Fallout 4 — Complete EditorID Index (All Record Types)",
            content,
            ["edid", "editor-id", "formid", "fo4-scan", "all-records", "index", "ck", "xedit"],
        ))

    merged = existing + new_entries
    vault_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    return len(new_entries)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Scan ALL FO4 game data — names, EditorIDs, FormIDs, cell grids")
    parser.add_argument("--no-vault",  action="store_true", help="Skip knowledge vault injection")
    parser.add_argument("--out",       default=str(DEFAULT_OUT))
    args = parser.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    # 1. Extract STRINGS
    print("=== Extracting STRINGS from BA2 archives ===")
    ba2_files: dict[str, bytes] = {}
    print(f"Reading {INTERFACE_BA2.name} ...")
    ba2_files.update(ba2_extract_strings_files(INTERFACE_BA2))
    for ba2_path in DLC_BA2S:
        if ba2_path.exists():
            print(f"Reading {ba2_path.name} ...")
            ba2_files.update(ba2_extract_strings_files(ba2_path))

    if not ba2_files:
        print("ERROR: No string files found.")
        sys.exit(1)

    # 2. Build string lookup
    print(f"\nBuilding string lookup from {len(ba2_files)} files...")
    string_lookup = build_string_lookup(ba2_files)
    print(f"  {len(string_lookup):,} string IDs loaded")

    # 3. Parse ALL ESMs (base + all DLCs)
    raw_results: dict[str, list[dict]] = {cat: [] for cat in set(RECORD_CATEGORIES.values())}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"\nParsing {esm_path.name} ({mb} MB)...")
        for cat, entries in parse_esm(esm_path, string_lookup, RECORD_CATEGORIES).items():
            raw_results[cat].extend(entries)

    # 4. Clean / dedupe
    final: dict[str, list[dict]] = {}
    total = 0
    for cat in sorted(raw_results):
        cleaned = _clean_entries(raw_results[cat])
        if cleaned:
            final[cat] = cleaned
            total += len(cleaned)

    # 5. Build CD context
    cd_context = _build_cd_context(final)

    # 6. Save JSON
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source":       "Fallout4.esm + all DLCs",
        "total_names":  total,
        "cd_context":   cd_context,
        "data":         {cat: [e.get("name", e.get("edid", "")) for e in entries] for cat, entries in final.items()},
        "indexed":      final,
    }
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    # 7. Knowledge vault
    if not args.no_vault:
        print(f"\nInjecting into knowledge vault ...")
        added = inject_into_vault(final, VAULT_PATH)
        print(f"  Added {added} vault entries")

    # 8. Print summary
    elapsed = time.time() - t0
    print(f"\n=== Done in {elapsed:.1f}s ===")
    print(f"Total entries: {total:,}")
    for cat, entries in sorted(final.items(), key=lambda x: -len(x[1])):
        has_edid = sum(1 for e in entries if "edid" in e)
        has_grid = sum(1 for e in entries if "grid_x" in e)
        extra = f"  [{has_edid} with EDID" + (f", {has_grid} exterior cells" if has_grid else "") + "]"
        print(f"  {cat:22s}: {len(entries):5d}{extra}")
    print(f"\nSaved:  {out_path}")
    if not args.no_vault:
        print(f"Vault:  {VAULT_PATH}")
    json_mb = out_path.stat().st_size / 1024 / 1024
    print(f"JSON size: {json_mb:.1f} MB")


if __name__ == "__main__":
    main()
