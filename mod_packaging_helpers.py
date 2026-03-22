"""
Fallout 4 Mod Packaging Helpers
=================================
End-to-end tools to package a finished Blender project as a distributable
Fallout 4 mod:

1. **Create Mod Directory Structure** – generates the correct ``Data/``
   folder layout (meshes, textures, sound, scripts, strings, FOMOD).
2. **Generate FOMOD Installer** – writes ``fomod/info.xml`` and
   ``fomod/ModuleConfig.xml`` so the mod installs cleanly through Vortex /
   MO2 / NMM.
3. **Validate Mod Structure** – checks that every required folder and file is
   present before packaging.
4. **Generate README** – writes a professional Nexus-ready README.md with
   all standard sections (description, requirements, installation, credits).
5. **Archive2 Stub** – writes a ``pack_ba2.bat`` / ``pack_ba2.sh`` helper
   that calls Bethesda's Archive2.exe to pack loose files into a ``.ba2``.

Usage (Python scripting workspace)
------------------------------------
>>> from mod_packaging_helpers import ModPackager
>>> ok, msg = ModPackager.create_structure("/mods/MyMod", "MyMod")
>>> ok2, msg2 = ModPackager.generate_fomod("/mods/MyMod", {
...     "name": "My Awesome Mod",
...     "author": "YourName",
...     "version": "1.0",
...     "description": "Adds a new weapon.",
...     "fo4_version": "1.10.163",
... })
>>> ok3, msg3 = ModPackager.generate_readme("/mods/MyMod", {...})
>>> ok4, result = ModPackager.validate_structure("/mods/MyMod", "MyMod")
"""

from __future__ import annotations

import os
import json
import datetime
import bpy

# ---------------------------------------------------------------------------
# Standard FO4 mod directory layout
# ---------------------------------------------------------------------------

# Required directories (relative to mod root / Data/)
_DATA_DIRS = [
    "meshes",
    "textures",
    "sound/fx",
    "sound/voice",
    "music",
    "scripts",
    "scripts/source/user",
    "strings",
    "interface",
    "shadersfx",
    "materials",
    "vis",
    "lodsettings",
]

# Optional but common directories
_OPTIONAL_DIRS = [
    "meshes/actors",
    "meshes/weapons",
    "meshes/armor",
    "meshes/props",
    "meshes/architecture",
    "textures/actors",
    "textures/weapons",
    "textures/armor",
    "textures/props",
    "textures/architecture",
    "textures/effects",
]

# FOMOD directory
_FOMOD_DIRS = ["fomod"]

# Files that MUST exist in a complete mod
_REQUIRED_FILES = [
    "fomod/info.xml",
    "fomod/ModuleConfig.xml",
    "README.md",
]


# ---------------------------------------------------------------------------
# ModPackager
# ---------------------------------------------------------------------------

class ModPackager:
    """Create, validate, and document a complete FO4 mod package."""

    # ------------------------------------------------------------------
    # Directory structure
    # ------------------------------------------------------------------

    @staticmethod
    def create_structure(mod_root: str, mod_name: str,
                         include_optional: bool = True) -> tuple[bool, str]:
        """Create the standard FO4 mod directory layout under *mod_root*.

        Creates:
        - ``<mod_root>/Data/`` with all standard sub-folders
        - ``<mod_root>/fomod/`` with placeholder XML files
        - ``<mod_root>/README.md`` stub
        - ``<mod_root>/pack_ba2.bat`` and ``pack_ba2.sh`` stubs

        Returns (True, summary_message) on success.
        """
        try:
            data_root = os.path.join(mod_root, "Data")
            dirs_to_create = list(_DATA_DIRS) + list(_FOMOD_DIRS)
            if include_optional:
                dirs_to_create += list(_OPTIONAL_DIRS)

            created = []
            for d in dirs_to_create:
                full = os.path.join(data_root, d)
                if not os.path.isdir(full):
                    os.makedirs(full, exist_ok=True)
                    created.append(d)

            # fomod/ is at mod root, not inside Data/
            fomod_dir = os.path.join(mod_root, "fomod")
            os.makedirs(fomod_dir, exist_ok=True)

            # Write .gitkeep placeholders so empty folders survive git
            for d in dirs_to_create:
                keep = os.path.join(data_root, d, ".gitkeep")
                if not os.path.exists(keep):
                    open(keep, "w").close()

            # BA2 pack scripts
            ModPackager._write_ba2_scripts(mod_root, mod_name)

            return True, (
                f"Mod structure created at {mod_root}\n"
                f"  Created {len(created)} directories\n"
                f"  Data root: {data_root}\n"
                f"  FOMOD: {fomod_dir}"
            )
        except Exception as exc:
            return False, f"Failed to create mod structure: {exc}"

    # ------------------------------------------------------------------
    # FOMOD installer
    # ------------------------------------------------------------------

    @staticmethod
    def generate_fomod(mod_root: str, info: dict) -> tuple[bool, str]:
        """Write ``fomod/info.xml`` and ``fomod/ModuleConfig.xml``.

        *info* dict keys:
          ``name``        – display name
          ``author``      – author / team
          ``version``     – semver string, e.g. "1.0.0"
          ``description`` – one-paragraph description
          ``fo4_version`` – minimum FO4 version, e.g. "1.10.163"
          ``nexus_id``    – Nexus Mods page ID (optional, default "")
          ``image``       – path to screenshot inside fomod/ (optional)
          ``plugin_name`` – .esp / .esm / .esl filename (optional)
          ``website``     – mod page URL (optional)
        """
        try:
            fomod_dir = os.path.join(mod_root, "fomod")
            os.makedirs(fomod_dir, exist_ok=True)

            name        = info.get("name", "My FO4 Mod")
            author      = info.get("author", "Unknown")
            version     = info.get("version", "1.0.0")
            description = info.get("description", "A Fallout 4 mod.")
            fo4_ver     = info.get("fo4_version", "1.10.163")
            nexus_id    = info.get("nexus_id", "")
            image       = info.get("image", "")
            plugin      = info.get("plugin_name", "")
            website     = info.get("website", "")

            # ── info.xml ─────────────────────────────────────────────────
            info_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!--
    FOMOD info.xml
    Generated by FO4 Mod Assistant (Blender add-on) on {datetime.date.today()}
    Edit this file in a text editor or the FOMOD Creation Tool.
-->
<fomod>
    <Name>{_xml_esc(name)}</Name>
    <Author>{_xml_esc(author)}</Author>
    <Version>{_xml_esc(version)}</Version>
    <Description>{_xml_esc(description)}</Description>
    <Website>{_xml_esc(website)}</Website>
    {f'<Id>{nexus_id}</Id>' if nexus_id else '<!-- <Id>your_nexus_id</Id> -->'}
</fomod>
"""
            # ── ModuleConfig.xml ──────────────────────────────────────────
            # Pre-compute the optional image tag outside the f-string so that
            # backslashes never appear inside an f-string expression block.
            # (Python ≤3.11 raises SyntaxError for backslashes inside f-string
            #  expressions; Python 3.12 relaxed this restriction.)
            if image:
                _image_tag = '<moduleImage path="fomod\\{}" />'.format(
                    _xml_esc(image)
                )
            else:
                _image_tag = '<!-- <moduleImage path="fomod\\screenshot.png" /> -->'

            # Build the file list section
            file_entries = []
            if plugin:
                file_entries.append(
                    f'                <file source="Data\\{_xml_esc(plugin)}" '
                    f'destination="{_xml_esc(plugin)}" priority="0" />'
                )
            file_entries.append(
                '                <!-- Add more <file> or <folder> entries below -->'
            )
            file_entries.append(
                '                <folder source="Data\\" destination="" priority="0" />'
            )

            module_cfg = f"""<?xml version="1.0" encoding="UTF-8"?>
<!--
    FOMOD ModuleConfig.xml
    Generated by FO4 Mod Assistant (Blender add-on) on {datetime.date.today()}

    This is a MINIMAL single-option installer.
    Use the FOMOD Creation Tool by Wenderer (https://www.nexusmods.com/fallout4/mods/6821)
    to build more complex multi-option installers with conditions, flags, and screenshots.
    FOMOD XML docs: http://fomod-docs.readthedocs.io/en/latest/tutorial.html
-->
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">

    <moduleName>{_xml_esc(name)}</moduleName>
    {_image_tag}

    <requiredInstallFiles>
        <!--
            Files listed here are ALWAYS installed regardless of user choices.
            Use <file> for individual files, <folder> for entire directories.
        -->
{chr(10).join(file_entries)}
    </requiredInstallFiles>

    <installSteps order="Explicit">
        <!--
            Add <installStep> elements here for optional components.
            For a simple mod with no options, this section can be empty.
        -->
    </installSteps>

    <conditionalFileInstalls>
        <!--
            Conditional installs based on other mods / flags.
            Leave empty if not needed.
        -->
        <patterns />
    </conditionalFileInstalls>

</config>
"""

            with open(os.path.join(fomod_dir, "info.xml"), "w",
                      encoding="utf-8") as fh:
                fh.write(info_xml)

            with open(os.path.join(fomod_dir, "ModuleConfig.xml"), "w",
                      encoding="utf-8") as fh:
                fh.write(module_cfg)

            return True, (
                f"FOMOD installer written to {fomod_dir}\n"
                f"  info.xml: name={name}, version={version}, author={author}\n"
                f"  ModuleConfig.xml: single-option installer\n"
                f"  Tip: use FOMOD Creation Tool by Wenderer (Nexus 6821) to add optional components,\n"
                f"  conditions, flags, and preview screenshots"
            )
        except Exception as exc:
            return False, f"Failed to generate FOMOD: {exc}"

    # ------------------------------------------------------------------
    # README generator
    # ------------------------------------------------------------------

    @staticmethod
    def generate_readme(mod_root: str, info: dict) -> tuple[bool, str]:
        """Write a professional Nexus-ready ``README.md``.

        Same *info* dict as :meth:`generate_fomod`.
        Extra keys:
          ``requirements`` – list of str (other mod names required)
          ``recommended``  – list of str (recommended mods)
          ``features``     – list of str (bullet points)
          ``known_issues`` – list of str
          ``credits``      – list of str
          ``permissions``  – str (e.g. "Do not reupload without permission")
          ``changelog``    – dict { "1.0.0": ["initial release"], ... }
        """
        try:
            name        = info.get("name", "My FO4 Mod")
            author      = info.get("author", "Unknown")
            version     = info.get("version", "1.0.0")
            description = info.get("description", "A Fallout 4 mod.")
            website     = info.get("website", "")
            fo4_ver     = info.get("fo4_version", "1.10.163")
            requirements = info.get("requirements", [])
            recommended  = info.get("recommended", [])
            features     = info.get("features", [])
            known_issues = info.get("known_issues", [])
            credits_list = info.get("credits", [])
            permissions  = info.get("permissions",
                "You may NOT reupload this mod without the author's permission.")
            changelog    = info.get("changelog", {"1.0.0": ["Initial release"]})

            def _bullets(items, default="None"):
                if not items:
                    return f"- {default}"
                return "\n".join(f"- {i}" for i in items)

            def _changelog_section():
                if not changelog:
                    return f"### v{version}\n- Initial release\n"
                lines = []
                for ver, entries in changelog.items():
                    lines.append(f"### v{ver}")
                    for e in entries:
                        lines.append(f"- {e}")
                    lines.append("")
                return "\n".join(lines)

            readme = f"""# {name}

> **Version:** {version} | **Author:** {author} | **Game:** Fallout 4

{f'**Mod Page:** {website}' if website else ''}

---

## 📋 Description

{description}

---

## ✨ Features

{_bullets(features, 'See description above')}

---

## 📦 Requirements

The following mods / tools are **required**:

- Fallout 4 (version {fo4_ver} or later)
- [Fallout 4 Script Extender (F4SE)](https://f4se.silverlock.org/)
{_bullets(requirements) if requirements else '- No other requirements'}

### Recommended (optional)

{_bullets(recommended) if recommended else '- None'}

---

## 🔧 Installation

### Recommended (Vortex or Mod Organizer 2)

1. Download the mod archive.
2. In Vortex / MO2 click **Install from file**.
3. Enable the mod and deploy.
4. Launch Fallout 4 through the mod manager.

### Manual

1. Extract the archive.
2. Copy the contents of the `Data/` folder into your Fallout 4 `Data/` folder.
3. Enable `{info.get('plugin_name', name.replace(' ', '') + '.esp')}` in your mod manager or `plugins.txt`.

---

## ⚠️ Known Issues

{_bullets(known_issues, 'None known')}

Please report issues on the mod page.

---

## 🗂️ Changelog

{_changelog_section()}

---

## 🙏 Credits

{_bullets(credits_list, 'Created entirely by ' + author)}

- Bethesda Softworks for Fallout 4 and the Creation Kit.
- Niftools team for the Blender NIF add-on.
- FO4 Mod Assistant (Blender add-on) used for mesh / texture preparation.

---

## 📜 Permissions

{permissions}

---

*README generated by FO4 Mod Assistant – {datetime.date.today()}*
"""

            readme_path = os.path.join(mod_root, "README.md")
            with open(readme_path, "w", encoding="utf-8") as fh:
                fh.write(readme)

            return True, f"README.md written: {readme_path}"
        except Exception as exc:
            return False, f"Failed to generate README: {exc}"

    # ------------------------------------------------------------------
    # Structure validator
    # ------------------------------------------------------------------

    @staticmethod
    def validate_structure(mod_root: str,
                           mod_name: str) -> tuple[bool, list[str]]:
        """Check the mod directory for required files and folders.

        Returns (all_ok: bool, issues: list[str]).
        Each issue is a human-readable string.
        """
        issues   = []
        data_root = os.path.join(mod_root, "Data")

        # Required dirs
        for d in ["meshes", "textures", "scripts"]:
            full = os.path.join(data_root, d)
            if not os.path.isdir(full):
                issues.append(f"Missing directory: Data/{d}/")

        # FOMOD
        for f in ["fomod/info.xml", "fomod/ModuleConfig.xml"]:
            full = os.path.join(mod_root, f)
            if not os.path.isfile(full):
                issues.append(f"Missing: {f}")

        # README
        if not os.path.isfile(os.path.join(mod_root, "README.md")):
            issues.append("Missing: README.md")

        # Plugin file
        for ext in (".esp", ".esm", ".esl"):
            candidate = os.path.join(data_root, mod_name + ext)
            if os.path.isfile(candidate):
                break
        else:
            issues.append(
                f"No plugin file found: {mod_name}.esp / .esm / .esl "
                f"(create it in the Creation Kit)"
            )

        # Warn if meshes/ or textures/ is empty (excluding .gitkeep)
        for sub in ("meshes", "textures"):
            folder = os.path.join(data_root, sub)
            if os.path.isdir(folder):
                real_files = [
                    f for f in os.listdir(folder)
                    if not f.startswith(".") and f != ".gitkeep"
                ]
                if not real_files:
                    issues.append(
                        f"Warning: Data/{sub}/ is empty – "
                        "make sure you export your meshes / textures"
                    )

        all_ok = all("Warning:" not in i and "Missing:" not in i
                     for i in issues
                     if not i.startswith("Warning:"))
        # Stricter: fail on any Missing:, pass on Warning: only
        has_errors = any(i.startswith("Missing:") for i in issues)

        return not has_errors, issues

    # ------------------------------------------------------------------
    # Archive2 / BA2 pack scripts
    # ------------------------------------------------------------------

    @staticmethod
    def _write_ba2_scripts(mod_root: str, mod_name: str) -> None:
        """Write pack_ba2.bat and pack_ba2.sh helper scripts."""
        plugin_base = mod_name.replace(" ", "")

        bat = f"""@echo off
REM pack_ba2.bat – generated by FO4 Mod Assistant
REM Pack loose files in Data\\ into a .ba2 archive
REM
REM Usage: Edit ARCHIVE2_PATH and GAME_DATA_PATH then double-click this file.
REM
REM Download Archive2.exe from:
REM   https://www.nexusmods.com/fallout4/mods/78449  (ba2utils)
REM   OR extract from the Creation Kit installation.

set ARCHIVE2_PATH=C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Tools\\Archive2\\Archive2.exe
set GAME_DATA_PATH=C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Data

REM --- General archive (meshes, sounds, scripts, etc.) ---
"%ARCHIVE2_PATH%" "%~dp0Data" -c="{plugin_base} - Main.ba2" -f=General

REM --- Texture archive (separate for performance) ---
"%ARCHIVE2_PATH%" "%~dp0Data\\textures" -c="{plugin_base} - Textures.ba2" -f=DDS

echo Done! Copy {plugin_base} - Main.ba2 and {plugin_base} - Textures.ba2 to your game Data\\ folder.
pause
"""

        sh = f"""#!/bin/bash
# pack_ba2.sh – generated by FO4 Mod Assistant
# Uses Wine + Archive2.exe on Linux/macOS, or native Archive2 on Windows.

ARCHIVE2="$HOME/.steam/steam/steamapps/common/Fallout 4/Tools/Archive2/Archive2.exe"
DATA_DIR="$(dirname "$0")/Data"

# General archive
wine "$ARCHIVE2" "$DATA_DIR" -c="{plugin_base} - Main.ba2" -f=General

# Texture archive
wine "$ARCHIVE2" "$DATA_DIR/textures" -c="{plugin_base} - Textures.ba2" -f=DDS

echo "Done! Move the .ba2 files into your game Data/ folder."
"""

        for filename, content in (("pack_ba2.bat", bat), ("pack_ba2.sh", sh)):
            try:
                with open(os.path.join(mod_root, filename), "w",
                          encoding="utf-8", newline='\r\n' if 'bat' in filename else '\n') as fh:
                    fh.write(content)
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Export manifest (JSON)
    # ------------------------------------------------------------------

    @staticmethod
    def export_manifest(mod_root: str, info: dict) -> tuple[bool, str]:
        """Write a ``mod_manifest.json`` with metadata and file inventory."""
        try:
            data_root = os.path.join(mod_root, "Data")
            files = []
            if os.path.isdir(data_root):
                for root, dirs, filenames in os.walk(data_root):
                    dirs[:] = [d for d in dirs if not d.startswith(".")]
                    for fn in filenames:
                        if fn.startswith("."):
                            continue
                        rel = os.path.relpath(os.path.join(root, fn),
                                              data_root)
                        files.append(rel.replace("\\", "/"))

            # Read version dynamically so the manifest is always in sync
            try:
                import importlib
                _init = importlib.import_module("fallout4_tutorial_helper")
                _ver_tuple = _init.bl_info.get("version", (2, 4, 0))
                _addon_version = ".".join(str(v) for v in _ver_tuple)
            except Exception:
                _addon_version = "2.4.0"

            manifest = {
                "name":          info.get("name", "Unknown"),
                "author":        info.get("author", "Unknown"),
                "version":       info.get("version", "1.0.0"),
                "game":          "Fallout 4",
                "fo4_version":   info.get("fo4_version", "1.10.163"),
                "generated_by":  f"FO4 Mod Assistant (Blender add-on) v{_addon_version}",
                "generated_at":  datetime.datetime.utcnow().isoformat(),
                "file_count":    len(files),
                "files":         sorted(files),
            }

            path = os.path.join(mod_root, "mod_manifest.json")
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(manifest, fh, indent=2)

            return True, f"Manifest written: {path} ({len(files)} files)"
        except Exception as exc:
            return False, f"Failed to write manifest: {exc}"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _xml_esc(s: str) -> str:
    """Escape special characters for XML."""
    return (s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;")
             .replace("'", "&apos;"))


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register():
    bpy.types.Scene.fo4_mod_name        = bpy.props.StringProperty(
        name="Mod Name",
        description="Your mod's name (used for plugin filename, FOMOD, README)",
        default="MyFO4Mod",
    )
    bpy.types.Scene.fo4_mod_author      = bpy.props.StringProperty(
        name="Author",
        description="Your name / team name",
        default="",
    )
    bpy.types.Scene.fo4_mod_version     = bpy.props.StringProperty(
        name="Version",
        description="Semantic version string, e.g. 1.0.0",
        default="1.0.0",
    )
    bpy.types.Scene.fo4_mod_description = bpy.props.StringProperty(
        name="Description",
        description="One-line description for FOMOD and README",
        default="",
    )
    bpy.types.Scene.fo4_mod_root        = bpy.props.StringProperty(
        name="Mod Root Folder",
        description="Where to create the mod directory structure",
        subtype="DIR_PATH",
        default="",
    )
    bpy.types.Scene.fo4_mod_website     = bpy.props.StringProperty(
        name="Website / Nexus URL",
        description="URL for the mod page (optional)",
        default="",
    )
    bpy.types.Scene.fo4_mod_plugin_name = bpy.props.StringProperty(
        name="Plugin Filename",
        description="ESP/ESM/ESL filename without extension, e.g. MyMod",
        default="",
    )
    bpy.types.Scene.fo4_mod_fo4_version = bpy.props.StringProperty(
        name="Min FO4 Version",
        description="Minimum Fallout 4 version required, e.g. 1.10.163",
        default="1.10.163",
    )

    # ── Armor / Clothing properties ──────────────────────────────────────────
    bpy.types.Scene.fo4_armor_body_slot = bpy.props.IntProperty(
        name="Body Slot",
        description=(
            "FO4 ArmorAddon biped object slot (30=Body, 31=Head, 32=Hair, "
            "33=Hands, 34=Forearms, 37=Feet, 38=Calves, 39=Back, 44-60=Custom)"
        ),
        default=30,
        min=30,
        max=61,
    )


def unregister():
    for prop in (
        "fo4_mod_name", "fo4_mod_author", "fo4_mod_version",
        "fo4_mod_description", "fo4_mod_root", "fo4_mod_website",
        "fo4_mod_plugin_name", "fo4_mod_fo4_version",
        "fo4_armor_body_slot",
    ):
        if hasattr(bpy.types.Scene, prop):
            try:
                delattr(bpy.types.Scene, prop)
            except Exception:
                pass
