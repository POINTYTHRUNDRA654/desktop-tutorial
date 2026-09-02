"""Unreal Engine Asset Browser and Importer

Browses Unreal Engine project assets (FBX, USD, static/skeletal meshes) and imports
them into Blender with proper materials and textures.

Supports:
- Unreal Engine project Content folders
- Extracted UE assets (via UModel, FModel, or UE CLI exporters)
- Custom asset collections
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional


class UnrealAssets:
    """Manager for Unreal Engine asset detection and browsing."""

    _assets_dir: Optional[Path] = None
    _asset_index: Optional[dict] = None

    @staticmethod
    def detect_unreal_assets() -> Optional[Path]:
        """Detect Unreal Engine assets directory.

        Checks (in order):
        1. Custom assets path from addon preferences
        2. Cached detection result
        """
        if UnrealAssets._assets_dir and UnrealAssets._assets_dir.exists():
            return UnrealAssets._assets_dir

        # Check custom path from preferences
        try:
            from . import preferences
            custom_path = preferences.get_unreal_assets_path()
            if custom_path:
                custom_path_obj = Path(custom_path)
                if custom_path_obj.exists():
                    UnrealAssets._assets_dir = custom_path_obj
                    return custom_path_obj
        except Exception as e:
            print(f"Failed to check custom Unreal assets path: {e}")

        return None

    @staticmethod
    def get_asset_categories() -> dict[str, list[str]]:
        """Get categorized list of common Unreal asset folder patterns.

        Returns dictionary mapping category to folder name patterns.
        """
        return {
            "Characters": [
                "Characters/",
                "Meshes/Characters/",
                "Content/Characters/",
            ],
            "Weapons": [
                "Weapons/",
                "Meshes/Weapons/",
                "Content/Weapons/",
            ],
            "Props": [
                "Props/",
                "Meshes/Props/",
                "StaticMeshes/Props/",
            ],
            "Environment": [
                "Environment/",
                "Meshes/Environment/",
                "Landscape/",
            ],
            "Vehicles": [
                "Vehicles/",
                "Meshes/Vehicles/",
            ],
            "All Meshes": [
                "Meshes/",
                "StaticMeshes/",
                "SkeletalMeshes/",
            ],
        }

    @staticmethod
    def index_assets(force_rebuild: bool = False) -> dict:
        """Build or load index of available Unreal assets.

        Scans for FBX, USD, PSK (UE skeletal), and other 3D model formats.
        """
        if UnrealAssets._asset_index and not force_rebuild:
            return UnrealAssets._asset_index

        # Check for cached index
        from . import tool_installers
        tools_root = tool_installers.get_tools_root()
        index_file = tools_root / "unreal_asset_index.json"

        if index_file.exists() and not force_rebuild:
            try:
                with open(index_file, 'r', encoding='utf-8') as f:
                    UnrealAssets._asset_index = json.load(f)
                    return UnrealAssets._asset_index
            except Exception as e:
                print(f"Failed to load Unreal asset index: {e}")

        # Build new index
        assets_dir = UnrealAssets.detect_unreal_assets()
        if not assets_dir:
            return {}

        index = {}
        categories = UnrealAssets.get_asset_categories()

        # Supported 3D formats (including UE-specific formats)
        model_extensions = [
            '.fbx',      # Standard FBX export
            '.obj',      # Standard OBJ export
            '.usd',      # USD format (UE5+)
            '.uasset',   # UE asset file (needs UModel/FModel to extract)
            '.psk',      # UE skeletal mesh
            '.pskx',     # UE skeletal mesh (extended)
            '.gltf',     # glTF export
            '.glb',      # glTF binary
        ]

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

                            # Determine asset type
                            asset_type = "Static Mesh"
                            if "skeletal" in str(model_file).lower() or ext in ['.psk', '.pskx']:
                                asset_type = "Skeletal Mesh"

                            index[category].append({
                                "name": model_file.stem,
                                "path": str(rel_path),
                                "full_path": str(model_file),
                                "format": ext[1:].upper(),  # Remove dot, uppercase
                                "type": asset_type,
                            })

        # Save index
        try:
            tools_root.mkdir(parents=True, exist_ok=True)
            with open(index_file, 'w', encoding='utf-8') as f:
                json.dump(index, f, indent=2)
        except Exception as e:
            print(f"Failed to save Unreal asset index: {e}")

        UnrealAssets._asset_index = index
        return index

    @staticmethod
    def search_assets(query: str, category: Optional[str] = None) -> list[dict]:
        """Search for Unreal assets by name.

        Args:
            query: Search string (case-insensitive)
            category: Optional category filter

        Returns list of matching assets with metadata.
        """
        index = UnrealAssets.index_assets()
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
        assets_dir = UnrealAssets.detect_unreal_assets()
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
            for ext in ['.png', '.jpg', '.jpeg', '.tga', '.dds', '.uasset']:
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
        """Get Unreal Engine assets status for UI display."""
        assets_dir = UnrealAssets.detect_unreal_assets()

        if not assets_dir:
            return False, "Unreal Engine assets not configured. Set path in addon preferences."

        # Count available assets
        index = UnrealAssets.index_assets()
        total_assets = sum(len(assets) for assets in index.values())

        return True, f"Unreal assets: {assets_dir} ({total_assets} models indexed)"


def register():
    """Register module."""
    pass


def unregister():
    """Unregister module."""
    pass
