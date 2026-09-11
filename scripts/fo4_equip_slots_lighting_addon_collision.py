#!/usr/bin/env python3
"""
fo4_equip_slots_lighting_addon_collision.py — FO4 Equip Slot (EQUP) /
Lighting Template (LGTM) / Addon Node (ADDN) / Collision Layer (COLL)
========================================================================
Fortieth stop in the "grind it to zero" pass, fifteenth of the broader
engine-plumbing sweep. Four smaller engine-plumbing record types
grouped into one scanner: Equip Slots are the body-slot exclusivity
system every piece of equippable armor/weapon references (their
parent-slot chain is what makes wearing a hat conflict with a helmet);
Lighting Templates are the default lighting/fog recipe every interior
cell inherits unless overridden; Addon Nodes are the attach-point
particle/light/sound emitters used by weapon muzzle flashes and
similar effects; Collision Layers are the physics collision-group
system (what can collide with what) that every custom collidable
object's COL/physics setup depends on.

Source-verified (wbDefinitionsFO4.pas EQUP ~11969-11978, LGTM
~11790-11823, ADDN ~10981-10997, COLL ~12417-12435):

EQUP — EDID, PNAM (Slot Parents, array of FormID -> EQUP, the
  exclusivity-chain), DATA (Flags u32: Use All Parents/Parents
  Optional/Item Slot), ANAM (Condition Actor Value -> AVIF, or the
  special sentinel value 0xFFFFFFFF).

LGTM — DATA (136-byte-when-fully-present Lighting struct: Ambient/
  Directional/Fog Near colors, Fog Near/Far distances, Directional
  Rotation XY/Z, Directional Fade, Fog Clip Distance/Power, Fog
  Color Far, Fog Max, Light Fade Begin/End, Near Height Mid/Range,
  Fog Color High Near/Far, High Density Scale, Fog Near/Far/High
  Near/High Far Scale, Far Height Mid/Range — parsed with a running
  offset since source declares only the first 15 of 27 elements [88
  bytes, through Light Fade End] as guaranteed present, the same
  legacy-shrink pattern already established for EXPL/WTHR), DALC
  (single 32-byte Directional Ambient Lighting Colors struct — unlike
  WTHR's 8 time-of-day variants, LGTM has exactly one), WGDR (single
  God Rays FormID -> GDRY, also unlike WTHR's 8 time-of-day variants).

ADDN — EDID, MODL, DATA (Node Index s32), SNAM (Sound -> SNDR), LNAM
  (Light -> LIGH), DNAM (Master Particle System Cap u16 + Flags u16
  enum: No Master Particle System/Master Particle System/Always
  Loaded/Master Particle System and Always Loaded).

COLL — EDID, DESC (LStringKC, description), BNAM (Index u32 — the
  actual collision-layer ID referenced by NIF collision setups),
  FNAM (Debug Color: R/G/B/Unused, 4 bytes), GNAM (Flags u32: Trigger
  Volume/Sensor/Navmesh Obstacle), MNAM (Name string), INTV
  (Interactables Count u32), CNAM (Collides With, array of FormID ->
  COLL — the actual collision matrix, which layers this layer is
  permitted to collide with).

Outputs:
  <scan-cache>/fo4_equip_slots_lighting_addon_collision.json
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
GRAPH_OUT = _OUT_DIR / "fo4_equip_slots_lighting_addon_collision.json"

COMPRESSED_FLAG = 0x00040000

EQUP_DATA_FLAGS = [(0x01, "Use All Parents"), (0x02, "Parents Optional"), (0x04, "Item Slot")]
ADDN_FLAGS_ENUM = {0: "No Master Particle System", 1: "Master Particle System", 2: "Always Loaded", 3: "Master Particle System and Always Loaded"}
COLL_FLAGS = [(0x01, "Trigger Volume"), (0x02, "Sensor"), (0x04, "Navmesh Obstacle")]

LGTM_DATA_FIELDS = [
    ("ambient_color", "color"), ("directional_color", "color"), ("fog_color_near", "color"),
    ("fog_near", "float"), ("fog_far", "float"),
    ("directional_rotation_xy", "s32"), ("directional_rotation_z", "s32"),
    ("directional_fade", "float"), ("fog_clip_distance", "float"), ("fog_power", "float"),
    ("_unused32", "skip32"),
    ("fog_color_far", "color"), ("fog_max", "float"),
    ("light_fade_begin", "float"), ("light_fade_end", "float"),
    ("_unused4", "skip4"),
    ("near_height_mid", "float"), ("near_height_range", "float"),
    ("fog_color_high_near", "color"), ("fog_color_high_far", "color"),
    ("high_density_scale", "float"), ("fog_near_scale", "float"), ("fog_far_scale", "float"),
    ("fog_high_near_scale", "float"), ("fog_high_far_scale", "float"),
    ("far_height_mid", "float"), ("far_height_range", "float"),
]


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
    if v == 0xFFFFFFFF:
        return "0xFFFFFFFF (sentinel)"
    return f"0x{v:08X}" if v else None


def parse_fid_array(raw: bytes) -> list[str]:
    out = []
    for i in range(len(raw) // 4):
        v = fid_hex(raw[i * 4:i * 4 + 4])
        if v:
            out.append(v)
    return out


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


def _parse_byte_color(d: bytes, off: int) -> dict | None:
    if off + 3 > len(d):
        return None
    return {"r": d[off], "g": d[off + 1], "b": d[off + 2]}


def _parse_lgtm_data(d: bytes) -> dict:
    out: dict = {}
    off = 0
    n = len(d)
    for name, kind in LGTM_DATA_FIELDS:
        if kind == "color":
            c = _parse_byte_color(d, off)
            if c is None:
                break
            out[name] = c
            off += 4
        elif kind == "float":
            if off + 4 > n:
                break
            out[name] = round(struct.unpack_from("<f", d, off)[0], 5)
            off += 4
        elif kind == "s32":
            if off + 4 > n:
                break
            out[name] = struct.unpack_from("<i", d, off)[0]
            off += 4
        elif kind in ("skip32", "skip4"):
            skip_len = 32 if kind == "skip32" else 4
            if off + skip_len > n:
                break
            off += skip_len
    return out


def _parse_dalc(d: bytes) -> dict | None:
    if len(d) < 32:
        return None
    directional = {}
    directions = ["x_plus", "x_minus", "y_plus", "y_minus", "z_plus", "z_minus"]
    for i, dname in enumerate(directions):
        c = _parse_byte_color(d, i * 4)
        if c:
            directional[dname] = c
    specular = _parse_byte_color(d, 24)
    scale = round(struct.unpack_from("<f", d, 28)[0], 5) if len(d) >= 32 else None
    return {"directional": directional, "specular": specular, "scale": scale}


def _extract_one_equp(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    slot_parents: list[str] = []
    flags_raw: int | None = None
    condition_actor_value: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "PNAM":
            fid = fid_hex(d)
            if fid:
                slot_parents.append(fid)
        elif tag == "DATA" and len(d) >= 4:
            flags_raw = struct.unpack_from("<I", d, 0)[0]
        elif tag == "ANAM":
            condition_actor_value = fid_hex(d)

    if not edid:
        return None

    return {
        "record_type": "EQUP", "form_id": f"0x{form_id:08X}", "edid": edid,
        "slot_parents": slot_parents,
        "flags": _decode_flags_bitfield(flags_raw, EQUP_DATA_FLAGS) if flags_raw is not None else [],
        "condition_actor_value": condition_actor_value,
    }


def _extract_one_lgtm(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    lighting: dict = {}
    dalc: dict | None = None
    god_rays: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DATA":
            lighting = _parse_lgtm_data(d)
        elif tag == "DALC":
            dalc = _parse_dalc(d)
        elif tag == "WGDR":
            god_rays = fid_hex(d)

    if not edid:
        return None

    return {
        "record_type": "LGTM", "form_id": f"0x{form_id:08X}", "edid": edid,
        "lighting": lighting, "directional_ambient": dalc, "god_rays": god_rays,
    }


def _extract_one_addn(dec: bytes, form_id: int) -> dict | None:
    edid: str | None = None
    model_path: str | None = None
    node_index: int | None = None
    sound: str | None = None
    light: str | None = None
    particle_system_cap: int | None = None
    flags_type: str | None = None

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "MODL":
            model_path = resolve_string(d)
        elif tag == "DATA" and len(d) >= 4:
            node_index = struct.unpack_from("<i", d, 0)[0]
        elif tag == "SNAM":
            sound = fid_hex(d)
        elif tag == "LNAM":
            light = fid_hex(d)
        elif tag == "DNAM" and len(d) >= 4:
            particle_system_cap = struct.unpack_from("<H", d, 0)[0]
            flags_raw = struct.unpack_from("<H", d, 2)[0]
            flags_type = ADDN_FLAGS_ENUM.get(flags_raw, f"Unknown ({flags_raw})")

    if not edid:
        return None

    return {
        "record_type": "ADDN", "form_id": f"0x{form_id:08X}", "edid": edid,
        "model_path": model_path, "node_index": node_index,
        "sound": sound, "light": light,
        "particle_system_cap": particle_system_cap, "particle_system_flags": flags_type,
    }


def _extract_one_coll(dec: bytes, form_id: int, string_lookup: dict[int, str]) -> dict | None:
    edid: str | None = None
    description: str | None = None
    index: int | None = None
    debug_color: dict | None = None
    flags_raw: int | None = None
    name: str | None = None
    interactables_count: int | None = None
    collides_with: list[str] = []

    for tag_b, d in scan_subs_ordered(dec):
        tag = tag_b.decode("ascii", errors="replace")
        if tag == "EDID":
            edid = resolve_edid(d)
        elif tag == "DESC":
            description = resolve_lstring(d, string_lookup)
        elif tag == "BNAM" and len(d) >= 4:
            index = struct.unpack_from("<I", d, 0)[0]
        elif tag == "FNAM" and len(d) >= 3:
            debug_color = _parse_byte_color(d, 0)
        elif tag == "GNAM" and len(d) >= 4:
            flags_raw = struct.unpack_from("<I", d, 0)[0]
        elif tag == "MNAM":
            name = resolve_string(d)
        elif tag == "INTV" and len(d) >= 4:
            interactables_count = struct.unpack_from("<I", d, 0)[0]
        elif tag == "CNAM":
            collides_with = parse_fid_array(d)

    if not edid:
        return None

    return {
        "record_type": "COLL", "form_id": f"0x{form_id:08X}", "edid": edid,
        "description": description, "index": index, "debug_color": debug_color,
        "flags": _decode_flags_bitfield(flags_raw, COLL_FLAGS) if flags_raw is not None else [],
        "name": name, "interactables_count": interactables_count, "collides_with": collides_with,
    }


def extract_all(esm_path: Path, string_lookup: dict[int, str]):
    data = esm_path.read_bytes()
    length = len(data)
    pos = 0
    equps: list[dict] = []
    lgtms: list[dict] = []
    addns: list[dict] = []
    colls: list[dict] = []

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
        if rec_type in (b"EQUP", b"LGTM", b"ADDN", b"COLL"):
            raw = data[pos:pos + data_size]
            dec = _decomp(raw, header_flags)
            if dec is not None:
                if rec_type == b"EQUP":
                    r = _extract_one_equp(dec, form_id)
                    if r is not None:
                        equps.append(r)
                elif rec_type == b"LGTM":
                    r = _extract_one_lgtm(dec, form_id)
                    if r is not None:
                        lgtms.append(r)
                elif rec_type == b"ADDN":
                    r = _extract_one_addn(dec, form_id)
                    if r is not None:
                        addns.append(r)
                else:
                    r = _extract_one_coll(dec, form_id, string_lookup)
                    if r is not None:
                        colls.append(r)
        pos += data_size

    return equps, lgtms, addns, colls


def main():
    t0 = time.time()
    string_lookup: dict[int, str] = {}
    esm_list = [MAIN_ESM] + [p for p in DLC_MAINS if p.exists()]
    all_equp: list[dict] = []
    all_lgtm: list[dict] = []
    all_addn: list[dict] = []
    all_coll: list[dict] = []
    for esm_path in esm_list:
        if not esm_path.exists():
            print(f"  SKIP: {esm_path}")
            continue
        mb = esm_path.stat().st_size // 1024 // 1024
        print(f"Parsing {esm_path.name} ({mb} MB) for equip slots/lighting templates/addon nodes/collision layers...")
        equp, lgtm, addn, coll = extract_all(esm_path, string_lookup)
        all_equp.extend(equp)
        all_lgtm.extend(lgtm)
        all_addn.extend(addn)
        all_coll.extend(coll)

    item_slots = [e for e in all_equp if "Item Slot" in e["flags"]]
    colls_with_matrix = [c for c in all_coll if c["collides_with"]]

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_equip_slots": len(all_equp),
        "item_slots": len(item_slots),
        "total_lighting_templates": len(all_lgtm),
        "total_addon_nodes": len(all_addn),
        "total_collision_layers": len(all_coll),
        "collision_layers_with_matrix": len(colls_with_matrix),
        "equip_slots": all_equp,
        "lighting_templates": all_lgtm,
        "addon_nodes": all_addn,
        "collision_layers": all_coll,
    }
    GRAPH_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"\n=== Equip Slot/Lighting Template/Addon Node/Collision Layer scan complete in {elapsed:.1f}s ===")
    print(f"  Equip Slots: {len(all_equp):,} ({len(item_slots):,} Item Slot)")
    print(f"  Lighting Templates: {len(all_lgtm):,}")
    print(f"  Addon Nodes: {len(all_addn):,}")
    print(f"  Collision Layers: {len(all_coll):,} ({len(colls_with_matrix):,} with a collision matrix)")
    print(f"  Saved: {GRAPH_OUT}")


if __name__ == "__main__":
    main()
