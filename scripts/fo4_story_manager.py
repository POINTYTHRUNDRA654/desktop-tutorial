#!/usr/bin/env python3
"""
fo4_story_manager.py — FO4 Story Manager (SMBN / SMQN / SMEN)
========================================================================
Fifteenth stop in the "grind it to zero" pass. The Story Manager is the
tree the engine walks to decide which quest/event fires next — Branch
Nodes (random/priority selection among children), Quest Nodes (leaves
that actually start Quests), and Event Nodes (react to a named game
event type). Combined into one scanner since all three share the same
tree-node shape (Parent/Child links, gating Conditions, node flags) and
together form a single conceptual system, differing only in their
node-type-specific trailing fields.

Source-verified (wbDefinitionsFO4.pas ~11862-11911), all three share:
  EDID
  PNAM (Parent FormID -> SMQN/SMBN/SMEN)
  SNAM (Child FormID -> SMQN/SMBN/SMEN)
  CITC (Condition Count, u32, benign/informational only)
  Conditions (wbCTDAsCount = repeating CTDA, same 32-byte struct +
    optional CIS1/CIS2 handled with the same last_ctda-tracking fix
    verified throughout this project)
  DNAM (node flags: Random / Warn if no child quest started — for SMQN
    this is a 2x u16 struct instead of one u32, decoded accordingly)
  XNAM (unknown, skipped)

SMBN (Branch Node) adds nothing else.

SMQN (Quest Node) adds: XNAM here is instead "Max concurrent quests"
  (u32 — NOT the same meaning as SMBN/SMEN's XNAM, source itself reuses
  the tag with a different type per record, captured correctly per
  record type rather than assumed shared), MNAM (Num quests to run),
  HNAM (Hours until reset), QNAM (Quest Count, benign), and a repeating
  "Quests" array (NNAM Quest FormID -> QUST, FNAM unknown, RNAM Hours
  until reset float) — NNAM used as the reliable per-entry boundary.

SMEN (Event Node) adds: XNAM unknown (skipped, genuinely undocumented),
  ENAM (Type, a 4-character event-type string, e.g. matching a
  Papyrus/game event name).

Outputs:
  <scan-cache>/fo4_story_manager.json
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
GRAPH_OUT = _OUT_DIR / "fo4_story_manager.json"

COMPRESSED_FLAG = 0x00040000

NODE_FLAGS = [(0x01, "Random"), (0x02, "Warn if no child quest started")]
SMQN_QUEST_FLAGS = [(0x01, "Do all before repeating"), (0x02, "Shares event"), (0x04, "Num quests to run")]


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


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
    return f"0x{v:08X}" if v else None


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 32:
        return None
    try:
        type_byte = d[0]
        comp_op = (type_byte >> 5) & 0x07
        flag_bits = type_byte & 0x1F
        comparison_raw = struct.unpack_from("<I", d, 4)[0]
        comparison_float = struct.unpack_from("<f", d, 4)[0]
        function = struct.unpack_from("<H", d, 8)[0]
        param1 = fid_hex(d[12:16])
        param2 = fid_hex(d[16:20])
        run_on = struct.unpack_from("<I", d, 20)[0]
        reference = fid_hex(d[24:28])
        param3 = struct.unpack_from("<i", d, 28)[0]
        use_global = bool(flag_bits & 0x04)
        return {
            "flags": {
                "or": bool(flag_bits & 0x01), "use_aliases": bool(flag_bits & 0x02),
                "use_global": use_global, "use_packdata": bool(flag_bits & 0x08),
                "swap_subject_target": bool(flag_bits & 0x10),
            },
            "compare_op": ["==", "!=", ">", ">=", "<", "<="][comp_op] if comp_op < 6 else f"op{comp_op}",
            "comparison_value": (f"0x{comparison_raw:08X}" if use_global else round(comparison_float, 5)),
            "function": function,
            "param1": param1, "param2": param2,
            "run_on": run_on, "reference": reference, "param3": param3,
            "cis1": None, "cis2": None,
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


def _extract_one_smbn_smen(dec: bytes, form_id: int, node_type: str) -> dict | None:
    edid: str | None = None
    parent = child = None
    conditions: list[dict] = []
    last_ctda: dict | None = None
    flags: list[str] = []
    event_type: str | None = None  # SMEN only

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "PNAM":
            parent = fid_hex(d)
        elif tag == "SNAM":
            child = fid_hex(d)
        elif tag == "CTDA":
            c = parse_ctda(d)
            if c is not None:
                conditions.append(c)
                last_ctda = c
        elif tag == "CIS1":
            if last_ctda is not None:
                last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2":
            if last_ctda is not None:
                last_ctda["cis2"] = resolve_string(d)
        elif tag == "DNAM" and len(d) >= 4:
            v = struct.unpack_from("<I", d, 0)[0]
            flags = _decode_flags_bitfield(v, NODE_FLAGS)
        elif tag == "ENAM" and node_type == "SMEN":
            event_type = resolve_string(d)

    if not edid:
        return None

    out = {
        "form_id": f"0x{form_id:08X}", "edid": edid, "node_type": node_type,
        "parent": parent, "child": child, "conditions": conditions, "flags": flags,
    }
    if node_type == "SMEN":
        out["event_type"] = event_type
    return out


def _extract_one_smqn(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    parent = child = None
    conditions: list[dict] = []
    last_ctda: dict | None = None
    node_flags: list[str] = []
    quest_flags: list[str] = []
    max_concurrent_quests: int | None = None
    num_quests_to_run: int | None = None
    hours_until_reset: float | None = None
    quests: list[dict] = []
    cur_quest: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "PNAM":
            parent = fid_hex(d)
        elif tag == "SNAM":
            child = fid_hex(d)
        elif tag == "CTDA":
            c = parse_ctda(d)
            if c is not None:
                conditions.append(c)
                last_ctda = c
        elif tag == "CIS1":
            if last_ctda is not None:
                last_ctda["cis1"] = resolve_string(d)
        elif tag == "CIS2":
            if last_ctda is not None:
                last_ctda["cis2"] = resolve_string(d)
        elif tag == "DNAM" and len(d) >= 4:
            node_flags_raw = struct.unpack_from("<H", d, 0)[0]
            quest_flags_raw = struct.unpack_from("<H", d, 2)[0]
            node_flags = _decode_flags_bitfield(node_flags_raw, NODE_FLAGS)
            quest_flags = _decode_flags_bitfield(quest_flags_raw, SMQN_QUEST_FLAGS)
        elif tag == "XNAM" and len(d) >= 4:
            max_concurrent_quests = struct.unpack_from("<I", d, 0)[0]
        elif tag == "MNAM" and len(d) >= 4:
            num_quests_to_run = struct.unpack_from("<I", d, 0)[0]
        elif tag == "HNAM" and len(d) >= 4:
            hours_until_reset = round(struct.unpack_from("<f", d, 0)[0], 5)
        elif tag == "NNAM":
            if cur_quest is not None:
                quests.append(cur_quest)
            cur_quest = {"quest": fid_hex(d), "hours_until_reset": None}
        elif tag == "RNAM" and len(d) >= 4:
            if cur_quest is None:
                cur_quest = {"quest": None, "hours_until_reset": None}
            cur_quest["hours_until_reset"] = round(struct.unpack_from("<f", d, 0)[0], 5)

    if cur_quest is not None:
        quests.append(cur_quest)

    if not edid:
        return None

    return {
        "form_id": f"0x{form_id:08X}", "edid": edid, "node_type": "SMQN",
        "parent": parent, "child": child, "conditions": conditions,
        "node_flags": node_flags, "quest_flags": quest_flags,
        "max_concurrent_quests": max_concurrent_quests,
        "num_quests_to_run": num_quests_to_run,
        "hours_until_reset": hours_until_reset,
        "quests": quests,
    }


def extract_story_manager(esm_path: Path) -> list[dict]:
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
        if rec_type in (b"SMBN", b"SMEN", b"SMQN"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                if rec_type == b"SMQN":
                    n = _extract_one_smqn(dec, form_id)
                else:
                    n = _extract_one_smbn_smen(dec, form_id, rec_type.decode("ascii"))
                if n is not None:
                    out.append(n)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_nodes: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for story manager nodes...")
        all_nodes.extend(extract_story_manager(esm_path))

    by_type: dict[str, int] = {}
    for n in all_nodes:
        by_type[n["node_type"]] = by_type.get(n["node_type"], 0) + 1

    form_ids = set(n["form_id"] for n in all_nodes)
    parent_resolved = sum(1 for n in all_nodes if n["parent"] and n["parent"] in form_ids)
    parent_total = sum(1 for n in all_nodes if n["parent"])

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_story_manager_nodes": len(all_nodes),
        "by_type": by_type,
        "parent_links_resolving_in_file": parent_resolved,
        "parent_links_total": parent_total,
        "story_manager_nodes": all_nodes,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Story manager scan complete in {elapsed:.1f}s ===")
    print(f"  Total nodes: {len(all_nodes):,} ({by_type})")
    print(f"  Parent links resolving in-file: {parent_resolved:,}/{parent_total:,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
