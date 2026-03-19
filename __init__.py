"""
Blender Fallout 4 Tutorial Add-on
A comprehensive tutorial and helper system for creating Fallout 4 mods in Blender
"""

bl_info = {
    "name": "Fallout 4 Mod Assistant",
    "author": "Tutorial Team",
    "version": (5, 0, 0),
    "blender": (2, 90, 0),  # Compatible with Blender 2.90+ through 5.x
    "location": "View3D > Sidebar > Fallout 4",
    "description": (
        "Professional Fallout 4 modding assistant. Exports NIF (BSTriShape) via "
        "PyNifly (Blender 4.x/5.x) or Niftools v0.1.1 (Blender 3.6 LTS), "
        "auto-preps meshes (triangulate/UV/transforms), generates UCX_ collision, "
        "validates against FO4 limits, and falls back to FBX when no NIF exporter "
        "is installed. Includes mesh optimisation, DDS texture conversion "
        "(NVTT/texconv), wind animation, AI rigging (RigNet), quest/NPC/item "
        "helpers, and smart presets."
    ),
    "warning": "NIF export: install PyNifly for Blender 4.x/5.x, or Niftools v0.1.1 for Blender 3.6 LTS",
    "doc_url": "https://github.com/POINTYTHRUNDRA654/Blender-add-on",
    "category": "Import-Export",
}

import bpy
import importlib
import sys

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
        # Remove any partially-initialised entry from sys.modules so that a
        # subsequent retry (e.g. Blender 5 extension reload) performs a fresh
        # import rather than returning the stale, incomplete module object.
        sys.modules.pop(full, None)
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
torch_path_manager = _try_import("torch_path_manager")

# tool_installers is not registered automatically but may be used during
# registration-time dependency checks.  Import it here so the name exists.
# we don't add it to `modules` because it has no register()/unregister().
tool_installers = _try_import("tool_installers")

# External tool integration helpers
ue_importer_helpers = _try_import("ue_importer_helpers")
umodel_tools_helpers = _try_import("umodel_tools_helpers")
umodel_helpers = _try_import("umodel_helpers")
unity_fbx_importer_helpers = _try_import("unity_fbx_importer_helpers")
asset_studio_helpers = _try_import("asset_studio_helpers")
asset_ripper_helpers = _try_import("asset_ripper_helpers")

# Game asset browser helpers
fo4_game_assets = _try_import("fo4_game_assets")
unity_game_assets = _try_import("unity_game_assets")
unreal_game_assets = _try_import("unreal_game_assets")

# Extended / optional helpers added by the full-file merge
post_processing_helpers = _try_import("post_processing_helpers")
fo4_material_browser = _try_import("fo4_material_browser")
fo4_scene_diagnostics = _try_import("fo4_scene_diagnostics")
fo4_reference_helpers = _try_import("fo4_reference_helpers")
papyrus_helpers = _try_import("papyrus_helpers")
fo4_physics_helpers = _try_import("fo4_physics_helpers")
mod_packaging_helpers = _try_import("mod_packaging_helpers")
addon_updater = _try_import("addon_updater")
native_nif_writer = _try_import("native_nif_writer")

# Asset library browser (registers PropertyGroups, UIList, and operators)
asset_library = _try_import("asset_library")


# core modules that are safe to import and register unconditionally.
# a few of the optional/external helpers are only added lazily; any module
# that failed to import (due to missing APIs in an untested Blender release)
# will be replaced with None by the `_try_import` helper above.  We strip
# those out here so the registration loop can proceed without crashing.
def _filter(mod):
    return mod is not None


modules = list(
    filter(
        _filter,
        [
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
            torch_path_manager,
            shap_e_helpers,
            point_e_helpers,
            advisor_helpers,
            knowledge_helpers,
            # external integrations — register by default so their buttons/operators
            # are available without a separate manual load step; any missing module is
            # filtered out by _filter to avoid crashes on platforms without the tools.
            ue_importer_helpers,
            umodel_tools_helpers,
            unity_fbx_importer_helpers,
            asset_studio_helpers,
            asset_ripper_helpers,
            tool_installers,
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
            post_processing_helpers,
            fo4_material_browser,
            fo4_scene_diagnostics,
            fo4_reference_helpers,
            papyrus_helpers,
            fo4_physics_helpers,
            mod_packaging_helpers,
            addon_updater,
            asset_library,
        ],
    )
)


def register():
    """Register all add-on classes and handlers"""
    # ── Step 1: register modules so Blender classes / preferences exist ──────
    # Check Blender version and show compatibility info
    blender_version = bpy.app.version
    version_string = f"{blender_version[0]}.{blender_version[1]}.{blender_version[2]}"

    print(f"Fallout 4 Tutorial Helper - Initializing for Blender {version_string}")
    # show recent development notes to help recall recent changes
    try:
        notes_path = bpy.path.abspath("//DEVELOPMENT_NOTES.md")
        # if running from unpacked directory use workspace file as fallback
        import os

        if not os.path.isfile(notes_path):
            notes_path = os.path.join(os.path.dirname(__file__), "DEVELOPMENT_NOTES.md")
        if os.path.isfile(notes_path):
            with open(notes_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            # print last 20 non-empty lines
            print("--- recent dev notes ---")
            for ln in lines[-40:]:
                if ln.strip():
                    print(ln.rstrip())
            print("------------------------")
    except Exception as e:
        print(f"Could not read DEVELOPMENT_NOTES.md: {e}")

    # Register all modules, but continue even if one fails so the
    # user can see the error in the console and report it.
    for module in modules:
        try:
            module.register()
        except Exception as e:  # pragma: no cover
            name = getattr(module, "__name__", str(module))
            print(f"⚠ Error registering module {name}: {e}")
            import traceback

            traceback.print_exc()

    # ── Step 2: restore persisted sys.path entries ───────────────────────────
    # Runs AFTER module registration so get_preferences() works.
    # This ensures PyTorch and any other --target-installed packages are
    # importable every session without user intervention.
    try:
        if preferences:
            restored = preferences.restore_extra_python_paths()
            if restored:
                print(f"✓ Restored {len(restored)} extra Python path(s) from preferences")
    except Exception as e:
        print(f"Could not restore extra Python paths: {e}")

    # ── Step 3: auto-detect PyTorch from well-known short paths ──────────────
    # Supplements Step 2: catches installs that pre-date the path-persistence
    # feature or were installed by external tools.
    try:
        if torch_path_manager:
            existing_torch = (
                torch_path_manager.TorchPathManager.find_existing_torch_install()
            )
            if existing_torch:
                torch_path_manager.TorchPathManager.add_torch_to_path(existing_torch)
                print(f"✓ PyTorch found and loaded from: {existing_torch}")
    except Exception as e:
        print(f"PyTorch auto-detection skipped: {e}")

    # ── Step 4: auto-discover installed CLI tools and wire up preferences ─────
    # If ffmpeg / nvcompress / texconv are present in the tools folder but the
    # preference paths are blank, fill them in automatically.  This means a
    # fresh Blender install will pick up tools that were already downloaded.
    try:
        if tool_installers:
            tool_installers.auto_configure_preferences()
    except Exception as e:
        print(f"Tool auto-discovery skipped: {e}")

    # ── Step 5: auto-download UModel if missing and auto-install is enabled ───
    # Runs only when the user has 'Auto-install missing tools' turned on and
    # UModel has not been successfully installed before (flag is cleared on
    # startup if the saved path is gone, allowing re-download).
    try:
        _prefs = preferences.get_preferences() if preferences else None
        if _prefs and _prefs.auto_install_tools and not _prefs.umodel_install_attempted:
            if umodel_helpers:
                ready, _ = umodel_helpers.status()
                if not ready:
                    print("UModel not found — attempting auto-download...")
                    ok, msg = umodel_helpers.download_latest()
                    if ok:
                        print(f"✓ UModel auto-downloaded: {msg}")
                    else:
                        print(f"UModel auto-download skipped: {msg}")
    except Exception as e:
        print(f"UModel auto-download skipped: {e}")

    # Start advisor auto-monitor (opt-out in preferences)
    # DISABLED: Causes severe performance issues during startup
    # Users can manually enable monitoring if needed
    # try:
    #     advisor_helpers.start_auto_monitor()
    # except Exception as e:
    #     print(f"Advisor auto-monitor failed to start: {e}")

    # Initialize the tutorial system
    try:
        if tutorial_system:
            tutorial_system.initialize_tutorials()
    except Exception as e:
        print(f"⚠ Could not initialize tutorials: {e}")

    # Check for core Python dependencies — install automatically if missing.
    # DISABLED: Auto-installation causes severe performance issues during startup
    # Users should use the "Install Core Dependencies" button in the Setup panel instead
    # import importlib.util as _ilu
    # _core_packages = {
    #     "PIL": "Pillow",
    #     "numpy": "numpy",
    #     "requests": "requests",
    #     "trimesh": "trimesh",
    #     "PyPDF2": "PyPDF2",
    # }
    # missing = {mod: pip for mod, pip in _core_packages.items() if _ilu.find_spec(mod) is None}
    # if missing:
    #     import sys as _sys
    #     py_ver = f"{_sys.version_info.major}.{_sys.version_info.minor}"
    #     missing_desc = ", ".join(f"{pip} (import {mod})" for mod, pip in missing.items())
    #     print(f"⚠ Missing Python packages: {missing_desc}")
    #     print(f"  Python {py_ver} — attempting version-aware automatic installation …")
    #     if tool_installers:
    #         try:
    #             ok, msg = tool_installers.install_python_requirements(include_optional=False)
    #         except Exception as e:
    #             ok, msg = False, f"installation routine threw: {e}"
    #     else:
    #         ok, msg = False, "tool_installers module unavailable"
    #
    #     if ok:
    #         print(f"✓ {msg}")
    #     else:
    #         print(f"  Auto-install failed: {msg}")
    #         print("  Use the 'Install Core Dependencies' button in the Setup & Status panel.")
    # else:
    #     print("✓ All core Python dependencies present")

    print(
        f"✓ Fallout 4 Tutorial Helper registered successfully (Blender {version_string})"
    )

    # schedule a quick environment check once Blender is ready
    # DISABLED: This causes severe performance issues during startup
    # The post-register callback does too much heavy work (checking tools,
    # downloading helpers, auto-installing packages, etc.) which causes
    # Blender to freeze and generate excessive autosaves
    # Users should manually install dependencies via the Setup panel instead
    # try:
    #     def _post_register():
    #         try:
    #             bpy.ops.fo4.check_kb_tools()
    #             # ... (all the other heavy operations)
    #         except Exception:
    #             pass
    #         return None
    #     bpy.app.timers.register(_post_register, first_interval=0.1)
    # except Exception as e:
    #     print(f"Post-register environment check failed: {e}")

    # Show version-specific notes if needed.
    if blender_version < (2, 90, 0):
        print(
            "  ⚠ Blender older than 2.90 detected.  The add-on requires at least "
            "Blender 2.90.  Please upgrade to Blender 3.6 LTS for best results."
        )
    elif blender_version < (3, 0, 0):
        print(
            "  Note: Blender 2.9x detected.  Most features work, but Blender 3.6 LTS "
            "is recommended for NIF export (Niftools v0.1.1 targets 2.8–3.6)."
        )
    elif blender_version < (4, 0, 0):
        # 3.x is the prime target range for direct NIF export.
        print(
            "  ✓ Blender 3.x – prime NIF export range.  Install Niftools v0.1.1 to "
            "export .nif files directly.  Blender 3.6 LTS is strongly recommended."
        )
    elif blender_version < (4, 1, 0):
        print(
            "  Note: Blender 4.0 detected.\n"
            "  • NIF export: Niftools v0.1.1 targets Blender ≤3.6 – use the FBX "
            "fallback and convert with Cathedral Assets Optimizer.\n"
            "  • All other features (mesh, collision, textures, animation) work normally."
        )
    elif blender_version < (5, 0, 0):
        # 4.1–4.x: use_auto_smooth removed; handled automatically.
        print(
            f"  Note: Blender {blender_version[0]}.{blender_version[1]} detected.\n"
            "  • NIF export: use the FBX fallback + Cathedral Assets Optimizer "
            "(Niftools v0.1.1 requires Blender ≤3.6).\n"
            "  • Shade-smooth-by-angle replaces the old Auto Smooth checkbox "
            "– the add-on handles this automatically.\n"
            "  • All other features work normally.  Please report any issues."
        )
    else:
        # Blender 5.0+: vertex_colors removed (color_attributes used instead),
        # use_auto_smooth long gone.  All mesh/texture/animation features work.
        print(
            f"  Note: Blender {blender_version[0]}.{blender_version[1]} detected.\n"
            "  • NIF export: use the FBX fallback + Cathedral Assets Optimizer "
            "(Niftools v0.1.1 requires Blender ≤3.6).\n"
            "  • All other features work normally on Blender 5.x.\n"
            "  • Please report any issues at the GitHub repository."
        )


def unregister():
    """Unregister all add-on classes and handlers"""
    try:
        if advisor_helpers:
            advisor_helpers.stop_auto_monitor()
    except Exception:
        pass
    for module in reversed(modules):
        try:
            module.unregister()
        except Exception as e:  # pragma: no cover
            name = getattr(module, "__name__", str(module))
            print(f"⚠ Error unregistering module {name}: {e}")
            import traceback

            traceback.print_exc()

    print("Fallout 4 Tutorial Helper unregistered")


if __name__ == "__main__":
    register()
