#!/usr/bin/env python3
"""
fo4_armor_addons.py — FO4 Armor Addon (ARMA)
========================================================================
Nineteenth stop in the "grind it to zero" pass, third of the
"referenced but not deep" tier. Armor Addons are the actual 3D-model
layer an ARMO record's "Models" array points to — biped slot coverage
(the classic 30-61 equip-slot bitmask), male/female priority and
weight-slider variant flags, world/1st-person model filenames by
gender, skin texture overrides, additional valid races, and linked
footstep sound.

Source-verified (wbDefinitionsFO4.pas ~8755-8817):
  EDID, BOD2 (fixed 4-byte First Person Flags -- the same 30-61
    biped-slot bitmask as everywhere else in this engine), RNAM (Race
    FormID)
  DNAM — fixed 12-byte struct: Male Priority (u8), Female Priority
    (u8), Weight Slider - Male (u8 flags: Unknown 0/Enabled), Weight
    Slider - Female (u8 flags), 2 unused bytes, Detection Sound Value
    (u8), 1 unused byte, Weapon Adjust (f32)
  MOD2/MOD3/MOD4/MOD5 — Male World/Female World/Male 1st Person/Female
    1st Person model filenames (each its own unique tag, captured
    directly; the associated MO_T/MO_C/MO_S/MO_F texture/color/scale/
    flag subrecords are not decoded)
  NAM0/NAM1 (Male/Female Skin Texture FormIDs -> TXST)
  NAM2/NAM3 (Male/Female Skin Texture Swap List FormIDs -> FLST)
  MODL — reused here for a completely different purpose than the model
    filename tags above: source confirms ARMA's actual model filenames
    all use MOD2-MOD5, so a bare MODL tag in this record type
    exclusively means one "Additional Races" FormID array entry ->
    RACE; captured with that understanding rather than assumed shared
    with the model-filename meaning MODL carries in other records
  SNDD (Footstep Sound FormID -> FSTS)
  ONAM (Art Object FormID -> ARTO)

Outputs:
  <scan-cache>/fo4_armor_addons.json
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
GRAPH_OUT = _OUT_DIR / "fo4_armor_addons.json"

COMPRESSED_FLAG = 0x00040000

BIPED_OBJECT_FLAGS = [
    (0x00000001, "30 - Hair Top"), (0x00000002, "31 - Hair Long"), (0x00000004, "32 - FaceGen Head"),
    (0x00000008, "33 - BODY"), (0x00000010, "34 - L Hand"), (0x00000020, "35 - R Hand"),
    (0x00000040, "36 - [U] Torso"), (0x00000080, "37 - [U] L Arm"), (0x00000100, "38 - [U] R Arm"),
    (0x00000200, "39 - [U] L Leg"), (0x00000400, "40 - [U] R Leg"), (0x00000800, "41 - [A] Torso"),
    (0x00001000, "42 - [A] L Arm"), (0x00002000, "43 - [A] R Arm"), (0x00004000, "44 - [A] L Leg"),
    (0x00008000, "45 - [A] R Leg"), (0x00010000, "46 - Headband"), (0x00020000, "47 - Eyes"),
    (0x00040000, "48 - Beard"), (0x00080000, "49 - Mouth"), (0x00100000, "50 - Neck"),
    (0x00200000, "51 - Ring"), (0x00400000, "52 - Scalp"), (0x00800000, "53 - Decapitation"),
    (0x01000000, "54 - Unnamed"), (0x02000000, "55 - Unnamed"), (0x04000000, "56 - Unnamed"),
    (0x08000000, "57 - Unnamed"), (0x10000000, "58 - Unnamed"), (0x20000000, "59 - Shield"),
    (0x40000000, "60 - Pipboy"), (0x80000000, "61 - FX"),
]
WEIGHT_SLIDER_FLAGS = [(0x01, "Unknown 0"), (0x02, "Enabled")]


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


def parse_dnam(d: bytes) -> dict | None:
    if len(d) < 12:
        return None
    try:
        return {
            "male_priority": d[0],
            "female_priority": d[1],
            "weight_slider_male": _decode_flags_bitfield(d[2], WEIGHT_SLIDER_FLAGS),
            "weight_slider_female": _decode_flags_bitfield(d[3], WEIGHT_SLIDER_FLAGS),
            "detection_sound_value": d[6],
            "weapon_adjust": round(struct.unpack_from("<f", d, 8)[0], 5),
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


def _extract_one_arma(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    biped_flags: list[str] = []
    race: str | None = None
    data: dict | None = None
    male_world_model = female_world_model = male_1st_model = female_1st_model = None
    male_skin_texture = female_skin_texture = None
    male_skin_swap_list = female_skin_swap_list = None
    additional_races: list[str] = []
    footstep_sound: str | None = None
    art_object: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "BOD2" and len(d) >= 4:
            v = struct.unpack_from("<I", d, 0)[0]
            biped_flags = _decode_flags_bitfield(v, BIPED_OBJECT_FLAGS)
        elif tag == "RNAM":
            race = fid_hex(d)
        elif tag == "DNAM":
            data = parse_dnam(d)
        elif tag == "MOD2":
            male_world_model = resolve_string(d)
        elif tag == "MOD3":
            female_world_model = resolve_string(d)
        elif tag == "MOD4":
            male_1st_model = resolve_string(d)
        elif tag == "MOD5":
            female_1st_model = resolve_string(d)
        elif tag == "NAM0":
            male_skin_texture = fid_hex(d)
        elif tag == "NAM1":
            female_skin_texture = fid_hex(d)
        elif tag == "NAM2":
            male_skin_swap_list = fid_hex(d)
        elif tag == "NAM3":
            female_skin_swap_list = fid_hex(d)
        elif tag == "MODL":  # "Additional Races" here, not a model filename -- see module docstring
            fid = fid_hex(d)
            if fid:
                additional_races.append(fid)
        elif tag == "SNDD":
            footstep_sound = fid_hex(d)
        elif tag == "ONAM":
            art_object = fid_hex(d)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "biped_flags": biped_flags,
        "race": race,
        "data": data,
        "male_world_model": male_world_model,
        "female_world_model": female_world_model,
        "male_1st_person_model": male_1st_model,
        "female_1st_person_model": female_1st_model,
        "male_skin_texture": male_skin_texture,
        "female_skin_texture": female_skin_texture,
        "male_skin_swap_list": male_skin_swap_list,
        "female_skin_swap_list": female_skin_swap_list,
        "additional_races": additional_races,
        "footstep_sound": footstep_sound,
        "art_object": art_object,
    }


def extract_armas(esm_path: Path) -> list[dict]:
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
        if rec_type == b"ARMA":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                a = _extract_one_arma(dec, form_id)
                if a is not None:
                    out.append(a)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_armas: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for armor addons...")
        all_armas.extend(extract_armas(esm_path))

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_armor_addons": len(all_armas),
        "armor_addons": all_armas,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Armor addon scan complete in {elapsed:.1f}s ===")
    print(f"  Total armor addons: {len(all_armas):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
