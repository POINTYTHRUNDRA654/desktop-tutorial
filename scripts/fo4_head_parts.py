#!/usr/bin/env python3
"""
fo4_head_parts.py — FO4 Head Part (HDPT)
========================================================================
Eleventh stop in the "grind it to zero" pass. Head Parts are the
character-creation building blocks (face, hair, eyes, facial hair,
scars, eyebrows, meatcaps, teeth, "head rear") that compose an NPC's
head appearance — what model/textureset/color/race-morph data each
piece carries, what other head parts it pulls in as extras, and which
races it's valid for.

Note: EYES (a separate record type in older Bethesda games) is
explicitly commented out / unused in FO4's own xEdit source
(wbDefinitionsFO4.pas ~9803-9805 — `{wbRecord(EYES, ...)}`), confirming
FO4 does not use a standalone EYES record; eye appearance lives inside
HDPT (Type=Eyes) and RACE instead. Nothing skipped there — there is
genuinely nothing to decode.

Source-verified (wbDefinitionsFO4.pas ~10036-10078):
  EDID, FULL (name)
  MODL (top-level Model Filename string)
  DATA — single u8 flags byte (Playable/Male/Female/Is Extra Part/
    Use Solid Tint/Uses Body Texture)
  PNAM — u32 Type enum (Misc/Face/Eyes/Hair/Facial Hair/Scar/Eyebrows/
    Meatcaps/Teeth/Head Rear)
  HNAM — repeating array, one HNAM subrecord per "Extra Parts" entry
    (FormID -> HDPT; unlike IDLE's packed ANAM, each HNAM is its own
    separate 4-byte subrecord, confirmed by source's plain wbFormIDCk
    inside wbRArrayS)
  'Parts' repeating group — NAM0 (Part Type u32 enum: Race Morph/Tri/
    Chargen Morph) + NAM1 (Filename string), always paired; NAM0 always
    precedes its own NAM1 with no reuse before the next NAM0, so NAM0
    is used as the reliable per-entry boundary
  TNAM (Texture Set FormID -> TXST)
  CNAM (Color FormID -> CLFM)
  RNAM (Valid Races FormID -> FLST)
  Conditions (wbCTDAs — same 32-byte CTDA struct + optional CIS1/CIS2
    handled with the same last_ctda-tracking fix used throughout this
    project)

Outputs:
  <scan-cache>/fo4_head_parts.json
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
GRAPH_OUT = _OUT_DIR / "fo4_head_parts.json"

COMPRESSED_FLAG = 0x00040000

HDPT_DATA_FLAGS = [
    (0x01, "Playable"), (0x02, "Male"), (0x04, "Female"),
    (0x10, "Is Extra Part"), (0x20, "Use Solid Tint"), (0x40, "Uses Body Texture"),
]
HDPT_TYPE = ["Misc", "Face", "Eyes", "Hair", "Facial Hair", "Scar", "Eyebrows", "Meatcaps", "Teeth", "Head Rear"]
PART_TYPE = ["Race Morph", "Tri", "Chargen Morph"]


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


def resolve_lstring(sub_data: bytes, string_lookup: dict[int, str]) -> str | None:
    if len(sub_data) == 4:
        sid = struct.unpack_from("<I", sub_data, 0)[0]
        return string_lookup.get(sid)
    elif len(sub_data) > 1:
        return resolve_string(sub_data)
    return None


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
    return f"0x{v:08X}" if v else None


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 32:
        return None
    try:
        type_byte = d[0]
        comp_op = (type_byte >> 5) & 0x07
        flag_bits = type_byte & 0x1F
        comparison_raw = struct.unpack_from("<I", d, 4)[0]
        comparison_float = struct.unpack_from("<f", d, 4)[0]
        function = struct.unpack_from("<H", d, 8)[0]
        param1 = fid_hex(d[12:16])
        param2 = fid_hex(d[16:20])
        run_on = struct.unpack_from("<I", d, 20)[0]
        reference = fid_hex(d[24:28])
        param3 = struct.unpack_from("<i", d, 28)[0]
        use_global = bool(flag_bits & 0x04)
        return {
            "flags": {
                "or": bool(flag_bits & 0x01), "use_aliases": bool(flag_bits & 0x02),
                "use_global": use_global, "use_packdata": bool(flag_bits & 0x08),
                "swap_subject_target": bool(flag_bits & 0x10),
            },
            "compare_op": ["==", "!=", ">", ">=", "<", "<="][comp_op] if comp_op < 6 else f"op{comp_op}",
            "comparison_value": (f"0x{comparison_raw:08X}" if use_global else round(comparison_float, 5)),
            "function": function,
            "param1": param1, "param2": param2,
            "run_on": run_on, "reference": reference, "param3": param3,
            "cis1": None, "cis2": None,
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


def _extract_one_hdpt(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    data_flags: list[str] = []
    part_type: str | None = None
    extra_parts: list[str] = []
    parts: list[dict] = []
    cur_part: dict | None = None
    texture_set: str | None = None
    color: str | None = None
    valid_races: str | None = None
    conditions: list[dict] = []
    last_ctda: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "DATA" and len(d) >= 1:
            data_flags = _decode_flags_bitfield(d[0], HDPT_DATA_FLAGS)
        elif tag == "PNAM" and len(d) >= 4:
            v = struct.unpack_from("<I", d, 0)[0]
            part_type = HDPT_TYPE[v] if 0 <= v < len(HDPT_TYPE) else f"Unknown ({v})"
        elif tag == "HNAM":
            fid = fid_hex(d)
            if fid:
                extra_parts.append(fid)
        elif tag == "NAM0" and len(d) >= 4:
            if cur_part is not None:
                parts.append(cur_part)
            v = struct.unpack_from("<I", d, 0)[0]
            cur_part = {"part_type": PART_TYPE[v] if 0 <= v < len(PART_TYPE) else f"Unknown ({v})", "filename": None}
        elif tag == "NAM1":
            if cur_part is None:
                cur_part = {"part_type": None, "filename": None}
            cur_part["filename"] = resolve_string(d)
        elif tag == "TNAM":
            texture_set = fid_hex(d)
        elif tag == "CNAM":
            color = fid_hex(d)
        elif tag == "RNAM":
            valid_races = fid_hex(d)
        elif tag == "CTDA":
            c = parse_ctda(d)
            if c is not None:
                conditions.append(c)
                last_ctda = c
        elif tag == "CIS1":
            if last_ctda is not None:
                last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2":
            if last_ctda is not None:
                last_ctda["cis2"] = resolve_string(d)

    if cur_part is not None:
        parts.append(cur_part)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "model_path": model_path,
        "flags": data_flags,
        "type": part_type,
        "extra_parts": extra_parts,
        "parts": parts,
        "texture_set": texture_set,
        "color": color,
        "valid_races": valid_races,
        "conditions": conditions,
    }


def extract_hdpts(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"HDPT":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                h = _extract_one_hdpt(dec, form_id, string_lookup)
                if h is not None:
                    out.append(h)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_hdpts: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for head parts...")
        all_hdpts.extend(extract_hdpts(esm_path, string_lookup))

    by_type: dict[str, int] = {}
    for h in all_hdpts:
        t = h["type"] or "Unknown"
        by_type[t] = by_type.get(t, 0) + 1

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_head_parts": len(all_hdpts),
        "by_type": by_type,
        "head_parts": all_hdpts,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Head part scan complete in {elapsed:.1f}s ===")
    print(f"  Total head parts: {len(all_hdpts):,}")
    print(f"  By type: {by_type}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
