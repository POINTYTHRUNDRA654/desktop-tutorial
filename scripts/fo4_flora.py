#!/usr/bin/env python3
"""
fo4_flora.py — FO4 Flora (FLOR): harvestable plants
========================================================================
Fifth stop in the "grind it to zero" pass. Flora records are the
harvestable plants scattered through the world (mutfruit bushes, tato
plants, razorgrain, etc.) -- what Ingredient item they yield, what
sound plays on harvest, and per-season yield amounts (Spring/Summer/
Fall/Winter -- FO4's harvest system, unlike Skyrim's, scales output by
season).

Simple, source-verified (wbDefinitionsFO4.pas ~15178-15201): EDID, FULL
(required name), PFIG (Ingredient formid), SNAM (Harvest Sound formid),
RNAM (Activate Text Override, lstring), and a single fixed 4-byte PFPC
struct (Spring/Summer/Fall/Winter yield counts, u8 each). PNAM/FNAM are
undocumented even in xEdit itself (wbUnknown) -- not interpreted here.

Outputs:
  <scan-cache>/fo4_flora.json
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
GRAPH_OUT = _OUT_DIR / "fo4_flora.json"

COMPRESSED_FLAG = 0x00040000


def resolve_edid(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("ascii", errors="replace").strip()
        return text if text else None
    except Exception:
        return None


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


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
    return f"0x{v:08X}" if v else None


def parse_kwda(kwda: bytes) -> list[str]:
    return [f"0x{struct.unpack_from('<I', kwda, i * 4)[0]:08X}" for i in range(len(kwda) // 4)]


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


def _extract_one_flora(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    keywords: list[str] = []
    activate_text_override: str | None = None
    ingredient: str | None = None
    harvest_sound: str | None = None
    seasonal_yield: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "RNAM":
            activate_text_override = resolve_lstring(d, string_lookup)
        elif tag == "PFIG":
            ingredient = fid_hex(d)
        elif tag == "SNAM":
            harvest_sound = fid_hex(d)
        elif tag == "PFPC" and len(d) == 4:
            seasonal_yield = {"spring": d[0], "summer": d[1], "fall": d[2], "winter": d[3]}

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "keywords": keywords,
        "activate_text_override": activate_text_override,
        "ingredient": ingredient,
        "harvest_sound": harvest_sound,
        "seasonal_yield": seasonal_yield,
    }


def extract_flora(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"FLOR":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                f = _extract_one_flora(dec, form_id, string_lookup)
                if f is not None:
                    out.append(f)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_flora: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for flora...")
        all_flora.extend(extract_flora(esm_path, string_lookup))

    with_ingredient = [f for f in all_flora if f["ingredient"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_flora": len(all_flora),
        "flora_with_ingredient": len(with_ingredient),
        "flora": all_flora,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Flora scan complete in {elapsed:.1f}s ===")
    print(f"  Total flora:          {len(all_flora):,}")
    print(f"  With ingredient:      {len(with_ingredient):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
