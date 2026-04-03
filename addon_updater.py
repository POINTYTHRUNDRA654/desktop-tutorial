"""
GitHub update checker for the Mossy's Blender Add-On add-on.

Operators
---------
FO4_OT_CheckForUpdate  --  queries the GitHub releases API to see if a newer
                           version is available and reports the result.
                           To install an update, download the zip from GitHub
                           and install it via Edit > Preferences > Add-ons.

The automatic background check and automatic install features have been
removed.  Updates must be initiated manually by the user.
"""

import bpy
from bpy.types import Operator
import json
import re
import sys
import urllib.error
import urllib.request

# ── Module-level state ────────────────────────────────────────────────────────
_update_status: str = ""   # "" | "checking" | "up_to_date" | "available" | "error"
_latest_version: str = ""  # e.g. "2.4.0"
_release_url: str = ""     # HTML page URL for the latest GitHub release
_error_message: str = ""   # last human-readable error

GITHUB_RELEASES_API = (
    "https://api.github.com/repos/POINTYTHRUNDRA654/Blender-add-on./releases/latest"
)
GITHUB_RELEASES_PAGE = (
    "https://github.com/POINTYTHRUNDRA654/Blender-add-on./releases/latest"
)


# ── Version helpers ───────────────────────────────────────────────────────────

def _current_version() -> tuple:
    """Return the installed add-on version tuple from bl_info."""
    pkg = sys.modules.get(__package__ or "blender_game_tools")
    if pkg and hasattr(pkg, "bl_info"):
        return tuple(pkg.bl_info.get("version", (0, 0, 0)))
    return (0, 0, 0)


def _parse_version(tag: str) -> tuple:
    """Parse a tag like 'v2.4.0' or '2.4.0' into (2, 4, 0)."""
    nums = re.findall(r"\d+", tag)
    return tuple(int(n) for n in nums[:3])


def _version_str(version_tuple: tuple) -> str:
    return ".".join(str(n) for n in version_tuple)


# ── Operator ──────────────────────────────────────────────────────────────────

class FO4_OT_CheckForUpdate(Operator):
    bl_idname = "fo4.check_for_update"
    bl_label = "Check for Update"
    bl_description = "Check GitHub for a newer version of this add-on"

    def execute(self, context):
        global _update_status, _latest_version, _release_url, _error_message

        _update_status = "checking"
        _latest_version = ""
        _release_url = ""
        _error_message = ""

        try:
            req = urllib.request.Request(
                GITHUB_RELEASES_API,
                headers={
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "blender_game_tools",
                },
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())

            tag = data.get("tag_name", "")
            latest = _parse_version(tag)
            current = _current_version()
            _latest_version = _version_str(latest)
            _release_url = data.get("html_url", GITHUB_RELEASES_PAGE)

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
        col.label(text="Checking for updates...", icon="TIME")

    elif _update_status == "up_to_date":
        col.label(text=f"Installed: v{current} - up to date", icon="CHECKMARK")
        col.operator("fo4.check_for_update", text="Check Again", icon="URL")

    elif _update_status == "available":
        col.label(
            text=f"New version available: v{_latest_version}  (installed: v{current})",
            icon="ERROR",
        )
        col.label(
            text="Download the zip from GitHub and install via Edit > Preferences > Add-ons.",
            icon="INFO",
        )
        col.operator("fo4.check_for_update", text="Check Again", icon="URL")

    elif _update_status == "error":
        col.label(text=f"Error: {_error_message}", icon="ERROR")
        col.operator("fo4.check_for_update", text="Retry", icon="URL")


# ── Registration ──────────────────────────────────────────────────────────────

_classes = [FO4_OT_CheckForUpdate]


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(_classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
