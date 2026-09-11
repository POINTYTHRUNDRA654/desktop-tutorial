#!/usr/bin/env python3
"""
fo4_actor_values.py — FO4 Actor Value Information (AVIF)
========================================================================
Second stop in the "grind it to zero" pass. AVIF is the record that
defines every Actor Value in the game -- SPECIAL stats, skills, AI
attributes, damage resistances, condition values (Health/Radiation/
etc.), charge meters, and internal engine variables -- each with its
own abbreviation, default value, and type classification. Everything
else this project has decoded that references an Actor Value by index
(MGEF's Actor Value formid, CSTY tuning, NPC stats) points back to one
of these records.

Trivially simple, source-verified (wbDefinitionsFO4.pas ~11002-11050):
EDID, FULL (name), DESC (description), ANAM (Abbreviation, lstring),
NAM0 (Default Value, float), AVFL (Flags, u32 -- mostly unlabeled bits
in xEdit itself; the handful with real names, e.g. "Percentage",
"Damage Is Positive", "Hardcoded", are decoded, the rest kept as a raw
hex value rather than invented), NAM1 (Type, u32 enum: Derived
Attribute/Special/Skill/AI Attribute/Resistance/Condition/Charge/Int
Value/Variable/Resource). Every tag unique, no repeating groups.

Outputs:
  <scan-cache>/fo4_actor_values.json
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
GRAPH_OUT = _OUT_DIR / "fo4_actor_values.json"

COMPRESSED_FLAG = 0x00040000

AVIF_FLAGS = [
    (0x00100000, "Minimum 1"), (0x00200000, "Maximum 10"), (0x00400000, "Maximum 100"),
    (0x00800000, "Multiply By 100"), (0x01000000, "Percentage"),
    (0x04000000, "Damage Is Positive"), (0x08000000, "God Mode Immune"),
    (0x80000000, "Hardcoded"),
]
AVIF_TYPE = {0: "Derived Attribute", 1: "Special (Attribute)", 2: "Skill", 3: "AI Attribute",
             4: "Resistance", 5: "Condition", 6: "Charge", 7: "Int Value", 8: "Variable", 9: "Resource"}


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


def _extract_one_av(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    desc: str | None = None
    abbreviation: str | None = None
    default_value: float | None = None
    flags_raw: int | None = None
    av_type: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "DESC":
            desc = resolve_lstring(d, string_lookup)
        elif tag == "ANAM":
            abbreviation = resolve_lstring(d, string_lookup)
        elif tag == "NAM0" and len(d) == 4:
            default_value = round(struct.unpack_from("<f", d, 0)[0], 4)
        elif tag == "AVFL" and len(d) == 4:
            flags_raw = struct.unpack_from("<I", d, 0)[0]
        elif tag == "NAM1" and len(d) == 4:
            v = struct.unpack_from("<I", d, 0)[0]
            av_type = AVIF_TYPE.get(v, f"unknown_{v}")

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "description": desc,
        "abbreviation": abbreviation,
        "default_value": default_value,
        "flags": _decode_flags_bitfield(flags_raw, AVIF_FLAGS) if flags_raw is not None else [],
        "flags_raw": f"0x{flags_raw:08X}" if flags_raw is not None else None,
        "type": av_type,
    }


def extract_avs(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"AVIF":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                a = _extract_one_av(dec, form_id, string_lookup)
                if a is not None:
                    out.append(a)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}

    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_avs: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for actor values...")
        all_avs.extend(extract_avs(esm_path, string_lookup))

    by_type: dict[str, int] = {}
    for a in all_avs:
        t = a["type"] or "unknown"
        by_type[t] = by_type.get(t, 0) + 1

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_actor_values": len(all_avs),
        "by_type": by_type,
        "actor_values": all_avs,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Actor value scan complete in {elapsed:.1f}s ===")
    print(f"  Total actor values:   {len(all_avs):,}")
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"    {t}: {c}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
