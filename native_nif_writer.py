"""
native_nif_writer.py – Standalone Fallout 4 NIF exporter for Blender 5+

Writes a game-ready NIF 20.2.0.7 file for Fallout 4 entirely in Python,
without requiring the PyNifly or Niftools Blender operators.  Used as a
fallback when:

  * PyNifly v25 (BadDogSkyrim) is not installed, AND
  * Niftools v0.1.1 is not installed, OR
  * Either operator fails at runtime (unhandled API breakage)

The writer produces the minimal block tree for a FO4 mesh:

  BSFadeNode (root)
  └── BSTriShape          (geometry: positions, normals, tangents, UVs)
      ├── BSLightingShaderProperty  (shader with per-mesh-type FO4 flags)
      │   └── BSShaderTextureSet   (up to 9 texture slots)

NIF wire-format constants (Fallout 4):
  Version        : 20.2.0.7
  User Version   : 12
  BS Version     : 130  (BSVersion for FO4 / Skyrim SE)
  Target Game    : FO4

Vertex format (full-precision BSVertexData, 28 bytes/vertex):
  3 × float32   – position (x, y, z)
  1 × float32   – bitangent X component (packed into W slot)
  2 × float16   – UV (u, 1-v  because NIF flips V)
  3 × uint8     – normal (mapped from [-1,1] to [0,255])
  1 × uint8     – bitangent Y component
  3 × uint8     – tangent (mapped from [-1,1] to [0,255])
  1 × uint8     – bitangent Z component

Triangle format: 3 × uint16 (little-endian) per triangle.

NIF coordinate convention (niftools tangent space):
  nif_tangent   = -blender_bitangent
  nif_bitangent = +blender_tangent
  This matches the PyNifly v25 and niftools v0.1.1 encoding exactly.

Supported mesh types (BSFadeNode + BSTriShape fallback):
  STATIC, LOD, VEGETATION, FLORA, FURNITURE, WEAPON, ARCHITECTURE,
  ANIMATED, DEBRIS, AUTO

Unsupported (decline and let caller fall back to PyNifly):
  SKINNED, ARMOR  (require BSSkin::Instance / BSSubIndexTriShape)

Limitations:
  * Single material/texture set per call
  * No armature / skinning support (SKINNED/ARMOR declined)
  * No NiKeyframeController for ANIMATED type
  * No BSXFlags / bhkCollisionObject for DEBRIS / ARCHITECTURE
  * No LOD / morph support
  * No NiAlphaProperty (Alpha Clip) for FLORA — use PyNifly for full flora
"""

import bpy
import bmesh
import struct
import numpy as np
import importlib
import traceback
from pathlib import Path


# ---------------------------------------------------------------------------
# Float16 helper
# ---------------------------------------------------------------------------

def _f32_to_f16_uint16(f: float) -> int:
    """Convert a Python float to a uint16 IEEE-754 half-float."""
    packed = struct.pack('<f', float(f))
    n = struct.unpack('<I', packed)[0]
    sign    = (n >> 31) & 0x1
    exp     = (n >> 23) & 0xFF
    mant    = n & 0x7FFFFF

    if exp == 0xFF:           # Inf / NaN
        h_exp  = 0x1F
        h_mant = 0x200 if mant else 0
    elif exp == 0:            # denormal → zero
        h_exp  = 0
        h_mant = 0
    else:
        new_exp = exp - 127 + 15
        if new_exp >= 31:     # overflow → inf
            h_exp  = 0x1F
            h_mant = 0
        elif new_exp <= 0:    # underflow → zero
            h_exp  = 0
            h_mant = 0
        else:
            h_exp  = new_exp
            h_mant = mant >> 13

    return (sign << 15) | (h_exp << 10) | h_mant


def _normal_to_byte(v: float) -> int:
    """Map a normal component from [-1, 1] to an unsigned byte [0, 255]."""
    return max(0, min(255, int(round((v + 1.0) * 127.5))))


# ---------------------------------------------------------------------------
# Mesh data extraction
# ---------------------------------------------------------------------------

def _extract_mesh_data(obj):
    """Return NIF-ready mesh arrays from a Blender mesh object.

    Returns
    -------
    positions   : (N, 3) float32 – vertex positions
    normals     : (N, 3) float32 – per-NIF-vertex normals
    nif_tangents: (N, 3) float32 – tangent field stored in NIF   = -blender_bitangent
    nif_bitan   : (N, 3) float32 – bitangent x/y/z in NIF       = +blender_tangent
    uvs         : (N, 2) float32 – UV coordinates (not yet V-flipped)
    triangles   : (T, 3) int32   – NIF vertex indices
    """
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj  = obj.evaluated_get(depsgraph)
    mesh      = eval_obj.to_mesh()
    try:
        # ── Triangulate in-place ─────────────────────────────────────────
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()

        # ── Loop normals ─────────────────────────────────────────────────
        # calc_normals_split was removed in Blender 5.0; it was a no-op in
        # 4.1+ anyway.  Just call it if present so behaviour is identical
        # on all versions.
        if hasattr(mesh, 'calc_normals_split'):
            mesh.calc_normals_split()

        # ── Tangents ─────────────────────────────────────────────────────
        has_uv = bool(mesh.uv_layers)
        if has_uv:
            try:
                mesh.calc_tangents(uvmap=mesh.uv_layers[0].name)
            except Exception:
                has_uv = False

        # Use polygon data directly: after bmesh.ops.triangulate() every
        # polygon has exactly 3 consecutive loops.  mesh.loop_triangles is a
        # lazily-cached attribute that is NOT flushed by mesh.update(), so it
        # can still reference loop indices from the pre-triangulation mesh and
        # cause "index N is out of bounds for axis 0 with size N" crashes.
        n_tris  = len(mesh.polygons)
        n_loops = len(mesh.loops)
        n_verts = len(mesh.vertices)
        if n_tris == 0:
            raise ValueError("Mesh has no triangles after triangulation")

        # ── Per-loop data ─────────────────────────────────────────────────
        loop_vert = np.zeros(n_loops, dtype=np.int32)
        mesh.loops.foreach_get('vertex_index', loop_vert)

        vert_co = np.zeros(n_verts * 3, dtype=np.float32)
        mesh.vertices.foreach_get('co', vert_co)
        vert_co = vert_co.reshape(n_verts, 3)

        loop_no = np.zeros(n_loops * 3, dtype=np.float32)
        mesh.loops.foreach_get('normal', loop_no)
        loop_no = loop_no.reshape(n_loops, 3)

        if has_uv:
            loop_tan = np.zeros(n_loops * 3, dtype=np.float32)
            mesh.loops.foreach_get('tangent', loop_tan)
            loop_tan = loop_tan.reshape(n_loops, 3)

            bitan_sign = np.zeros(n_loops, dtype=np.float32)
            mesh.loops.foreach_get('bitangent_sign', bitan_sign)
            loop_bitan = bitan_sign[:, np.newaxis] * np.cross(loop_no, loop_tan)

            loop_uv = np.zeros(n_loops * 2, dtype=np.float32)
            mesh.uv_layers[0].data.foreach_get('uv', loop_uv)
            loop_uv = loop_uv.reshape(n_loops, 2)
        else:
            loop_tan       = np.zeros((n_loops, 3), dtype=np.float32)
            loop_tan[:, 0] = 1.0
            loop_bitan       = np.zeros((n_loops, 3), dtype=np.float32)
            loop_bitan[:, 1] = 1.0
            loop_uv          = np.zeros((n_loops, 2), dtype=np.float32)

        # ── Build per-NIF-vertex unique set ──────────────────────────────
        loop_pos = vert_co[loop_vert]           # (L, 3)
        loop_all = np.concatenate(
            [loop_pos, loop_no, loop_tan, loop_uv], axis=1
        )   # (L, 11)

        _, inv, first_occurrence = np.unique(loop_all, axis=0,
                                            return_inverse=True,
                                            return_index=True)

        # ── Triangles ─────────────────────────────────────────────────────
        # After bmesh triangulation every polygon has exactly 3 loops at
        # consecutive indices (loop_start, loop_start+1, loop_start+2).
        # Reading from mesh.polygons is always current; loop_triangles may lag.
        poly_loop_starts = np.zeros(n_tris, dtype=np.int32)
        mesh.polygons.foreach_get('loop_start', poly_loop_starts)
        blend_tri_loops = np.stack(
            [poly_loop_starts, poly_loop_starts + 1, poly_loop_starts + 2],
            axis=1,
        )   # (T, 3) – Blender loop indices per triangle
        nif_tris = inv[blend_tri_loops].astype(np.int32)   # (T, 3)

        # ── Final per-NIF-vertex arrays ───────────────────────────────────
        sel_idx      = first_occurrence          # indices into loop arrays
        nif_pos      = loop_pos[sel_idx]         # (N, 3)
        nif_no       = loop_no[sel_idx]          # (N, 3)
        nif_tan_raw  = loop_tan[sel_idx]         # (N, 3) blender tangent
        nif_bitan_raw= loop_bitan[sel_idx]       # (N, 3) blender bitangent
        nif_uv       = loop_uv[sel_idx]          # (N, 2)

        # NIF tangent convention (matches niftools set_bs_geom_data):
        #   nif.tangent_field   = -blender_bitangent
        #   nif.bitangent_xyz   = +blender_tangent
        nif_tangents = -nif_bitan_raw
        nif_bitan    =  nif_tan_raw

        return nif_pos, nif_no, nif_tangents, nif_bitan, nif_uv, nif_tris
    finally:
        eval_obj.to_mesh_clear()


# ---------------------------------------------------------------------------
# Texture path extraction
# ---------------------------------------------------------------------------

_SLOT_KEYWORDS = {
    'Base':     0,   # diffuse/albedo  → slot 0
    'Normal':   1,   # normal map      → slot 1
    'Glow':     2,   # emissive        → slot 2
    'Specular': 3,   # specular        → slot 3
}

def _get_texture_paths(obj) -> list:
    """Extract FO4-relative texture paths from the object's first material."""
    paths = [''] * 9
    mat = (obj.material_slots[0].material
           if obj.material_slots else None)
    if not mat or not mat.use_nodes:
        return paths
    for node in mat.node_tree.nodes:
        if node.type != 'TEX_IMAGE' or not node.image:
            continue
        label = node.label or node.name
        for kw, slot in _SLOT_KEYWORDS.items():
            if kw in label:
                raw  = node.image.filepath_raw.replace('\\', '/')
                low  = raw.lower()
                idx  = low.find('textures/')
                path = (raw[idx:].replace('/', '\\')
                        if idx >= 0 else Path(raw).name)
                paths[slot] = path
                break
    return paths


# ---------------------------------------------------------------------------
# NIF binary helpers
# ---------------------------------------------------------------------------

def _sized_string(s: str) -> bytes:
    """SizedString: uint32 length + UTF-8 bytes (no null terminator)."""
    b = s.encode('utf-8') if s else b''
    return struct.pack('<I', len(b)) + b


def _short_string(s: str) -> bytes:
    """ShortString: uint8 length + UTF-8 bytes (no null terminator).

    Clamps to 255 bytes to avoid struct.error on long paths; NIF
    author/script strings are always short in practice.
    """
    b = s.encode('utf-8') if s else b''
    if len(b) > 255:
        b = b[:255]
    return struct.pack('<B', len(b)) + b


def _ref(block_index: int) -> bytes:
    """NIF block reference: int32 LE.  Pass -1 for null."""
    return struct.pack('<i', block_index)


# ---------------------------------------------------------------------------
# Block writers
# ---------------------------------------------------------------------------

# ── BSFadeNode ──────────────────────────────────────────────────────────────
_IDENTITY_ROTATION = struct.pack('<9f', 1,0,0, 0,1,0, 0,0,1)

def _write_bsfadenode(name_str_idx: int, child_block_idx: int) -> bytes:
    """Return the binary payload for a BSFadeNode block.

    NIF 20.2.0.7 / UserVersion2=130 field layout:
      NiObjectNET: name (int32), num_extra_data (uint32), controller (int32)
      NiAVObject:  flags (uint32), translation (3×f32), rotation (9×f32),
                   scale (f32), collision_object (int32),
                   bs_properties[2] (2×int32)  ← UserVersion2 >= 100
      NiNode:      num_children (uint32), children (int32 × N), num_effects (uint32)
    """
    buf = bytearray()
    # NiObjectNET
    buf += struct.pack('<i',  name_str_idx)   # name (string ref)
    buf += struct.pack('<I',  0)               # num_extra_data
    buf += struct.pack('<i', -1)               # controller (null)
    # NiAVObject
    buf += struct.pack('<I', 14)              # flags
    buf += struct.pack('<3f', 0.0, 0.0, 0.0) # translation
    buf += _IDENTITY_ROTATION                  # rotation (identity 3×3)
    buf += struct.pack('<f', 1.0)             # scale
    buf += struct.pack('<i', -1)              # collision_object (null)
    buf += struct.pack('<2i', -1, -1)         # bs_properties[2] (null, null)
    # NiNode
    buf += struct.pack('<I', 1)               # num_children
    buf += struct.pack('<i', child_block_idx) # children[0] → BSTriShape
    buf += struct.pack('<I', 0)               # num_effects
    return bytes(buf)


# ── BSLightingShaderProperty ────────────────────────────────────────────────

# Default shader flags for a standard FO4 static mesh:
#   SF1  0x80400201  – TangentSpace | CastShadows | ZBufferWrite | Specular
#   SF2  0x00000001  – ZBufferTest
# Note: the old comment mentioned 0x21 (bit 5 set) for "Double_Sided" but
# backface culling should be OFF by default; the correct ZBufferTest-only
# value for a standard opaque mesh is 0x00000001.
_DEFAULT_SF1 = 0x80400201
_DEFAULT_SF2 = 0x00000001

# Per-mesh-type shader flag overrides for the native writer.
# Keys match the FO4_MESH_TYPE_ITEMS identifiers used in export_helpers.
#
# FO4 BSLightingShaderProperty ShaderFlags1 bit definitions:
#   bit  0  (0x00000001) – Specular
#   bit  1  (0x00000002) – Skinned (bone transforms applied by engine)
#   bit  9  (0x00000200) – Cast Shadows
#   bit 22  (0x00400000) – Tangent Space (required for normal-map lighting)
#   bit 31  (0x80000000) – ZBuffer Write
#
# FO4 BSLightingShaderProperty ShaderFlags2 bit definitions:
#   bit  0  (0x00000001) – ZBuffer Test
#   bit  4  (0x00000010) – Two Sided (leaves/foliage visible from both sides)
_MESH_TYPE_SF1 = {
    'STATIC':       0x80400201,
    'SKINNED':      0x80400203,  # + Skinned(0x02)
    'ARMOR':        0x80400203,  # + Skinned(0x02)
    'LOD':          0x80400201,
    'VEGETATION':   0x80400201,
    'FURNITURE':    0x80400201,
    'WEAPON':       0x80400201,
    'ARCHITECTURE': 0x80400201,
    # FLORA (harvestable plants, e.g. Mutfruit, Tato): SF1 is identical to
    # STATIC/VEGETATION.  The Two_Sided distinction is in SF2 (see below).
    'FLORA':        0x80400201,
    # ANIMATED: SF1 is identical to STATIC; animation data lives in
    # NiKeyframeController blocks that the native writer does not emit.
    # PyNifly/Niftools handles full ANIMATED export; this path is fallback only.
    'ANIMATED':     0x80400201,
    # DEBRIS: SF1 is identical to STATIC; the bhkCollisionObject/BSXFlags
    # blocks are outside scope of the native writer.
    'DEBRIS':       0x80400201,
    # AUTO: runtime auto-detect falls back to generic static flags.
    'AUTO':         0x80400201,
}
_MESH_TYPE_SF2 = {
    'STATIC':       0x00000001,
    'SKINNED':      0x00000001,
    'ARMOR':        0x00000001,
    'LOD':          0x00000001,
    'VEGETATION':   0x00000011,  # ZBufferTest(0x01) | Two_Sided(0x10)
    'FURNITURE':    0x00000001,
    'WEAPON':       0x00000001,
    'ARCHITECTURE': 0x00000001,
    # FLORA uses Two_Sided so the plant leaf quads render from both directions,
    # matching the behaviour of vanilla FO4 harvestable flora NIFs.
    'FLORA':        0x00000011,  # ZBufferTest(0x01) | Two_Sided(0x10)
    'ANIMATED':     0x00000001,
    'DEBRIS':       0x00000001,
    'AUTO':         0x00000001,
}

def _write_bslsp(name_str_idx: int, texset_block_idx: int,
                 sf1: int = _DEFAULT_SF1, sf2: int = _DEFAULT_SF2) -> bytes:
    """Return the binary payload for a BSLightingShaderProperty.

    FO4 (UserVersion2=130) field layout:
      NiObjectNET: name, num_extra_data, controller
      BSLightingShaderProperty:
        shader_flags_1 (uint32), shader_flags_2 (uint32)
        uv_offset (2×f32), uv_scale (2×f32)
        texture_set (int32 ref)
        emissive_color (3×f32), emissive_mult (f32)
        root_material (int32 string ref, null)
        alpha (f32)
        refraction_power (f32)
        smoothness (f32)   ← FO4 PBR field; was "Glossiness" in Skyrim NIFs
        specular_color (3×f32), specular_strength (f32)
        fresnel_power (f32)
        wetness fields ×6 (f32)
        lum_emittance (f32)
        exposure_offset (f32)
        final_exposure_min (f32)
        final_exposure_max (f32)

    Parameters
    ----------
    sf1 : int
        ShaderFlags1 override (default: _DEFAULT_SF1 for static meshes).
    sf2 : int
        ShaderFlags2 override (default: _DEFAULT_SF2 for static meshes).
        Set bit 4 (0x10) for vegetation Two_Sided rendering.
    """
    buf = bytearray()
    # NiObjectNET
    buf += struct.pack('<i',  name_str_idx)
    buf += struct.pack('<I',  0)               # num_extra_data
    buf += struct.pack('<i', -1)               # controller (null)
    # Shader flags (per-mesh-type values)
    buf += struct.pack('<I', sf1)
    buf += struct.pack('<I', sf2)
    # UV transform
    buf += struct.pack('<2f', 0.0, 0.0)       # uv_offset
    buf += struct.pack('<2f', 1.0, 1.0)       # uv_scale
    # Texture set reference
    buf += struct.pack('<i', texset_block_idx)
    # Emissive
    buf += struct.pack('<3f', 0.0, 0.0, 0.0)  # emissive_color
    buf += struct.pack('<f',  1.0)             # emissive_mult
    # Root material (null string ref)
    buf += struct.pack('<i', -1)
    # Standard PBR values
    buf += struct.pack('<f', 1.0)              # alpha
    buf += struct.pack('<f', 0.0)              # refraction_power
    buf += struct.pack('<f', 1.0)              # smoothness (PBR smoothness field; was "Glossiness" in pre-FO4 NIFs)
    buf += struct.pack('<3f', 1.0, 1.0, 1.0)  # specular_color
    buf += struct.pack('<f', 1.0)              # specular_strength
    buf += struct.pack('<f', 5.0)              # fresnel_power
    # Wetness control fields (6 floats, all default 0)
    buf += struct.pack('<6f', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
    # Luminance / exposure (FO4 additions)
    buf += struct.pack('<f', 0.0)              # lum_emittance
    buf += struct.pack('<f', 0.0)              # exposure_offset
    buf += struct.pack('<f', 0.0)              # final_exposure_min
    buf += struct.pack('<f', 0.0)              # final_exposure_max
    return bytes(buf)


# ── BSShaderTextureSet ───────────────────────────────────────────────────────

def _write_bsshader_texset(texture_paths: list) -> bytes:
    """Return the binary payload for a BSShaderTextureSet (9 slots)."""
    buf = bytearray()
    buf += struct.pack('<i', 9)  # num_textures (signed int in NIF)
    for i in range(9):
        path = (texture_paths[i] if i < len(texture_paths) else '')
        buf += _sized_string(path)
    return bytes(buf)


# ── BSTriShape ───────────────────────────────────────────────────────────────

# BSVertexDesc bit layout (packed into a uint64, little-endian):
#   bits  0-3  : vertex_data_size  (7 = 7 × 4-byte units = 28 bytes/vertex)
#   bit   4    : has_vertex
#   bit   5    : has_uvs
#   bit   7    : has_normals
#   bit   8    : has_tangents
#   bit   12   : full_precision  (1 = float32 positions, 0 = float16)
_VERTEX_DATA_SIZE  = 7       # 28 bytes per vertex
_VERTEX_DESC_FLAGS = (
    _VERTEX_DATA_SIZE        |   # bits 0-3
    (1 << 4)                 |   # vertex
    (1 << 5)                 |   # uvs
    (1 << 7)                 |   # normals
    (1 << 8)                 |   # tangents
    (1 << 12)                    # full_precision → float32 positions
)

def _pack_vertex(pos, bitan_x, uv, no, bitan_y, tan, bitan_z) -> bytes:
    """Pack one BSVertexData entry (28 bytes) in full-precision FO4 format."""
    return struct.pack(
        '<4f2H4B4B',
        float(pos[0]), float(pos[1]), float(pos[2]),  # position (3 × f32)
        float(bitan_x),                                # bitangent X (f32)
        _f32_to_f16_uint16(float(uv[0])),              # u  (f16)
        _f32_to_f16_uint16(1.0 - float(uv[1])),        # v  (f16, V-flip)
        _normal_to_byte(no[0]),                        # normal x
        _normal_to_byte(no[1]),                        # normal y
        _normal_to_byte(no[2]),                        # normal z
        _normal_to_byte(bitan_y),                      # bitangent Y
        _normal_to_byte(tan[0]),                       # tangent x
        _normal_to_byte(tan[1]),                       # tangent y
        _normal_to_byte(tan[2]),                       # tangent z
        _normal_to_byte(bitan_z),                      # bitangent Z
    )


def _write_bstrishape(
    name_str_idx:   int,
    shader_blk_idx: int,
    positions:      np.ndarray,
    normals:        np.ndarray,
    nif_tangents:   np.ndarray,
    nif_bitangents: np.ndarray,
    uvs:            np.ndarray,
    triangles:      np.ndarray,
) -> bytes:
    """Return the binary payload for a BSTriShape block."""
    n_verts = len(positions)
    n_tris  = len(triangles)
    data_size = (_VERTEX_DATA_SIZE * n_verts * 4) + (n_tris * 6)

    buf = bytearray()
    # NiObjectNET
    buf += struct.pack('<i',  name_str_idx)
    buf += struct.pack('<I',  0)               # num_extra_data
    buf += struct.pack('<i', -1)               # controller (null)
    # NiAVObject
    buf += struct.pack('<I', 14)               # flags
    buf += struct.pack('<3f', 0.0, 0.0, 0.0)   # translation
    buf += _IDENTITY_ROTATION                   # rotation
    buf += struct.pack('<f', 1.0)              # scale
    buf += struct.pack('<i', -1)               # collision_object (null)
    # bs_properties[2]: shader (slot 0), alpha (slot 1, null)
    buf += struct.pack('<2i', shader_blk_idx, -1)
    # BSShape / BSTriShape geometry
    buf += struct.pack('<Q', _VERTEX_DESC_FLAGS)  # vertex_desc (uint64)
    buf += struct.pack('<I', n_tris)              # num_triangles
    buf += struct.pack('<H', n_verts)             # num_vertices (uint16)
    buf += struct.pack('<I', data_size)           # data_size
    # Vertex data
    for i in range(n_verts):
        buf += _pack_vertex(
            positions[i],
            nif_bitangents[i][0],   # bitangent X → vertex W slot
            uvs[i],
            normals[i],
            nif_bitangents[i][1],   # bitangent Y → normal W slot
            nif_tangents[i],        # tangent XYZ
            nif_bitangents[i][2],   # bitangent Z → tangent W slot
        )
    # Triangle data
    for tri in triangles:
        buf += struct.pack('<3H', int(tri[0]), int(tri[1]), int(tri[2]))
    # Bounding sphere (center + radius) – computed from positions
    center = positions.mean(axis=0)
    radius = float(np.linalg.norm(positions - center, axis=1).max()) if n_verts else 0.0
    buf += struct.pack('<4f', float(center[0]), float(center[1]), float(center[2]), radius)
    return bytes(buf)


# ---------------------------------------------------------------------------
# NIF file assembly
# ---------------------------------------------------------------------------

def _build_nif(
    mesh_name:     str,
    positions:     np.ndarray,
    normals:       np.ndarray,
    nif_tangents:  np.ndarray,
    nif_bitangents:np.ndarray,
    uvs:           np.ndarray,
    triangles:     np.ndarray,
    texture_paths: list,
    mesh_type:     str = 'STATIC',
) -> bytes:
    """Assemble a complete NIF 20.2.0.7 byte string for a FO4 mesh.

    Parameters
    ----------
    mesh_type : str
        One of the keys in _MESH_TYPE_SF1 / _MESH_TYPE_SF2.  Controls which
        BSLightingShaderProperty shader flags are written into the NIF, ensuring
        the correct behaviour in-game for each mesh category:
          - STATIC / LOD / ARCHITECTURE: default opaque flags
          - SKINNED / ARMOR: Skinned bit set in SF1 (engine applies bone xforms)
          - VEGETATION: Two_Sided bit set in SF2 (leaf quads visible both sides)
          - FURNITURE / WEAPON: same as STATIC (special root-node handling
            is done via Niftools or post-processing, not by the native writer)
    """
    sf1 = _MESH_TYPE_SF1.get(mesh_type, _DEFAULT_SF1)
    sf2 = _MESH_TYPE_SF2.get(mesh_type, _DEFAULT_SF2)

    # ── Block indices (order matters for refs) ────────────────────────────
    # 0: BSFadeNode
    # 1: BSTriShape
    # 2: BSLightingShaderProperty
    # 3: BSShaderTextureSet

    # ── String table ──────────────────────────────────────────────────────
    # All block names, material names, etc. are in the string table.
    # Refs are indices into this table.  Null string is at index 0.
    shader_name  = 'Shader'
    strings      = [mesh_name, f'{mesh_name}:0', shader_name]
    # Index mapping:
    idx_fadenode = 0   # mesh_name
    idx_trishape = 1   # mesh_name + ':0'
    idx_shader   = 2   # 'Shader'

    # ── Serialize blocks ──────────────────────────────────────────────────
    blk_fadenode = _write_bsfadenode(idx_fadenode, child_block_idx=1)
    blk_trishape = _write_bstrishape(
        idx_trishape, shader_blk_idx=2,
        positions=positions, normals=normals,
        nif_tangents=nif_tangents, nif_bitangents=nif_bitangents,
        uvs=uvs, triangles=triangles,
    )
    blk_shader   = _write_bslsp(idx_shader, texset_block_idx=3, sf1=sf1, sf2=sf2)
    blk_texset   = _write_bsshader_texset(texture_paths)

    blocks = [blk_fadenode, blk_trishape, blk_shader, blk_texset]

    # ── Block type list ───────────────────────────────────────────────────
    block_type_names = [
        'BSFadeNode',
        'BSTriShape',
        'BSLightingShaderProperty',
        'BSShaderTextureSet',
    ]
    # Each block maps 1-to-1 to its type
    block_type_indices = [0, 1, 2, 3]   # int16 per block

    # ── NIF header ────────────────────────────────────────────────────────
    header = bytearray()

    # Header string (terminated by newline only – no null, no length prefix)
    header_string = b'Gamebryo File Format, Version 20.2.0.7\n'
    header += header_string

    # Version bytes (big-endian dotted notation)
    header += bytes([20, 2, 0, 7])

    # Endian byte: 1 = little-endian
    header += bytes([1])

    # User version (uint32 LE)
    header += struct.pack('<I', 12)

    # Num blocks (uint32 LE)
    header += struct.pack('<I', len(blocks))

    # BS Header:  bs_version (uint32 LE) + author + process_script + export_script
    # All three are ShortString (uint8 length + bytes); empty = b'\x00'
    header += struct.pack('<I', 130)  # bs_version
    header += _short_string('')       # author
    header += _short_string('')       # process_script
    header += _short_string('')       # export_script

    # Num block types (uint16 LE)
    header += struct.pack('<H', len(block_type_names))

    # Block type SizedStrings
    for t in block_type_names:
        header += _sized_string(t)

    # Block type indices (int16 LE per block)
    for idx in block_type_indices:
        header += struct.pack('<h', idx)

    # Block sizes (uint32 LE per block)
    for blk in blocks:
        header += struct.pack('<I', len(blk))

    # String table
    max_len = max((len(s) for s in strings), default=0)
    header += struct.pack('<I', len(strings))   # num_strings
    header += struct.pack('<I', max_len)         # max_string_length
    for s in strings:
        header += _sized_string(s)

    # Num groups (uint32 LE) = 0
    header += struct.pack('<I', 0)

    # ── Footer ────────────────────────────────────────────────────────────
    footer = bytearray()
    footer += struct.pack('<I', 1)   # num_roots
    footer += struct.pack('<i', 0)   # root_block_index (BSFadeNode = block 0)

    # ── Assemble ─────────────────────────────────────────────────────────
    out = bytes(header)
    for blk in blocks:
        out += blk
    out += bytes(footer)
    return out


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def export_fo4_nif(obj, filepath: str, mesh_type: str = 'STATIC') -> tuple:
    """Export a Blender mesh object as a Fallout 4 NIF file.

    The native writer handles STATIC, LOD, VEGETATION, FLORA, FURNITURE,
    WEAPON, ARCHITECTURE, ANIMATED, DEBRIS, and AUTO mesh types by producing
    a BSFadeNode → BSTriShape NIF with the correct per-type shader flags.

    SKINNED and ARMOR meshes require BSSkin::Instance / BSSubIndexTriShape
    which the native writer does not yet produce; those types return a failure
    tuple so the caller can fall back to PyNifly or Niftools.

    Note: for ANIMATED the NiKeyframeController data, and for DEBRIS/
    ARCHITECTURE the BSXFlags/bhkCollisionObject blocks, are outside the
    scope of this fallback writer.  Full support for those types requires
    PyNifly (BadDogSkyrim) or Niftools v0.1.1.

    Parameters
    ----------
    obj       : bpy.types.Object  – must be type 'MESH'
    filepath  : str               – output .nif path (parent dirs created)
    mesh_type : str               – one of the FO4_MESH_TYPE_ITEMS identifiers.
                                    Default is 'STATIC'.

    Returns
    -------
    (True,  message)  on success
    (False, message)  on failure
    """
    if obj.type != 'MESH':
        return False, f"Object '{obj.name}' is not a mesh"

    # SKINNED and ARMOR meshes need BSSubIndexTriShape + BSSkin::Instance.
    # The native writer only produces BSTriShape (static geometry), so we
    # decline these types early so the caller can try PyNifly or Niftools.
    if mesh_type in ('SKINNED', 'ARMOR'):
        return False, (
            f"Native NIF writer does not support {mesh_type} meshes "
            "(requires BSSkin::Instance / BSSubIndexTriShape). "
            "Install PyNifly v25 (BadDogSkyrim) or Niftools v0.1.1 for "
            "skinned-mesh NIF export."
        )

    # ── Extract mesh data ─────────────────────────────────────────────────
    try:
        positions, normals, nif_tangents, nif_bitangents, uvs, triangles = (
            _extract_mesh_data(obj)
        )
    except Exception as exc:
        traceback.print_exc()
        return False, f"Native NIF writer: failed to extract mesh data: {exc}"

    n_verts = len(positions)
    n_tris  = len(triangles)

    if n_verts > 65535:
        return False, (
            f"Native NIF writer: mesh has {n_verts} vertices (limit 65535). "
            "Decimate the mesh and retry."
        )
    if n_tris > 65535:
        return False, (
            f"Native NIF writer: mesh has {n_tris} triangles (limit 65535). "
            "Decimate the mesh and retry."
        )
    if n_verts == 0 or n_tris == 0:
        return False, "Native NIF writer: mesh has no geometry after triangulation"

    # ── Texture paths ─────────────────────────────────────────────────────
    texture_paths = _get_texture_paths(obj)

    # ── Assemble NIF bytes ────────────────────────────────────────────────
    try:
        nif_bytes = _build_nif(
            mesh_name      = obj.name,
            positions      = positions,
            normals        = normals,
            nif_tangents   = nif_tangents,
            nif_bitangents = nif_bitangents,
            uvs            = uvs,
            triangles      = triangles,
            texture_paths  = texture_paths,
            mesh_type      = mesh_type,
        )
    except Exception as exc:
        traceback.print_exc()
        return False, f"Native NIF writer: failed to build NIF binary: {exc}"

    # ── Write to disk ─────────────────────────────────────────────────────
    try:
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'wb') as fh:
            fh.write(nif_bytes)
    except Exception as exc:
        return False, f"Native NIF writer: could not write '{filepath}': {exc}"

    tex_note = ''
    diffuse = texture_paths[0] if texture_paths else ''
    if diffuse:
        tex_note = f" (diffuse: {diffuse})"
    return True, (
        f"Exported NIF via native writer [{mesh_type}]: {filepath}"
        f" ({n_verts} verts, {n_tris} tris){tex_note}"
    )
