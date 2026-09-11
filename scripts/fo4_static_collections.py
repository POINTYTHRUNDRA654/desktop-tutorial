#!/usr/bin/env python3
"""
fo4_static_collections.py — FO4 Static Collection (SCOL)
========================================================================
Sixteenth stop in the "grind it to zero" pass. Static Collections group
multiple placeable objects (statics, activators, containers, doors,
furniture, misc items, moveable statics, terminals, weapons, etc.) into
one reusable "prefab" — each part referencing a base object plus a list
of position/rotation/scale placements relative to the collection's own
origin. Common in vanilla clutter/debris dressing and a useful modding
building block for hand-placing complex assemblies as a single
reference.

Source-verified (wbDefinitionsFO4.pas ~16164-16198): EDID, OBND
(bounds, not decoded), PTRN (not decoded), MODL, FULL, FLTR (not
decoded), then a repeating "Parts" group:
  ONAM (Static FormID -> one of ACTI/ALCH/AMMO/BOOK/CONT/DOOR/FURN/
    MISC/MSTT/STAT/TERM/WEAP — used as the per-part boundary, since
    source confirms it always starts a new part)
  DATA (repeating, one 28-byte "Placement" struct per subrecord: X/Y/Z
    position floats, X/Y/Z rotation floats, Scale float) — every DATA
    seen after an ONAM and before the next ONAM belongs to that part.

Outputs:
  <scan-cache>/fo4_static_collections.json
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
GRAPH_OUT = _OUT_DIR / "fo4_static_collections.json"

COMPRESSED_FLAG = 0x00040000


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


def parse_placement(d: bytes) -> dict | None:
    if len(d) < 28:
        return None
    try:
        vals = struct.unpack_from("<7f", d, 0)
        return {
            "x": round(vals[0], 4), "y": round(vals[1], 4), "z": round(vals[2], 4),
            "rot_x": round(vals[3], 5), "rot_y": round(vals[4], 5), "rot_z": round(vals[5], 5),
            "scale": round(vals[6], 5),
        }
    except struct.error:
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


def _extract_one_scol(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    parts: list[dict] = []
    cur_part: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            if model_path is None:
                model_path = resolve_string(d)
        elif tag == "ONAM":
            if cur_part is not None:
                parts.append(cur_part)
            cur_part = {"static": fid_hex(d), "placements": []}
        elif tag == "DATA":
            if cur_part is None:
                cur_part = {"static": None, "placements": []}
            p = parse_placement(d)
            if p is not None:
                cur_part["placements"].append(p)

    if cur_part is not None:
        parts.append(cur_part)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "model_path": model_path,
        "part_count": len(parts),
        "total_placements": sum(len(p["placements"]) for p in parts),
        "parts": parts,
    }


def extract_scols(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        data_size = struct.unpack_from("<I", data, pos + 4)[0]
        flags     = struct.unpack_from("<I", data, pos + 8)[0]
        form_id   = struct.unpack_from("<I", data, pos + 12)[0]
        pos += 24
        if pos + data_size > length:
            break
        if rec_type == b"SCOL":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                s = _extract_one_scol(dec, form_id, string_lookup)
                if s is not None:
                    out.append(s)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_scols: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for static collections...")
        all_scols.extend(extract_scols(esm_path, string_lookup))

    total_placements = sum(s["total_placements"] for s in all_scols)

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_static_collections": len(all_scols),
        "total_placements": total_placements,
        "static_collections": all_scols,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Static collection scan complete in {elapsed:.1f}s ===")
    print(f"  Total static collections: {len(all_scols):,}")
    print(f"  Total placements: {total_placements:,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
