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

    @staticmethod
    def export_bodyslide_xml(
        obj,
        tri_path: str,
        output_name: str,
        group_name: str = "Custom",
    ) -> tuple:
        """Generate BodySlide SliderSet and SliderGroups XML files.

        Parameters
        ----------
        obj :
            Blender mesh object with shape keys.
        tri_path :
            Absolute path to the exported ``.tri`` file (used to resolve the
            ``CalienteTools/`` directory relative to the ``Data/`` root).
        output_name :
            Name used for the SliderSet, OutputFile stem, and XML file name.
        group_name :
            BodySlide group the slider set will appear under (default "Custom").

        Returns
        -------
        ``(success: bool, message: str)``
        """
        try:
            blocks = obj.data.shape_keys.key_blocks if (obj and obj.data.shape_keys) else []
            basis_name = blocks[0].name if blocks else "Basis"
            key_names = [k.name for k in blocks if k.name != basis_name]

            # ── Locate the Data/ root ─────────────────────────────────────────
            # Walk up from the .tri location to find a directory named "Data".
            tri_abs = os.path.abspath(tri_path)
            search = os.path.dirname(tri_abs)
            data_root = None
            for _ in range(10):
                if os.path.basename(search).lower() == "data":
                    data_root = search
                    break
                parent = os.path.dirname(search)
                if parent == search:
                    break
                search = parent
            if data_root is None:
                # Fall back: place CalienteTools next to the .tri file
                data_root = os.path.dirname(tri_abs)

            slider_sets_dir = os.path.join(
                data_root, "CalienteTools", "BodySlide", "SliderSets"
            )
            slider_groups_dir = os.path.join(
                data_root, "CalienteTools", "BodySlide", "SliderGroups"
            )
            os.makedirs(slider_sets_dir, exist_ok=True)
            os.makedirs(slider_groups_dir, exist_ok=True)

            # Relative NIF path (BodySlide expects the companion .nif path)
            try:
                rel_nif = os.path.relpath(
                    os.path.splitext(tri_abs)[0] + ".nif", data_root
                ).replace("\\", "/")
            except ValueError:
                rel_nif = f"meshes/{output_name}.nif"

            # ── SliderSet XML ─────────────────────────────────────────────────
            sliders_xml = ""
            for key_name in key_names:
                sliders_xml += (
                    f'            <Slider name="{key_name}" hidden="false"'
                    f' inverted="false" zap="false" uv_name="" default="0"'
                    f' small="0" big="100"/>\n'
                )

            slider_set_content = (
                '<?xml version="1.0" encoding="utf-8"?>\n'
                '<SliderSetInfo version="1">\n'
                f'    <SliderSet name="{output_name}" baseShape="{output_name}" source="CRAFT">\n'
                f'        <OutputFile>{rel_nif}</OutputFile>\n'
                '        <Sliders>\n'
                f'{sliders_xml}'
                '        </Sliders>\n'
                '        <Groups>\n'
                f'            <Group name="{group_name}"/>\n'
                '        </Groups>\n'
                '    </SliderSet>\n'
                '</SliderSetInfo>\n'
            )

            slider_set_path = os.path.join(slider_sets_dir, f"{output_name}.xml")
            with open(slider_set_path, 'w', encoding='utf-8') as fh:
                fh.write(slider_set_content)

            # ── SliderGroups XML ──────────────────────────────────────────────
            slider_group_content = (
                '<?xml version="1.0" encoding="utf-8"?>\n'
                '<SliderGroups>\n'
                f'    <Group name="{group_name}">\n'
                f'        <Member name="{output_name}"/>\n'
                '    </Group>\n'
                '</SliderGroups>\n'
            )

            slider_group_path = os.path.join(slider_groups_dir, f"{group_name}.xml")
            with open(slider_group_path, 'w', encoding='utf-8') as fh:
                fh.write(slider_group_content)

            return (
                True,
                f"Generated SliderSet XML at: {slider_set_path}",
            )
        except Exception as exc:
            return False, f"BodySlide XML export failed: {exc}"


# ── Module register / unregister (no bpy classes — nothing to do) ─────────────


# ---------------------------------------------------------------------------
# Mossy AI export delegation
# ---------------------------------------------------------------------------

def _delegate_to_mossy(operator_id: str, params: dict = None) -> tuple:
    """Delegate a heavy export operation to Mossy via the bridge operator call.

    Mossy can run ck-cmd, Havok tools, NVTT and other external processes
    without requiring them on the local PATH.  Returns (success, message).
    """
    try:
        from . import mossy_link
        ok, msg = mossy_link.check_bridge()
        if not ok:
            return False, f"Mossy bridge offline: {msg}"
        result = mossy_link.install_package_via_mossy(
            package=operator_id,
            github_url=None,
            timeout=120,
        )
        return result
    except Exception as exc:
        return False, f"Mossy delegation error: {exc}"


def _safe_subprocess(cmd: list, timeout: int = 120, cwd: str = None) -> tuple:
    """Run a subprocess with proper timeout and error handling.

    Returns (success, stdout+stderr combined, returncode).
    """
    import subprocess
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            timeout=timeout, cwd=cwd,
        )
        output = (result.stdout or "") + (result.stderr or "")
        return result.returncode == 0, output, result.returncode
    except subprocess.TimeoutExpired:
        return False, f"Process timed out after {timeout}s", -1
    except FileNotFoundError:
        return False, f"Executable not found: {cmd[0]}", -1
    except Exception as exc:
        return False, str(exc), -1


def register():
    pass


def unregister():
    pass
