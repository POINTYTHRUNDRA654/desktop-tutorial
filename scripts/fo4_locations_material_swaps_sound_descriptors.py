#!/usr/bin/env python3
"""
fo4_locations_material_swaps_sound_descriptors.py — FO4 Location (LCTN)
/ Material Swap (MSWP) / Sound Descriptor (SNDR)
========================================================================
Thirty-sixth stop in the "grind it to zero" pass, twelfth of the
broader engine-plumbing sweep. Locations are the named place hierarchy
every quest/encounter-zone/radiant-system query runs against ("is the
player in DiamondCity or any location whose parent is DiamondCity");
Material Swaps are the recolor/reskin system referenced by OMOD's
MaterialSwaps property (decoded last session) and ARMO/STAT alternate-
material mods; Sound Descriptors (SNDR) are the modern sound-file
wrapper that has replaced the legacy SOUN system almost everywhere —
virtually every FormIDCk('Sound'...) elsewhere in this project's
scanners points at one of these.

Source-verified (wbDefinitionsFO4.pas LCTN ~11214-11318, MSWP
~16003-16017, SNDR ~12284-12333, decider ~2838-2857):

LCTN — record header flags Unknown 11 (bit 11) / Partial Form (bit 14)
  (comments and bit index agree here, no gotcha). EDID, FULL, KSIZ/
  KWDA, PNAM (Parent Location -> LCTN, the hierarchy link), NAM1
  (Music -> MUSC), FNAM (Unreported Crime Faction -> FACT), MNAM
  (World Location Marker Ref), RNAM (World Location Radius, float),
  ANAM (Actor Fade Mult, float), CNAM (Map Color RGB). Not decoded (no
  modding value / auto-generated cell-placement bookkeeping that CK
  regenerates rather than mods hand-editing, consistent with the rest
  of this project): the fourteen ACPR/LCPR/RCPR/ACUN/LCUN/RCUN/ACSR/
  LCSR/RCSR/ACEC/LCEC/RCEC/ACID/LCID/ACEP/LCEP cell-reference arrays.

MSWP — record header flag Custom Swap (bit 16). EDID, first FNAM (Tree
  Folder), Material Substitutions (repeating group boundary-keyed on
  BNAM [Original Material path] each with SNAM [Replacement Material
  path] and CNAM [Color Remapping Index, float]).

SNDR — EDID, NNAM (Notes), CNAM (Descriptor Type — a 4-byte hash
  compared against three known values: Standard/Compound/AutoWeapon,
  decoded via direct hash lookup since the source itself only ever
  compares against these three constants), GNAM (Category -> SNCT),
  SNAM (Alternate Sound For -> SNDR), Sounds (repeating ANAM File Name
  array), ONAM (Output Model -> SOPM), Conditions, LNAM (Values:
  Looping enum [None/Loop/Envelope Fast/Envelope Slow], Sidechain,
  Rumble Send Value), BNAM (on-disk union resolved by its own byte
  length rather than needing the CNAM cross-reference: a 6-byte
  "Values" struct [% Frequency Shift/% Frequency Variance/Priority/db
  Variance/Static Attenuation] for Standard/Compound descriptors, or a
  4-byte Base Descriptor FormID for AutoWeapon descriptors), Descriptors
  (repeating DNAM FormID array), Rates of Fire (repeating marker-
  bounded group: RoF in RPM + File name, for AutoWeapon variable-rate
  weapons).

Outputs:
  <scan-cache>/fo4_locations_material_swaps_sound_descriptors.json
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
GRAPH_OUT = _OUT_DIR / "fo4_locations_material_swaps_sound_descriptors.json"

COMPRESSED_FLAG = 0x00040000

LCTN_HEADER_FLAGS = [(1 << 11, "Unknown 11"), (1 << 14, "Partial Form")]
MSWP_HEADER_FLAGS = [(1 << 16, "Custom Swap")]

SNDR_DESCRIPTOR_TYPE = {0x1EEF540A: "Standard", 0x54651A43: "Compound", 0xED157AE3: "AutoWeapon"}
SNDR_LOOPING = {0x00: "None", 0x08: "Loop", 0x10: "Envelope Fast", 0x20: "Envelope Slow"}

CTDA_COMPARE_OPS = ["==", "!=", ">", ">=", "<", "<="]


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


def parse_kwda(kwda: bytes) -> list[str]:
    return [f"0x{struct.unpack_from('<I', kwda, i * 4)[0]:08X}" for i in range(len(kwda) // 4)]


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 28:
        return None
    type_byte = d[0]
    op = CTDA_COMPARE_OPS[(type_byte >> 5) & 0x07]
    flags = {
        "or": bool(type_byte & 0x01), "use_aliases": bool(type_byte & 0x02),
        "use_global": bool(type_byte & 0x04), "use_packdata": bool(type_byte & 0x08),
        "swap_subject_target": bool(type_byte & 0x10),
    }
    comp_val = struct.unpack_from("<f", d, 4)[0]
    function = struct.unpack_from("<H", d, 8)[0]
    param1 = fid_hex(d[12:16])
    param2 = fid_hex(d[16:20])
    run_on = struct.unpack_from("<I", d, 20)[0]
    reference = fid_hex(d[24:28])
    param3 = struct.unpack_from("<i", d, 28)[0] if len(d) >= 32 else None
    return {
        "operator": op, "flags": flags, "comparison_value": round(comp_val, 4),
        "function": function, "param1": param1, "param2": param2,
        "run_on": run_on, "reference": reference, "param3": param3,
        "cis1": None, "cis2": None,
    }


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


# ── LCTN ─────────────────────────────────────────────────────────────

def _extract_one_lctn(dec: bytes, form_id: int, header_flags_raw: int) -> dict | None:
    edid: str | None = None
    full: str | None = None
    keywords: list[str] = []
    parent_location: str | None = None
    music: str | None = None
    crime_faction: str | None = None
    marker_ref: str | None = None
    radius: float | None = None
    actor_fade_mult: float | None = None
    map_color: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_string(d)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "PNAM":
            parent_location = fid_hex(d)
        elif tag == "NAM1":
            music = fid_hex(d)
        elif tag == "FNAM":
            crime_faction = fid_hex(d)
        elif tag == "MNAM":
            marker_ref = fid_hex(d)
        elif tag == "RNAM" and len(d) >= 4:
            radius = round(struct.unpack_from("<f", d, 0)[0], 4)
        elif tag == "ANAM" and len(d) >= 4:
            actor_fade_mult = round(struct.unpack_from("<f", d, 0)[0], 4)
        elif tag == "CNAM" and len(d) >= 3:
            map_color = {"red": d[0], "green": d[1], "blue": d[2]}

    if not edid:
        return None

    return {
        "record_type": "LCTN", "form_id": f"0x{form_id:08X}", "edid": edid, "full_name": full,
        "header_flags": _decode_flags_bitfield(header_flags_raw, LCTN_HEADER_FLAGS),
        "keywords": keywords, "parent_location": parent_location, "music": music,
        "unreported_crime_faction": crime_faction, "world_location_marker_ref": marker_ref,
        "world_location_radius": radius, "actor_fade_mult": actor_fade_mult, "map_color": map_color,
    }


# ── MSWP ─────────────────────────────────────────────────────────────

def _extract_one_mswp(dec: bytes, form_id: int, header_flags_raw: int) -> dict | None:
    edid: str | None = None
    tree_folder: str | None = None
    substitutions: list[dict] = []
    cur_sub: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "BNAM":
            if cur_sub is not None:
                substitutions.append(cur_sub)
            cur_sub = {"original_material": resolve_string(d), "replacement_material": None, "color_remapping_index": None}
        elif tag == "SNAM" and cur_sub is not None:
            cur_sub["replacement_material"] = resolve_string(d)
        elif tag == "FNAM":
            if cur_sub is None:
                tree_folder = resolve_string(d)
        elif tag == "CNAM" and cur_sub is not None and len(d) >= 4:
            cur_sub["color_remapping_index"] = round(struct.unpack_from("<f", d, 0)[0], 4)

    if cur_sub is not None:
        substitutions.append(cur_sub)

    if not edid:
        return None

    return {
        "record_type": "MSWP", "form_id": f"0x{form_id:08X}", "edid": edid,
        "header_flags": _decode_flags_bitfield(header_flags_raw, MSWP_HEADER_FLAGS),
        "tree_folder": tree_folder, "substitutions": substitutions,
    }


# ── SNDR ─────────────────────────────────────────────────────────────

def _extract_one_sndr(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    notes: str | None = None
    descriptor_type: str | None = None
    category: str | None = None
    alternate_sound_for: str | None = None
    sound_files: list[str] = []
    output_model: str | None = None
    conditions: list[dict] = []
    values: dict | None = None
    data_union: dict | None = None
    descriptors: list[str] = []
    rates_of_fire: list[dict] = []

    last_ctda: dict | None = None
    cur_rof: dict | None = None
    in_rof = False

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "NNAM":
            notes = resolve_string(d)
        elif tag == "CNAM" and len(d) >= 4:
            v = struct.unpack_from("<I", d, 0)[0]
            descriptor_type = SNDR_DESCRIPTOR_TYPE.get(v, f"Unknown (0x{v:08X})")
        elif tag == "GNAM":
            category = fid_hex(d)
        elif tag == "SNAM":
            alternate_sound_for = fid_hex(d)
        elif tag == "ANAM":
            fn = resolve_string(d)
            if fn:
                sound_files.append(fn)
        elif tag == "ONAM":
            output_model = fid_hex(d)
        elif tag == "CTDA":
            last_ctda = parse_ctda(d)
            if last_ctda:
                conditions.append(last_ctda)
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["cis2"] = resolve_string(d)
        elif tag == "LNAM" and len(d) >= 4:
            looping = d[1]
            values = {
                "looping": SNDR_LOOPING.get(looping, f"Unknown ({looping})"),
                "sidechain": d[2], "rumble_send_value": d[3],
            }
        elif tag == "BNAM":
            if len(d) == 6:
                freq_shift = struct.unpack_from("<b", d, 0)[0]
                freq_variance = struct.unpack_from("<b", d, 1)[0]
                priority = d[2]
                db_variance = d[3]
                static_atten = struct.unpack_from("<H", d, 4)[0] / 100.0
                data_union = {
                    "kind": "values", "frequency_shift_pct": freq_shift, "frequency_variance_pct": freq_variance,
                    "priority": priority, "db_variance": db_variance, "static_attenuation_db": round(static_atten, 2),
                }
            elif len(d) == 4:
                data_union = {"kind": "base_descriptor", "base_descriptor": fid_hex(d)}
        elif tag == "DNAM":
            fid = fid_hex(d)
            if fid:
                descriptors.append(fid)
        elif tag == "ITMS":
            cur_rof = {"rof_rpm": None, "file": None}
            in_rof = True
        elif tag == "INTV" and in_rof and cur_rof is not None and len(d) >= 4:
            cur_rof["rof_rpm"] = struct.unpack_from("<I", d, 0)[0]
        elif tag == "FNAM" and in_rof and cur_rof is not None:
            cur_rof["file"] = resolve_string(d)
        elif tag == "ITME":
            if cur_rof is not None:
                rates_of_fire.append(cur_rof)
            cur_rof = None
            in_rof = False

    if not edid:
        return None

    return {
        "record_type": "SNDR", "form_id": f"0x{form_id:08X}", "edid": edid, "notes": notes,
        "descriptor_type": descriptor_type, "category": category, "alternate_sound_for": alternate_sound_for,
        "sound_files": sound_files, "output_model": output_model, "conditions": conditions,
        "values": values, "data": data_union, "descriptors": descriptors, "rates_of_fire": rates_of_fire,
    }


def extract_all(esm_path: Path) -> tuple[list[dict], list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    lctn_out: list[dict] = []
    mswp_out: list[dict] = []
    sndr_out: list[dict] = []

    if data[:4] != b"TES4":
        print(f"  WARNING: {esm_path.name} doesn't start with TES4")

    while pos + 24 <= length:
        rec_type = data[pos:pos + 4]
        if rec_type == b"GRUP":
            pos += 24
            continue
        data_size    = struct.unpack_from("<I", data, pos + 4)[0]
        header_flags = struct.unpack_from("<I", data, pos + 8)[0]
        form_id      = struct.unpack_from("<I", data, pos + 12)[0]
        pos += 24
        if pos + data_size > length:
            break
        if rec_type in (b"LCTN", b"MSWP", b"SNDR"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"LCTN":
                    r = _extract_one_lctn(dec, form_id, header_flags)
                    if r is not None:
                        lctn_out.append(r)
                elif rec_type == b"MSWP":
                    r = _extract_one_mswp(dec, form_id, header_flags)
                    if r is not None:
                        mswp_out.append(r)
                else:
                    r = _extract_one_sndr(dec, form_id)
                    if r is not None:
                        sndr_out.append(r)
        pos += data_size

    return lctn_out, mswp_out, sndr_out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_lctn: list[dict] = []
    all_mswp: list[dict] = []
    all_sndr: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for locations/material swaps/sound descriptors...")
        lctn, mswp, sndr = extract_all(esm_path)
        all_lctn.extend(lctn)
        all_mswp.extend(mswp)
        all_sndr.extend(sndr)

    with_parent = [l for l in all_lctn if l["parent_location"]]
    autoweapon_sndr = [s for s in all_sndr if s["descriptor_type"] == "AutoWeapon"]
    with_rof = [s for s in all_sndr if s["rates_of_fire"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_locations": len(all_lctn),
        "locations_with_parent": len(with_parent),
        "total_material_swaps": len(all_mswp),
        "total_sound_descriptors": len(all_sndr),
        "autoweapon_sound_descriptors": len(autoweapon_sndr),
        "sound_descriptors_with_rate_of_fire": len(with_rof),
        "locations": all_lctn,
        "material_swaps": all_mswp,
        "sound_descriptors": all_sndr,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Location/Material Swap/Sound Descriptor scan complete in {elapsed:.1f}s ===")
    print(f"  Total locations: {len(all_lctn):,} ({len(with_parent):,} with parent)")
    print(f"  Total material swaps: {len(all_mswp):,}")
    print(f"  Total sound descriptors: {len(all_sndr):,} ({len(autoweapon_sndr):,} AutoWeapon, {len(with_rof):,} with rate-of-fire data)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
