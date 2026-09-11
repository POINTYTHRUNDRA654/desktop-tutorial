#!/usr/bin/env python3
"""
fo4_terminals.py — FO4 Terminal Menu Structures
==================================================
Part of the "start on TERM/SCEN/FACT/RACE" follow-up requested after the
full record-type inventory audit. TERM is the most tractable of the four:
its Menu Items and Body Text sections are genuinely flat, repeatable
structures (unlike PACK's Procedure Tree), verified field-by-field from
the authoritative xEdit/FO4Edit Pascal source (wbDefinitionsFO4.pas).

Record layout (source-verified):
  NAM0 (Header Text, lstring), WNAM (Welcome Text, lstring), FULL (name),
  then two independently-counted repeatable sections:

  Body Text (count in BSIZ, informational only — not needed for a safe
  walk since each entry is self-delimiting): each entry is
  BTXT (Text, lstring) followed by 0+ CTDA condition blocks — the exact
  32-byte struct already verified against real data in
  fo4_package_procedures.py, reused verbatim here.

  Menu Items (count in ISIZ, same story): each entry is
    ITXT  Item Text (lstring) — the entry's own start marker
    RNAM  Response Text (lstring)
    ANAM  Type (u8 enum: Submenu-Terminal/Submenu-ReturnToTop/
          Submenu-ForceRedraw/Display Text/Display Image, some slots
          still unlabeled in xEdit itself — exposed as 'Unknown N' when
          so, which is honest since xEdit itself doesn't know them)
    ITID  Item ID (u16)
    UNAM  Display Text (lstring)
    VNAM  Show Image (plain ASCII string, a texture path)
    TNAM  Submenu (a FormID pointing at another TERM record)
    0+ CTDA condition blocks (same struct as Body Text's)

  Since entries have no explicit length prefix or end marker, entry
  boundaries are found the same way already proven for PACK's Data Input
  Values and Procedure Tree branches: start a new Menu Item whenever an
  ITXT is seen (start a new Body Text entry whenever a BTXT is seen).
  Body Text and Menu Item entries can never be confused for one another
  because they use different starting subrecord tags (BTXT vs ITXT).

Outputs:
  <scan-cache>/fo4_terminals.json
"""

import json, os, struct, sys, time, zlib
from pathlib import Path

FO4_DATA      = Path(os.environ.get("MOSSY_FO4_DATA") or r"E:\Steam\steamapps\common\Fallout 4\Data")
INTERFACE_BA2 = FO4_DATA / "Fallout4 - Interface.ba2"
MAIN_ESM      = FO4_DATA / "Fallout4.esm"
DLC_MAINS = [
    FO4_DATA / "DLCRobot.esm", FO4_DATA / "DLCCoast.esm", FO4_DATA / "DLCNukaWorld.esm",
    FO4_DATA / "DLCworkshop01.esm", FO4_DATA / "DLCworkshop02.esm", FO4_DATA / "DLCworkshop03.esm",
]
DLC_BA2S = [
    FO4_DATA / "DLCRobot - Main.ba2", FO4_DATA / "DLCCoast - Main.ba2", FO4_DATA / "DLCNukaWorld - Main.ba2",
    FO4_DATA / "DLCworkshop01 - Main.ba2", FO4_DATA / "DLCworkshop02 - Main.ba2", FO4_DATA / "DLCworkshop03 - Main.ba2",
]
_OUT_DIR  = Path(os.environ.get("MOSSY_SCAN_OUTPUT_DIR") or r"H:\Mossy Memory")
GRAPH_OUT = _OUT_DIR / "fo4_terminals.json"

COMPRESSED_FLAG = 0x00040000

MENU_ITEM_TYPE = {
    4: "Submenu - Terminal", 5: "Submenu - Return to Top Level",
    6: "Submenu - Force Redraw", 8: "Display Text", 16: "Display Image",
}

CTDA_COMPARE_OPS = ["Equal to", "Not equal to", "Greater than", "Greater than or equal to",
                    "Less than", "Less than or equal to"]
CTDA_FLAGS = [
    (0x01, "Or"), (0x02, "Use aliases"), (0x04, "Use global"),
    (0x08, "Use packdata"), (0x10, "Swap Subject and Target"),
]
CTDA_RUN_ON = {0: "Subject", 1: "Target", 2: "Reference", 3: "Combat Target",
               4: "Linked Reference", 5: "Quest Alias", 6: "Package Data",
               7: "Event Data", 9: "Command Target", 10: "Event Camera Ref", 11: "My Killer"}


def _decode_flags(value: int, table: list[tuple[int, str]]) -> list[str]:
    return [name for bit, name in table if value & bit]


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
        run_on = struct.unpack_from("<I", d, 20)[0]
        reference = struct.unpack_from("<I", d, 24)[0]
        param3 = struct.unpack_from("<i", d, 28)[0]
        return {
            "compare_operator": op,
            "flags": flags,
            "comparison_value": (f"0x{comp_raw:08X}" if use_global else comp_float),
            "function_id": function_id,
            "run_on": CTDA_RUN_ON.get(run_on, f"unknown_{run_on}"),
            "reference": f"0x{reference:08X}" if reference else None,
            "param3": param3,
        }
    except (struct.error, IndexError):
        return None


def _ba2_read_names(data, num_files, name_table_offset):
    names, pos = [], name_table_offset
    for _ in range(num_files):
        if pos + 2 > len(data):
            break
        nlen = struct.unpack_from("<H", data, pos)[0]; pos += 2
        if pos + nlen > len(data):
            break
        names.append(data[pos:pos + nlen].decode("utf-8", errors="replace")); pos += nlen
    return names


def ba2_extract_strings_files(ba2_path: Path) -> dict[str, bytes]:
    if not ba2_path.exists():
        return {}
    data = ba2_path.read_bytes()
    if data[:4] != b"BTDX":
        return {}
    num_files         = struct.unpack_from("<I", data, 12)[0]
    name_table_offset = struct.unpack_from("<Q", data, 16)[0]
    names = _ba2_read_names(data, num_files, name_table_offset)
    ENTRY_SIZE = 36
    result = {}
    for i, name in enumerate(names):
        name_lower = name.replace("\\", "/").lower()
        if not any(name_lower.endswith(ext) for ext in (".strings", ".dlstrings", ".ilstrings")):
            continue
        base = name_lower.split("/")[-1]
        if not (base.endswith("_en.strings") or base.endswith("_en.dlstrings") or base.endswith("_en.ilstrings")):
            continue
        entry_base = 24 + i * ENTRY_SIZE
        if entry_base + ENTRY_SIZE > len(data):
            continue
        offset      = struct.unpack_from("<Q", data, entry_base + 16)[0]
        packed_size = struct.unpack_from("<I", data, entry_base + 24)[0]
        unpacked    = struct.unpack_from("<I", data, entry_base + 28)[0]
        if packed_size == 0:
            file_bytes = data[offset:offset + unpacked]
        else:
            try:
                file_bytes = zlib.decompress(data[offset:offset + packed_size])
            except Exception:
                continue
        result[base] = file_bytes
    return result


def parse_strings_file(raw: bytes, is_dl_or_il: bool = False) -> dict[int, str]:
    if len(raw) < 8:
        return {}
    count = struct.unpack_from("<I", raw, 0)[0]
    if count > 500_000:
        return {}
    data_base = 8 + count * 8
    result = {}
    for i in range(count):
        entry_pos = 8 + i * 8
        if entry_pos + 8 > len(raw):
            break
        string_id = struct.unpack_from("<I", raw, entry_pos)[0]
        offset    = struct.unpack_from("<I", raw, entry_pos + 4)[0]
        abs_off   = data_base + offset
        if abs_off >= len(raw):
            continue
        if is_dl_or_il:
            if abs_off + 4 > len(raw):
                continue
            slen = struct.unpack_from("<I", raw, abs_off)[0]
            text_bytes = raw[abs_off + 4:abs_off + 4 + slen]
            if text_bytes.endswith(b"\x00"):
                text_bytes = text_bytes[:-1]
        else:
            null_pos = raw.find(b"\x00", abs_off)
            if null_pos == -1:
                null_pos = len(raw)
            text_bytes = raw[abs_off:null_pos]
        try:
            text = text_bytes.decode("utf-8", errors="replace").strip()
        except Exception:
            continue
        if text and string_id:
            result[string_id] = text
    return result


def build_string_lookup(ba2_files: dict[str, bytes]) -> dict[int, str]:
    lookup: dict[int, str] = {}
    for fname, raw in ba2_files.items():
        is_dl_il = fname.endswith(".dlstrings") or fname.endswith(".ilstrings")
        for sid, text in parse_strings_file(raw, is_dl_or_il=is_dl_il).items():
            if not is_dl_il or sid not in lookup:
                lookup[sid] = text
    return lookup


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


def resolve_edid(sub_data: bytes) -> str | None:
    null_pos = sub_data.find(b"\x00")
    raw_b = sub_data[:null_pos] if null_pos >= 0 else sub_data
    try:
        text = raw_b.decode("ascii", errors="replace").strip()
        return text if text else None
    except Exception:
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


def _extract_one_terminal(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    header: str | None = None
    welcome: str | None = None
    full: str | None = None
    body_entries: list[dict] = []
    menu_items: list[dict] = []

    cur_body: dict | None = None
    cur_item: dict | None = None

    def flush_body():
        nonlocal cur_body
        if cur_body is not None:
            body_entries.append(cur_body)
            cur_body = None

    def flush_item():
        nonlocal cur_item
        if cur_item is not None:
            menu_items.append(cur_item)
            cur_item = None

    for t, d in scan_subs_ordered(dec):
        if t == b"EDID":
            edid = resolve_edid(d)
        elif t == b"NAM0":
            header = resolve_lstring(d, string_lookup)
        elif t == b"WNAM":
            welcome = resolve_lstring(d, string_lookup)
        elif t == b"FULL":
            full = resolve_lstring(d, string_lookup)
        elif t == b"BTXT":
            flush_item()  # Body Text always precedes Menu Items in file order
            flush_body()
            cur_body = {"text": resolve_lstring(d, string_lookup), "conditions": []}
        elif t == b"ITXT":
            flush_body()
            flush_item()
            cur_item = {"item_text": resolve_lstring(d, string_lookup), "response_text": None,
                        "type": None, "item_id": None, "display_text": None,
                        "show_image": None, "submenu": None, "conditions": []}
        elif t == b"RNAM":
            if cur_item is not None:
                cur_item["response_text"] = resolve_lstring(d, string_lookup)
        elif t == b"ANAM":
            if cur_item is not None and len(d) >= 1:
                cur_item["type"] = MENU_ITEM_TYPE.get(d[0], f"Unknown {d[0]}")
        elif t == b"ITID":
            if cur_item is not None and len(d) == 2:
                cur_item["item_id"] = struct.unpack_from("<H", d, 0)[0]
        elif t == b"UNAM":
            if cur_item is not None:
                cur_item["display_text"] = resolve_lstring(d, string_lookup)
        elif t == b"VNAM":
            if cur_item is not None:
                cur_item["show_image"] = resolve_edid(d)
        elif t == b"TNAM":
            if cur_item is not None and len(d) == 4:
                fid = struct.unpack_from("<I", d, 0)[0]
                cur_item["submenu"] = f"0x{fid:08X}" if fid else None
        elif t == b"CTDA":
            c = parse_ctda(d)
            if c is None:
                continue
            if cur_item is not None:
                cur_item["conditions"].append(c)
            elif cur_body is not None:
                cur_body["conditions"].append(c)

    flush_body()
    flush_item()

    if not (header or welcome or full or body_entries or menu_items):
        return None

    return {
        "form_id": f"0x{form_id:08X}",
        "edid": edid,
        "header_text": header,
        "welcome_text": welcome,
        "full_name": full,
        "body_text": body_entries,
        "menu_items": menu_items,
    }


def extract_terminals(esm_path: Path, string_lookup: dict[int, str]) -> list[dict]:
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
        if rec_type == b"TERM":
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, flags)
            if dec is not None:
                t = _extract_one_terminal(dec, form_id, string_lookup)
                if t is not None:
                    out.append(t)
        pos += data_size

    return out


def main():
    t0 = time.time()

    print("=== Extracting STRINGS from BA2 archives ===")
    ba2_files: dict[str, bytes] = {}
    ba2_files.update(ba2_extract_strings_files(INTERFACE_BA2))
    for ba2_path in DLC_BA2S:
        if ba2_path.exists():
            ba2_files.update(ba2_extract_strings_files(ba2_path))
    string_lookup = build_string_lookup(ba2_files) if ba2_files else {}
    print(f"  {len(string_lookup):,} string IDs loaded")

    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_terminals: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for terminals...")
        all_terminals.extend(extract_terminals(esm_path, string_lookup))

    with_menu = [t for t in all_terminals if t["menu_items"]]
    total_menu_items = sum(len(t["menu_items"]) for t in all_terminals)

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_terminals": len(all_terminals),
        "terminals_with_menu_items": len(with_menu),
        "total_menu_items": total_menu_items,
        "terminals": all_terminals,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Terminal scan complete in {elapsed:.1f}s ===")
    print(f"  Total terminals:          {len(all_terminals):,}")
    print(f"  With menu items:          {len(with_menu):,}")
    print(f"  Total menu items:         {total_menu_items:,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
