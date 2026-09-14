"""
Addon Integration System for the Fallout 4 Tutorial Add-on.

Scans for third-party Blender add-ons that are useful for FO4 modding and
reports their install/enabled status so the UI can show relevant action buttons.
"""

import time

# ── Known add-ons catalogue ───────────────────────────────────────────────────
# Each entry describes an add-on that has FO4 modding use-cases.
# Fields:
#   addon_id      – Blender module name (used to check bpy preferences)
#   name          – human-readable label shown in the UI
#   description   – one-line description
#   fo4_use_cases – how it helps with FO4 work
#   builtin       – True if shipped with every Blender build
#   download_url  – direct download / release page URL ('' if builtin)

_scan_cache: list | None = None
_scan_cache_time: float = 0.0
_CACHE_TTL: float = 5.0  # seconds — auto-expire so the panel stays fresh

_KNOWN_ADDONS = [
    {
        "addon_id":     "io_scene_niftools",
        "name":         "Niftools NIF Exporter",
        "description":  "Import/export NIF files (Blender 3.x / legacy)",
        "fo4_use_cases": "Export BSTriShape NIF meshes for Fallout 4 (Blender 3.x)",
        "builtin":      False,
        "download_url": "https://github.com/niftools/blender_nif_plugin/releases",
    },
    {
        "addon_id":     "io_scene_fbx",
        "name":         "FBX Import/Export",
        "description":  "Built-in FBX importer and exporter",
        "fo4_use_cases": "Import rigs and animations; FBX fallback when no NIF exporter is installed",
        "builtin":      True,
        "download_url": "",
    },
    {
        "addon_id":     "io_import_scene_obj",
        "name":         "OBJ Import",
        "description":  "Built-in Wavefront OBJ importer",
        "fo4_use_cases": "Import reference meshes from other tools (3ds Max, Maya, etc.)",
        "builtin":      True,
        "download_url": "",
    },
    {
        "addon_id":     "mesh_looptools",
        "name":         "LoopTools",
        "description":  "Built-in mesh editing utilities",
        "fo4_use_cases": "Clean edge loops and circular topology for clean NIF geometry",
        "builtin":      True,
        "download_url": "",
    },
    {
        "addon_id":     "node_wrangler",
        "name":         "Node Wrangler",
        "description":  "Built-in shader node editing helper",
        "fo4_use_cases": "Quickly wire PBR texture nodes for DDS texture preview in Blender",
        "builtin":      True,
        "download_url": "",
    },
    {
        "addon_id":     "io_mesh_uv_layout",
        "name":         "UV Layout Export",
        "description":  "Export UV layouts as SVG/PNG",
        "fo4_use_cases": "Export UV maps for painting textures in external editors (Photoshop, GIMP)",
        "builtin":      True,
        "download_url": "",
    },
    {
        "addon_id":     "rigify",
        "name":         "Rigify",
        "description":  "Procedural rig generation add-on",
        "fo4_use_cases": "Generate human/creature rigs that can be retargeted to FO4 skeletons",
        "builtin":      True,
        "download_url": "",
    },
    {
        "addon_id":     "textools",
        "name":         "TexTools",
        "description":  "Advanced UV and texture baking tools",
        "fo4_use_cases": "Bake normal/AO maps; straighten seams for DDS BC5 normal maps",
        "builtin":      False,
        "download_url": "https://github.com/SavMartin/TexTools-Blender/releases",
    },
    {
        "addon_id":     "blenderkit",
        "name":         "BlenderKit",
        "description":  "Online asset library (free tier available)",
        "fo4_use_cases": "Download free reference meshes and PBR materials to use as base assets",
        "builtin":      False,
        "download_url": "https://www.blenderkit.com/",
    },
    # ── UV workflow (pairs with fo4_uv_tools.py / the UV-unwrap step of
    #    fo4_asset_pipeline_and_blender_workflow.md) ────────────────────────
    {
        "addon_id":     "uvpackmaster3",
        "name":         "UVPackmaster 3",
        "description":  "Fast CPU/GPU UV packing engine",
        "fo4_use_cases": "After unwrapping (our add-on or Auto UV Unwrap), hand the UV islands to "
                          "UVPackmaster 3 for tight, overlap-free packing before running our NIF "
                          "export/validation step — its packing density beats Blender's built-in "
                          "Pack Islands, which matters for texel-density-sensitive FO4 assets.",
        "builtin":      False,
        "download_url": "https://uvpackmaster.com/",
    },
    {
        "addon_id":     "uv_king",
        "name":         "UV King",
        "description":  "Simplified all-in-one UV toolkit",
        "fo4_use_cases": "A lighter-weight alternative to UVPackmaster 3 for quick seam/unwrap/pack "
                          "passes on simple props before export — reach for UVPackmaster 3 instead "
                          "once texel density starts to matter (weapons, armor, hero assets).",
        "builtin":      False,
        "download_url": "",
    },
    {
        "addon_id":     "auto_uv_unwrap_2",
        "name":         "Auto UV Unwrap & Pack 2.0",
        "description":  "Automated UV unwrapping with intelligent seam marking",
        "fo4_use_cases": "Run this first to auto-seam and unwrap a new mesh, then switch to "
                          "UVPackmaster 3 for the final packing pass — unwrap here, pack there, "
                          "then back to our add-on to validate UV bounds before NIF export.",
        "builtin":      False,
        "download_url": "",
    },
    # ── Mesh cleanup / retopology (pairs with mesh_helpers.py and the
    #    destructible/LOD-mesh workflow) ───────────────────────────────────
    {
        "addon_id":     "final_topology",
        "name":         "Final Topology - Inverse Subdivide",
        "description":  "Professional subdivision/retopology tools",
        "fo4_use_cases": "NOT for cleaning up a scavenged/messy dense mesh — that's Autoremesher's "
                          "job. This is for building a clean low-poly cage while sculpting: put a "
                          "Subdivision Surface modifier on a low-poly base, edit the subdivided "
                          "shape, and this add-on compensates the base cage to match in real time. "
                          "Useful for shaping a new creature/character base mesh before rigging.",
        "builtin":      False,
        "download_url": "",
    },
    {
        "addon_id":     "autoremesher",
        "name":         "Autoremesher NOW!",
        "description":  "One-click automatic remeshing",
        "fo4_use_cases": "Turn a dense sculpt or scanned asset into a clean, game-ready poly count "
                          "before it ever reaches our add-on's collision-generation or NIF-export "
                          "operators — remesh first, then bring the result into our pipeline.",
        "builtin":      False,
        "download_url": "",
    },
    {
        "addon_id":     "teca3d_mesh_welder",
        "name":         "Mesh Welder",
        "description":  "Merge two separate meshes into one",
        "fo4_use_cases": "Weld a custom attachment/prop mesh onto a base body or creature mesh "
                          "before rigging — useful for exactly the kind of 'cut in half, glue a "
                          "replacement piece on' destructible-object work in "
                          "fo4_custom_creature_rig_pipeline.md.",
        "builtin":      False,
        "download_url": "",
    },
    {
        "addon_id":     "Zip_Merge",
        "name":         "Zip Merge",
        "description":  "ZipWeld: merge verts across mesh islands",
        "fo4_use_cases": "Stitch disconnected geometry islands back into one manifold mesh — the "
                          "carnivorous-plant mesh in our own rig work turned out to be 194 separate "
                          "islands; this is the tool to reduce that count before it becomes a "
                          "weight-painting or collision-generation headache.",
        "builtin":      False,
        "download_url": "",
    },
    # ── Rigging / weight painting (pairs with Step 2-4 of
    #    fo4_custom_creature_rig_pipeline.md, "the part that actually breaks") ─
    {
        "addon_id":     "WeightPaintToolForBlender",
        "name":         "Weight Paint Tool for Blender",
        "description":  "3ds-Max-style weight paint brushes",
        "fo4_use_cases": "An alternative brush set for the envelope-weighting cleanup pass in Step "
                          "4/5 of our creature-rig pipeline (closing weight gaps, tightening "
                          "envelope radii) — some modders find its brush falloff more predictable "
                          "than Blender's stock weight paint tool.",
        "builtin":      False,
        "download_url": "",
    },
    {
        "addon_id":     "subdivide_selected",
        "name":         "Subdivide Selected",
        "description":  "Subdivide mesh areas driven by weight paint",
        "fo4_use_cases": "Add extra geometry only where a bone's weight falloff needs it (joints, "
                          "whip/tentacle tips) instead of subdividing the whole mesh uniformly — "
                          "do this before the 'Subdivide limbs meant to whip or reach' step.",
        "builtin":      False,
        "download_url": "",
    },
    {
        "addon_id":     "shapekeysbatchtransfer_addon",
        "name":         "Shape Keys Batch Transfer",
        "description":  "Transfer shape keys via Surface Deform",
        "fo4_use_cases": "Carry facial/expression shape keys over when adapting a custom head or "
                          "creature mesh to a modified base topology, without re-sculpting every "
                          "key by hand.",
        "builtin":      False,
        "download_url": "",
    },
    # ── World placement (pairs with the Glowing Sea / flora-scatter workflow) ─
    {
        "addon_id":     "down_to_earth",
        "name":         "Down to Earth",
        "description":  "One-click snap-to-surface placement",
        "fo4_use_cases": "Preview-place scattered flora/clutter meshes cleanly onto uneven terrain "
                          "in Blender before committing final transforms to the CK reference — "
                          "handy for the same kind of scatter work as the Glowing Sea flora pass.",
        "builtin":      False,
        "download_url": "",
    },
    # ── Hard-surface modeling (weapons/armor/attachments) ─────────────────
    {
        "addon_id":     "anyhole_pro",
        "name":         "AnyHole Pro",
        "description":  "Interactive click-to-cut hole puncher",
        "fo4_use_cases": "Cut clean socket/bolt/vent holes into armor or weapon meshes without "
                          "hand-building boolean cutters — do the cut here, then bring the result "
                          "back into our add-on for UV/collision/export.",
        "builtin":      False,
        "download_url": "",
    },
    {
        "addon_id":     "quick_lattice",
        "name":         "Quick Lattice",
        "description":  "Automated lattice warping",
        "fo4_use_cases": "Reshape a base mesh to fit a different body/armor silhouette (BodySlide-"
                          "adjacent conforming work) before final weight painting.",
        "builtin":      False,
        "download_url": "",
    },
    # ── Vertex color / texture-paint helpers ──────────────────────────────
    {
        "addon_id":     "Set_Vertex_Color_Tool",
        "name":         "Set Vertex Color Tool",
        "description":  "Set vertex colors without entering Vertex Paint mode",
        "fo4_use_cases": "Flora/foliage meshes need vertex colors for FO4's wind/flutter animation "
                          "shader — the CK log warning '[MODELS] ... marked for flutter animation, "
                          "but has no vertex colors' means exactly that data is missing. Use this to "
                          "assign it directly rather than switching in and out of Vertex Paint mode.",
        "builtin":      False,
        "download_url": "",
    },
    {
        "addon_id":     "create_text_mask_texture",
        "name":         "Create Text Mask Texture",
        "description":  "Generate a texture-paint mask from text",
        "fo4_use_cases": "Quickly stencil unit numbers/faction markings/serials onto a texture-paint "
                          "mask for custom armor or weapon skins, without hand-painting the lettering.",
        "builtin":      False,
        "download_url": "",
    },
    {
        "addon_id":     "uv_texture_selector_extension",
        "name":         "UV Texture Selector",
        "description":  "Gallery view for managing textures in the UV/Image Editor",
        "fo4_use_cases": "Faster texture picking when hand-checking material assignments across a "
                          "multi-material FO4 asset before export — pairs with the UV-relay tools "
                          "above (Auto UV Unwrap -> UVPackmaster 3 -> our validation step).",
        "builtin":      False,
        "download_url": "",
    },
    # ── Hard-surface modeling (weapons/armor/attachments) ─────────────────
    {
        "addon_id":     "advanced_extrude_bevel_tool",
        "name":         "Advanced Extrude and Bevel Tool",
        "description":  "Selective extrusion and beveling",
        "fo4_use_cases": "Faster hard-surface detailing pass on armor/weapon meshes before handing "
                          "off to AnyHole Pro for socket cuts and then to our add-on for UV/collision/"
                          "export.",
        "builtin":      False,
        "download_url": "",
    },
    # ── Reference/asset sourcing (same tier as BlenderKit) ────────────────
    {
        "addon_id":     "abo_connect",
        "name":         "ABO Connect",
        "description":  "Browse/import 3D models from the Amazon Berkeley Objects dataset",
        "fo4_use_cases": "Pull real-world reference meshes for scale/shape comparisons when "
                          "modeling props from scratch — reference only, these aren't game-ready "
                          "meshes and still need full retopo/UV/rigging before export.",
        "builtin":      False,
        "download_url": "",
    },
]


class AddonIntegrationSystem:
    """Detects which known third-party add-ons are installed / enabled in Blender."""

    @staticmethod
    def invalidate_cache() -> None:
        """Force the next scan_for_known_addons() call to re-query Blender."""
        global _scan_cache
        _scan_cache = None

    @staticmethod
    def scan_for_known_addons():
        """Return a list of dicts describing each known add-on and its status.

        Each dict has the keys:
            addon_id, name, description, fo4_use_cases,
            builtin, download_url, is_enabled, is_installed

        Results are cached for _CACHE_TTL seconds to avoid calling
        addon_utils.modules() (a full disk walk) on every UI redraw.
        """
        global _scan_cache, _scan_cache_time
        if _scan_cache is not None and (time.time() - _scan_cache_time) < _CACHE_TTL:
            return _scan_cache
        results = []
        for entry in _KNOWN_ADDONS:
            addon_id = entry["addon_id"]
            is_enabled, is_installed = AddonIntegrationSystem._check_addon_status(addon_id)
            results.append({
                **entry,
                "is_enabled":   is_enabled,
                "is_installed": is_installed,
            })
        _scan_cache = results
        _scan_cache_time = time.time()
        return results

    @staticmethod
    def _check_addon_status(addon_id):
        """Return (is_enabled, is_installed) for *addon_id*.

        Falls back to (False, False) if the Blender API is unavailable (e.g.
        when running unit-tests outside of Blender).
        """
        try:
            import bpy
            prefs = bpy.context.preferences

            def _matches(key: str) -> bool:
                # Legacy addon: registered under its bare module name.
                # Blender 4.2+ extension: registered as "bl_ext.<repo>.<addon_id>"
                # (repo is "user_default" for a locally-installed zip, or
                # "blender_org"/another repo name when pulled from an online
                # extensions repository) — match the suffix so either form counts.
                return key == addon_id or key.endswith("." + addon_id)

            # is_enabled: the add-on is listed in the active addons dict
            is_enabled = any(_matches(k) for k in prefs.addons.keys())
            is_installed = is_enabled
            if not is_installed:
                # Check addon_utils for add-ons that are present on disk but not enabled
                try:
                    import addon_utils
                    mods = [m.__name__ for m in addon_utils.modules()]
                    is_installed = any(_matches(m) for m in mods)
                except Exception:
                    pass
            return is_enabled, is_installed
        except Exception:
            return False, False


def register():
    pass


def unregister():
    pass
