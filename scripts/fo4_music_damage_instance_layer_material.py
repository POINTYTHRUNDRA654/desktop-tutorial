#!/usr/bin/env python3
"""
fo4_music_damage_instance_layer_material.py — FO4 Music Type (MUSC) /
Music Track (MUST) / Damage Type (DMGT) / Instance Naming Rules (INNR)
/ Layer (LAYR) / Location Reference Type (LCRT) / Material Object
(MATO)
========================================================================
Forty-second stop in the "grind it to zero" pass, seventeenth of the
broader engine-plumbing sweep. Seven of the smaller remaining
engine-plumbing record types grouped into one scanner: Music Types are
the named music "buckets" (combat/exploration/etc.) every Location and
quest music cue references, each pulling from a playlist of Music
Tracks; Damage Types tie an Actor Value to the Spell that applies its
damage-resistance math; Instance Naming Rules drive the "Rusty",
"Pristine"-style automatic name-suffix system for leveled/legendary
items; Layers and Location Reference Types are small hierarchy/
tagging systems; Material Objects are the directional-material overlay
system used for wet/scorched surface effects.

Source-verified (wbDefinitionsFO4.pas LCRT ~9996-10000, MUSC
~11825-11842, MUST ~11928-11948, MATO ~12249-12269, DMGT ~15868-15878,
INNR ~15899-15949, LAYR ~15964-15967):

LCRT — EDID, CNAM (Color: R/G/B, 4 bytes) — the map-marker filter
  color for this location-reference type. TNAM deliberately not
  decoded (source itself marks it wbUnknown).

MUSC — EDID, FNAM (Flags: Plays One Selection/Abrupt Transition/Cycle
  Tracks/Maintain Track Order/Ducks Current Track/Doesn't Queue), PNAM
  (Priority u16 + Ducking dB u16, the latter source-scaled /100), WNAM
  (Fade Duration float), TNAM (Music Tracks array of FormID -> MUST).

MUST — EDID, CNAM (Track Type, hash-keyed enum: Palette/Single Track/
  Silent Track), FLTV (Duration float), DNAM (Fade-Out float), ANAM
  (Track Filename string), BNAM (Finale Filename string), LNAM (Loop
  Data: Loop Begins/Ends floats + Loop Count u32, 12 bytes), FNAM (Cue
  Points array of floats), Conditions (standard reused CTDA+CIS1/CIS2
  parser), SNAM (Tracks array of FormID -> MUST, for Palette-type
  tracks that fan out to sub-tracks).

DMGT — EDID, DNAM (a wbUnion keyed on the record's own FormVersion,
  read directly from the record header exactly like xEdit's decider,
  the same technique already established for EXPL/EFSH: FormVersion <
  78 gets an array of raw Actor Value u32 indices [legacy format,
  honestly labeled as such rather than guessed]; FormVersion >= 78
  gets an array of {Actor Value FormID -> AVIF, Spell FormID -> SPEL}
  8-byte struct pairs).

INNR — EDID, UNAM (Target enum: None/Armor/Actor/Furniture/Weapon),
  Naming Rules (a two-level repeating group: Rulesets boundary-keyed
  on VNAM [Count], each holding Names boundary-keyed on WNAM [Text
  LStringKC] with optional KWDA keywords, an XNAM Property struct
  [Value float, Target enum with 14 entries — Enchantments/
  BashImpactDataSet/BlockMaterial/Keywords/Weight/Value/Rating/
  AddonIndex/BodyPart/DamageTypeValues/ActorValues/Health/
  ColorRemappingIndex/MaterialSwaps — and a comparison Op enum], and a
  YNAM Index u16 — the exact rule set driving "Rusty"/"Pristine"-style
  automatic legendary/leveled item name suffixes).

LAYR — EDID, PNAM (Parent -> LAYR, a simple hierarchy chain).

MATO — EDID, MODL, Property Data (DNAM byte blobs deliberately not
  decoded — source itself marks them cpIgnore/wbNeverShow, internal/
  unused), DATA (Directional Material Data: Falloff Scale/Bias, Noise/
  Material UV Scale, a 3-float Projection Vector, Normal Dampener, a
  3-float Single Pass Color, Flags [Single Pass] — parsed with a
  running offset since source declares only the first 5 of 7 elements
  guaranteed present, same legacy-shrink pattern as EXPL/WTHR/LGTM/
  IMGS).

Outputs:
  <scan-cache>/fo4_music_damage_instance_layer_material.json
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
GRAPH_OUT = _OUT_DIR / "fo4_music_damage_instance_layer_material.json"

COMPRESSED_FLAG = 0x00040000
DMGT_FORM_VERSION_THRESHOLD = 78

MUSC_FLAGS = [
    (0x01, "Plays One Selection"), (0x02, "Abrupt Transition"), (0x04, "Cycle Tracks"),
    (0x08, "Maintain Track Order"), (0x10, "Unknown 5"), (0x20, "Ducks Current Track"),
    (0x40, "Doesn't Queue"),
]
MUST_TRACK_TYPE = {0x23F678C3: "Palette", 0x6ED7E048: "Single Track", 0xA1A9C4D5: "Silent Track"}
INNR_TARGET_ENUM = {0: "None", 0x1D: "Armor", 0x2D: "Actor", 0x2A: "Furniture", 0x2B: "Weapon"}
INNR_PROPERTY_TARGET_ENUM = [
    "Enchantments", "BashImpactDataSet", "BlockMaterial", "Keywords", "Weight", "Value",
    "Rating", "AddonIndex", "BodyPart", "DamageTypeValues", "ActorValues", "Health",
    "ColorRemappingIndex", "MaterialSwaps",
]
INNR_OP_ENUM = [">=", ">", "<=", "<", "="]
MATO_DATA_FIELDS = [
    ("falloff_scale", "float"), ("falloff_bias", "float"),
    ("noise_uv_scale", "float"), ("material_uv_scale", "float"),
    ("projection_vector", "vec3"), ("normal_dampener", "float"),
    ("single_pass_color", "color3f"), ("flags", "flags_u32"),
]
COMPARE_OPS = ["==", "!=", ">", ">=", "<", "<="]


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


def parse_fid_array(raw: bytes) -> list[str]:
    out = []
    for i in range(len(raw) // 4):
        v = fid_hex(raw[i * 4:i * 4 + 4])
        if v:
            out.append(v)
    return out


def parse_kwda(kwda: bytes) -> list[str]:
    return [f"0x{struct.unpack_from('<I', kwda, i * 4)[0]:08X}" for i in range(len(kwda) // 4)]


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 32:
        return None
    type_byte = d[0]
    comp_value = struct.unpack_from("<f", d, 4)[0]
    function = struct.unpack_from("<H", d, 8)[0]
    param1 = struct.unpack_from("<I", d, 12)[0]
    param2 = struct.unpack_from("<I", d, 16)[0]
    run_on = struct.unpack_from("<I", d, 20)[0]
    reference = struct.unpack_from("<I", d, 24)[0]
    param3 = struct.unpack_from("<i", d, 28)[0]
    op_index = (type_byte >> 5) & 0x07
    return {
        "operator": COMPARE_OPS[op_index] if op_index < len(COMPARE_OPS) else f"Unknown ({op_index})",
        "comparison_value": round(comp_value, 5), "function": function,
        "param1": f"0x{param1:08X}" if param1 else None,
        "param2": f"0x{param2:08X}" if param2 else None,
        "run_on": run_on,
        "reference": f"0x{reference:08X}" if reference else None,
        "param3": param3,
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


# ── LCRT ─────────────────────────────────────────────────────────────

def _extract_one_lcrt(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    color: dict | None = None
    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "CNAM" and len(d) >= 3:
            color = {"r": d[0], "g": d[1], "b": d[2]}
    if not edid:
        return None
    return {"record_type": "LCRT", "form_id": f"0x{form_id:08X}", "edid": edid, "color": color}


# ── MUSC ─────────────────────────────────────────────────────────────

def _extract_one_musc(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    flags_raw: int | None = None
    priority: int | None = None
    ducking_db: float | None = None
    fade_duration: float | None = None
    music_tracks: list[str] = []
    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FNAM" and len(d) >= 4:
            flags_raw = struct.unpack_from("<I", d, 0)[0]
        elif tag == "PNAM" and len(d) >= 4:
            priority = struct.unpack_from("<H", d, 0)[0]
            ducking_db = round(struct.unpack_from("<H", d, 2)[0] / 100.0, 5)
        elif tag == "WNAM" and len(d) >= 4:
            fade_duration = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag == "TNAM":
            music_tracks = parse_fid_array(d)
    if not edid:
        return None
    return {
        "record_type": "MUSC", "form_id": f"0x{form_id:08X}", "edid": edid,
        "flags": _decode_flags_bitfield(flags_raw, MUSC_FLAGS) if flags_raw is not None else [],
        "priority": priority, "ducking_db": ducking_db, "fade_duration": fade_duration,
        "music_tracks": music_tracks,
    }


# ── MUST ─────────────────────────────────────────────────────────────

def _extract_one_must(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    track_type: str | None = None
    duration: float | None = None
    fade_out: float | None = None
    track_filename: str | None = None
    finale_filename: str | None = None
    loop_data: dict | None = None
    cue_points: list[float] = []
    conditions: list[dict] = []
    last_ctda: dict | None = None
    tracks: list[str] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "CNAM" and len(d) >= 4:
            raw = struct.unpack_from("<I", d, 0)[0]
            track_type = MUST_TRACK_TYPE.get(raw, f"Unknown (0x{raw:08X})")
        elif tag == "FLTV" and len(d) >= 4:
            duration = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag == "DNAM" and len(d) >= 4:
            fade_out = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag == "ANAM":
            track_filename = resolve_string(d)
        elif tag == "BNAM":
            finale_filename = resolve_string(d)
        elif tag == "LNAM" and len(d) >= 12:
            loop_data = {
                "loop_begins": round(struct.unpack_from("<f", d, 0)[0], 5),
                "loop_ends": round(struct.unpack_from("<f", d, 4)[0], 5),
                "loop_count": struct.unpack_from("<I", d, 8)[0],
            }
        elif tag == "FNAM":
            cue_points = [round(struct.unpack_from("<f", d, i * 4)[0], 5) for i in range(len(d) // 4)]
        elif tag == "CTDA":
            ctda = parse_ctda(d)
            if ctda is not None:
                conditions.append(ctda)
                last_ctda = ctda
        elif tag in ("CIS1", "CIS2") and last_ctda is not None:
            last_ctda[f"param_string_{tag[-1]}"] = resolve_string(d)
        elif tag == "SNAM":
            tracks = parse_fid_array(d)

    if not edid:
        return None

    return {
        "record_type": "MUST", "form_id": f"0x{form_id:08X}", "edid": edid,
        "track_type": track_type, "duration": duration, "fade_out": fade_out,
        "track_filename": track_filename, "finale_filename": finale_filename,
        "loop_data": loop_data, "cue_points": cue_points,
        "conditions": conditions, "tracks": tracks,
    }


# ── DMGT ─────────────────────────────────────────────────────────────

def _extract_one_dmgt(dec: bytes, form_id: int, form_version: int) -> dict | None:
    edid: str | None = None
    damage_types: list = []
    legacy_format = form_version < DMGT_FORM_VERSION_THRESHOLD

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DNAM":
            if legacy_format:
                damage_types = [struct.unpack_from("<I", d, i * 4)[0] for i in range(len(d) // 4)]
            else:
                for i in range(len(d) // 8):
                    av = fid_hex(d[i * 8:i * 8 + 4])
                    spell = fid_hex(d[i * 8 + 4:i * 8 + 8])
                    damage_types.append({"actor_value": av, "spell": spell})

    if not edid:
        return None

    return {
        "record_type": "DMGT", "form_id": f"0x{form_id:08X}", "edid": edid,
        "form_version": form_version, "legacy_format": legacy_format,
        "damage_types": damage_types,
    }


# ── INNR ─────────────────────────────────────────────────────────────

def _extract_one_innr(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    target: str | None = None
    rulesets: list[dict] = []
    current_ruleset: dict | None = None
    current_name: dict | None = None

    def flush_name():
        nonlocal current_name
        if current_name is not None and current_ruleset is not None:
            current_ruleset["names"].append(current_name)
        current_name = None

    def flush_ruleset():
        nonlocal current_ruleset
        flush_name()
        if current_ruleset is not None:
            rulesets.append(current_ruleset)
        current_ruleset = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "UNAM" and len(d) >= 4:
            raw = struct.unpack_from("<I", d, 0)[0]
            target = INNR_TARGET_ENUM.get(raw, f"Unknown (0x{raw:X})")
        elif tag == "VNAM" and len(d) >= 4:
            flush_ruleset()
            current_ruleset = {"count": struct.unpack_from("<I", d, 0)[0], "names": []}
        elif tag == "WNAM":
            flush_name()
            current_name = {"text": resolve_lstring(d, string_lookup), "keywords": [], "property": None, "index": None}
        elif tag == "KWDA" and current_name is not None:
            current_name["keywords"] = parse_kwda(d)
        elif tag == "XNAM" and len(d) >= 6 and current_name is not None:
            value = round(struct.unpack_from("<f", d, 0)[0], 5)
            target_raw = d[4]
            op_raw = d[5]
            current_name["property"] = {
                "value": value,
                "target": INNR_PROPERTY_TARGET_ENUM[target_raw] if target_raw < len(INNR_PROPERTY_TARGET_ENUM) else f"Unknown ({target_raw})",
                "op": INNR_OP_ENUM[op_raw] if op_raw < len(INNR_OP_ENUM) else f"Unknown ({op_raw})",
            }
        elif tag == "YNAM" and len(d) >= 2 and current_name is not None:
            current_name["index"] = struct.unpack_from("<H", d, 0)[0]

    flush_ruleset()

    if not edid:
        return None

    return {
        "record_type": "INNR", "form_id": f"0x{form_id:08X}", "edid": edid,
        "target": target, "rulesets": rulesets,
    }


# ── LAYR ─────────────────────────────────────────────────────────────

def _extract_one_layr(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    parent: str | None = None
    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "PNAM":
            parent = fid_hex(d)
    if not edid:
        return None
    return {"record_type": "LAYR", "form_id": f"0x{form_id:08X}", "edid": edid, "parent": parent}


# ── MATO ─────────────────────────────────────────────────────────────

def _parse_mato_data(d: bytes) -> dict:
    out: dict = {}
    off = 0
    n = len(d)
    for name, kind in MATO_DATA_FIELDS:
        if kind == "float":
            if off + 4 > n:
                break
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
            off += 4
        elif kind == "vec3":
            if off + 12 > n:
                break
            out[name] = {
                "x": round(struct.unpack_from("<f", d, off)[0], 5),
                "y": round(struct.unpack_from("<f", d, off + 4)[0], 5),
                "z": round(struct.unpack_from("<f", d, off + 8)[0], 5),
            }
            off += 12
        elif kind == "color3f":
            if off + 12 > n:
                break
            out[name] = {
                "r": round(struct.unpack_from("<f", d, off)[0], 5),
                "g": round(struct.unpack_from("<f", d, off + 4)[0], 5),
                "b": round(struct.unpack_from("<f", d, off + 8)[0], 5),
            }
            off += 12
        elif kind == "flags_u32":
            if off + 4 > n:
                break
            raw = struct.unpack_from("<I", d, off)[0]
            out[name] = ["Single Pass"] if raw & 0x01 else []
            off += 4
    return out


def _extract_one_mato(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    model_path: str | None = None
    directional_material: dict = {}
    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "DATA":
            directional_material = _parse_mato_data(d)
    if not edid:
        return None
    return {
        "record_type": "MATO", "form_id": f"0x{form_id:08X}", "edid": edid,
        "model_path": model_path, "directional_material": directional_material,
    }


def extract_all(esm_path: Path, string_lookup: dict[int, str]):
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    lcrts: list[dict] = []
    muscs: list[dict] = []
    musts: list[dict] = []
    dmgts: list[dict] = []
    innrs: list[dict] = []
    layrs: list[dict] = []
    matos: list[dict] = []

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
        form_version = struct.unpack_from("<H", data, pos + 20)[0]
        pos += 24
        if pos + data_size > length:
            break
        targets = (b"LCRT", b"MUSC", b"MUST", b"DMGT", b"INNR", b"LAYR", b"MATO")
        if rec_type in targets:
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"LCRT":
                    r = _extract_one_lcrt(dec, form_id)
                    if r is not None:
                        lcrts.append(r)
                elif rec_type == b"MUSC":
                    r = _extract_one_musc(dec, form_id)
                    if r is not None:
                        muscs.append(r)
                elif rec_type == b"MUST":
                    r = _extract_one_must(dec, form_id)
                    if r is not None:
                        musts.append(r)
                elif rec_type == b"DMGT":
                    r = _extract_one_dmgt(dec, form_id, form_version)
                    if r is not None:
                        dmgts.append(r)
                elif rec_type == b"INNR":
                    r = _extract_one_innr(dec, form_id, string_lookup)
                    if r is not None:
                        innrs.append(r)
                elif rec_type == b"LAYR":
                    r = _extract_one_layr(dec, form_id)
                    if r is not None:
                        layrs.append(r)
                else:
                    r = _extract_one_mato(dec, form_id)
                    if r is not None:
                        matos.append(r)
        pos += data_size

    return lcrts, muscs, musts, dmgts, innrs, layrs, matos


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_lcrt: list[dict] = []
    all_musc: list[dict] = []
    all_must: list[dict] = []
    all_dmgt: list[dict] = []
    all_innr: list[dict] = []
    all_layr: list[dict] = []
    all_mato: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for music/damage/instance-naming/layer/loc-ref-type/material...")
        lcrt, musc, must, dmgt, innr, layr, mato = extract_all(esm_path, string_lookup)
        all_lcrt.extend(lcrt)
        all_musc.extend(musc)
        all_must.extend(must)
        all_dmgt.extend(dmgt)
        all_innr.extend(innr)
        all_layr.extend(layr)
        all_mato.extend(mato)

    palette_tracks = [m for m in all_must if m["track_type"] == "Palette"]
    modern_dmgt = [d for d in all_dmgt if not d["legacy_format"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_location_reference_types": len(all_lcrt),
        "total_music_types": len(all_musc),
        "total_music_tracks": len(all_must),
        "palette_music_tracks": len(palette_tracks),
        "total_damage_types": len(all_dmgt),
        "modern_format_damage_types": len(modern_dmgt),
        "total_instance_naming_rules": len(all_innr),
        "total_layers": len(all_layr),
        "total_material_objects": len(all_mato),
        "location_reference_types": all_lcrt,
        "music_types": all_musc,
        "music_tracks": all_must,
        "damage_types": all_dmgt,
        "instance_naming_rules": all_innr,
        "layers": all_layr,
        "material_objects": all_mato,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Music/Damage/Instance-Naming/Layer/LocRefType/Material scan complete in {elapsed:.1f}s ===")
    print(f"  Location Reference Types: {len(all_lcrt):,}")
    print(f"  Music Types: {len(all_musc):,}, Music Tracks: {len(all_must):,} ({len(palette_tracks):,} Palette)")
    print(f"  Damage Types: {len(all_dmgt):,} ({len(modern_dmgt):,} modern-format)")
    print(f"  Instance Naming Rules: {len(all_innr):,}")
    print(f"  Layers: {len(all_layr):,}")
    print(f"  Material Objects: {len(all_mato):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
