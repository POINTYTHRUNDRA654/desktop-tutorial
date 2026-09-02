"""Unity Asset Browser and Importer

Browses Unity project assets (FBX, OBJ, textures) and imports them into Blender
with proper materials and textures.

Supports:
- Unity project Assets folders
- Extracted Unity assets (via AssetStudio, AssetRipper, or Unity FBX Importer)
- Custom asset collections
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional


class UnityAssets:
    """Manager for Unity asset detection and browsing."""

    _assets_dir: Optional[Path] = None
    _asset_index: Optional[dict] = None

    @staticmethod
    def detect_unity_assets() -> Optional[Path]:
        """Detect Unity assets directory.

        Checks (in order):
        1. Custom assets path from addon preferences
        2. Cached detection result
        """
        if UnityAssets._assets_dir and UnityAssets._assets_dir.exists():
            return UnityAssets._assets_dir

        # Check custom path from preferences
        try:
            from . import preferences
            custom_path = preferences.get_unity_assets_path()
            if custom_path:
                custom_path_obj = Path(custom_path)
                if custom_path_obj.exists():
                    UnityAssets._assets_dir = custom_path_obj
                    return custom_path_obj
        except Exception as e:
            print(f"Failed to check custom Unity assets path: {e}")

        return None

    @staticmethod
    def get_asset_categories() -> dict[str, list[str]]:
        """Get categorized list of common Unity asset folder patterns.

        Returns dictionary mapping category to folder name patterns.
        """
        return {
            "Characters": [
                "Characters/",
                "Models/Characters/",
                "Prefabs/Characters/",
            ],
            "Weapons": [
                "Weapons/",
                "Models/Weapons/",
                "Prefabs/Weapons/",
            ],
            "Props": [
                "Props/",
                "Models/Props/",
                "Prefabs/Props/",
            ],
            "Environment": [
                "Environment/",
                "Models/Environment/",
                "Terrain/",
            ],
            "Vehicles": [
                "Vehicles/",
                "Models/Vehicles/",
            ],
            "All Models": [
                "Models/",
                "Meshes/",
            ],
        }

    @staticmethod
    def index_assets(force_rebuild: bool = False) -> dict:
        """Build or load index of available Unity assets.

        Scans for FBX, OBJ, and other 3D model formats.
        """
        if UnityAssets._asset_index and not force_rebuild:
            return UnityAssets._asset_index

        # Check for cached index
        from . import tool_installers
        tools_root = tool_installers.get_tools_root()
        index_file = tools_root / "unity_asset_index.json"

        if index_file.exists() and not force_rebuild:
            try:
                with open(index_file, 'r', encoding='utf-8') as f:
                    UnityAssets._asset_index = json.load(f)
                    return UnityAssets._asset_index
            except Exception as e:
                print(f"Failed to load Unity asset index: {e}")

        # Build new index
        assets_dir = UnityAssets.detect_unity_assets()
        if not assets_dir:
            return {}

        index = {}
        categories = UnityAssets.get_asset_categories()

        # Supported 3D formats
        model_extensions = ['.fbx', '.obj', '.dae', '.blend', '.gltf', '.glb']

        for category, paths in categories.items():
            index[category] = []
            for path_pattern in paths:
                search_path = assets_dir / path_pattern
                if search_path.exists():
                    # Find all model files
                    for ext in model_extensions:
                        model_files = list(search_path.rglob(f"*{ext}"))
                        for model_file in model_files:
                            rel_path = model_file.relative_to(assets_dir)
                            index[category].append({
                                "name": model_file.stem,
                                "path": str(rel_path),
                                "full_path": str(model_file),
                                "format": ext[1:].upper(),  # Remove dot, uppercase
                            })

        # Save index
        try:
            tools_root.mkdir(parents=True, exist_ok=True)
            with open(index_file, 'w', encoding='utf-8') as f:
                json.dump(index, f, indent=2)
        except Exception as e:
            print(f"Failed to save Unity asset index: {e}")

        UnityAssets._asset_index = index
        return index

    @staticmethod
    def search_assets(query: str, category: Optional[str] = None) -> list[dict]:
        """Search for Unity assets by name.

        Args:
            query: Search string (case-insensitive)
            category: Optional category filter

        Returns list of matching assets with metadata.
        """
        index = UnityAssets.index_assets()
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
    def get_asset_by_path(asset_path: str) -> Optional[dict]:
        """Get asset metadata by relative path."""
        assets_dir = UnityAssets.detect_unity_assets()
        if not assets_dir:
            return None

        full_path = assets_dir / asset_path
        if not full_path.exists():
            return None

        # Find associated textures
        texture_paths = []
        texture_dir = full_path.parent / "Textures"
        if not texture_dir.exists():
            # Try sibling Materials folder
            texture_dir = full_path.parent.parent / "Textures"

        if texture_dir.exists():
            for ext in ['.png', '.jpg', '.jpeg', '.tga', '.dds']:
                texture_paths.extend([str(p.relative_to(assets_dir)) for p in texture_dir.rglob(f"*{ext}")])

        return {
            "name": full_path.stem,
            "asset_path": asset_path,
            "full_path": str(full_path),
            "texture_paths": texture_paths,
            "format": full_path.suffix[1:].upper(),
        }

    @staticmethod
    def get_status() -> tuple[bool, str]:
        """Get Unity assets status for UI display."""
        assets_dir = UnityAssets.detect_unity_assets()

        if not assets_dir:
            return False, "Unity assets not configured. Set path in addon preferences."

        # Count available assets
        index = UnityAssets.index_assets()
        total_assets = sum(len(assets) for assets in index.values())

        return True, f"Unity assets: {assets_dir} ({total_assets} models indexed)"


def register():
    """Register module."""
    pass


def unregister():
    """Unregister module."""
    pass
