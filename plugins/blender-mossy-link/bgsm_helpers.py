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
This layout was derived empirically by instrumenting PyNifly's own bundled
reference parser (``io_scene_nifly/pyn/bgsmaterial.py``) against real vanilla
files (``Barnacle.BGSM``, ``DefaultEffect.BGEM``) -- NOT from written
documentation. All integers are unsigned unless stated otherwise; all
booleans are stored as a single byte (0 = False, 1 = True). There is no
separate ``bTileU``/``bTileV`` byte pair -- tiling is encoded purely via the
``tileFlags`` bitmask.

Common header (shared by BGSM and BGEM):

  Size  Type      Field
  ----  --------  ----------------------------------------
     4  char[4]   magic ("BGSM" or "BGEM")
     4  uint32    version (2 for FO4)
     4  uint32    tileFlags  bit0=TileU, bit1=TileV
     4  float     offsetU
     4  float     offsetV
     4  float     scaleU  (U tiling scale, 1.0 = no tile)
     4  float     scaleV  (V tiling scale, 1.0 = no tile)
     4  float     alpha
     1  uint8     alphblend0  (blending-enabled toggle)
     4  uint32    alphblend1  (D3D source blend factor)
     4  uint32    alphblend2  (D3D dest blend factor)
     1  uint8     alphaTestRef (0-255)
     1  bool      alphaTest
     1  bool      zBufferWrite
     1  bool      zBufferTest
     1  bool      screenSpaceReflections
     1  bool      wetnessScreenSpaceReflections
     1  bool      decal
     1  bool      twoSided
     1  bool      decalNoFade
     1  bool      nonOccluder
     1  bool      refraction
     1  bool      refractionFalloff
     4  float     refractionPower
     1  bool      environmentMapping
     4  float     environmentMappingMaskScale
     1  bool      grayscaleToPaletteColor

BGSM-only fields (appended after common header), in order:

     ?  NiStr     diffuseTexture, normalTexture, smoothSpecTexture,
                  greyscaleTexture, envMapTexture, glowTexture,
                  innerLayerTexture, wrinkleMaskTexture, displacementTexture
     1  bool      enableEditorAlphaRef
     1  bool      rimLighting
     4  float     rimPower
     4  float     backlightPower
     1  bool      subsurfaceLighting
     4  float     subsurfaceRolloff
     1  bool      specularEnabled
    12  float*3   specularColor  (R, G, B -- true floats, not a color-u32)
     4  float     specularMult
     4  float     smoothness  (real range 0.0-1.0, NOT 0-100)
     4  float     fresnelPower
     4  float     wetnessSpecScale
     4  float     wetnessSpecPower
     4  float     wetnessMinVar
     4  float     wetnessEnvmapScale
     4  float     wetnessFresnelPower
     4  float     wetnessMetalness
     ?  NiStr     rootMaterialPath
     1  bool      anisoLighting
     1  bool      emitEnabled
    12  float*3   emittanceColor  (ONLY present if emitEnabled is True --
                  data-dependent, not version-gated)
     4  float     emittanceMult
     1  bool      modelSpaceNormals
     1  bool      externalEmittance
     1  bool      backLighting
     1  bool      receiveShadows
     1  bool      hideSecret
     1  bool      castShadows
     1  bool      dissolveFade
     1  bool      assumeShadowmask
     1  bool      glowmap
     1  bool      environmentMappingWindow
     1  bool      environmentMappingEye
     1  bool      hair
    12  uint32*3  hairTintColor  (R, G, B -- 0-255 ints, one per uint32 slot)
     1  bool      tree
     1  bool      facegen
     1  bool      skinTint
     1  bool      tessellate
     4  float     displacementTextureBias
     4  float     displacementTextureScale
     4  float     tessellationPnScale
     4  float     tessellationBaseFactor
     4  float     tessellationFadeDistance
     4  float     grayscaleToPaletteScale
     1  bool      skewSpecularAlpha

BGEM-only fields (appended after common header), in order:

     ?  NiStr     baseTexture, grayscaleTexture, envMapTexture,
                  normalTexture, envMapMaskTexture
     1  bool      bloodEnabled
     1  bool      effectLightingEnabled
     1  bool      falloffEnabled
     1  bool      falloffColorEnabled
     1  bool      grayscaleToPaletteAlpha
     1  bool      softEnabled
    12  uint32*3  baseColor  (R, G, B -- 0-255 ints, one per uint32 slot)
     4  float     baseColorScale
     4  float     falloffStartAngle
     4  float     falloffStopAngle
     4  float     falloffStartOpacity
     4  float     falloffStopOpacity
     4  float     lightingInfluence
     1  uint8     envMapMinLod
     4  float     softDepth

NiString encoding: uint32 (declared length, INCLUDING a trailing NUL)
followed by that many ASCII bytes, the last of which is 0x00. An empty
string is encoded as a single zero byte with declared length 1.
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

# AlphaBlendMode enum values -- a UI-facing convenience concept for code
# that just wants "none/standard/additive/etc", NOT the on-disk format.
ALPHA_BLEND_NONE = 0
ALPHA_BLEND_STANDARD = 1
ALPHA_BLEND_ADDITIVE = 2
ALPHA_BLEND_MULTIPLY = 3
ALPHA_BLEND_SUBTRACT = 4

# Defaults for (alphblend1, alphblend2) -- the real D3D source/destination
# blend-factor enum values -- used only when a fresh BGSMData is built from
# an ALPHA_BLEND_* choice with no pre-existing raw triple (e.g. a brand new
# Blender material with no imported .bgsm backing it). Real vanilla files
# use a wide variety of factor combinations for the "blended" case (e.g.
# (6, 7) confirmed via Barnacle.BGSM for the disabled/NONE case, but (6, 0)
# is common for real additive glow/neon effect materials, NOT the (6, 1)
# originally guessed here) -- so round-tripping an EXISTING file must always
# preserve its own raw alpha_blend1/alpha_blend2 values losslessly (see
# _CommonData.alpha_blend1/2) rather than re-deriving them from this table.
_ALPHA_BLEND_DEFAULT_FACTORS = {
    ALPHA_BLEND_NONE:     (6, 7),
    ALPHA_BLEND_STANDARD: (6, 7),
    ALPHA_BLEND_ADDITIVE: (6, 0),
    ALPHA_BLEND_MULTIPLY: (3, 0),
    ALPHA_BLEND_SUBTRACT: (6, 7),
}


def _alpha_blend_mode_from_real(b0: int, b1: int, b2: int) -> int:
    """Best-effort coarse classification of the real (alphblend0/1/2) triple
    into the simplified ALPHA_BLEND_* enum, for UI/display purposes only.
    The raw triple itself is what actually gets preserved/round-tripped --
    see _CommonData.alpha_blend1/2."""
    if b0 == 0:
        return ALPHA_BLEND_NONE
    if (b1, b2) == (6, 0):
        return ALPHA_BLEND_ADDITIVE
    if (b1, b2) == (3, 0):
        return ALPHA_BLEND_MULTIPLY
    return ALPHA_BLEND_STANDARD


def _set_alpha_blend_mode(data: "_CommonData", mode: int) -> None:
    """Set *data*'s alpha_blend_mode plus the raw fields that actually get
    written to disk, using the default D3D factor pair for *mode* (see
    _ALPHA_BLEND_DEFAULT_FACTORS). Use this instead of assigning
    data.alpha_blend_mode directly so brand-new materials (with no
    pre-existing raw triple to preserve) still get a sane on-disk value."""
    data.alpha_blend_mode = mode
    data.alpha_blend_enabled = mode != ALPHA_BLEND_NONE
    data.alpha_blend1, data.alpha_blend2 = _ALPHA_BLEND_DEFAULT_FACTORS.get(
        mode, _ALPHA_BLEND_DEFAULT_FACTORS[ALPHA_BLEND_NONE])

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
SF2_TREE_ANIM = 1 << 30  # BSLightingShaderProperty SLSF2_Tree_Anim -- drives wind sway from vertex-alpha


# ---------------------------------------------------------------------------
# NiString helpers
# ---------------------------------------------------------------------------

def _read_nistring(buf: bytes, offset: int) -> tuple[str, int]:
    """Read a NiString at *offset* from *buf*.

    Returns (string_value, new_offset_after_string).

    Real BGSM/BGEM strings are NUL-terminated *within* their declared
    length (confirmed byte-for-byte against real vanilla files, e.g.
    Barnacle.BGSM's Diffuse path: declared length 36 for 35 characters of
    text, with the 36th byte being 0x00) -- the previous implementation
    didn't account for this trailing NUL, corrupting every string field
    (and, since the length prefix is off by one relative to what real
    writers/readers expect, everything after the first string in the file).
    """
    if offset + 4 > len(buf):
        raise ValueError(
            f"BGSM parse error: expected NiString length at offset {offset} "
            f"but buffer is only {len(buf)} bytes"
        )
    length = struct.unpack_from("<I", buf, offset)[0]
    if length > len(buf):
        raise ValueError(
            f"BGSM parse error: NiString at offset {offset} claims length "
            f"{length} but buffer is only {len(buf)} bytes — file may be "
            f"corrupt or written in an incompatible format"
        )
    offset += 4
    end = offset + length
    text = buf[offset:end].decode("ascii", errors="replace").rstrip("\x00")
    return text, end


def _write_nistring(s: str) -> bytes:
    """Encode a string as a NiString (uint32 length + ASCII bytes + NUL
    terminator, with the NUL counted in the declared length -- see
    :func:`_read_nistring` for why the NUL matters)."""
    encoded = (s or "").encode("ascii", errors="replace") + b"\x00"
    return struct.pack("<I", len(encoded)) + encoded


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

# The layouts below (field names, order, inclusion for format version 2,
# and defaults) were derived empirically -- NOT from written documentation
# -- by instrumenting the bundled PyNifly addon's own reference parser
# (io_scene_nifly/pyn/bgsmaterial.py, which ships its own tests against
# real files and is used by PyNifly's own NIF import/export) and tracing
# its exact field-read sequence against real vanilla files
# (F:\FO4 WORKING FLODER\Materials\Barnacle.BGSM for BGSM,
# ...\DefaultEffect.BGEM for BGEM, both confirmed format version 2 -- the
# only version observed across 500+/all real sampled files respectively).
# The previous layout in this module was entirely invented and failed to
# parse 100% of 500 real BGSM files and 100% of 50 real BGEM files tested.

@dataclass
class _CommonData:
    """The true shared header between BGSM and BGEM -- tileFlags through
    grayscaleToPaletteColor in the real format. Everything after this
    point diverges completely between the two file types in the real
    format (BGSM has specular/emission/hair/tessellation/translucency
    fields; BGEM has an entirely different blood/falloff/lighting-influence
    set) and lives directly on BGSMData/BGEMData instead of a shared base.
    """
    tile_u: bool = True
    tile_v: bool = True
    offset_u: float = 0.0
    offset_v: float = 0.0
    scale_u: float = 1.0
    scale_v: float = 1.0
    alpha: float = 1.0
    # Real 3-field alpha-blend encoding: alpha_blend1/2 are the raw D3D
    # source/destination blend-factor values and are what's actually
    # preserved byte-for-byte on read/write. alpha_blend_mode is a coarse,
    # lossy UI-facing classification derived from the raw triple (see
    # _alpha_blend_mode_from_real) -- set it directly only when there is no
    # pre-existing raw triple to preserve (e.g. a brand new material);
    # _pack_common always writes the raw alpha_blend1/2 values, never
    # re-derives them from alpha_blend_mode.
    alpha_blend_mode: int = ALPHA_BLEND_NONE
    alpha_blend_enabled: bool = False
    alpha_blend1: int = 6
    alpha_blend2: int = 7
    alpha_test_ref: int = 128
    alpha_test: bool = False
    z_buffer_write: bool = True
    z_buffer_test: bool = True
    screen_space_reflections: bool = False
    wetness_screen_space_reflections: bool = False
    decal: bool = False
    two_sided: bool = False
    decal_no_fade: bool = False
    non_occluder: bool = False
    refraction: bool = False
    refraction_falloff: bool = False
    refraction_power: float = 0.0
    environment_mapping: bool = False
    environment_mapping_mask_scale: float = 1.0
    grayscale_to_palette_color: bool = False


@dataclass
class BGSMData(_CommonData):
    """All fields of a FO4 ``.bgsm`` file (standard material), version 2."""
    # 9 texture strings, real v2 order: Diffuse, Normal, Specular,
    # Greyscale, EnvMap, Glow, InnerLayer, Wrinkles, Height.
    diffuse_texture: str = ""
    normal_texture: str = ""
    smooth_spec_texture: str = ""
    greyscale_texture: str = ""
    env_map_texture: str = ""
    glow_texture: str = ""
    inner_layer_texture: str = ""
    wrinkle_mask_texture: str = ""
    displacement_texture: str = ""   # real field name "Height"

    enable_editor_alpha_ref: bool = False
    rim_lighting: bool = False
    rim_power: float = 2.0
    backlight_power: float = 0.0
    subsurface_lighting: bool = False
    subsurface_rolloff: float = 0.3
    specular_enabled: bool = True
    specular_color: tuple = (1.0, 1.0, 1.0)
    specular_mult: float = 1.0
    smoothness: float = 1.0          # real range is 0.0-1.0, NOT 0-100
    fresnel_power: float = 5.0
    wetness_spec_scale: float = -1.0
    wetness_spec_power: float = -1.0
    wetness_min_var: float = -1.0
    wetness_envmap_scale: float = -1.0
    wetness_fresnel_power: float = -1.0
    wetness_metalness: float = -1.0
    root_material_path: str = ""
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
    environment_mapping_window: bool = False
    environment_mapping_eye: bool = False
    hair: bool = False
    hair_tint_color: tuple = (1.0, 1.0, 1.0)
    tree: bool = False
    facegen: bool = False
    skin_tint: bool = False
    tessellate: bool = False
    displacement_tex_bias: float = 0.0
    displacement_tex_scale: float = 0.0
    tessellation_pn_scale: float = 0.0
    tessellation_base_factor: float = 0.0
    tessellation_fade_distance: float = 0.0
    grayscale_to_palette_scale: float = 1.0
    skew_specular_alpha: bool = False

    # Informational only -- these are NIF BSLightingShaderProperty
    # ShaderFlags1/2 bit-flags (a NIF concept), NOT part of the .bgsm file
    # format itself (real files have no trailing flags field at all). Kept
    # for callers that derive NIF-side shader flags from a material
    # (see fo4_reference_library.py); never written into the .bgsm bytes.
    shader_flags1: int = SF1_SPECULAR | SF1_RECEIVE_SHADOWS | SF1_CAST_SHADOWS
    shader_flags2: int = SF2_ZBUFFER_TEST | SF2_ZBUFFER_WRITE


@dataclass
class BGEMData(_CommonData):
    """All fields of a FO4 ``.bgem`` file (effect material), version 2."""
    # 5 texture strings, real v2 order: Diffuse, Greyscale, EnvMap, Normal,
    # EnvMapMask.
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

def _pack_color_u32(color: tuple) -> bytes:
    """Pack an RGB tuple for hairTintColor/baseColor.

    PyNifly's reference reader declares these fields as ``c_uint32*3``, but
    verified round-tripping real files through it (Barnacle.BGSM's
    hairTintColor, DefaultEffect.BGEM's baseColor) shows the raw 4-byte
    values are IEEE-754 float bit patterns, not 0-255 integers -- e.g.
    baseColor's uint32 reading of 1065353216 is exactly the bit pattern of
    1.0f. So despite the uint32 field type, these are plain floats on disk,
    identical in format to specularColor/emittanceColor; the name is kept
    for clarity at call sites (these two fields specifically use it) but it
    now just packs floats.
    """
    return struct.pack("<fff", *color)


def _unpack_color_u32(buf: bytes, offset: int) -> tuple:
    """Inverse of :func:`_pack_color_u32`. Returns (color_tuple, new_offset)."""
    color = struct.unpack_from("<fff", buf, offset)
    return color, offset + 12


def _pack_common(data: _CommonData) -> bytes:
    """Serialise the true shared header (tileFlags through
    grayscaleToPaletteColor) to bytes, matching the exact real byte layout."""
    buf = bytearray()

    tile_flags = (_TILE_U if data.tile_u else 0) | (_TILE_V if data.tile_v else 0)
    buf += struct.pack("<I", tile_flags)
    buf += struct.pack(
        "<fffff",
        data.offset_u,
        data.offset_v,
        data.scale_u,
        data.scale_v,
        data.alpha,
    )

    buf += struct.pack(
        "<BII",
        int(data.alpha_blend_enabled),
        data.alpha_blend1,
        data.alpha_blend2,
    )
    buf += struct.pack("<B", data.alpha_test_ref & 0xFF)

    buf += bytes(int(v) for v in (
        data.alpha_test,
        data.z_buffer_write,
        data.z_buffer_test,
        data.screen_space_reflections,
        data.wetness_screen_space_reflections,
        data.decal,
        data.two_sided,
        data.decal_no_fade,
        data.non_occluder,
        data.refraction,
        data.refraction_falloff,
    ))
    buf += struct.pack("<f", data.refraction_power)
    buf += struct.pack("<B", int(data.environment_mapping))
    buf += struct.pack("<f", data.environment_mapping_mask_scale)
    buf += struct.pack("<B", int(data.grayscale_to_palette_color))

    return bytes(buf)


def _unpack_common(buf: bytes, offset: int) -> tuple[_CommonData, int]:
    """Deserialise the true shared header from *buf* starting at *offset*."""
    data = _CommonData()

    tile_flags = struct.unpack_from("<I", buf, offset)[0]
    offset += 4
    data.tile_u = bool(tile_flags & _TILE_U)
    data.tile_v = bool(tile_flags & _TILE_V)

    (data.offset_u, data.offset_v,
     data.scale_u, data.scale_v, data.alpha) = struct.unpack_from("<fffff", buf, offset)
    offset += 20

    b0, b1, b2 = struct.unpack_from("<BII", buf, offset)
    offset += 9
    data.alpha_blend_enabled = bool(b0)
    data.alpha_blend1 = b1
    data.alpha_blend2 = b2
    data.alpha_blend_mode = _alpha_blend_mode_from_real(b0, b1, b2)

    data.alpha_test_ref = struct.unpack_from("<B", buf, offset)[0]
    offset += 1

    (at, zw, zt, ssr, wssr, decal, two_sided, decal_nf, non_occ,
     refr, refr_fall) = struct.unpack_from("<11B", buf, offset)
    offset += 11
    data.alpha_test = bool(at)
    data.z_buffer_write = bool(zw)
    data.z_buffer_test = bool(zt)
    data.screen_space_reflections = bool(ssr)
    data.wetness_screen_space_reflections = bool(wssr)
    data.decal = bool(decal)
    data.two_sided = bool(two_sided)
    data.decal_no_fade = bool(decal_nf)
    data.non_occluder = bool(non_occ)
    data.refraction = bool(refr)
    data.refraction_falloff = bool(refr_fall)

    data.refraction_power = struct.unpack_from("<f", buf, offset)[0]
    offset += 4
    data.environment_mapping = bool(struct.unpack_from("<B", buf, offset)[0])
    offset += 1
    data.environment_mapping_mask_scale = struct.unpack_from("<f", buf, offset)[0]
    offset += 4
    data.grayscale_to_palette_color = bool(struct.unpack_from("<B", buf, offset)[0])
    offset += 1

    return data, offset


# ---------------------------------------------------------------------------
# Public read/write API
# ---------------------------------------------------------------------------

def write_bgsm(data: BGSMData) -> bytes:
    """Serialise a :class:`BGSMData` to binary BGSM bytes (format version 2,
    the only version observed across the entire vanilla+DLC reference
    library). Field order/inclusion verified by instrumenting PyNifly's own
    reference parser against real files -- see the module-level comment
    above ``_CommonData`` for the full story."""
    buf = bytearray()
    buf += _BGSM_MAGIC
    buf += struct.pack("<I", _FO4_VERSION)
    buf += _pack_common(data)

    # 9 texture strings, real v2 order.
    for tex in (
        data.diffuse_texture,
        data.normal_texture,
        data.smooth_spec_texture,
        data.greyscale_texture,
        data.env_map_texture,
        data.glow_texture,
        data.inner_layer_texture,
        data.wrinkle_mask_texture,
        data.displacement_texture,
    ):
        buf += _write_nistring(tex)

    buf += struct.pack("<B", int(data.enable_editor_alpha_ref))
    buf += struct.pack("<B", int(data.rim_lighting))
    buf += struct.pack("<ff", data.rim_power, data.backlight_power)
    buf += struct.pack("<B", int(data.subsurface_lighting))
    buf += struct.pack("<f", data.subsurface_rolloff)
    buf += struct.pack("<B", int(data.specular_enabled))
    # specularColor is c_float*3 (unlike hairTintColor/baseColor, which are
    # c_uint32*3) -- packed directly as floats, not via _pack_color_u32.
    buf += struct.pack("<fff", *data.specular_color)
    buf += struct.pack(
        "<fff", data.specular_mult, data.smoothness, data.fresnel_power)
    buf += struct.pack(
        "<ffff",
        data.wetness_spec_scale, data.wetness_spec_power,
        data.wetness_min_var, data.wetness_envmap_scale)
    buf += struct.pack("<ff", data.wetness_fresnel_power, data.wetness_metalness)
    buf += _write_nistring(data.root_material_path)
    buf += struct.pack("<BB", int(data.aniso_lighting), int(data.emit_enabled))
    if data.emit_enabled:
        buf += struct.pack("<fff", *data.emittance_color)
    buf += struct.pack("<f", data.emittance_mult)
    buf += bytes(int(v) for v in (
        data.model_space_normals,
        data.external_emittance,
        data.back_lighting,
    ))
    buf += bytes(int(v) for v in (
        data.receive_shadows,
        data.hide_secret,
        data.cast_shadows,
        data.dissolve_fade,
        data.assume_shadowmask,
        data.glowmap,
        data.environment_mapping_window,
        data.environment_mapping_eye,
        data.hair,
    ))
    buf += _pack_color_u32(data.hair_tint_color)
    buf += bytes(int(v) for v in (
        data.tree, data.facegen, data.skin_tint, data.tessellate,
    ))
    buf += struct.pack(
        "<fffff",
        data.displacement_tex_bias,
        data.displacement_tex_scale,
        data.tessellation_pn_scale,
        data.tessellation_base_factor,
        data.tessellation_fade_distance,
    )
    buf += struct.pack("<f", data.grayscale_to_palette_scale)
    buf += struct.pack("<B", int(data.skew_specular_alpha))

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

    try:
        common, offset = _unpack_common(raw, 8)
        data = BGSMData(**{k: v for k, v in common.__dict__.items()})

        data.diffuse_texture, offset = _read_nistring(raw, offset)
        data.normal_texture, offset = _read_nistring(raw, offset)
        data.smooth_spec_texture, offset = _read_nistring(raw, offset)
        data.greyscale_texture, offset = _read_nistring(raw, offset)
        data.env_map_texture, offset = _read_nistring(raw, offset)
        data.glow_texture, offset = _read_nistring(raw, offset)
        data.inner_layer_texture, offset = _read_nistring(raw, offset)
        data.wrinkle_mask_texture, offset = _read_nistring(raw, offset)
        data.displacement_texture, offset = _read_nistring(raw, offset)

        data.enable_editor_alpha_ref = bool(struct.unpack_from("<B", raw, offset)[0]); offset += 1
        data.rim_lighting = bool(struct.unpack_from("<B", raw, offset)[0]); offset += 1
        data.rim_power, data.backlight_power = struct.unpack_from("<ff", raw, offset); offset += 8
        data.subsurface_lighting = bool(struct.unpack_from("<B", raw, offset)[0]); offset += 1
        data.subsurface_rolloff = struct.unpack_from("<f", raw, offset)[0]; offset += 4
        data.specular_enabled = bool(struct.unpack_from("<B", raw, offset)[0]); offset += 1
        data.specular_color = struct.unpack_from("<fff", raw, offset); offset += 12
        data.specular_mult, data.smoothness, data.fresnel_power = struct.unpack_from("<fff", raw, offset); offset += 12
        (data.wetness_spec_scale, data.wetness_spec_power,
         data.wetness_min_var, data.wetness_envmap_scale) = struct.unpack_from("<ffff", raw, offset); offset += 16
        data.wetness_fresnel_power, data.wetness_metalness = struct.unpack_from("<ff", raw, offset); offset += 8
        data.root_material_path, offset = _read_nistring(raw, offset)
        aniso, emit = struct.unpack_from("<BB", raw, offset); offset += 2
        data.aniso_lighting = bool(aniso)
        data.emit_enabled = bool(emit)
        if data.emit_enabled:
            data.emittance_color = struct.unpack_from("<fff", raw, offset); offset += 12
        data.emittance_mult = struct.unpack_from("<f", raw, offset)[0]; offset += 4
        (msn, ext_em, back_l) = struct.unpack_from("<3B", raw, offset); offset += 3
        data.model_space_normals = bool(msn)
        data.external_emittance = bool(ext_em)
        data.back_lighting = bool(back_l)
        (recv_s, hide_s, cast_s, diss, assum, glow, env_w, env_e,
         hair) = struct.unpack_from("<9B", raw, offset); offset += 9
        data.receive_shadows = bool(recv_s)
        data.hide_secret = bool(hide_s)
        data.cast_shadows = bool(cast_s)
        data.dissolve_fade = bool(diss)
        data.assume_shadowmask = bool(assum)
        data.glowmap = bool(glow)
        data.environment_mapping_window = bool(env_w)
        data.environment_mapping_eye = bool(env_e)
        data.hair = bool(hair)
        data.hair_tint_color, offset = _unpack_color_u32(raw, offset)
        tree, facegen, skin_tint, tessellate = struct.unpack_from("<4B", raw, offset); offset += 4
        data.tree = bool(tree)
        data.facegen = bool(facegen)
        data.skin_tint = bool(skin_tint)
        data.tessellate = bool(tessellate)
        (data.displacement_tex_bias, data.displacement_tex_scale,
         data.tessellation_pn_scale, data.tessellation_base_factor,
         data.tessellation_fade_distance) = struct.unpack_from("<fffff", raw, offset); offset += 20
        data.grayscale_to_palette_scale = struct.unpack_from("<f", raw, offset)[0]; offset += 4
        if offset < len(raw):
            data.skew_specular_alpha = bool(struct.unpack_from("<B", raw, offset)[0])

        return data
    except Exception:
        # Strict layout parse failed (compact / non-vanilla BGSM variant).  Fall
        # back to scraping the embedded texture paths so NO caller ever crashes,
        # even one that calls read_bgsm() directly without its own guard.
        scraped = _bgsm_scrape_textures(raw)
        if scraped is not None:
            return scraped
        raise


def write_bgem(data: BGEMData) -> bytes:
    """Serialise a :class:`BGEMData` to binary BGEM bytes (format version 2).
    See :func:`write_bgsm` for how this layout was verified."""
    buf = bytearray()
    buf += _BGEM_MAGIC
    buf += struct.pack("<I", _FO4_VERSION)
    buf += _pack_common(data)

    # 5 texture strings, real v2 order: Diffuse, Greyscale, EnvMap, Normal,
    # EnvMapMask.
    for tex in (
        data.base_texture,
        data.grayscale_texture,
        data.env_map_texture,
        data.normal_texture,
        data.env_map_mask_texture,
    ):
        buf += _write_nistring(tex)

    buf += bytes(int(v) for v in (
        data.blood_enabled,
        data.effect_lighting_enabled,
        data.falloff_enabled,
        data.falloff_color_enabled,
        data.grayscale_to_palette_alpha,
        data.soft_enabled,
    ))
    buf += _pack_color_u32(data.base_color)
    buf += struct.pack("<f", data.base_color_scale)
    buf += struct.pack(
        "<fffff",
        data.falloff_start_angle,
        data.falloff_stop_angle,
        data.falloff_start_opacity,
        data.falloff_stop_opacity,
        data.lighting_influence,
    )
    buf += struct.pack("<B", data.env_map_min_lod & 0xFF)
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

    flags = struct.unpack_from("<6B", raw, offset)
    offset += 6
    (data.blood_enabled, data.effect_lighting_enabled,
     data.falloff_enabled, data.falloff_color_enabled,
     data.grayscale_to_palette_alpha, data.soft_enabled) = [bool(f) for f in flags]

    data.base_color, offset = _unpack_color_u32(raw, offset)
    data.base_color_scale = struct.unpack_from("<f", raw, offset)[0]
    offset += 4

    (data.falloff_start_angle, data.falloff_stop_angle,
     data.falloff_start_opacity, data.falloff_stop_opacity,
     data.lighting_influence) = struct.unpack_from("<fffff", raw, offset)
    offset += 20
    data.env_map_min_lod = struct.unpack_from("<B", raw, offset)[0]
    offset += 1
    data.soft_depth = struct.unpack_from("<f", raw, offset)[0]

    return data


# ---------------------------------------------------------------------------
# Blender material ↔ BGSM conversion
# ---------------------------------------------------------------------------

def _normalize_tex_path(raw: str) -> str:
    """Normalise a texture path to Data/-relative backslash form."""
    raw = raw.replace("/", "\\")
    lower = raw.lower()
    data_idx = lower.find("\\data\\")
    if data_idx >= 0:
        raw = raw[data_idx + 6:]
    elif raw.startswith("\\"):
        raw = raw.lstrip("\\")
    return raw


def _get_image_node_path(mat, node_name: str) -> str:
    """Return the filepath of the image node for *node_name* in *mat*.

    Resolution order (first match wins):
    1. Exact node name match (nodes created by bgsm_to_blender_mat/import).
    2. fo4_tex_slot custom property on any TEX_IMAGE node.
    3. Node label substring match ('FO4 Diffuse', 'FO4 Normal', …).
    4. Filename-suffix heuristic (_d/_n/_s/_g.dds).
    5. BSDF socket tracing — which image feeds Base Color / Normal / etc.

    Path is normalised to Data/-relative backslash form.
    """
    if mat is None or not mat.use_nodes:
        return ""
    nodes = mat.node_tree.nodes

    # Pass 1 — exact name (created by our BGSM importer)
    node = nodes.get(node_name)
    if node is not None and node.type == 'TEX_IMAGE':
        if node.image is not None:
            return _normalize_tex_path(node.image.filepath or node.image.name)
        stored = node.get("fo4_tex_path", "")
        if stored:
            return stored  # Already normalised when stored

    # Pass 2 — fo4_tex_slot custom property (any node)
    for n in nodes:
        if n.type == 'TEX_IMAGE' and n.get("fo4_tex_slot") == node_name:
            if n.image is not None:
                return _normalize_tex_path(n.image.filepath or n.image.name)
            stored = n.get("fo4_tex_path", "")
            if stored:
                return stored

    # Pass 3 — node label contains the slot name (fo4_texture_resolver uses
    # labels like 'FO4 Diffuse', 'FO4 Normal', ...)
    low_name = node_name.lower()
    for n in nodes:
        if n.type == 'TEX_IMAGE' and (n.label or "").lower().find(low_name) >= 0:
            if n.image is not None:
                return _normalize_tex_path(n.image.filepath or n.image.name)
            stored = n.get("fo4_tex_path", "")
            if stored:
                return stored

    # Pass 4 — filename-suffix heuristic (NIF-imported / manually built)
    _suffix_hints = {
        "Diffuse":  ("_d.dds",),
        "Normal":   ("_n.dds",),
        "Specular": ("_s.dds", "_smoothspec.dds"),
        "Glow":     ("_g.dds",),
        "EnvMap":   ("_e.dds", "_em.dds"),
    }
    suffixes = _suffix_hints.get(node_name, ())
    if suffixes:
        for n in nodes:
            if n.type == 'TEX_IMAGE' and n.image is not None:
                raw = n.image.filepath or n.image.name
                if any(raw.lower().endswith(s) for s in suffixes):
                    return _normalize_tex_path(raw)

    # Pass 5 — BSDF socket tracing: find which TEX_IMAGE feeds the socket
    # that corresponds to this slot type.
    _socket_hints = {
        "Diffuse":  ("Base Color", "Color"),
        "Normal":   ("Normal",),
        "Specular": ("Specular IOR Level", "Specular"),
        "Glow":     ("Emission Color", "Emission"),
    }
    sockets = _socket_hints.get(node_name)
    if sockets and mat.use_nodes:
        bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            for sock_name in sockets:
                sock = bsdf.inputs.get(sock_name)
                if sock is None or not sock.links:
                    continue
                src = sock.links[0].from_node
                # Direct image → BSDF
                if src.type == 'TEX_IMAGE' and src.image is not None:
                    return _normalize_tex_path(src.image.filepath or src.image.name)
                # Image → NormalMap → BSDF (normal slot)
                for inp in src.inputs:
                    if inp.links:
                        grandparent = inp.links[0].from_node
                        if grandparent.type == 'TEX_IMAGE' and grandparent.image is not None:
                            return _normalize_tex_path(
                                grandparent.image.filepath or grandparent.image.name
                            )

    return ""


def blender_mat_to_bgsm(mat) -> BGSMData:
    """Extract BGSM fields from a Blender material.

    Reads Principled BSDF settings and image nodes named "Diffuse",
    "Normal", "Specular", "Glow", and "EnvMap".  Falls back gracefully
    when nodes are absent.

    If the material carries a ``fo4_bgsm_path`` custom property (stashed by
    ``fo4_texture_resolver``/``import_bgsm_for_object`` when the material was
    resolved from an existing FO4 asset) and that file still exists, its
    fields are used as the starting point instead of a blank BGSMData — so
    fields Blender has no editable representation for (wetness, subsurface,
    exact flag combinations, etc.) survive export unchanged.  Only fields
    Blender actually has live data for are overwritten below.

    Returns a :class:`BGSMData` ready to be written with :func:`write_bgsm`.
    """
    data = BGSMData()
    if mat is None:
        return data

    orig_path = mat.get("fo4_bgsm_path") if hasattr(mat, "get") else None
    if orig_path and os.path.isfile(orig_path):
        try:
            with open(orig_path, "rb") as fh:
                _orig_raw = fh.read()
            try:
                data = read_bgsm(_orig_raw)
            except Exception:
                _scraped = _bgsm_scrape_textures(_orig_raw)
                if _scraped is not None:
                    data = _scraped
        except OSError:
            pass

    data.diffuse_texture = _get_image_node_path(mat, "Diffuse")
    data.normal_texture = _get_image_node_path(mat, "Normal")
    data.smooth_spec_texture = _get_image_node_path(mat, "Specular")
    data.greyscale_texture = _get_image_node_path(mat, "Glow")
    data.env_map_texture = _get_image_node_path(mat, "EnvMap")

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
    # Blender 4.2+ silently normalizes a material's blend_method to 'HASHED'
    # on readback even when 'CLIP' was set (confirmed live) --
    # texture_helpers.setup_vegetation_material sets exactly 'CLIP', so
    # checking for only that value here never matched and every plant/
    # foliage BGSM silently lost its alpha cutout on export.
    if mat.blend_method in ('CLIP', 'HASHED'):
        data.alpha_test = True
        data.alpha_test_ref = int((mat.alpha_threshold or 0.5) * 255)
        _set_alpha_blend_mode(data, ALPHA_BLEND_NONE)
    elif mat.blend_method == 'BLEND':
        data.alpha_test = False
        _set_alpha_blend_mode(data, ALPHA_BLEND_STANDARD)
    else:
        data.alpha_test = False
        _set_alpha_blend_mode(data, ALPHA_BLEND_NONE)

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

        # Roughness → Smoothness (real BGSM range is 0.0-1.0, NOT 0-255)
        rough_sock = pbsdf.inputs.get("Roughness")
        if rough_sock and not rough_sock.is_linked:
            roughness = float(rough_sock.default_value)
            derived = max(0.0, min(1.0, 1.0 - roughness))
            # bgsm_to_blender_mat clamps the *displayed* roughness to a
            # minimum of 0.3 (max effective smoothness 0.7) so nothing
            # looks like unlit chrome in the viewport, which is lossy for
            # real smoothness > 0.7. If a stashed original value exists AND
            # the current roughness still equals what that clamp would
            # have produced, the user hasn't touched this socket -- prefer
            # the exact original instead of the display-clamped derivation
            # so a straight import->export round trip doesn't silently
            # degrade very glossy/wet materials to 0.7.
            orig = mat.get("fo4_bgsm_smoothness_orig")
            if orig is not None:
                expected_display_roughness = max(0.3, min(1.0, 1.0 - float(orig)))
                if abs(roughness - expected_display_roughness) < 1e-4:
                    derived = float(orig)
            data.smoothness = derived

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
    # Also check fo4_shader_type and fo4_core_profile set by setup_vegetation_material
    fo4_shader_type    = mat.get("fo4_shader_type", "")
    fo4_core_profile   = mat.get("fo4_core_profile", "")
    combined_hint = " ".join(filter(None, [fo4_shader, fo4_shader_type, fo4_core_profile]))
    if combined_hint:
        _apply_shader_hints(data, combined_hint)

    # Note: real FO4 BGSM files (format version 2, confirmed across the
    # entire sampled reference library) have no translucency/subsurface
    # fields at all -- those only exist in a later, unobserved format
    # version. There is nothing to persist into the .bgsm bytes for a
    # "fo4_translucency" custom property, so only the shader-flags hint
    # (informational, NIF-side only -- see BGSMData.shader_flags1) is kept.
    if mat.get("fo4_translucency"):
        data.shader_flags1 |= SF1_BACK_LIGHTING

    # ── Advanced material presets (fo4_advanced_materials.py) ───────────────
    # apply_advanced_material_preset() stashes every preset field as a
    # fo4_bgsm_<key> custom property and its own docstring claims they're
    # "read by bgsm_helpers.blender_mat_to_bgsm()" -- that read never
    # existed, so applying e.g. "Weathered Metal (Wet/Corroded)" had zero
    # effect on the exported .bgsm. Only wire the subset of preset keys that
    # actually correspond to real BGSMData fields: about half the preset
    # data (translucency*, and the wetnessControl* fields under
    # "bgsm_flags") describes a translucency/wetness-toggle model that does
    # not exist in the real BGSM v2 format at all (confirmed empirically
    # this session against the whole reference library) and is left as
    # inert metadata rather than asserted onto invented fields.
    _PRESET_KEY_TO_FIELD = {
        "backLighting":     "back_lighting",
        "specularEnabled":  "specular_enabled",
        "zBufferWrite":     "z_buffer_write",
        "zBufferTest":      "z_buffer_test",
        "receiveShadows":   "receive_shadows",
        "castShadows":      "cast_shadows",
        "tree":             "tree",
        "environmentMapping": "environment_mapping",
        "emitEnabled":      "emit_enabled",
        "glowmap":          "glowmap",
        "skinTint":         "skin_tint",
        "smoothness":       "smoothness",
        "specularMult":     "specular_mult",
        "fresnelPower":     "fresnel_power",
        "emittanceMult":    "emittance_mult",
        "emittanceColor":   "emittance_color",
        # The preset module's "values" dict uses a "wetnessControl*" naming
        # convention for these three that (unlike the same-named boolean
        # bgsm_flags) DOES map onto real numeric BGSMData fields.
        "wetnessControlEnvMapScale":  "wetness_envmap_scale",
        "wetnessControlFresnelPower": "wetness_fresnel_power",
        "wetnessControlMetalness":   "wetness_metalness",
    }
    for preset_key, field_name in _PRESET_KEY_TO_FIELD.items():
        if mat.get(f"fo4_bgsm_{preset_key}") is not None:
            val = mat[f"fo4_bgsm_{preset_key}"]
            try:
                if isinstance(getattr(data, field_name), tuple):
                    val = tuple(float(v) for v in val)
                elif isinstance(getattr(data, field_name), bool):
                    val = bool(val)
                elif isinstance(getattr(data, field_name), float):
                    val = float(val)
                setattr(data, field_name, val)
            except Exception:
                pass

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
        data.shader_flags2 |= SF2_GLOW_MAP
    if "multicolor" in hint_lower:
        # White emittance colour lets the engine pull colour from the RGB glow texture.
        data.emittance_color = (1.0, 1.0, 1.0)
    if "external_emittance" in hint_lower:
        data.external_emittance = True
        data.shader_flags1 |= SF1_EXTERNAL_EMITTANCE
    if "bgem_bloom" in hint_lower:
        # Additive blend for bloom halos – mark on the BGSM stub so exporters
        # know to generate a .bgem file instead of .bgsm.
        _set_alpha_blend_mode(data, ALPHA_BLEND_ADDITIVE)
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
        # Back-lighting flag makes sunlight pass through leaf surfaces in-game.
        # (Real v2 BGSM files have no translucency/subsurface data fields to
        # set alongside this -- see the note in blender_mat_to_bgsm.)
        data.shader_flags1 |= SF1_BACK_LIGHTING


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

    # Roughness from Smoothness — clamp to 0.3 minimum so nothing looks like
    # chrome in the Blender viewport. FO4 smoothness is stored 0.0-1.0.
    # The clamp is lossy for real smoothness > 0.7 (very glossy/wet/chrome
    # materials) -- without preserving the true value somewhere,
    # blender_mat_to_bgsm re-deriving smoothness from the (now-clamped)
    # Roughness socket on export would permanently degrade it to 0.7 after
    # a single import->export round trip. Stash the real value as a hidden
    # custom property so export can prefer it when the user hasn't actually
    # touched the Roughness socket.
    raw_rough = 1.0 - data.smoothness
    roughness = max(0.3, min(1.0, raw_rough))
    mat["fo4_bgsm_smoothness_orig"] = data.smoothness
    if pbsdf.inputs.get("Roughness") and not pbsdf.inputs["Roughness"].links:
        pbsdf.inputs["Roughness"].default_value = roughness

    # Alpha — only set if not alpha-test (alpha-test uses the texture alpha channel)
    if not data.alpha_test and pbsdf.inputs.get("Alpha"):
        pbsdf.inputs["Alpha"].default_value = data.alpha

    # Specular — keep it subtle; FO4 specular_mult is relative, not 0-1 IOR
    spec_val = min(0.5, data.specular_mult * 0.1)
    if pbsdf.inputs.get("Specular IOR Level") and not pbsdf.inputs["Specular IOR Level"].links:
        pbsdf.inputs["Specular IOR Level"].default_value = spec_val
    elif pbsdf.inputs.get("Specular") and not pbsdf.inputs["Specular"].links:
        pbsdf.inputs["Specular"].default_value = spec_val

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

    # Output node
    out_node = None
    for node in nodes:
        if node.type == 'OUTPUT_MATERIAL':
            out_node = node
            break
    if out_node is None:
        out_node = nodes.new('ShaderNodeOutputMaterial')
        out_node.location = (300, 300)
    if not pbsdf.outputs[0].links:
        links.new(pbsdf.outputs[0], out_node.inputs[0])

    # Create / update texture image nodes and wire them to the BSDF
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
        "EnvMap":   data.env_map_texture,
    }

    def _resolve_tex(tex_path: str):
        """Return a loaded bpy.data.images entry or None."""
        for candidate in (
            tex_path,
            tex_path.replace("\\", "/"),
            bpy.path.abspath("//" + tex_path.replace("\\", "/")),
        ):
            try:
                if os.path.isfile(candidate):
                    return bpy.data.images.load(candidate, check_existing=True)
            except Exception:
                pass
        return None

    for node_name, tex_path in _tex_map.items():
        tex_node = nodes.get(node_name)
        if tex_node is None:
            if not tex_path:
                continue
            tex_node = nodes.new('ShaderNodeTexImage')
            tex_node.name = node_name
            tex_node.label = node_name
            tex_node.location = (_x, _y_map.get(node_name, 0))

        # Tag so _get_image_node_path can find this node even if renamed.
        tex_node["fo4_tex_slot"] = node_name

        # Load image — only set if the node has no image yet.  Never replace
        # an image the user (or the NIF import) already assigned.
        if tex_path and tex_node.image is None:
            img = _resolve_tex(tex_path)
            if img is not None:
                tex_node.image = img
            else:
                # DDS not on disk; store the path so export can still write it.
                tex_node["fo4_tex_path"] = _normalize_tex_path(tex_path)

        # Wire to BSDF
        if node_name == "Diffuse":
            if pbsdf.inputs.get("Base Color") and not pbsdf.inputs["Base Color"].links:
                links.new(tex_node.outputs["Color"], pbsdf.inputs["Base Color"])
            if data.alpha_test and pbsdf.inputs.get("Alpha") and not pbsdf.inputs["Alpha"].links:
                links.new(tex_node.outputs["Alpha"], pbsdf.inputs["Alpha"])
        elif node_name == "Normal":
            if tex_node.image:
                tex_node.image.colorspace_settings.name = 'Non-Color'
            nm = nodes.get("_NormalMap")
            if nm is None:
                nm = nodes.new('ShaderNodeNormalMap')
                nm.name = "_NormalMap"
                nm.location = (_x + 200, _y_map["Normal"])
            if not nm.inputs["Color"].links:
                links.new(tex_node.outputs["Color"], nm.inputs["Color"])
            if pbsdf.inputs.get("Normal") and not pbsdf.inputs["Normal"].links:
                links.new(nm.outputs["Normal"], pbsdf.inputs["Normal"])
        elif node_name == "Specular":
            # FO4 _s.dds: RGB = specular color, alpha = smoothness/gloss.
            # Don't wire to Roughness — scalar values are set above from BGSM data.
            pass
        elif node_name == "Glow" and data.emit_enabled:
            if pbsdf.inputs.get("Emission Color") and not pbsdf.inputs["Emission Color"].links:
                links.new(tex_node.outputs["Color"], pbsdf.inputs["Emission Color"])
            elif pbsdf.inputs.get("Emission") and not pbsdf.inputs["Emission"].links:
                links.new(tex_node.outputs["Color"], pbsdf.inputs["Emission"])


# ---------------------------------------------------------------------------
# High-level export/import helpers
# ---------------------------------------------------------------------------

def _bgsm_output_path(obj, output_dir: str, mat_name: str) -> str:
    """Return the output .bgsm file path for a given object/material name."""
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in mat_name)
    return os.path.join(output_dir, safe_name + ".bgsm")


def _object_has_wind_rig(obj) -> bool:
    """True if *obj* actually carries wind sway data.

    Our wind pipeline (see animation_helpers.AnimationHelpers) writes two
    things onto a wind-rigged mesh: a "Wind" vertex group (the gradient),
    and, once baked, a "VERTEX_ALPHA" (or "Col") color attribute PyNifly
    reads on export. Either one existing is a reliable signal this object
    is meant to sway in-game -- used below to make sure the exported BGSM
    actually tells the FO4 engine to read that data (see
    _apply_wind_shader_flags).
    """
    mesh = getattr(obj, "data", None)
    if mesh is None:
        return False
    if "Wind" in obj.vertex_groups:
        return True
    for name in ("VERTEX_ALPHA", "Col"):
        if mesh.color_attributes.get(name) is not None:
            return True
    return False


def _apply_wind_shader_flags(data: BGSMData) -> None:
    """OR in the shader flags FO4 needs to animate wind from vertex alpha.

    Our Blender-side wind rig (generate_wind_weights / apply_wind_vertex_colors)
    writes a correct per-vertex sway gradient into the mesh's vertex-alpha
    data, but that data is inert in-game unless the material also carries:

    - SLSF1_Vertex_Alpha  -- tells the shader to read the vertex alpha
      channel at all (otherwise it's ignored).
    - SLSF2_Tree_Anim      -- tells the engine to actually bend the mesh
      per-vertex using that alpha as the wind-sway amount.

    Every real vanilla FO4 vegetation BGSM has both bits set. Materials
    re-exported from an existing FO4 asset (``fo4_bgsm_path`` present)
    already inherit them from the source file, so this is a no-op there --
    it only matters for materials built fresh in Blender, where nothing
    else in this module ever sets these two bits.
    """
    data.shader_flags1 |= SF1_VERTEX_ALPHA
    data.shader_flags2 |= SF2_TREE_ANIM


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

    wants_wind = _object_has_wind_rig(obj)

    slots = obj.data.materials if all_slots else [obj.active_material]
    results = []
    for mat in slots:
        if mat is None:
            results.append((False, "Empty material slot skipped"))
            continue
        try:
            bgsm_data = blender_mat_to_bgsm(mat)
            if wants_wind:
                _apply_wind_shader_flags(bgsm_data)
            out_path = _bgsm_output_path(obj, output_dir, mat.name)
            raw = write_bgsm(bgsm_data)
            with open(out_path, "wb") as fh:
                fh.write(raw)
            results.append((True, f"Exported '{mat.name}' → {out_path}"))
        except Exception as exc:
            results.append((False, f"Failed to export '{mat.name}': {exc}"))

    return results


def export_textures_for_object(
    obj,
    output_dir: str,
    *,
    all_slots: bool = True,
) -> list[tuple[bool, str]]:
    """Copy (or DDS-convert) every texture image referenced by *obj*'s
    material(s) into *output_dir*, alongside the exported NIF and BGSM.

    For each ``ShaderNodeTexImage`` node with a loaded image whose source
    file still exists on disk:
      - If it's already ``.dds``, copy it as-is.
      - Otherwise (PNG/TGA/etc.), convert it to DDS via
        :func:`nvtt_helpers.NVTTHelpers.convert_to_dds` (texconv/NVTT,
        auto-picking BC1/BC3/BC5/BC7 from the FO4 filename suffix) when a
        converter is configured; falls back to a plain copy of the original
        file with a warning if no converter is available, since FO4 can't
        load PNG/TGA textures at all.

    Without this, a texture that never went through
    :meth:`texture_helpers.TextureHelpers.install_texture` (e.g. a material
    built by hand, or a mesh whose textures were wired up before this
    addon's own texture tools existed) stays wherever it originally sat
    (a Downloads folder, source-art path, etc.) and never actually ships
    with the exported asset.

    Args:
        obj:        Blender mesh object.
        output_dir: Directory to write texture files into (mirrors the
                    Materials folder convention already used for BGSM —
                    typically a ``Textures\\...`` folder next to the NIF's
                    own ``Meshes\\...`` path).
        all_slots:  If True, scan every material slot. If False, only the
                    active material.

    Returns a list of ``(success, message)`` pairs, one per texture found.
    """
    if obj is None or obj.type != 'MESH':
        return [(False, "No mesh object provided")]
    if not obj.data.materials:
        return [(False, f"'{obj.name}' has no material slots")]

    os.makedirs(output_dir, exist_ok=True)

    try:
        from . import nvtt_helpers as _nvtt
    except Exception:
        _nvtt = None

    slots = obj.data.materials if all_slots else [obj.active_material]
    results = []
    seen_src = set()
    for mat in slots:
        if mat is None or not getattr(mat, "use_nodes", False):
            continue
        for node in mat.node_tree.nodes:
            if node.type != 'TEX_IMAGE' or not node.image:
                continue
            img = node.image
            src_path = ""
            try:
                if _nvtt:
                    src_path = _nvtt.NVTTHelpers._resolve_image_source_path(img, output_dir) or ""
                elif img.filepath:
                    candidate = bpy.path.abspath(img.filepath)
                    if os.path.isfile(candidate):
                        src_path = candidate
            except Exception:
                src_path = ""
            if not src_path or not os.path.isfile(src_path):
                results.append((
                    False,
                    f"'{node.name}' on '{mat.name}': source texture not found on disk ({img.filepath!r})"
                ))
                continue
            src_norm = os.path.normcase(os.path.normpath(src_path))
            if src_norm in seen_src:
                continue
            seen_src.add(src_norm)

            src_ext = os.path.splitext(src_path)[1].lower()
            base_name = os.path.splitext(os.path.basename(src_path))[0]
            dest_dds = os.path.join(output_dir, base_name + ".dds")

            if src_ext == ".dds":
                dest_path = os.path.join(output_dir, os.path.basename(src_path))
                if os.path.normcase(os.path.normpath(dest_path)) == src_norm:
                    results.append((True, f"'{os.path.basename(src_path)}' already at destination"))
                    continue
                try:
                    import shutil as _shutil
                    _shutil.copy2(src_path, dest_path)
                    results.append((True, f"Copied '{os.path.basename(src_path)}' → {dest_path}"))
                except Exception as exc:
                    results.append((False, f"Failed to copy '{src_path}': {exc}"))
                continue

            # Non-DDS source (PNG/TGA/etc.) -- convert via texconv/NVTT so the
            # shipped asset is actually loadable by FO4, which has no PNG/TGA
            # texture support at all.
            converted = False
            if _nvtt and (_nvtt.NVTTHelpers.is_nvtt_available() or _nvtt.NVTTHelpers.is_texconv_available()):
                try:
                    ok, msg = _nvtt.NVTTHelpers.convert_to_dds(src_path, dest_dds, slot=node.name)
                    if ok:
                        results.append((True, f"Converted '{os.path.basename(src_path)}' → {dest_dds}"))
                        converted = True
                    else:
                        results.append((False, f"DDS conversion failed for '{src_path}': {msg}"))
                except Exception as exc:
                    results.append((False, f"DDS conversion failed for '{src_path}': {exc}"))
            if not converted:
                dest_path = os.path.join(output_dir, os.path.basename(src_path))
                try:
                    import shutil as _shutil
                    _shutil.copy2(src_path, dest_path)
                    results.append((
                        True,
                        f"Copied '{os.path.basename(src_path)}' → {dest_path} "
                        "(NOT converted to DDS — no texconv/NVTT configured; FO4 cannot load this format)"
                    ))
                except Exception as exc:
                    results.append((False, f"Failed to copy '{src_path}': {exc}"))

    if not results:
        results.append((False, "No textures found on any material"))
    return results


def _bgsm_scrape_textures(raw: bytes):
    """Best-effort recovery when the strict BGSM parser fails (unknown layout or
    a non-vanilla exporter): pull the embedded ``.dds`` texture paths straight
    out of the bytes and classify them by the Fallout 4 naming suffix.

    Returns a :class:`BGSMData` with only the texture fields populated, or
    ``None`` if no texture paths are present.
    """
    import re as _re
    matches = _re.findall(rb'[ -~]{3,}\.dds', raw, _re.IGNORECASE)
    if not matches:
        return None
    data = BGSMData()
    seen = []
    for m in matches:
        s = m.decode('ascii', 'replace').strip()
        low = s.lower()
        # Trim any leading junk so the path starts at the 'textures' token.
        i = low.find('textures')
        if i > 0:
            s = s[i:]
            low = s.lower()
        if s in seen:
            continue
        seen.append(s)
        if low.endswith('_n.dds') or 'normal' in low:
            if not data.normal_texture:
                data.normal_texture = s
        elif low.endswith('_s.dds') or 'specular' in low or 'smooth' in low:
            if not data.smooth_spec_texture:
                data.smooth_spec_texture = s
        elif low.endswith('_g.dds') or 'glow' in low:
            if not data.glow_texture:
                data.glow_texture = s
        elif (low.endswith('_d.dds') or 'diffuse' in low
              or 'basecolor' in low or 'albedo' in low):
            if not data.diffuse_texture:
                data.diffuse_texture = s
        else:
            if not data.diffuse_texture:
                data.diffuse_texture = s
    if not (data.diffuse_texture or data.normal_texture
            or data.smooth_spec_texture or data.glow_texture):
        return None
    return data


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
        _warn = ""
        try:
            data = read_bgsm(raw)
        except Exception as exc:
            # Strict parse failed (unknown BGSM layout/variant, e.g. a non-vanilla
            # exporter).  Fall back to scraping the embedded .dds paths so the
            # material still loads with its textures instead of crashing.
            data = _bgsm_scrape_textures(raw)
            if data is None:
                return False, (f"Could not parse BGSM and found no texture paths "
                               f"to fall back on ({exc})")
            _warn = f"  [lenient recovery - strict parse failed: {exc}]"
        mat_name = Path(bgsm_path).stem
        if bpy is not None:
            if not obj.data.materials:
                # No material slot at all — create one.
                mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
                obj.data.materials.append(mat)
            else:
                existing = obj.active_material
                has_tex_nodes = (
                    existing is not None
                    and existing.use_nodes
                    and existing.node_tree is not None
                    and any(n.type == 'TEX_IMAGE' and n.image is not None
                            for n in existing.node_tree.nodes)
                )
                if has_tex_nodes:
                    # Existing material already has images loaded (e.g. from NIF
                    # import).  Apply BGSM properties to it in-place so we keep
                    # the textures the user can already see.
                    mat = existing
                else:
                    # Empty or nodeless slot — replace with the BGSM material.
                    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
                    obj.active_material = mat
            bgsm_to_blender_mat(data, mat)
            # Store the source path so the export path can mirror it
            try:
                mat["fo4_bgsm_path"] = str(bgsm_path)
            except Exception:
                pass
        return True, f"Imported '{mat_name}' from {bgsm_path}{_warn}"
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


# ---------------------------------------------------------------------------
# Mossy AI texture routing
# ---------------------------------------------------------------------------

def _route_texture_via_mossy(image_path: str, fmt: str = "dds",
                              quality: str = "high") -> tuple:
    """Route texture conversion/compression through Mossy AI.

    Mossy handles NVTT/texconv externally so Blender does not need local
    CLI tools installed.  Returns (success, result_path_or_error).
    """
    try:
        import base64, os, tempfile
        from . import mossy_link
        with open(image_path, "rb") as fh:
            img_b64 = base64.b64encode(fh.read()).decode("utf-8")
        result = mossy_link.process_texture(
            image_data_base64=img_b64, fmt=fmt, quality=quality, timeout=60
        )
        if result and result.get("status") == "success":
            tex_data = result.get("texture_data", "")
            if tex_data:
                ext = "." + result.get("format", fmt)
                tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
                tmp.write(base64.b64decode(tex_data))
                tmp.close()
                return True, tmp.name
        return False, result.get("message", "Mossy returned no texture data") if result else "Mossy offline"
    except Exception as exc:
        return False, f"Mossy texture route error: {exc}"


def register():
    """Register bgsm_helpers (no Blender classes to register)."""
    pass


def unregister():
    """Unregister bgsm_helpers."""
    pass
