#!/usr/bin/env python3
"""
fo4_combat_styles.py — FO4 Combat Style (CSTY) behavioral data
========================================================================
First of the "grind it to zero" pass through every remaining FO4 record
type after TERM/SCEN/FACT/RACE, working top-down by modding relevance.
Combat Style is the record that actually drives how an NPC fights —
offense/defense multipliers, melee bash/stagger behavior, dueling/
flanking/charging tactics, ranged accuracy, flight combat (for flying
creatures), and dual-wielding eligibility. Every NPC references exactly
one CSTY via its Combat Style field (not yet itself decoded on the NPC_
side, since fo4_actor_and_combat_stats.py focused on ACBS/DNAM/CRDT/
FNAM combat stats rather than AI behavior tuning).

CSTY is the most tractable record type decoded so far in this project:
verified against the authoritative xEdit/FO4Edit Pascal source
(wbDefinitionsFO4.pas, ~lines 9260-9330), every subrecord tag is used
exactly once, every struct is fixed-size, and there is no repeating
group anywhere in the record -- no positional ambiguity, no marker
toggling, nothing to guess at.

Record layout (source-verified, all fixed-size, all unique tags):
  EDID, CSGD (General: 12 floats -- Offensive/Defensive/Group Offensive
    Mult, 6 Equipment Score Mults by weapon category, Avoid/Dodge/Evade
    Threat Chance), CSMD (completely undocumented even in xEdit itself
    -- wbUnknown -- captured as raw hex, not interpreted), CSME (Melee:
    10 floats -- stagger/bash/power-attack multipliers), CSRA (Ranged
    Accuracy Mult, 1 float), CSCR (Close Range: 9 floats + Charging -
    Throw Max Targets u32 + 1 float -- dueling/flanking/charging
    tactics), CSLR (Long Range: 5 floats -- strafe/range/crouch
    behavior), CSCV (Cover Search Distance Mult, 1 float), CSFL
    (Flight: 8 floats -- hover/dive-bomb/perch-attack behavior for
    flying creatures), DATA (Flags, u32: Dueling/Flanking/Allow Dual
    Wielding/Charging/Retarget Any Nearby Melee Target).

Outputs:
  <scan-cache>/fo4_combat_styles.json
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
GRAPH_OUT = _OUT_DIR / "fo4_combat_styles.json"

COMPRESSED_FLAG = 0x00040000

CSTY_DATA_FLAGS = [
    (0x01, "Dueling"), (0x02, "Flanking"), (0x04, "Allow Dual Wielding"),
    (0x08, "Charging"), (0x10, "Retarget Any Nearby Melee Target"),
]

CSGD_FIELDS = ["offensive_mult", "defensive_mult", "group_offensive_mult",
               "equip_score_mult_melee", "equip_score_mult_magic", "equip_score_mult_ranged",
               "equip_score_mult_shout", "equip_score_mult_unarmed", "equip_score_mult_staff",
               "avoid_threat_chance", "dodge_threat_chance", "evade_threat_chance"]
CSME_FIELDS = ["attack_staggered_mult", "power_attack_staggered_mult", "power_attack_blocking_mult",
               "bash_mult", "bash_recoil_mult", "bash_attack_mult", "bash_power_attack_mult",
               "special_attack_mult", "block_when_staggered_mult", "attack_when_staggered_mult"]
CSLR_FIELDS = ["strafe_mult", "adjust_range_mult", "crouch_mult", "wait_mult", "range_mult"]
CSFL_FIELDS = ["hover_chance", "dive_bomb_chance", "ground_attack_chance", "hover_time",
               "ground_attack_time", "perch_attack_chance", "perch_attack_time", "flying_attack_chance"]


def _decode_flags_bitfield(value: int, table) -> list[str]:
    return [name for bit, name in table if value & bit]


def _floats(d: bytes, names: list[str]) -> dict | None:
    n = len(names)
    if len(d) < n * 4:
        return None
    try:
        vals = struct.unpack_from(f"<{n}f", d, 0)
        return {name: round(v, 4) for name, v in zip(names, vals)}
    except struct.error:
        return None


def parse_cscr(d: bytes) -> dict | None:
    if len(d) < 44:
        return None
    try:
        names9 = ["dueling_circle_mult", "dueling_fallback_mult", "flanking_flank_distance",
                  "flanking_stalk_time", "charging_charge_distance", "charging_throw_probability",
                  "charging_sprint_fast_probability", "charging_sideswipe_probability",
                  "charging_disengage_probability"]
        vals9 = struct.unpack_from("<9f", d, 0)
        out = {name: round(v, 4) for name, v in zip(names9, vals9)}
        out["charging_throw_max_targets"] = struct.unpack_from("<I", d, 36)[0]
        out["flanking_flank_variance"] = round(struct.unpack_from("<f", d, 40)[0], 4)
        return out
    except struct.error:
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


def resolve_edid(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("ascii", errors="replace").strip()
        return text if text else None
    except Exception:
        return None


def _extract_one_style(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    general = melee = close_range = long_range = flight = None
    ranged_accuracy_mult = None
    cover_search_distance_mult = None
    unknown_csmd: str | None = None
    flags_raw: int | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "CSGD":
            general = _floats(d, CSGD_FIELDS)
        elif tag == "CSMD":
            unknown_csmd = d.hex()
        elif tag == "CSME":
            melee = _floats(d, CSME_FIELDS)
        elif tag == "CSRA" and len(d) == 4:
            ranged_accuracy_mult = round(struct.unpack_from("<f", d, 0)[0], 4)
        elif tag == "CSCR":
            close_range = parse_cscr(d)
        elif tag == "CSLR":
            long_range = _floats(d, CSLR_FIELDS)
        elif tag == "CSCV" and len(d) == 4:
            cover_search_distance_mult = round(struct.unpack_from("<f", d, 0)[0], 4)
        elif tag == "CSFL":
            flight = _floats(d, CSFL_FIELDS)
        elif tag == "DATA" and len(d) == 4:
            flags_raw = struct.unpack_from("<I", d, 0)[0]

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "flags": _decode_flags_bitfield(flags_raw, CSTY_DATA_FLAGS) if flags_raw is not None else [],
        "general": general,
        "melee": melee,
        "ranged_accuracy_mult": ranged_accuracy_mult,
        "close_range": close_range,
        "long_range": long_range,
        "cover_search_distance_mult": cover_search_distance_mult,
        "flight": flight,
        "unknown_csmd": unknown_csmd,
    }


def extract_combat_styles(esm_path: Path) -> list[dict]:
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
        if rec_type == b"CSTY":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                s = _extract_one_style(dec, form_id)
                if s is not None:
                    out.append(s)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_styles: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for combat styles...")
        all_styles.extend(extract_combat_styles(esm_path))

    with_flight = [s for s in all_styles if s["flight"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_combat_styles": len(all_styles),
        "combat_styles_with_flight_data": len(with_flight),
        "combat_styles": all_styles,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Combat style scan complete in {elapsed:.1f}s ===")
    print(f"  Total combat styles:  {len(all_styles):,}")
    print(f"  With flight data:     {len(with_flight):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
