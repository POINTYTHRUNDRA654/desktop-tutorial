#!/usr/bin/env python3
"""
fo4_books_notes_keys_messages.py — FO4 Book (BOOK) / Note (NOTE) / Key
(KEYM) / Message (MESG)
====================================================================
Thirty-ninth stop in the "grind it to zero" pass. Four smaller,
related item/UI record types grouped into one scanner: Books are the
skill-book/perk-magazine/Actor-Value-training items every "unique
magazine" mod extends; Notes are holotapes/terminal-note/audio-log
items (Sound/Voice/Program/Terminal sub-typed); Keys are the trivial
lock-opening items; Messages are the conditional popup/message-box
system driving quest notifications and MCM-style in-game menus, each
with its own conditional multi-button choice list.

Source-verified (wbDefinitionsFO4.pas BOOK ~8819-8861, NOTE
~16034-16061, KEYM ~12662-12684, MESG ~11349-11366; deciders
wbBOOKTeachesDecider ~3091, wbNOTEDataDecider ~2811):

BOOK — EDID, FULL, DESC (LStringKC, tooltip description), CNAM
  (LStringKC, in-book readable text), MODL, ICON, KWDA, FIMD
  (Featured Item Message -> MESG), DATA (Value u32 + Weight float),
  DNAM (13-byte struct verified exact against all 327 real records:
  Flags u8 [Advance Actor Value/Can't be Taken/Add Spell/Add Perk] +
  Teaches union [4 bytes, decided by the Flags byte itself: bit 0x01
  -> Actor Value FormID -> AVIF, bit 0x04 -> Spell FormID -> SPEL,
  bit 0x10 -> Perk FormID -> PERK, else raw unused bytes] + Text
  Offset X/Y u32 each), INAM (Inventory Art -> STAT).

NOTE — EDID, FULL, MODL, ICON, DNAM (Type u8 enum: Sound/Voice/
  Program/Terminal), DATA (Value u32 + Weight float), SNAM (4-byte
  union, decided by DNAM Type: 0=Sound -> SNDR, 1=Voice -> Scene ->
  SCEN, 3=Terminal -> TERM, 2=Program/else -> raw unused bytes since
  Program-type notes use PNAM instead), PNAM (Program File string).

KEYM — record header flags Calc Value From Components (bit 11) /
  Pack-In Use Only (bit 13), EDID, FULL, KWDA, DATA (Value s32 +
  Weight float). Trivial record, included for completeness.

MESG — EDID, DESC (LStringKC, required body text), FULL (LStringKC,
  title), QNAM (Owner Quest -> QUST), DNAM (Flags u32: Message Box /
  Delay Initial Display), TNAM (Display Time u32), SNAM (SWF path
  string), NNAM (LStringKC, Short Title), Menu Buttons (repeating
  group boundary-keyed on ITXT [Button Text LStringKC], each
  optionally followed by one or more Conditions [standard 32-byte
  CTDA + optional CIS1/CIS2, the same reused parse_ctda helper used
  in every scanner that has Conditions] gating that button's
  visibility/enabled state).

Outputs:
  <scan-cache>/fo4_books_notes_keys_messages.json
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
GRAPH_OUT = _OUT_DIR / "fo4_books_notes_keys_messages.json"

COMPRESSED_FLAG = 0x00040000

KEYM_HEADER_FLAGS = [(1 << 11, "Calc Value From Components"), (1 << 13, "Pack-In Use Only")]
BOOK_DNAM_FLAGS = [(0x01, "Advance Actor Value"), (0x02, "Can't be Taken"), (0x04, "Add Spell"), (0x08, "Unknown 3"), (0x10, "Add Perk")]
NOTE_TYPE_ENUM = {0: "Sound", 1: "Voice", 2: "Program", 3: "Terminal"}
MESG_DNAM_FLAGS = [(0x01, "Message Box"), (0x02, "Delay Initial Display")]

COMPARE_OPS = ["==", "!=", ">", ">=", "<", "<="]


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


def resolve_lstring(sub_data: bytes, string_lookup: dict[int, str]) -> str | None:
    if len(sub_data) == 4:
        sid = struct.unpack_from("<I", sub_data, 0)[0]
        return string_lookup.get(sid)
    elif len(sub_data) > 1:
        return resolve_string(sub_data)
    return None


def fid_hex(raw: bytes) -> str | None:
    if len(raw) != 4:
        return None
    v = struct.unpack_from("<I", raw, 0)[0]
    return f"0x{v:08X}" if v else None


def parse_kwda(kwda: bytes) -> list[str]:
    return [f"0x{struct.unpack_from('<I', kwda, i * 4)[0]:08X}" for i in range(len(kwda) // 4)]


def parse_ctda(d: bytes) -> dict | None:
    if len(d) < 32:
        return None
    type_byte = d[0]
    comp_value = struct.unpack_from("<f", d, 4)[0]
    function = struct.unpack_from("<H", d, 8)[0]
    param1 = struct.unpack_from("<I", d, 12)[0]
    param2 = struct.unpack_from("<I", d, 16)[0]
    run_on = struct.unpack_from("<I", d, 20)[0]
    reference = struct.unpack_from("<I", d, 24)[0]
    param3 = struct.unpack_from("<i", d, 28)[0]
    op_index = (type_byte >> 5) & 0x07
    return {
        "flags": {
            "or": bool(type_byte & 0x01), "use_aliases": bool(type_byte & 0x02),
            "use_global": bool(type_byte & 0x04), "use_packdata": bool(type_byte & 0x08),
            "swap_subject_target": bool(type_byte & 0x10),
        },
        "operator": COMPARE_OPS[op_index] if op_index < len(COMPARE_OPS) else f"Unknown ({op_index})",
        "comparison_value": round(comp_value, 5), "function": function,
        "param1": f"0x{param1:08X}" if param1 else None,
        "param2": f"0x{param2:08X}" if param2 else None,
        "run_on": run_on,
        "reference": f"0x{reference:08X}" if reference else None,
        "param3": param3,
    }


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


def _extract_one_book(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    description: str | None = None
    book_text: str | None = None
    model_path: str | None = None
    icon_path: str | None = None
    keywords: list[str] = []
    featured_item_message: str | None = None
    value: int | None = None
    weight: float | None = None
    dnam_flags: list[str] = []
    teaches_type: str | None = None
    teaches_form_id: str | None = None
    text_offset_x: int | None = None
    text_offset_y: int | None = None
    inventory_art: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "DESC":
            description = resolve_lstring(d, string_lookup)
        elif tag == "CNAM":
            book_text = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "ICON":
            icon_path = resolve_string(d)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "FIMD":
            featured_item_message = fid_hex(d)
        elif tag == "DATA" and len(d) >= 8:
            value = struct.unpack_from("<I", d, 0)[0]
            weight = round(struct.unpack_from("<f", d, 4)[0], 5)
        elif tag == "DNAM" and len(d) >= 13:
            flags_raw = d[0]
            dnam_flags = _decode_flags_bitfield(flags_raw, BOOK_DNAM_FLAGS)
            union_bytes = d[1:5]
            if flags_raw & 0x01:
                teaches_type = "Actor Value"
                teaches_form_id = fid_hex(union_bytes)
            elif flags_raw & 0x04:
                teaches_type = "Spell"
                teaches_form_id = fid_hex(union_bytes)
            elif flags_raw & 0x10:
                teaches_type = "Perk"
                teaches_form_id = fid_hex(union_bytes)
            else:
                teaches_type = None
                teaches_form_id = None
            text_offset_x = struct.unpack_from("<I", d, 5)[0]
            text_offset_y = struct.unpack_from("<I", d, 9)[0]
        elif tag == "INAM":
            inventory_art = fid_hex(d)

    if not edid:
        return None

    return {
        "record_type": "BOOK", "form_id": f"0x{form_id:08X}", "edid": edid, "full_name": full,
        "description": description, "book_text": book_text,
        "model_path": model_path, "icon_path": icon_path, "keywords": keywords,
        "featured_item_message": featured_item_message,
        "value": value, "weight": weight,
        "flags": dnam_flags, "teaches_type": teaches_type, "teaches_form_id": teaches_form_id,
        "text_offset_x": text_offset_x, "text_offset_y": text_offset_y,
        "inventory_art": inventory_art,
    }


def _extract_one_note(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    model_path: str | None = None
    icon_path: str | None = None
    note_type_raw: int | None = None
    value: int | None = None
    weight: float | None = None
    sound: str | None = None
    scene: str | None = None
    terminal: str | None = None
    program_file: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "ICON":
            icon_path = resolve_string(d)
        elif tag == "DNAM" and len(d) >= 1:
            note_type_raw = d[0]
        elif tag == "DATA" and len(d) >= 8:
            value = struct.unpack_from("<i", d, 0)[0]
            weight = round(struct.unpack_from("<f", d, 4)[0], 5)
        elif tag == "SNAM" and len(d) == 4:
            if note_type_raw == 0:
                sound = fid_hex(d)
            elif note_type_raw == 1:
                scene = fid_hex(d)
            elif note_type_raw == 3:
                terminal = fid_hex(d)
        elif tag == "PNAM":
            program_file = resolve_string(d)

    if not edid:
        return None

    return {
        "record_type": "NOTE", "form_id": f"0x{form_id:08X}", "edid": edid, "full_name": full,
        "model_path": model_path, "icon_path": icon_path,
        "note_type": NOTE_TYPE_ENUM.get(note_type_raw, f"Unknown ({note_type_raw})") if note_type_raw is not None else None,
        "value": value, "weight": weight,
        "sound": sound, "scene": scene, "terminal": terminal, "program_file": program_file,
    }


def _extract_one_keym(dec: bytes, form_id: int, header_flags_raw: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    full: str | None = None
    keywords: list[str] = []
    value: int | None = None
    weight: float | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "KWDA":
            keywords = parse_kwda(d)
        elif tag == "DATA" and len(d) >= 8:
            value = struct.unpack_from("<i", d, 0)[0]
            weight = round(struct.unpack_from("<f", d, 4)[0], 5)

    if not edid:
        return None

    return {
        "record_type": "KEYM", "form_id": f"0x{form_id:08X}", "edid": edid, "full_name": full,
        "header_flags": _decode_flags_bitfield(header_flags_raw, KEYM_HEADER_FLAGS),
        "keywords": keywords, "value": value, "weight": weight,
    }


def _extract_one_mesg(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    description: str | None = None
    full: str | None = None
    owner_quest: str | None = None
    dnam_flags_raw: int | None = None
    display_time: int | None = None
    swf: str | None = None
    short_title: str | None = None
    buttons: list[dict] = []
    current_button: dict | None = None
    last_ctda: dict | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DESC":
            description = resolve_lstring(d, string_lookup)
        elif tag == "FULL":
            full = resolve_lstring(d, string_lookup)
        elif tag == "QNAM":
            owner_quest = fid_hex(d)
        elif tag == "DNAM" and len(d) >= 4:
            dnam_flags_raw = struct.unpack_from("<I", d, 0)[0]
        elif tag == "TNAM" and len(d) >= 4:
            display_time = struct.unpack_from("<I", d, 0)[0]
        elif tag == "SNAM":
            swf = resolve_string(d)
        elif tag == "NNAM":
            short_title = resolve_lstring(d, string_lookup)
        elif tag == "ITXT":
            if current_button is not None:
                buttons.append(current_button)
            current_button = {"button_text": resolve_lstring(d, string_lookup), "conditions": []}
            last_ctda = None
        elif tag == "CTDA":
            ctda = parse_ctda(d)
            if ctda is not None and current_button is not None:
                current_button["conditions"].append(ctda)
                last_ctda = ctda
        elif tag in ("CIS1", "CIS2") and last_ctda is not None:
            last_ctda[f"param_string_{tag[-1]}"] = resolve_string(d)

    if current_button is not None:
        buttons.append(current_button)

    if not edid:
        return None

    return {
        "record_type": "MESG", "form_id": f"0x{form_id:08X}", "edid": edid,
        "description": description, "full_name": full, "owner_quest": owner_quest,
        "flags": _decode_flags_bitfield(dnam_flags_raw, MESG_DNAM_FLAGS) if dnam_flags_raw is not None else [],
        "display_time": display_time, "swf": swf, "short_title": short_title,
        "buttons": buttons,
    }


def extract_all(esm_path: Path, string_lookup: dict[int, str]) -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    books: list[dict] = []
    notes: list[dict] = []
    keys: list[dict] = []
    messages: list[dict] = []

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
        if rec_type in (b"BOOK", b"NOTE", b"KEYM", b"MESG"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"BOOK":
                    r = _extract_one_book(dec, form_id, string_lookup)
                    if r is not None:
                        books.append(r)
                elif rec_type == b"NOTE":
                    r = _extract_one_note(dec, form_id, string_lookup)
                    if r is not None:
                        notes.append(r)
                elif rec_type == b"KEYM":
                    r = _extract_one_keym(dec, form_id, header_flags, string_lookup)
                    if r is not None:
                        keys.append(r)
                else:
                    r = _extract_one_mesg(dec, form_id, string_lookup)
                    if r is not None:
                        messages.append(r)
        pos += data_size

    return books, notes, keys, messages


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_books: list[dict] = []
    all_notes: list[dict] = []
    all_keys: list[dict] = []
    all_messages: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for books/notes/keys/messages...")
        books, notes, keys, messages = extract_all(esm_path, string_lookup)
        all_books.extend(books)
        all_notes.extend(notes)
        all_keys.extend(keys)
        all_messages.extend(messages)

    teaches_books = [b for b in all_books if b["teaches_type"]]
    terminal_notes = [n for n in all_notes if n["note_type"] == "Terminal"]
    messages_with_buttons = [m for m in all_messages if m["buttons"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_books": len(all_books),
        "books_that_teach": len(teaches_books),
        "total_notes": len(all_notes),
        "terminal_notes": len(terminal_notes),
        "total_keys": len(all_keys),
        "total_messages": len(all_messages),
        "messages_with_buttons": len(messages_with_buttons),
        "books": all_books,
        "notes": all_notes,
        "keys": all_keys,
        "messages": all_messages,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Book/Note/Key/Message scan complete in {elapsed:.1f}s ===")
    print(f"  Books: {len(all_books):,} ({len(teaches_books):,} teach an AV/Spell/Perk)")
    print(f"  Notes: {len(all_notes):,} ({len(terminal_notes):,} Terminal-typed)")
    print(f"  Keys: {len(all_keys):,}")
    print(f"  Messages: {len(all_messages):,} ({len(messages_with_buttons):,} with menu buttons)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
