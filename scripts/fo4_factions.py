#!/usr/bin/env python3
"""
fo4_factions.py — FO4 Faction (FACT) behavioral data
========================================================================
Third of the three record types Billy asked to start on after the full
record-type inventory audit ("terminal menu structures, scene/companion
dialogue actions, deeper faction/race behavioral data"). Factions were
previously only name-indexed; this decodes the actual behavioral data
that drives crime/combat/vendor mechanics for every faction in the game
(the Institute, the Minutemen, Diamond City Security, every raider gang,
every settlement's ownership faction, etc.).

Unlike SCEN, FACT has almost no subrecord-tag reuse/ambiguity — every
tag maps to exactly one meaning, verified against the authoritative
xEdit/FO4Edit Pascal source (wbDefinitionsFO4.pas, ~lines 9807-9877).
The only repeating groups are Relations (XNAM, one packed 12-byte struct
per subrecord: target Faction/Race FormID + Modifier s32 + Group Combat
Reaction u32 enum) and Ranks (RNAM u32 Rank# unambiguously starts each
new entry, followed by optional MNAM/FNAM male/female title lstrings
and an unused INAM insignia string).

Record layout (source-verified):
  EDID, FULL (name), Relations (repeated XNAM, 12 bytes each: Faction
    FormID + Modifier s32 + Group Combat Reaction enum), DATA (Flags,
    a single u32 flags field covering crime tracking / vendor / owner
    eligibility), JAIL/WAIT/STOL/PLCN (REFR formids: exterior jail
    marker, follower wait marker, stolen-goods container, player
    inventory container), CRGR (Shared Crime Faction List, FLST formid),
    JOUT (Jail Outfit, OTFT formid), CRVA (Crime Values: Arrest bool,
    Attack On Sight bool, Murder/Assault/Trespass/Pickpocket/Escape
    bounty u16 each, Steal Multiplier f32 -- length-checked since older
    records may predate the trailing Escape/Werewolf fields), Ranks
    (repeated group keyed by RNAM), VEND (Vendor Buy/Sell List, FLST
    formid), VENC (Merchant Container, REFR formid), VENV (Vendor
    Values: Start/End Hour u16, Radius u16, 2 unknown bytes, Buys
    Stolen/Buy-Sell-Everything/Buys-NonStolen bool bytes, 1 unknown
    byte -- 12 bytes), PLVD (a Location struct -- the exact same
    16-byte PLDT-family struct already verified for PACK's location
    data in fo4_package_procedures.py, reused verbatim), CITC + 0+ CTDA
    (top-level Conditions, with the CIS1/CIS2 trailing-string handling
    proven necessary during the SCEN build applied here too).

Outputs:
  <scan-cache>/fo4_factions.json
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
GRAPH_OUT = _OUT_DIR / "fo4_factions.json"

COMPRESSED_FLAG = 0x00040000

FACTION_DATA_FLAGS = [
    (0x00000001, "Hidden From NPC"), (0x00000002, "Special Combat"),
    (0x00000040, "Track Crime"), (0x00000080, "Ignore Crimes: Murder"),
    (0x00000100, "Ignore Crimes: Assault"), (0x00000200, "Ignore Crimes: Stealing"),
    (0x00000400, "Ignore Crimes: Trespass"), (0x00000800, "Do Not Report Crimes Against Members"),
    (0x00001000, "Crime Gold - Use Defaults"), (0x00002000, "Ignore Crimes: Pickpocket"),
    (0x00004000, "Vendor"), (0x00008000, "Can Be Owner"),
    (0x00010000, "Ignore Crimes: Werewolf (unused)"),
]
GROUP_COMBAT_REACTION = {0x01: "Neutral", 0x02: "Enemy", 0x04: "Ally", 0x08: "Friend"}

CTDA_COMPARE_OPS = ["Equal to", "Not equal to", "Greater than", "Greater than or equal to",
                    "Less than", "Less than or equal to"]
CTDA_FLAGS = [
    (0x01, "Or"), (0x02, "Use aliases"), (0x04, "Use global"),
    (0x08, "Use packdata"), (0x10, "Swap Subject and Target"),
]
CTDA_RUN_ON = {0: "Subject", 1: "Target", 2: "Reference", 3: "Combat Target",
               4: "Linked Reference", 5: "Quest Alias", 6: "Package Data",
               7: "Event Data", 9: "Command Target", 10: "Event Camera Ref", 11: "My Killer"}

PLVD_TYPE = {0: "Reference", 1: "Cell", 2: "Near Package Start Location", 3: "Near Editor Location",
             4: "Object ID", 5: "Object Type", 6: "Keyword", 8: "Ref Alias", 9: "Loc Alias",
             10: "Interrupt Data", 11: "Packdata Target", 14: "Ref Collection Alias"}


def _decode_flags_bitfield(value: int, table) -> list[str]:
    return [name for bit, name in table if value & bit]


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 32:
        return None
    try:
        type_byte = d[0]
        flags = _decode_flags_bitfield(type_byte & 0x1F, CTDA_FLAGS)
        op_idx = (type_byte >> 5) & 0x07
        op = CTDA_COMPARE_OPS[op_idx] if op_idx < 6 else f"unknown_{op_idx}"
        use_global = bool(type_byte & 0x04)
        comp_raw = struct.unpack_from("<I", d, 4)[0]
        comp_float = round(struct.unpack_from("<f", d, 4)[0], 4)
        function_id = struct.unpack_from("<H", d, 8)[0]
        run_on = struct.unpack_from("<I", d, 20)[0]
        reference = struct.unpack_from("<I", d, 24)[0]
        param3 = struct.unpack_from("<i", d, 28)[0]
        return {
            "compare_operator": op, "flags": flags,
            "comparison_value": (f"0x{comp_raw:08X}" if use_global else comp_float),
            "function_id": function_id,
            "run_on": CTDA_RUN_ON.get(run_on, f"unknown_{run_on}"),
            "reference": f"0x{reference:08X}" if reference else None,
            "param3": param3,
        }
    except (struct.error, IndexError):
        return None


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


def parse_plvd(d: bytes) -> dict | None:
    """Location struct — identical 16-byte layout to PACK's PLDT, verified
    against real data in fo4_package_procedures.py, reused verbatim here."""
    if len(d) < 16:
        return None
    try:
        t = struct.unpack_from("<i", d, 0)[0]
        raw_val = struct.unpack_from("<I", d, 4)[0]
        radius = struct.unpack_from("<i", d, 8)[0]
        coll_idx = struct.unpack_from("<I", d, 12)[0]
        return {
            "type": PLVD_TYPE.get(t, f"unknown_{t}"),
            "value_raw": f"0x{raw_val:08X}" if raw_val else raw_val,
            "radius": radius,
            "collection_index": coll_idx,
        }
    except (struct.error, IndexError):
        return None


def parse_crva(d: bytes) -> dict | None:
    if len(d) < 16:
        return None
    try:
        out = {
            "arrest": bool(d[0]),
            "attack_on_sight": bool(d[1]),
            "murder": struct.unpack_from("<H", d, 2)[0],
            "assault": struct.unpack_from("<H", d, 4)[0],
            "trespass": struct.unpack_from("<H", d, 6)[0],
            "pickpocket": struct.unpack_from("<H", d, 8)[0],
            "steal_multiplier": round(struct.unpack_from("<f", d, 12)[0], 3) if len(d) >= 16 else None,
        }
        # Fields beyond the 16-byte core (Unused u16 at offset 10 precedes
        # the float at 12, so steal_multiplier already accounts for it).
        if len(d) >= 20:
            out["escape"] = struct.unpack_from("<H", d, 16)[0]
        if len(d) >= 22:
            out["werewolf_unused"] = struct.unpack_from("<H", d, 18)[0]
        return out
    except (struct.error, IndexError):
        return None


def parse_venv(d: bytes) -> dict | None:
    if len(d) < 12:
        return None
    try:
        return {
            "start_hour": struct.unpack_from("<H", d, 0)[0],
            "end_hour": struct.unpack_from("<H", d, 2)[0],
            "radius": struct.unpack_from("<H", d, 4)[0],
            "buys_stolen_items": bool(d[8]),
            "buy_sell_everything_not_in_list": bool(d[9]),
            "buys_non_stolen_items": bool(d[10]),
        }
    except (struct.error, IndexError):
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


def _extract_one_faction(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    subs = scan_subs_ordered(dec)

    edid: str | None = None
    full: str | None = None
    relations: list[dict] = []
    flags_raw: int | None = None
    jail = wait = stol = plcn = crgr = jout = vend = venc = None
    crva = None
    venv = None
    plvd = None
    ranks: list[dict] = []
    cur_rank: dict | None = None
    conditions: list[dict] = []
    last_ctda: dict | None = None

    def flush_rank():
        nonlocal cur_rank
        if cur_rank is not None:
            ranks.append(cur_rank)
            cur_rank = None

    for tag_b, d in subs:
        tag = tag_b.decode("ascii", errors="replace")

        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "XNAM" and len(d) == 12:
            relations.append({
                "faction_or_race": fid_hex(d[0:4]),
                "modifier": struct.unpack_from("<i", d, 4)[0],
                "group_combat_reaction": GROUP_COMBAT_REACTION.get(
                    struct.unpack_from("<I", d, 8)[0], f"unknown_{struct.unpack_from('<I', d, 8)[0]}"),
            })
        elif tag == "DATA" and len(d) >= 4:
            flags_raw = struct.unpack_from("<I", d, 0)[0]
        elif tag == "JAIL":
            jail = fid_hex(d)
        elif tag == "WAIT":
            wait = fid_hex(d)
        elif tag == "STOL":
            stol = fid_hex(d)
        elif tag == "PLCN":
            plcn = fid_hex(d)
        elif tag == "CRGR":
            crgr = fid_hex(d)
        elif tag == "JOUT":
            jout = fid_hex(d)
        elif tag == "CRVA":
            crva = parse_crva(d)
        elif tag == "RNAM" and len(d) == 4:
            flush_rank()
            cur_rank = {"rank": struct.unpack_from("<I", d, 0)[0], "male_title": None,
                        "female_title": None, "insignia": None}
        elif tag == "MNAM" and cur_rank is not None:
            cur_rank["male_title"] = resolve_lstring(d, string_lookup)
        elif tag == "FNAM" and cur_rank is not None:
            cur_rank["female_title"] = resolve_lstring(d, string_lookup)
        elif tag == "INAM" and cur_rank is not None:
            cur_rank["insignia"] = resolve_edid(d)
        elif tag == "VEND":
            flush_rank()
            vend = fid_hex(d)
        elif tag == "VENC":
            venc = fid_hex(d)
        elif tag == "VENV":
            venv = parse_venv(d)
        elif tag == "PLVD":
            plvd = parse_plvd(d)
        elif tag == "CTDA":
            c = parse_ctda(d)
            last_ctda = c
            if c is not None:
                conditions.append(c)
        elif tag == "CIS1" and last_ctda is not None:
            last_ctda["parameter1_string"] = resolve_edid(d)
        elif tag == "CIS2" and last_ctda is not None:
            last_ctda["parameter2_string"] = resolve_edid(d)

    flush_rank()

    if not (edid or full or relations or ranks):
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "flags": _decode_flags_bitfield(flags_raw, FACTION_DATA_FLAGS) if flags_raw is not None else [],
        "relations": relations,
        "crime_values": crva,
        "jail_marker": jail,
        "follower_wait_marker": wait,
        "stolen_goods_container": stol,
        "player_inventory_container": plcn,
        "shared_crime_faction_list": crgr,
        "jail_outfit": jout,
        "ranks": ranks,
        "vendor_buy_sell_list": vend,
        "merchant_container": venc,
        "vendor_values": venv,
        "location": plvd,
        "conditions": conditions,
    }


def extract_factions(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"FACT":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                f = _extract_one_faction(dec, form_id, string_lookup)
                if f is not None:
                    out.append(f)
        pos += data_size

    return out


def main():
    t0 = time.time()
    # FULL / rank titles are lstrings but Interface.ba2 alone (already
    # proven insufficient for TERM's body/response text) is unlikely to
    # carry them either; resolve_lstring falls back to inline text when
    # present and returns None for unresolved string IDs rather than
    # guessing, matching the same honest-gap handling used in fo4_terminals.py.
    string_lookup: dict[int, str] = {}

    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_factions: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for factions...")
        all_factions.extend(extract_factions(esm_path, string_lookup))

    with_relations = [f for f in all_factions if f["relations"]]
    with_ranks = [f for f in all_factions if f["ranks"]]
    with_crime = [f for f in all_factions if "Track Crime" in f["flags"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_factions": len(all_factions),
        "factions_with_relations": len(with_relations),
        "factions_with_ranks": len(with_ranks),
        "factions_tracking_crime": len(with_crime),
        "factions": all_factions,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Faction scan complete in {elapsed:.1f}s ===")
    print(f"  Total factions:       {len(all_factions):,}")
    print(f"  With relations:       {len(with_relations):,}")
    print(f"  With ranks:           {len(with_ranks):,}")
    print(f"  Tracking crime:       {len(with_crime):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
