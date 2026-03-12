"""
GitHub-based auto-updater for the Fallout 4 Mod Assistant add-on.

Operators
---------
FO4_OT_CheckForUpdate  –  queries the GitHub releases API to see if a newer
                           version is available.
FO4_OT_InstallUpdate   –  downloads the latest zip from GitHub and installs
                           it in-place (overwrite=True), so the user never
                           needs to uninstall the old version first.

Public helper
-------------
draw_update_ui(layout)  –  renders the update section into any Blender layout.
"""

import bpy
from bpy.types import Operator
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.request

# ── Module-level state ────────────────────────────────────────────────────────
# Stored as module globals so the UI can read them between operator calls.
# These values are never written to .blend files.
_update_status: str = ""   # "" | "checking" | "up_to_date" | "available" | "error"
_latest_version: str = ""  # e.g. "2.4.0"
_download_url: str = ""    # direct zip download URL from the GitHub release
_error_message: str = ""   # last human-readable error

GITHUB_RELEASES_API = (
    "https://api.github.com/repos/POINTYTHRUNDRA654/Blender-add-on./releases/latest"
)


# ── Version helpers ───────────────────────────────────────────────────────────

def _current_version() -> tuple:
    """Return the installed add-on version tuple from bl_info."""
    pkg = sys.modules.get(__package__ or "fallout4_tutorial_helper")
    if pkg and hasattr(pkg, "bl_info"):
        return tuple(pkg.bl_info.get("version", (0, 0, 0)))
    return (0, 0, 0)


def _parse_version(tag: str) -> tuple:
    """Parse a tag like 'v2.4.0' or '2.4.0' into (2, 4, 0)."""
    nums = re.findall(r"\d+", tag)
    return tuple(int(n) for n in nums[:3])


def _version_str(version_tuple: tuple) -> str:
    return ".".join(str(n) for n in version_tuple)


# ── Operators ─────────────────────────────────────────────────────────────────

class FO4_OT_CheckForUpdate(Operator):
    bl_idname = "fo4.check_for_update"
    bl_label = "Check for Update"
    bl_description = "Check GitHub for a newer version of this add-on"

    def execute(self, context):
        global _update_status, _latest_version, _download_url, _error_message

        _update_status = "checking"
        _latest_version = ""
        _download_url = ""
        _error_message = ""

        try:
            req = urllib.request.Request(
                GITHUB_RELEASES_API,
                headers={
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "fallout4_tutorial_helper",
                },
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())

            tag = data.get("tag_name", "")
            latest = _parse_version(tag)
            current = _current_version()

            # Find the add-on zip among the release assets
            for asset in data.get("assets", []):
                name = asset.get("name", "")
                if name.startswith("fallout4_tutorial_helper") and name.endswith(".zip"):
                    _download_url = asset.get("browser_download_url", "")
                    break

            _latest_version = _version_str(latest)

            if latest > current:
                _update_status = "available"
                self.report({"INFO"}, f"Update available: v{_latest_version}")
            else:
                _update_status = "up_to_date"
                self.report({"INFO"}, "Add-on is up to date.")

        except urllib.error.URLError as exc:
            _update_status = "error"
            _error_message = f"Network error: {exc.reason}"
            self.report({"WARNING"}, f"Update check failed: {exc.reason}")
        except Exception as exc:
            _update_status = "error"
            _error_message = str(exc)
            self.report({"WARNING"}, f"Update check failed: {exc}")

        for area in context.screen.areas:
            area.tag_redraw()

        return {"FINISHED"}


class FO4_OT_InstallUpdate(Operator):
    bl_idname = "fo4.install_update"
    bl_label = "Download & Install Update"
    bl_description = (
        "Download the latest release from GitHub and install it over the "
        "existing add-on (no uninstall required)"
    )

    def execute(self, context):
        global _update_status, _error_message

        if not _download_url:
            self.report({"ERROR"}, "No download URL – run Check for Update first.")
            return {"CANCELLED"}

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                suffix=".zip", delete=False, prefix="fo4_update_"
            ) as tmp:
                tmp_path = tmp.name

            req = urllib.request.Request(
                _download_url,
                headers={"User-Agent": "fallout4_tutorial_helper"},
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                import shutil
                with open(tmp_path, "wb") as out:
                    shutil.copyfileobj(resp, out)

            # overwrite=True replaces the existing version in-place – the user
            # never has to uninstall the old version first.
            bpy.ops.preferences.addon_install(filepath=tmp_path, overwrite=True)
            bpy.ops.preferences.addon_enable(module="fallout4_tutorial_helper")
            bpy.ops.wm.save_userpref()

            _update_status = "up_to_date"
            self.report(
                {"INFO"},
                "Update installed successfully. Please restart Blender for all "
                "changes to take effect.",
            )

        except urllib.error.URLError as exc:
            _update_status = "error"
            _error_message = f"Download failed: {exc.reason}"
            self.report({"ERROR"}, f"Download failed: {exc.reason}")
            return {"CANCELLED"}
        except Exception as exc:
            _update_status = "error"
            _error_message = str(exc)
            self.report({"ERROR"}, f"Update failed: {exc}")
            return {"CANCELLED"}
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

        for area in context.screen.areas:
            area.tag_redraw()

        return {"FINISHED"}


# ── UI helper ─────────────────────────────────────────────────────────────────

def draw_update_ui(layout):
    """Draw the add-on update section into any Blender layout."""
    box = layout.box()
    box.label(text="Add-on Update", icon="FILE_REFRESH")
    col = box.column(align=True)

    current = _version_str(_current_version())

    if _update_status == "":
        col.label(text=f"Installed: v{current}", icon="INFO")
        col.operator("fo4.check_for_update", icon="URL")

    elif _update_status == "checking":
        col.label(text="Checking for updates…", icon="TIME")

    elif _update_status == "up_to_date":
        col.label(text=f"Installed: v{current} — up to date", icon="CHECKMARK")
        col.operator("fo4.check_for_update", text="Check Again", icon="URL")

    elif _update_status == "available":
        col.label(
            text=f"New version available: v{_latest_version}  (installed: v{current})",
            icon="ERROR",
        )
        if _download_url:
            col.operator("fo4.install_update", icon="IMPORT")
        else:
            col.label(text="No zip asset found in release — install manually.", icon="QUESTION")
        col.operator("fo4.check_for_update", text="Check Again", icon="URL")

    elif _update_status == "error":
        col.label(text=f"Error: {_error_message}", icon="ERROR")
        col.operator("fo4.check_for_update", text="Retry", icon="URL")


# ── Registration ──────────────────────────────────────────────────────────────

_classes = [FO4_OT_CheckForUpdate, FO4_OT_InstallUpdate]


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(_classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
