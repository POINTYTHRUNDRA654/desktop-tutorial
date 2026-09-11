#!/usr/bin/env python3
"""
fo4_placement_index.py — FO4 Placed Object / Placed NPC index (REFR/ACHR)
========================================================================
Third stop in the world-data push, and architecturally different from
every other scanner in this project. REFR (Placed Object) and ACHR
(Placed NPC) are not "definitions" the way every other record type is
— they're per-instance PLACEMENTS of a base object/NPC somewhere in the
world, and the base ESM alone has 1,244,528 REFR + 7,615 ACHR records
against only 21,883 unique Base FormIDs. A one-JSON-entry-per-instance
dump (the pattern every other scanner in this project uses) would
produce an unusably large scan cache — multiple gigabytes, nowhere
close to viable as AI context. So this scanner is deliberately an
AGGREGATE INDEX keyed by Base FormID, not a per-instance decode: "how
many times is base object X placed in the world, in which cells, is it
ever Persistent/Initially Disabled" — which is the actual question a
modder validating "is this Base Object already used somewhere" or
"how common is this placement" would ask, without paying the cost of
dumping 1.2 million individual position/rotation triples.

Source-verified (wbDefinitionsFO4.pas REFR ~14311-14700+, ACHR
~7269-7359, GRUP header format per the standard Bethesda record-header
spec): REFR/ACHR both carry EDID (rare on placed instances), VMAD
(script data — deliberately not decoded, arbitrary Papyrus-fragment
bytecode, same class of complexity as originally-deferred IMAD but a
permanent skip here since it's per-instance script state, not a fixed
struct), NAME (Base FormID — the only field this scanner actually
indexes on). REFR's record-HEADER flags carry Persistent (bit 10) and
Initially Disabled (bit 11) — the two flags most relevant to "will this
placement actually appear in a fresh save," decoded straight from the
24-byte record header exactly like the technique already established
for STAT/MSTT/ACTI/DOOR/FURN.

  Cell/worldspace attribution: a REFR/ACHR record does NOT store its
  own containing CELL FormID — that relationship exists only through
  the file's GRUP nesting (a CELL record is immediately followed by
  its own Persistent/Temporary/VisibleDistant Children GRUPs before the
  next sibling CELL appears; a WRLD record is immediately followed by
  its own World Children GRUP containing every exterior CELL block for
  that worldspace). This scanner tracks the nearest-preceding CELL/WRLD
  record encountered during its single linear pass and attributes every
  REFR/ACHR it sees to that CELL (and, for exterior cells, that WRLD) —
  the same "nearest enclosing record" heuristic xEdit and other FO4
  format tooling rely on, correct for the standard layout every
  Bethesda tool (including the Creation Kit) actually produces, though
  not a substitute for genuine GRUP-tree parsing if a mod's file uses
  an unusual group order.

Outputs (per Base FormID, only kept if placed at least once):
  count, persistent_count, initially_disabled_count, record_type_counts
  (REFR vs ACHR), and up to 5 sample placements (cell, worldspace,
  persistent/initially-disabled flags) — NOT full position/rotation
  data, which is exactly the bulk this scanner exists to avoid dumping.

  <scan-cache>/fo4_placement_index.json
"""

import json, os, struct, sys, time, zlib
from collections import defaultdict
from pathlib import Path

FO4_DATA  = Path(os.environ.get("MOSSY_FO4_DATA") or r"E:\Steam\steamapps\common\Fallout 4\Data")
MAIN_ESM  = FO4_DATA / "Fallout4.esm"
DLC_MAINS = [
    FO4_DATA / "DLCRobot.esm", FO4_DATA / "DLCCoast.esm", FO4_DATA / "DLCNukaWorld.esm",
    FO4_DATA / "DLCworkshop01.esm", FO4_DATA / "DLCworkshop02.esm", FO4_DATA / "DLCworkshop03.esm",
]
_OUT_DIR  = Path(os.environ.get("MOSSY_SCAN_OUTPUT_DIR") or r"H:\Mossy Memory")
GRAPH_OUT = _OUT_DIR / "fo4_placement_index.json"

COMPRESSED_FLAG = 0x00040000
PERSISTENT_BIT = 1 << 10
INITIALLY_DISABLED_BIT = 1 << 11
MAX_SAMPLES_PER_BASE = 5


def fid_hex(v: int) -> str | None:
    return f"0x{v:08X}" if v else None


def _decomp(data: bytes, flags: int) -> bytes | None:
    if flags & COMPRESSED_FLAG:
        if len(data) < 4:
            return None
        try:
            return zlib.decompress(data[4:])
        except Exception:
            return None
    return data


def _find_name_fid(rec: bytes) -> int | None:
    # Minimal targeted scan: only look for the NAME subrecord (Base
    # FormID), skipping everything else — this is what makes a
    # 1.24-million-record pass affordable.
    pos = 0
    n = len(rec)
    while pos + 6 <= n:
        t = rec[pos:pos + 4]
        length = struct.unpack_from("<H", rec, pos + 4)[0]
        pos += 6
        if pos + length > n:
            break
        if t == b"NAME" and length == 4:
            return struct.unpack_from("<I", rec, pos)[0]
        pos += length
    return None


def build_index(esm_path: Path, index: dict) -> tuple[int, int]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    total_refr = total_achr = 0
    current_cell: int | None = None
    current_wrld: int | None = None

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

        if rec_type == b"CELL":
            current_cell = form_id
        elif rec_type == b"WRLD":
            current_wrld = form_id
            current_cell = None
        elif rec_type in (b"REFR", b"ACHR"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                base_fid = _find_name_fid(dec)
                if base_fid:
                    if rec_type == b"REFR":
                        total_refr += 1
                    else:
                        total_achr += 1
                    entry = index[base_fid]
                    entry["count"] += 1
                    entry["type_counts"][rec_type.decode()] += 1
                    persistent = bool(header_flags & PERSISTENT_BIT)
                    initially_disabled = bool(header_flags & INITIALLY_DISABLED_BIT)
                    if persistent:
                        entry["persistent_count"] += 1
                    if initially_disabled:
                        entry["initially_disabled_count"] += 1
                    if len(entry["samples"]) < MAX_SAMPLES_PER_BASE:
                        entry["samples"].append({
                            "form_id": fid_hex(form_id),
                            "record_type": rec_type.decode(),
                            "cell": fid_hex(current_cell) if current_cell else None,
                            "worldspace": fid_hex(current_wrld) if current_wrld else None,
                            "persistent": persistent,
                            "initially_disabled": initially_disabled,
                        })
        pos += data_size

    return total_refr, total_achr


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    index: dict[int, dict] = defaultdict(lambda: {
        "count": 0, "persistent_count": 0, "initially_disabled_count": 0,
        "type_counts": defaultdict(int), "samples": [],
    })
    total_refr = total_achr = 0
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for placements...")
        r, a = build_index(esm_path, index)
        total_refr += r
        total_achr += a

    base_objects = []
    for base_fid, entry in index.items():
        base_objects.append({
            "base_form_id": fid_hex(base_fid),
            "count": entry["count"],
            "persistent_count": entry["persistent_count"],
            "initially_disabled_count": entry["initially_disabled_count"],
            "type_counts": dict(entry["type_counts"]),
            "samples": entry["samples"],
        })
    base_objects.sort(key=lambda x: -x["count"])

    unique_base_objects = len(base_objects)
    with_only_one_placement = sum(1 for b in base_objects if b["count"] == 1)

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_refr": total_refr,
        "total_achr": total_achr,
        "unique_base_objects": unique_base_objects,
        "with_only_one_placement": with_only_one_placement,
        "base_objects": base_objects,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Placement index scan complete in {elapsed:.1f}s ===")
    print(f"  REFR: {total_refr:,}, ACHR: {total_achr:,}, unique base objects: {unique_base_objects:,} ({with_only_one_placement:,} placed exactly once)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
