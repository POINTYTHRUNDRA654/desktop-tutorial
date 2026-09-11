#!/usr/bin/env python3
"""
fo4_idle_animations.py — FO4 Idle Animation (IDLE)
========================================================================
Tenth stop in the "grind it to zero" pass. Idle Animations are the
building blocks Package/Scene actions and AI packages reference to play
a specific animation on an actor — behavior graph target, the actual
animation event name fired into it, conditions gating when it can play,
looping/replay behavior, and links to related (parent/sibling) idle
animations for animation-tree chaining.

Source-verified (wbDefinitionsFO4.pas ~12514-12536):
  EDID
  Conditions (wbCTDAs = repeating array of CTDA, each the same 32-byte
    struct used everywhere else in this project — Type/Comparison
    Value/Function/Param1/Param2/RunOn/Reference/Param3 — with optional
    trailing CIS1/CIS2 string subrecords, handled with the same
    last_ctda-tracking fix already verified in fo4_scenes.py and
    fo4_factions.py)
  DNAM (Behavior Graph, plain string)
  ENAM (Animation Event, plain string)
  ANAM (Related Idle Animations, array of FormIDs -> AACT/IDLE; source
    labels index 0 "Parent" and index 1 "Previous Sibling")
  DATA — fixed 6-byte struct: Looping Min (u8), Looping Max (u8, both
    255 = loop forever per source comment), Flags (u8: Parent/Sequence/
    No Attacking-or-Blocking [source itself documents 0x04 as a
    duplicate-meaning bit, kept as both labels rather than guessing
    which applies]), Animation Group Section (u8), Replay Delay (u16)
  GNAM (Animation File, plain string)

Every tag unique except CTDA (array, correctly handled) and ANAM
(single array field, no reuse). No ambiguity.

Outputs:
  <scan-cache>/fo4_idle_animations.json
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
GRAPH_OUT = _OUT_DIR / "fo4_idle_animations.json"

COMPRESSED_FLAG = 0x00040000

IDLE_DATA_FLAGS = [
    (0x01, "Parent"), (0x02, "Sequence"),
    (0x04, "No Attacking / Blocking"),  # source documents both labels on the same bit
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


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
    return f"0x{v:08X}" if v else None


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 32:
        return None
    try:
        type_byte = d[0]
        comp_op = (type_byte >> 5) & 0x07
        flag_bits = type_byte & 0x1F
        comparison_raw = struct.unpack_from("<I", d, 4)[0]
        comparison_float = struct.unpack_from("<f", d, 4)[0]
        function = struct.unpack_from("<H", d, 8)[0]
        param1 = fid_hex(d[12:16])
        param2 = fid_hex(d[16:20])
        run_on = struct.unpack_from("<I", d, 20)[0]
        reference = fid_hex(d[24:28])
        param3 = struct.unpack_from("<i", d, 28)[0]
        use_global = bool(flag_bits & 0x04)
        return {
            "flags": {
                "or": bool(flag_bits & 0x01), "use_aliases": bool(flag_bits & 0x02),
                "use_global": use_global, "use_packdata": bool(flag_bits & 0x08),
                "swap_subject_target": bool(flag_bits & 0x10),
            },
            "compare_op": ["==", "!=", ">", ">=", "<", "<="][comp_op] if comp_op < 6 else f"op{comp_op}",
            "comparison_value": (f"0x{comparison_raw:08X}" if use_global else round(comparison_float, 5)),
            "function": function,
            "param1": param1, "param2": param2,
            "run_on": run_on, "reference": reference, "param3": param3,
            "cis1": None, "cis2": None,
        }
    except (struct.error, IndexError):
        return None


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


def _extract_one_idle(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    conditions: list[dict] = []
    behavior_graph: str | None = None
    animation_event: str | None = None
    related: list[str] = []
    data: dict | None = None
    animation_file: str | None = None
    last_ctda: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "CTDA":
            c = parse_ctda(d)
            if c is not None:
                conditions.append(c)
                last_ctda = c
        elif tag == "CIS1":
            if last_ctda is not None:
                last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2":
            if last_ctda is not None:
                last_ctda["cis2"] = resolve_string(d)
        elif tag == "DNAM":
            behavior_graph = resolve_string(d)
        elif tag == "ENAM":
            animation_event = resolve_string(d)
        elif tag == "ANAM":
            # Packed array of FormIDs (Parent, Previous Sibling, ...) in one
            # subrecord -- NOT one ANAM tag per entry. Real data confirms an
            # 8-byte ANAM (2 FormIDs) on every record; unpack every 4-byte
            # chunk generically rather than assuming exactly 2.
            for i in range(len(d) // 4):
                fid = fid_hex(d[i * 4:i * 4 + 4])
                related.append(fid)  # keep positional slots (None for empty/no-link)
        elif tag == "DATA" and len(d) >= 6:
            data = {
                "looping_min": d[0],
                "looping_max": d[1],
                "loops_forever": (d[0] == 255 and d[1] == 255),
                "flags": _decode_flags_bitfield(d[2], IDLE_DATA_FLAGS),
                "animation_group_section": d[3],
                "replay_delay": struct.unpack_from("<H", d, 4)[0],
            }
        elif tag == "GNAM":
            animation_file = resolve_string(d)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "conditions": conditions,
        "behavior_graph": behavior_graph,
        "animation_event": animation_event,
        "related_idle_animations": related,
        "parent": related[0] if len(related) > 0 else None,
        "previous_sibling": related[1] if len(related) > 1 else None,
        "data": data,
        "animation_file": animation_file,
    }


def extract_idles(esm_path: Path) -> list[dict]:
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
        if rec_type == b"IDLE":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                i = _extract_one_idle(dec, form_id)
                if i is not None:
                    out.append(i)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_idles: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for idle animations...")
        all_idles.extend(extract_idles(esm_path))

    with_conditions = [i for i in all_idles if i["conditions"]]
    with_parent = [i for i in all_idles if i["parent"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_idle_animations": len(all_idles),
        "idles_with_conditions": len(with_conditions),
        "idles_with_parent": len(with_parent),
        "idle_animations": all_idles,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Idle animation scan complete in {elapsed:.1f}s ===")
    print(f"  Total idle animations: {len(all_idles):,}")
    print(f"  With conditions:       {len(with_conditions):,}")
    print(f"  With parent link:      {len(with_parent):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
