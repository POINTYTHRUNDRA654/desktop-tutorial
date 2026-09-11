#!/usr/bin/env python3
"""
fo4_regions.py — FO4 Region (REGN)
========================================================================
Thirty-second stop in the "grind it to zero" pass, eighth of the broader
engine-plumbing sweep. Regions are the polygon-bounded zones painted
onto a worldspace that drive procedural object scatter (trees/rocks/
grass/statics), weather selection, ambient sound/music, and encounter
map naming — a staple of "add a new settlement area" or "reskin this
biome" mods, and the record type behind vanilla content like the
Glowing Sea's weather table and Boston Common's tree scatter.

Source-verified (wbDefinitionsFO4.pas REGN ~14835-14956):
  Record header Flags (u32, at header offset 8) — bit 6 (0x00000040)
    Border Region, computed from bit index per this project's standing
    rule (never trust a possibly-stale inline hex comment).
  EDID
  RCLR (Map Color) — Red/Green/Blue u8 + 1 unused byte
  WNAM — Worldspace FormID (-> WRLD)
  Region Areas — repeating group boundary-keyed on RPLI (Edge Fall-off,
    u32), each holding RPLD (Region Point List Data: array of X/Y float
    pairs describing the region's polygon boundary) and a trailing ANAM
    subrecord source marks wbUnknown (undocumented, presence/length
    only, no decoded meaning — consistent with this project's "never
    guess" rule).
  Region Data Entries — repeating group boundary-keyed on RDAT (Data
    Header: Type u32 enum [Objects/Weather/Map/Land/Grass/Sound/
    Imposter/etc.], Flags u8 [Override], Priority u8, 2 unused bytes),
    each optionally followed by any combination of:
      ICON (icon path string)
      RDMO (Music FormID -> MUSC)
      RDSA (Sounds array, 12-byte fixed structs: Sound FormID -> SNDR,
        Flags u32 [Pleasant/Cloudy/Rainy/Snowy], Chance float)
      RDMP (Map Name, lstring)
      RDOT (Objects array, 52-byte fixed structs: Object FormID -> TREE/
        FLOR/STAT/LTEX/MSTT, Parent Index u16, Density float, Clustering/
        MinSlope/MaxSlope u8, Flags u8 [Conform to slope/Paint Vertices/
        Size Variance/X,Y,Z +-/Tree/Huge Rock], Radius wrt Parent u16,
        Radius u16, Min/Max Height float, Sink/Sink Variance/Size
        Variance float, Angle Variance X/Y/Z u16)
      RDGS (Grasses array, 8-byte fixed structs: Grass FormID -> GRAS +
        4 unused bytes)
      RDWT (Weather Types array, 12-byte fixed structs: Weather FormID
        -> WTHR, Chance u32, Global FormID -> GLOB)
      RLDM (LOD Display Distance Multiplier, float)
      ANAM (Occlusion Accuracy Dist, float — distinct field from the
        Region Areas' undocumented ANAM above; same tag, different
        scope, resolved correctly since parsing is per-entry-scoped)
  Not decoded (no modding value / binary or legacy, consistent with the
    rest of this project): none of substance — every RDAT-scoped
    subrecord with real modding value is covered.

Outputs:
  <scan-cache>/fo4_regions.json
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
GRAPH_OUT = _OUT_DIR / "fo4_regions.json"

COMPRESSED_FLAG = 0x00040000

REGN_HEADER_FLAGS = [(1 << 6, "Border Region")]

RDAT_TYPE = {
    0: "Unknown 0", 1: "Unknown 1", 2: "Objects", 3: "Weather", 4: "Map", 5: "Land",
    6: "Grass", 7: "Sound", 8: "Imposter", 9: "Unknown 10", 10: "Unknown 11",
    11: "Unknown 12", 12: "Unknown 13", 13: "Unknown 14", 14: "Unknown 15", 15: "Unknown 16",
}
RDAT_FLAGS = [(0x01, "Override")]
RDSA_FLAGS = [(0x00000001, "Pleasant"), (0x00000002, "Cloudy"), (0x00000004, "Rainy"), (0x00000008, "Snowy")]
RDOT_FLAGS = [
    (0x01, "Conform to slope"), (0x02, "Paint Vertices"), (0x04, "Size Variance +/-"),
    (0x08, "X +/-"), (0x10, "Y +/-"), (0x20, "Z +/-"), (0x40, "Tree"), (0x80, "Huge Rock"),
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


def _parse_rdot(d: bytes) -> list[dict]:
    out = []
    stride = 52
    for i in range(len(d) // stride):
        off = i * stride
        if off + stride > len(d):
            break
        fid = fid_hex(d[off:off + 4])
        parent_index = struct.unpack_from("<H", d, off + 4)[0]
        density = struct.unpack_from("<f", d, off + 8)[0]
        clustering = d[off + 12]
        min_slope = d[off + 13]
        max_slope = d[off + 14]
        flags = d[off + 15]
        radius_wrt_parent = struct.unpack_from("<H", d, off + 16)[0]
        radius = struct.unpack_from("<H", d, off + 18)[0]
        min_height = struct.unpack_from("<f", d, off + 20)[0]
        max_height = struct.unpack_from("<f", d, off + 24)[0]
        sink = struct.unpack_from("<f", d, off + 28)[0]
        sink_variance = struct.unpack_from("<f", d, off + 32)[0]
        size_variance = struct.unpack_from("<f", d, off + 36)[0]
        out.append({
            "object": fid,
            "parent_index": parent_index if parent_index != 0xFFFF else None,
            "density": round(density, 4),
            "clustering": clustering,
            "min_slope": min_slope,
            "max_slope": max_slope,
            "flags": _decode_flags_bitfield(flags, RDOT_FLAGS),
            "radius_wrt_parent": radius_wrt_parent,
            "radius": radius,
            "min_height": round(min_height, 3),
            "max_height": round(max_height, 3),
            "sink": round(sink, 4),
            "sink_variance": round(sink_variance, 4),
            "size_variance": round(size_variance, 4),
        })
    return out


def _parse_rdgs(d: bytes) -> list[str]:
    stride = 8
    out = []
    for i in range(len(d) // stride):
        fid = fid_hex(d[i * stride:i * stride + 4])
        if fid:
            out.append(fid)
    return out


def _parse_rdwt(d: bytes) -> list[dict]:
    stride = 12
    out = []
    for i in range(len(d) // stride):
        off = i * stride
        fid = fid_hex(d[off:off + 4])
        chance = struct.unpack_from("<I", d, off + 4)[0]
        glob = fid_hex(d[off + 8:off + 12])
        if fid:
            out.append({"weather": fid, "chance": chance, "global": glob})
    return out


def _parse_rdsa(d: bytes) -> list[dict]:
    stride = 12
    out = []
    for i in range(len(d) // stride):
        off = i * stride
        fid = fid_hex(d[off:off + 4])
        flags = struct.unpack_from("<I", d, off + 4)[0]
        chance = struct.unpack_from("<f", d, off + 8)[0]
        if fid:
            out.append({"sound": fid, "flags": _decode_flags_bitfield(flags, RDSA_FLAGS), "chance": round(chance, 4)})
    return out


def _extract_one_regn(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    map_color: dict | None = None
    worldspace: str | None = None
    areas: list[dict] = []
    entries: list[dict] = []

    cur_area: dict | None = None
    cur_entry: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")

        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "RCLR" and len(d) >= 3:
            map_color = {"red": d[0], "green": d[1], "blue": d[2]}
        elif tag == "WNAM":
            worldspace = fid_hex(d)

        elif tag == "RPLI" and len(d) >= 4:
            if cur_area is not None:
                areas.append(cur_area)
            cur_area = {"edge_falloff": struct.unpack_from("<I", d, 0)[0], "points": []}
        elif tag == "RPLD" and cur_area is not None:
            pts = []
            for i in range(len(d) // 8):
                x = struct.unpack_from("<f", d, i * 8)[0]
                y = struct.unpack_from("<f", d, i * 8 + 4)[0]
                pts.append([round(x, 2), round(y, 2)])
            cur_area["points"] = pts

        elif tag == "RDAT" and len(d) >= 4:
            if cur_entry is not None:
                entries.append(cur_entry)
            rtype = struct.unpack_from("<I", d, 0)[0]
            rflags = d[4] if len(d) > 4 else 0
            priority = d[5] if len(d) > 5 else 0
            cur_entry = {
                "type": RDAT_TYPE.get(rtype, f"Unknown ({rtype})"),
                "flags": _decode_flags_bitfield(rflags, RDAT_FLAGS),
                "priority": priority,
                "icon": None, "music": None, "sounds": [], "map_name": None,
                "objects": [], "grasses": [], "weather_types": [],
                "lod_display_distance_multiplier": None, "occlusion_accuracy_dist": None,
            }
        elif cur_entry is not None:
            if tag == "ICON":
                cur_entry["icon"] = resolve_string(d)
            elif tag == "RDMO":
                cur_entry["music"] = fid_hex(d)
            elif tag == "RDSA":
                cur_entry["sounds"] = _parse_rdsa(d)
            elif tag == "RDMP":
                cur_entry["map_name"] = resolve_lstring(d, string_lookup)
            elif tag == "RDOT":
                cur_entry["objects"] = _parse_rdot(d)
            elif tag == "RDGS":
                cur_entry["grasses"] = _parse_rdgs(d)
            elif tag == "RDWT":
                cur_entry["weather_types"] = _parse_rdwt(d)
            elif tag == "RLDM" and len(d) >= 4:
                cur_entry["lod_display_distance_multiplier"] = round(struct.unpack_from("<f", d, 0)[0], 4)
            elif tag == "ANAM" and len(d) >= 4:
                cur_entry["occlusion_accuracy_dist"] = round(struct.unpack_from("<f", d, 0)[0], 4)

    if cur_area is not None:
        areas.append(cur_area)
    if cur_entry is not None:
        entries.append(cur_entry)

    if not edid:
        return None

    return {
        "record_type": "REGN",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "header_flags": _decode_flags_bitfield(header_flags_raw, REGN_HEADER_FLAGS),
        "map_color": map_color,
        "worldspace": worldspace,
        "areas": areas,
        "data_entries": entries,
    }


def extract_regions(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"REGN":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_regn(dec, form_id, header_flags, string_lookup)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_regn: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for regions...")
        all_regn.extend(extract_regions(esm_path, string_lookup))

    border_regions = [r for r in all_regn if "Border Region" in r["header_flags"]]
    with_objects = [r for r in all_regn if any(e["objects"] for e in r["data_entries"])]
    with_weather = [r for r in all_regn if any(e["weather_types"] for e in r["data_entries"])]
    with_grass = [r for r in all_regn if any(e["grasses"] for e in r["data_entries"])]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_regions": len(all_regn),
        "border_regions": len(border_regions),
        "regions_with_objects": len(with_objects),
        "regions_with_weather": len(with_weather),
        "regions_with_grass": len(with_grass),
        "regions": all_regn,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Region scan complete in {elapsed:.1f}s ===")
    print(f"  Total regions: {len(all_regn):,}")
    print(f"  Border regions: {len(border_regions):,}")
    print(f"  With objects: {len(with_objects):,}")
    print(f"  With weather: {len(with_weather):,}")
    print(f"  With grass: {len(with_grass):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
