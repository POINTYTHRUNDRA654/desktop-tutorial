#!/usr/bin/env python3
"""
fo4_lights.py — FO4 Light (LIGH)
========================================================================
Twenty-third stop in the "grind it to zero" pass, last of the
"referenced but not deep" tier's interactive-object half and final
item before the broader ~100+ engine-plumbing sweep. Lights cover
every placed/carriable light source in the game — color, radius,
falloff/FOV/near-clip cone shaping, flicker animation, shadow-casting
mode, and god-ray linkage.

Source-verified (wbDefinitionsFO4.pas ~12785-12854):
  Record header Flags (u32, at header offset 8) — bit 16 (0x00010000)
    Random Anim Start, bit 17 (0x00020000) Unknown 17, bit 25
    (0x02000000) Obstacle, bit 28 (0x10000000) Portal-strict. Source's
    inline hex comments for bits 25/28 are copy-paste duplicates of bit
    17's 0x00020000 (a documented xEdit source quirk) — the actual mask
    used here is computed from each entry's real bit INDEX (1 << n),
    not the (wrong, repeated) inline hex comment, since a raw record
    can only ever set one true bit position per named flag.
  EDID, MODL, KWDA, FULL, ICON, MICO
  DATA — struct, source notes a legacy minimum-size cutoff (arg "10"),
    so parsed via running offset with graceful truncation rather than a
    hand-assumed fixed 64-byte size (same technique as EXPL/PROJ):
    Time (s32), Radius (u32), Color (4 bytes RGBA/unused), Flags (u32:
    Can be Carried/Flicker/Off By Default/Pulse/Shadow Spotlight/Shadow
    Hemisphere/Shadow OmniDirectional/NonShadow Spotlight/Non
    Specular/Attenuation Only/NonShadow Box/Ignore Roughness/No Rim
    Lighting/Ambient Only), Falloff Exponent (f32), FOV (f32), Near
    Clip (f32), Flicker Effect (Period/Intensity Amplitude/Movement
    Amplitude, 3 floats), Constant (f32), Scalar (f32), Exponent (f32),
    God Rays - Near Clip (f32), Value (u32), Weight (f32)
  FNAM (Fade Value, float), NAM0 (Gobo filename string), LNAM (Lens
    FormID -> LENS), WGDR (God Rays FormID -> GDRY), SNAM (Sound
    FormID -> SNDR)
  Not decoded (no modding value / binary geometry, consistent with the
    rest of this project): VMAD, OBND, PTRN, DEST, PRPS

Outputs:
  <scan-cache>/fo4_lights.json
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
GRAPH_OUT = _OUT_DIR / "fo4_lights.json"

COMPRESSED_FLAG = 0x00040000

LIGH_HEADER_FLAGS = [
    (1 << 16, "Random Anim Start"), (1 << 17, "Unknown 17"),
    (1 << 25, "Obstacle"), (1 << 28, "Portal-strict"),
]
LIGH_DATA_FLAGS = [
    (0x00000002, "Can be Carried"), (0x00000008, "Flicker"), (0x00000020, "Off By Default"),
    (0x00000080, "Pulse"), (0x00000400, "Shadow Spotlight"), (0x00000800, "Shadow Hemisphere"),
    (0x00001000, "Shadow OmniDirectional"), (0x00004000, "NonShadow Spotlight"),
    (0x00008000, "Non Specular"), (0x00010000, "Attenuation Only"), (0x00020000, "NonShadow Box"),
    (0x00040000, "Ignore Roughness"), (0x00080000, "No Rim Lighting"), (0x00100000, "Ambient Only"),
]

# Running-offset field list for DATA -- name, struct-format-char, size.
_DATA_FIELDS = [
    ("time", "i", 4), ("radius", "I", 4), ("color_raw", None, 4), ("flags_raw", "I", 4),
    ("falloff_exponent", "f", 4), ("fov", "f", 4), ("near_clip", "f", 4),
    ("flicker_period", "f", 4), ("flicker_intensity_amplitude", "f", 4), ("flicker_movement_amplitude", "f", 4),
    ("constant", "f", 4), ("scalar", "f", 4), ("exponent", "f", 4),
    ("god_rays_near_clip", "f", 4), ("value", "I", 4), ("weight", "f", 4),
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


def parse_kwda(kwda: bytes) -> list[str]:
    return [f"0x{struct.unpack_from('<I', kwda, i * 4)[0]:08X}" for i in range(len(kwda) // 4)]


def parse_data(d: bytes) -> dict | None:
    if len(d) < 8:  # need at least Time+Radius to be worth reporting
        return None
    out: dict = {}
    off = 0
    for name, fmt, size in _DATA_FIELDS:
        if off + size > len(d):
            out[name] = None
            continue
        if name == "color_raw":
            out["color"] = {"r": d[off], "g": d[off + 1], "b": d[off + 2]}
        elif name == "flags_raw":
            v = struct.unpack_from("<I", d, off)[0]
            out["flags"] = _decode_flags_bitfield(v, LIGH_DATA_FLAGS)
        elif fmt == "f":
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
        else:
            out[name] = struct.unpack_from(f"<{fmt}", d, off)[0]
        off += size
    if "color" not in out:
        out["color"] = None
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


def _extract_one_ligh(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    icon: str | None = None
    mico: str | None = None
    keywords: list[str] = []
    data: dict | None = None
    fade_value: float | None = None
    gobo: str | None = None
    lens = god_rays = sound = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            if model_path is None:
                model_path = resolve_string(d)
        elif tag == "ICON":
            icon = resolve_string(d)
        elif tag == "MICO":
            mico = resolve_string(d)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "DATA":
            data = parse_data(d)
        elif tag == "FNAM" and len(d) >= 4:
            fade_value = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag == "NAM0":
            gobo = resolve_string(d)
        elif tag == "LNAM":
            lens = fid_hex(d)
        elif tag == "WGDR":
            god_rays = fid_hex(d)
        elif tag == "SNAM":
            sound = fid_hex(d)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "model_path": model_path,
        "icon": icon,
        "message_icon": mico,
        "header_flags": _decode_flags_bitfield(header_flags_raw, LIGH_HEADER_FLAGS),
        "keywords": keywords,
        "data": data,
        "fade_value": fade_value,
        "gobo": gobo,
        "lens": lens,
        "god_rays": god_rays,
        "sound": sound,
    }


def extract_lights(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"LIGH":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_ligh(dec, form_id, header_flags, string_lookup)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_lights: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for lights...")
        all_lights.extend(extract_lights(esm_path, string_lookup))

    carriable = [l for l in all_lights if l["data"] and "Can be Carried" in l["data"]["flags"]]
    flickering = [l for l in all_lights if l["data"] and "Flicker" in l["data"]["flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_lights": len(all_lights),
        "carriable": len(carriable),
        "flickering": len(flickering),
        "lights": all_lights,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Light scan complete in {elapsed:.1f}s ===")
    print(f"  Total lights: {len(all_lights):,}")
    print(f"  Carriable: {len(carriable):,}")
    print(f"  Flickering: {len(flickering):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
