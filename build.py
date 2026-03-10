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
    """Return True for files that must NOT be bundled in the Blender add-on zip.

    Included in the zip
    -------------------
    * All ``*_helpers.py`` / ``operators.py`` / ``ui_panels.py`` etc. – add-on
      Python modules that Blender loads at runtime.
    * ``blender_manifest.toml`` – required by Blender 4.2+ for metadata.
    * ``requirements.txt`` / ``requirements-optional.txt`` – referenced by the
      tool-installer helper to list pip packages.
    * ``knowledge_base/*.md`` – markdown files read by the Mossy assistant at
      runtime (not developer docs).

    Excluded from the zip
    ---------------------
    * Version control, CI, IDE, cache directories.
    * Build scripts (``build.py``, ``build_zip.py``, ``makezip.py``, etc.).
    * Test scripts (``test_*.py``).
    * Example / tutorial standalone scripts (``example_*.py``).
    * Setup and installation helpers (``setup.bat``, ``setup.sh``, ``*.reg``).
    * Build log (``build.log``).
    * Root-level documentation markdown files (``*.md`` at the repo root –
      these are developer docs, not runtime data).  ``knowledge_base/*.md``
      are kept because the add-on reads them at runtime.
    * ``QUICK_REFERENCE.txt`` and other root-level plain-text docs.
    * Large binary tool sub-directories downloaded at runtime.
    """
    # ── Version control / CI ────────────────────────────────────────────
    if ".git" in rel.parts:
        return True
    skip_roots = {".github", "ffmpeg", "whisper"}
    if rel.parts and rel.parts[0] in skip_roots:
        return True

    # ── Virtual environments ────────────────────────────────────────────
    if rel.parts and rel.parts[0].startswith(".venv"):
        return True

    # ── Python caches and IDE artefacts ────────────────────────────────
    cache_dirs = {"__pycache__", ".mypy_cache", ".pytest_cache", ".idea", ".vscode"}
    if any(part in cache_dirs for part in rel.parts):
        return True
    if any(part.endswith(".pyc") for part in rel.parts):
        return True

    # ── Previously-built add-on zips ───────────────────────────────────
    if rel.name.startswith(f"{ADDON_PACKAGE}-") and rel.name.endswith(".zip"):
        return True

    # ── Root-level files that are developer/CI tooling, not add-on code ──
    # Only apply these rules for files sitting directly in the repo root
    # (len == 1) so subdirectory files (e.g. knowledge_base/*.md) are not
    # accidentally excluded.
    if len(rel.parts) == 1:
        name = rel.name

        # Build scripts
        if name in {
            "build.py", "build_zip.py", "build_zip.ps1", "makezip.py",
            "build.log",
        }:
            return True

        # Test scripts
        if name.startswith("test_") and name.endswith(".py"):
            return True

        # Example / tutorial standalone scripts
        if name.startswith("example_") and name.endswith(".py"):
            return True

        # Setup / installation helpers (Windows .bat, POSIX .sh, registry .reg)
        if name in {
            "setup.bat", "setup.sh", "setup_comfyui.bat",
            "enable_long_paths.reg",
        }:
            return True

        # Root-level developer documentation (markdown + plain-text)
        # These are README-style files for contributors; they are not read
        # by the add-on at runtime.  knowledge_base/*.md is NOT excluded
        # because that subtree is loaded by the Mossy assistant.
        if name.endswith(".md"):
            return True
        if name.endswith(".txt") and name not in {
            "requirements.txt", "requirements-optional.txt",
        }:
            return True

    # ── Large binary tool sub-directories downloaded at runtime ─────────
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
