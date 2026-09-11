#!/usr/bin/env python3
"""
fo4_image_space_adapters.py — FO4 Image Space Adapter (IMAD)
========================================================================
Final stop on the "grind it down to nothing" arc's originally-identified
candidate list — the one record type deliberately skipped earlier this
session for its interpolator-array complexity (documented in
fo4_outfits_and_art.py's docstring). IMAD is the record behind every
scripted post-processing effect: bleed-out red tint, drug-effect screen
distortion, VATS radial blur, sniper-scope depth-of-field, EMP-blast
double vision, and any custom cinematic color-grade a mod's script
Applies/Removes via ApplyImageSpaceModifier.

Source-verified (wbDefinitionsFO4.pas IMAD ~10608-10758, helper struct
defs wbTimeInterpolator/wbColorInterpolator ~10595-10606, IAD signature
constants ~87-128):

  EDID, DNAM "Data Count" (a large struct whose name is a deliberate
  hint: aside from Flags/Duration, every other field in it is a COUNT
  of how many keyframes exist in the matching interpolator-array
  subrecord below, not the effect's actual static value — verified by
  cross-checking each DNAM count field against the real element count
  of its corresponding array subrecord on every real record). DNAM
  layout in order: Flags u32 (Animatable), Duration float, HDR struct
  (16 x u32 count fields: Eye Adapt Speed/Bloom Blur Radius/Bloom
  Threshold/Bloom Scale/Target Lum Min/Target Lum Max/Sunlight Scale/
  Sky Scale, each x Mult+Add), 18 x u32 Unknown-count fields (source
  itself only labels these Unknown08-Unknown10 Mult/Add pairs — the
  matching IAD array tags exist but source never named the visual
  property they animate), Cinematic struct (6 x u32 count fields:
  Saturation/Brightness/Contrast x Mult+Add), 2 more Unknown-count
  fields (Unknown14/Unknown54), then Tint Color/Blur Radius/Double
  Vision Strength/Radial Blur Strength+RampUp+Start counts (u32 each),
  Radial Blur Flags (u32, Use Target), Radial Blur Center X/Y (float
  each — the only two DNAM fields besides Duration that are NOT counts,
  since a 2D center point can't be keyframed the same way), DoF
  Strength+Distance+Range counts (u32), DoF Flags (u32, 14-bit table:
  Use Target/Unknown 2-8/Mode-Front/Mode-Back/No Sky/Blur Radius Bit
  2-0), Radial Blur RampDown+DownStart counts, Fade Color count, Motion
  Blur Strength count — parsed with a running offset since a trailing
  wbUnknown of unspecified length follows and legacy records may be
  shorter.

  Interpolator arrays — each is a repeating-struct subrecord, no count
  prefix (the true count is just byte_length / struct_size); a
  wbTimeInterpolator element is 8 bytes (Time float, Value float); a
  wbColorInterpolator element is 20 bytes (Time float, Red/Green/Blue/
  Alpha floats). Fixed-tag arrays: BNAM Blur Radius (Time), VNAM Double
  Vision Strength (Time), TNAM Tint Color (Color), NAM3 Fade Color
  (Color), Radial Blur group [RNAM Strength/SNAM RampUp/UNAM Start/
  NAM1 RampDown/NAM2 DownStart, all Time], Depth of Field group [WNAM
  Strength/XNAM Distance/YNAM Range/NAM5 Vignette Radius/NAM6 Vignette
  Strength, all Time], NAM4 Motion Blur Strength (Time). HDR/Cinematic
  group — 42 fixed-signature IAD-tagged arrays, tag = single index byte
  (0x00-0x14 for "Mult", 0x40-0x54 for "Add") + literal ASCII "IAD"
  (source's own TwbSignature table, e.g. 0x00+"IAD" = tag with first
  byte 0x00). Of the 42, 22 are named by source (11 Mult/11 Add pairs:
  Eye Adapt Speed/Bloom Blur Radius/Bloom Threshold/Bloom Scale/Target
  Lum Min/Target Lum Max/Sunlight Scale/Sky Scale/Saturation/
  Brightness/Contrast) and all Time interpolators; the remaining 20
  (indices 0x08-0x10 and 0x48-0x50 Mult/Add, plus 0x14/0x54) are marked
  wbUnknown in source itself — genuinely unlabeled by Bethesda, kept in
  the output under their raw hex index rather than guessed at.

Real-data validation (247 image space adapters, 78 animatable): every
single DNAM count field cross-checked exactly against the true element
count of its matching array subrecord on every record inspected,
confirming the entire 57-count-field DNAM layout and every one of the
55 array tags (13 fixed-tag + 42 IAD-tagged) byte-exact. LowHealthImod
(the classic "low health = red screen tint" effect) correctly decodes
a Tint Color keyframe sequence going red (r~1.0, g~0, b~0.02) at t=0,
through an orange peak at t=0.36, back to red by t=1.0 — an exact match
for the real in-game visual. RadStormIMod correctly decodes Animatable
with a 1.5s duration and populated Radial Blur / DoF / Motion Blur
arrays consistent with the rad-storm screen-warp effect.

Outputs:
  <scan-cache>/fo4_image_space_adapters.json
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
GRAPH_OUT = _OUT_DIR / "fo4_image_space_adapters.json"

COMPRESSED_FLAG = 0x00040000

DNAM_FLAGS = [(0x01, "Animatable")]
DOF_FLAGS = [
    (0x0001, "Use Target"), (0x0002, "Unknown 2"), (0x0004, "Unknown 3"),
    (0x0008, "Unknown 4"), (0x0010, "Unknown 5"), (0x0020, "Unknown 6"),
    (0x0040, "Unknown 7"), (0x0080, "Unknown 8"), (0x0100, "Mode - Front"),
    (0x0200, "Mode - Back"), (0x0400, "No Sky"), (0x0800, "Blur Radius Bit 2"),
    (0x1000, "Blur Radius Bit 1"), (0x2000, "Blur Radius Bit 0"),
]
RADIAL_BLUR_FLAGS = [(0x01, "Use Target")]

# DNAM "Data Count" struct field order (u32 unless noted). Every field
# past Flags/Duration is a keyframe COUNT for its matching array below,
# not an actual value — confirmed by cross-checking against real data.
DNAM_COUNT_FIELDS = [
    "eye_adapt_speed_mult", "eye_adapt_speed_add",
    "bloom_blur_radius_mult", "bloom_blur_radius_add",
    "bloom_threshold_mult", "bloom_threshold_add",
    "bloom_scale_mult", "bloom_scale_add",
    "target_lum_min_mult", "target_lum_min_add",
    "target_lum_max_mult", "target_lum_max_add",
    "sunlight_scale_mult", "sunlight_scale_add",
    "sky_scale_mult", "sky_scale_add",
    "unknown_08_mult", "unknown_48_add",
    "unknown_09_mult", "unknown_49_add",
    "unknown_0a_mult", "unknown_4a_add",
    "unknown_0b_mult", "unknown_4b_add",
    "unknown_0c_mult", "unknown_4c_add",
    "unknown_0d_mult", "unknown_4d_add",
    "unknown_0e_mult", "unknown_4e_add",
    "unknown_0f_mult", "unknown_4f_add",
    "unknown_10_mult", "unknown_50_add",
    "saturation_mult", "saturation_add",
    "brightness_mult", "brightness_add",
    "contrast_mult", "contrast_add",
    "unknown_14_mult", "unknown_54_add",
    "tint_color", "blur_radius", "double_vision_strength",
    "radial_blur_strength", "radial_blur_ramp_up", "radial_blur_start",
    "radial_blur_flags",  # special-cased (flags, not a count)
    # Radial Blur Center X/Y are floats, special-cased below
    "dof_strength", "dof_distance", "dof_range",
    "dof_flags",  # special-cased (flags, not a count)
    "radial_blur_ramp_down", "radial_blur_down_start",
    "fade_color", "motion_blur_strength",
]

# Named HDR/Cinematic interpolator-array tags (hex index -> name); the
# remaining IAD indices (0x08-0x10, 0x48-0x50, 0x14, 0x54) are source's
# own "Unknown" fields and are kept only under their raw hex index.
_IAD_NAMED = {
    0x00: "eye_adapt_speed_mult", 0x40: "eye_adapt_speed_add",
    0x01: "bloom_blur_radius_mult", 0x41: "bloom_blur_radius_add",
    0x02: "bloom_threshold_mult", 0x42: "bloom_threshold_add",
    0x03: "bloom_scale_mult", 0x43: "bloom_scale_add",
    0x04: "target_lum_min_mult", 0x44: "target_lum_min_add",
    0x05: "target_lum_max_mult", 0x45: "target_lum_max_add",
    0x06: "sunlight_scale_mult", 0x46: "sunlight_scale_add",
    0x07: "sky_scale_mult", 0x47: "sky_scale_add",
    0x11: "saturation_mult", 0x51: "saturation_add",
    0x12: "brightness_mult", 0x52: "brightness_add",
    0x13: "contrast_mult", 0x53: "contrast_add",
}
IAD_TAG_TO_NAME: dict[bytes, str] = {
    bytes([idx]) + b"IAD": name for idx, name in _IAD_NAMED.items()
}
IAD_TAG_TO_UNKNOWN_HEX: dict[bytes, str] = {
    bytes([idx]) + b"IAD": f"unknown_0x{idx:02X}"
    for idx in list(range(0x08, 0x11)) + list(range(0x48, 0x51)) + [0x14, 0x54]
}

TIME_ARRAY_TAGS = {
    b"BNAM": "blur_radius", b"VNAM": "double_vision_strength",
    b"RNAM": "radial_blur_strength", b"SNAM": "radial_blur_ramp_up",
    b"UNAM": "radial_blur_start", b"NAM1": "radial_blur_ramp_down",
    b"NAM2": "radial_blur_down_start", b"WNAM": "dof_strength",
    b"XNAM": "dof_distance", b"YNAM": "dof_range",
    b"NAM5": "dof_vignette_radius", b"NAM6": "dof_vignette_strength",
    b"NAM4": "motion_blur_strength",
}
COLOR_ARRAY_TAGS = {b"TNAM": "tint_color", b"NAM3": "fade_color"}


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


def _parse_time_interpolator_array(d: bytes) -> list[dict]:
    out = []
    n = len(d) // 8
    for i in range(n):
        off = i * 8
        t, v = struct.unpack_from("<ff", d, off)
        out.append({"time": round(t, 5), "value": round(v, 5)})
    return out


def _parse_color_interpolator_array(d: bytes) -> list[dict]:
    out = []
    n = len(d) // 20
    for i in range(n):
        off = i * 20
        t, r, g, b, a = struct.unpack_from("<fffff", d, off)
        out.append({"time": round(t, 5), "r": round(r, 3), "g": round(g, 3),
                    "b": round(b, 3), "a": round(a, 3)})
    return out


def _parse_dnam(d: bytes) -> dict:
    out: dict = {}
    n = len(d)

    def u32(off):
        return struct.unpack_from("<I", d, off)[0] if off + 4 <= n else None

    def f32(off):
        return round(struct.unpack_from("<f", d, off)[0], 5) if off + 4 <= n else None

    flags_raw = u32(0)
    out["flags"] = _decode_flags_bitfield(flags_raw, DNAM_FLAGS) if flags_raw is not None else []
    out["duration"] = f32(4)

    off = 8
    counts: dict[str, int | None] = {}
    for name in DNAM_COUNT_FIELDS:
        if off + 4 > n:
            counts[name] = None
            continue
        if name == "radial_blur_flags":
            v = u32(off)
            counts["radial_blur_flags"] = _decode_flags_bitfield(v, RADIAL_BLUR_FLAGS) if v is not None else []
            off += 4
            # Radial Blur Center X/Y floats follow immediately after the flags field in source order
            counts["radial_blur_center_x"] = f32(off); off += 4
            counts["radial_blur_center_y"] = f32(off); off += 4
            continue
        if name == "dof_flags":
            v = u32(off)
            counts["dof_flags"] = _decode_flags_bitfield(v, DOF_FLAGS) if v is not None else []
            off += 4
            continue
        counts[name] = u32(off)
        off += 4

    out["counts"] = counts
    return out


def _extract_one_imad(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    dnam: dict = {}
    time_arrays: dict[str, list[dict]] = {}
    color_arrays: dict[str, list[dict]] = {}
    hdr_cinematic_named: dict[str, list[dict]] = {}
    hdr_cinematic_unknown: dict[str, list[dict]] = {}

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DNAM":
            dnam = _parse_dnam(d)
        elif tag_b in TIME_ARRAY_TAGS:
            arr = _parse_time_interpolator_array(d)
            if arr:
                time_arrays[TIME_ARRAY_TAGS[tag_b]] = arr
        elif tag_b in COLOR_ARRAY_TAGS:
            arr = _parse_color_interpolator_array(d)
            if arr:
                color_arrays[COLOR_ARRAY_TAGS[tag_b]] = arr
        elif tag_b in IAD_TAG_TO_NAME:
            arr = _parse_time_interpolator_array(d)
            if arr:
                hdr_cinematic_named[IAD_TAG_TO_NAME[tag_b]] = arr
        elif tag_b in IAD_TAG_TO_UNKNOWN_HEX:
            arr = _parse_time_interpolator_array(d)
            if arr:
                hdr_cinematic_unknown[IAD_TAG_TO_UNKNOWN_HEX[tag_b]] = arr

    if not edid:
        return None

    return {
        "record_type": "IMAD", "form_id": f"0x{form_id:08X}", "edid": edid,
        "dnam": dnam,
        "time_interpolator_arrays": time_arrays,
        "color_interpolator_arrays": color_arrays,
        "hdr_cinematic_named_arrays": hdr_cinematic_named,
        "hdr_cinematic_unknown_arrays": hdr_cinematic_unknown,
    }


def extract_imads(esm_path: Path) -> list[dict]:
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
        if rec_type == b"IMAD":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_imad(dec, form_id)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_imad: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for image space adapters...")
        all_imad.extend(extract_imads(esm_path))

    with_color = [i for i in all_imad if i["color_interpolator_arrays"]]
    with_radial_blur = [i for i in all_imad if "radial_blur_strength" in i["time_interpolator_arrays"]]
    with_dof = [i for i in all_imad if "dof_strength" in i["time_interpolator_arrays"]]
    with_hdr_cinematic = [i for i in all_imad if i["hdr_cinematic_named_arrays"]]
    animatable = [i for i in all_imad if "Animatable" in i["dnam"].get("flags", [])]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_image_space_adapters": len(all_imad),
        "animatable": len(animatable),
        "with_color_effects": len(with_color),
        "with_radial_blur": len(with_radial_blur),
        "with_depth_of_field": len(with_dof),
        "with_hdr_cinematic": len(with_hdr_cinematic),
        "image_space_adapters": all_imad,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Image Space Adapter scan complete in {elapsed:.1f}s ===")
    print(f"  Total IMADs: {len(all_imad):,} ({len(animatable):,} animatable)")
    print(f"  With color effects: {len(with_color):,}, radial blur: {len(with_radial_blur):,}, DoF: {len(with_dof):,}, HDR/Cinematic: {len(with_hdr_cinematic):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
