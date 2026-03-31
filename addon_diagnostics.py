"""
addon_diagnostics.py - Fallout 4 Mod Assistant Health Check & Auto-Fix

Adds two operators that appear in the Setup & Status panel:

  fo4.run_addon_diagnostics
      Runs a full health check and prints a detailed report to the Blender
      System Console (Window ▸ Toggle System Console on Windows).

      Checks performed:
        1.  Blender version
        2.  Install location / dual-install detection
        3.  Duplicate sys.modules entries
        4.  Python module import status (all tracked modules)
        5.  Critical operator registration
        6.  Addon preferences accessibility
        7.  Python version
        8.  PyTorch availability (local install AND Mossy bridge)
        9.  __init__ presence in sys.modules
        10. External tool binaries (FFmpeg, NVTT, TexConv, Havok2FBX,
            UModel, Instant-NGP, RealESRGAN, tools root)
        11. Mossy Bridge connectivity (when Mossy is enabled in preferences)
        12. Asset & knowledge-base paths
        13. AI tool availability status (Hunyuan3D, HyMotion, ZoeDepth, RigNet)
        14. Mossy PyTorch path persistence

  fo4.fix_addon_issues
      Attempts to automatically repair the most common registration failures:
        • Re-registers tutorial_operators and setup_operators
        • Re-imports and re-registers any module that failed to load
        • Restores extra Python paths and scene properties from preferences
        • Re-runs AI tool availability checks with correct sys.path (Step 5)
        • Applies persisted Mossy PyTorch path to sys.path (Step 6)

These operators are lightweight and safe to call repeatedly.  They do NOT
touch any scene data or addon preferences destructively.

See DEVELOPMENT_NOTES.md for the full list of recurring bugs and their root
causes.  Understanding that document is essential before making changes here.
"""

import bpy
import importlib
import importlib.util
import os
import sys
import time
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

# Operators that belong to tutorial_operators.py and setup_operators.py
# respectively.  Auto-Fix uses these to decide whether re-registration is
# actually needed - the modules are only re-registered when at least one of
# their operators is missing from the Blender type system.
_TUTORIAL_OP_IDNAMES = [
    "fo4.show_detailed_setup",
    "fo4.start_tutorial",
    "fo4.show_help",
    "fo4.show_credits",
]
_SETUP_OP_IDNAMES = [
    "fo4.install_python_deps",
    "fo4.self_test",
    "fo4.reload_addon",
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
        results.append(("OK",   "Blender", f"Version {bv_str} - supported target"))
    else:
        results.append(("WARN", "Blender",
                        f"Version {bv_str} - add-on targets Blender 5.x; some features may misbehave"))

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
                        "Installed via Blender marketplace (blender_org) - "
                        "module prefix: bl_ext.blender_org"))
    elif in_user_default:
        results.append(("INFO", "Install",
                        "Installed as local extension (user_default) - "
                        "module prefix: bl_ext.user_default"))
    else:
        results.append(("INFO", "Install",
                        "Non-standard installation path (not a Blender extension) - "
                        "addon should still function normally"))

    # ── 3. Dual-install via sys.modules ──────────────────────────────────────
    name_base = (__package__ or "blender_game_tools").split(".")[-1]
    own_pkg = __package__ or "blender_game_tools"
    # Collect every sys.modules key that belongs to a *different* install of
    # this addon (contains the addon name but is not the current package root
    # or any of its sub-modules).
    foreign_keys = [
        k for k in sys.modules
        if name_base in k
        and not (k == own_pkg or k.startswith(own_pkg + "."))
        and "addon_diagnostics" not in k
    ]
    if foreign_keys:
        # A single dual-installed addon can produce 30+ sub-module entries in
        # sys.modules (one per file in the package).  Listing all of them makes
        # the warning extremely noisy and hard to act on.  Instead, report only
        # the *root* package key of each foreign install — the entry whose
        # qualified name ends with the bare addon name, e.g.
        # "bl_ext.blender_org.blender_game_tools".
        foreign_roots = sorted({
            k for k in foreign_keys
            if k == name_base or k.endswith("." + name_base)
        })
        if foreign_roots:
            detail = repr(foreign_roots)
        else:
            # Root key not yet populated (partial / stale reload): report count.
            detail = f"{len(foreign_keys)} stale sub-module(s) (no root entry found)"
        results.append(("WARN", "Install",
                        f"Multiple installs of '{name_base}' found in sys.modules: "
                        f"{detail} - dual-install or stale reload.  "
                        "Restart Blender to clear."))

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
            results.append(("FAIL", "Module", f"{name}: FAILED TO IMPORT - its features will be missing"))
            failed_mods.append(name)
        else:
            results.append(("OK",   "Module", f"{name}: loaded OK"))

    if failed_mods:
        results.append(("WARN", "Module",
                        f"{len(failed_mods)} module(s) failed - click 'Auto-Fix Issues' to retry"))

    # ── 5. Critical operator registration ────────────────────────────────────
    missing_ops = []
    for cls_name, bl_idname in _CRITICAL_OPERATORS:
        if _op_callable(bl_idname):
            results.append(("OK",   "Operator", f"{bl_idname}: registered ✓"))
        else:
            results.append(("FAIL", "Operator",
                            f"{bl_idname}: NOT FOUND - button will be broken or invisible"))
            missing_ops.append(bl_idname)

    if missing_ops:
        results.append(("FAIL", "Operator",
                        "One or more critical operators missing - click 'Auto-Fix Issues' to repair"))

    # ── 6. Preferences ────────────────────────────────────────────────────────
    prefs_mod = getattr(init, "preferences", None) if init else None
    if prefs_mod:
        try:
            prefs = prefs_mod.get_preferences()
            if prefs:
                results.append(("OK", "Prefs", "Addon preferences accessible"))
            else:
                results.append(("WARN", "Prefs",
                                "get_preferences() returned None - addon may not be fully enabled"))
        except Exception as exc:
            results.append(("FAIL", "Prefs", f"Error reading preferences: {exc}"))
    else:
        results.append(("FAIL", "Prefs",
                        "preferences module not loaded - cannot read addon settings"))

    # ── 7. Python version ─────────────────────────────────────────────────────
    import sys as _sys
    pv = _sys.version_info
    pv_str = f"{pv.major}.{pv.minor}.{pv.micro}"
    if pv >= (3, 11):
        results.append(("OK",   "Python", f"Python {pv_str} - full compatibility"))
    elif pv >= (3, 9):
        results.append(("OK",   "Python", f"Python {pv_str} - compatible"))
    else:
        results.append(("WARN", "Python",
                        f"Python {pv_str} - older than recommended 3.11; some packages may misbehave"))

    # Fetch preferences now — needed by checks 8, 13, 14 and later by check 10.
    _prefs = None
    if prefs_mod:
        try:
            _prefs = prefs_mod.get_preferences()
        except Exception:
            pass

    # ── 8. PyTorch availability (local install AND Mossy bridge) ─────────────
    # PyTorch may be provided in three ways:
    #   (a) Installed locally into Blender's Python (find_spec finds it)
    #   (b) Provided by the Mossy desktop app via the bridge (find_spec returns
    #       None even though torch IS available for AI inference)
    #   (c) A custom torch path set in preferences was added to sys.path
    # All three must be checked so the status is never falsely reported as
    # "not installed" when the user has a working Mossy setup.
    try:
        torch_spec = importlib.util.find_spec("torch")
        if torch_spec:
            results.append(("OK", "PyTorch",
                            f"torch found locally at {torch_spec.origin}"))
        else:
            # Local install absent — check Mossy bridge
            _mossy_torch = False
            _mossy_source = ""

            # Check live bridge status in window manager
            try:
                _wm_status = bpy.context.window_manager.get("mossy_bridge_status", "")
                if str(_wm_status).startswith("Mossy Bridge online"):
                    _mossy_torch = True
                    _mossy_source = "Mossy bridge online"
            except Exception:
                pass

            # Check use_mossy_as_ai preference (user explicitly chose Mossy as backend)
            if not _mossy_torch and _prefs is not None:
                if getattr(_prefs, "use_mossy_as_ai", False):
                    _mossy_torch = True
                    _mossy_source = "use_mossy_as_ai preference enabled"

            # Check persisted pytorch_path from a previous Mossy session
            if not _mossy_torch and _prefs is not None:
                _saved_path = getattr(_prefs, "pytorch_path", "")
                if _saved_path and os.path.isdir(_saved_path):
                    _mossy_torch = True
                    _mossy_source = f"saved pytorch_path: {_saved_path}"

            if _mossy_torch:
                results.append(("OK", "PyTorch",
                                f"torch provided by Mossy ({_mossy_source}) — "
                                "local find_spec returns None but torch IS available"))
            else:
                results.append(("INFO", "PyTorch",
                                "torch not found locally and Mossy bridge not detected — "
                                "AI generation features disabled (optional). "
                                "Install via Settings panel or connect Mossy."))
    except Exception as _exc:
        results.append(("INFO", "PyTorch", f"Could not check torch availability: {_exc}"))

    # ── 9. __init__ module present in sys.modules ────────────────────────────
    if init is not None:
        results.append(("OK",   "Init", f"__init__ module in sys.modules as '{__package__}'"))
    else:
        results.append(("WARN", "Init",
                        f"__init__ module NOT found in sys.modules under '{__package__}' - "
                        "module tracking will be limited"))

    # ── 10. External tool binaries ────────────────────────────────────────────
    # _prefs was already fetched above (after check 7) and is reused here.
    _ti = getattr(init, "tool_installers", None) if init else None

    if _prefs:
        # FFmpeg ──────────────────────────────────────────────────────────────
        _p = bpy.path.abspath(_prefs.ffmpeg_path).strip()
        if not _p:
            results.append(("INFO", "Tools", "FFmpeg: not configured (optional)"))
        elif os.path.isfile(_p):
            results.append(("OK",   "Tools", f"FFmpeg: found at {_p}"))
        else:
            results.append(("WARN", "Tools", f"FFmpeg: configured path not found - {_p}"))

        # NVTT / nvcompress ───────────────────────────────────────────────────
        _p = bpy.path.abspath(_prefs.nvtt_path).strip()
        if not _p:
            results.append(("INFO", "Tools", "NVTT (nvcompress): not configured (optional)"))
        elif os.path.isfile(_p) or os.path.isdir(_p):
            results.append(("OK",   "Tools", f"NVTT: found at {_p}"))
        else:
            results.append(("WARN", "Tools", f"NVTT: configured path not found - {_p}"))

        # TexConv ─────────────────────────────────────────────────────────────
        _p = bpy.path.abspath(_prefs.texconv_path).strip()
        if not _p:
            results.append(("INFO", "Tools", "TexConv: not configured (optional)"))
        elif os.path.isfile(_p):
            results.append(("OK",   "Tools", f"TexConv: found at {_p}"))
        else:
            results.append(("WARN", "Tools", f"TexConv: configured path not found - {_p}"))

        # Havok2FBX ───────────────────────────────────────────────────────────
        _p = bpy.path.abspath(_prefs.havok2fbx_path).strip()
        if not _p:
            results.append(("INFO", "Tools", "Havok2FBX: not configured (optional)"))
        elif _ti and hasattr(_ti, "check_havok2fbx") and _ti.check_havok2fbx(_p):
            results.append(("OK",   "Tools", f"Havok2FBX: verified at {_p}"))
        elif os.path.isdir(_p):
            results.append(("WARN", "Tools",
                            f"Havok2FBX: folder found but expected files missing - {_p}"))
        else:
            results.append(("WARN", "Tools", f"Havok2FBX: configured path not found - {_p}"))

        # UModel ──────────────────────────────────────────────────────────────
        _p = bpy.path.abspath(_prefs.umodel_path).strip()
        if not _p:
            results.append(("INFO", "Tools", "UModel: not configured (optional)"))
        elif (os.path.isfile(os.path.join(_p, "umodel.exe"))
              or os.path.isfile(os.path.join(_p, "umodel"))):
            results.append(("OK",   "Tools", f"UModel: found in {_p}"))
        elif os.path.isdir(_p):
            results.append(("WARN", "Tools",
                            f"UModel: folder found but umodel executable not inside - {_p}"))
        else:
            results.append(("WARN", "Tools", f"UModel: configured path not found - {_p}"))

        # Instant-NGP ─────────────────────────────────────────────────────────
        _p = bpy.path.abspath(_prefs.instantngp_path).strip()
        if not _p:
            results.append(("INFO", "Tools", "Instant-NGP: not configured (optional)"))
        else:
            _exe = None
            if _ti and hasattr(_ti, "find_instantngp_exe"):
                try:
                    _exe = _ti.find_instantngp_exe(_p)
                except Exception:
                    pass
            if _exe:
                results.append(("OK",   "Tools", f"Instant-NGP: found at {_exe}"))
            elif os.path.isdir(_p):
                results.append(("WARN", "Tools",
                                f"Instant-NGP: folder found but executable not inside - {_p}"))
            else:
                results.append(("WARN", "Tools",
                                f"Instant-NGP: configured path not found - {_p}"))

        # RealESRGAN (auto-discovered, no manual path preference) ─────────────
        if _ti and hasattr(_ti, "get_realesrgan_ncnn_exe"):
            try:
                _exe = _ti.get_realesrgan_ncnn_exe()
                if _exe:
                    results.append(("OK",   "Tools", f"RealESRGAN: found at {_exe}"))
                else:
                    results.append(("INFO", "Tools",
                                    "RealESRGAN: not found in tools directories (optional)"))
            except Exception:
                results.append(("INFO", "Tools", "RealESRGAN: could not check (optional)"))

        # Tools root ──────────────────────────────────────────────────────────
        _p = bpy.path.abspath(_prefs.tools_root).strip()
        if not _p:
            results.append(("INFO", "Tools",
                            "Tools root: not set (auto-discovery will be used)"))
        elif os.path.isdir(_p):
            results.append(("OK",   "Tools", f"Tools root: {_p}"))
        else:
            results.append(("WARN", "Tools",
                            f"Tools root: configured but directory not found - {_p}"))
    else:
        results.append(("WARN", "Tools",
                        "Cannot check external tools - addon preferences not accessible"))

    # ── 11. Mossy Bridge ──────────────────────────────────────────────────────
    _ml = getattr(init, "mossy_link", None) if init else None
    _mossy_enabled = _prefs and (
        getattr(_prefs, "use_mossy_as_ai", False)
        or getattr(_prefs, "autostart", False)
    )
    if _mossy_enabled:
        if _ml and hasattr(_ml, "check_bridge"):
            try:
                _ok, _msg = _ml.check_bridge(timeout=2.0)
                if _ok:
                    results.append(("OK",   "Mossy", f"Bridge online: {_msg}"))
                else:
                    results.append(("WARN", "Mossy", f"Bridge offline: {_msg}"))
            except Exception as _exc:
                results.append(("WARN", "Mossy",
                                f"Bridge check raised an exception: {_exc}"))
        else:
            results.append(("FAIL", "Mossy",
                            "mossy_link module not loaded but Mossy is enabled in preferences"))
    else:
        results.append(("INFO", "Mossy",
                        "Mossy Link not enabled in preferences (bridge check skipped)"))

    # ── 12. Asset & knowledge-base paths ─────────────────────────────────────
    if _prefs:
        _fo4 = bpy.path.abspath(_prefs.fo4_assets_path).strip()
        if _fo4:
            if os.path.isdir(_fo4):
                results.append(("OK",   "Assets", f"FO4 assets root: {_fo4}"))
            else:
                results.append(("WARN", "Assets",
                                f"FO4 assets root configured but not found - {_fo4}"))
        else:
            results.append(("INFO", "Assets", "FO4 assets root: not configured"))

        _kb_on = getattr(_prefs, "knowledge_base_enabled", False)
        _kb    = bpy.path.abspath(_prefs.knowledge_base_path).strip()
        if not _kb:
            # Mirror _kb_root() fallback: bundled knowledge_base/ folder
            _kb = os.path.join(os.path.dirname(os.path.abspath(__file__)), "knowledge_base")
        if _kb_on:
            if os.path.isdir(_kb):
                results.append(("OK",   "Assets", f"Knowledge base: {_kb}"))
            else:
                results.append(("WARN", "Assets",
                                f"Knowledge base enabled but path not found - {_kb}"))
        else:
            results.append(("INFO", "Assets", "Knowledge base: disabled"))

    # ── 13. AI tool availability status ──────────────────────────────────────
    # Check whether each AI helper has run its deferred availability check.
    # A status of None means the deferred check never ran (e.g. deferred_startup
    # was skipped) — Auto-Fix can trigger the re-check immediately.
    # A status of False when the tool IS installed on disk means a stale bad
    # result got cached before torch paths were ready (the recurring bug).
    _ai_checks = [
        # (helper attr on init,   AVAILABLE global name,  display name)
        ("hunyuan3d_helpers", "HUNYUAN3D_AVAILABLE", "Hunyuan3D-2"),
        ("hymotion_helpers",  "HYMOTION_AVAILABLE",  "HY-Motion-1.0"),
        ("zoedepth_helpers",  "ZOEDEPTH_AVAILABLE",  "ZoeDepth"),
    ]
    for _attr, _glob, _label in _ai_checks:
        _helper = getattr(init, _attr, None) if init else None
        if _helper is None:
            results.append(("WARN", "AI Tools",
                            f"{_label}: helper module not loaded"))
            continue
        _avail = getattr(_helper, _glob, "?")
        if _avail is True:
            results.append(("OK",   "AI Tools", f"{_label}: available ✓"))
        elif _avail is None:
            results.append(("WARN", "AI Tools",
                            f"{_label}: status not yet checked — "
                            "click Auto-Fix to refresh (deferred check may have been skipped)"))
        elif _avail is False:
            # Possibly a stale False from before torch paths were restored.
            # Try to distinguish "genuinely not installed" from "stale cache".
            _torch_ok = (
                importlib.util.find_spec("torch") is not None
                or (_prefs is not None and getattr(_prefs, "use_mossy_as_ai", False))
                or (_prefs is not None and bool(getattr(_prefs, "pytorch_path", "")))
            )
            if _torch_ok:
                results.append(("WARN", "AI Tools",
                                f"{_label}: shows Not Installed but torch IS available — "
                                "likely a stale cache from before torch paths were ready. "
                                "Click Auto-Fix to refresh."))
            else:
                results.append(("INFO", "AI Tools",
                                f"{_label}: not installed / not available (optional)"))
        else:
            results.append(("INFO", "AI Tools", f"{_label}: status unknown ({_avail!r})"))

    # RigNet uses a separate TTL cache in ui_panels rather than a module global
    _up = getattr(init, "ui_panels", None) if init else None
    if _up and hasattr(_up, "_rignet_status_cache"):
        _rc = _up._rignet_status_cache
        _rc_ts = _rc.get("ts", 0.0)
        # ts == 0.0 means cache was explicitly invalidated (needs refresh)
        if _rc_ts == 0.0:
            results.append(("WARN", "AI Tools",
                            "RigNet: status cache invalidated — "
                            "will re-probe on next UI draw"))
        elif _rc.get("rignet", (False,))[0]:
            results.append(("OK",   "AI Tools", "RigNet: available ✓"))
        else:
            results.append(("INFO", "AI Tools", "RigNet: not installed (optional)"))

    # ── 14. Mossy PyTorch path persistence ───────────────────────────────────
    # When Mossy sends a set_pytorch_path command, mossy_link stores it in
    # prefs.pytorch_path so it survives a Blender restart.  If the pref is
    # empty but Mossy is enabled AND torch is not available locally, warn the
    # user so they know to connect Mossy once to persist the path.
    if _prefs is not None and getattr(_prefs, "use_mossy_as_ai", False):
        _saved_pt = getattr(_prefs, "pytorch_path", "").strip()
        if _saved_pt:
            if _saved_pt in sys.path:
                results.append(("OK", "Mossy",
                                f"PyTorch path persisted and active: {_saved_pt}"))
            else:
                results.append(("WARN", "Mossy",
                                f"PyTorch path persisted but NOT in sys.path: {_saved_pt} — "
                                "click Auto-Fix to apply it for this session"))
        else:
            # Suppress the warning when torch is already available through a
            # local install (torch_custom_path) — the pytorch_path pref is only
            # needed to persist the Mossy-provided path across restarts, and a
            # working local install makes that unnecessary.
            _torch_local = importlib.util.find_spec("torch") is not None
            if not _torch_local:
                results.append(("WARN", "Mossy",
                                "use_mossy_as_ai is ON but pytorch_path preference is empty. "
                                "Connect Mossy so it can send the path, then restart Blender to persist it."))

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
        print("  FO4 MOD ASSISTANT - DIAGNOSTICS REPORT")
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
        print(f"  {'All checks passed!' if fail_n == 0 else 'Issues found - see details above.'}")
        print(sep + "\n")

        if fail_n > 0:
            self.report(
                {'WARNING'},
                f"Diagnostics: {fail_n} failure(s), {warn_n} warning(s) - "
                "open Window ▸ Toggle System Console to read the full report",
            )
        elif warn_n > 0:
            self.report(
                {'INFO'},
                f"Diagnostics: {ok_n} OK, {warn_n} warning(s) - "
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

        # ── Step 1: re-register tutorial_operators (only when operators missing) ─
        tut = getattr(init, "tutorial_operators", None) if init else None
        if tut:
            if any(not _op_callable(op) for op in _TUTORIAL_OP_IDNAMES):
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

        # ── Step 2: re-register setup_operators (only when operators missing) ──
        setup = getattr(init, "setup_operators", None) if init else None
        if setup:
            if any(not _op_callable(op) for op in _SETUP_OP_IDNAMES):
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
                    continue  # already loaded - skip
                pkg_full = f"{__package__}.{name}"
                sys.modules.pop(pkg_full, None)
                try:
                    new_mod = importlib.import_module(f".{name}", package=__package__)
                    setattr(init, name, new_mod)
                    try:
                        if hasattr(new_mod, "register"):
                            new_mod.register()
                    except Exception:
                        pass  # partial success - module loaded even if register() failed
                    fixed.append(f"re-imported {name}")
                except Exception as exc:
                    failed.append(f"re-import {name}: {exc}")

        # ── Step 4: restore preferences ───────────────────────────────────────
        prefs_mod = getattr(init, "preferences", None) if init else None
        if prefs_mod:
            try:
                restored = prefs_mod.restore_extra_python_paths()
                restored_count = len(restored) if restored else 0
                if restored_count > 0:
                    fixed.append(f"extra Python paths restored ({restored_count} paths)")
            except Exception as exc:
                failed.append(f"restore_extra_python_paths: {exc}")

            try:
                if hasattr(bpy.data, "scenes"):
                    for scene in bpy.data.scenes:
                        try:
                            prefs_mod.restore_scene_props_from_prefs(scene)
                        except Exception:
                            pass
            except Exception as exc:
                failed.append(f"restore_scene_props: {exc}")

        # ── Step 5: refresh AI tool availability caches ───────────────────────
        # Mirrors startup_helpers.deferred_startup() Step 6b.  Run after Step 4
        # (restore_extra_python_paths) so torch_custom_path is already in sys.path
        # when the availability checks run.  This is the direct in-session fix for
        # "shows Not Installed even though the tool is present" after restart.

        # Hunyuan3D-2
        try:
            _h3d = getattr(init, "hunyuan3d_helpers", None)
            if _h3d and hasattr(_h3d, "check_hunyuan3d_availability"):
                avail, msg = _h3d.check_hunyuan3d_availability()
                fixed.append(
                    f"Hunyuan3D-2 status refreshed: {'available' if avail else 'not available'}"
                )
        except Exception as exc:
            failed.append(f"Hunyuan3D-2 status refresh: {exc}")

        # HY-Motion-1.0
        try:
            _hym = getattr(init, "hymotion_helpers", None)
            if _hym and hasattr(_hym, "check_hymotion_availability"):
                avail, msg = _hym.check_hymotion_availability()
                fixed.append(
                    f"HY-Motion-1.0 status refreshed: {'available' if avail else 'not available'}"
                )
        except Exception as exc:
            failed.append(f"HY-Motion-1.0 status refresh: {exc}")

        # ZoeDepth — clear the TTL cache so next UI draw probes with fresh paths
        try:
            _zdh = getattr(init, "zoedepth_helpers", None)
            if _zdh and hasattr(_zdh, "clear_availability_cache"):
                _zdh.clear_availability_cache()
                fixed.append("ZoeDepth availability cache cleared (will re-probe on next draw)")
        except Exception as exc:
            failed.append(f"ZoeDepth cache clear: {exc}")

        # RigNet — invalidate ui_panels TTL cache
        try:
            _up = getattr(init, "ui_panels", None)
            if _up and hasattr(_up, "_invalidate_rignet_cache"):
                _up._invalidate_rignet_cache()
                fixed.append("RigNet status cache invalidated (will re-probe on next draw)")
        except Exception as exc:
            failed.append(f"RigNet cache invalidate: {exc}")

        # ── Step 6: apply persisted Mossy PyTorch path ────────────────────────
        # If Mossy previously sent a set_pytorch_path command and it was saved in
        # prefs.pytorch_path, ensure it is in sys.path for this session even when
        # Mossy is not currently connected (e.g. Mossy not yet started).
        if prefs_mod:
            try:
                prefs = prefs_mod.get_preferences()
                if prefs:
                    _pt_path = getattr(prefs, "pytorch_path", "").strip()
                    if _pt_path and os.path.isdir(_pt_path) and _pt_path not in sys.path:
                        sys.path.insert(0, _pt_path)
                        fixed.append(f"Mossy PyTorch path applied to sys.path: {_pt_path}")
                    elif _pt_path and _pt_path in sys.path:
                        fixed.append(f"Mossy PyTorch path already in sys.path: {_pt_path}")
            except Exception as exc:
                failed.append(f"apply Mossy pytorch_path: {exc}")

        # ── Report ────────────────────────────────────────────────────────────
        print("[ FO4 Auto-Fix ] Results:")
        for item in fixed:
            print(f"  ✓ {item}")
        for item in failed:
            print(f"  ✗ {item}")
        print(f"[ FO4 Auto-Fix ] Done - {len(fixed)} fixed, {len(failed)} failed\n")

        if failed:
            self.report(
                {'WARNING'},
                f"Auto-Fix: {len(fixed)} repaired, {len(failed)} could not be fixed - "
                "check System Console for details",
            )
        else:
            self.report(
                {'INFO'},
                f"Auto-Fix: {len(fixed)} action(s) completed - "
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
