#!/usr/bin/env python3
"""
fo4_movement_types.py — FO4 Movement Type (MOVT)
========================================================================
Seventh stop in the "grind it to zero" pass (after TERM/SCEN/FACT/RACE/
CSTY/AVIF/ECZN/HAZD/FLOR/ASTP). Movement Types define the per-gait speed
and turning-rate profile a Race (or an actor override) uses — walk/run/
sprint speed by direction, pitch/yaw turn rates by gait, plus flight
float height and turn-gain. Referenced by RACE's SNAM-family movement
type fields (fo4_races.py already captures the FormID references —
this scanner decodes what those FormIDs actually point to).

Source-verified (wbDefinitionsFO4.pas ~12199-12282):
  EDID
  MNAM (Name, plain string)
  SPED — fixed 28-float (112-byte) "Movement Data" struct: Unknown,
    Walk-Left, Run-Left, Unknown, Unknown, Walk-Right, Run-Right,
    Unknown, Unknown, Walk-Forward, Run-Forward, Sprint-Forward,
    Unknown, Walk-Back, Run-Back, Unknown, Standing-Pitch, Walk-Pitch,
    Run-Pitch, Sprint-Pitch, Unknown x4, Standing-Yaw, Walk-Yaw,
    Run-Yaw, Sprint-Yaw (Pitch/Yaw fields are stored as a normalized
    rotation factor in source but that scaling is an xEdit display
    convenience, not a raw-byte transform — captured here as the raw
    float value only, never guessed at).
  INAM — fixed 3-float (12-byte) "Anim Change Thresholds (unused)"
    struct: Directional, Movement Speed, Rotation Speed (xEdit itself
    labels this whole struct unused/dead data — captured for
    completeness, not relied on).
  JNAM — Float Height (single float)
  LNAM — Flight - Angle Gain (single float)

Every tag unique, no repeating groups, no ambiguity.

Outputs:
  <scan-cache>/fo4_movement_types.json
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
GRAPH_OUT = _OUT_DIR / "fo4_movement_types.json"

COMPRESSED_FLAG = 0x00040000

SPED_FIELDS = [
    "unknown_1", "walk_left", "run_left", "unknown_2", "unknown_3",
    "walk_right", "run_right", "unknown_4", "unknown_5",
    "walk_forward", "run_forward", "sprint_forward", "unknown_6",
    "walk_back", "run_back", "unknown_7",
    "standing_pitch", "walk_pitch", "run_pitch", "sprint_pitch",
    "unknown_8", "unknown_9", "unknown_10", "unknown_11",
    "standing_yaw", "walk_yaw", "run_yaw", "sprint_yaw",
]
INAM_FIELDS = ["directional", "movement_speed", "rotation_speed"]


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


def _floats(d: bytes, names: list[str]) -> dict | None:
    need = len(names) * 4
    if len(d) < need:
        return None
    try:
        vals = struct.unpack_from(f"<{len(names)}f", d, 0)
        return {n: round(v, 5) for n, v in zip(names, vals)}
    except struct.error:
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


def _extract_one_movt(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    name: str | None = None
    speed: dict | None = None
    anim_thresholds: dict | None = None
    float_height: float | None = None
    flight_angle_gain: float | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "MNAM":
            name = resolve_string(d)
        elif tag == "SPED":
            speed = _floats(d, SPED_FIELDS)
        elif tag == "INAM":
            anim_thresholds = _floats(d, INAM_FIELDS)
        elif tag == "JNAM" and len(d) >= 4:
            float_height = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag == "LNAM" and len(d) >= 4:
            flight_angle_gain = round(struct.unpack_from("<f", d, 0)[0], 5)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "name": name,
        "speed": speed,
        "anim_change_thresholds_unused": anim_thresholds,
        "float_height": float_height,
        "flight_angle_gain": flight_angle_gain,
    }


def extract_movts(esm_path: Path) -> list[dict]:
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
        if rec_type == b"MOVT":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                m = _extract_one_movt(dec, form_id)
                if m is not None:
                    out.append(m)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_movts: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for movement types...")
        all_movts.extend(extract_movts(esm_path))

    with_speed = [m for m in all_movts if m["speed"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_movement_types": len(all_movts),
        "movement_types_with_speed_data": len(with_speed),
        "movement_types": all_movts,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Movement type scan complete in {elapsed:.1f}s ===")
    print(f"  Total movement types:     {len(all_movts):,}")
    print(f"  With speed data:          {len(with_speed):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
