#!/usr/bin/env python3
"""
build_addon.py
==============
Cross-platform build script for the Mossy Fallout 4 Blender Add-on add-on.

Produces one zip per supported Blender version range:

  mossy-fo4-blender-addon-v{ADDON_VER}-blender3x.zip   Blender 3.6 LTS
  mossy-fo4-blender-addon-v{ADDON_VER}-blender4x.zip   Blender 4.0–4.1
  mossy-fo4-blender-addon-v{ADDON_VER}-blender42.zip   Blender 4.2+ (Extensions)
  mossy-fo4-blender-addon-v{ADDON_VER}-blender5x.zip   Blender 5.x

Each zip contains a single folder  ``blender_game_tools/``  that Blender
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
import json
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ADDON_FOLDER_NAME = "blender_game_tools"
ZIP_FILE_PREFIX   = "mossy-fo4-blender-addon"

# Files and directories to EXCLUDE from every zip
EXCLUDE = {
    ".git", ".github", ".gitattributes", ".gitignore", ".githooks", ".vscode", ".vs",
    "build_temp", "build_addon.py", "build.ps1", "build.log",
    "*.zip", "*.pyc", "__pycache__",
    "README.md", "GIT_RECOVERY_GUIDE.md", "BUTTON_PATTERN_GUIDE.md",
    "DEVELOPMENT_NOTES.md", "RELEASE_GUIDE.md", "MIGRATION_v5.1.0.md",
    "COMPLETION_REPORT.md", "BLENDER_EXTENSION_SUBMISSION.md",
    "fix_git_remote.bat", "resolve_conflicts.bat",
    ".DS_Store", "Thumbs.db",
    # The repo-root manifest is only used for direct-folder installation;
    # it is regenerated dynamically for each zip variant.
    "blender_manifest.toml",
    # Virtual environments and local test artefacts must never ship
    ".venv", "venv", "env", ".env",
    "test_extract",
    # Developer / session helper scripts
    "start_session.bat", "end_session.bat",
    # Desktop installer scripts (dev tools, not part of the addon)
    "install_addon.bat", "install_addon.ps1",
    # Standalone test files (no use inside Blender)
    "test_addon_integrity.py",
}

# Blender version variants
VARIANTS = {
    "blender3x": {
        "label":        "Blender 3.6 LTS",
        "blender_min":  (3, 6, 0),
        "blender_max":  (3, 6, 99),
        "manifest":     False,
    },
    "blender4x": {
        "label":        "Blender 4.0–4.1",
        "blender_min":  (4, 0, 0),
        "blender_max":  (4, 1, 99),
        "manifest":     False,
    },
    "blender42": {
        "label":        "Blender 4.2+ (Extension)",
        "blender_min":  (4, 2, 0),
        "blender_max":  (4, 99, 99),
        "manifest":     True,
    },
    "blender5x": {
        "label":        "Blender 5.x",
        "blender_min":  (5, 0, 0),
        "blender_max":  None,
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


ADDON_WEBSITE = "https://github.com/POINTYTHRUNDRA654/Blender-add-on."


def _make_manifest(addon_version: str, blender_min: tuple,
                   blender_max: tuple | None = None) -> str:
    """Generate a blender_manifest.toml for the Extension system."""
    bmin = f"{blender_min[0]}.{blender_min[1]}.{blender_min[2]}"
    lines = textwrap.dedent(f"""\
        schema_version = "1.0.0"

        id = "blender_game_tools"
        version = "{addon_version}"
        name = "Mossy Fallout 4 Blender Add-on"
        tagline = "Professional Fallout 4 modding tools by Mossy Industries"
        maintainer = "Mossy Industries <support@mossy.industries>"
        type = "add-on"
        website = "{ADDON_WEBSITE}"

        blender_version_min = "{bmin}"
        """)
    # Append optional upper-bound so the zip is rejected by out-of-range Blender
    if blender_max is not None:
        bmax = f"{blender_max[0]}.{blender_max[1]}.{blender_max[2]}"
        lines += f'blender_version_max = "{bmax}"\n'
    lines += textwrap.dedent("""\

        license = ["SPDX:GPL-3.0-or-later"]
        category = "Import-Export"

        [permissions]
        network = "Connect to FREE Mossy desktop app (localhost only - no cloud services, no API keys required)"
        files = "Read/write Fallout 4 data folders and export mesh files"
        """)
    return lines


def build_nexus_bundle(outdir: Path, addon_version: str,
                       variant_zips: list) -> Path:
    """Create a single Nexus Mods bundle zip containing all variant zips
    plus a plain-text install guide so users know which zip to pick."""
    bundle_name = f"{ZIP_FILE_PREFIX}-v{addon_version}-nexus-bundle.zip"
    bundle_path = outdir / bundle_name
    bundle_path.unlink(missing_ok=True)

    install_guide = textwrap.dedent(f"""\
        Mossy Fallout 4 Blender Add-on  v{addon_version}  — Nexus Mods Bundle
        A Mossy Industries Product

        ════════════════════════════════════════════════════════════════════════

        INSTALLATION — Pick the zip that matches your Blender version:

          • Blender 5.0 or later     →  mossy-fo4-blender-addon-v{addon_version}-blender5x.zip
          • Blender 4.2 – 4.9        →  mossy-fo4-blender-addon-v{addon_version}-blender42.zip
          • Blender 4.0 – 4.1        →  mossy-fo4-blender-addon-v{addon_version}-blender4x.zip
          • Blender 3.6 LTS          →  mossy-fo4-blender-addon-v{addon_version}-blender3x.zip

        Check your Blender version:  Help → About Blender

        Installing:
          1. Open Blender
          2. Edit → Preferences → Add-ons → Install
          3. Select the zip that matches your Blender version
          4. Enable the add-on (check the box)

        ════════════════════════════════════════════════════════════════════════

        FEATURES

        ✓ 100% FREE - No subscriptions, no API keys required
        ✓ FREE Local AI - Powered by Mossy Industries desktop app
        ✓ Professional NIF export (BSTriShape format)
        ✓ Automatic mesh preparation & validation
        ✓ UCX_ collision generation
        ✓ DDS texture conversion
        ✓ Havok animation export
        ✓ Quest/NPC/item creation helpers
        ✓ Multi-engine support (FO4, Unreal, Unity)

        ════════════════════════════════════════════════════════════════════════

        AI FEATURES (Optional - 100% FREE)

        For FREE AI-powered scene analysis and assistance:

        1. Download Mossy Industries desktop app (free)
        2. In Blender: Press N → Fallout 4 → Settings
        3. Enable "AI Advisor (via Mossy)"
        4. Connect to Mossy (localhost only - no cloud)

        All AI runs locally on YOUR machine. No API keys, no cloud services,
        no data transmission. Complete privacy.

        ════════════════════════════════════════════════════════════════════════

        SUPPORT

        GitHub: https://github.com/POINTYTHRUNDRA654/Blender-add-on
        Issues: https://github.com/POINTYTHRUNDRA654/Blender-add-on/issues

        Mossy Industries - Professional tools for game modders

        ════════════════════════════════════════════════════════════════════════
        """)

    with zipfile.ZipFile(bundle_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("INSTALL_GUIDE.txt", install_guide)
        # Nexus metadata (included for Nexus listing and external stores)
        nexus_meta = {
            "name": ZIP_FILE_PREFIX,
            "version": addon_version,
            "repository": "https://github.com/POINTYTHRUNDRA654/Blender-add-on",
            "issues": "https://github.com/POINTYTHRUNDRA654/Blender-add-on/issues",
            "sponsors": "https://github.com/sponsors/POINTYTHRUNDRA654",
            "patreon": "https://www.patreon.com/c/Pointytundra654",
            "donations": {
                "buymeacoffee": "https://buymeacoffee.com/tundra654"
            }
        }
        zf.writestr("NEXUS_METADATA.json", json.dumps(nexus_meta, indent=2))
        for zp in variant_zips:
            zf.write(zp, zp.name)

    size_kb = bundle_path.stat().st_size // 1024
    print(f"  ✓  {bundle_name}  ({size_kb} KB)  [Nexus bundle — all variants + install guide]")
    return bundle_path


def build_variant(root: Path, outdir: Path, addon_version: str,
                  variant_key: str, variant: dict) -> Path:
    """Build one zip for *variant_key* and return the zip path."""
    zip_name = (
        f"{ZIP_FILE_PREFIX}-v{addon_version}-{variant_key}.zip"
    )
    zip_path = outdir / zip_name
    zip_path.unlink(missing_ok=True)

    blender_min = variant["blender_min"]
    include_manifest = variant["manifest"]

    # Blender 4.2+ Extension format: files sit at the ROOT of the zip so
    # that blender_manifest.toml is found at the top level.  Legacy add-on
    # format (3.x / 4.0-4.1): files live inside blender_game_tools/.
    is_extension = include_manifest

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in sorted(root.rglob("*")):
            if _is_excluded(item, root):
                continue
            if item.is_dir():
                continue
            rel = item.relative_to(root)
            # Extension format: all .py files from the repo root land at the
            # zip root (__init__.py, operators.py, preferences.py, …) alongside
            # the generated blender_manifest.toml - exactly what Blender's
            # Get-Extensions → Install-from-Disk expects.
            # Legacy add-on format: everything goes under blender_game_tools/
            # so Blender's old add-on installer finds the module folder.
            arc_name = str(rel) if is_extension else f"{ADDON_FOLDER_NAME}/{rel}"

            if item.name == "__init__.py":
                # Patch the minimum Blender version for this variant
                src = item.read_text(encoding="utf-8")
                src = _patch_blender_min(src, blender_min)
                zf.writestr(arc_name, src)
            else:
                zf.write(item, arc_name)

        if include_manifest:
            manifest_src = _make_manifest(addon_version, blender_min,
                                          variant.get("blender_max"))
            # Always at the zip root so Blender's Extension installer finds it
            zf.writestr("blender_manifest.toml", manifest_src)

    size_kb = zip_path.stat().st_size // 1024
    print(f"  ✓  {zip_name}  ({size_kb} KB)  [{variant['label']}]")
    return zip_path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Build Mossy Fallout 4 Blender Add-on add-on zips."
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

    # ---- Pre-build validation: null bytes, syntax, class ordering ---------------
    import ast as _ast, re as _re
    _pre_errors = []
    for _pyf in sorted(root.rglob("*.py")):
        if any(p in _pyf.parts for p in [".venv","venv","__pycache__","build_temp"]):
            continue
        try:
            _src = _pyf.read_bytes()
        except Exception:
            continue
        if b"\x00" in _src:
            _pre_errors.append(f"NULL BYTES: {_pyf.relative_to(root)}")
            continue
        _txt = _src.decode("utf-8", errors="replace")
        try:
            _ast.parse(_txt)
        except SyntaxError as _se:
            _pre_errors.append(f"SYNTAX {_pyf.name} line {_se.lineno}: {_se.msg}")
            continue
        _cm = _re.search(r"\n_CLASSES\s*=\s*\[([^\]]+)\]", _txt, _re.DOTALL)
        if _cm:
            _lp = _cm.start()
            for _cn in _re.findall(r"(FO4_\w+|TORCH_\w+|IMPORT_\w+|GENERATE_\w+)", _cm.group(1)):
                _dp = _txt.find(f"class {_cn}")
                if _dp != -1 and _dp > _lp:
                    _pre_errors.append(f"ORDER: {_pyf.name}: {_cn} defined after _CLASSES")
    if _pre_errors:
        print(f"PRE-BUILD ERRORS ({len(_pre_errors)}) -- fix before packaging:")
        for _e in _pre_errors:
            print(f"  FAIL: {_e}")
        raise SystemExit(1)
    print("Pre-build validation: OK")
    # -----------------------------------------------------------------------------

    print(f"Building Mossy Fallout 4 Blender Add-on  v{addon_version}")
    print(f"Output → {outdir}")

    # Show the git branch and commit so you can verify you're building the
    # right code.  If branch is not 'main', the latest fixes may not be
    # included - merge the open Pull Request on GitHub first, then run
    # start_session.bat to pull, and rebuild.
    try:
        import subprocess as _sp
        _branch = _sp.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=str(root), text=True, stderr=_sp.DEVNULL,
        ).strip()
        _commit = _sp.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=str(root), text=True, stderr=_sp.DEVNULL,
        ).strip()
        print(f"Source  → branch={_branch}  commit={_commit}")
        if _branch not in ("main", "HEAD"):
            print(
                f"  ⚠  You are on branch '{_branch}', not 'main'.\n"
                "     If you are missing recent fixes, merge the open Pull\n"
                "     Request on GitHub, run start_session.bat, then rebuild."
            )
    except Exception:
        pass  # git not available or not a git repo - skip silently

    print()

    keys = list(VARIANTS.keys()) if args.version == "all" else [args.version]
    built = []
    for key in keys:
        built.append(build_variant(root, outdir, addon_version, key, VARIANTS[key]))

    # Build the Nexus bundle whenever all variants are requested
    if args.version == "all":
        print()
        print("Building Nexus Mods bundle…")
        build_nexus_bundle(outdir, addon_version, built)

    print()
    print(f"Done - {len(built)} zip(s) built.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
