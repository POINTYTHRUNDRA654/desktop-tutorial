import pathlib
import re
import zipfile

root = pathlib.Path(__file__).resolve().parent

# The add-on is packaged in the legacy Blender add-on format so it installs
# correctly on ALL supported Blender versions: 2.90 through 5.x.
#
# Format: all files are stored under ``fallout4_tutorial_helper/`` inside the
# zip.  When the user installs via Edit → Preferences → Add-ons → Install from
# Disk (or "Install Legacy Add-on" on Blender 4.2+), Blender extracts the
# ``fallout4_tutorial_helper/`` directory and places it in the add-ons folder.
# The ``bl_info`` dict in ``__init__.py`` is read for metadata on Blender
# 2.90-4.1; ``blender_manifest.toml`` (also inside the folder) is used by
# Blender 4.2+ for additional metadata.
#
# Reference:
#   https://docs.blender.org/manual/en/latest/advanced/scripting/addon_tutorial.html
ADDON_PACKAGE = "fallout4_tutorial_helper"


def read_version() -> str:
    """Extract the add-on version from __init__.py as a dotted string."""
    init_text = (root / "__init__.py").read_text(encoding="utf-8")
    match = re.search(r"\"version\"\s*:\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)", init_text)
    if not match:
        return "0.0.0"
    major, minor, patch = match.groups()
    return f"{major}.{minor}.{patch}"


def should_skip(rel: pathlib.Path) -> bool:
    """Return True for paths that must NOT be included in the add-on ZIP."""
    # Always skip .git directories
    if ".git" in rel.parts:
        return True

    # Top-level directories that should never be bundled
    skip_roots = {".github", "ffmpeg", "whisper"}
    if rel.parts and rel.parts[0] in skip_roots:
        return True

    # Virtual environments
    if rel.parts and rel.parts[0].startswith(".venv"):
        return True

    # Cache / IDE artefact directories (anywhere in path)
    cache_dirs = {"__pycache__", ".mypy_cache", ".pytest_cache", ".idea", ".vscode"}
    if any(part in cache_dirs for part in rel.parts):
        return True
    if any(part.endswith(".pyc") for part in rel.parts):
        return True

    # Previously-built add-on ZIPs for this package
    if rel.name.startswith(f"{ADDON_PACKAGE}-") and rel.name.endswith(".zip"):
        return True

    # Root-level developer tooling / documentation (not needed inside Blender)
    if len(rel.parts) == 1:
        name = rel.name
        if name in {
            "build.py", "build_zip.py", "build_zip.ps1", "makezip.py",
            "build.log",
        }:
            return True
        if name.startswith("test_") and name.endswith(".py"):
            return True
        if name.startswith("example_") and name.endswith(".py"):
            return True
        if name in {
            "setup.bat", "setup.sh", "setup_comfyui.bat",
            "enable_long_paths.reg",
        }:
            return True
        # Root-level docs excluded; knowledge_base/*.md kept (runtime data)
        if name.endswith(".md"):
            return True
        if name.endswith(".txt") and name not in {
            "requirements.txt", "requirements-optional.txt",
        }:
            return True

    # Binary tool sub-directories inside tools/
    binary_tool_dirs = {
        "ffmpeg", "whisper", "nvtt", "texconv",
        "umodel_tools", "Blender-UE4-Importer",
        "UnityFBX-To-Blender-Importer", "intellicode",
        "act",
    }
    if len(rel.parts) >= 2 and rel.parts[0] == "tools" and rel.parts[1] in binary_tool_dirs:
        return True

    return False


def main() -> None:
    version = read_version()
    zip_name = f"{ADDON_PACKAGE}-v{version}.zip"
    zip_path = root / zip_name

    # Legacy format: store every file under the fallout4_tutorial_helper/
    # directory prefix inside the zip so Blender can install it on all
    # versions from 2.90 through 5.x.
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            if should_skip(rel):
                continue
            arcname = pathlib.Path(ADDON_PACKAGE) / rel
            zf.write(path, arcname)

    print("Created", zip_path)
    print("  Install: Edit → Preferences → Add-ons → Install from Disk")


if __name__ == "__main__":
    main()
