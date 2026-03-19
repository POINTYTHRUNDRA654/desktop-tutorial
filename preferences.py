"""
Addon preferences for Fallout 4 Tutorial Helper.
Provides a single path field for the Havok2FBX toolkit so users can point to an
existing install instead of duplicating binaries.
"""

from __future__ import annotations

import os
import bpy


_DEFAULT_HAVOK2FBX_PATH = r"D:\Blender Foundation\havok2fbx_release_0.1a"
_DEFAULT_NVTT_PATH = ""
_DEFAULT_TEXCONV_PATH = ""
_DEFAULT_LLM_ENDPOINT = ""
_DEFAULT_LLM_MODEL = "gpt-4o"
_DEFAULT_ADVISOR_INTERVAL = 30
_DEFAULT_KB_PATH = ""


def _addon_name() -> str:
    """Return the add-on module name for preference lookup."""
    return __package__.split(".")[0]


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


def save_prefs_deferred() -> None:
    """Schedule an explicit save of Blender user preferences via a timer.

    Safe to call from any context (draw(), modal, plain functions).  The
    actual ``bpy.ops.wm.save_userpref()`` call runs from the main-thread
    timer callback where a proper Blender context is available.
    """
    def _do_save():
        try:
            bpy.ops.wm.save_userpref()
            print("✓ Add-on preferences saved to disk")
        except Exception as e:
            print(f"Could not auto-save preferences: {e}")
        return None  # do not reschedule

    try:
        bpy.app.timers.register(_do_save, first_interval=0.5)
    except Exception as e:
        print(f"Could not schedule preference save: {e}")


def restore_scene_props_from_prefs(scene) -> None:
    """Copy persisted addon-preference path values into scene properties.

    Scene properties reset to their defaults every time a new .blend file is
    created or opened (unless that file itself saved the values).  Calling this
    from a ``load_post`` / ``load_factory_startup_post`` handler ensures the
    panels always reflect the globally-saved paths without the user having to
    re-enter them.
    """
    prefs = get_preferences()
    if prefs is None or scene is None:
        return

    _PREF_TO_SCENE = {
        "fo4_assets_path":      "fo4_assets_path",
        "fo4_assets_mesh_path": "fo4_assets_mesh_path",
        "fo4_assets_tex_path":  "fo4_assets_tex_path",
        "fo4_assets_mat_path":  "fo4_assets_mat_path",
        "unity_assets_path":    "fo4_unity_assets_path",
        "unreal_assets_path":   "fo4_unreal_assets_path",
    }
    for pref_attr, scene_attr in _PREF_TO_SCENE.items():
        saved = getattr(prefs, pref_attr, "").strip()
        if saved and hasattr(scene, scene_attr) and not getattr(scene, scene_attr, "").strip():
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

    # Restore the dedicated torch_custom_path preference
    torch_path = bpy.path.abspath(prefs.torch_custom_path).strip()
    if torch_path and os.path.isdir(torch_path) and torch_path not in _sys.path:
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
    )

    fo4_assets_mesh_path: bpy.props.StringProperty(
        name="FO4 Meshes Path",
        subtype="DIR_PATH",
        default="",
        description="Path to the Fallout 4 meshes sub-folder (e.g. Data/meshes)",
    )

    fo4_assets_tex_path: bpy.props.StringProperty(
        name="FO4 Textures Path",
        subtype="DIR_PATH",
        default="",
        description="Path to the Fallout 4 textures sub-folder (e.g. Data/textures)",
    )

    fo4_assets_mat_path: bpy.props.StringProperty(
        name="FO4 Materials Path",
        subtype="DIR_PATH",
        default="",
        description="Path to the Fallout 4 materials sub-folder (e.g. Data/materials)",
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
    )

    autostart: bpy.props.BoolProperty(
        name="Auto-start Mossy Link",
        default=True,
        description="Start the Mossy Link server automatically when the add-on loads",
    )

    mossy_http_port: bpy.props.IntProperty(
        name="Mossy HTTP Port",
        default=8080,
        min=1024,
        max=65535,
        description=(
            "Port where Mossy's HTTP server listens. "
            "Blender connects here to send AI advisor questions to Mossy. "
            "Must match the port configured in your Mossy desktop app."
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

    def draw(self, context):
        layout = self.layout

        box = layout.box()
        box.label(text="Havok2FBX", icon="FILE_FOLDER")
        box.prop(self, "havok2fbx_path", text="Folder")

        # new preference added
        ui_box = layout.box()
        ui_box.label(text="User Interface", icon="PREFERENCES")
        ui_box.prop(self, "mesh_panel_unified", text="Unified Mesh Panel")
        ui_box.label(text="Show all mesh helpers in one box (vs split basic/advanced)")

        path = bpy.path.abspath(self.havok2fbx_path)
        if os.path.isdir(path):
            box.label(text=f"Configured: {path}", icon="CHECKMARK")
        else:
            box.label(text="Path not found. Set to your existing install.", icon="ERROR")

        tex_box = layout.box()
        tex_box.label(text="Texture Converters", icon="IMAGE_DATA")
        tex_box.prop(self, "nvtt_path", text="nvcompress or folder")
        tex_box.prop(self, "texconv_path", text="texconv or folder")

        ff_box = layout.box()
        ff_box.label(text="Video & Audio Tools", icon="SOUND")
        ff_box.prop(self, "ffmpeg_path", text="ffmpeg or folder")

        nvcompress = get_configured_nvcompress_path()
        texconv = get_configured_texconv_path()

        if nvcompress:
            tex_box.label(text=f"nvcompress: {nvcompress}", icon="CHECKMARK")
        else:
            tex_box.label(text="nvcompress not set/found (PATH or set here)", icon="ERROR")

        if texconv:
            tex_box.label(text=f"texconv: {texconv}", icon="CHECKMARK")
        else:
            tex_box.label(text="texconv not set/found (tools/install_texconv.ps1)", icon="ERROR")

        llm_box = layout.box()
        llm_box.label(text="Advisor (LLM, optional)", icon="INFO")
        llm_box.prop(self, "llm_enabled", text="Enable LLM Advisor (opt-in)")
        llm_box.prop(self, "llm_endpoint", text="Endpoint")
        llm_box.prop(self, "llm_model", text="Model")
        llm_box.prop(self, "llm_api_key", text="API Key")
        llm_box.prop(self, "llm_allow_actions", text="Allow Action Suggestions")
        llm_box.prop(self, "llm_send_stats", text="Send summary only")

        auto_box = layout.box()
        auto_box.label(text="Advisor Auto-Monitor", icon="FILE_REFRESH")
        auto_box.prop(self, "advisor_auto_monitor_enabled", text="Enable background checks")
        auto_box.prop(self, "advisor_auto_monitor_interval", text="Interval (seconds)")

        kb_box = layout.box()
        kb_box.label(text="Advisor Knowledge Base", icon="BOOKMARKS")
        kb_box.prop(self, "knowledge_base_enabled", text="Use bundled/user KB")
        kb_box.prop(self, "knowledge_base_path", text="KB folder (txt/md)")

        auto_box = layout.box()
        auto_box.label(text="Automatic Tool Installation", icon="FILE_REFRESH")
        auto_box.prop(self, "auto_install_tools", text="Auto-install missing tools at startup (UModel, etc.)")
        auto_box.prop(self, "auto_install_python", text="Auto-install Python deps at startup")
        auto_box.prop(self, "auto_install_pytorch", text="Auto-install PyTorch at startup (AI features)")
        auto_box.prop(self, "auto_register_tools", text="Auto-register third-party add-ons")
        auto_box.operator("fo4.check_tool_paths", text="Check Tool Paths", icon='INFO')
        auto_box.label(text="(disable to avoid policy warnings at startup)", icon='INFO')

        # PyTorch Installation Helper
        torch_box = layout.box()
        torch_box.label(text="PyTorch Installation (AI Features)", icon="PLUGIN")
        try:
            from . import torch_path_manager
            success, msg, _ = torch_path_manager.TorchPathManager.try_import_torch()
            if success:
                torch_box.label(text=f"✓ PyTorch loaded: {msg}", icon="CHECKMARK")
            else:
                if msg == "windows_path_error":
                    torch_box.label(text="⚠ Windows path length error detected", icon="ERROR")
                    torch_box.label(text="PyTorch cannot load from default location", icon="INFO")
                else:
                    torch_box.label(text=f"⚠ {msg}", icon="ERROR")
                torch_box.operator("torch.install_custom_path", text="Install PyTorch", icon="IMPORT")
        except Exception as e:
            torch_box.label(text=f"Unable to check PyTorch: {str(e)}", icon="ERROR")

        update_box = layout.box()
        update_box.label(text="Add-on Update", icon="FILE_REFRESH")
        update_box.label(
            text="After installing a new zip, restart Blender to apply changes.",
            icon='INFO',
        )
        # Reload button removed - causes crashes in Blender 4.5+
        # update_box.operator("fo4.reload_addon", text="Reload Add-on", icon='FILE_REFRESH')

        opt_box = layout.box()
        opt_box.label(text="Mesh Optimization", icon="MOD_DECIM")
        opt_box.prop(self, "optimize_apply_transforms")
        opt_box.prop(self, "optimize_remove_doubles_threshold")
        opt_box.prop(self, "optimize_preserve_uvs")

        ml_box = layout.box()
        ml_box.label(text="Mossy Link", icon="LINKED")

        # TCP server (Blender ← Mossy commands)
        tcp_sub = ml_box.box()
        tcp_sub.label(text="TCP Server  (Mossy → Blender control)", icon="NETWORK_DRIVE")
        tcp_sub.prop(self, "port", text="Listen Port")
        tcp_sub.prop(self, "token", text="Auth Token")
        tcp_sub.prop(self, "autostart", text="Auto-start on load")

        # HTTP client (Blender → Mossy AI)
        http_sub = ml_box.box()
        http_sub.label(text="AI Queries  (Blender → Mossy)", icon="URL")
        http_sub.prop(self, "mossy_http_port", text="Mossy HTTP Port")
        http_sub.prop(self, "use_mossy_as_ai", text="Use Mossy as AI Advisor")
        if self.use_mossy_as_ai:
            http_sub.label(text="✓ Advisor will ask Mossy instead of remote LLM", icon="CHECKMARK")
            http_sub.label(text="  Enable LLM Advisor above as fallback", icon="INFO")
        else:
            http_sub.label(text="Enable to route advisor AI through Mossy", icon="INFO")

        ml_box.operator("wm.mossy_check_http", text="Check Mossy HTTP", icon="QUESTION")


def register():
    bpy.utils.register_class(FO4AddonPreferences)


def unregister():
    bpy.utils.unregister_class(FO4AddonPreferences)
