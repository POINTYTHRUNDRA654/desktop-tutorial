#!/usr/bin/env python3
"""
fo4_misc_items.py — FO4 Misc. Item (MISC)
========================================================================
Eighteenth stop in the "grind it to zero" pass, second of the
"referenced but not deep" tier. Misc. Items are junk/collectible/
component-scrap objects — value, weight, and (for craftable/scrappable
junk) the list of Components it breaks down into on scrapping, a
central piece of FO4's settlement-building economy.

Source-verified (wbDefinitionsFO4.pas ~13134-13163): EDID, FULL, MODL,
ICON (Inventory Image string), MICO (Message Icon string), YNAM/ZNAM
(Pick Up/Put Down Sound FormIDs -> SNDR), KWDA, DATA (fixed 8-byte
struct: Value s32, Weight f32), CVPA — repeating fixed-size Component
entries (FormID + Count u32, 8 bytes each, one CVPA subrecord per
component -- confirmed by real-data inspection), CDIX (Component
Display Indices, one packed byte array, order-matched to CVPA).

Outputs:
  <scan-cache>/fo4_misc_items.json
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
GRAPH_OUT = _OUT_DIR / "fo4_misc_items.json"

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


def _extract_one_misc(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    icon: str | None = None
    keywords: list[str] = []
    pickup_sound: str | None = None
    putdown_sound: str | None = None
    value: int | None = None
    weight: float | None = None
    components: list[dict] = []
    display_indices: list[int] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "ICON":
            icon = resolve_string(d)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "YNAM":
            pickup_sound = fid_hex(d)
        elif tag == "ZNAM":
            putdown_sound = fid_hex(d)
        elif tag == "DATA" and len(d) >= 8:
            value = struct.unpack_from("<i", d, 0)[0]
            weight = round(struct.unpack_from("<f", d, 4)[0], 5)
        elif tag == "CVPA" and len(d) >= 8:
            components.append({"component": fid_hex(d[0:4]), "count": struct.unpack_from("<I", d, 4)[0]})
        elif tag == "CDIX":
            display_indices = list(d)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "icon": icon,
        "keywords": keywords,
        "pickup_sound": pickup_sound,
        "putdown_sound": putdown_sound,
        "value": value,
        "weight": weight,
        "components": components,
        "component_display_indices": display_indices,
    }


def extract_misc(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"MISC":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                m = _extract_one_misc(dec, form_id, string_lookup)
                if m is not None:
                    out.append(m)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_misc: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for misc items...")
        all_misc.extend(extract_misc(esm_path, string_lookup))

    with_components = [m for m in all_misc if m["components"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_misc_items": len(all_misc),
        "misc_items_with_components": len(with_components),
        "misc_items": all_misc,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Misc item scan complete in {elapsed:.1f}s ===")
    print(f"  Total misc items: {len(all_misc):,}")
    print(f"  With components: {len(with_components):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
