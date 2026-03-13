"""Fallout 4 Game Asset Browser and Importer

Detects Fallout 4 installation, extracts BA2 archives, and imports game assets
(weapons, armor, creatures, etc.) into Blender with materials and textures.

Requires:
- Fallout 4 installed (Steam, GOG, or Microsoft Store)
- Blender Niftools addon for NIF import
- Archive2.exe or BA2Extract for BA2 extraction (auto-downloaded)
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Optional

try:
    import winreg
    _HAS_WINREG = True
except ImportError:
    winreg = None
    _HAS_WINREG = False


# Common Fallout 4 installation locations
FO4_COMMON_PATHS = [
    Path("C:/Program Files (x86)/Steam/steamapps/common/Fallout 4"),
    Path("D:/SteamLibrary/steamapps/common/Fallout 4"),
    Path("E:/SteamLibrary/steamapps/common/Fallout 4"),
    Path("C:/Program Files/Fallout 4"),
    Path("D:/Games/Fallout 4"),
    Path("C:/GOG Games/Fallout 4"),
]


class FO4GameAssets:
    """Manager for Fallout 4 game asset detection and extraction."""

    _game_dir: Optional[Path] = None
    _asset_index: Optional[dict] = None

    @staticmethod
    def invalidate_cache() -> None:
        """Clear the cached game-directory so the next call re-detects from scratch.

        Call this whenever the user changes any of the asset path preferences
        so Smart Presets and the asset library pick up the new location
        immediately without needing a Blender restart.
        """
        FO4GameAssets._game_dir = None
        FO4GameAssets._asset_index = None

    @staticmethod
    def _custom_path_from_prefs() -> Optional[Path]:
        """Return the best custom assets path from preferences, or None.

        Checks (in priority order):
          1. ``fo4_assets_path``   – the combined "all assets" path
          2. ``fo4_asset_lib_mesh_path`` – the per-type meshes path set in the
             Game Asset Import panel.  When this points directly to a
             ``meshes/`` sub-folder the parent is used so paths like
             ``data_dir / "meshes/weapons/…"`` resolve correctly.
        """
        try:
            import bpy
            scene = bpy.context.scene

            # 1. Combined path (fo4_assets_path)
            from . import preferences as _prefs
            combined = _prefs.get_fo4_assets_path()
            if combined:
                p = Path(combined)
                if p.exists():
                    return p

            # 2. Mesh library path (fo4_asset_lib_mesh_path)
            lib_mesh = getattr(scene, 'fo4_asset_lib_mesh_path', '').strip()
            if lib_mesh:
                p = Path(lib_mesh)
                if p.exists():
                    # If the user pointed at the "meshes/" folder itself,
                    # step up one level so the whole Data dir is the root.
                    if p.name.lower() == 'meshes':
                        return p.parent
                    return p

            # 3. Combined asset-lib path (fo4_asset_lib_path)
            lib_all = getattr(scene, 'fo4_asset_lib_path', '').strip()
            if lib_all:
                p = Path(lib_all)
                if p.exists():
                    return p
        except Exception:
            pass
        return None

    @staticmethod
    def detect_fo4_installation() -> Optional[Path]:
        """Detect Fallout 4 installation directory.

        Checks (in order):
        1. Custom assets path from addon preferences / asset-library paths
           (always checked first so a path change takes effect immediately).
        2. Cached detection result from a previous auto-detection.
        3. Registry (Steam/GOG).
        4. Common installation paths.
        """
        # 1. Always honour a user-supplied path — checked before the cache so
        #    changing the preference in the panel takes effect on the next
        #    operator call without requiring a Blender restart.
        custom = FO4GameAssets._custom_path_from_prefs()
        if custom:
            if custom.name.lower() == "data":
                FO4GameAssets._game_dir = custom.parent
            elif (custom / "Data").exists():
                FO4GameAssets._game_dir = custom
            else:
                FO4GameAssets._game_dir = custom
            return FO4GameAssets._game_dir

        # 2. Return the auto-detected cached result (registry / common paths).
        if FO4GameAssets._game_dir and FO4GameAssets._game_dir.exists():
            return FO4GameAssets._game_dir

        # 3. Check Windows Registry for Steam installation
        if _HAS_WINREG:
            try:
                key = winreg.OpenKey(
                    winreg.HKEY_LOCAL_MACHINE,
                    r"SOFTWARE\WOW6432Node\Bethesda Softworks\Fallout4"
                )
                install_path, _ = winreg.QueryValueEx(key, "installed path")
                winreg.CloseKey(key)

                fo4_path = Path(install_path)
                if fo4_path.exists() and (fo4_path / "Fallout4.exe").exists():
                    FO4GameAssets._game_dir = fo4_path
                    return fo4_path
            except OSError:
                pass

        # 4. Check common installation paths
        for path in FO4_COMMON_PATHS:
            if path.exists() and (path / "Fallout4.exe").exists():
                FO4GameAssets._game_dir = path
                return path

        return None

    @staticmethod
    def get_data_dir() -> Optional[Path]:
        """Get Fallout 4 Data directory containing assets (BA2 archives or loose files).

        For custom asset folders, returns the folder itself if it contains
        meshes/textures.  For game installations, returns the Data subdirectory.
        When the user set their path to a ``meshes/`` sub-folder the parent is
        returned so relative NIF paths (``meshes/weapons/…``) resolve correctly.
        """
        game_dir = FO4GameAssets.detect_fo4_installation()
        if not game_dir:
            return None

        # User pointed straight at the Data directory
        if game_dir.name.lower() == "data" and game_dir.exists():
            return game_dir

        # Standard game installation — Data is a sub-directory
        data_dir = game_dir / "Data"
        if data_dir.exists():
            return data_dir

        # Custom asset folder that already has meshes/textures at root
        if (game_dir / "meshes").exists() or (game_dir / "textures").exists():
            return game_dir

        # Fallback: return game_dir only when it actually exists and looks like
        # it could contain FO4 content (has BA2 files or is non-empty).
        # This avoids returning a stale path that points at an unrelated folder.
        if game_dir.exists() and (
            list(game_dir.glob("*.ba2"))
            or any(game_dir.iterdir())
        ):
            return game_dir

        return None

    @staticmethod
    def list_ba2_archives() -> list[Path]:
        """List all BA2 archives in the Fallout 4 Data directory."""
        data_dir = FO4GameAssets.get_data_dir()
        if not data_dir:
            return []

        ba2_files = list(data_dir.glob("*.ba2"))
        return sorted(ba2_files)

    @staticmethod
    def get_asset_categories() -> dict[str, list[str]]:
        """Get categorized list of common Fallout 4 asset paths.

        Returns dictionary mapping category to file path patterns.
        """
        return {
            "Weapons": [
                "meshes/weapons/10mmpistol/",
                "meshes/weapons/44pistol/",
                "meshes/weapons/alienblaster/",
                "meshes/weapons/assaultrifle/",
                "meshes/weapons/combatrifle/",
                "meshes/weapons/combatshotgun/",
                "meshes/weapons/deliverer/",
                "meshes/weapons/fatman/",
                "meshes/weapons/flamer/",
                "meshes/weapons/gaussrifle/",
                "meshes/weapons/grenadelauncherauto/",
                "meshes/weapons/huntingrifle/",
                "meshes/weapons/institute/",
                "meshes/weapons/junkjet/",
                "meshes/weapons/lasercannon/",
                "meshes/weapons/lasergun/",
                "meshes/weapons/lasermusket/",
                "meshes/weapons/minigun/",
                "meshes/weapons/misslelauncher/",
                "meshes/weapons/pipe/",
                "meshes/weapons/plasmagun/",
                "meshes/weapons/railwayrifle/",
                "meshes/weapons/submachinegun/",
                "meshes/weapons/syringer/",
            ],
            "Armor": [
                "meshes/armor/powerarmor/",
                "meshes/armor/leather/",
                "meshes/armor/combat/",
                "meshes/armor/metal/",
                "meshes/armor/raider/",
                "meshes/armor/synth/",
                "meshes/armor/vault111/",
            ],
            "Creatures": [
                "meshes/actors/deathclaw/",
                "meshes/actors/feral/",
                "meshes/actors/mirelurk/",
                "meshes/actors/molerat/",
                "meshes/actors/radscorpion/",
                "meshes/actors/supermutant/",
                "meshes/actors/synth/",
            ],
            "Furniture": [
                "meshes/furniture/",
                "meshes/setdressing/",
            ],
            "Architecture": [
                "meshes/architecture/commonwealth/",
                "meshes/architecture/institute/",
                "meshes/architecture/vault/",
            ],
        }

    @staticmethod
    def index_assets(force_rebuild: bool = False) -> dict:
        """Build or load index of available Fallout 4 assets.

        Creates a JSON index file mapping asset names to their file paths.
        """
        if FO4GameAssets._asset_index and not force_rebuild:
            return FO4GameAssets._asset_index

        # Check for cached index
        from . import tool_installers
        tools_root = tool_installers.get_tools_root()
        index_file = tools_root / "fo4_asset_index.json"

        if index_file.exists() and not force_rebuild:
            try:
                with open(index_file, 'r', encoding='utf-8') as f:
                    FO4GameAssets._asset_index = json.load(f)
                    return FO4GameAssets._asset_index
            except Exception as e:
                print(f"Failed to load asset index: {e}")

        # Build new index
        data_dir = FO4GameAssets.get_data_dir()
        if not data_dir:
            return {}

        index = {}
        categories = FO4GameAssets.get_asset_categories()

        # Check for loose files first
        for category, paths in categories.items():
            index[category] = []
            for path_pattern in paths:
                search_path = data_dir / path_pattern
                if search_path.exists():
                    # Find all NIF files in this path
                    nif_files = list(search_path.rglob("*.nif"))
                    for nif_file in nif_files:
                        rel_path = nif_file.relative_to(data_dir)
                        index[category].append({
                            "name": nif_file.stem,
                            "path": str(rel_path),
                            "full_path": str(nif_file),
                            "source": "loose"
                        })

        # Save index
        try:
            tools_root.mkdir(parents=True, exist_ok=True)
            with open(index_file, 'w', encoding='utf-8') as f:
                json.dump(index, f, indent=2)
        except Exception as e:
            print(f"Failed to save asset index: {e}")

        FO4GameAssets._asset_index = index
        return index

    @staticmethod
    def search_assets(query: str, category: Optional[str] = None) -> list[dict]:
        """Search for assets by name.

        Args:
            query: Search string (case-insensitive)
            category: Optional category filter

        Returns list of matching assets with metadata.
        """
        index = FO4GameAssets.index_assets()
        results = []

        query_lower = query.lower()

        categories_to_search = [category] if category else index.keys()

        for cat in categories_to_search:
            if cat not in index:
                continue
            for asset in index[cat]:
                if query_lower in asset["name"].lower():
                    results.append({
                        "category": cat,
                        **asset
                    })

        return results

    @staticmethod
    def get_asset_by_path(nif_path: str) -> Optional[dict]:
        """Get asset metadata by relative path."""
        data_dir = FO4GameAssets.get_data_dir()
        if not data_dir:
            return None

        full_path = data_dir / nif_path
        if not full_path.exists():
            return None

        # Find associated textures
        texture_paths = []
        dds_dir = full_path.parent.parent / "textures"
        if dds_dir.exists():
            texture_paths = [str(p.relative_to(data_dir)) for p in dds_dir.rglob("*.dds")]

        return {
            "name": full_path.stem,
            "nif_path": nif_path,
            "full_path": str(full_path),
            "texture_paths": texture_paths,
        }

    @staticmethod
    def get_status() -> tuple[bool, str]:
        """Get Fallout 4 installation status for UI display."""
        game_dir = FO4GameAssets.detect_fo4_installation()

        if not game_dir:
            return False, "Fallout 4 not detected. Please set installation path in preferences."

        data_dir = FO4GameAssets.get_data_dir()
        if not data_dir:
            return False, f"Data directory not found in {game_dir}"

        ba2_count = len(FO4GameAssets.list_ba2_archives())
        return True, f"Fallout 4 found: {game_dir} ({ba2_count} BA2 archives)"


def register():
    """Register module."""
    pass


def unregister():
    """Unregister module."""
    pass
