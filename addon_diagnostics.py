"""
addon_diagnostics.py — Fallout 4 Mod Assistant Health Check & Auto-Fix

Adds two operators that appear in the Setup & Status panel:

  fo4.run_addon_diagnostics
      Runs a full health check and prints a detailed report to the Blender
      System Console (Window ▸ Toggle System Console on Windows).

  fo4.fix_addon_issues
      Attempts to automatically repair the most common registration failures:
        • Re-registers tutorial_operators and setup_operators
        • Re-imports and re-registers any module that failed to load
        • Restores extra Python paths and scene properties from preferences

These operators are lightweight and safe to call repeatedly.  They do NOT
touch any scene data or addon preferences destructively.

See DEVELOPMENT_NOTES.md for the full list of recurring bugs and their root
causes.  Understanding that document is essential before making changes here.
"""

import bpy
import importlib
import os
import sys
import traceback
from bpy.types import Operator

# ── Internal helpers ──────────────────────────────────────────────────────────

def _addon_init():
    """Return this addon's top-level __init__ module, or None."""
    pkg = __package__
    if pkg:
        return sys.modules.get(pkg)
    return None


def _op_callable(bl_idname: str) -> bool:
    """Return True if *bl_idname* resolves to a callable bpy.ops entry."""
    try:
        prefix, name = bl_idname.split(".", 1)
        group = getattr(bpy.ops, prefix, None)
        return group is not None and hasattr(group, name)
    except Exception:
        return False


# ── Modules and operators to track ───────────────────────────────────────────

# Sentinel used to distinguish "attribute not present on __init__ module" from
# "attribute is explicitly None (module failed to import)".
_SENTINEL = object()

# These are the modules whose import status is checked.  Only modules that are
# referenced as attributes on the __init__ module are listed here; optional /
# AI-only helpers are excluded to keep the report readable.
_TRACKED_MODULES = [
    "preferences",
    "operators",
    "ui_panels",
    "tutorial_operators",
    "setup_operators",
    "tutorial_system",
    "mesh_helpers",
    "export_helpers",
    "notification_system",
    "tool_installers",
    "hunyuan3d_helpers",
    "hymotion_helpers",
    "zoedepth_helpers",
    "nvtt_helpers",
    "realesrgan_helpers",
    "rignet_helpers",
    "instantngp_helpers",
    "imageto3d_helpers",
    "umodel_helpers",
    "mossy_link",
]

# These operators MUST always be registered for the Setup & Status panel and
# the main welcome panel to work correctly.  Any failure here is critical.
_CRITICAL_OPERATORS = [
    # (Python class name,          bl_idname)
    ("FO4_OT_ShowDetailedSetup",   "fo4.show_detailed_setup"),
    ("FO4_OT_StartTutorial",       "fo4.start_tutorial"),
    ("FO4_OT_ShowHelp",            "fo4.show_help"),
    ("FO4_OT_ShowCredits",         "fo4.show_credits"),
    ("FO4_OT_InstallPythonDeps",   "fo4.install_python_deps"),
    ("FO4_OT_SelfTest",            "fo4.self_test"),
    ("FO4_OT_ReloadAddon",         "fo4.reload_addon"),
]


# ── Diagnostics engine ────────────────────────────────────────────────────────

def collect_diagnostics():
    """
    Run all health checks and return a list of 3-tuples:
        (status, category, message)

    ``status`` is one of: "OK" | "FAIL" | "WARN" | "INFO"
    """
    results = []

    # ── 1. Blender version ────────────────────────────────────────────────────
    bv = bpy.app.version
    bv_str = f"{bv[0]}.{bv[1]}.{bv[2]}"
    if bv >= (5, 0, 0):
        results.append(("OK",   "Blender", f"Version {bv_str} — supported target"))
    else:
        results.append(("WARN", "Blender",
                        f"Version {bv_str} — add-on targets Blender 5.x; some features may misbehave"))

    # ── 2. Install location ───────────────────────────────────────────────────
    addon_dir = os.path.dirname(os.path.abspath(__file__))
    results.append(("INFO", "Install", f"Location: {addon_dir}"))

    in_blender_org  = "blender_org"   in addon_dir
    in_user_default = "user_default"  in addon_dir

    if in_blender_org and in_user_default:
        results.append(("FAIL", "Install",
                        "DUAL INSTALL: both blender_org and user_default paths appear in the "
                        "addon directory.  Disable one copy via Edit ▸ Preferences ▸ Add-ons."))
    elif in_blender_org:
        results.append(("INFO", "Install",
                        "Installed via Blender marketplace (blender_org) — "
                        "module prefix: bl_ext.blender_org"))
    elif in_user_default:
        results.append(("INFO", "Install",
                        "Installed as local extension (user_default) — "
                        "module prefix: bl_ext.user_default"))
    else:
        results.append(("WARN", "Install",
                        "Unexpected install path (neither blender_org nor user_default)"))

    # ── 3. Dual-install via sys.modules ──────────────────────────────────────
    name_base = (__package__ or "blender_game_tools").split(".")[-1]
    dupes = [k for k in sys.modules
             if name_base in k and k != __package__ and "addon_diagnostics" not in k]
    if dupes:
        results.append(("WARN", "Install",
                        f"Multiple sys.modules entries for '{name_base}': {dupes!r} — "
                        "dual-install or stale reload.  Restart Blender to clear."))

    # ── 4. Module import status ───────────────────────────────────────────────
    init = _addon_init()
    failed_mods = []

    for name in _TRACKED_MODULES:
        if init is None:
            results.append(("WARN", "Module", f"{name}: __init__ not in sys.modules"))
            continue
        mod = getattr(init, name, _SENTINEL)
        if mod is _SENTINEL:
            results.append(("WARN", "Module", f"{name}: not tracked in __init__"))
        elif mod is None:
            results.append(("FAIL", "Module", f"{name}: FAILED TO IMPORT — its features will be missing"))
            failed_mods.append(name)
        else:
            results.append(("OK",   "Module", f"{name}: loaded OK"))

    if failed_mods:
        results.append(("WARN", "Module",
                        f"{len(failed_mods)} module(s) failed — click 'Auto-Fix Issues' to retry"))

    # ── 5. Critical operator registration ────────────────────────────────────
    missing_ops = []
    for cls_name, bl_idname in _CRITICAL_OPERATORS:
        if _op_callable(bl_idname):
            results.append(("OK",   "Operator", f"{bl_idname}: registered ✓"))
        else:
            results.append(("FAIL", "Operator",
                            f"{bl_idname}: NOT FOUND — button will be broken or invisible"))
            missing_ops.append(bl_idname)

    if missing_ops:
        results.append(("FAIL", "Operator",
                        "One or more critical operators missing — click 'Auto-Fix Issues' to repair"))

    # ── 6. Preferences ────────────────────────────────────────────────────────
    prefs_mod = getattr(init, "preferences", None) if init else None
    if prefs_mod:
        try:
            prefs = prefs_mod.get_preferences()
            if prefs:
                results.append(("OK", "Prefs", "Addon preferences accessible"))
            else:
                results.append(("WARN", "Prefs",
                                "get_preferences() returned None — addon may not be fully enabled"))
        except Exception as exc:
            results.append(("FAIL", "Prefs", f"Error reading preferences: {exc}"))
    else:
        results.append(("FAIL", "Prefs",
                        "preferences module not loaded — cannot read addon settings"))

    # ── 7. Python version ─────────────────────────────────────────────────────
    import sys as _sys
    pv = _sys.version_info
    pv_str = f"{pv.major}.{pv.minor}.{pv.micro}"
    if pv >= (3, 11):
        results.append(("OK",   "Python", f"Python {pv_str} — full compatibility"))
    elif pv >= (3, 9):
        results.append(("OK",   "Python", f"Python {pv_str} — compatible"))
    else:
        results.append(("WARN", "Python",
                        f"Python {pv_str} — older than recommended 3.11; some packages may misbehave"))

    # ── 8. PyTorch availability (optional) ────────────────────────────────────
    try:
        import importlib.util as _ilu
        torch_spec = _ilu.find_spec("torch")
        if torch_spec:
            results.append(("OK",   "PyTorch", f"torch found at {torch_spec.origin}"))
        else:
            results.append(("INFO", "PyTorch",
                            "torch not installed — AI generation features are disabled (optional)"))
    except Exception:
        results.append(("INFO", "PyTorch", "Could not check torch availability"))

    # ── 9. __init__ module present in sys.modules ────────────────────────────
    if init is not None:
        results.append(("OK",   "Init", f"__init__ module in sys.modules as '{__package__}'"))
    else:
        results.append(("WARN", "Init",
                        f"__init__ module NOT found in sys.modules under '{__package__}' — "
                        "module tracking will be limited"))

    return results


# ── Operators ─────────────────────────────────────────────────────────────────

class FO4_OT_RunAddonDiagnostics(Operator):
    """Run a full health check on the Fallout 4 Mod Assistant.
Results are printed to the Blender System Console (Window > Toggle System Console on Windows)"""
    bl_idname  = "fo4.run_addon_diagnostics"
    bl_label   = "Run Add-on Diagnostics"
    bl_options = {'REGISTER'}

    def execute(self, context):
        sep = "=" * 64
        print(f"\n{sep}")
        print("  FO4 MOD ASSISTANT — DIAGNOSTICS REPORT")
        print(sep)

        results = collect_diagnostics()

        cat_width = max((len(cat) for _, cat, _ in results), default=8) + 2
        ok_n = fail_n = warn_n = 0

        for status, category, message in results:
            icon = {"OK": "✓", "FAIL": "✗", "WARN": "⚠", "INFO": "·"}.get(status, "?")
            tag  = f"[{category}]".ljust(cat_width)
            print(f"  {icon} {tag} {message}")
            if   status == "OK":   ok_n   += 1
            elif status == "FAIL": fail_n += 1
            elif status == "WARN": warn_n += 1

        print(sep)
        print(f"  SUMMARY: {ok_n} OK · {fail_n} FAILED · {warn_n} WARNINGS")
        print(f"  {'All checks passed!' if fail_n == 0 else 'Issues found — see details above.'}")
        print(sep + "\n")

        if fail_n > 0:
            self.report(
                {'WARNING'},
                f"Diagnostics: {fail_n} failure(s), {warn_n} warning(s) — "
                "open Window ▸ Toggle System Console to read the full report",
            )
        elif warn_n > 0:
            self.report(
                {'INFO'},
                f"Diagnostics: {ok_n} OK, {warn_n} warning(s) — "
                "open System Console for details",
            )
        else:
            self.report({'INFO'}, f"Diagnostics: all {ok_n} checks passed ✓")

        return {'FINISHED'}


class FO4_OT_FixAddonIssues(Operator):
    """Attempt to automatically repair common add-on registration failures.
Re-registers tutorial and setup operators, retries failed module imports, and restores preferences"""
    bl_idname  = "fo4.fix_addon_issues"
    bl_label   = "Auto-Fix Issues"
    bl_options = {'REGISTER'}

    def execute(self, context):
        fixed  = []
        failed = []
        init   = _addon_init()

        print("\n[ FO4 Auto-Fix ] Starting repair …")

        # ── Step 1: re-register tutorial_operators ────────────────────────────
        tut = getattr(init, "tutorial_operators", None) if init else None
        if tut:
            try:
                tut.unregister()
            except Exception:
                pass
            try:
                tut.register()
                fixed.append("tutorial_operators re-registered")
            except Exception as exc:
                failed.append(f"tutorial_operators: {exc}")
        else:
            failed.append("tutorial_operators: module not available")

        # ── Step 2: re-register setup_operators ──────────────────────────────
        setup = getattr(init, "setup_operators", None) if init else None
        if setup:
            try:
                setup.unregister()
            except Exception:
                pass
            try:
                setup.register()
                fixed.append("setup_operators re-registered")
            except Exception as exc:
                failed.append(f"setup_operators: {exc}")
        else:
            failed.append("setup_operators: module not available")

        # ── Step 3: retry failed module imports ───────────────────────────────
        if init:
            for name in _TRACKED_MODULES:
                mod = getattr(init, name, None)
                if mod is not None:
                    continue  # already loaded — skip
                pkg_full = f"{__package__}.{name}"
                sys.modules.pop(pkg_full, None)
                try:
                    new_mod = importlib.import_module(f".{name}", package=__package__)
                    setattr(init, name, new_mod)
                    try:
                        if hasattr(new_mod, "register"):
                            new_mod.register()
                    except Exception:
                        pass  # partial success — module loaded even if register() failed
                    fixed.append(f"re-imported {name}")
                except Exception as exc:
                    failed.append(f"re-import {name}: {exc}")

        # ── Step 4: restore preferences ───────────────────────────────────────
        prefs_mod = getattr(init, "preferences", None) if init else None
        if prefs_mod:
            try:
                restored = prefs_mod.restore_extra_python_paths()
                fixed.append(f"extra Python paths restored ({len(restored) if restored else 0} paths)")
            except Exception as exc:
                failed.append(f"restore_extra_python_paths: {exc}")

            try:
                if hasattr(bpy.data, "scenes"):
                    for scene in bpy.data.scenes:
                        try:
                            prefs_mod.restore_scene_props_from_prefs(scene)
                        except Exception:
                            pass
                fixed.append("scene properties restored from preferences")
            except Exception as exc:
                failed.append(f"restore_scene_props: {exc}")

        # ── Report ────────────────────────────────────────────────────────────
        print("[ FO4 Auto-Fix ] Results:")
        for item in fixed:
            print(f"  ✓ {item}")
        for item in failed:
            print(f"  ✗ {item}")
        print(f"[ FO4 Auto-Fix ] Done — {len(fixed)} fixed, {len(failed)} failed\n")

        if failed:
            self.report(
                {'WARNING'},
                f"Auto-Fix: {len(fixed)} repaired, {len(failed)} could not be fixed — "
                "check System Console for details",
            )
        else:
            self.report(
                {'INFO'},
                f"Auto-Fix: {len(fixed)} action(s) completed — "
                "click 'Run Diagnostics' to verify",
            )

        return {'FINISHED'}


# ── Registration ──────────────────────────────────────────────────────────────

_CLASSES = [
    FO4_OT_RunAddonDiagnostics,
    FO4_OT_FixAddonIssues,
]


def register():
    for cls in _CLASSES:
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
