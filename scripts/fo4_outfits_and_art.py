#!/usr/bin/env python3
"""
fo4_outfits_and_art.py — FO4 Outfit (OTFT) / Art Object (ARTO)
========================================================================
Twenty-eighth stop in the "grind it to zero" pass, fourth of the
broader engine-plumbing sweep. Outfits are the named clothing/armor
sets NPCs and leveled-list entries equip as a bundle (default settler
attire, raider gear sets, faction uniforms) — a staple of "add a new
NPC/settler type" mods. Art Objects are the visual-effect model
attachments referenced by MGEF's Casting Art/Hit Effect Art/Enchant
Art fields (decoded in fo4_magic_effects.py) and by ENCH. Combined
into one scanner since both are small, simple FormID-array-style
records.

Source-verified (wbDefinitionsFO4.pas OTFT ~12230-12233, ARTO
~12235-12247):

OTFT:
  EDID
  INAM — repeating Item FormID array (-> ARMO or LVLI; a leveled list
    entry means the outfit rolls a random item from that list each
    time it's assigned, e.g. randomized raider gear)

ARTO:
  EDID, KSIZ/KWDA (standard Keywords array), MODL
  DNAM — u32 enum, Art Type: Magic Casting / Magic Hit Effect /
    Enchantment Effect
  Not decoded (no modding value / binary geometry, consistent with the
    rest of this project): OBND, PTRN

Outputs:
  <scan-cache>/fo4_outfits_and_art.json
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
GRAPH_OUT = _OUT_DIR / "fo4_outfits_and_art.json"

COMPRESSED_FLAG = 0x00040000

ARTO_TYPE = {0: "Magic Casting", 1: "Magic Hit Effect", 2: "Enchantment Effect"}


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


def _extract_one_otft(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    items: list[str] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "INAM":
            fid = fid_hex(d)
            if fid:
                items.append(fid)

    if not edid:
        return None

    return {"record_type": "OTFT", "form_id": f"0x{form_id:08X}", "edid": edid, "items": items}


def _extract_one_arto(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    keywords: list[str] = []
    model_path: str | None = None
    art_type: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "DNAM" and len(d) >= 4:
            v = struct.unpack_from("<I", d, 0)[0]
            art_type = ARTO_TYPE.get(v, f"Unknown ({v})")

    if not edid:
        return None

    return {
        "record_type": "ARTO",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "keywords": keywords,
        "model_path": model_path,
        "art_type": art_type,
    }


def extract_outfits_and_art(esm_path: Path) -> tuple[list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    otft_out: list[dict] = []
    arto_out: list[dict] = []

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
        if rec_type in (b"OTFT", b"ARTO"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"OTFT":
                    r = _extract_one_otft(dec, form_id)
                    if r is not None:
                        otft_out.append(r)
                else:
                    r = _extract_one_arto(dec, form_id)
                    if r is not None:
                        arto_out.append(r)
        pos += data_size

    return otft_out, arto_out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_otft: list[dict] = []
    all_arto: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for outfits/art objects...")
        otft, arto = extract_outfits_and_art(esm_path)
        all_otft.extend(otft)
        all_arto.extend(arto)

    by_art_type: dict[str, int] = {}
    for a in all_arto:
        t = a["art_type"] or "Unknown"
        by_art_type[t] = by_art_type.get(t, 0) + 1

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_outfits": len(all_otft),
        "total_art_objects": len(all_arto),
        "by_art_type": by_art_type,
        "outfits": all_otft,
        "art_objects": all_arto,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Outfit/art object scan complete in {elapsed:.1f}s ===")
    print(f"  Total outfits: {len(all_otft):,}")
    print(f"  Total art objects: {len(all_arto):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
