#!/usr/bin/env python3
"""
fo4_hazards.py — FO4 Hazard (HAZD): radiation clouds, gas, fire, etc.
========================================================================
Fourth stop in the "grind it to zero" pass. Hazard records define the
persistent area-effect clouds/fields spawned by things like radiation
leaks, gas traps, and grenade lingering damage -- how far they spread,
how long they last, how often they tick, and what Spell/Enchantment
effect they actually apply.

Simple, source-verified (wbDefinitionsFO4.pas ~10207-10236): EDID, FULL
(name), MNAM (Image Space Modifier formid), and a single fixed 52-byte
DNAM struct (Limit u32, Radius f32, Lifetime f32, Image Space Radius
f32, Target Interval f32, Flags u32 [Affects Player Only/Inherit
Duration from Spawn Spell/Align to Impact Normal/Inherit Radius from
Spawn Spell/Drop to Ground/Taper Effectiveness by Proximity], Effect
formid [SPEL/ENCH], Light formid, Impact Data Set formid, Sound formid,
Taper Effectiveness {Full Effect Radius f32, Taper Weight f32, Taper
Curve f32}). One tag per field, no repeating groups.

Outputs:
  <scan-cache>/fo4_hazards.json
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
GRAPH_OUT = _OUT_DIR / "fo4_hazards.json"

COMPRESSED_FLAG = 0x00040000

HAZD_FLAGS = [
    (0x01, "Affects Player Only"), (0x02, "Inherit Duration from Spawn Spell"),
    (0x04, "Align to Impact Normal"), (0x08, "Inherit Radius from Spawn Spell"),
    (0x10, "Drop to Ground"), (0x20, "Taper Effectiveness by Proximity"),
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


def parse_dnam(d: bytes) -> dict | None:
    if len(d) < 52:
        return None
    try:
        flags_raw = struct.unpack_from("<I", d, 20)[0]
        return {
            "limit": struct.unpack_from("<I", d, 0)[0],
            "radius": round(struct.unpack_from("<f", d, 4)[0], 4),
            "lifetime": round(struct.unpack_from("<f", d, 8)[0], 4),
            "image_space_radius": round(struct.unpack_from("<f", d, 12)[0], 4),
            "target_interval": round(struct.unpack_from("<f", d, 16)[0], 4),
            "flags": _decode_flags_bitfield(flags_raw, HAZD_FLAGS),
            "effect": fid_hex(d[24:28]),
            "light": fid_hex(d[28:32]),
            "impact_data_set": fid_hex(d[32:36]),
            "sound": fid_hex(d[36:40]),
            "taper_effectiveness": {
                "full_effect_radius": round(struct.unpack_from("<f", d, 40)[0], 4),
                "taper_weight": round(struct.unpack_from("<f", d, 44)[0], 4),
                "taper_curve": round(struct.unpack_from("<f", d, 48)[0], 4),
            },
        }
    except (struct.error, IndexError):
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


def _extract_one_hazard(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    image_space_modifier: str | None = None
    data: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MNAM":
            image_space_modifier = fid_hex(d)
        elif tag == "DNAM":
            data = parse_dnam(d)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "image_space_modifier": image_space_modifier,
        "data": data,
    }


def extract_hazards(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
    data_bytes = esm_path.read_bytes()
    length = len(data_bytes)
    pos = 0
    out: list[dict] = []

    if data_bytes[:4] != b"TES4":
        print(f"  WARNING: {esm_path.name} doesn't start with TES4")

    while pos + 24 <= length:
        rec_type = data_bytes[pos:pos + 4]
        if rec_type == b"GRUP":
            pos += 24
            continue
        data_size = struct.unpack_from("<I", data_bytes, pos + 4)[0]
        flags     = struct.unpack_from("<I", data_bytes, pos + 8)[0]
        form_id   = struct.unpack_from("<I", data_bytes, pos + 12)[0]
        pos += 24
        if pos + data_size > length:
            break
        if rec_type == b"HAZD":
            raw = data_bytes[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                h = _extract_one_hazard(dec, form_id, string_lookup)
                if h is not None:
                    out.append(h)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_hazards: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for hazards...")
        all_hazards.extend(extract_hazards(esm_path, string_lookup))

    with_effect = [h for h in all_hazards if h["data"] and h["data"].get("effect")]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_hazards": len(all_hazards),
        "hazards_with_effect": len(with_effect),
        "hazards": all_hazards,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Hazard scan complete in {elapsed:.1f}s ===")
    print(f"  Total hazards:      {len(all_hazards):,}")
    print(f"  With effect:        {len(with_effect):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
