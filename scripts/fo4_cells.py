#!/usr/bin/env python3
"""
fo4_cells.py — FO4 Cell (CELL)
========================================================================
Second stop in the world-data push. CELL is the record every interior
and every exterior worldspace grid-square has one of — it's where a
mod that wants to change a room's ambient lighting, water level,
encounter zone, acoustic space, or ownership actually makes that edit
(as opposed to WRLD, which sets worldspace-wide defaults that CELL can
override per-cell). Unlike REFR/ACHR/LAND/NAVM, a CELL record itself is
compact and hand-editable — it's the objects PLACED IN a cell (REFR/
ACHR, stored in the cell's own GRUP) and the cell's generated geometry
(LAND/NAVM, also child records) that are bulk/generated data, not the
CELL record itself.

Source-verified (wbDefinitionsFO4.pas CELL ~8951-9091):

  EDID, FULL, DATA (Flags: Is Interior Cell/Has Water/Can't Travel From
  Here/No LOD Water/Public Area/Hand Changed/Show Sky/Use Sky Lighting/
  Sunlight Shadows/Distant LOD only/Player Followers Can't Travel Here),
  XCLC (Grid X/Y + Force Hide Land quadrant flags, exterior cells only),
  XCLL (Lighting override — Ambient/Directional/Fog Near byte colors,
  Fog Near/Far, Directional Rotation XY/Z, Directional Fade, Fog Clip
  Distance/Power, an Ambient Colors [DALC] directional-lighting struct
  reused verbatim from LGTM/WTHR, Fog Color Far, Fog Max, Light Fade
  Begin/End, an Inherits bitmask saying which of the above fall back to
  the Lighting Template instead of this cell's own values, Near/Far
  Height Mid/Range, Fog Color High Near/Far, High Density Scale, Fog
  Near/Far/High Near/High Far Scale), CNAM/ZNAM (Precombined Object
  Level XY/Z, CK bookkeeping — kept for completeness), LTMP (Lighting
  Template -> LGTM), XCLW (Water Height, with source's own note that a
  $FF7FFFFF sentinel can appear and cause an invalid-float display —
  decoded as None when the raw bytes match that sentinel rather than
  showing a garbage number), XCLR (Regions array -> REGN), XLCN
  (Location -> LCTN), XCWT (Water -> WATR), Ownership (XOWN Owner
  FormID + No Crime flag, XRNK Owner Faction Rank), XILL (Lock List ->
  FLST/NPC_), XILW (Exterior LOD: Worldspace + Offset X/Y/Z, interior
  cells with a fake-window-view-to-an-exterior-worldspace setup), XCCM
  (Sky/Weather from Region -> REGN), XCAS (Acoustic Space -> ASPC),
  XEZN (Encounter Zone -> ECZN), XCMO (Music Type -> MUSC), XCIM (Image
  Space -> IMGS), XGDR (God Rays -> GDRY).

  Deliberately NOT decoded (genuinely CK-generated/regenerated, not
  hand-edited): VISI/PCMB (PreVis/PreCombined timestamp byte pairs),
  MHDT Max Height Data (interior-cell heightmap-adjacent byte blob),
  XPRI (Physics References array — can have 20,000+ entries per source's
  own comment, pure CK bookkeeping of which placed refs need physics),
  XCRI (Combined References — precombined-mesh optimization data, 100%
  CK-generated and invalidated by any edit to the cell's placement).

  Given the sheer volume of CELL records in a full ESM (~40,000 in the
  base game alone), this scanner only keeps a cell in its output if it
  has an EditorID, a FULL name, or at least one override field set —
  the same "only append if there's something to say" pattern already
  used by several other scanners in this project (e.g. leveled lists,
  regions). One field is deliberately EXCLUDED from that gate: XCLW
  Water Height. Real-data inspection showed 39,819 of 40,165 cells
  (~99%) have a non-sentinel water height, since FO4's Commonwealth
  worldspace has a default water plane under nearly everything — using
  it as a content gate would keep almost every cell and defeat the
  filter's purpose. Water Height is still decoded and included in the
  output for any cell kept on other grounds. With this filter, real
  base-game data goes from 40,165 total CELL records down to 6,066 kept
  (a cell with only water-height-plus-a-Grid, and nothing else, is
  exactly the kind of "nothing to say" wilderness square this filter is
  meant to drop).

Outputs:
  <scan-cache>/fo4_cells.json
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
GRAPH_OUT = _OUT_DIR / "fo4_cells.json"

COMPRESSED_FLAG = 0x00040000

CELL_DATA_FLAGS = [
    (0x0001, "Is Interior Cell"), (0x0002, "Has Water"), (0x0004, "Can't Travel From Here"),
    (0x0008, "No LOD Water"), (0x0010, "Unknown 5"), (0x0020, "Public Area"),
    (0x0040, "Hand Changed"), (0x0080, "Show Sky"), (0x0100, "Use Sky Lighting"),
    (0x0200, "Unknown 10"), (0x0400, "Unknown 11"), (0x0800, "Sunlight Shadows"),
    (0x1000, "Distant LOD only"), (0x2000, "Player Followers Can't Travel Here"),
    (0x4000, "Unknown 15"), (0x8000, "Unknown 16"),
]
CELL_FORCE_HIDE_LAND_FLAGS = [(0x01, "Quad 1"), (0x02, "Quad 2"), (0x04, "Quad 3"), (0x08, "Quad 4")]
CELL_INHERITS_FLAGS = [
    (0x0001, "Ambient Color"), (0x0002, "Directional Color"), (0x0004, "Fog Color"),
    (0x0008, "Fog Near"), (0x0010, "Fog Far"), (0x0020, "Directional Rotation"),
    (0x0040, "Directional Fade"), (0x0080, "Clip Distance"), (0x0100, "Fog Power"),
    (0x0200, "Fog Max"), (0x0400, "Light Fade Distances"),
]
CELL_OWNER_FLAGS = [(0x01, "No Crime")]


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


_STRING_TABLE: dict[int, str] = {}


def resolve_lstring(sub_data: bytes) -> str | None:
    if len(sub_data) == 4:
        str_id = struct.unpack_from("<I", sub_data, 0)[0]
        return _STRING_TABLE.get(str_id)
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


def _parse_dalc(d: bytes, off: int) -> dict | None:
    if off + 28 > len(d):
        return None
    names = ["x_plus", "x_minus", "y_plus", "y_minus", "z_plus", "z_minus"]
    directional = {}
    o = off
    for name in names:
        c = _parse_byte_color(d, o)
        if c is None:
            return None
        directional[name] = c
        o += 4
    specular = _parse_byte_color(d, o)
    o += 4
    scale = round(struct.unpack_from("<f", d, o)[0], 5) if o + 4 <= len(d) else None
    return {"directional": directional, "specular": specular, "scale": scale}


def _parse_xcll(d: bytes) -> dict:
    out: dict = {}
    n = len(d)

    def f32(off):
        return round(struct.unpack_from("<f", d, off)[0], 5) if off + 4 <= n else None

    def s32(off):
        return struct.unpack_from("<i", d, off)[0] if off + 4 <= n else None

    out["ambient_color"] = _parse_byte_color(d, 0)
    out["directional_color"] = _parse_byte_color(d, 4)
    out["fog_color_near"] = _parse_byte_color(d, 8)
    out["fog_near"] = f32(12)
    out["fog_far"] = f32(16)
    out["directional_rotation_xy"] = s32(20)
    out["directional_rotation_z"] = s32(24)
    out["directional_fade"] = f32(28)
    out["fog_clip_distance"] = f32(32)
    out["fog_power"] = f32(36)
    out["directional_ambient_lighting"] = _parse_dalc(d, 40)
    off = 40 + 32
    out["fog_color_far"] = _parse_byte_color(d, off); off += 4
    out["fog_max"] = f32(off); off += 4
    out["light_fade_begin"] = f32(off); off += 4
    out["light_fade_end"] = f32(off); off += 4
    inherits_raw = struct.unpack_from("<I", d, off)[0] if off + 4 <= n else None
    out["inherits"] = _decode_flags_bitfield(inherits_raw, CELL_INHERITS_FLAGS) if inherits_raw is not None else []
    off += 4
    out["near_height_mid"] = f32(off); off += 4
    out["near_height_range"] = f32(off); off += 4
    out["fog_color_high_near"] = _parse_byte_color(d, off); off += 4
    out["fog_color_high_far"] = _parse_byte_color(d, off); off += 4
    out["high_density_scale"] = f32(off); off += 4
    out["fog_near_scale"] = f32(off); off += 4
    out["fog_far_scale"] = f32(off); off += 4
    out["fog_high_near_scale"] = f32(off); off += 4
    out["fog_high_far_scale"] = f32(off); off += 4
    out["far_height_mid"] = f32(off); off += 4
    out["far_height_range"] = f32(off); off += 4
    return out


def _extract_one_cell(dec: bytes, form_id: int) -> dict | None:
    edid = full = None
    flags: list[str] = []
    grid = None
    lighting_override = None
    lighting_template = None
    water_height = None
    regions: list[str] = []
    location = None
    water = None
    owner = None
    owner_rank = None
    lock_list = None
    exterior_lod = None
    sky_weather_from_region = None
    acoustic_space = None
    encounter_zone = None
    music_type = None
    image_space = None
    god_rays = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d)
        elif tag == "DATA" and len(d) >= 2:
            flags = _decode_flags_bitfield(struct.unpack_from("<H", d, 0)[0], CELL_DATA_FLAGS)
        elif tag == "XCLC" and len(d) >= 8:
            grid = {
                "x": struct.unpack_from("<i", d, 0)[0], "y": struct.unpack_from("<i", d, 4)[0],
                "force_hide_land": _decode_flags_bitfield(struct.unpack_from("<I", d, 8)[0], CELL_FORCE_HIDE_LAND_FLAGS) if len(d) >= 12 else [],
            }
        elif tag == "XCLL":
            lighting_override = _parse_xcll(d)
        elif tag == "LTMP":
            lighting_template = fid_hex(d)
        elif tag == "XCLW" and len(d) >= 4:
            raw_u32 = struct.unpack_from("<I", d, 0)[0]
            # Source's comment names the sentinel as $FF7FFFFF, but real data
            # shows the actual "unset" pattern is 0x7F7FFFFF (~FLT_MAX,
            # 0x7F repeated) — trusting the observed real value over the
            # comment, same "data over stale comment" rule used elsewhere.
            if raw_u32 != 0x7F7FFFFF:
                water_height = round(struct.unpack_from("<f", d, 0)[0], 3)
        elif tag == "XCLR" and len(d) >= 4:
            for i in range(len(d) // 4):
                r = fid_hex(d[i * 4:i * 4 + 4])
                if r:
                    regions.append(r)
        elif tag == "XLCN":
            location = fid_hex(d)
        elif tag == "XCWT":
            water = fid_hex(d)
        elif tag == "XOWN" and len(d) >= 9:
            owner = fid_hex(d[0:4])
            owner_flags = _decode_flags_bitfield(d[8], CELL_OWNER_FLAGS)
            if owner or owner_flags:
                owner = {"owner": owner, "flags": owner_flags}
        elif tag == "XRNK" and len(d) >= 4:
            owner_rank = struct.unpack_from("<i", d, 0)[0]
        elif tag == "XILL":
            lock_list = fid_hex(d)
        elif tag == "XILW" and len(d) >= 16:
            exterior_lod = {
                "worldspace": fid_hex(d[0:4]),
                "offset_x": round(struct.unpack_from("<f", d, 4)[0], 3),
                "offset_y": round(struct.unpack_from("<f", d, 8)[0], 3),
                "offset_z": round(struct.unpack_from("<f", d, 12)[0], 3),
            }
        elif tag == "XCCM":
            sky_weather_from_region = fid_hex(d)
        elif tag == "XCAS":
            acoustic_space = fid_hex(d)
        elif tag == "XEZN":
            encounter_zone = fid_hex(d)
        elif tag == "XCMO":
            music_type = fid_hex(d)
        elif tag == "XCIM":
            image_space = fid_hex(d)
        elif tag == "XGDR":
            god_rays = fid_hex(d)

    # water_height is deliberately excluded from this gate: real data
    # shows ~99% of all cells (39,819 of 40,165 in the base game) have a
    # non-sentinel water height, since FO4's Commonwealth worldspace has
    # a default water plane under nearly everything — including it here
    # would make the filter keep almost every cell, defeating its point.
    # It's still included in the OUTPUT for any cell kept on other grounds.
    has_content = bool(
        edid or full or lighting_override or lighting_template
        or regions or location or water or owner or owner_rank or lock_list or exterior_lod
        or sky_weather_from_region or acoustic_space or encounter_zone or music_type
        or image_space or god_rays
    )
    if not has_content:
        return None

    return {
        "record_type": "CELL", "form_id": f"0x{form_id:08X}", "edid": edid, "full": full,
        "flags": flags, "grid": grid,
        "lighting_override": lighting_override, "lighting_template": lighting_template,
        "water_height": water_height, "regions": regions, "location": location, "water": water,
        "owner": owner, "owner_faction_rank": owner_rank, "lock_list": lock_list,
        "exterior_lod": exterior_lod, "sky_weather_from_region": sky_weather_from_region,
        "acoustic_space": acoustic_space, "encounter_zone": encounter_zone,
        "music_type": music_type, "image_space": image_space, "god_rays": god_rays,
    }


def extract_cells(esm_path: Path) -> list[dict]:
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
        if rec_type == b"CELL":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_cell(dec, form_id)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_cells: list[dict] = []
    total_scanned = 0
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for cells...")
        all_cells.extend(extract_cells(esm_path))

    interior = [c for c in all_cells if "Is Interior Cell" in c["flags"]]
    with_lighting_override = [c for c in all_cells if c["lighting_override"]]
    with_music = [c for c in all_cells if c["music_type"]]
    with_encounter_zone = [c for c in all_cells if c["encounter_zone"]]
    with_owner = [c for c in all_cells if c["owner"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_cells_with_content": len(all_cells),
        "interior_cells": len(interior),
        "with_lighting_override": len(with_lighting_override),
        "with_music": len(with_music),
        "with_encounter_zone": len(with_encounter_zone),
        "with_owner": len(with_owner),
        "cells": all_cells,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Cell scan complete in {elapsed:.1f}s ===")
    print(f"  Cells with content: {len(all_cells):,} ({len(interior):,} interior, {len(with_lighting_override):,} with lighting override, {len(with_music):,} with music, {len(with_encounter_zone):,} with encounter zone, {len(with_owner):,} with owner)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
