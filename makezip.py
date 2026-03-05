import pathlib
import re
import zipfile

root = pathlib.Path(__file__).resolve().parent

# The add-on is packaged in Blender 4.2+ **Extensions** format.
# In this format all files live at the ZIP root (no outer directory wrapper)
# and ``blender_manifest.toml`` must be present at the root.  Blender reads
# the ``id`` field from the manifest and uses it as the installed directory
# name.  Because the id is stable across releases, Blender recognises a
# matching extension that is already installed and offers an in-place
# **Update** – the user no longer needs to uninstall the old version first.
#
# Reference:
#   https://docs.blender.org/manual/en/latest/advanced/extensions/package_format.html
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
    """Return True for paths that must NOT be included in the add-on ZIP.

    Excluded categories
    -------------------
    * Version-control internals: any ``.git`` directory, anywhere in the tree.
    * CI / GitHub workflow files: ``.github/``.
    * Python caches and IDE artefacts: ``__pycache__``, ``*.pyc``, ``.vscode``,
      ``.idea``, etc.
    * Virtual environments: ``.venv*``.
    * Previously-built add-on ZIPs (stale archives of this same package).
    * Large binary tool directories that are downloaded at runtime and must
      **not** be bundled: ``ffmpeg/``, ``whisper/``, ``act/``,
      ``tools/ffmpeg/``, ``tools/whisper/``, ``tools/nvtt/``,
      ``tools/texconv/``, ``tools/umodel_tools/``,
      ``tools/Blender-UE4-Importer/``, ``tools/UnityFBX-To-Blender-Importer/``,
      ``tools/intellicode/``.
    """
    # Always skip .git directories — even when nested inside bundled tools
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
    # Place the zip in the repo root so it is easy to download from GitHub
    zip_path = root / zip_name

    # Extensions format: write every file at its path relative to the repo
    # root, with NO outer ``fallout4_tutorial_helper/`` directory prefix.
    # Blender 4.2+ reads ``blender_manifest.toml`` from the zip root, extracts
    # the ``id`` and installs everything into a directory of that name inside
    # the extensions folder.  Because the id is stable, reinstalling a newer
    # zip updates the existing installation rather than requiring uninstall
    # first.
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            if should_skip(rel):
                continue
            zf.write(path, rel)  # arcname == rel: no outer directory prefix

    print("Created", zip_path)


if __name__ == "__main__":
    main()
