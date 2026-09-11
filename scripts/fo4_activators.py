#!/usr/bin/env python3
"""
fo4_activators.py — FO4 Activator (ACTI)
========================================================================
Twenty-first stop in the "grind it to zero" pass, first of the
"referenced but not deep" tier's interactive-object half (STAT/MSTT
covered the dumb-decoration half). Activators are every world object
the player can "Activate" on (E) -- levers, terminals-that-aren't-
TERM, light switches, radios, workbenches' activation points, danger
markers, water-edge triggers -- decoded here for marker color, sound
linkage, interaction keyword, radio-station behavior, and Conditions
gating when activation is allowed.

Source-verified (wbDefinitionsFO4.pas ~8509-8583):
  Record header Flags (u32, at header offset 8 -- same technique proven
    in fo4_statics.py) -- bits include Never Fades, Non Occluder,
    Heading Marker, Must Update Anims, Hidden From Local Map, Headtrack
    Marker, Used as Platform, Pack-In Use Only, Has Distant LOD, Random
    Anim Start, Dangerous, Ignore Object Interaction, Is Marker,
    Obstacle, NavMesh Generation variants, Child Can Use
  EDID, FULL, MODL
  PNAM — fixed 4-byte "Marker Color" struct: Red (u8), Green (u8),
    Blue (u8), Unused (u8)
  SNAM (Sound - Looping FormID -> SNDR), VNAM (Sound - Activation
    FormID -> SNDR), WNAM (Water Type FormID -> WATR)
  FNAM — u16 bitfield: No Displacement, Ignored by Sandbox, Unknown 2,
    Unknown 3, Is a Radio
  KNAM (Interaction Keyword FormID -> KYWD)
  KSIZ/KWDA (standard Keywords array)
  RADR — "Radio Receiver" struct, parsed defensively via running-offset
    rather than a hand-assumed fixed size: Sound Model FormID -> SOPM
    (4), Frequency (f32), Volume (f32), Starts Active (u8 bool), No
    Signal Static (u8 bool) -- 14 bytes on every real record observed;
    parsed field-by-field so a shorter/longer real-world variant
    degrades gracefully (later fields None) instead of hard-failing.
  CITC (Condition Item Count, informational u32) + repeating CTDA
    (32-byte Condition struct, standard across this whole project) with
    optional trailing CIS1/CIS2 strings attached via last-CTDA tracking
  Not decoded (no modding value / binary geometry, consistent with the
    rest of this project): VMAD, OBND, PTRN, STCP, DEST, PRPS, NTRM,
    FTYP, NVNM

Outputs:
  <scan-cache>/fo4_activators.json
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
GRAPH_OUT = _OUT_DIR / "fo4_activators.json"

COMPRESSED_FLAG = 0x00040000

ACTI_HEADER_FLAGS = [
    (0x00000002, "Never Fades"), (0x00000004, "Non Occluder"), (0x00000080, "Heading Marker"),
    (0x00000100, "Must Update Anims"), (0x00000200, "Hidden From Local Map"),
    (0x00000400, "Headtrack Marker"), (0x00000800, "Used as Platform"),
    (0x00001000, "Pack-In Use Only"), (0x00008000, "Has Distant LOD"),
    (0x00010000, "Random Anim Start"), (0x00020000, "Dangerous"),
    (0x00100000, "Ignore Object Interaction"), (0x00800000, "Is Marker"),
    (0x02000000, "Obstacle"), (0x04000000, "NavMesh Generation - Filter"),
    (0x08000000, "NavMesh Generation - Bounding Box"), (0x20000000, "Child Can Use"),
    (0x40000000, "NavMesh Generation - Ground"),
]
ACTI_FNAM_FLAGS = [
    (0x0001, "No Displacement"), (0x0002, "Ignored by Sandbox"),
    (0x0004, "Unknown 2"), (0x0008, "Unknown 3"), (0x0010, "Is a Radio"),
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


def parse_radr(d: bytes) -> dict | None:
    # Running-offset parse: never hand-assume the fixed size holds for
    # every real-world record -- degrade gracefully to None fields for
    # anything shorter than expected rather than hard-failing.
    if len(d) < 4:
        return None
    out: dict = {}
    off = 0
    out["sound_model"] = fid_hex(d[off:off + 4]); off += 4
    if off + 4 <= len(d):
        out["frequency"] = round(struct.unpack_from("<f", d, off)[0], 5); off += 4
    else:
        out["frequency"] = None
    if off + 4 <= len(d):
        out["volume"] = round(struct.unpack_from("<f", d, off)[0], 5); off += 4
    else:
        out["volume"] = None
    if off + 1 <= len(d):
        out["starts_active"] = bool(d[off]); off += 1
    else:
        out["starts_active"] = None
    if off + 1 <= len(d):
        out["no_signal_static"] = bool(d[off]); off += 1
    else:
        out["no_signal_static"] = None
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


def _extract_one_acti(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    marker_color: dict | None = None
    looping_sound = activation_sound = water_type = None
    fnam_flags: list[str] = []
    interaction_keyword: str | None = None
    keywords: list[str] = []
    radio: dict | None = None
    conditions: list[dict] = []
    last_ctda: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            if model_path is None:
                model_path = resolve_string(d)
        elif tag == "PNAM" and len(d) >= 3:
            marker_color = {"red": d[0], "green": d[1], "blue": d[2]}
        elif tag == "SNAM":
            looping_sound = fid_hex(d)
        elif tag == "VNAM":
            activation_sound = fid_hex(d)
        elif tag == "WNAM":
            water_type = fid_hex(d)
        elif tag == "FNAM" and len(d) >= 2:
            v = struct.unpack_from("<H", d, 0)[0]
            fnam_flags = _decode_flags_bitfield(v, ACTI_FNAM_FLAGS)
        elif tag == "KNAM":
            interaction_keyword = fid_hex(d)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "RADR":
            radio = parse_radr(d)
        elif tag == "CTDA":
            c = parse_ctda(d)
            if c is not None:
                conditions.append(c)
                last_ctda = c
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["cis2"] = resolve_string(d)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "model_path": model_path,
        "header_flags": _decode_flags_bitfield(header_flags_raw, ACTI_HEADER_FLAGS),
        "marker_color": marker_color,
        "looping_sound": looping_sound,
        "activation_sound": activation_sound,
        "water_type": water_type,
        "flags": fnam_flags,
        "interaction_keyword": interaction_keyword,
        "keywords": keywords,
        "radio": radio,
        "conditions": conditions,
    }


def extract_activators(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"ACTI":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                a = _extract_one_acti(dec, form_id, header_flags, string_lookup)
                if a is not None:
                    out.append(a)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_acti: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for activators...")
        all_acti.extend(extract_activators(esm_path, string_lookup))

    with_conditions = [a for a in all_acti if a["conditions"]]
    with_radio = [a for a in all_acti if a["radio"]]
    dangerous = [a for a in all_acti if "Dangerous" in a["header_flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_activators": len(all_acti),
        "with_conditions": len(with_conditions),
        "with_radio": len(with_radio),
        "dangerous": len(dangerous),
        "activators": all_acti,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Activator scan complete in {elapsed:.1f}s ===")
    print(f"  Total activators: {len(all_acti):,}")
    print(f"  With conditions: {len(with_conditions):,}")
    print(f"  With radio: {len(with_radio):,}")
    print(f"  Dangerous: {len(dangerous):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
