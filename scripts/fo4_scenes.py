#!/usr/bin/env python3
"""
fo4_scenes.py — FO4 Scene (SCEN) records: companion/cinematic dialogue actions
================================================================================
Second of the three record types Billy asked to start on after the full
record-type inventory audit ("terminal menu structures, scene/companion
dialogue actions, deeper faction/race behavioral data"). SCEN is the record
type behind every companion conversation, cinematic dialogue sequence, and
scripted multi-actor scene in the game (e.g. companion affinity scenes,
settlement attack dialogue, quest cutscenes) — it stitches together Phases
(timeline beats with start/completion conditions), Actors (participant
aliases), and Actions (individual dialogue lines / packages / timers / radio
cues assigned to those actors within a phase).

SCEN is a substantially harder record than TERM or PACK's procedure tree:
several subrecord tags are reused 2-3 times *within the same struct* for
completely different fields, distinguished only by their POSITION in the
struct's declared field order (never by content or an independent marker).
This is the same underlying format convention already proven safe for PACK's
procedure tree and TERM's menu items — optional fields are simply omitted
when not applicable, but whatever IS present always appears in the exact
order declared by the format (verified against the authoritative xEdit/
FO4Edit Pascal source, wbDefinitionsFO4.pas, lines ~12011-12199) — so a
record can be walked correctly with a "positional field pointer" that only
ever advances forward, never resets or backtracks within one struct
instance. Examples of tags reused this way inside one Action struct:
  SNAM  -> first occurrence = 'Start Phase' (u32), second = 'Timer - Max
          Seconds' (f32)
  HTID  -> first occurrence = a union ('Play Sound' formid, 4 bytes, OR
          an empty 'End Scene Say Greeting' marker, 0 bytes — safely
          told apart by the subrecord's own on-disk length), second
          occurrence(s) = a repeatable 'Player Headtracking' s32 array
  VENC  -> first = 'Player Positive Dialogue Subtype' formid, second =
          plain 'Dialogue Subtype' formid (near the end of the struct)
  PNAM  -> repeated occurrences early = 'Packages' array (formids), one
          final occurrence later = 'AnimArchType' formid

Record layout (source-verified):

  Top (before any repeating group): EDID, VMAD (fragmented-for-SCEN —
    Scripts list decoded via the same parse_vmad already proven for
    every other VMAD-bearing record type in this project; the trailing
    Scene Fragments section, which binds Papyrus script fragments to
    specific phase/action indexes, is NOT decoded here — an honest,
    explicitly-flagged gap rather than a guess, left for a follow-up
    pass), then FNAM (Scene-level Flags, u32).

  Phases (repeating group, bounded by a start/end HNAM pair — both are
    zero-length "marker" subrecords with the identical tag HNAM, told
    apart purely by a start/end toggle, exactly like PACK's marker
    subrecords): NAM0 (Name, string) + Start Conditions (0+ CTDA, closed
    by a NEXT marker) + Completion Conditions (0+ CTDA, closed by a
    second NEXT marker) + WNAM (Editor Width, u32) + FNAM (Phase Flags,
    u16 — distinct meaning from the top-level FNAM) + SCQS (Set Parent
    Quest Stage: On Start s16 + On Completion s16, 4 bytes).

  Actors (repeating group, each entry always opens with ALID so no
    marker is needed): ALID (Alias ID, s32) + LNAM (Actor Flags, u32) +
    DNAM (Behaviour Flags, u32).

  Actions (repeating group; each entry opens with a 2-byte ANAM 'Type'
    field and closes with a 0-byte ANAM 'End Marker' — distinguished
    purely by on-disk subrecord length, safe because both are read
    directly off the 6-byte subrecord header before any interpretation):
    decoded via the positional field pointer described above, covering
    Type/Name/AliasID/Index/Flags/StartPhase/EndPhase/TimerMax/
    SetParentQuestStage/TimerMin/StartScenes(nested repeating group of
    Scene+PhaseIndex+StartPhaseName+ConditionCount+Conditions)/
    PlayerResponseTopics(x4)/PlayerDialogueSubtypes(x4)/
    NPCHeadtracking(s32 array)/NPCResponseTopics(x4)/
    NPCDialogueSubtypes(x4)/DialogueTargetActor/Packages(formid array)/
    Topic/PlaySoundOrEndSceneGreeting(union)/LoopingMax/LoopingMin/
    Camera(FOV+Rate, 8 bytes)/EmotionType/EmotionValue/
    PlayerHeadtracking(s32 array)/DialogueSubtype/AnimArchType/
    AudioOutputOverride.

  Top tail (after the Actions group, same positional-pointer technique):
    Quest formid, Last Action Index (u32), an undocumented VNAM field
    (raw bytes preserved, not interpreted — xEdit itself has no type
    for it), Camera Distance Override (f32), Dialogue Distance Override
    (f32), FOV Override (f32), Keyword Count + Keywords array (reusing
    the exact KWDA parser already proven in fo4_form_graph.py),
    top-level Conditions (0+ CTDA), Set Parent Quest Stage (On Begin
    s16 + On End s16), Notes (string), Template Scene (formid), Index
    (u32).

Outputs:
  <scan-cache>/fo4_scenes.json
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
GRAPH_OUT = _OUT_DIR / "fo4_scenes.json"

COMPRESSED_FLAG = 0x00040000

SCENE_FLAGS = [
    (0x00000001, "Begin on Quest Start"), (0x00000002, "Stop on Quest End"),
    (0x00000008, "Repeat Conditions While True"), (0x00000010, "Interruptible"),
    (0x00000040, "Prevent Player Exit Dialogue"), (0x00000800, "Disable Dialogue Camera"),
    (0x00001000, "No Follower Idle Chatter"),
]
PHASE_FLAGS = [
    (0x0001, "Start - WalkAway Phase"), (0x0002, "Don't Run End Scripts on Scene Jump"),
    (0x0004, "Start - Inherit In Templated Scenes"),
]
ACTOR_LNAM_FLAGS = ["No Player Activation", "Optional", "Run Only Scene Packages", "No Command State"]
ACTOR_DNAM_FLAGS = ["Death Pause", "Death End", "Combat Pause", "Combat End",
                     "Dialogue Pause", "Dialogue End", "OBS_COM Pause", "OBS_COM End"]
ACTION_TYPE = {0: "Dialogue", 1: "Package", 2: "Timer", 3: "Player Dialogue",
               4: "Start Scene", 5: "NPC Response Dialogue", 6: "Radio"}
EMOTION_TYPE = {0: "Neutral", 1: "Anger", 2: "Disgust", 3: "Fear", 4: "Sad",
                5: "Happy", 6: "Surprise", 7: "Puzzled"}

CTDA_COMPARE_OPS = ["Equal to", "Not equal to", "Greater than", "Greater than or equal to",
                    "Less than", "Less than or equal to"]
CTDA_FLAGS = [
    (0x01, "Or"), (0x02, "Use aliases"), (0x04, "Use global"),
    (0x08, "Use packdata"), (0x10, "Swap Subject and Target"),
]
CTDA_RUN_ON = {0: "Subject", 1: "Target", 2: "Reference", 3: "Combat Target",
               4: "Linked Reference", 5: "Quest Alias", 6: "Package Data",
               7: "Event Data", 9: "Command Target", 10: "Event Camera Ref", 11: "My Killer"}


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


def resolve_str(sub_data: bytes) -> str | None:
    return resolve_edid(sub_data)


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
    return f"0x{v:08X}" if v else None


# ---------------------------------------------------------------------------
# VMAD — reused verbatim from fo4_form_graph.py (proven against real data).
# SCEN's VMAD additionally carries a trailing "Scene Fragments" section
# (Papyrus fragment stubs bound to phase/action indexes) which this parser
# does not attempt to decode; it simply stops once the Scripts list ends,
# leaving the fragment bytes untouched. That is an explicit, documented
# gap — not a guess.
# ---------------------------------------------------------------------------

def parse_vmad_scripts(data: bytes) -> list[dict]:
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
            ptype = data[pos]; pos += 1
            _pstatus = data[pos]; pos += 1

            val = None
            try:
                if ptype == 1:
                    if obj_format == 2:
                        if pos + 8 > len(data):
                            break
                        fidv = struct.unpack_from("<I", data, pos + 4)[0]
                        val = f"0x{fidv:08X}" if fidv else None
                        pos += 8
                    else:
                        if pos + 4 > len(data):
                            break
                        fidv = struct.unpack_from("<I", data, pos)[0]
                        val = f"0x{fidv:08X}" if fidv else None
                        pos += 4
                elif ptype == 2:
                    slen = struct.unpack_from("<H", data, pos)[0]; pos += 2
                    val = data[pos:pos + slen].decode("utf-8", errors="replace"); pos += slen
                elif ptype == 3:
                    val = struct.unpack_from("<i", data, pos)[0]; pos += 4
                elif ptype == 4:
                    val = round(struct.unpack_from("<f", data, pos)[0], 4); pos += 4
                elif ptype == 5:
                    val = bool(data[pos]); pos += 1
                else:
                    # Unhandled property type (arrays etc.) — stop decoding
                    # this script's properties rather than misread the rest.
                    break
            except (struct.error, IndexError):
                break
            props.append({"name": pname, "type_id": ptype, "value": val})

        scripts.append({"name": script_name, "properties": props})

    return scripts


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


# ---------------------------------------------------------------------------
# Action decoder — positional field pointer.
#
# ACTION_FIELDS is the declared field sequence for one Action struct, taken
# in order straight from the source. Fields that can repeat (arrays / the
# nested Start Scenes group) are marked repeat=True and consume every
# consecutive subrecord matching their tag before the pointer advances.
# The pointer only ever moves forward: a tag that doesn't match the field
# at the current pointer is checked against every later field in order
# (skipping fields that are simply absent for this action), never against
# an earlier one — this is what makes reused tags like SNAM/HTID/VENC/PNAM
# resolve unambiguously to the right meaning without guessing.
# ---------------------------------------------------------------------------

ACTION_FIELDS = [
    ("NAM0", "name",  "str"),
    ("ALID", "alias_id", "s32"),
    ("INAM", "index", "u32"),
    ("FNAM", "flags", "u32flags_action"),
    ("SNAM", "start_phase", "u32"),
    ("ENAM", "end_phase", "u32"),
    ("SNAM", "timer_max_seconds", "f32"),
    ("SCQS", "set_parent_quest_stage", "s16"),
    ("TNAM", "timer_min_seconds", "f32"),
    ("STSC", "unknown_stsc", "raw"),
    ("LCEP", "__start_scenes_group__", "start_scenes_group"),
    ("PTOP", "player_positive_response", "formid"),
    ("NTOP", "player_negative_response", "formid"),
    ("NETO", "player_neutral_response", "formid"),
    ("QTOP", "player_question_response", "formid"),
    ("VENC", "player_positive_dialogue_subtype", "formid"),
    ("PLVD", "player_negative_dialogue_subtype", "formid"),
    ("JOUT", "player_neutral_dialogue_subtype", "formid"),
    ("DALC", "player_question_dialogue_subtype", "formid"),
    ("DTID", "npc_headtracking", "s32array"),
    ("NPOT", "npc_positive_response", "formid"),
    ("NNGT", "npc_negative_response", "formid"),
    ("NNUT", "npc_neutral_response", "formid"),
    ("NQUT", "npc_question_response", "formid"),
    ("NPOS", "npc_positive_dialogue_subtype", "formid"),
    ("NNGS", "npc_negative_dialogue_subtype", "formid"),
    ("NNUS", "npc_neutral_dialogue_subtype", "formid"),
    ("NQUS", "npc_question_dialogue_subtype", "formid"),
    ("DTGT", "dialogue_target_actor", "s32"),
    ("PNAM", "packages", "formidarray"),
    ("DATA", "topic", "formid"),
    ("HTID", "play_sound_or_end_greeting", "sound_union"),
    ("DMAX", "looping_max", "f32"),
    ("DMIN", "looping_min", "f32"),
    ("CRIS", "camera", "camera_struct"),
    ("DEMO", "emotion_type", "emotion"),
    ("DEVA", "emotion_value", "u32"),
    ("HTID", "player_headtracking", "s32array"),
    ("VENC", "dialogue_subtype", "formid"),
    ("PNAM", "anim_arch_type", "formid"),
    ("ONAM", "audio_output_override", "formid"),
]


def _decode_action_scalar(kind: str, d: bytes):
    try:
        if kind == "str":
            return resolve_str(d)
        if kind == "s32":
            return struct.unpack_from("<i", d, 0)[0] if len(d) == 4 else None
        if kind == "u32":
            return struct.unpack_from("<I", d, 0)[0] if len(d) == 4 else None
        if kind == "u32flags_action":
            return struct.unpack_from("<I", d, 0)[0] if len(d) == 4 else None
        if kind == "f32":
            return round(struct.unpack_from("<f", d, 0)[0], 4) if len(d) == 4 else None
        if kind == "s16":
            return struct.unpack_from("<h", d, 0)[0] if len(d) == 2 else None
        if kind == "raw":
            return d.hex()
        if kind == "formid":
            return fid_hex(d)
        if kind == "emotion":
            v = struct.unpack_from("<I", d, 0)[0] if len(d) == 4 else None
            return EMOTION_TYPE.get(v, f"unknown_{v}") if v is not None else None
        if kind == "camera_struct":
            if len(d) >= 8:
                return {"fov_on_player_camera": round(struct.unpack_from("<f", d, 0)[0], 4),
                        "rate_of_camera_change": round(struct.unpack_from("<f", d, 4)[0], 4)}
            return None
    except (struct.error, IndexError):
        return None
    return None


def _decode_one_action(subs: list[tuple[bytes, bytes]], type_data: bytes) -> dict:
    action: dict = {"type": ACTION_TYPE.get(type_data[0] if type_data else None,
                                             f"unknown_{type_data.hex() if type_data else '?'}")}
    conditions: list[dict] = []
    field_ptr = 0
    n_fields = len(ACTION_FIELDS)

    # Nested Start Scenes group state
    in_start_scenes = False
    start_scenes: list[dict] = []
    cur_start_scene: dict | None = None
    # Every 'Condition' in xEdit is really CTDA + optional trailing CIS1/CIS2
    # string subrecords (used when a condition's Parameter #1/#3 references
    # something by name, e.g. a quest alias) -- verified from source
    # (wbDefinitionsFO4.pas ~8211-8212). Track the most recently appended
    # condition dict so a following CIS1/CIS2 attaches to it in place.
    last_ctda: dict | None = None

    def flush_start_scene():
        nonlocal cur_start_scene
        if cur_start_scene is not None:
            start_scenes.append(cur_start_scene)
            cur_start_scene = None

    for tag_b, d in subs:
        tag = tag_b.decode("ascii", errors="replace")

        # CTDA can occur inside the Start Scenes group (per-start-scene
        # conditions) or as this action's own trailing conditions later —
        # xEdit's format has no top-level Action Conditions list, so any
        # CTDA seen while inside the Start Scenes group belongs to the
        # current start-scene entry; this project doesn't need to guess
        # further than that.
        if tag == "CTDA":
            c = parse_ctda(d)
            if c is None:
                last_ctda = None
                continue
            last_ctda = c
            if in_start_scenes and cur_start_scene is not None:
                cur_start_scene["conditions"].append(c)
            else:
                conditions.append(c)
            continue
        if tag == "CIS1" and last_ctda is not None:
            last_ctda["parameter1_string"] = resolve_str(d)
            continue
        if tag == "CIS2" and last_ctda is not None:
            last_ctda["parameter2_string"] = resolve_str(d)
            continue

        if in_start_scenes:
            if tag == "LCEP":
                flush_start_scene()
                cur_start_scene = {"scene": fid_hex(d), "phase_index": None,
                                    "start_phase_for_scene": None, "condition_count": None,
                                    "conditions": []}
                continue
            elif tag == "INTT" and cur_start_scene is not None and len(d) == 2:
                cur_start_scene["phase_index"] = struct.unpack_from("<H", d, 0)[0]
                continue
            elif tag == "SSPN" and cur_start_scene is not None:
                cur_start_scene["start_phase_for_scene"] = resolve_str(d)
                continue
            elif tag == "CITC" and cur_start_scene is not None and len(d) == 4:
                cur_start_scene["condition_count"] = struct.unpack_from("<I", d, 0)[0]
                continue
            else:
                # First tag that doesn't belong to the Start Scenes group —
                # the group is exhausted, flush and fall through to the
                # normal positional pointer below.
                flush_start_scene()
                in_start_scenes = False

        # Arrays that consume repeats of the same tag: DTID / HTID(2nd) / PNAM(packages)
        if tag == "DTID" and field_ptr < n_fields and ACTION_FIELDS[field_ptr][0] == "DTID" \
                and ACTION_FIELDS[field_ptr][2] == "s32array":
            action.setdefault("npc_headtracking", [])
            if len(d) == 4:
                action["npc_headtracking"].append(struct.unpack_from("<i", d, 0)[0])
            continue

        # Advance the pointer to find where this tag belongs (never backward).
        matched = False
        i = field_ptr
        while i < n_fields:
            f_tag, f_name, f_kind = ACTION_FIELDS[i]
            if f_tag == tag:
                if f_kind == "start_scenes_group":
                    in_start_scenes = True
                    flush_start_scene()
                    cur_start_scene = {"scene": fid_hex(d), "phase_index": None,
                                        "start_phase_for_scene": None, "condition_count": None,
                                        "conditions": []}
                    field_ptr = i + 1
                    matched = True
                    break
                elif f_kind == "s32array":
                    action.setdefault(f_name, [])
                    if len(d) == 4:
                        action[f_name].append(struct.unpack_from("<i", d, 0)[0])
                    field_ptr = i  # stay — more of this tag may follow
                    matched = True
                    break
                elif f_kind == "formidarray":
                    action.setdefault(f_name, [])
                    fv = fid_hex(d)
                    if fv:
                        action[f_name].append(fv)
                    field_ptr = i  # stay — more Packages entries may follow
                    matched = True
                    break
                elif f_kind == "sound_union":
                    if len(d) == 4:
                        action[f_name] = {"kind": "play_sound", "sound": fid_hex(d)}
                    else:
                        action[f_name] = {"kind": "end_scene_say_greeting"}
                    field_ptr = i + 1
                    matched = True
                    break
                else:
                    action[f_name] = _decode_action_scalar(f_kind, d)
                    field_ptr = i + 1
                    matched = True
                    break
            i += 1
        if not matched:
            # Tag not recognized anywhere later in the declared sequence —
            # record it raw rather than silently dropping it.
            action.setdefault("_unrecognized", []).append({"tag": tag, "len": len(d)})

    flush_start_scene()
    if start_scenes:
        action["start_scenes"] = start_scenes
    if conditions:
        action["conditions"] = conditions
    return action


# ---------------------------------------------------------------------------
# Top-tail decoder — same positional-pointer technique, for the fields that
# come after the Actions group.
# ---------------------------------------------------------------------------

TOP_TAIL_FIELDS = [
    ("PNAM", "quest", "formid"),
    ("INAM", "last_action_index", "u32"),
    ("VNAM", "unknown_vnam", "raw"),
    ("CNAM", "camera_distance_override", "f32"),
    ("ACTV", "dialogue_distance_override", "f32"),
    ("CRIS", "fov_override", "f32"),
    ("KSIZ", "__keyword_count__", "skip"),
    ("KWDA", "keywords", "kwda"),
    ("SCQS", "set_parent_quest_stage", "scqs2"),
    ("NNAM", "notes", "str"),
    ("TNAM", "template_scene", "formid"),
    ("XNAM", "index", "u32"),
]


def _extract_one_scene(dec: bytes, form_id: int) -> dict | None:
    subs = scan_subs_ordered(dec)

    edid: str | None = None
    vmad_scripts: list[dict] = []
    scene_flags_raw: int | None = None
    phases: list[dict] = []
    actors: list[dict] = []
    actions: list[dict] = []
    top_conditions: list[dict] = []
    tail: dict = {}

    # Section markers within the top-level record.
    section = "top"  # top -> phases -> actors -> actions -> tail

    cur_phase: dict | None = None
    phase_sub = None  # None / 'start_cond' / 'completion_cond'

    def flush_phase():
        nonlocal cur_phase
        if cur_phase is not None:
            phases.append(cur_phase)
            cur_phase = None

    cur_actor: dict | None = None

    def flush_actor():
        nonlocal cur_actor
        if cur_actor is not None:
            actors.append(cur_actor)
            cur_actor = None

    cur_action_subs: list[tuple[bytes, bytes]] = []
    cur_action_type: bytes | None = None

    def flush_action():
        nonlocal cur_action_subs, cur_action_type
        if cur_action_type is not None:
            actions.append(_decode_one_action(cur_action_subs, cur_action_type))
        cur_action_subs = []
        cur_action_type = None

    tail_ptr = 0
    n_tail = len(TOP_TAIL_FIELDS)
    last_ctda: dict | None = None  # for trailing CIS1/CIS2 (see fo4_scenes.py docstring)

    i = 0
    n = len(subs)
    while i < n:
        tag_b, d = subs[i]
        tag = tag_b.decode("ascii", errors="replace")

        if section == "top":
            if tag == "EDID":
                edid = resolve_edid(d)
            elif tag == "VMAD":
                vmad_scripts = parse_vmad_scripts(d)
            elif tag == "FNAM" and len(d) == 4:
                scene_flags_raw = struct.unpack_from("<I", d, 0)[0]
            elif tag == "HNAM":
                section = "phases"
                continue  # reprocess this subrecord in the new section
            elif tag == "ALID":
                section = "actors"
                continue
            i += 1
            continue

        if section == "phases":
            if tag == "HNAM":
                if cur_phase is None:
                    cur_phase = {"name": None, "start_conditions": [], "completion_conditions": [],
                                 "editor_width": None, "flags": [], "set_parent_quest_stage": None}
                    phase_sub = "start_cond"
                else:
                    flush_phase()
                    phase_sub = None
            elif cur_phase is not None and tag == "NAM0":
                cur_phase["name"] = resolve_str(d)
            elif cur_phase is not None and tag == "NEXT":
                phase_sub = "completion_cond" if phase_sub == "start_cond" else "done_cond"
            elif cur_phase is not None and tag == "CTDA":
                c = parse_ctda(d)
                last_ctda = c
                if c is not None:
                    if phase_sub == "start_cond":
                        cur_phase["start_conditions"].append(c)
                    elif phase_sub == "completion_cond":
                        cur_phase["completion_conditions"].append(c)
            elif cur_phase is not None and tag == "CIS1" and last_ctda is not None:
                last_ctda["parameter1_string"] = resolve_str(d)
            elif cur_phase is not None and tag == "CIS2" and last_ctda is not None:
                last_ctda["parameter2_string"] = resolve_str(d)
            elif cur_phase is not None and tag == "WNAM" and len(d) == 4:
                cur_phase["editor_width"] = struct.unpack_from("<I", d, 0)[0]
            elif cur_phase is not None and tag == "FNAM" and len(d) == 2:
                v = struct.unpack_from("<H", d, 0)[0]
                cur_phase["flags"] = _decode_flags_bitfield(v, PHASE_FLAGS)
            elif cur_phase is not None and tag == "SCQS" and len(d) == 4:
                cur_phase["set_parent_quest_stage"] = {
                    "on_start": struct.unpack_from("<h", d, 0)[0],
                    "on_completion": struct.unpack_from("<h", d, 2)[0],
                }
            elif tag == "ALID":
                flush_phase()
                section = "actors"
                continue
            elif tag == "ANAM" and len(d) == 2:
                flush_phase()
                section = "actions"
                continue
            else:
                # Unexpected tag while in phases (e.g. we've reached the
                # tail with no actors/actions at all) — bail to tail.
                flush_phase()
                section = "actions"
                continue
            i += 1
            continue

        if section == "actors":
            if tag == "ALID" and len(d) == 4:
                flush_actor()
                cur_actor = {"alias_id": struct.unpack_from("<i", d, 0)[0], "flags": [], "behaviour_flags": []}
            elif cur_actor is not None and tag == "LNAM" and len(d) == 4:
                v = struct.unpack_from("<I", d, 0)[0]
                cur_actor["flags"] = [ACTOR_LNAM_FLAGS[b] for b in range(len(ACTOR_LNAM_FLAGS)) if v & (1 << b)]
            elif cur_actor is not None and tag == "DNAM" and len(d) == 4:
                v = struct.unpack_from("<I", d, 0)[0]
                cur_actor["behaviour_flags"] = [ACTOR_DNAM_FLAGS[b] for b in range(len(ACTOR_DNAM_FLAGS)) if v & (1 << b)]
            elif tag == "ANAM" and len(d) == 2:
                flush_actor()
                section = "actions"
                continue
            else:
                flush_actor()
                section = "actions"
                continue
            i += 1
            continue

        if section == "actions":
            if tag == "ANAM" and len(d) == 2:
                flush_action()
                cur_action_type = d
                cur_action_subs = []
            elif tag == "ANAM" and len(d) == 0:
                flush_action()
            elif cur_action_type is not None:
                cur_action_subs.append((tag_b, d))
            else:
                flush_action()
                section = "tail"
                continue
            i += 1
            continue

        if section == "tail":
            if tag == "CTDA":
                c = parse_ctda(d)
                last_ctda = c
                if c is not None:
                    top_conditions.append(c)
                i += 1
                continue
            if tag == "CIS1" and last_ctda is not None:
                last_ctda["parameter1_string"] = resolve_str(d)
                i += 1
                continue
            if tag == "CIS2" and last_ctda is not None:
                last_ctda["parameter2_string"] = resolve_str(d)
                i += 1
                continue
            matched = False
            j = tail_ptr
            while j < n_tail:
                f_tag, f_name, f_kind = TOP_TAIL_FIELDS[j]
                if f_tag == tag:
                    if f_kind == "formid":
                        tail[f_name] = fid_hex(d)
                    elif f_kind == "u32":
                        tail[f_name] = struct.unpack_from("<I", d, 0)[0] if len(d) == 4 else None
                    elif f_kind == "f32":
                        tail[f_name] = round(struct.unpack_from("<f", d, 0)[0], 4) if len(d) == 4 else None
                    elif f_kind == "raw":
                        tail[f_name] = d.hex()
                    elif f_kind == "str":
                        tail[f_name] = resolve_str(d)
                    elif f_kind == "kwda":
                        tail[f_name] = parse_kwda(d)
                    elif f_kind == "scqs2":
                        if len(d) == 4:
                            tail[f_name] = {"on_begin": struct.unpack_from("<h", d, 0)[0],
                                             "on_end": struct.unpack_from("<h", d, 2)[0]}
                    elif f_kind == "skip":
                        pass
                    tail_ptr = j + 1
                    matched = True
                    break
                j += 1
            if not matched:
                pass  # unrecognized tail tag — silently skip, not guessed at
            i += 1
            continue

    # Flush anything still open if the record ended mid-section.
    flush_phase()
    flush_actor()
    flush_action()

    if not (edid or phases or actors or actions):
        return None

    result = {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "scripts": vmad_scripts,
        "flags": _decode_flags_bitfield(scene_flags_raw, SCENE_FLAGS) if scene_flags_raw is not None else [],
        "phases": phases,
        "actors": actors,
        "actions": actions,
        "top_conditions": top_conditions,
    }
    result.update(tail)
    return result


def extract_scenes(esm_path: Path) -> list[dict]:
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
        if rec_type == b"SCEN":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                s = _extract_one_scene(dec, form_id)
                if s is not None:
                    out.append(s)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_scenes: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for scenes...")
        all_scenes.extend(extract_scenes(esm_path))

    with_actions = [s for s in all_scenes if s["actions"]]
    total_actions = sum(len(s["actions"]) for s in all_scenes)
    total_phases = sum(len(s["phases"]) for s in all_scenes)

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_scenes": len(all_scenes),
        "scenes_with_actions": len(with_actions),
        "total_actions": total_actions,
        "total_phases": total_phases,
        "scenes": all_scenes,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Scene scan complete in {elapsed:.1f}s ===")
    print(f"  Total scenes:        {len(all_scenes):,}")
    print(f"  With actions:        {len(with_actions):,}")
    print(f"  Total actions:       {total_actions:,}")
    print(f"  Total phases:        {total_phases:,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
