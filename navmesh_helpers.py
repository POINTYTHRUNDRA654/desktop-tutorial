"""
navmesh_helpers.py
Navmesh geometry validation utilities for Fallout 4 modding.

Navmesh objects exported from Blender to the Creation Kit (CK) must meet
several requirements before the CK will accept them:

  - All faces must be triangles.
  - No non-manifold (boundary) edges — the mesh must be a closed surface.
  - Scale must be applied (1, 1, 1).
  - No zero-area (degenerate) triangles.
  - Vertex / triangle counts within recommended limits.
  - No isolated (unconnected) vertices.

Usage from an operator::

    result = NavmeshHelpers.validate(obj)
    if result['ok']:
        ...  # no errors
    for msg in result['errors']:
        ...  # fix each error before exporting

The ``tag_as_navmesh`` helper marks an object as navmesh in the viewport
(wire display, green colour, custom property) so it is easy to identify.
"""

from __future__ import annotations

try:
    import bpy
    import bmesh
    from mathutils import Vector
except ImportError:
    bpy = None      # type: ignore[assignment]
    bmesh = None    # type: ignore[assignment]
    Vector = None   # type: ignore[assignment]

# ── FO4 navmesh practical limits ──────────────────────────────────────────────
_MAX_VERTS = 32767    # uint16 index limit in CK
_MAX_TRIS = 16384     # practical CK stability limit
_VERT_MERGE_DIST = 0.001   # Blender units — threshold for near-duplicate check
_ZERO_AREA_THRESHOLD = 1e-6


class NavmeshHelpers:
    """Validate navmesh geometry for FO4 CK compatibility."""

    # Public constants so tests / operators can reference the limits
    MAX_VERTS = _MAX_VERTS
    MAX_TRIS = _MAX_TRIS

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    @staticmethod
    def validate(obj) -> dict:
        """Run all navmesh checks on *obj*.

        Returns a dict with the following keys:

        ``ok``
            ``True`` when there are no *errors* (warnings are acceptable).
        ``errors``
            List of strings — issues that will prevent CK import.
        ``warnings``
            List of strings — issues that may cause CK problems.
        ``infos``
            List of strings — informational statistics.
        ``stats``
            Dict with ``verts``, ``edges``, ``faces``,
            ``non_tri``, ``boundary_edges``, ``degenerate`` counts.
        """
        if bpy is None or bmesh is None:
            return {
                'ok': False,
                'errors': ["bpy / bmesh not available (running outside Blender)"],
                'warnings': [],
                'infos': [],
                'stats': {},
            }

        errors: list = []
        warnings: list = []
        infos: list = []

        if not obj or obj.type != 'MESH':
            return {
                'ok': False,
                'errors': ["Object must be a mesh"],
                'warnings': [],
                'infos': [],
                'stats': {},
            }

        me = obj.data
        bm = bmesh.new()
        bm.from_mesh(me)
        bm.verts.ensure_lookup_table()
        bm.edges.ensure_lookup_table()
        bm.faces.ensure_lookup_table()

        n_verts = len(bm.verts)
        n_edges = len(bm.edges)
        n_faces = len(bm.faces)

        # 1. All faces must be triangles
        non_tri = [f for f in bm.faces if len(f.verts) != 3]
        if non_tri:
            errors.append(
                f"{len(non_tri)} non-triangle face(s). "
                "FO4 navmesh requires all faces to be triangles. "
                "Apply Triangulate (Ctrl+T in Edit Mode) before exporting."
            )

        # 2. Non-manifold (boundary / open) edges
        boundary_edges = [e for e in bm.edges if not e.is_manifold]
        if boundary_edges:
            warnings.append(
                f"{len(boundary_edges)} boundary/non-manifold edge(s). "
                "The CK will reject navmesh with open boundary edges. "
                "Ensure the navmesh is a closed manifold surface."
            )

        # 3. Vertex count limit
        if n_verts > _MAX_VERTS:
            errors.append(
                f"Vertex count {n_verts} exceeds the limit ({_MAX_VERTS}). "
                "Split the navmesh into multiple smaller objects."
            )
        elif n_verts > int(_MAX_VERTS * 0.8):
            warnings.append(
                f"Vertex count {n_verts} is approaching the limit ({_MAX_VERTS}). "
                "Consider splitting to improve CK stability."
            )

        # 4. Triangle count limit
        if n_faces > _MAX_TRIS:
            errors.append(
                f"Triangle count {n_faces} exceeds the recommended limit ({_MAX_TRIS}). "
                "Split the navmesh into smaller pieces."
            )

        # 5. Degenerate (zero-area) triangles
        degenerate = [f for f in bm.faces if f.calc_area() < _ZERO_AREA_THRESHOLD]
        if degenerate:
            errors.append(
                f"{len(degenerate)} degenerate/zero-area triangle(s). "
                "These cause CK pathfinding to hang or crash. "
                "Delete or merge the overlapping vertices."
            )

        # 6. Near-duplicate vertices
        bm_test = bm.copy()
        n_before = len(bm_test.verts)
        bmesh.ops.remove_doubles(bm_test, verts=bm_test.verts, dist=_VERT_MERGE_DIST)
        n_after = len(bm_test.verts)
        bm_test.free()
        if n_after < n_before:
            warnings.append(
                f"{n_before - n_after} near-duplicate vertex/vertices "
                f"(within {_VERT_MERGE_DIST} BU). "
                "Merge them (Alt+M → By Distance) to prevent CK import issues."
            )

        # 7. Unapplied scale
        s = obj.scale
        if abs(s.x - 1.0) > 0.001 or abs(s.y - 1.0) > 0.001 or abs(s.z - 1.0) > 0.001:
            errors.append(
                f"Unapplied scale ({s.x:.3f}, {s.y:.3f}, {s.z:.3f}). "
                "Apply scale (Ctrl+A → Scale) before exporting to CK."
            )

        # 8. Large vertical extent — multi-floor navmesh warning
        if bm.verts:
            z_vals = [v.co.z for v in bm.verts]
            z_span = max(z_vals) - min(z_vals)
            if z_span > 100.0:
                warnings.append(
                    f"Navmesh spans {z_span:.1f} BU vertically. "
                    "FO4 navmesh should be relatively flat. "
                    "Use separate navmesh objects for different floor levels."
                )

        # 9. Isolated vertices (not attached to any face)
        isolated = [v for v in bm.verts if not v.link_faces]
        if isolated:
            warnings.append(
                f"{len(isolated)} isolated vertex/vertices (not part of any face). "
                "These are ignored by the CK but inflate the vertex count."
            )

        bm.free()

        infos.append(
            f"Vertices: {n_verts}  |  Edges: {n_edges}  |  Triangles: {n_faces}"
        )

        return {
            'ok': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'infos': infos,
            'stats': {
                'verts': n_verts,
                'edges': n_edges,
                'faces': n_faces,
                'non_tri': len(non_tri),
                'boundary_edges': len(boundary_edges),
                'degenerate': len(degenerate),
            },
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def tag_as_navmesh(obj) -> tuple:
        """Tag *obj* as a FO4 navmesh in the viewport.

        Sets a ``fo4_navmesh`` custom property, switches the display to
        wireframe, and tints the object green so navmesh objects are easy
        to distinguish from regular meshes in the viewport.

        Returns ``(success: bool, message: str)``.
        """
        if not obj or obj.type != 'MESH':
            return False, "Object must be a mesh"

        obj["fo4_navmesh"] = True
        obj.display_type = 'WIRE'
        obj.color = (0.0, 0.8, 0.0, 0.6)   # green, semi-transparent

        # Prefix name for easy identification
        if not obj.name.startswith("NavMesh"):
            obj.name = f"NavMesh_{obj.name}"

        return True, f"Tagged '{obj.name}' as navmesh (wire / green display)"

    @staticmethod
    def is_navmesh(obj) -> bool:
        """Return ``True`` when *obj* has been tagged as a navmesh."""
        if not obj:
            return False
        return bool(obj.get("fo4_navmesh"))

    @staticmethod
    def format_report(result: dict) -> str:
        """Format a validation *result* dict as a human-readable string."""
        lines = []
        status = "PASS" if result.get('ok') else "FAIL"
        lines.append(f"Navmesh Validation: {status}")
        lines.append("-" * 40)
        for msg in result.get('infos', []):
            lines.append(f"  INFO    {msg}")
        for msg in result.get('errors', []):
            lines.append(f"  ERROR   {msg}")
        for msg in result.get('warnings', []):
            lines.append(f"  WARN    {msg}")
        return "\n".join(lines)


# ── Module register / unregister (no bpy classes — nothing to do) ─────────────

def register():
    pass


def unregister():
    pass
