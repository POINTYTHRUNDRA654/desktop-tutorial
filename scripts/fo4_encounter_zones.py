#!/usr/bin/env python3
"""
fo4_encounter_zones.py — FO4 Encounter Zone (ECZN)
========================================================================
Third stop in the "grind it to zero" pass. Encounter Zones drive level
scaling and combat-boundary behavior for a Location or an area an Owner
(NPC or Faction) controls -- min/max level range, whether the zone
"never resets" (used for unique/quest-critical fights), and whether PC
level can go below the zone's minimum.

Trivially simple, source-verified (wbDefinitionsFO4.pas ~11197-11211):
EDID + a single fixed 12-byte DATA struct (Owner formid, Location
formid, Rank s8, Min Level s8, Flags u8, Max Level s8). One tag, no
repeating groups, no ambiguity.

Outputs:
  <scan-cache>/fo4_encounter_zones.json
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
GRAPH_OUT = _OUT_DIR / "fo4_encounter_zones.json"

COMPRESSED_FLAG = 0x00040000

ECZN_FLAGS = [(0x01, "Never Resets"), (0x02, "Match PC Below Minimum Level"),
              (0x04, "Disable Combat Boundary"), (0x08, "Workshop")]


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


def _extract_one_eczn(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    owner = location = None
    rank = min_level = max_level = None
    flags_raw = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DATA" and len(d) >= 12:
            owner = fid_hex(d[0:4])
            location = fid_hex(d[4:8])
            rank = struct.unpack_from("<b", d, 8)[0]
            min_level = struct.unpack_from("<b", d, 9)[0]
            flags_raw = d[10]
            max_level = struct.unpack_from("<b", d, 11)[0]

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "owner": owner,
        "location": location,
        "rank": rank,
        "min_level": min_level,
        "max_level": max_level,
        "flags": _decode_flags_bitfield(flags_raw, ECZN_FLAGS) if flags_raw is not None else [],
    }


def extract_eczns(esm_path: Path) -> list[dict]:
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
        if rec_type == b"ECZN":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                e = _extract_one_eczn(dec, form_id)
                if e is not None:
                    out.append(e)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_eczns: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for encounter zones...")
        all_eczns.extend(extract_eczns(esm_path))

    never_resets = [e for e in all_eczns if "Never Resets" in e["flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_encounter_zones": len(all_eczns),
        "never_reset_zones": len(never_resets),
        "encounter_zones": all_eczns,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Encounter zone scan complete in {elapsed:.1f}s ===")
    print(f"  Total encounter zones: {len(all_eczns):,}")
    print(f"  Never-reset zones:     {len(never_resets):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
