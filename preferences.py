"""
Addon preferences for Fallout 4 Tutorial Helper.
Provides a single path field for the Havok2FBX toolkit so users can point to an
existing install instead of duplicating binaries.
"""

from __future__ import annotations

import os
import bpy


_DEFAULT_HAVOK2FBX_PATH = ""
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


class FO4AddonPreferences(bpy.types.AddonPreferences):
    """Stores user-configurable add-on preferences."""

    bl_idname = _addon_name()

    havok2fbx_path: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="Havok2FBX Folder",
        subtype="DIR_PATH",
        default=_DEFAULT_HAVOK2FBX_PATH,
        description="Folder containing Havok2FBX binaries (existing install)",
    )

    mesh_panel_unified: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Unified Mesh Panel",
        description="Show all mesh helpers (basic, collision, advanced) in one box",
        default=False,
    )

    nvtt_path: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="NVTT Path",
        subtype="FILE_PATH",
        default=_DEFAULT_NVTT_PATH,
        description="Path to nvcompress.exe or its folder (NVIDIA Texture Tools)",
    )

    ffmpeg_path: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="ffmpeg Path",
        subtype="FILE_PATH",
        default="",
        description="Path to ffmpeg.exe or its folder (optional, installer will place binaries under tools/ffmpeg)",
    )

    texconv_path: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="texconv Path",
        subtype="FILE_PATH",
        default=_DEFAULT_TEXCONV_PATH,
        description="Path to texconv.exe or its folder (DirectXTex)",
    )

    fo4_assets_path: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="Fallout 4 Assets Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Custom path to Fallout 4 assets (meshes, textures, etc.). "
            "Leave blank for auto-detection from game installation. "
            "Example: H:/Fallout 4 working folder"
        ),
    )

    unity_assets_path: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="Unity Assets Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Path to Unity project assets or extracted assets folder. "
            "Should contain folders like Models, Textures, Materials, etc. "
            "Example: H:/Unity Projects/MyProject/Assets"
        ),
    )

    unreal_assets_path: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="Unreal Engine Assets Path",
        subtype="DIR_PATH",
        default="",
        description=(
            "Path to Unreal Engine project content or extracted assets. "
            "Should contain folders like Meshes, Textures, Materials, etc. "
            "Example: H:/UnrealProjects/MyProject/Content"
        ),
    )

    llm_enabled: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Enable LLM Advisor",
        default=False,
        description="Opt-in: allow calls to configured LLM endpoint for advice (metadata only)",
    )

    llm_endpoint: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="LLM Endpoint",
        default=_DEFAULT_LLM_ENDPOINT,
        description="HTTP endpoint for chat completions",
    )

    llm_model: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="LLM Model",
        default=_DEFAULT_LLM_MODEL,
        description="Model name to request from the endpoint",
    )

    llm_api_key: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="LLM API Key",
        default="",
        subtype='PASSWORD',
        description="Bearer token for the LLM endpoint",
    )

    llm_allow_actions: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Allow Action Suggestions",
        default=False,
        description="If enabled, advisor may suggest actions; execution still requires user click",
    )

    llm_send_stats: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Send Counts Only",
        default=True,
        description="Only send summary strings/counts; no mesh or texture binaries",
    )

    advisor_auto_monitor_enabled: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Advisor Auto-Monitor",
        default=True,
        description="Run advisor periodically in the background to surface issues",
    )

    advisor_auto_monitor_interval: bpy.props.IntProperty(options={'HIDDEN'}, 
        name="Monitor Interval (s)",
        default=_DEFAULT_ADVISOR_INTERVAL,
        min=5,
        max=600,
        description="Seconds between advisor checks",
    )

    knowledge_base_enabled: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Use Knowledge Base",
        default=True,
        description="Include snippets from knowledge_base/ (txt/md) in advisor LLM context",
    )

    knowledge_base_path: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="Knowledge Base Path",
        default=_DEFAULT_KB_PATH,
        subtype='DIR_PATH',
        description="Folder with txt/md docs to feed the advisor; defaults to bundled knowledge_base/",
    )

    auto_install_tools: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Auto Install Tools",
        default=True,
        description="If enabled, missing CLI tools will be downloaded automatically on startup",
    )

    auto_register_tools: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Auto Register External Tools",
        default=False,
        description=(
            "If enabled, third-party integrations (UE importer, UModel, AssetStudio, "
            "etc.) will be downloaded/loaded automatically on add-on startup. "
            "This may trigger \"policy violation\" warnings from Blender; leave "
            "disabled to load them manually."
        ),
    )

    auto_install_python: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Auto Install Python",
        default=True,
        description="If enabled, core Python dependencies will be installed on startup",
    )

    auto_install_pytorch: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Auto Install PyTorch",
        default=True,
        description="If enabled, PyTorch will be auto-installed to D:/t when Windows path errors are detected",
    )

    torch_install_attempted: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="PyTorch Install Attempted",
        default=False,
        description="Internal flag to track if PyTorch auto-install was already attempted",
    )

    # ---- Mesh optimization settings ----
    optimize_remove_doubles_threshold: bpy.props.FloatProperty(options={'HIDDEN'}, 
        name="Remove Doubles Threshold",
        default=0.0001,
        min=0.0,
        max=0.01,
        description="Distance threshold for merging duplicate vertices during optimization",
    )
    optimize_preserve_uvs: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Preserve UVs",
        default=True,
        description="Keep UV seams from being collapsed when removing doubles",
    )
    optimize_apply_transforms: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Apply Transforms",
        default=True,
        description="Automatically apply object transforms before optimization",
    )

    # ---- Mossy Link ----
    port: bpy.props.IntProperty(options={'HIDDEN'}, 
        name="Mossy Link Port",
        default=9999,
        min=1024,
        max=65535,
        description="TCP port the Mossy Link server (inside Blender) listens on for commands from Mossy",
    )

    token: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="Mossy Link Token",
        default="",
        subtype='PASSWORD',
        description="Optional shared secret for the Mossy Link TCP server; leave blank to disable auth",
    )

    autostart: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Auto-start Mossy Link",
        default=True,
        description="Start the Mossy Link server automatically when the add-on loads",
    )

    mossy_http_port: bpy.props.IntProperty(options={'HIDDEN'}, 
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

    use_mossy_as_ai: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Use Mossy as AI Advisor",
        default=False,
        description=(
            "Route advisor AI queries through Mossy instead of a remote LLM endpoint. "
            "Requires Mossy to be running on the desktop. "
            "No API key needed — everything stays on your machine."
        ),
    )

    use_antigravity_as_ai: bpy.props.BoolProperty(options={'HIDDEN'}, 
        name="Use Antigravity as AI Advisor",
        default=False,
        description=(
            "Route advisor AI queries through the Antigravity backend (Gemini). "
            "Requires an API key. "
        ),
    )

    antigravity_api_key: bpy.props.StringProperty(options={'HIDDEN'}, 
        name="Antigravity API Key",
        default="",
        subtype='PASSWORD',
        description="API Key for Antigravity (Gemini)",
    )

    def draw(self, context):
        layout = self.layout

        # All configurations have been moved to the 3D Viewport
        layout.label(text="All settings have been moved to the 3D Viewport.", icon="INFO")
        layout.label(text="Press 'N' in the 3D Viewport and look for the 'Fallout 4' tab,", icon="BLANK1")
        layout.label(text="then open the 'Settings' panel at the bottom.", icon="BLANK1")

        # (Moved Update info, Mesh Optimization, Mossy Link, and Antigravity to the 3D viewport N-panel)


def register():
    bpy.utils.register_class(FO4AddonPreferences)


def unregister():
    bpy.utils.unregister_class(FO4AddonPreferences)
