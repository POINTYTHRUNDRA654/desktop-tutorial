#!/usr/bin/env python3
"""
fo4_actor_and_combat_stats.py — FO4 NPC / Weapon / Armor Combat Stats
=======================================================================
The last confirmed real gaps from the year-long effort to give Mossy every
drop of combat-relevant information: NPC_ actor configuration + factions +
perks + key references, WEAP damage/handling stats, and ARMO rating/weight/
resistances.

Every struct decoded here was extracted field-by-field, with byte offsets
computed by hand, from the authoritative xEdit/FO4Edit Pascal source
(TES5Edit/xedit-backup, wbDefinitionsFO4.pas) — NOT from memory, NOT from
web-summarized docs (one of which, fo4docs.org, was caught this same
session confidently claiming NPC_'s DNAM holds SPECIAL/skill stats, which
is flatly false — FO4 does not store SPECIAL or skills per-NPC at all).
Nothing here is guessed.

NPC_ (source line ~13190-13360):
  ACBS  "Configuration" struct, always exactly 20 bytes:
    Flags:u32@0 (bitfield: Female/Essential/AutoCalcStats/Unique/
                 Protected/Summonable/Doesn'tBleed/OppositeGenderAnims/
                 SimpleActor/NoActivationHellos/IsGhost/Invulnerable/etc)
    XP Value Offset:i16@4
    Level (or Level Mult /1000 if PC-Level-Mult flag set):i16@6
    Calc min level:u16@8
    Calc max level:u16@10
    Disposition Base:i16@12
    Use Template Actors:u16@14 (bitfield: Traits/Stats/Factions/SpellList/
                 AIData/AIPackages/Model-Anim/BaseData/Inventory/Script/
                 DefPackList/AttackData/Keywords)
    Bleedout Override:u16@16
    Unknown:u16@18
  SNAM  Faction: formid:u32@0 + rank:i8@4 = 5 bytes, repeatable
  PRKR  Perk:    formid:u32@0 + rank:u8@4 = 5 bytes, repeatable
  RNAM  Race formid (plain 4-byte FormID subrecord)
  CNAM  Class formid
  DOFT  Default Outfit formid
  VTCK  Voice Type formid
  TPLT  Default Template formid (NPC_ or LVLN)

WEAP (source line ~15334, DNAM struct, 132 bytes) — the subset that's
actually useful for modding (full struct decoded, all offsets computed):
    Ammo formid:u32@0, Speed:f32@4, Reload Speed:f32@8, Reach:f32@12,
    Min Range:f32@16, Max Range:f32@20, Attack Delay:f32@24, Unknown:4@28,
    Damage-OutOfRange Mult:f32@32, On Hit:u32@36, Skill formid:u32@40,
    Resist formid:u32@44, Flags:u32@48 (bit15=Automatic, bit22=BoltAction,
    bit23=SecondaryWeapon), Capacity:u16@52, Animation Type:u8@54,
    Damage-Secondary:f32@55, Weight:f32@59, Value:u32@63,
    Damage-Base:u16@67, Sound Level:u32@69, [8 sound formids skipped]@73,
    Accuracy Bonus:u8@105, Anim Attack Seconds:f32@106, Unknown:2@110,
    Action Point Cost:f32@112, Full Power Seconds:f32@116,
    Min Power Per Shot:f32@120, Stagger:u32@124, Unknown:4@128
  Also: CRDT "Critical Data" struct (FO4's layout differs entirely from
        Skyrim's — verified from source after an initial wrong assumption
        caught during this same pass) = Crit Damage Mult:f32@0,
        Crit Charge Bonus:f32@4, Crit Effect formid:u32@8 = 12 bytes.

ARMO (source line ~8688):
  DATA struct = Value:i32@0, Weight:f32@4, Health:u32@8 = 12 bytes
  FNAM struct = Armor Rating:u16@0, Base Addon Index:u16@2,
                Stagger Rating:u8@4, Unknown:u8@5 = 6 bytes
                (NOT DNAM — that belongs to the separate ARMA record;
                 verified by reading ARMO's full record definition
                 start-to-finish, a mistake caught mid-session)
  DAMA array   = {DamageType formid:u32, Value:u32} x N, 8 bytes/entry

Outputs:
  <scan-cache>/fo4_actor_and_combat_stats.json
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
GRAPH_OUT = _OUT_DIR / "fo4_actor_and_combat_stats.json"

COMPRESSED_FLAG = 0x00040000

ACBS_FLAGS = [
    (0x00000001, "Female"), (0x00000002, "Essential"),
    (0x00000004, "Is CharGen Face Preset"), (0x00000008, "Respawn"),
    (0x00000010, "Auto-calc stats"), (0x00000020, "Unique"),
    (0x00000040, "Doesn't affect stealth meter"), (0x00000080, "PC Level Mult"),
    (0x00000200, "Calc For Each Template"), (0x00000800, "Protected"),
    (0x00004000, "Summonable"), (0x00010000, "Doesn't bleed"),
    (0x00040000, "Bleedout Override"), (0x00080000, "Opposite Gender Anims"),
    (0x00100000, "Simple Actor"), (0x00800000, "No Activation/Hellos"),
    (0x01000000, "Diffuse Alpha Test"), (0x20000000, "Is Ghost"),
    (0x80000000, "Invulnerable"),
]
USE_TEMPLATE_FLAGS = [
    (0x0001, "Traits"), (0x0002, "Stats"), (0x0004, "Factions"),
    (0x0008, "Spell List"), (0x0010, "AI Data"), (0x0020, "AI Packages"),
    (0x0040, "Model/Animation"), (0x0080, "Base Data"), (0x0100, "Inventory"),
    (0x0200, "Script"), (0x0400, "Def Pack List"), (0x0800, "Attack Data"),
    (0x1000, "Keywords"),
]
WEAP_FLAGS = [
    (1 << 15, "Automatic"), (1 << 22, "Bolt Action"), (1 << 23, "Secondary Weapon"),
]
ANIM_TYPES = {
    0: "HandToHandMelee", 1: "OneHandSword", 2: "OneHandDagger", 3: "OneHandAxe",
    4: "OneHandMace", 5: "TwoHandSword", 6: "TwoHandAxe", 7: "Bow", 8: "Staff",
    9: "Gun", 10: "Grenade", 11: "Mine", 12: "TwoHandGrip",
}


def _decode_flags(value: int, table: list[tuple[int, str]]) -> list[str]:
    return [name for bit, name in table if value & bit]


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


def resolve_edid(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("ascii", errors="replace").strip()
        return text if text else None
    except Exception:
        return None


def _fid(sub: bytes) -> str | None:
    if len(sub) != 4:
        return None
    v = struct.unpack_from("<I", sub, 0)[0]
    return f"0x{v:08X}" if v else None


def parse_acbs(d: bytes) -> dict | None:
    if len(d) != 20:
        return None
    flags = struct.unpack_from("<I", d, 0)[0]
    xp_off, level_raw, calc_min, calc_max, disp_base, use_tpl, bleedout, _unk = \
        struct.unpack_from("<hhHHhHHH", d, 4)
    is_pc_level_mult = bool(flags & 0x00000080)
    level = round(level_raw / 1000.0, 3) if is_pc_level_mult else level_raw
    return {
        "flags": _decode_flags(flags, ACBS_FLAGS),
        "xp_value_offset": xp_off,
        "level": level,
        "level_is_mult": is_pc_level_mult,
        "calc_min_level": calc_min,
        "calc_max_level": calc_max,
        "disposition_base": disp_base,
        "use_template_actors": _decode_flags(use_tpl, USE_TEMPLATE_FLAGS),
        "bleedout_override": bleedout,
    }


def extract_npcs(esm_path: Path) -> list[dict]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    out: list[dict] = []
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
        if rec_type == b"NPC_":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                edid = None; acbs = None
                factions: list[dict] = []
                perks: list[dict] = []
                race = cls = outfit = voice = template = None
                for t, d in scan_subs_ordered(dec):
                    if t == b"EDID": edid = resolve_edid(d)
                    elif t == b"ACBS": acbs = parse_acbs(d)
                    elif t == b"SNAM" and len(d) == 5:
                        fid = struct.unpack_from("<I", d, 0)[0]
                        rank = struct.unpack_from("<b", d, 4)[0]
                        factions.append({"faction": f"0x{fid:08X}", "rank": rank})
                    elif t == b"PRKR" and len(d) == 5:
                        fid = struct.unpack_from("<I", d, 0)[0]
                        rank = d[4]
                        perks.append({"perk": f"0x{fid:08X}", "rank": rank})
                    elif t == b"RNAM": race = _fid(d)
                    elif t == b"CNAM": cls = _fid(d)
                    elif t == b"DOFT": outfit = _fid(d)
                    elif t == b"VTCK": voice = _fid(d)
                    elif t == b"TPLT": template = _fid(d)
                if edid or acbs or factions or perks:
                    out.append({
                        "form_id": f"0x{form_id:08X}", "edid": edid,
                        "acbs": acbs, "factions": factions, "perks": perks,
                        "race": race, "class": cls, "default_outfit": outfit,
                        "voice": voice, "default_template": template,
                    })
        pos += data_size
    return out


def parse_weap_dnam(d: bytes) -> dict | None:
    if len(d) < 104:
        return None
    try:
        ammo        = struct.unpack_from("<I", d, 0)[0]
        speed       = round(struct.unpack_from("<f", d, 4)[0], 4)
        reload_spd  = round(struct.unpack_from("<f", d, 8)[0], 4)
        reach       = round(struct.unpack_from("<f", d, 12)[0], 4)
        min_range   = round(struct.unpack_from("<f", d, 16)[0], 2)
        max_range   = round(struct.unpack_from("<f", d, 20)[0], 2)
        atk_delay   = round(struct.unpack_from("<f", d, 24)[0], 4)
        dmg_oor_mul = round(struct.unpack_from("<f", d, 32)[0], 4)
        skill       = struct.unpack_from("<I", d, 40)[0]
        resist      = struct.unpack_from("<I", d, 44)[0]
        wflags      = struct.unpack_from("<I", d, 48)[0]
        capacity    = struct.unpack_from("<H", d, 52)[0]
        anim_type   = d[54]
        dmg_secondary = round(struct.unpack_from("<f", d, 55)[0], 3)
        weight      = round(struct.unpack_from("<f", d, 59)[0], 3)
        value       = struct.unpack_from("<I", d, 63)[0]
        dmg_base    = struct.unpack_from("<H", d, 67)[0]
        result = {
            "ammo": f"0x{ammo:08X}" if ammo else None,
            "speed": speed, "reload_speed": reload_spd, "reach": reach,
            "min_range": min_range, "max_range": max_range,
            "attack_delay": atk_delay, "damage_out_of_range_mult": dmg_oor_mul,
            "skill": f"0x{skill:08X}" if skill else None,
            "resist": f"0x{resist:08X}" if resist else None,
            "flags": _decode_flags(wflags, WEAP_FLAGS),
            "capacity": capacity,
            "animation_type": ANIM_TYPES.get(anim_type, f"unknown_{anim_type}"),
            "damage_secondary": dmg_secondary, "weight": weight, "value": value,
            "damage_base": dmg_base,
        }
        if len(d) >= 132:
            result["accuracy_bonus"] = d[105]
            result["action_point_cost"] = round(struct.unpack_from("<f", d, 112)[0], 3)
        return result
    except struct.error:
        return None


def parse_crdt(d: bytes) -> dict | None:
    if len(d) < 12:
        return None
    try:
        crit_dmg_mult  = round(struct.unpack_from("<f", d, 0)[0], 4)
        crit_charge    = round(struct.unpack_from("<f", d, 4)[0], 4)
        crit_effect    = struct.unpack_from("<I", d, 8)[0]
        return {"crit_damage_mult": crit_dmg_mult, "crit_charge_bonus": crit_charge,
                "crit_effect": f"0x{crit_effect:08X}" if crit_effect else None}
    except struct.error:
        return None


def extract_weapons(esm_path: Path) -> list[dict]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    out: list[dict] = []
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
        if rec_type == b"WEAP":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                edid = None; dnam = None; crdt = None
                for t, d in scan_subs_ordered(dec):
                    if t == b"EDID": edid = resolve_edid(d)
                    elif t == b"DNAM": dnam = parse_weap_dnam(d)
                    elif t == b"CRDT": crdt = parse_crdt(d)
                if edid and (dnam or crdt):
                    out.append({"form_id": f"0x{form_id:08X}", "edid": edid,
                                "stats": dnam, "critical": crdt})
        pos += data_size
    return out


def extract_armors(esm_path: Path) -> list[dict]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    out: list[dict] = []
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
        if rec_type == b"ARMO":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                edid = None
                value = weight = health = None
                rating = base_addon_idx = stagger = None
                resistances: list[dict] = []
                for t, d in scan_subs_ordered(dec):
                    if t == b"EDID": edid = resolve_edid(d)
                    elif t == b"DATA" and len(d) == 12:
                        value  = struct.unpack_from("<i", d, 0)[0]
                        weight = round(struct.unpack_from("<f", d, 4)[0], 3)
                        health = struct.unpack_from("<I", d, 8)[0]
                    elif t == b"FNAM" and len(d) >= 5:
                        rating = struct.unpack_from("<H", d, 0)[0]
                        base_addon_idx = struct.unpack_from("<H", d, 2)[0]
                        stagger = d[4]
                    elif t == b"DAMA" and len(d) % 8 == 0 and len(d) > 0:
                        for i in range(0, len(d), 8):
                            dtype = struct.unpack_from("<I", d, i)[0]
                            dval  = struct.unpack_from("<I", d, i + 4)[0]
                            resistances.append({"damage_type": f"0x{dtype:08X}", "value": dval})
                if edid and (value is not None or rating is not None):
                    out.append({
                        "form_id": f"0x{form_id:08X}", "edid": edid,
                        "value": value, "weight": weight, "health": health,
                        "armor_rating": rating,
                        "base_addon_index": base_addon_idx,
                        "stagger_rating": stagger,
                        "resistances": resistances,
                    })
        pos += data_size
    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]

    all_npcs: list[dict] = []
    all_weap: list[dict] = []
    all_armo: list[dict] = []

    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for NPC/WEAP/ARMO stats...")
        all_npcs.extend(extract_npcs(esm_path))
        all_weap.extend(extract_weapons(esm_path))
        all_armo.extend(extract_armors(esm_path))

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_npcs": len(all_npcs),
        "total_weapons": len(all_weap),
        "total_armors": len(all_armo),
        "npcs": all_npcs,
        "weapons": all_weap,
        "armors": all_armo,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Actor/combat stats scan complete in {elapsed:.1f}s ===")
    print(f"  NPCs with ACBS/factions/perks: {len(all_npcs):,}")
    print(f"  Weapons with DNAM/CRDT stats:  {len(all_weap):,}")
    print(f"  Armors with rating/weight:     {len(all_armo):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
