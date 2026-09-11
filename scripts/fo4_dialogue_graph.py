#!/usr/bin/env python3
"""
fo4_dialogue_graph.py — Fallout 4 Dialogue Tree Structure
============================================================
The strings scan already captures every DIAL topic's name and every INFO
response's actual line of text — but not which INFO belongs to which DIAL
topic, so there's no way to reconstruct an actual conversation.

INFO records are stored nested inside a "Topic Children" GRUP whose label
field is the parent DIAL's FormID (GRUP type 7 — this container format is
identical across Skyrim/FO4 and is the same 24-byte GRUP header the other
scanners already skip over; this one is the first to actually read its
label/groupType instead of just skipping past it). Reading that link is
what turns "here are 40,000 lines of dialogue" into "here is what NPC X
says during quest Y."

For every DIAL: EDID, FULL (topic name), and the FormIDs of its INFO
children in order.
For every INFO: FormID, its parent DIAL FormID, and its response text
(NAM1 — same resolution rule fo4_strings_scan.py already uses for INFO).

Deliberately NOT attempted here: which specific in-game conditions
(CTDA) gate each response, or which NPC speaks it. That requires
decoding FO4's condition-function byte layout, which — unlike the simple
length-prefixed subrecords used throughout this script — genuinely
differs by function and isn't something to guess at from memory without
a real ESM to check the answer against.

Outputs:
  <scan-cache>/fo4_dialogue_graph.json
"""

import json, os, struct, sys, time, zlib
from pathlib import Path

FO4_DATA      = Path(os.environ.get("MOSSY_FO4_DATA") or r"E:\Steam\steamapps\common\Fallout 4\Data")
INTERFACE_BA2 = FO4_DATA / "Fallout4 - Interface.ba2"
MAIN_ESM      = FO4_DATA / "Fallout4.esm"
DLC_MAINS = [
    FO4_DATA / "DLCRobot.esm", FO4_DATA / "DLCCoast.esm", FO4_DATA / "DLCNukaWorld.esm",
    FO4_DATA / "DLCworkshop01.esm", FO4_DATA / "DLCworkshop02.esm", FO4_DATA / "DLCworkshop03.esm",
]
DLC_BA2S = [
    FO4_DATA / "DLCRobot - Main.ba2", FO4_DATA / "DLCCoast - Main.ba2", FO4_DATA / "DLCNukaWorld - Main.ba2",
    FO4_DATA / "DLCworkshop01 - Main.ba2", FO4_DATA / "DLCworkshop02 - Main.ba2", FO4_DATA / "DLCworkshop03 - Main.ba2",
]
_OUT_DIR  = Path(os.environ.get("MOSSY_SCAN_OUTPUT_DIR") or r"H:\Mossy Memory")
GRAPH_OUT = _OUT_DIR / "fo4_dialogue_graph.json"

COMPRESSED_FLAG = 0x00040000
TOPIC_CHILDREN_GROUP_TYPE = 7


# ---------------------------------------------------------------------------
# BA2 string extraction (same as fo4_strings_scan.py / fo4_quest_graph.py)
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


def _decomp(data: bytes, flags: int) -> bytes | None:
    if flags & COMPRESSED_FLAG:
        if len(data) < 4:
            return None
        try:
            return zlib.decompress(data[4:])
        except Exception:
            return None
    return data


def scan_subs_dict(rec: bytes) -> dict[bytes, bytes]:
    out, pos = {}, 0
    while pos + 6 <= len(rec):
        t = rec[pos:pos + 4]
        n = struct.unpack_from("<H", rec, pos + 4)[0]
        pos += 6
        if pos + n > len(rec):
            break
        out[t] = rec[pos:pos + n]
        pos += n
    return out


# ---------------------------------------------------------------------------
# ESM walker with GRUP-context tracking
# ---------------------------------------------------------------------------

def extract_dialogue(esm_path: Path, string_lookup: dict[int, str]) -> tuple[dict, list]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0

    dials: dict[str, dict] = {}
    infos: list[dict] = []
    # Stack of (end_offset, group_type, label_bytes)
    stack: list[tuple[int, int, bytes]] = []

    if data[:4] != b"TES4":
        print(f"  WARNING: {esm_path.name} doesn't start with TES4")

    while pos + 24 <= length:
        # Pop any groups we've walked past.
        while stack and pos >= stack[-1][0]:
            stack.pop()

        rec_type = data[pos:pos + 4]

        if rec_type == b"GRUP":
            group_size = struct.unpack_from("<I", data, pos + 4)[0]
            label      = data[pos + 8:pos + 12]
            group_type = struct.unpack_from("<i", data, pos + 12)[0]
            end_offset = pos + max(group_size, 24)  # groupSize includes this 24-byte header
            stack.append((end_offset, group_type, label))
            pos += 24
            continue

        data_size = struct.unpack_from("<I", data, pos + 4)[0]
        flags     = struct.unpack_from("<I", data, pos + 8)[0]
        form_id   = struct.unpack_from("<I", data, pos + 12)[0]
        pos += 24
        if pos + data_size > length:
            break

        if rec_type == b"DIAL":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                subs = scan_subs_dict(dec)
                edid = resolve_edid(subs[b"EDID"]) if b"EDID" in subs else None
                name = resolve_lstring(subs[b"FULL"], string_lookup) if b"FULL" in subs else None
                fid_hex = f"0x{form_id:08X}"
                if edid or name:
                    dials[fid_hex] = {"form_id": fid_hex, "edid": edid, "name": name, "info_ids": []}

        elif rec_type == b"INFO":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                subs = scan_subs_dict(dec)
                response = resolve_lstring(subs[b"NAM1"], string_lookup) if b"NAM1" in subs else None
                # Nearest enclosing "Topic Children" (type 7) group's label = parent DIAL FormID.
                parent_dial = None
                for _end, gtype, glabel in reversed(stack):
                    if gtype == TOPIC_CHILDREN_GROUP_TYPE:
                        parent_fid = struct.unpack_from("<I", glabel, 0)[0]
                        parent_dial = f"0x{parent_fid:08X}"
                        break
                if response or parent_dial:
                    fid_hex = f"0x{form_id:08X}"
                    infos.append({"form_id": fid_hex, "parent_dial": parent_dial, "response": response})
                    if parent_dial and parent_dial in dials:
                        dials[parent_dial]["info_ids"].append(fid_hex)

        pos += data_size

    return dials, infos


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

    all_dials: dict[str, dict] = {}
    all_infos: list[dict] = []
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for dialogue tree...")
        dials, infos = extract_dialogue(esm_path, string_lookup)
        all_dials.update(dials)
        all_infos.extend(infos)

    linked = sum(1 for i in all_infos if i.get("parent_dial"))

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_dial_topics": len(all_dials),
        "total_info_responses": len(all_infos),
        "info_responses_linked_to_topic": linked,
        "dial_topics": all_dials,
        "info_responses": all_infos,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Dialogue tree scan complete in {elapsed:.1f}s ===")
    print(f"  DIAL topics:                {len(all_dials):,}")
    print(f"  INFO responses:             {len(all_infos):,}")
    print(f"  Linked to a parent topic:   {linked:,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
