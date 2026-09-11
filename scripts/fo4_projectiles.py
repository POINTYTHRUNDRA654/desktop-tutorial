#!/usr/bin/env python3
"""
fo4_projectiles.py — FO4 Projectile (PROJ)
========================================================================
Fourteenth stop in the "grind it to zero" pass, third of the EXPL/PROJ/
IPDS cluster. Projectile records define how a fired weapon shot actually
travels and behaves — gravity, speed, range, whether it's hitscan or a
physical projectile, what explosion it triggers on impact (decoded by
fo4_explosions.py), muzzle flash, cone spread (for shotgun-style
pellets), impact force, and more. Referenced by ammo/weapon records
(not yet scanned) and by EXPL's own "Spawn Projectile" field.

Source-verified (wbDefinitionsFO4.pas ~10143-10205):
  EDID, OBND (bounds, not decoded), FULL, MODL, DEST (destructible data,
  not decoded), DATA (unused byte array, skipped)
  DNAM — fixed struct, parsed here with a running offset (same technique
    as fo4_explosions.py, verified safer than hand offsets):
    Flags (u16 bitfield: Hitscan/Explosion/Alt. Trigger/Muzzle Flash/
    Can Be Disabled/Can Be Picked Up/Supersonic/Pins Limbs/Pass Through
    Small Transparent/Disable Combat Aim Correction/Penetrates
    Geometry/Continuous Update/Seeks Target), Type (u16 single-value
    enum: Missile/Lobber/Beam/Flame/Cone/Barrier/Arrow), Gravity/Speed/
    Range floats, Light/Muzzle Flash Light FormIDs, Alt. Trigger
    Proximity/Timer floats, Explosion FormID (-> EXPL, decoded by
    fo4_explosions.py), Sound FormID, Muzzle Flash Duration/Fade
    Duration/Impact Force floats, Sound Countdown/Sound Disable/Default
    Weapon Source FormIDs, Cone Spread/Collision Radius/Lifetime/
    Relaunch Interval floats, Decal Data/Collision Layer FormIDs,
    Tracer Frequency (u8), VATS Projectile FormID (-> PROJ, self-ref).
  Muzzle Flash Model group (NAM1 filename string + NAM2 texture hashes,
    not decoded) — NAM1 captured directly, single occurrence per record.
  VNAM (Sound Level, u32 enum, same table as EXPL/HAZD).

Outputs:
  <scan-cache>/fo4_projectiles.json
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
GRAPH_OUT = _OUT_DIR / "fo4_projectiles.json"

COMPRESSED_FLAG = 0x00040000

PROJ_FLAGS = [
    (0x00001, "Hitscan"), (0x00002, "Explosion"), (0x00004, "Alt. Trigger"),
    (0x00008, "Muzzle Flash"), (0x00010, "Unknown 4"), (0x00020, "Can Be Disabled"),
    (0x00040, "Can Be Picked Up"), (0x00080, "Supersonic"), (0x00100, "Pins Limbs"),
    (0x00200, "Pass Through Small Transparent"), (0x00400, "Disable Combat Aim Correction"),
    (0x00800, "Penetrates Geometry"), (0x01000, "Continuous Update"), (0x02000, "Seeks Target"),
]
PROJ_TYPE = {0x01: "Missile", 0x02: "Lobber", 0x04: "Beam", 0x08: "Flame", 0x10: "Cone", 0x20: "Barrier", 0x40: "Arrow"}
SOUND_LEVEL = ["Loud", "Normal", "Silent", "Very Loud", "Quiet"]

# (field_name, type) in exact source order. 'f'=float32, 'fid'=formid, 'u16'=uint16, 'u8'=uint8
DNAM_FIELDS = [
    ("flags_raw", "u16"), ("type_raw", "u16"),
    ("gravity", "f"), ("speed", "f"), ("range", "f"),
    ("light", "fid"), ("muzzle_flash_light", "fid"),
    ("alt_trigger_proximity", "f"), ("alt_trigger_timer", "f"),
    ("explosion", "fid"), ("sound", "fid"),
    ("muzzle_flash_duration", "f"), ("fade_duration", "f"), ("impact_force", "f"),
    ("sound_countdown", "fid"), ("sound_disable", "fid"), ("default_weapon_source", "fid"),
    ("cone_spread", "f"), ("collision_radius", "f"), ("lifetime", "f"), ("relaunch_interval", "f"),
    ("decal_data", "fid"), ("collision_layer", "fid"),
    ("tracer_frequency", "u8"),
    ("vats_projectile", "fid"),
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


def parse_dnam(d: bytes) -> dict | None:
    if len(d) < 4:
        return None
    off = 0
    out = {}
    field_sizes = {"u16": 2, "u8": 1}
    for name, t in DNAM_FIELDS:
        size = field_sizes.get(t, 4)
        if off + size > len(d):
            out[name] = None
            continue
        if t == "f":
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
        elif t == "fid":
            out[name] = fid_hex(d[off:off + 4])
        elif t == "u16":
            out[name] = struct.unpack_from("<H", d, off)[0]
        elif t == "u8":
            out[name] = d[off]
        off += size

    flags_raw = out.pop("flags_raw")
    type_raw = out.pop("type_raw")
    out["flags"] = _decode_flags_bitfield(flags_raw, PROJ_FLAGS) if flags_raw is not None else None
    out["type"] = (PROJ_TYPE.get(type_raw, f"Unknown (0x{type_raw:X})") if type_raw is not None else None)
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


def _extract_one_proj(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    data: dict | None = None
    muzzle_flash_model: str | None = None
    sound_level: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "DNAM":
            data = parse_dnam(d)
        elif tag == "NAM1":
            if muzzle_flash_model is None:
                muzzle_flash_model = resolve_string(d)
        elif tag == "VNAM" and len(d) >= 4:
            v = struct.unpack_from("<I", d, 0)[0]
            sound_level = SOUND_LEVEL[v] if 0 <= v < len(SOUND_LEVEL) else f"Unknown ({v})"

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "data": data,
        "muzzle_flash_model": muzzle_flash_model,
        "sound_level": sound_level,
    }


def extract_projs(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"PROJ":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                p = _extract_one_proj(dec, form_id, string_lookup)
                if p is not None:
                    out.append(p)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_projs: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for projectiles...")
        all_projs.extend(extract_projs(esm_path, string_lookup))

    by_type: dict[str, int] = {}
    for p in all_projs:
        t = (p["data"] or {}).get("type") or "Unknown"
        by_type[t] = by_type.get(t, 0) + 1

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_projectiles": len(all_projs),
        "by_type": by_type,
        "projectiles": all_projs,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Projectile scan complete in {elapsed:.1f}s ===")
    print(f"  Total projectiles: {len(all_projs):,}")
    print(f"  By type: {by_type}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
