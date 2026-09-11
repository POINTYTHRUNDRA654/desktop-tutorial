#!/usr/bin/env python3
"""
fo4_impact_data_sets.py — FO4 Impact Data Set (IPDS)
========================================================================
Twelfth stop in the "grind it to zero" pass, first of the EXPL/PROJ/
IPDS "explosion and projectile mechanics" cluster. Impact Data Sets map
a Material (MATT) to the Impact (IPCT — visual/particle effect) that
should play when something hits a surface of that material — referenced
by HAZD's DNAM struct and BPTD's per-part Severable/Explodable Impact
DataSet fields, both already captured as FormID references elsewhere in
this project; this scanner decodes what those references point to.

Trivially simple, source-verified (wbDefinitionsFO4.pas ~11189-11195):
EDID + a repeating array of PNAM subrecords, each a fixed 8-byte struct
(Material FormID -> MATT, Impact FormID -> IPCT). One tag, no ambiguity.

Outputs:
  <scan-cache>/fo4_impact_data_sets.json
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
GRAPH_OUT = _OUT_DIR / "fo4_impact_data_sets.json"

COMPRESSED_FLAG = 0x00040000


def resolve_edid(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("ascii", errors="replace").strip()
        return text if text else None
    except Exception:
        return None


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
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


def _extract_one_ipds(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    entries: list[dict] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "PNAM" and len(d) >= 8:
            entries.append({"material": fid_hex(d[0:4]), "impact": fid_hex(d[4:8])})

    if not edid:
        return None

    return {"form_id": f"0x{form_id:08X}", "edid": edid, "entries": entries}


def extract_ipds(esm_path: Path) -> list[dict]:
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
        if rec_type == b"IPDS":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                i = _extract_one_ipds(dec, form_id)
                if i is not None:
                    out.append(i)
        pos += data_size

    return out


def main():
    t0 = time.time()
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_ipds: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for impact data sets...")
        all_ipds.extend(extract_ipds(esm_path))

    total_entries = sum(len(i["entries"]) for i in all_ipds)

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_impact_data_sets": len(all_ipds),
        "total_material_impact_entries": total_entries,
        "impact_data_sets": all_ipds,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Impact data set scan complete in {elapsed:.1f}s ===")
    print(f"  Total impact data sets: {len(all_ipds):,}")
    print(f"  Total material->impact entries: {total_entries:,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
