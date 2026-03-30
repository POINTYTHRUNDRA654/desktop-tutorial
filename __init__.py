"""
Blender Fallout 4 Tutorial Add-on
A comprehensive tutorial and helper system for creating Fallout 4 mods in Blender
"""

bl_info = {
    "name": "Fallout 4 Mod Assistant",
    "author": "Tutorial Team",
    "version": (5, 1, 0),
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

# Startup/registration helpers live in startup_helpers.py so this file stays
# thin.  Import them here so the rest of this module can use the same names.
from .startup_helpers import (
    on_load_post as _on_load_post,
    is_operator_registered as _is_operator_registered,
    ensure_tutorial_operators as _ensure_tutorial_operators,
    ensure_setup_operators as _ensure_setup_operators,
    deferred_startup as _deferred_startup,
)

# helper for resilient imports – some modules may fail under untested Blender
# releases (e.g. Blender 5.x during early testing).  We log failures but
# allow the addon to initialize so users can still see the error message and
# report it.


def _try_import(name: str):
    """Attempt to import a submodule of this package by name.

    Returns the module object on success or None on failure.  A warning is
    printed to the console so testers know which component raised an exception.

    When the module is already present in ``sys.modules`` (e.g. after an
    extension reload via F8 or enable/disable cycle) we call
    ``importlib.reload()`` so that the class objects used by Blender's type
    registry are always up-to-date.  Without the reload, Blender may hold a
    reference to the *old* class object and fail to find the operators,
    causing the "no active buttons" symptom.
    Do NOT remove this reload - it is the permanent root-cause fix for the
    extension-reload / stale-sys.modules scenario (DEVELOPMENT_NOTES.md).
    """
    full = f"{__package__}.{name}"
    try:
        if full in sys.modules:
            try:
                return importlib.reload(sys.modules[full])
            except Exception:
                # Reload failed (e.g. circular import during extension reload).
                # Fall through to a fresh import_module() attempt.
                sys.modules.pop(full, None)
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
fo4_physics_helpers = _try_import("animation_helper.havakphysics")
mod_packaging_helpers = _try_import("mod_packaging_helpers")
addon_updater = _try_import("addon_updater")
native_nif_writer = _try_import("native_nif_writer")

# Asset library browser (registers PropertyGroups, UIList, and operators)
asset_library = _try_import("asset_library")

# Minimal module containing the four tutorial/welcome operators that are
# referenced unconditionally in FO4_PT_MainPanel.  Registering them before
# the large operators.py bundle ensures they are always available in the UI
# even if operators.py fails to load on a particular Blender build.
tutorial_operators = _try_import("tutorial_operators")

# Minimal module containing the three setup / environment operators that are
# referenced in FO4_PT_SetupPanel (ui_panels.py).  Registering them before
# operators.py mirrors the tutorial_operators.py pattern and guarantees that
# "Install Core Dependencies", "Environment Check", and "Restart Blender"
# always appear as real clickable buttons, not "(loading...)" fallback labels.
# See DEVELOPMENT_NOTES.md - *RECURRING BUG #1* - before removing this.
setup_operators = _try_import("setup_operators")

# Diagnostics module - adds Run Diagnostics / Auto-Fix buttons to the
# Setup & Status panel.  Registered before operators so the buttons are
# always available even if the large operators.py bundle fails to load.
addon_diagnostics = _try_import("addon_diagnostics")


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
            # external integrations - register by default so their buttons/operators
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
            # ── CRITICAL: tutorial_operators and setup_operators MUST be here, BEFORE operators ──
            # Removing or reordering these lines is the #1 cause of the
            # "no activation buttons" bug. See DEVELOPMENT_NOTES.md.
            tutorial_operators,
            # setup_operators registers the three Setup & Status panel buttons
            # (Install Core Dependencies, Environment Check, Restart Blender)
            # before operators.py so they always appear as real buttons even
            # if the larger operators.py bundle fails to load on a particular build.
            setup_operators,
            addon_diagnostics,
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

    print(f"Fallout 4 Mod Assistant - Initializing for Blender {version_string}")

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

    # ── Safety net: ensure the 4 critical tutorial operators are registered ──
    # Must run AFTER the modules loop so tutorial_operators.register() has had
    # its chance.  If the operators are still absent (dual-install conflict,
    # stale sys.modules, etc.) this attempts a direct re-registration.
    # See DEVELOPMENT_NOTES.md - RECURRING BUG #1 - before removing this.
    _ensure_tutorial_operators()
    _ensure_setup_operators()
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

    # ── Step 2b: register load_post handler to restore scene paths from prefs ─
    # This ensures game-asset path settings survive opening a new .blend file or
    # restarting Blender, by re-populating scene properties from addon preferences.
    try:
        if _on_load_post not in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.append(_on_load_post)
        # Also fire for the factory startup file (default new file on fresh start)
        if hasattr(bpy.app.handlers, 'load_factory_startup_post'):
            if _on_load_post not in bpy.app.handlers.load_factory_startup_post:
                bpy.app.handlers.load_factory_startup_post.append(_on_load_post)
        # Run once immediately so the current session benefits straight away
        _on_load_post()
        print("✓ Scene-properties restore handler registered")
    except Exception as e:
        print(f"Could not register scene restore handler: {e}")

    # ── Step 2c: restore API keys from persistent file ────────────────────────
    # Blender stores addon preferences keyed by module name.  When the addon is
    # renamed (fallout4_tutorial_helper → blender_game_tools) those saved values
    # are orphaned.  load_api_keys() migrates from the old name and falls back
    # to the persistent JSON file so users never lose their API keys.
    try:
        if preferences:
            preferences.load_api_keys()
    except Exception as e:
        print(f"Could not restore API keys: {e}")

    # ── Step 2d: synchronous tool auto-discovery ──────────────────────────────
    # Scan the tools folder(s) right now - before the UI first draws - so that
    # any tools already on disk (e.g. ffmpeg, nvtt, texconv in the sibling
    # tools/ folder next to the addon) are wired into preferences immediately.
    # This is pure filesystem scanning: no network I/O, no subprocess calls,
    # sub-millisecond on a local drive. Runs synchronously so the Setup panel
    # shows correct ✓/✗ status on its very first draw instead of showing ✗ for
    # 2 seconds while the deferred timer hasn't fired yet.
    try:
        if tool_installers:
            _configured = tool_installers.auto_configure_preferences()
            if _configured:
                print(f"✓ Auto-configured {len(_configured)} tool(s): "
                      f"{', '.join(_configured)}")
            else:
                print("Tool auto-discovery: no unconfigured tools found on startup")
    except Exception as e:
        print(f"Tool auto-discovery (startup) skipped: {e}")

    # ── Steps 3-5: deferred to avoid blocking Blender's UI on startup ─────────
    # PyTorch detection, tool auto-discovery, and UModel auto-download all
    # involve filesystem scanning or network I/O.  Running them synchronously
    # during register() caused a noticeable delay before the Blender UI became
    # responsive.  A 2-second deferred timer lets the UI finish initializing
    # first, then the background work runs once without freezing the interface.
    # The implementation lives in startup_helpers.deferred_startup().
    try:
        bpy.app.timers.register(_deferred_startup, first_interval=2.0)
    except Exception as e:
        # Timers unavailable (e.g., headless/CI) - run startup tasks immediately.
        _deferred_startup()
        print(f"Timers unavailable, startup tasks ran synchronously: {e}")

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

    # Check for core Python dependencies - install automatically if missing.
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
    #     print(f"  Python {py_ver} - attempting version-aware automatic installation …")
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
        f"✓ Fallout 4 Mod Assistant registered successfully (Blender {version_string})"
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

    # ── Sync Mossy Link active state onto WindowManager ───────────────────────
    # mossy_link.register() may have started the TCP server above; reflect
    # that in the WM property so the Mossy panel shows the correct status.
    try:
        if mossy_link and mossy_link.is_server_running():
            import bpy as _bpy
            _bpy.context.window_manager.mossy_link_active = True
            print("✓ Mossy Link TCP server is active")
    except Exception:
        pass


def unregister():
    """Unregister all add-on classes and handlers"""
    # Remove the load_post handler that restores scene properties from prefs
    try:
        if _on_load_post in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.remove(_on_load_post)
        if hasattr(bpy.app.handlers, 'load_factory_startup_post'):
            if _on_load_post in bpy.app.handlers.load_factory_startup_post:
                bpy.app.handlers.load_factory_startup_post.remove(_on_load_post)
    except Exception:
        pass
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
