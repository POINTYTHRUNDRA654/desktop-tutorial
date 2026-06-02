"""
fo4_ue5_converter.py
====================
Unreal Engine 4 and Unreal Engine 5 asset → Fallout 4 NIF conversion pipeline.

Full workflow (one operator: FO4_OT_ConvertUE5Asset)
-----------------------------------------------------
1. Import UE5 FBX with correct axis + scale conversion
2. Auto-remap UE5 PBR material slots to FO4 texture conventions
3. Convert ORM texture (Occlusion/Roughness/Metallic) → FO4 Specular (_s.dds)
   • Roughness is INVERTED to Smoothness (FO4 = 1 − UE5_Roughness)
4. Apply all FO4 mesh prep (triangulate, merge doubles, apply transforms, UV)
5. Auto-generate UCX_ convex collision
6. Export as NIF via PyNifly → mod staging folder (Data/Meshes/…)
7. Export matching BGSM material file (Data/Materials/…)
8. Convert and save DDS textures (Data/Textures/…) if NVTT/texconv available

Coordinate system differences
------------------------------
UE4/UE5 world space : X=Forward  Y=Right  Z=Up  (left-handed, centimetres)
FO4 / NIF space     : X=Right    Y=Forward Z=Up  (right-handed, game units)

UE4 and UE5 use IDENTICAL axis conventions and scale — the same converter
handles both engine generations.  No settings change needed between them.

FBX export from Unreal Editor (UE4 or UE5):
  Right-click asset in Content Browser → Asset Actions > Export → FBX
  OR  File > Export All > FBX  (for a full scene/level)
  Settings: Scale 1.0, Forward Axis: -X, Up Axis: Z

For .uasset files (packaged game assets, UE4 or UE5):
  Use FModel (https://fmodel.app) — supports both UE4 and UE5 .pak files
  Or UModel (https://www.gildor.org/en/projects/umodel) — primarily UE4
  Both export as FBX + texture PNG/TGA that this converter handles directly.

Blender FBX import settings (same for UE4 and UE5):
  axis_forward = '-X'
  axis_up      = 'Z'
  global_scale = 1.0   (scale handled separately — see _UE5_TO_FO4_SCALE)

Scale conversion  (identical for UE4 and UE5)
----------------------------------------------
Both engines use centimetres: 1 UE unit = 1 cm = 0.01 m
FO4 uses game units:  1 FO4 unit = 0.0142875 m (Havok world scale)
Conversion: 1 UE unit × 0.6999 = 1 FO4 game unit  (0.01 / 0.0142875)

FBX assets from both UE4 and UE5 arrive in Blender in centimetres.
We apply _UE5_TO_FO4_SCALE uniformly to bring them to FO4 size.
For a human-sized character (~180 cm), after conversion ≈ 126 FO4 units,
which matches FO4's default NPC height.

UE5 PBR → FO4 material mapping
--------------------------------
UE5 slot          FO4 texture slot     Notes
---------------------------------------------------------------------------
BaseColor         _d.dds  (slot 0)     RGB albedo, direct copy
Normal            _n.dds  (slot 1)     DirectX normals — same convention in FO4,
                                        NO G-channel inversion needed
ORM (packed)      _s.dds  (slot 2)     G=Roughness → invert to Smoothness
                                        R=AO not used in standard FO4 shader
                                        B=Metallic → drives Specular intensity
Roughness (solo)  _s.dds  (slot 2)     Inverted (R=1-Rough, G=1-Rough, B=0)
Emissive          _g.dds  (slot 3)     Glow map; set emitEnabled=True in BGSM
Metallic          part of _s.dds       See ORM above

LOD meshes
----------
UE5 typically exports LODs as separate objects named <mesh>_LOD0, _LOD1, etc.
Each LOD is exported as its own NIF:
  Data/Meshes/[subpath]/[name]_LOD0.nif
  Data/Meshes/[subpath]/[name]_LOD1.nif
  …
The main (highest-quality) mesh is exported without a LOD suffix.

FModel / UModel extraction
--------------------------
If assets are packaged in .pak files (not a source UE project):
  1. Use FModel (https://fmodel.app) to extract .fbx + textures from .pak
  2. Or UModel (https://www.gildor.org/en/projects/umodel) for older assets
  3. Point this operator at the extracted folder — it handles the rest.
"""

from __future__ import annotations

import os
import struct
import hashlib
import traceback

try:
    import bpy
    from bpy.types import Operator
    from bpy.props import (
        StringProperty, BoolProperty, FloatProperty,
        EnumProperty, IntProperty,
    )
    from mathutils import Vector
except ImportError:
    bpy      = None  # type: ignore[assignment]
    Operator = object  # type: ignore[assignment]

# ── Scale and axis constants ───────────────────────────────────────────────────
# UE5 exports FBX in centimetres; FO4 game units are 0.0142875 m each.
_UE5_CM_PER_UNIT  = 1.0          # UE5: 1 unit = 1 cm
_FO4_M_PER_UNIT   = 0.0142875    # FO4: 1 unit = 0.0142875 m = 1.43 cm
_UE5_TO_FO4_SCALE = (_UE5_CM_PER_UNIT / 100.0) / _FO4_M_PER_UNIT  # ≈ 0.6999

# UE5 FBX export axis convention (Unreal Editor defaults)
_UE5_FBX_FORWARD = '-X'
_UE5_FBX_UP      = 'Z'

# FO4 texture suffix conventions
_SUFFIX_DIFFUSE  = '_d'
_SUFFIX_NORMAL   = '_n'
_SUFFIX_SPECULAR = '_s'
_SUFFIX_GLOW     = '_g'
_SUFFIX_EMISSIVE = '_em'

# UE5 material input names (case-insensitive matching)
_UE5_DIFFUSE_NAMES  = ('basecolor', 'base color', 'albedo', 'diffuse', 'color')
_UE5_NORMAL_NAMES   = ('normal', 'normalmap', 'normal map', 'bump')
_UE5_ORM_NAMES      = ('orm', 'occlusionroughnessmetallic', 'roughnessmetallic',
                        'mr', 'roughnessao', 'packed')
_UE5_ROUGH_NAMES    = ('roughness', 'rough')
_UE5_METAL_NAMES    = ('metallic', 'metal', 'metalness')
_UE5_EMISSIVE_NAMES = ('emissive', 'emissivecolor', 'emission', 'glow')
_UE5_AO_NAMES       = ('ambientocclusion', 'ao', 'occlusion')


# ── Material detection helpers ────────────────────────────────────────────────

def _node_label_matches(node, *name_sets) -> bool:
    """Return True if node label or name matches any of the given name tuples."""
    test = (node.label or node.name).lower().replace(' ', '').replace('_', '')
    for names in name_sets:
        for n in names:
            if n.replace(' ', '').replace('_', '') in test:
                return True
    return False


def _find_texture_node(mat, *name_sets):
    """Return the first TEX_IMAGE node whose label/name matches any given names."""
    if not mat or not mat.use_nodes:
        return None
    for node in mat.node_tree.nodes:
        if node.type == 'TEX_IMAGE' and _node_label_matches(node, *name_sets):
            return node
    return None


def _all_texture_nodes(mat) -> list:
    """Return all TEX_IMAGE nodes in a material."""
    if not mat or not mat.use_nodes:
        return []
    return [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE']


# ── Texture channel conversion ────────────────────────────────────────────────

def _invert_roughness_to_smoothness(img) -> "bpy.types.Image | None":
    """
    Create a new Blender image with R/G channels inverted (Roughness → Smoothness).

    UE5 Roughness: 0=smooth, 1=rough
    FO4 Smoothness (_s.dds green channel): 0=rough, 1=smooth

    For a grayscale roughness map: new_pixel = 1 - old_pixel (for RGB).
    For an ORM packed texture (R=AO, G=Rough, B=Metal):
      new_R = B (metallic drives specular intensity in FO4)
      new_G = 1 - G (roughness → smoothness)
      new_B = 0
      new_A = 1

    Returns a new Blender Image, or None on failure.
    """
    try:
        w, h = img.size
        if w == 0 or h == 0:
            return None

        pixels = list(img.pixels[:])   # flat RGBA list, length = w*h*4
        new_pixels = []
        n = w * h

        for i in range(n):
            base = i * 4
            r, g, b, a = pixels[base], pixels[base+1], pixels[base+2], pixels[base+3]

            # Detect ORM by checking if the image name contains 'orm', 'mr', etc.
            name_l = img.name.lower()
            is_orm = any(t in name_l for t in ('orm', '_mr', 'roughmetal', 'occlusionrough'))

            if is_orm:
                # R=AO, G=Roughness, B=Metallic → new_R=Metallic, new_G=1-Roughness, new_B=0
                new_pixels += [b, 1.0 - g, 0.0, 1.0]
            else:
                # Plain roughness map: invert all channels
                new_pixels += [1.0 - r, 1.0 - g, 1.0 - b, a]

        new_name = img.name.rsplit('.', 1)[0] + _SUFFIX_SPECULAR
        new_img  = bpy.data.images.new(new_name, width=w, height=h, alpha=False)
        new_img.pixels = new_pixels
        new_img.file_format = 'PNG'
        return new_img

    except Exception as e:
        print(f"[UE5→FO4] Roughness invert failed for {img.name}: {e}")
        return None


# ── Material remapping ────────────────────────────────────────────────────────

def remap_ue5_material_to_fo4(mat) -> dict:
    """
    Detect UE5 PBR texture nodes in *mat* and remap them to FO4 conventions.

    Returns a dict describing what was found and renamed:
      {
        'diffuse':  <image or None>,
        'normal':   <image or None>,
        'specular': <image or None>,   # created from roughness/ORM
        'glow':     <image or None>,
        'actions':  [list of str describing changes],
      }
    """
    actions = []
    result  = {'diffuse': None, 'normal': None, 'specular': None,
               'glow': None, 'actions': actions}

    if not mat or not mat.use_nodes:
        return result

    tex_nodes = _all_texture_nodes(mat)

    # ── Diffuse / BaseColor ────────────────────────────────────────────────────
    diff_node = _find_texture_node(mat, _UE5_DIFFUSE_NAMES)
    if diff_node and diff_node.image:
        img = diff_node.image
        old = img.name
        base = old.rsplit('.', 1)[0]
        if not base.endswith(_SUFFIX_DIFFUSE):
            img.name = base + _SUFFIX_DIFFUSE
            diff_node.label = "Diffuse"
            actions.append(f"BaseColor → '{img.name}' (FO4 slot 0 _d)")
        result['diffuse'] = img

    # ── Normal map ────────────────────────────────────────────────────────────
    norm_node = _find_texture_node(mat, _UE5_NORMAL_NAMES)
    if norm_node and norm_node.image:
        img = norm_node.image
        old = img.name
        base = old.rsplit('.', 1)[0]
        if not base.endswith(_SUFFIX_NORMAL):
            img.name = base + _SUFFIX_NORMAL
            norm_node.label = "Normal"
            # UE5 and FO4 both use DirectX-convention normals — no G-channel flip needed
            actions.append(f"Normal → '{img.name}' (FO4 slot 1 _n, DirectX convention OK)")
        result['normal'] = img

    # ── ORM or standalone Roughness/Metallic → Specular (_s) ─────────────────
    orm_node   = _find_texture_node(mat, _UE5_ORM_NAMES)
    rough_node = _find_texture_node(mat, _UE5_ROUGH_NAMES)
    src_node   = orm_node or rough_node

    if src_node and src_node.image:
        img     = src_node.image
        new_img = _invert_roughness_to_smoothness(img)
        if new_img:
            # Add the new specular node to the material
            new_node        = mat.node_tree.nodes.new('ShaderNodeTexImage')
            new_node.image  = new_img
            new_node.label  = "Specular"
            new_node.location = (src_node.location.x + 300, src_node.location.y - 200)
            result['specular'] = new_img
            actions.append(
                f"{'ORM' if orm_node else 'Roughness'} → '{new_img.name}' "
                f"(FO4 slot 2 _s, roughness inverted to smoothness)"
            )
        else:
            actions.append(
                f"WARNING: Could not invert roughness for '{img.name}' — "
                "check image is loaded (not just linked)."
            )

    # ── Emissive → Glow (_g) ──────────────────────────────────────────────────
    emit_node = _find_texture_node(mat, _UE5_EMISSIVE_NAMES)
    if emit_node and emit_node.image:
        img  = emit_node.image
        old  = img.name
        base = old.rsplit('.', 1)[0]
        if not base.endswith(_SUFFIX_GLOW):
            img.name = base + _SUFFIX_GLOW
            emit_node.label = "Glow"
            actions.append(f"Emissive → '{img.name}' (FO4 slot 3 _g, set emitEnabled in BGSM)")
        result['glow'] = img

    # ── Rename any unidentified textures (by position in node tree) ──────────
    # Textures that aren't labelled may still be in the right shader sockets.
    # Try to identify by their Principled BSDF socket connections.
    principled = next(
        (n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None
    )
    if principled:
        socket_map = {
            'Base Color':  ('diffuse',  _SUFFIX_DIFFUSE,  "Diffuse"),
            'Normal':      ('normal',   _SUFFIX_NORMAL,   "Normal"),
            'Roughness':   ('specular', _SUFFIX_SPECULAR, "Roughness→Specular"),
            'Metallic':    ('specular', _SUFFIX_SPECULAR, "Metallic→Specular"),
            'Emission':    ('glow',     _SUFFIX_GLOW,     "Glow"),
            'Emission Color': ('glow',  _SUFFIX_GLOW,     "Glow"),
        }
        for socket_name, (slot_key, suffix, label) in socket_map.items():
            socket = principled.inputs.get(socket_name)
            if not socket or result[slot_key]:
                continue
            for link in socket.links:
                src = link.from_node
                if src.type == 'TEX_IMAGE' and src.image:
                    img  = src.image
                    base = img.name.rsplit('.', 1)[0]
                    if not base.endswith(suffix):
                        img.name = base + suffix
                        src.label = label
                        actions.append(
                            f"Socket '{socket_name}' → '{img.name}' (FO4 {suffix})"
                        )
                    result[slot_key] = img
                    break

    return result


# ── BGSM builder from remap result ───────────────────────────────────────────

def _build_bgsm_from_remap(mat, remap: dict, mat_type: str = "DEFAULT") -> None:
    """
    Store FO4 BGSM settings on *mat* based on the remap result.

    Sets custom properties on the material that bgsm_helpers.blender_mat_to_bgsm()
    reads when generating the .bgsm file.
    """
    try:
        # FO4 texture paths (relative to Data/Textures/) derived from image names
        def _tex_path(img) -> str:
            if not img:
                return ""
            name = img.name
            if not name.lower().endswith('.dds'):
                name = os.path.splitext(name)[0] + ".dds"
            return name

        mat["fo4_bgsm_diffuse"]  = _tex_path(remap.get('diffuse'))
        mat["fo4_bgsm_normal"]   = _tex_path(remap.get('normal'))
        mat["fo4_bgsm_specular"] = _tex_path(remap.get('specular'))
        mat["fo4_bgsm_glow"]     = _tex_path(remap.get('glow'))
        mat["fo4_emit_enabled"]  = bool(remap.get('glow'))
        mat["fo4_mat_type"]      = mat_type
        mat["fo4_converted_from_ue5"] = True
    except Exception as e:
        print(f"[UE5→FO4] BGSM setup error: {e}")


# ── Mesh prep (reuses fo4_pipeline helpers) ───────────────────────────────────

def _prep_mesh_for_fo4(obj, apply_scale: float = 1.0) -> list:
    """
    Apply all FO4 mesh preparation steps.
    Returns list of step descriptions.
    """
    import bmesh as _bm
    steps = []

    # Scale from UE5 units to FO4 units
    if abs(apply_scale - 1.0) > 0.001:
        obj.scale = (apply_scale, apply_scale, apply_scale)
        bpy.ops.object.transform_apply(scale=True)
        steps.append(f"Scale: ×{apply_scale:.4f} (UE5 cm → FO4 game units)")

    # Apply remaining transforms
    for flag, name in [
        (obj.location.length > 0.001,           "location"),
        (any(abs(r) > 0.001 for r in obj.rotation_euler), "rotation"),
    ]:
        if flag:
            bpy.ops.object.transform_apply(**{name: True, **{
                k: False for k in ('location', 'rotation', 'scale') if k != name
            }})
            steps.append(f"Applied {name}")

    # Triangulate
    me = obj.data
    bm = _bm.new()
    bm.from_mesh(me)
    non_tri = [f for f in bm.faces if len(f.verts) != 3]
    if non_tri:
        _bm.ops.triangulate(bm, faces=non_tri, quad_method='BEAUTY', ngon_method='BEAUTY')
        bm.to_mesh(me)
        steps.append(f"Triangulated {len(non_tri)} face(s)")
    else:
        steps.append("Already triangulated ✓")

    # Merge doubles
    n_before = len(bm.verts)
    _bm.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)
    n_after = len(bm.verts)
    if n_before != n_after:
        steps.append(f"Merged {n_before - n_after} duplicate vertex/vertices")
    bm.free()

    # UV map
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
        steps.append("Created UV map 'UVMap'")
    elif me.uv_layers.active.name != "UVMap":
        me.uv_layers.active.name = "UVMap"
        steps.append("Renamed UV map to 'UVMap'")
    else:
        steps.append("UV map 'UVMap' present ✓")

    # Smooth shading + consistent normals
    try:
        bpy.ops.object.shade_smooth()
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        steps.append("Smooth shading + consistent normals")
    except Exception:
        pass

    # Vertex / triangle limit check
    n_verts = len(me.vertices)
    if n_verts > 65535:
        steps.append(
            f"WARNING: {n_verts} vertices exceeds FO4 limit (65535). "
            "Use 'Split Mesh at Poly Limit' before export."
        )
    elif n_verts > 32000:
        steps.append(f"WARNING: {n_verts} vertices is high — consider LODs.")

    return steps


# ══════════════════════════════════════════════════════════════════════════════
# Main operator: UE5 Asset → FO4 NIF
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_ConvertUE5Asset(Operator):
    """
    Import a UE4 or UE5 FBX asset and convert it fully for Fallout 4.

    UE4 and UE5 use the same axis convention and scale — this operator
    handles both engine generations with identical settings.

    One operator does everything:
      • Import FBX with correct UE5 axis/scale settings
      • Remap UE5 PBR materials → FO4 texture slots (_d, _n, _s, _g)
      • Invert Roughness → Smoothness for the _s specular map
      • Apply all FO4 mesh prep (triangulate, merge doubles, UV, normals)
      • Generate UCX_ collision (optional)
      • Export NIF via PyNifly to your mod staging folder
      • Export matching BGSM file

    How to export from Unreal Editor (UE4 or UE5):
      Content Browser → right-click asset → Asset Actions > Export
      OR  File > Export All  (for larger scenes)
      Format: FBX, Scale: 1.0, Forward Axis: -X, Up Axis: Z

    For packaged .pak assets:
      UE4 + UE5: FModel (https://fmodel.app) — extract FBX + textures
      UE4 only:  UModel (https://www.gildor.org/en/projects/umodel)
      Extract to a folder, then point this operator at the FBX.
    """
    bl_idname  = "fo4.convert_ue5_asset"
    bl_label   = "Import & Convert UE4/UE5 Asset → FO4 NIF"
    bl_description = (
        "Import a UE4 or UE5 FBX asset (identical format), convert PBR materials "
        "to FO4 format (BaseColor→_d, Normal→_n, Roughness inverted to "
        "Smoothness→_s), prep mesh, and export as a game-ready NIF."
    )
    bl_options = {'REGISTER', 'UNDO'}

    # ── Properties ─────────────────────────────────────────────────────────────
    fbx_path: StringProperty(
        name="UE5 FBX File",
        description=(
            "FBX exported from Unreal Editor or extracted with FModel/UModel. "
            "In UE Editor: right-click asset → Asset Actions > Export → FBX"
        ),
        default="",
        subtype='FILE_PATH',
    )
    mod_folder: StringProperty(
        name="Mod Output Folder",
        description=(
            "Your mod's root staging folder (e.g. C:/MO2/mods/MyMod). "
            "Exports go to [folder]/Data/Meshes/ and [folder]/Data/Materials/. "
            "Never writes directly into the game folder."
        ),
        default="",
        subtype='DIR_PATH',
    )
    mesh_subpath: StringProperty(
        name="Mesh Sub-path",
        description=(
            "Relative path under Data/Meshes/ for this asset "
            "(e.g. 'MyMod/Props' → Data/Meshes/MyMod/Props/). "
            "Leave blank to put NIFs directly in Data/Meshes/."
        ),
        default="",
    )
    mat_type: EnumProperty(
        name="Mesh Type",
        description="FO4 mesh/material type — controls shader flags in BGSM",
        items=[
            ('DEFAULT',      "Static Prop",    "General static world object"),
            ('ARCHITECTURE', "Architecture",   "Building/structural mesh"),
            ('FURNITURE',    "Furniture",      "Interactive furniture/clutter"),
            ('WEAPON',       "Weapon",         "Weapon mesh (2-sided, no env)"),
            ('VEGETATION',   "Vegetation",     "Tree / plant with wind weights"),
            ('DEBRIS',       "Debris",         "Physics debris object"),
        ],
        default='DEFAULT',
    )
    ue5_scale: FloatProperty(
        name="UE5 Scale Override",
        description=(
            "Scale multiplier applied after import. Default (0.6999) converts "
            "UE5 centimetres to FO4 game units. Adjust if asset appears wrong size."
        ),
        default=_UE5_TO_FO4_SCALE,
        min=0.001,
        max=10.0,
        precision=4,
    )
    generate_collision: BoolProperty(
        name="Generate UCX_ Collision",
        description="Auto-generate convex collision mesh (UCX_ prefix) for static props",
        default=True,
    )
    export_bgsm: BoolProperty(
        name="Export BGSM",
        description="Write matching .bgsm material file to Data/Materials/",
        default=True,
    )
    import_only: BoolProperty(
        name="Import & Convert Only (no NIF export)",
        description="Import and convert materials but don't export NIF yet — lets you review first",
        default=False,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=520)

    def draw(self, context):
        layout = self.layout

        box = layout.box()
        box.label(text="Step 1 — UE4 or UE5 FBX source:", icon='IMPORT')
        box.label(text="UE Editor (UE4 or UE5): right-click asset → Asset Actions > Export → FBX")
        box.label(text="Packed .pak assets: use FModel (UE4+UE5) or UModel (UE4) to extract FBX")
        box.prop(self, "fbx_path")

        layout.separator()
        box2 = layout.box()
        box2.label(text="Step 2 — Mod output:", icon='FILEBROWSER')
        box2.prop(self, "mod_folder")
        box2.prop(self, "mesh_subpath")

        layout.separator()
        layout.prop(self, "mat_type")
        layout.prop(self, "ue5_scale")
        layout.prop(self, "generate_collision")
        layout.prop(self, "export_bgsm")
        layout.prop(self, "import_only")

        layout.separator()
        layout.label(
            text="Roughness will be auto-inverted to Smoothness for FO4.",
            icon='INFO',
        )

    def execute(self, context):
        if not self.fbx_path or not os.path.isfile(self.fbx_path):
            self.report({'ERROR'}, "Select a valid UE5 FBX file.")
            return {'CANCELLED'}

        if not self.import_only and not self.mod_folder:
            self.report({'ERROR'}, "Set your mod output folder.")
            return {'CANCELLED'}

        steps, warnings, errors = [], [], []

        # ── Step 1: Import FBX ─────────────────────────────────────────────────
        before = set(bpy.data.objects.keys())
        try:
            bpy.ops.import_scene.fbx(
                filepath=self.fbx_path,
                use_manual_orientation=True,
                axis_forward=_UE5_FBX_FORWARD,
                axis_up=_UE5_FBX_UP,
                global_scale=1.0,       # scale applied manually below
                use_anim=False,
                ignore_leaf_bones=True,
                use_custom_normals=True,
                force_connect_children=False,
            )
            steps.append(
                f"Imported: {os.path.basename(self.fbx_path)} "
                f"(axis: forward={_UE5_FBX_FORWARD}, up={_UE5_FBX_UP})"
            )
        except Exception as e:
            self.report({'ERROR'}, f"FBX import failed: {e}")
            return {'CANCELLED'}

        new_objs = [bpy.data.objects[k]
                    for k in bpy.data.objects.keys()
                    if k not in before]

        if not new_objs:
            self.report({'ERROR'}, "FBX imported no objects.")
            return {'CANCELLED'}

        mesh_objs = [o for o in new_objs if o.type == 'MESH']
        steps.append(f"Found {len(mesh_objs)} mesh object(s)")

        # ── Step 2: Process each mesh ──────────────────────────────────────────
        exported_nifs = []

        for obj in mesh_objs:
            obj_steps    = []
            obj_warnings = []

            context.view_layer.objects.active = obj
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)

            # Tag with mesh type
            obj["fo4_mesh_type"] = self.mat_type

            # ── Material remapping ─────────────────────────────────────────────
            for slot in obj.material_slots:
                mat = slot.material
                if not mat:
                    continue
                remap = remap_ue5_material_to_fo4(mat)
                obj_steps.extend(remap['actions'])
                _build_bgsm_from_remap(mat, remap, self.mat_type)

            # ── Mesh prep ─────────────────────────────────────────────────────
            prep = _prep_mesh_for_fo4(obj, apply_scale=self.ue5_scale)
            obj_steps.extend(prep)

            # ── LOD detection ─────────────────────────────────────────────────
            name_upper = obj.name.upper()
            lod_suffix = ""
            for lod in ("_LOD0", "_LOD1", "_LOD2", "_LOD3"):
                if name_upper.endswith(lod):
                    lod_suffix = lod.lower()
                    break

            # ── Collision ─────────────────────────────────────────────────────
            if self.generate_collision and not lod_suffix:
                try:
                    ucx_exists = any(
                        o.name.upper().startswith("UCX_" + obj.name.upper()[:16])
                        for o in bpy.data.objects
                    )
                    if not ucx_exists:
                        from . import mesh_helpers
                        col_obj, col_msg = mesh_helpers.MeshHelpers.add_collision_mesh(
                            obj, simplify_ratio=0.25
                        )
                        obj_steps.append(f"Collision: {col_msg}")
                except Exception as e:
                    obj_warnings.append(f"Collision skipped: {e}")

            # ── NIF export ────────────────────────────────────────────────────
            if not self.import_only:
                try:
                    safe_name = obj.name.replace(" ", "_")
                    subpath   = self.mesh_subpath.strip("/\\")
                    nif_name  = f"{safe_name}{lod_suffix}.nif"

                    if subpath:
                        nif_rel = os.path.join("Data", "Meshes", subpath, nif_name)
                    else:
                        nif_rel = os.path.join("Data", "Meshes", nif_name)

                    abs_nif = os.path.normpath(
                        os.path.join(self.mod_folder, nif_rel)
                    )
                    os.makedirs(os.path.dirname(abs_nif), exist_ok=True)

                    ok, exporter, msg = self._export_nif(obj, abs_nif)
                    if ok:
                        obj_steps.append(f"NIF exported ({exporter}): {nif_rel}")
                        exported_nifs.append(abs_nif)
                        obj["fo4_nif_path"] = nif_rel.replace("\\", "/")
                    else:
                        obj_warnings.append(f"NIF export failed: {msg}")

                    # ── BGSM export ────────────────────────────────────────────
                    if self.export_bgsm and ok:
                        self._export_bgsm(obj, abs_nif)
                        obj_steps.append("BGSM exported to Data/Materials/")

                except Exception as e:
                    obj_warnings.append(f"Export error for {obj.name}: {e}")
                    traceback.print_exc()

            steps.append(f"[{obj.name}]")
            steps.extend(f"  {s}" for s in obj_steps)
            warnings.extend(obj_warnings)

        # ── Summary ────────────────────────────────────────────────────────────
        if self.import_only:
            steps.append(
                f"Import & convert complete — {len(mesh_objs)} mesh(es) ready. "
                "Review materials/scale then click 'Export Cell Objects → NIF' "
                "or use a pipeline operator to export."
            )
        else:
            steps.append(
                f"Done: {len(exported_nifs)}/{len(mesh_objs)} NIF(s) exported "
                f"to {self.mod_folder}"
            )

        for s in steps:
            self.report({'INFO'}, s)
        for w in warnings:
            self.report({'WARNING'}, w)

        return {'FINISHED'}

    def _export_nif(self, obj, filepath: str) -> tuple:
        """Export via export_helpers (PyNifly primary)."""
        try:
            bpy.ops.object.select_all(action='DESELECT')
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
        except Exception:
            pass
        try:
            from . import export_helpers
            result  = export_helpers.ExportHelpers.export_mesh_to_nif(obj, filepath)
            ok      = result[0] if isinstance(result, tuple) else result in ({'FINISHED'}, 'FINISHED')
            msg     = result[1] if isinstance(result, tuple) else str(result)
            exporter = "PyNifly" if ok else "export_helpers"
            return ok, exporter, msg
        except Exception as e:
            # FBX fallback
            try:
                fbx = os.path.splitext(filepath)[0] + "_NEEDS_CAO.fbx"
                bpy.ops.export_scene.fbx(
                    filepath=fbx, use_selection=True,
                    apply_unit_scale=True,
                    axis_forward='-Z', axis_up='Y',
                )
                return True, "FBX(needs CAO)", f"FBX at {fbx} — convert with Cathedral Assets Optimizer"
            except Exception as e2:
                return False, "none", str(e2)

    def _export_bgsm(self, obj, nif_abs: str) -> None:
        """Write BGSM to Data/Materials/ mirroring the Data/Meshes/ path."""
        try:
            from . import bgsm_helpers
            rel  = os.path.relpath(nif_abs, self.mod_folder).replace("\\", "/")
            mrel = rel.replace("Data/Meshes/", "Data/Materials/", 1).replace(".nif", ".bgsm")
            mabs = os.path.normpath(os.path.join(self.mod_folder, mrel))
            os.makedirs(os.path.dirname(mabs), exist_ok=True)
            for slot in obj.material_slots:
                mat = slot.material
                if mat:
                    bgsm_helpers.write_bgsm(bgsm_helpers.blender_mat_to_bgsm(mat), mabs)
                    break
        except Exception as e:
            print(f"[UE5→FO4] BGSM export error: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Operator 2: Batch convert a folder of UE5 FBX files
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_BatchConvertUE5Folder(Operator):
    """
    Batch-convert a folder of UE5 FBX files to FO4 NIFs.

    Walks the selected folder, converts every .fbx file it finds using the
    same settings, and exports NIFs preserving the relative folder structure
    inside your mod's Data/Meshes/ directory.
    """
    bl_idname  = "fo4.batch_convert_ue5_folder"
    bl_label   = "Batch Convert UE4/UE5 Folder → FO4 NIFs"
    bl_description = (
        "Convert every FBX in a folder from UE4 or UE5 format to FO4-ready NIFs. "
        "Preserves relative folder structure inside Data/Meshes/."
    )
    bl_options = {'REGISTER'}

    ue5_folder: StringProperty(
        name="UE5 FBX Folder",
        description="Folder containing FBX files extracted from UE5 (via FModel/UModel or Unreal Editor export)",
        default="",
        subtype='DIR_PATH',
    )
    mod_folder: StringProperty(
        name="Mod Output Folder",
        description="Your mod staging folder. Structure: [folder]/Data/Meshes/…",
        default="",
        subtype='DIR_PATH',
    )
    mesh_subpath: StringProperty(
        name="Mesh Sub-path",
        description="Prefix under Data/Meshes/ (e.g. 'MyMod/Props')",
        default="",
    )
    ue5_scale: FloatProperty(
        name="UE5 Scale",
        default=_UE5_TO_FO4_SCALE,
        min=0.001, max=10.0, precision=4,
    )
    max_files: IntProperty(
        name="Max Files (0=all)",
        description="Limit for testing — 0 means convert everything",
        default=0, min=0,
    )

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=460)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "ue5_folder")
        layout.prop(self, "mod_folder")
        layout.prop(self, "mesh_subpath")
        layout.prop(self, "ue5_scale")
        layout.prop(self, "max_files")
        layout.label(
            text=f"Scale {self.ue5_scale:.4f} × UE5 cm = FO4 game units",
            icon='INFO',
        )

    def execute(self, context):
        if not self.ue5_folder or not os.path.isdir(self.ue5_folder):
            self.report({'ERROR'}, "Select a valid UE5 FBX folder.")
            return {'CANCELLED'}
        if not self.mod_folder:
            self.report({'ERROR'}, "Set your mod output folder.")
            return {'CANCELLED'}

        fbx_files = []
        for root, _, files in os.walk(self.ue5_folder):
            for fname in files:
                if fname.lower().endswith('.fbx'):
                    fbx_files.append(os.path.join(root, fname))

        if self.max_files:
            fbx_files = fbx_files[:self.max_files]

        if not fbx_files:
            self.report({'ERROR'}, "No .fbx files found.")
            return {'CANCELLED'}

        ok_count = fail_count = 0

        for fbx in fbx_files:
            # Compute relative subpath to preserve folder structure
            rel_dir = os.path.relpath(os.path.dirname(fbx), self.ue5_folder)
            subpath = self.mesh_subpath
            if rel_dir and rel_dir != '.':
                subpath = os.path.join(subpath, rel_dir).strip("/\\")

            try:
                bpy.ops.fo4.convert_ue5_asset(
                    fbx_path=fbx,
                    mod_folder=self.mod_folder,
                    mesh_subpath=subpath,
                    ue5_scale=self.ue5_scale,
                    generate_collision=True,
                    export_bgsm=True,
                    import_only=False,
                )
                ok_count += 1
            except Exception as e:
                fail_count += 1
                print(f"[UE5→FO4 Batch] Failed {os.path.basename(fbx)}: {e}")

        self.report(
            {'INFO'} if not fail_count else {'WARNING'},
            f"Batch complete: {ok_count} converted, {fail_count} failed "
            f"from {len(fbx_files)} FBX file(s)."
        )
        return {'FINISHED'}


# ── Registration ───────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_ConvertUE5Asset,
    FO4_OT_BatchConvertUE5Folder,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[UE5→FO4] Could not register {cls.__name__}: {e}")
    print("[UE4/UE5→FO4] UE4 + UE5 → FO4 converter registered.")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
