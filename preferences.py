"""
Fallout 4 Mod Assistant – Settings storage
==========================================
All user-configurable settings are stored as ``bpy.types.Scene`` properties
so they live in the **3D Viewport → N panel → Fallout 4 → Settings** and are
visible/editable without ever touching Blender's Add-on Preferences.

``FO4AddonPreferences`` is kept registered (Blender requires the class for any
add-on that has one, so removing it mid-install would break existing .blend
files) but it holds **no properties** and shows **no custom UI**.  All the
user sees in Blender Preferences → Add-ons is the standard enable / disable
checkbox – nothing else.

Settings are automatically saved to a per-user JSON config file so they
survive blend-file changes and Blender restarts.
"""

from __future__ import annotations

import json
import os
import bpy

# ---------------------------------------------------------------------------
# Config file location
# ---------------------------------------------------------------------------

_CONFIG_FILE = "fo4_addon_config.json"


def _config_path() -> str:
    return os.path.join(bpy.utils.user_resource('CONFIG'), _CONFIG_FILE)


# ---------------------------------------------------------------------------
# JSON persistence helpers
# ---------------------------------------------------------------------------

def _load_json() -> dict:
    """Load the config JSON, returning {} on any error."""
    try:
        p = _config_path()
        if os.path.isfile(p):
            with open(p, 'r', encoding='utf-8') as fh:
                return json.load(fh)
    except Exception:
        pass
    return {}


def _save_json(data: dict) -> None:
    try:
        p = _config_path()
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as fh:
            json.dump(data, fh, indent=2)
    except Exception:
        pass


# Property names that are persisted to JSON (survive blend-file changes)
_PERSISTENT = (
    "fo4_havok2fbx_path",
    "fo4_nvtt_path",
    "fo4_ffmpeg_path",
    "fo4_texconv_path",
    "fo4_assets_path",
    # Asset-library sub-paths — persisted so they survive restarts and
    # blend-file changes alongside the main fo4_assets_path.
    "fo4_asset_lib_mesh_path",
    "fo4_asset_lib_tex_path",
    "fo4_asset_lib_mat_path",
    "fo4_asset_lib_path",
    "fo4_unity_assets_path",
    "fo4_unreal_assets_path",
    "fo4_instantngp_path",
    "fo4_llm_enabled",
    "fo4_llm_endpoint",
    "fo4_llm_model",
    "fo4_llm_api_key",
    "fo4_llm_allow_actions",
    "fo4_llm_send_stats",
    "fo4_advisor_monitor",
    "fo4_advisor_interval",
    "fo4_opt_doubles",
    "fo4_opt_preserve_uvs",
    "fo4_opt_apply_transforms",
    "fo4_mesh_panel_unified",
    "fo4_mossy_port",
    "fo4_mossy_token",
    "fo4_mossy_autostart",
    "fo4_mossy_http_port",
    "fo4_use_mossy_ai",
    "fo4_auto_install_tools",
    "fo4_auto_install_python",
    "fo4_auto_register_tools",
    "fo4_kb_enabled",
    "fo4_kb_path",
)


def save_settings(scene=None) -> None:
    """Snapshot scene fo4_* settings to the JSON config file."""
    try:
        scene = scene or bpy.context.scene
    except Exception:
        return
    if scene is None:
        return
    data = {}
    for key in _PERSISTENT:
        val = getattr(scene, key, None)
        if val is not None:
            data[key] = val
    _save_json(data)


def restore_settings(scene=None) -> None:
    """Apply saved JSON config to scene fo4_* properties."""
    try:
        scene = scene or bpy.context.scene
    except Exception:
        return
    if scene is None:
        return
    data = _load_json()
    for key, val in data.items():
        if key in _PERSISTENT:
            try:
                setattr(scene, key, val)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# FO4Settings – same attribute interface as the old FO4AddonPreferences
# ---------------------------------------------------------------------------

# Mapping: old preference attribute name → scene property name
_ATTR_MAP: dict[str, str] = {
    "havok2fbx_path":                  "fo4_havok2fbx_path",
    "nvtt_path":                       "fo4_nvtt_path",
    "ffmpeg_path":                     "fo4_ffmpeg_path",
    "texconv_path":                    "fo4_texconv_path",
    "fo4_assets_path":                 "fo4_assets_path",
    "fo4_asset_lib_mesh_path":         "fo4_asset_lib_mesh_path",
    "fo4_asset_lib_tex_path":          "fo4_asset_lib_tex_path",
    "fo4_asset_lib_mat_path":          "fo4_asset_lib_mat_path",
    "fo4_asset_lib_path":              "fo4_asset_lib_path",
    "unity_assets_path":               "fo4_unity_assets_path",
    "unreal_assets_path":              "fo4_unreal_assets_path",
    "instantngp_path":                 "fo4_instantngp_path",
    "llm_enabled":                     "fo4_llm_enabled",
    "llm_endpoint":                    "fo4_llm_endpoint",
    "llm_model":                       "fo4_llm_model",
    "llm_api_key":                     "fo4_llm_api_key",
    "llm_allow_actions":               "fo4_llm_allow_actions",
    "llm_send_stats":                  "fo4_llm_send_stats",
    "advisor_auto_monitor_enabled":    "fo4_advisor_monitor",
    "advisor_auto_monitor_interval":   "fo4_advisor_interval",
    "optimize_remove_doubles_threshold": "fo4_opt_doubles",
    "optimize_preserve_uvs":           "fo4_opt_preserve_uvs",
    "optimize_apply_transforms":       "fo4_opt_apply_transforms",
    "mesh_panel_unified":              "fo4_mesh_panel_unified",
    "port":                            "fo4_mossy_port",
    "token":                           "fo4_mossy_token",
    "autostart":                       "fo4_mossy_autostart",
    "mossy_http_port":                 "fo4_mossy_http_port",
    "use_mossy_as_ai":                 "fo4_use_mossy_ai",
    "auto_install_tools":              "fo4_auto_install_tools",
    "auto_install_python":             "fo4_auto_install_python",
    "auto_install_pytorch":            "fo4_auto_install_python",  # alias
    "auto_register_tools":             "fo4_auto_register_tools",
    "torch_install_attempted":         "fo4_auto_install_python",  # alias
    "knowledge_base_enabled":          "fo4_kb_enabled",
    "knowledge_base_path":             "fo4_kb_path",
}

# Sensible defaults for every attribute (used when the scene prop is absent)
_DEFAULTS: dict[str, object] = {
    "havok2fbx_path":                  "",
    "nvtt_path":                       "",
    "ffmpeg_path":                     "",
    "texconv_path":                    "",
    "fo4_assets_path":                 "",
    "fo4_asset_lib_mesh_path":         "",
    "fo4_asset_lib_tex_path":          "",
    "fo4_asset_lib_mat_path":          "",
    "fo4_asset_lib_path":              "",
    "unity_assets_path":               "",
    "unreal_assets_path":              "",
    "instantngp_path":                 "",
    "llm_enabled":                     False,
    "llm_endpoint":                    "",
    "llm_model":                       "gpt-4o",
    "llm_api_key":                     "",
    "llm_allow_actions":               False,
    "llm_send_stats":                  True,
    "advisor_auto_monitor_enabled":    True,
    "advisor_auto_monitor_interval":   30,
    "optimize_remove_doubles_threshold": 0.0001,
    "optimize_preserve_uvs":           True,
    "optimize_apply_transforms":       True,
    "mesh_panel_unified":              False,
    "port":                            9999,
    "token":                           "",
    "autostart":                       True,
    "mossy_http_port":                 8080,
    "use_mossy_as_ai":                 False,
    "auto_install_tools":              True,
    "auto_install_python":             True,
    "auto_install_pytorch":            True,
    "auto_register_tools":             False,
    "torch_install_attempted":         False,
    "knowledge_base_enabled":          True,
    "knowledge_base_path":             "",
}


class FO4Settings:
    """Wraps bpy.types.Scene fo4_* properties.

    Provides the same attribute interface as the old ``FO4AddonPreferences``
    so every caller in operators.py / advisor_helpers.py / etc. works without
    modification.  Getting an attribute reads the scene property; setting one
    writes it back and auto-saves to JSON.
    """

    __slots__ = ("_scene",)

    def __init__(self, scene):
        object.__setattr__(self, "_scene", scene)

    def __getattr__(self, name: str):
        scene = object.__getattribute__(self, "_scene")
        key = _ATTR_MAP.get(name)
        if key and scene is not None:
            val = getattr(scene, key, None)
            if val is not None:
                return val
        return _DEFAULTS.get(name, "")

    def __setattr__(self, name: str, value):
        if name == "_scene":
            object.__setattr__(self, name, value)
            return
        scene = object.__getattribute__(self, "_scene")
        key = _ATTR_MAP.get(name)
        if key and scene is not None:
            try:
                setattr(scene, key, value)
                # Auto-save whenever a setting changes
                save_settings(scene)
            except Exception:
                pass


class _FallbackSettings:
    """Fallback when context.scene is unavailable; reads from JSON config."""

    def __init__(self):
        self._data = _load_json()

    def __getattr__(self, name: str):
        key = _ATTR_MAP.get(name, f"fo4_{name}")
        val = self._data.get(key)
        return val if val is not None else _DEFAULTS.get(name, "")

    def __setattr__(self, name: str, value):
        if name == "_data":
            object.__setattr__(self, name, value)
        else:
            key = _ATTR_MAP.get(name, f"fo4_{name}")
            self._data[key] = value
            _save_json(self._data)


# ---------------------------------------------------------------------------
# Public API (same signatures as before — no callers need to change)
# ---------------------------------------------------------------------------

def _addon_name() -> str:
    return __package__.split(".")[0]


def get_preferences():
    """Return an FO4Settings wrapper around the current scene.

    Never returns None; falls back to JSON-backed settings if the scene is
    unavailable so callers don't need to guard against None.
    """
    try:
        scene = bpy.context.scene
        if scene is not None:
            return FO4Settings(scene)
    except Exception:
        pass
    return _FallbackSettings()


def _resolve_executable(path_value: str, exe_names: tuple) -> str | None:
    if not path_value:
        return None
    try:
        expanded = bpy.path.abspath(path_value)
    except Exception:
        expanded = path_value
    if os.path.isfile(expanded):
        return expanded if os.access(expanded, os.X_OK) else None
    if os.path.isdir(expanded):
        for exe in exe_names:
            candidate = os.path.join(expanded, exe)
            if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                return candidate
    return None


def get_havok2fbx_path() -> str | None:
    prefs = get_preferences()
    path = getattr(prefs, "havok2fbx_path", "")
    try:
        path = bpy.path.abspath(path)
    except Exception:
        pass
    return path if path and os.path.isdir(path) else None


def is_havok2fbx_configured() -> bool:
    return get_havok2fbx_path() is not None


def get_llm_config() -> dict:
    prefs = get_preferences()
    def _s(v):
        return v.strip() if isinstance(v, str) else ""
    return {
        "enabled":      getattr(prefs, "llm_enabled", False),
        "endpoint":     _s(getattr(prefs, "llm_endpoint", "")),
        "model":        _s(getattr(prefs, "llm_model", "gpt-4o")),
        "api_key":      _s(getattr(prefs, "llm_api_key", "")),
        "allow_actions":getattr(prefs, "llm_allow_actions", False),
        "send_stats":   getattr(prefs, "llm_send_stats", True),
    }


def get_configured_ffmpeg_path() -> str | None:
    return _resolve_executable(
        getattr(get_preferences(), "ffmpeg_path", ""),
        ("ffmpeg.exe", "ffmpeg"),
    )


def get_configured_nvcompress_path() -> str | None:
    return _resolve_executable(
        getattr(get_preferences(), "nvtt_path", ""),
        ("nvcompress.exe", "nvcompress"),
    )


def get_configured_texconv_path() -> str | None:
    return _resolve_executable(
        getattr(get_preferences(), "texconv_path", ""),
        ("texconv.exe", "texconv"),
    )


def get_fo4_assets_path() -> str | None:
    path = getattr(get_preferences(), "fo4_assets_path", "")
    try:
        path = bpy.path.abspath(path).strip()
    except Exception:
        pass
    return path if path and os.path.isdir(path) else None


def get_unity_assets_path() -> str | None:
    path = getattr(get_preferences(), "unity_assets_path", "")
    try:
        path = bpy.path.abspath(path).strip()
    except Exception:
        pass
    return path if path and os.path.isdir(path) else None


def get_unreal_assets_path() -> str | None:
    path = getattr(get_preferences(), "unreal_assets_path", "")
    try:
        path = bpy.path.abspath(path).strip()
    except Exception:
        pass
    return path if path and os.path.isdir(path) else None


# ---------------------------------------------------------------------------
# FO4AddonPreferences – minimal empty shell
# ---------------------------------------------------------------------------

class FO4AddonPreferences(bpy.types.AddonPreferences):
    """Minimal preferences class.

    All settings are stored as Scene properties and configured from the
    3D Viewport N panel (Fallout 4 → Settings).  The Blender add-on
    preferences page shows only the standard enable / disable toggle.
    """

    bl_idname = _addon_name()

    def draw(self, context):
        # Empty on purpose – no custom UI here.
        # All settings are in the 3D Viewport → N panel → Fallout 4 → Settings
        pass


# ---------------------------------------------------------------------------
# Scene property registration
# ---------------------------------------------------------------------------

def _on_change(self, context):
    """Auto-save to JSON whenever any setting changes."""
    try:
        save_settings(self)
    except Exception:
        pass


def _on_asset_path_change(self, context):
    """Auto-save and invalidate the FO4GameAssets detection cache.

    Called when fo4_assets_path changes so that Smart Presets and the asset
    browser pick up the new location on the very next call.

    Also auto-populates fo4_asset_lib_mesh_path / fo4_asset_lib_tex_path /
    fo4_asset_lib_mat_path from the standard sub-folders of the Data directory
    so every panel in the add-on immediately sees the correct paths without the
    user having to fill in each field individually.
    """
    _on_change(self, context)
    try:
        from . import fo4_game_assets
        fo4_game_assets.FO4GameAssets.invalidate_cache()
    except Exception:
        pass
    # Auto-populate sub-path scene properties from the Data root.
    # self == bpy.context.scene here (the scene property update callback).
    try:
        import os
        from pathlib import Path as _P
        raw = getattr(self, 'fo4_assets_path', '') or ''
        try:
            import bpy as _bpy
            raw = _bpy.path.abspath(raw)
        except Exception:
            pass
        data_root = _P(raw.strip())
        if data_root.is_dir():
            for scene_attr, subdir in (
                ('fo4_asset_lib_mesh_path', 'meshes'),
                ('fo4_asset_lib_tex_path',  'textures'),
                ('fo4_asset_lib_mat_path',  'materials'),
            ):
                sub = data_root / subdir
                if sub.is_dir():
                    try:
                        setattr(self, scene_attr, str(sub))
                    except Exception:
                        pass
    except Exception:
        pass


# (name, bpy.props.*) pairs – registered onto bpy.types.Scene
_PROPS: list[tuple[str, object]] = [
    # ── Tool paths ────────────────────────────────────────────────────────────
    ("fo4_havok2fbx_path", bpy.props.StringProperty(
        name="Havok2FBX Folder",
        description="Folder containing Havok2FBX binaries",
        subtype="DIR_PATH", default="", update=_on_change)),
    ("fo4_nvtt_path", bpy.props.StringProperty(
        name="NVTT Path",
        description="Path to nvcompress.exe or its folder (NVIDIA Texture Tools)",
        subtype="FILE_PATH", default="", update=_on_change)),
    ("fo4_ffmpeg_path", bpy.props.StringProperty(
        name="FFmpeg Path",
        description="Path to ffmpeg.exe or its folder",
        subtype="FILE_PATH", default="", update=_on_change)),
    ("fo4_texconv_path", bpy.props.StringProperty(
        name="texconv Path",
        description="Path to texconv.exe or its folder (DirectXTex)",
        subtype="FILE_PATH", default="", update=_on_change)),
    ("fo4_assets_path", bpy.props.StringProperty(
        name="Fallout 4 Assets",
        description="Path to Fallout 4 extracted assets (meshes, textures …)",
        subtype="DIR_PATH", default="", update=_on_asset_path_change)),
    ("fo4_unity_assets_path", bpy.props.StringProperty(
        name="Unity Assets",
        description="Path to Unity project assets folder",
        subtype="DIR_PATH", default="", update=_on_change)),
    ("fo4_unreal_assets_path", bpy.props.StringProperty(
        name="Unreal Assets",
        description="Path to Unreal Engine project content folder",
        subtype="DIR_PATH", default="", update=_on_change)),
    ("fo4_instantngp_path", bpy.props.StringProperty(
        name="Instant-NGP Path",
        description=(
            "Path to the Instant-NGP install/source directory. "
            "Leave blank to use the auto-installed location or common defaults."
        ),
        subtype="DIR_PATH", default="", update=_on_change)),

    # ── LLM Advisor ───────────────────────────────────────────────────────────
    ("fo4_llm_enabled", bpy.props.BoolProperty(
        name="Enable LLM Advisor",
        description="Opt-in: allow calls to the LLM endpoint for advice",
        default=False, update=_on_change)),
    ("fo4_llm_endpoint", bpy.props.StringProperty(
        name="LLM Endpoint",
        description="HTTP endpoint for chat completions",
        default="", update=_on_change)),
    ("fo4_llm_model", bpy.props.StringProperty(
        name="LLM Model",
        description="Model name to request from the LLM endpoint",
        default="gpt-4o", update=_on_change)),
    ("fo4_llm_api_key", bpy.props.StringProperty(
        name="LLM API Key",
        description="Bearer token for the LLM endpoint",
        default="", subtype='PASSWORD', update=_on_change)),
    ("fo4_llm_allow_actions", bpy.props.BoolProperty(
        name="Allow Action Suggestions",
        description="Advisor may suggest operators; user must click to run",
        default=False, update=_on_change)),
    ("fo4_llm_send_stats", bpy.props.BoolProperty(
        name="Send Counts Only",
        description="Only send summary counts; no mesh or texture data",
        default=True, update=_on_change)),

    # ── Advisor auto-monitor ──────────────────────────────────────────────────
    ("fo4_advisor_monitor", bpy.props.BoolProperty(
        name="Advisor Auto-Monitor",
        description="Periodically check the scene for FO4 issues in the background",
        default=True, update=_on_change)),
    ("fo4_advisor_interval", bpy.props.IntProperty(
        name="Monitor Interval (s)",
        description="Seconds between automatic advisor checks",
        default=30, min=5, max=600, update=_on_change)),

    # ── Mesh optimisation ─────────────────────────────────────────────────────
    ("fo4_opt_doubles", bpy.props.FloatProperty(
        name="Remove Doubles Threshold",
        description="Distance for merging duplicate vertices during optimisation",
        default=0.0001, min=0.0, max=0.01, precision=6, update=_on_change)),
    ("fo4_opt_preserve_uvs", bpy.props.BoolProperty(
        name="Preserve UVs",
        description="Keep UV seams when removing doubles",
        default=True, update=_on_change)),
    ("fo4_opt_apply_transforms", bpy.props.BoolProperty(
        name="Apply Transforms",
        description="Automatically apply object transforms before optimisation",
        default=True, update=_on_change)),

    # ── UI layout ─────────────────────────────────────────────────────────────
    ("fo4_mesh_panel_unified", bpy.props.BoolProperty(
        name="Unified Mesh Panel",
        description="Show all mesh helpers in one box instead of basic / advanced split",
        default=False, update=_on_change)),

    # ── Mossy Link ────────────────────────────────────────────────────────────
    ("fo4_mossy_port", bpy.props.IntProperty(
        name="Mossy Link Port",
        description="TCP port the Mossy Link server listens on (Mossy → Blender control)",
        default=9999, min=1024, max=65535, update=_on_change)),
    ("fo4_mossy_token", bpy.props.StringProperty(
        name="Mossy Link Token",
        description="Optional shared secret for Mossy Link auth; leave blank to disable",
        default="", subtype='PASSWORD', update=_on_change)),
    ("fo4_mossy_autostart", bpy.props.BoolProperty(
        name="Auto-start Mossy Link",
        description="Start the Mossy Link server automatically when the add-on loads",
        default=True, update=_on_change)),
    ("fo4_mossy_http_port", bpy.props.IntProperty(
        name="Mossy HTTP Port",
        description="Port where Mossy's HTTP server listens for AI advisor queries",
        default=8080, min=1024, max=65535, update=_on_change)),
    ("fo4_use_mossy_ai", bpy.props.BoolProperty(
        name="Use Mossy as AI Advisor",
        description="Route advisor AI queries through Mossy (no API key needed)",
        default=False, update=_on_change)),

    # ── Auto-install ──────────────────────────────────────────────────────────
    ("fo4_auto_install_tools", bpy.props.BoolProperty(
        name="Auto-install CLI Tools",
        description="Automatically download missing CLI tools (NVTT, texconv, ffmpeg…)",
        default=True, update=_on_change)),
    ("fo4_auto_install_python", bpy.props.BoolProperty(
        name="Auto-install Python Deps",
        description="Install missing Python packages (PIL, numpy, requests…) at startup",
        default=True, update=_on_change)),
    ("fo4_auto_register_tools", bpy.props.BoolProperty(
        name="Auto-register Third-party Add-ons",
        description=(
            "Load UE importer, UModel, AssetStudio etc. automatically. "
            "Disable to avoid Blender policy warnings."
        ),
        default=False, update=_on_change)),

    # ── Knowledge base ────────────────────────────────────────────────────────
    ("fo4_kb_enabled", bpy.props.BoolProperty(
        name="Use Knowledge Base",
        description="Include bundled knowledge_base/ docs in advisor LLM context",
        default=True, update=_on_change)),
    ("fo4_kb_path", bpy.props.StringProperty(
        name="KB Folder",
        description="Custom folder of .txt / .md files to feed the advisor",
        default="", subtype='DIR_PATH', update=_on_change)),
]

_registered_props: list[str] = []

# Tracks the last seen active-scene name so _scene_change_handler can detect
# switches without running restore_settings() on every depsgraph update.
_last_active_scene: str = ""


@bpy.app.handlers.persistent
def _load_post_handler(scene, *args):
    """Restore persisted settings whenever a blend file is loaded."""
    global _last_active_scene
    restore_settings()
    try:
        _last_active_scene = bpy.context.scene.name if bpy.context.scene else ""
    except Exception:
        pass


@bpy.app.handlers.persistent
def _scene_change_handler(scene, depsgraph):
    """Restore persisted settings whenever the active scene changes.

    ``depsgraph_update_post`` is the correct modern Blender API for this purpose
    — ``scene_update_post`` was removed in Blender 2.91.  Although the handler
    fires after every depsgraph evaluation, the actual restore work only runs
    when the active-scene name changes (a single string comparison), so the
    per-frame overhead is negligible.
    """
    global _last_active_scene
    try:
        current = bpy.context.scene.name if bpy.context.scene else ""
    except Exception:
        return
    if current and current != _last_active_scene:
        _last_active_scene = current
        restore_settings()


def register():
    bpy.utils.register_class(FO4AddonPreferences)

    for name, prop in _PROPS:
        try:
            setattr(bpy.types.Scene, name, prop)
            _registered_props.append(name)
        except Exception as exc:
            print(f"⚠ fo4 preferences: failed to register {name}: {exc}")

    if _load_post_handler not in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.append(_load_post_handler)

    if _scene_change_handler not in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.append(_scene_change_handler)

    # Populate the current scene immediately so settings are available as soon
    # as the add-on is enabled (before any load_post event fires).
    restore_settings()
    try:
        _last_active_scene = bpy.context.scene.name if bpy.context.scene else ""
    except Exception:
        pass


def unregister():
    if _load_post_handler in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(_load_post_handler)

    if _scene_change_handler in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.remove(_scene_change_handler)

    for name in list(_registered_props):
        if hasattr(bpy.types.Scene, name):
            try:
                delattr(bpy.types.Scene, name)
            except Exception:
                pass
    _registered_props.clear()

    try:
        bpy.utils.unregister_class(FO4AddonPreferences)
    except Exception:
        pass
