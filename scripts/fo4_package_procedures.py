#!/usr/bin/env python3
"""
fo4_package_procedures.py — FO4 AI Package Conditions, Location/Target Data,
                             and Procedure Tree (the "where it goes / what it
                             does" data fo4_ai_packages.py deliberately left out)
================================================================================
fo4_ai_packages.py covers a package's script, type/flags, and schedule.
This is the harder piece that was deliberately deferred: WHERE a package
sends an NPC and WHAT it does when it gets there — the actual "which door
it opens, which spot it travels to" information.

Every struct here was extracted field-by-field from the authoritative
xEdit/FO4Edit Pascal source (wbDefinitionsFO4.pas), not from memory:

  CTDA (Condition) — 32 bytes, the same struct format used since Skyrim,
    extremely well-documented and stable:
      Type:u8@0 (low 5 bits = flags: Or/UseAliases/UseGlobal/UsePackdata/
                 SwapSubjectTarget; high 3 bits = compare operator
                 0..5 = Equal/NotEqual/Greater/GreaterOrEqual/Less/LessOrEqual)
      Unused:3@1, Comparison Value:4@4 (float, or GLOB formid if
      'Use global' flag set), Function:u16@8 (an FO4 condition-function ID —
      exposed as a raw ID, not name-mapped: the name table is hundreds of
      entries and mapping it wrong would be worse than leaving it numeric),
      Unused:2@10, Parameter #1:4@12, Parameter #2:4@16 (both raw — their
      real type depends on which Function this is, a per-function table
      not attempted here), Run On:u32@20, Reference:4@24 (formid or unused),
      Parameter #3:i32@28.

  PLDT (Location) — 16 bytes: Type:s32@0 (15-value enum: Reference/Cell/
    NearPackageStart/NearEditorLoc/ObjectID/ObjectType/Keyword/Unused/
    RefAlias/LocAlias/InterruptData/PackdataTarget/Unknown/Unknown/
    RefCollectionAlias), Location Value:4@4 (raw — formid or int,
    interpretation depends on Type), Radius:s32@8, Collection Index:u32@12.

  PTDA (Target, wraps "Target Data") — 12 bytes: Type:s32@0 (9-value enum:
    SpecificReference/ObjectID/ObjectType/LinkedReference/RefAlias/
    InterruptData/Self/Keyword/Unknown8), Target:4@4 (raw, same caveat as
    PLDT), Count/Distance:s32@8.

  PDTO (Topic Data, repeatable) — 8 bytes: Type:u32@0 (0=Topic Ref,
    1=Topic Subtype), Data:4@4 (DIAL formid, or a 4-char subtype string).

  PRCB (Procedure Root) — 8 bytes: Branch Count:u32@0, Flags:u32@4
    (bit0 = Repeat when Complete).

The real structural wrinkle (documented and handled below, not guessed
around): a handful of subrecord tags are reused for different fields
depending on where they occur in the record — BNAM means "unknown filler"
inside a Data Input Value but "Data Input name" inside a Data Input
definition; CNAM means the package's Combat Style before any location
data starts but a Data Input's typed value once inside one; PNAM means
a Data Input's flags before the Procedure Tree but a branch's Procedure
Type once inside one. All three are resolved by POSITION, not guessing:
the record's own field order (confirmed from source) puts Data Input
Values before Data Input definitions before XNAM before the Procedure
Tree, so a small phase-tracking state machine (the same technique
already proven for fo4_quest_graph.py's stage/objective/alias tracking
and fo4_dialogue_graph.py's GRUP-nesting stack) disambiguates every one
of them correctly, with no interpretation guesswork involved.

The Procedure Tree's "Branches" are a genuinely flat, repeatable array
in the binary format — despite the name, there is no recursive nesting
to walk; a branch's own Data Input Indexes just numerically reference
entries elsewhere in the same record. That flatness is exactly what
makes this now safe to decode, unlike a true recursive structure would
be.

Outputs:
  <scan-cache>/fo4_package_procedures.json
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
GRAPH_OUT = _OUT_DIR / "fo4_package_procedures.json"

COMPRESSED_FLAG = 0x00040000

CTDA_COMPARE_OPS = ["Equal to", "Not equal to", "Greater than", "Greater than or equal to",
                    "Less than", "Less than or equal to"]
CTDA_FLAGS = [
    (0x01, "Or"), (0x02, "Use aliases"), (0x04, "Use global"),
    (0x08, "Use packdata"), (0x10, "Swap Subject and Target"),
]
CTDA_RUN_ON = {0: "Subject", 1: "Target", 2: "Reference", 3: "Combat Target",
               4: "Linked Reference", 5: "Quest Alias", 6: "Package Data",
               7: "Event Data", 9: "Command Target", 10: "Event Camera Ref", 11: "My Killer"}

PLDT_TYPE = {0: "Reference", 1: "Cell", 2: "Near Package Start Location",
             3: "Near Editor Location", 4: "Object ID", 5: "Object Type",
             6: "Keyword", 7: "Unused", 8: "Ref Alias", 9: "Loc Alias",
             10: "Interrupt Data", 11: "Packdata Target", 12: "Unknown",
             13: "Unknown", 14: "Ref Collection Alias"}

PTDA_TYPE = {0: "Specific Reference", 1: "Object ID", 2: "Object Type",
             3: "Linked Reference", 4: "Ref Alias", 5: "Interrupt Data",
             6: "Self", 7: "Keyword", 8: "Unknown"}

PDTO_TYPE = {0: "Topic Ref", 1: "Topic Subtype"}


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


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 32:
        return None
    try:
        type_byte = d[0]
        flags = _decode_flags(type_byte & 0x1F, CTDA_FLAGS)
        op = CTDA_COMPARE_OPS[(type_byte >> 5) & 0x07] if ((type_byte >> 5) & 0x07) < 6 else f"unknown_{(type_byte >> 5) & 0x07}"
        use_global = bool(type_byte & 0x04)
        comp_raw = struct.unpack_from("<I", d, 4)[0]
        comp_float = round(struct.unpack_from("<f", d, 4)[0], 4)
        function_id = struct.unpack_from("<H", d, 8)[0]
        param1_raw = struct.unpack_from("<I", d, 12)[0]
        param2_raw = struct.unpack_from("<I", d, 16)[0]
        run_on = struct.unpack_from("<I", d, 20)[0]
        reference = struct.unpack_from("<I", d, 24)[0]
        param3 = struct.unpack_from("<i", d, 28)[0]
        return {
            "compare_operator": op,
            "flags": flags,
            "comparison_value": (f"0x{comp_raw:08X}" if use_global else comp_float),
            "function_id": function_id,
            "param1_raw": f"0x{param1_raw:08X}",
            "param2_raw": f"0x{param2_raw:08X}",
            "run_on": CTDA_RUN_ON.get(run_on, f"unknown_{run_on}"),
            "reference": f"0x{reference:08X}" if reference else None,
            "param3": param3,
        }
    except (struct.error, IndexError):
        return None


def parse_pldt(d: bytes) -> dict | None:
    if len(d) < 16:
        return None
    try:
        ptype = struct.unpack_from("<i", d, 0)[0]
        val_raw = struct.unpack_from("<I", d, 4)[0]
        radius = struct.unpack_from("<i", d, 8)[0]
        collection_idx = struct.unpack_from("<I", d, 12)[0]
        return {
            "type": PLDT_TYPE.get(ptype, f"unknown_{ptype}"),
            "value": f"0x{val_raw:08X}" if val_raw else val_raw,
            "radius": radius,
            "collection_index": collection_idx,
        }
    except (struct.error, IndexError):
        return None


def parse_ptda(d: bytes) -> dict | None:
    if len(d) < 12:
        return None
    try:
        ttype = struct.unpack_from("<i", d, 0)[0]
        val_raw = struct.unpack_from("<I", d, 4)[0]
        count_dist = struct.unpack_from("<i", d, 8)[0]
        return {
            "type": PTDA_TYPE.get(ttype, f"unknown_{ttype}"),
            "value": f"0x{val_raw:08X}" if val_raw else val_raw,
            "count_or_distance": count_dist,
        }
    except (struct.error, IndexError):
        return None


def parse_pdto(d: bytes) -> dict | None:
    if len(d) < 8:
        return None
    try:
        ptype = struct.unpack_from("<I", d, 0)[0]
        if ptype == 0:
            fid = struct.unpack_from("<I", d, 4)[0]
            val = f"0x{fid:08X}" if fid else None
        else:
            val = d[4:8].split(b"\x00")[0].decode("ascii", errors="replace")
        return {"type": PDTO_TYPE.get(ptype, f"unknown_{ptype}"), "value": val}
    except (struct.error, IndexError):
        return None


def parse_prcb(d: bytes) -> dict | None:
    if len(d) < 8:
        return None
    try:
        branch_count = struct.unpack_from("<I", d, 0)[0]
        flags = struct.unpack_from("<I", d, 4)[0]
        return {"branch_count": branch_count, "repeat_when_complete": bool(flags & 0x01)}
    except (struct.error, IndexError):
        return None


def extract_packages(esm_path: Path) -> list[dict]:
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

        if rec_type == b"PACK":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                pkg = _extract_one_package(dec, form_id)
                if pkg is not None:
                    out.append(pkg)

        pos += data_size

    return out


def _extract_one_package(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    top_conditions: list[dict] = []
    data_inputs: list[dict] = []
    value_entries: list[dict] = []
    branches: list[dict] = []

    # Phase tracking: subrecord order in the file is fixed (confirmed from
    # source), so a package moves through these phases strictly forward:
    #   'top'          — EDID/VMAD/PKDT/PSDT/top-level CTDAs
    #   'package_data' — the 'Data Input Values' array (each starts with ANAM)
    #   'data_inputs'  — the 'Data Inputs' definitions array (each starts with UNAM)
    #   'marker'       — seen XNAM, waiting for Procedure Tree to start
    #   'procedure'    — the 'Branches' array (each starts with ANAM again,
    #                     safely distinct from package_data's ANAM because
    #                     we've already passed XNAM by this point)
    phase = "top"
    cur_value: dict | None = None
    cur_input: dict | None = None
    cur_branch: dict | None = None
    seen_pkdt = False  # only packages that actually have PKDT are real PACK bodies

    def flush_value():
        nonlocal cur_value
        if cur_value is not None:
            value_entries.append(cur_value)
            cur_value = None

    def flush_input():
        nonlocal cur_input
        if cur_input is not None:
            data_inputs.append(cur_input)
            cur_input = None

    def flush_branch():
        nonlocal cur_branch
        if cur_branch is not None:
            branches.append(cur_branch)
            cur_branch = None

    for t, d in scan_subs_ordered(dec):
        if t == b"EDID":
            edid = resolve_edid(d)
        elif t == b"PKDT":
            seen_pkdt = True
        elif t == b"CTDA":
            c = parse_ctda(d)
            if c is None:
                continue
            if phase == "top":
                top_conditions.append(c)
            elif phase == "procedure" and cur_branch is not None:
                cur_branch["conditions"].append(c)
            # CTDA inside package_data / data_inputs isn't part of this
            # record layout (conditions only occur at top-level or inside
            # a branch) — ignore defensively if seen elsewhere.
        elif t == b"ANAM":
            text = resolve_edid(d)
            if phase in ("top", "package_data"):
                flush_value()
                phase = "package_data"
                cur_value = {"data_input_type": text, "value_raw": None, "pdtos": [], "location": None, "target": None}
            elif phase in ("marker", "procedure"):
                flush_branch()
                phase = "procedure"
                cur_branch = {"branch_type": text, "procedure_type": None, "flags": [],
                               "conditions": [], "data_input_indexes": [], "root": None}
        elif t == b"CNAM":
            if cur_value is not None:
                # Data Input Value's typed value union — the raw 4 bytes are
                # reinterpreted per the ANAM 'Type' string captured alongside
                # it (Bool/Integer/Float), which is real information, not a
                # guess: the type tag is right there in the same record.
                if len(d) == 4:
                    dtype = (cur_value.get("data_input_type") or "").lower()
                    if dtype == "float":
                        cur_value["value_raw"] = round(struct.unpack_from("<f", d, 0)[0], 4)
                    elif dtype == "bool":
                        cur_value["value_raw"] = bool(struct.unpack_from("<I", d, 0)[0])
                    elif dtype == "integer":
                        cur_value["value_raw"] = struct.unpack_from("<i", d, 0)[0]
                    else:
                        cur_value["value_raw"] = f"0x{struct.unpack_from('<I', d, 0)[0]:08X}"
            # else: package-level Combat Style formid — not needed here,
            # fo4_ai_packages.py doesn't surface it either; skip.
        elif t == b"BNAM":
            if cur_input is not None:
                cur_input["name"] = resolve_edid(d)
            # else: 'Unknown' filler inside a Data Input Value — skip.
        elif t == b"UNAM":
            flush_value()
            phase = "data_inputs"
            idx = struct.unpack_from("<b", d, 0)[0] if len(d) >= 1 else None
            cur_input = {"index": idx, "name": None, "flags": []}
        elif t == b"PNAM":
            if phase == "data_inputs" and cur_input is not None:
                if len(d) == 4:
                    cur_input["flags"] = _decode_flags(struct.unpack_from("<I", d, 0)[0], [(0x1, "Public")])
            elif phase == "procedure" and cur_branch is not None:
                cur_branch["procedure_type"] = resolve_edid(d)
        elif t == b"PDTO":
            if cur_value is not None:
                p = parse_pdto(d)
                if p:
                    cur_value["pdtos"].append(p)
        elif t == b"PLDT":
            if cur_value is not None:
                cur_value["location"] = parse_pldt(d)
        elif t == b"PTDA":
            if cur_value is not None:
                cur_value["target"] = parse_ptda(d)
        elif t == b"TPIC":
            pass  # unknown, deliberately not decoded
        elif t == b"XNAM":
            flush_value()
            flush_input()
            phase = "marker"
        elif t == b"CITC":
            pass  # condition count — we collect CTDAs directly instead of trusting the count
        elif t == b"PRCB":
            if cur_branch is not None:
                cur_branch["root"] = parse_prcb(d)
        elif t == b"FNAM":
            if phase == "procedure" and cur_branch is not None:
                if len(d) == 4:
                    cur_branch["flags"] = _decode_flags(struct.unpack_from("<I", d, 0)[0], [(0x1, "Success Completes Package")])
        elif t == b"PKC2":
            if cur_branch is not None and len(d) >= 1:
                cur_branch["data_input_indexes"].append(d[0])
        elif t in (b"POBA", b"POEA", b"POCA"):
            flush_branch()
            flush_value()
            flush_input()
            phase = "done"

    flush_value()
    flush_input()
    flush_branch()

    if not seen_pkdt:
        return None
    if not (top_conditions or value_entries or branches):
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "conditions": top_conditions,
        "data_inputs": data_inputs,
        "targets": value_entries,
        "branches": branches,
    }


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_packages: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for package procedures/targets...")
        all_packages.extend(extract_packages(esm_path))

    with_targets = [p for p in all_packages if p["targets"]]
    with_branches = [p for p in all_packages if p["branches"]]
    with_conditions = [p for p in all_packages if p["conditions"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_packages": len(all_packages),
        "packages_with_conditions": len(with_conditions),
        "packages_with_targets": len(with_targets),
        "packages_with_branches": len(with_branches),
        "packages": all_packages,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Package procedure/target scan complete in {elapsed:.1f}s ===")
    print(f"  Total packages with any decoded data: {len(all_packages):,}")
    print(f"  With top-level conditions:            {len(with_conditions):,}")
    print(f"  With location/target data:            {len(with_targets):,}")
    print(f"  With procedure tree branches:         {len(with_branches):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
