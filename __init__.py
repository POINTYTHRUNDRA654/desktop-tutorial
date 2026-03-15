
# All imports at the very top
import bpy
from . import preferences as preferences
from . import tutorial_system as tutorial_system
from . import notification_system as notification_system
from . import mesh_helpers as mesh_helpers
from . import advanced_mesh_helpers as advanced_mesh_helpers
from . import texture_helpers as texture_helpers
from . import animation_helpers as animation_helpers
from . import rignet_helpers as rignet_helpers
from . import motion_generation_helpers as motion_generation_helpers
from . import quest_helpers as quest_helpers
from . import npc_helpers as npc_helpers
from . import world_building_helpers as world_building_helpers
from . import item_helpers as item_helpers
from . import preset_library as preset_library
from . import automation_system as automation_system
from . import addon_integration as addon_integration
from . import desktop_tutorial_client as desktop_tutorial_client
from . import shap_e_helpers as shap_e_helpers
from . import point_e_helpers as point_e_helpers
from . import advisor_helpers as advisor_helpers
from . import knowledge_helpers as knowledge_helpers
from . import ue_importer_helpers as ue_importer_helpers
from . import umodel_tools_helpers as umodel_tools_helpers
from . import unity_fbx_importer_helpers as unity_fbx_importer_helpers

def register():
    """Register all add-on classes and handlers"""
    # Register PyNifly installer
    try:
        from . import pynifly_installer
        pynifly_installer.register()
    except Exception as e:
        print(f"PyNifly installer registration failed: {e}")

    # Start advisor auto-monitor (opt-out in preferences)
    try:
        advisor_helpers.start_auto_monitor()
    except Exception as e:
        print(f"Advisor auto-monitor failed to start: {e}")

    # Initialize the tutorial system
    tutorial_system.initialize_tutorials()

    # Check for core Python dependencies and alert if missing
    missing = []
    for pkg in ("PIL", "numpy", "requests"):
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print("⚠ Missing Python packages:", ", ".join(missing))
        print("Run 'Install Python Requirements' from the Tools panel or use the provided setup scripts.")

    # Get Blender version string
    try:
        import bpy
        version_string = '.'.join(str(v) for v in bpy.app.version)
    except Exception:
        version_string = 'unknown'
    print(f"✓ Fallout 4 Tutorial Helper registered successfully (Blender {version_string})")

    # schedule a quick environment check once Blender is ready
    try:
        import bpy
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
    try:
        import bpy
        blender_version = bpy.app.version
    except Exception:
        blender_version = (0, 0, 0)
    if blender_version[0] < 3:
        print("  Note: Some features work best with Blender 3.0+")
    elif blender_version[0] >= 4:
        print("  Note: Blender 4.x support - please report any issues")
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print("⚠ Missing Python packages:", ", ".join(missing))
        print("Run 'Install Python Requirements' from the Tools panel or use the provided setup scripts.")

    # Get Blender version string
    try:
        import bpy
        version_string = '.'.join(str(v) for v in bpy.app.version)
    except Exception:
        version_string = 'unknown'
    print(f"✓ Fallout 4 Tutorial Helper registered successfully (Blender {version_string})")

    # schedule a quick environment check once Blender is ready
    try:
        import bpy
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
    try:
        import bpy
        blender_version = bpy.app.version
    except Exception:
        blender_version = (0, 0, 0)
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
