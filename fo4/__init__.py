"""
fo4 — Fallout 4 core package
============================
Aggregate package that re-exports every Fallout 4-specific module so callers
can use a single clean import point instead of hunting through the flat root.

Usage examples::

    from .fo4 import BGSMData, write_bgsm
    from .fo4 import NavmeshHelpers
    from .fo4 import TRIExportHelpers
    from .fo4 import write_nif, export_nif_for_object

Individual sub-modules are still importable directly (unchanged) to preserve
backward compatibility with any existing operators or scripts.
"""

# ── FO4 material system ────────────────────────────────────────────────────────
from ..bgsm_helpers import (
    BGSMData,
    BGEMData,
    write_bgsm,
    read_bgsm,
    write_bgem,
    read_bgem,
    blender_mat_to_bgsm,
    bgsm_to_blender_mat,
    export_bgsm_for_object,
    import_bgsm_for_object,
    ALPHA_BLEND_NONE,
    ALPHA_BLEND_STANDARD,
    ALPHA_BLEND_ADDITIVE,
    ALPHA_BLEND_MULTIPLY,
    ALPHA_BLEND_SUBTRACT,
    SF1_SPECULAR,
    SF1_SKINNED,
    SF1_ENVIRONMENT_MAPPING,
    SF1_RECEIVE_SHADOWS,
    SF1_CAST_SHADOWS,
    SF1_FACE,
    SF1_EMIT_ENABLED,
    SF1_BACK_LIGHTING,
    SF1_MODEL_SPACE_NORMALS,
    SF1_HAIR,
    SF1_SKIN_TINT,
)

# ── Navmesh validation ─────────────────────────────────────────────────────────
from ..navmesh_helpers import NavmeshHelpers

# ── Shape-key → .tri morph export ─────────────────────────────────────────────
from ..tri_export_helpers import TRIExportHelpers


# ── Papyrus script generation ──────────────────────────────────────────────────
try:
    from ..papyrus_helpers import PapyrusHelpers  # type: ignore[attr-defined]
except ImportError:
    pass

# ── Havok physics presets ──────────────────────────────────────────────────────
try:
    from ..animation_helper.havakphysics import (  # type: ignore[attr-defined]
        PHYSICS_PRESETS,
        apply_physics_preset,
    )
except ImportError:
    pass

# ── Material browser / scene diagnostics ──────────────────────────────────────
# (register/unregister handled by the root modules; just expose the helpers)
try:
    from ..fo4_scene_diagnostics import FO4SceneDiagnostics  # type: ignore[attr-defined]
except ImportError:
    pass

# ── FO4 data constants ─────────────────────────────────────────────────────────
# Correct Fallout 4 limits used across multiple modules.
FO4_MAX_VERTS_PER_MESH   = 65535   # BSTriShape uint16 index limit
FO4_WARN_VERTS_PER_MESH  = 32000   # practical LOD and performance warning
FO4_MAX_TRIS_PER_MESH    = 65535
FO4_RECOMMENDED_TRIS     = 20000   # beyond this expect LOD pop-in / performance issues
FO4_MAX_BONES_PER_MESH   = 256     # BSSubIndexTriShape skin limit
FO4_MAX_BONES_PER_VERT   = 4       # vertex influences cap (NIF vertex data)
FO4_NIF_VERSION          = (20, 2, 0, 7)   # NIF file version bytes
FO4_NIF_USER_VER         = 12      # User Version for FO4
FO4_NIF_BS_VER           = 130     # BSVersion for FO4

# FO4 coordinate scale: 1 Blender unit = 1 NIF/game unit = ~1.43 cm
# (70 game units per metre; 1 foot = 21.333 units)
FO4_UNITS_PER_FOOT       = 21.333  # game units per foot  (70 × 0.3048)
FO4_UNITS_PER_METER      = 70.0    # game units per metre (authoritative Bethesda scale)

# FO4 mesh type → BSShaderType flag mapping
FO4_SHADER_TYPES = {
    "DEFAULT":      0x00000001,
    "ENVIRONMENT":  0x00000002,
    "GLOW":         0x00000004,
    "PARALLAX":     0x00000008,
    "FACE":         0x00000010,
    "SKIN":         0x00000020,
    "HAIR":         0x00000040,
    "MULTI":        0x00000080,
    "LANDSCAPE":    0x00000100,
    "LOD":          0x00000200,
    "NOLOD_LAND":   0x00000400,
    "EYE":          0x00000800,
}

# FO4 texture slot indices in BSShaderTextureSet
FO4_TEXTURE_SLOTS = {
    "diffuse":          0,   # _d.dds  (albedo / color)
    "normal":           1,   # _n.dds  (normal map — tangent-space)
    "specular":         2,   # _s.dds  (specular / smoothness)
    "greyscale":        3,   # _g.dds  (glow mask / grayscale-to-palette)
    "glow":             4,   # glow map / emissive (optional)
    "inner_layer":      5,   # inner layer / wrinkle map
    "wrinkle":          6,   # wrinkle detail
    "displacement":     7,   # displacement / height map
    "specular_unused":  8,   # reserved / unused in vanilla FO4
}

# FO4 texture naming convention suffixes
FO4_TEXTURE_SUFFIXES = {
    "diffuse":    "_d.dds",
    "normal":     "_n.dds",
    "specular":   "_s.dds",
    "greyscale":  "_g.dds",
    "glow":       "_g.dds",   # same as greyscale slot, different flag
    "emissive":   "_em.dds",
}

# Standard CK output paths relative to game Data directory
FO4_DATA_PATHS = {
    "meshes":       "Meshes/",
    "textures":     "Textures/",
    "materials":    "Materials/",
    "sounds":       "Sound/",
    "scripts":      "Scripts/",
    "interface":    "Interface/",
    "misc":         "Misc/",
    "shadersfx":    "ShadersFX/",
}

__all__ = [
    # BGSM
    "BGSMData", "BGEMData",
    "write_bgsm", "read_bgsm", "write_bgem", "read_bgem",
    "blender_mat_to_bgsm", "bgsm_to_blender_mat",
    "export_bgsm_for_object", "import_bgsm_for_object",
    # Alpha
    "ALPHA_BLEND_NONE", "ALPHA_BLEND_STANDARD", "ALPHA_BLEND_ADDITIVE",
    "ALPHA_BLEND_MULTIPLY", "ALPHA_BLEND_SUBTRACT",
    # Shader flags
    "SF1_SPECULAR", "SF1_SKINNED", "SF1_ENVIRONMENT_MAPPING",
    "SF1_RECEIVE_SHADOWS", "SF1_CAST_SHADOWS", "SF1_FACE",
    "SF1_EMIT_ENABLED", "SF1_BACK_LIGHTING", "SF1_MODEL_SPACE_NORMALS",
    "SF1_HAIR", "SF1_SKIN_TINT",
    # Navmesh
    "NavmeshHelpers",
    # TRI morphs
    "TRIExportHelpers",
    # FO4 data constants
    "FO4_MAX_VERTS_PER_MESH", "FO4_WARN_VERTS_PER_MESH",
    "FO4_MAX_TRIS_PER_MESH", "FO4_RECOMMENDED_TRIS",
    "FO4_MAX_BONES_PER_MESH", "FO4_MAX_BONES_PER_VERT",
    "FO4_NIF_VERSION", "FO4_NIF_USER_VER", "FO4_NIF_BS_VER",
    "FO4_UNITS_PER_FOOT", "FO4_UNITS_PER_METER",
    "FO4_SHADER_TYPES", "FO4_TEXTURE_SLOTS",
    "FO4_TEXTURE_SUFFIXES", "FO4_DATA_PATHS",
]
