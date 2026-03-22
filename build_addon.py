#!/usr/bin/env python3
"""
build_addon.py
==============
Cross-platform build script for the Fallout 4 Tutorial Helper add-on.

Produces one zip per supported Blender version range:

  fallout4_tutorial_helper-v{ADDON_VER}-blender3x.zip   Blender 3.6 LTS
  fallout4_tutorial_helper-v{ADDON_VER}-blender4x.zip   Blender 4.0–4.1
  fallout4_tutorial_helper-v{ADDON_VER}-blender42.zip   Blender 4.2+ (Extensions)
  fallout4_tutorial_helper-v{ADDON_VER}-blender5x.zip   Blender 5.x

Each zip contains a single folder  ``fallout4_tutorial_helper/``  that Blender
can install directly via Edit → Preferences → Add-ons → Install.

The Blender 4.2+ zip additionally includes a ``blender_manifest.toml`` so it
works with Blender's Extension system.

Usage
-----
    python3 build_addon.py                # build all versions
    python3 build_addon.py --version 5x  # build one specific variant
    python3 build_addon.py --outdir dist  # write zips to a custom folder
"""

import argparse
import ast
import os
import re
import shutil
import sys
import tempfile
import textwrap
import zipfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ADDON_FOLDER_NAME = "fallout4_tutorial_helper"

# Files and directories to EXCLUDE from every zip
EXCLUDE = {
    ".git", ".github", ".gitattributes", ".gitignore", ".vscode",
    "build_temp", "build_addon.py", "build.ps1", "build.log",
    "*.zip", "*.pyc", "__pycache__",
    "README.md", "GIT_RECOVERY_GUIDE.md", "BUTTON_PATTERN_GUIDE.md",
    "DEVELOPMENT_NOTES.md", "fix_git_remote.bat",
    ".DS_Store", "Thumbs.db",
    # Virtual environments and local test artefacts must never ship
    ".venv", "venv", "env", ".env",
    "test_extract",
    # Developer / session helper scripts
    "start_session.bat", "end_session.bat",
    # Standalone test files (no use inside Blender)
    "test_addon_integrity.py",
}

# Blender version variants
VARIANTS = {
    "blender3x": {
        "label":        "Blender 3.6 LTS",
        "blender_min":  (3, 6, 0),
        "manifest":     False,
    },
    "blender4x": {
        "label":        "Blender 4.0–4.1",
        "blender_min":  (4, 0, 0),
        "manifest":     False,
    },
    "blender42": {
        "label":        "Blender 4.2+ (Extension)",
        "blender_min":  (4, 2, 0),
        "manifest":     True,
    },
    "blender5x": {
        "label":        "Blender 5.x",
        "blender_min":  (5, 0, 0),
        "manifest":     True,
    },
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_addon_version(root: Path) -> str:
    """Read the add-on version tuple from __init__.py and return it as a
    dot-separated string (e.g. ``'5.0.0'`` for ``(5, 0, 0)``).
    Falls back to ``'0.0.0'`` if the version cannot be parsed."""
    src = (root / "__init__.py").read_text(encoding="utf-8")
    m = re.search(r'"version"\s*:\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)', src)
    if m:
        return f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
    return "0.0.0"


def _is_excluded(path: Path, root: Path) -> bool:
    """Return True if *path* matches an exclusion pattern."""
    rel = path.relative_to(root)
    parts = set(rel.parts)
    for exc in EXCLUDE:
        if exc.startswith("*"):
            if path.suffix == exc[1:] or path.name.endswith(exc[1:]):
                return True
        else:
            if exc in parts or path.name == exc:
                return True
    return False


def _patch_blender_min(src: str, blender_min: tuple) -> str:
    """Replace the 'blender' key in bl_info with *blender_min*."""
    ver_str = f"({blender_min[0]}, {blender_min[1]}, {blender_min[2]})"
    return re.sub(
        r'("blender"\s*:\s*)\([^)]+\)',
        rf'\g<1>{ver_str}',
        src,
    )


def _make_manifest(addon_version: str, blender_min: tuple) -> str:
    """Generate a blender_manifest.toml for the Extension system."""
    bmin = f"{blender_min[0]}.{blender_min[1]}.{blender_min[2]}"
    return textwrap.dedent(f"""\
        schema_version = "1.0.0"

        id = "fallout4_tutorial_helper"
        version = "{addon_version}"
        name = "Fallout 4 Mod Assistant"
        tagline = "Professional Fallout 4 modding tools for Blender"
        maintainer = "Tutorial Team"
        type = "add-on"

        blender_version_min = "{bmin}"

        license = ["SPDX:GPL-3.0-or-later"]
        category = "Import-Export"

        [permissions]
        network = "Download tools and AI models on demand"
        files = "Read / write FO4 data folder and export NIF files"
    """)


def build_variant(root: Path, outdir: Path, addon_version: str,
                  variant_key: str, variant: dict) -> Path:
    """Build one zip for *variant_key* and return the zip path."""
    zip_name = (
        f"fallout4_tutorial_helper-v{addon_version}-{variant_key}.zip"
    )
    zip_path = outdir / zip_name
    zip_path.unlink(missing_ok=True)

    blender_min = variant["blender_min"]
    include_manifest = variant["manifest"]

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in sorted(root.rglob("*")):
            if _is_excluded(item, root):
                continue
            if item.is_dir():
                continue
            rel = item.relative_to(root)
            arc_name = f"{ADDON_FOLDER_NAME}/{rel}"

            if item.name == "__init__.py":
                # Patch the minimum Blender version for this variant
                src = item.read_text(encoding="utf-8")
                src = _patch_blender_min(src, blender_min)
                zf.writestr(arc_name, src)
            else:
                zf.write(item, arc_name)

        if include_manifest:
            manifest_src = _make_manifest(addon_version, blender_min)
            zf.writestr(f"{ADDON_FOLDER_NAME}/blender_manifest.toml",
                        manifest_src)

    size_kb = zip_path.stat().st_size // 1024
    print(f"  ✓  {zip_name}  ({size_kb} KB)  [{variant['label']}]")
    return zip_path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Build Fallout 4 Tutorial Helper add-on zips."
    )
    parser.add_argument(
        "--version",
        choices=list(VARIANTS.keys()) + ["all"],
        default="all",
        help="Which variant to build (default: all)",
    )
    parser.add_argument(
        "--outdir",
        default=".",
        help="Output directory for the zip files (default: repo root)",
    )
    args = parser.parse_args(argv)

    root = Path(__file__).parent.resolve()
    outdir = Path(args.outdir).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    addon_version = _read_addon_version(root)
    print(f"Building Fallout 4 Tutorial Helper  v{addon_version}")
    print(f"Output → {outdir}")
    print()

    keys = list(VARIANTS.keys()) if args.version == "all" else [args.version]
    built = []
    for key in keys:
        built.append(build_variant(root, outdir, addon_version, key, VARIANTS[key]))

    print()
    print(f"Done — {len(built)} zip(s) built.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
