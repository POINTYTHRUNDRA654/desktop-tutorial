#!/usr/bin/env python3
"""
fo4_body_part_data.py — FO4 Body Part Data (BPTD)
========================================================================
Ninth stop in the "grind it to zero" pass, and the first "careful
handling" record since SCEN — BPTD holds a *repeating* group ("Body
Parts") that is NOT wrapped in its own sub-length marker: it's a flat
stream of subrecords, one set per body part, back to back. Referenced
by RACE's GNAM (Body Part Data) field, which fo4_races.py already
captures as a FormID — this scanner decodes what it actually points to
(per-limb damage/severing/explosion/crippling behavior, hit chances,
gore effects, debris/decal spawning).

Source-verified (wbDefinitionsFO4.pas ~10885-10979):
  EDID
  MODL (top-level Model Filename string — appears once, before the
    repeating group; no other MODL tag exists inside a body part, so
    there is no ambiguity capturing it directly)
  Repeating "Body Parts" group (wbRStructSK([1], ...) — field index 1,
    BPTN, is the struct's nominal key field), each entry:
    BPTN (Part Name, lstring, EXPLICITLY marked "// optional" in
      source — NOT guaranteed present)
    BPNN (Part Node, string, marked required=True in source — THE
      one guaranteed-present field, used here as the reliable part
      boundary)
    BPNT (VATS Target, string, required=True)
    BPND (fixed-size struct, required=True) — Damage Mult, Explodable/
      Severable Debris+Explosion+DebrisScale FormIDs/floats, Cut Min/
      Max/Radius, Gore Effects Local Rotate X/Y, Cut Tesselation,
      Severable/Explodable Impact DataSet FormIDs, Explodable Limb
      Replacement Scale, Flags (u8 bitfield), Part Type (u8 enum),
      Health Percent, Actor Value FormID, To Hit Chance, Explosion
      Chance %, Non-Lethal Dismemberment Chance, 5x Debris/Decal
      Counts, Geometry Segment Index, On Cripple Art Object/Debris/
      Explosion/ImpactDataSet FormIDs + Debris Scale + 2 counts.
    NAM1 (Limb Replacement Model, required=True)
    NAM4 (Gore Effects Target Bone, required=True)
    NAM5 (Texture Files Hashes, raw bytes)
    ENAM (Hit Reaction Start), FNAM (Hit Reaction End)
    BNAM (Gore Effects Dismember Blood Art, FormID->ARTO)
    INAM (Gore Effects Blood Impact Material Type, FormID->MATT)
    JNAM (On Cripple Blood Impact Material Type, FormID->MATT)
    CNAM (Meat Cap TextureSet, FormID->TXST)
    NAM2 (Collar TextureSet, FormID->TXST)
    DNAM (Twist Variable Prefix, string)

Boundary technique (never-guess, source-order-only): since BPTN is the
only field explicitly marked optional, BPNN is used as the reliable
per-part boundary marker instead — every body part is guaranteed
exactly one BPNN. Walking subrecords in order, a new part begins
whenever BPTN or BPNN is seen while the part already in progress
already has its own Part Node set (i.e., we've looped back to the top
of the field list). This is the same forward-only positional technique
already verified in fo4_scenes.py's action/phase decoders, applied
here to a genuinely optional leading field.

Outputs:
  <scan-cache>/fo4_body_part_data.json
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
GRAPH_OUT = _OUT_DIR / "fo4_body_part_data.json"

COMPRESSED_FLAG = 0x00040000

BPND_FLAGS = [
    (0x01, "Severable"), (0x02, "Hit Reaction"), (0x04, "Hit Reaction - Default"),
    (0x08, "Explodable"), (0x10, "Cut - Meat Cap Sever"), (0x20, "On Cripple"),
    (0x40, "Explodable - Absolute Chance"), (0x80, "Show Cripple Geometry"),
]

PART_TYPE = {
    0: "Torso", 1: "Head1", 2: "Eye", 3: "LookAt", 4: "Fly Grab", 5: "Head2",
    6: "LeftArm1", 7: "LeftArm2", 8: "RightArm1", 9: "RightArm2",
    10: "LeftLeg1", 11: "LeftLeg2", 12: "LeftLeg3", 13: "RightLeg1", 14: "RightLeg2", 15: "RightLeg3",
    16: "Brain", 17: "Weapon", 18: "Root", 19: "COM", 20: "Pelvis", 21: "Camera",
    22: "Offset Root", 23: "Left Foot", 24: "Right Foot", 25: "Face Target Source",
}

# (field_name, type) in exact source order. type: 'f'=float32, 'fid'=formid(4), 'u8'=uint8
BPND_FIELDS = [
    ("damage_mult", "f"),
    ("explodable_debris", "fid"), ("explodable_explosion", "fid"), ("explodable_debris_scale", "f"),
    ("severable_debris", "fid"), ("severable_explosion", "fid"), ("severable_debris_scale", "f"),
    ("cut_min", "f"), ("cut_max", "f"), ("cut_radius", "f"),
    ("gore_local_rotate_x", "f"), ("gore_local_rotate_y", "f"), ("cut_tesselation", "f"),
    ("severable_impact_dataset", "fid"), ("explodable_impact_dataset", "fid"),
    ("explodable_limb_replacement_scale", "f"),
    ("flags", "u8"), ("part_type", "u8"), ("health_percent", "u8"),
    ("actor_value", "fid"),
    ("to_hit_chance", "u8"), ("explodable_explosion_chance_pct", "u8"),
    ("non_lethal_dismemberment_chance", "u8"),
    ("severable_debris_count", "u8"), ("explodable_debris_count", "u8"),
    ("severable_decal_count", "u8"), ("explodable_decal_count", "u8"),
    ("geometry_segment_index", "u8"),
    ("on_cripple_art_object", "fid"), ("on_cripple_debris", "fid"),
    ("on_cripple_explosion", "fid"), ("on_cripple_impact_dataset", "fid"),
    ("on_cripple_debris_scale", "f"),
    ("on_cripple_debris_count", "u8"), ("on_cripple_decal_count", "u8"),
]
_BPND_SIZE = sum(4 if t in ("f", "fid") else 1 for _, t in BPND_FIELDS)


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


def _decode_flags_bitfield(value: int, table) -> list[str]:
    return [name for bit, name in table if value & bit]


def parse_bpnd(d: bytes) -> dict | None:
    if len(d) < _BPND_SIZE:
        return None
    out = {}
    off = 0
    try:
        for name, t in BPND_FIELDS:
            if t == "f":
                out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
                off += 4
            elif t == "fid":
                out[name] = fid_hex(d[off:off + 4])
                off += 4
            else:  # u8
                out[name] = d[off]
                off += 1
    except (struct.error, IndexError):
        return None

    flags_raw = out.pop("flags")
    out["flags"] = _decode_flags_bitfield(flags_raw, BPND_FLAGS)
    out["part_type"] = PART_TYPE.get(out.get("part_type"), f"Unknown ({out.get('part_type')})")
    return out


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


def _new_part() -> dict:
    return {
        "part_name": None, "part_node": None, "vats_target": None, "data": None,
        "limb_replacement_model": None, "gore_target_bone": None,
        "hit_reaction_start": None, "hit_reaction_end": None,
        "dismember_blood_art": None, "blood_impact_material": None,
        "on_cripple_blood_impact_material": None,
        "meat_cap_textureset": None, "collar_textureset": None,
        "twist_variable_prefix": None,
    }


def _extract_one_bptd(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    model_path: str | None = None
    parts: list[dict] = []
    cur: dict | None = None

    def flush():
        nonlocal cur
        if cur is not None and (cur["part_node"] or cur["part_name"] or cur["data"]):
            parts.append(cur)
        cur = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "MODL":
            if model_path is None:
                model_path = resolve_string(d)
            else:
                # shouldn't happen per source (no MODL inside a body part), but never overwrite silently
                pass
        elif tag == "BPTN":
            if cur is not None and cur["part_node"] is not None:
                flush()
            if cur is None:
                cur = _new_part()
            cur["part_name"] = resolve_lstring(d, string_lookup)
        elif tag == "BPNN":
            if cur is not None and cur["part_node"] is not None:
                flush()
            if cur is None:
                cur = _new_part()
            cur["part_node"] = resolve_string(d)
        elif tag == "BPNT":
            if cur is None:
                cur = _new_part()
            cur["vats_target"] = resolve_string(d)
        elif tag == "BPND":
            if cur is None:
                cur = _new_part()
            cur["data"] = parse_bpnd(d)
        elif tag == "NAM1":
            if cur is None:
                cur = _new_part()
            cur["limb_replacement_model"] = resolve_string(d)
        elif tag == "NAM4":
            if cur is None:
                cur = _new_part()
            cur["gore_target_bone"] = resolve_string(d)
        elif tag == "ENAM":
            if cur is None:
                cur = _new_part()
            cur["hit_reaction_start"] = resolve_string(d)
        elif tag == "FNAM":
            if cur is None:
                cur = _new_part()
            cur["hit_reaction_end"] = resolve_string(d)
        elif tag == "BNAM":
            if cur is None:
                cur = _new_part()
            cur["dismember_blood_art"] = fid_hex(d)
        elif tag == "INAM":
            if cur is None:
                cur = _new_part()
            cur["blood_impact_material"] = fid_hex(d)
        elif tag == "JNAM":
            if cur is None:
                cur = _new_part()
            cur["on_cripple_blood_impact_material"] = fid_hex(d)
        elif tag == "CNAM":
            if cur is None:
                cur = _new_part()
            cur["meat_cap_textureset"] = fid_hex(d)
        elif tag == "NAM2":
            if cur is None:
                cur = _new_part()
            cur["collar_textureset"] = fid_hex(d)
        elif tag == "DNAM":
            if cur is None:
                cur = _new_part()
            cur["twist_variable_prefix"] = resolve_string(d)
        # NAM5 (texture file hashes, raw bytes) intentionally not decoded — no
        # source-verified semantic breakdown of the hash format, skipped
        # rather than guessed at.

    flush()

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "model_path": model_path,
        "body_part_count": len(parts),
        "body_parts": parts,
    }


def extract_bptds(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"BPTD":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                b = _extract_one_bptd(dec, form_id, string_lookup)
                if b is not None:
                    out.append(b)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_bptds: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for body part data...")
        all_bptds.extend(extract_bptds(esm_path, string_lookup))

    total_parts = sum(b["body_part_count"] for b in all_bptds)

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_body_part_data_records": len(all_bptds),
        "total_body_parts": total_parts,
        "bptd_size_bytes": _BPND_SIZE,
        "body_part_data": all_bptds,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Body part data scan complete in {elapsed:.1f}s ===")
    print(f"  Total BPTD records: {len(all_bptds):,}")
    print(f"  Total body parts:   {total_parts:,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
