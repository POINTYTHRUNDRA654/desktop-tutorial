#!/usr/bin/env python3
"""
fo4_water.py — FO4 Water (WATR)
========================================================================
Twenty-ninth stop in the "grind it to zero" pass, fifth of the broader
engine-plumbing sweep. Every body of water in the game — ocean, river,
irradiated puddle, Nuka-Cola-blue pool — is one of these records: fog
color/depth by shallow/deep range, physical wave/reflection properties,
specular sun highlights, three layers of scrolling noise texture
(surface ripple animation), silt tinting, and dangerous-water/radiation
linkage via Consume Spell / Contact Spell.

Source-verified (wbDefinitionsFO4.pas ~15203-15297):
  EDID, FULL
  ANAM (Opacity, u8 -- source marks unused), FNAM (Flags, u8:
    Dangerous/Directional Sound), TNAM (Material, FormID -> MATT --
    source marks unused), SNAM (Open Sound FormID -> SNDR), XNAM
    (Consume Spell FormID -> SPEL -- triggers on swimming through, e.g.
    radiation ticks), YNAM (Contact Spell FormID -> SPEL -- triggers on
    touch), INAM (Image Space FormID -> IMGS)
  DNAM — "Visual Data", the largest fixed struct after MGEF in this
    project (source notes a legacy min-size arg, so parsed via running
    offset with graceful truncation, same technique as EXPL/PROJ/LIGH/
    MGEF): Fog Properties (Depth Amount, Shallow/Deep Color, Color
    Shallow/Deep Range, Shallow/Deep Alpha, Alpha Shallow/Deep Range,
    Underwater Color, Underwater Fog Amount, Underwater Near/Far Fog),
    Physical Properties (Normal Magnitude, Shallow/Deep Normal Falloff,
    Reflectivity Amount, Fresnel Amount, Surface Effect Falloff,
    Displacement Simulator [Force/Velocity/Falloff/Dampener/Starting
    Size], Reflection Color), Specular Properties (Sun Specular Power/
    Magnitude, Sun Sparkle Power/Magnitude, Interior Specular Radius/
    Brightness/Power), Noise Properties (3 layers x Wind Direction/
    Wind Speed/Amplitude Scale/UV Scale/Noise Falloff), Silt Properties
    (Silt Amount, Light/Dark Color), Screen Space Reflections (bool)
  NAM0 (Linear Velocity X/Y/Z), NAM1 (Angular Velocity X/Y/Z), NAM2/
    NAM3/NAM4 (Layer 1/2/3 Noise Texture filenames)
  Not decoded: DATA/GNAM (source itself marks these unused byte arrays)

Outputs:
  <scan-cache>/fo4_water.json
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
GRAPH_OUT = _OUT_DIR / "fo4_water.json"

COMPRESSED_FLAG = 0x00040000

WATR_FNAM_FLAGS = [(0x01, "Dangerous"), (0x02, "Unknown 1"), (0x04, "Directional Sound")]

# Running-offset field list for the DNAM "Visual Data" struct.
# kind: f32=float, color4=RGBA bytes, u8bool=1-byte bool
_DNAM_FIELDS = [
    ("fog_depth_amount", "f32"), ("fog_shallow_color", "color4"), ("fog_deep_color", "color4"),
    ("fog_color_shallow_range", "f32"), ("fog_color_deep_range", "f32"),
    ("fog_shallow_alpha", "f32"), ("fog_deep_alpha", "f32"),
    ("fog_alpha_shallow_range", "f32"), ("fog_alpha_deep_range", "f32"),
    ("fog_underwater_color", "color4"), ("fog_underwater_fog_amount", "f32"),
    ("fog_underwater_near_fog", "f32"), ("fog_underwater_far_fog", "f32"),
    ("physical_normal_magnitude", "f32"), ("physical_shallow_normal_falloff", "f32"),
    ("physical_deep_normal_falloff", "f32"), ("physical_reflectivity_amount", "f32"),
    ("physical_fresnel_amount", "f32"), ("physical_surface_effect_falloff", "f32"),
    ("displacement_force", "f32"), ("displacement_velocity", "f32"),
    ("displacement_falloff", "f32"), ("displacement_dampener", "f32"),
    ("displacement_starting_size", "f32"), ("physical_reflection_color", "color4"),
    ("specular_sun_power", "f32"), ("specular_sun_magnitude", "f32"),
    ("specular_sun_sparkle_power", "f32"), ("specular_sun_sparkle_magnitude", "f32"),
    ("specular_interior_radius", "f32"), ("specular_interior_brightness", "f32"),
    ("specular_interior_power", "f32"),
    ("noise_l1_wind_direction", "f32"), ("noise_l2_wind_direction", "f32"), ("noise_l3_wind_direction", "f32"),
    ("noise_l1_wind_speed", "f32"), ("noise_l2_wind_speed", "f32"), ("noise_l3_wind_speed", "f32"),
    ("noise_l1_amplitude_scale", "f32"), ("noise_l2_amplitude_scale", "f32"), ("noise_l3_amplitude_scale", "f32"),
    ("noise_l1_uv_scale", "f32"), ("noise_l2_uv_scale", "f32"), ("noise_l3_uv_scale", "f32"),
    ("noise_l1_falloff", "f32"), ("noise_l2_falloff", "f32"), ("noise_l3_falloff", "f32"),
    ("silt_amount", "f32"), ("silt_light_color", "color4"), ("silt_dark_color", "color4"),
    ("screen_space_reflections", "u8bool"),
]
_FIELD_SIZE = {"f32": 4, "color4": 4, "u8bool": 1}


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


def parse_dnam(d: bytes) -> dict | None:
    if len(d) < 8:
        return None
    out: dict = {}
    off = 0
    for name, kind in _DNAM_FIELDS:
        size = _FIELD_SIZE[kind]
        if off + size > len(d):
            out[name] = None
            off += size
            continue
        if kind == "color4":
            out[name] = {"r": d[off], "g": d[off + 1], "b": d[off + 2], "a": d[off + 3]}
        elif kind == "f32":
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
        elif kind == "u8bool":
            out[name] = bool(d[off])
        off += size
    return out


def parse_vec3(d: bytes) -> dict | None:
    if len(d) < 12:
        return None
    return {
        "x": round(struct.unpack_from("<f", d, 0)[0], 5),
        "y": round(struct.unpack_from("<f", d, 4)[0], 5),
        "z": round(struct.unpack_from("<f", d, 8)[0], 5),
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


def _extract_one_watr(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    flags: list[str] = []
    open_sound: str | None = None
    consume_spell: str | None = None
    contact_spell: str | None = None
    image_space: str | None = None
    data: dict | None = None
    linear_velocity: dict | None = None
    angular_velocity: dict | None = None
    noise_tex_1 = noise_tex_2 = noise_tex_3 = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "FNAM" and len(d) >= 1:
            flags = _decode_flags_bitfield(d[0], WATR_FNAM_FLAGS)
        elif tag == "SNAM":
            open_sound = fid_hex(d)
        elif tag == "XNAM":
            consume_spell = fid_hex(d)
        elif tag == "YNAM":
            contact_spell = fid_hex(d)
        elif tag == "INAM":
            image_space = fid_hex(d)
        elif tag == "DNAM":
            data = parse_dnam(d)
        elif tag == "NAM0":
            linear_velocity = parse_vec3(d)
        elif tag == "NAM1":
            angular_velocity = parse_vec3(d)
        elif tag == "NAM2":
            noise_tex_1 = resolve_string(d)
        elif tag == "NAM3":
            noise_tex_2 = resolve_string(d)
        elif tag == "NAM4":
            noise_tex_3 = resolve_string(d)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "flags": flags,
        "open_sound": open_sound,
        "consume_spell": consume_spell,
        "contact_spell": contact_spell,
        "image_space": image_space,
        "data": data,
        "linear_velocity": linear_velocity,
        "angular_velocity": angular_velocity,
        "noise_texture_layer_1": noise_tex_1,
        "noise_texture_layer_2": noise_tex_2,
        "noise_texture_layer_3": noise_tex_3,
    }


def extract_water(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        data_size    = struct.unpack_from("<I", data, pos + 4)[0]
        header_flags = struct.unpack_from("<I", data, pos + 8)[0]
        form_id      = struct.unpack_from("<I", data, pos + 12)[0]
        pos += 24
        if pos + data_size > length:
            break
        if rec_type == b"WATR":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_watr(dec, form_id, string_lookup)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_water: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for water...")
        all_water.extend(extract_water(esm_path, string_lookup))

    dangerous = [w for w in all_water if "Dangerous" in w["flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_water": len(all_water),
        "dangerous": len(dangerous),
        "water": all_water,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Water scan complete in {elapsed:.1f}s ===")
    print(f"  Total water: {len(all_water):,}")
    print(f"  Dangerous: {len(dangerous):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
