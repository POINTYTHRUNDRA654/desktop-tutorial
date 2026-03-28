#!/usr/bin/env python3
"""
run_diagnostics.py — Fallout 4 Mod Assistant Static Diagnostics
================================================================

Run this script from a Windows Command Prompt or PowerShell BEFORE loading
the addon in Blender to catch problems that would prevent it from loading.

Usage
-----
  From inside the addon folder:
      python run_diagnostics.py

  Pointing at the addon folder from anywhere:
      python run_diagnostics.py "C:\\path\\to\\blender_game_tools"

No Blender installation is required.  This is a plain Python 3.8+ script.

What it checks
--------------
  1. All required files are present (DEVELOPMENT_NOTES.md, __init__.py, etc.)
  2. blender_manifest.toml is valid and version numbers are consistent
  3. Every .py file in the addon parses without a SyntaxError
  4. RECURRING BUG #1 — duplicate operator class bodies in operators.py
  5. RECURRING BUG #1 — tutorial_operators / setup_operators class coverage
  6. RECURRING BUG #1 — module order in __init__.py
  7. RECURRING BUG #6 — module-level TORCH_AVAILABLE pattern
  8. All .py modules referenced in __init__.py exist on disk

Exit code
---------
  0  — no failures (warnings are OK)
  1  — at least one FAIL was reported
"""

import ast
import os
import re
import sys
from pathlib import Path

# ── Output helpers ────────────────────────────────────────────────────────────

_counts = {"ok": 0, "warn": 0, "fail": 0}


def _ok(msg: str):
    _counts["ok"] += 1
    print(f"  \u2713 {msg}")


def _warn(msg: str):
    _counts["warn"] += 1
    print(f"  \u26a0 {msg}")


def _fail(msg: str):
    _counts["fail"] += 1
    print(f"  \u2717 {msg}")


def _info(msg: str):
    print(f"  \u00b7 {msg}")


def _section(title: str):
    print(f"\n[{title}]")


# ── Individual checks ─────────────────────────────────────────────────────────

def check_critical_files(addon_dir: Path):
    _section("Critical Files")
    required = [
        "__init__.py",
        "operators.py",
        "ui_panels.py",
        "preferences.py",
        "tutorial_operators.py",
        "setup_operators.py",
        "blender_manifest.toml",
        "DEVELOPMENT_NOTES.md",
    ]
    for name in required:
        path = addon_dir / name
        if path.exists():
            size = path.stat().st_size
            _ok(f"{name}  ({size:,} bytes)")
        else:
            _fail(f"{name}  MISSING — this file must exist")


def check_manifest(addon_dir: Path):
    _section("blender_manifest.toml")
    manifest_path = addon_dir / "blender_manifest.toml"
    if not manifest_path.exists():
        _warn("blender_manifest.toml not found — extension may not load in Blender 4.2+")
        return

    content = manifest_path.read_text(encoding="utf-8")

    for field in ("id", "version", "name", "blender_version_min"):
        if re.search(rf"^\s*{field}\s*=", content, re.MULTILINE):
            _ok(f"field '{field}' present")
        else:
            _fail(f"field '{field}' MISSING from manifest")

    # Cross-check version with bl_info in __init__.py
    init_path = addon_dir / "__init__.py"
    if init_path.exists():
        init_text = init_path.read_text(encoding="utf-8")
        m_manifest = re.search(r'^version\s*=\s*"([^"]+)"', content, re.MULTILINE)
        m_bl_info  = re.search(r'"version"\s*:\s*\((\d+),\s*(\d+),\s*(\d+)\)', init_text)
        if m_manifest and m_bl_info:
            manifest_ver = m_manifest.group(1)
            bl_info_ver  = (
                f"{m_bl_info.group(1)}.{m_bl_info.group(2)}.{m_bl_info.group(3)}"
            )
            if manifest_ver == bl_info_ver:
                _ok(f"version consistent: manifest={manifest_ver}, bl_info={bl_info_ver}")
            else:
                _warn(
                    f"version mismatch — manifest says {manifest_ver!r} but "
                    f"bl_info says {bl_info_ver!r}; keep them in sync"
                )
        elif m_manifest:
            _info(f"manifest version: {m_manifest.group(1)}")
        elif m_bl_info:
            _info(f"bl_info version: {m_bl_info.group(1)}.{m_bl_info.group(2)}.{m_bl_info.group(3)}")


def check_syntax(addon_dir: Path):
    _section("Python Syntax (all .py files)")
    # Collect .py files, skip __pycache__ and hidden directories
    py_files = sorted(
        p for p in addon_dir.rglob("*.py")
        if "__pycache__" not in p.parts and not any(part.startswith(".") for part in p.parts)
    )
    error_count = 0
    for path in py_files:
        rel = str(path.relative_to(addon_dir))
        try:
            source = path.read_text(encoding="utf-8", errors="replace")
            ast.parse(source, filename=rel)
            _ok(rel)
        except SyntaxError as exc:
            _fail(f"{rel}: SyntaxError at line {exc.lineno}: {exc.msg}")
            error_count += 1
        except Exception as exc:
            _warn(f"{rel}: could not parse ({exc})")
    if error_count == 0:
        _info("All Python files parsed without SyntaxError")


def check_known_patterns(addon_dir: Path):
    """Check for the recurring bugs documented in DEVELOPMENT_NOTES.md."""
    _section("Known-Issue Patterns (DEVELOPMENT_NOTES.md)")

    # ── RECURRING BUG #6: module-level TORCH_AVAILABLE ───────────────────────
    # These helpers must NOT evaluate find_spec("torch") at import time because
    # that happens before register() restores the custom PyTorch path.
    bug6_files = [
        "hunyuan3d_helpers.py",
        "hymotion_helpers.py",
        "zoedepth_helpers.py",
    ]
    for fname in bug6_files:
        path = addon_dir / fname
        if not path.exists():
            _info(f"{fname}: not present (optional)")
            continue
        text  = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        found_bad = False
        for i, line in enumerate(lines, 1):
            stripped = line.lstrip()
            # Bad pattern: module-level assignment  TORCH_AVAILABLE = ... find_spec ...
            if (
                stripped.startswith("TORCH_AVAILABLE")
                and "find_spec" in stripped
                and not stripped.startswith("def ")
                and not stripped.startswith("#")
            ):
                _fail(
                    f"{fname}:{i} — module-level TORCH_AVAILABLE=find_spec(...) "
                    "(RECURRING BUG #6 — must be a lazy function, not evaluated at import time)"
                )
                found_bad = True
                break
        if not found_bad:
            _ok(f"{fname}: TORCH_AVAILABLE pattern OK")

    # ── RECURRING BUG #1a: duplicate class bodies in operators.py ─────────────
    ops_path = addon_dir / "operators.py"
    if ops_path.exists():
        text = ops_path.read_text(encoding="utf-8")
        for cls in (
            "FO4_OT_InstallPythonDeps",
            "FO4_OT_SelfTest",
            "FO4_OT_ReloadAddon",
        ):
            # A real class body has "bl_idname" or "def execute" directly after the
            # class declaration line (allowing for a docstring).
            pattern = re.compile(
                rf"^class {cls}\s*\([^)]*\):\s*\n"
                rf"(?:[ \t]+\"\"\".*?\"\"\"[ \t]*\n)?"
                rf"[ \t]+(bl_idname|def )",
                re.MULTILINE,
            )
            if pattern.search(text):
                _fail(
                    f"operators.py: class {cls} has a full body here "
                    "(RECURRING BUG #1 — these classes must only live in setup_operators.py; "
                    "remove the body from operators.py)"
                )
            else:
                _ok(f"operators.py: {cls} not duplicated")

    # ── RECURRING BUG #1b: tutorial_operators class coverage ─────────────────
    tut_path = addon_dir / "tutorial_operators.py"
    if tut_path.exists():
        text = tut_path.read_text(encoding="utf-8")
        for cls in (
            "FO4_OT_ShowDetailedSetup",
            "FO4_OT_StartTutorial",
            "FO4_OT_ShowHelp",
            "FO4_OT_ShowCredits",
        ):
            if f"class {cls}" in text:
                _ok(f"tutorial_operators.py: {cls} defined")
            else:
                _fail(f"tutorial_operators.py: {cls} MISSING")

    # ── RECURRING BUG #1c: setup_operators class coverage ────────────────────
    setup_path = addon_dir / "setup_operators.py"
    if setup_path.exists():
        text = setup_path.read_text(encoding="utf-8")
        for cls in (
            "FO4_OT_InstallPythonDeps",
            "FO4_OT_SelfTest",
            "FO4_OT_ReloadAddon",
        ):
            if f"class {cls}" in text:
                _ok(f"setup_operators.py: {cls} defined")
            else:
                _fail(f"setup_operators.py: {cls} MISSING")

    # ── RECURRING BUG #1d: module order in __init__.py ───────────────────────
    init_path = addon_dir / "__init__.py"
    if init_path.exists():
        lines = init_path.read_text(encoding="utf-8").splitlines()
        tut_line  = next((i for i, l in enumerate(lines) if "tutorial_operators," in l), None)
        setup_line = next((i for i, l in enumerate(lines) if "setup_operators," in l), None)
        ops_line  = next((i for i, l in enumerate(lines) if l.strip() == "operators,"), None)

        if tut_line is not None and ops_line is not None:
            if tut_line < ops_line:
                _ok(
                    f"__init__.py: tutorial_operators (line {tut_line + 1}) "
                    f"is before operators (line {ops_line + 1})"
                )
            else:
                _fail(
                    f"__init__.py: tutorial_operators (line {tut_line + 1}) "
                    f"is AFTER operators (line {ops_line + 1}) — RECURRING BUG #1"
                )
        else:
            if tut_line is None:
                _warn("__init__.py: 'tutorial_operators,' not found in modules list")
            if ops_line is None:
                _warn("__init__.py: 'operators,' not found in modules list")

        if setup_line is not None and ops_line is not None:
            if setup_line < ops_line:
                _ok(
                    f"__init__.py: setup_operators (line {setup_line + 1}) "
                    f"is before operators (line {ops_line + 1})"
                )
            else:
                _fail(
                    f"__init__.py: setup_operators (line {setup_line + 1}) "
                    f"is AFTER operators (line {ops_line + 1}) — RECURRING BUG #1"
                )

        # Check that _ensure_tutorial_operators and _ensure_setup_operators are called
        full_text = "\n".join(lines)
        for fn in ("_ensure_tutorial_operators", "_ensure_setup_operators"):
            call_count = full_text.count(f"{fn}()")
            if call_count >= 2:
                _ok(f"__init__.py: {fn}() called {call_count} time(s)")
            elif call_count == 1:
                _warn(f"__init__.py: {fn}() called only once — should be called in both register() and _deferred_startup()")
            else:
                _fail(f"__init__.py: {fn}() never called — RECURRING BUG #1 safety net is missing")


def check_module_coverage(addon_dir: Path):
    """Warn about .py files in the addon folder that are not imported in __init__.py."""
    _section("Module Coverage (__init__.py imports)")
    init_path = addon_dir / "__init__.py"
    if not init_path.exists():
        _fail("__init__.py not found — cannot check coverage")
        return

    init_text = init_path.read_text(encoding="utf-8")

    # Standalone scripts / test helpers that are intentionally not imported
    skip = {
        "__init__.py",
        "run_diagnostics.py",
        "build_addon.py",
        "test_addon_integrity.py",
        "addon_diagnostics.py",   # registered via __init__.py; not imported as a standalone script
    }

    for path in sorted(addon_dir.glob("*.py")):
        if path.name in skip or path.name.startswith("_"):
            continue
        module_name = path.stem  # strip .py
        if module_name in init_text:
            _ok(f"{module_name}: imported in __init__.py")
        else:
            _warn(f"{module_name}: NOT found in __init__.py — may not be loaded by Blender")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) > 1:
        addon_dir = Path(sys.argv[1]).resolve()
    else:
        addon_dir = Path(__file__).resolve().parent

    sep = "=" * 64
    print(f"\n{sep}")
    print("  FO4 MOD ASSISTANT — STATIC DIAGNOSTICS")
    print(f"  Addon directory: {addon_dir}")
    print(sep)

    if not addon_dir.exists():
        print(f"\nERROR: Directory not found: {addon_dir}")
        sys.exit(1)

    check_critical_files(addon_dir)
    check_manifest(addon_dir)
    check_syntax(addon_dir)
    check_known_patterns(addon_dir)
    check_module_coverage(addon_dir)

    print(f"\n{sep}")
    print(
        f"  SUMMARY: {_counts['ok']} OK \u00b7 "
        f"{_counts['fail']} FAILED \u00b7 "
        f"{_counts['warn']} WARNINGS"
    )
    if _counts["fail"] == 0 and _counts["warn"] == 0:
        print("  All checks passed \u2713")
    elif _counts["fail"] == 0:
        print("  No failures, but review the warnings above.")
    else:
        print("  Failures found \u2014 fix the items marked \u2717 before loading in Blender.")
    print(sep + "\n")

    sys.exit(1 if _counts["fail"] > 0 else 0)


if __name__ == "__main__":
    main()
