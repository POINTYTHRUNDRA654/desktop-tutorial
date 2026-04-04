"""
tri_export_helpers.py
Export Blender shape keys as Fallout 4 .tri morph files (FRTRI003 format).

The .tri format is used by FO4 for head/face morphs (facial expressions,
race sliders, body morphs).  Each shape key in Blender becomes one named
morph in the exported file.

Format reference (FRTRI003 — used by FO4, SSE, and later Bethesda titles):
  8 bytes  — magic "FRTRI003"
  uint32   — vertex count
  uint32   — triangle count
  uint32   — quad count (always 0 for FO4)
  uint16   — flags (0)
  uint16   — morph count
  uint32   — additional-data count (0)
  float[V*3]   — base vertex positions (x, y, z) from the Basis shape key
  uint16[T*3]  — triangle vertex indices
  Per morph (M × each):
    char[40]  — null-padded morph name
    char[216] — reserved (zeros)
    float     — scale multiplier (max delta / 32767)
    int16[V*3]— vertex deltas (dx, dy, dz) scaled by multiplier

Usage from an operator::

    ok, msg = TRIExportHelpers.export_tri(context.active_object, "/path/out.tri")
"""

from __future__ import annotations

import os
import struct

try:
    import bpy
    import bmesh
except ImportError:
    bpy = None  # type: ignore[assignment]
    bmesh = None  # type: ignore[assignment]

# ── Format constants ───────────────────────────────────────────────────────────
_TRI_MAGIC = b"FRTRI003"
_MORPH_NAME_SIZE = 256    # total bytes per morph name field
_MORPH_NAME_USABLE = 40   # usable ASCII name bytes (remainder is zero padding)
_INT16_MAX = 32767


class TRIExportHelpers:
    """Export shape keys to FO4 .tri morph files."""

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    @staticmethod
    def can_export(obj) -> tuple:
        """Return ``(ok: bool, message: str)`` for *obj*.

        Returns True when the object can produce a valid .tri file, i.e.
        it is a mesh with at least two shape keys (Basis + one morph).
        """
        if not obj or obj.type != 'MESH':
            return False, "Active object must be a mesh"
        if not obj.data.shape_keys:
            return False, "Mesh has no shape keys; add a Basis key first"
        blocks = obj.data.shape_keys.key_blocks
        if len(blocks) < 2:
            return False, "Mesh must have at least one morph shape key (plus Basis)"
        return True, "OK"

    @staticmethod
    def morph_names(obj) -> list:
        """Return a list of morph shape key names for *obj* (excludes Basis)."""
        ok, _ = TRIExportHelpers.can_export(obj)
        if not ok:
            return []
        blocks = obj.data.shape_keys.key_blocks
        basis_name = blocks[0].name
        return [k.name for k in blocks if k.name != basis_name]

    @staticmethod
    def export_tri(obj, filepath: str, basis_name: str = "") -> tuple:
        """Write a FO4 .tri morph file for *obj* to *filepath*.

        Parameters
        ----------
        obj :
            Blender mesh object with shape keys.
        filepath :
            Destination path; the extension should be ``.tri``.
        basis_name :
            Name of the basis/reference shape key.  When empty (default)
            the first key in the block list is used as the basis.

        Returns
        -------
        ``(success: bool, message: str)``
        """
        if bpy is None or bmesh is None:
            return False, "bpy / bmesh not available (running outside Blender)"

        ok, msg = TRIExportHelpers.can_export(obj)
        if not ok:
            return False, msg

        blocks = obj.data.shape_keys.key_blocks

        # Resolve basis key
        basis_key = blocks.get(basis_name) if basis_name else None
        if basis_key is None:
            basis_key = blocks[0]

        morph_keys = [k for k in blocks if k != basis_key]
        if not morph_keys:
            return False, "No morph shape keys found (only Basis key present)"

        n_verts = len(obj.data.vertices)

        # ── Build triangulated face list ───────────────────────────────────────
        depsgraph = bpy.context.evaluated_depsgraph_get()
        eval_obj = obj.evaluated_get(depsgraph)
        eval_mesh = eval_obj.to_mesh()
        try:
            bm = bmesh.new()
            bm.from_mesh(eval_mesh)
            bmesh.ops.triangulate(bm, faces=bm.faces[:])
            bm.verts.ensure_lookup_table()
            bm.faces.ensure_lookup_table()

            triangles = []
            for face in bm.faces:
                verts = face.verts
                if len(verts) == 3:
                    triangles.append((verts[0].index, verts[1].index, verts[2].index))

            bm.free()
        finally:
            eval_obj.to_mesh_clear()

        n_tris = len(triangles)
        if n_tris == 0:
            return False, "Mesh has no triangles after triangulation"

        # ── Collect basis vertex positions ─────────────────────────────────────
        basis_cos = [
            (basis_key.data[i].co.x,
             basis_key.data[i].co.y,
             basis_key.data[i].co.z)
            for i in range(n_verts)
        ]

        # ── Build morph delta arrays ───────────────────────────────────────────
        morph_data = []  # list of (name: str, multiplier: float, deltas: list[int])
        for key in morph_keys:
            deltas_f = []
            max_delta = 0.0
            for i in range(n_verts):
                dx = key.data[i].co.x - basis_cos[i][0]
                dy = key.data[i].co.y - basis_cos[i][1]
                dz = key.data[i].co.z - basis_cos[i][2]
                deltas_f.extend((dx, dy, dz))
                m = max(abs(dx), abs(dy), abs(dz))
                if m > max_delta:
                    max_delta = m

            # Scale so the largest delta maps to ±32767
            multiplier = max(max_delta, 1e-6) / _INT16_MAX

            deltas_i = [
                max(-32768, min(32767, int(round(v / multiplier))))
                for v in deltas_f
            ]
            morph_data.append((key.name, multiplier, deltas_i))

        # ── Write the .tri file ────────────────────────────────────────────────
        out_dir = os.path.dirname(os.path.abspath(filepath))
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        n_morphs = len(morph_data)
        with open(filepath, 'wb') as fh:
            # Header
            fh.write(_TRI_MAGIC)
            fh.write(struct.pack('<I', n_verts))
            fh.write(struct.pack('<I', n_tris))
            fh.write(struct.pack('<I', 0))           # quad count
            fh.write(struct.pack('<H', 0))           # flags
            fh.write(struct.pack('<H', n_morphs))
            fh.write(struct.pack('<I', 0))           # additional data count

            # Base vertex positions (from Basis shape key)
            for x, y, z in basis_cos:
                fh.write(struct.pack('<fff', x, y, z))

            # Triangle indices
            for t in triangles:
                fh.write(struct.pack('<HHH', t[0], t[1], t[2]))

            # Morphs
            for name, multiplier, deltas_i in morph_data:
                # Name: first 40 bytes usable, rest zero-padded to 256 total
                name_bytes = name.encode('ascii', errors='replace')[:_MORPH_NAME_USABLE]
                name_field = name_bytes + b'\x00' * (_MORPH_NAME_SIZE - len(name_bytes))
                fh.write(name_field)
                fh.write(struct.pack('<f', multiplier))
                for d in deltas_i:
                    fh.write(struct.pack('<h', d))

        return (
            True,
            f"Exported {n_morphs} morph(s) · {n_verts} vertices · "
            f"{n_tris} triangles → {filepath}",
        )


# ── Module register / unregister (no bpy classes — nothing to do) ─────────────

def register():
    pass


def unregister():
    pass
