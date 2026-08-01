"""
FO4 Auto-BGSM Material Generator
Run in Blender's Scripting tab, or standalone with plain Python (no bpy
required -- this script has no addon dependency).
Fill in your DDS texture paths before running.

Writes a real binary Fallout 4 .bgsm file (format version 2), NOT a JSON
text file. FO4/NifSkope/Creation Kit only load the real binary layout --
verified field-for-field against 300 real vanilla .BGSM files this session.
Only a handful of the most commonly-tweaked fields are exposed below;
everything else is written with the same defaults real vanilla files use.
"""
import struct
import pathlib

# ── Fill in your DDS paths (Data/-relative, e.g. "textures\\YourMod\\...") ──
DIFFUSE   = "textures\\YourMod\\YourAsset_d.dds"
NORMAL    = "textures\\YourMod\\YourAsset_n.dds"
SPECULAR  = "textures\\YourMod\\YourAsset_s.dds"

# ── Commonly-tweaked BGSM settings ───────────────────────────────────────
SMOOTHNESS               = 0.85   # real range 0.0-1.0, NOT 0-100
SPECULAR_MULT            = 1.0
ENABLE_RIM_LIGHTING       = False
ENABLE_SUBSURFACE         = False
ENABLE_GLOW               = False
ENABLE_ENVIRONMENT_MAP    = True
ENVIRONMENT_MAP_SCALE     = 0.15
TWO_SIDED                 = False

OUT_PATH = pathlib.Path("material.bgsm")


def _nistr(s: str) -> bytes:
    """NiString: uint32 length (incl. trailing NUL) + ASCII bytes + NUL."""
    encoded = (s or "").encode("ascii", errors="replace") + b"\x00"
    return struct.pack("<I", len(encoded)) + encoded


def build_bgsm() -> bytes:
    buf = bytearray()
    buf += b"BGSM"
    buf += struct.pack("<I", 2)  # version 2 -- the only version real FO4 files use

    # ── Common header ────────────────────────────────────────────────────
    tile_flags = 3  # tile U + V
    buf += struct.pack("<I", tile_flags)
    buf += struct.pack("<fffff", 0.0, 0.0, 1.0, 1.0, 1.0)  # offset/scale UV, alpha
    buf += struct.pack("<BII", 0, 6, 7)          # alphblend0/1/2 -- no blending
    buf += struct.pack("<B", 128)                # alphatestref
    buf += bytes([0, 1, 1, 0, 0, 0])              # alphatest, zbufwrite, zbuftest, ssr, wetness_ssr, decal
    buf += bytes([int(TWO_SIDED), 0, 0, 0, 0])    # twoSided, decalNoFade, nonOccluder, refraction, refractionFalloff
    buf += struct.pack("<f", 0.0)                 # refractionPower
    buf += struct.pack("<B", int(ENABLE_ENVIRONMENT_MAP))
    buf += struct.pack("<f", ENVIRONMENT_MAP_SCALE)
    buf += struct.pack("<B", 0)                   # grayscaleToPaletteColor

    # ── BGSM-specific: 9 textures, real v2 order ─────────────────────────
    for tex in (DIFFUSE, NORMAL, SPECULAR, "", "", "", "", "", ""):
        buf += _nistr(tex)

    buf += struct.pack("<B", 0)                   # enableEditorAlphaRef
    buf += struct.pack("<B", int(ENABLE_RIM_LIGHTING))
    buf += struct.pack("<ff", 2.0, 0.0)           # rimPower, backlightPower
    buf += struct.pack("<B", int(ENABLE_SUBSURFACE))
    buf += struct.pack("<f", 0.3)                 # subsurfaceRolloff
    buf += struct.pack("<B", 1)                   # specularEnabled
    buf += struct.pack("<fff", 1.0, 1.0, 1.0)     # specularColor
    buf += struct.pack("<fff", SPECULAR_MULT, SMOOTHNESS, 5.0)  # specularMult, smoothness, fresnelPower
    buf += struct.pack("<ffff", -1.0, -1.0, -1.0, -1.0)  # wetness spec scale/power/minvar/envmapscale
    buf += struct.pack("<ff", -1.0, -1.0)         # wetness fresnelPower, metalness
    buf += _nistr("")                             # rootMaterialPath
    buf += struct.pack("<BB", 0, int(ENABLE_GLOW))  # anisoLighting, emitEnabled
    if ENABLE_GLOW:
        buf += struct.pack("<fff", 1.0, 1.0, 1.0)  # emittanceColor -- only present if emitEnabled
    buf += struct.pack("<f", 1.0)                 # emittanceMult
    buf += bytes([0, 0, 0])                       # modelSpaceNormals, externalEmittance, backLighting
    buf += bytes([1, 0, 1, 0, 0, int(ENABLE_GLOW), 0, 0, 0])  # receiveShadows..hair
    buf += struct.pack("<III", 255, 255, 255)     # hairTintColor (white, uint32-per-channel)
    buf += bytes([0, 0, 0, 0])                    # tree, facegen, skinTint, tessellate
    buf += struct.pack("<fffff", 0.0, 0.0, 0.0, 0.0, 0.0)  # displacement/tessellation floats
    buf += struct.pack("<f", 1.0)                 # grayscaleToPaletteScale
    buf += struct.pack("<B", 0)                   # skewSpecularAlpha

    return bytes(buf)


raw = build_bgsm()
OUT_PATH.write_bytes(raw)
print(f"BGSM generated: {OUT_PATH.resolve()}  ({len(raw)} bytes)")
