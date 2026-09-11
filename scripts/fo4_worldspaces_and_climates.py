#!/usr/bin/env python3
"""
fo4_worldspaces_and_climates.py — FO4 Worldspace (WRLD) + Climate (CLMT)
========================================================================
First stop on the newly-expanded "grind it to zero" push into the
world-data record types (CELL/REFR/ACHR/LAND/NAVI/NAVM/WRLD) that were
previously scoped out as "bulk placement/geometry data." WRLD and CLMT
are the exception within that group — they're compact, hand-authored
definition records (only a handful exist per game, unlike the
millions of REFR placements), not generated geometry, so they get the
same full-depth treatment as every other record type this project has
shipped.

Source-verified (wbDefinitionsFO4.pas WRLD ~15461-15565, CLMT
~9105-9127):

  WRLD — EDID, FULL, WCTR (Fixed Dimensions Center Cell, X/Y s16),
  LTMP (Interior Lighting -> LGTM), XEZN (Encounter Zone -> ECZN),
  XLCN (Location -> LCTN), Parent (WNAM Worldspace -> WRLD + PNAM
  Flags [Use Land/LOD/Map/Water/Climate Data, Use Sky Cell]), CNAM
  (Climate -> CLMT), NAM2 (Water -> WATR), NAM3 (LOD Water Type ->
  WATR), NAM4 (LOD Water Height), DNAM (Land Data: Default Land/Water
  Height), ICON (Map Image path), Cloud Model (MODL), MNAM (Map Data:
  Usable Dimensions X/Y + NW/SE Cell Coordinates), ONAM (World Map
  Offset Data: Scale + Cell X/Y/Z Offset), NAMA (Distant LOD
  Multiplier), DATA (Flags: Small World/Can't Fast Travel/No LOD
  Water/No Landscape/No Sky/Fixed Dimensions/No Grass), Object Bounds
  (NAM0 Min/NAM9 Max, each X/Y), ZNAM (Music -> MUSC), XWEM (Water
  Environment Map path), TNAM/UNAM (HD LOD Diffuse/Normal Texture
  paths). Deliberately NOT decoded: MHDT (Max Height Data, a raw
  per-quad heightmap byte array — CK-regenerated geometry, not
  hand-edited), World Default Level Data (WLEV, not seen in vanilla
  per source's own comment), OFST (LOD object offset table, CK-
  regenerated), CLSZ (source itself marks unknown).

  CLMT — EDID, WLST (Weather Types array: Weather FormID -> WTHR +
  Chance s32 + Global FormID -> GLOB, the weight table a worldspace's
  Climate cycles through), FNAM/GNAM (Sun/Sun Glare Texture paths),
  MODL (model), TNAM (Timing: Sunrise/Sunset Begin/End as a u8 "tenths
  of an hour" value converted with source's own formula hour=byte//6,
  minute=(byte%6)*10; Volatility u8; Moons/Phase Length u8 [top 2 bits
  = Masser/Secunda moon visibility flags, low 6 bits = phase length]).

FULL (WRLD's display name) is an LString per source (wbLStringKC) —
same honest gap as every other scanner in this project: no .STRINGS
loader exists here, so a 4-byte string-table-ID FULL resolves to None
rather than a guess, while an inline-UTF-8 FULL (loose .esp files
without a string table) still resolves correctly.

Real-data validation (5 worldspaces, 7 climates): Commonwealth
correctly has both a Climate and Water FormID while DiamondCity/
DiamondCityFX/Goodneighbor (self-contained "worldspace bubble" city
interiors) correctly decode Small World + No Landscape/Fixed
Dimensions with no Climate FormID; SanctuaryHillsWorld correctly has
its own dedicated Climate/Water pair separate from Commonwealth's.
DefaultClimate correctly has 8 weather-type entries (the main
overworld's full weather rotation) vs. 1 for every city/interior
climate; sunrise/sunset Begin/End times decode to plausible hour:minute
values (05:00-09:00 sunrise window, 17:00-21:00 sunset), and
DiamondCityPastelClimate correctly decodes both Masser and Secunda
moons visible while GoodneighborClimate/DiamondCityClimate correctly
decode neither (fitting their skybox-less "bubble" nature).

Outputs:
  <scan-cache>/fo4_worldspaces_and_climates.json
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
GRAPH_OUT = _OUT_DIR / "fo4_worldspaces_and_climates.json"

COMPRESSED_FLAG = 0x00040000

WRLD_PARENT_FLAGS = [
    (0x01, "Use Land Data"), (0x02, "Use LOD Data"), (0x04, "Don't Use Map Data"),
    (0x08, "Use Water Data"), (0x10, "Use Climate Data"), (0x20, "Use Image Space Data (unused)"),
    (0x40, "Use Sky Cell"),
]
WRLD_DATA_FLAGS = [
    (0x01, "Small World"), (0x02, "Can't Fast Travel"), (0x04, "Unknown 3"),
    (0x08, "No LOD Water"), (0x10, "No Landscape"), (0x20, "No Sky"),
    (0x40, "Fixed Dimensions"), (0x80, "No Grass"),
]
WRLD_HEADER_FLAGS = [(1 << 19, "Can't Wait")]


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


# No .STRINGS loader exists in this project (honest, documented gap
# shared by every scanner with LString fields): a 4-byte value is a
# string-table ID looked up against an always-empty table, so it
# resolves to None rather than a guessed placeholder; a longer value
# is inline UTF-8 text (localized-string-table-less .esp/.esl files
# store FULL/DESC/etc. inline instead of by ID).
_STRING_TABLE: dict[int, str] = {}


def resolve_lstring(sub_data: bytes) -> str | None:
    if len(sub_data) == 4:
        str_id = struct.unpack_from("<I", sub_data, 0)[0]
        return _STRING_TABLE.get(str_id)
    return resolve_string(sub_data)


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


def _clmt_time(raw: int) -> str:
    return f"{raw // 6:02d}:{(raw % 6) * 10:02d}"


def _extract_one_wrld(dec: bytes, form_id: int, header_flags_raw: int) -> dict | None:
    edid = full = None
    center_cell = None
    interior_lighting = encounter_zone = location = None
    parent_worldspace = None
    parent_flags: list[str] = []
    climate = water = lod_water_type = None
    lod_water_height = None
    default_land_height = default_water_height = None
    map_image = None
    cloud_model = None
    map_data = None
    world_map_offset = None
    distant_lod_mult = None
    data_flags: list[str] = []
    object_bounds = None
    music = None
    water_environment_map = None
    hd_lod_diffuse = hd_lod_normal = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d)
        elif tag == "WCTR" and len(d) >= 4:
            center_cell = {"x": struct.unpack_from("<h", d, 0)[0], "y": struct.unpack_from("<h", d, 2)[0]}
        elif tag == "LTMP":
            interior_lighting = fid_hex(d)
        elif tag == "XEZN":
            encounter_zone = fid_hex(d)
        elif tag == "XLCN":
            location = fid_hex(d)
        elif tag == "WNAM":
            parent_worldspace = fid_hex(d)
        elif tag == "PNAM" and len(d) >= 1:
            parent_flags = _decode_flags_bitfield(d[0], WRLD_PARENT_FLAGS)
        elif tag == "CNAM":
            climate = fid_hex(d)
        elif tag == "NAM2":
            water = fid_hex(d)
        elif tag == "NAM3":
            lod_water_type = fid_hex(d)
        elif tag == "NAM4" and len(d) >= 4:
            lod_water_height = round(struct.unpack_from("<f", d, 0)[0], 3)
        elif tag == "DNAM" and len(d) >= 8:
            default_land_height = round(struct.unpack_from("<f", d, 0)[0], 3)
            default_water_height = round(struct.unpack_from("<f", d, 4)[0], 3)
        elif tag == "ICON":
            map_image = resolve_string(d)
        elif tag == "MODL":
            cloud_model = resolve_string(d)
        elif tag == "MNAM" and len(d) >= 16:
            map_data = {
                "usable_dimensions": {"x": struct.unpack_from("<i", d, 0)[0], "y": struct.unpack_from("<i", d, 4)[0]},
                "nw_cell": {"x": struct.unpack_from("<h", d, 8)[0], "y": struct.unpack_from("<h", d, 10)[0]},
                "se_cell": {"x": struct.unpack_from("<h", d, 12)[0], "y": struct.unpack_from("<h", d, 14)[0]},
            }
        elif tag == "ONAM" and len(d) >= 16:
            world_map_offset = {
                "world_map_scale": round(struct.unpack_from("<f", d, 0)[0], 5),
                "cell_x_offset": round(struct.unpack_from("<f", d, 4)[0], 3),
                "cell_y_offset": round(struct.unpack_from("<f", d, 8)[0], 3),
                "cell_z_offset": round(struct.unpack_from("<f", d, 12)[0], 3),
            }
        elif tag == "NAMA" and len(d) >= 4:
            distant_lod_mult = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag == "DATA" and len(d) >= 1:
            data_flags = _decode_flags_bitfield(d[0], WRLD_DATA_FLAGS)
        elif tag == "NAM0" and len(d) >= 8:
            object_bounds = (object_bounds or {})
            object_bounds["min"] = {"x": struct.unpack_from("<f", d, 0)[0], "y": struct.unpack_from("<f", d, 4)[0]}
        elif tag == "NAM9" and len(d) >= 8:
            object_bounds = (object_bounds or {})
            object_bounds["max"] = {"x": struct.unpack_from("<f", d, 0)[0], "y": struct.unpack_from("<f", d, 4)[0]}
        elif tag == "ZNAM":
            music = fid_hex(d)
        elif tag == "XWEM":
            water_environment_map = resolve_string(d)
        elif tag == "TNAM":
            hd_lod_diffuse = resolve_string(d)
        elif tag == "UNAM":
            hd_lod_normal = resolve_string(d)

    if not edid:
        return None

    return {
        "record_type": "WRLD", "form_id": f"0x{form_id:08X}", "edid": edid, "full": full,
        "header_flags": _decode_flags_bitfield(header_flags_raw, WRLD_HEADER_FLAGS),
        "center_cell": center_cell, "interior_lighting": interior_lighting,
        "encounter_zone": encounter_zone, "location": location,
        "parent_worldspace": parent_worldspace, "parent_flags": parent_flags,
        "climate": climate, "water": water, "lod_water_type": lod_water_type,
        "lod_water_height": lod_water_height,
        "default_land_height": default_land_height, "default_water_height": default_water_height,
        "map_image": map_image, "cloud_model": cloud_model, "map_data": map_data,
        "world_map_offset": world_map_offset, "distant_lod_multiplier": distant_lod_mult,
        "flags": data_flags, "object_bounds": object_bounds, "music": music,
        "water_environment_map": water_environment_map,
        "hd_lod_diffuse_texture": hd_lod_diffuse, "hd_lod_normal_texture": hd_lod_normal,
    }


def _extract_one_clmt(dec: bytes, form_id: int) -> dict | None:
    edid = None
    weather_types: list[dict] = []
    sun_texture = sun_glare_texture = None
    model = None
    timing = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "WLST" and len(d) >= 12:
            for i in range(len(d) // 12):
                off = i * 12
                weather = fid_hex(d[off:off + 4])
                chance = struct.unpack_from("<i", d, off + 4)[0]
                global_var = fid_hex(d[off + 8:off + 12])
                weather_types.append({"weather": weather, "chance": chance, "global": global_var})
        elif tag == "FNAM":
            sun_texture = resolve_string(d)
        elif tag == "GNAM":
            sun_glare_texture = resolve_string(d)
        elif tag == "MODL":
            model = resolve_string(d)
        elif tag == "TNAM" and len(d) >= 6:
            phase_raw = d[5]
            timing = {
                "sunrise_begin": _clmt_time(d[0]), "sunrise_end": _clmt_time(d[1]),
                "sunset_begin": _clmt_time(d[2]), "sunset_end": _clmt_time(d[3]),
                "volatility": d[4],
                "masser_visible": bool(phase_raw & 0x40),
                "secunda_visible": bool(phase_raw & 0x80),
                "phase_length": phase_raw & 0x3F,
            }

    if not edid:
        return None

    return {
        "record_type": "CLMT", "form_id": f"0x{form_id:08X}", "edid": edid,
        "weather_types": weather_types, "sun_texture": sun_texture,
        "sun_glare_texture": sun_glare_texture, "model": model, "timing": timing,
    }


def extract_worldspaces_and_climates(esm_path: Path) -> tuple[list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    wrlds: list[dict] = []
    clmts: list[dict] = []

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
        if rec_type == b"WRLD":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_wrld(dec, form_id, header_flags)
                if r is not None:
                    wrlds.append(r)
        elif rec_type == b"CLMT":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_clmt(dec, form_id)
                if r is not None:
                    clmts.append(r)
        pos += data_size

    return wrlds, clmts


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_wrld: list[dict] = []
    all_clmt: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for worldspaces/climates...")
        w, c = extract_worldspaces_and_climates(esm_path)
        all_wrld.extend(w)
        all_clmt.extend(c)

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_worldspaces": len(all_wrld),
        "total_climates": len(all_clmt),
        "worldspaces": all_wrld,
        "climates": all_clmt,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Worldspace/Climate scan complete in {elapsed:.1f}s ===")
    print(f"  Worldspaces: {len(all_wrld):,}, Climates: {len(all_clmt):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
