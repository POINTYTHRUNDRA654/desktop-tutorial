"""
Addon preferences for Mossy Fallout 4 Blender Add-on.
Provides a single path field for the Havok2FBX toolkit so users can point to an
existing install instead of duplicating binaries.
"""

from __future__ import annotations

import json
import os
import bpy


_DEFAULT_HAVOK2FBX_PATH = ""
_DEFAULT_NVTT_PATH = ""
_DEFAULT_TEXCONV_PATH = ""
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


# All preference fields that must survive addon reinstalls.
# Stored in the home-directory JSON so they are never wiped by a zip install.
_PERSISTENT_PREF_FIELDS = [
    # Mossy / AI
    "token", "pytorch_path", "port", "mossy_http_port", "autostart",
    "use_mossy_as_ai",
    # Tool paths
    "havok2fbx_path", "ckcmd_path", "ckcmd_skeleton_path",
    "nvtt_path", "ffmpeg_path", "texconv_path",
    "umodel_path", "rignet_path", "libigl_path",
    "tools_root", "instantngp_path", "torch_custom_path",
    "extra_python_paths", "knowledge_base_path",
    # Game asset paths
    "fo4_assets_path", "fo4_assets_mesh_path", "fo4_assets_tex_path",
    "fo4_assets_mat_path", "unity_assets_path", "unreal_assets_path",
    # Havok / animation settings
    "havok_output_dir", "havok_anim_name", "havok_anim_type",
    "havok_fps", "havok_loop", "havok_root_motion", "havok_bake_anim",
    "havok_key_all_bones", "havok_apply_transforms", "havok_scale",
    "havok_simplify_value", "havok_force_frame_range",
    # Mesh / UI settings
    "mesh_panel_unified", "optimize_preserve_uvs", "optimize_apply_transforms",
    "optimize_remove_doubles_threshold",
    # Toggles
    "auto_install_tools", "auto_register_tools", "auto_install_python",
    "auto_install_pytorch", "advisor_auto_monitor_enabled",
    "advisor_auto_monitor_interval", "knowledge_base_enabled",
    "llm_enabled",
]


def save_api_keys() -> None:
    """Write ALL critical preferences to the persistent JSON file.

    This file lives in the user home directory and survives addon reinstalls,
    Blender version upgrades, and addon renames.  It is the safety net that
    means users never have to re-enter their paths after installing an update.
    """
    prefs = get_preferences()
    if not prefs:
        return
    data: dict = {}
    for field in _PERSISTENT_PREF_FIELDS:
        val = getattr(prefs, field, None)
        if val is not None:
            data[field] = val
    # Legacy key name kept for backwards compat with older JSON files
    data["mossy_token"] = data.get("token", "")
    try:
        fpath = _get_keys_file_path()
        with open(fpath, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        print(f"✓ All preferences persisted to {fpath}")
    except Exception as exc:
        print(f"Could not save preferences: {exc}")


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
            if (hasattr(old_prefs, "token")
                    and isinstance(old_prefs.token, str)
                    and old_prefs.token
                    and isinstance(prefs.token, str)
                    and not prefs.token.strip()):
                prefs.token = old_prefs.token
                print(f"✓ Migrated Mossy token from '{_OLD_ADDON_NAME}'")
    except Exception as exc:
        print(f"Key migration from old addon skipped: {exc}")

    # ── 2. Restore from the persistent JSON file ─────────────────────────
    fpath = _get_keys_file_path()
    if not os.path.isfile(fpath):
        return
    try:
        with open(fpath, "r", encoding="utf-8") as fh:
            saved: dict = json.load(fh)
    except Exception as exc:
        print(f"Could not read saved preferences from {fpath}: {exc}")
        return

    # Restore ALL persisted fields.  String/path fields: only fill when the
    # current pref is empty (so a user-entered value always wins).
    # Bool/int/float fields: always restore so toggles survive reinstalls.
    restored = []
    for field in _PERSISTENT_PREF_FIELDS:
        if field not in saved:
            continue
        if not hasattr(prefs, field):
            continue
        current = getattr(prefs, field, None)
        saved_val = saved[field]
        try:
            if isinstance(saved_val, str):
                # Only fill empty string fields
                if not str(current).strip() and str(saved_val).strip():
                    setattr(prefs, field, saved_val)
                    restored.append(field)
            else:
                # Bool / int / float: always restore
                setattr(prefs, field, saved_val)
                restored.append(field)
        except Exception:
            pass

    # Legacy compat: token may have been saved as "mossy_token"
    if not prefs.token.strip():
        legacy = saved.get("mossy_token", "")
        if legacy.strip():
            prefs.token = legacy
            restored.append("token(legacy)")

    if restored:
        print(f"✓ Restored {len(restored)} preferences from {fpath}")

    # Ensure pytorch path is on sys.path for this session
    effective_pytorch = prefs.pytorch_path.strip()
    if effective_pytorch:
        import sys as _sys
        if os.path.isdir(effective_pytorch) and effective_pytorch not in _sys.path:
            _sys.path.insert(0, effective_pytorch)
            print(f"✓ Mossy PyTorch path added to sys.path: {effective_pytorch}")


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


def get_ckcmd_path() -> str | None:
    """Return the configured ck-cmd directory if set and exists."""
    prefs = get_preferences()
    if not prefs:
        return None
    path = bpy.path.abspath(prefs.ckcmd_path)
    return path if path and os.path.isdir(path) else None


def is_ckcmd_configured() -> bool:
    """True if the ck-cmd path is configured and points to an existing directory."""
    return get_ckcmd_path() is not None


def get_mossy_config() -> dict:
    """Get Mossy AI advisor configuration (free, local AI via Mossy desktop app)."""
    prefs = get_preferences()
    if not prefs:
        return {"enabled": False}
    return {
        "enabled": getattr(prefs, "use_mossy_as_ai", False),
        "http_port": getattr(prefs, "mossy_http_port", 5000),
        "allow_actions": getattr(prefs, "advisor_auto_monitor_enabled", True),
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

    Saves to BOTH userpref.blend (via save_prefs_deferred) AND the persistent
    JSON file (via save_api_keys_deferred) so settings survive addon reinstalls.
    Both are debounced so rapid changes (e.g. Blender loading prefs on startup)
    collapse into a single write rather than firing once per property.
    """
    save_prefs_deferred()
    save_api_keys_deferred()


# Global flags to prevent multiple timers from stacking up (fixes Blender 5.0 lag)
_prefs_save_pending = False
_keys_save_pending  = False

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


def save_api_keys_deferred() -> None:
    """Schedule save_api_keys() via a timer so rapid property changes collapse into one write."""
    global _keys_save_pending
    if _keys_save_pending:
        return

    def _do_keys_save():
        global _keys_save_pending
        try:
            save_api_keys()
        except Exception:
            pass
        finally:
            _keys_save_pending = False
        return None

    try:
        _keys_save_pending = True
        import bpy as _bpy
        _bpy.app.timers.register(_do_keys_save, first_interval=1.0)
    except Exception:
        _keys_save_pending = False
        try:
            save_api_keys()
        except Exception:
            pass


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
        "fo4_assets_path":      "fo4_asset_lib_path",
        "fo4_assets_mesh_path": "fo4_asset_lib_mesh_path",
        "fo4_assets_tex_path":  "fo4_asset_lib_tex_path",
        "fo4_assets_mat_path":  "fo4_asset_lib_mat_path",
        "unity_assets_path":    "fo4_unity_assets_path",
        "unreal_assets_path":   "fo4_unreal_assets_path",
        # Tool/runtime paths – backed by addon preferences so they survive
        # opening a new .blend file.
        "havok2fbx_path":       "fo4_havok2fbx_path",
        "ckcmd_path":           "fo4_ckcmd_path",
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

    # Restore the user-configured external PyTorch path.
    # PyTorch is no longer auto-installed inside Blender; this simply adds the
    # user-set torch_custom_path to sys.path so a locally-managed install stays
    # importable across Blender restarts.
    torch_path = bpy.path.abspath(prefs.torch_custom_path).strip()
    if torch_path and os.path.isdir(torch_path) and torch_path not in _sys.path:
        _sys.path.insert(0, torch_path)
        added.append(torch_path)
        print(f"✓ Restored PyTorch custom path to sys.path: {torch_path}")

    # Restore the Mossy-provided PyTorch path.
    # When Mossy sends a set_pytorch_path command, mossy_link stores it in
    # prefs.pytorch_path AND in the JSON keys file.  Applying it here ensures
    # it is in sys.path before any torch-dependent module draws or checks its
    # status, even if mossy_link.register() ran too early for get_preferences()
    # to return a non-None value (RECURRING BUG #13 scenario).
    mossy_pt = bpy.path.abspath(getattr(prefs, "pytorch_path", "")).strip()
    if mossy_pt and os.path.isdir(mossy_pt) and mossy_pt not in _sys.path:
        _sys.path.insert(0, mossy_pt)
        added.append(mossy_pt)
        print(f"✓ Restored Mossy PyTorch path to sys.path: {mossy_pt}")

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
        print("⚠ UModel path missing - reset install flag for retry")

    return added


class FO4AddonPreferences(bpy.types.AddonPreferences):
    """Stores user-configurable add-on preferences."""

    bl_idname = _addon_name()

    havok2fbx_path: bpy.props.StringProperty(
        name="Havok2FBX Folder",
        subtype="DIR_PATH",
        default=_DEFAULT_HAVOK2FBX_PATH,
        description="Folder containing Havok2FBX binaries (existing install)",
        update=_pref_path_update,
    )

    ckcmd_path: bpy.props.StringProperty(
        name="ck-cmd Folder",
        subtype="DIR_PATH",
        default="",
        description="Folder containing ck-cmd.exe (aerisarn/ck-cmd — open-source FBX→HKX converter)",
        update=_pref_path_update,
    )

    ckcmd_skeleton_path: bpy.props.StringProperty(
        name="Skeleton HKX",
        subtype="FILE_PATH",
        default="",
        description=(
            "Path to the Fallout 4 skeleton.hkx required by ck-cmd importanimation. "
            "Usually found at Data\\Meshes\\Actors\\Character\\CharacterAssets\\skeleton.hkx"
        ),
        update=_pref_path_update,
    )

    mesh_panel_unified: bpy.props.BoolProperty(
        name="Unified Mesh Panel",
        description="Show all mesh helpers (basic, collision, advanced) in one box",
        default=True,
        update=_pref_path_update,
    )

    nvtt_path: bpy.props.StringProperty(
        name="NVTT Path",
        subtype="FILE_PATH",
        default=_DEFAULT_NVTT_PATH,
        description="Path to nvcompress.exe or its folder (NVIDIA Texture Tools)",
        update=_pref_path_update,
    )

    ffmpeg_path: bpy.props.StringProperty(
        name="ffmpeg Path",
        subtype="FILE_PATH",
        default="",
        description="Path to ffmpeg.exe or its folder (optional, installer will place binaries under tools/ffmpeg)",
        update=_pref_path_update,
    )

    texconv_path: bpy.props.StringProperty(
        name="texconv Path",
        subtype="FILE_PATH",
        default=_DEFAULT_TEXCONV_PATH,
        description="Path to texconv.exe or its folder (DirectXTex)",
        update=_pref_path_update,
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
        update=_pref_path_update,
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
        update=_pref_path_update,
    )

    # ──────────────────────────────────────────────────────────────────────
    # LLM/OpenAI fields REMOVED - ALL AI now goes through Mossy (free, local)
    # See use_mossy_as_ai property below for enabling AI features
    # ──────────────────────────────────────────────────────────────────────

    advisor_auto_monitor_enabled: bpy.props.BoolProperty(
        name="Advisor Auto-Monitor",
        default=True,
        description="Run advisor periodically in the background to surface issues",
        update=_pref_path_update,
    )

    advisor_auto_monitor_interval: bpy.props.IntProperty(
        name="Monitor Interval (s)",
        default=_DEFAULT_ADVISOR_INTERVAL,
        min=5,
        max=600,
        description="Seconds between advisor checks",
        update=_pref_path_update,
    )

    knowledge_base_enabled: bpy.props.BoolProperty(
        name="Use Knowledge Base",
        default=True,
        description="Include snippets from knowledge_base/ (txt/md) in advisor LLM context",
        update=_pref_path_update,
    )

    knowledge_base_path: bpy.props.StringProperty(
        name="Knowledge Base Path",
        default=_DEFAULT_KB_PATH,
        subtype='DIR_PATH',
        description="Folder with txt/md docs to feed the advisor; defaults to bundled knowledge_base/",
        update=_pref_path_update,
    )

    auto_install_tools: bpy.props.BoolProperty(
        name="Auto Install Tools",
        default=False,
        description=(
            "If enabled, missing CLI tools (e.g. UModel) will be downloaded automatically "
            "on startup. Disabled by default - enable this only if you want the add-on to "
            "fetch executables from the internet without a manual button click."
        ),
        update=_pref_path_update,
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
        update=_pref_path_update,
    )

    auto_install_python: bpy.props.BoolProperty(
        name="Auto Install Python",
        default=True,
        description="If enabled, core Python dependencies will be installed on startup",
        update=_pref_path_update,
    )

    auto_install_pytorch: bpy.props.BoolProperty(
        name="Auto Install PyTorch",
        default=False,
        description=(
            "Deprecated - PyTorch auto-installation inside Blender has been removed. "
            "Install PyTorch externally and set 'PyTorch Custom Path' below."
        ),
        options={'HIDDEN'},
    )

    torch_install_attempted: bpy.props.BoolProperty(
        name="PyTorch Install Attempted",
        default=False,
        description="Deprecated internal flag - kept to avoid errors in saved preferences.",
        options={'HIDDEN'},
    )

    torch_custom_path: bpy.props.StringProperty(
        name="PyTorch Custom Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Directory of an externally-installed PyTorch (e.g. D:\\blender_torch or "
            "~/.local/lib/python3.12/site-packages). "
            "Added to sys.path on every Blender startup so torch is importable."
        ),
        update=_pref_path_update,
    )

    pytorch_path: bpy.props.StringProperty(
        name="Mossy PyTorch Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Directory of the PyTorch installation provided by Mossy. "
            "Set automatically when Mossy sends a set_pytorch_path command. "
            "Added to sys.path on startup so torch is importable by tools "
            "like RigNet, Shape-E, and Point-E."
        ),
        options={'HIDDEN'},
        update=_pref_path_update,
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
        update=_pref_path_update,
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
        update=_pref_path_update,
    )

    # ---- Mesh optimization settings ----
    optimize_remove_doubles_threshold: bpy.props.FloatProperty(
        name="Remove Doubles Threshold",
        default=0.0001,
        min=0.0,
        max=0.01,
        description="Distance threshold for merging duplicate vertices during optimization",
        update=_pref_path_update,
    )
    optimize_preserve_uvs: bpy.props.BoolProperty(
        name="Preserve UVs",
        default=True,
        description="Keep UV seams from being collapsed when removing doubles",
        update=_pref_path_update,
    )
    optimize_apply_transforms: bpy.props.BoolProperty(
        name="Apply Transforms",
        default=True,
        description="Automatically apply object transforms before optimization",
        update=_pref_path_update,
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
        update=_pref_path_update,
    )
    havok_fps: bpy.props.IntProperty(
        name="FPS",
        default=30,
        min=1,
        max=120,
        description="Default frame rate for Havok2FBX export",
        update=_pref_path_update,
    )
    havok_loop: bpy.props.BoolProperty(
        name="Loop Animation",
        default=False,
        description="Default loop flag for Havok2FBX export",
        update=_pref_path_update,
    )
    havok_root_motion: bpy.props.BoolProperty(
        name="Root Motion",
        default=False,
        description="Default root motion flag for Havok2FBX export",
        update=_pref_path_update,
    )
    havok_bake_anim: bpy.props.BoolProperty(
        name="Bake Animation",
        default=True,
        description="Default bake animation flag for Havok2FBX export",
        update=_pref_path_update,
    )
    havok_key_all_bones: bpy.props.BoolProperty(
        name="Key All Bones",
        default=False,
        description="Default key-all-bones flag for Havok2FBX export",
        update=_pref_path_update,
    )
    havok_apply_transforms: bpy.props.BoolProperty(
        name="Apply Transforms",
        default=True,
        description="Default apply-transforms flag for Havok2FBX export",
        update=_pref_path_update,
    )
    havok_scale: bpy.props.FloatProperty(
        name="Scale",
        default=1.0,
        min=0.001,
        max=100.0,
        precision=3,
        description="Default scale factor for Havok2FBX export",
        update=_pref_path_update,
    )
    havok_output_dir: bpy.props.StringProperty(
        name="Output Directory",
        subtype='DIR_PATH',
        default="",
        description="Default output directory for Havok2FBX export; persisted globally",
        update=_pref_path_update,
    )
    havok_anim_name: bpy.props.StringProperty(
        name="Animation Name Override",
        default="",
        description="Default animation name override for Havok2FBX export",
        update=_pref_path_update,
    )
    havok_simplify_value: bpy.props.FloatProperty(
        name="Simplify Value",
        default=0.0,
        min=0.0,
        max=1.0,
        precision=2,
        description="Default animation simplification threshold for Havok2FBX export",
        update=_pref_path_update,
    )
    havok_force_frame_range: bpy.props.BoolProperty(
        name="Force Frame Range",
        default=True,
        description="Default force-frame-range flag for Havok2FBX export",
        update=_pref_path_update,
    )

    # ---- Mossy Link ----
    rignet_path: bpy.props.StringProperty(
        name="RigNet Path",
        default="",
        subtype='DIR_PATH',
        description=(
            "Path to your RigNet or rignet-gj repository folder on any drive "
            "(e.g. D:/rignet-gj or E:/Projects/RigNet). "
            "Leave blank to auto-detect across all drives."
        ),
        update=_pref_path_update,
    )

    libigl_path: bpy.props.StringProperty(
        name="libigl Path",
        default="",
        subtype='DIR_PATH',
        description=(
            "Path to your libigl or libigl-python-bindings folder on any drive "
            "(e.g. D:/libigl-python-bindings). "
            "Leave blank to auto-detect across all drives."
        ),
        update=_pref_path_update,
    )

    port: bpy.props.IntProperty(
        name="Mossy Link Port",
        default=9999,
        min=1024,
        max=65535,
        description="TCP port the Mossy Link server (inside Blender) listens on for commands from Mossy",
        update=_pref_path_update,
    )

    token: bpy.props.StringProperty(
        name="Mossy Link Token",
        default="",
        subtype='PASSWORD',
        description=(
            "Shared secret for the Mossy Link TCP server. "
            "Must be non-empty before the server will start. "
            "Enter the same value in Mossy's settings. "
            "Stored in plain text at ~/.blender_game_tools_keys.json."
        ),
        update=_key_update,
    )

    autostart: bpy.props.BoolProperty(
        name="Auto-start Mossy Link",
        default=False,
        description=(
            "Start the Mossy Link server automatically when the add-on loads. "
            "Requires a non-empty Mossy Link Token to be set first."
        ),
        update=_pref_path_update,
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
        update=_pref_path_update,
    )

    use_mossy_as_ai: bpy.props.BoolProperty(
        name="Enable AI Advisor (via Mossy)",
        default=True,
        description=(
            "Enable FREE AI-powered scene analysis via Mossy desktop app. "
            "Requires Mossy to be running (100% free, 100% local - no cloud, no API keys). "
            "All AI processing stays on your machine."
        ),
        update=_pref_path_update,
    )

    tools_root: bpy.props.StringProperty(
        name="Tools Root Folder",
        subtype="DIR_PATH",
        default="",
        description=(
            "Root folder where FO4 modding CLI tools (ffmpeg, nvcompress, texconv, etc.) "
            "are installed. Persisted globally so you don't have to re-enter it every session."
        ),
        update=_pref_path_update,
    )

    instantngp_path: bpy.props.StringProperty(
        name="InstantNGP Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Path to InstantNGP installation folder. "
            "Persisted globally so you don't need to re-enter it after restarting Blender."
        ),
        update=_pref_path_update,
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
