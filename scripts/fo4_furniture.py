#!/usr/bin/env python3
"""
fo4_furniture.py — FO4 Furniture (FURN)
========================================================================
Twenty-fourth stop in the "grind it to zero" pass — closes out the
"referenced but not deep" tier (base objects other scanners have only
ever pointed at by FormID: STAT/MSTT, ACTI, DOOR, LIGH, and now FURN).
Furniture covers every sittable/leanable/usable-position object in the
game, INCLUDING crafting workbenches (the WBDT "Workbench Data" struct
distinguishes plain seating from a Weapons/Armor/Power Armor/Chemistry/
Cooking/Robot station), furniture markers (per-seat entry-point
geometry), and drinkable-water linkage.

Source-verified (wbDefinitionsFO4.pas ~9883-9953, enums at ~6378-6392):
  Record header Flags (u32, at header offset 8) — Unknown 2 (0x4),
    Unknown 4 (0x10), Is Perch (0x80), Unknown 13 (0x2000), Has
    Distant LOD (0x8000), Random Anim Start (0x10000), Is Marker
    (0x800000), Power Armor (0x2000000), Must Exit To Talk
    (0x10000000), Child Can Use (0x20000000)
  EDID, FULL, MODL
  KSIZ/KWDA (standard Keywords array)
  WNAM (Drinking Water Type FormID -> WATR)
  ATTX (Activate Text Override, lstring)
  FNAM — u16 bitfield: bit0 Unknown 0, bit1 (0x0002) Ignored By Sandbox
  CITC (Condition Item Count, informational) + repeating CTDA (standard
    32-byte struct) with optional CIS1/CIS2, same as every other scanner
    in this project with Conditions
  WBDT — "Workbench Data" struct (source notes a legacy min-size arg,
    so parsed with graceful truncation): Bench Type (u8 enum: None/
    Create Object/Weapons/Alchemy/Armor/Power Armor/Robot Mod — the
    "Enchanting"/"Enchanting Experiment"/"Alchemy Experiment" enum
    slots are explicitly marked unused in source and kept only for
    ordinal alignment), Uses Skill (s8, references the shared Skill
    enum used across the project)
  NAM1 (Associated Form FormID -> ARMO/WEAP/PERK/SPEL/HAZD — what this
    furniture equips/casts/triggers when used, e.g. Power Armor frames)
  Markers — repeating group keyed on ENAM (Marker Index, s32) boundary,
    each holding one NAM0 (Disabled Entry Points: 2 unused bytes + u16
    FurnitureEntryTypeFlags bitfield)
  Marker Entry Points — repeating FNPR (4-byte struct: Type u16 enum
    [Sit/Lay/Lean], Entry Points u16 FurnitureEntryTypeFlags bitfield)
  XMRK (Marker Model filename, string)
  Not decoded (no modding value / binary geometry, consistent with the
    rest of this project): VMAD, OBND, PTRN, DEST, PRPS, NTRM, FTYP,
    PNAM (source itself marks this wbUnknown), COCT/CNTO (container
    item list — low modding value for a scanner pass focused on
    per-record identity rather than loot tables), SNAM (marker params),
    NVNM, APPR, Object Template

Outputs:
  <scan-cache>/fo4_furniture.json
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
GRAPH_OUT = _OUT_DIR / "fo4_furniture.json"

COMPRESSED_FLAG = 0x00040000

FURN_HEADER_FLAGS = [
    (1 << 2, "Unknown 2"), (1 << 4, "Unknown 4"), (1 << 7, "Is Perch"), (1 << 13, "Unknown 13"),
    (1 << 15, "Has Distant LOD"), (1 << 16, "Random Anim Start"), (1 << 23, "Is Marker"),
    (1 << 25, "Power Armor"), (1 << 28, "Must Exit To Talk"), (1 << 29, "Child Can Use"),
]
FURN_FNAM_FLAGS = [(0x0001, "Unknown 0"), (0x0002, "Ignored By Sandbox")]
FURN_ENTRY_FLAGS = [(0x01, "Front"), (0x02, "Behind"), (0x04, "Right"), (0x08, "Left"), (0x10, "Up")]
FURN_ANIM_TYPE = {0: "", 1: "Sit", 2: "Lay", 3: "", 4: "Lean"}
WBDT_BENCH_TYPE = {
    0: "None", 1: "Create Object", 2: "Weapons", 3: "Enchanting (unused)",
    4: "Enchanting Experiment (unused)", 5: "Alchemy", 6: "Alchemy Experiment (unused)",
    7: "Armor", 8: "Power Armor", 9: "Robot Mod",
}

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


def parse_wbdt(d: bytes) -> dict | None:
    if len(d) < 1:
        return None
    bench_type_raw = d[0]
    out = {
        "bench_type": WBDT_BENCH_TYPE.get(bench_type_raw, f"Unknown ({bench_type_raw})"),
        "uses_skill": struct.unpack_from("<b", d, 1)[0] if len(d) >= 2 else None,
    }
    return out


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 32:
        return None
    type_byte = d[0]
    flags_val = type_byte & 0x1F
    compare_idx = (type_byte >> 5) & 0x07
    comparison_raw = d[4:8]
    function_index = struct.unpack_from("<H", d, 8)[0]
    param1 = d[12:16]
    param2 = d[16:20]
    run_on = struct.unpack_from("<I", d, 20)[0]
    reference = fid_hex(d[24:28])
    param3 = struct.unpack_from("<i", d, 28)[0]

    use_global = bool(flags_val & 0x04)
    comparison_value = fid_hex(comparison_raw) if use_global else round(struct.unpack_from("<f", comparison_raw, 0)[0], 5)

    return {
        "flags": _decode_flags_bitfield(flags_val, [
            (0x01, "Or"), (0x02, "Use Aliases"), (0x04, "Use Global"),
            (0x08, "Use Packdata"), (0x10, "Swap Subject Target"),
        ]),
        "compare_op": CTDA_COMPARE_OPS[compare_idx] if compare_idx < len(CTDA_COMPARE_OPS) else "?",
        "comparison_value": comparison_value,
        "function_index": function_index,
        "param1": fid_hex(param1) or f"0x{struct.unpack_from('<i', param1, 0)[0]:X}",
        "param2": fid_hex(param2) or f"0x{struct.unpack_from('<i', param2, 0)[0]:X}",
        "run_on": run_on,
        "reference": reference,
        "param3": param3,
        "cis1": None,
        "cis2": None,
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


def _extract_one_furn(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    keywords: list[str] = []
    water_type: str | None = None
    activate_text: str | None = None
    fnam_flags: list[str] = []
    conditions: list[dict] = []
    last_ctda: dict | None = None
    workbench_data: dict | None = None
    associated_form: str | None = None
    markers: list[dict] = []
    cur_marker: dict | None = None
    entry_points: list[dict] = []
    marker_model: str | None = None

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
        elif tag == "WNAM":
            water_type = fid_hex(d)
        elif tag == "ATTX":
            activate_text = resolve_lstring(d, string_lookup)
        elif tag == "FNAM" and len(d) >= 2:
            v = struct.unpack_from("<H", d, 0)[0]
            fnam_flags = _decode_flags_bitfield(v, FURN_FNAM_FLAGS)
        elif tag == "CTDA":
            c = parse_ctda(d)
            if c is not None:
                conditions.append(c)
                last_ctda = c
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["cis2"] = resolve_string(d)
        elif tag == "WBDT":
            workbench_data = parse_wbdt(d)
        elif tag == "NAM1":
            associated_form = fid_hex(d)
        elif tag == "ENAM" and len(d) >= 4:
            if cur_marker is not None:
                markers.append(cur_marker)
            cur_marker = {"marker_index": struct.unpack_from("<i", d, 0)[0], "disabled_entry_points": []}
        elif tag == "NAM0" and cur_marker is not None and len(d) >= 4:
            v = struct.unpack_from("<H", d, 2)[0]
            cur_marker["disabled_entry_points"] = _decode_flags_bitfield(v, FURN_ENTRY_FLAGS)
        elif tag == "FNPR" and len(d) >= 4:
            anim_type_raw = struct.unpack_from("<H", d, 0)[0]
            entry_raw = struct.unpack_from("<H", d, 2)[0]
            entry_points.append({
                "type": FURN_ANIM_TYPE.get(anim_type_raw, f"Unknown ({anim_type_raw})"),
                "entry_points": _decode_flags_bitfield(entry_raw, FURN_ENTRY_FLAGS),
            })
        elif tag == "XMRK":
            marker_model = resolve_string(d)

    if cur_marker is not None:
        markers.append(cur_marker)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "model_path": model_path,
        "header_flags": _decode_flags_bitfield(header_flags_raw, FURN_HEADER_FLAGS),
        "keywords": keywords,
        "water_type": water_type,
        "activate_text": activate_text,
        "flags": fnam_flags,
        "conditions": conditions,
        "workbench_data": workbench_data,
        "associated_form": associated_form,
        "markers": markers,
        "marker_entry_points": entry_points,
        "marker_model": marker_model,
    }


def extract_furniture(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"FURN":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_furn(dec, form_id, header_flags, string_lookup)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_furn: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for furniture...")
        all_furn.extend(extract_furniture(esm_path, string_lookup))

    workbenches = [f for f in all_furn if f["workbench_data"] and f["workbench_data"]["bench_type"] != "None"]
    power_armor_frames = [f for f in all_furn if "Power Armor" in f["header_flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_furniture": len(all_furn),
        "workbenches": len(workbenches),
        "power_armor_frames": len(power_armor_frames),
        "furniture": all_furn,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Furniture scan complete in {elapsed:.1f}s ===")
    print(f"  Total furniture: {len(all_furn):,}")
    print(f"  Workbenches: {len(workbenches):,}")
    print(f"  Power Armor frames: {len(power_armor_frames):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
