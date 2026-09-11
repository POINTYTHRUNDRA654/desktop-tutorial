#!/usr/bin/env python3
"""
fo4_talking_activators_and_landscape_textures.py — FO4 Talking Activator
(TACT) / Landscape Texture (LTEX)
========================================================================
Thirty-seventh stop in the "grind it to zero" pass, thirteenth of the
broader engine-plumbing sweep. Talking Activators are the placeable
radio/PA-system/loudspeaker objects (every in-world radio station
transmitter is one of these); Landscape Textures are the terrain-paint
entries every worldspace's ground texture layer references, tying a
paintable ground texture to its Texture Set, Material Type, and
physics friction/restitution.

Source-verified (wbDefinitionsFO4.pas TACT ~8574-8592, LTEX
~12880-12890):

TACT — record header flags Hidden From Local Map (bit 9) / Random Anim
  Start (bit 16) / Radio Station (bit 17). EDID, FULL, MODL, KSIZ/
  KWDA, SNAM (Looping Sound -> SNDR), VNAM (Voice Type -> VTYP). Not
  decoded (source itself marks these wbUnknown, no modding value):
  PNAM, FNAM.

LTEX — EDID, TNAM (Texture Set -> TXST), MNAM (Material Type -> MATT),
  HNAM (Havok Data: Friction/Restitution, u8 each), SNAM (Texture
  Specular Exponent, u8), Grasses (repeating GNAM FormID array -> GRAS).

Outputs:
  <scan-cache>/fo4_talking_activators_and_landscape_textures.json
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
GRAPH_OUT = _OUT_DIR / "fo4_talking_activators_and_landscape_textures.json"

COMPRESSED_FLAG = 0x00040000

TACT_HEADER_FLAGS = [(1 << 9, "Hidden From Local Map"), (1 << 16, "Random Anim Start"), (1 << 17, "Radio Station")]


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


def _extract_one_tact(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    keywords: list[str] = []
    looping_sound: str | None = None
    voice_type: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "SNAM":
            looping_sound = fid_hex(d)
        elif tag == "VNAM":
            voice_type = fid_hex(d)

    if not edid:
        return None

    return {
        "record_type": "TACT", "form_id": f"0x{form_id:08X}", "edid": edid, "full_name": full,
        "header_flags": _decode_flags_bitfield(header_flags_raw, TACT_HEADER_FLAGS),
        "model_path": model_path, "keywords": keywords,
        "looping_sound": looping_sound, "voice_type": voice_type,
    }


def _extract_one_ltex(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    texture_set: str | None = None
    material_type: str | None = None
    friction: int | None = None
    restitution: int | None = None
    specular_exponent: int | None = None
    grasses: list[str] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "TNAM":
            texture_set = fid_hex(d)
        elif tag == "MNAM":
            material_type = fid_hex(d)
        elif tag == "HNAM" and len(d) >= 2:
            friction = d[0]
            restitution = d[1]
        elif tag == "SNAM" and len(d) >= 1:
            specular_exponent = d[0]
        elif tag == "GNAM":
            fid = fid_hex(d)
            if fid:
                grasses.append(fid)

    if not edid:
        return None

    return {
        "record_type": "LTEX", "form_id": f"0x{form_id:08X}", "edid": edid,
        "texture_set": texture_set, "material_type": material_type,
        "friction": friction, "restitution": restitution,
        "specular_exponent": specular_exponent, "grasses": grasses,
    }


def extract_all(esm_path: Path, string_lookup: dict[int, str]) -> tuple[list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    tact_out: list[dict] = []
    ltex_out: list[dict] = []

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
        if rec_type in (b"TACT", b"LTEX"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"TACT":
                    r = _extract_one_tact(dec, form_id, header_flags, string_lookup)
                    if r is not None:
                        tact_out.append(r)
                else:
                    r = _extract_one_ltex(dec, form_id)
                    if r is not None:
                        ltex_out.append(r)
        pos += data_size

    return tact_out, ltex_out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_tact: list[dict] = []
    all_ltex: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for talking activators/landscape textures...")
        tact, ltex = extract_all(esm_path, string_lookup)
        all_tact.extend(tact)
        all_ltex.extend(ltex)

    radio_stations = [t for t in all_tact if "Radio Station" in t["header_flags"]]
    with_grasses = [l for l in all_ltex if l["grasses"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_talking_activators": len(all_tact),
        "radio_stations": len(radio_stations),
        "total_landscape_textures": len(all_ltex),
        "landscape_textures_with_grasses": len(with_grasses),
        "talking_activators": all_tact,
        "landscape_textures": all_ltex,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Talking Activator/Landscape Texture scan complete in {elapsed:.1f}s ===")
    print(f"  Total talking activators: {len(all_tact):,} ({len(radio_stations):,} radio stations)")
    print(f"  Total landscape textures: {len(all_ltex):,} ({len(with_grasses):,} with grasses)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
