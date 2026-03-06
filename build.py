"""Simple build script for the add-on.

Usage from PowerShell / Terminal:
    py build.py          # use the launcher, works even if "python" isn't on PATH

The script produces a zip that is compatible with ALL supported Blender versions
(2.90 through 5.x) using the **legacy add-on format**:

  fallout4_tutorial_helper/
      __init__.py
      operators.py
      ui_panels.py
      ... (all other add-on files)

This is the format Blender 2.90 – 5.x all accept via
  Edit → Preferences → Add-ons → Install from Disk

Blender 4.2+ can also install it with the "Install Legacy Add-on" button.
The blender_manifest.toml inside the folder is recognised by Blender 4.2+
for metadata but is safely ignored by older versions.

A line is also appended to build.log so you can see when the archive was last
rebuilt.
"""
import pathlib, re, zipfile, datetime

root = pathlib.Path(__file__).resolve().parent
ADDON_PACKAGE = "fallout4_tutorial_helper"


def read_version() -> str:
    init_text = (root / "__init__.py").read_text(encoding="utf-8")
    match = re.search(r"\"version\"\s*:\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)", init_text)
    if not match:
        return "0.0.0"
    major, minor, patch = match.groups()
    return f"{major}.{minor}.{patch}"


def should_skip(rel: pathlib.Path) -> bool:
    """Return True for files that must NOT be bundled."""
    # Version control / CI directories
    if ".git" in rel.parts:
        return True
    skip_roots = {".github", "ffmpeg", "whisper"}
    if rel.parts and rel.parts[0] in skip_roots:
        return True
    # Virtual environments
    if rel.parts and rel.parts[0].startswith(".venv"):
        return True
    # Python caches and IDE artefacts
    cache_dirs = {"__pycache__", ".mypy_cache", ".pytest_cache", ".idea", ".vscode"}
    if any(part in cache_dirs for part in rel.parts):
        return True
    if any(part.endswith(".pyc") for part in rel.parts):
        return True
    # Previously-built zips
    if rel.name.startswith(f"{ADDON_PACKAGE}-") and rel.name.endswith(".zip"):
        return True
    # Large binary tool sub-directories downloaded at runtime
    binary_tool_dirs = {
        "ffmpeg", "whisper", "nvtt", "texconv",
        "umodel_tools", "Blender-UE4-Importer",
        "UnityFBX-To-Blender-Importer", "intellicode", "act",
    }
    if len(rel.parts) >= 2 and rel.parts[0] == "tools" and rel.parts[1] in binary_tool_dirs:
        return True
    return False


def main():
    version = read_version()
    zip_name = f"{ADDON_PACKAGE}-v{version}.zip"
    zip_path = root / zip_name

    if zip_path.exists():
        zip_path.unlink()

    # Legacy add-on format: every file is stored under the
    # fallout4_tutorial_helper/ directory prefix inside the zip.
    # This is the format all Blender versions (2.90 through 5.x) accept.
    # Blender reads bl_info from __init__.py for metadata on versions < 4.2,
    # and also reads blender_manifest.toml (if present) on Blender 4.2+.
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            if should_skip(rel):
                continue
            # Prefix every path with the package directory name
            arcname = pathlib.Path(ADDON_PACKAGE) / rel
            zf.write(path, arcname)

    log = root / "build.log"
    with open(log, "a") as f:
        f.write(
            f"{datetime.datetime.now().isoformat()} "
            f"built {zip_name} (legacy format, Blender 2.90-5.x)\n"
        )

    print(f"Built {zip_path}")
    print(f"  Format : legacy (fallout4_tutorial_helper/ inside zip)")
    print(f"  Install: Edit → Preferences → Add-ons → Install from Disk")


if __name__ == "__main__":
    main()
