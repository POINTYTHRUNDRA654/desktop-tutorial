#!/usr/bin/env python3
"""
fo4_asset_graph.py — Fallout 4 Asset & Modification Reference Builder
======================================================================
Extracts the physical file references and mod relationships that the form
graph doesn't cover:

  MODL paths (.nif mesh files) from ARMO, ARMA, WEAP, STAT, OMOD, MISC
  ARMA armor addons (male + female model paths) grouped by parent ARMO
  OMOD filter keywords  → what armor/weapon can receive this mod
  OMOD parent item      → primary base item the mod attaches to
  OMOD × COBJ recipes   → what recipe produces each mod + ingredients
  Keyword → OMOD index  → "find all paints for Combat Armor"

Output:
  H:\\Mossy Memory\\fo4_asset_graph.json  — asset + mod reference graph
  H:\\Mossy Memory\\knowledge-vault.json  — 4 new vault entries
"""

import json, os, struct, sys, time, zlib, random, string as _string
from pathlib import Path
from collections import defaultdict

# Both overridable by the Electron app via env vars (it resolves the real
# install location dynamically); hardcoded values are only the fallback for
# manual/terminal use.
FO4_DATA     = Path(os.environ.get("MOSSY_FO4_DATA") or r"E:\Steam\steamapps\common\Fallout 4\Data")
MAIN_ESM     = FO4_DATA / "Fallout4.esm"
DLC_MAINS    = [
    FO4_DATA / "DLCRobot.esm",
    FO4_DATA / "DLCCoast.esm",
    FO4_DATA / "DLCNukaWorld.esm",
    FO4_DATA / "DLCworkshop01.esm",
    FO4_DATA / "DLCworkshop02.esm",
    FO4_DATA / "DLCworkshop03.esm",
]
_OUT_DIR     = Path(os.environ.get("MOSSY_SCAN_OUTPUT_DIR") or r"H:\Mossy Memory")
STRINGS_JSON = _OUT_DIR / "fo4_world_strings.json"
GRAPH_JSON   = _OUT_DIR / "fo4_form_graph.json"
ASSET_OUT    = _OUT_DIR / "fo4_asset_graph.json"
VAULT_PATH   = _OUT_DIR / "knowledge-vault.json"

COMPRESSED_FLAG = 0x00040000

# Record types we want asset/mod data from
ASSET_TYPES = {b"ARMO", b"ARMA", b"WEAP", b"STAT", b"MSTT", b"OMOD", b"MISC", b"AMMO", b"ALCH"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _decomp(data: bytes, flags: int) -> bytes | None:
    if flags & COMPRESSED_FLAG:
        if len(data) < 4:
            return None
        try:
            return zlib.decompress(data[4:])
        except Exception:
            return None
    return data


def _scan_subs(rec: bytes) -> list[tuple[bytes, bytes]]:
    out, pos = [], 0
    while pos + 6 <= len(rec):
        t = rec[pos:pos+4]
        n = struct.unpack_from("<H", rec, pos+4)[0]
        pos += 6
        if pos + n > len(rec):
            break
        out.append((t, rec[pos:pos+n]))
        pos += n
    return out


def _modl_path(sub_data: bytes) -> str | None:
    null = sub_data.find(b"\x00")
    raw  = sub_data[:null] if null >= 0 else sub_data
    try:
        p = raw.decode("ascii", errors="replace").strip()
        return p if p else None
    except Exception:
        return None


def _edid(subs_dict: dict[bytes, bytes]) -> str | None:
    if b"EDID" not in subs_dict:
        return None
    d    = subs_dict[b"EDID"]
    null = d.find(b"\x00")
    raw  = d[:null] if null >= 0 else d
    try:
        return raw.decode("ascii", errors="replace").strip() or None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# OMOD DATA preamble parser
# Extracts:
#   property_count  — number of property changes this mod makes
#   attach_point    — the Keyword FormID for the slot this mod occupies
#   parent_rectype  — "WEAP", "ARMO", or "NPC_" (which item Form Type this
#                      mod's Property IDs should be interpreted against —
#                      see the note on _parse_omod_properties below)
#
# CORRECTED (verified against wbDefinitionsFO4.pas — the field this scanner
# was calling "parent_formid" was a heuristic ASCII-scan guess with no
# real backing struct field; OMOD's DATA struct has no single "parent item
# FormID" at all. The real, named, directly-locatable fields are:
#   Include Count:u32@0, Property Count:u32@4, Unused:2@8,
#   Form Type:u32@10 (stores the target record's own 4-byte ASCII
#     signature, e.g. "WEAP"/"ARMO"/"NPC_"/"NONE" — readable directly,
#     no scanning needed), Unused:2@14, Attach Point (Keyword formid):
#     u32@16, then variable-length arrays (Attach Parent Slots, legacy
#     Items, Includes) whose combined size isn't independently computable
#     from this struct alone — but that's fine, because Properties is the
#     LAST field, so its start is found by counting backward from the end
#     of the subrecord using property_count, which is exactly what this
#     scanner already did and remains correct.
# ---------------------------------------------------------------------------

def _parse_omod_preamble(d: bytes) -> dict:
    result = {"property_count": 0, "attach_point": None, "parent_rectype": None}
    if len(d) < 14:
        return result

    try:
        property_count = struct.unpack_from("<I", d, 4)[0]
        result["property_count"] = property_count if property_count < 200 else 0
        form_type_raw = d[10:14]
        rectype = form_type_raw.decode("ascii", errors="replace")
        if rectype in ("ARMO", "WEAP", "NPC_"):
            result["parent_rectype"] = rectype
        if len(d) >= 20:
            attach_fid = struct.unpack_from("<I", d, 16)[0]
            if attach_fid:
                result["attach_point"] = f"0x{attach_fid:08X}"
    except struct.error:
        pass

    return result


# ---------------------------------------------------------------------------
# OMOD property entry parser (24-byte entries)
#
# CORRECTED (verified against wbDefinitionsFO4.pas's wbObjectModProperties):
# every field width in this struct was wrong in the previous version — it
# assumed four packed uint32s before Value, when the real struct is
# Value Type:u8@0, Unused:3@1, Function Type:u8@4, Unused:3@5,
# Property:u16@8, Unused:2@10, Value 1:4@12, Value 2:4@16, Step:f32@20.
# Property@8 and Value1@12 happened to read correctly before by luck
# (their extra "unused" padding bytes are usually zero, so a wider u32
# read coincidentally matched), but Step was being read from Value 2's
# bytes (offset 16) instead of its real offset (20), and there was no
# "flags" field at offset 20 as previously assumed — that's Step.
#
# The Property ID table is ALSO corrected: xEdit resolves it via three
# entirely separate enums depending on which record type the OMOD
# targets (ARMO/WEAP/NPC_, from Form Type) — the previous single flat
# 0-80 table was neither of the three real tables and was wrong for
# virtually every property on virtually every mod.
# ---------------------------------------------------------------------------

OMOD_PROP_NAMES_ARMO = {
    0: "Enchantments", 1: "BashImpactDataSet", 2: "BlockMaterial", 3: "Keywords",
    4: "Weight", 5: "Value", 6: "Rating", 7: "AddonIndex", 8: "BodyPart",
    9: "DamageTypeValue", 10: "ActorValues", 11: "Health",
    12: "ColorRemappingIndex", 13: "MaterialSwaps",
}
OMOD_PROP_NAMES_NPC = {
    0: "Keywords", 1: "ForcedInventory", 2: "XPOffset", 3: "Enchantments",
    4: "ColorRemappingIndex", 5: "MaterialSwaps",
}
OMOD_PROP_NAMES_WEAP = {
    0: "Speed", 1: "Reach", 2: "MinRange", 3: "MaxRange", 4: "AttackDelaySec",
    6: "OutOfRangeDamageMult", 7: "SecondaryDamage", 8: "CriticalChargeBonus",
    9: "HitBehaviour", 10: "Rank", 12: "AmmoCapacity", 15: "Type",
    16: "IsPlayerOnly", 17: "NPCsUseAmmo", 18: "HasChargingReload",
    19: "IsMinorCrime", 20: "IsFixedRange", 21: "HasEffectOnDeath",
    22: "HasAlternateRumble", 23: "IsNonHostile", 24: "IgnoreResist",
    25: "IsAutomatic", 26: "CantDrop", 27: "IsNonPlayable", 28: "AttackDamage",
    29: "Value", 30: "Weight", 31: "Keywords", 32: "AimModel",
    33: "AimModelMinConeDegrees", 34: "AimModelMaxConeDegrees",
    35: "AimModelConeIncreasePerShot", 36: "AimModelConeDecreasePerSec",
    37: "AimModelConeDecreaseDelayMs", 38: "AimModelConeSneakMultiplier",
    39: "AimModelRecoilDiminishSpringForce", 40: "AimModelRecoilDiminishSightsMult",
    41: "AimModelRecoilMaxDegPerShot", 42: "AimModelRecoilMinDegPerShot",
    43: "AimModelRecoilHipMult", 44: "AimModelRecoilShotsForRunaway",
    45: "AimModelRecoilArcDeg", 46: "AimModelRecoilArcRotateDeg",
    47: "AimModelConeIronSightsMultiplier", 48: "HasScope", 49: "ZoomDataFOVMult",
    50: "FireSeconds", 51: "NumProjectiles", 52: "AttackSound",
    53: "AttackSound2D", 54: "AttackLoop", 55: "AttackFailSound",
    56: "IdleSound", 57: "EquipSound", 58: "UnEquipSound", 59: "SoundLevel",
    61: "Ammo", 62: "CritEffect", 63: "BashImpactDataSet", 64: "BlockMaterial",
    65: "Enchantments", 66: "AimModelBaseStability", 67: "ZoomData",
    68: "ZoomDataOverlay", 69: "ZoomDataImageSpace", 70: "ZoomDataCameraOffsetX",
    71: "ZoomDataCameraOffsetY", 72: "ZoomDataCameraOffsetZ", 73: "EquipSlot",
    74: "SoundLevelMult", 75: "NPCAmmoList", 76: "ReloadSpeed",
    77: "DamageTypeValues", 78: "AccuracyBonus", 79: "AttackActionPointCost",
    80: "OverrideProjectile", 81: "HasBoltAction", 82: "StaggerValue",
    83: "SightedTransitionSeconds", 84: "FullPowerSeconds",
    85: "HoldInputToPower", 86: "HasRepeatableSingleFire", 87: "MinPowerPerShot",
    88: "ColorRemappingIndex", 89: "MaterialSwaps", 90: "CriticalDamageMult",
    91: "FastEquipSound", 92: "DisableShells", 93: "HasChargingAttack",
    94: "ActorValues",
}
OMOD_PROP_TABLES = {"ARMO": OMOD_PROP_NAMES_ARMO, "NPC_": OMOD_PROP_NAMES_NPC, "WEAP": OMOD_PROP_NAMES_WEAP}

VALUE_TYPE_NAMES = {0: "Int", 1: "Float", 2: "Bool", 4: "FormID,Int", 5: "Enum", 6: "FormID,Float"}
# Function Type's own meaning depends on Value Type (verified from source):
# Float→SET/MUL+ADD/ADD, Bool→SET/AND/OR, Enum→SET, FormID→SET/REM/ADD.
FUNC_TYPE_NAMES_FLOAT  = {0: "SET", 1: "MUL+ADD", 2: "ADD"}
FUNC_TYPE_NAMES_BOOL   = {0: "SET", 1: "AND", 2: "OR"}
FUNC_TYPE_NAMES_FORMID = {0: "SET", 1: "REM", 2: "ADD"}


def _parse_omod_properties(d: bytes, property_count: int, parent_rectype: str | None) -> list[dict]:
    """Parse property entries from OMOD DATA. Each entry is 24 bytes; the
    Properties array is always the LAST field in the struct, so its start
    is found by counting back from the end of the subrecord using
    property_count — sound regardless of the variable-length arrays that
    precede it (Attach Parent Slots / legacy Items / Includes)."""
    ENTRY_SIZE = 24
    props: list[dict] = []
    prop_start = len(d) - property_count * ENTRY_SIZE
    if prop_start < 8:
        return []

    prop_names = OMOD_PROP_TABLES.get(parent_rectype or "", {})

    for i in range(property_count):
        base = prop_start + i * ENTRY_SIZE
        if base + ENTRY_SIZE > len(d):
            break
        try:
            vtype   = d[base]
            ftype   = d[base + 4]
            prop_id = struct.unpack_from("<H", d, base + 8)[0]

            val1_raw = d[base + 12:base + 16]
            val_f    = round(struct.unpack_from("<f", val1_raw)[0], 4)
            val_i    = struct.unpack_from("<i", val1_raw)[0]
            val_u    = struct.unpack_from("<I", val1_raw)[0]
            step     = round(struct.unpack_from("<f", d, base + 20)[0], 4)

            prop_name = prop_names.get(prop_id, f"Property_{prop_id}")
            vtype_name = VALUE_TYPE_NAMES.get(vtype, f"vtype_{vtype}")

            if vtype in (4, 6):         # FormID,Int or FormID,Float
                value = f"FormID:0x{val_u:08X}" if val_u else None
                func_name = FUNC_TYPE_NAMES_FORMID.get(ftype, f"fn{ftype}")
            elif vtype == 1:            # Float
                value = val_f
                func_name = FUNC_TYPE_NAMES_FLOAT.get(ftype, f"fn{ftype}")
            elif vtype == 2:            # Bool
                value = bool(val_i)
                func_name = FUNC_TYPE_NAMES_BOOL.get(ftype, f"fn{ftype}")
            elif vtype == 0:            # Int
                value = val_i
                func_name = f"fn{ftype}"
            else:
                value = val_f
                func_name = f"fn{ftype}"

            props.append({
                "property":    prop_name,
                "property_id": prop_id,
                "value_type":  vtype_name,
                "function":    func_name,
                "value":       value,
                "step":        step if step else None,
            })
        except (struct.error, IndexError):
            break

    return props


# ---------------------------------------------------------------------------
# Main ESM walker
# ---------------------------------------------------------------------------

def extract_assets(esm_path: Path) -> dict:
    """
    Walk the ESM and extract:
      model_paths:    {formId: {"nif_m": path, "nif_f": path, "icon": path}}
      omod_data:      {formId: {attach_point, parent_rectype, filter_keywords,
                                loose_item, property_count, properties, nif}}
      arma_by_race:   {formId: {race, nif_m, nif_f, nif_m1p, nif_f1p}}
      armo_addons:    {armo_formId: [arma_formId, ...]}
      edid_index:     {formId: edid}
      type_index:     {formId: rectype}
    """
    data   = esm_path.read_bytes()
    length = len(data)
    pos    = 0

    model_paths:  dict[str, dict] = {}
    omod_data:    dict[str, dict] = {}
    arma_info:    dict[str, dict] = {}
    armo_addons:  dict[str, list] = defaultdict(list)
    edid_index:   dict[str, str]  = {}
    type_index:   dict[str, str]  = {}

    while pos + 24 <= length:
        rec_type_b = data[pos:pos+4]
        if rec_type_b == b"GRUP":
            pos += 24
            continue

        data_size = struct.unpack_from("<I", data, pos+4)[0]
        flags     = struct.unpack_from("<I", data, pos+8)[0]
        form_id   = struct.unpack_from("<I", data, pos+12)[0]
        pos += 24

        if rec_type_b in ASSET_TYPES:
            raw = data[pos:pos+data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                fid_str    = f"0x{form_id:08X}"
                rec_type_s = rec_type_b.decode("ascii", errors="replace").strip()
                subs_list  = _scan_subs(dec)
                subs       = {t: d for t, d in subs_list}

                type_index[fid_str] = rec_type_s

                # EditorID
                eid = _edid(subs)
                if eid:
                    edid_index[fid_str] = eid

                # MODL  — male / primary model
                nif_m = _modl_path(subs[b"MODL"]) if b"MODL" in subs else None
                # MOD2  — female model
                nif_f = _modl_path(subs[b"MOD2"]) if b"MOD2" in subs else None
                # MOD3  — male 1st-person model
                nif_m1p = _modl_path(subs[b"MOD3"]) if b"MOD3" in subs else None
                # MOD4  — female 1st-person model
                nif_f1p = _modl_path(subs[b"MOD4"]) if b"MOD4" in subs else None

                if any((nif_m, nif_f, nif_m1p, nif_f1p)):
                    model_paths[fid_str] = {
                        k: v for k, v in {
                            "nif": nif_m, "nif_f": nif_f,
                            "nif_1p": nif_m1p, "nif_f_1p": nif_f1p,
                        }.items() if v
                    }

                # ARMA-specific: race + addon model paths
                if rec_type_b == b"ARMA":
                    race_fid = None
                    if b"RNAM" in subs and len(subs[b"RNAM"]) >= 4:
                        race_fid = f"0x{struct.unpack_from('<I', subs[b'RNAM'])[0]:08X}"
                    arma_info[fid_str] = {
                        "race":    race_fid,
                        "nif":     nif_m,
                        "nif_f":   nif_f,
                        "nif_1p":  nif_m1p,
                        "nif_f_1p": nif_f1p,
                    }

                # ARMO: collect addon list (MODL subrecords with addon FormIDs via DNAM)
                # ARMO–ARMA link is in DNAM (array of ARMA FormIDs, 4 bytes each)
                if rec_type_b == b"ARMO" and b"DNAM" in subs:
                    dnam = subs[b"DNAM"]
                    for i in range(len(dnam) // 4):
                        addon_fid = struct.unpack_from("<I", dnam, i * 4)[0]
                        if addon_fid:
                            armo_addons[fid_str].append(f"0x{addon_fid:08X}")

                # OMOD: filter keywords, parent item, properties
                if rec_type_b == b"OMOD":
                    # FNAM: filter keyword FormID array
                    filter_kws: list[str] = []
                    if b"FNAM" in subs:
                        fnam = subs[b"FNAM"]
                        for i in range(len(fnam) // 4):
                            kfid = struct.unpack_from("<I", fnam, i * 4)[0]
                            if kfid:
                                filter_kws.append(f"0x{kfid:08X}")

                    # LNAM: loose mod item FormID
                    loose_item = None
                    if b"LNAM" in subs and len(subs[b"LNAM"]) >= 4:
                        lfid = struct.unpack_from("<I", subs[b"LNAM"])[0]
                        if lfid:
                            loose_item = f"0x{lfid:08X}"

                    # DATA: preamble + properties
                    preamble   = {}
                    properties = []
                    if b"DATA" in subs:
                        ddata = subs[b"DATA"]
                        preamble = _parse_omod_preamble(ddata)
                        if preamble.get("property_count", 0) > 0:
                            properties = _parse_omod_properties(
                                ddata, preamble["property_count"], preamble.get("parent_rectype")
                            )

                    omod_data[fid_str] = {
                        "attach_point":     preamble.get("attach_point"),
                        "parent_rectype":   preamble.get("parent_rectype"),
                        "property_count":   preamble.get("property_count", 0),
                        "properties":       properties,
                        "filter_keywords":  filter_kws,
                        "loose_item":       loose_item,
                        "nif":              nif_m,
                    }

        pos += data_size

    return {
        "model_paths":  model_paths,
        "omod_data":    omod_data,
        "arma_info":    arma_info,
        "armo_addons":  dict(armo_addons),
        "edid_index":   edid_index,
        "type_index":   type_index,
    }


def merge_assets(all_results: list[dict]) -> dict:
    merged = {
        "model_paths":  {},
        "omod_data":    {},
        "arma_info":    {},
        "armo_addons":  defaultdict(list),
        "edid_index":   {},
        "type_index":   {},
    }
    for r in all_results:
        merged["model_paths"].update(r["model_paths"])
        merged["omod_data"].update(r["omod_data"])
        merged["arma_info"].update(r["arma_info"])
        merged["edid_index"].update(r["edid_index"])
        merged["type_index"].update(r["type_index"])
        for k, v in r["armo_addons"].items():
            merged["armo_addons"][k].extend(v)
    merged["armo_addons"] = dict(merged["armo_addons"])
    return merged


# ---------------------------------------------------------------------------
# Build a keyword → OMOD index
# ---------------------------------------------------------------------------

def build_keyword_omod_index(assets: dict) -> dict[str, list[str]]:
    """keyword_formId → [omod_formIds that filter on this keyword]"""
    idx: dict[str, list[str]] = defaultdict(list)
    for omod_id, od in assets["omod_data"].items():
        for kw in od.get("filter_keywords", []):
            idx[kw].append(omod_id)
    return dict(idx)


# ---------------------------------------------------------------------------
# Vault injection
# ---------------------------------------------------------------------------

def _uid() -> str:
    return "".join(random.choices(_string.ascii_lowercase + _string.digits, k=9))


def _entry(title: str, content: str, tags: list[str]) -> dict:
    return {
        "id":                 f"fo4-assets-v1-{_uid()}",
        "title":              title,
        "content":            content,
        "source":             "fo4-asset-graph",
        "creditName":         "Mossy Industries Asset Scanner",
        "creditUrl":          "",
        "trustLevel":         "high",
        "tags":               tags,
        "date":               time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status":             "active",
        "shareWithCommunity": False,
    }


def inject_vault(
    assets: dict,
    kw_omod_index: dict[str, list[str]],
    node_names: dict[str, str],
    cobj_recipes: list[dict],
    edid_from_graph: dict[str, str],
) -> int:
    existing: list[dict] = []
    if VAULT_PATH.exists():
        try:
            existing = json.loads(VAULT_PATH.read_text(encoding="utf-8"))
        except Exception:
            existing = []

    existing = [e for e in existing if not e.get("id", "").startswith("fo4-assets")]

    def label(fid: str) -> str:
        n    = node_names.get(fid, "")
        eid  = assets["edid_index"].get(fid) or edid_from_graph.get(fid, "")
        if n and eid:
            return f"{n} [{eid}] {fid}"
        elif n:
            return f"{n} {fid}"
        elif eid:
            return f"[{eid}] {fid}"
        return fid

    # Build COBJ output→recipe lookup
    omod_to_recipe: dict[str, dict] = {}
    for recipe in cobj_recipes:
        omod_to_recipe[recipe["result_form_id"]] = recipe

    new_entries: list[dict] = []

    # ── 1. OMOD Complete Reference ─────────────────────────────────────────
    omod_lines = [
        "FALLOUT 4 OBJECT MODIFICATIONS (OMOD) — Complete Reference",
        "Every weapon/armor mod in the game with its parent item, filter keywords,",
        "crafting recipe, property changes, and associated .nif file (if any).",
        "Use this to: find all paint jobs for an armor, reverse-engineer a mod's effect,",
        "understand which workbench and ingredients a mod requires.",
        "",
    ]

    for fid, od in sorted(assets["omod_data"].items(),
                          key=lambda x: node_names.get(x[0], assets["edid_index"].get(x[0], x[0]))):
        omod_label  = label(fid)
        attach_pt   = od.get("attach_point", "")
        parent_type = od.get("parent_rectype", "")
        nif         = od.get("nif", "")
        loose       = od.get("loose_item", "")
        kws         = od.get("filter_keywords", [])
        props       = od.get("properties", [])
        pc          = od.get("property_count", 0)

        omod_lines.append(f"OMOD: {omod_label}")
        if parent_type:
            omod_lines.append(f"  Applies to: {parent_type}" + (f" (attach point: {label(attach_pt)})" if attach_pt else ""))
        if kws:
            kw_labels = [label(k) for k in kws[:4]]
            omod_lines.append(f"  Filter Keywords: {', '.join(kw_labels)}")
        if nif:
            omod_lines.append(f"  Model (NIF): {nif}")
        if loose:
            omod_lines.append(f"  Loose Item: {label(loose)}")

        # COBJ recipe
        recipe = omod_to_recipe.get(fid) or omod_to_recipe.get(loose, {})
        if recipe:
            wb = label(recipe.get("workbench_keyword_id", ""))
            ings = [f"{label(i['form_id'])} x{i['count']}" for i in recipe.get("ingredients", [])[:4]]
            omod_lines.append(f"  Recipe: @ {wb}")
            if ings:
                omod_lines.append(f"    Ingredients: {', '.join(ings)}")

        # Properties
        if props:
            for p in props[:6]:
                func = p.get("function", "SET")
                pname = p.get("property", "?")
                val   = p.get("value")
                omod_lines.append(f"  [{func}] {pname} = {val}")
        elif pc > 0:
            omod_lines.append(f"  {pc} property changes (use xEdit to view details)")

        omod_lines.append("")

    new_entries.append(_entry(
        "Fallout 4 — Complete OMOD Reference (All Weapon/Armor Mods)",
        "\n".join(omod_lines),
        ["omod", "armor-mods", "weapon-mods", "paint", "crafting", "fo4-assets",
         "properties", "nif", "filter-keywords", "workbench"],
    ))

    # ── 2. ARMA (Armor Addon) Model Paths ────────────────────────────────
    arma_lines = [
        "FALLOUT 4 ARMOR ADDON (ARMA) MODEL PATHS",
        "ARMA records define the actual mesh files worn on character bodies.",
        "Format: ARMA [EditorID] FormID",
        "         NIF (male): path/to/mesh.nif",
        "         NIF (female): path/to/mesh_f.nif",
        "         NIF (1st person): path/to/mesh_1p.nif",
        "Use these paths to identify which .nif file belongs to which armor piece.",
        "In CK: Open an ARMA record -> Models tab to see/change these paths.",
        "",
    ]
    for fid, info in sorted(assets["arma_info"].items(),
                            key=lambda x: assets["edid_index"].get(x[0], x[0])):
        arma_label = label(fid)
        nifs = []
        if info.get("nif"):     nifs.append(f"  NIF (male):     {info['nif']}")
        if info.get("nif_f"):   nifs.append(f"  NIF (female):   {info['nif_f']}")
        if info.get("nif_1p"):  nifs.append(f"  NIF (1st M):    {info['nif_1p']}")
        if info.get("nif_f_1p"): nifs.append(f"  NIF (1st F):   {info['nif_f_1p']}")
        if nifs:
            arma_lines.append(f"ARMA: {arma_label}")
            arma_lines.extend(nifs)
            arma_lines.append("")

    new_entries.append(_entry(
        "Fallout 4 — Armor Addon (ARMA) Model File Paths",
        "\n".join(arma_lines),
        ["arma", "armor-addon", "nif", "models", "mesh", "fo4-assets",
         "model-paths", "3d-assets"],
    ))

    # ── 3. Weapon Model Paths ─────────────────────────────────────────────
    weap_lines = [
        "FALLOUT 4 WEAPON MODEL FILE PATHS",
        "NIF mesh paths for all weapon records.",
        "Format: WEAP [EditorID] FormID -> NIF path",
        "",
    ]
    for fid, paths in sorted(assets["model_paths"].items(),
                             key=lambda x: node_names.get(x[0], x[0])):
        if assets["type_index"].get(fid) != "WEAP":
            continue
        nif = paths.get("nif", "")
        if nif:
            weap_lines.append(f"{label(fid)}")
            weap_lines.append(f"  {nif}")

    new_entries.append(_entry(
        "Fallout 4 — Weapon Model File Paths (NIF)",
        "\n".join(weap_lines),
        ["weapons", "nif", "models", "mesh", "fo4-assets", "model-paths"],
    ))

    # ── 4. Keyword → OMOD Lookup ──────────────────────────────────────────
    kw_lines = [
        "FALLOUT 4 KEYWORD-TO-OMOD INDEX",
        "For any keyword, which OMODs use it as a filter.",
        "This answers: 'What paint jobs / mods exist for [Combat Armor]?'",
        "To find mods for an armor/weapon:",
        "  1. Note its keywords (e.g. 'ArmorTypeCombat', 'ArmorHeavy')",
        "  2. Look up those keywords below to see all matching OMODs",
        "",
    ]
    for kw_fid, omod_ids in sorted(kw_omod_index.items(),
                                   key=lambda x: label(x[0])):
        if len(omod_ids) < 1:
            continue
        kw_lines.append(f"KEYWORD: {label(kw_fid)}")
        for oid in sorted(omod_ids, key=lambda x: node_names.get(x, x))[:40]:
            kw_lines.append(f"  OMOD: {label(oid)}")
        if len(omod_ids) > 40:
            kw_lines.append(f"  ... +{len(omod_ids)-40} more")
        kw_lines.append("")

    new_entries.append(_entry(
        "Fallout 4 — Keyword-to-OMOD Index (Find Mods by Armor/Weapon Type)",
        "\n".join(kw_lines),
        ["keywords", "omod", "filter", "armor-mods", "weapon-mods",
         "paint", "fo4-assets", "crafting", "workbench"],
    ))

    merged = existing + new_entries
    VAULT_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    return len(new_entries)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    t0 = time.time()

    # Load node names
    node_names: dict[str, str] = {}
    if STRINGS_JSON.exists():
        try:
            raw = json.loads(STRINGS_JSON.read_text(encoding="utf-8"))
            for cat_entries in raw.get("indexed", {}).values():
                for e in cat_entries:
                    fid  = e.get("form_id", "")
                    name = e.get("name", "") or e.get("edid", "")
                    if fid and name:
                        node_names[fid] = name
            print(f"Loaded {len(node_names):,} node names")
        except Exception as ex:
            print(f"Warning: {ex}")

    # Load COBJ recipes and graph edid index from form graph
    cobj_recipes: list[dict] = []
    edid_from_graph: dict[str, str] = {}
    if GRAPH_JSON.exists():
        try:
            g = json.loads(GRAPH_JSON.read_text(encoding="utf-8"))
            cobj_recipes    = g.get("cobj_recipes", [])
            edid_from_graph = g.get("edid_index", {})
            print(f"Loaded {len(cobj_recipes):,} COBJ recipes from form graph")
        except Exception as ex:
            print(f"Warning: {ex}")

    # Walk all ESMs
    all_results = []
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    for esm_path in esm_list:
        if not esm_path.exists():
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for assets...")
        all_results.append(extract_assets(esm_path))

    print("Merging...")
    assets = merge_assets(all_results)

    # Build keyword → OMOD index
    kw_omod_index = build_keyword_omod_index(assets)

    # Stats
    model_count = len(assets["model_paths"])
    omod_count  = len(assets["omod_data"])
    arma_count  = len(assets["arma_info"])

    omod_with_parent = sum(1 for od in assets["omod_data"].values() if od.get("parent_rectype"))
    omod_with_props  = sum(1 for od in assets["omod_data"].values() if od.get("properties"))
    omod_with_kws    = sum(1 for od in assets["omod_data"].values() if od.get("filter_keywords"))

    print(f"\n=== Asset extraction complete ===")
    print(f"  Model paths (NIF):        {model_count:,}")
    print(f"  ARMA (armor addons):      {arma_count:,}")
    print(f"  OMOD records:             {omod_count:,}")
    print(f"    with parent item:       {omod_with_parent:,}")
    print(f"    with parsed properties: {omod_with_props:,}")
    print(f"    with filter keywords:   {omod_with_kws:,}")
    print(f"  Keyword-OMOD mappings:    {sum(len(v) for v in kw_omod_index.values()):,}")

    # Save
    ASSET_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model_paths":     assets["model_paths"],
        "arma_info":       assets["arma_info"],
        "armo_addons":     assets["armo_addons"],
        "omod_data":       assets["omod_data"],
        "keyword_omod":    kw_omod_index,
        "edid_index":      assets["edid_index"],
        "type_index":      assets["type_index"],
    }
    ASSET_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    json_mb = ASSET_OUT.stat().st_size / 1024 / 1024
    print(f"\nSaved: {ASSET_OUT}  ({json_mb:.1f} MB)")

    # Inject vault entries
    print("Injecting vault entries...")
    added = inject_vault(assets, kw_omod_index, node_names, cobj_recipes, edid_from_graph)
    print(f"Added {added} vault entries")

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s")

    # Demo: show Combat Armor paint jobs
    print("\n--- Combat Armor paint OMODs (sample) ---")
    combat_kw = next(
        (fid for fid, ed in {**assets["edid_index"], **edid_from_graph}.items()
         if "armortype" in ed.lower() and "combat" in ed.lower()),
        None
    )
    if combat_kw:
        paints = kw_omod_index.get(combat_kw, [])
        print(f"Keyword {combat_kw} ({assets['edid_index'].get(combat_kw,'?')}) covers {len(paints)} OMODs:")
        for oid in paints[:8]:
            nm = node_names.get(oid, assets["edid_index"].get(oid, oid))
            od = assets["omod_data"].get(oid, {})
            props_str = " | ".join(
                f"{p['property']}={p['value']}"
                for p in od.get("properties", [])[:2]
            )
            print(f"  {nm}  {props_str}")
    else:
        print("ArmorTypeCombat keyword not found — check KEYW/KYWD scan results")


if __name__ == "__main__":
    main()
