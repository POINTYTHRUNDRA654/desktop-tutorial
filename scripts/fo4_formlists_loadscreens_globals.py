#!/usr/bin/env python3
"""
fo4_formlists_loadscreens_globals.py — FO4 FormID List (FLST) / Load Screen (LSCR) / Global (GLOB)
========================================================================
Thirty-first stop in the "grind it to zero" pass, seventh of the
broader engine-plumbing sweep. Three small, high-utility record types
combined: FormID Lists are the generic "bag of FormIDs" other systems
(Leveled Lists, perks, Outfits, quest scripting) reference by name and
that mods routinely extend via patch plugins to inject new content
into existing systems (e.g. adding a new item to a vendor's sell
list) -- one of the single most-touched record types by compatibility
patches. Load Screens are the loading-tip images/rotating-object
scenes shown between cells. Globals are the named float/int/bool
variables Papyrus scripts and quest stages read and write throughout
the game.

Source-verified (wbDefinitionsFO4.pas FLST ~10760-10764, LSCR
~12859-12878, GLOB ~9955-9968):

FLST:
  EDID, FULL
  LNAM — repeating array of RAW FormIDs (not type-checked against any
    target signature, since a FormID List can hold any mix of record
    types -- decoded generically as raw FormIDs here, same as the
    source's own untyped wbFormID)

LSCR:
  Record header Flags (u32, header offset 8): Displays In Main Menu
    (0x00000400), No Rotation (0x00008000)
  EDID, DESC (Loading tip text, lstring, required)
  CTDAs (standard 32-byte Condition struct + optional CIS1/CIS2)
  NNAM (Loading Screen NIF FormID -> STAT/SCOL/NULL), TNAM (Transform
    FormID -> TRNS)
  ONAM — fixed 4-byte struct: Rotation Min (s16), Rotation Max (s16)
  ZNAM — fixed 8-byte struct: Zoom Min (f32), Zoom Max (f32)
  MOD2 (Camera Path filename, string)

GLOB:
  Record header Flags (u32, header offset 8): Constant (0x00000040)
  EDID, FNAM (Type, u8 char: 's'=Short/'l'=Long/'f'=Float/'b'=Boolean
    -- decoded as the raw ASCII character plus its label), FLTV (Value,
    float -- the on-disk storage is always a float regardless of Type,
    per source's own union-free single-field struct)

Outputs:
  <scan-cache>/fo4_formlists_loadscreens_globals.json
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
GRAPH_OUT = _OUT_DIR / "fo4_formlists_loadscreens_globals.json"

COMPRESSED_FLAG = 0x00040000

LSCR_HEADER_FLAGS = [(0x00000400, "Displays In Main Menu"), (0x00008000, "No Rotation")]
GLOB_HEADER_FLAGS = [(0x00000040, "Constant")]
GLOB_TYPE = {0: "Unknown 0", ord("s"): "Short", ord("l"): "Long", ord("f"): "Float", ord("b"): "Boolean"}

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


def _extract_one_flst(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    form_ids: list[str] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "LNAM":
            fid = fid_hex(d)
            if fid:
                form_ids.append(fid)

    if not edid:
        return None

    return {"record_type": "FLST", "form_id": f"0x{form_id:08X}", "edid": edid, "full_name": full, "form_ids": form_ids}


def _extract_one_lscr(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    description: str | None = None
    conditions: list[dict] = []
    last_ctda: dict | None = None
    nif: str | None = None
    transform: str | None = None
    rotation_min = rotation_max = None
    zoom_min = zoom_max = None
    camera_path: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DESC":
            description = resolve_lstring(d, string_lookup)
        elif tag == "CTDA":
            c = parse_ctda(d)
            if c is not None:
                conditions.append(c)
                last_ctda = c
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["cis2"] = resolve_string(d)
        elif tag == "NNAM":
            nif = fid_hex(d)
        elif tag == "TNAM":
            transform = fid_hex(d)
        elif tag == "ONAM" and len(d) >= 4:
            rotation_min = struct.unpack_from("<h", d, 0)[0]
            rotation_max = struct.unpack_from("<h", d, 2)[0]
        elif tag == "ZNAM" and len(d) >= 8:
            zoom_min = round(struct.unpack_from("<f", d, 0)[0], 5)
            zoom_max = round(struct.unpack_from("<f", d, 4)[0], 5)
        elif tag == "MOD2":
            camera_path = resolve_string(d)

    if not edid:
        return None

    return {
        "record_type": "LSCR",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "header_flags": _decode_flags_bitfield(header_flags_raw, LSCR_HEADER_FLAGS),
        "description": description,
        "conditions": conditions,
        "nif": nif,
        "transform": transform,
        "rotation_min": rotation_min,
        "rotation_max": rotation_max,
        "zoom_min": zoom_min,
        "zoom_max": zoom_max,
        "camera_path": camera_path,
    }


def _extract_one_glob(dec: bytes, form_id: int, header_flags_raw: int) -> dict | None:
    edid: str | None = None
    type_char: int | None = None
    value: float | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FNAM" and len(d) >= 1:
            type_char = d[0]
        elif tag == "FLTV" and len(d) >= 4:
            value = round(struct.unpack_from("<f", d, 0)[0], 5)

    if not edid:
        return None

    return {
        "record_type": "GLOB",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "header_flags": _decode_flags_bitfield(header_flags_raw, GLOB_HEADER_FLAGS),
        "type": GLOB_TYPE.get(type_char, f"Unknown ({type_char})"),
        "value": value,
    }


def extract_all(esm_path: Path, string_lookup: dict[int, str]) -> tuple[list[dict], list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    flst_out: list[dict] = []
    lscr_out: list[dict] = []
    glob_out: list[dict] = []

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
        if rec_type in (b"FLST", b"LSCR", b"GLOB"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"FLST":
                    r = _extract_one_flst(dec, form_id, string_lookup)
                    if r is not None:
                        flst_out.append(r)
                elif rec_type == b"LSCR":
                    r = _extract_one_lscr(dec, form_id, header_flags, string_lookup)
                    if r is not None:
                        lscr_out.append(r)
                else:
                    r = _extract_one_glob(dec, form_id, header_flags)
                    if r is not None:
                        glob_out.append(r)
        pos += data_size

    return flst_out, lscr_out, glob_out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_flst: list[dict] = []
    all_lscr: list[dict] = []
    all_glob: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for form lists/load screens/globals...")
        flst, lscr, glob_ = extract_all(esm_path, string_lookup)
        all_flst.extend(flst)
        all_lscr.extend(lscr)
        all_glob.extend(glob_)

    constant_globals = [g for g in all_glob if "Constant" in g["header_flags"]]
    by_glob_type: dict[str, int] = {}
    for g in all_glob:
        by_glob_type[g["type"]] = by_glob_type.get(g["type"], 0) + 1

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_form_lists": len(all_flst),
        "total_load_screens": len(all_lscr),
        "total_globals": len(all_glob),
        "constant_globals": len(constant_globals),
        "by_global_type": by_glob_type,
        "form_lists": all_flst,
        "load_screens": all_lscr,
        "globals": all_glob,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== FormList/LoadScreen/Global scan complete in {elapsed:.1f}s ===")
    print(f"  Total form lists: {len(all_flst):,}")
    print(f"  Total load screens: {len(all_lscr):,}")
    print(f"  Total globals: {len(all_glob):,} ({len(constant_globals)} constant)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
