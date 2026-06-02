"""
fo4_esp_generator.py
====================
Automatic ESP / ESM record generation for Fallout 4.

Two output modes
----------------
1. Binary ESP  — writes a valid .esp file directly.  Supports the most common
   record types needed for new mods:
     TES4  Master / header
     STAT  Static mesh (placed object with no interaction)
     FLOR  Flora (harvestable plant)
     ACTI  Activator (trigger / interactive object)
     WEAP  Weapon (ranged or melee)
     ARMO  Armor / clothing item
     ARMA  Armor addon (mesh reference for ARMO)
     NPC_  Non-player character stub
     LIGH  Light source
     MISC  Miscellaneous item (junk, component)

2. xEdit Pascal script (.pas) — for users who already have FO4Edit / xEdit
   installed.  Run the script inside xEdit to create the records interactively
   with full validation.  No binary format knowledge required.

Binary format reference
-----------------------
Bethesda ESP records:
  [4] Type code (ASCII, e.g. b'STAT')
  [4] Data size (uint32 LE) — total size of subrecords that follow
  [4] Flags (uint32 LE)     — 0x00000800 = Persistent, 0x00000400 = Initially Disabled
  [4] FormID (uint32 LE)    — unique record identifier, starts at 0x00000800 for new records
  [2] Version (uint16 LE)   — 0x83 for FO4
  [2] Unknown (uint16 LE)   — usually 0x0000

Subrecords:
  [4] Type code
  [2] Size (uint16 LE)
  [N] Data

TES4 group / record structure is handled by the _ESPWriter class.
"""

import bpy
import os
import struct
import math
from pathlib import Path
from typing import List, Optional, Tuple


# ---------------------------------------------------------------------------
# FormID allocator — tracks next free FormID within the plugin
# ---------------------------------------------------------------------------

class FormIDAllocator:
    """Allocates FormIDs starting from 0x00000800 (first valid plugin-local ID)."""

    def __init__(self, start: int = 0x00000800):
        self._next = start

    def next(self) -> int:
        fid = self._next
        self._next += 1
        return fid

    def peek(self) -> int:
        return self._next


# ---------------------------------------------------------------------------
# Low-level binary ESP writer
# ---------------------------------------------------------------------------

class _ESPWriter:
    """Writes Bethesda binary record data."""

    FO4_VERSION = 0x83

    def __init__(self):
        self._buf = bytearray()

    def _pack(self, fmt: str, *values) -> bytes:
        return struct.pack(fmt, *values)

    # ── Subrecord helpers ────────────────────────────────────────────────

    def sub(self, type_code: str, data: bytes) -> bytes:
        """Build a subrecord: type(4) + size(2) + data."""
        assert len(type_code) == 4, f"Subrecord type must be 4 chars: {type_code!r}"
        return (type_code.encode('ascii')
                + struct.pack('<H', len(data))
                + data)

    def sub_str(self, type_code: str, text: str) -> bytes:
        """Null-terminated string subrecord."""
        return self.sub(type_code, text.encode('utf-8') + b'\x00')

    def sub_formid(self, type_code: str, formid: int) -> bytes:
        return self.sub(type_code, struct.pack('<I', formid))

    def sub_float(self, type_code: str, value: float) -> bytes:
        return self.sub(type_code, struct.pack('<f', value))

    def sub_uint32(self, type_code: str, value: int) -> bytes:
        return self.sub(type_code, struct.pack('<I', value))

    def sub_uint8(self, type_code: str, value: int) -> bytes:
        return self.sub(type_code, struct.pack('<B', value))

    def sub_obnd(self, x1=-64, y1=-64, z1=-64, x2=64, y2=64, z2=64) -> bytes:
        """Object bounds subrecord — OBND."""
        data = struct.pack('<6h', x1, y1, z1, x2, y2, z2)
        return self.sub('OBND', data)

    # ── Record wrapper ───────────────────────────────────────────────────

    def record(self, type_code: str, formid: int,
               subrecords: bytes, flags: int = 0) -> bytes:
        """Wrap subrecords in a record header."""
        assert len(type_code) == 4
        return (type_code.encode('ascii')
                + struct.pack('<IIIHh',
                              len(subrecords),   # data size
                              flags,             # record flags
                              formid,            # FormID
                              self.FO4_VERSION,  # version
                              0))                # unknown
        # Note: subrecords appended by caller

    def full_record(self, type_code: str, formid: int,
                    subrecords: bytes, flags: int = 0) -> bytes:
        hdr = self.record(type_code, formid, subrecords, flags)
        return hdr + subrecords

    # ── Group wrapper ────────────────────────────────────────────────────

    def group(self, label: bytes, records: bytes, group_type: int = 0) -> bytes:
        """GRUP wrapper: type(4) + size(4) + label(4) + groupType(4) + stamp(4)."""
        size = 24 + len(records)   # 24 = GRUP header size
        return (b'GRUP'
                + struct.pack('<I', size)
                + label
                + struct.pack('<IHH', group_type, 0, 0)
                + records)


# ---------------------------------------------------------------------------
# Record builders
# ---------------------------------------------------------------------------

def build_tes4(author: str = "Mossy Industries",
               description: str = "Auto-generated by Mossy FO4 Addon",
               masters: List[str] = None) -> bytes:
    """Build the TES4 header record."""
    w   = _ESPWriter()
    subs = bytearray()

    # HEDR subrecord: version float, num records, next object ID
    subs += w.sub('HEDR', struct.pack('<fII', 1.0, 0, 0x800))
    subs += w.sub_str('CNAM', author)
    subs += w.sub_str('SNAM', description)

    for master in (masters or ["Fallout4.esm"]):
        subs += w.sub_str('MAST', master)
        subs += w.sub('DATA', struct.pack('<Q', 0))   # file size placeholder

    return w.full_record('TES4', 0, bytes(subs))


def build_stat(formid: int, editor_id: str, nif_path: str,
               bounds: Tuple = (-64,-64,-64,64,64,64)) -> bytes:
    """Build a STAT (static mesh) record."""
    w    = _ESPWriter()
    subs = bytearray()
    subs += w.sub_str('EDID', editor_id)
    subs += w.sub_obnd(*bounds)
    # MODL — model file path (relative to Data\Meshes\)
    nif_clean = nif_path.replace('\\', '/')
    subs += w.sub_str('MODL', nif_clean)
    # DNAM — direction material flags (0 = none)
    subs += w.sub('DNAM', struct.pack('<fB', 0.0, 0))
    return w.full_record('STAT', formid, bytes(subs))


def build_flor(formid: int, editor_id: str, name: str,
               nif_path: str, ingredient_formid: int = 0,
               harvest_sound_formid: int = 0,
               bounds: Tuple = (-64,-64,-64,64,64,64)) -> bytes:
    """Build a FLOR (flora / harvestable plant) record."""
    w    = _ESPWriter()
    subs = bytearray()
    subs += w.sub_str('EDID', editor_id)
    subs += w.sub_obnd(*bounds)
    subs += w.sub_str('FULL', name)
    subs += w.sub_str('MODL', nif_path.replace('\\', '/'))
    if ingredient_formid:
        subs += w.sub_formid('PFIG', ingredient_formid)
    if harvest_sound_formid:
        subs += w.sub_formid('SNAM', harvest_sound_formid)
    # PFPC — harvest chances per season (Spring/Summer/Fall/Winter)
    subs += w.sub('PFPC', bytes([50, 50, 50, 50]))
    return w.full_record('FLOR', formid, bytes(subs))


def build_acti(formid: int, editor_id: str, name: str,
               nif_path: str, script_formid: int = 0,
               bounds: Tuple = (-64,-64,-64,64,64,64)) -> bytes:
    """Build an ACTI (activator) record."""
    w    = _ESPWriter()
    subs = bytearray()
    subs += w.sub_str('EDID', editor_id)
    subs += w.sub_obnd(*bounds)
    subs += w.sub_str('FULL', name)
    subs += w.sub_str('MODL', nif_path.replace('\\', '/'))
    if script_formid:
        # VMAD header (minimal — just links a script)
        vmad  = struct.pack('<HH', 5, 2)         # version=5, objFormat=2
        vmad += struct.pack('<H', 1)              # scriptCount=1
        vmad += struct.pack('<H', len(editor_id)+1) + editor_id.encode() + b'\x00'
        vmad += struct.pack('<HI', 1, 0)         # status=1, propertyCount=0
        subs += w.sub('VMAD', vmad)
    return w.full_record('ACTI', formid, bytes(subs))


def build_weap(formid: int, editor_id: str, name: str,
               nif_path: str, weapon_type: str = "PISTOL",
               damage: int = 25, weight: float = 2.5,
               value: int = 75,
               bounds: Tuple = (-20,-10,-5,20,10,5)) -> bytes:
    """Build a WEAP (weapon) record."""
    w    = _ESPWriter()
    subs = bytearray()
    subs += w.sub_str('EDID', editor_id)
    subs += w.sub_obnd(*bounds)
    subs += w.sub_str('FULL', name)
    subs += w.sub_str('MODL', nif_path.replace('\\', '/'))

    # DNAM — weapon data block (simplified)
    # animationType: 8=HandToHand, 9=Sword, 22=Gun, 35=MeleeWithWeapon
    anim_map = {
        "PISTOL":      22,  "RIFLE":  22,  "SHOTGUN": 22,
        "LAUNCHER":    22,  "MELEE_BLADE": 9, "MELEE_BLUNT": 35,
        "THROWN":      22,
    }
    anim_type = anim_map.get(weapon_type, 22)

    dnam = struct.pack('<BfIHHH',
                       0,          # flags
                       weight,     # weight
                       value,      # gold value
                       damage,     # base damage
                       0,          # clip size
                       anim_type)  # animation type
    subs += w.sub('DNAM', dnam)

    return w.full_record('WEAP', formid, bytes(subs))


def build_armo(formid: int, editor_id: str, name: str,
               arma_formid: int, armor_type: str = "CHEST",
               weight: float = 5.0, value: int = 100,
               armor_rating: float = 10.0) -> bytes:
    """Build an ARMO (armor item) record."""
    from . import fo4_armor_animation as _fa_anim
    w    = _ESPWriter()
    subs = bytearray()
    subs += w.sub_str('EDID', editor_id)
    subs += w.sub_obnd(-30,-20,-5,30,20,40)
    subs += w.sub_str('FULL', name)

    # RNAM — race (default to HumanRace 0x00013746)
    subs += w.sub_formid('RNAM', 0x00013746)

    # BOD2 — biped body template
    config = _fa_anim.ARMOR_TYPE_CONFIG.get(armor_type, {})
    slots  = config.get("biped_slots", [32])
    slot_flags = sum(1 << (s - 30) for s in slots if 30 <= s <= 61)
    subs += w.sub('BOD2', struct.pack('<II', slot_flags, 0))

    # DNAM — armor data
    subs += w.sub('DNAM', struct.pack('<ff', armor_rating, weight))

    # OBND
    subs += w.sub('YNAM', struct.pack('<I', 0))   # pickup sound placeholder

    # Link to armor addon
    subs += w.sub_formid('MODL', arma_formid)     # actually uses MODL ref

    return w.full_record('ARMO', formid, bytes(subs))


def build_arma(formid: int, editor_id: str,
               nif_path_male: str, nif_path_female: str = "",
               armor_type: str = "CHEST") -> bytes:
    """Build an ARMA (armor addon) record."""
    from . import fo4_armor_animation as _fa_anim
    w    = _ESPWriter()
    subs = bytearray()
    subs += w.sub_str('EDID', editor_id)
    subs += w.sub_obnd(-30,-20,-5,30,20,40)

    config    = _fa_anim.ARMOR_TYPE_CONFIG.get(armor_type, {})
    slots     = config.get("biped_slots", [32])
    slot_flags = sum(1 << (s - 30) for s in slots if 30 <= s <= 61)
    subs += w.sub('BOD2', struct.pack('<II', slot_flags, 0))
    subs += w.sub_formid('RNAM', 0x00013746)      # HumanRace

    # MOD2 — male world model
    subs += w.sub_str('MOD2', nif_path_male.replace('\\', '/'))
    if nif_path_female:
        subs += w.sub_str('MOD3', nif_path_female.replace('\\', '/'))

    # DNAM — armor addon data
    subs += w.sub('DNAM', struct.pack('<6B', 3, 0, 0, 0, 0, 0))

    return w.full_record('ARMA', formid, bytes(subs))


def build_misc(formid: int, editor_id: str, name: str,
               nif_path: str, value: int = 10,
               weight: float = 0.5) -> bytes:
    """Build a MISC (miscellaneous item) record."""
    w    = _ESPWriter()
    subs = bytearray()
    subs += w.sub_str('EDID', editor_id)
    subs += w.sub_obnd(-15,-15,-15,15,15,15)
    subs += w.sub_str('FULL', name)
    subs += w.sub_str('MODL', nif_path.replace('\\', '/'))
    subs += w.sub('DATA', struct.pack('<If', value, weight))
    return w.full_record('MISC', formid, bytes(subs))


def build_ligh(formid: int, editor_id: str, name: str,
               color: Tuple = (255, 200, 150, 255),
               radius: int = 512, fade: float = 1.5,
               intensity: int = 100) -> bytes:
    """Build a LIGH (light) record."""
    w    = _ESPWriter()
    subs = bytearray()
    subs += w.sub_str('EDID', editor_id)
    subs += w.sub_obnd(-25,-25,-25,25,25,25)
    subs += w.sub_str('FULL', name)
    # DATA: time, radius, color(RGBA), flags, falloff, fov, near, intensity
    r, g, b, a = color
    flags = 0x0002   # dynamic
    subs += w.sub('DATA', struct.pack('<iI4BIfffI',
                                      0,         # time
                                      radius,    # radius
                                      r,g,b,a,   # color RGBA
                                      flags,     # flags
                                      fade,      # falloff exponent
                                      90.0,      # FOV (for spot lights)
                                      0.0,       # near clip
                                      intensity))# intensity
    return w.full_record('LIGH', formid, bytes(subs))


# ---------------------------------------------------------------------------
# Complete ESP writer
# ---------------------------------------------------------------------------

def write_esp(output_path: str,
              records: List[dict],
              plugin_name: str = "MyMod",
              author: str = "Mossy Industries",
              description: str = "Auto-generated by Mossy FO4 Blender Addon",
              masters: List[str] = None) -> Tuple[bool, str]:
    """
    Write a complete binary ESP file.

    records: list of dicts describing each record:
      {type, editor_id, name, nif_path, ...type-specific fields}

    Returns (success, message).
    """
    allocator = FormIDAllocator(0x00000800)
    built_records: dict = {}   # type_code → list of record bytes

    for rec in records:
        rtype   = rec.get("type", "STAT").upper()
        eid     = rec.get("editor_id", "NewRecord")
        name    = rec.get("name", eid)
        nif     = rec.get("nif_path", "")
        formid  = allocator.next()
        rec["_formid"] = formid

        try:
            if rtype == "STAT":
                data = build_stat(formid, eid, nif)
            elif rtype == "FLOR":
                data = build_flor(formid, eid, name, nif)
            elif rtype == "ACTI":
                data = build_acti(formid, eid, name, nif)
            elif rtype == "WEAP":
                data = build_weap(formid, eid, name, nif,
                                   weapon_type=rec.get("weapon_type","PISTOL"),
                                   damage=rec.get("damage",25),
                                   weight=rec.get("weight",2.5),
                                   value=rec.get("value",75))
            elif rtype == "ARMA":
                data = build_arma(formid, eid, nif,
                                   rec.get("nif_female",""),
                                   rec.get("armor_type","CHEST"))
            elif rtype == "ARMO":
                arma_id = rec.get("arma_formid", 0)
                data = build_armo(formid, eid, name, arma_id,
                                   rec.get("armor_type","CHEST"),
                                   rec.get("weight",5.0),
                                   rec.get("value",100),
                                   rec.get("armor_rating",10.0))
            elif rtype == "MISC":
                data = build_misc(formid, eid, name, nif,
                                   rec.get("value",10),
                                   rec.get("weight",0.5))
            elif rtype == "LIGH":
                data = build_ligh(formid, eid, name,
                                   rec.get("color",(255,200,150,255)),
                                   rec.get("radius",512))
            else:
                print(f"[ESP Gen] Unsupported type: {rtype}, skipping")
                continue

            built_records.setdefault(rtype, []).append(data)

        except Exception as exc:
            print(f"[ESP Gen] Failed building {rtype} '{eid}': {exc}")

    if not built_records:
        return False, "No records built — check record definitions"

    w   = _ESPWriter()
    esp = bytearray()

    # TES4 header
    esp += build_tes4(author, description, masters or ["Fallout4.esm"])

    # One GRUP per record type
    type_label_map = {
        "STAT":"STAT","FLOR":"FLOR","ACTI":"ACTI","WEAP":"WEAP",
        "ARMO":"ARMO","ARMA":"ARMA","MISC":"MISC","LIGH":"LIGH",
    }
    for rtype, recs in built_records.items():
        label = type_label_map.get(rtype, rtype).encode('ascii')
        group_data = b''.join(recs)
        esp += w.group(label, group_data)

    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, 'wb') as fh:
            fh.write(esp)
        total = sum(len(v) for v in built_records.values())
        return True, (
            f"ESP written: {output_path}\n"
            f"Records: {total} across {len(built_records)} type(s)\n"
            f"FormIDs: 0x00000800 – {hex(allocator.peek()-1)}"
        )
    except Exception as exc:
        return False, f"Failed to write ESP: {exc}"


# ---------------------------------------------------------------------------
# xEdit Pascal script generator (alternative for xEdit users)
# ---------------------------------------------------------------------------

XEDIT_SCRIPT_TEMPLATE = '''\
{
  Auto-generated xEdit script by Mossy FO4 Blender Addon
  Run inside FO4Edit: Tools → Apply Script → select this file
}
unit UserScript;

function Initialize: Integer;
var
  esp, grp, rec: IInterface;
  i: Integer;
begin
  // Create new plugin file
  esp := AddNewFile;
  SetFileName(esp, '{plugin_name}.esp');

  // Add master
  AddMasterIfMissing(esp, 'Fallout4.esm');

  {record_code}

  AddMessage('Done! Created {record_count} record(s) in {plugin_name}.esp');
  Result := 0;
end;

end.
'''

XEDIT_RECORD_TEMPLATE = '''\
  // {record_type}: {editor_id}
  grp := Add(esp, '{record_type}', True);
  rec := Add(grp, '{record_type}', True);
  SetElementEditValues(rec, 'EDID', '{editor_id}');
  SetElementEditValues(rec, 'FULL - Name', '{name}');
  SetElementEditValues(rec, 'Model\\MODL - Model FileName', '{nif_path}');
'''


def write_xedit_script(output_path: str,
                        records: List[dict],
                        plugin_name: str = "MyMod") -> Tuple[bool, str]:
    """Generate an xEdit Pascal script to create the records interactively."""
    record_code = ""
    for rec in records:
        record_code += XEDIT_RECORD_TEMPLATE.format(
            record_type = rec.get("type","STAT").upper(),
            editor_id   = rec.get("editor_id","NewRecord"),
            name        = rec.get("name",""),
            nif_path    = rec.get("nif_path","").replace("\\","/"),
        )

    script = XEDIT_SCRIPT_TEMPLATE.format(
        plugin_name  = plugin_name,
        record_code  = record_code,
        record_count = len(records),
    )

    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as fh:
            fh.write(script)
        return True, f"xEdit script written: {output_path}"
    except Exception as exc:
        return False, f"Failed: {exc}"


# ---------------------------------------------------------------------------
# Auto-populate records from scene objects
# ---------------------------------------------------------------------------

def records_from_scene(nif_output_dir: str) -> List[dict]:
    """Build a record list from all selected mesh objects in the scene.

    Infers record type from object custom properties / name keywords.
    """
    records = []
    for obj in bpy.context.selected_objects:
        if obj.type != 'MESH':
            continue

        name_lower = obj.name.lower()
        # Infer record type
        if obj.get("fo4_weapon_type"):
            rtype = "WEAP"
        elif obj.get("fo4_armor_type"):
            rtype = "ARMO"
        elif any(k in name_lower for k in ["plant","flora","flower","bush","mushroom","tree"]):
            rtype = "FLOR"
        elif any(k in name_lower for k in ["door","button","lever","switch","terminal"]):
            rtype = "ACTI"
        elif any(k in name_lower for k in ["junk","scrap","component","item"]):
            rtype = "MISC"
        elif any(k in name_lower for k in ["lamp","lantern","torch","light","bulb"]):
            rtype = "LIGH"
        else:
            rtype = "STAT"

        # Build safe editor ID
        safe_eid = obj.name.replace(" ","_").replace(".","_")[:63]
        nif_path = f"Meshes\\{safe_eid}.nif"

        rec = {
            "type":       rtype,
            "editor_id":  safe_eid,
            "name":       obj.name,
            "nif_path":   nif_path,
        }
        if rtype == "WEAP":
            rec["weapon_type"] = obj.get("fo4_weapon_type", "PISTOL")
        if rtype == "ARMO":
            rec["armor_type"]  = obj.get("fo4_armor_type", "CHEST")

        records.append(rec)

    return records


# ---------------------------------------------------------------------------
# Blender Operators
# ---------------------------------------------------------------------------

class FO4_OT_GenerateESP(bpy.types.Operator):
    """Generate a Fallout 4 ESP file from selected mesh objects.

    Automatically detects record type (STAT/FLOR/WEAP/ARMO etc.) from
    object names and custom properties set by the animation/armor/weapon
    pipeline operators.  Produces a valid binary .esp ready to activate
    in your mod manager.
    """
    bl_idname  = "fo4.generate_esp"
    bl_label   = "Generate ESP from Scene"
    bl_options = {'REGISTER'}

    output_dir: bpy.props.StringProperty(
        name="Output Folder", subtype='DIR_PATH', default="",
        description="Where to save the .esp file",
    )
    plugin_name: bpy.props.StringProperty(
        name="Plugin Name", default="MyMod",
        description="ESP filename (without .esp extension)",
    )
    author: bpy.props.StringProperty(
        name="Author", default="",
    )
    also_xedit: bpy.props.BoolProperty(
        name="Also generate xEdit script",
        description="Write a .pas script for FO4Edit users as well",
        default=True,
    )

    def execute(self, context):
        out = bpy.path.abspath(self.output_dir) if self.output_dir else bpy.path.abspath("//")
        records = records_from_scene(out)

        if not records:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}

        esp_path = os.path.join(out, self.plugin_name + ".esp")
        ok, msg  = write_esp(esp_path, records,
                              plugin_name=self.plugin_name,
                              author=self.author or "Mossy Industries")
        print(f"[ESP Gen] {msg}")

        if self.also_xedit:
            pas_path = os.path.join(out, self.plugin_name + "_xedit.pas")
            ok2, msg2 = write_xedit_script(pas_path, records, self.plugin_name)
            print(f"[ESP Gen] {msg2}")

        if ok:
            self.report({'INFO'},
                f"ESP generated: {len(records)} record(s) → {self.plugin_name}.esp")
        else:
            self.report({'ERROR'}, msg)
            return {'CANCELLED'}

        return {'FINISHED'}


class FO4_OT_SetESPPreset(bpy.types.Operator):
    """Quick-fill ESP settings from a preset."""
    bl_idname  = "fo4.set_esp_preset"
    bl_label   = "Set ESP Preset"
    bl_options = {'INTERNAL'}
    preset: bpy.props.StringProperty(default="")
    def execute(self, context):
        if hasattr(context.scene, 'fo4_plugin_name'):
            context.scene.fo4_plugin_name = self.preset
        return {'FINISHED'}


_CLASSES = [FO4_OT_GenerateESP, FO4_OT_SetESPPreset]

_SCENE_PROPS = [
    ("fo4_plugin_name", bpy.props.StringProperty(
        name="Plugin Name", default="MyMod",
        description="Name for the generated .esp file",
    )),
    ("fo4_esp_author", bpy.props.StringProperty(
        name="Author", default="",
    )),
    ("fo4_esp_output", bpy.props.StringProperty(
        name="ESP Output Folder", subtype='DIR_PATH', default="",
    )),
    ("fo4_esp_xedit", bpy.props.BoolProperty(
        name="Also generate xEdit script", default=True,
    )),
]


def register():
    for cls in _CLASSES:
        try: bpy.utils.register_class(cls)
        except Exception: pass
    for name, prop in _SCENE_PROPS:
        try: setattr(bpy.types.Scene, name, prop)
        except Exception: pass


def unregister():
    for name, _ in reversed(_SCENE_PROPS):
        try: delattr(bpy.types.Scene, name)
        except Exception: pass
    for cls in reversed(_CLASSES):
        try: bpy.utils.unregister_class(cls)
        except Exception: pass
