"""
Blender Fallout 4 Tutorial Add-on
A comprehensive tutorial and helper system for creating Fallout 4 mods in Blender
"""

bl_info = {
    "name": "Fallout 4 Tutorial Helper",
    "author": "Tutorial Team",
    "version": (2, 1, 2),
    "blender": (2, 80, 0),  # Compatible with Blender 2.80+ (all modern versions)
    "location": "View3D > Sidebar > Fallout 4",
    "description": "Comprehensive tutorial system and helpers for creating Fallout 4 mods including quests, NPCs, items, and world building. Compatible with Blender 2.80 through 4.x+",
    "warning": "",
    "doc_url": "https://github.com/POINTYTHRUNDRA654/Blender-add-on",
    "category": "3D View",
}

import bpy
from . import preferences
from . import ui_panels
from . import operators
from . import tutorial_system
from . import mesh_helpers
from . import advanced_mesh_helpers
from . import texture_helpers
from . import animation_helpers
from . import export_helpers
from . import notification_system
from . import image_to_mesh_helpers
from . import hunyuan3d_helpers
from . import zoedepth_helpers
from . import gradio_helpers
from . import hymotion_helpers
from . import nvtt_helpers
from . import realesrgan_helpers
from . import get3d_helpers
from . import stylegan2_helpers
from . import instantngp_helpers
from . import imageto3d_helpers
from . import rignet_helpers
from . import motion_generation_helpers
from . import quest_helpers
from . import npc_helpers
from . import world_building_helpers
from . import item_helpers
from . import preset_library
from . import automation_system
from . import addon_integration
from . import desktop_tutorial_client
from . import shap_e_helpers
from . import point_e_helpers
from . import advisor_helpers
from . import knowledge_helpers
from . import ue_importer_helpers
from . import umodel_tools_helpers
from . import unity_fbx_importer_helpers
from . import tool_installers

modules = [
    preferences,
    tutorial_system,
    notification_system,
    mesh_helpers,
    advanced_mesh_helpers,
    texture_helpers,
    animation_helpers,
    rignet_helpers,
    motion_generation_helpers,
    quest_helpers,
    npc_helpers,
    world_building_helpers,
    item_helpers,
    preset_library,
    automation_system,
    addon_integration,
    desktop_tutorial_client,
    shap_e_helpers,
    point_e_helpers,
    advisor_helpers,
    knowledge_helpers,
    ue_importer_helpers,
    umodel_tools_helpers,
    unity_fbx_importer_helpers,
    tool_installers,
    export_helpers,
    image_to_mesh_helpers,
    hunyuan3d_helpers,
    zoedepth_helpers,
    gradio_helpers,
    hymotion_helpers,
    nvtt_helpers,
    realesrgan_helpers,
    get3d_helpers,
    stylegan2_helpers,
    instantngp_helpers,
    imageto3d_helpers,
    operators,
    ui_panels,
]

def register():
    """Register all add-on classes and handlers"""
    # Check Blender version and show compatibility info
    blender_version = bpy.app.version
    version_string = f"{blender_version[0]}.{blender_version[1]}.{blender_version[2]}"
    
    print(f"Fallout 4 Tutorial Helper - Initializing for Blender {version_string}")
    
    # Register all modules
    for module in modules:
        module.register()

    # Start advisor auto-monitor (opt-out in preferences)
    try:
        advisor_helpers.start_auto_monitor()
    except Exception as e:
        print(f"Advisor auto-monitor failed to start: {e}")
    
    # Initialize the tutorial system
    tutorial_system.initialize_tutorials()
    
    # Check for core Python dependencies — install automatically if missing
    missing = []
    for pkg in ("PIL", "numpy", "requests"):
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"⚠ Missing Python packages: {', '.join(missing)}")
        print("  Attempting automatic installation via pip …")
        try:
            import sys
            import subprocess
            install_names = {"PIL": "Pillow", "numpy": "numpy", "requests": "requests"}
            pkgs = [install_names[p] for p in missing]
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "--quiet"] + pkgs,
                timeout=120,
            )
            print(f"✓ Successfully installed: {', '.join(pkgs)}")
        except subprocess.CalledProcessError as _e:
            print(f"  pip install failed (return code {_e.returncode}). "
                  "Check your internet connection or run Blender as administrator.")
            print("  Use the 'Install Core Dependencies' button in the Fallout 4 sidebar panel.")
        except Exception as _e:
            print(f"  Auto-install failed: {_e}")
            print("  Use the 'Install Core Dependencies' button in the Fallout 4 sidebar panel.")
    else:
        print("✓ All core Python dependencies present")

    print(f"✓ Fallout 4 Tutorial Helper registered successfully (Blender {version_string})")

    # schedule a quick environment check once Blender is ready
    try:
        # 'bpy' is already imported at module level; avoid re-import here or
        # Python will treat it as a local variable and raise UnboundLocalError
        def _post_register():
            try:
                bpy.ops.fo4.check_kb_tools()
                bpy.ops.fo4.check_ue_importer()
                bpy.ops.fo4.check_umodel_tools()
                bpy.ops.fo4.check_unity_fbx_importer()
                # attempt auto-download missing repos too
                from . import ue_importer_helpers, umodel_tools_helpers, unity_fbx_importer_helpers, preferences
                prefs = preferences.get_preferences()
                if not ue_importer_helpers.status()[0]:
                    ue_importer_helpers.download_latest()
                    ue_importer_helpers.register()
                if not umodel_tools_helpers.status()[0]:
                    umodel_tools_helpers.download_latest()
                    umodel_tools_helpers.register()
                if not unity_fbx_importer_helpers.status()[0]:
                    unity_fbx_importer_helpers.download_latest()
                # optionally auto-install CLI tools
                if prefs and getattr(prefs, 'auto_install_tools', False):
                    bpy.ops.fo4.install_all_tools()
                # optionally auto-install python reqs
                if prefs and getattr(prefs, 'auto_install_python', False):
                    bpy.ops.fo4.install_python_deps()
                # auto-install Niftools if exporter missing
                try:
                    nif_ok, _ = export_helpers.ExportHelpers.nif_exporter_available()
                    if not nif_ok and prefs and getattr(prefs, 'auto_install_tools', False):
                        bpy.ops.fo4.install_niftools()
                except Exception:
                    pass
                # if ffmpeg not configured, try to auto-assign from PATH or tools
                if prefs and not prefs.ffmpeg_path:
                    from .knowledge_helpers import tool_status
                    status = tool_status()
                    if status.get('ffmpeg'):
                        # find executable either in PATH or tools
                        from shutil import which
                        exe = which('ffmpeg')
                        if not exe:
                            # search tools folder
                            from pathlib import Path
                            base = Path(__file__).resolve().parent / 'tools' / 'ffmpeg'
                            for p in base.rglob('ffmpeg.exe'):
                                exe = str(p)
                                break
                        if exe:
                            prefs.ffmpeg_path = exe
            except Exception:
                pass
            return None  # only run once
        bpy.app.timers.register(_post_register, first_interval=1.0)
    except Exception:
        pass
    
    # Show version-specific notes if needed
    if blender_version[0] < 3:
        print("  Note: Some features work best with Blender 3.0+")
    elif blender_version[0] >= 4:
        print("  Note: Blender 4.x support - please report any issues")

def unregister():
    """Unregister all add-on classes and handlers"""
    try:
        advisor_helpers.stop_auto_monitor()
    except Exception:
        pass
    for module in reversed(modules):
        module.unregister()
    
    print("Fallout 4 Tutorial Helper unregistered")

if __name__ == "__main__":
    register()
