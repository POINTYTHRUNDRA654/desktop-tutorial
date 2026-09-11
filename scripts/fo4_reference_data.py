#!/usr/bin/env python3
"""
fo4_reference_data.py — FO4 Globals, FormID Lists, Keywords, Classes,
                         and Legendary/Enchantment Effects
=========================================================================
Found during a full inventory audit of every FO4 record type against what
Mossy's scanners actually cover: GLOB, FLST, KYWD, and CLAS had ZERO
coverage anywhere (not even name indexing), despite being referenced
constantly by everything else already scanned (conditions, scripts,
compatibility patches, crafting categories). ENCH (legendary/enchantment
effects) had only name-level coverage — its actual effect list was never
decoded, even though SPEL's identical EFID/EFIT structure already was.

Every struct here is verified against the authoritative xEdit/FO4Edit
Pascal source (wbDefinitionsFO4.pas):

  GLOB (Global variable) — EDID + FNAM (Type: single ASCII char code,
    's'=Short/'l'=Long/'f'=Float/'b'=Boolean, stored as u8) + FLTV
    (Value, always stored as a float regardless of Type — this is a
    real FO4/Skyrim engine quirk, not a scanner assumption).

  FLST (FormID List) — EDID + FULL + an ordered, repeatable array of
    LNAM subrecords, each a plain 4-byte FormID. Used everywhere for
    compatibility patches, leveled-list injection targets, and quest
    alias collections.

  KYWD (Keyword) — EDID (+ optional FULL display name, DNAM notes
    string, TNAM type enum). The single most-referenced record type in
    the game (crafting categories, condition checks, OMOD filters) —
    previously not even name-indexed by any scanner.

  CLAS (Class) — EDID + FULL + DESC + DATA (Bleedout Default:f32@4,
    4 bytes unknown preceding it).

  ENCH (Object Effect / legendary & enchantment effects) — ENIT struct
    (Enchantment Cost:s32@0, Flags:u32@4, Cast Type:u32@8, Enchantment
    Amount:s32@12, Target Type:u32@16, Enchant Type:u32@20 [0x06=
    Enchantment, 0x0C=Staff Enchantment], Charge Time:f32@24) plus its
    EFID/EFIT effects list — the exact same structure already proven
    against real data for SPEL in fo4_form_graph.py, reused verbatim
    here rather than re-derived.

Outputs:
  <scan-cache>/fo4_reference_data.json
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
GRAPH_OUT = _OUT_DIR / "fo4_reference_data.json"

COMPRESSED_FLAG = 0x00040000

GLOB_TYPE = {0: "Unknown", ord("s"): "Short", ord("l"): "Long", ord("f"): "Float", ord("b"): "Boolean"}
CAST_TYPE = {0: "Constant Effect", 1: "Fire and Forget", 2: "Concentration", 3: "Scroll"}
TARGET_TYPE = {0: "Self", 1: "Touch", 2: "Aimed", 3: "Target Actor", 4: "Target Location"}
ENCH_TYPE = {0x06: "Enchantment", 0x0C: "Staff Enchantment"}
ENCH_FLAGS = [(0x01, "No Auto-Calc"), (0x04, "Extend Duration On Recast")]


def _decode_flags(value: int, table: list[tuple[int, str]]) -> list[str]:
    return [name for bit, name in table if value & bit]


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


def resolve_edid(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("ascii", errors="replace").strip()
        return text if text else None
    except Exception:
        return None


def parse_spel_effects(subs: list[tuple[bytes, bytes]]) -> list[dict]:
    """EFID (MGEF FormID) + EFIT (magnitude/area/duration) pairs — the
    exact structure already verified against real data for SPEL records
    in fo4_form_graph.py, reused verbatim for ENCH's identical layout."""
    effects: list[dict] = []
    pending_mgef: str | None = None
    for t, d in subs:
        if t == b"EFID" and len(d) >= 4:
            pending_mgef = f"0x{struct.unpack_from('<I', d, 0)[0]:08X}"
        elif t == b"EFIT" and pending_mgef and len(d) >= 12:
            effects.append({
                "mgef_form_id": pending_mgef,
                "magnitude":    round(struct.unpack_from("<f", d, 0)[0], 3),
                "area":         struct.unpack_from("<I", d, 4)[0],
                "duration":     struct.unpack_from("<I", d, 8)[0],
            })
            pending_mgef = None
        elif t == b"EFID":
            pending_mgef = None
    return effects


def parse_enit(d: bytes) -> dict | None:
    if len(d) < 28:
        return None
    try:
        cost = struct.unpack_from("<i", d, 0)[0]
        flags = struct.unpack_from("<I", d, 4)[0]
        cast_type = struct.unpack_from("<I", d, 8)[0]
        amount = struct.unpack_from("<i", d, 12)[0]
        target_type = struct.unpack_from("<I", d, 16)[0]
        enchant_type = struct.unpack_from("<I", d, 20)[0]
        charge_time = round(struct.unpack_from("<f", d, 24)[0], 3)
        return {
            "enchantment_cost": cost,
            "flags": _decode_flags(flags, ENCH_FLAGS),
            "cast_type": CAST_TYPE.get(cast_type, f"cast_{cast_type}"),
            "enchantment_amount": amount,
            "target_type": TARGET_TYPE.get(target_type, f"target_{target_type}"),
            "enchant_type": ENCH_TYPE.get(enchant_type, f"type_{enchant_type}"),
            "charge_time": charge_time,
        }
    except (struct.error, IndexError):
        return None


def extract(esm_path: Path) -> dict:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0

    globals_out: list[dict] = []
    formlists_out: list[dict] = []
    keywords_out: list[dict] = []
    classes_out: list[dict] = []
    enchantments_out: list[dict] = []

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

        if rec_type in (b"GLOB", b"FLST", b"KYWD", b"CLAS", b"ENCH"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                subs = scan_subs_ordered(dec)
                edid = None
                for t, d in subs:
                    if t == b"EDID":
                        edid = resolve_edid(d)
                        break

                if rec_type == b"GLOB":
                    gtype = None
                    value = None
                    for t, d in subs:
                        if t == b"FNAM" and len(d) >= 1:
                            gtype = GLOB_TYPE.get(d[0], f"type_{d[0]}")
                        elif t == b"FLTV" and len(d) == 4:
                            value = round(struct.unpack_from("<f", d, 0)[0], 4)
                    if edid:
                        globals_out.append({"form_id": f"0x{form_id:08X}", "edid": edid,
                                             "type": gtype, "value": value})

                elif rec_type == b"FLST":
                    fids: list[str] = []
                    for t, d in subs:
                        if t == b"LNAM" and len(d) == 4:
                            fid = struct.unpack_from("<I", d, 0)[0]
                            if fid:
                                fids.append(f"0x{fid:08X}")
                    if edid or fids:
                        formlists_out.append({"form_id": f"0x{form_id:08X}", "edid": edid,
                                               "form_ids": fids})

                elif rec_type == b"KYWD":
                    if edid:
                        keywords_out.append({"form_id": f"0x{form_id:08X}", "edid": edid})

                elif rec_type == b"CLAS":
                    bleedout = None
                    for t, d in subs:
                        if t == b"DATA" and len(d) >= 8:
                            bleedout = round(struct.unpack_from("<f", d, 4)[0], 3)
                    if edid:
                        classes_out.append({"form_id": f"0x{form_id:08X}", "edid": edid,
                                             "bleedout_default": bleedout})

                elif rec_type == b"ENCH":
                    enit = None
                    for t, d in subs:
                        if t == b"ENIT":
                            enit = parse_enit(d)
                            break
                    effects = parse_spel_effects(subs)
                    if edid and (enit or effects):
                        enchantments_out.append({"form_id": f"0x{form_id:08X}", "edid": edid,
                                                  "data": enit, "effects": effects})

        pos += data_size

    return {
        "globals": globals_out,
        "formlists": formlists_out,
        "keywords": keywords_out,
        "classes": classes_out,
        "enchantments": enchantments_out,
    }


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]

    all_globals: list[dict] = []
    all_formlists: list[dict] = []
    all_keywords: list[dict] = []
    all_classes: list[dict] = []
    all_enchantments: list[dict] = []

    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for globals/formlists/keywords/classes/enchantments...")
        r = extract(esm_path)
        all_globals.extend(r["globals"])
        all_formlists.extend(r["formlists"])
        all_keywords.extend(r["keywords"])
        all_classes.extend(r["classes"])
        all_enchantments.extend(r["enchantments"])

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_globals": len(all_globals),
        "total_formlists": len(all_formlists),
        "total_keywords": len(all_keywords),
        "total_classes": len(all_classes),
        "total_enchantments": len(all_enchantments),
        "globals": all_globals,
        "formlists": all_formlists,
        "keywords": all_keywords,
        "classes": all_classes,
        "enchantments": all_enchantments,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Reference data scan complete in {elapsed:.1f}s ===")
    print(f"  Globals:       {len(all_globals):,}")
    print(f"  FormID Lists:  {len(all_formlists):,}")
    print(f"  Keywords:      {len(all_keywords):,}")
    print(f"  Classes:       {len(all_classes):,}")
    print(f"  Enchantments:  {len(all_enchantments):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
