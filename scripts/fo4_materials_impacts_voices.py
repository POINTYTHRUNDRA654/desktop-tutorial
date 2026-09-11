#!/usr/bin/env python3
"""
fo4_materials_impacts_voices.py — FO4 Material Type (MATT) / Impact (IPCT) / Voice Type (VTYP)
========================================================================
Thirtieth stop in the "grind it to zero" pass, sixth of the broader
engine-plumbing sweep. Three small, simple record types combined for
efficient coverage: Material Types classify every surface (stone,
wood, flesh, metal) for footstep sounds and impact routing (already
referenced by IPDS's per-material Impact lookup, IPDS itself
deep-decoded earlier in this project); Impacts are the actual decal/
particle/sound response an IPDS entry points a material+projectile
combo at; Voice Types tag NPC dialogue actors as default-dialog-
eligible and/or female for VTYP-keyed voice line selection.

Source-verified (wbDefinitionsFO4.pas MATT ~11134-11152, IPCT
~11154-11187, VTYP ~11126-11132):

MATT:
  EDID, PNAM (Material Parent FormID -> MATT, for inheritance chains
    like "Stone" -> "StoneRubble"), MNAM (Material Name string, the
    Havok physics material identifier), CNAM (Havok Display Color --
    stored as 3 FLOATS not bytes, editor-scaled 0-255), BNAM (Buoyancy
    float), FNAM (Flags u32: Stair Material/Arrows Stick/Can Tunnel),
    HNAM (Havok Impact Data Set FormID -> IPDS), ANAM (Breakable FX
    string)
  Not decoded: MODT (texture hash data, no modding value)

IPCT:
  EDID, MODL
  DATA — fixed 24-byte struct: Effect Duration (f32), Effect
    Orientation (u32 enum: Surface Normal/Projectile Vector/Projectile
    Reflection), Angle Threshold (f32), Placement Radius (f32), Sound
    Level (u32 enum), Flags (u8: No Decal Data), Impact Result (u8
    enum: Default/Destroy/Bounce/Impale/Stick)
  DNAM (Texture Set -> TXST), ENAM (Secondary Texture Set -> TXST),
    SNAM (Sound 1 -> SNDR), NAM1 (Sound 2 -> SNDR), NAM3 (Footstep
    Explosion -> EXPL), NAM2 (Hazard -> HAZD), FNAM (Footstep Particle
    Max Dist, float -- a different meaning from every other record
    type's FNAM tag, correctly scoped since this parser only ever
    calls it within an IPCT record)
  Not decoded: DODT (decal placement data, no modding value)

VTYP:
  EDID, DNAM (u8 bitfield: Allow Default Dialog, Female)

Outputs:
  <scan-cache>/fo4_materials_impacts_voices.json
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
GRAPH_OUT = _OUT_DIR / "fo4_materials_impacts_voices.json"

COMPRESSED_FLAG = 0x00040000

MATT_FLAGS = [(0x01, "Stair Material"), (0x02, "Arrows Stick"), (0x04, "Can Tunnel")]
IPCT_ORIENTATION = {0: "Surface Normal", 1: "Projectile Vector", 2: "Projectile Reflection"}
IPCT_SOUND_LEVEL = {0: "Loud", 1: "Normal", 2: "Silent", 3: "Very Loud", 4: "Quiet"}
IPCT_RESULT = {0: "Default", 1: "Destroy", 2: "Bounce", 3: "Impale", 4: "Stick"}
IPCT_FLAGS = [(0x01, "No Decal Data")]
VTYP_FLAGS = [(0x01, "Allow Default Dialog"), (0x02, "Female")]


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


def _extract_one_matt(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    material_parent: str | None = None
    material_name: str | None = None
    color: dict | None = None
    buoyancy: float | None = None
    flags: list[str] = []
    havok_impact_data_set: str | None = None
    breakable_fx: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "PNAM":
            material_parent = fid_hex(d)
        elif tag == "MNAM":
            material_name = resolve_string(d)
        elif tag == "CNAM" and len(d) >= 12:
            color = {
                "r": round(struct.unpack_from("<f", d, 0)[0], 3),
                "g": round(struct.unpack_from("<f", d, 4)[0], 3),
                "b": round(struct.unpack_from("<f", d, 8)[0], 3),
            }
        elif tag == "BNAM" and len(d) >= 4:
            buoyancy = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag == "FNAM" and len(d) >= 4:
            v = struct.unpack_from("<I", d, 0)[0]
            flags = _decode_flags_bitfield(v, MATT_FLAGS)
        elif tag == "HNAM":
            havok_impact_data_set = fid_hex(d)
        elif tag == "ANAM":
            breakable_fx = resolve_string(d)

    if not edid:
        return None

    return {
        "record_type": "MATT",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "material_parent": material_parent,
        "material_name": material_name,
        "color": color,
        "buoyancy": buoyancy,
        "flags": flags,
        "havok_impact_data_set": havok_impact_data_set,
        "breakable_fx": breakable_fx,
    }


def _extract_one_ipct(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    model_path: str | None = None
    duration = orientation = angle_threshold = placement_radius = None
    sound_level = flags = None
    impact_result = None
    texture_set = secondary_texture_set = None
    sound_1 = sound_2 = None
    footstep_explosion = hazard = None
    footstep_particle_max_dist: float | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "DATA" and len(d) >= 18:
            duration = round(struct.unpack_from("<f", d, 0)[0], 5)
            orientation_raw = struct.unpack_from("<I", d, 4)[0]
            orientation = IPCT_ORIENTATION.get(orientation_raw, f"Unknown ({orientation_raw})")
            angle_threshold = round(struct.unpack_from("<f", d, 8)[0], 5)
            placement_radius = round(struct.unpack_from("<f", d, 12)[0], 5)
            sound_level_raw = struct.unpack_from("<I", d, 16)[0]
            sound_level = IPCT_SOUND_LEVEL.get(sound_level_raw, f"Unknown ({sound_level_raw})")
            if len(d) >= 21:
                flags = _decode_flags_bitfield(d[20], IPCT_FLAGS)
                impact_result_raw = d[21]
                impact_result = IPCT_RESULT.get(impact_result_raw, f"Unknown ({impact_result_raw})")
        elif tag == "DNAM":
            texture_set = fid_hex(d)
        elif tag == "ENAM":
            secondary_texture_set = fid_hex(d)
        elif tag == "SNAM":
            sound_1 = fid_hex(d)
        elif tag == "NAM1":
            sound_2 = fid_hex(d)
        elif tag == "NAM3":
            footstep_explosion = fid_hex(d)
        elif tag == "NAM2":
            hazard = fid_hex(d)
        elif tag == "FNAM" and len(d) >= 4:
            footstep_particle_max_dist = round(struct.unpack_from("<f", d, 0)[0], 5)

    if not edid:
        return None

    return {
        "record_type": "IPCT",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "model_path": model_path,
        "effect_duration": duration,
        "effect_orientation": orientation,
        "angle_threshold": angle_threshold,
        "placement_radius": placement_radius,
        "sound_level": sound_level,
        "flags": flags or [],
        "impact_result": impact_result,
        "texture_set": texture_set,
        "secondary_texture_set": secondary_texture_set,
        "sound_1": sound_1,
        "sound_2": sound_2,
        "footstep_explosion": footstep_explosion,
        "hazard": hazard,
        "footstep_particle_max_dist": footstep_particle_max_dist,
    }


def _extract_one_vtyp(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    flags: list[str] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DNAM" and len(d) >= 1:
            flags = _decode_flags_bitfield(d[0], VTYP_FLAGS)

    if not edid:
        return None

    return {"record_type": "VTYP", "form_id": f"0x{form_id:08X}", "edid": edid, "flags": flags}


def extract_all(esm_path: Path) -> tuple[list[dict], list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    matt_out: list[dict] = []
    ipct_out: list[dict] = []
    vtyp_out: list[dict] = []

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
        if rec_type in (b"MATT", b"IPCT", b"VTYP"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"MATT":
                    r = _extract_one_matt(dec, form_id)
                    if r is not None:
                        matt_out.append(r)
                elif rec_type == b"IPCT":
                    r = _extract_one_ipct(dec, form_id)
                    if r is not None:
                        ipct_out.append(r)
                else:
                    r = _extract_one_vtyp(dec, form_id)
                    if r is not None:
                        vtyp_out.append(r)
        pos += data_size

    return matt_out, ipct_out, vtyp_out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_matt: list[dict] = []
    all_ipct: list[dict] = []
    all_vtyp: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for materials/impacts/voices...")
        matt, ipct, vtyp = extract_all(esm_path)
        all_matt.extend(matt)
        all_ipct.extend(ipct)
        all_vtyp.extend(vtyp)

    female_voices = [v for v in all_vtyp if "Female" in v["flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_materials": len(all_matt),
        "total_impacts": len(all_ipct),
        "total_voice_types": len(all_vtyp),
        "female_voices": len(female_voices),
        "materials": all_matt,
        "impacts": all_ipct,
        "voice_types": all_vtyp,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Material/impact/voice scan complete in {elapsed:.1f}s ===")
    print(f"  Total materials: {len(all_matt):,}")
    print(f"  Total impacts: {len(all_ipct):,}")
    print(f"  Total voice types: {len(all_vtyp):,} ({len(female_voices)} female)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
