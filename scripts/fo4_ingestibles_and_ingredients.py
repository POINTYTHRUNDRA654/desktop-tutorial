#!/usr/bin/env python3
"""
fo4_ingestibles_and_ingredients.py — FO4 Ingestible (ALCH) / Ingredient
(INGR)
========================================================================
Thirty-fifth stop in the "grind it to zero" pass, eleventh of the
broader engine-plumbing sweep. Ingestibles are every chem, food item,
and drink in the game — Stimpaks, Jet, Nuka-Cola, RadAway, every
craftable chem at a Chemistry Station — and Ingredients are the raw
crafting components consumed to make them. Both carry the same
Effects list format (EFID/EFIT/Conditions) already decoded for MGEF,
SPEL, and ENCH elsewhere in this project, so a chem's actual in-game
behavior (what MGEF effects it applies, at what magnitude/duration) is
now fully readable rather than name-only.

Source-verified (wbDefinitionsFO4.pas ALCH ~8594-8642, INGR
~12627-12660, EFID/EFIT ~7897-7904, Effects list ~8502-8507):

ALCH — record header flag Medicine (bit 29, matches the source's own
  hex comment here — no gotcha on this one), EDID, FULL, KSIZ/KWDA,
  MODL, ICON/MICO, YNAM/ZNAM (Pickup/Putdown Sound), ETYP (Equipment
  Type -> EQUP), CUSD (Crafting Sound), DESC, DATA (Weight, float),
  ENIT (Effect Data: Value s32, Flags [No Auto-Calc/Food Item/
  Medicine/Poison/etc.], Addiction FormID, Addiction Chance float,
  Sound-Consume), DNAM (Addiction Name, lstring), Effects (repeating
  EFID [Base Effect -> MGEF] + EFIT [Magnitude/Area/Duration] +
  Conditions).

INGR — EDID, FULL, KSIZ/KWDA, MODL, ICON/MICO, ETYP, YNAM/ZNAM, DATA
  (Value s32, Weight float), ENIT (Ingredient Value s32, Flags [No
  auto-calculation/Food item/References Persist]), Effects (same
  EFID/EFIT/Conditions format as ALCH).

Not decoded (no modding value / binary geometry, consistent with the
  rest of this project): OBND, PTRN, DEST on both types, VMAD on INGR.

Outputs:
  <scan-cache>/fo4_ingestibles_and_ingredients.json
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
GRAPH_OUT = _OUT_DIR / "fo4_ingestibles_and_ingredients.json"

COMPRESSED_FLAG = 0x00040000

ALCH_HEADER_FLAGS = [(1 << 29, "Medicine")]

ALCH_ENIT_FLAGS = [
    (0x00000001, "No Auto-Calc"), (0x00000002, "Food Item"), (0x00000004, "Unknown 3"),
    (0x00000008, "Unknown 4"), (0x00000010, "Unknown 5"), (0x00000020, "Unknown 6"),
    (0x00000040, "Unknown 7"), (0x00000080, "Unknown 8"), (0x00000100, "Unknown 9"),
    (0x00000200, "Unknown 10"), (0x00000400, "Unknown 11"), (0x00000800, "Unknown 12"),
    (0x00001000, "Unknown 13"), (0x00002000, "Unknown 14"), (0x00004000, "Unknown 15"),
    (0x00008000, "Unknown 16"), (0x00010000, "Medicine"), (0x00020000, "Poison"),
]
INGR_ENIT_FLAGS = [
    (0x00000001, "No auto-calculation"), (0x00000002, "Food item"), (0x00000004, "Unknown 3"),
    (0x00000008, "Unknown 4"), (0x00000010, "Unknown 5"), (0x00000020, "Unknown 6"),
    (0x00000040, "Unknown 7"), (0x00000080, "Unknown 8"), (0x00000100, "References Persist"),
]

CTDA_COMPARE_OPS = ["==", "!=", ">", ">=", "<", "<="]


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


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 28:
        return None
    type_byte = d[0]
    op = CTDA_COMPARE_OPS[(type_byte >> 5) & 0x07]
    flags = {
        "or": bool(type_byte & 0x01), "use_aliases": bool(type_byte & 0x02),
        "use_global": bool(type_byte & 0x04), "use_packdata": bool(type_byte & 0x08),
        "swap_subject_target": bool(type_byte & 0x10),
    }
    comp_val = struct.unpack_from("<f", d, 4)[0]
    function = struct.unpack_from("<H", d, 8)[0]
    param1 = fid_hex(d[12:16])
    param2 = fid_hex(d[16:20])
    run_on = struct.unpack_from("<I", d, 20)[0]
    reference = fid_hex(d[24:28])
    param3 = struct.unpack_from("<i", d, 28)[0] if len(d) >= 32 else None
    return {
        "operator": op, "flags": flags, "comparison_value": round(comp_val, 4),
        "function": function, "param1": param1, "param2": param2,
        "run_on": run_on, "reference": reference, "param3": param3,
        "cis1": None, "cis2": None,
    }


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


def _extract_one_alch(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    keywords: list[str] = []
    model_path: str | None = None
    pickup_sound: str | None = None
    putdown_sound: str | None = None
    equipment_type: str | None = None
    crafting_sound: str | None = None
    description: str | None = None
    weight: float | None = None
    effect_data: dict | None = None
    addiction_name: str | None = None
    effects: list[dict] = []

    cur_effect: dict | None = None
    last_ctda: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "YNAM":
            pickup_sound = fid_hex(d)
        elif tag == "ZNAM":
            putdown_sound = fid_hex(d)
        elif tag == "ETYP":
            equipment_type = fid_hex(d)
        elif tag == "CUSD":
            crafting_sound = fid_hex(d)
        elif tag == "DESC":
            description = resolve_lstring(d, string_lookup)
        elif tag == "DATA" and len(d) >= 4:
            weight = round(struct.unpack_from("<f", d, 0)[0], 4)
        elif tag == "ENIT" and len(d) >= 8:
            value = struct.unpack_from("<i", d, 0)[0]
            flags_raw = struct.unpack_from("<I", d, 4)[0]
            addiction = fid_hex(d[8:12]) if len(d) >= 12 else None
            addiction_chance = round(struct.unpack_from("<f", d, 12)[0], 4) if len(d) >= 16 else None
            sound_consume = fid_hex(d[16:20]) if len(d) >= 20 else None
            effect_data = {
                "value": value, "flags": _decode_flags_bitfield(flags_raw, ALCH_ENIT_FLAGS),
                "addiction": addiction, "addiction_chance": addiction_chance, "sound_consume": sound_consume,
            }
        elif tag == "DNAM":
            addiction_name = resolve_lstring(d, string_lookup)
        elif tag == "EFID":
            if cur_effect is not None:
                effects.append(cur_effect)
            cur_effect = {"base_effect": fid_hex(d), "magnitude": None, "area": None, "duration": None, "conditions": []}
        elif tag == "EFIT" and cur_effect is not None and len(d) >= 12:
            cur_effect["magnitude"] = round(struct.unpack_from("<f", d, 0)[0], 4)
            cur_effect["area"] = struct.unpack_from("<I", d, 4)[0]
            cur_effect["duration"] = struct.unpack_from("<I", d, 8)[0]
        elif tag == "CTDA":
            last_ctda = parse_ctda(d)
            if last_ctda and cur_effect is not None:
                cur_effect["conditions"].append(last_ctda)
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["cis2"] = resolve_string(d)

    if cur_effect is not None:
        effects.append(cur_effect)

    if not edid:
        return None

    return {
        "record_type": "ALCH", "form_id": f"0x{form_id:08X}", "edid": edid, "full_name": full,
        "header_flags": _decode_flags_bitfield(header_flags_raw, ALCH_HEADER_FLAGS),
        "keywords": keywords, "model_path": model_path,
        "pickup_sound": pickup_sound, "putdown_sound": putdown_sound,
        "equipment_type": equipment_type, "crafting_sound": crafting_sound,
        "description": description, "weight": weight, "effect_data": effect_data,
        "addiction_name": addiction_name, "effects": effects,
    }


def _extract_one_ingr(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    keywords: list[str] = []
    model_path: str | None = None
    equipment_type: str | None = None
    pickup_sound: str | None = None
    putdown_sound: str | None = None
    value: int | None = None
    weight: float | None = None
    effect_data: dict | None = None
    effects: list[dict] = []

    cur_effect: dict | None = None
    last_ctda: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "ETYP":
            equipment_type = fid_hex(d)
        elif tag == "YNAM":
            pickup_sound = fid_hex(d)
        elif tag == "ZNAM":
            putdown_sound = fid_hex(d)
        elif tag == "DATA" and len(d) >= 8:
            value = struct.unpack_from("<i", d, 0)[0]
            weight = round(struct.unpack_from("<f", d, 4)[0], 4)
        elif tag == "ENIT" and len(d) >= 8:
            ingredient_value = struct.unpack_from("<i", d, 0)[0]
            flags_raw = struct.unpack_from("<I", d, 4)[0]
            effect_data = {"ingredient_value": ingredient_value, "flags": _decode_flags_bitfield(flags_raw, INGR_ENIT_FLAGS)}
        elif tag == "EFID":
            if cur_effect is not None:
                effects.append(cur_effect)
            cur_effect = {"base_effect": fid_hex(d), "magnitude": None, "area": None, "duration": None, "conditions": []}
        elif tag == "EFIT" and cur_effect is not None and len(d) >= 12:
            cur_effect["magnitude"] = round(struct.unpack_from("<f", d, 0)[0], 4)
            cur_effect["area"] = struct.unpack_from("<I", d, 4)[0]
            cur_effect["duration"] = struct.unpack_from("<I", d, 8)[0]
        elif tag == "CTDA":
            last_ctda = parse_ctda(d)
            if last_ctda and cur_effect is not None:
                cur_effect["conditions"].append(last_ctda)
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["cis2"] = resolve_string(d)

    if cur_effect is not None:
        effects.append(cur_effect)

    if not edid:
        return None

    return {
        "record_type": "INGR", "form_id": f"0x{form_id:08X}", "edid": edid, "full_name": full,
        "keywords": keywords, "model_path": model_path, "equipment_type": equipment_type,
        "pickup_sound": pickup_sound, "putdown_sound": putdown_sound,
        "value": value, "weight": weight, "effect_data": effect_data, "effects": effects,
    }


def extract_all(esm_path: Path, string_lookup: dict[int, str]) -> tuple[list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    alch_out: list[dict] = []
    ingr_out: list[dict] = []

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
        if rec_type in (b"ALCH", b"INGR"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"ALCH":
                    r = _extract_one_alch(dec, form_id, header_flags, string_lookup)
                    if r is not None:
                        alch_out.append(r)
                else:
                    r = _extract_one_ingr(dec, form_id, string_lookup)
                    if r is not None:
                        ingr_out.append(r)
        pos += data_size

    return alch_out, ingr_out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_alch: list[dict] = []
    all_ingr: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for ingestibles/ingredients...")
        alch, ingr = extract_all(esm_path, string_lookup)
        all_alch.extend(alch)
        all_ingr.extend(ingr)

    medicine = [a for a in all_alch if "Medicine" in a["header_flags"]]
    food_items = [a for a in all_alch if a["effect_data"] and "Food Item" in a["effect_data"]["flags"]]
    with_addiction = [a for a in all_alch if a["effect_data"] and a["effect_data"]["addiction"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_ingestibles": len(all_alch),
        "medicine_ingestibles": len(medicine),
        "food_ingestibles": len(food_items),
        "addictive_ingestibles": len(with_addiction),
        "total_ingredients": len(all_ingr),
        "ingestibles": all_alch,
        "ingredients": all_ingr,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Ingestible/Ingredient scan complete in {elapsed:.1f}s ===")
    print(f"  Total ingestibles: {len(all_alch):,}")
    print(f"  Medicine: {len(medicine):,}")
    print(f"  Food: {len(food_items):,}")
    print(f"  Addictive: {len(with_addiction):,}")
    print(f"  Total ingredients: {len(all_ingr):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
