#!/usr/bin/env python3
"""
fo4_races.py — FO4 Race (RACE) behavioral data
========================================================================
Fourth of the record types Billy asked to start on after the full
record-type inventory audit ("terminal menu structures, scene/companion
dialogue actions, deeper faction/race behavioral data"). Races were
previously only name-indexed; this decodes the core behavioral stats
that distinguish HumanRace from GhoulRace from SupermutantRace from
every creature race in the game (height/weight, combat & AI behavior
flags, biped object assignments, XP value, limb-severing/explosion
debris data, racial abilities, base movement types, and unarmed/voice
assignments).

RACE is the largest and most tag-reuse-heavy record type this project
has decoded (verified against the authoritative xEdit/FO4Edit Pascal
source, wbDefinitionsFO4.pas, ~lines 14023-14300) — tags like MNAM,
FNAM, NAM0, NAM2, ANAM are each reused 2-4+ times across the record
for completely different structures (Male/Female Body Data markers,
Male/Female Behavior Graph markers, Male/Female Head Data markers,
Male/Female skeletal model strings, a Collar TextureSet formid, a
"Marker NAM2" empty marker...), and several of those sections are
themselves deeply nested repeating groups (per-bone body part lists,
tint/morph/face-detail lists, subgraph animation data). Decoding all
of that safely is its own multi-day effort in the same category as
SCEN's Actions or PACK's procedure tree.

Given that, this first pass uses a WHITELIST-ONLY dispatch: every tag it
assigns to an output field is individually verified from source to have
exactly one meaning across the entire RACE record, and every other tag
-- including every genuinely reused/ambiguous one (MNAM, FNAM, NAM0,
NAM1, NAM2, NAM3, ANAM, and the deeply-nested body part / behavior
graph / head / face / morph / tint / subgraph sections that use them)
-- is silently skipped rather than guessed at. This is safe regardless
of where those ambiguous sections fall in the byte stream (an earlier
draft of this scanner assumed they only appeared after everything it
wanted to capture, which turned out to be false -- the Male/Female
skeletal-model markers and Movement Type Names sit BETWEEN DATA and
ATKR, not after -- so the whitelist approach replaced a "stop at the
first ambiguous tag" approach that would have truncated most of this
scanner's real coverage; caught and fixed before shipping, not guessed
past). Decoded here: EDID, STCP (Animation Sound), FULL, DESC, SPCT +
repeated SPLO (racial abilities), WNAM (Skin), BOD2 (Biped Body
Template flags), KSIZ+KWDA (Keywords, reusing the parser already
proven in fo4_form_graph.py), the single large fixed-size DATA struct
(200 bytes, hand-computed field-by-field from source -- Male/Female
Height & 3-point Default Weight, both behavior Flags bitfields,
Acceleration/Deceleration Rate, Size class, Injured Health Pct,
Shield/Beard/Body/Pipboy Biped Object slots, Aim Angle Tolerance,
Flight Radius, Angular Acceleration/Tolerance, XP Value, full
Severable/Explodable/OnCripple debris & decal data, Orientation
Limits), VTCK (Voices: Male+Female formids), HCLF (Default Hair
Colors), TINL/PNAM/UNAM (FaceGen tint/clamp data), ATKR (Attack Race),
GNAM (Body Part Data), NAM4/NAM5/NAM7 (Impact Material/DataSet/
Dismember Blood Art), CNAM (Meat Cap TextureSet), ONAM/LNAM (Open/
Close Corpse sounds), VNAM (Equipment Flags), UNWP (Unarmed Weapon),
WKMV/SWMV/FLMV/SNMV (base movement type defaults), NAM8/RNAM/SRAC/
SADD (Morph/Armor/Subgraph Template/Subgraph Additive race links),
QSTI (Dialogue Quest).

Explicit, documented gap -- NOT decoded here: Male/Female skeletal
models, body part lists (per-bone NIF assignments), behavior graphs,
movement type overrides, equip slots, phoneme target names, head/face/
morph/tint data, and subgraph animation data. These require the same
marker-toggle state machine care SCEN's Phases got, and are a
follow-up pass rather than something to guess at here.

Outputs:
  <scan-cache>/fo4_races.json
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
GRAPH_OUT = _OUT_DIR / "fo4_races.json"

COMPRESSED_FLAG = 0x00040000

RACE_FLAGS = [
    (0x00000001, "Playable"), (0x00000002, "FaceGen Head"), (0x00000004, "Child"),
    (0x00000040, "Swims"), (0x00000080, "Flies"), (0x00000100, "Walks"),
    (0x00000200, "Immobile"), (0x00000400, "Not Pushable"),
    (0x00008000, "Uses Head Track Anims"), (0x00100000, "Can't Open Doors"),
    (0x00200000, "Allow PC Dialogue"), (0x00400000, "No Knockdowns"),
    (0x00800000, "Allow Pickpocket"), (0x10000000, "Can Pickup Items"),
    (0x40000000, "Can Dual Wield"), (0x80000000, "Avoids Roads"),
]
RACE_FLAGS2 = [
    (0x00000002, "Non-Hostile"), (0x00000004, "Floats"), (0x00000200, "Ungendered"),
    (0x00040000, "Has Facial Rig"), (0x00100000, "Use Quadruped Controller"),
]
RACE_SIZE = {0: "Small", 1: "Medium", 2: "Large", 3: "Extra Large"}


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


def parse_kwda(kwda: bytes) -> list[str]:
    return [f"0x{struct.unpack_from('<I', kwda, i * 4)[0]:08X}" for i in range(len(kwda) // 4)]


# ---------------------------------------------------------------------------
# RACE DATA struct (200 bytes, hand-computed from source field list --
# see module docstring for the field list this offset table implements).
# ---------------------------------------------------------------------------

def parse_race_data(d: bytes) -> dict | None:
    if len(d) < 200:
        return None
    try:
        flags_raw = struct.unpack_from("<I", d, 32)[0]
        flags2_raw = struct.unpack_from("<I", d, 88)[0]
        return {
            "male_height": round(struct.unpack_from("<f", d, 0)[0], 4),
            "female_height": round(struct.unpack_from("<f", d, 4)[0], 4),
            "male_default_weight": {
                "thin": round(struct.unpack_from("<f", d, 8)[0], 3),
                "muscular": round(struct.unpack_from("<f", d, 12)[0], 3),
                "fat": round(struct.unpack_from("<f", d, 16)[0], 3),
            },
            "female_default_weight": {
                "thin": round(struct.unpack_from("<f", d, 20)[0], 3),
                "muscular": round(struct.unpack_from("<f", d, 24)[0], 3),
                "fat": round(struct.unpack_from("<f", d, 28)[0], 3),
            },
            "flags": _decode_flags_bitfield(flags_raw, RACE_FLAGS),
            "acceleration_rate": round(struct.unpack_from("<f", d, 36)[0], 4),
            "deceleration_rate": round(struct.unpack_from("<f", d, 40)[0], 4),
            "size": RACE_SIZE.get(struct.unpack_from("<I", d, 44)[0], f"unknown_{struct.unpack_from('<I', d, 44)[0]}"),
            "injured_health_pct": round(struct.unpack_from("<f", d, 56)[0], 4),
            "shield_biped_object": struct.unpack_from("<i", d, 60)[0],
            "beard_biped_object": struct.unpack_from("<i", d, 64)[0],
            "body_biped_object": struct.unpack_from("<i", d, 68)[0],
            "aim_angle_tolerance": round(struct.unpack_from("<f", d, 72)[0], 4),
            "flight_radius": round(struct.unpack_from("<f", d, 76)[0], 4),
            "angular_acceleration_rate": round(struct.unpack_from("<f", d, 80)[0], 4),
            "angular_tolerance": round(struct.unpack_from("<f", d, 84)[0], 4),
            "flags2": _decode_flags_bitfield(flags2_raw, RACE_FLAGS2),
            "pipboy_biped_object": struct.unpack_from("<i", d, 128)[0],
            "xp_value": struct.unpack_from("<h", d, 132)[0],
            "severable": {
                "debris_scale": round(struct.unpack_from("<f", d, 134)[0], 4),
                "debris_count": d[138], "decal_count": d[139],
                "explosion": fid_hex(d[146:150]), "debris": fid_hex(d[150:154]),
                "impact_dataset": fid_hex(d[154:158]),
            },
            "explodable": {
                "debris_scale": round(struct.unpack_from("<f", d, 140)[0], 4),
                "debris_count": d[144], "decal_count": d[145],
                "explosion": fid_hex(d[158:162]), "debris": fid_hex(d[162:166]),
                "impact_dataset": fid_hex(d[166:170]),
                "subsegment_explosion": fid_hex(d[188:192]),
            },
            "on_cripple": {
                "debris_scale": round(struct.unpack_from("<f", d, 170)[0], 4),
                "debris_count": d[174], "decal_count": d[175],
                "explosion": fid_hex(d[176:180]), "debris": fid_hex(d[180:184]),
                "impact_dataset": fid_hex(d[184:188]),
            },
            "orientation_limits": {
                "pitch": round(struct.unpack_from("<f", d, 192)[0], 4),
                "roll": round(struct.unpack_from("<f", d, 196)[0], 4),
            },
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


def _extract_one_race(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    # Whitelist-only dispatch: every tag handled below is verified from
    # source to have exactly ONE meaning across the entire RACE record
    # (no other subrecord list entry uses the same tag for something
    # else). Any tag NOT in this whitelist is silently skipped rather
    # than guessed at -- this includes every genuinely reused/ambiguous
    # tag (MNAM, FNAM, NAM0, NAM1, NAM2, NAM3, ANAM, PNAM is safe/kept
    # since it's single-meaning; see module docstring) and every tag
    # belonging to the deferred sections (skeletal models, body part
    # lists, behavior graphs, head/face/morph/tint/subgraph data). This
    # avoids the earlier draft's bug of assuming those sections only
    # appear AFTER the fields captured here -- several (Male/Female
    # Marker + skeletal model, Movement Type Names) actually sit BETWEEN
    # DATA and ATKR, so a "stop at the first ambiguous tag" approach
    # would have silently truncated most of this scanner's real coverage.
    edid: str | None = None
    full: str | None = None
    desc: str | None = None
    anim_sound: str | None = None
    actor_effects: list[str] = []
    skin: str | None = None
    biped_first_person_flags: int | None = None
    keywords: list[str] = []
    data: dict | None = None
    voices: dict | None = None
    default_hair_colors: dict | None = None
    total_tints: int | None = None
    facegen_main_clamp: float | None = None
    facegen_face_clamp: float | None = None
    attack_race: str | None = None
    body_part_data: str | None = None
    impact_material_type: str | None = None
    impact_data_set: str | None = None
    dismember_blood_art: str | None = None
    meat_cap_textureset: str | None = None
    sound_open_corpse: str | None = None
    sound_close_corpse: str | None = None
    equipment_flags: int | None = None
    unarmed_weapon: str | None = None
    base_movement_default: str | None = None
    base_movement_swim: str | None = None
    base_movement_fly: str | None = None
    base_movement_sneak: str | None = None
    morph_race: str | None = None
    armor_race: str | None = None
    subgraph_template_race: str | None = None
    subgraph_additive_race: str | None = None
    dialogue_quest: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "STCP":
            anim_sound = fid_hex(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "DESC":
            desc = resolve_lstring(d, string_lookup)
        elif tag == "SPLO":
            fv = fid_hex(d)
            if fv:
                actor_effects.append(fv)
        elif tag == "WNAM":
            skin = fid_hex(d)
        elif tag == "BOD2" and len(d) == 4:
            biped_first_person_flags = struct.unpack_from("<I", d, 0)[0]
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "DATA":
            data = parse_race_data(d)
        elif tag == "VTCK" and len(d) == 8:
            voices = {"male": fid_hex(d[0:4]), "female": fid_hex(d[4:8])}
        elif tag == "HCLF" and len(d) == 8:
            default_hair_colors = {"male": fid_hex(d[0:4]), "female": fid_hex(d[4:8])}
        elif tag == "TINL" and len(d) == 2:
            total_tints = struct.unpack_from("<H", d, 0)[0]
        elif tag == "PNAM" and len(d) == 4:
            facegen_main_clamp = round(struct.unpack_from("<f", d, 0)[0], 4)
        elif tag == "UNAM" and len(d) == 4:
            facegen_face_clamp = round(struct.unpack_from("<f", d, 0)[0], 4)
        elif tag == "ATKR":
            attack_race = fid_hex(d)
        elif tag == "GNAM":
            body_part_data = fid_hex(d)
        elif tag == "NAM4":
            impact_material_type = fid_hex(d)
        elif tag == "NAM5":
            impact_data_set = fid_hex(d)
        elif tag == "NAM7":
            dismember_blood_art = fid_hex(d)
        elif tag == "CNAM":
            meat_cap_textureset = fid_hex(d)
        elif tag == "ONAM":
            sound_open_corpse = fid_hex(d)
        elif tag == "LNAM":
            sound_close_corpse = fid_hex(d)
        elif tag == "VNAM" and len(d) == 4:
            equipment_flags = struct.unpack_from("<I", d, 0)[0]
        elif tag == "UNWP":
            unarmed_weapon = fid_hex(d)
        elif tag == "WKMV":
            base_movement_default = fid_hex(d)
        elif tag == "SWMV":
            base_movement_swim = fid_hex(d)
        elif tag == "FLMV":
            base_movement_fly = fid_hex(d)
        elif tag == "SNMV":
            base_movement_sneak = fid_hex(d)
        elif tag == "NAM8":
            morph_race = fid_hex(d)
        elif tag == "RNAM":
            armor_race = fid_hex(d)
        elif tag == "SRAC":
            subgraph_template_race = fid_hex(d)
        elif tag == "SADD":
            subgraph_additive_race = fid_hex(d)
        elif tag == "QSTI":
            dialogue_quest = fid_hex(d)

    if not (edid or full):
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "full_name": full,
        "description": desc,
        "animation_sound": anim_sound,
        "actor_effects": actor_effects,
        "skin": skin,
        "biped_first_person_flags": biped_first_person_flags,
        "keywords": keywords,
        "data": data,
        "voices": voices,
        "default_hair_colors": default_hair_colors,
        "total_tints": total_tints,
        "facegen_main_clamp": facegen_main_clamp,
        "facegen_face_clamp": facegen_face_clamp,
        "attack_race": attack_race,
        "body_part_data": body_part_data,
        "impact_material_type": impact_material_type,
        "impact_data_set": impact_data_set,
        "dismember_blood_art": dismember_blood_art,
        "meat_cap_textureset": meat_cap_textureset,
        "sound_open_corpse": sound_open_corpse,
        "sound_close_corpse": sound_close_corpse,
        "equipment_flags": equipment_flags,
        "unarmed_weapon": unarmed_weapon,
        "base_movement_default": base_movement_default,
        "base_movement_swim": base_movement_swim,
        "base_movement_fly": base_movement_fly,
        "base_movement_sneak": base_movement_sneak,
        "morph_race": morph_race,
        "armor_race": armor_race,
        "subgraph_template_race": subgraph_template_race,
        "subgraph_additive_race": subgraph_additive_race,
        "dialogue_quest": dialogue_quest,
    }


def extract_races(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
    data_bytes = esm_path.read_bytes()
    length = len(data_bytes)
    pos = 0
    out: list[dict] = []

    if data_bytes[:4] != b"TES4":
        print(f"  WARNING: {esm_path.name} doesn't start with TES4")

    while pos + 24 <= length:
        rec_type = data_bytes[pos:pos + 4]
        if rec_type == b"GRUP":
            pos += 24
            continue
        data_size = struct.unpack_from("<I", data_bytes, pos + 4)[0]
        flags     = struct.unpack_from("<I", data_bytes, pos + 8)[0]
        form_id   = struct.unpack_from("<I", data_bytes, pos + 12)[0]
        pos += 24
        if pos + data_size > length:
            break
        if rec_type == b"RACE":
            raw = data_bytes[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                r = _extract_one_race(dec, form_id, string_lookup)
                if r is not None:
                    out.append(r)
        pos += data_size

    return out


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}  # see fo4_terminals.py note: base-game
    # loose .STRINGS files weren't staged for this build/verify pass; FULL/
    # DESC fall back to inline text when present and resolve to None
    # (an honest gap, not a guess) for unresolved string IDs otherwise.

    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_races: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for races...")
        all_races.extend(extract_races(esm_path, string_lookup))

    with_data = [r for r in all_races if r["data"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_races": len(all_races),
        "races_with_data": len(with_data),
        "note": "Whitelist-decoded fields only (see module docstring for the full "
                "list) -- skeletal models, body part lists, behavior graphs, "
                "head/face/morph/tint data and subgraph data are an explicit, "
                "documented gap, not yet decoded.",
        "races": all_races,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Race scan complete in {elapsed:.1f}s ===")
    print(f"  Total races:          {len(all_races):,}")
    print(f"  With decoded DATA:    {len(with_data):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
