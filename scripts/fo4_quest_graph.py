#!/usr/bin/env python3
"""
fo4_quest_graph.py — Fallout 4 Quest Structure Scanner
=======================================================
Fills the one big gap the other three scanners leave: quest *content*.
fo4_strings_scan.py already captures every quest's FULL name + EditorID,
and fo4_form_graph.py already captures every PERK/SPEL/MGEF/COBJ script
attachment — but neither one opens up what a quest actually *does*:
its stages, its journal/objective text, and the aliases (quest-giver,
target, companion, etc.) that get filled in during play.

For every QUST record in Fallout4.esm + all DLC ESMs, extracts:
  - EDID, FormID, FULL (quest name)
  - Stages: each INDX block's index number + its CNAM journal/log-entry text
  - Objectives: each QOBJ block's index + its NNAM display text
  - Aliases: each ALST/ALLA/ALCO block's alias id/type + its ALNA display name
  - VMAD Papyrus scripts attached to the quest itself

This mirrors fo4_form_graph.py's approach exactly: subrecords are walked
purely by their declared (type, length) header, the same way scan_subs_ordered
already does successfully elsewhere in this codebase — so no CTDA/condition
byte-layout needs to be understood to get this right, only which subrecord
type marks the start of a new stage/objective/alias block.

Requires: fo4_strings_scan.py's BA2 string files (re-extracted here directly,
not read from fo4_world_strings.json, so this script has no dependency on
that scan having already run).

Outputs:
  <scan-cache>/fo4_quest_graph.json
"""

import json, os, struct, sys, time, zlib
from pathlib import Path

# ---------------------------------------------------------------------------
# Config — same paths/env-var overrides as the other fo4_*.py scanners.
# ---------------------------------------------------------------------------
FO4_DATA      = Path(os.environ.get("MOSSY_FO4_DATA") or r"E:\Steam\steamapps\common\Fallout 4\Data")
INTERFACE_BA2 = FO4_DATA / "Fallout4 - Interface.ba2"
MAIN_ESM      = FO4_DATA / "Fallout4.esm"
DLC_MAINS     = [
    FO4_DATA / "DLCRobot.esm",
    FO4_DATA / "DLCCoast.esm",
    FO4_DATA / "DLCNukaWorld.esm",
    FO4_DATA / "DLCworkshop01.esm",
    FO4_DATA / "DLCworkshop02.esm",
    FO4_DATA / "DLCworkshop03.esm",
]
DLC_BA2S = [
    FO4_DATA / "DLCRobot - Main.ba2",
    FO4_DATA / "DLCCoast - Main.ba2",
    FO4_DATA / "DLCNukaWorld - Main.ba2",
    FO4_DATA / "DLCworkshop01 - Main.ba2",
    FO4_DATA / "DLCworkshop02 - Main.ba2",
    FO4_DATA / "DLCworkshop03 - Main.ba2",
]

_OUT_DIR  = Path(os.environ.get("MOSSY_SCAN_OUTPUT_DIR") or r"H:\Mossy Memory")
GRAPH_OUT = _OUT_DIR / "fo4_quest_graph.json"

COMPRESSED_FLAG = 0x00040000

ALIAS_START_TYPES = {b"ALST", b"ALLA", b"ALCO"}

# ---------------------------------------------------------------------------
# BA2 string extraction (identical approach to fo4_strings_scan.py)
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
    return result


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


def resolve_lstring(sub_data: bytes, string_lookup: dict[int, str]) -> str | None:
    """Same rule fo4_strings_scan.py uses for FULL: a 4-byte subrecord is a
    localized-string index into the BA2 string tables; anything longer is an
    inline (non-localized) string. FO4's CNAM/NNAM/ALNA/FULL all follow this."""
    if len(sub_data) == 4:
        sid = struct.unpack_from("<I", sub_data, 0)[0]
        return string_lookup.get(sid)
    elif len(sub_data) > 1:
        null_pos = sub_data.find(b"\x00")
        raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
        text = raw_b.decode("utf-8", errors="replace").strip()
        return text if text else None
    return None


def resolve_edid(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("ascii", errors="replace").strip()
        return text if text else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Low-level binary helpers (identical to fo4_form_graph.py)
# ---------------------------------------------------------------------------

def _decomp(data: bytes, flags: int) -> bytes | None:
    if flags & COMPRESSED_FLAG:
        if len(data) < 4:
            return None
        try:
            return zlib.decompress(data[4:])
        except Exception:
            return None
    return data


def scan_subs_ordered(rec: bytes) -> list[tuple[bytes, bytes]]:
    """Return ALL (type, data) subrecord pairs in order — preserves duplicates.
    This only needs the universal 6-byte subrecord header (4-byte type +
    2-byte length); it never has to understand what's *inside* a subrecord
    it doesn't care about (CTDA conditions included), so an unfamiliar or
    complex subrecord can never desync the walk."""
    out, pos = [], 0
    while pos + 6 <= len(rec):
        t = rec[pos:pos + 4]
        n = struct.unpack_from("<H", rec, pos + 4)[0]
        pos += 6
        if pos + n > len(rec):
            break
        out.append((t, rec[pos:pos + n]))
        pos += n
    return out


def parse_vmad(data: bytes) -> list[dict]:
    """Identical to fo4_form_graph.py's parse_vmad (copied verbatim, not
    imported — every fo4_*.py scanner in this project is a standalone script)
    so this reuses the exact byte-layout logic already verified against the
    real ESM by the form-graph scan rather than a second, untested version."""
    pos = 0
    if len(data) < 6:
        return []
    try:
        version    = struct.unpack_from("<H", data, pos)[0]; pos += 2
        obj_format = struct.unpack_from("<H", data, pos)[0]; pos += 2
        sc         = struct.unpack_from("<H", data, pos)[0]; pos += 2
    except struct.error:
        return []

    scripts: list[dict] = []
    for _ in range(min(sc, 64)):
        if pos + 2 > len(data):
            break
        nlen = struct.unpack_from("<H", data, pos)[0]; pos += 2
        if pos + nlen > len(data):
            break
        script_name = data[pos:pos + nlen].decode("ascii", errors="replace"); pos += nlen
        if pos + 3 > len(data):
            break
        _status = data[pos]; pos += 1
        pc = struct.unpack_from("<H", data, pos)[0]; pos += 2

        props: list[dict] = []
        for _ in range(min(pc, 256)):
            if pos + 2 > len(data):
                break
            pnlen = struct.unpack_from("<H", data, pos)[0]; pos += 2
            if pos + pnlen > len(data):
                break
            pname = data[pos:pos + pnlen].decode("ascii", errors="replace"); pos += pnlen
            if pos + 2 > len(data):
                break
            ptype    = data[pos]; pos += 1
            _pstatus = data[pos]; pos += 1

            val = None
            try:
                if ptype == 1:    # Object reference
                    if obj_format == 2:
                        if pos + 8 > len(data):
                            break
                        fid = struct.unpack_from("<I", data, pos + 4)[0]
                        val = f"0x{fid:08X}" if fid else None
                        pos += 8
                    else:
                        if pos + 4 > len(data):
                            break
                        fid = struct.unpack_from("<I", data, pos)[0]
                        val = f"0x{fid:08X}" if fid else None
                        pos += 4
                elif ptype == 2:  # String
                    slen = struct.unpack_from("<H", data, pos)[0]; pos += 2
                    val  = data[pos:pos + slen].decode("utf-8", errors="replace"); pos += slen
                elif ptype == 3:  # Int
                    val = struct.unpack_from("<i", data, pos)[0]; pos += 4
                elif ptype == 4:  # Float
                    val = round(struct.unpack_from("<f", data, pos)[0], 4); pos += 4
                elif ptype == 5:  # Bool
                    val = bool(data[pos]); pos += 1
                elif ptype == 11: # Object array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    step = 8 if obj_format == 2 else 4
                    items = []
                    for _ in range(min(cnt, 256)):
                        if pos + step > len(data):
                            break
                        if obj_format == 2:
                            fid = struct.unpack_from("<I", data, pos + 4)[0]
                        else:
                            fid = struct.unpack_from("<I", data, pos)[0]
                        if fid:
                            items.append(f"0x{fid:08X}")
                        pos += step
                    val = items
                elif ptype == 12: # String array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    items = []
                    for _ in range(min(cnt, 256)):
                        slen = struct.unpack_from("<H", data, pos)[0]; pos += 2
                        items.append(data[pos:pos + slen].decode("utf-8", errors="replace"))
                        pos += slen
                    val = items
                elif ptype == 13: # Int array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    val = [struct.unpack_from("<i", data, pos + i * 4)[0]
                           for i in range(min(cnt, 256))]
                    pos += min(cnt, 256) * 4
                elif ptype == 14: # Float array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    val = [round(struct.unpack_from("<f", data, pos + i * 4)[0], 4)
                           for i in range(min(cnt, 256))]
                    pos += min(cnt, 256) * 4
                elif ptype == 15: # Bool array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    val = [bool(data[pos + i]) for i in range(min(cnt, 256))]
                    pos += min(cnt, 256)
                else:
                    props = []
                    break
            except (struct.error, IndexError):
                break

            if pname:
                props.append({"name": pname, "type_id": ptype, "value": val})

        scripts.append({"name": script_name, "properties": props})

    return scripts


# ---------------------------------------------------------------------------
# QUST record walker
# ---------------------------------------------------------------------------

def extract_quests(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    quests: list[dict] = []

    if data[:4] != b"TES4":
        print(f"  WARNING: {esm_path.name} doesn't start with TES4")

    while pos + 24 <= length:
        rec_type = data[pos:pos + 4]
        if rec_type == b"GRUP":
            pos += 24
            continue

        data_size = struct.unpack_from("<I", data, pos + 4)[0]
        flags     = struct.unpack_from("<I", data, pos + 8)[0]
        form_id   = struct.unpack_from("<I", data, pos + 12)[0]
        pos += 24
        if pos + data_size > length:
            break

        if rec_type == b"QUST":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                q = {"form_id": f"0x{form_id:08X}", "stages": [], "objectives": [], "aliases": [], "scripts": []}
                cur_stage = None
                cur_obj = None
                cur_alias = None

                def flush_stage():
                    nonlocal cur_stage
                    if cur_stage is not None:
                        q["stages"].append(cur_stage)
                        cur_stage = None

                def flush_obj():
                    nonlocal cur_obj
                    if cur_obj is not None:
                        q["objectives"].append(cur_obj)
                        cur_obj = None

                def flush_alias():
                    nonlocal cur_alias
                    if cur_alias is not None:
                        q["aliases"].append(cur_alias)
                        cur_alias = None

                for t, d in scan_subs_ordered(dec):
                    if t == b"EDID":
                        q["edid"] = resolve_edid(d)
                    elif t == b"FULL":
                        q["name"] = resolve_lstring(d, string_lookup)
                    elif t == b"VMAD":
                        try:
                            q["scripts"] = [s["name"] for s in parse_vmad(d) if s.get("name")]
                        except Exception:
                            pass
                    elif t == b"INDX":
                        flush_stage()
                        if len(d) >= 2:
                            cur_stage = {"index": struct.unpack_from("<H", d, 0)[0]}
                    elif t == b"CNAM" and cur_stage is not None:
                        text = resolve_lstring(d, string_lookup)
                        if text:
                            cur_stage["log_entry"] = text
                    elif t == b"QOBJ":
                        flush_obj()
                        if len(d) >= 2:
                            cur_obj = {"index": struct.unpack_from("<H", d, 0)[0]}
                    elif t == b"NNAM" and cur_obj is not None:
                        text = resolve_lstring(d, string_lookup)
                        if text:
                            cur_obj["text"] = text
                    elif t in ALIAS_START_TYPES:
                        flush_alias()
                        cur_alias = {"type": t.decode()}
                        if t == b"ALST" and len(d) >= 4:
                            cur_alias["alias_id"] = struct.unpack_from("<I", d, 0)[0]
                    elif t == b"ALNA" and cur_alias is not None:
                        text = resolve_lstring(d, string_lookup)
                        if text:
                            cur_alias["name"] = text
                    elif t == b"ALED":
                        flush_alias()

                flush_stage(); flush_obj(); flush_alias()

                if q.get("name") or q.get("edid") or q["stages"] or q["objectives"] or q["aliases"]:
                    quests.append(q)

        pos += data_size

    return quests


def build_quest_walkthrough(q: dict) -> str:
    lines = [f"{q.get('edid', q['form_id'])} ({q['form_id']}) — \"{q.get('name', '(unnamed)')}\""]
    if q["stages"]:
        lines.append("Stages:")
        for s in sorted(q["stages"], key=lambda s: s["index"]):
            if s.get("log_entry"):
                lines.append(f"  [{s['index']}] {s['log_entry']}")
    if q["objectives"]:
        lines.append("Objectives:")
        for o in sorted(q["objectives"], key=lambda o: o["index"]):
            if o.get("text"):
                lines.append(f"  [{o['index']}] {o['text']}")
    if q["aliases"]:
        named = [a for a in q["aliases"] if a.get("name")]
        if named:
            lines.append("Aliases: " + ", ".join(a["name"] for a in named))
    if q["scripts"]:
        lines.append("Scripts: " + ", ".join(q["scripts"]))
    return "\n".join(lines)


def main():
    t0 = time.time()

    print("=== Extracting STRINGS from BA2 archives ===")
    ba2_files: dict[str, bytes] = {}
    ba2_files.update(ba2_extract_strings_files(INTERFACE_BA2))
    for ba2_path in DLC_BA2S:
        if ba2_path.exists():
            ba2_files.update(ba2_extract_strings_files(ba2_path))
    if not ba2_files:
        print("ERROR: No string files found.")
        sys.exit(1)

    string_lookup = build_string_lookup(ba2_files)
    print(f"  {len(string_lookup):,} string IDs loaded")

    all_quests: list[dict] = []
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for quests...")
        all_quests.extend(extract_quests(esm_path, string_lookup))

    quests_with_content = [q for q in all_quests if q["stages"] or q["objectives"] or q["aliases"]]
    walkthroughs = {
        q["form_id"]: build_quest_walkthrough(q)
        for q in sorted(quests_with_content, key=lambda q: -(len(q["stages"]) + len(q["objectives"])))[:200]
    }

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_quests": len(all_quests),
        "quests_with_stage_data": len(quests_with_content),
        "quests": {q["form_id"]: q for q in all_quests},
        "walkthrough_sample": walkthroughs,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Quest scan complete in {elapsed:.1f}s ===")
    print(f"  Total QUST records:        {len(all_quests):,}")
    print(f"  With stage/objective data: {len(quests_with_content):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
