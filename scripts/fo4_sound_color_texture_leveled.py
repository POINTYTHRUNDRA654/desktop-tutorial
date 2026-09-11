#!/usr/bin/env python3
"""
fo4_sound_color_texture_leveled.py — FO4 Sound Marker (SOUN) / Color (CLFM)
/ Texture Set (TXST) / Leveled Item (LVLI)
========================================================================
Thirty-third stop in the "grind it to zero" pass, ninth of the broader
engine-plumbing sweep. Four small-to-medium record types combined:
Sound Markers are placeable ambient/repeat-timed sound triggers (a
staple of "make this room feel alive" mods); Colors are the reusable
tintable-palette entries referenced by HDPT/ARMA/etc. skin and hair
tinting; Texture Sets are the diffuse/normal/glow/material texture
bundles every STAT/ARMO/WEAP alternate-texture mod swaps; Leveled
Items are the random-loot-roll containers behind every lootable
container and vendor list — arguably the single highest-value type
left in this sweep for "add my item to the loot pool" mods, on par
with the already-covered LVLN (Leveled NPC).

Source-verified (wbDefinitionsFO4.pas SOUN ~14958-14967, CLFM
~12437-12456, TXST ~10014-10034 with DODT struct ~6034-6053, LVLI
~12925-12958 with LVLO/COED structs ~5926-5934):

SOUN — EDID, SDSC (Sound Descriptor FormID -> SNDR), REPT (Repeat:
  Min Time/Max Time float, Stackable u8 bool).

CLFM — record header flag Non-Playable (bit 2), EDID, FULL, CNAM
  (Color/Index, u32 — interpreted as either a packed RGBA color or a
  Remapping Index float depending on the FNAM Remapping Index flag;
  source itself works around this with an integer formatter rather
  than the on-disk union, so this scanner stores the raw hex value
  plus both interpretations, consistent with this project's approach
  to ambiguous on-disk unions), FNAM (Flags: Playable/Remapping
  Index/Extended LUT), CTDA/CIS1/CIS2 Conditions.

TXST — EDID, texture path strings (TX00 Diffuse/TX01 Normal-Gloss/
  TX02 Wrinkles/TX03 Glow/TX04 Height/TX05 Environment/TX06
  Multilayer/TX07 Smooth Spec), DODT (Decal Data: Min/Max Width,
  Min/Max Height, Depth, Shininess, Parallax [Scale/Passes], Flags
  [POM Shadows/Alpha-Blending/Alpha-Testing/No Subtextures], Alpha
  Threshold, Color RGBA — fixed 36-byte struct, parsed with running
  offset and a field-size self-check), DNAM (Flags: No Specular Map/
  Facegen Textures/Has Model Space Normal Map), MNAM (Material path).

LVLI — EDID, LVLD (Chance None), LVLM (Max Count, always 0 per
  source), LVLF (Flags: Calc-from-all-levels-<=-player/Calc-for-each-
  item-in-count/Use All), LVLG (Use Global -> GLOB), LLCT (Count),
  Leveled List Entries (repeating group boundary-keyed on LVLO [Level/
  Reference FormID -> any base object/Count/Chance None], each
  optionally followed by a COED Extra Data struct [Owner FormID ->
  NPC_/FACT, a raw union field the source itself only resolves via the
  Owner's record type at edit-time so this scanner stores it as a raw
  hex value with both possible interpretations noted, Item Condition
  float]), Filter Keyword Chances (LLKC array: Keyword FormID + Chance
  u32), LVSG (Epic Loot Chance -> GLOB), ONAM (Override Name, lstring).

Not decoded (no modding value / binary geometry, consistent with the
  rest of this project): OBND on all four types.

Outputs:
  <scan-cache>/fo4_sound_color_texture_leveled.json
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
GRAPH_OUT = _OUT_DIR / "fo4_sound_color_texture_leveled.json"

COMPRESSED_FLAG = 0x00040000

CLFM_HEADER_FLAGS = [(1 << 2, "Non-Playable")]
CLFM_FNAM_FLAGS = [(0x00000001, "Playable"), (0x00000002, "Remapping Index"), (0x00000004, "Extended LUT")]

TXST_DNAM_FLAGS = [(0x0001, "No Specular Map"), (0x0002, "Facegen Textures"), (0x0004, "Has Model Space Normal Map")]
DODT_FLAGS = [(0x01, "POM Shadows"), (0x02, "Alpha - Blending"), (0x04, "Alpha - Testing"), (0x08, "No Subtextures")]

LVLI_FLAGS = [
    (0x01, "Calculate from all levels <= player's level"),
    (0x02, "Calculate for each item in count"),
    (0x04, "Use All"),
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


# ── SOUN ─────────────────────────────────────────────────────────────

def _extract_one_soun(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    sound_descriptor: str | None = None
    repeat: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "SDSC":
            sound_descriptor = fid_hex(d)
        elif tag == "REPT" and len(d) >= 9:
            repeat = {
                "min_time": round(struct.unpack_from("<f", d, 0)[0], 4),
                "max_time": round(struct.unpack_from("<f", d, 4)[0], 4),
                "stackable": bool(d[8]),
            }

    if not edid:
        return None

    return {
        "record_type": "SOUN", "form_id": f"0x{form_id:08X}", "edid": edid,
        "sound_descriptor": sound_descriptor, "repeat": repeat,
    }


# ── CLFM ─────────────────────────────────────────────────────────────

def _extract_one_clfm(dec: bytes, form_id: int, header_flags_raw: int) -> dict | None:
    edid: str | None = None
    full: str | None = None
    cnam_raw: int | None = None
    fnam_flags: list[str] = []
    conditions: list[dict] = []
    last_ctda: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_string(d)
        elif tag == "CNAM" and len(d) >= 4:
            cnam_raw = struct.unpack_from("<I", d, 0)[0]
        elif tag == "FNAM" and len(d) >= 4:
            fnam_flags = _decode_flags_bitfield(struct.unpack_from("<I", d, 0)[0], CLFM_FNAM_FLAGS)
        elif tag == "CTDA":
            last_ctda = parse_ctda(d)
            if last_ctda:
                conditions.append(last_ctda)
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["cis2"] = resolve_string(d)

    if not edid:
        return None

    color_as_rgba = None
    color_as_remap_index = None
    if cnam_raw is not None:
        color_as_rgba = {"r": cnam_raw & 0xFF, "g": (cnam_raw >> 8) & 0xFF, "b": (cnam_raw >> 16) & 0xFF, "a": (cnam_raw >> 24) & 0xFF}
        color_as_remap_index = struct.unpack("<f", struct.pack("<I", cnam_raw))[0]

    return {
        "record_type": "CLFM", "form_id": f"0x{form_id:08X}", "edid": edid, "full_name": full,
        "header_flags": _decode_flags_bitfield(header_flags_raw, CLFM_HEADER_FLAGS),
        "cnam_raw": f"0x{cnam_raw:08X}" if cnam_raw is not None else None,
        "color_as_rgba": color_as_rgba,
        "color_as_remap_index": round(color_as_remap_index, 4) if color_as_remap_index is not None else None,
        "flags": fnam_flags,
        "is_remapping_index": "Remapping Index" in fnam_flags,
        "conditions": conditions,
    }


# ── TXST ─────────────────────────────────────────────────────────────

def _parse_dodt(d: bytes) -> dict:
    out: dict = {}
    off = 0
    fields = [
        ("min_width", "f"), ("max_width", "f"), ("min_height", "f"), ("max_height", "f"),
        ("depth", "f"), ("shininess", "f"), ("parallax_scale", "f"), ("parallax_passes", "B"),
        ("flags_raw", "B"), ("alpha_threshold", "H"),
    ]
    for name, kind in fields:
        size = {"f": 4, "B": 1, "H": 2}[kind]
        if off + size > len(d):
            out[name] = None
            continue
        if kind == "f":
            out[name] = round(struct.unpack_from("<f", d, off)[0], 4)
        elif kind == "B":
            out[name] = d[off]
        elif kind == "H":
            out[name] = struct.unpack_from("<H", d, off)[0]
        off += size
    if off + 4 <= len(d):
        out["color"] = {"r": d[off], "g": d[off + 1], "b": d[off + 2], "a": d[off + 3]}
        off += 4
    else:
        out["color"] = None
    flags_raw = out.pop("flags_raw", 0) or 0
    out["flags"] = _decode_flags_bitfield(flags_raw, DODT_FLAGS)
    out["_computed_size"] = off
    out["_real_size"] = len(d)
    return out


def _extract_one_txst(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    textures: dict = {}
    dodt: dict | None = None
    dnam_flags: list[str] = []
    material: str | None = None

    TX_TAGS = {
        "TX00": "diffuse", "TX01": "normal_gloss", "TX02": "wrinkles", "TX03": "glow",
        "TX04": "height", "TX05": "environment", "TX06": "multilayer", "TX07": "smooth_spec",
    }

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag in TX_TAGS:
            textures[TX_TAGS[tag]] = resolve_string(d)
        elif tag == "DODT":
            dodt = _parse_dodt(d)
        elif tag == "DNAM" and len(d) >= 2:
            dnam_flags = _decode_flags_bitfield(struct.unpack_from("<H", d, 0)[0], TXST_DNAM_FLAGS)
        elif tag == "MNAM":
            material = resolve_string(d)

    if not edid:
        return None

    return {
        "record_type": "TXST", "form_id": f"0x{form_id:08X}", "edid": edid,
        "textures": textures, "decal_data": dodt, "flags": dnam_flags, "material": material,
    }


# ── LVLI ─────────────────────────────────────────────────────────────

def _extract_one_lvli(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    chance_none: int | None = None
    max_count: int | None = None
    flags: list[str] = []
    use_global: str | None = None
    count: int | None = None
    entries: list[dict] = []
    filter_keywords: list[dict] = []
    epic_loot_chance: str | None = None
    override_name: str | None = None

    cur_entry: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "LVLD" and len(d) >= 1:
            chance_none = d[0]
        elif tag == "LVLM" and len(d) >= 1:
            max_count = d[0]
        elif tag == "LVLF" and len(d) >= 1:
            flags = _decode_flags_bitfield(d[0], LVLI_FLAGS)
        elif tag == "LVLG":
            use_global = fid_hex(d)
        elif tag == "LLCT" and len(d) >= 1:
            count = d[0]
        elif tag == "LVLO" and len(d) >= 10:
            if cur_entry is not None:
                entries.append(cur_entry)
            level = struct.unpack_from("<H", d, 0)[0]
            reference = fid_hex(d[4:8])
            item_count = struct.unpack_from("<H", d, 8)[0]
            chance = d[10] if len(d) > 10 else None
            cur_entry = {"level": level, "reference": reference, "count": item_count, "chance_none": chance, "extra_data": None}
        elif tag == "COED" and cur_entry is not None and len(d) >= 12:
            owner = fid_hex(d[0:4])
            union_raw = struct.unpack_from("<I", d, 4)[0]
            item_condition = struct.unpack_from("<f", d, 8)[0]
            cur_entry["extra_data"] = {
                "owner": owner,
                "union_raw": f"0x{union_raw:08X}",
                "as_global_variable": fid_hex(d[4:8]) if union_raw else None,
                "as_required_rank": struct.unpack_from("<i", d, 4)[0],
                "item_condition": round(item_condition, 4),
            }
        elif tag == "LLKC" and len(d) >= 8:
            for i in range(len(d) // 8):
                off = i * 8
                kw = fid_hex(d[off:off + 4])
                chance_val = struct.unpack_from("<I", d, off + 4)[0]
                if kw:
                    filter_keywords.append({"keyword": kw, "chance": chance_val})
        elif tag == "LVSG":
            epic_loot_chance = fid_hex(d)
        elif tag == "ONAM":
            override_name = resolve_lstring(d, string_lookup)

    if cur_entry is not None:
        entries.append(cur_entry)

    if not edid:
        return None

    return {
        "record_type": "LVLI", "form_id": f"0x{form_id:08X}", "edid": edid,
        "chance_none": chance_none, "max_count": max_count, "flags": flags,
        "use_global": use_global, "count": count, "entries": entries,
        "filter_keywords": filter_keywords, "epic_loot_chance": epic_loot_chance,
        "override_name": override_name,
    }


# ── ESM walker ──────────────────────────────────────────────────────

def extract_all(esm_path: Path, string_lookup: dict[int, str]) -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    soun_out: list[dict] = []
    clfm_out: list[dict] = []
    txst_out: list[dict] = []
    lvli_out: list[dict] = []

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
        if rec_type in (b"SOUN", b"CLFM", b"TXST", b"LVLI"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"SOUN":
                    r = _extract_one_soun(dec, form_id)
                    if r is not None:
                        soun_out.append(r)
                elif rec_type == b"CLFM":
                    r = _extract_one_clfm(dec, form_id, header_flags)
                    if r is not None:
                        clfm_out.append(r)
                elif rec_type == b"TXST":
                    r = _extract_one_txst(dec, form_id)
                    if r is not None:
                        txst_out.append(r)
                else:
                    r = _extract_one_lvli(dec, form_id, string_lookup)
                    if r is not None:
                        lvli_out.append(r)
        pos += data_size

    return soun_out, clfm_out, txst_out, lvli_out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_soun: list[dict] = []
    all_clfm: list[dict] = []
    all_txst: list[dict] = []
    all_lvli: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for sound markers/colors/texture sets/leveled items...")
        soun, clfm, txst, lvli = extract_all(esm_path, string_lookup)
        all_soun.extend(soun)
        all_clfm.extend(clfm)
        all_txst.extend(txst)
        all_lvli.extend(lvli)

    playable_colors = [c for c in all_clfm if "Playable" in c["flags"]]
    remap_colors = [c for c in all_clfm if c["is_remapping_index"]]
    use_all_lists = [l for l in all_lvli if "Use All" in l["flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_sound_markers": len(all_soun),
        "total_colors": len(all_clfm),
        "playable_colors": len(playable_colors),
        "remapping_index_colors": len(remap_colors),
        "total_texture_sets": len(all_txst),
        "total_leveled_items": len(all_lvli),
        "use_all_leveled_items": len(use_all_lists),
        "sound_markers": all_soun,
        "colors": all_clfm,
        "texture_sets": all_txst,
        "leveled_items": all_lvli,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Sound/Color/Texture/Leveled Item scan complete in {elapsed:.1f}s ===")
    print(f"  Total sound markers: {len(all_soun):,}")
    print(f"  Total colors: {len(all_clfm):,} ({len(playable_colors):,} playable, {len(remap_colors):,} remapping-index)")
    print(f"  Total texture sets: {len(all_txst):,}")
    print(f"  Total leveled items: {len(all_lvli):,} ({len(use_all_lists):,} Use All)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
