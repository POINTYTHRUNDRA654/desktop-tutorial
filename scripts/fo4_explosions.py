#!/usr/bin/env python3
"""
fo4_explosions.py — FO4 Explosion (EXPL)
========================================================================
Thirteenth stop in the "grind it to zero" pass, second of the EXPL/
PROJ/IPDS cluster. Explosion records define what actually happens when
something detonates — damage, blast radius (inner/outer), force,
knockdown/stagger behavior, what light/sounds play, what gets spawned
(placed object, chained projectile), and spawn scatter pattern.
Referenced by PROJ's "Explosion" field (this project's own PROJ scanner
captures that reference) and by weapons/perks elsewhere.

Source-verified (wbDefinitionsFO4.pas ~10473-10526):
  EDID, OBND (bounds, not decoded — geometry-only), FULL, MODL
  EITM (Base Enchantment, not decoded — shared macro, low modding value)
  MNAM (Image Space Modifier FormID -> IMAD)
  DATA — fixed struct: Light/Sound1/Sound2 FormIDs, Impact Data Set
    FormID (-> IPDS, decoded by fo4_impact_data_sets.py), Placed Object
    FormID (unchecked type), Spawn Projectile FormID (-> PROJ, decoded
    by fo4_projectiles.py), Force/Damage/Inner Radius/Outer Radius/IS
    Radius floats, a form-version-gated Vertical Offset Mult field
    (raw bytes pre-FormVersion-99, float from FormVersion 99 onward —
    same 4 bytes either way, so this scanner reads the record's own
    FormVersion from its header, exactly like xEdit's decider, rather
    than guessing), Flags (u32 bitfield), Sound Level (u32 enum),
    Placed Object AutoFade Delay (float), Stagger (u32 enum: None/
    Small/Medium/Large/Extra Large), and a trailing Spawn struct
    (X/Y/Z/Spread Degrees floats, Count u32).

Outputs:
  <scan-cache>/fo4_explosions.json
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
GRAPH_OUT = _OUT_DIR / "fo4_explosions.json"

COMPRESSED_FLAG = 0x00040000
VERTICAL_OFFSET_FORM_VERSION = 99

EXPL_FLAGS = [
    (0x00000001, "Unknown 0"), (0x00000002, "Always Uses World Orientation"),
    (0x00000004, "Knock Down - Always"), (0x00000008, "Knock Down - By Formula"),
    (0x00000010, "Ignore LOS Check"), (0x00000020, "Push Explosion Source Ref Only"),
    (0x00000040, "Ignore Image Space Swap"), (0x00000080, "Chain"),
    (0x00000100, "No Controller Vibration"), (0x00000200, "Placed Object Persists"),
    (0x00000400, "Skip Underwater Tests"),
]
SOUND_LEVEL = ["Loud", "Normal", "Silent", "Very Loud", "Quiet"]
STAGGER = ["None", "Small", "Medium", "Large", "Extra Large"]


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


def resolve_lstring(sub_data: bytes, string_lookup: dict[int, str]) -> str | None:
    if len(sub_data) == 4:
        sid = struct.unpack_from("<I", sub_data, 0)[0]
        return string_lookup.get(sid)
    elif len(sub_data) > 1:
        null_pos = sub_data.find(b"\x00")
        raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
        text = raw_b.decode("utf-8", errors="replace").strip()
        return text if text else None
    return None


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
    return f"0x{v:08X}" if v else None


# DATA parsed with an explicit running offset (safer than hand offsets once
# the form-version-gated union field is involved) -- fields in exact source order.
_DATA_FIELDS_PRE_UNION = [
    ("light", "fid"), ("sound1", "fid"), ("sound2", "fid"), ("impact_data_set", "fid"),
    ("placed_object", "fid"), ("spawn_projectile", "fid"),
    ("force", "f"), ("damage", "f"), ("inner_radius", "f"), ("outer_radius", "f"), ("is_radius", "f"),
]
_DATA_FIELDS_POST_UNION = [
    ("flags_raw", "u32"), ("sound_level", "u32"), ("placed_object_autofade_delay", "f"),
    ("stagger", "u32"),
    ("spawn_x", "f"), ("spawn_y", "f"), ("spawn_z", "f"), ("spawn_spread_degrees", "f"), ("spawn_count", "u32"),
]


def parse_expl_data(d: bytes, form_version: int) -> dict | None:
    # The DATA struct has grown across FO4's development (xEdit itself marks
    # only the first 13 elements "required" -- wbStruct(..., nil, 13)):
    # real base-game data confirms several low-FormVersion records carry a
    # DATA subrecord shorter than the modern 84-byte layout (56 bytes,
    # ending right after Sound Level -- no AutoFade Delay/Stagger/Spawn).
    # Parsed here with a running offset that stops gracefully once bytes
    # run out, leaving later-added fields None rather than guessing or
    # failing the whole record -- the only never-guess-safe way to handle
    # a struct that legitimately grew over time.
    if len(d) < 44:  # smaller than this and even the pre-union fields don't fit -- not a valid DATA
        return None

    off = 0
    out = {}
    for name, t in _DATA_FIELDS_PRE_UNION:
        if t == "fid":
            out[name] = fid_hex(d[off:off + 4])
        else:
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
        off += 4

    # Union: 4 bytes, float only if FormVersion >= 99, else raw/unknown
    if off + 4 <= len(d):
        if form_version >= VERTICAL_OFFSET_FORM_VERSION:
            out["vertical_offset_mult"] = round(struct.unpack_from("<f", d, off)[0], 5)
        else:
            out["vertical_offset_mult"] = None
        off += 4
    else:
        out["vertical_offset_mult"] = None

    flags_raw = sound_level_v = stagger_v = None
    for name, t in _DATA_FIELDS_POST_UNION:
        if off + 4 <= len(d):
            if t == "u32":
                out[name] = struct.unpack_from("<I", d, off)[0]
            else:
                out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
            off += 4
        else:
            out[name] = None

    flags_raw = out.pop("flags_raw")
    sound_level_v = out.pop("sound_level")
    stagger_v = out.pop("stagger")
    out["flags"] = _decode_flags_bitfield(flags_raw, EXPL_FLAGS) if flags_raw is not None else None
    out["sound_level"] = (SOUND_LEVEL[sound_level_v] if sound_level_v is not None and 0 <= sound_level_v < len(SOUND_LEVEL)
                           else (f"Unknown ({sound_level_v})" if sound_level_v is not None else None))
    out["stagger"] = (STAGGER[stagger_v] if stagger_v is not None and 0 <= stagger_v < len(STAGGER)
                       else (f"Unknown ({stagger_v})" if stagger_v is not None else None))
    spawn_vals = [out.pop("spawn_x"), out.pop("spawn_y"), out.pop("spawn_z"),
                  out.pop("spawn_spread_degrees"), out.pop("spawn_count")]
    out["spawn"] = (None if all(v is None for v in spawn_vals) else {
        "x": spawn_vals[0], "y": spawn_vals[1], "z": spawn_vals[2],
        "spread_degrees": spawn_vals[3], "count": spawn_vals[4],
    })
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


def _extract_one_expl(dec: bytes, form_id: int, form_version: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    image_space_modifier: str | None = None
    data: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MNAM":
            image_space_modifier = fid_hex(d)
        elif tag == "DATA":
            data = parse_expl_data(d, form_version)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "image_space_modifier": image_space_modifier,
        "form_version": form_version,
        "data": data,
    }


def extract_expls(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        flags        = struct.unpack_from("<I", data, pos + 8)[0]
        form_id      = struct.unpack_from("<I", data, pos + 12)[0]
        form_version = struct.unpack_from("<H", data, pos + 20)[0]
        pos += 24
        if pos + data_size > length:
            break
        if rec_type == b"EXPL":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                e = _extract_one_expl(dec, form_id, form_version, string_lookup)
                if e is not None:
                    out.append(e)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_expls: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for explosions...")
        all_expls.extend(extract_expls(esm_path, string_lookup))

    with_data = [e for e in all_expls if e["data"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_explosions": len(all_expls),
        "explosions_with_data": len(with_data),
        "explosions": all_expls,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Explosion scan complete in {elapsed:.1f}s ===")
    print(f"  Total explosions: {len(all_expls):,}")
    print(f"  With decoded data: {len(with_data):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
