#!/usr/bin/env python3
"""
fo4_magic_effects.py — FO4 Magic Effect (MGEF)
========================================================================
Twenty-fifth stop in the "grind it to zero" pass, first of the broader
~100+ engine-plumbing sweep (following the completed "referenced but
not deep" tier: STAT/MSTT, ACTI, DOOR, LIGH, FURN). MGEF is the
single most modding-relevant record type not yet deep-decoded in this
project: every chem, addiction, radiation tick, perk-passive bonus,
armor/weapon enchantment, and status ailment in FO4 is, underneath,
one or more Magic Effects. Other scanners (Form Graph, Actor & Combat
Stats) have only ever pointed at MGEF by FormID; this is the first
scanner to open the record itself.

Source-verified (wbDefinitionsFO4.pas ~13017-13132, Archetype enum
~12964-13015, Cast/Target enums ~7586-7599):
  EDID, FULL, KWDA
  DATA — the "Magic Effect Data" struct, parsed via running offset with
    graceful truncation (same technique as EXPL/PROJ/LIGH, since this
    is the largest struct in this whole project and legacy-FormVersion
    records are expected to be shorter): Flags (u32 bitfield: Hostile/
    Recover/Detrimental/Snap to Navmesh/No Hit Event/Dispel with
    Keywords/No Duration/No Magnitude/No Area/FX Persist/Gory Visuals/
    Hide in UI/No Recast/Power Affects Magnitude/Power Affects
    Duration/Painless/No Hit Effect/No Death Dispel), Base Cost (f32),
    Assoc. Item (FormID -- on-disk always a plain 4-byte FormID; the
    xEdit union only changes which record type it's validated against,
    not the byte layout, so decoded generically as a raw FormID here),
    Magic Skill (4 bytes, source marks unused -- skipped), Resist Value
    (FormID -> AVIF), Counter Effect count (u16) + 2 unused bytes,
    Casting Light (FormID -> LIGH), Taper Weight (f32), Hit Shader
    (FormID -> EFSH), Enchant Shader (FormID -> EFSH), Minimum Skill
    Level (u32), Spellmaking (Area u32 + Casting Time f32), Taper Curve
    (f32), Taper Duration (f32), Second AV Weight (f32), Archetype
    (u32 enum -- Value Modifier/Script/Dispel/Absorb/Calm/Demoralize/
    Frenzy/Paralysis/Stimpack/Damage/Immunity/Jetpack/Chameleon/etc,
    50 total), Primary Actor Value (FormID -> AVIF), Projectile
    (FormID -> PROJ), Explosion (FormID -> EXPL), Casting Type (u32
    enum: Constant Effect/Fire and Forget/Concentration/Scroll),
    Delivery (u32 enum: Self/Touch/Aimed/Target Actor/Target Location),
    Secondary Actor Value (FormID -> AVIF), Casting Art (FormID ->
    ARTO), Hit Effect Art (FormID -> ARTO), Impact Data (FormID ->
    IPDS), Skill Usage Multiplier (f32), Dual Casting (Art FormID ->
    DUAL + Scale f32), Enchant Art (FormID -> ARTO), 2x4-byte unknown,
    Equip Ability (FormID -> SPEL), Image Space Modifier (FormID ->
    IMAD), Perk to Apply (FormID -> PERK), Casting Sound Level (u32
    enum), Script Effect AI (Score f32 + Delay Time f32)
  ESCE — repeating Counter Effects FormID array (-> MGEF)
  SNDD — repeating Sounds struct (4 bytes: Type u32 enum [Sheathe/Draw,
    Charge, Ready, Release, Concentration Cast Loop, On Hit] + Sound
    FormID -> SNDR)
  DNAM (Magic Item Description, lstring)
  CTDAs (standard 32-byte Condition struct + optional CIS1/CIS2)
  Not decoded (no modding value / binary geometry, consistent with the
    rest of this project): VMAD, MDOB (Menu Display Object)

Outputs:
  <scan-cache>/fo4_magic_effects.json
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
GRAPH_OUT = _OUT_DIR / "fo4_magic_effects.json"

COMPRESSED_FLAG = 0x00040000

MGEF_DATA_FLAGS = [
    (0x00000001, "Hostile"), (0x00000002, "Recover"), (0x00000004, "Detrimental"),
    (0x00000008, "Snap to Navmesh"), (0x00000010, "No Hit Event"),
    (0x00000100, "Dispel with Keywords"), (0x00000200, "No Duration"),
    (0x00000400, "No Magnitude"), (0x00000800, "No Area"), (0x00001000, "FX Persist"),
    (0x00004000, "Gory Visuals"), (0x00008000, "Hide in UI"), (0x00020000, "No Recast"),
    (0x00200000, "Power Affects Magnitude"), (0x00400000, "Power Affects Duration"),
    (0x04000000, "Painless"), (0x08000000, "No Hit Effect"), (0x10000000, "No Death Dispel"),
]
MGEF_ARCHETYPE = {
    0: "Value Modifier", 1: "Script", 2: "Dispel", 3: "Cure Disease", 4: "Absorb",
    5: "Dual Value Modifier", 6: "Calm", 7: "Demoralize", 8: "Frenzy", 9: "Disarm",
    10: "Command Summoned", 11: "Invisibility", 12: "Light", 13: "Darkness", 14: "Nighteye",
    15: "Lock", 16: "Open", 17: "Bound Weapon", 18: "Summon Creature", 19: "Detect Life",
    20: "Telekinesis", 21: "Paralysis", 22: "Reanimate", 23: "Soul Trap", 24: "Turn Undead",
    25: "Guide", 26: "Unknown 26", 27: "Cure Paralysis", 28: "Cure Addiction", 29: "Cure Poison",
    30: "Concussion", 31: "Stimpack", 32: "Accumulate Magnitude", 33: "Stagger",
    34: "Peak Value Modifier", 35: "Cloak", 36: "Unknown 36", 37: "Slow Time", 38: "Rally",
    39: "Enhance Weapon", 40: "Spawn Hazard", 41: "Etherealize", 42: "Banish",
    43: "Spawn Scripted Ref", 44: "Disguise", 45: "Damage", 46: "Immunity",
    47: "Permanent Reanimate", 48: "Jetpack", 49: "Chameleon",
}
MGEF_CAST_TYPE = {0: "Constant Effect", 1: "Fire and Forget", 2: "Concentration", 3: "Scroll"}
MGEF_DELIVERY = {0: "Self", 1: "Touch", 2: "Aimed", 3: "Target Actor", 4: "Target Location"}
MGEF_SOUND_TYPE = {0: "Sheathe/Draw", 1: "Charge", 2: "Ready", 3: "Release", 4: "Concentration Cast Loop", 5: "On Hit"}

CTDA_COMPARE_OPS = ["==", "!=", ">", ">=", "<", "<="]

# Running-offset field list. kind: fid=FormID, u32/u16=int, f32=float,
# skip4=unused bytes, enum:<table>=looked-up int.
_DATA_FIELDS = [
    ("flags", "flags"), ("base_cost", "f32"), ("assoc_item", "fid"), (None, "skip4"),
    ("resist_value", "fid"), ("counter_effect_count", "u16"), (None, "skip2"),
    ("casting_light", "fid"), ("taper_weight", "f32"), ("hit_shader", "fid"),
    ("enchant_shader", "fid"), ("minimum_skill_level", "u32"), ("spellmaking_area", "u32"),
    ("spellmaking_casting_time", "f32"), ("taper_curve", "f32"), ("taper_duration", "f32"),
    ("second_av_weight", "f32"), ("archetype", "archetype"), ("primary_actor_value", "fid"),
    ("projectile", "fid"), ("explosion", "fid"), ("casting_type", "cast_type"),
    ("delivery", "delivery"), ("secondary_actor_value", "fid"), ("casting_art", "fid"),
    ("hit_effect_art", "fid"), ("impact_data", "fid"), ("skill_usage_multiplier", "f32"),
    ("dual_casting_art", "fid"), ("dual_casting_scale", "f32"), ("enchant_art", "fid"),
    (None, "skip4"), (None, "skip4"), ("equip_ability", "fid"), ("image_space_modifier", "fid"),
    ("perk_to_apply", "fid"), ("casting_sound_level", "u32"), ("script_effect_ai_score", "f32"),
    ("script_effect_ai_delay_time", "f32"),
]
_FIELD_SIZE = {
    "flags": 4, "f32": 4, "fid": 4, "skip4": 4, "skip2": 2, "u16": 2, "u32": 4,
    "archetype": 4, "cast_type": 4, "delivery": 4,
}


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
    if len(d) < 8:  # need at least Flags+Base Cost to be worth reporting
        return None
    out: dict = {}
    off = 0
    for name, kind in _DATA_FIELDS:
        size = _FIELD_SIZE[kind]
        if off + size > len(d):
            if name:
                out[name] = None
            off += size
            continue
        if kind == "flags":
            v = struct.unpack_from("<I", d, off)[0]
            out["flags"] = _decode_flags_bitfield(v, MGEF_DATA_FLAGS)
        elif kind == "f32":
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
        elif kind == "fid":
            out[name] = fid_hex(d[off:off + 4])
        elif kind == "u16":
            out[name] = struct.unpack_from("<H", d, off)[0]
        elif kind == "u32":
            out[name] = struct.unpack_from("<I", d, off)[0]
        elif kind == "archetype":
            v = struct.unpack_from("<I", d, off)[0]
            out["archetype"] = MGEF_ARCHETYPE.get(v, f"Unknown ({v})")
        elif kind == "cast_type":
            v = struct.unpack_from("<I", d, off)[0]
            out["casting_type"] = MGEF_CAST_TYPE.get(v, f"Unknown ({v})")
        elif kind == "delivery":
            v = struct.unpack_from("<I", d, off)[0]
            out["delivery"] = MGEF_DELIVERY.get(v, f"Unknown ({v})")
        # skip4/skip2: nothing to store
        off += size
    if "flags" not in out:
        out["flags"] = []
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


def _extract_one_mgef(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    keywords: list[str] = []
    data: dict | None = None
    counter_effects: list[str] = []
    sounds: list[dict] = []
    description: str | None = None
    conditions: list[dict] = []
    last_ctda: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "DATA":
            data = parse_data(d)
        elif tag == "ESCE":
            fid = fid_hex(d)
            if fid:
                counter_effects.append(fid)
        elif tag == "SNDD" and len(d) >= 8:
            for i in range(len(d) // 8):
                type_raw = struct.unpack_from("<I", d, i * 8)[0]
                sound_fid = fid_hex(d[i * 8 + 4:i * 8 + 8])
                sounds.append({"type": MGEF_SOUND_TYPE.get(type_raw, f"Unknown ({type_raw})"), "sound": sound_fid})
        elif tag == "DNAM":
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

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "keywords": keywords,
        "data": data,
        "counter_effects": counter_effects,
        "sounds": sounds,
        "description": description,
        "conditions": conditions,
    }


def extract_magic_effects(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"MGEF":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_mgef(dec, form_id, string_lookup)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_mgef: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for magic effects...")
        all_mgef.extend(extract_magic_effects(esm_path, string_lookup))

    by_archetype: dict[str, int] = {}
    for m in all_mgef:
        if m["data"]:
            arch = m["data"].get("archetype") or "Unknown"
            by_archetype[arch] = by_archetype.get(arch, 0) + 1
    hostile = [m for m in all_mgef if m["data"] and "Hostile" in m["data"]["flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_magic_effects": len(all_mgef),
        "by_archetype": by_archetype,
        "hostile": len(hostile),
        "magic_effects": all_mgef,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Magic effect scan complete in {elapsed:.1f}s ===")
    print(f"  Total magic effects: {len(all_mgef):,}")
    print(f"  Hostile: {len(hostile):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
