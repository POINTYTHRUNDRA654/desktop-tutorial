#!/usr/bin/env python3
"""
fo4_items_and_containers.py — FO4 Item Descriptions + Container Loot Lists
=============================================================================
Two more real gaps, both low-risk because both reuse structures already
proven elsewhere in this project:

1. DESC text — PERK, ALCH (chems), BOOK, and MGEF records carry a DESC
   subrecord: the actual flavor/tooltip text shown to the player (distinct
   from FULL, which is just the name). Uses the identical lstring
   resolution already verified end-to-end against real game data in
   fo4_quest_graph.py / fo4_dialogue_graph.py.

2. CONT item lists — every CONT (container) record's direct (non-leveled)
   contents via its CNTO subrecords: {item FormID (u32), count (i32)} —
   an 8-byte struct that has been stable and identically documented across
   every Creation Engine game since Oblivion, unlike LVLO or PACK's
   internals which needed more care.

Outputs:
  <scan-cache>/fo4_items_and_containers.json
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
GRAPH_OUT = _OUT_DIR / "fo4_items_and_containers.json"

COMPRESSED_FLAG = 0x00040000
DESC_TYPES = {b"PERK", b"ALCH", b"BOOK", b"MGEF"}


def _ba2_read_names(data, num_files, name_table_offset):
    names, pos = [], name_table_offset
    for _ in range(num_files):
        if pos + 2 > len(data):
            break
        nlen = struct.unpack_from("<H", data, pos)[0]; pos += 2
        if pos + nlen > len(data):
            break
        names.append(data[pos:pos + nlen].decode("utf-8", errors="replace")); pos += nlen
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
    dir_end, data_base = 8 + count * 8, 8 + count * 8
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


def scan_subs_ordered(rec: bytes) -> list[tuple[bytes, bytes]]:
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


def extract(esm_path: Path, string_lookup: dict[int, str]) -> tuple[list, list]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    descriptions: list[dict] = []
    containers: list[dict] = []

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

        if rec_type in DESC_TYPES:
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                edid = None; name = None; desc = None
                for t, d in scan_subs_ordered(dec):
                    if t == b"EDID": edid = resolve_edid(d)
                    elif t == b"FULL": name = resolve_lstring(d, string_lookup)
                    elif t == b"DESC": desc = resolve_lstring(d, string_lookup)
                if desc:
                    descriptions.append({"form_id": f"0x{form_id:08X}", "record_type": rec_type.decode(),
                                          "edid": edid, "name": name, "description": desc})

        elif rec_type == b"CONT":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                edid = None; name = None
                items: list[dict] = []
                for t, d in scan_subs_ordered(dec):
                    if t == b"EDID": edid = resolve_edid(d)
                    elif t == b"FULL": name = resolve_lstring(d, string_lookup)
                    elif t == b"CNTO" and len(d) == 8:
                        item_fid = struct.unpack_from("<I", d, 0)[0]
                        count    = struct.unpack_from("<i", d, 4)[0]
                        items.append({"item": f"0x{item_fid:08X}", "count": count})
                if edid or items:
                    containers.append({"form_id": f"0x{form_id:08X}", "edid": edid, "name": name, "items": items})

        pos += data_size

    return descriptions, containers


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

    all_desc: list[dict] = []
    all_cont: list[dict] = []
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for item descriptions + containers...")
        d, c = extract(esm_path, string_lookup)
        all_desc.extend(d)
        all_cont.extend(c)

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_descriptions": len(all_desc),
        "total_containers": len(all_cont),
        "descriptions": all_desc,
        "containers": all_cont,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Item/container scan complete in {elapsed:.1f}s ===")
    print(f"  Descriptions (PERK/ALCH/BOOK/MGEF): {len(all_desc):,}")
    print(f"  Containers with contents:           {len(all_cont):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
