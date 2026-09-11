#!/usr/bin/env python3
"""
fo4_ai_packages.py — Fallout 4 AI Package Inventory
======================================================
The strings scan already has every PACK record's EditorID; this adds
what script (if any) drives each package, which is the actual modding-
relevant question ("which package handles settler idle behavior",
"which package runs the workshop alarm response", etc.)

Update (verified against the authoritative xEdit/FO4Edit Pascal source,
wbDefinitionsFO4.pas): PKDT ("Pack Data" — general flags, package type,
interrupt override, preferred speed, interrupt flags) and PSDT
("Schedule" — month/day-of-week/date/hour/minute/duration) are both
simple, always-fixed-size 12-byte structs, and are now decoded below.

Deliberately still NOT decoded: the package's location/target data
(PLDT/PTDA/PDTO) and its "Procedure Tree" of branches. Those recur
inside a variable-count, nested tree structure (branches containing
their own CTDA condition blocks and their own target/location data),
not a simple flat repeat — meaningfully riskier to decode correctly
than everything else this scanning effort has shipped, and guessing at
an unfamiliar nested binary layout is exactly the mistake this whole
project already spent a day recovering from once. EDID + package
type/flags/schedule + attached Papyrus scripts is real, verified-safe
information; the nested procedure tree remains a distinct, harder
follow-up.

Outputs:
  <scan-cache>/fo4_ai_packages.json
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
GRAPH_OUT = _OUT_DIR / "fo4_ai_packages.json"

COMPRESSED_FLAG = 0x00040000

PKDT_TYPE = {18: "Package", 19: "Package Template"}
PKDT_INTERRUPT_OVERRIDE = {
    0: "None", 1: "Spectator", 2: "ObserveDead", 3: "GuardWarn", 4: "Combat",
    5: "Command Travel", 6: "Command Activate", 7: "Leave Workstation",
}
PKDT_SPEED = {0: "Walk", 1: "Jog", 2: "Run", 3: "Fast Walk"}
PKDT_GENERAL_FLAGS = [
    (0x00000001, "Offers Services"), (0x00000004, "Must complete"),
    (0x00000008, "Maintain Speed at Goal"), (0x00000010, "Treat As Player Follower"),
    (0x00000040, "Unlock doors at package start"), (0x00000080, "Unlock doors at package end"),
    (0x00000100, "Request Block Idles"), (0x00000200, "Continue if PC Near"),
    (0x00000400, "Once per day"), (0x00001000, "Skip Load Into Furniture"),
    (0x00002000, "Preferred Speed"), (0x00020000, "Always Sneak"),
    (0x00040000, "Allow Swimming"), (0x00100000, "Ignore Combat"),
    (0x00200000, "Weapons Unequipped"), (0x00800000, "Weapon Drawn"),
    (0x08000000, "No Combat Alert"), (0x20000000, "Wear Sleep Outfit"),
]
PKDT_INTERRUPT_FLAGS = [
    (0x0001, "Hellos to player"), (0x0002, "Random conversations"),
    (0x0004, "Observe combat behavior"), (0x0008, "Greet corpse behavior"),
    (0x0010, "Reaction to player actions"), (0x0020, "Friendly fire comments"),
    (0x0040, "Aggro Radius Behavior"), (0x0080, "Allow Idle Chatter"),
    (0x0200, "World Interactions"), (0x0400, "Off For Important Scene"),
]
PSDT_DAY_OF_WEEK = {
    0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday",
    5: "Friday", 6: "Saturday", 7: "Weekdays", 8: "Weekends",
    9: "Monday, Wednesday, Friday", 10: "Tuesday, Thursday", -1: "Any",
}


def _decode_flags(value: int, table: list[tuple[int, str]]) -> list[str]:
    return [name for bit, name in table if value & bit]


def parse_pkdt(d: bytes) -> dict | None:
    """PKDT 'Pack Data' — always a fixed 12-byte struct (verified against
    wbDefinitionsFO4.pas): General Flags:u32@0, Type:u8@4,
    Interrupt Override:u8@5, Preferred Speed:u8@6, Unknown:1@7,
    Interrupt Flags:u16@8, Unknown:2@10."""
    if len(d) < 10:
        return None
    try:
        gflags = struct.unpack_from("<I", d, 0)[0]
        ptype  = d[4]
        interrupt_override = d[5]
        speed  = d[6]
        iflags = struct.unpack_from("<H", d, 8)[0] if len(d) >= 10 else 0
        return {
            "general_flags": _decode_flags(gflags, PKDT_GENERAL_FLAGS),
            "type": PKDT_TYPE.get(ptype, f"unknown_{ptype}"),
            "interrupt_override": PKDT_INTERRUPT_OVERRIDE.get(interrupt_override, f"unknown_{interrupt_override}"),
            "preferred_speed": PKDT_SPEED.get(speed, f"unknown_{speed}"),
            "interrupt_flags": _decode_flags(iflags, PKDT_INTERRUPT_FLAGS),
        }
    except (struct.error, IndexError):
        return None


def parse_psdt(d: bytes) -> dict | None:
    """PSDT 'Schedule' — always a fixed 12-byte struct: Month:i8@0,
    Day of week:i8@1, Date:u8@2, Hour:i8@3, Minute:i8@4, Unused:3@5,
    Duration(minutes):i32@8."""
    if len(d) < 12:
        return None
    try:
        month = struct.unpack_from("<b", d, 0)[0]
        dow   = struct.unpack_from("<b", d, 1)[0]
        date  = d[2]
        hour  = struct.unpack_from("<b", d, 3)[0]
        minute = struct.unpack_from("<b", d, 4)[0]
        duration = struct.unpack_from("<i", d, 8)[0]
        return {
            "month": month if month != -1 else "Any",
            "day_of_week": PSDT_DAY_OF_WEEK.get(dow, f"unknown_{dow}"),
            "date": date,
            "hour": hour,
            "minute": minute,
            "duration_minutes": duration,
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


def scan_subs_dict(rec: bytes) -> dict[bytes, bytes]:
    out, pos = {}, 0
    while pos + 6 <= len(rec):
        t = rec[pos:pos + 4]
        n = struct.unpack_from("<H", rec, pos + 4)[0]
        pos += 6
        if pos + n > len(rec):
            break
        out[t] = rec[pos:pos + n]
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


def parse_vmad(data: bytes) -> list[dict]:
    """Copied verbatim from fo4_form_graph.py's parse_vmad (also duplicated
    in fo4_quest_graph.py) rather than a lighter reimplementation — this
    exact byte-layout logic is what's already been verified against the
    real ESM, and skip-logic for property values is exactly the kind of
    per-type detail worth not re-deriving from memory a second time."""
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
            ptype    = data[pos]; pos += 1
            _pstatus = data[pos]; pos += 1

            val = None
            try:
                if ptype == 1:
                    if obj_format == 2:
                        if pos + 8 > len(data):
                            break
                        fid = struct.unpack_from("<I", data, pos + 4)[0]
                        val = f"0x{fid:08X}" if fid else None
                        pos += 8
                    else:
                        if pos + 4 > len(data):
                            break
                        fid = struct.unpack_from("<I", data, pos)[0]
                        val = f"0x{fid:08X}" if fid else None
                        pos += 4
                elif ptype == 2:
                    slen = struct.unpack_from("<H", data, pos)[0]; pos += 2
                    val  = data[pos:pos + slen].decode("utf-8", errors="replace"); pos += slen
                elif ptype == 3:
                    val = struct.unpack_from("<i", data, pos)[0]; pos += 4
                elif ptype == 4:
                    val = round(struct.unpack_from("<f", data, pos)[0], 4); pos += 4
                elif ptype == 5:
                    val = bool(data[pos]); pos += 1
                elif ptype == 11:
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    step = 8 if obj_format == 2 else 4
                    items = []
                    for _ in range(min(cnt, 256)):
                        if pos + step > len(data):
                            break
                        if obj_format == 2:
                            fid = struct.unpack_from("<I", data, pos + 4)[0]
                        else:
                            fid = struct.unpack_from("<I", data, pos)[0]
                        if fid:
                            items.append(f"0x{fid:08X}")
                        pos += step
                    val = items
                elif ptype == 12:
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    items = []
                    for _ in range(min(cnt, 256)):
                        slen = struct.unpack_from("<H", data, pos)[0]; pos += 2
                        items.append(data[pos:pos + slen].decode("utf-8", errors="replace"))
                        pos += slen
                    val = items
                elif ptype == 13:
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    val = [struct.unpack_from("<i", data, pos + i * 4)[0]
                           for i in range(min(cnt, 256))]
                    pos += min(cnt, 256) * 4
                elif ptype == 14:
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    val = [round(struct.unpack_from("<f", data, pos + i * 4)[0], 4)
                           for i in range(min(cnt, 256))]
                    pos += min(cnt, 256) * 4
                elif ptype == 15:
                    cnt = struct.unpack_from("<I", data, pos)[0]; pos += 4
                    val = [bool(data[pos + i]) for i in range(min(cnt, 256))]
                    pos += min(cnt, 256)
                else:
                    props = []
                    break
            except (struct.error, IndexError):
                break

            if pname:
                props.append({"name": pname, "type_id": ptype, "value": val})

        scripts.append({"name": script_name, "properties": props})

    return scripts


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
                subs = scan_subs_dict(dec)
                edid = resolve_edid(subs[b"EDID"]) if b"EDID" in subs else None
                scripts: list[str] = []
                if b"VMAD" in subs:
                    try:
                        scripts = [s["name"] for s in parse_vmad(subs[b"VMAD"]) if s.get("name")]
                    except Exception:
                        pass
                pkdt = parse_pkdt(subs[b"PKDT"]) if b"PKDT" in subs else None
                psdt = parse_psdt(subs[b"PSDT"]) if b"PSDT" in subs else None
                if edid or scripts or pkdt:
                    out.append({"form_id": f"0x{form_id:08X}", "edid": edid, "scripts": scripts,
                                "pack_data": pkdt, "schedule": psdt})

        pos += data_size

    return out


def main():
    t0 = time.time()
    all_packages: list[dict] = []
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for AI packages...")
        all_packages.extend(extract_packages(esm_path))

    scripted = [p for p in all_packages if p["scripts"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_packages": len(all_packages),
        "scripted_packages": len(scripted),
        "packages": all_packages,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== AI package scan complete in {elapsed:.1f}s ===")
    print(f"  Total PACK records:   {len(all_packages):,}")
    print(f"  With attached script: {len(scripted):,}")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
