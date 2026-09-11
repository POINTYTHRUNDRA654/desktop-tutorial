#!/usr/bin/env python3
"""
fo4_association_types.py — FO4 Association Type (ASTP)
========================================================================
Sixth stop in the "grind it to zero" pass. Association Types define the
relationship-title vocabulary the game uses when describing how one
NPC/actor relates to another (parent/child titles by gender, and
whether it's a family relationship) -- referenced by RELA (Relationship)
records, which this project has not yet reached.

Trivially simple, source-verified (wbDefinitionsFO4.pas ~12184-12194):
EDID + 4 plain (non-localized) strings (Male/Female Parent Title,
Male/Female Child Title) + a single-bit DATA flags field (Family
Association). Every tag unique, no repeating groups.

Outputs:
  <scan-cache>/fo4_association_types.json
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
GRAPH_OUT = _OUT_DIR / "fo4_association_types.json"

COMPRESSED_FLAG = 0x00040000


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


def _extract_one_astp(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    male_parent = female_parent = male_child = female_child = None
    is_family = False

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "MPRT":
            male_parent = resolve_edid(d)
        elif tag == "FPRT":
            female_parent = resolve_edid(d)
        elif tag == "MCHT":
            male_child = resolve_edid(d)
        elif tag == "FCHT":
            female_child = resolve_edid(d)
        elif tag == "DATA" and len(d) >= 4:
            is_family = bool(struct.unpack_from("<I", d, 0)[0] & 0x01)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "male_parent_title": male_parent,
        "female_parent_title": female_parent,
        "male_child_title": male_child,
        "female_child_title": female_child,
        "is_family_association": is_family,
    }


def extract_astps(esm_path: Path) -> list[dict]:
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
        if rec_type == b"ASTP":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                a = _extract_one_astp(dec, form_id)
                if a is not None:
                    out.append(a)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_astps: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for association types...")
        all_astps.extend(extract_astps(esm_path))

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_association_types": len(all_astps),
        "association_types": all_astps,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Association type scan complete in {elapsed:.1f}s ===")
    print(f"  Total association types: {len(all_astps):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
