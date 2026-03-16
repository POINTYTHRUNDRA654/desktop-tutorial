"""
Addon preferences for Fallout 4 Tutorial Helper.
Settings are stored as bpy.types.Scene properties so they survive scene
reloads and work without the Blender add-on preferences panel.
"""

import os
import json
import bpy


_DEFAULT_HAVOK2FBX_PATH = r"D:\Blender Foundation\havok2fbx_release_0.1a"
_DEFAULT_NVTT_PATH = ""
_DEFAULT_TEXCONV_PATH = ""
_DEFAULT_LLM_ENDPOINT = ""
_DEFAULT_LLM_MODEL = "gpt-4o"
_DEFAULT_ADVISOR_INTERVAL = 30
_DEFAULT_KB_PATH = ""

# JSON file used to persist settings across Blender sessions
_CONFIG_FILE = os.path.join(os.path.dirname(__file__), ".fo4_settings.json")

# Tuple of (scene_property_name, default_value) for all persisted settings
_PERSISTENT = (
    ("fo4_havok2fbx_path", _DEFAULT_HAVOK2FBX_PATH),
    ("fo4_nvtt_path", _DEFAULT_NVTT_PATH),
    ("fo4_ffmpeg_path", ""),
    ("fo4_texconv_path", _DEFAULT_TEXCONV_PATH),
    ("fo4_assets_path", ""),
    ("fo4_llm_enabled", False),
    ("fo4_llm_api_key", ""),
    ("fo4_mossy_port", 9999),
    ("fo4_mossy_token", ""),
    ("fo4_mossy_autostart", False),
    ("fo4_use_mossy_ai", False),
    ("fo4_advisor_monitor", True),
    ("fo4_advisor_interval", _DEFAULT_ADVISOR_INTERVAL),
    ("fo4_opt_doubles", True),
    ("fo4_opt_preserve_uvs", True),
    ("fo4_opt_apply_transforms", True),
    ("fo4_mesh_panel_unified", True),
    ("fo4_auto_install_tools", False),
    ("fo4_kb_enabled", True),
    ("fo4_kb_path", _DEFAULT_KB_PATH),
)


def _addon_name() -> str:
    """Return the add-on module name for preference lookup."""
    return __package__.split(".")[0]


def save_settings(scene=None):
    """Persist scene settings to a JSON config file."""
    if scene is None:
        try:
            scene = bpy.context.scene
        except Exception:
            return
    if scene is None:
        return
    data = {name: getattr(scene, name, default) for name, default in _PERSISTENT}
    try:
        with open(_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[FO4] Could not save settings: {e}")


def restore_settings(scene=None):
    """Load persisted settings from the JSON config file into a scene."""
    if scene is None:
        try:
            scene = bpy.context.scene
        except Exception:
            return
    if scene is None:
        return
    try:
        if not os.path.exists(_CONFIG_FILE):
            return
        with open(_CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        for name, default in _PERSISTENT:
            val = data.get(name, default)
            try:
                setattr(scene, name, val)
            except Exception:
                pass
    except Exception as e:
        print(f"[FO4] Could not restore settings: {e}")


@bpy.app.handlers.persistent
def _load_post_handler(dummy):
    """Restore settings after a new .blend file is loaded."""
    restore_settings()


_last_scene_id = [None]


def _scene_change_handler(scene, depsgraph):
    """Re-apply settings only when the active scene actually switches (depsgraph_update_post)."""
    try:
        active = bpy.context.scene
        if active is None:
            return
        current_id = id(active)
        if current_id == _last_scene_id[0]:
            return
        _last_scene_id[0] = current_id
        restore_settings(active)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Map from old AddonPreferences attribute names → new scene property names
# ---------------------------------------------------------------------------
_ATTR_MAP = {
    "havok2fbx_path":               "fo4_havok2fbx_path",
    "nvtt_path":                    "fo4_nvtt_path",
    "ffmpeg_path":                  "fo4_ffmpeg_path",
    "texconv_path":                 "fo4_texconv_path",
    "assets_path":                  "fo4_assets_path",
    "llm_enabled":                  "fo4_llm_enabled",
    "llm_api_key":                  "fo4_llm_api_key",
    "llm_endpoint":                 "fo4_llm_endpoint",
    "llm_model":                    "fo4_llm_model",
    "llm_allow_actions":            "fo4_llm_allow_actions",
    "llm_send_stats":               "fo4_llm_send_stats",
    "mossy_port":                   "fo4_mossy_port",
    "mossy_token":                  "fo4_mossy_token",
    "mossy_autostart":              "fo4_mossy_autostart",
    "use_mossy_ai":                 "fo4_use_mossy_ai",
    "advisor_auto_monitor_enabled": "fo4_advisor_monitor",
    "advisor_auto_monitor_interval":"fo4_advisor_interval",
    "opt_doubles":                  "fo4_opt_doubles",
    "opt_preserve_uvs":             "fo4_opt_preserve_uvs",
    "opt_apply_transforms":         "fo4_opt_apply_transforms",
    "mesh_panel_unified":           "fo4_mesh_panel_unified",
    "auto_install_tools":           "fo4_auto_install_tools",
    "auto_install_python":          "fo4_auto_install_python",
    "knowledge_base_enabled":       "fo4_kb_enabled",
    "knowledge_base_path":          "fo4_kb_path",
}


class _FallbackSettings:
    """Safe defaults when no Blender scene/context is available."""

    def __getattr__(self, name):
        scene_prop = _ATTR_MAP.get(name)
        if scene_prop:
            for prop_name, default in _PERSISTENT:
                if prop_name == scene_prop:
                    return default
        return None

    def save_settings(self, scene=None):
        pass


class FO4Settings:
    """Wraps a bpy.types.Scene to expose settings via legacy attribute names."""

    def __init__(self, scene):
        object.__setattr__(self, "_scene", scene)

    def __getattr__(self, name):
        scene = object.__getattribute__(self, "_scene")
        scene_prop = _ATTR_MAP.get(name)
        if scene_prop:
            return getattr(scene, scene_prop, None)
        return getattr(scene, name, None)

    def __setattr__(self, name, value):
        if name == "_scene":
            object.__setattr__(self, name, value)
            return
        scene = object.__getattribute__(self, "_scene")
        scene_prop = _ATTR_MAP.get(name, name)
        try:
            setattr(scene, scene_prop, value)
        except Exception:
            pass

    def save_settings(self, scene=None):
        save_settings(object.__getattribute__(self, "_scene"))


def get_preferences():
    """Return an FO4Settings wrapper for the current scene, never None."""
    try:
        scene = bpy.context.scene
        if scene is not None:
            return FO4Settings(scene)
    except Exception:
        pass
    return _FallbackSettings()


def get_havok2fbx_path() -> str | None:
    """Return the configured Havok2FBX directory if set and exists."""
    prefs = get_preferences()
    if not prefs:
        return None
    path = bpy.path.abspath(prefs.havok2fbx_path or "")
    return path if path and os.path.isdir(path) else None


def is_havok2fbx_configured() -> bool:
    """True if the path is configured and points to an existing directory."""
    return get_havok2fbx_path() is not None


def get_llm_config() -> dict:
    prefs = get_preferences()
    if not prefs:
        return {"enabled": False}
    return {
        "enabled": bool(prefs.llm_enabled),
        "endpoint": (prefs.llm_endpoint or "").strip(),
        "model": (prefs.llm_model or _DEFAULT_LLM_MODEL).strip(),
        "api_key": (prefs.llm_api_key or "").strip(),
        "allow_actions": bool(prefs.llm_allow_actions),
        "send_stats": bool(prefs.llm_send_stats),
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
    return _resolve_executable(prefs.ffmpeg_path or "", ("ffmpeg.exe", "ffmpeg"))


def get_configured_nvcompress_path() -> str | None:
    """Return nvcompress path from preferences if set and executable."""
    prefs = get_preferences()
    if not prefs:
        return None
    return _resolve_executable(prefs.nvtt_path or "", ("nvcompress.exe", "nvcompress"))


def get_configured_texconv_path() -> str | None:
    """Return texconv path from preferences if set and executable."""
    prefs = get_preferences()
    if not prefs:
        return None
    return _resolve_executable(prefs.texconv_path or "", ("texconv.exe", "texconv"))


class FO4AddonPreferences(bpy.types.AddonPreferences):
    """Minimal shell – all settings live on bpy.types.Scene properties."""

    bl_idname = _addon_name()

    def draw(self, context):
        # No custom UI – settings are shown in the add-on sidebar panels
        pass


def _on_change(scene=None):
    """Update callback: persist settings whenever a scene property changes."""
    save_settings(scene)


def _make_update(prop_name):
    """Return a property update callback that saves settings on change."""
    def _updater(self, context):
        _on_change(context.scene)
    return _updater


def _on_asset_path_change(self, context):
    """Auto-populate sub-paths when the assets root changes, then save."""
    scene = context.scene
    assets_root = bpy.path.abspath(getattr(scene, "fo4_assets_path", ""))
    if os.path.isdir(assets_root):
        mesh_path = os.path.join(assets_root, "Meshes")
        if os.path.isdir(mesh_path):
            try:
                scene.fo4_asset_lib_mesh_path = mesh_path
            except Exception:
                pass
    _on_change(scene)


def register():
    bpy.utils.register_class(FO4AddonPreferences)

    # Register all settings as Scene properties
    bpy.types.Scene.fo4_havok2fbx_path = bpy.props.StringProperty(
        name="Havok2FBX Folder", subtype="DIR_PATH",
        default=_DEFAULT_HAVOK2FBX_PATH,
        description="Folder containing Havok2FBX binaries (existing install)",
        update=_make_update("fo4_havok2fbx_path"),
    )
    bpy.types.Scene.fo4_nvtt_path = bpy.props.StringProperty(
        name="NVTT Path", subtype="FILE_PATH",
        default=_DEFAULT_NVTT_PATH,
        description="Path to nvcompress.exe or its folder (NVIDIA Texture Tools)",
        update=_make_update("fo4_nvtt_path"),
    )
    bpy.types.Scene.fo4_ffmpeg_path = bpy.props.StringProperty(
        name="ffmpeg Path", subtype="FILE_PATH",
        default="",
        description="Path to ffmpeg.exe or its folder",
        update=_make_update("fo4_ffmpeg_path"),
    )
    bpy.types.Scene.fo4_texconv_path = bpy.props.StringProperty(
        name="texconv Path", subtype="FILE_PATH",
        default=_DEFAULT_TEXCONV_PATH,
        description="Path to texconv.exe or its folder (DirectXTex)",
        update=_make_update("fo4_texconv_path"),
    )
    bpy.types.Scene.fo4_assets_path = bpy.props.StringProperty(
        name="Assets Root", subtype="DIR_PATH",
        default="",
        description="Root folder for FO4 game assets",
        update=_on_asset_path_change,
    )
    bpy.types.Scene.fo4_llm_enabled = bpy.props.BoolProperty(
        name="Enable LLM Advisor", default=False,
        description="Opt-in: allow calls to configured LLM endpoint for advice",
        update=_make_update("fo4_llm_enabled"),
    )
    bpy.types.Scene.fo4_llm_api_key = bpy.props.StringProperty(
        name="LLM API Key", default="", subtype='PASSWORD',
        description="Bearer token for the LLM endpoint",
        update=_make_update("fo4_llm_api_key"),
    )
    bpy.types.Scene.fo4_llm_endpoint = bpy.props.StringProperty(
        name="LLM Endpoint", default=_DEFAULT_LLM_ENDPOINT,
        description="HTTP endpoint for chat completions",
        update=_make_update("fo4_llm_endpoint"),
    )
    bpy.types.Scene.fo4_llm_model = bpy.props.StringProperty(
        name="LLM Model", default=_DEFAULT_LLM_MODEL,
        description="Model name to request from the endpoint",
        update=_make_update("fo4_llm_model"),
    )
    bpy.types.Scene.fo4_llm_allow_actions = bpy.props.BoolProperty(
        name="Allow Action Suggestions", default=False,
        description="If enabled, advisor may suggest actions",
        update=_make_update("fo4_llm_allow_actions"),
    )
    bpy.types.Scene.fo4_llm_send_stats = bpy.props.BoolProperty(
        name="Send Counts Only", default=True,
        description="Only send summary strings/counts; no mesh or texture binaries",
        update=_make_update("fo4_llm_send_stats"),
    )
    bpy.types.Scene.fo4_mossy_port = bpy.props.IntProperty(
        name="Mossy Port", default=9999, min=1, max=65535,
        description="TCP port for Mossy Link server",
        update=_make_update("fo4_mossy_port"),
    )
    bpy.types.Scene.fo4_mossy_token = bpy.props.StringProperty(
        name="Mossy Token", default="", subtype='PASSWORD',
        description="Authentication token for Mossy Link",
        update=_make_update("fo4_mossy_token"),
    )
    bpy.types.Scene.fo4_mossy_autostart = bpy.props.BoolProperty(
        name="Auto-start Mossy Link", default=False,
        description="Start Mossy Link server automatically when add-on loads",
        update=_make_update("fo4_mossy_autostart"),
    )
    bpy.types.Scene.fo4_use_mossy_ai = bpy.props.BoolProperty(
        name="Use Mossy AI", default=False,
        description="Enable Mossy AI integration",
        update=_make_update("fo4_use_mossy_ai"),
    )
    bpy.types.Scene.fo4_advisor_monitor = bpy.props.BoolProperty(
        name="Advisor Auto-Monitor", default=True,
        description="Run advisor periodically in the background",
        update=_make_update("fo4_advisor_monitor"),
    )
    bpy.types.Scene.fo4_advisor_interval = bpy.props.IntProperty(
        name="Monitor Interval (s)", default=_DEFAULT_ADVISOR_INTERVAL,
        min=5, max=600,
        description="Seconds between advisor checks",
        update=_make_update("fo4_advisor_interval"),
    )
    bpy.types.Scene.fo4_opt_doubles = bpy.props.BoolProperty(
        name="Merge Doubles", default=True,
        description="Merge duplicate vertices during mesh optimization",
        update=_make_update("fo4_opt_doubles"),
    )
    bpy.types.Scene.fo4_opt_preserve_uvs = bpy.props.BoolProperty(
        name="Preserve UVs", default=True,
        description="Preserve UV islands when merging vertices",
        update=_make_update("fo4_opt_preserve_uvs"),
    )
    bpy.types.Scene.fo4_opt_apply_transforms = bpy.props.BoolProperty(
        name="Apply Transforms", default=True,
        description="Apply object transforms before export",
        update=_make_update("fo4_opt_apply_transforms"),
    )
    bpy.types.Scene.fo4_mesh_panel_unified = bpy.props.BoolProperty(
        name="Unified Mesh Panel", default=True,
        description="Show unified mesh operations panel",
        update=_make_update("fo4_mesh_panel_unified"),
    )
    bpy.types.Scene.fo4_auto_install_tools = bpy.props.BoolProperty(
        name="Auto Install Tools", default=False,
        description="Download missing CLI tools automatically on startup",
        update=_make_update("fo4_auto_install_tools"),
    )
    bpy.types.Scene.fo4_auto_install_python = bpy.props.BoolProperty(
        name="Auto Install Python", default=False,
        description="Install core Python dependencies on startup",
        update=_make_update("fo4_auto_install_python"),
    )
    bpy.types.Scene.fo4_kb_enabled = bpy.props.BoolProperty(
        name="Use Knowledge Base", default=True,
        description="Include knowledge_base/ snippets in advisor LLM context",
        update=_make_update("fo4_kb_enabled"),
    )
    bpy.types.Scene.fo4_kb_path = bpy.props.StringProperty(
        name="Knowledge Base Path", default=_DEFAULT_KB_PATH, subtype='DIR_PATH',
        description="Folder with txt/md docs to feed the advisor",
        update=_make_update("fo4_kb_path"),
    )

    # Persistence handlers – remove stale copies first to survive hot-reload
    for handler_list, handler_fn in (
        (bpy.app.handlers.load_post, _load_post_handler),
        (bpy.app.handlers.depsgraph_update_post, _scene_change_handler),
    ):
        # Remove any previous registration (object identity may differ on reload)
        to_remove = [h for h in handler_list if getattr(h, "__name__", None) == handler_fn.__name__]
        for h in to_remove:
            handler_list.remove(h)
        handler_list.append(handler_fn)

    # Restore settings on startup
    restore_settings()


def unregister():
    bpy.utils.unregister_class(FO4AddonPreferences)

    # Remove handlers
    if _load_post_handler in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(_load_post_handler)
    if _scene_change_handler in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.remove(_scene_change_handler)

    # Remove scene properties
    for attr in (
        "fo4_havok2fbx_path", "fo4_nvtt_path", "fo4_ffmpeg_path", "fo4_texconv_path",
        "fo4_assets_path", "fo4_llm_enabled", "fo4_llm_api_key", "fo4_llm_endpoint",
        "fo4_llm_model", "fo4_llm_allow_actions", "fo4_llm_send_stats",
        "fo4_mossy_port", "fo4_mossy_token", "fo4_mossy_autostart", "fo4_use_mossy_ai",
        "fo4_advisor_monitor", "fo4_advisor_interval",
        "fo4_opt_doubles", "fo4_opt_preserve_uvs", "fo4_opt_apply_transforms",
        "fo4_mesh_panel_unified", "fo4_auto_install_tools", "fo4_auto_install_python",
        "fo4_kb_enabled", "fo4_kb_path",
    ):
        try:
            delattr(bpy.types.Scene, attr)
        except Exception:
            pass
