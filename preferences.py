"""
Addon preferences for Fallout 4 Tutorial Helper.
Provides a single path field for the Havok2FBX toolkit so users can point to an
existing install instead of duplicating binaries.
"""

from __future__ import annotations

import json
import os
import bpy


_DEFAULT_HAVOK2FBX_PATH = r"D:\Blender Foundation\havok2fbx_release_0.1a"
_DEFAULT_NVTT_PATH = ""
_DEFAULT_TEXCONV_PATH = ""
_DEFAULT_LLM_ENDPOINT = ""
_DEFAULT_LLM_MODEL = "gpt-4o"
_DEFAULT_ADVISOR_INTERVAL = 30
_DEFAULT_KB_PATH = ""

# ---------------------------------------------------------------------------
# Persistent key storage
# ---------------------------------------------------------------------------
# Blender stores addon preferences keyed by the addon's module name.  When the
# addon is renamed (e.g. fallout4_tutorial_helper → blender_game_tools) those
# saved values are orphaned and users lose their API keys.  We work around this
# by also writing key-type fields to a small JSON file whose name never changes.
# ---------------------------------------------------------------------------

_KEYS_FILENAME = ".blender_game_tools_keys.json"
_OLD_ADDON_NAME = "fallout4_tutorial_helper"


def _get_keys_file_path() -> str:
    """Return the absolute path to the persistent keys JSON file.

    The file lives in the user's home directory so it survives Blender version
    upgrades, addon reinstalls, and addon renames.
    """
    return os.path.join(os.path.expanduser("~"), _KEYS_FILENAME)


def save_api_keys() -> None:
    """Write the current API keys from preferences to the persistent keys file.

    Safe to call from any context; silently swallows I/O errors so a
    permission problem never crashes the addon.
    """
    prefs = get_preferences()
    if not prefs:
        return
    keys: dict = {
        "llm_api_key": prefs.llm_api_key,
        "mossy_token": prefs.token,
    }
    try:
        path = _get_keys_file_path()
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(keys, fh, indent=2)
        print(f"✓ API keys persisted to {path}")
    except Exception as exc:
        print(f"Could not save API keys: {exc}")


def load_api_keys() -> None:
    """Restore API keys from the persistent keys file into preferences.

    Only populates fields that are currently empty so a manually-entered
    value in the Preferences UI always wins over the saved file.

    Also attempts a one-time migration from the old addon name
    ``fallout4_tutorial_helper`` so users who upgraded from that version
    get their keys back automatically.
    """
    prefs = get_preferences()
    if not prefs:
        return

    # ── 1. Try migrating from the old addon name ──────────────────────────
    try:
        old_addon = bpy.context.preferences.addons.get(_OLD_ADDON_NAME)
        if old_addon and hasattr(old_addon, "preferences"):
            old_prefs = old_addon.preferences
            if (hasattr(old_prefs, "llm_api_key")
                    and isinstance(old_prefs.llm_api_key, str)
                    and old_prefs.llm_api_key
                    and isinstance(prefs.llm_api_key, str)
                    and not prefs.llm_api_key.strip()):
                prefs.llm_api_key = old_prefs.llm_api_key
                print(f"✓ Migrated LLM API key from '{_OLD_ADDON_NAME}'")
            if (hasattr(old_prefs, "token")
                    and isinstance(old_prefs.token, str)
                    and old_prefs.token
                    and isinstance(prefs.token, str)
                    and not prefs.token.strip()):
                prefs.token = old_prefs.token
                print(f"✓ Migrated Mossy token from '{_OLD_ADDON_NAME}'")
    except Exception as exc:
        print(f"Key migration from old addon skipped: {exc}")

    # ── 2. Restore from the persistent keys file ──────────────────────────
    path = _get_keys_file_path()
    if not os.path.isfile(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as fh:
            keys: dict = json.load(fh)
    except Exception as exc:
        print(f"Could not read saved API keys from {path}: {exc}")
        return

    llm_key = keys.get("llm_api_key", "")
    if llm_key and not prefs.llm_api_key.strip():
        prefs.llm_api_key = llm_key
        print("✓ LLM API key restored from keys file")

    mossy_token = keys.get("mossy_token", "")
    if mossy_token and not prefs.token.strip():
        prefs.token = mossy_token
        print("✓ Mossy Link token restored from keys file")


def _key_update(self, context) -> None:  # noqa: ARG001
    """Auto-save API keys to disk whenever a key field is changed."""
    save_api_keys()
    save_prefs_deferred()


def _addon_name() -> str:
    """Return the add-on module name for preference lookup.

    For regular addons this is the top-level package name (e.g.
    ``blender_game_tools``). For Blender extensions installed via the
    Extension Platform (Blender 4.2+) the module is prefixed with
    ``bl_ext.<repo>.`` (e.g. ``bl_ext.blender_org.blender_game_tools``).
    Returning ``__package__`` directly works correctly in both cases because
    preferences.py lives at the root of the addon package.
    """
    return __package__


def get_preferences():
    """Return the add-on preferences instance if registered, else None."""
    addon = bpy.context.preferences.addons.get(_addon_name())
    return addon.preferences if addon else None


def get_havok2fbx_path() -> str | None:
    """Return the configured Havok2FBX directory if set and exists."""
    prefs = get_preferences()
    if not prefs:
        return None
    path = bpy.path.abspath(prefs.havok2fbx_path)
    return path if path and os.path.isdir(path) else None


def is_havok2fbx_configured() -> bool:
    """True if the path is configured and points to an existing directory."""
    return get_havok2fbx_path() is not None


def get_llm_config() -> dict:
    prefs = get_preferences()
    if not prefs:
        return {"enabled": False}
    return {
        "enabled": prefs.llm_enabled,
        "endpoint": prefs.llm_endpoint.strip(),
        "model": prefs.llm_model.strip(),
        "api_key": prefs.llm_api_key.strip(),
        "allow_actions": prefs.llm_allow_actions,
        "send_stats": prefs.llm_send_stats,
    }


def _resolve_executable(path_value: str, exe_names: tuple[str, ...]) -> str | None:
    """If path_value points to an exe or directory containing exe, return exe path."""
    if not path_value:
        return None
    expanded = bpy.path.abspath(path_value)
    if os.path.isfile(expanded):
        return expanded if os.access(expanded, os.X_OK) else None
    if os.path.isdir(expanded):
        for exe in exe_names:
            candidate = os.path.join(expanded, exe)
            if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                return candidate
    return None


def get_configured_ffmpeg_path() -> str | None:
    """Return ffmpeg path from preferences if set and executable."""
    prefs = get_preferences()
    if not prefs:
        return None
    return _resolve_executable(prefs.ffmpeg_path, ("ffmpeg.exe", "ffmpeg"))


def get_configured_nvcompress_path() -> str | None:
    """Return nvcompress path from preferences if set and executable."""
    prefs = get_preferences()
    if not prefs:
        return None
    return _resolve_executable(prefs.nvtt_path, ("nvcompress.exe", "nvcompress"))


def get_configured_texconv_path() -> str | None:
    """Return texconv path from preferences if set and executable."""
    prefs = get_preferences()
    if not prefs:
        return None
    return _resolve_executable(prefs.texconv_path, ("texconv.exe", "texconv"))


def get_fo4_assets_path() -> str | None:
    """Return custom FO4 assets path from preferences if set and exists."""
    prefs = get_preferences()
    if not prefs:
        return None
    path = bpy.path.abspath(prefs.fo4_assets_path).strip()
    if path and os.path.isdir(path):
        return path
    return None


def get_unity_assets_path() -> str | None:
    """Return Unity assets path from preferences if set and exists."""
    prefs = get_preferences()
    if not prefs:
        return None
    path = bpy.path.abspath(prefs.unity_assets_path).strip()
    if path and os.path.isdir(path):
        return path
    return None


def get_unreal_assets_path() -> str | None:
    """Return Unreal Engine assets path from preferences if set and exists."""
    prefs = get_preferences()
    if not prefs:
        return None
    path = bpy.path.abspath(prefs.unreal_assets_path).strip()
    if path and os.path.isdir(path):
        return path
    return None


def get_torch_custom_path() -> str | None:
    """Return the persisted custom PyTorch installation directory, if set."""
    prefs = get_preferences()
    if not prefs:
        return None
    path = bpy.path.abspath(prefs.torch_custom_path).strip()
    return path if path else None


def set_torch_custom_path(path: str) -> None:
    """Persist a custom PyTorch installation path in the add-on preferences."""
    prefs = get_preferences()
    if prefs is not None:
        prefs.torch_custom_path = path
        prefs.torch_install_attempted = True
        save_prefs_deferred()


def get_umodel_path() -> str | None:
    """Return the persisted UModel installation directory, if set."""
    prefs = get_preferences()
    if not prefs:
        return None
    path = prefs.umodel_path.strip()
    return path if path else None


def set_umodel_path(path: str) -> None:
    """Persist the UModel installation directory in the add-on preferences."""
    prefs = get_preferences()
    if prefs is not None:
        prefs.umodel_path = path
        prefs.umodel_install_attempted = True
        save_prefs_deferred()


def _pref_path_update(self, context):  # noqa: ARG001
    """Update callback for addon-preference path properties.

    Blender updates the in-memory preference immediately when the user edits a
    path field that is bound via ``layout.prop(prefs, ...)``, but it does NOT
    automatically flush those changes to disk.  Attaching this function as the
    ``update=`` handler ensures that every keystroke (or paste) in a path field
    schedules a deferred ``save_userpref()`` call so the value is persisted
    across Blender restarts.
    """
    save_prefs_deferred()


# Global flag to prevent multiple timers from stacking up (fixes Blender 5.0 lag)
_prefs_save_pending = False

def save_prefs_deferred() -> None:
    """Schedule an explicit save of Blender user preferences via a timer.

    Safe to call from any context (draw(), modal, plain functions).  The
    actual ``bpy.ops.wm.save_userpref()`` call runs from the main-thread
    timer callback where a proper Blender context is available.

    A window context override is applied so the operator succeeds even when
    no area/region is active (e.g. inside a load_post handler or a timer
    fired with no focused panel).  Blender 3.2+ uses ``temp_override``; older
    builds fall back to a context-dict override.

    CRITICAL FIX (Blender 5.0): Only one timer is registered at a time to prevent
    the preferences panel from thrashing and lagging as timers stack up.
    """
    global _prefs_save_pending

    # If a save is already scheduled, don't queue another one
    if _prefs_save_pending:
        return

    def _do_save():
        global _prefs_save_pending
        try:
            wm = bpy.context.window_manager
            wins = getattr(wm, 'windows', ())
            if hasattr(bpy.context, 'temp_override') and wins:
                # Blender 3.2+ – guaranteed operator context
                with bpy.context.temp_override(window=wins[0]):
                    bpy.ops.wm.save_userpref()
            elif wins:
                # Blender < 3.2 – legacy context override dict
                bpy.ops.wm.save_userpref({'window': wins[0]})
            else:
                # No window available yet – attempt bare call as last resort
                bpy.ops.wm.save_userpref()
        except Exception as e:
            # Silently ignore errors; don't spam console on every preference change
            pass
        finally:
            _prefs_save_pending = False
        return None  # do not reschedule

    try:
        _prefs_save_pending = True
        bpy.app.timers.register(_do_save, first_interval=0.5)
    except Exception as e:
        print(f"Could not schedule preference save: {e}")


def restore_scene_props_from_prefs(scene) -> None:
    """Copy persisted addon-preference values into scene properties.

    Scene properties reset to their defaults every time a new .blend file is
    created or opened (unless that file itself saved the values).  Calling this
    from a ``load_post`` / ``load_factory_startup_post`` handler ensures the
    panels always reflect the globally-saved settings without the user having to
    re-enter them.

    Path strings are only copied when the scene property is still empty so
    that project-specific paths saved inside a .blend file are not clobbered.
    Non-string settings (booleans, ints, floats) are always restored from
    preferences so they act as persistent global defaults.
    """
    prefs = get_preferences()
    if prefs is None or scene is None:
        return

    # ── Path properties: restore only when the scene property is empty ────────
    _PATH_PREF_TO_SCENE = {
        "fo4_assets_path":      "fo4_assets_path",
        "fo4_assets_mesh_path": "fo4_assets_mesh_path",
        "fo4_assets_tex_path":  "fo4_assets_tex_path",
        "fo4_assets_mat_path":  "fo4_assets_mat_path",
        "unity_assets_path":    "fo4_unity_assets_path",
        "unreal_assets_path":   "fo4_unreal_assets_path",
        # Tool/runtime paths – backed by addon preferences so they survive
        # opening a new .blend file.
        "havok2fbx_path":       "fo4_havok2fbx_path",
        "torch_custom_path":    "fo4_torch_root",
        "tools_root":           "fo4_tools_root",
        "instantngp_path":      "fo4_instantngp_path",
        # Havok output directory – treat as path (restore only when scene prop is empty)
        "havok_output_dir":     "fo4_havok_output_dir",
    }
    for pref_attr, scene_attr in _PATH_PREF_TO_SCENE.items():
        if not hasattr(prefs, pref_attr) or not hasattr(scene, scene_attr):
            continue
        saved = getattr(prefs, pref_attr, "")
        if not isinstance(saved, str):
            continue
        if saved.strip() and not getattr(scene, scene_attr, "").strip():
            setattr(scene, scene_attr, saved)

    # ── Non-string settings and text fields: always restore as global defaults ─
    _SETTINGS_PREF_TO_SCENE = {
        # Mesh optimization
        "optimize_apply_transforms":          "fo4_opt_apply_transforms",
        "optimize_remove_doubles_threshold":  "fo4_opt_doubles",
        "optimize_preserve_uvs":             "fo4_opt_preserve_uvs",
        # Havok animation export
        "havok_anim_type":        "fo4_havok_anim_type",
        "havok_fps":              "fo4_havok_fps",
        "havok_loop":             "fo4_havok_loop",
        "havok_root_motion":      "fo4_havok_root_motion",
        "havok_bake_anim":        "fo4_havok_bake_anim",
        "havok_key_all_bones":    "fo4_havok_key_all_bones",
        "havok_apply_transforms": "fo4_havok_apply_transforms",
        "havok_scale":            "fo4_havok_scale",
        "havok_simplify_value":   "fo4_havok_simplify_value",
        "havok_force_frame_range":"fo4_havok_force_frame_range",
        # Animation name is a text override (not a path) – always restore
        "havok_anim_name":        "fo4_havok_anim_name",
        # Advisor / LLM / settings toggles
        "llm_enabled":                        "fo4_llm_enabled",
        "advisor_auto_monitor_enabled":       "fo4_advisor_monitor",
        "advisor_auto_monitor_interval":      "fo4_advisor_interval",
        "knowledge_base_enabled":             "fo4_kb_enabled",
        "auto_install_tools":                 "fo4_auto_install_tools",
        "auto_install_python":                "fo4_auto_install_python",
        "auto_register_tools":                "fo4_auto_register_tools",
        "mesh_panel_unified":                 "fo4_mesh_panel_unified",
    }
    for pref_attr, scene_attr in _SETTINGS_PREF_TO_SCENE.items():
        if not hasattr(prefs, pref_attr) or not hasattr(scene, scene_attr):
            continue
        setattr(scene, scene_attr, getattr(prefs, pref_attr))

    # ── Path properties that also need restoration: tool paths ────────────────
    _TOOL_PATH_PREF_TO_SCENE = {
        "ffmpeg_path":           "fo4_ffmpeg_path",
        "nvtt_path":             "fo4_nvtt_path",
        "texconv_path":          "fo4_texconv_path",
        "knowledge_base_path":   "fo4_kb_path",
    }
    for pref_attr, scene_attr in _TOOL_PATH_PREF_TO_SCENE.items():
        if not hasattr(prefs, pref_attr) or not hasattr(scene, scene_attr):
            continue
        saved = getattr(prefs, pref_attr, "")
        if not isinstance(saved, str):
            continue
        if saved.strip() and not getattr(scene, scene_attr, "").strip():
            setattr(scene, scene_attr, saved)


def restore_extra_python_paths() -> list[str]:
    """Add all persisted extra Python paths to sys.path and return added entries.

    This must be called during add-on registration so that packages installed
    outside Blender's site-packages (e.g. via pip --target) are importable in
    every Blender session without any manual user action.
    """
    import sys as _sys

    prefs = get_preferences()
    if not prefs:
        return []

    added: list[str] = []

    # Restore the dedicated torch_custom_path preference using TorchPathManager
    # so that both sys.path and the Windows DLL search path are updated together.
    torch_path = bpy.path.abspath(prefs.torch_custom_path).strip()
    if torch_path and os.path.isdir(torch_path):
        try:
            from . import torch_path_manager as _tpm
            _tpm.TorchPathManager.add_torch_to_path(torch_path)
        except Exception:
            # Fallback: at minimum keep sys.path updated
            import sys as _sys
            if torch_path not in _sys.path:
                _sys.path.insert(0, torch_path)
        added.append(torch_path)
        print(f"✓ Restored PyTorch path to sys.path: {torch_path}")
    elif prefs.torch_install_attempted and not (torch_path and os.path.isdir(torch_path)):
        # Saved path is gone or was never recorded — clear the flag so the
        # next call to try_import_torch() can trigger a fresh auto-install.
        prefs.torch_install_attempted = False
        print("⚠ PyTorch custom path missing — reset install flag for retry")

    # Restore any extra semicolon-separated paths
    extra = prefs.extra_python_paths.strip()
    if extra:
        for entry in extra.split(";"):
            entry = bpy.path.abspath(entry.strip())
            if entry and os.path.isdir(entry) and entry not in _sys.path:
                _sys.path.insert(0, entry)
                added.append(entry)
                print(f"✓ Restored extra Python path to sys.path: {entry}")

    # Reset the UModel install-attempted flag if the recorded path is gone so
    # the startup hook can re-download it automatically.
    umodel_p = prefs.umodel_path.strip()
    if prefs.umodel_install_attempted and umodel_p and not os.path.isdir(umodel_p):
        prefs.umodel_install_attempted = False
        print("⚠ UModel path missing — reset install flag for retry")

    return added


class FO4AddonPreferences(bpy.types.AddonPreferences):
    """Stores user-configurable add-on preferences."""

    bl_idname = _addon_name()

    havok2fbx_path: bpy.props.StringProperty(
        name="Havok2FBX Folder",
        subtype="DIR_PATH",
        default=_DEFAULT_HAVOK2FBX_PATH,
        description="Folder containing Havok2FBX binaries (existing install)",
    )

    mesh_panel_unified: bpy.props.BoolProperty(
        name="Unified Mesh Panel",
        description="Show all mesh helpers (basic, collision, advanced) in one box",
        default=True,
    )

    nvtt_path: bpy.props.StringProperty(
        name="NVTT Path",
        subtype="FILE_PATH",
        default=_DEFAULT_NVTT_PATH,
        description="Path to nvcompress.exe or its folder (NVIDIA Texture Tools)",
    )

    ffmpeg_path: bpy.props.StringProperty(
        name="ffmpeg Path",
        subtype="FILE_PATH",
        default="",
        description="Path to ffmpeg.exe or its folder (optional, installer will place binaries under tools/ffmpeg)",
    )

    texconv_path: bpy.props.StringProperty(
        name="texconv Path",
        subtype="FILE_PATH",
        default=_DEFAULT_TEXCONV_PATH,
        description="Path to texconv.exe or its folder (DirectXTex)",
    )

    fo4_assets_path: bpy.props.StringProperty(
        name="Fallout 4 Assets Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Custom path to Fallout 4 assets (meshes, textures, etc.). "
            "Leave blank for auto-detection from game installation. "
            "Example: H:/Fallout 4 working folder"
        ),
        update=_pref_path_update,
    )

    fo4_assets_mesh_path: bpy.props.StringProperty(
        name="FO4 Meshes Path",
        subtype="DIR_PATH",
        default="",
        description="Path to the Fallout 4 meshes sub-folder (e.g. Data/meshes)",
        update=_pref_path_update,
    )

    fo4_assets_tex_path: bpy.props.StringProperty(
        name="FO4 Textures Path",
        subtype="DIR_PATH",
        default="",
        description="Path to the Fallout 4 textures sub-folder (e.g. Data/textures)",
        update=_pref_path_update,
    )

    fo4_assets_mat_path: bpy.props.StringProperty(
        name="FO4 Materials Path",
        subtype="DIR_PATH",
        default="",
        description="Path to the Fallout 4 materials sub-folder (e.g. Data/materials)",
        update=_pref_path_update,
    )

    unity_assets_path: bpy.props.StringProperty(
        name="Unity Assets Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Path to Unity project assets or extracted assets folder. "
            "Should contain folders like Models, Textures, Materials, etc. "
            "Example: H:/Unity Projects/MyProject/Assets"
        ),
    )

    unreal_assets_path: bpy.props.StringProperty(
        name="Unreal Engine Assets Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Path to Unreal Engine project content or extracted assets. "
            "Should contain folders like Meshes, Textures, Materials, etc. "
            "Example: H:/UnrealProjects/MyProject/Content"
        ),
    )

    llm_enabled: bpy.props.BoolProperty(
        name="Enable LLM Advisor",
        default=False,
        description="Opt-in: allow calls to configured LLM endpoint for advice (metadata only)",
    )

    llm_endpoint: bpy.props.StringProperty(
        name="LLM Endpoint",
        default=_DEFAULT_LLM_ENDPOINT,
        description="HTTP endpoint for chat completions",
    )

    llm_model: bpy.props.StringProperty(
        name="LLM Model",
        default=_DEFAULT_LLM_MODEL,
        description="Model name to request from the endpoint",
    )

    llm_api_key: bpy.props.StringProperty(
        name="LLM API Key",
        default="",
        subtype='PASSWORD',
        description="Bearer token for the LLM endpoint",
        update=_key_update,
    )

    llm_allow_actions: bpy.props.BoolProperty(
        name="Allow Action Suggestions",
        default=False,
        description="If enabled, advisor may suggest actions; execution still requires user click",
    )

    llm_send_stats: bpy.props.BoolProperty(
        name="Send Counts Only",
        default=True,
        description="Only send summary strings/counts; no mesh or texture binaries",
    )

    advisor_auto_monitor_enabled: bpy.props.BoolProperty(
        name="Advisor Auto-Monitor",
        default=True,
        description="Run advisor periodically in the background to surface issues",
    )

    advisor_auto_monitor_interval: bpy.props.IntProperty(
        name="Monitor Interval (s)",
        default=_DEFAULT_ADVISOR_INTERVAL,
        min=5,
        max=600,
        description="Seconds between advisor checks",
    )

    knowledge_base_enabled: bpy.props.BoolProperty(
        name="Use Knowledge Base",
        default=True,
        description="Include snippets from knowledge_base/ (txt/md) in advisor LLM context",
    )

    knowledge_base_path: bpy.props.StringProperty(
        name="Knowledge Base Path",
        default=_DEFAULT_KB_PATH,
        subtype='DIR_PATH',
        description="Folder with txt/md docs to feed the advisor; defaults to bundled knowledge_base/",
    )

    auto_install_tools: bpy.props.BoolProperty(
        name="Auto Install Tools",
        default=True,
        description="If enabled, missing CLI tools will be downloaded automatically on startup",
    )

    auto_register_tools: bpy.props.BoolProperty(
        name="Auto Register External Tools",
        default=False,
        description=(
            "If enabled, third-party integrations (UE importer, UModel, AssetStudio, "
            "etc.) will be downloaded/loaded automatically on add-on startup. "
            "This may trigger \"policy violation\" warnings from Blender; leave "
            "disabled to load them manually."
        ),
    )

    auto_install_python: bpy.props.BoolProperty(
        name="Auto Install Python",
        default=True,
        description="If enabled, core Python dependencies will be installed on startup",
    )

    auto_install_pytorch: bpy.props.BoolProperty(
        name="Auto Install PyTorch",
        default=True,
        description=(
            "If enabled, PyTorch will be auto-installed automatically when it is "
            "missing or when a Windows path-length error is detected. "
            "On Windows it installs to D:/t; on Linux/macOS to ~/.blender_torch."
        ),
    )

    torch_install_attempted: bpy.props.BoolProperty(
        name="PyTorch Install Attempted",
        default=False,
        description=(
            "Internal flag: True when PyTorch was successfully installed to the "
            "saved custom path. Reset automatically on startup if that path is "
            "missing, so a fresh install attempt is triggered."
        ),
    )

    torch_custom_path: bpy.props.StringProperty(
        name="PyTorch Custom Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Directory where PyTorch was installed with --target (e.g. D:/t). "
            "Set automatically when you click 'Install PyTorch to Short Path'. "
            "Added to sys.path on every Blender startup so torch stays accessible."
        ),
    )

    umodel_path: bpy.props.StringProperty(
        name="UModel Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Directory where UModel (UE Viewer) was downloaded. "
            "Set automatically on first download. "
            "Used to locate umodel.exe on every Blender startup."
        ),
    )

    umodel_install_attempted: bpy.props.BoolProperty(
        name="UModel Install Attempted",
        default=False,
        description="Internal flag: True once UModel has been successfully downloaded",
    )

    extra_python_paths: bpy.props.StringProperty(
        name="Extra Python Paths",
        default="",
        description=(
            "Semicolon-separated list of extra directories to add to sys.path on "
            "every Blender startup.  Use this to make packages installed outside "
            "Blender's site-packages (e.g. via pip --target) permanently accessible."
        ),
    )

    # ---- Mesh optimization settings ----
    optimize_remove_doubles_threshold: bpy.props.FloatProperty(
        name="Remove Doubles Threshold",
        default=0.0001,
        min=0.0,
        max=0.01,
        description="Distance threshold for merging duplicate vertices during optimization",
    )
    optimize_preserve_uvs: bpy.props.BoolProperty(
        name="Preserve UVs",
        default=True,
        description="Keep UV seams from being collapsed when removing doubles",
    )
    optimize_apply_transforms: bpy.props.BoolProperty(
        name="Apply Transforms",
        default=True,
        description="Automatically apply object transforms before optimization",
    )

    # ---- Havok2FBX animation export settings ----
    havok_anim_type: bpy.props.EnumProperty(
        name="Animation Type",
        default='CHARACTER',
        items=[
            ('CHARACTER',   "Character",     "Humanoid NPC / player character skeleton"),
            ('CREATURE',    "Creature",      "Non-humanoid creature skeleton"),
            ('OBJECT',      "Object / Prop", "Animated static prop or furniture"),
            ('WEAPON',      "Weapon",        "Third-person weapon animation"),
            ('FIRSTPERSON', "First-Person",  "First-person arms / weapon animation"),
        ],
        description="Default animation type for Havok2FBX export; persisted as global default",
    )
    havok_fps: bpy.props.IntProperty(
        name="FPS",
        default=30,
        min=1,
        max=120,
        description="Default frame rate for Havok2FBX export",
    )
    havok_loop: bpy.props.BoolProperty(
        name="Loop Animation",
        default=False,
        description="Default loop flag for Havok2FBX export",
    )
    havok_root_motion: bpy.props.BoolProperty(
        name="Root Motion",
        default=False,
        description="Default root motion flag for Havok2FBX export",
    )
    havok_bake_anim: bpy.props.BoolProperty(
        name="Bake Animation",
        default=True,
        description="Default bake animation flag for Havok2FBX export",
    )
    havok_key_all_bones: bpy.props.BoolProperty(
        name="Key All Bones",
        default=False,
        description="Default key-all-bones flag for Havok2FBX export",
    )
    havok_apply_transforms: bpy.props.BoolProperty(
        name="Apply Transforms",
        default=True,
        description="Default apply-transforms flag for Havok2FBX export",
    )
    havok_scale: bpy.props.FloatProperty(
        name="Scale",
        default=1.0,
        min=0.001,
        max=100.0,
        precision=3,
        description="Default scale factor for Havok2FBX export",
    )
    havok_output_dir: bpy.props.StringProperty(
        name="Output Directory",
        subtype='DIR_PATH',
        default="",
        description="Default output directory for Havok2FBX export; persisted globally",
    )
    havok_anim_name: bpy.props.StringProperty(
        name="Animation Name Override",
        default="",
        description="Default animation name override for Havok2FBX export",
    )
    havok_simplify_value: bpy.props.FloatProperty(
        name="Simplify Value",
        default=0.0,
        min=0.0,
        max=1.0,
        precision=2,
        description="Default animation simplification threshold for Havok2FBX export",
    )
    havok_force_frame_range: bpy.props.BoolProperty(
        name="Force Frame Range",
        default=True,
        description="Default force-frame-range flag for Havok2FBX export",
    )

    # ---- Mossy Link ----
    port: bpy.props.IntProperty(
        name="Mossy Link Port",
        default=9999,
        min=1024,
        max=65535,
        description="TCP port the Mossy Link server (inside Blender) listens on for commands from Mossy",
    )

    token: bpy.props.StringProperty(
        name="Mossy Link Token",
        default="",
        subtype='PASSWORD',
        description="Optional shared secret for the Mossy Link TCP server; leave blank to disable auth",
        update=_key_update,
    )

    autostart: bpy.props.BoolProperty(
        name="Auto-start Mossy Link",
        default=True,
        description="Start the Mossy Link server automatically when the add-on loads",
    )

    mossy_http_port: bpy.props.IntProperty(
        name="Mossy LLM Port",
        default=5000,
        min=1024,
        max=65535,
        description=(
            "Port where Mossy's Nemotron LLM service listens (default 5000). "
            "Blender connects here to send AI advisor questions to Mossy. "
            "Must match the port shown in your Mossy desktop app."
        ),
    )

    use_mossy_as_ai: bpy.props.BoolProperty(
        name="Use Mossy as AI Advisor",
        default=False,
        description=(
            "Route advisor AI queries through Mossy instead of a remote LLM endpoint. "
            "Requires Mossy to be running on the desktop. "
            "No API key needed — everything stays on your machine."
        ),
    )

    tools_root: bpy.props.StringProperty(
        name="Tools Root Folder",
        subtype="DIR_PATH",
        default="",
        description=(
            "Root folder where FO4 modding CLI tools (ffmpeg, nvcompress, texconv, etc.) "
            "are installed. Persisted globally so you don't have to re-enter it every session."
        ),
    )

    instantngp_path: bpy.props.StringProperty(
        name="InstantNGP Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Path to InstantNGP installation folder. "
            "Persisted globally so you don't need to re-enter it after restarting Blender."
        ),
    )

    def draw(self, context):
        layout = self.layout

        # This panel is strictly for add-on installation.
        # All tool configuration lives in the N-panel:
        #   3D Viewport → press N → Fallout 4 tab → Settings
        info_box = layout.box()
        info_box.label(text="Add-on installed successfully.", icon="CHECKMARK")
        info_box.label(
            text="All settings are in the N-panel → Fallout 4 → Settings",
            icon="INFO",
        )
        info_box.label(
            text="(Press N in the 3D Viewport to open the side panel)",
            icon="BLANK1",
        )

        update_box = layout.box()
        update_box.label(text="Updating the add-on", icon="FILE_REFRESH")
        update_box.label(
            text="Install a new zip via Add-ons → Install, then restart Blender.",
            icon="INFO",
        )


def register():
    bpy.utils.register_class(FO4AddonPreferences)


def unregister():
    bpy.utils.unregister_class(FO4AddonPreferences)
