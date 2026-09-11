#!/usr/bin/env python3
"""
fo4_debris_imagespace_particle_geometry.py — FO4 Debris (DEBR) / Image
Space (IMGS) / Shader Particle Geometry (SPGD)
========================================================================
Forty-first stop in the "grind it to zero" pass, sixteenth of the
broader engine-plumbing sweep. Debris records are the break-apart
piece sets used by robot/object destruction effects; Image Spaces are
the full color-grading recipe (HDR/tonemapping, cinematic saturation/
brightness/contrast, tint, depth of field, and an optional LUT) that
every Weather/interior CELL references for its visual look — one of
the highest-value remaining gaps for anyone building an ENB/reshade-
style visual overhaul; Shader Particle Geometry drives the built-in
rain/snow particle system's per-particle behavior.

Source-verified (wbDefinitionsFO4.pas DEBR ~10528-10540, IMGS
~10542-10593, SPGD ~9129-9161). MICN ('MICN') is commented out
entirely in xEdit's own source (wrapped in a Pascal block comment
alongside LSPR) — confirmed genuinely unused/dead in FO4, same as the
EYES record type found earlier in this project's re-survey; no
scanner needed.

DEBR — EDID, Models (repeating group: one DATA subrecord per model,
  each holding an embedded variable-length string — Percentage u8,
  null-terminated Model Filename string, trailing Flags u8 [Has
  Collision Data] — confirmed byte-for-byte against real data; MODT
  texture-hash blob that follows each DATA deliberately not decoded,
  it's a CK-regenerated cache, not hand-authored data).

IMGS — EDID, HNAM "HDR" (9 floats: Eye Adapt Speed, Tonemap E, Bloom
  Threshold, Bloom Scale, Auto Exposure Max/Min, Sunlight Scale, Sky
  Scale, Middle Gray), CNAM "Cinematic" (Saturation/Brightness/
  Contrast floats), TNAM "Tint" (Amount float + a 3-float RGB Color),
  DNAM "Depth of Field" (Strength/Distance/Range floats, a Sky/Blur
  Radius u16 enum, Vignette Radius/Strength floats — parsed with a
  running offset since source declares only the first 5 of 8 elements
  guaranteed present, same legacy-shrink pattern as EXPL/WTHR/LGTM),
  TX00 (LUT texture path — the color-grading lookup table, when a
  weather/interior uses one instead of/alongside the procedural
  grading above).

SPGD — DATA (a struct source itself lists with a duplicate "Center
  Offset Min" label at two different positions — trusted positionally
  rather than guessed, labeled center_offset_min_1/_2 to stay honest
  about the ambiguity — interleaved with 4-byte Unknown gaps between
  nearly every real field: Gravity Velocity, Rotation Velocity,
  Particle Size X/Y, Center Offset Min x2, Center Offset Max, Initial
  Rotation, # of Subtextures X/Y, Type enum [Rain/Snow], Box Size,
  Particle Density — parsed with a running offset, skipping the
  source's own Unknown gaps rather than guessing their meaning), MNAM
  (Particle Texture path).

Outputs:
  <scan-cache>/fo4_debris_imagespace_particle_geometry.json
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
GRAPH_OUT = _OUT_DIR / "fo4_debris_imagespace_particle_geometry.json"

COMPRESSED_FLAG = 0x00040000

DEBR_MODEL_FLAGS = [(0x01, "Has Collision Data")]
HNAM_FIELD_NAMES = [
    "eye_adapt_speed", "tonemap_e", "bloom_threshold", "bloom_scale",
    "auto_exposure_max", "auto_exposure_min", "sunlight_scale", "sky_scale", "middle_gray",
]
SKY_BLUR_RADIUS_ENUM = {
    0: "None", 16384: "Radius 0", 16672: "Radius 1", 16784: "Radius 2", 16848: "Radius 3",
    16904: "Radius 4", 16936: "Radius 5", 16968: "Radius 6", 17000: "Radius 7",
    16576: "No Sky, Radius 0", 16736: "No Sky, Radius 1", 16816: "No Sky, Radius 2",
    16880: "No Sky, Radius 3", 16920: "No Sky, Radius 4", 16952: "No Sky, Radius 5",
    16984: "No Sky, Radius 6", 17016: "No Sky, Radius 7",
}
SPGD_TYPE_ENUM = {0: "Rain", 1: "Snow"}
SPGD_DATA_FIELDS = [
    ("gravity_velocity", "float"), ("_unk1", "skip4"),
    ("rotation_velocity", "float"), ("_unk2", "skip4"),
    ("particle_size_x", "float"), ("center_offset_min_1", "float"),
    ("particle_size_y", "float"), ("_unk3", "skip4"),
    ("center_offset_min_2", "float"), ("_unk4", "skip4"),
    ("center_offset_max", "float"), ("_unk5", "skip4"),
    ("initial_rotation", "float"), ("_unk6", "skip4"),
    ("num_subtextures_x", "u32"), ("_unk7", "skip4"),
    ("num_subtextures_y", "u32"), ("_unk8", "skip4"),
    ("type", "type_enum"), ("_unk9", "skip4"),
    ("box_size", "u32"), ("_unk10", "skip4"),
    ("particle_density", "float"),
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


def resolve_string(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("utf-8", errors="replace").strip()
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


def _parse_debr_data(d: bytes) -> dict | None:
    if len(d) < 3:
        return None
    percentage = d[0]
    null_pos = d.find(b"\x00", 1)
    if null_pos < 0:
        return None
    model_filename = resolve_string(d[1:null_pos])
    flags_off = null_pos + 1
    flags_raw = d[flags_off] if flags_off < len(d) else 0
    return {
        "percentage": percentage, "model_filename": model_filename,
        "flags": _decode_flags_bitfield(flags_raw, DEBR_MODEL_FLAGS),
    }


def _extract_one_debr(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    models: list[dict] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DATA":
            m = _parse_debr_data(d)
            if m is not None:
                models.append(m)

    if not edid:
        return None

    return {"record_type": "DEBR", "form_id": f"0x{form_id:08X}", "edid": edid, "models": models}


def _parse_hnam(d: bytes) -> dict:
    out: dict = {}
    off = 0
    for name in HNAM_FIELD_NAMES:
        if off + 4 > len(d):
            break
        out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
        off += 4
    return out


def _parse_cnam(d: bytes) -> dict:
    out: dict = {}
    if len(d) >= 4:
        out["saturation"] = round(struct.unpack_from("<f", d, 0)[0], 5)
    if len(d) >= 8:
        out["brightness"] = round(struct.unpack_from("<f", d, 4)[0], 5)
    if len(d) >= 12:
        out["contrast"] = round(struct.unpack_from("<f", d, 8)[0], 5)
    return out


def _parse_tnam(d: bytes) -> dict:
    out: dict = {}
    if len(d) >= 4:
        out["amount"] = round(struct.unpack_from("<f", d, 0)[0], 5)
    if len(d) >= 16:
        out["color"] = {
            "r": round(struct.unpack_from("<f", d, 4)[0], 5),
            "g": round(struct.unpack_from("<f", d, 8)[0], 5),
            "b": round(struct.unpack_from("<f", d, 12)[0], 5),
        }
    return out


def _parse_dnam_dof(d: bytes) -> dict:
    out: dict = {}
    n = len(d)
    if n >= 4:
        out["strength"] = round(struct.unpack_from("<f", d, 0)[0], 5)
    if n >= 8:
        out["distance"] = round(struct.unpack_from("<f", d, 4)[0], 5)
    if n >= 12:
        out["range"] = round(struct.unpack_from("<f", d, 8)[0], 5)
    if n >= 16:
        radius_raw = struct.unpack_from("<H", d, 14)[0]
        out["sky_blur_radius"] = SKY_BLUR_RADIUS_ENUM.get(radius_raw, f"Unknown ({radius_raw})")
    if n >= 20:
        out["vignette_radius"] = round(struct.unpack_from("<f", d, 16)[0], 5)
    if n >= 24:
        out["vignette_strength"] = round(struct.unpack_from("<f", d, 20)[0], 5)
    return out


def _extract_one_imgs(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    hdr: dict = {}
    cinematic: dict = {}
    tint: dict = {}
    depth_of_field: dict = {}
    lut: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "HNAM":
            hdr = _parse_hnam(d)
        elif tag == "CNAM":
            cinematic = _parse_cnam(d)
        elif tag == "TNAM":
            tint = _parse_tnam(d)
        elif tag == "DNAM":
            depth_of_field = _parse_dnam_dof(d)
        elif tag == "TX00":
            lut = resolve_string(d)

    if not edid:
        return None

    return {
        "record_type": "IMGS", "form_id": f"0x{form_id:08X}", "edid": edid,
        "hdr": hdr, "cinematic": cinematic, "tint": tint,
        "depth_of_field": depth_of_field, "lut": lut,
    }


def _parse_spgd_data(d: bytes) -> dict:
    out: dict = {}
    off = 0
    n = len(d)
    for name, kind in SPGD_DATA_FIELDS:
        if kind == "float":
            if off + 4 > n:
                break
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
            off += 4
        elif kind == "u32":
            if off + 4 > n:
                break
            out[name] = struct.unpack_from("<I", d, off)[0]
            off += 4
        elif kind == "type_enum":
            if off + 4 > n:
                break
            raw = struct.unpack_from("<I", d, off)[0]
            out[name] = SPGD_TYPE_ENUM.get(raw, f"Unknown ({raw})")
            off += 4
        elif kind == "skip4":
            if off + 4 > n:
                break
            off += 4
    return out


def _extract_one_spgd(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    data: dict = {}
    particle_texture: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DATA":
            data = _parse_spgd_data(d)
        elif tag == "MNAM":
            particle_texture = resolve_string(d)

    if not edid:
        return None

    return {
        "record_type": "SPGD", "form_id": f"0x{form_id:08X}", "edid": edid,
        "data": data, "particle_texture": particle_texture,
    }


def extract_all(esm_path: Path):
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    debrs: list[dict] = []
    imgss: list[dict] = []
    spgds: list[dict] = []

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
        if rec_type in (b"DEBR", b"IMGS", b"SPGD"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"DEBR":
                    r = _extract_one_debr(dec, form_id)
                    if r is not None:
                        debrs.append(r)
                elif rec_type == b"IMGS":
                    r = _extract_one_imgs(dec, form_id)
                    if r is not None:
                        imgss.append(r)
                else:
                    r = _extract_one_spgd(dec, form_id)
                    if r is not None:
                        spgds.append(r)
        pos += data_size

    return debrs, imgss, spgds


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_debr: list[dict] = []
    all_imgs: list[dict] = []
    all_spgd: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for debris/image spaces/particle geometry...")
        debr, imgs, spgd = extract_all(esm_path)
        all_debr.extend(debr)
        all_imgs.extend(imgs)
        all_spgd.extend(spgd)

    imgs_with_lut = [i for i in all_imgs if i["lut"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_debris": len(all_debr),
        "total_image_spaces": len(all_imgs),
        "image_spaces_with_lut": len(imgs_with_lut),
        "total_shader_particle_geometry": len(all_spgd),
        "debris": all_debr,
        "image_spaces": all_imgs,
        "shader_particle_geometry": all_spgd,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Debris/Image Space/Shader Particle Geometry scan complete in {elapsed:.1f}s ===")
    print(f"  Debris: {len(all_debr):,}")
    print(f"  Image Spaces: {len(all_imgs):,} ({len(imgs_with_lut):,} with a LUT)")
    print(f"  Shader Particle Geometry: {len(all_spgd):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
