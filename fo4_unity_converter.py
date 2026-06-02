"""
fo4_unity_converter.py
======================
Unity asset → Fallout 4 NIF conversion pipeline.

Handles all three Unity render pipelines:
  • Standard Shader (Legacy / Built-in)
  • URP  (Universal Render Pipeline)
  • HDRP (High Definition Render Pipeline)

Full workflow (one operator: FO4_OT_ConvertUnityAsset)
------------------------------------------------------
1. Import Unity FBX with correct axis + scale conversion
2. Auto-detect render pipeline and remap material textures to FO4 slots
3. Extract Smoothness channel from Unity metallic/mask texture → FO4 _s.dds
   ⚠ Unity uses SMOOTHNESS (0=rough, 1=smooth) — SAME as FO4.
     NO channel inversion needed (unlike UE4/UE5 which uses Roughness).
4. Apply all FO4 mesh prep (triangulate, merge doubles, apply transforms, UV)
5. Auto-generate UCX_ collision
6. Export as NIF via PyNifly → mod staging folder (Data/Meshes/…)
7. Export matching BGSM material file (Data/Materials/…)

Coordinate system differences
------------------------------
Unity world space : X=Right  Y=Up  Z=Forward  (left-handed, metres)
FO4 / NIF space   : X=Right  Y=Forward  Z=Up  (right-handed, game units)

Unity exports FBX by mirroring Z (left→right-handed conversion):
  Blender FBX import settings:
    axis_forward = '-Z'
    axis_up      = 'Y'
    global_scale = 1.0   (scale handled separately — see _UNITY_TO_FO4_SCALE)

Scale conversion
----------------
Unity uses metres:  1 Unity unit = 1 m
FO4 game units:     1 FO4 unit   = 0.0142875 m  (Havok world scale)
Scale factor:       1 / 0.0142875 ≈ 70.0 FO4 units per Unity unit

A human character at 1.8 m in Unity = 126 FO4 units ≈ FO4 NPC height. ✓

Unity material → FO4 texture mapping
--------------------------------------
Standard Shader / URP:
  Albedo / Base Map                → _d.dds  (slot 0, RGB albedo)
  Normal Map                       → _n.dds  (slot 1, DirectX convention)
  Metallic (RGBA):
    A channel = Smoothness          → _s.dds  (slot 2, G=Smoothness — NO inversion!)
    R channel = Metallic intensity  → _s.dds  (slot 2, R=Specular)
  Emission                         → _g.dds  (slot 3, set emitEnabled in BGSM)
  Occlusion                        not used in standard FO4 shader

HDRP Mask Map (R=Metallic, G=AO, B=Detail, A=Smoothness):
  A channel = Smoothness           → _s.dds G channel (NO inversion!)
  R channel = Metallic             → _s.dds R channel (Specular intensity)
  G channel = AO                   not directly used in FO4
  B channel = Detail mask          not used

⚠ CRITICAL DIFFERENCE FROM UE4/UE5:
  Unity:  Smoothness 0=rough 1=smooth  — ALREADY matches FO4 convention
  UE4/5:  Roughness  0=smooth 1=rough  — MUST be inverted for FO4
  → No inversion step for Unity assets!

Asset extraction (for packaged Unity builds)
--------------------------------------------
If assets are in Unity .bundle / .assets files (packaged game):
  • AssetStudio (GUI):  https://github.com/Perfare/AssetStudio
                        Already managed by asset_studio_helpers.py in this addon.
  • AssetRipper:        https://github.com/AssetRipper/AssetRipper
                        Already managed by asset_ripper_helpers.py in this addon.
  Both export FBX + PNG textures — point this operator at the output folder.

For Unity source projects (you own the project):
  Unity Editor: right-click asset in Project panel
    → Export Package → include dependencies
  Or:  Assets > Export To FBX  (requires FBX Exporter package)
  Or:  Varneon's UnityFBX-To-Blender-Importer (managed by unity_fbx_importer_helpers.py)
"""

from __future__ import annotations

import os
import struct
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
_UNITY_M_PER_UNIT = 1.0          # Unity: 1 unit = 1 metre
_FO4_M_PER_UNIT   = 0.0142875    # FO4: 1 unit = 0.0142875 m
_UNITY_TO_FO4_SCALE = _UNITY_M_PER_UNIT / _FO4_M_PER_UNIT  # ≈ 70.0

# Unity FBX export axis (left-handed → right-handed via Z mirror)
_UNITY_FBX_FORWARD = '-Z'
_UNITY_FBX_UP      = 'Y'

# FO4 texture suffix conventions
_SUFFIX_DIFFUSE  = '_d'
_SUFFIX_NORMAL   = '_n'
_SUFFIX_SPECULAR = '_s'
_SUFFIX_GLOW     = '_g'

# ── Unity material texture name patterns ──────────────────────────────────────
# Standard Shader
_STD_ALBEDO_NAMES   = ('maintex', 'albedo', 'basecolor', 'diffuse', 'color',
                       'base', 'basemap', '_maintex')
_STD_NORMAL_NAMES   = ('bumpmap', 'normalmap', 'normal', 'bump', '_bumpmap')
_STD_METALLIC_NAMES = ('metallicglossmap', 'metallic', 'metallicsmoothness',
                       'metallicsmooth', '_metallicglossmap')
_STD_EMISSION_NAMES = ('emissionmap', 'emission', 'emissive', '_emissionmap')
_STD_OCCLUSION_NAMES= ('occlusionmap', 'ao', 'ambientocclusion', '_occlusionmap')

# URP-specific
_URP_BASE_NAMES     = ('basemap', '_basemap', 'basecolormap')
_URP_NORMAL_NAMES   = ('normalmap', '_normalmap', '_bumpmap')
_URP_METAL_NAMES    = ('metallicglossmap', '_metallicglossmap', 'metallicsmoothness')
_URP_EMIT_NAMES     = ('emissionmap', '_emissionmap')

# HDRP-specific
_HDRP_BASE_NAMES    = ('basecolormap', '_basecolormap', 'basecolor')
_HDRP_MASK_NAMES    = ('maskmap', '_maskmap', 'mask')          # R=Metal, G=AO, B=Detail, A=Smooth
_HDRP_NORMAL_NAMES  = ('normalmap', '_normalmap', 'normalmapos', '_normalmapwithao')
_HDRP_EMIT_NAMES    = ('emissivecolormap', '_emissivecolormap', 'emission')

# All combined, for fallback detection
_ALL_ALBEDO_NAMES  = _STD_ALBEDO_NAMES + _URP_BASE_NAMES + _HDRP_BASE_NAMES
_ALL_NORMAL_NAMES  = _STD_NORMAL_NAMES + _URP_NORMAL_NAMES + _HDRP_NORMAL_NAMES
_ALL_METAL_NAMES   = _STD_METALLIC_NAMES + _URP_METAL_NAMES + _HDRP_MASK_NAMES
_ALL_EMIT_NAMES    = _STD_EMISSION_NAMES + _URP_EMIT_NAMES + _HDRP_EMIT_NAMES


# ── Material detection ────────────────────────────────────────────────────────

def _matches(node, *name_tuples) -> bool:
    test = (node.label or node.name).lower().replace(' ', '').replace('_', '')
    for names in name_tuples:
        for n in names:
            if n.replace(' ', '').replace('_', '') in test:
                return True
    return False


def _find_node(mat, *name_tuples):
    if not mat or not mat.use_nodes:
        return None
    for node in mat.node_tree.nodes:
        if node.type == 'TEX_IMAGE' and _matches(node, *name_tuples):
            return node
    return None


def _detect_pipeline(mat) -> str:
    """
    Guess the Unity render pipeline from material/texture names.
    Returns 'hdrp', 'urp', or 'standard'.
    """
    if not mat or not mat.use_nodes:
        return 'standard'
    names = " ".join(
        (n.label or n.name).lower()
        for n in mat.node_tree.nodes
    )
    if any(k in names for k in ('maskmap', '_maskmap', 'basecolormap', 'hdrp')):
        return 'hdrp'
    if any(k in names for k in ('basemap', '_basemap', 'urp')):
        return 'urp'
    return 'standard'


# ── Smoothness extraction (Unity metallic/mask → FO4 specular) ────────────────

def _extract_unity_specular(img, is_hdrp: bool = False) -> "bpy.types.Image | None":
    """
    Extract Unity smoothness channel → FO4 specular (_s.dds) image.

    Unity metallic texture layout:
      Standard/URP: R=Metallic, G=unused, B=unused, A=Smoothness
      HDRP Mask:    R=Metallic, G=AO,     B=Detail,  A=Smoothness

    FO4 _s.dds layout:
      R=Specular intensity  (← Unity metallic R)
      G=Smoothness          (← Unity A, NO INVERSION — same convention!)
      B=unused (0)
      A=255

    ⚠ IMPORTANT: Unity A=Smoothness already means 1=smooth 0=rough.
      FO4 also uses Smoothness (not Roughness). NO inversion!
    """
    try:
        w, h = img.size
        if w == 0 or h == 0:
            return None

        pixels = list(img.pixels[:])
        new_pixels = []

        for i in range(w * h):
            base = i * 4
            r = pixels[base]      # Metallic
            # g = pixels[base+1]  # AO (HDRP) / unused (Standard)
            # b = pixels[base+2]  # Detail mask (HDRP) / unused
            a = pixels[base+3]    # Smoothness (Unity A → FO4 G, NO inversion!)

            # FO4 _s.dds: R=Specular(from metallic), G=Smoothness, B=0
            new_pixels += [r, a, 0.0, 1.0]

        new_name = img.name.rsplit('.', 1)[0] + _SUFFIX_SPECULAR
        new_img  = bpy.data.images.new(new_name, width=w, height=h, alpha=False)
        new_img.pixels = new_pixels
        new_img.file_format = 'PNG'
        return new_img

    except Exception as e:
        print(f"[Unity→FO4] Specular extraction failed for {img.name}: {e}")
        return None


# ── Normal map Green channel inversion (OpenGL → DirectX) ────────────────────

def _invert_normal_green(img) -> "bpy.types.Image | None":
    """
    Automatically invert the Green channel of a normal map image.

    Unity uses OpenGL normal convention: G+ = up (Y pointing away from surface).
    FO4 uses DirectX normal convention:  G+ = down (Y pointing into surface).

    This is a pure pixel operation — we flip every Green value: new_G = 1 - G.
    Red (X) and Blue (Z) channels are left unchanged.

    The original image is replaced in-place.  A new image is NOT created
    because the file path stays the same (we just change pixel data).

    Returns the modified image on success, None on failure.
    """
    try:
        w, h = img.size
        if w == 0 or h == 0:
            return None

        pixels = list(img.pixels[:])   # flat RGBA, length = w*h*4

        for i in range(w * h):
            base = i * 4
            pixels[base + 1] = 1.0 - pixels[base + 1]   # invert Green only

        img.pixels = pixels
        img.update()
        return img

    except Exception as e:
        print(f"[Unity→FO4] Normal Green invert failed for {img.name}: {e}")
        return None


# ── Full material remap ───────────────────────────────────────────────────────

def remap_unity_material_to_fo4(mat) -> dict:
    """
    Detect Unity PBR texture nodes and remap them to FO4 conventions.

    Returns dict:
      {
        'pipeline': 'standard'|'urp'|'hdrp',
        'diffuse':  <image or None>,
        'normal':   <image or None>,
        'specular': <image or None>,
        'glow':     <image or None>,
        'actions':  [list of str],
      }
    """
    actions  = []
    pipeline = _detect_pipeline(mat)
    result   = {
        'pipeline': pipeline,
        'diffuse':  None,
        'normal':   None,
        'specular': None,
        'glow':     None,
        'actions':  actions,
    }

    if not mat or not mat.use_nodes:
        return result

    actions.append(f"Detected Unity pipeline: {pipeline.upper()}")

    # ── Diffuse / Albedo / Base Color ─────────────────────────────────────────
    diff_node = _find_node(mat, _ALL_ALBEDO_NAMES)
    if diff_node and diff_node.image:
        img  = diff_node.image
        base = img.name.rsplit('.', 1)[0]
        if not base.endswith(_SUFFIX_DIFFUSE):
            img.name = base + _SUFFIX_DIFFUSE
        diff_node.label = "Diffuse"
        actions.append(f"Albedo → '{img.name}' (FO4 slot 0 _d)")
        result['diffuse'] = img

    # ── Normal Map ────────────────────────────────────────────────────────────
    norm_node = _find_node(mat, _ALL_NORMAL_NAMES)
    if norm_node and norm_node.image:
        img  = norm_node.image
        base = img.name.rsplit('.', 1)[0]
        if not base.endswith(_SUFFIX_NORMAL):
            img.name = base + _SUFFIX_NORMAL
        norm_node.label = "Normal"

        # Unity uses OpenGL normals (G+ = up).
        # FO4 uses DirectX normals (G+ = down).
        # Invert the Green channel automatically — we have pixel access.
        if img.size[0] > 0 and img.size[1] > 0:
            inverted = _invert_normal_green(img)
            if inverted:
                actions.append(
                    f"Normal → '{img.name}' (FO4 slot 1 _n) "
                    "✓ Green channel auto-inverted (OpenGL→DirectX)"
                )
            else:
                actions.append(
                    f"Normal → '{img.name}' (FO4 slot 1 _n) "
                    "⚠ Green invert failed — image may not be loaded into memory. "
                    "Pack the image (Image > Pack) then re-run."
                )
        else:
            actions.append(
                f"Normal → '{img.name}' (FO4 slot 1 _n) "
                "⚠ Image has no pixel data (0×0) — load/pack it first."
            )
        result['normal'] = img

    # ── Metallic / Mask Map → FO4 Specular ────────────────────────────────────
    metal_node = _find_node(mat, _ALL_METAL_NAMES)
    if metal_node and metal_node.image:
        img     = metal_node.image
        is_hdrp = (pipeline == 'hdrp')
        new_img = _extract_unity_specular(img, is_hdrp=is_hdrp)
        if new_img:
            spec_node        = mat.node_tree.nodes.new('ShaderNodeTexImage')
            spec_node.image  = new_img
            spec_node.label  = "Specular"
            spec_node.location = (
                metal_node.location.x + 300,
                metal_node.location.y - 200,
            )
            result['specular'] = new_img
            chan_note = "HDRP Mask A=Smooth → G, R=Metal → R" if is_hdrp \
                        else "Metallic A=Smooth → G (NO inversion — Unity=FO4 convention)"
            actions.append(
                f"Metallic → '{new_img.name}' (FO4 slot 2 _s) [{chan_note}]"
            )
        else:
            actions.append(
                f"WARNING: Could not extract specular from '{img.name}' — "
                "ensure image is loaded (not just referenced)."
            )

    # ── Emission → Glow ───────────────────────────────────────────────────────
    emit_node = _find_node(mat, _ALL_EMIT_NAMES)
    if emit_node and emit_node.image:
        img  = emit_node.image
        base = img.name.rsplit('.', 1)[0]
        if not base.endswith(_SUFFIX_GLOW):
            img.name = base + _SUFFIX_GLOW
        emit_node.label = "Glow"
        actions.append(f"Emission → '{img.name}' (FO4 slot 3 _g, emitEnabled=True)")
        result['glow'] = img

    # ── Principled BSDF socket fallback ──────────────────────────────────────
    if not any(result[k] for k in ('diffuse', 'normal', 'specular')):
        principled = next(
            (n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None
        )
        if principled:
            socket_remap = {
                'Base Color':   ('diffuse',  _SUFFIX_DIFFUSE,  'Diffuse'),
                'Normal':       ('normal',   _SUFFIX_NORMAL,   'Normal'),
                'Metallic':     ('specular', _SUFFIX_SPECULAR, 'Specular'),
                'Roughness':    ('specular', _SUFFIX_SPECULAR, 'Specular'),
                'Emission':     ('glow',     _SUFFIX_GLOW,     'Glow'),
                'Emission Color':('glow',    _SUFFIX_GLOW,     'Glow'),
            }
            for socket_name, (slot_key, suffix, label) in socket_remap.items():
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
                        result[slot_key] = img
                        actions.append(
                            f"Socket '{socket_name}' → '{img.name}' (FO4 {suffix})"
                        )
                        break

    return result


# ── BGSM metadata on material ─────────────────────────────────────────────────

def _apply_bgsm_props(mat, remap: dict, mat_type: str = "DEFAULT") -> None:
    """Store FO4 material settings as custom properties for bgsm_helpers."""
    def _tex(img) -> str:
        if not img:
            return ""
        name = img.name
        if not name.lower().endswith('.dds'):
            name = os.path.splitext(name)[0] + ".dds"
        return name

    mat["fo4_bgsm_diffuse"]  = _tex(remap.get('diffuse'))
    mat["fo4_bgsm_normal"]   = _tex(remap.get('normal'))
    mat["fo4_bgsm_specular"] = _tex(remap.get('specular'))
    mat["fo4_bgsm_glow"]     = _tex(remap.get('glow'))
    mat["fo4_emit_enabled"]  = bool(remap.get('glow'))
    mat["fo4_mat_type"]      = mat_type
    mat["fo4_converted_from_unity"] = True
    mat["fo4_unity_pipeline"] = remap.get('pipeline', 'standard')


# ── Mesh preparation ──────────────────────────────────────────────────────────

def _prep_mesh_for_fo4(obj, scale: float) -> list:
    """Apply scale, triangulate, merge doubles, ensure UV. Returns step list."""
    import bmesh as _bm
    steps = []

    if abs(scale - 1.0) > 0.001:
        obj.scale = (scale, scale, scale)
        bpy.ops.object.transform_apply(scale=True)
        steps.append(f"Scale: ×{scale:.2f} (Unity metres → FO4 game units)")

    # Apply remaining transforms
    for attr, name in [
        ('location', 'location'),
        ('rotation_euler', 'rotation'),
    ]:
        val = getattr(obj, attr)
        if hasattr(val, 'length'):
            dirty = val.length > 0.001
        else:
            dirty = any(abs(v) > 0.001 for v in val)
        if dirty:
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
    merged = n_before - len(bm.verts)
    if merged:
        steps.append(f"Merged {merged} duplicate vertex/vertices")
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

    # Normals
    try:
        bpy.ops.object.shade_smooth()
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        steps.append("Smooth shading + consistent normals")
    except Exception:
        pass

    # Limit check
    n_verts = len(me.vertices)
    if n_verts > 65535:
        steps.append(
            f"⚠ WARNING: {n_verts} vertices > FO4 limit (65535). "
            "Use 'Split Mesh at Poly Limit' before export."
        )
    elif n_verts > 32000:
        steps.append(f"⚠ WARNING: {n_verts} vertices is high — consider LODs.")

    return steps


# ══════════════════════════════════════════════════════════════════════════════
# Main operator
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_ConvertUnityAsset(Operator):
    """
    Import a Unity FBX asset and convert it fully for Fallout 4.

    Supports all Unity render pipelines: Standard (Legacy), URP, and HDRP.

    ⚠ Unity vs UE4/UE5 critical difference:
      Unity uses SMOOTHNESS (already FO4-compatible — no inversion).
      UE4/UE5 uses ROUGHNESS (must be inverted). Use the UE4/UE5 converter
      for Unreal assets; use THIS operator for Unity assets.

    How to export from Unity (source project):
      Option A — FBX Exporter package:
        Install via Package Manager → FBX Exporter
        Then: right-click asset → Export To FBX
      Option B — Varneon's UnityFBX-To-Blender-Importer (Unity extension):
        Managed by this addon (unity_fbx_importer_helpers.py → Setup panel)

    For packaged Unity builds (.bundle / .assets files):
      AssetStudio: https://github.com/Perfare/AssetStudio  (Setup panel → Install)
      AssetRipper: https://github.com/AssetRipper/AssetRipper  (Setup panel → Install)
      Both export FBX + PNG textures — point this operator at the output.

    Normal maps:
      Unity uses OpenGL normals (G+ = up). FO4 uses DirectX (G+ = down).
      The Green channel is AUTOMATICALLY inverted during conversion as long
      as the image is loaded into Blender memory (not just linked by path).
      If an image shows 0×0 size, pack it first (Image > Pack) then re-run.
    """
    bl_idname  = "fo4.convert_unity_asset"
    bl_label   = "Import & Convert Unity Asset → FO4 NIF"
    bl_description = (
        "Import a Unity FBX (Standard/URP/HDRP), auto-remap materials to FO4 "
        "format, extract smoothness (no inversion needed — Unity=FO4 convention), "
        "prep mesh, and export as NIF to your mod staging folder."
    )
    bl_options = {'REGISTER', 'UNDO'}

    fbx_path: StringProperty(
        name="Unity FBX File",
        description=(
            "FBX exported from Unity (FBX Exporter package or Varneon's tool). "
            "OR extracted from .bundle/.assets with AssetStudio/AssetRipper."
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
        description="Relative path under Data/Meshes/ (e.g. 'MyMod/Props')",
        default="",
    )
    mat_type: EnumProperty(
        name="Mesh Type",
        description="FO4 mesh/material type — controls BGSM shader flags",
        items=[
            ('DEFAULT',      "Static Prop",  "General static world object"),
            ('ARCHITECTURE', "Architecture", "Building/structure"),
            ('FURNITURE',    "Furniture",    "Interactive furniture"),
            ('WEAPON',       "Weapon",       "Weapon mesh"),
            ('VEGETATION',   "Vegetation",   "Tree/plant (wind weights)"),
            ('DEBRIS',       "Debris",       "Physics debris"),
        ],
        default='DEFAULT',
    )
    unity_scale: FloatProperty(
        name="Unity Scale Override",
        description=(
            f"Scale factor: Unity metres → FO4 game units. "
            f"Default {_UNITY_TO_FO4_SCALE:.2f} is correct for standard Unity assets. "
            "Reduce if your asset was already exported at a non-1:1 scale."
        ),
        default=_UNITY_TO_FO4_SCALE,
        min=0.001,
        max=500.0,
        precision=3,
    )
    generate_collision: BoolProperty(
        name="Generate UCX_ Collision",
        description="Auto-generate convex collision (UCX_ prefix) for static props",
        default=True,
    )
    export_bgsm: BoolProperty(
        name="Export BGSM",
        description="Write matching .bgsm to Data/Materials/",
        default=True,
    )
    import_only: BoolProperty(
        name="Import & Convert Only (no NIF export)",
        description="Import and remap materials but skip NIF export — review first",
        default=False,
    )
    normal_warning_shown: BoolProperty(default=False, options={'HIDDEN'})

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=530)

    def draw(self, context):
        layout = self.layout

        box = layout.box()
        box.label(text="Step 1 — Unity FBX source:", icon='IMPORT')
        box.label(text="Unity: right-click asset → Export To FBX (FBX Exporter pkg)")
        box.label(text="Packaged builds: AssetStudio or AssetRipper (Setup panel)")
        box.prop(self, "fbx_path")

        layout.separator()
        box2 = layout.box()
        box2.label(text="Step 2 — Mod output:", icon='FILEBROWSER')
        box2.prop(self, "mod_folder")
        box2.prop(self, "mesh_subpath")

        layout.separator()
        layout.prop(self, "mat_type")
        layout.prop(self, "unity_scale")
        layout.prop(self, "generate_collision")
        layout.prop(self, "export_bgsm")
        layout.prop(self, "import_only")

        layout.separator()
        col = layout.column()
        col.label(
            text="Unity Smoothness = FO4 Smoothness — NO inversion needed.",
            icon='INFO',
        )
        col.label(
            text="Normal map Green channel auto-inverted (OpenGL→DirectX).",
            icon='CHECKMARK',
        )

    def execute(self, context):
        if not self.fbx_path or not os.path.isfile(self.fbx_path):
            self.report({'ERROR'}, "Select a valid Unity FBX file.")
            return {'CANCELLED'}
        if not self.import_only and not self.mod_folder:
            self.report({'ERROR'}, "Set your mod output folder.")
            return {'CANCELLED'}

        steps, warnings, errors = [], [], []

        # ── Import FBX ─────────────────────────────────────────────────────────
        before = set(bpy.data.objects.keys())
        try:
            bpy.ops.import_scene.fbx(
                filepath=self.fbx_path,
                use_manual_orientation=True,
                axis_forward=_UNITY_FBX_FORWARD,
                axis_up=_UNITY_FBX_UP,
                global_scale=1.0,
                use_anim=False,
                ignore_leaf_bones=True,
                use_custom_normals=True,
                force_connect_children=False,
            )
            steps.append(
                f"Imported: {os.path.basename(self.fbx_path)} "
                f"(Unity axis: forward={_UNITY_FBX_FORWARD}, up={_UNITY_FBX_UP})"
            )
        except Exception as e:
            self.report({'ERROR'}, f"FBX import failed: {e}")
            return {'CANCELLED'}

        new_objs = [bpy.data.objects[k]
                    for k in bpy.data.objects.keys()
                    if k not in before]
        mesh_objs = [o for o in new_objs if o.type == 'MESH']

        if not mesh_objs:
            self.report({'ERROR'}, "No mesh objects imported.")
            return {'CANCELLED'}

        steps.append(f"Found {len(mesh_objs)} mesh object(s)")
        exported_nifs = []
        has_normals = False

        for obj in mesh_objs:
            obj_steps = []
            obj_warns = []

            context.view_layer.objects.active = obj
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            obj["fo4_mesh_type"] = self.mat_type

            # ── Material remap ─────────────────────────────────────────────────
            for slot in obj.material_slots:
                mat = slot.material
                if not mat:
                    continue
                remap = remap_unity_material_to_fo4(mat)
                obj_steps.extend(remap['actions'])
                _apply_bgsm_props(mat, remap, self.mat_type)
                if remap.get('normal'):
                    has_normals = True

            # ── Mesh prep ──────────────────────────────────────────────────────
            obj_steps.extend(_prep_mesh_for_fo4(obj, self.unity_scale))

            # ── LOD detection ─────────────────────────────────────────────────
            name_upper = obj.name.upper()
            lod_suffix = next(
                (lod.lower() for lod in ("_LOD0", "_LOD1", "_LOD2", "_LOD3")
                 if name_upper.endswith(lod)),
                ""
            )

            # ── Collision ─────────────────────────────────────────────────────
            if self.generate_collision and not lod_suffix:
                try:
                    existing = any(
                        o.name.upper().startswith("UCX_" + obj.name.upper()[:16])
                        for o in bpy.data.objects
                    )
                    if not existing:
                        from . import mesh_helpers
                        _, col_msg = mesh_helpers.MeshHelpers.add_collision_mesh(
                            obj, simplify_ratio=0.25
                        )
                        obj_steps.append(f"Collision: {col_msg}")
                except Exception as e:
                    obj_warns.append(f"Collision skipped: {e}")

            # ── NIF export ─────────────────────────────────────────────────────
            if not self.import_only:
                try:
                    safe   = obj.name.replace(" ", "_")
                    sub    = self.mesh_subpath.strip("/\\")
                    nif_name = f"{safe}{lod_suffix}.nif"
                    nif_rel  = os.path.join("Data", "Meshes",
                                            sub, nif_name) if sub else \
                               os.path.join("Data", "Meshes", nif_name)
                    abs_nif  = os.path.normpath(
                        os.path.join(self.mod_folder, nif_rel)
                    )
                    os.makedirs(os.path.dirname(abs_nif), exist_ok=True)

                    ok, exporter, msg = self._export_nif(obj, abs_nif)
                    if ok:
                        obj["fo4_nif_path"] = nif_rel.replace("\\", "/")
                        obj_steps.append(f"NIF ({exporter}): {nif_rel}")
                        exported_nifs.append(abs_nif)
                        if self.export_bgsm:
                            self._export_bgsm(obj, abs_nif)
                            obj_steps.append("BGSM written to Data/Materials/")
                    else:
                        obj_warns.append(f"NIF export failed: {msg}")
                except Exception as e:
                    obj_warns.append(f"Export error: {e}")
                    traceback.print_exc()

            steps.append(f"[{obj.name}]")
            steps.extend(f"  {s}" for s in obj_steps)
            warnings.extend(obj_warns)

        # Normal map — auto-inverted, just confirm
        if has_normals:
            steps.append(
                "Normal map Green channel inverted automatically (Unity OpenGL → FO4 DirectX) ✓"
            )

        if self.import_only:
            steps.append(
                f"Import & convert complete — {len(mesh_objs)} mesh(es) ready to review."
            )
        else:
            steps.append(
                f"Done: {len(exported_nifs)}/{len(mesh_objs)} NIF(s) → {self.mod_folder}"
            )

        for s in steps:
            self.report({'INFO'}, s)
        for w in warnings:
            self.report({'WARNING'}, w)
        return {'FINISHED'}

    def _export_nif(self, obj, filepath: str) -> tuple:
        try:
            bpy.ops.object.select_all(action='DESELECT')
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
        except Exception:
            pass
        try:
            from . import export_helpers
            result   = export_helpers.ExportHelpers.export_mesh_to_nif(obj, filepath)
            ok       = result[0] if isinstance(result, tuple) else \
                       result in ({'FINISHED'}, 'FINISHED')
            msg      = result[1] if isinstance(result, tuple) else str(result)
            exporter = "PyNifly" if ok else "export_helpers"
            return ok, exporter, msg
        except Exception as e:
            try:
                fbx = os.path.splitext(filepath)[0] + "_NEEDS_CAO.fbx"
                bpy.ops.export_scene.fbx(
                    filepath=fbx, use_selection=True,
                    apply_unit_scale=True,
                    axis_forward='-Z', axis_up='Y',
                )
                return True, "FBX(needs CAO)", f"FBX: {fbx} — convert with CAO"
            except Exception as e2:
                return False, "none", str(e2)

    def _export_bgsm(self, obj, nif_abs: str) -> None:
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
            print(f"[Unity→FO4] BGSM export error: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Batch operator
# ══════════════════════════════════════════════════════════════════════════════

class FO4_OT_BatchConvertUnityFolder(Operator):
    """
    Batch-convert a folder of Unity FBX files to FO4 NIFs.

    Walks the folder recursively, converts every .fbx, preserves sub-folder
    structure inside Data/Meshes/.
    """
    bl_idname  = "fo4.batch_convert_unity_folder"
    bl_label   = "Batch Convert Unity Folder → FO4 NIFs"
    bl_description = (
        "Convert every FBX in a folder from Unity format to FO4-ready NIFs. "
        "Preserves sub-folder structure inside Data/Meshes/."
    )
    bl_options = {'REGISTER'}

    unity_folder: StringProperty(
        name="Unity FBX Folder",
        description="Folder containing FBX files from Unity or AssetStudio/AssetRipper",
        default="",
        subtype='DIR_PATH',
    )
    mod_folder: StringProperty(
        name="Mod Output Folder",
        default="",
        subtype='DIR_PATH',
    )
    mesh_subpath: StringProperty(
        name="Mesh Sub-path",
        description="Prefix under Data/Meshes/ (e.g. 'MyMod/Unity')",
        default="",
    )
    unity_scale: FloatProperty(
        name="Unity Scale",
        default=_UNITY_TO_FO4_SCALE,
        min=0.001, max=500.0, precision=3,
    )
    max_files: IntProperty(name="Max Files (0=all)", default=0, min=0)

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=460)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "unity_folder")
        layout.prop(self, "mod_folder")
        layout.prop(self, "mesh_subpath")
        layout.prop(self, "unity_scale")
        layout.prop(self, "max_files")
        layout.label(
            text=f"Scale: ×{self.unity_scale:.1f} (Unity 1m → {self.unity_scale:.1f} FO4 units)",
            icon='INFO',
        )
        layout.label(
            text="Normal map Green channel auto-inverted during conversion ✓",
            icon='CHECKMARK',
        )

    def execute(self, context):
        if not self.unity_folder or not os.path.isdir(self.unity_folder):
            self.report({'ERROR'}, "Select a valid Unity FBX folder.")
            return {'CANCELLED'}
        if not self.mod_folder:
            self.report({'ERROR'}, "Set your mod output folder.")
            return {'CANCELLED'}

        fbx_files = []
        for root, _, files in os.walk(self.unity_folder):
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
            rel_dir = os.path.relpath(os.path.dirname(fbx), self.unity_folder)
            sub     = os.path.join(self.mesh_subpath, rel_dir).strip("/\\") \
                      if rel_dir != '.' else self.mesh_subpath
            try:
                bpy.ops.fo4.convert_unity_asset(
                    fbx_path=fbx,
                    mod_folder=self.mod_folder,
                    mesh_subpath=sub,
                    unity_scale=self.unity_scale,
                    generate_collision=True,
                    export_bgsm=True,
                    import_only=False,
                )
                ok_count += 1
            except Exception as e:
                fail_count += 1
                print(f"[Unity→FO4 Batch] Failed {os.path.basename(fbx)}: {e}")

        self.report(
            {'INFO'} if not fail_count else {'WARNING'},
            f"Batch complete: {ok_count} converted, {fail_count} failed "
            f"from {len(fbx_files)} FBX file(s). "
            "Normal map Green channels auto-inverted ✓"
        )
        return {'FINISHED'}


# ── Registration ───────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_ConvertUnityAsset,
    FO4_OT_BatchConvertUnityFolder,
]


def register():
    if bpy is None:
        return
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"[Unity→FO4] Could not register {cls.__name__}: {e}")
    print("[Unity→FO4] Unity → FO4 converter registered.")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
