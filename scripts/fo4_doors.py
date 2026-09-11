#!/usr/bin/env python3
"""
fo4_doors.py — FO4 Door (DOOR)
========================================================================
Twenty-second stop in the "grind it to zero" pass, second of the
"referenced but not deep" tier's interactive-object half (following
ACTI). Doors are activatable transition/portal objects -- open/close/
loop sounds, automatic vs. manual behavior, locked-state text overrides,
and the same record-header-flags technique proven in STAT/MSTT and ACTI.

Source-verified (wbDefinitionsFO4.pas ~9494-9525):
  Record header Flags (u32, at header offset 8) -- Non Occluder
    (0x00000010), Has Distant LOD (0x00008000), Random Anim Start
    (0x00010000), Is Marker (0x00800000)
  EDID, FULL, MODL
  KSIZ/KWDA (standard Keywords array)
  SNAM (Sound - Open FormID -> SNDR), ANAM (Sound - Close FormID ->
    SNDR), BNAM (Sound - Loop FormID -> SNDR)
  FNAM — u8 bitfield (source's wbFlags list has a blank index 0, so bit
    0 is unused/padding): bit1 Automatic, bit2 Hidden, bit3 Minimal Use,
    bit4 Sliding, bit5 Do Not Open in Combat Search, bit6 No "To" Text
  ONAM (Alternate Text - Open, lstring), CNAM (Alternate Text - Close,
    lstring)
  Not decoded (no modding value / binary geometry, consistent with the
    rest of this project): VMAD, OBND, PTRN, DEST, NTRM

Outputs:
  <scan-cache>/fo4_doors.json
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
GRAPH_OUT = _OUT_DIR / "fo4_doors.json"

COMPRESSED_FLAG = 0x00040000

DOOR_HEADER_FLAGS = [
    (0x00000010, "Non Occluder"), (0x00008000, "Has Distant LOD"),
    (0x00010000, "Random Anim Start"), (0x00800000, "Is Marker"),
]
DOOR_FNAM_FLAGS = [
    (0x02, "Automatic"), (0x04, "Hidden"), (0x08, "Minimal Use"),
    (0x10, "Sliding"), (0x20, "Do Not Open in Combat Search"), (0x40, 'No "To" Text'),
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


def parse_kwda(kwda: bytes) -> list[str]:
    return [f"0x{struct.unpack_from('<I', kwda, i * 4)[0]:08X}" for i in range(len(kwda) // 4)]


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


def _extract_one_door(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    keywords: list[str] = []
    open_sound = close_sound = loop_sound = None
    fnam_flags: list[str] = []
    alt_text_open: str | None = None
    alt_text_close: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            if model_path is None:
                model_path = resolve_string(d)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "SNAM":
            open_sound = fid_hex(d)
        elif tag == "ANAM":
            close_sound = fid_hex(d)
        elif tag == "BNAM":
            loop_sound = fid_hex(d)
        elif tag == "FNAM" and len(d) >= 1:
            fnam_flags = _decode_flags_bitfield(d[0], DOOR_FNAM_FLAGS)
        elif tag == "ONAM":
            alt_text_open = resolve_lstring(d, string_lookup)
        elif tag == "CNAM":
            alt_text_close = resolve_lstring(d, string_lookup)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "model_path": model_path,
        "header_flags": _decode_flags_bitfield(header_flags_raw, DOOR_HEADER_FLAGS),
        "keywords": keywords,
        "open_sound": open_sound,
        "close_sound": close_sound,
        "loop_sound": loop_sound,
        "flags": fnam_flags,
        "alt_text_open": alt_text_open,
        "alt_text_close": alt_text_close,
    }


def extract_doors(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"DOOR":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_door(dec, form_id, header_flags, string_lookup)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_doors: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for doors...")
        all_doors.extend(extract_doors(esm_path, string_lookup))

    automatic = [d for d in all_doors if "Automatic" in d["flags"]]
    with_alt_text = [d for d in all_doors if d["alt_text_open"] or d["alt_text_close"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_doors": len(all_doors),
        "automatic": len(automatic),
        "with_alt_text": len(with_alt_text),
        "doors": all_doors,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Door scan complete in {elapsed:.1f}s ===")
    print(f"  Total doors: {len(all_doors):,}")
    print(f"  Automatic: {len(automatic):,}")
    print(f"  With alt text: {len(with_alt_text):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
