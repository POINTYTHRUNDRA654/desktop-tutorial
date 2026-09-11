#!/usr/bin/env python3
"""
fo4_landscape_texture_layers.py — FO4 Landscape (LAND) texture layers
========================================================================
Fourth stop in the world-data push. LAND is the per-cell terrain
record — heightmap, vertex normals, vertex colors, and which
landscape textures (LTEX) paint which quadrant. The first three are
100% CK-generated/sculpted geometry (VHGT/VNML/VCLR — a 33x33 grid of
raw height/normal/color bytes per cell, never hand-typed by a modder),
but the texture-layer assignment (which LTEX texture paints which
quadrant, in what blend order) is exactly the kind of thing a landscape
texture mod cares about and can reasonably want to inspect or compare.
So — same reasoning as CELL vs. its Physics References — this scanner
decodes only the texture-layer portion of LAND and explicitly skips the
geometry.

Source-verified (wbDefinitionsFO4.pas LAND ~12695-12780, both the
wbSimpleRecords and full-decode branches share the same Layers/VTEX
shape): a repeating "Layers" array where each entry is a union decided
by whether an ATXT (Alpha Layer) tag follows the shared BTXT/ATXT
header format: Base Layer Header / Alpha Layer Header (Texture FormID
-> LTEX, Quadrant enum [Bottom Left/Bottom Right/Top Left/Top Right],
Layer index s16) — an Alpha Layer additionally carries a VTXT Alpha
Layer Data blob (per-vertex alpha blend weights, geometry-like, NOT
decoded here). VTEX (Textures, a plain array of Texture FormIDs -> LTEX
with no quadrant/layer association — an older/simpler per-cell texture
list). Deliberately NOT decoded: DATA (Unknown byte array), VNML
(Vertex Normals, a 33x33 grid of X/Y/Z byte normals), VHGT (Vertex
Height Map, a 33x33 grid of height bytes + Offset float), VCLR (Vertex
Colours, a 33x33 grid of RGB bytes) — all CK-sculpted geometry, and
MPCD (source itself marks this Unknown).

  LAND has no EditorID (it's an anonymous per-cell child record) — cell
  attribution uses the same "nearest preceding CELL record" heuristic
  established in fo4_placement_index.py, since a LAND record is always
  a direct child of exactly one CELL's Temporary Children group.

Outputs:
  <scan-cache>/fo4_landscape_texture_layers.json
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
GRAPH_OUT = _OUT_DIR / "fo4_landscape_texture_layers.json"

COMPRESSED_FLAG = 0x00040000
QUADRANT_ENUM = {0: "Bottom Left", 1: "Bottom Right", 2: "Top Left", 3: "Top Right"}


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
    return f"0x{v:08X}" if v else None


def fid_hex_i(v: int) -> str | None:
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


def _extract_one_land(dec: bytes, form_id: int, cell_fid: int | None) -> dict | None:
    base_layers: list[dict] = []
    alpha_layers: list[dict] = []
    textures: list[str] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "BTXT" and len(d) >= 8:
            texture = fid_hex(d[0:4])
            quadrant = QUADRANT_ENUM.get(d[4], f"Unknown ({d[4]})")
            layer = struct.unpack_from("<h", d, 6)[0]
            if texture:
                base_layers.append({"quadrant": quadrant, "layer": layer, "texture": texture})
        elif tag == "ATXT" and len(d) >= 8:
            texture = fid_hex(d[0:4])
            quadrant = QUADRANT_ENUM.get(d[4], f"Unknown ({d[4]})")
            layer = struct.unpack_from("<h", d, 6)[0]
            if texture:
                alpha_layers.append({"quadrant": quadrant, "layer": layer, "texture": texture})
        elif tag == "VTEX" and len(d) >= 4:
            for i in range(len(d) // 4):
                t = fid_hex(d[i * 4:i * 4 + 4])
                if t:
                    textures.append(t)

    if not base_layers and not alpha_layers and not textures:
        return None

    return {
        "record_type": "LAND", "form_id": f"0x{form_id:08X}", "cell": fid_hex_i(cell_fid) if cell_fid else None,
        "base_layers": base_layers, "alpha_layers": alpha_layers, "textures": textures,
    }


def extract_lands(esm_path: Path) -> list[dict]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    out: list[dict] = []
    current_cell: int | None = None

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
            current_cell = form_id
        elif rec_type == b"LAND":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_land(dec, form_id, current_cell)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_land: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for landscape texture layers...")
        all_land.extend(extract_lands(esm_path))

    texture_usage: dict[str, int] = {}
    for land in all_land:
        for layer in land["base_layers"] + land["alpha_layers"]:
            texture_usage[layer["texture"]] = texture_usage.get(layer["texture"], 0) + 1

    most_used = sorted(texture_usage.items(), key=lambda kv: -kv[1])[:30]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_land_records_with_layers": len(all_land),
        "unique_textures_used": len(texture_usage),
        "most_used_textures": [{"texture": t, "quadrant_count": c} for t, c in most_used],
        "land_records": all_land,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Landscape texture layer scan complete in {elapsed:.1f}s ===")
    print(f"  LAND records with layers: {len(all_land):,}, unique textures used: {len(texture_usage):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
