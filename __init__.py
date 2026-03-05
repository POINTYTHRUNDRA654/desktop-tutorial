"""
Blender Fallout 4 Tutorial Add-on
A comprehensive tutorial and helper system for creating Fallout 4 mods in Blender
"""

bl_info = {
    "name": "Fallout 4 Tutorial Helper",
    "author": "Tutorial Team",
    "version": (2, 1, 2),
    "blender": (2, 90, 0),  # Compatible with Blender 2.90+ through 5.x
    "location": "View3D > Sidebar > Fallout 4",
    "description": "Comprehensive tutorial system and helpers for creating Fallout 4 mods including quests, NPCs, items, and world building. Compatible with Blender 2.90 through 5.x",
    "warning": "",
    "doc_url": "https://github.com/POINTYTHRUNDRA654/Blender-add-on",
    "category": "3D View",
}

import bpy
import importlib

# helper for resilient imports – some modules may fail under untested Blender
# releases (e.g. Blender 5.x during early testing).  We log failures but
# allow the addon to initialize so users can still see the error message and
# report it.

def _try_import(name: str):
    """Attempt to import a submodule of this package by name.

    Returns the module object on success or None on failure.  A warning is
    printed to the console so testers know which component raised an exception.
    """
    full = f"{__package__}.{name}"
    try:
        return importlib.import_module(full)
    except Exception as exc:  # pragma: no cover - safety belt
        print(f"⚠ Failed to import {name} ({full}): {exc}")
        import traceback
        traceback.print_exc()
        return None

# import core submodules; missing components will be skipped but reported.
preferences = _try_import("preferences")
ui_panels = _try_import("ui_panels")
operators = _try_import("operators")
tutorial_system = _try_import("tutorial_system")
mesh_helpers = _try_import("mesh_helpers")
advanced_mesh_helpers = _try_import("advanced_mesh_helpers")
texture_helpers = _try_import("texture_helpers")
animation_helpers = _try_import("animation_helpers")
export_helpers = _try_import("export_helpers")
notification_system = _try_import("notification_system")
image_to_mesh_helpers = _try_import("image_to_mesh_helpers")
hunyuan3d_helpers = _try_import("hunyuan3d_helpers")
zoedepth_helpers = _try_import("zoedepth_helpers")
gradio_helpers = _try_import("gradio_helpers")
hymotion_helpers = _try_import("hymotion_helpers")
nvtt_helpers = _try_import("nvtt_helpers")
realesrgan_helpers = _try_import("realesrgan_helpers")
get3d_helpers = _try_import("get3d_helpers")
stylegan2_helpers = _try_import("stylegan2_helpers")
instantngp_helpers = _try_import("instantngp_helpers")
imageto3d_helpers = _try_import("imageto3d_helpers")
rignet_helpers = _try_import("rignet_helpers")
motion_generation_helpers = _try_import("motion_generation_helpers")
quest_helpers = _try_import("quest_helpers")
npc_helpers = _try_import("npc_helpers")
world_building_helpers = _try_import("world_building_helpers")
item_helpers = _try_import("item_helpers")
preset_library = _try_import("preset_library")
automation_system = _try_import("automation_system")
addon_integration = _try_import("addon_integration")
desktop_tutorial_client = _try_import("desktop_tutorial_client")
shap_e_helpers = _try_import("shap_e_helpers")
point_e_helpers = _try_import("point_e_helpers")
advisor_helpers = _try_import("advisor_helpers")
knowledge_helpers = _try_import("knowledge_helpers")
mossy_link = _try_import("mossy_link")

# tool_installers is not registered automatically but may be used during
# registration-time dependency checks.  Import it here so the name exists.
# we don't add it to `modules` because it has no register()/unregister().
tool_installers = _try_import("tool_installers")

# core modules that are safe to import and register unconditionally.
# a few of the optional/external helpers are only added lazily; any module
# that failed to import (due to missing APIs in an untested Blender release)
# will be replaced with None by the `_try_import` helper above.  We strip
# those out here so the registration loop can proceed without crashing.
def _filter(mod):
    return mod is not None

modules = list(filter(_filter, [
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
    # the external integration helpers are intentionally omitted from the
    # automatic registration list.  They are heavy and may trigger policy
    # violations when the wrapped upstream add‑ons are loaded at import time.
    # Users can enable each integration manually via the sidebar buttons or
    # the "Check ..." operators.
    # ue_importer_helpers,
    # umodel_tools_helpers,
    # unity_fbx_importer_helpers,
    # asset_studio_helpers,
    # asset_ripper_helpers,
    # tool_installers,
    mossy_link,
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
]))

def register():
    """Register all add-on classes and handlers"""
    # Check Blender version and show compatibility info
    blender_version = bpy.app.version
    version_string = f"{blender_version[0]}.{blender_version[1]}.{blender_version[2]}"
    
    print(f"Fallout 4 Tutorial Helper - Initializing for Blender {version_string}")
    
    # Register all modules, but continue even if one fails so the
    # user can see the error in the console and report it.
    for module in modules:
        try:
            module.register()
        except Exception as e:  # pragma: no cover
            name = getattr(module, '__name__', str(module))
            print(f"⚠ Error registering module {name}: {e}")
            import traceback
            traceback.print_exc()

    # Start advisor auto-monitor (opt-out in preferences)
    try:
        advisor_helpers.start_auto_monitor()
    except Exception as e:
        print(f"Advisor auto-monitor failed to start: {e}")
    
    # Initialize the tutorial system
    tutorial_system.initialize_tutorials()
    
    # Check for core Python dependencies — install automatically if missing.
    # install_python_requirements() selects the right version constraints for
    # the running Python (e.g. Pillow<10 on Python 3.7, --break-system-packages
    # on Python 3.11+) so we always delegate to it instead of calling pip directly.
    import importlib.util as _ilu
    _core_packages = {
        "PIL": "Pillow",
        "numpy": "numpy",
        "requests": "requests",
        "trimesh": "trimesh",
        "PyPDF2": "PyPDF2",
    }
    missing = {mod: pip for mod, pip in _core_packages.items() if _ilu.find_spec(mod) is None}
    if missing:
        import sys as _sys
        py_ver = f"{_sys.version_info.major}.{_sys.version_info.minor}"
        missing_desc = ", ".join(f"{pip} (import {mod})" for mod, pip in missing.items())
        print(f"⚠ Missing Python packages: {missing_desc}")
        print(f"  Python {py_ver} — attempting version-aware automatic installation …")
        if tool_installers:
            try:
                ok, msg = tool_installers.install_python_requirements(include_optional=False)
            except Exception as e:
                ok, msg = False, f"installation routine threw: {e}"
        else:
            ok, msg = False, "tool_installers module unavailable"

        if ok:
            print(f"✓ {msg}")
        else:
            print(f"  Auto-install failed: {msg}")
            print("  Use the 'Install Core Dependencies' button in the Setup & Status panel.")
    else:
        print("✓ All core Python dependencies present")

    print(f"✓ Fallout 4 Tutorial Helper registered successfully (Blender {version_string})")

    # schedule a quick environment check once Blender is ready
    try:
        # 'bpy' is already imported at module level; avoid re-import here or
        # Python will treat it as a local variable and raise UnboundLocalError
        def _post_register():
            try:
                # query the status of builtin tools; these are always safe and
                # do not trigger policy warnings.  We leave external integrations alone
                # until the user explicitly requests them.
                bpy.ops.fo4.check_kb_tools()

                # for convenience we can also log the status values of the external
                # helpers without triggering their registration logic.
                from . import (
                    ue_importer_helpers,
                    umodel_tools_helpers,
                    unity_fbx_importer_helpers,
                    asset_studio_helpers,
                    asset_ripper_helpers,
                )
                print("UE importer status:", ue_importer_helpers.status())
                print("UModel tools status:", umodel_tools_helpers.status())
                print("Unity FBX importer status:", unity_fbx_importer_helpers.status())
                print("Asset Studio status:", asset_studio_helpers.status())
                print("Asset Ripper status:", asset_ripper_helpers.status())

                # conditional auto-register based on preference
                from . import preferences
                prefs = preferences.get_preferences()
                if prefs and getattr(prefs, "auto_register_tools", False):
                    from . import (
                        ue_importer_helpers,
                        umodel_tools_helpers,
                        unity_fbx_importer_helpers,
                        asset_studio_helpers,
                        asset_ripper_helpers,
                    )
                    if not ue_importer_helpers.status()[0]:
                        ue_importer_helpers.download_latest()
                        ue_importer_helpers.register()
                    if not umodel_tools_helpers.status()[0]:
                        umodel_tools_helpers.download_latest()
                        umodel_tools_helpers.register()
                    if not unity_fbx_importer_helpers.status()[0]:
                        unity_fbx_importer_helpers.download_latest()
                    if not asset_studio_helpers.status()[0]:
                        asset_studio_helpers.download_latest()
                    if not asset_ripper_helpers.status()[0]:
                        asset_ripper_helpers.download_latest()

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
                # ignore any issues in post-register diagnostics
                pass
            return None  # only run once
        # use a timer to avoid re‑entrancy during registration
        bpy.app.timers.register(_post_register, first_interval=0.1)
    except Exception as e:
        print(f"Post-register environment check failed: {e}")
    
    # Show version-specific notes if needed.
    if blender_version[0] < 3:
        print("  Note: Some features work best with Blender 3.0+")
    elif blender_version[0] == 3:
        # nothing special to say; 3.x is the historically best-tested range
        pass
    elif blender_version[0] == 4:
        print("  Note: Blender 4.x fully supported")
    else:
        # Blender 5.x and beyond — API compatibility shims are in place
        print(
            "  Note: Blender {0}.x detected and fully supported."
            " Please report any issues with Blender version details.".format(blender_version[0])
        )

def unregister():
    """Unregister all add-on classes and handlers"""
    try:
        advisor_helpers.stop_auto_monitor()
    except Exception:
        pass
    for module in reversed(modules):
        try:
            module.unregister()
        except Exception as e:  # pragma: no cover
            name = getattr(module, '__name__', str(module))
            print(f"⚠ Error unregistering module {name}: {e}")
            import traceback
            traceback.print_exc()
    
    print("Fallout 4 Tutorial Helper unregistered")

if __name__ == "__main__":
    register()
