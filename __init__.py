"""
Blender Fallout 4 Tutorial Add-on
A comprehensive tutorial and helper system for creating Fallout 4 mods in Blender
"""

bl_info = {
    "name": "Mossy Fallout 4 Blender Add-on",
    "author": "Mossy Industries",
    "version": (5, 1, 0),
    "blender": (2, 90, 0),  # Compatible with Blender 2.90+ through 5.x
    "location": "View3D > Sidebar > Fallout 4",
    "description": (
        "Professional Fallout 4 modding assistant by Mossy Industries. "
        "FREE local AI powered by Mossy desktop app. "
        "Exports NIF (BSTriShape) via PyNifly (Blender 4.x/5.x) or Niftools v0.1.1 (Blender 3.6 LTS), "
        "auto-preps meshes (triangulate/UV/transforms), generates UCX_ collision, "
        "validates against FO4 limits, and falls back to FBX when no NIF exporter "
        "is installed. Includes mesh optimization, DDS texture conversion "
        "(NVTT/texconv), wind animation, AI rigging (RigNet), quest/NPC/item "
        "helpers, and smart presets. No paid subscriptions or API keys required. "
        "A Mossy Industries product."
    ),
    "warning": "NIF export: install PyNifly for Blender 4.x/5.x, or Niftools v0.1.1 for Blender 3.6 LTS",
    "doc_url": "https://github.com/POINTYTHRUNDRA654/Blender-add-on",
    "category": "Import-Export",
}

import importlib
import os
import sys

try:
    import bpy  # bpy is only available inside Blender
except ImportError:
    bpy = None  # type: ignore[assignment]

# Startup/registration helpers live in startup_helpers.py so this file stays
# thin.  Import them here so the rest of this module can use the same names.
try:
    from .startup_helpers import (
        on_load_post as _on_load_post,
        is_operator_registered as _is_operator_registered,
        ensure_tutorial_operators as _ensure_tutorial_operators,
        ensure_setup_operators as _ensure_setup_operators,
        deferred_startup as _deferred_startup,
    )
except ImportError:
    # Fallback stubs used in non-Blender environments (e.g. pytest, linters).
    # startup_helpers.py itself imports bpy, so the relative import above
    # fails when bpy is unavailable.  The register() / unregister() functions
    # guard every use of these helpers, so None is safe here.
    _on_load_post = None  # type: ignore[assignment]
    _is_operator_registered = None  # type: ignore[assignment]
    _ensure_tutorial_operators = None  # type: ignore[assignment]
    _ensure_setup_operators = None  # type: ignore[assignment]
    _deferred_startup = None  # type: ignore[assignment]

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
    # __package__ is None or "" when this module is imported outside a Blender
    # extension context (e.g. pytest). In that case there is no package to
    # resolve relative imports against, so return None silently instead of
    # raising a TypeError and printing a noisy traceback.
    if not __package__:
        return None
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
content_panels = _try_import("content_panels")
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
texture_enhance_helpers = _try_import("texture_enhance_helpers")
gpu_manager = _try_import("gpu_manager")
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
dsf_importer = _try_import("dsf_importer")

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
advanced_realism_helpers = _try_import("advanced_realism_helpers")
bgsm_helpers = _try_import("bgsm_helpers")
fo4_reference_helpers = _try_import("fo4_reference_helpers")
papyrus_helpers = _try_import("papyrus_helpers")
fo4_physics_helpers = _try_import("animation_helper.havakphysics")
mod_packaging_helpers = _try_import("mod_packaging_helpers")
addon_updater = _try_import("addon_updater")
native_nif_writer = _try_import("native_nif_writer")

# Shape key → .tri morph export and navmesh validation
tri_export_helpers = _try_import("tri_export_helpers")
navmesh_helpers = _try_import("navmesh_helpers")

# Asset library browser (registers PropertyGroups, UIList, and operators)
asset_library = _try_import("asset_library")

# One-click FO4 pipeline operators (static mesh, weapon, flora, navmesh, TRI morphs, textures, full mod)
fo4_pipeline = _try_import("fo4_pipeline")

# CK cell round-trip pipeline (import cell NIFs → edit in Blender → export back to CK)
fo4_ck_cell = _try_import("fo4_ck_cell")

# UE5 (and UE4) asset → FO4 NIF converter
fo4_ue5_converter = _try_import("fo4_ue5_converter")
fo4_unity_converter = _try_import("fo4_unity_converter")

# Custom creature/flora rig builder + carnivorous plant
fo4_creature_rig = _try_import("fo4_creature_rig")
fo4_creature_animation = _try_import("fo4_creature_animation")
fo4_armor_animation = _try_import("fo4_armor_animation")
fo4_weapon_animation = _try_import("fo4_weapon_animation")
fo4_npc_animation = _try_import("fo4_npc_animation")
fo4_glow_effects = _try_import("fo4_glow_effects")
fo4_esp_generator = _try_import("fo4_esp_generator")
fo4_texture_generator = _try_import("fo4_texture_generator")
fo4_batch_tools = _try_import("fo4_batch_tools")
fo4_workshop_helper = _try_import("fo4_workshop_helper")
fo4_compatibility_checker = _try_import("fo4_compatibility_checker")
fo4_dialogue_editor = _try_import("fo4_dialogue_editor")
fo4_weather_interior = _try_import("fo4_weather_interior")
fo4_navmesh_generator = _try_import("fo4_navmesh_generator")

# Animation export pipeline (Blender action → HKX via ck-cmd)
fo4_animation_export = _try_import("fo4_animation_export")

# Advanced FO4 materials (translucency, parallax, glow, env map)
fo4_advanced_materials = _try_import("fo4_advanced_materials")

# LOD generator + high-to-low texture baker
fo4_lod_generator = _try_import("fo4_lod_generator")

# FO4 vanilla skeleton alignment wizard (armor / clothing weight painting)
fo4_skeleton_helpers = _try_import("fo4_skeleton_helpers")

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
install_operators = _try_import("install_operators")
ai_gen_operators  = _try_import("ai_gen_operators")


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
            # ── CRITICAL: mossy_link MUST be second (immediately after preferences). ──
            # mossy_link.register() loads the Mossy-provided PyTorch path from prefs
            # and inserts it into sys.path.  Every module that needs torch
            # (rignet_helpers, shap_e_helpers, point_e_helpers, hunyuan3d_helpers,
            # hymotion_helpers, zoedepth_helpers, ...) must register AFTER this so
            # that `import torch` and importlib.util.find_spec("torch") succeed.
            # Do NOT move mossy_link lower in this list.
            mossy_link,
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
            export_helpers,
            image_to_mesh_helpers,
            hunyuan3d_helpers,
            zoedepth_helpers,
            gradio_helpers,
            hymotion_helpers,
            nvtt_helpers,
            realesrgan_helpers,
            texture_enhance_helpers,
            gpu_manager,
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
            ai_gen_operators,
            install_operators,
            operators,
            ui_panels,
            content_panels,
            post_processing_helpers,
            fo4_material_browser,
            fo4_scene_diagnostics,
            advanced_realism_helpers,
            fo4_reference_helpers,
            papyrus_helpers,
            fo4_physics_helpers,
            mod_packaging_helpers,
            addon_updater,
            asset_library,
            fo4_pipeline,
            fo4_ck_cell,
            fo4_ue5_converter,
            fo4_unity_converter,
            fo4_creature_rig,
            fo4_creature_animation,
            fo4_armor_animation,
            fo4_weapon_animation,
            fo4_npc_animation,
            fo4_glow_effects,
            fo4_esp_generator,
            fo4_texture_generator,
            fo4_batch_tools,
            fo4_workshop_helper,
            fo4_compatibility_checker,
            fo4_dialogue_editor,
            fo4_weather_interior,
            fo4_navmesh_generator,
            fo4_animation_export,
            fo4_advanced_materials,
            fo4_lod_generator,
            fo4_skeleton_helpers,
            tri_export_helpers,
            navmesh_helpers,
            bgsm_helpers,
            dsf_importer,
        ],
    )
)


def register():
    """Register all add-on classes and handlers"""
    # ── Step 0: flush import caches and ensure user site-packages is on sys.path ─
    # pip installs trimesh, pypdf, and other packages into the user
    # site-packages directory when Blender's system site-packages is not
    # writable (the common case on Windows and many Linux installs).  Blender's
    # bundled Python does NOT add the user site directory to sys.path by
    # default, so packages installed there are invisible to importlib on every
    # fresh start — producing the [MISSING] indicators in the self-test even
    # though the packages were successfully installed in a previous session.
    #
    # _add_lib=False: we deliberately skip adding _PIP_LIB_DIR (.\lib) to
    # sys.path here.  Blender 5's extension policy checker monitors sys.path
    # changes that occur during register() and raises a "Policy violation with
    # sys.path: .\lib" warning (visible as the caution triangle in the add-on
    # list).  deferred_startup() adds _PIP_LIB_DIR two seconds after load —
    # outside the register() window — so packages are still available while
    # the warning is silenced.
    try:
        if tool_installers and hasattr(tool_installers, "_refresh_import_paths"):
            tool_installers._refresh_import_paths(_add_lib=False)
    except Exception as _e:
        # Non-fatal: the addon will still load, but packages installed into the
        # user site-packages directory (trimesh, pypdf, etc.) may not be visible
        # until the user restarts Blender a second time or adds the path manually.
        print(
            f"⚠ Could not refresh import paths at startup: {_e}\n"
            "  trimesh / pypdf may show [MISSING] in the self-test even if installed.\n"
            "  Try clicking 'Install Core Dependencies' again to work around this."
        )

    # ── Step 0a: ML package migration deferred to background ─────────────────
    # _migrate_ml_packages() reads pip RECORD files — filesystem I/O.
    # Moved to deferred_startup() background thread to keep register() fast.

    # ── Step 0b: purge stale sys.modules entries from a prior addon namespace ─
    # When the addon transitions between naming conventions (e.g. legacy
    # 'blender_game_tools' ↔ extension 'bl_ext.blender_org.blender_game_tools'),
    # old namespace entries can persist across enable/disable cycles in the same
    # Blender session, triggering a spurious dual-install WARN in diagnostics
    # check #3.  Remove those stale entries before module registration so that
    # check #3 only fires for genuinely separate physical installs.
    try:
        _name_base = (__package__ or "").split(".")[-1]
        _own_pkg   = __package__ or ""
        _addon_dir = os.path.normcase(os.path.dirname(os.path.abspath(__file__)))
        if _name_base:
            _stale = [
                k for k, m in list(sys.modules.items())
                if (_name_base in k
                    and not (k == _own_pkg or k.startswith(_own_pkg + "."))
                    and m is not None
                    and getattr(m, "__file__", None)
                    and os.path.normcase(
                        os.path.dirname(os.path.abspath(m.__file__))
                    ) == _addon_dir)
            ]
            for k in _stale:
                sys.modules.pop(k, None)
            if _stale:
                print(f"✓ Purged {len(_stale)} stale sys.modules namespace entry(ies) "
                      "from prior install prefix")
    except Exception as _e:
        print(f"⚠ Could not purge stale namespace entries: {_e}")

    # ── Step 1: register modules so Blender classes / preferences exist ──────
    # Check Blender version and show compatibility info
    blender_version = bpy.app.version
    version_string = f"{blender_version[0]}.{blender_version[1]}.{blender_version[2]}"

    print(f"Mossy Fallout 4 Blender Add-on - Initializing for Blender {version_string}")

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

    # ── Step 2d: tool auto-discovery runs in deferred_startup() Step 4 ────────
    # Moved to deferred so register() returns immediately and Blender's
    # UI becomes responsive before any filesystem scanning happens.

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

    # Core Python package auto-install runs in deferred_startup() (2 s after load)
    # in a background daemon thread — see startup_helpers.py Step 2b.
    # This keeps register() fast while still ensuring trimesh, pypdf, scipy etc.
    # are installed automatically on first run without blocking the UI.

    print(
        f"✓ Mossy Fallout 4 Blender Add-on registered successfully (Blender {version_string})"
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

    print("Mossy Fallout 4 Blender Add-on unregistered")


if __name__ == "__main__":
    register()
