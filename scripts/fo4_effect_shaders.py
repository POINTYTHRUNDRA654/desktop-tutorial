#!/usr/bin/env python3
"""
fo4_effect_shaders.py — FO4 Effect Shader (EFSH)
========================================================================
Twenty-sixth stop in the "grind it to zero" pass, second of the broader
engine-plumbing sweep. Effect Shaders drive every membrane/particle
visual FX in the game — the glow on a legendary weapon, a chem's
screen-edge tint, MGEF's Hit Shader/Enchant Shader fields (which this
project's own fo4_magic_effects.py just linked to by FormID).

Source-verified (wbDefinitionsFO4.pas ~9562-9760, decider ~2680-2691):
  EDID, ICON (Fill Texture), ICO2 (Particle Shader Texture), NAM7
    (Holes Texture), NAM8 (Membrane Palette Texture), NAM9 (Particle
    Palette Texture)
  DATA — source itself marks this wbUnknown ("if form version < 62,
    ignored otherwise") — not decoded, no modding value even in xEdit's
    own view.
  DNAM — a wbUnion keyed on FormVersion: FormVersion >= 102 gets the
    modern (smaller) struct decoded below; FormVersion < 102 gets an
    entirely different, much larger "old format" struct with different
    field order (Particle Shader fields inline rather than moved to
    separate subrecords). Every record in the shipped base game is
    FormVersion >= 102, so ONLY the modern struct is decoded here; a
    record whose DNAM length doesn't match the modern struct's shape is
    honestly flagged `legacy_format: true` with fields left null rather
    than guessed against the old layout (never seen in real data during
    this scanner's testing, so left undecoded on principle rather than
    risk a wrong read). Parsed via running offset with graceful
    truncation (same technique as EXPL/PROJ/LIGH/MGEF) as a second line
    of defense. Fields: Membrane Shader Source/Dest Blend Mode + Blend
    Operation + Z Test Function (enums), Fill/Texture Effect Color Keys
    1-3 (RGBA), alpha fade-in/full/fade-out timing + persistent ratio +
    pulse amplitude/frequency (Fill and Edge variants), Edge Effect Fall
    Off, Fill/Edge Full Alpha Ratio, Holes Animation start/end time +
    value, Ambient Sound FormID, Color Key Scale/Time (6 floats), Flags
    (No Membrane Shader/No Particle Shader/Affect Skin Only/Particle
    Animated/etc.), Texture Scale U/V.

Outputs:
  <scan-cache>/fo4_effect_shaders.json
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
GRAPH_OUT = _OUT_DIR / "fo4_effect_shaders.json"

COMPRESSED_FLAG = 0x00040000
EFSH_MODERN_FORM_VERSION = 102

BLEND_MODE_ENUM = {
    0: "", 1: "Zero", 2: "One", 3: "Source Color", 4: "Source Inverse Color", 5: "Source Alpha",
    6: "Source Inverted Alpha", 7: "Dest Alpha", 8: "Dest Inverted Alpha", 9: "Dest Color",
    10: "Dest Inverse Color", 11: "Source Alpha SAT",
}
BLEND_OP_ENUM = {0: "", 1: "Add", 2: "Subtract", 3: "Reverse Subtract", 4: "Minimum", 5: "Maximum"}
EFSH_FLAGS = [
    (1 << 0, "No Membrane Shader"), (1 << 1, "Membrane Grayscale Color"),
    (1 << 2, "Membrane Grayscale Alpha"), (1 << 3, "No Particle Shader"),
    (1 << 4, "Edge Effect - Inverse"), (1 << 5, "Affect Skin Only"),
    (1 << 6, "Texture Effect - Ignore Alpha"), (1 << 7, "Texture Effect - Project UVs"),
    (1 << 8, "Ignore Base Geometry Alpha"), (1 << 9, "Texture Effect - Lighting"),
    (1 << 10, "Texture Effect - No Weapons"), (1 << 11, "Use Alpha Sorting"),
    (1 << 12, "Prefer Dismembered Limbs"), (1 << 15, "Particle Animated"),
    (1 << 16, "Particle Grayscale Color"), (1 << 17, "Particle Grayscale Alpha"),
    (1 << 24, "Use Blood Geometry (Weapons Only)"),
]

# Running-offset field list for the MODERN DNAM struct.
# kind: color4=RGBA bytes, f32=float, u32/blend/blendop=int, fid=FormID, flags=bitfield
_DNAM_FIELDS = [
    ("membrane_source_blend_mode", "blend"), ("membrane_blend_operation", "blendop"),
    ("membrane_z_test_function", "u32"), ("fill_color_key_1", "color4"),
    ("fill_alpha_fade_in_time", "f32"), ("fill_full_alpha_time", "f32"),
    ("fill_alpha_fade_out_time", "f32"), ("fill_persistent_alpha_ratio", "f32"),
    ("fill_alpha_pulse_amplitude", "f32"), ("fill_alpha_pulse_frequency", "f32"),
    ("fill_texture_animation_speed_u", "f32"), ("fill_texture_animation_speed_v", "f32"),
    ("edge_fall_off", "f32"), ("edge_color", "color4"),
    ("edge_alpha_fade_in_time", "f32"), ("edge_full_alpha_time", "f32"),
    ("edge_alpha_fade_out_time", "f32"), ("edge_persistent_alpha_ratio", "f32"),
    ("edge_alpha_pulse_amplitude", "f32"), ("edge_alpha_pulse_frequency", "f32"),
    ("fill_full_alpha_ratio", "f32"), ("edge_full_alpha_ratio", "f32"),
    ("membrane_dest_blend_mode", "blend"), ("holes_start_time", "f32"),
    ("holes_end_time", "f32"), ("holes_start_value", "f32"), ("holes_end_value", "f32"),
    ("ambient_sound", "fid"), ("fill_color_key_2", "color4"), ("fill_color_key_3", "color4"),
    (None, "skip1"),
    ("color_key_1_scale", "f32"), ("color_key_2_scale", "f32"), ("color_key_3_scale", "f32"),
    ("color_key_1_time", "f32"), ("color_key_2_time", "f32"), ("color_key_3_time", "f32"),
    ("flags", "flags"), ("texture_scale_u", "f32"), ("texture_scale_v", "f32"),
]
_FIELD_SIZE = {"blend": 4, "blendop": 4, "u32": 4, "color4": 4, "f32": 4, "fid": 4, "skip1": 1, "flags": 4}


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
    out: dict = {}
    off = 0
    for name, kind in _DNAM_FIELDS:
        size = _FIELD_SIZE[kind]
        if off + size > len(d):
            if name:
                out[name] = None
            off += size
            continue
        if kind == "color4":
            out[name] = {"r": d[off], "g": d[off + 1], "b": d[off + 2], "a": d[off + 3]}
        elif kind == "f32":
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
        elif kind == "fid":
            out[name] = fid_hex(d[off:off + 4])
        elif kind == "u32":
            out[name] = struct.unpack_from("<I", d, off)[0]
        elif kind == "blend":
            v = struct.unpack_from("<I", d, off)[0]
            out[name] = BLEND_MODE_ENUM.get(v, f"Unknown ({v})")
        elif kind == "blendop":
            v = struct.unpack_from("<I", d, off)[0]
            out[name] = BLEND_OP_ENUM.get(v, f"Unknown ({v})")
        elif kind == "flags":
            v = struct.unpack_from("<I", d, off)[0]
            out["flags"] = _decode_flags_bitfield(v, EFSH_FLAGS)
        # skip1: nothing to store
        off += size
    if "flags" not in out:
        out["flags"] = []
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


def _extract_one_efsh(dec: bytes, form_id: int, form_version: int) -> dict | None:
    edid: str | None = None
    fill_texture = particle_texture = holes_texture = None
    membrane_palette = particle_palette = None
    dnam: dict | None = None
    legacy_format = form_version < EFSH_MODERN_FORM_VERSION

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "ICON":
            fill_texture = resolve_string(d)
        elif tag == "ICO2":
            particle_texture = resolve_string(d)
        elif tag == "NAM7":
            holes_texture = resolve_string(d)
        elif tag == "NAM8":
            membrane_palette = resolve_string(d)
        elif tag == "NAM9":
            particle_palette = resolve_string(d)
        elif tag == "DNAM":
            if not legacy_format:
                dnam = parse_dnam(d)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "fill_texture": fill_texture,
        "particle_shader_texture": particle_texture,
        "holes_texture": holes_texture,
        "membrane_palette_texture": membrane_palette,
        "particle_palette_texture": particle_palette,
        "legacy_format": legacy_format,
        "data": dnam,
    }


def extract_effect_shaders(esm_path: Path) -> list[dict]:
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
        form_version = struct.unpack_from("<H", data, pos + 20)[0]
        pos += 24
        if pos + data_size > length:
            break
        if rec_type == b"EFSH":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_efsh(dec, form_id, form_version)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_efsh: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for effect shaders...")
        all_efsh.extend(extract_effect_shaders(esm_path))

    legacy = [e for e in all_efsh if e["legacy_format"]]
    no_membrane = [e for e in all_efsh if e["data"] and "No Membrane Shader" in e["data"]["flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_effect_shaders": len(all_efsh),
        "legacy_format": len(legacy),
        "no_membrane_shader": len(no_membrane),
        "effect_shaders": all_efsh,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Effect shader scan complete in {elapsed:.1f}s ===")
    print(f"  Total effect shaders: {len(all_efsh):,}")
    print(f"  Legacy format (undecoded DNAM): {len(legacy):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
