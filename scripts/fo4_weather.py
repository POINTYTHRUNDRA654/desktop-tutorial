#!/usr/bin/env python3
"""
fo4_weather.py — FO4 Weather (WTHR)
====================================================================
Thirty-eighth stop in the "grind it to zero" pass, fourteenth of the
broader engine-plumbing sweep. Weathers are the single record every
worldspace's Climate cycles through — they drive fog, precipitation,
lightning, sky/ambient color grading, weather-triggered ambient
sounds, sky statics (rain-effect meshes), and even weather-triggered
magic (lightning-strike spells). This is one of the highest-value
remaining gaps for anyone building a custom weather/ENB-style
lighting mod.

Source-verified (wbDefinitionsFO4.pas WTHR ~15568-15750, helper
functions wbByteColors ~5329, wbWeatherColors ~5348, wbAmbientColors
~5362-5392):

  Record header flag Unknown 9 (bit 9, hex comment 0x00000200 agrees
  with the bit index here — no stale-comment gotcha).

  EDID, MNAM (Precipitation Type -> SPGD), NNAM (Visual Effect ->
  RFCT), NAM0 "Weather Colors" (19 named color groups x 8
  time-of-day variants x 4-byte wbByteColors [R,G,B,Unused] = 608
  bytes when fully present — groups in order: Sky-Upper, Fog Near,
  Unknown, Ambient, Sunlight, Sun, Stars, Sky-Lower, Horizon, Effect
  Lighting, Cloud LOD Diffuse, Cloud LOD Ambient, Fog Far, Sky
  Statics, Water Multiplier, Sun Glare, Moon Glare, Fog Near High,
  Fog Far High; time-of-day variants in order: Sunrise, Day, Sunset,
  Night, EarlySunrise, LateSunrise, EarlySunset, LateSunset), FNAM
  "Fog Distance" (18 floats: Day/Night Near/Far/Power/Max plus
  Near/Far Height Mid/Range for Day and Night), DATA (weather
  behavior struct — Wind Speed, Trans Delta, Sun Glare, Sun Damage,
  Precipitation Fade In/Out, Thunder/Lightning Fade In/Out/
  Frequency, Flags [Weather-Pleasant/Cloudy/Rainy/Snow/Sky Statics-
  Always Visible/Sky Statics-Follows Sun/Rain Occlusion/HUD Rain
  Effects], Lightning Color RGB, Visual Effect Begin/End, Wind
  Direction, Wind Direction Range — parsed with a running offset
  since source declares only 16 of the full 20 bytes as guaranteed
  present, the same legacy-shrink pattern already established for
  EXPL), NAM1 (Disabled Cloud Layers, u32 bitmask), Sounds (repeating
  SNAM struct: Sound FormID -> SNDR + Type enum [Default/
  Precipitation/Wind/Thunder]), Sky Statics (repeating TNAM FormID ->
  STAT), IMSP "Image Spaces" (8 time-of-day FormIDs -> IMGS), WGDR
  "God Rays" (8 time-of-day FormIDs -> GDRY), GNAM (Sun Glare Lens
  Flare -> LENS), UNAM "Magic" (On Lightning Strike Spell + Threshold,
  On Weather Activate Spell + Threshold, parsed with a running offset
  since source declares only the first 3 of 6 elements guaranteed
  present), VNAM (Volatility Mult), WNAM (Visibility Mult).

  UPGRADE (this pass): the fields originally scope-limited out are now
  decoded too. Cloud Texture Layers — 29 fixed-signature string
  subrecords, tags resolved directly from source's own signature table
  (`#$30'0TX'` through `'L0TX'`, i.e. layer index 0 = tag "00TX" whose
  first byte is 0x30, ... layer 16 = tag "@0TX" (0x40), layer 17-28 =
  "A0TX".."L0TX"), only non-empty paths kept. Cloud Speed (RNAM 'Y
  Speed' / QNAM 'X Speed', per-layer u8 arrays decoded with source's
  own conversion formula `(byte-127)/127/10`, giving a small signed
  drift-speed float per layer). Cloud Colors (PNAM, a variable-count
  array of 32-byte wbWeatherColors groups — same per-time-of-day format
  as NAM0 but one group per active cloud layer instead of a fixed named
  group, parsed with a running offset). Cloud Alphas (JNAM, a
  variable-count array of 32-byte 8-float-per-time-of-day groups, one
  per active cloud layer). DALC Directional Ambient Lighting Colors (8
  fixed positional DALC subrecords in Sunrise/Day/Sunset/Night/
  EarlySunrise/LateSunrise/EarlySunset/LateSunset order, each a 32-byte
  struct: 6 directional wbByteColors [X+/X-/Y+/Y-/Z+/Z-] + Specular
  color + Scale float — the same struct this project already decoded
  once for LGTM, here occurring 8 times positionally rather than once).
  Aurora (a single optional MODL path — the only MODL subrecord WTHR
  ever carries. Confirmed on real base-game data: EditorCloudPreview
  resolves to Sky\SkyrimAurora.nif, the CommonwealthGSRadstorm weathers
  resolve to Sky\RadStormSkyEffect.nif — so this field is a general
  full-screen sky-mesh override slot that Bethesda also reuses for
  rad-storm effects, not an exclusively Nuka-World-only field).

  Still deliberately NOT decoded: LNAM/ONAM (source itself marks these
  wbUnknown/Unused — genuinely nothing there).

Outputs:
  <scan-cache>/fo4_weather.json
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
GRAPH_OUT = _OUT_DIR / "fo4_weather.json"

COMPRESSED_FLAG = 0x00040000

WTHR_HEADER_FLAGS = [(1 << 9, "Unknown 9")]

NAM0_GROUP_NAMES = [
    "Sky-Upper", "Fog Near", "Unknown", "Ambient", "Sunlight", "Sun", "Stars",
    "Sky-Lower", "Horizon", "Effect Lighting", "Cloud LOD Diffuse",
    "Cloud LOD Ambient", "Fog Far", "Sky Statics", "Water Multiplier",
    "Sun Glare", "Moon Glare", "Fog Near High", "Fog Far High",
]
TIME_OF_DAY_VARIANTS = [
    "Sunrise", "Day", "Sunset", "Night", "EarlySunrise", "LateSunrise",
    "EarlySunset", "LateSunset",
]
FNAM_FIELD_NAMES = [
    "Day - Near", "Day - Far", "Night - Near", "Night - Far",
    "Day - Power", "Night - Power", "Day - Max", "Night - Max",
    "Day - Near Height Mid", "Day - Near Height Range",
    "Night - Near Height Mid", "Night - Near Height Range",
    "Day - High Density Scale", "Night - High Density Scale",
    "Day - Far Height Mid", "Day - Far Height Range",
    "Night - Far Height Mid", "Night - Far Height Range",
]
DATA_FLAGS = [
    (0x01, "Weather - Pleasant"), (0x02, "Weather - Cloudy"),
    (0x04, "Weather - Rainy"), (0x08, "Weather - Snow"),
    (0x10, "Sky Statics - Always Visible"), (0x20, "Sky Statics - Follows Sun Position"),
    (0x40, "Rain Occlusion"), (0x80, "HUD Rain Effects"),
]
SOUND_TYPE_ENUM = {0x01: "Default", 0x02: "Precipitation", 0x04: "Wind", 0x08: "Thunder"}
IMSP_WGDR_VARIANTS = [
    "Sunrise", "Day", "Sunset", "Night", "EarlySunrise", "LateSunrise",
    "EarlySunset", "LateSunset",
]

# Cloud Texture Layer tags — source's own TwbSignature constant table
# (wbDefinitionsFO4.pas ~130-158): layer 0 = #$30'0TX' (0x30 = ASCII '0'),
# layers 1-9 = '10TX'..'90TX', layer 10 = #$3A'0TX' (':'), 11 = ';0TX',
# 12 = '<0TX', 13 = '=0TX', 14 = '>0TX', 15 = '?0TX', 16 = #$40'0TX' ('@'),
# 17-28 = 'A0TX'..'L0TX'.
_CLOUD_LAYER_FIRST_BYTES = (
    [0x30 + i for i in range(10)]          # layers 0-9:  '0'.."9"
    + [0x3A + i for i in range(7)]         # layers 10-16: ':' ';' '<' '=' '>' '?' '@'
    + [0x41 + i for i in range(12)]        # layers 17-28: 'A'.."L"
)
CLOUD_TEXTURE_LAYER_TAGS: dict[bytes, int] = {
    bytes([b]) + b"0TX": i for i, b in enumerate(_CLOUD_LAYER_FIRST_BYTES)
}


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


def _parse_byte_color(d: bytes, off: int) -> dict | None:
    if off + 4 > len(d):
        return None
    return {"r": d[off], "g": d[off + 1], "b": d[off + 2]}


def _parse_nam0(d: bytes) -> dict:
    colors: dict[str, dict] = {}
    off = 0
    for group_name in NAM0_GROUP_NAMES:
        if off >= len(d):
            break
        variants: dict[str, dict] = {}
        for variant_name in TIME_OF_DAY_VARIANTS:
            c = _parse_byte_color(d, off)
            if c is None:
                break
            variants[variant_name] = c
            off += 4
        if variants:
            colors[group_name] = variants
    return colors


def _parse_fnam(d: bytes) -> dict:
    out: dict[str, float] = {}
    off = 0
    for name in FNAM_FIELD_NAMES:
        if off + 4 > len(d):
            break
        out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
        off += 4
    return out


def _parse_data(d: bytes) -> dict:
    out: dict = {}
    n = len(d)
    def u8(off):
        return d[off] if off < n else None
    wind_speed = u8(0)
    trans_delta = u8(3)
    sun_glare = u8(4)
    sun_damage = u8(5)
    precip_fade_in = u8(6)
    precip_fade_out = u8(7)
    thunder_fade_in = u8(8)
    thunder_fade_out = u8(9)
    thunder_freq = u8(10)
    flags_raw = u8(11)
    lightning_color = None
    if n >= 15:
        lightning_color = {"r": d[12], "g": d[13], "b": d[14]}
    visual_effect_begin = u8(15)
    visual_effect_end = u8(16)
    wind_direction = u8(17)
    wind_direction_range = u8(18)
    out.update({
        "wind_speed": wind_speed, "trans_delta": trans_delta,
        "sun_glare": sun_glare, "sun_damage": sun_damage,
        "precipitation_begin_fade_in": precip_fade_in, "precipitation_end_fade_out": precip_fade_out,
        "thunder_lightning_begin_fade_in": thunder_fade_in, "thunder_lightning_end_fade_out": thunder_fade_out,
        "thunder_lightning_frequency": thunder_freq,
        "flags": _decode_flags_bitfield(flags_raw, DATA_FLAGS) if flags_raw is not None else [],
        "lightning_color": lightning_color,
        "visual_effect_begin": visual_effect_begin, "visual_effect_end": visual_effect_end,
        "wind_direction": wind_direction, "wind_direction_range": wind_direction_range,
    })
    return out


def _parse_imsp_wgdr(d: bytes) -> dict:
    out: dict[str, str | None] = {}
    off = 0
    for name in IMSP_WGDR_VARIANTS:
        if off + 4 > len(d):
            break
        out[name] = fid_hex(d[off:off + 4])
        off += 4
    return out


def _parse_unam(d: bytes) -> dict:
    out: dict = {}
    n = len(d)
    out["on_lightning_strike_spell"] = fid_hex(d[0:4]) if n >= 4 else None
    out["on_lightning_strike_threshold"] = round(struct.unpack_from("<f", d, 4)[0], 5) if n >= 8 else None
    out["on_weather_activate_spell"] = fid_hex(d[8:12]) if n >= 12 else None
    out["on_weather_activate_threshold"] = round(struct.unpack_from("<f", d, 12)[0], 5) if n >= 16 else None
    return out


def _cloud_speed(raw_byte: int) -> float:
    # Source's own wbCloudSpeedToStr/wbCloudSpeedToInt conversion.
    return round((raw_byte - 127) / 127 / 10, 6)


def _parse_cloud_speed_array(d: bytes) -> dict[int, float]:
    return {i: _cloud_speed(b) for i, b in enumerate(d)}


def _parse_dalc(d: bytes) -> dict | None:
    # wbAmbientColors: 6 directional wbByteColors + Specular wbByteColors + Scale float = 32 bytes.
    if len(d) < 28:
        return None
    names = ["x_plus", "x_minus", "y_plus", "y_minus", "z_plus", "z_minus"]
    directional = {}
    off = 0
    for name in names:
        c = _parse_byte_color(d, off)
        if c is None:
            return None
        directional[name] = c
        off += 4
    specular = _parse_byte_color(d, off)
    off += 4
    scale = round(struct.unpack_from("<f", d, off)[0], 5) if off + 4 <= len(d) else None
    return {"directional": directional, "specular": specular, "scale": scale}


def _parse_cloud_colors(d: bytes) -> list[dict]:
    # PNAM: variable-count array of 32-byte wbWeatherColors groups (one per active cloud layer).
    groups: list[dict] = []
    off = 0
    while off + 32 <= len(d):
        variants: dict[str, dict] = {}
        voff = off
        for variant_name in TIME_OF_DAY_VARIANTS:
            c = _parse_byte_color(d, voff)
            if c is None:
                break
            variants[variant_name] = c
            voff += 4
        groups.append(variants)
        off += 32
    return groups


def _parse_cloud_alphas(d: bytes) -> list[dict]:
    # JNAM: variable-count array of 32-byte (8-float, one per time-of-day variant) groups.
    groups: list[dict] = []
    off = 0
    while off + 32 <= len(d):
        variants: dict[str, float] = {}
        voff = off
        for variant_name in TIME_OF_DAY_VARIANTS:
            if voff + 4 > len(d):
                break
            variants[variant_name] = round(struct.unpack_from("<f", d, voff)[0], 5)
            voff += 4
        groups.append(variants)
        off += 32
    return groups


def _extract_one_wthr(dec: bytes, form_id: int, header_flags_raw: int) -> dict | None:
    edid: str | None = None
    precipitation_type: str | None = None
    visual_effect: str | None = None
    weather_colors: dict = {}
    fog_distance: dict = {}
    data: dict = {}
    disabled_cloud_layers_mask: int | None = None
    sounds: list[dict] = []
    sky_statics: list[str] = []
    image_spaces: dict = {}
    god_rays: dict = {}
    sun_glare_lens_flare: str | None = None
    magic: dict = {}
    volatility_mult: float | None = None
    visibility_mult: float | None = None
    cloud_texture_layers: dict[int, str] = {}
    cloud_speed_y: dict[int, float] = {}
    cloud_speed_x: dict[int, float] = {}
    cloud_colors: list[dict] = []
    cloud_alphas: list[dict] = []
    directional_ambient_lighting: dict[str, dict] = {}
    aurora_model: str | None = None
    _dalc_idx = 0

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "MNAM":
            precipitation_type = fid_hex(d)
        elif tag == "NNAM":
            visual_effect = fid_hex(d)
        elif tag == "NAM0":
            weather_colors = _parse_nam0(d)
        elif tag == "FNAM":
            fog_distance = _parse_fnam(d)
        elif tag == "DATA":
            data = _parse_data(d)
        elif tag == "NAM1" and len(d) >= 4:
            disabled_cloud_layers_mask = struct.unpack_from("<I", d, 0)[0]
        elif tag == "SNAM" and len(d) >= 8:
            fid = fid_hex(d[0:4])
            type_raw = struct.unpack_from("<I", d, 4)[0]
            sounds.append({"sound": fid, "type": SOUND_TYPE_ENUM.get(type_raw, f"Unknown ({type_raw})")})
        elif tag == "TNAM":
            fid = fid_hex(d)
            if fid:
                sky_statics.append(fid)
        elif tag == "IMSP":
            image_spaces = _parse_imsp_wgdr(d)
        elif tag == "WGDR":
            god_rays = _parse_imsp_wgdr(d)
        elif tag == "GNAM":
            sun_glare_lens_flare = fid_hex(d)
        elif tag == "UNAM":
            magic = _parse_unam(d)
        elif tag == "VNAM" and len(d) >= 4:
            volatility_mult = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag == "WNAM" and len(d) >= 4:
            visibility_mult = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag_b in CLOUD_TEXTURE_LAYER_TAGS:
            path = resolve_string(d)
            if path:
                cloud_texture_layers[CLOUD_TEXTURE_LAYER_TAGS[tag_b]] = path
        elif tag == "RNAM":
            cloud_speed_y = _parse_cloud_speed_array(d)
        elif tag == "QNAM":
            cloud_speed_x = _parse_cloud_speed_array(d)
        elif tag == "PNAM":
            cloud_colors = _parse_cloud_colors(d)
        elif tag == "JNAM":
            cloud_alphas = _parse_cloud_alphas(d)
        elif tag == "DALC":
            parsed = _parse_dalc(d)
            if parsed is not None and _dalc_idx < len(TIME_OF_DAY_VARIANTS):
                directional_ambient_lighting[TIME_OF_DAY_VARIANTS[_dalc_idx]] = parsed
            _dalc_idx += 1
        elif tag == "MODL":
            aurora_model = resolve_string(d)

    if not edid:
        return None

    return {
        "record_type": "WTHR", "form_id": f"0x{form_id:08X}", "edid": edid,
        "header_flags": _decode_flags_bitfield(header_flags_raw, WTHR_HEADER_FLAGS),
        "precipitation_type": precipitation_type, "visual_effect": visual_effect,
        "weather_colors": weather_colors, "fog_distance": fog_distance, "data": data,
        "disabled_cloud_layers_mask": disabled_cloud_layers_mask,
        "sounds": sounds, "sky_statics": sky_statics,
        "image_spaces": image_spaces, "god_rays": god_rays,
        "sun_glare_lens_flare": sun_glare_lens_flare, "magic": magic,
        "volatility_mult": volatility_mult, "visibility_mult": visibility_mult,
        "cloud_texture_layers": cloud_texture_layers,
        "cloud_speed_y": cloud_speed_y, "cloud_speed_x": cloud_speed_x,
        "cloud_colors": cloud_colors, "cloud_alphas": cloud_alphas,
        "directional_ambient_lighting": directional_ambient_lighting,
        "aurora_model": aurora_model,
    }


def extract_wthrs(esm_path: Path) -> list[dict]:
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
        if rec_type == b"WTHR":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_wthr(dec, form_id, header_flags)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_wthr: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for weathers...")
        all_wthr.extend(extract_wthrs(esm_path))

    with_sounds = [w for w in all_wthr if w["sounds"]]
    with_sky_statics = [w for w in all_wthr if w["sky_statics"]]
    pleasant = [w for w in all_wthr if "Weather - Pleasant" in w["data"].get("flags", [])]
    rainy = [w for w in all_wthr if "Weather - Rainy" in w["data"].get("flags", [])]
    snow = [w for w in all_wthr if "Weather - Snow" in w["data"].get("flags", [])]
    with_cloud_textures = [w for w in all_wthr if w["cloud_texture_layers"]]
    with_dalc = [w for w in all_wthr if w["directional_ambient_lighting"]]
    with_aurora = [w for w in all_wthr if w["aurora_model"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_weathers": len(all_wthr),
        "with_sounds": len(with_sounds),
        "with_sky_statics": len(with_sky_statics),
        "pleasant": len(pleasant),
        "rainy": len(rainy),
        "snow": len(snow),
        "with_cloud_textures": len(with_cloud_textures),
        "with_directional_ambient_lighting": len(with_dalc),
        "with_aurora": len(with_aurora),
        "weathers": all_wthr,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Weather scan complete in {elapsed:.1f}s ===")
    print(f"  Total weathers: {len(all_wthr):,} ({pleasant and len(pleasant) or 0} pleasant, {len(rainy):,} rainy, {len(snow):,} snow)")
    print(f"  With sounds: {len(with_sounds):,}, with sky statics: {len(with_sky_statics):,}")
    print(f"  With cloud textures: {len(with_cloud_textures):,}, with DALC: {len(with_dalc):,}, with Aurora: {len(with_aurora):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
