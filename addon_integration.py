"""
Addon Integration System for the Fallout 4 Tutorial Add-on.

Scans for third-party Blender add-ons that are useful for FO4 modding and
reports their install/enabled status so the UI can show relevant action buttons.
"""

# ── Known add-ons catalogue ───────────────────────────────────────────────────
# Each entry describes an add-on that has FO4 modding use-cases.
# Fields:
#   addon_id      – Blender module name (used to check bpy preferences)
#   name          – human-readable label shown in the UI
#   description   – one-line description
#   fo4_use_cases – how it helps with FO4 work
#   builtin       – True if shipped with every Blender build
#   download_url  – direct download / release page URL ('' if builtin)

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
]


class AddonIntegrationSystem:
    """Detects which known third-party add-ons are installed / enabled in Blender."""

    @staticmethod
    def scan_for_known_addons():
        """Return a list of dicts describing each known add-on and its status.

        Each dict has the keys:
            addon_id, name, description, fo4_use_cases,
            builtin, download_url, is_enabled, is_installed
        """
        results = []
        for entry in _KNOWN_ADDONS:
            addon_id = entry["addon_id"]
            is_enabled, is_installed = AddonIntegrationSystem._check_addon_status(addon_id)
            results.append({
                **entry,
                "is_enabled":   is_enabled,
                "is_installed": is_installed,
            })
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
            # is_enabled: the add-on is listed in the active addons dict
            is_enabled  = addon_id in prefs.addons
            is_installed = is_enabled
            if not is_installed:
                # Check addon_utils for add-ons that are present on disk but not enabled
                try:
                    import addon_utils
                    mods = [m.__name__ for m in addon_utils.modules()]
                    is_installed = addon_id in mods
                except Exception:
                    pass
            return is_enabled, is_installed
        except Exception:
            return False, False


def register():
    pass


def unregister():
    pass
