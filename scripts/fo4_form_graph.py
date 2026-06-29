#!/usr/bin/env python3
"""
fo4_form_graph.py — Fallout 4 Form Relationship Graph Builder
=============================================================
Builds the reference graph of how FO4 records connect to each other:

  PERK → SPEL (perk ability) → MGEF (magic effect) → VMAD (Papyrus script)
  SPEL → MGEF chains with magnitude/duration/conditions
  MGEF → script name + bound property FormIDs (via VMAD)
  COBJ → output (OMOD/item) + workbench keyword + ingredients
  All records → all their VMAD script attachments + bound properties
  All records → their KWDA keyword memberships
  Bidirectional "referenced_by" index

Requires: fo4_strings_scan.py to have been run first (fo4_world_strings.json)

Outputs:
  H:\\Mossy Memory\\fo4_form_graph.json   — full reference graph
  H:\\Mossy Memory\\knowledge-vault.json  — vault entries for perk chains, scripts, recipes
"""

import json, struct, sys, time, zlib, random, string as _string
from pathlib import Path
from collections import defaultdict

# ---------------------------------------------------------------------------
# Config — same paths as fo4_strings_scan.py
# ---------------------------------------------------------------------------
FO4_DATA     = Path(r"E:\Steam\steamapps\common\Fallout 4\Data")
MAIN_ESM     = FO4_DATA / "Fallout4.esm"
DLC_MAINS    = [
    FO4_DATA / "DLCRobot.esm",
    FO4_DATA / "DLCCoast.esm",
    FO4_DATA / "DLCNukaWorld.esm",
    FO4_DATA / "DLCworkshop01.esm",
    FO4_DATA / "DLCworkshop02.esm",
    FO4_DATA / "DLCworkshop03.esm",
]

STRINGS_JSON = Path(r"H:\Mossy Memory\fo4_world_strings.json")
GRAPH_OUT    = Path(r"H:\Mossy Memory\fo4_form_graph.json")
VAULT_PATH   = Path(r"H:\Mossy Memory\knowledge-vault.json")

COMPRESSED_FLAG = 0x00040000

# Record types we want to extract relationships from
RELATIONSHIP_TYPES = {
    b"PERK", b"SPEL", b"MGEF", b"COBJ",
    b"NPC_", b"QUST", b"ARMO", b"WEAP", b"ALCH",
    b"ACTI", b"FURN", b"CONT", b"DOOR", b"TERM",
    b"LIGH", b"LCTN", b"WRLD", b"CELL",
    b"RACE", b"FACT", b"ENCH",
}


# ---------------------------------------------------------------------------
# Low-level binary helpers
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


def scan_subs_ordered(rec: bytes) -> list[tuple[bytes, bytes]]:
    """Return ALL (type, data) subrecord pairs in order — preserves duplicates."""
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


def scan_subs_dict(rec: bytes) -> dict[bytes, bytes]:
    """Last-value-wins dict — good for single-occurrence subrecords."""
    return {t: d for t, d in scan_subs_ordered(rec)}


# ---------------------------------------------------------------------------
# VMAD parser — Papyrus script attachments
# ---------------------------------------------------------------------------

def parse_vmad(data: bytes) -> list[dict]:
    """
    Parse a VMAD subrecord (Virtual Machine Adapter).
    Returns list of {name, properties: [{name, type_id, value}]}.
    'value' for Object properties is a FormID hex string.
    """
    pos = 0
    if len(data) < 6:
        return []
    try:
        version    = struct.unpack_from("<H", data, pos)[0]; pos += 2
        obj_format = struct.unpack_from("<H", data, pos)[0]; pos += 2
        sc         = struct.unpack_from("<H", data, pos)[0]; pos += 2
    except struct.error:
        return []

    scripts: list[dict] = []
    for _ in range(min(sc, 64)):
        if pos + 2 > len(data):
            break
        nlen = struct.unpack_from("<H", data, pos)[0]; pos += 2
        if pos + nlen > len(data):
            break
        script_name = data[pos:pos + nlen].decode("ascii", errors="replace"); pos += nlen
        if pos + 3 > len(data):
            break
        _status = data[pos]; pos += 1
        pc = struct.unpack_from("<H", data, pos)[0]; pos += 2

        props: list[dict] = []
        for _ in range(min(pc, 256)):
            if pos + 2 > len(data):
                break
            pnlen = struct.unpack_from("<H", data, pos)[0]; pos += 2
            if pos + pnlen > len(data):
                break
            pname = data[pos:pos + pnlen].decode("ascii", errors="replace"); pos += pnlen
            if pos + 2 > len(data):
                break
            ptype   = data[pos]; pos += 1
            _pstatus = data[pos]; pos += 1

            val = None
            try:
                if ptype == 1:    # Object reference
                    # objectFormat 2: unk(u16) + unk(u16) + formId(u32) = 8 bytes
                    # objectFormat 1: formId(u32) = 4 bytes
                    if obj_format == 2:
                        if pos + 8 > len(data):
                            break
                        fid = struct.unpack_from("<I", data, pos + 4)[0]
                        val = f"0x{fid:08X}" if fid else None
                        pos += 8
                    else:
                        if pos + 4 > len(data):
                            break
                        fid = struct.unpack_from("<I", data, pos)[0]
                        val = f"0x{fid:08X}" if fid else None
                        pos += 4
                elif ptype == 2:  # String
                    slen = struct.unpack_from("<H", data, pos)[0]; pos += 2
                    val  = data[pos:pos + slen].decode("utf-8", errors="replace"); pos += slen
                elif ptype == 3:  # Int
                    val = struct.unpack_from("<i", data, pos)[0]; pos += 4
                elif ptype == 4:  # Float
                    val = round(struct.unpack_from("<f", data, pos)[0], 4); pos += 4
                elif ptype == 5:  # Bool
                    val = bool(data[pos]); pos += 1
                elif ptype == 11: # Object array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    step = 8 if obj_format == 2 else 4
                    items = []
                    for _ in range(min(cnt, 256)):
                        if pos + step > len(data):
                            break
                        if obj_format == 2:
                            fid = struct.unpack_from("<I", data, pos + 4)[0]
                        else:
                            fid = struct.unpack_from("<I", data, pos)[0]
                        if fid:
                            items.append(f"0x{fid:08X}")
                        pos += step
                    val = items
                elif ptype == 12: # String array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    items = []
                    for _ in range(min(cnt, 256)):
                        slen = struct.unpack_from("<H", data, pos)[0]; pos += 2
                        items.append(data[pos:pos + slen].decode("utf-8", errors="replace"))
                        pos += slen
                    val = items
                elif ptype == 13: # Int array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    val = [struct.unpack_from("<i", data, pos + i * 4)[0]
                           for i in range(min(cnt, 256))]
                    pos += min(cnt, 256) * 4
                elif ptype == 14: # Float array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    val = [round(struct.unpack_from("<f", data, pos + i * 4)[0], 4)
                           for i in range(min(cnt, 256))]
                    pos += min(cnt, 256) * 4
                elif ptype == 15: # Bool array
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    val = [bool(data[pos + i]) for i in range(min(cnt, 256))]
                    pos += min(cnt, 256)
                else:
                    # Unknown type — can't safely advance; abort this script
                    props = []
                    break
            except (struct.error, IndexError):
                break

            if pname:
                props.append({"name": pname, "type_id": ptype, "value": val})

        scripts.append({"name": script_name, "properties": props})

    return scripts


# ---------------------------------------------------------------------------
# PERK entry parser  (PRKE / PRKF blocks)
# ---------------------------------------------------------------------------

def parse_perk_entries(subs: list[tuple[bytes, bytes]]) -> list[dict]:
    """
    Parse ALL perk entry blocks from FO4's ordered subrecords.

    FO4 PERK section structure:
      PRKE (3): [type(0=quest, 1=ability, 2=entry_point), rank (0-based), priority]
      DATA:
        type 0 (quest):       6 bytes  = quest_form_id(u32) + stage(u16)
        type 1 (ability):     4 bytes  = spell_form_id(u32)
        type 2 (entry_point): 3 bytes  = entry_fn(u8), run_on(u8), level(u8)
      For entry_point sections:
        PRKC (1): condition group
        CTDA (32): one condition per CTDA
        EPFT (1):  function type (01=Set, 02=Add, 03=Multiply, 04=AddRangeToValue)
        EPFB (2):  bool/function data
        EPFD (4):  the modifier value (float or form ref)
      PRKF (0):  EMPTY end marker

    The record-level DATA (5 bytes) always precedes the first PRKE section.
    """
    entries:        list[dict] = []
    in_section:     bool       = False
    section_type:   int        = -1
    section_rank:   int        = 0
    section_prior:  int        = 0
    section_data:   bytes      = b""
    section_data_seen: bool    = False
    cur_entry:      dict       = {}
    cur_conditions: list       = []

    EPFT_NAMES = {1: "Set", 2: "Add", 3: "Multiply", 4: "AddRange", 5: "AddAVMult",
                  6: "AbsoluteValue", 7: "NegativeAbsoluteValue", 8: "AddLeveledList",
                  9: "AddActivateChoice", 10: "SelectSpell", 11: "SelectText", 12: "SetText"}

    def finish_entry():
        if cur_entry:
            if cur_conditions:
                cur_entry["conditions"] = cur_conditions[:]
            entries.append(dict(cur_entry))

    for t, d in subs:
        if t == b"PRKE" and len(d) >= 3:
            finish_entry()
            cur_entry = {}
            cur_conditions = []
            in_section        = True
            section_data_seen = False
            section_type      = d[0]
            section_rank      = d[1]
            section_prior     = d[2]
        elif t == b"DATA" and in_section and not section_data_seen:
            section_data_seen = True
            section_data      = d
            if section_type == 1 and len(d) >= 4:
                fid = struct.unpack_from("<I", d, 0)[0]
                if fid:
                    cur_entry = {
                        "entry_type":      "ability",
                        "rank":            section_rank + 1,
                        "priority":        section_prior,
                        "ability_form_id": f"0x{fid:08X}",
                    }
            elif section_type == 0 and len(d) >= 4:
                fid = struct.unpack_from("<I", d, 0)[0]
                if fid:
                    cur_entry = {
                        "entry_type":      "quest",
                        "rank":            section_rank + 1,
                        "priority":        section_prior,
                        "ability_form_id": f"0x{fid:08X}",
                        "quest_stage":     struct.unpack_from("<H", d, 4)[0] if len(d) >= 6 else None,
                    }
            elif section_type == 2 and len(d) >= 3:
                cur_entry = {
                    "entry_type":     "entry_point",
                    "rank":           section_rank + 1,
                    "priority":       section_prior,
                    "ep_function_id": d[0],              # native perk entry point ID
                    "ep_run_on":      d[1],
                    "ep_level":       d[2],
                    "ep_modifier":    None,
                    "ep_function":    None,
                }
        elif t == b"EPFT" and cur_entry.get("entry_type") == "entry_point" and len(d) >= 1:
            fn_type = d[0]
            cur_entry["ep_function"] = EPFT_NAMES.get(fn_type, f"fn_{fn_type}")
        elif t == b"EPFD" and cur_entry.get("entry_type") == "entry_point" and len(d) >= 4:
            # EPFD holds the modifier value — often a float
            try:
                as_float = struct.unpack_from("<f", d, 0)[0]
                cur_entry["ep_modifier"] = round(as_float, 4)
            except Exception:
                cur_entry["ep_modifier"] = d.hex()
        elif t == b"CTDA" and in_section and len(d) >= 32:
            # Parse condition: operator(u8) + unk(3) + compValue(f32) + function_id(u32) + ...
            try:
                op        = d[0] & 0x0F
                cmp_val   = round(struct.unpack_from("<f", d, 4)[0], 3)
                fn_id     = struct.unpack_from("<I", d, 8)[0]
                param1    = struct.unpack_from("<I", d, 12)[0]
                cur_conditions.append({
                    "operator":    {0:"==", 1:"!=", 2:">", 3:">=", 4:"<", 5:"<="}.get(op, f"op{op}"),
                    "value":       cmp_val,
                    "function_id": fn_id,
                    "param1":      f"0x{param1:08X}" if param1 else None,
                })
            except Exception:
                pass
        elif t == b"PRKF":
            finish_entry()
            cur_entry = {}
            cur_conditions = []
            in_section        = False
            section_data_seen = False

    finish_entry()
    return [e for e in entries if e]


# ---------------------------------------------------------------------------
# SPEL effect parser  (EFID / EFIT blocks)
# ---------------------------------------------------------------------------

def parse_spel_effects(subs: list[tuple[bytes, bytes]]) -> list[dict]:
    """
    Parse SPEL effect pairs: EFID (MGEF FormID) + EFIT (magnitude/area/duration).
    Returns list of {mgef_form_id, magnitude, area, duration}.
    """
    effects: list[dict] = []
    pending_mgef: str | None = None

    for t, d in subs:
        if t == b"EFID" and len(d) >= 4:
            pending_mgef = f"0x{struct.unpack_from('<I', d, 0)[0]:08X}"
        elif t == b"EFIT" and pending_mgef and len(d) >= 12:
            effects.append({
                "mgef_form_id": pending_mgef,
                "magnitude":    round(struct.unpack_from("<f", d, 0)[0], 3),
                "area":         struct.unpack_from("<I", d, 4)[0],
                "duration":     struct.unpack_from("<I", d, 8)[0],
            })
            pending_mgef = None
        elif t == b"EFID":
            pending_mgef = None

    return effects


# ---------------------------------------------------------------------------
# MGEF DATA parser — extract effect type, casting, delivery
# ---------------------------------------------------------------------------

# MGEF DATA is ~232 bytes in FO4. The first 4 bytes are flags.
# Offset 84 (approximately): effect type
# We'll parse conservatively just enough to categorize the effect.
MGEF_EFFECT_TYPES = {
    0: "Value Modifier",
    1: "Script",
    2: "Dispel",
    3: "Currency",
    4: "Detect",
    5: "Calm",
    6: "Frenzy",
    7: "Disarm",
    8: "Command Summoned",
    9: "Invisibility",
    10: "Lock",
    11: "Open",
    12: "Bound Weapon",
    13: "Summon Creature",
    14: "Detect Life",
    15: "Telekinesis",
    16: "Paralysis",
    17: "Reanimate",
    18: "Soul Trap",
    19: "Turn Undead",
    20: "Guide",
    21: "Werewolf Feed",
    22: "Cure Addiction",
    23: "Cure Poison",
    24: "Concussion",
    25: "Value and Parts",
    26: "Accumulate Magnitude",
    27: "Stagger",
    28: "Peak Value Modifier",
    29: "Clone Actor",
    30: "Slow Time",
    31: "Rally",
    32: "Enhance Weapon",
    33: "Spawn Hazard",
    34: "Etherealize",
    35: "Banish",
    36: "Spell Effect Handler",
    37: "Activate",
    38: "Invisible (imod)",
    39: "Wastelander's Friend",
}
MGEF_CASTING = {0: "Constant Effect", 1: "Fire and Forget", 2: "Concentration"}
MGEF_DELIVERY = {0: "Self", 1: "Contact", 2: "Aimed", 3: "Target Actor", 4: "Target Location"}


def parse_mgef_data(d: bytes) -> dict:
    """Parse MGEF DATA subrecord for effect type, casting type, delivery."""
    result = {}
    if len(d) < 148:
        return result
    try:
        # Flags at offset 0
        flags = struct.unpack_from("<I", d, 0)[0]
        # Effect type at offset 104 (verified against xEdit format)
        effect_type_idx = struct.unpack_from("<I", d, 104)[0]
        result["effect_type"] = MGEF_EFFECT_TYPES.get(effect_type_idx, f"type_{effect_type_idx}")
        # Casting type at offset 108
        casting_idx = struct.unpack_from("<I", d, 108)[0]
        result["casting_type"] = MGEF_CASTING.get(casting_idx, f"cast_{casting_idx}")
        # Delivery at offset 112
        delivery_idx = struct.unpack_from("<I", d, 112)[0]
        result["delivery"] = MGEF_DELIVERY.get(delivery_idx, f"deliv_{delivery_idx}")
        # Actor value (primary) at offset 116
        result["actor_value_index"] = struct.unpack_from("<I", d, 116)[0]
        result["hostile"] = bool(flags & 0x00000001)
        result["recover"] = bool(flags & 0x00000002)
    except struct.error:
        pass
    return result


# ---------------------------------------------------------------------------
# COBJ recipe parser
# ---------------------------------------------------------------------------

def parse_cobj(subs: list[tuple[bytes, bytes]]) -> dict | None:
    """
    Parse COBJ crafting recipe.
    Returns {result_form_id, result_count, workbench_keyword_id, ingredients: [{form_id, count}]}.
    """
    d = {t: v for t, v in subs}  # last-value dict for singles
    if b"CNAM" not in d:
        return None

    result_fid = struct.unpack_from("<I", d[b"CNAM"], 0)[0]
    result_count = 1
    if b"NAM1" in d and len(d[b"NAM1"]) >= 2:
        result_count = struct.unpack_from("<H", d[b"NAM1"], 0)[0]

    workbench = None
    if b"BNAM" in d and len(d[b"BNAM"]) >= 4:
        fid = struct.unpack_from("<I", d[b"BNAM"], 0)[0]
        if fid:
            workbench = f"0x{fid:08X}"

    ingredients = []
    for t, v in subs:
        if t == b"CNTO" and len(v) >= 8:
            item_fid = struct.unpack_from("<I", v, 0)[0]
            count    = struct.unpack_from("<i", v, 4)[0]
            if item_fid:
                ingredients.append({"form_id": f"0x{item_fid:08X}", "count": count})

    return {
        "result_form_id":      f"0x{result_fid:08X}",
        "result_count":        result_count,
        "workbench_keyword_id": workbench,
        "ingredients":         ingredients,
    }


# ---------------------------------------------------------------------------
# KWDA keyword array parser
# ---------------------------------------------------------------------------

def parse_kwda(subs_dict: dict[bytes, bytes]) -> list[str]:
    if b"KWDA" not in subs_dict:
        return []
    kwda = subs_dict[b"KWDA"]
    return [f"0x{struct.unpack_from('<I', kwda, i * 4)[0]:08X}"
            for i in range(len(kwda) // 4)]


# ---------------------------------------------------------------------------
# Main ESM walker — extract relationships from all records
# ---------------------------------------------------------------------------

def extract_relationships(esm_path: Path) -> dict:
    """
    Walk the ESM and return:
      perk_entries:  {form_id: [{rank, entry_type, ability_form_id}]}
      spell_effects: {form_id: [{mgef_form_id, magnitude, area, duration}]}
      mgef_info:     {form_id: {effect_type, casting_type, delivery, scripts: [...]}}
      vmad_index:    {form_id: [{script_name, properties: [{name, type_id, value}]}]}
      cobj_recipes:  [{form_id, result_form_id, result_count, workbench_keyword_id, ingredients}]
      keyword_members: {keyword_form_id: [member_form_ids]}  (which records have this keyword)
      edid_index:    {form_id: edid_string}
      type_index:    {form_id: record_type_string}
    """
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0

    perk_entries:    dict[str, list] = {}
    spell_effects:   dict[str, list] = {}
    mgef_info:       dict[str, dict] = {}
    vmad_index:      dict[str, list] = {}
    cobj_recipes:    list[dict]       = []
    keyword_members: dict[str, list]  = defaultdict(list)
    edid_index:      dict[str, str]   = {}
    type_index:      dict[str, str]   = {}

    while pos + 24 <= length:
        try:
            rec_type_b = data[pos:pos + 4]
        except Exception:
            pos += 1
            continue

        if rec_type_b == b"GRUP":
            pos += 24
            continue

        data_size = struct.unpack_from("<I", data, pos + 4)[0]
        flags     = struct.unpack_from("<I", data, pos + 8)[0]
        form_id   = struct.unpack_from("<I", data, pos + 12)[0]
        pos += 24

        if pos + data_size > length:
            break

        if rec_type_b in RELATIONSHIP_TYPES:
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)

            if dec is not None:
                fid_str     = f"0x{form_id:08X}"
                rec_type_s  = rec_type_b.decode("ascii", errors="replace").strip()
                subs_ord    = scan_subs_ordered(dec)
                subs_d      = scan_subs_dict(dec)

                type_index[fid_str] = rec_type_s

                # EditorID
                if b"EDID" in subs_d:
                    edid_raw = subs_d[b"EDID"]
                    null_pos = edid_raw.find(b"\x00")
                    edid_str = edid_raw[:null_pos if null_pos >= 0 else len(edid_raw)]
                    edid_index[fid_str] = edid_str.decode("ascii", errors="replace").strip()

                # VMAD — script attachments
                if b"VMAD" in subs_d:
                    scripts = parse_vmad(subs_d[b"VMAD"])
                    if scripts:
                        vmad_index[fid_str] = scripts

                # PERK entries
                if rec_type_b == b"PERK":
                    entries = parse_perk_entries(subs_ord)
                    if entries:
                        perk_entries[fid_str] = entries

                # SPEL effects
                elif rec_type_b == b"SPEL":
                    effects = parse_spel_effects(subs_ord)
                    if effects:
                        spell_effects[fid_str] = effects

                # MGEF data + script
                elif rec_type_b == b"MGEF":
                    info: dict = {}
                    if b"DATA" in subs_d:
                        info.update(parse_mgef_data(subs_d[b"DATA"]))
                    if fid_str in vmad_index:
                        info["scripts"] = vmad_index[fid_str]
                    if info:
                        mgef_info[fid_str] = info

                # COBJ recipe
                elif rec_type_b == b"COBJ":
                    recipe = parse_cobj(subs_ord)
                    if recipe:
                        recipe["form_id"] = fid_str
                        cobj_recipes.append(recipe)

                # Keywords membership
                keywords = parse_kwda(subs_d)
                for kw in keywords:
                    keyword_members[kw].append(fid_str)

        pos += data_size

    return {
        "perk_entries":    perk_entries,
        "spell_effects":   spell_effects,
        "mgef_info":       mgef_info,
        "vmad_index":      vmad_index,
        "cobj_recipes":    cobj_recipes,
        "keyword_members": dict(keyword_members),
        "edid_index":      edid_index,
        "type_index":      type_index,
    }


def merge_relationships(all_results: list[dict]) -> dict:
    merged = {
        "perk_entries":    {},
        "spell_effects":   {},
        "mgef_info":       {},
        "vmad_index":      {},
        "cobj_recipes":    [],
        "keyword_members": defaultdict(list),
        "edid_index":      {},
        "type_index":      {},
    }
    for r in all_results:
        merged["perk_entries"].update(r["perk_entries"])
        merged["spell_effects"].update(r["spell_effects"])
        merged["mgef_info"].update(r["mgef_info"])
        merged["vmad_index"].update(r["vmad_index"])
        merged["cobj_recipes"].extend(r["cobj_recipes"])
        for kw, members in r["keyword_members"].items():
            merged["keyword_members"][kw].extend(members)
        merged["edid_index"].update(r["edid_index"])
        merged["type_index"].update(r["type_index"])
    merged["keyword_members"] = dict(merged["keyword_members"])
    return merged


# ---------------------------------------------------------------------------
# Build reverse index: for any FormID, what other records reference it
# ---------------------------------------------------------------------------

def build_referenced_by(rel: dict) -> dict[str, list[dict]]:
    """
    Returns {target_form_id: [{from_form_id, from_type, context}]}.
    Covers: perk ability refs, spell→mgef refs, recipe output/ingredient refs,
    script property Object refs.
    """
    ref_by: dict[str, list] = defaultdict(list)

    def add(target: str | None, source: str, source_type: str, ctx: str):
        if target and target != "0x00000000":
            ref_by[target].append({"from": source, "from_type": source_type, "context": ctx})

    for perk_id, entries in rel["perk_entries"].items():
        for e in entries:
            add(e.get("ability_form_id"), perk_id, "PERK",
                f"perk_ability rank {e['rank']}")

    for spell_id, effects in rel["spell_effects"].items():
        for e in effects:
            add(e["mgef_form_id"], spell_id, "SPEL", "spell_effect")

    for recipe in rel["cobj_recipes"]:
        add(recipe["result_form_id"], recipe["form_id"], "COBJ", "recipe_output")
        for ing in recipe["ingredients"]:
            add(ing["form_id"], recipe["form_id"], "COBJ", "recipe_ingredient")
        add(recipe.get("workbench_keyword_id"), recipe["form_id"], "COBJ", "workbench_keyword")

    for owner_id, scripts in rel["vmad_index"].items():
        owner_type = rel["type_index"].get(owner_id, "?")
        for script in scripts:
            for prop in script.get("properties", []):
                if prop["type_id"] in (1,) and prop["value"]:
                    add(prop["value"], owner_id, owner_type,
                        f"script_property:{script['name']}.{prop['name']}")

    return dict(ref_by)


# ---------------------------------------------------------------------------
# Build pre-computed perk chains for vault
# ---------------------------------------------------------------------------

def build_perk_chain_text(
    perk_id: str,
    rel: dict,
    node_names: dict[str, str],
) -> str:
    """
    Build a human-readable chain description for one perk, covering all section types:
      ability    → PERK → SPEL → MGEF → Script (Papyrus)
      quest      → PERK → QUST (quest stage trigger)
      entry_point → PERK → native game entry point function with value modifier + conditions

    Entry point sections are how most combat/stat perks work in FO4.
    Papyrus scripts are only used for ability-type sections via MGEF VMAD.
    To add a condition (e.g., suppress grenade indicator when item equipped):
      Add CTDA to the entry_point section that checks GetWornHasKeyword == 0.
    """
    def name(fid: str) -> str:
        if not fid:
            return "(none)"
        n    = node_names.get(fid, "")
        edid = rel["edid_index"].get(fid, "")
        if n and edid:
            return f"{n} [{edid}] {fid}"
        elif n:
            return f"{n} {fid}"
        elif edid:
            return f"[{edid}] {fid}"
        return fid

    perk_label = name(perk_id)
    lines = [f"PERK: {perk_label}"]

    entries = rel["perk_entries"].get(perk_id, [])
    if not entries:
        lines.append("  (no entries)")
        return "\n".join(lines)

    for e in sorted(entries, key=lambda x: x.get("rank", 0)):
        etype = e.get("entry_type", "?")

        if etype == "ability":
            ability_id = e.get("ability_form_id", "")
            lines.append(f"\n  Rank {e['rank']} (ABILITY) → SPEL: {name(ability_id)}")
            effects = rel["spell_effects"].get(ability_id, [])
            for eff in effects:
                mgef_id = eff["mgef_form_id"]
                mag_str = f" | Mag:{eff['magnitude']}" if eff["magnitude"] else ""
                dur_str = f" | Dur:{eff['duration']}s" if eff["duration"] else ""
                lines.append(f"    → MGEF: {name(mgef_id)}{mag_str}{dur_str}")
                minfo = rel["mgef_info"].get(mgef_id, {})
                if minfo:
                    lines.append(
                        f"       [{minfo.get('effect_type','?')} | "
                        f"{minfo.get('casting_type','?')} | "
                        f"{minfo.get('delivery','?')}]"
                    )
                for s in rel["vmad_index"].get(mgef_id, []):
                    lines.append(f"       Script: {s['name']}.pex")
                    for prop in s.get("properties", []):
                        val = prop["value"]
                        if val is None:
                            continue
                        if isinstance(val, str) and val.startswith("0x"):
                            lines.append(f"         [{prop['name']}] → {name(val)}")
                        elif isinstance(val, (bool, int, float)):
                            lines.append(f"         [{prop['name']}] = {val}")

        elif etype == "quest":
            qid   = e.get("ability_form_id", "")
            stage = e.get("quest_stage")
            lines.append(
                f"\n  Rank {e['rank']} (QUEST) → QUST: {name(qid)}"
                + (f" Stage {stage}" if stage else "")
            )

        elif etype == "entry_point":
            fn_id   = e.get("ep_function_id", "?")
            fn_name = e.get("ep_function", "?")
            mod_val = e.get("ep_modifier")
            conds   = e.get("conditions", [])
            mod_str = f" → {fn_name} {mod_val}" if mod_val is not None else f" → {fn_name}"
            lines.append(f"\n  Rank {e['rank']} (ENTRY POINT #{fn_id}){mod_str}")
            if conds:
                lines.append(f"    Conditions: {len(conds)} CTDA(s)")
                for c in conds[:3]:
                    p1 = f" param:{c['param1']}" if c.get("param1") else ""
                    lines.append(
                        f"      fn#{c['function_id']} {c['operator']} {c['value']}{p1}"
                    )
            else:
                lines.append(
                    "    No conditions — always active when perk is unlocked.\n"
                    "    To suppress: add CTDA condition here (e.g. GetWornHasKeyword == 0)."
                )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Knowledge vault injection
# ---------------------------------------------------------------------------

def _uid() -> str:
    return "".join(random.choices(_string.ascii_lowercase + _string.digits, k=9))


def _vault_entry(title: str, content: str, tags: list[str]) -> dict:
    return {
        "id":                 f"fo4-graph-v1-{_uid()}",
        "title":              title,
        "content":            content,
        "source":             "fo4-form-graph",
        "creditName":         "Mossy Industries Graph Builder",
        "creditUrl":          "",
        "trustLevel":         "high",
        "tags":               tags,
        "date":               time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status":             "active",
        "shareWithCommunity": False,
    }


def inject_vault(rel: dict, node_names: dict[str, str]) -> int:
    existing: list[dict] = []
    if VAULT_PATH.exists():
        try:
            existing = json.loads(VAULT_PATH.read_text(encoding="utf-8"))
        except Exception:
            existing = []

    existing = [e for e in existing if not e.get("id", "").startswith("fo4-graph")]

    new_entries: list[dict] = []

    # ── 1. COMPLETE PERK CHAINS ────────────────────────────────────────────
    perk_lines: list[str] = [
        "FALLOUT 4 PERK ABILITY CHAINS — traces each perk's Rank N → SPEL → MGEF → Script.",
        "Format: PERK: Name [EditorID] FormID",
        "         Rank N (ability) → SPEL: ...",
        "           → MGEF: ... | Type | Casting | Delivery",
        "              Script: PapyrusScriptName.pex",
        "                [PropertyName] = value or → FormID",
        "Use this to find which script handles a perk's effect, or where to add conditions.",
        "",
    ]
    perk_ids = sorted(rel["perk_entries"].keys())
    for perk_id in perk_ids:
        chain = build_perk_chain_text(perk_id, rel, node_names)
        perk_lines.append(chain)
        perk_lines.append("")

    new_entries.append(_vault_entry(
        "Fallout 4 — Complete Perk Ability Chain Graph",
        "\n".join(perk_lines),
        ["perks", "perk-chains", "spells", "magic-effects", "scripts", "papyrus",
         "vmad", "fo4-graph", "form-relationships", "conditions"],
    ))

    # ── 2. SCRIPT ATTACHMENT INDEX ────────────────────────────────────────
    script_lines: list[str] = [
        "FALLOUT 4 PAPYRUS SCRIPT ATTACHMENTS — all records with VMAD scripts.",
        "Format: [RecordType] Name/EditorID FormID → Script: ScriptName.pex",
        "         [PropertyName (type)] = value",
        "Use this to find which records a specific script is attached to,",
        "or to see what FormIDs a script has bound as properties.",
        "",
    ]
    # Group by script name so you can search "which records use script X"
    script_to_records: dict[str, list[str]] = defaultdict(list)
    for fid, scripts in rel["vmad_index"].items():
        rtype = rel["type_index"].get(fid, "?")
        edid  = rel["edid_index"].get(fid, "")
        label = node_names.get(fid, edid or fid)
        for s in scripts:
            script_to_records[s["name"]].append(
                f"  [{rtype}] {label} ({fid})"
                + (f"\n    Script: {s['name']}.pex" if not label else f"\n    Script: {s['name']}.pex")
                + "".join(
                    f"\n      [{p['name']}] = {p['value']}"
                    if not (isinstance(p['value'], str) and p['value'].startswith("0x"))
                    else f"\n      [{p['name']}] → {node_names.get(p['value'], p['value'])}"
                    for p in s.get("properties", [])
                    if p.get("value") is not None
                )
            )
    for script_name, records in sorted(script_to_records.items()):
        script_lines.append(f"SCRIPT: {script_name}.pex")
        script_lines.extend(records)
        script_lines.append("")

    new_entries.append(_vault_entry(
        "Fallout 4 — Papyrus Script Attachment Index (All Records)",
        "\n".join(script_lines),
        ["scripts", "papyrus", "vmad", "fo4-graph", "script-properties",
         "form-relationships", "pex", "scripting"],
    ))

    # ── 3. CRAFTING RECIPE CHAINS ─────────────────────────────────────────
    recipe_lines: list[str] = [
        "FALLOUT 4 CRAFTING RECIPES (COBJ) — output, workbench, ingredients.",
        "Format: Output [EditorID] FormID × count @ WorkbenchKeyword",
        "         ← Ingredient × count",
        "Use this to find what recipe produces an OMOD (armor/weapon mod),",
        "what items are needed, and which workbench to use.",
        "",
    ]

    def node_label(fid: str) -> str:
        n  = node_names.get(fid, "")
        ed = rel["edid_index"].get(fid, "")
        if n and ed:
            return f"{n} [{ed}] {fid}"
        elif ed:
            return f"[{ed}] {fid}"
        return fid

    for recipe in rel["cobj_recipes"]:
        out_label = node_label(recipe["result_form_id"])
        wb_label  = node_label(recipe.get("workbench_keyword_id") or "")
        count_str = f" x{recipe['result_count']}" if recipe["result_count"] > 1 else ""
        recipe_lines.append(f"OUTPUT: {out_label}{count_str}")
        if wb_label and wb_label != "":
            recipe_lines.append(f"  Workbench: {wb_label}")
        for ing in recipe["ingredients"]:
            ing_label = node_label(ing["form_id"])
            recipe_lines.append(f"  ← {ing_label} x{ing['count']}")
        recipe_lines.append("")

    new_entries.append(_vault_entry(
        "Fallout 4 — All Crafting Recipe Chains (COBJ → Output + Ingredients)",
        "\n".join(recipe_lines),
        ["crafting", "recipes", "cobj", "omod", "armor-mods", "weapon-mods",
         "fo4-graph", "form-relationships", "workbench", "ingredients"],
    ))

    # ── 4. MGEF EFFECT TYPE INDEX ─────────────────────────────────────────
    mgef_lines: list[str] = [
        "FALLOUT 4 MAGIC EFFECT TYPES — categorized by effect type and delivery.",
        "Format: Name [EditorID] FormID | Type | Casting | Delivery | Hostile",
        "Particularly useful for finding Script-type effects (type = 'Script')",
        "which have Papyrus code controlling their behavior.",
        "",
    ]
    by_type: dict[str, list[str]] = defaultdict(list)
    for fid, info in rel["mgef_info"].items():
        etype = info.get("effect_type", "Unknown")
        label = node_label(fid)
        cast  = info.get("casting_type", "?")
        deliv = info.get("delivery", "?")
        hst   = " [HOSTILE]" if info.get("hostile") else ""
        scripts = info.get("scripts", [])
        script_str = f" → {', '.join(s['name'] + '.pex' for s in scripts)}" if scripts else ""
        by_type[etype].append(f"  {label} | {cast} | {deliv}{hst}{script_str}")

    for etype, records in sorted(by_type.items()):
        mgef_lines.append(f"=== {etype} ({len(records)}) ===")
        mgef_lines.extend(records[:200])
        if len(records) > 200:
            mgef_lines.append(f"  ... +{len(records) - 200} more")
        mgef_lines.append("")

    new_entries.append(_vault_entry(
        "Fallout 4 — Magic Effect (MGEF) Type & Behavior Index",
        "\n".join(mgef_lines),
        ["magic-effects", "mgef", "effect-types", "script", "fo4-graph",
         "form-relationships", "combat", "abilities", "delivery"],
    ))

    merged = existing + new_entries
    VAULT_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    return len(new_entries)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    t0 = time.time()

    # Load node names from existing scan
    node_names: dict[str, str] = {}
    if STRINGS_JSON.exists():
        try:
            raw = json.loads(STRINGS_JSON.read_text(encoding="utf-8"))
            indexed: dict = raw.get("indexed", {})
            for cat_entries in indexed.values():
                for e in cat_entries:
                    fid = e.get("form_id", "")
                    name = e.get("name", "") or e.get("edid", "")
                    if fid and name:
                        node_names[fid] = name
            print(f"Loaded {len(node_names):,} node names from {STRINGS_JSON.name}")
        except Exception as ex:
            print(f"Warning: could not load string data: {ex}")
    else:
        print(f"Warning: {STRINGS_JSON} not found — run fo4_strings_scan.py first")

    # Walk all ESMs
    all_results = []
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for relationships...")
        all_results.append(extract_relationships(esm_path))

    print("Merging results...")
    rel = merge_relationships(all_results)

    # Build referenced_by index
    print("Building reverse reference index...")
    ref_by = build_referenced_by(rel)

    # Stats
    perk_count   = len(rel["perk_entries"])
    spell_count  = len(rel["spell_effects"])
    mgef_count   = len(rel["mgef_info"])
    vmad_count   = len(rel["vmad_index"])
    recipe_count = len(rel["cobj_recipes"])
    kw_count     = len(rel["keyword_members"])
    ref_by_count = len(ref_by)

    print(f"\n=== Relationship extraction complete ===")
    print(f"  Perks with ability entries:  {perk_count:,}")
    print(f"  Spells with effects:         {spell_count:,}")
    print(f"  MGEF records parsed:         {mgef_count:,}")
    print(f"  Records with VMAD scripts:   {vmad_count:,}")
    print(f"  Crafting recipes:            {recipe_count:,}")
    print(f"  Keyword cross-refs:          {kw_count:,}")
    print(f"  Referenced-by index entries: {ref_by_count:,}")

    # Pre-build perk chain texts for brain neuron injection
    print("Building perk chain texts...")
    perk_chain_texts: dict[str, str] = {}
    for perk_id in rel["perk_entries"]:
        try:
            perk_chain_texts[perk_id] = build_perk_chain_text(perk_id, rel, node_names)
        except Exception:
            pass

    # Save graph
    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    graph = {
        "generated_at":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "perk_entries":    rel["perk_entries"],
        "spell_effects":   rel["spell_effects"],
        "mgef_info":       rel["mgef_info"],
        "vmad_index":      rel["vmad_index"],
        "cobj_recipes":    rel["cobj_recipes"],
        "keyword_members": rel["keyword_members"],
        "edid_index":      rel["edid_index"],
        "type_index":      rel["type_index"],
        "referenced_by":   ref_by,
        "perk_chain_texts": perk_chain_texts,
    }
    GRAPH_OUT.write_text(json.dumps(graph, indent=2, ensure_ascii=False), encoding="utf-8")
    json_mb = GRAPH_OUT.stat().st_size / 1024 / 1024
    print(f"\nSaved:    {GRAPH_OUT}  ({json_mb:.1f} MB)")

    # Inject vault entries
    print("Injecting vault entries...")
    added = inject_vault(rel, node_names)
    print(f"Added {added} vault entries")

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s")

    # Print a demo: trace DemolitionExpert02 perk chain
    demo_perk = next(
        (fid for fid, edid in rel["edid_index"].items()
         if "demolitionexpert02" in edid.lower()),
        None
    )
    if demo_perk:
        chain = build_perk_chain_text(demo_perk, rel, node_names)
        # Safe ASCII output for Windows console
        safe = chain.encode("ascii", errors="replace").decode("ascii")
        print("\n--- DemolitionExpert02 chain ---")
        print(safe)


if __name__ == "__main__":
    main()
