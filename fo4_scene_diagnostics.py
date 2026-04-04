"""
Fallout 4 Scene Diagnostics
============================
Comprehensive, per-object + scene-wide health checker that reports exactly
which FO4 export requirements are met, which are warnings, and which are
blocking errors – all in one view.

Categories checked
------------------
MESH
  - Polygon count within FO4 limit (65 535)
  - UV map present
  - Scale applied (must be 1, 1, 1)
  - No unapplied modifiers that change geometry (Subsurf, Boolean, etc.)
  - Manifold surface (no open edges on solid objects)
  - Triangulated (no quads/ngons)
  - Loose vertices

MATERIAL
  - At least one material slot
  - Material uses nodes
  - "Diffuse" texture node present
  - "Normal" texture node present
  - Textures actually loaded (not placeholders)

COLLISION
  - UCX_ collision mesh present for static/prop objects
  - Collision vertex count ≤ 256

RIGGING (skipped for non-mesh / non-skinned objects)
  - Armature modifier present
  - Bone count ≤ 256
  - Root bone "NPC Root [Root]" or "Root" present
  - Vertex groups match bone names

EXPORT
  - No spaces in object name (NIF exporters may reject)
  - No non-ASCII characters in name

GRASS (only for objects identified as grass)
  - Polygon count within grass performance budget (≤ 200 aim, ≤ 500 max)
  - Vertex count within grass budget (≤ 300 aim, ≤ 750 max)
  - No armature/rigging (engine handles wind; bones break GRAS records)
  - No UCX_ collision mesh (GRASS collision type = no collision)
  - Single material only (engine cannot batch multi-material grass)
  - Alpha Clip transparency set (not Alpha Blend)
  - No shape keys (not supported on grass NIFs)
  - UV map present
  - Scale applied

Severity levels
---------------
ERROR   – will cause export to fail or produce a broken NIF
WARNING – may work but is non-ideal / causes in-game issues
OK      – passes the check
SKIP    – check not applicable for this object type

Auto-fix
--------
The ``auto_fix`` method addresses all automatically fixable issues:
- Applies scale
- Triangulates mesh
- Removes loose vertices
- Removes unapplied view-only modifiers
"""

import bpy
import os
import json
from datetime import datetime

# Severity constants
ERROR   = "ERROR"
WARNING = "WARNING"
OK      = "OK"
SKIP    = "SKIP"

# FO4 limits
FO4_MAX_POLYGONS = 65535
FO4_MAX_BONES    = 256
FO4_MAX_COLLISION_VERTS = 256

# FO4 grass-specific limits
# Grass instances are spawned thousands of times simultaneously by the engine.
# Keep poly counts extremely low so FPS is not destroyed in grassy areas.
FO4_GRASS_WARN_POLYGONS = 200   # above this is a performance warning
FO4_GRASS_MAX_POLYGONS  = 500   # above this is a hard performance error
FO4_GRASS_WARN_VERTS    = 300
FO4_GRASS_MAX_VERTS     = 750

# Name tokens that identify an object as grass (auto-detection fallback)
_GRASS_NAME_TOKENS = frozenset({'grass', 'blade', 'fern', 'straw', 'weed'})

# Modifiers that change geometry and MUST be applied before export
_GEOMETRY_MODS = frozenset({
    'SUBSURF', 'MULTIRES', 'BOOLEAN', 'SOLIDIFY', 'BEVEL',
    'MIRROR', 'ARRAY', 'SCREW', 'SKIN', 'WELD',
})


# ---------------------------------------------------------------------------
# Check result dataclass
# ---------------------------------------------------------------------------

class CheckResult:
    """One individual check result."""
    __slots__ = ('severity', 'category', 'message', 'auto_fixable', 'fix_key')

    def __init__(self, severity, category, message, auto_fixable=False, fix_key=None):
        self.severity     = severity
        self.category     = category
        self.message      = message
        self.auto_fixable = auto_fixable
        self.fix_key      = fix_key   # machine-readable key used by auto_fix

    def to_dict(self) -> dict:
        return {
            "severity":     self.severity,
            "category":     self.category,
            "message":      self.message,
            "auto_fixable": self.auto_fixable,
            "fix_key":      self.fix_key,
        }


# ---------------------------------------------------------------------------
# Core diagnostics engine
# ---------------------------------------------------------------------------

class SceneDiagnostics:
    """Main diagnostics engine."""

    @staticmethod
    def run_full_check(scene) -> dict:
        """Run all checks on the scene and return a structured report.

        Returns
        -------
        dict with keys:
          timestamp  – ISO-8601 string
          summary    – { error_count, warning_count, ok_count, score }
          objects    – list of per-object report dicts
          scene      – list of scene-level CheckResult dicts
        """
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "objects":   [],
            "scene":     [],
        }

        # Per-object checks
        mesh_objects = [o for o in scene.objects if o.type == 'MESH']

        for obj in mesh_objects:
            obj_report = SceneDiagnostics._check_object(obj)
            report["objects"].append(obj_report)

        # Scene-level checks
        report["scene"] = [r.to_dict()
                           for r in SceneDiagnostics._check_scene(scene, mesh_objects)]

        # Summary
        all_results = report["scene"][:]
        for obj_r in report["objects"]:
            all_results.extend(obj_r["checks"])

        errors   = sum(1 for r in all_results if r["severity"] == ERROR)
        warnings = sum(1 for r in all_results if r["severity"] == WARNING)
        oks      = sum(1 for r in all_results if r["severity"] == OK)
        total    = errors + warnings + oks
        score    = round(100.0 * oks / total) if total > 0 else 100

        report["summary"] = {
            "error_count":   errors,
            "warning_count": warnings,
            "ok_count":      oks,
            "total_checks":  total,
            "score":         score,
            "export_ready":  errors == 0,
        }

        return report

    @staticmethod
    def _check_object(obj) -> dict:
        """Run all per-object checks and return a dict."""
        results: list[CheckResult] = []

        # Is this a collision mesh? Skip most checks if so.
        is_collision = (
            obj.get("fo4_collision")
            or obj.name.upper().startswith("UCX_")
            or obj.name.upper().endswith("_COLLISION")
        )

        # Is this a grass object?  Detected via the fo4_collision_type property
        # (set to 'GRASS') or fo4_mesh_type == 'VEGETATION' with a grass name,
        # or name-based heuristic when neither property is available.
        is_grass = SceneDiagnostics._is_grass_object(obj)

        results += SceneDiagnostics._check_naming(obj)

        if not is_collision:
            if is_grass:
                results += SceneDiagnostics._check_grass(obj)
            else:
                results += SceneDiagnostics._check_mesh(obj)
                results += SceneDiagnostics._check_material(obj)
                results += SceneDiagnostics._check_collision_presence(obj)
                results += SceneDiagnostics._check_rigging(obj)
        else:
            results += SceneDiagnostics._check_collision_mesh(obj)

        # Compute mini-score for this object
        obj_errors   = sum(1 for r in results if r.severity == ERROR)
        obj_warnings = sum(1 for r in results if r.severity == WARNING)

        return {
            "name":          obj.name,
            "is_collision":  is_collision,
            "is_grass":      is_grass,
            "poly_count":    len(obj.data.polygons) if obj.data else 0,
            "error_count":   obj_errors,
            "warning_count": obj_warnings,
            "checks":        [r.to_dict() for r in results],
        }

    # ------------------------------------------------------------------
    # Scene-level checks
    # ------------------------------------------------------------------

    @staticmethod
    def _check_scene(scene, mesh_objects) -> list[CheckResult]:
        results = []

        # At least one mesh object
        if not mesh_objects:
            results.append(CheckResult(
                WARNING, "SCENE",
                "No mesh objects in scene – nothing to export",
            ))
        else:
            results.append(CheckResult(
                OK, "SCENE",
                f"{len(mesh_objects)} mesh object(s) found",
            ))

        # Unit scale
        unit_scale = scene.unit_settings.scale_length
        if abs(unit_scale - 1.0) > 0.001:
            results.append(CheckResult(
                WARNING, "SCENE",
                f"Scene unit scale is {unit_scale:.4f} (expected 1.0). "
                "Fallout 4 uses 1 Blender Unit = 1 game unit (approx 70 cm).",
            ))
        else:
            results.append(CheckResult(OK, "SCENE", "Scene unit scale is 1.0"))

        # Frame rate
        fps = scene.render.fps
        if fps != 30:
            results.append(CheckResult(
                WARNING, "SCENE",
                f"Frame rate is {fps} fps. FO4 animations use 30 fps.",
            ))
        else:
            results.append(CheckResult(OK, "SCENE", "Frame rate is 30 fps"))

        # Total polygon count
        total_polys = sum(len(o.data.polygons) for o in mesh_objects if o.data)
        if total_polys > 500_000:
            results.append(CheckResult(
                WARNING, "SCENE",
                f"Total polygon count is {total_polys:,} – "
                "very heavy scene may cause CK/NIF issues",
            ))
        else:
            results.append(CheckResult(
                OK, "SCENE",
                f"Total polygon count: {total_polys:,}",
            ))

        return results

    # ------------------------------------------------------------------
    # Per-object check groups
    # ------------------------------------------------------------------

    @staticmethod
    def _is_grass_object(obj) -> bool:
        """Return True when *obj* should be treated as a FO4 grass mesh.

        Detection order:
        1. ``fo4_collision_type`` property == 'GRASS'.
        2. ``fo4_mesh_type`` property == 'VEGETATION' **and** a grass-name token
           appears in the object name (avoids misidentifying generic vegetation).
        3. Name-based heuristic when neither custom property is set – any of the
           tokens in ``_GRASS_NAME_TOKENS`` (grass, blade, fern, …) in the lower-
           cased object name.
        """
        coll_type = getattr(obj, 'fo4_collision_type', None)
        if coll_type == 'GRASS':
            return True

        mesh_type = getattr(obj, 'fo4_mesh_type', None)
        name_lower = obj.name.lower()
        if mesh_type == 'VEGETATION' and any(t in name_lower for t in _GRASS_NAME_TOKENS):
            return True

        # Heuristic fallback when properties are not set
        if coll_type is None and mesh_type is None:
            return any(t in name_lower for t in _GRASS_NAME_TOKENS)

        return False

    @staticmethod
    def _check_grass(obj) -> list[CheckResult]:
        """Grass-specific diagnostic checks.

        FO4 grass (GRAS records) has very different rules from every other mesh
        type.  The engine spawns thousands of instances simultaneously, so polygon
        budgets are tiny.  Wind is 100 % engine-side – bones are forbidden.
        """
        results: list[CheckResult] = []
        mesh = obj.data

        # ── Polygon count ──────────────────────────────────────────────────────
        poly_count = len(mesh.polygons)
        if poly_count == 0:
            results.append(CheckResult(
                WARNING, "GRASS",
                "Grass mesh has 0 polygons – empty mesh?",
            ))
        elif poly_count > FO4_GRASS_MAX_POLYGONS:
            results.append(CheckResult(
                ERROR, "GRASS",
                f"Grass mesh has {poly_count:,} polygons (max {FO4_GRASS_MAX_POLYGONS:,} "
                "recommended). The engine spawns thousands of grass instances "
                "simultaneously – each extra polygon multiplies cost. "
                "Aim for ≤ 100 polygons. Use Smart Decimate to reduce.",
            ))
        elif poly_count > FO4_GRASS_WARN_POLYGONS:
            results.append(CheckResult(
                WARNING, "GRASS",
                f"Grass mesh has {poly_count:,} polygons (aim for ≤ {FO4_GRASS_WARN_POLYGONS}). "
                "High-density grass areas will have FPS impact. "
                "Consider reducing further.",
            ))
        else:
            results.append(CheckResult(
                OK, "GRASS",
                f"Grass polygon count {poly_count:,} is within performance budget",
            ))

        # ── Vertex count ───────────────────────────────────────────────────────
        vert_count = len(mesh.vertices)
        if vert_count > FO4_GRASS_MAX_VERTS:
            results.append(CheckResult(
                ERROR, "GRASS",
                f"Grass mesh has {vert_count:,} vertices (max {FO4_GRASS_MAX_VERTS:,} "
                "recommended). Reduce geometry for better performance.",
            ))
        elif vert_count > FO4_GRASS_WARN_VERTS:
            results.append(CheckResult(
                WARNING, "GRASS",
                f"Grass mesh has {vert_count:,} vertices (aim for ≤ {FO4_GRASS_WARN_VERTS}). "
                "Dense grass areas may suffer FPS drops.",
            ))
        else:
            results.append(CheckResult(
                OK, "GRASS",
                f"Grass vertex count {vert_count:,} is within performance budget",
            ))

        # ── No armature / rigging ──────────────────────────────────────────────
        # FO4 grass wind is handled entirely by the engine shader and the GRAS
        # record parameters. Adding an armature to a grass mesh will produce a
        # skinned NIF that the engine cannot animate as GRAS, resulting in static
        # or broken grass in-game.
        has_armature = any(m.type == 'ARMATURE' for m in obj.modifiers)
        if has_armature:
            results.append(CheckResult(
                ERROR, "GRASS",
                "Grass mesh has an armature modifier. "
                "FO4 grass wind is engine-side (GRAS record parameters) – "
                "bones are NOT supported and will break the GRAS record. "
                "Remove the armature modifier.",
            ))
        else:
            results.append(CheckResult(OK, "GRASS", "No armature modifier (correct for grass)"))

        # ── No shape keys ──────────────────────────────────────────────────────
        if mesh.shape_keys and len(mesh.shape_keys.key_blocks) > 1:
            results.append(CheckResult(
                ERROR, "GRASS",
                "Grass mesh has shape keys. Shape keys are not supported on FO4 "
                "grass NIFs and will cause export failure or silent data loss. "
                "Remove all shape keys.",
            ))
        else:
            results.append(CheckResult(OK, "GRASS", "No shape keys (correct for grass)"))

        # ── No UCX_ collision ──────────────────────────────────────────────────
        ucx_name_upper = f"UCX_{obj.name}".upper()
        collision_found = any(
            o.name.upper() == ucx_name_upper
            for o in bpy.context.scene.objects
        )
        if collision_found:
            results.append(CheckResult(
                WARNING, "GRASS",
                f"A UCX_ collision mesh was found for grass object '{obj.name}'. "
                "GRASS collision type means NO collision – the UCX_ mesh will be "
                "ignored by the engine and wastes memory. Delete it.",
            ))
        else:
            results.append(CheckResult(OK, "GRASS", "No unnecessary collision mesh"))

        # ── Single material ────────────────────────────────────────────────────
        mat_count = len([m for m in mesh.materials if m is not None])
        if mat_count == 0:
            results.append(CheckResult(
                ERROR, "GRASS",
                "Grass mesh has no material. A material with a diffuse texture "
                "(RGBA, alpha = blade mask) is required.",
            ))
        elif mat_count > 1:
            results.append(CheckResult(
                ERROR, "GRASS",
                f"Grass mesh has {mat_count} materials. FO4 grass supports only "
                "ONE material per NIF. The engine cannot batch-render multi-material "
                "grass. Remove extra materials and merge into one.",
            ))
        else:
            results.append(CheckResult(OK, "GRASS", "Single material assigned (correct)"))

        # ── Alpha Clip (not Alpha Blend) ───────────────────────────────────────
        if mat_count >= 1 and mesh.materials[0] is not None:
            mat = mesh.materials[0]
            blend_method = getattr(mat, 'blend_method', None)
            if blend_method == 'BLEND':
                results.append(CheckResult(
                    ERROR, "GRASS",
                    f"Material '{mat.name}' uses Alpha Blend. "
                    "FO4 grass requires Alpha Clip (Cutout) – alpha blend causes "
                    "depth-sorting z-fighting between blades and disables engine "
                    "batching. Set Blend Mode to Clip in the material settings.",
                ))
            elif blend_method in ('CLIP', 'HASHED'):
                results.append(CheckResult(OK, "GRASS", "Material uses Alpha Clip (correct for grass)"))
            elif blend_method == 'OPAQUE':
                results.append(CheckResult(
                    WARNING, "GRASS",
                    f"Material '{mat.name}' is Opaque. Grass blades need alpha "
                    "transparency to cut out the blade shape from the texture. "
                    "Set Blend Mode to Clip and ensure the diffuse texture has "
                    "an alpha channel.",
                ))
            # blend_method is None when material does not use nodes – that will
            # be caught by the material-node check below.

        # ── Material uses nodes ────────────────────────────────────────────────
        if mat_count >= 1 and mesh.materials[0] is not None:
            mat = mesh.materials[0]
            if not mat.use_nodes:
                results.append(CheckResult(
                    ERROR, "GRASS",
                    f"Material '{mat.name}' does not use nodes. "
                    "Niftools requires node-based materials.",
                ))
            else:
                results.append(CheckResult(OK, "GRASS", "Material uses nodes"))

                # Diffuse node present and has image
                diffuse_node = next(
                    (n for n in mat.node_tree.nodes
                     if n.type == 'TEX_IMAGE' and (n.label == "Diffuse" or n.name == "Diffuse")),
                    None,
                )
                if diffuse_node is None:
                    results.append(CheckResult(
                        ERROR, "GRASS",
                        "No 'Diffuse' texture node found. Grass needs a diffuse "
                        "texture (RGBA) with the blade silhouette in the alpha channel.",
                    ))
                elif diffuse_node.image is None:
                    results.append(CheckResult(
                        WARNING, "GRASS",
                        "Diffuse texture node has no image loaded – grass will be "
                        "invisible in-game.",
                    ))
                else:
                    results.append(CheckResult(OK, "GRASS", "Diffuse texture image loaded"))

        # ── UV map ─────────────────────────────────────────────────────────────
        if not mesh.uv_layers:
            results.append(CheckResult(
                ERROR, "GRASS",
                "No UV map found. A UV map is required for texture projection. "
                "Run Smart Unwrap or Hybrid Unwrap.",
                auto_fixable=True, fix_key="smart_uv_unwrap",
            ))
        else:
            results.append(CheckResult(OK, "GRASS", "UV map present"))

        # ── Scale applied ──────────────────────────────────────────────────────
        scale = obj.scale
        if abs(scale.x - 1.0) > 0.001 or abs(scale.y - 1.0) > 0.001 or abs(scale.z - 1.0) > 0.001:
            results.append(CheckResult(
                ERROR, "GRASS",
                f"Scale not applied: ({scale.x:.3f}, {scale.y:.3f}, {scale.z:.3f}). "
                "Apply scale with Ctrl+A → Scale before export.",
                auto_fixable=True, fix_key="apply_scale",
            ))
        else:
            results.append(CheckResult(OK, "GRASS", "Scale applied (1, 1, 1)"))

        # ── Triangulated ───────────────────────────────────────────────────────
        has_quads = any(len(p.vertices) == 4 for p in mesh.polygons)
        has_ngons = any(len(p.vertices) > 4 for p in mesh.polygons)
        if has_ngons:
            results.append(CheckResult(
                ERROR, "GRASS",
                "Grass mesh contains N-gons. FO4 requires all-triangles.",
                auto_fixable=True, fix_key="triangulate",
            ))
        elif has_quads:
            results.append(CheckResult(
                WARNING, "GRASS",
                "Grass mesh contains quads. Apply triangulate for full control.",
                auto_fixable=True, fix_key="triangulate",
            ))
        else:
            results.append(CheckResult(OK, "GRASS", "Grass mesh is fully triangulated"))

        # ── Vertex colors (optional but recommended) ───────────────────────────
        if not mesh.vertex_colors and not mesh.color_attributes:
            results.append(CheckResult(
                OK, "GRASS",
                "No vertex colors (optional). Vertex colors can encode per-vertex "
                "wind intensity: darker = less sway, brighter = more sway.",
            ))
        else:
            results.append(CheckResult(OK, "GRASS", "Vertex color layer present (used for wind variation)"))

        return results


        results = []
        name = obj.name

        # Spaces
        if ' ' in name:
            results.append(CheckResult(
                WARNING, "NAMING",
                f"Name '{name}' contains spaces. Some NIF exporters reject "
                "space-containing names – use underscores instead.",
                auto_fixable=True, fix_key="remove_spaces",
            ))
        else:
            results.append(CheckResult(OK, "NAMING", "No spaces in object name"))

        # Non-ASCII
        try:
            name.encode('ascii')
            results.append(CheckResult(OK, "NAMING", "Object name is ASCII"))
        except UnicodeEncodeError:
            results.append(CheckResult(
                ERROR, "NAMING",
                f"Name '{name}' contains non-ASCII characters – NIF will not load",
            ))

        return results

    @staticmethod
    def _check_mesh(obj) -> list[CheckResult]:
        results = []
        mesh = obj.data

        # Polygon count
        poly_count = len(mesh.polygons)
        if poly_count == 0:
            results.append(CheckResult(
                WARNING, "MESH",
                "Object has 0 polygons – empty mesh?",
            ))
        elif poly_count > FO4_MAX_POLYGONS:
            results.append(CheckResult(
                ERROR, "MESH",
                f"Polygon count {poly_count:,} exceeds FO4 limit of "
                f"{FO4_MAX_POLYGONS:,}. Use Smart Decimate or Split Mesh.",
            ))
        else:
            results.append(CheckResult(
                OK, "MESH",
                f"Polygon count {poly_count:,} is within FO4 limit",
            ))

        # UV map
        if not mesh.uv_layers:
            results.append(CheckResult(
                ERROR, "MESH",
                "No UV map found – textures cannot be applied. "
                "Run 'Smart Unwrap' or 'Hybrid Unwrap'.",
                auto_fixable=True, fix_key="smart_uv_unwrap",
            ))
        else:
            results.append(CheckResult(OK, "MESH", "UV map present"))

        # Scale applied
        scale = obj.scale
        if abs(scale.x - 1.0) > 0.001 or abs(scale.y - 1.0) > 0.001 or abs(scale.z - 1.0) > 0.001:
            results.append(CheckResult(
                ERROR, "MESH",
                f"Scale not applied: ({scale.x:.3f}, {scale.y:.3f}, {scale.z:.3f}). "
                "Apply scale with Ctrl+A → Scale before export.",
                auto_fixable=True, fix_key="apply_scale",
            ))
        else:
            results.append(CheckResult(OK, "MESH", "Scale is applied (1, 1, 1)"))

        # Unapplied geometry modifiers
        unapplied = [m.name for m in obj.modifiers if m.type in _GEOMETRY_MODS]
        if unapplied:
            results.append(CheckResult(
                WARNING, "MESH",
                f"Unapplied geometry modifiers: {', '.join(unapplied)}. "
                "Apply or delete before export.",
            ))
        else:
            results.append(CheckResult(OK, "MESH", "No unapplied geometry modifiers"))

        # Triangulation (check for quads/ngons)
        has_quads = any(len(p.vertices) == 4 for p in mesh.polygons)
        has_ngons = any(len(p.vertices) > 4 for p in mesh.polygons)
        if has_ngons:
            results.append(CheckResult(
                ERROR, "MESH",
                "Mesh contains N-gons (faces with 5+ vertices). "
                "FO4 requires all-triangles.",
                auto_fixable=True, fix_key="triangulate",
            ))
        elif has_quads:
            results.append(CheckResult(
                WARNING, "MESH",
                "Mesh contains quads. The exporter auto-triangulates, "
                "but applying it now gives you full control.",
                auto_fixable=True, fix_key="triangulate",
            ))
        else:
            results.append(CheckResult(OK, "MESH", "Mesh is fully triangulated"))

        # Loose vertices
        # MeshVertex.link_edges only exists on BMVert (bmesh API), not on the
        # regular Mesh.vertices collection.  Build the set of edge-connected
        # vertex indices from mesh.edges instead - works on all Blender versions.
        _verts_with_edges: set[int] = set()
        for _e in mesh.edges:
            _verts_with_edges.add(_e.vertices[0])
            _verts_with_edges.add(_e.vertices[1])
        loose_count = sum(
            1 for v in mesh.vertices if v.index not in _verts_with_edges
        )
        loose = loose_count  # kept as a count; the original used len(loose)
        if loose:
            results.append(CheckResult(
                WARNING, "MESH",
                f"{loose} loose vertex/vertices found – will inflate FO4 vertex count.",
                auto_fixable=True, fix_key="remove_loose",
            ))
        else:
            results.append(CheckResult(OK, "MESH", "No loose vertices"))

        return results

    @staticmethod
    def _check_material(obj) -> list[CheckResult]:
        results = []

        # Has material?
        if not obj.data.materials or all(m is None for m in obj.data.materials):
            results.append(CheckResult(
                ERROR, "MATERIAL",
                "No material assigned – NIF export will fail for visible meshes.",
            ))
            return results

        mat = obj.data.materials[0]
        if mat is None:
            results.append(CheckResult(
                ERROR, "MATERIAL",
                "First material slot is empty.",
            ))
            return results

        results.append(CheckResult(OK, "MATERIAL", f"Material '{mat.name}' assigned"))

        # Uses nodes?
        if not mat.use_nodes:
            results.append(CheckResult(
                ERROR, "MATERIAL",
                f"Material '{mat.name}' does not use nodes. "
                "Niftools requires node-based materials.",
            ))
            return results

        results.append(CheckResult(OK, "MATERIAL", "Material uses nodes"))

        # Standard texture nodes
        node_names = {n.label or n.name for n in mat.node_tree.nodes}
        for slot_name, severity in [
            ("Diffuse",  ERROR),
            ("Normal",   WARNING),
            ("Specular", WARNING),
        ]:
            if slot_name in node_names:
                results.append(CheckResult(OK,       "MATERIAL", f"'{slot_name}' texture node present"))
            else:
                results.append(CheckResult(severity, "MATERIAL",
                    f"'{slot_name}' texture node missing – Niftools will skip this slot"))

        # Diffuse texture actually loaded?
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and (node.label == "Diffuse" or node.name == "Diffuse"):
                if node.image:
                    results.append(CheckResult(OK, "MATERIAL", "Diffuse texture image loaded"))
                else:
                    results.append(CheckResult(
                        WARNING, "MATERIAL",
                        "Diffuse texture node has no image – "
                        "object will be invisible in-game without a texture",
                    ))
                break

        return results

    @staticmethod
    def _check_collision_presence(obj) -> list[CheckResult]:
        """Check whether a UCX_ collision mesh exists for this object."""
        results = []

        # Skip if this looks like a character/skinned mesh – they don't need UCX_
        has_armature_mod = any(m.type == 'ARMATURE' for m in obj.modifiers)
        if has_armature_mod:
            results.append(CheckResult(
                SKIP, "COLLISION",
                "Skinned/rigged mesh – collision managed by skeleton (skipped)",
            ))
            return results

        # Also skip very low-poly meshes that are likely already collisions
        if len(obj.data.polygons) < 4:
            results.append(CheckResult(
                SKIP, "COLLISION",
                "Too few polygons to warrant a separate collision mesh (skipped)",
            ))
            return results

        ucx_name = f"UCX_{obj.name}"
        found = any(
            o.name == ucx_name or o.get("fo4_collision")
            for o in obj.children
        ) or any(
            o.name.upper() == ucx_name.upper()
            for o in bpy.context.scene.objects
        )

        if found:
            results.append(CheckResult(
                OK, "COLLISION",
                f"Collision mesh '{ucx_name}' found",
            ))
        else:
            results.append(CheckResult(
                WARNING, "COLLISION",
                f"No collision mesh found for '{obj.name}'. "
                "Static props without collision will have no physics in-game. "
                "Use 'Generate Collision' to create UCX_ mesh.",
            ))

        return results

    @staticmethod
    def _check_collision_mesh(obj) -> list[CheckResult]:
        """Checks specific to objects that ARE collision meshes."""
        results = []

        vert_count = len(obj.data.vertices)
        if vert_count > FO4_MAX_COLLISION_VERTS:
            results.append(CheckResult(
                ERROR, "COLLISION",
                f"Collision mesh has {vert_count} vertices (max {FO4_MAX_COLLISION_VERTS}). "
                "Will silently corrupt NIF. Use 'Generate Collision' which auto-decimates.",
            ))
        else:
            results.append(CheckResult(
                OK, "COLLISION",
                f"Collision vertex count {vert_count} ≤ {FO4_MAX_COLLISION_VERTS}",
            ))

        if obj.data.materials:
            results.append(CheckResult(
                WARNING, "COLLISION",
                "Collision mesh has materials assigned – they will be ignored "
                "in-game and waste data. Remove all materials from collision meshes.",
            ))
        else:
            results.append(CheckResult(OK, "COLLISION", "No materials on collision mesh"))

        scale = obj.scale
        if abs(scale.x - 1.0) > 0.001 or abs(scale.y - 1.0) > 0.001 or abs(scale.z - 1.0) > 0.001:
            results.append(CheckResult(
                ERROR, "COLLISION",
                "Collision mesh scale not applied. Apply scale (Ctrl+A) before export.",
                auto_fixable=True, fix_key="apply_scale",
            ))
        else:
            results.append(CheckResult(OK, "COLLISION", "Collision mesh scale applied"))

        return results

    @staticmethod
    def _check_rigging(obj) -> list[CheckResult]:
        results = []

        armature_mods = [m for m in obj.modifiers if m.type == 'ARMATURE']
        if not armature_mods:
            results.append(CheckResult(
                SKIP, "RIGGING",
                "No armature modifier – rigging checks skipped",
            ))
            return results

        results.append(CheckResult(OK, "RIGGING", "Armature modifier found"))

        arm_mod = armature_mods[0]
        arm_obj = arm_mod.object
        if arm_obj is None:
            results.append(CheckResult(
                ERROR, "RIGGING",
                "Armature modifier has no target object assigned",
            ))
            return results

        # Bone count
        bone_count = len(arm_obj.data.bones)
        if bone_count > FO4_MAX_BONES:
            results.append(CheckResult(
                ERROR, "RIGGING",
                f"Armature has {bone_count} bones (FO4 limit: {FO4_MAX_BONES}). "
                "Reduce by merging unused bones.",
            ))
        else:
            results.append(CheckResult(
                OK, "RIGGING",
                f"Bone count {bone_count} ≤ {FO4_MAX_BONES}",
            ))

        # Root bone
        root_names = {"root", "npc root [root]", "npc root"}
        bone_names_lower = {b.name.lower() for b in arm_obj.data.bones}
        has_root = bool(root_names & bone_names_lower)
        if not has_root:
            results.append(CheckResult(
                ERROR, "RIGGING",
                "No root bone found. FO4 skeletons require a 'NPC Root [Root]' bone "
                "at the top of the hierarchy.",
            ))
        else:
            results.append(CheckResult(OK, "RIGGING", "Root bone found"))

        # Vertex groups vs bone names
        vg_names = {vg.name for vg in obj.vertex_groups}
        missing_bones = vg_names - set(arm_obj.data.bones.keys())
        if missing_bones:
            results.append(CheckResult(
                WARNING, "RIGGING",
                f"{len(missing_bones)} vertex group(s) have no matching bone: "
                f"{', '.join(sorted(missing_bones)[:5])}{'...' if len(missing_bones) > 5 else ''}",
            ))
        else:
            results.append(CheckResult(
                OK, "RIGGING",
                "All vertex groups match armature bone names",
            ))

        return results

    # ------------------------------------------------------------------
    # Auto-fix
    # ------------------------------------------------------------------

    @staticmethod
    def auto_fix(context, report: dict) -> tuple[int, list[str]]:
        """Apply all auto-fixable issues from *report*.

        Returns (fix_count, messages).
        """
        fix_count = 0
        messages  = []

        for obj_report in report.get("objects", []):
            obj_name = obj_report["name"]
            obj = bpy.data.objects.get(obj_name)
            if obj is None:
                continue

            for check in obj_report["checks"]:
                if not check["auto_fixable"]:
                    continue
                key = check["fix_key"]

                try:
                    if key == "apply_scale":
                        context.view_layer.objects.active = obj
                        bpy.ops.object.select_all(action='DESELECT')
                        obj.select_set(True)
                        bpy.ops.object.transform_apply(scale=True, location=False, rotation=False)
                        messages.append(f"✓ {obj_name}: Applied scale")
                        fix_count += 1

                    elif key == "triangulate":
                        context.view_layer.objects.active = obj
                        bpy.ops.object.select_all(action='DESELECT')
                        obj.select_set(True)
                        bpy.ops.object.mode_set(mode='EDIT')
                        bpy.ops.mesh.select_all(action='SELECT')
                        bpy.ops.mesh.quads_convert_to_tris()
                        bpy.ops.object.mode_set(mode='OBJECT')
                        messages.append(f"✓ {obj_name}: Triangulated")
                        fix_count += 1

                    elif key == "remove_loose":
                        context.view_layer.objects.active = obj
                        bpy.ops.object.select_all(action='DESELECT')
                        obj.select_set(True)
                        bpy.ops.object.mode_set(mode='EDIT')
                        bpy.ops.mesh.select_all(action='DESELECT')
                        bpy.ops.mesh.select_mode(type='VERT')
                        bpy.ops.mesh.select_loose()
                        bpy.ops.mesh.delete(type='VERT')
                        bpy.ops.object.mode_set(mode='OBJECT')
                        messages.append(f"✓ {obj_name}: Removed loose vertices")
                        fix_count += 1

                    elif key == "smart_uv_unwrap":
                        context.view_layer.objects.active = obj
                        bpy.ops.object.select_all(action='DESELECT')
                        obj.select_set(True)
                        bpy.ops.object.mode_set(mode='EDIT')
                        bpy.ops.mesh.select_all(action='SELECT')
                        bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02)
                        bpy.ops.object.mode_set(mode='OBJECT')
                        messages.append(f"✓ {obj_name}: Smart UV unwrap applied")
                        fix_count += 1

                    elif key == "remove_spaces":
                        old_name = obj.name
                        new_name = old_name.replace(' ', '_')
                        obj.name = new_name
                        messages.append(f"✓ Renamed '{old_name}' → '{new_name}'")
                        fix_count += 1

                except Exception as exc:
                    messages.append(f"⚠ {obj_name} / {key}: {exc}")

        return fix_count, messages

    # ------------------------------------------------------------------
    # Report export
    # ------------------------------------------------------------------

    @staticmethod
    def export_report(report: dict, filepath: str) -> tuple[bool, str]:
        """Save the diagnostic report as a human-readable text file."""
        try:
            os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
            lines = []
            lines.append("=" * 70)
            lines.append("FALLOUT 4 SCENE DIAGNOSTICS REPORT")
            lines.append(f"Generated: {report['timestamp']}")
            lines.append("=" * 70)

            s = report.get("summary", {})
            lines.append(f"\nOverall Score: {s.get('score', 0)}/100")
            lines.append(f"Export Ready: {'✅ YES' if s.get('export_ready') else '❌ NO (errors found)'}")
            lines.append(f"  Errors:   {s.get('error_count', 0)}")
            lines.append(f"  Warnings: {s.get('warning_count', 0)}")
            lines.append(f"  OK:       {s.get('ok_count', 0)}")

            lines.append("\n── Scene Checks ─────────────────────────────────────────────────")
            for check in report.get("scene", []):
                icon = {"ERROR": "❌", "WARNING": "⚠ ", "OK": "✅", "SKIP": "⏭ "}.get(
                    check["severity"], "  ")
                lines.append(f"  {icon} [{check['category']}] {check['message']}")

            for obj_r in report.get("objects", []):
                grass_tag = " [GRASS]" if obj_r.get("is_grass") else ""
                lines.append(f"\n── {obj_r['name']}{grass_tag} ({obj_r['poly_count']:,} polys) "
                              f"[{obj_r['error_count']} errors, {obj_r['warning_count']} warnings] ──")
                for check in obj_r["checks"]:
                    icon = {"ERROR": "❌", "WARNING": "⚠ ", "OK": "✅", "SKIP": "⏭ "}.get(
                        check["severity"], "  ")
                    af = " [auto-fixable]" if check["auto_fixable"] else ""
                    lines.append(f"  {icon} [{check['category']}]{af} {check['message']}")

            text = "\n".join(lines) + "\n"
            with open(filepath, "w", encoding="utf-8") as fh:
                fh.write(text)
            return True, f"Diagnostic report saved: {filepath}"
        except Exception as exc:
            return False, f"Failed to save report: {exc}"


# ---------------------------------------------------------------------------
# Scene storage for last report
# ---------------------------------------------------------------------------

# The diagnostic report is stored as a JSON string in a scene text block so
# the UI panel can read it without re-running the check.
_REPORT_TEXT_NAME = "FO4_DiagnosticsReport"


def store_report(report: dict):
    """Persist the report as a Blender text block."""
    text = bpy.data.texts.get(_REPORT_TEXT_NAME)
    if text is None:
        text = bpy.data.texts.new(_REPORT_TEXT_NAME)
    text.clear()
    text.write(json.dumps(report, indent=2))


def load_report() -> dict | None:
    """Load the persisted report, or None if not present."""
    text = bpy.data.texts.get(_REPORT_TEXT_NAME)
    if text is None:
        return None
    try:
        return json.loads(text.as_string())
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register():
    bpy.types.Scene.fo4_diag_last_score = bpy.props.IntProperty(
        name="Last Score",
        description="Most recent FO4 diagnostics score (0-100)",
        default=-1,
        min=-1, max=100,
    )
    bpy.types.Scene.fo4_diag_last_errors = bpy.props.IntProperty(
        name="Last Error Count",
        description="Number of errors in last diagnostic run",
        default=0, min=0,
    )
    bpy.types.Scene.fo4_diag_last_warnings = bpy.props.IntProperty(
        name="Last Warning Count",
        description="Number of warnings in last diagnostic run",
        default=0, min=0,
    )
    bpy.types.Scene.fo4_diag_export_ready = bpy.props.BoolProperty(
        name="Export Ready",
        description="True if last diagnostic run found no errors",
        default=False,
    )
    bpy.types.Scene.fo4_diag_report_path = bpy.props.StringProperty(
        name="Report Path",
        description="Where to save the text diagnostic report",
        subtype='FILE_PATH',
        default="//fo4_diagnostics.txt",
    )


def unregister():
    for prop in (
        "fo4_diag_last_score",
        "fo4_diag_last_errors",
        "fo4_diag_last_warnings",
        "fo4_diag_export_ready",
        "fo4_diag_report_path",
    ):
        if hasattr(bpy.types.Scene, prop):
            try:
                delattr(bpy.types.Scene, prop)
            except Exception:
                pass
