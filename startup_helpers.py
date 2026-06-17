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
    All potentially slow work (filesystem scanning, network I/O, downloads)
    runs in daemon background threads so the UI stays responsive even when
    tools need to be downloaded for the first time.

    Returns ``None`` so the timer does not reschedule.
    """
    # ── Step 3: refresh import paths in background (non-blocking) ───────────────
    import threading as _th3
    def _refresh_paths_bg():
        try:
            from . import tool_installers as _ti_lib
            if _ti_lib and hasattr(_ti_lib, "_refresh_import_paths"):
                _ti_lib._refresh_import_paths()
            from . import ui_panels as _uip_lib
            if _uip_lib and hasattr(_uip_lib, "invalidate_dep_cache"):
                _uip_lib.invalidate_dep_cache()
        except Exception as _e_lib:
            print(f"Path refresh skipped: {_e_lib}")
    _th3.Thread(target=_refresh_paths_bg, daemon=True, name="MossyPathRefresh").start()


    # ── Auto-install missing core Python packages (background thread) ──────────
    # Runs 2 s after load in a daemon thread so it never blocks the UI.
    try:
        import importlib.util as _ilu
        import threading as _th_pkg

        # Lightweight pure-Python packages — safe to pip-install directly.
        # Keep this list small: anything large or requiring compilation goes
        # through Mossy instead (see _try_mossy_optional below).
        _CORE_PACKAGES = {
            "PIL":      "Pillow",
            "numpy":    "numpy",
            "requests": "requests",
            "pypdf":    "pypdf",
            # scipy, trimesh, and libigl moved to Mossy-managed installs —
            # they are large / have C++ deps and caused startup lag when
            # pip tried to build them inside Blender's bundled Python.
        }
        # Use a cache file so we skip find_spec calls after first successful install
        import json as _json, pathlib as _pl
        _cache_file = _pl.Path(bpy.utils.user_resource("CONFIG")) / "fo4_pkg_cache.json"
        _cached_ok = set()
        try:
            if _cache_file.exists():
                _cached_ok = set(_json.loads(_cache_file.read_text()).get("installed", []))
        except Exception:
            pass
        _missing_pkgs = [pip for mod, pip in _CORE_PACKAGES.items()
                         if mod not in _cached_ok and _ilu.find_spec(mod) is None]

        if _missing_pkgs:
            def _auto_install():
                import subprocess, sys as _sys
                print(f"[Auto-Install] Installing: {_missing_pkgs}")
                try:
                    cmd = [_sys.executable, "-m", "pip", "install",
                           "--quiet", "--break-system-packages"] + _missing_pkgs
                    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                    if r.returncode == 0:
                        print(f"[Auto-Install] Done: {', '.join(_missing_pkgs)}")
                        # Cache successful installs so next startup skips find_spec
                        try:
                            all_ok = list(_cached_ok) + _missing_pkgs
                            _cache_file.write_text(_json.dumps({"installed": all_ok}))
                        except Exception:
                            pass
                        try:
                            from . import ui_panels as _uip
                            if _uip and hasattr(_uip, "invalidate_dep_cache"):
                                _uip.invalidate_dep_cache()
                        except Exception:
                            pass
                    else:
                        print(f"[Auto-Install] pip error: {r.stderr.strip()[:200]}")
                except Exception as _exc:
                    print(f"[Auto-Install] Failed: {_exc}")
            _th_pkg.Thread(target=_auto_install, daemon=True,
                           name="MossyAutoInstall").start()
        else:
            print("[Auto-Install] All core Python packages present")
    except Exception as _ai_exc:
        print(f"[Auto-Install] Check skipped: {_ai_exc}")

    # ── Step 3b: install heavy/compiled packages via Mossy (background) ────────
    # scipy, trimesh, and libigl are large or require C++ compilation.
    # Blender's bundled pip cannot build them reliably, causing lag and errors.
    # If Mossy Bridge is online it handles the build toolchain transparently.
    # We skip silently when Mossy is offline — nothing breaks, features that
    # need these packages (RigNet, mesh analysis) just show "not available".
    def _try_mossy_optional():
        import importlib.util as _ilu2
        _MOSSY_PACKAGES = {
            "scipy":   "scipy",    # large numerical library
            "trimesh": "trimesh",  # mesh analysis, pulls many deps
            "igl":     "libigl",   # RigNet — requires C++ compilation
        }
        missing = [pip for mod, pip in _MOSSY_PACKAGES.items()
                   if _ilu2.find_spec(mod) is None]
        if not missing:
            return  # all already installed

        try:
            from . import mossy_link as _ml_opt
            bridge_ok, _ = _ml_opt.check_bridge(timeout=1.0)
            if not bridge_ok:
                print(f"[Mossy Install] Mossy offline — skipping {missing}")
                return
            print(f"[Mossy Install] Requesting via Mossy: {missing}")
            results = _ml_opt.request_packages_install(missing, timeout=300.0)
            for pkg, (ok, msg) in results.items():
                status = "installed" if ok else "skipped"
                print(f"[Mossy Install] {pkg}: {status} — {msg}")
        except Exception as _e_opt:
            print(f"[Mossy Install] Optional install skipped: {_e_opt}")

    import threading as _th_opt
    _th_opt.Thread(target=_try_mossy_optional, daemon=True,
                   name="MossyOptionalInstall").start()

    # ── Step 4: auto-discover installed CLI tools (background, not blocking) ────
    # Moved to a daemon thread so filesystem scanning never stalls the UI.
    def _bg_tool_discovery():
        try:
            from . import tool_installers as _ti
            if _ti:
                _ti.auto_configure_preferences()
        except Exception as e:
            print(f"Tool auto-discovery skipped: {e}")
    import threading as _th_td
    _th_td.Thread(target=_bg_tool_discovery, daemon=True,
                  name="MossyToolDiscovery").start()

    # ── Steps 5 / 5b / 5c: auto-download tools (background thread) ───────────
    # All three download steps are grouped into a single daemon thread so that
    # the potentially long-running network I/O (urllib.request.urlretrieve,
    # zip extraction, etc.) never blocks Blender's main thread or delays the
    # UI from becoming interactive after restart.  The same pattern is already
    # used for the AI-tool availability checks (Step 6b) and the Mossy bridge
    # check (Step 7) below.
    def _background_tool_downloads():
        # ── PyNifly (bundled, unconditional) ──────────────────────────────────
        # PyNifly (by BadDog / BadDogSkyrim) is bundled in bundled/ with
        # BadDog's permission.  Install silently on first load so the armor,
        # creature, and NPC export pipelines work out of the box.
        try:
            import bpy as _bpy
            if not hasattr(_bpy.ops.export_scene, "pynifly"):
                from . import tool_installers as _ti_pyn
                if _ti_pyn and hasattr(_ti_pyn, "install_pynifly"):
                    _ok, _msg = _ti_pyn.install_pynifly()
                    if _ok:
                        print(f"\u2713 PyNifly auto-installed (bundled): {_msg}")
                    else:
                        print(f"  PyNifly bundled install failed: {_msg}")
            else:
                print("[Startup] PyNifly already installed - skipping bundled install")
        except Exception as _pyn_e:
            print(f"  PyNifly auto-install skipped: {_pyn_e}")

        # Migrate ML packages from lib/ to lib/ml/ (avoids extension policy warnings)
        try:
            from . import tool_installers as _ti_mig
            if _ti_mig and hasattr(_ti_mig, "_migrate_ml_packages"):
                _ti_mig._migrate_ml_packages()
        except Exception:
            pass

        # Step 5+: other tool downloads — only when user has opted in ──────────
        # (PyNifly above runs unconditionally since it is bundled)
        _do_auto = False
        try:
            from . import preferences as _prefs_gate2
            _pg = _prefs_gate2.get_preferences() if _prefs_gate2 else None
            _do_auto = bool(_pg and getattr(_pg, 'auto_install_tools', False))
        except Exception:
            pass
        if not _do_auto:
            return

        # Step 5: auto-download UModel if missing and auto-install enabled ─────
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

        # Step 5b: auto-load UE4 importer if already on disk ──────────────────
        # The UE4 importer's register() is a deliberate no-op (to avoid Blender's
        # Extension policy checker flagging its bare sys.modules names and
        # sys.path mutation during the monitored register() window).  Instead,
        # load_and_register() is called here — safely outside that window — so
        # the importer's operators are available every session without the user
        # having to click "Auto-Install" again after a restart.
        # If the importer folder is absent it is downloaded automatically by
        # load_and_register() → _load_module(), but only when
        # auto_install_tools is on.  If the folder already exists from a
        # previous session it is loaded unconditionally (no network request).
        try:
            from . import ue_importer_helpers as _uei
            from . import preferences as _prefs_ue
            _p_ue = _prefs_ue.get_preferences() if _prefs_ue else None
            if _uei:
                if _uei.IMPORTER_INIT.exists():
                    # Already downloaded in a previous session — just load it.
                    ok, msg = _uei.load_and_register()
                    if ok:
                        print(f"✓ UE4 importer auto-loaded: {msg}")
                    else:
                        print(f"  UE4 importer auto-load skipped: {msg}")
                elif _p_ue and _p_ue.auto_install_tools:
                    # Not on disk yet, but user opted in to auto-install.
                    ok, msg = _uei.load_and_register()
                    if ok:
                        print(f"✓ UE4 importer downloaded and loaded: {msg}")
                    else:
                        print(f"  UE4 importer auto-install skipped: {msg}")
        except Exception as _e_ue:
            print(f"UE4 importer deferred load skipped: {_e_ue}")

        # Step 5c: auto-download other tools if auto_install_tools is on ──────
        # When the user has opted in, download AssetStudio, AssetRipper, Unity
        # FBX Importer, and UModel Tools on first startup.  Subsequent startups
        # skip the download because download_latest() returns early when the
        # directory already exists — the filesystem IS the persistence record.
        try:
            from . import preferences as _prefs_tools
            _p_tools = _prefs_tools.get_preferences() if _prefs_tools else None
            if _p_tools and _p_tools.auto_install_tools:
                _tool_helpers = []
                try:
                    from . import asset_studio_helpers as _ash
                    _tool_helpers.append(("AssetStudio", _ash))
                except Exception:
                    pass
                try:
                    from . import asset_ripper_helpers as _arh
                    _tool_helpers.append(("AssetRipper", _arh))
                except Exception:
                    pass
                try:
                    from . import unity_fbx_importer_helpers as _ufx
                    _tool_helpers.append(("UnityFBX Importer", _ufx))
                except Exception:
                    pass
                try:
                    from . import umodel_tools_helpers as _umt
                    _tool_helpers.append(("UModel Tools", _umt))
                except Exception:
                    pass
                for _tool_name, _tool_mod in _tool_helpers:
                    try:
                        ready, _ = _tool_mod.status()
                        if not ready:
                            ok, msg = _tool_mod.download_latest()
                            if ok:
                                print(f"✓ {_tool_name} auto-downloaded: {msg}")
                            else:
                                print(f"  {_tool_name} auto-download skipped: {msg}")
                    except Exception as _te:
                        print(f"  {_tool_name} auto-download error: {_te}")
        except Exception as _e_tools:
            print(f"Tool auto-download step skipped: {_e_tools}")

    # Always run _background_tool_downloads — it handles PyNifly (bundled,
    # no network needed) unconditionally, and gates the other tool downloads
    # on the auto_install_tools preference internally.
    import threading as _thr
    _thr.Thread(target=_background_tool_downloads, daemon=True,
                name="MossyToolDownloads").start()

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

    # ── Step 6b: AI-tool checks are now LAZY ─────────────────────────────────────
    # Previously these ran at startup in a background thread, but importing torch
    # (even off the main thread) holds Python's GIL while loading CUDA DLLs —
    # this blocked Blender's UI for several seconds every launch.
    #
    # AI availability is now checked on-demand: each helper module's
    # check_*_availability() runs only when the user opens that specific panel,
    # not at addon load time.  No performance cost at startup.
    #
    # PyTorch path is still applied early (no torch import, just sys.path update).
    def _apply_pytorch_path_only():
        try:
            from . import mossy_link as _ml_bg
            _ml_bg._load_pytorch_path_from_prefs()
        except Exception as _e:
            print(f"Mossy PyTorch path re-apply skipped: {_e}")
    _thr.Thread(target=_apply_pytorch_path_only, daemon=True,
                name="MossyPyTorchPath").start()

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
            bridge_ok, bridge_msg = _ml.check_bridge(timeout=0.3)
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

    _thr.Thread(target=_auto_check_mossy_bridge, daemon=True).start()

    return None  # Do not reschedule
