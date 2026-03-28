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
    Do NOT remove this reload — it is the permanent root-cause fix for the
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
fo4_physics_helpers = _try_import("fo4_physics_helpers")
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
# See DEVELOPMENT_NOTES.md — *RECURRING BUG #1* — before removing this.
setup_operators = _try_import("setup_operators")


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
            # ── CRITICAL: tutorial_operators and setup_operators MUST be here, BEFORE operators ──
            # Removing or reordering these lines is the #1 cause of the
            # "no activation buttons" bug. See DEVELOPMENT_NOTES.md.
            tutorial_operators,
            # setup_operators registers the three Setup & Status panel buttons
            # (Install Core Dependencies, Environment Check, Restart Blender)
            # before operators.py so they always appear as real buttons even
            # if the larger operators.py bundle fails to load on a particular build.
            setup_operators,
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


@bpy.app.handlers.persistent
def _on_load_post(*args):
    """Restore path preferences into all scenes' properties after every file load.

    Blender resets scene properties to their defaults when a new or different
    .blend file is opened.  By copying the globally-saved addon-preference values
    back into every scene here, users don't have to re-enter their game-asset paths
    every time they start Blender or open a fresh file.

    FIX for Blender 5.0: Wrapped in try/except to handle '_RestrictData' object
    access restrictions gracefully.
    """
    try:
        if preferences and hasattr(bpy.data, 'scenes'):
            scenes = getattr(bpy.data, 'scenes', None)
            if scenes:
                for scene in scenes:
                    try:
                        preferences.restore_scene_props_from_prefs(scene)
                    except Exception:
                        # Skip individual scenes that fail; don't block the rest
                        pass
    except Exception as e:
        # Silently fail rather than spam console; this is non-critical
        pass

    # Restore asset-library paths from their own JSON config file,
    # then immediately re-populate the asset list for every scene so users
    # never have to click "Scan Asset Library" again after opening a project.
    try:
        if asset_library and hasattr(bpy.data, 'scenes'):
            scenes = getattr(bpy.data, 'scenes', None)
            if scenes:
                for scene in scenes:
                    try:
                        asset_library.load_asset_paths(scene)
                        asset_library.auto_scan_for_scene(scene)
                    except Exception:
                        # Skip individual scenes that fail; don't block the rest
                        pass
    except Exception as e:
        # Silently fail rather than spam console; this is non-critical
        pass


def _ensure_tutorial_operators():
    """Last-resort registration of the 4 critical tutorial operators.

    Called at the end of ``register()`` to ensure the welcome/tutorial buttons
    are always present in ``FO4_PT_MainPanel`` even if
    ``tutorial_operators.register()`` failed earlier (e.g. due to a dual-install
    conflict or a stale ``sys.modules`` entry).

    See DEVELOPMENT_NOTES.md — *RECURRING BUG #1* — for full context.
    Do NOT remove this function or its call at the end of ``register()``.
    """
    if tutorial_operators is None:
        return

    required_operators = (
        "FO4_OT_ShowDetailedSetup",
        "FO4_OT_StartTutorial",
        "FO4_OT_ShowHelp",
        "FO4_OT_ShowCredits",
    )
    missing = [n for n in required_operators if not hasattr(bpy.types, n)]
    if not missing:
        print("✓ Tutorial operators confirmed in bpy.types (tutorial panel buttons ready)")
        return  # All operators already registered — nothing to do.

    print(
        f"⚠ _ensure_tutorial_operators: {missing} not in bpy.types; "
        "attempting re-registration…"
    )
    # Try re-registering the whole module first so class state is consistent.
    try:
        tutorial_operators.unregister()
    except Exception:
        pass
    try:
        tutorial_operators.register()
        # If that succeeded, we're done.
        still_missing = [n for n in required_operators if not hasattr(bpy.types, n)]
        if not still_missing:
            print("  ✓ tutorial_operators re-registered successfully")
            return
    except Exception as e:
        print(f"  ⚠ Module re-registration failed: {e}")

    # Fall back: register each missing class individually.
    for cls_name in required_operators:
        if hasattr(bpy.types, cls_name):
            continue
        cls = getattr(tutorial_operators, cls_name, None)
        if cls is None:
            continue
        try:
            bpy.utils.register_class(cls)
            print(f"  ✓ Registered {cls_name} directly")
        except Exception as e2:
            # A stale class object may already occupy the type name (e.g. from
            # a dual-install or a previous load that left a dangling entry).
            # Unregister whatever is there and force-register the fresh class.
            try:
                existing = getattr(bpy.types, cls_name, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
                bpy.utils.register_class(cls)
                print(f"  ✓ Registered {cls_name} (replaced stale entry)")
            except Exception as e3:
                print(f"  ⚠ Failed to register {cls_name} directly: {e3}")


def _ensure_setup_operators():
    """Last-resort registration of the 3 critical setup operators.

    Called at the end of ``register()`` and inside ``_deferred_startup()``
    to ensure the Setup & Status panel buttons are always present as real
    clickable buttons, not "(loading...)" fallback labels.

    Mirrors ``_ensure_tutorial_operators()`` — see DEVELOPMENT_NOTES.md
    (*RECURRING BUG #1*) for full context.
    Do NOT remove this function or its call at the end of ``register()``.
    """
    if setup_operators is None:
        print("  ⚠ setup_operators is None; cannot register")
        return

    required_operators = (
        "FO4_OT_InstallPythonDeps",
        "FO4_OT_SelfTest",
        "FO4_OT_ReloadAddon",
    )
    missing = [n for n in required_operators if not hasattr(bpy.types, n)]
    if not missing:
        print("✓ Setup operators confirmed in bpy.types (Setup panel buttons ready)")
        return

    print(
        f"⚠ _ensure_setup_operators: {missing} not in bpy.types; "
        "attempting re-registration…"
    )
    try:
        setup_operators.unregister()
        print("  ✓ unregister() succeeded")
    except Exception as e:
        print(f"  ⚠ unregister() failed: {e}")
    try:
        setup_operators.register()
        print("  ✓ register() succeeded")
        still_missing = [n for n in required_operators if not hasattr(bpy.types, n)]
        print(f"  Missing operators after re-register: {still_missing}")
        if not still_missing:
            print("  ✓ setup_operators re-registered successfully")
            return
    except Exception as e:
        print(f"  ⚠ Module re-registration failed: {e}")

    # Fall back: register each missing class individually.
    for cls_name in required_operators:
        if hasattr(bpy.types, cls_name):
            print(f"  ✓ {cls_name} already in bpy.types")
            continue
        cls = getattr(setup_operators, cls_name, None)
        if cls is None:
            print(f"  ⚠ {cls_name} not found in setup_operators module")
            continue
        try:
            bpy.utils.register_class(cls)
            print(f"  ✓ Registered {cls_name} directly")
        except Exception as e2:
            try:
                existing = getattr(bpy.types, cls_name, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
                bpy.utils.register_class(cls)
                print(f"  ✓ Registered {cls_name} (replaced stale entry)")
            except Exception as e3:
                print(f"  ⚠ Failed to register {cls_name} directly: {e3}")


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
    # See DEVELOPMENT_NOTES.md — RECURRING BUG #1 — before removing this.
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

    # ── Steps 3-5: deferred to avoid blocking Blender's UI on startup ─────────
    # PyTorch detection, tool auto-discovery, and UModel auto-download all
    # involve filesystem scanning or network I/O.  Running them synchronously
    # during register() caused a noticeable delay before the Blender UI became
    # responsive.  A 2-second deferred timer lets the UI finish initializing
    # first, then the background work runs once without freezing the interface.
    def _deferred_startup():
        # ── Step 3: detect PyTorch and trigger background auto-install ────────
        # try_import_torch() covers all detection paths in priority order:
        #   1. torch_custom_path saved in preferences
        #   2. Well-known short paths (D:/t, C:/t, …, ~/.blender_torch)
        #   3. A plain `import torch` (catches pip system-wide installs)
        # If torch is still absent and auto_install_pytorch is enabled, a
        # non-blocking background thread is queued to run pip install.
        # Running this here (2 s after startup) ensures detection and
        # auto-install happen at launch, not during the first Settings-panel
        # draw — which would freeze Blender's UI.
        try:
            if torch_path_manager:
                ok, msg, _ = torch_path_manager.TorchPathManager.try_import_torch()
                if ok:
                    print(f"✓ PyTorch available: {msg}")
                elif msg == "auto_install_started":
                    print("PyTorch: background install thread started — check back shortly.")
                elif msg == "auto_install_in_progress":
                    print("PyTorch: background install already in progress.")
                elif msg == "dll_init_error":
                    print(
                        "PyTorch: DLL initialisation failed (WinError 1114) — "
                        "CUDA/driver version mismatch. "
                        "See the Blender console output above for detailed fix instructions, "
                        "or open the Settings panel in the Fallout 4 N-panel."
                    )
                elif msg == "windows_path_error":
                    print(
                        "PyTorch: Windows path-length error detected. "
                        "Use the Settings panel to install to a short path (D:/t)."
                    )
                else:
                    print(f"PyTorch not available: {msg}")
        except Exception as e:
            print(f"PyTorch detection skipped: {e}")

        # ── Step 4: auto-discover installed CLI tools and wire up preferences ─
        # If ffmpeg / nvcompress / texconv are present in the tools folder but
        # the preference paths are blank, fill them in automatically.
        try:
            if tool_installers:
                tool_installers.auto_configure_preferences()
        except Exception as e:
            print(f"Tool auto-discovery skipped: {e}")

        # ── Step 5: auto-download UModel if missing and auto-install enabled ──
        # Runs only when the user has 'Auto-install missing tools' turned on and
        # UModel has not been successfully installed before.
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
                            # Mark as attempted so we don't retry every startup.
                            # UModel requires manual download from gildor.org;
                            # repeatedly trying on every Blender launch spams the
                            # console.  The user can reset this flag via Preferences
                            # if they want to retry after visiting the download page.
                            # (DEVELOPMENT_NOTES.md — umodel_install_attempted fix)
                            try:
                                _prefs.umodel_install_attempted = True
                            except AttributeError as flag_err:
                                print(f"UModel: could not set umodel_install_attempted: {flag_err}")
        except Exception as e:
            print(f"UModel auto-download skipped: {e}")

        # ── Step 6: deferred tutorial-operator safety check ─────────────────
        # A 2-second window after startup is enough time for other extensions
        # (e.g. Fab, BAC) to complete their own registrations.  Re-run the
        # _ensure_tutorial_operators() safety net here so that if any of those
        # extensions inadvertently displaced our classes (or if the initial
        # registration ran before Blender's type system was fully ready) the
        # welcome/tutorial buttons will still appear correctly.
        try:
            _ensure_tutorial_operators()
        except Exception as e:
            print(f"⚠ Deferred tutorial-operator check failed: {e}")
        try:
            _ensure_setup_operators()
        except Exception as e:
            print(f"⚠ Deferred setup-operator check failed: {e}")

        return None  # Do not reschedule

    try:
        bpy.app.timers.register(_deferred_startup, first_interval=2.0)
    except Exception as e:
        # Timers unavailable (e.g., headless/CI) — run startup tasks immediately.
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
