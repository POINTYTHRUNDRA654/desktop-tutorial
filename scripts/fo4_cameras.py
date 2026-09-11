#!/usr/bin/env python3
"""
fo4_cameras.py — FO4 Camera Shot (CAMS) / Camera Path (CPTH)
========================================================================
Twenty-seventh stop in the "grind it to zero" pass, third of the
broader engine-plumbing sweep ("cameras" from the originally agreed
scope). Camera Shots define every kill-cam/VATS-style camera behavior
(follow the attacker, the projectile, or the target; first-person or
not; spring/damping physics) and are strung together into Camera Paths
for multi-shot sequences (e.g. VATS kill montages). Combined into one
scanner since Camera Path's only real content is a list of Camera
Shot FormIDs.

Source-verified (wbDefinitionsFO4.pas ~11056-11124):

CAMS:
  EDID, MODL, CTDAs (standard 32-byte Condition struct + optional
    CIS1/CIS2, same as every other scanner in this project)
  DATA — fixed 64-byte struct (source notes a legacy min-size arg, so
    parsed via running offset with graceful truncation like every
    other large struct in this project): Action (u32 enum: Shoot/Fly/
    Hit/Zoom), Location (u32 enum: Attacker/Projectile/Target/Lead
    Actor), Target (same enum), Flags (u32: Position Follows Location/
    Rotation Follows Target/Don't Follow Bone/First Person Camera/No
    Tracer/Start At Time Zero/Don't Reset Location Spring/Don't Reset
    Target Spring), Time Multipliers (Player/Target/Global, 3 floats),
    Max Time, Min Time, Target % Between Actors, Near Target Distance,
    Location Spring, Target Spring (6 floats), Rotation Offset (X/Y/Z,
    3 floats)
  MNAM (Image Space Modifier FormID -> IMAD)

CPTH:
  EDID, CTDAs
  ANAM — repeating Related Camera Path FormID array (-> CPTH; source
    labels the first two slots Parent/Previous Sibling)
  DATA — u8 bitfield: Disable/Shot List/Dynamic Camera Times/Randomize
    Paths/Not Must Have Camera Shots
  SNAM — repeating Camera Shot FormID array (-> CAMS)

Outputs:
  <scan-cache>/fo4_cameras.json
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
GRAPH_OUT = _OUT_DIR / "fo4_cameras.json"

COMPRESSED_FLAG = 0x00040000

CAMS_ACTION = {0: "Shoot", 1: "Fly", 2: "Hit", 3: "Zoom"}
CAMS_LOCATION_TARGET = {0: "Attacker", 1: "Projectile", 2: "Target", 3: "Lead Actor"}
CAMS_FLAGS = [
    (0x00000001, "Position Follows Location"), (0x00000002, "Rotation Follows Target"),
    (0x00000004, "Don't Follow Bone"), (0x00000008, "First Person Camera"),
    (0x00000010, "No Tracer"), (0x00000020, "Start At Time Zero"),
    (0x00000040, "Don't Reset Location Spring"), (0x00000080, "Don't Reset Target Spring"),
]
CPTH_FLAGS = [
    (0x01, "Disable"), (0x02, "Shot List"), (0x04, "Dynamic Camera Times"),
    (0x40, "Randomize Paths"), (0x80, "Not Must Have Camera Shots"),
]

CTDA_COMPARE_OPS = ["==", "!=", ">", ">=", "<", "<="]

_CAMS_DATA_FIELDS = [
    ("action", "action"), ("location", "loc_tgt"), ("target", "loc_tgt"), ("flags", "flags"),
    ("time_mult_player", "f32"), ("time_mult_target", "f32"), ("time_mult_global", "f32"),
    ("max_time", "f32"), ("min_time", "f32"), ("target_pct_between_actors", "f32"),
    ("near_target_distance", "f32"), ("location_spring", "f32"), ("target_spring", "f32"),
    ("rotation_offset_x", "f32"), ("rotation_offset_y", "f32"), ("rotation_offset_z", "f32"),
]
_FIELD_SIZE = {"action": 4, "loc_tgt": 4, "flags": 4, "f32": 4}


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


def parse_cams_data(d: bytes) -> dict | None:
    if len(d) < 12:  # need at least Action+Location+Target
        return None
    out: dict = {}
    off = 0
    for name, kind in _CAMS_DATA_FIELDS:
        size = _FIELD_SIZE[kind]
        if off + size > len(d):
            out[name] = None
            off += size
            continue
        if kind == "action":
            v = struct.unpack_from("<I", d, off)[0]
            out["action"] = CAMS_ACTION.get(v, f"Unknown ({v})")
        elif kind == "loc_tgt":
            v = struct.unpack_from("<I", d, off)[0]
            out[name] = CAMS_LOCATION_TARGET.get(v, f"Unknown ({v})")
        elif kind == "flags":
            v = struct.unpack_from("<I", d, off)[0]
            out["flags"] = _decode_flags_bitfield(v, CAMS_FLAGS)
        elif kind == "f32":
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
        off += size
    if "flags" not in out:
        out["flags"] = []
    return out


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


def _extract_one_cams(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    model_path: str | None = None
    conditions: list[dict] = []
    last_ctda: dict | None = None
    data: dict | None = None
    image_space_modifier: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "CTDA":
            c = parse_ctda(d)
            if c is not None:
                conditions.append(c)
                last_ctda = c
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["cis2"] = resolve_string(d)
        elif tag == "DATA":
            data = parse_cams_data(d)
        elif tag == "MNAM":
            image_space_modifier = fid_hex(d)

    if not edid:
        return None

    return {
        "record_type": "CAMS",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "model_path": model_path,
        "conditions": conditions,
        "data": data,
        "image_space_modifier": image_space_modifier,
    }


def _extract_one_cpth(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    conditions: list[dict] = []
    last_ctda: dict | None = None
    related_paths: list[str] = []
    flags: list[str] = []
    camera_shots: list[str] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "CTDA":
            c = parse_ctda(d)
            if c is not None:
                conditions.append(c)
                last_ctda = c
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["cis2"] = resolve_string(d)
        elif tag == "ANAM":
            fid = fid_hex(d)
            if fid:
                related_paths.append(fid)
        elif tag == "DATA" and len(d) >= 1:
            flags = _decode_flags_bitfield(d[0], CPTH_FLAGS)
        elif tag == "SNAM":
            fid = fid_hex(d)
            if fid:
                camera_shots.append(fid)

    if not edid:
        return None

    return {
        "record_type": "CPTH",
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "conditions": conditions,
        "related_paths": related_paths,
        "flags": flags,
        "camera_shots": camera_shots,
    }


def extract_cameras(esm_path: Path) -> tuple[list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    cams_out: list[dict] = []
    cpth_out: list[dict] = []

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
        if rec_type in (b"CAMS", b"CPTH"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"CAMS":
                    r = _extract_one_cams(dec, form_id)
                    if r is not None:
                        cams_out.append(r)
                else:
                    r = _extract_one_cpth(dec, form_id)
                    if r is not None:
                        cpth_out.append(r)
        pos += data_size

    return cams_out, cpth_out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_cams: list[dict] = []
    all_cpth: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for camera shots/paths...")
        cams, cpth = extract_cameras(esm_path)
        all_cams.extend(cams)
        all_cpth.extend(cpth)

    first_person = [c for c in all_cams if c["data"] and "First Person Camera" in c["data"]["flags"]]
    by_action: dict[str, int] = {}
    for c in all_cams:
        if c["data"]:
            act = c["data"]["action"] or "Unknown"
            by_action[act] = by_action.get(act, 0) + 1

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_camera_shots": len(all_cams),
        "total_camera_paths": len(all_cpth),
        "first_person": len(first_person),
        "by_action": by_action,
        "camera_shots": all_cams,
        "camera_paths": all_cpth,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Camera scan complete in {elapsed:.1f}s ===")
    print(f"  Total camera shots: {len(all_cams):,}")
    print(f"  Total camera paths: {len(all_cpth):,}")
    print(f"  First person: {len(first_person):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
