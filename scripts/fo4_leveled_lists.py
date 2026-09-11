#!/usr/bin/env python3
"""
fo4_leveled_lists.py — FO4 Leveled NPC (LVLN) deep decode
========================================================================
Upgrade pass: LVLN previously only got the shallow LVLD/LVLF/LVLO
decode from this file. LVLI (Leveled Item) got a full deep decode
this session via fo4_sound_color_texture_leveled.py, and a source
comparison confirmed LVLN is nearly structurally identical — same
LVLO Base Data layout (Level/Reference/Count/Chance None) and the
same optional trailing COED Extra Data struct, differing only in a
few specifics. This file now gives LVLN the same depth.

Source-verified (wbDefinitionsFO4.pas LVLN ~12892-12923, compared
directly against LVLI ~12925-12958 which this project's LVLI scanner
already decodes to this same depth):

  EDID, LVLD (Chance None %), LVLM (Max Count u8 — source itself notes
  this is always 0/unavailable, kept for completeness), LVLF (Flags:
  Calculate from all levels <= player's level / Calculate for each
  item in count / Calculate All — the third flag is LVLN's own label
  for the same bit LVLI calls "Use All"), LVLG (Use Global -> GLOB),
  LLCT (entry count), Leveled List Entries (repeating group: LVLO Base
  Data [Level u16, Reference FormID -> NPC_/LVLN (LVLN can level-list
  into itself, unlike LVLI), Count — s16/SIGNED here, unlike LVLI's
  u16, Chance None u8] optionally followed by a COED Extra Data struct
  [Owner FormID, a 4-byte union of Global Variable FormID / Required
  Rank s32, Item Condition float] — the exact same reused decode
  already validated on LVLI), Filter Keyword Chances (LLKC, array of
  Keyword FormID + Chance u32 pairs), MODL (a trailing model-override
  path LVLI does NOT have — lets a leveled NPC list override the
  spawned actor's visible model).

  LVLN does NOT have LVLI's LVSG (Epic Loot Chance) or ONAM (Override
  Name) fields — confirmed absent from source.

Outputs:
  <scan-cache>/fo4_leveled_lists.json
"""

import json, os, struct, sys, time, zlib
from pathlib import Path

FO4_DATA  = Path(os.environ.get("MOSSY_FO4_DATA") or r"E:\Steam\steamapps\common\Fallout 4\Data")
MAIN_ESM  = FO4_DATA / "Fallout4.esm"
DLC_MAINS = [
    FO4_DATA / "DLCRobot.esm", FO4_DATA / "DLCCoast.esm", FO4_DATA / "DLCNukaWorld.esm",
    FO4_DATA / "DLCworkshop01.esm", FO4_DATA / "DLCworkshop02.esm", FO4_DATA / "DLCworkshop03.esm",
]
_OUT_DIR  = Path(os.environ.get("MOSSY_SCAN_OUTPUT_DIR") or r"H:\Mossy Memory")
GRAPH_OUT = _OUT_DIR / "fo4_leveled_lists.json"

COMPRESSED_FLAG = 0x00040000

LVLN_FLAGS = [
    (0x01, "Calculate from all levels <= player's level"),
    (0x02, "Calculate for each item in count"),
    (0x04, "Calculate All"),
]


def _decode_flags_bitfield(value: int, table) -> list[str]:
    return [name for bit, name in table if value & bit]


def resolve_edid(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("ascii", errors="replace").strip()
        return text if text else None
    except Exception:
        return None


def resolve_string(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("utf-8", errors="replace").strip()
        return text if text else None
    except Exception:
        return None


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
    return f"0x{v:08X}" if v else None


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


def _extract_one_lvln(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    chance_none: int | None = None
    max_count: int | None = None
    flags: list[str] = []
    use_global: str | None = None
    count: int | None = None
    entries: list[dict] = []
    filter_keywords: list[dict] = []
    model_override: str | None = None

    cur_entry: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "LVLD" and len(d) >= 1:
            chance_none = d[0]
        elif tag == "LVLM" and len(d) >= 1:
            max_count = d[0]
        elif tag == "LVLF" and len(d) >= 1:
            flags = _decode_flags_bitfield(d[0], LVLN_FLAGS)
        elif tag == "LVLG":
            use_global = fid_hex(d)
        elif tag == "LLCT" and len(d) >= 1:
            count = d[0]
        elif tag == "LVLO" and len(d) >= 10:
            if cur_entry is not None:
                entries.append(cur_entry)
            level = struct.unpack_from("<H", d, 0)[0]
            reference = fid_hex(d[4:8])
            # LVLN's Count is SIGNED (itS16), unlike LVLI's unsigned Count
            item_count = struct.unpack_from("<h", d, 8)[0]
            chance = d[10] if len(d) > 10 else None
            cur_entry = {"level": level, "reference": reference, "count": item_count, "chance_none": chance, "extra_data": None}
        elif tag == "COED" and cur_entry is not None and len(d) >= 12:
            owner = fid_hex(d[0:4])
            union_raw = struct.unpack_from("<I", d, 4)[0]
            item_condition = struct.unpack_from("<f", d, 8)[0]
            cur_entry["extra_data"] = {
                "owner": owner,
                "union_raw": f"0x{union_raw:08X}",
                "as_global_variable": fid_hex(d[4:8]) if union_raw else None,
                "as_required_rank": struct.unpack_from("<i", d, 4)[0],
                "item_condition": round(item_condition, 4),
            }
        elif tag == "LLKC" and len(d) >= 8:
            for i in range(len(d) // 8):
                off = i * 8
                kw = fid_hex(d[off:off + 4])
                chance_val = struct.unpack_from("<I", d, off + 4)[0]
                if kw:
                    filter_keywords.append({"keyword": kw, "chance": chance_val})
        elif tag == "MODL":
            model_override = resolve_string(d)

    if cur_entry is not None:
        entries.append(cur_entry)

    if not edid and not entries:
        return None

    return {
        "record_type": "LVLN", "form_id": f"0x{form_id:08X}", "edid": edid,
        "chance_none_pct": chance_none, "max_count": max_count, "flags": flags,
        "use_global": use_global, "count": count,
        "entries": entries, "filter_keywords": filter_keywords,
        "model_override": model_override,
    }


def extract_leveled_npcs(esm_path: Path) -> list[dict]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    out: list[dict] = []

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
        if rec_type == b"LVLN":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                r = _extract_one_lvln(dec, form_id)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_lvln: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for leveled NPCs...")
        all_lvln.extend(extract_leveled_npcs(esm_path))

    with_extra_data = [n for n in all_lvln if any(e["extra_data"] for e in n["entries"])]
    with_model_override = [n for n in all_lvln if n["model_override"]]
    calculate_all = [n for n in all_lvln if "Calculate All" in n["flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "leveled_npc_count": len(all_lvln),
        "with_extra_data": len(with_extra_data),
        "with_model_override": len(with_model_override),
        "calculate_all": len(calculate_all),
        "leveled_npcs": all_lvln,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Leveled NPC scan complete in {elapsed:.1f}s ===")
    print(f"  LVLN (leveled NPCs): {len(all_lvln):,} ({len(calculate_all):,} Calculate All, {len(with_extra_data):,} with COED extra data, {len(with_model_override):,} with model override)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
