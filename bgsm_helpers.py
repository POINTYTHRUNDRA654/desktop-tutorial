"""
bgsm_helpers.py
================
Binary reader/writer for Fallout 4 ``.bgsm`` (BGS Material) and ``.bgem``
(BGS Effect Material) files.

FO4 material files live under ``Data/Materials/`` and use the ``.bgsm``
extension for standard surface materials and ``.bgem`` for particle/effect
materials.  This module provides:

* :class:`BGSMData` — dataclass holding every BGSM field with sensible FO4
  defaults.
* :class:`BGEMData` — dataclass holding every BGEM field with sensible FO4
  defaults.
* :func:`write_bgsm` / :func:`read_bgsm` — binary serialisation for BGSM.
* :func:`write_bgem` / :func:`read_bgem` — binary serialisation for BGEM.
* :func:`blender_mat_to_bgsm` — extract fields from a Blender material.
* :func:`bgsm_to_blender_mat` — apply a BGSMData to a Blender material.
* :func:`export_bgsm_for_object` — high-level helper used by the export
  operator.
* :func:`import_bgsm_for_object` — high-level helper used by the import
  operator.

Binary format (FO4 version 2, little-endian)
---------------------------------------------
All integers are unsigned unless stated otherwise; all booleans are stored
as a single byte (0 = False, 1 = True).

Common header (shared by BGSM and BGEM):

  Offset  Size  Type    Field
  ------  ----  ------  ----------------------------------------
       0     4  char[4] magic ("BGSM" or "BGEM")
       4     4  uint32  version (2 for FO4)
       8     4  uint32  tileFlags  bit0=TileU, bit1=TileV
      12     4  float   tileU  (U scale factor, 1.0 = no tile)
      16     4  float   tileV  (V scale factor, 1.0 = no tile)
      20     4  float   offsetU
      24     4  float   offsetV
      28     4  float   alpha
      32     1  uint8   alphaBlendMode (0=None 1=Std 2=Add 3=Mul 4=Sub)
      33     4  uint32  alphaTestRef (0–255)
      37     1  bool    alphaTest
      38     1  bool    zBufferWrite
      39     1  bool    zBufferTest
      40     1  bool    screenSpaceReflections
      41     1  bool    wetnessControlScreenSpaceScale
      42     1  bool    wetnessControlHemisphere
      43     1  bool    wetnessControlScreenSpaceSpecular
      44     1  bool    wetnessControlSpecularPower
      45     1  bool    wetnessControlSpecularIntensity
      46     1  bool    wetnessControlEnvMapScale
      47     1  bool    grayscaleToPaletteColor
      48     1  bool    grayscaleToPaletteScale
      49     4  float   grayscaleToPaletteScaleValue
      53     1  bool    specularEnabled
      54    12  float*3 specularColor  (R, G, B)
      66     4  float   specularMult
      70     4  float   smoothness
      74     4  float   fresnelPower
      78     4  float   wetnessControlEnvMapScale
      82     4  float   wetnessControlFresnelPower
      86     4  float   wetnessControlMetalness
      90     ?  NiStr   rootMaterialPath  (uint32 len + UTF-8 bytes)
      ?      1  bool    anisoLighting
      ?      1  bool    emitEnabled
      ?     12  float*3 emittanceColor  (R, G, B)
      ?      4  float   emittanceMult
      ?      1  bool    modelSpaceNormals
      ?      1  bool    externalEmittance
      ?      1  bool    backLighting
      ?      1  bool    receiveShadows
      ?      1  bool    hideSecret
      ?      1  bool    castShadows
      ?      1  bool    dissolveFade
      ?      1  bool    assumeShadowmask
      ?      1  bool    glowmap
      ?      1  bool    envMappingWindow
      ?      1  bool    envMappingEye
      ?      1  bool    hair
      ?     12  float*3 hairTintColor  (R, G, B)
      ?      1  bool    tree
      ?      1  bool    facegen
      ?      1  bool    skinTint
      ?      1  bool    tessellate
      ?      4  float   displacementTexBias
      ?      4  float   displacementTexScale
      ?      4  float   tessellationPNScale
      ?      4  float   tessellationBaseFactor
      ?      4  float   tessellationFadeDistance
      ?      1  bool    pbr
      ?      1  bool    translucency
      ?      1  bool    translucencyThickObject
      ?      1  bool    translucencyMixAlbedoWithSubsurface
      ?     12  float*3 translucencySubsurfaceColor
      ?      4  float   translucencyTransmissiveScale
      ?      4  float   translucencyTurbulence
      ?      1  bool    customPorosity
      ?      4  float   porosityValue
      ?      ?  NiStr   envmapMaskTexture

BGSM-only fields (appended after common header):

      ?      ?  NiStr   diffuseTexture    (_d.dds)
      ?      ?  NiStr   normalTexture     (_n.dds)
      ?      ?  NiStr   smoothSpecTexture (_s.dds)
      ?      ?  NiStr   greyscaleTexture  (_g.dds  glow/palette mask)
      ?      ?  NiStr   glowTexture       (glow map override)
      ?      ?  NiStr   innerLayerTexture (wrinkle/inner layer)
      ?      ?  NiStr   wrinkleMaskTexture
      ?      ?  NiStr   displacementTexture
      ?      4  uint32  shaderFlags1
      ?      4  uint32  shaderFlags2

BGEM-only fields (appended after common header):

      ?      ?  NiStr   baseTexture
      ?      ?  NiStr   grayscaleTexture
      ?      ?  NiStr   envMapTexture
      ?      ?  NiStr   normalTexture
      ?      ?  NiStr   envMapMaskTexture
      ?      1  bool    bloodEnabled
      ?      1  bool    effectLightingEnabled
      ?      1  bool    falloffEnabled
      ?      1  bool    falloffColorEnabled
      ?      1  bool    grayscaleToPaletteAlpha
      ?      1  bool    softEnabled
      ?     12  float*3 baseColor  (R, G, B)
      ?      4  float   baseColorScale
      ?      4  float   falloffStartAngle
      ?      4  float   falloffStopAngle
      ?      4  float   falloffStartOpacity
      ?      4  float   falloffStopOpacity
      ?      4  float   lightingInfluence
      ?      1  uint8   envMapMinLod
      ?      4  float   softDepth

NiString encoding: uint32 (length) followed by exactly ``length`` ASCII/UTF-8
bytes.  The string is NOT null-terminated.  An empty string is encoded as
four zero bytes.
"""

from __future__ import annotations

import os
import struct
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

try:
    import bpy
except ImportError:
    bpy = None  # type: ignore[assignment]

# ---------------------------------------------------------------------------
# Format constants
# ---------------------------------------------------------------------------
_BGSM_MAGIC = b"BGSM"
_BGEM_MAGIC = b"BGEM"
_FO4_VERSION = 2

# tileFlags bit masks
_TILE_U = 1
_TILE_V = 2

# AlphaBlendMode enum values
ALPHA_BLEND_NONE = 0
ALPHA_BLEND_STANDARD = 1
ALPHA_BLEND_ADDITIVE = 2
ALPHA_BLEND_MULTIPLY = 3
ALPHA_BLEND_SUBTRACT = 4

# ShaderFlags1 bit masks (common flags)
SF1_SPECULAR = 1 << 0
SF1_SKINNED = 1 << 1
SF1_TEMP_REFRACTION = 1 << 2
SF1_VERTEX_ALPHA = 1 << 3
SF1_GRAYSCALE_TO_PALETTE_COLOR = 1 << 4
SF1_GRAYSCALE_TO_PALETTE_ALPHA = 1 << 5
SF1_ENVIRONMENT_MAPPING = 1 << 7
SF1_RECEIVE_SHADOWS = 1 << 8
SF1_CAST_SHADOWS = 1 << 9
SF1_FACE = 1 << 10
SF1_PARALLAX_OCCLUSION = 1 << 11
SF1_PARALLAX = 1 << 12
SF1_DECAL = 1 << 13
SF1_DYNAMIC_DECAL = 1 << 14
SF1_EXTERNAL_EMITTANCE = 1 << 15
SF1_EMIT_ENABLED = 1 << 16
SF1_BACK_LIGHTING = 1 << 17
SF1_MODEL_SPACE_NORMALS = 1 << 19
SF1_REFRACTION = 1 << 21
SF1_FIRE_REFRACTION = 1 << 22
SF1_EYE_ENVIRONMENT_MAPPING = 1 << 23
SF1_HAIR = 1 << 24
SF1_SCREENDOOR_ALPHA_FADE = 1 << 25
SF1_LOCALMAP_HIDE_SECRET = 1 << 26
SF1_SKIN_TINT = 1 << 27
SF1_WEAPON_BLOOD = 1 << 28
SF1_HIDE_ON_LOCAL_MAP = 1 << 29
SF1_TREE = 1 << 30

SF2_ZBUFFER_TEST = 1 << 0
SF2_ZBUFFER_WRITE = 1 << 1
SF2_LOD_LANDSCAPE = 1 << 2
SF2_LOD_OBJECTS = 1 << 3
SF2_NO_FADE = 1 << 4
SF2_DOUBLE_SIDED = 1 << 5
SF2_VERTEX_COLORS = 1 << 6
SF2_GLOW_MAP = 1 << 7
SF2_TRANSFORM_CHANGED = 1 << 8
SF2_DISMEMBERMENT_MEATCUFF = 1 << 9
SF2_TINT = 1 << 10
SF2_GRASS_VERTEX_LIGHTING = 1 << 11
SF2_PACK_NORMALS = 1 << 12
SF2_MULTI_INDEX_SNOW = 1 << 13
SF2_VERTEX_LIGHTING = 1 << 14
SF2_UNIFORM_SCALE = 1 << 15
SF2_FIT_SLOPE = 1 << 16
SF2_BILLBOARD = 1 << 17
SF2_NO_LOD_LAND_BLEND = 1 << 18
SF2_ENV_MAP_LIGHT_FADE = 1 << 19
SF2_WIREFRAME = 1 << 20
SF2_WEAPON_BLOOD2 = 1 << 21
SF2_BASE_TRANSPARENCY_MAP = 1 << 22
SF2_PHYS_BASED_SPEC = 1 << 23
SF2_EMPTY = 1 << 24
SF2_MULTI_LAYER_PARALLAX = 1 << 25
SF2_SOFT_LIGHTING = 1 << 26
SF2_RIM_LIGHTING = 1 << 27
SF2_BACK_LIGHTING2 = 1 << 28
SF2_SNOW = 1 << 29
SF2_TREE_AIM = 1 << 30


# ---------------------------------------------------------------------------
# NiString helpers
# ---------------------------------------------------------------------------

def _read_nistring(buf: bytes, offset: int) -> tuple[str, int]:
    """Read a NiString at *offset* from *buf*.

    Returns (string_value, new_offset_after_string).
    """
    if offset + 4 > len(buf):
        return "", offset + 4
    length = struct.unpack_from("<I", buf, offset)[0]
    offset += 4
    end = offset + length
    if end > len(buf):
        return "", end
    text = buf[offset:end].decode("ascii", errors="replace")
    return text, end


def _write_nistring(s: str) -> bytes:
    """Encode a string as a NiString (uint32 length + ASCII bytes)."""
    encoded = (s or "").encode("ascii", errors="replace")
    return struct.pack("<I", len(encoded)) + encoded


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class _CommonData:
    """Fields shared by both BGSM and BGEM."""
    # UV tiling/offset
    tile_u: bool = True
    tile_v: bool = True
    offset_u: float = 0.0
    offset_v: float = 0.0
    # Alpha
    alpha: float = 1.0
    alpha_blend_mode: int = ALPHA_BLEND_NONE
    alpha_test_ref: int = 128
    alpha_test: bool = False
    # Z-buffer
    z_buffer_write: bool = True
    z_buffer_test: bool = True
    # Misc flags
    screen_space_reflections: bool = False
    wetness_control_screen_space_scale: bool = False
    wetness_control_hemisphere: bool = False
    wetness_control_screen_space_specular: bool = False
    wetness_control_specular_power: bool = False
    wetness_control_specular_intensity: bool = False
    wetness_control_env_map_scale: bool = False
    grayscale_to_palette_color: bool = False
    grayscale_to_palette_scale: bool = False
    grayscale_to_palette_scale_value: float = 1.0
    # Specular
    specular_enabled: bool = True
    specular_color: tuple = (1.0, 1.0, 1.0)
    specular_mult: float = 1.0
    smoothness: float = 100.0
    fresnel_power: float = 5.0
    wetness_control_env_map_scale_value: float = 1.0
    wetness_control_fresnel_power: float = 5.0
    wetness_control_metalness: float = 0.0
    # Root material
    root_material_path: str = ""
    # Emission / lighting
    aniso_lighting: bool = False
    emit_enabled: bool = False
    emittance_color: tuple = (1.0, 1.0, 1.0)
    emittance_mult: float = 1.0
    model_space_normals: bool = False
    external_emittance: bool = False
    back_lighting: bool = False
    receive_shadows: bool = True
    hide_secret: bool = False
    cast_shadows: bool = True
    dissolve_fade: bool = False
    assume_shadowmask: bool = False
    glowmap: bool = False
    env_mapping_window: bool = False
    env_mapping_eye: bool = False
    hair: bool = False
    hair_tint_color: tuple = (1.0, 1.0, 1.0)
    tree: bool = False
    facegen: bool = False
    skin_tint: bool = False
    tessellate: bool = False
    displacement_tex_bias: float = 0.0
    displacement_tex_scale: float = 1.0
    tessellation_pn_scale: float = 1.0
    tessellation_base_factor: float = 1.0
    tessellation_fade_distance: float = 1.0
    pbr: bool = False
    translucency: bool = False
    translucency_thick_object: bool = False
    translucency_mix_albedo_with_subsurface: bool = False
    translucency_subsurface_color: tuple = (1.0, 1.0, 1.0)
    translucency_transmissive_scale: float = 1.0
    translucency_turbulence: float = 0.0
    custom_porosity: bool = False
    porosity_value: float = 0.0
    envmap_mask_texture: str = ""


@dataclass
class BGSMData(_CommonData):
    """All fields of a FO4 ``.bgsm`` file (standard material)."""
    diffuse_texture: str = ""
    normal_texture: str = ""
    smooth_spec_texture: str = ""
    greyscale_texture: str = ""
    glow_texture: str = ""
    inner_layer_texture: str = ""
    wrinkle_mask_texture: str = ""
    displacement_texture: str = ""
    shader_flags1: int = SF1_SPECULAR | SF1_RECEIVE_SHADOWS | SF1_CAST_SHADOWS
    shader_flags2: int = SF2_ZBUFFER_TEST | SF2_ZBUFFER_WRITE


@dataclass
class BGEMData(_CommonData):
    """All fields of a FO4 ``.bgem`` file (effect material)."""
    base_texture: str = ""
    grayscale_texture: str = ""
    env_map_texture: str = ""
    normal_texture: str = ""
    env_map_mask_texture: str = ""
    blood_enabled: bool = False
    effect_lighting_enabled: bool = False
    falloff_enabled: bool = False
    falloff_color_enabled: bool = False
    grayscale_to_palette_alpha: bool = False
    soft_enabled: bool = False
    base_color: tuple = (1.0, 1.0, 1.0)
    base_color_scale: float = 1.0
    falloff_start_angle: float = 0.1
    falloff_stop_angle: float = 1.6
    falloff_start_opacity: float = 0.0
    falloff_stop_opacity: float = 1.0
    lighting_influence: float = 1.0
    env_map_min_lod: int = 0
    soft_depth: float = 100.0


# ---------------------------------------------------------------------------
# Binary serialisation helpers
# ---------------------------------------------------------------------------

def _pack_common(data: _CommonData) -> bytes:
    """Serialise the common header fields to bytes."""
    buf = bytearray()

    tile_flags = (_TILE_U if data.tile_u else 0) | (_TILE_V if data.tile_v else 0)

    # tileFlags, tileU (scale), tileV (scale), offsetU, offsetV, alpha
    tile_u_val = 1.0 if data.tile_u else 0.0
    tile_v_val = 1.0 if data.tile_v else 0.0
    buf += struct.pack(
        "<Ifffff",
        tile_flags,
        tile_u_val,
        tile_v_val,
        data.offset_u,
        data.offset_v,
        data.alpha,
    )

    # alphaBlendMode (uint8), alphaTestRef (uint32), alphaTest (bool)
    buf += struct.pack("<BIB", data.alpha_blend_mode, data.alpha_test_ref, int(data.alpha_test))

    # z-buffer and misc bool flags (each 1 byte)
    flags = [
        data.z_buffer_write,
        data.z_buffer_test,
        data.screen_space_reflections,
        data.wetness_control_screen_space_scale,
        data.wetness_control_hemisphere,
        data.wetness_control_screen_space_specular,
        data.wetness_control_specular_power,
        data.wetness_control_specular_intensity,
        data.wetness_control_env_map_scale,
        data.grayscale_to_palette_color,
        data.grayscale_to_palette_scale,
    ]
    buf += bytes([int(b) for b in flags])

    # grayscaleToPaletteScaleValue (float), specularEnabled (bool)
    buf += struct.pack("<fB", data.grayscale_to_palette_scale_value, int(data.specular_enabled))

    # specularColor (3 floats), specularMult, smoothness, fresnelPower
    r, g, b = data.specular_color
    buf += struct.pack("<ffffffff",
                       r, g, b,
                       data.specular_mult,
                       data.smoothness,
                       data.fresnel_power,
                       data.wetness_control_env_map_scale_value,
                       data.wetness_control_fresnel_power)
    buf += struct.pack("<f", data.wetness_control_metalness)

    # rootMaterialPath (NiString)
    buf += _write_nistring(data.root_material_path)

    # anisoLighting, emitEnabled
    buf += struct.pack("<BB", int(data.aniso_lighting), int(data.emit_enabled))

    # emittanceColor (3 floats), emittanceMult
    r, g, b = data.emittance_color
    buf += struct.pack("<ffff", r, g, b, data.emittance_mult)

    # Boolean flags (each 1 byte)
    flags2 = [
        data.model_space_normals,
        data.external_emittance,
        data.back_lighting,
        data.receive_shadows,
        data.hide_secret,
        data.cast_shadows,
        data.dissolve_fade,
        data.assume_shadowmask,
        data.glowmap,
        data.env_mapping_window,
        data.env_mapping_eye,
        data.hair,
    ]
    buf += bytes([int(b) for b in flags2])

    # hairTintColor (3 floats)
    r, g, b = data.hair_tint_color
    buf += struct.pack("<fff", r, g, b)

    # More boolean flags
    flags3 = [data.tree, data.facegen, data.skin_tint, data.tessellate]
    buf += bytes([int(b) for b in flags3])

    # Tessellation/displacement floats
    buf += struct.pack(
        "<fffff",
        data.displacement_tex_bias,
        data.displacement_tex_scale,
        data.tessellation_pn_scale,
        data.tessellation_base_factor,
        data.tessellation_fade_distance,
    )

    # PBR / translucency
    buf += struct.pack(
        "<BBBB",
        int(data.pbr),
        int(data.translucency),
        int(data.translucency_thick_object),
        int(data.translucency_mix_albedo_with_subsurface),
    )
    r, g, b = data.translucency_subsurface_color
    buf += struct.pack("<fffff",
                       r, g, b,
                       data.translucency_transmissive_scale,
                       data.translucency_turbulence)

    # customPorosity, porosityValue
    buf += struct.pack("<Bf", int(data.custom_porosity), data.porosity_value)

    # envmapMaskTexture (NiString)
    buf += _write_nistring(data.envmap_mask_texture)

    return bytes(buf)


def _unpack_common(buf: bytes, offset: int) -> tuple[_CommonData, int]:
    """Deserialise the common header fields from *buf* starting at *offset*."""
    data = _CommonData()

    # tileFlags, tileU, tileV, offsetU, offsetV, alpha
    (tile_flags, tile_u_val, tile_v_val,
     data.offset_u, data.offset_v, data.alpha) = struct.unpack_from("<Ifffff", buf, offset)
    offset += 24

    data.tile_u = bool(tile_flags & _TILE_U)
    data.tile_v = bool(tile_flags & _TILE_V)

    # alphaBlendMode, alphaTestRef, alphaTest
    data.alpha_blend_mode, data.alpha_test_ref, alpha_test = struct.unpack_from("<BIB", buf, offset)
    data.alpha_test = bool(alpha_test)
    offset += 6

    # z-buffer and misc bool flags
    def _rb(n: int) -> tuple:
        vals = struct.unpack_from(f"{n}B", buf, offset)
        return vals

    (zw, zt, ssr, wc_sss, wc_h, wc_ssspec, wc_sp, wc_si, wc_ems,
     g2pc, g2ps) = struct.unpack_from("<11B", buf, offset)
    offset += 11
    data.z_buffer_write = bool(zw)
    data.z_buffer_test = bool(zt)
    data.screen_space_reflections = bool(ssr)
    data.wetness_control_screen_space_scale = bool(wc_sss)
    data.wetness_control_hemisphere = bool(wc_h)
    data.wetness_control_screen_space_specular = bool(wc_ssspec)
    data.wetness_control_specular_power = bool(wc_sp)
    data.wetness_control_specular_intensity = bool(wc_si)
    data.wetness_control_env_map_scale = bool(wc_ems)
    data.grayscale_to_palette_color = bool(g2pc)
    data.grayscale_to_palette_scale = bool(g2ps)

    # grayscaleToPaletteScaleValue, specularEnabled
    g2psv, spec_en = struct.unpack_from("<fB", buf, offset)
    data.grayscale_to_palette_scale_value = g2psv
    data.specular_enabled = bool(spec_en)
    offset += 5

    # specularColor, specularMult, smoothness, fresnelPower, wetness floats
    (sr, sg, sb, smult, smooth, fresnel,
     wc_em_scale, wc_fp, wc_metal) = struct.unpack_from("<fffffffff", buf, offset)
    data.specular_color = (sr, sg, sb)
    data.specular_mult = smult
    data.smoothness = smooth
    data.fresnel_power = fresnel
    data.wetness_control_env_map_scale_value = wc_em_scale
    data.wetness_control_fresnel_power = wc_fp
    data.wetness_control_metalness = wc_metal
    offset += 36

    # rootMaterialPath (NiString)
    data.root_material_path, offset = _read_nistring(buf, offset)

    # anisoLighting, emitEnabled
    aniso, emit = struct.unpack_from("<BB", buf, offset)
    data.aniso_lighting = bool(aniso)
    data.emit_enabled = bool(emit)
    offset += 2

    # emittanceColor, emittanceMult
    er, eg, eb, emult = struct.unpack_from("<ffff", buf, offset)
    data.emittance_color = (er, eg, eb)
    data.emittance_mult = emult
    offset += 16

    # Boolean flags block 2
    (msn, ext_em, back_l, recv_s, hide_s, cast_s, diss, assum,
     glow, env_w, env_e, hair) = struct.unpack_from("<12B", buf, offset)
    offset += 12
    data.model_space_normals = bool(msn)
    data.external_emittance = bool(ext_em)
    data.back_lighting = bool(back_l)
    data.receive_shadows = bool(recv_s)
    data.hide_secret = bool(hide_s)
    data.cast_shadows = bool(cast_s)
    data.dissolve_fade = bool(diss)
    data.assume_shadowmask = bool(assum)
    data.glowmap = bool(glow)
    data.env_mapping_window = bool(env_w)
    data.env_mapping_eye = bool(env_e)
    data.hair = bool(hair)

    # hairTintColor
    hr, hg, hb = struct.unpack_from("<fff", buf, offset)
    data.hair_tint_color = (hr, hg, hb)
    offset += 12

    # More boolean flags
    tree, facegen, skin_tint, tessellate = struct.unpack_from("<4B", buf, offset)
    offset += 4
    data.tree = bool(tree)
    data.facegen = bool(facegen)
    data.skin_tint = bool(skin_tint)
    data.tessellate = bool(tessellate)

    # Tessellation/displacement floats
    (data.displacement_tex_bias, data.displacement_tex_scale,
     data.tessellation_pn_scale, data.tessellation_base_factor,
     data.tessellation_fade_distance) = struct.unpack_from("<fffff", buf, offset)
    offset += 20

    # PBR / translucency
    pbr, trans, trans_thick, trans_mix = struct.unpack_from("<4B", buf, offset)
    offset += 4
    data.pbr = bool(pbr)
    data.translucency = bool(trans)
    data.translucency_thick_object = bool(trans_thick)
    data.translucency_mix_albedo_with_subsurface = bool(trans_mix)

    tr, tg, tb, trans_scale, trans_turb = struct.unpack_from("<fffff", buf, offset)
    data.translucency_subsurface_color = (tr, tg, tb)
    data.translucency_transmissive_scale = trans_scale
    data.translucency_turbulence = trans_turb
    offset += 20

    # customPorosity, porosityValue
    cp, pv = struct.unpack_from("<Bf", buf, offset)
    data.custom_porosity = bool(cp)
    data.porosity_value = pv
    offset += 5

    # envmapMaskTexture (NiString)
    data.envmap_mask_texture, offset = _read_nistring(buf, offset)

    return data, offset


# ---------------------------------------------------------------------------
# Public read/write API
# ---------------------------------------------------------------------------

def write_bgsm(data: BGSMData) -> bytes:
    """Serialise a :class:`BGSMData` to binary BGSM bytes."""
    buf = bytearray()
    buf += _BGSM_MAGIC
    buf += struct.pack("<I", _FO4_VERSION)
    buf += _pack_common(data)

    # BGSM-specific texture strings
    for tex in (
        data.diffuse_texture,
        data.normal_texture,
        data.smooth_spec_texture,
        data.greyscale_texture,
        data.glow_texture,
        data.inner_layer_texture,
        data.wrinkle_mask_texture,
        data.displacement_texture,
    ):
        buf += _write_nistring(tex)

    # Shader flags
    buf += struct.pack("<II", data.shader_flags1, data.shader_flags2)
    return bytes(buf)


def read_bgsm(raw: bytes) -> BGSMData:
    """Parse binary BGSM bytes into a :class:`BGSMData`.

    Raises :class:`ValueError` if the magic or version is wrong.
    """
    if len(raw) < 8:
        raise ValueError("File too short to be a valid BGSM")
    magic = raw[:4]
    if magic != _BGSM_MAGIC:
        raise ValueError(f"Bad BGSM magic: expected {_BGSM_MAGIC!r}, got {magic!r}")
    version = struct.unpack_from("<I", raw, 4)[0]
    if version != _FO4_VERSION:
        raise ValueError(f"Unsupported BGSM version {version} (expected {_FO4_VERSION})")

    common, offset = _unpack_common(raw, 8)
    data = BGSMData(**{k: v for k, v in common.__dict__.items()})

    # Texture strings
    data.diffuse_texture, offset = _read_nistring(raw, offset)
    data.normal_texture, offset = _read_nistring(raw, offset)
    data.smooth_spec_texture, offset = _read_nistring(raw, offset)
    data.greyscale_texture, offset = _read_nistring(raw, offset)
    data.glow_texture, offset = _read_nistring(raw, offset)
    data.inner_layer_texture, offset = _read_nistring(raw, offset)
    data.wrinkle_mask_texture, offset = _read_nistring(raw, offset)
    data.displacement_texture, offset = _read_nistring(raw, offset)

    if offset + 8 <= len(raw):
        data.shader_flags1, data.shader_flags2 = struct.unpack_from("<II", raw, offset)

    return data


def write_bgem(data: BGEMData) -> bytes:
    """Serialise a :class:`BGEMData` to binary BGEM bytes."""
    buf = bytearray()
    buf += _BGEM_MAGIC
    buf += struct.pack("<I", _FO4_VERSION)
    buf += _pack_common(data)

    # BGEM-specific texture strings
    for tex in (
        data.base_texture,
        data.grayscale_texture,
        data.env_map_texture,
        data.normal_texture,
        data.env_map_mask_texture,
    ):
        buf += _write_nistring(tex)

    # BGEM boolean flags
    buf += struct.pack(
        "<6B",
        int(data.blood_enabled),
        int(data.effect_lighting_enabled),
        int(data.falloff_enabled),
        int(data.falloff_color_enabled),
        int(data.grayscale_to_palette_alpha),
        int(data.soft_enabled),
    )

    # baseColor, baseColorScale
    r, g, b = data.base_color
    buf += struct.pack("<ffff", r, g, b, data.base_color_scale)

    # Falloff angles/opacities
    buf += struct.pack(
        "<fffff",
        data.falloff_start_angle,
        data.falloff_stop_angle,
        data.falloff_start_opacity,
        data.falloff_stop_opacity,
        data.lighting_influence,
    )
    buf += struct.pack("<B", data.env_map_min_lod)
    buf += struct.pack("<f", data.soft_depth)
    return bytes(buf)


def read_bgem(raw: bytes) -> BGEMData:
    """Parse binary BGEM bytes into a :class:`BGEMData`.

    Raises :class:`ValueError` if the magic or version is wrong.
    """
    if len(raw) < 8:
        raise ValueError("File too short to be a valid BGEM")
    magic = raw[:4]
    if magic != _BGEM_MAGIC:
        raise ValueError(f"Bad BGEM magic: expected {_BGEM_MAGIC!r}, got {magic!r}")
    version = struct.unpack_from("<I", raw, 4)[0]
    if version != _FO4_VERSION:
        raise ValueError(f"Unsupported BGEM version {version} (expected {_FO4_VERSION})")

    common, offset = _unpack_common(raw, 8)
    data = BGEMData(**{k: v for k, v in common.__dict__.items()})

    data.base_texture, offset = _read_nistring(raw, offset)
    data.grayscale_texture, offset = _read_nistring(raw, offset)
    data.env_map_texture, offset = _read_nistring(raw, offset)
    data.normal_texture, offset = _read_nistring(raw, offset)
    data.env_map_mask_texture, offset = _read_nistring(raw, offset)

    if offset + 6 <= len(raw):
        flags = struct.unpack_from("<6B", raw, offset)
        offset += 6
        (data.blood_enabled, data.effect_lighting_enabled,
         data.falloff_enabled, data.falloff_color_enabled,
         data.grayscale_to_palette_alpha, data.soft_enabled) = [bool(f) for f in flags]

    if offset + 20 <= len(raw):
        br, bg, bb, bcs = struct.unpack_from("<ffff", raw, offset)
        data.base_color = (br, bg, bb)
        data.base_color_scale = bcs
        offset += 16

    if offset + 21 <= len(raw):
        (data.falloff_start_angle, data.falloff_stop_angle,
         data.falloff_start_opacity, data.falloff_stop_opacity,
         data.lighting_influence) = struct.unpack_from("<fffff", raw, offset)
        offset += 20
        data.env_map_min_lod = struct.unpack_from("<B", raw, offset)[0]
        offset += 1

    if offset + 4 <= len(raw):
        data.soft_depth = struct.unpack_from("<f", raw, offset)[0]

    return data


# ---------------------------------------------------------------------------
# Blender material ↔ BGSM conversion
# ---------------------------------------------------------------------------

def _get_image_node_path(mat, node_name: str) -> str:
    """Return the filepath of the image node named *node_name* in *mat*.

    The path is normalised to use backslashes and is relative to ``Data/``
    (the FO4 convention), e.g. ``textures\\clutter\\desk\\desk01_d.dds``.
    If the node does not exist or has no image, returns an empty string.
    """
    if mat is None or not mat.use_nodes:
        return ""
    node = mat.node_tree.nodes.get(node_name)
    if node is None or node.type != 'TEX_IMAGE' or node.image is None:
        return ""
    raw = node.image.filepath or node.image.name
    # Normalise to Data/-relative backslash path
    raw = raw.replace("/", "\\")
    # Strip leading separators and absolute path components up to "Data"
    lower = raw.lower()
    data_idx = lower.find("\\data\\")
    if data_idx >= 0:
        raw = raw[data_idx + 6:]  # strip everything up to and including \Data\
    elif raw.startswith("\\"):
        raw = raw.lstrip("\\")
    return raw


def blender_mat_to_bgsm(mat) -> BGSMData:
    """Extract BGSM fields from a Blender material.

    Reads Principled BSDF settings and image nodes named "Diffuse",
    "Normal", "Specular", "Glow", and "EnvMap".  Falls back gracefully
    when nodes are absent.

    Returns a :class:`BGSMData` ready to be written with :func:`write_bgsm`.
    """
    data = BGSMData()
    if mat is None:
        return data

    data.diffuse_texture = _get_image_node_path(mat, "Diffuse")
    data.normal_texture = _get_image_node_path(mat, "Normal")
    data.smooth_spec_texture = _get_image_node_path(mat, "Specular")
    data.greyscale_texture = _get_image_node_path(mat, "Glow")
    data.envmap_mask_texture = _get_image_node_path(mat, "EnvMap")

    # When a Glow (_g) texture is assigned, auto-enable the emission / glow-map
    # flags so the BGSM always exports with the correct shader settings.
    # The greyscale_texture slot holds the _g.dds path; we also populate the
    # dedicated glow_texture override slot so both fields reference the same map.
    if data.greyscale_texture:
        data.glow_texture = data.greyscale_texture
        data.glowmap = True
        data.emit_enabled = True
        data.shader_flags1 |= SF1_EMIT_ENABLED
        data.shader_flags2 |= SF2_GLOW_MAP

    # Two-sided flag
    two_sided = not mat.use_backface_culling
    if two_sided:
        data.shader_flags2 |= SF2_DOUBLE_SIDED
    else:
        data.shader_flags2 &= ~SF2_DOUBLE_SIDED

    # Alpha settings
    if mat.blend_method == 'CLIP':
        data.alpha_test = True
        data.alpha_test_ref = int((mat.alpha_threshold or 0.5) * 255)
        data.alpha_blend_mode = ALPHA_BLEND_NONE
    elif mat.blend_method == 'BLEND':
        data.alpha_test = False
        data.alpha_blend_mode = ALPHA_BLEND_STANDARD
    else:
        data.alpha_test = False
        data.alpha_blend_mode = ALPHA_BLEND_NONE

    # Principled BSDF settings
    pbsdf = None
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                pbsdf = node
                break

    if pbsdf is not None:
        # Alpha from Principled BSDF Alpha socket
        alpha_sock = pbsdf.inputs.get("Alpha")
        if alpha_sock and not alpha_sock.is_linked:
            data.alpha = float(alpha_sock.default_value)

        # Roughness → Glossiness  (Glossiness = (1 - roughness) * 255)
        rough_sock = pbsdf.inputs.get("Roughness")
        if rough_sock and not rough_sock.is_linked:
            roughness = float(rough_sock.default_value)
            data.smoothness = max(0.0, min(255.0, (1.0 - roughness) * 255.0))

        # Specular (Base Color used as specular hint when metallic > 0)
        metallic_sock = pbsdf.inputs.get("Metallic")
        spec_sock = pbsdf.inputs.get("Specular IOR Level") or pbsdf.inputs.get("Specular")
        if metallic_sock and not metallic_sock.is_linked:
            metallic = float(metallic_sock.default_value)
            if metallic > 0.5:
                base_sock = pbsdf.inputs.get("Base Color")
                if base_sock and not base_sock.is_linked:
                    col = base_sock.default_value
                    data.specular_color = (
                        float(col[0]), float(col[1]), float(col[2])
                    )
                data.specular_mult = metallic

        # Emission
        emit_sock = pbsdf.inputs.get("Emission Strength")
        if emit_sock and not emit_sock.is_linked and float(emit_sock.default_value) > 0.0:
            data.emit_enabled = True
            data.glowmap = True
            data.shader_flags1 |= SF1_EMIT_ENABLED
            emit_col_sock = pbsdf.inputs.get("Emission Color") or pbsdf.inputs.get("Emission")
            if emit_col_sock and not emit_col_sock.is_linked:
                ec = emit_col_sock.default_value
                data.emittance_color = (float(ec[0]), float(ec[1]), float(ec[2]))
            data.emittance_mult = float(emit_sock.default_value)

    # Inherit fo4_shader custom property from material or object
    fo4_shader = getattr(mat, "fo4_shader", None) or mat.get("fo4_material_preset", "")
    if fo4_shader:
        _apply_shader_hints(data, str(fo4_shader))

    return data


def _apply_shader_hints(data: BGSMData, hint: str) -> None:
    """Apply FO4-specific shader flag hints based on preset ID."""
    hint_lower = hint.lower()
    if "skin" in hint_lower:
        data.skin_tint = True
        data.shader_flags1 |= SF1_SKIN_TINT
    if "hair" in hint_lower:
        data.hair = True
        data.shader_flags1 |= SF1_HAIR
    if "glowmap" in hint_lower or "glow" in hint_lower:
        data.glowmap = True
        data.emit_enabled = True
        data.shader_flags1 |= SF1_EMIT_ENABLED
    if "env" in hint_lower or "environment" in hint_lower:
        data.shader_flags1 |= SF1_ENVIRONMENT_MAPPING
    if "parallax" in hint_lower:
        data.shader_flags1 |= SF1_PARALLAX
    if "multilayer" in hint_lower:
        data.shader_flags2 |= SF2_MULTI_LAYER_PARALLAX
    if "eye" in hint_lower:
        data.env_mapping_eye = True
        data.shader_flags1 |= SF1_EYE_ENVIRONMENT_MAPPING
    if "tree" in hint_lower:
        data.tree = True
        data.shader_flags1 |= SF1_TREE
    if "facegen" in hint_lower or "face" in hint_lower:
        data.facegen = True
    if "two_sided" in hint_lower or "foliage" in hint_lower or "vegetation" in hint_lower:
        data.shader_flags2 |= SF2_DOUBLE_SIDED


def bgsm_to_blender_mat(data: BGSMData, mat) -> None:
    """Apply :class:`BGSMData` fields back to a Blender material.

    Creates/updates image nodes named "Diffuse", "Normal", "Specular",
    "Glow" in the material's node tree.  The material must already exist
    (create with ``bpy.data.materials.new("name")`` if needed).
    """
    if mat is None or bpy is None:
        return

    mat.use_nodes = True
    mat.use_backface_culling = not bool(data.shader_flags2 & SF2_DOUBLE_SIDED)

    # Alpha settings
    if data.alpha_test:
        mat.blend_method = 'CLIP'
        mat.alpha_threshold = data.alpha_test_ref / 255.0
    elif data.alpha_blend_mode == ALPHA_BLEND_STANDARD:
        mat.blend_method = 'BLEND'
    else:
        mat.blend_method = 'OPAQUE'

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Get or create Principled BSDF
    pbsdf = None
    for node in nodes:
        if node.type == 'BSDF_PRINCIPLED':
            pbsdf = node
            break
    if pbsdf is None:
        pbsdf = nodes.new('ShaderNodeBsdfPrincipled')
        pbsdf.location = (0, 300)

    # Roughness from Glossiness
    roughness = max(0.0, min(1.0, 1.0 - (data.smoothness / 255.0)))
    if pbsdf.inputs.get("Roughness"):
        pbsdf.inputs["Roughness"].default_value = roughness

    # Alpha
    if pbsdf.inputs.get("Alpha"):
        pbsdf.inputs["Alpha"].default_value = data.alpha

    # Specular
    if pbsdf.inputs.get("Specular IOR Level"):
        pbsdf.inputs["Specular IOR Level"].default_value = min(1.0, data.specular_mult)
    elif pbsdf.inputs.get("Specular"):
        pbsdf.inputs["Specular"].default_value = min(1.0, data.specular_mult)

    # Emission
    if data.emit_enabled:
        if pbsdf.inputs.get("Emission Strength"):
            pbsdf.inputs["Emission Strength"].default_value = data.emittance_mult
        if pbsdf.inputs.get("Emission Color"):
            pbsdf.inputs["Emission Color"].default_value = (
                *data.emittance_color, 1.0
            )
        elif pbsdf.inputs.get("Emission"):
            pbsdf.inputs["Emission"].default_value = (
                *data.emittance_color, 1.0
            )

    # Create texture image nodes
    _x = -600
    _y_map = {
        "Diffuse":  400,
        "Normal":   200,
        "Specular":   0,
        "Glow":    -200,
        "EnvMap":  -400,
    }
    _tex_map = {
        "Diffuse":  data.diffuse_texture,
        "Normal":   data.normal_texture,
        "Specular": data.smooth_spec_texture,
        "Glow":     data.greyscale_texture,
        "EnvMap":   data.envmap_mask_texture,
    }
    for node_name, tex_path in _tex_map.items():
        if not tex_path:
            continue
        existing = nodes.get(node_name)
        if existing is None:
            existing = nodes.new('ShaderNodeTexImage')
            existing.name = node_name
            existing.label = node_name
            existing.location = (_x, _y_map.get(node_name, 0))

        # Try to load the image if it exists on disk
        try:
            abs_path = bpy.path.abspath("//" + tex_path.replace("\\", "/"))
            if os.path.isfile(abs_path):
                img = bpy.data.images.load(abs_path, check_existing=True)
                existing.image = img
        except Exception:
            pass


# ---------------------------------------------------------------------------
# High-level export/import helpers
# ---------------------------------------------------------------------------

def _bgsm_output_path(obj, output_dir: str, mat_name: str) -> str:
    """Return the output .bgsm file path for a given object/material name."""
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in mat_name)
    return os.path.join(output_dir, safe_name + ".bgsm")


def export_bgsm_for_object(
    obj,
    output_dir: str,
    *,
    all_slots: bool = True,
) -> list[tuple[bool, str]]:
    """Export BGSM files for all material slots on *obj*.

    Args:
        obj:        Blender mesh object.
        output_dir: Directory to write ``.bgsm`` files into.
        all_slots:  If True, export every material slot.  If False, only
                    the material in the active slot.

    Returns a list of ``(success, message)`` pairs, one per material.
    """
    if obj is None or obj.type != 'MESH':
        return [(False, "No mesh object provided")]
    if not obj.data.materials:
        return [(False, f"'{obj.name}' has no material slots")]

    os.makedirs(output_dir, exist_ok=True)

    slots = obj.data.materials if all_slots else [obj.active_material]
    results = []
    for mat in slots:
        if mat is None:
            results.append((False, "Empty material slot skipped"))
            continue
        try:
            bgsm_data = blender_mat_to_bgsm(mat)
            out_path = _bgsm_output_path(obj, output_dir, mat.name)
            raw = write_bgsm(bgsm_data)
            with open(out_path, "wb") as fh:
                fh.write(raw)
            results.append((True, f"Exported '{mat.name}' → {out_path}"))
        except Exception as exc:
            results.append((False, f"Failed to export '{mat.name}': {exc}"))

    return results


def import_bgsm_for_object(obj, bgsm_path: str) -> tuple[bool, str]:
    """Import a ``.bgsm`` file and apply it to *obj*'s active material.

    If the object has no material slots, a new material is created.
    """
    if obj is None or obj.type != 'MESH':
        return False, "No mesh object provided"
    if not os.path.isfile(bgsm_path):
        return False, f"File not found: {bgsm_path}"

    try:
        with open(bgsm_path, "rb") as fh:
            raw = fh.read()
    except OSError as exc:
        return False, f"Could not read {bgsm_path}: {exc}"

    # Detect BGSM vs BGEM
    magic = raw[:4]
    if magic == _BGSM_MAGIC:
        try:
            data = read_bgsm(raw)
        except ValueError as exc:
            return False, str(exc)
        mat_name = Path(bgsm_path).stem
        if bpy is not None:
            mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
            if not obj.data.materials:
                obj.data.materials.append(mat)
            else:
                obj.active_material = mat
            bgsm_to_blender_mat(data, mat)
        return True, f"Imported '{mat_name}' from {bgsm_path}"
    elif magic == _BGEM_MAGIC:
        return False, (
            "BGEM effect material files are not supported for direct Blender import "
            "(they use a particle/effect shader with no Principled BSDF equivalent). "
            "Use the Creation Kit Material Editor to assign a BGEM."
        )
    else:
        return False, f"Not a valid BGSM/BGEM file: {bgsm_path}"


# ---------------------------------------------------------------------------
# Module registration (required by Blender add-on framework)
# ---------------------------------------------------------------------------

def register():
    """Register bgsm_helpers (no Blender classes to register)."""
    pass


def unregister():
    """Unregister bgsm_helpers."""
    pass
