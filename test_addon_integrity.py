"""
test_addon_integrity.py
=======================
Standalone (no Blender required) test suite for the Fallout 4 Tutorial Add-on.

Checks that the add-on will load and show all its buttons correctly inside
Blender by catching common issues *before* deployment:

  1. Syntax errors – every .py file must parse cleanly.
  2. Missing modules – every module referenced by _try_import / _safe_import
     and every bare  ``from . import X``  inside a draw() method must have
     a corresponding X.py file on disk.
  3. Operator gaps – every operator ID string passed to layout.operator() in
     ui_panels.py must be registered in operators.py or in a helper module
     that registers its own classes (asset_library.py etc.).
  4. Duplicate panel bl_idname values – each bl_idname must appear exactly
     once so Blender doesn't silently drop one of the duplicates.
  5. Invalid icons – a set of icon names that were removed from Blender 4/5
     and cause ValueError during panel draw, making all buttons below them
     disappear.
  6. Module completeness – every module listed in the __init__.py modules
     list must exist on disk.

Run with:
    python3 test_addon_integrity.py
"""

import ast
import os
import re
import sys
import unittest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
ADDON_DIR = os.path.dirname(os.path.abspath(__file__))


def _path(filename):
    return os.path.join(ADDON_DIR, filename)


def _py_files():
    """Return all .py filenames (basename only) in the addon directory."""
    return sorted(
        f for f in os.listdir(ADDON_DIR)
        if f.endswith(".py")
    )


def _read(filename):
    with open(_path(filename), encoding="utf-8") as fh:
        return fh.read()


# ---------------------------------------------------------------------------
# Test 1 – Syntax checks
# ---------------------------------------------------------------------------
class TestSyntax(unittest.TestCase):
    """Every .py file in the add-on must be valid Python."""

    def _check(self, filename):
        source = _read(filename)
        try:
            ast.parse(source, filename=filename)
        except SyntaxError as exc:
            self.fail(f"SyntaxError in {filename}: {exc}")

    def test_all_files_parse(self):
        errors = []
        for f in _py_files():
            source = _read(f)
            try:
                ast.parse(source, filename=f)
            except SyntaxError as exc:
                errors.append(f"{f}: {exc}")
        if errors:
            self.fail(
                f"{len(errors)} file(s) have syntax errors:\n"
                + "\n".join(f"  {e}" for e in errors)
            )


# ---------------------------------------------------------------------------
# Test 2 – Missing modules
# ---------------------------------------------------------------------------
class TestModulesPresent(unittest.TestCase):
    """All modules referenced in imports must have a corresponding .py file."""

    # Modules that are genuinely optional and known to be absent
    # (e.g. third-party Blender extensions registered by the user).
    ALLOWED_MISSING = {
        # mossy_link.py now ships as a stub – no longer in ALLOWED_MISSING
    }

    def _module_exists(self, name):
        return os.path.isfile(_path(f"{name}.py"))

    def test_init_try_imports(self):
        """__init__.py: every _try_import("X") must have X.py on disk."""
        source = _read("__init__.py")
        refs = re.findall(r'_try_import\(\s*["\']([^"\']+)["\']\s*\)', source)
        missing = [
            m for m in refs
            if m not in self.ALLOWED_MISSING and not self._module_exists(m)
        ]
        if missing:
            self.fail(
                "__init__.py _try_import() references missing modules:\n"
                + "\n".join(f"  {m}.py" for m in sorted(missing))
            )

    def test_ui_panels_safe_imports(self):
        """ui_panels.py: every _safe_import("X") must have X.py on disk."""
        source = _read("ui_panels.py")
        refs = re.findall(r'_safe_import\(\s*["\']([^"\']+)["\']\s*\)', source)
        missing = [
            m for m in refs
            if m not in self.ALLOWED_MISSING and not self._module_exists(m)
        ]
        if missing:
            self.fail(
                "ui_panels.py _safe_import() references missing modules:\n"
                + "\n".join(f"  {m}.py" for m in sorted(missing))
            )

    def test_draw_method_direct_imports(self):
        """
        Bare 'from . import X' inside draw() methods must have X.py on disk.

        A bare import that is NOT wrapped in try/except will crash the entire
        panel, hiding every button below it.  We flag both the missing file
        AND any bare (unwrapped) import so both problems are caught early.
        """
        source = _read("ui_panels.py")
        tree = ast.parse(source, filename="ui_panels.py")

        # Collect line numbers of every try: block to know which imports are safe
        try_ranges = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Try):
                for child in ast.walk(node):
                    try_ranges.add(getattr(child, 'lineno', None))

        issues = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom):
                continue
            # Only care about relative imports: `from . import X`
            if node.level != 1:
                continue
            for alias in node.names:
                mod_name = alias.name
                if mod_name in self.ALLOWED_MISSING:
                    continue
                if not self._module_exists(mod_name):
                    issues.append(
                        f"  line {node.lineno}: 'from . import {mod_name}' "
                        f"— {mod_name}.py NOT FOUND ON DISK"
                    )
                elif node.lineno not in try_ranges:
                    # The module exists but the import is bare (no try/except)
                    issues.append(
                        f"  line {node.lineno}: 'from . import {mod_name}' "
                        f"— import is NOT inside a try/except block "
                        f"(crashes draw() if import fails)"
                    )

        if issues:
            self.fail(
                "ui_panels.py has unsafe/missing direct imports inside draw():\n"
                + "\n".join(issues)
            )


# ---------------------------------------------------------------------------
# Test 3 – Operator registration gaps
# ---------------------------------------------------------------------------
class TestOperatorsRegistered(unittest.TestCase):
    """Every fo4.* operator used in ui_panels.py must be registered."""

    def _collect_registered_ids(self):
        """
        Collect all bl_idname values from operators.py and helper modules that
        have their own register() / classes tuple (e.g. asset_library.py).
        """
        ids = set()
        # Files that define and register their own operator classes
        files_to_scan = [
            "operators.py",
            "tutorial_operators.py",
            "asset_library.py",
        ]
        pattern = re.compile(r'bl_idname\s*=\s*["\']([^"\']+)["\']')
        for fname in files_to_scan:
            fpath = _path(fname)
            if os.path.isfile(fpath):
                ids.update(pattern.findall(_read(fname)))
        return ids

    def test_all_used_operators_registered(self):
        source = _read("ui_panels.py")
        used = set(re.findall(r'\.operator\(\s*["\']([^"\']+)["\']', source))
        # Filter to only fo4.* operators (wm.* etc. are Blender built-ins)
        used_fo4 = {op for op in used if op.startswith("fo4.")}

        registered = self._collect_registered_ids()

        missing = used_fo4 - registered
        if missing:
            self.fail(
                f"{len(missing)} operator(s) used in ui_panels.py are NOT registered:\n"
                + "\n".join(f"  {op}" for op in sorted(missing))
            )


# ---------------------------------------------------------------------------
# Test 4 – Duplicate panel bl_idname values
# ---------------------------------------------------------------------------
class TestNoDuplicatePanelIds(unittest.TestCase):
    """Each panel bl_idname must be unique (duplicates cause silent overwrites)."""

    def test_unique_panel_bl_idnames(self):
        source = _read("ui_panels.py")
        # Collect all bl_idname values assigned inside Panel class bodies
        pattern = re.compile(r'\bbl_idname\s*=\s*["\']([^"\']+)["\']')
        ids = pattern.findall(source)

        from collections import Counter
        seen = Counter(ids)
        duplicates = {k: v for k, v in seen.items() if v > 1}

        if duplicates:
            self.fail(
                "Duplicate bl_idname values found in ui_panels.py:\n"
                + "\n".join(
                    f"  '{k}' appears {v} times" for k, v in sorted(duplicates.items())
                )
            )


# ---------------------------------------------------------------------------
# Test 5 – Invalid / removed Blender icons
# ---------------------------------------------------------------------------
class TestNoInvalidIcons(unittest.TestCase):
    """
    Certain icon names were removed in Blender 4/5.  Using them raises
    ValueError during panel draw(), which makes every button below the
    offending call invisible.
    """

    # Icons that are known to have been removed in Blender 4.0+
    REMOVED_ICONS = {
        "FACE_MAPS",        # Removed when Face Maps feature was dropped
        "SNAP_FACE",        # Removed in Blender 4
        "SNAP_FACE_CENTER", # Removed in Blender 4
        "AXIS_SIDE",        # Renamed/removed
        "COLORSET_01_VEC",  # Removed
    }

    def _check_file(self, filename):
        source = _read(filename)
        bad = []
        pattern = re.compile(r"icon\s*=\s*['\"]([A-Z_]+)['\"]")
        for m in pattern.finditer(source):
            icon_name = m.group(1)
            if icon_name in self.REMOVED_ICONS:
                line = source[:m.start()].count("\n") + 1
                bad.append(f"  line {line}: icon='{icon_name}'")
        return bad

    def test_no_removed_icons_in_ui_panels(self):
        bad = self._check_file("ui_panels.py")
        if bad:
            self.fail(
                "ui_panels.py uses removed Blender icons (will crash panel draw):\n"
                + "\n".join(bad)
            )

    def test_no_removed_icons_in_operators(self):
        bad = self._check_file("operators.py")
        if bad:
            self.fail(
                "operators.py uses removed Blender icons:\n"
                + "\n".join(bad)
            )


# ---------------------------------------------------------------------------
# Test 6 – __init__.py modules list completeness
# ---------------------------------------------------------------------------
class TestInitModulesComplete(unittest.TestCase):
    """
    Every module listed in the __init__.py 'modules' list must exist on disk.
    Missing modules cause KeyError / AttributeError during register() and
    silently drop all their panels / operators.
    """

    ALLOWED_MISSING = {
        # mossy_link.py now ships as a stub – no longer in ALLOWED_MISSING
    }

    def test_modules_list_files_exist(self):
        source = _read("__init__.py")
        # Find all variable names used in the modules list
        # The modules list is a list(...filter(...[..., var, ...])) expression.
        # We rely on the fact that _try_import is always called as:
        #   module_var = _try_import("module_name")
        # so the variable names match module names.
        refs = re.findall(r'_try_import\(\s*["\']([^"\']+)["\']\s*\)', source)
        missing = []
        for m in refs:
            if m in self.ALLOWED_MISSING:
                continue
            if not os.path.isfile(_path(f"{m}.py")):
                missing.append(f"{m}.py")
        if missing:
            self.fail(
                "__init__.py imports modules that don't exist on disk:\n"
                + "\n".join(f"  {m}" for m in sorted(missing))
            )


# ---------------------------------------------------------------------------
# Test 7 – All panels have draw() methods
# ---------------------------------------------------------------------------
class TestAllPanelsHaveDrawMethod(unittest.TestCase):
    """Every panel class registered in the classes tuple must define draw()."""

    def test_panels_have_draw(self):
        source = _read("ui_panels.py")
        tree = ast.parse(source, filename="ui_panels.py")

        # Collect panel class names from the classes tuple at module level
        classes_in_tuple = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "classes":
                        # Walk the value (a Tuple or Call)
                        for elt in ast.walk(node.value):
                            if isinstance(elt, ast.Name):
                                classes_in_tuple.add(elt.id)

        # Collect class definitions and check for draw()
        defined_classes = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                has_draw = any(
                    isinstance(item, ast.FunctionDef) and item.name == "draw"
                    for item in node.body
                )
                defined_classes[node.name] = has_draw

        missing_draw = [
            name for name in classes_in_tuple
            if name in defined_classes and not defined_classes[name]
            and name.startswith("FO4_PT_")
        ]
        if missing_draw:
            self.fail(
                "Panel class(es) are registered but missing a draw() method:\n"
                + "\n".join(f"  {n}" for n in sorted(missing_draw))
            )


# ---------------------------------------------------------------------------
# Test 8 – addon_integration module provides required interface
# ---------------------------------------------------------------------------
class TestAddonIntegrationInterface(unittest.TestCase):
    """
    addon_integration.py must expose AddonIntegrationSystem.scan_for_known_addons()
    and that method must return a list of dicts with the expected keys.
    """

    REQUIRED_KEYS = {
        "addon_id", "name", "description", "fo4_use_cases",
        "is_enabled", "is_installed",
    }

    def test_module_exists(self):
        self.assertTrue(
            os.path.isfile(_path("addon_integration.py")),
            "addon_integration.py is missing — FO4_PT_AddonIntegrationPanel will crash",
        )

    def test_scan_returns_list_of_dicts(self):
        """scan_for_known_addons() must return a non-empty list of dicts."""
        # Import using importlib so we don't need bpy on the path
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "addon_integration", _path("addon_integration.py")
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        result = mod.AddonIntegrationSystem.scan_for_known_addons()
        self.assertIsInstance(result, list, "scan_for_known_addons() must return a list")
        self.assertGreater(len(result), 0, "scan_for_known_addons() returned empty list")

        for item in result:
            self.assertIsInstance(item, dict, f"Each entry must be a dict, got: {type(item)}")
            for key in self.REQUIRED_KEYS:
                self.assertIn(
                    key, item,
                    f"Missing required key '{key}' in addon entry: {item.get('name', '?')}"
                )

    def test_register_unregister_callable(self):
        """addon_integration must expose register() and unregister() callables."""
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "addon_integration", _path("addon_integration.py")
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        self.assertTrue(callable(getattr(mod, "register", None)),
                        "addon_integration.register() not callable")
        self.assertTrue(callable(getattr(mod, "unregister", None)),
                        "addon_integration.unregister() not callable")


# ---------------------------------------------------------------------------
# Test 9 – multiprocessing.connection sub-module explicit import
# ---------------------------------------------------------------------------
class TestMultiprocessingConnectionImport(unittest.TestCase):
    """
    Any file that uses ``multiprocessing.connection.Connection`` (or other
    symbols from the ``multiprocessing.connection`` sub-module) must also
    contain an explicit ``import multiprocessing.connection`` statement.

    Without the explicit import, Blender's embedded Python raises
    ``AttributeError: module 'multiprocessing' has no attribute 'connection'``
    at module load time, preventing the entire module from registering.
    """

    def test_connection_submodule_explicitly_imported(self):
        errors = []
        for fname in _py_files():
            source = _read(fname)
            if "multiprocessing.connection." not in source:
                continue
            # The file references the sub-module — ensure it's explicitly imported
            if "import multiprocessing.connection" not in source:
                errors.append(
                    f"  {fname}: uses 'multiprocessing.connection.*' but "
                    f"'import multiprocessing.connection' is absent"
                )
        if errors:
            self.fail(
                "File(s) reference multiprocessing.connection without importing it "
                "(causes AttributeError in Blender's Python):\n"
                + "\n".join(errors)
            )


# ---------------------------------------------------------------------------
# Test 10 – No nested f-string backslash (Python ≤3.11 compatibility)
# ---------------------------------------------------------------------------
class TestNoNestedFStringBackslash(unittest.TestCase):
    """
    Python ≤3.11 raises SyntaxError when a backslash appears inside an
    f-string expression block ``{...}``.  This includes nested f-strings
    that contain backslash escapes in their string literal parts.

    Blender 5.0 ships Python 3.11, so any nested f-string with a backslash
    inside the outer f-string's ``{...}`` expression will crash the module
    at import time.  Python 3.12 relaxed this restriction (which is why
    ``ast.parse()`` on Python 3.12 doesn't catch it).

    We detect this by walking the AST: if a ``JoinedStr`` (f-string) contains
    a ``FormattedValue`` (expression part) whose sub-tree itself contains
    another ``JoinedStr`` that has a ``Constant`` string value with a
    backslash, that is an incompatible pattern.
    """

    def test_no_nested_fstring_with_backslash(self):
        errors = []
        for fname in _py_files():
            source = _read(fname)
            try:
                tree = ast.parse(source, filename=fname)
            except SyntaxError:
                continue  # Syntax errors are caught by Test 1

            for node in ast.walk(tree):
                if not isinstance(node, ast.JoinedStr):
                    continue
                # Iterate over the expression parts of this outer f-string
                for fv in node.values:
                    if not isinstance(fv, ast.FormattedValue):
                        continue
                    # Walk the expression to find nested f-strings
                    for inner in ast.walk(fv.value):
                        if not isinstance(inner, ast.JoinedStr):
                            continue
                        # Check the string-literal parts of the nested f-string
                        for inner_val in inner.values:
                            if (
                                isinstance(inner_val, ast.Constant)
                                and isinstance(inner_val.value, str)
                                and "\\" in inner_val.value
                            ):
                                lineno = getattr(inner, "lineno", 0)
                                errors.append(
                                    f"  {fname}:{lineno}: nested f-string with "
                                    f"backslash in string literal "
                                    f"(SyntaxError on Python ≤3.11 / Blender 5.x)"
                                )
                                break  # one report per nested f-string is enough

        if errors:
            self.fail(
                "Nested f-string(s) with backslash detected — pre-compute the value "
                "in a plain variable *before* the outer f-string:\n"
                + "\n".join(errors)
            )


# ---------------------------------------------------------------------------
# Test 11 – tutorial_operators.py contains the four critical welcome operators
# ---------------------------------------------------------------------------
class TestTutorialOperatorsModule(unittest.TestCase):
    """
    tutorial_operators.py must exist, parse without errors, and define
    register()/unregister() callables plus all four operators that are
    referenced unconditionally in FO4_PT_MainPanel.
    """

    REQUIRED_IDNAMES = {
        "fo4.show_detailed_setup",
        "fo4.start_tutorial",
        "fo4.show_help",
        "fo4.show_credits",
    }

    def test_module_exists(self):
        self.assertTrue(
            os.path.isfile(_path("tutorial_operators.py")),
            "tutorial_operators.py is missing from the repository",
        )

    def test_module_parses(self):
        source = _read("tutorial_operators.py")
        try:
            ast.parse(source, filename="tutorial_operators.py")
        except SyntaxError as exc:
            self.fail(f"tutorial_operators.py has a syntax error: {exc}")

    def test_required_operators_defined(self):
        source = _read("tutorial_operators.py")
        pattern = re.compile(r'bl_idname\s*=\s*["\']([^"\']+)["\']')
        found = set(pattern.findall(source))
        missing = self.REQUIRED_IDNAMES - found
        if missing:
            self.fail(
                "tutorial_operators.py is missing required operator bl_idnames:\n"
                + "\n".join(f"  {op}" for op in sorted(missing))
            )

    def test_register_unregister_callable(self):
        source = _read("tutorial_operators.py")
        tree = ast.parse(source, filename="tutorial_operators.py")
        fn_names = {
            node.name
            for node in ast.walk(tree)
            if isinstance(node, ast.FunctionDef)
        }
        for fn in ("register", "unregister"):
            self.assertIn(
                fn,
                fn_names,
                f"tutorial_operators.py must expose a '{fn}()' function",
            )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
