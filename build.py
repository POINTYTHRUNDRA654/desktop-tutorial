"""
build.py – packages the Blender add-on into a versioned zip file.

Run:
    python build.py

The zip is written to the repository root as
    fallout4_tutorial_helper-v<VERSION>.zip
and contains all .py files under the `fallout4_tutorial_helper/` folder name
so Blender can install it directly.
"""

import ast
import os
import re
import sys
import zipfile

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------
REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
INIT_PATH = os.path.join(REPO_ROOT, "__init__.py")
ADDON_FOLDER = "fallout4_tutorial_helper"

# ---------------------------------------------------------------------------
# Read version from bl_info in __init__.py
# ---------------------------------------------------------------------------

def _read_version() -> str:
    """Return the version string from bl_info['version'] in __init__.py."""
    with open(INIT_PATH, "r", encoding="utf-8") as fh:
        source = fh.read()

    # Fast path: regex for  "version": (major, minor, patch)
    match = re.search(r'"version"\s*:\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', source)
    if match:
        return "{}.{}.{}".format(*match.groups())

    # Fallback: walk the AST
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Dict):
            for key, value in zip(node.keys, node.values):
                if isinstance(key, ast.Constant) and key.value == "version":
                    if isinstance(value, ast.Tuple):
                        parts = [
                            elt.value
                            for elt in value.elts
                            if isinstance(elt, ast.Constant)
                        ]
                        return ".".join(str(p) for p in parts)

    raise RuntimeError("Could not read version from bl_info in __init__.py")


# ---------------------------------------------------------------------------
# Collect source files
# ---------------------------------------------------------------------------

def _collect_files() -> list[tuple[str, str]]:
    """
    Return a list of (filesystem_path, zip_path) pairs.

    Every *.py file in the repo root is included under
    fallout4_tutorial_helper/<filename>.
    """
    # Files that are dev/build tools and should NOT be packaged into the addon zip
    EXCLUDE = {"build.py"}

    entries: list[tuple[str, str]] = []
    for fname in sorted(os.listdir(REPO_ROOT)):
        if (
            fname.endswith(".py")
            and fname not in EXCLUDE
            and os.path.isfile(os.path.join(REPO_ROOT, fname))
        ):
            fs_path = os.path.join(REPO_ROOT, fname)
            zip_path = f"{ADDON_FOLDER}/{fname}"
            entries.append((fs_path, zip_path))
    return entries


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def build() -> str:
    """Build the zip and return its path."""
    version = _read_version()
    zip_name = f"fallout4_tutorial_helper-v{version}.zip"
    zip_path = os.path.join(REPO_ROOT, zip_name)

    files = _collect_files()
    if not files:
        raise RuntimeError("No .py files found to package.")

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for fs_path, zip_path_entry in files:
            zf.write(fs_path, zip_path_entry)

    print(f"Built {zip_name}  ({len(files)} files)")
    return zip_path


if __name__ == "__main__":
    try:
        build()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
