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
import threading
import urllib.error
import urllib.request

# ── Module-level state ────────────────────────────────────────────────────────
# Stored as module globals so the UI can read them between operator calls.
# These values are never written to .blend files.
_update_status: str = ""   # "" | "checking" | "up_to_date" | "available" | "error"
_latest_version: str = ""  # e.g. "2.4.0"
_download_url: str = ""    # direct zip download URL from the GitHub release
_error_message: str = ""   # last human-readable error
_needs_restart: bool = False  # True after a successful in-place update install
_auto_checked: bool = False   # prevents multiple auto-checks per session
_check_cancelled: bool = False  # set on unregister to abort in-flight background checks

GITHUB_RELEASES_API = (
    "https://api.github.com/repos/POINTYTHRUNDRA654/Blender-add-on./releases/latest"
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


# ── Background auto-update helpers ───────────────────────────────────────────

def _redraw_all():
    """Trigger a UI redraw from the main thread after a background check."""
    try:
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                area.tag_redraw()
    except Exception:
        pass
    return None  # one-shot timer


def _auto_install_if_enabled():
    """Trigger the install operator when auto-install preference is set."""
    try:
        scene = bpy.context.scene
        if scene and getattr(scene, "fo4_auto_install_updates", False):
            if _update_status == "available" and _download_url:
                bpy.ops.fo4.install_update()
    except Exception:
        pass
    return None  # one-shot timer


def _background_check_thread():
    """Run in a daemon thread: query GitHub and update module-level state."""
    global _update_status, _latest_version, _download_url, _error_message

    # Bail out early if the add-on was unregistered while we were waiting
    if _check_cancelled:
        return

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

        for asset in data.get("assets", []):
            name = asset.get("name", "")
            if name.startswith("blender_game_tools") and name.endswith(".zip"):
                _download_url = asset.get("browser_download_url", "")
                break

        _latest_version = _version_str(latest)

        if latest > current:
            _update_status = "available"
            print(
                f"[FO4 Updater] Update available: v{_latest_version} "
                f"(installed: v{_version_str(current)})"
            )
        else:
            _update_status = "up_to_date"
            print(f"[FO4 Updater] Add-on is up to date (v{_version_str(current)}).")

    except urllib.error.URLError as exc:
        _update_status = "error"
        _error_message = f"Network error: {exc.reason}"
        print(f"[FO4 Updater] Auto-check failed: {exc.reason}")
    except Exception as exc:
        _update_status = "error"
        _error_message = str(exc)
        print(f"[FO4 Updater] Auto-check failed: {exc}")

    # Schedule UI work back on the main thread; skip if the add-on was
    # disabled while we were running.
    if _check_cancelled:
        return
    try:
        bpy.app.timers.register(_redraw_all, first_interval=0.1)
        if _update_status == "available":
            bpy.app.timers.register(_auto_install_if_enabled, first_interval=0.2)
    except Exception as exc:
        print(f"[FO4 Updater] Could not schedule post-check UI update: {exc}")


def schedule_startup_check():
    """Schedule a background update check ~5 s after Blender finishes loading.

    The delay keeps startup snappy; the thread-based check avoids blocking the
    main thread even for slow connections.  Calling this more than once is safe
    – the ``_auto_checked`` flag prevents duplicate checks.
    """
    global _auto_checked

    if _auto_checked:
        return

    def _deferred():
        global _auto_checked
        if _auto_checked:
            return None
        _auto_checked = True

        # Respect the user's preference (default: check enabled).
        try:
            scene = bpy.context.scene
            if scene and not getattr(scene, "fo4_auto_check_updates", True):
                return None
        except Exception:
            pass

        t = threading.Thread(target=_background_check_thread, daemon=True)
        t.start()
        return None  # one-shot timer

    try:
        bpy.app.timers.register(_deferred, first_interval=5.0)
    except Exception as exc:
        print(f"[FO4 Updater] Could not schedule auto-check: {exc}")


# ── Operators ─────────────────────────────────────────────────────────────────

class FO4_OT_CheckForUpdate(Operator):
    bl_idname = "fo4.check_for_update"
    bl_label = "Check for Update"
    bl_description = "Check GitHub for a newer version of this add-on"

    def execute(self, context):
        global _update_status, _latest_version, _download_url, _error_message, _needs_restart

        _update_status = "checking"
        _latest_version = ""
        _download_url = ""
        _error_message = ""
        # Clear the restart-needed flag when the user initiates a new check so
        # a stale "Restart Blender Now" prompt doesn't linger after a fresh look.
        _needs_restart = False

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

            # Find the add-on zip among the release assets
            for asset in data.get("assets", []):
                name = asset.get("name", "")
                if name.startswith("blender_game_tools") and name.endswith(".zip"):
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
        global _update_status, _error_message, _needs_restart

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
                headers={"User-Agent": "blender_game_tools"},
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                import shutil
                with open(tmp_path, "wb") as out:
                    shutil.copyfileobj(resp, out)

            # overwrite=True replaces the existing version in-place – the user
            # never has to uninstall the old version first.
            bpy.ops.preferences.addon_install(filepath=tmp_path, overwrite=True)
            bpy.ops.preferences.addon_enable(module="blender_game_tools")
            bpy.ops.wm.save_userpref()

            _update_status = "up_to_date"
            _needs_restart = True
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
        if _needs_restart:
            col.label(
                text="Restart Blender for the update to take effect.", icon="ERROR"
            )
            # fo4.reload_addon defers the quit via bpy.app.timers so it runs
            # after the current UI event is processed — safe in Blender 5.0.1.
            col.operator("fo4.reload_addon", text="Restart Blender Now", icon="QUIT")
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

    # Auto-update preference toggles
    col.separator()
    try:
        scene = bpy.context.scene
        if scene:
            col.prop(scene, "fo4_auto_check_updates")
            row = col.row()
            row.enabled = getattr(scene, "fo4_auto_check_updates", True)
            row.prop(scene, "fo4_auto_install_updates")
    except Exception:
        pass


# ── Registration ──────────────────────────────────────────────────────────────

_classes = [FO4_OT_CheckForUpdate, FO4_OT_InstallUpdate]


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)


def unregister():
    global _check_cancelled
    _check_cancelled = True
    for cls in reversed(_classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
