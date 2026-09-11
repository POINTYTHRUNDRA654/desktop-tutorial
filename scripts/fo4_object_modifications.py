#!/usr/bin/env python3
"""
fo4_object_modifications.py — FO4 Object Modification (OMOD)
========================================================================
Thirty-fourth stop in the "grind it to zero" pass, tenth of the broader
engine-plumbing sweep, and one of the single highest modding-value gaps
identified in a full record-type re-survey: OMOD is the weapon/armor MOD
ATTACHMENT record — every receiver/barrel/magazine/sight/muzzle/grip
attachment in the whole weapon customization system, every armor lining/
plating/material swap, and every "Legendary" effect mod, is one of
these. This is the record type that makes "add a new weapon mod" or
"add a new armor mod" possible at all.

Source-verified (wbDefinitionsFO4.pas OMOD ~16063-16104, Properties
struct ~8416-8455, property enum tables ~8292-8414, deciders
~5101-5170):
  Record header Flags (u32, at header offset 8) — computed from bit
    INDEX per this project's standing rule (the source's inline hex
    comments for this record are stale/wrong): Legendary Mod is bit
    index 4 (mask 0x10, NOT the commented 0x08), Mod Collection is bit
    index 7 (mask 0x80, NOT the commented 0x40). Verified against real
    base-game data: every EDID containing "Legendary" sets exactly bit
    4 (74 records); bit 3 (the stale comment's mask) never appears on
    any real OMOD record (0 occurrences).
  EDID, FULL, DESC, MODL
  DATA — "Data" struct, byte-exact verified against all 2,409 real
    OMOD DATA subrecords in the base game (zero length mismatches):
      Include Count (u32), Property Count (u32), 2 unused bytes,
      Form Type (u32 FormID-signature value: ARMO/NPC_/WEAP/NONE —
      this is what selects which Property enum table applies below),
      2 unused bytes, Attach Point (Keyword FormID), Attach Parent
      Slots (a plain trailing array of Keyword FormIDs — confirmed via
      real-data arithmetic to consume all bytes between the fixed
      20-byte header and the two count-prefixed trailing arrays; the
      source's separate "Items" array is legacy/unused and was
      confirmed to be genuinely 0-length on every real record), then:
        Includes (Include Count × 7-byte structs: Mod FormID -> OMOD,
          Minimum Level u8, Optional bool u8, Don't Use All bool u8)
        Properties (Property Count × 24-byte structs): Value Type
          (u8 enum: Int/Float/Bool/Unknown3/FormID+Int/Enum/
          FormID+Float), 3 unused bytes, Function Type (u8, meaning
          depends on Value Type — decoded per the source's own decider
          logic: Int/Float/Unknown3 use SET/MUL+ADD/ADD, Bool uses
          SET/AND/OR, Enum uses SET-only, FormID variants use
          SET/REM/ADD), 3 unused bytes, Property (u16 — looked up
          against the Form Type-selected enum table: ARMO ->
          wbArmorPropertyEnum [Weight/Value/Rating/Keywords/
          ColorRemappingIndex/MaterialSwaps/etc.], WEAP ->
          wbWeaponPropertyEnum [Speed/Damage/Range/AimModel*/
          ZoomData*/etc., 95 entries], NPC_ -> wbActorPropertyEnum
          [Keywords/ForcedInventory/Enchantments/etc.]), 2 unused
          bytes, Value 1 (4-byte union, decoded per Value Type: Int/
          Float/Bool/FormID/Enum, with special-cased Sound Level/
          Stagger Value/Hit Behaviour sub-enums when Property is
          exactly those names), Value 2 (4-byte union: Int/Float/Bool/
          unused, decoded per Value Type), Step (float).
  MNAM (Target OMOD Keywords array), FNAM (Filter Keywords array),
  LNAM (Loose Mod FormID -> any base object), NAM1 (Priority, u8),
  FLTR (Filter string).
Not decoded (no modding value / legacy, consistent with the rest of
  this project): none of substance for this pass.

Outputs:
  <scan-cache>/fo4_object_modifications.json
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
GRAPH_OUT = _OUT_DIR / "fo4_object_modifications.json"

COMPRESSED_FLAG = 0x00040000

OMOD_HEADER_FLAGS = [(1 << 4, "Legendary Mod"), (1 << 7, "Mod Collection")]

FORM_TYPE = {
    struct.unpack("<I", b"ARMO")[0]: "Armor",
    struct.unpack("<I", b"NPC_")[0]: "Non-player character",
    struct.unpack("<I", b"WEAP")[0]: "Weapon",
    0: "None",
}

VALUE_TYPE = {0: "Int", 1: "Float", 2: "Bool", 3: "Unknown 3", 4: "FormID,Int", 5: "Enum", 6: "FormID,Float"}
FUNCTION_TYPE_FLOAT = ["SET", "MUL+ADD", "ADD"]
FUNCTION_TYPE_BOOL = ["SET", "AND", "OR"]
FUNCTION_TYPE_ENUM = ["SET"]
FUNCTION_TYPE_FORMID = ["SET", "REM", "ADD"]

SOUND_LEVEL_ENUM = ["Loud", "Normal", "Silent", "Very Loud", "Quiet"]
STAGGER_ENUM = ["None", "Small", "Medium", "Large", "Extra Large"]
HIT_BEHAVIOUR_ENUM = ["Normal formula behaviour", "Dismember only", "Explode only", "No dismember/explode"]

ARMOR_PROPERTY_ENUM = [
    "Enchantments", "BashImpactDataSet", "BlockMaterial", "Keywords", "Weight", "Value", "Rating",
    "AddonIndex", "BodyPart", "DamageTypeValue", "ActorValues", "Health", "ColorRemappingIndex", "MaterialSwaps",
]
ACTOR_PROPERTY_ENUM = ["Keywords", "ForcedInventory", "XPOffset", "Enchantments", "ColorRemappingIndex", "MaterialSwaps"]
WEAPON_PROPERTY_ENUM = [
    "Speed", "Reach", "MinRange", "MaxRange", "AttackDelaySec", "Unknown 5", "OutOfRangeDamageMult",
    "SecondaryDamage", "CriticalChargeBonus", "HitBehaviour", "Rank", "Unknown 11", "AmmoCapacity",
    "Unknown 13", "Unknown 14", "Type", "IsPlayerOnly", "NPCsUseAmmo", "HasChargingReload", "IsMinorCrime",
    "IsFixedRange", "HasEffectOnDeath", "HasAlternateRumble", "IsNonHostile", "IgnoreResist", "IsAutomatic",
    "CantDrop", "IsNonPlayable", "AttackDamage", "Value", "Weight", "Keywords", "AimModel",
    "AimModelMinConeDegrees", "AimModelMaxConeDegrees", "AimModelConeIncreasePerShot", "AimModelConeDecreasePerSec",
    "AimModelConeDecreaseDelayMs", "AimModelConeSneakMultiplier", "AimModelRecoilDiminishSpringForce",
    "AimModelRecoilDiminishSightsMult", "AimModelRecoilMaxDegPerShot", "AimModelRecoilMinDegPerShot",
    "AimModelRecoilHipMult", "AimModelRecoilShotsForRunaway", "AimModelRecoilArcDeg", "AimModelRecoilArcRotateDeg",
    "AimModelConeIronSightsMultiplier", "HasScope", "ZoomDataFOVMult", "FireSeconds", "NumProjectiles",
    "AttackSound", "AttackSound2D", "AttackLoop", "AttackFailSound", "IdleSound", "EquipSound", "UnEquipSound",
    "SoundLevel", "ImpactDataSet", "Ammo", "CritEffect", "BashImpactDataSet", "BlockMaterial", "Enchantments",
    "AimModelBaseStability", "ZoomData", "ZoomDataOverlay", "ZoomDataImageSpace", "ZoomDataCameraOffsetX",
    "ZoomDataCameraOffsetY", "ZoomDataCameraOffsetZ", "EquipSlot", "SoundLevelMult", "NPCAmmoList", "ReloadSpeed",
    "DamageTypeValues", "AccuracyBonus", "AttackActionPointCost", "OverrideProjectile", "HasBoltAction",
    "StaggerValue", "SightedTransitionSeconds", "FullPowerSeconds", "HoldInputToPower", "HasRepeatableSingleFire",
    "MinPowerPerShot", "ColorRemappingIndex", "MaterialSwaps", "CriticalDamageMult", "FastEquipSound",
    "DisableShells", "HasChargingAttack", "ActorValues",
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


def _property_enum_for(form_type_label: str) -> list[str] | None:
    if form_type_label == "Armor":
        return ARMOR_PROPERTY_ENUM
    if form_type_label == "Weapon":
        return WEAPON_PROPERTY_ENUM
    if form_type_label == "Non-player character":
        return ACTOR_PROPERTY_ENUM
    return None


def _parse_properties(d: bytes, prop_count: int, form_type_label: str) -> list[dict]:
    prop_enum = _property_enum_for(form_type_label)
    out = []
    stride = 24
    for i in range(prop_count):
        off = i * stride
        if off + stride > len(d):
            break
        value_type_raw = d[off]
        value_type = VALUE_TYPE.get(value_type_raw, f"Unknown ({value_type_raw})")
        function_type_raw = d[off + 4]
        if value_type_raw in (0, 1, 3):
            function_type = FUNCTION_TYPE_FLOAT[function_type_raw] if function_type_raw < len(FUNCTION_TYPE_FLOAT) else f"Unknown ({function_type_raw})"
        elif value_type_raw == 2:
            function_type = FUNCTION_TYPE_BOOL[function_type_raw] if function_type_raw < len(FUNCTION_TYPE_BOOL) else f"Unknown ({function_type_raw})"
        elif value_type_raw == 5:
            function_type = FUNCTION_TYPE_ENUM[function_type_raw] if function_type_raw < len(FUNCTION_TYPE_ENUM) else f"Unknown ({function_type_raw})"
        elif value_type_raw in (4, 6):
            function_type = FUNCTION_TYPE_FORMID[function_type_raw] if function_type_raw < len(FUNCTION_TYPE_FORMID) else f"Unknown ({function_type_raw})"
        else:
            function_type = f"Unknown ({function_type_raw})"

        property_id = struct.unpack_from("<H", d, off + 8)[0]
        if prop_enum is not None and property_id < len(prop_enum):
            property_name = prop_enum[property_id]
        else:
            property_name = f"Unknown ({property_id})"

        value1_raw = d[off + 12:off + 16]
        value2_raw = d[off + 16:off + 20]
        step = struct.unpack_from("<f", d, off + 20)[0]

        value1: object = None
        if value_type_raw == 0:
            value1 = struct.unpack_from("<i", value1_raw, 0)[0]
        elif value_type_raw == 1:
            value1 = round(struct.unpack_from("<f", value1_raw, 0)[0], 5)
        elif value_type_raw == 2:
            value1 = bool(struct.unpack_from("<I", value1_raw, 0)[0])
        elif value_type_raw in (4, 6):
            value1 = fid_hex(value1_raw)
        elif value_type_raw == 5:
            enum_int = struct.unpack_from("<I", value1_raw, 0)[0]
            if property_name == "SoundLevel":
                value1 = SOUND_LEVEL_ENUM[enum_int] if enum_int < len(SOUND_LEVEL_ENUM) else f"Unknown ({enum_int})"
            elif property_name == "StaggerValue":
                value1 = STAGGER_ENUM[enum_int] if enum_int < len(STAGGER_ENUM) else f"Unknown ({enum_int})"
            elif property_name == "HitBehaviour":
                value1 = HIT_BEHAVIOUR_ENUM[enum_int] if enum_int < len(HIT_BEHAVIOUR_ENUM) else f"Unknown ({enum_int})"
            else:
                value1 = enum_int
        else:
            value1 = value1_raw.hex()

        value2: object = None
        if value_type_raw == 0:
            value2 = struct.unpack_from("<i", value2_raw, 0)[0]
        elif value_type_raw == 1:
            value2 = round(struct.unpack_from("<f", value2_raw, 0)[0], 5)
        elif value_type_raw == 2:
            value2 = bool(struct.unpack_from("<I", value2_raw, 0)[0])
        elif value_type_raw in (4, 6):
            value2 = None  # unused for FormID variants per source decider

        out.append({
            "value_type": value_type,
            "function_type": function_type,
            "property": property_name,
            "value1": value1,
            "value2": value2,
            "step": round(step, 5),
        })
    return out


def _parse_includes(d: bytes, include_count: int) -> list[dict]:
    out = []
    stride = 7
    for i in range(include_count):
        off = i * stride
        if off + stride > len(d):
            break
        mod = fid_hex(d[off:off + 4])
        min_level = d[off + 4]
        optional = bool(d[off + 5])
        dont_use_all = bool(d[off + 6])
        if mod:
            out.append({"mod": mod, "minimum_level": min_level, "optional": optional, "dont_use_all": dont_use_all})
    return out


def _extract_one_omod(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    desc: str | None = None
    model_path: str | None = None
    form_type_label: str | None = None
    attach_point: str | None = None
    attach_parent_slots: list[str] = []
    includes: list[dict] = []
    properties: list[dict] = []
    target_omod_keywords: list[str] = []
    filter_keywords: list[str] = []
    loose_mod: str | None = None
    priority: int | None = None
    filter_str: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "DESC":
            desc = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "DATA" and len(d) >= 20:
            include_count = struct.unpack_from("<I", d, 0)[0]
            prop_count = struct.unpack_from("<I", d, 4)[0]
            form_type_raw = struct.unpack_from("<I", d, 10)[0]
            form_type_label = FORM_TYPE.get(form_type_raw, f"Unknown (0x{form_type_raw:08X})")
            attach_point = fid_hex(d[16:20])

            trailing = include_count * 7 + prop_count * 24
            middle_len = len(d) - 20 - trailing
            if middle_len >= 0 and middle_len % 4 == 0:
                mid = d[20:20 + middle_len]
                attach_parent_slots = [f"0x{struct.unpack_from('<I', mid, i * 4)[0]:08X}" for i in range(middle_len // 4)]
                inc_bytes = d[20 + middle_len:20 + middle_len + include_count * 7]
                prop_bytes = d[20 + middle_len + include_count * 7:]
                includes = _parse_includes(inc_bytes, include_count)
                properties = _parse_properties(prop_bytes, prop_count, form_type_label)
        elif tag == "MNAM":
            target_omod_keywords = parse_kwda(d)
        elif tag == "FNAM":
            filter_keywords = parse_kwda(d)
        elif tag == "LNAM":
            loose_mod = fid_hex(d)
        elif tag == "NAM1" and len(d) >= 1:
            priority = d[0]
        elif tag == "FLTR":
            filter_str = resolve_string(d)

    if not edid:
        return None

    return {
        "record_type": "OMOD", "form_id": f"0x{form_id:08X}", "edid": edid,
        "full_name": full, "description": desc, "model_path": model_path,
        "header_flags": _decode_flags_bitfield(header_flags_raw, OMOD_HEADER_FLAGS),
        "form_type": form_type_label, "attach_point": attach_point,
        "attach_parent_slots": attach_parent_slots, "includes": includes, "properties": properties,
        "target_omod_keywords": target_omod_keywords, "filter_keywords": filter_keywords,
        "loose_mod": loose_mod, "priority": priority, "filter": filter_str,
    }


def extract_omods(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"OMOD":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                r = _extract_one_omod(dec, form_id, header_flags, string_lookup)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_omod: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for object modifications...")
        all_omod.extend(extract_omods(esm_path, string_lookup))

    legendary = [o for o in all_omod if "Legendary Mod" in o["header_flags"]]
    weapon_mods = [o for o in all_omod if o["form_type"] == "Weapon"]
    armor_mods = [o for o in all_omod if o["form_type"] == "Armor"]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_omods": len(all_omod),
        "legendary_mods": len(legendary),
        "weapon_mods": len(weapon_mods),
        "armor_mods": len(armor_mods),
        "object_modifications": all_omod,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Object Modification scan complete in {elapsed:.1f}s ===")
    print(f"  Total OMODs: {len(all_omod):,}")
    print(f"  Legendary mods: {len(legendary):,}")
    print(f"  Weapon mods: {len(weapon_mods):,}")
    print(f"  Armor mods: {len(armor_mods):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
