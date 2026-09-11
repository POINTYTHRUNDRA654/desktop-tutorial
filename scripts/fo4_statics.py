#!/usr/bin/env python3
"""
fo4_statics.py — FO4 Static (STAT) / Moveable Static (MSTT)
========================================================================
Twentieth stop in the "grind it to zero" pass, fourth/fifth of the
"referenced but not deep" tier. Statics are the plain non-interactive
world-dressing meshes (rocks, rubble, foliage, wreckage) that make up
the bulk of FO4's placed-object count; Moveable Statics are the subset
that can be knocked around/pushed by physics (barrels, loose debris)
while still having no gameplay logic of their own. Both are combined
into one scanner since they're the same conceptual "dumb decoration"
tier and share record-header flag decoding.

Source-verified (wbDefinitionsFO4.pas ~15043-15106 for STAT,
~10090-10116 for MSTT):

STAT:
  Record header Flags (u32, at header offset 8 -- NOT a subrecord; this
    is the first scanner in this project to decode record-level header
    flags rather than a subrecord field) -- bits include Heading
    Marker, Non Occluder, Has Tree LOD, Hidden From Local Map, Used as
    Platform, Has Distant LOD, Is Marker, Obstacle, NavMesh Generation
    variants
  EDID, FULL, MODL
  DNAM — fixed 16-byte "Direction Material" struct: Max Angle (f32,
    30-120 range per source comment), Material FormID -> MATO, Leaf
    Amplitude (f32), Leaf Frequency (f32)
  MNAM (Distant LOD mesh filenames per level, not decoded — low
    modding value, fixed-260-byte-slot binary layout)

MSTT:
  Record header Flags (same header-offset technique; a different flag
    table -- Must Update Anims, Hidden From Local Map, Used As
    Platform, Pack-In Use Only, Has Distant LOD, Random Anim Start, Has
    Currents, Obstacle, NavMesh Generation variants)
  EDID, FULL, MODL
  DATA (single u8 bool: On Local Map)
  SNAM (Looping Sound FormID -> SNDR)

Outputs:
  <scan-cache>/fo4_statics.json
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
GRAPH_OUT = _OUT_DIR / "fo4_statics.json"

COMPRESSED_FLAG = 0x00040000

STAT_HEADER_FLAGS = [
    (0x00000004, "Heading Marker"), (0x00000010, "Non Occluder"), (0x00000020, "Deleted"),
    (0x00000040, "Has Tree LOD"), (0x00000080, "Add-On LOD Object"), (0x00000200, "Hidden From Local Map"),
    (0x00000400, "Headtrack Marker"), (0x00000800, "Used as Platform"), (0x00002000, "Pack-In Use Only"),
    (0x00008000, "Has Distant LOD"), (0x00020000, "Uses HD LOD Texture"), (0x00080000, "Has Currents"),
    (0x00800000, "Is Marker"), (0x02000000, "Obstacle"), (0x04000000, "NavMesh Generation - Filter"),
    (0x08000000, "NavMesh Generation - Bounding Box"), (0x10000000, "Show In World Map (Sky Cell Only)"),
    (0x40000000, "NavMesh Generation - Ground"),
]
MSTT_HEADER_FLAGS = [
    (0x00000100, "Must Update Anims"), (0x00000200, "Hidden From Local Map"),
    (0x00000800, "Used As Platform"), (0x00002000, "Pack-In Use Only"), (0x00008000, "Has Distant LOD"),
    (0x00010000, "Random Anim Start"), (0x00080000, "Has Currents"), (0x02000000, "Obstacle"),
    (0x04000000, "NavMesh Generation - Filter"), (0x08000000, "NavMesh Generation - Bounding Box"),
    (0x40000000, "NavMesh Generation - Ground"),
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


def _extract_one_stat(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    max_angle = material = leaf_amplitude = leaf_frequency = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            if model_path is None:
                model_path = resolve_string(d)
        elif tag == "DNAM" and len(d) >= 16:
            max_angle = round(struct.unpack_from("<f", d, 0)[0], 5)
            material = fid_hex(d[4:8])
            leaf_amplitude = round(struct.unpack_from("<f", d, 8)[0], 5)
            leaf_frequency = round(struct.unpack_from("<f", d, 12)[0], 5)

    if not edid:
        return None

    return {
        "record_type": "STAT",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "model_path": model_path,
        "header_flags": _decode_flags_bitfield(header_flags_raw, STAT_HEADER_FLAGS),
        "max_angle": max_angle,
        "material": material,
        "leaf_amplitude": leaf_amplitude,
        "leaf_frequency": leaf_frequency,
    }


def _extract_one_mstt(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    on_local_map: bool | None = None
    looping_sound: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            if model_path is None:
                model_path = resolve_string(d)
        elif tag == "DATA" and len(d) >= 1:
            on_local_map = bool(d[0])
        elif tag == "SNAM":
            looping_sound = fid_hex(d)

    if not edid:
        return None

    return {
        "record_type": "MSTT",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "model_path": model_path,
        "header_flags": _decode_flags_bitfield(header_flags_raw, MSTT_HEADER_FLAGS),
        "on_local_map": on_local_map,
        "looping_sound": looping_sound,
    }


def extract_statics(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        data_size       = struct.unpack_from("<I", data, pos + 4)[0]
        header_flags    = struct.unpack_from("<I", data, pos + 8)[0]
        form_id         = struct.unpack_from("<I", data, pos + 12)[0]
        pos += 24
        if pos + data_size > length:
            break
        if rec_type in (b"STAT", b"MSTT"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"STAT":
                    r = _extract_one_stat(dec, form_id, header_flags, string_lookup)
                else:
                    r = _extract_one_mstt(dec, form_id, header_flags, string_lookup)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_statics: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for statics...")
        all_statics.extend(extract_statics(esm_path, string_lookup))

    by_type: dict[str, int] = {}
    for s in all_statics:
        by_type[s["record_type"]] = by_type.get(s["record_type"], 0) + 1

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_statics": len(all_statics),
        "by_type": by_type,
        "statics": all_statics,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Static scan complete in {elapsed:.1f}s ===")
    print(f"  Total statics: {len(all_statics):,} ({by_type})")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
