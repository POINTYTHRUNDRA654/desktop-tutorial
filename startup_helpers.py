"""
startup_helpers.py
==================
Startup and registration helpers extracted from ``__init__.py``.

Keeping this logic here rather than in ``__init__.py`` means the init file
stays thin (imports + module list + register/unregister) while the real work
lives in a single, named module.

Contents
--------
on_load_post              — ``@persistent`` handler that restores scene props
is_operator_registered    — Blender-5-safe operator presence check
ensure_tutorial_operators — safety-net re-registration for tutorial operators
ensure_setup_operators    — safety-net re-registration for setup operators
deferred_startup          — function registered with bpy.app.timers 2 s after
                            load to handle tool discovery, UModel download, and
                            the Mossy bridge check without blocking the UI
"""

import bpy


# ---------------------------------------------------------------------------
# Scene-property restore handler
# ---------------------------------------------------------------------------

@bpy.app.handlers.persistent
def on_load_post(*args):
    """Restore path preferences into all scenes' properties after every file load.

    Blender resets scene properties to their defaults when a new or different
    .blend file is opened.  By copying the globally-saved addon-preference values
    back into every scene here, users don't have to re-enter their game-asset
    paths every time they start Blender or open a fresh file.

    FIX for Blender 5.0: Wrapped in try/except to handle '_RestrictData' object
    access restrictions gracefully.
    """
    try:
        from . import preferences as _prefs
        if _prefs and hasattr(bpy.data, 'scenes'):
            scenes = getattr(bpy.data, 'scenes', None)
            if scenes:
                for scene in scenes:
                    try:
                        _prefs.restore_scene_props_from_prefs(scene)
                    except Exception:
                        pass
    except Exception:
        pass

    # Restore asset-library paths from their own JSON config file,
    # then immediately re-populate the asset list for every scene so users
    # never have to click "Scan Asset Library" again after opening a project.
    try:
        from . import asset_library as _al
        if _al and hasattr(bpy.data, 'scenes'):
            scenes = getattr(bpy.data, 'scenes', None)
            if scenes:
                for scene in scenes:
                    try:
                        _al.load_asset_paths(scene)
                        _al.auto_scan_for_scene(scene)
                    except Exception:
                        pass
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Operator registration check (Blender-5-safe)
# ---------------------------------------------------------------------------

def is_operator_registered(cls_name: str, bl_idname: str) -> bool:
    """Check whether an operator is actually registered and callable.

    Blender 5.x with the extension system has a known issue where
    ``hasattr(bpy.types, cls_name)`` returns ``False`` even after
    ``bpy.utils.register_class()`` succeeds.  The operator IS registered
    in Blender's internal RNA type map, but the ``bpy.types`` Python
    attribute lookup misses it under the extension namespace.

    This function adds a secondary check via ``bpy.ops`` so that the
    ``ensure_*`` safety nets don't fire spurious warnings every startup.

    Parameters
    ----------
    cls_name : str
        Python class name, e.g. ``"FO4_OT_ShowDetailedSetup"``.
    bl_idname : str
        Blender operator id, e.g. ``"fo4.show_detailed_setup"``.
    """
    # Fast path - works in Blender 4.x and most Blender 5 builds
    if hasattr(bpy.types, cls_name):
        return True
    # Blender 5 extension fallback: verify via bpy.ops namespace
    try:
        prefix, name = bl_idname.split(".", 1)
        op_ns = getattr(bpy.ops, prefix, None)
        if op_ns is not None and hasattr(op_ns, name):
            return True
    except Exception:
        pass
    return False


# ---------------------------------------------------------------------------
# Safety-net re-registration helpers
# ---------------------------------------------------------------------------

def ensure_tutorial_operators():
    """Last-resort registration of the 4 critical tutorial operators.

    Called at the end of ``register()`` to ensure the welcome/tutorial buttons
    are always present in ``FO4_PT_MainPanel`` even if
    ``tutorial_operators.register()`` failed earlier (e.g. due to a dual-install
    conflict or a stale ``sys.modules`` entry).

    See DEVELOPMENT_NOTES.md - *RECURRING BUG #1* - for full context.
    Do NOT remove this function or its call at the end of ``register()``.
    """
    from . import tutorial_operators as _tut
    if _tut is None:
        return

    # Map class names → bl_idnames for the Blender 5 extension fallback check.
    required_operators = {
        "FO4_OT_ShowDetailedSetup": "fo4.show_detailed_setup",
        "FO4_OT_StartTutorial":     "fo4.start_tutorial",
        "FO4_OT_ShowHelp":          "fo4.show_help",
        "FO4_OT_ShowCredits":       "fo4.show_credits",
    }
    missing = [
        n for n, idname in required_operators.items()
        if not is_operator_registered(n, idname)
    ]
    if not missing:
        print("✓ Tutorial operators confirmed (tutorial panel buttons ready)")
        return  # All operators already registered - nothing to do.

    print(
        f"⚠ ensure_tutorial_operators: {missing} not reachable; "
        "attempting re-registration…"
    )
    # Try re-registering the whole module first so class state is consistent.
    try:
        _tut.unregister()
    except Exception:
        pass
    try:
        _tut.register()
        # If that succeeded, we're done.
        still_missing = [
            n for n, idname in required_operators.items()
            if not is_operator_registered(n, idname)
        ]
        if not still_missing:
            print("  ✓ tutorial_operators re-registered successfully")
            return
    except Exception as e:
        print(f"  ⚠ Module re-registration failed: {e}")

    # Fall back: register each missing class individually.
    for cls_name, bl_idname in required_operators.items():
        if is_operator_registered(cls_name, bl_idname):
            continue
        cls = getattr(_tut, cls_name, None)
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


def ensure_setup_operators():
    """Last-resort registration of the 3 critical setup operators.

    Called at the end of ``register()`` and inside ``deferred_startup()``
    to ensure the Setup & Status panel buttons are always present as real
    clickable buttons, not "(loading...)" fallback labels.

    Mirrors ``ensure_tutorial_operators()`` - see DEVELOPMENT_NOTES.md
    (*RECURRING BUG #1*) for full context.
    Do NOT remove this function or its call at the end of ``register()``.
    """
    from . import setup_operators as _setup
    if _setup is None:
        print("  ⚠ setup_operators is None; cannot register")
        return

    required_operators = {
        "FO4_OT_InstallPythonDeps": "fo4.install_python_deps",
        "FO4_OT_SelfTest":          "fo4.self_test",
        "FO4_OT_ReloadAddon":       "fo4.reload_addon",
    }
    missing = [
        n for n, idname in required_operators.items()
        if not is_operator_registered(n, idname)
    ]
    if not missing:
        print("✓ Setup operators confirmed (Setup panel buttons ready)")
        return

    print(
        f"⚠ ensure_setup_operators: {missing} not reachable; "
        "attempting re-registration…"
    )
    try:
        _setup.unregister()
        print("  ✓ unregister() succeeded")
    except Exception as e:
        print(f"  ⚠ unregister() failed: {e}")
    try:
        _setup.register()
        print("  ✓ register() succeeded")
        still_missing = [
            n for n, idname in required_operators.items()
            if not is_operator_registered(n, idname)
        ]
        if not still_missing:
            print("  ✓ setup_operators re-registered successfully")
            return
        print(f"  Missing operators after re-register: {still_missing}")
    except Exception as e:
        print(f"  ⚠ Module re-registration failed: {e}")

    # Fall back: register each missing class individually.
    for cls_name, bl_idname in required_operators.items():
        if is_operator_registered(cls_name, bl_idname):
            print(f"  ✓ {cls_name} already reachable")
            continue
        cls = getattr(_setup, cls_name, None)
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


# ---------------------------------------------------------------------------
# Deferred startup tasks
# ---------------------------------------------------------------------------

def deferred_startup():
    """Run tool-discovery, UModel download, and Mossy-bridge check ~2 s after load.

    Registered with ``bpy.app.timers`` in ``register()`` so these tasks run
    after Blender's UI is ready rather than blocking it during addon startup.
    All potentially slow work (filesystem scanning, network I/O) happens here.

    Returns ``None`` so the timer does not reschedule.
    """
    # ── Step 4: auto-discover installed CLI tools and wire up preferences ─────
    # If ffmpeg / nvcompress / texconv are present in the tools folder but
    # the preference paths are blank, fill them in automatically.
    try:
        from . import tool_installers as _ti
        if _ti:
            _ti.auto_configure_preferences()
    except Exception as e:
        print(f"Tool auto-discovery skipped: {e}")

    # ── Step 5: auto-download UModel if missing and auto-install enabled ──────
    # Runs only when the user has 'Auto-install missing tools' turned on and
    # UModel has not been successfully installed before.
    try:
        from . import preferences as _prefs
        from . import umodel_helpers as _uh
        _p = _prefs.get_preferences() if _prefs else None
        if _p and _p.auto_install_tools and not _p.umodel_install_attempted:
            if _uh:
                ready, _ = _uh.status()
                if not ready:
                    print("UModel not found - attempting auto-download...")
                    ok, msg = _uh.download_latest()
                    if ok:
                        print(f"✓ UModel auto-downloaded: {msg}")
                    else:
                        print(f"UModel auto-download skipped: {msg}")
                        # Mark as attempted so we don't retry every startup.
                        # UModel requires manual download from gildor.org;
                        # repeatedly trying on every Blender launch spams the
                        # console.  The user can reset this flag via Preferences
                        # if they want to retry after visiting the download page.
                        # (DEVELOPMENT_NOTES.md - umodel_install_attempted fix)
                        try:
                            _p.umodel_install_attempted = True
                        except AttributeError as flag_err:
                            print(f"UModel: could not set umodel_install_attempted: {flag_err}")
    except Exception as e:
        print(f"UModel auto-download skipped: {e}")

    # ── Step 6: deferred tutorial-operator safety check ──────────────────────
    # A 2-second window after startup is enough time for other extensions
    # (e.g. Fab, BAC) to complete their own registrations.  Re-run the
    # ensure_tutorial_operators() safety net here so that if any of those
    # extensions inadvertently displaced our classes (or if the initial
    # registration ran before Blender's type system was fully ready) the
    # welcome/tutorial buttons will still appear correctly.
    try:
        ensure_tutorial_operators()
    except Exception as e:
        print(f"⚠ Deferred tutorial-operator check failed: {e}")
    try:
        ensure_setup_operators()
    except Exception as e:
        print(f"⚠ Deferred setup-operator check failed: {e}")

    # ── Step 6b: refresh AI-tool availability caches ─────────────────────────
    # hunyuan3d_helpers, hymotion_helpers, and zoedepth_helpers intentionally
    # skip their availability check during register() because torch_custom_path
    # has not yet been added to sys.path at that point.  Now that all paths are
    # in place, run a lightweight re-check so the UI panels show correct status
    # immediately after startup without the user having to click "Check Status".
    # These calls are fast (filesystem checks only; no network, no model loads).
    try:
        from . import hunyuan3d_helpers as _h3d
        if _h3d:
            _h3d.check_hunyuan3d_availability()
            if _h3d.HUNYUAN3D_AVAILABLE:
                print("✓ Hunyuan3D-2 is available")
    except Exception as _e:
        print(f"Hunyuan3D-2 deferred check skipped: {_e}")

    try:
        from . import hymotion_helpers as _hym
        if _hym:
            _hym.check_hymotion_availability()
            if _hym.HYMOTION_AVAILABLE:
                print("✓ HY-Motion-1.0 is available")
    except Exception as _e:
        print(f"HY-Motion-1.0 deferred check skipped: {_e}")

    try:
        from . import zoedepth_helpers as _zdh
        if _zdh:
            # Run a full availability check now that torch paths are ready,
            # so the UI panel shows the correct status immediately and the
            # diagnostics report does not show "status not yet checked".
            avail, msg = _zdh.check_zoedepth_availability()
            if avail:
                print("✓ ZoeDepth is available")
            else:
                print(f"  ZoeDepth not available: {msg}")
    except Exception as _e:
        print(f"ZoeDepth deferred check skipped: {_e}")

    # Populate the RigNet status cache so diagnostics does not report
    # "cache invalidated" when the user runs a check before the RigNet
    # panel has had a chance to draw (which is what triggers the probe
    # under normal operation).
    try:
        from . import ui_panels as _ui
        if _ui and hasattr(_ui, '_cached_rignet_status'):
            rignet_status, _libigl_status = _ui._cached_rignet_status()
            if rignet_status[0]:
                print("✓ RigNet is available")
    except Exception as _e:
        print(f"RigNet deferred check skipped: {_e}")

    # ── Step 7: auto-check Mossy bridge (safety net) ─────────────────────────
    # The background torch probe already checks Mossy at probe time, but
    # Mossy may start *after* Blender (or after the probe already ran and
    # cached a local-torch failure).  Run a second check 2 s into startup
    # so the cached failure gets replaced before the user notices it.
    #
    # Runs in a daemon thread so the HTTP call never blocks the UI.
    def _auto_check_mossy_bridge():
        try:
            from . import mossy_link as _ml
            from . import ui_panels as _ui
            bridge_ok, bridge_msg = _ml.check_bridge(timeout=1.0)
            if bridge_ok:
                def _apply(msg=bridge_msg):
                    try:
                        bpy.context.window_manager["mossy_bridge_status"] = msg
                        # If the probe already cached a local-torch failure,
                        # patch it to success so the panel no longer shows
                        # the WinError 1114 message.
                        cached = _ui._torch_status_cache
                        if cached is not None and cached[0] is False:
                            _ui._torch_status_cache = (True, "via Mossy bridge")
                        # Trigger a redraw to surface the updated status.
                        for _win in bpy.context.window_manager.windows:
                            for _area in _win.screen.areas:
                                if _area.type == 'VIEW_3D':
                                    _area.tag_redraw()
                    except Exception:
                        pass
                bpy.app.timers.register(
                    _apply, first_interval=0.0, persistent=False
                )
        except Exception:
            pass

    import threading as _thr
    _thr.Thread(target=_auto_check_mossy_bridge, daemon=True).start()

    return None  # Do not reschedule
