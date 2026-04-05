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
        """Parse each .py file for syntax errors. Prints progress for debugging."""
        errors = []
        files = _py_files()
        for i, f in enumerate(files, 1):
            # Print progress to help debug hangs under debugger
            print(f"  [{i}/{len(files)}] Parsing: {f}...", flush=True)
            try:
                source = _read(f)
                ast.parse(source, filename=f)
            except SyntaxError as exc:
                errors.append(f"{f}: {exc}")
            except Exception as exc:
                # Catch any other exceptions (e.g., file encoding issues)
                errors.append(f"{f}: {type(exc).__name__}: {exc}")

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
        return (
            os.path.isfile(_path(f"{name}.py"))
            or os.path.isfile(_path(os.path.join(name, "__init__.py")))
            or os.path.isfile(_path(os.path.join(*name.split("."), "__init__.py")))
        )

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
                        f"- {mod_name}.py NOT FOUND ON DISK"
                    )
                elif node.lineno not in try_ranges:
                    # The module exists but the import is bare (no try/except)
                    issues.append(
                        f"  line {node.lineno}: 'from . import {mod_name}' "
                        f"- import is NOT inside a try/except block "
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
            "install_operators.py",
            "ai_gen_operators.py",
            "tutorial_operators.py",
            "setup_operators.py",
            "addon_diagnostics.py",
            "asset_library.py",
            "torch_path_manager.py",
            "texture_helpers/conversion_operators.py",
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

    def test_own_prefix_operators_registered(self):
        """Every operator whose prefix we OWN (wm.*, torch.*) that is used in
        ui_panels.py must also be defined in one of our operator files.

        This complements test_all_used_operators_registered which only checks
        fo4.* - it closes the gap that lets wm.mossy_link_toggle and
        torch.install_custom_path silently vanish when their classes are
        removed or renamed.

        Prefixes checked:
          fo4.*   - exclusively ours, all must be in our files
          torch.* - exclusively ours, all must be in our files
          wm.*    - shared with Blender; only flag ops not in KNOWN_BLENDER_OPERATORS
                    and not defined in our files
        """
        # Blender built-in wm.* operators we call but do NOT define ourselves.
        # Only add entries here for genuine Blender built-ins (verified in the
        # Blender Python API docs); anything else must have a bl_idname in one
        # of our operator files.
        KNOWN_BLENDER_OPERATORS = {
            "wm.url_open",   # bpy.ops.wm.url_open() - opens a URL in the OS browser
        }

        registered = self._collect_registered_ids()

        # Exclusively-ours prefixes (no Blender built-in uses fo4.* or torch.*)
        EXCLUSIVELY_OURS_PREFIXES = {"fo4.", "torch."}

        source = _read("ui_panels.py")
        used = set(re.findall(r'\.operator\(\s*["\']([^"\']+)["\']', source))

        missing = set()
        for op in used:
            if op in KNOWN_BLENDER_OPERATORS:
                continue  # explicit Blender built-in, skip
            prefix = op.split(".")[0] + "."
            if prefix in EXCLUSIVELY_OURS_PREFIXES and op not in registered:
                # fo4.* or torch.* that we don't define
                missing.add(op)
            elif prefix == "wm." and op not in registered:
                # wm.* operator that's not a known Blender built-in and not ours
                missing.add(op)

        if missing:
            self.fail(
                f"{len(missing)} operator(s) with our own prefix used in "
                f"ui_panels.py are NOT registered in any operator file:\n"
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

    # Icons that are known to have been removed in Blender 4.0+/5.0+
    REMOVED_ICONS = {
        "FACE_MAPS",        # Removed when Face Maps feature was dropped
        "SNAP_FACE",        # Removed in Blender 4
        "SNAP_FACE_CENTER", # Removed in Blender 4
        "AXIS_SIDE",        # Renamed/removed
        "COLORSET_01_VEC",  # Removed
        "STAR",             # Removed in Blender 5.0 – use FUND instead
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

    def test_no_removed_icons_in_tutorial_operators(self):
        bad = self._check_file("tutorial_operators.py")
        if bad:
            self.fail(
                "tutorial_operators.py uses removed Blender icons (will crash credits draw):\n"
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
            if not (
                os.path.isfile(_path(f"{m}.py"))
                or os.path.isfile(_path(os.path.join(m, "__init__.py")))
                or os.path.isfile(_path(os.path.join(*m.split("."), "__init__.py")))
            ):
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
            "addon_integration.py is missing - FO4_PT_AddonIntegrationPanel will crash",
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
            # The file references the sub-module - ensure it's explicitly imported
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
# Test 10 – bpy.props imports must be inside try/except in worker-process modules
# ---------------------------------------------------------------------------
class TestBpyPropsInsideTryInWorkerModules(unittest.TestCase):
    """
    Files that spawn multiprocessing worker processes (``ctx.Process(...)``) are
    reimported inside the child process, which has *no* Blender environment.
    Any bare ``from bpy.props import ...`` **outside** the ``try: import bpy``
    block will crash the worker on startup with::

        ModuleNotFoundError: No module named 'bpy'

    This is RECURRING BUG #6.  The fix: move ``from bpy.props import ...``
    inside the same ``try`` block that guards ``import bpy``.

    This test uses AST analysis to enforce the rule.
    """

    def _bpy_props_outside_try(self, source: str) -> bool:
        """Return True if the source has a bare ``from bpy.props import`` at
        module level outside any try/except block."""
        import ast

        class Checker(ast.NodeVisitor):
            def __init__(self):
                self.found = False
                self._try_depth = 0

            def visit_Try(self, node):
                self._try_depth += 1
                self.generic_visit(node)
                self._try_depth -= 1

            def visit_ImportFrom(self, node):
                if node.module == "bpy.props" and self._try_depth == 0:
                    self.found = True

        try:
            tree = ast.parse(source)
        except SyntaxError:
            return False
        checker = Checker()
        checker.visit(tree)
        return checker.found

    def test_bpy_props_inside_try_in_worker_modules(self):
        """Worker-process modules must not have bare ``from bpy.props import``
        at module level (outside any try/except)."""
        errors = []
        # Patterns that indicate a file spawns worker subprocesses
        _WORKER_PATTERNS = (
            "ctx.Process(",
            "mp.Process(",
            ".Process(target=",
            "multiprocessing.Process(",
            "ProcessPoolExecutor(",
        )
        for fname in _py_files():
            source = _read(fname)
            # Only check files that actually spawn worker processes
            if not any(pat in source for pat in _WORKER_PATTERNS):
                continue
            if self._bpy_props_outside_try(source):
                errors.append(
                    f"  {fname}: spawns worker processes but has "
                    f"'from bpy.props import' outside try/except "
                    f"(will crash in worker subprocess - see RECURRING BUG #6)"
                )
        if errors:
            self.fail(
                "Worker-process module(s) have bare 'from bpy.props import' "
                "at module level:\n" + "\n".join(errors)
            )


# ---------------------------------------------------------------------------
# Test 11 – No nested f-string backslash (Python ≤3.11 compatibility)
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
                "Nested f-string(s) with backslash detected - pre-compute the value "
                "in a plain variable *before* the outer f-string:\n"
                + "\n".join(errors)
            )


# ---------------------------------------------------------------------------
# Test 12 – tutorial_operators.py contains the four critical welcome operators
# ---------------------------------------------------------------------------
class TestTutorialOperatorsModule(unittest.TestCase):
    """
    tutorial_operators.py must exist, parse without errors, and define
    register()/unregister() callables plus all four operators used in
    FO4_PT_MainPanel.  Each operator call in the panel must be guarded with
    ``hasattr(bpy.types, 'ClassName')`` so that a registration failure does
    not cause ``rna_uiItemO: unknown operator`` spam (RECURRING BUG #1).
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

    def test_hasattr_guards_present_in_ui_panels(self):
        """Each tutorial operator call in ui_panels.py must be protected by one of:

          (a) an inline ``hasattr(bpy.types, 'ClassName')`` check, OR
          (b) a call to the ``_activation_op(layout, 'ClassName', ...)`` helper,
              which performs the hasattr check internally and always draws the
              button (safe on Blender 5.x where bare hasattr is unreliable).

        Both forms prevent 'rna_uiItemO: unknown operator' console spam on
        every UI redraw when an operator is not yet registered.

        IMPORTANT - RECURRING BUG #1 (see DEVELOPMENT_NOTES.md):
          Do NOT replace _activation_op() calls with a bare hasattr if/else
          that shows a label in the else-branch.  On Blender 5.x the hasattr
          check can return False even for registered operators; a label
          else-branch silently hides the button from the user.
        """
        source = _read("ui_panels.py")
        # Map Blender type-name → bl_idname expected in the operator() call.
        guard_checks = {
            "FO4_OT_ShowDetailedSetup": "fo4.show_detailed_setup",
            "FO4_OT_StartTutorial": "fo4.start_tutorial",
            "FO4_OT_ShowHelp": "fo4.show_help",
            "FO4_OT_ShowCredits": "fo4.show_credits",
        }
        failures = []
        for type_name, idname in guard_checks.items():
            # Form (a): inline hasattr(bpy.types, 'FO4_OT_Xxx')
            inline_pattern = re.compile(
                r"hasattr\s*\(\s*bpy\.types\s*,\s*['\"]"
                + re.escape(type_name)
                + r"['\"]\s*\)"
            )
            # Form (b): _activation_op(layout, 'FO4_OT_Xxx', ...)
            # The helper calls hasattr(bpy.types, cls_name) internally and
            # always draws the button - prevents the "loading..." label problem
            # on Blender 5.x where hasattr(bpy.types, ...) is unreliable.
            helper_pattern = re.compile(
                r"_activation_op\s*\([^,]+,\s*['\"]"
                + re.escape(type_name)
                + r"['\"]\s*,"
            )
            if not inline_pattern.search(source) and not helper_pattern.search(source):
                failures.append(
                    f"  {idname}: missing hasattr guard or _activation_op() call "
                    f"for '{type_name}' in ui_panels.py"
                )
        if failures:
            self.fail(
                "The following tutorial operators are missing activation guards "
                "in ui_panels.py (RECURRING BUG #1 – see DEVELOPMENT_NOTES.md):\n"
                + "\n".join(failures)
            )


# ---------------------------------------------------------------------------
# Test 13 – Scene properties used in .prop(scene, "X") calls are registered
# ---------------------------------------------------------------------------
class TestScenePropsRegistered(unittest.TestCase):
    """Every scene property referenced in a layout.prop(scene, "X") call in
    ui_panels.py must be registered in at least one .py file via either
    ``bpy.types.Scene.X = bpy.props.*`` or an equivalent setattr/list pattern.

    This catches the class of bug where a new panel widget references a scene
    property that was never added to any module's register() function, which
    Blender silently reports as "property not found: Scene.X" on every redraw.
    """

    # Files that use a list/setattr pattern to register scene props instead of
    # the standard ``bpy.types.Scene.X = bpy.props.*`` assignment.
    # Maps filename → list of prop name strings found via custom logic.
    _LIST_PATTERN_FILES = {
        "asset_library.py",
    }

    def _collect_registered_scene_props(self):
        """Return the set of Scene property names registered across all .py files."""
        registered = set()

        # Pattern 1 (most modules): bpy.types.Scene.PROP = bpy.props.*
        # Also catches: bpy.types.Scene.PROP = SomePropType(  (without bpy.props. prefix)
        pat1 = re.compile(r'bpy\.types\.Scene\.(\w+)\s*=\s*\w')

        # Pattern 2 (asset_library.py setattr list):
        # ("prop_name", SomePropType(...))  as items in a list assigned to _SCENE_PROPS
        pat2 = re.compile(r'["\'](fo4_\w+)["\']\s*,\s*\w+Property\s*\(')

        for fname in _py_files():
            src = _read(fname)
            registered.update(pat1.findall(src))
            if fname in self._LIST_PATTERN_FILES:
                registered.update(pat2.findall(src))

        return registered

    def test_all_scene_props_registered(self):
        """Every .prop(scene, "X") call in ui_panels.py must have a registered Scene.X."""
        source = _read("ui_panels.py")

        # Extract prop names from all layout.prop(scene, "prop_name") calls.
        # We match any chained attribute owner (col.prop, row.prop, box.prop …)
        # followed by the variable name 'scene' as the first argument.
        prop_calls = re.findall(
            r'\.prop\(\s*scene\s*,\s*["\']([^"\']+)["\']', source
        )
        used = set(prop_calls)

        registered = self._collect_registered_scene_props()

        missing = used - registered
        if missing:
            self.fail(
                f"{len(missing)} scene property/ies used in ui_panels.py "
                f"layout.prop(scene, ...) calls are NOT registered in any .py file:\n"
                + "\n".join(f"  {p}" for p in sorted(missing))
            )



# ---------------------------------------------------------------------------
# Test 14 – torch_path_manager.py defines and registers PyTorch operators
# ---------------------------------------------------------------------------
class TestTorchPathManagerOperators(unittest.TestCase):
    """
    torch_path_manager.py must define BOTH PyTorch operators used in
    ui_panels.py (torch.recheck_status and torch.install_custom_path) with
    matching bl_idname values, and must expose register()/unregister()
    callables so Blender can activate them.

    This test verifies that:
      1. torch_path_manager.py exists on disk.
      2. It parses without syntax errors.
      3. Both operator bl_idnames are defined.
      4. register() and unregister() functions are present.
      5. The bl_idnames used in ui_panels.py all appear in the file, so the
         operators are genuinely registered by the add-on (not just called
         from the UI without being defined).
    """

    REQUIRED_IDNAMES = {
        "torch.recheck_status",
        "torch.install_custom_path",
    }

    def test_module_exists(self):
        self.assertTrue(
            os.path.isfile(_path("torch_path_manager.py")),
            "torch_path_manager.py is missing - PyTorch operators will be unavailable",
        )

    def test_module_parses(self):
        source = _read("torch_path_manager.py")
        try:
            ast.parse(source, filename="torch_path_manager.py")
        except SyntaxError as exc:
            self.fail(f"torch_path_manager.py has a syntax error: {exc}")

    def test_required_operators_defined(self):
        """Both torch.* bl_idnames must be present in torch_path_manager.py."""
        source = _read("torch_path_manager.py")
        pattern = re.compile(r'bl_idname\s*=\s*["\']([^"\']+)["\']')
        found = set(pattern.findall(source))
        missing = self.REQUIRED_IDNAMES - found
        if missing:
            self.fail(
                "torch_path_manager.py is missing required operator bl_idnames "
                "(Blender will show 'unknown operator' for these buttons):\n"
                + "\n".join(f"  {op}" for op in sorted(missing))
            )

    def test_register_unregister_callable(self):
        """torch_path_manager.py must expose register() and unregister()."""
        source = _read("torch_path_manager.py")
        tree = ast.parse(source, filename="torch_path_manager.py")
        fn_names = {
            node.name
            for node in ast.walk(tree)
            if isinstance(node, ast.FunctionDef)
        }
        for fn in ("register", "unregister"):
            self.assertIn(
                fn,
                fn_names,
                f"torch_path_manager.py must expose a '{fn}()' function so "
                f"Blender can activate the PyTorch operators",
            )

    def test_torch_operators_used_in_ui_are_defined(self):
        """Every torch.* operator called in ui_panels.py must be defined in
        torch_path_manager.py (the only file that registers torch.* operators).

        This is the definitive registration check: if a bl_idname is referenced
        in the UI but missing from torch_path_manager.py the operator button
        silently does nothing in Blender and the console shows
        'rna_uiItemO: unknown operator'.
        """
        ui_source = _read("ui_panels.py")
        used_torch_ops = {
            op
            for op in re.findall(r'\.operator\(\s*["\']([^"\']+)["\']', ui_source)
            if op.startswith("torch.")
        }

        tpm_source = _read("torch_path_manager.py")
        registered = set(
            re.findall(r'bl_idname\s*=\s*["\']([^"\']+)["\']', tpm_source)
        )

        missing = used_torch_ops - registered
        if missing:
            self.fail(
                f"{len(missing)} torch.* operator(s) are called in ui_panels.py "
                f"but NOT defined in torch_path_manager.py:\n"
                + "\n".join(f"  {op}" for op in sorted(missing))
            )


# ---------------------------------------------------------------------------
# Test 15 – mossy_link registers before torch-dependent modules
# ---------------------------------------------------------------------------
class TestMossyLinkRegistrationOrder(unittest.TestCase):
    """
    mossy_link.register() loads the Mossy-provided PyTorch path from prefs and
    inserts it into sys.path.  This must happen BEFORE any module that needs
    torch (rignet_helpers, shap_e_helpers, point_e_helpers, hunyuan3d_helpers,
    hymotion_helpers, zoedepth_helpers) is registered.

    If mossy_link appears after those modules in the __init__.py modules list
    the PyTorch path won't be in sys.path when they register, which causes
    WinError 1114 / ImportError on first use even when Mossy is running.

    We also verify that the pytorch_path preference property exists in
    preferences.py so the Mossy-supplied path survives a Blender restart.
    """

    # Modules that depend on torch and therefore must appear AFTER mossy_link.
    TORCH_DEPENDENT = {
        "rignet_helpers",
        "shap_e_helpers",
        "point_e_helpers",
        "hunyuan3d_helpers",
        "hymotion_helpers",
        "zoedepth_helpers",
    }

    def _modules_list_order(self):
        """Return the ordered list of module names from __init__.py's modules list."""
        source = _read("__init__.py")
        tree = ast.parse(source, filename="__init__.py")

        # Find the assignment: modules = list(filter(_filter, [...]))
        # Walk top-level assignments to find `modules = list(filter(...))`
        for node in ast.walk(tree):
            if not isinstance(node, ast.Assign):
                continue
            for target in node.targets:
                if not (isinstance(target, ast.Name) and target.id == "modules"):
                    continue
                # The value should be a Call to list(filter(..., [...]))
                call = node.value
                if not isinstance(call, ast.Call):
                    continue
                # Drill into list(filter(func, list_arg))
                # list( filter(_filter, [...]) )
                if len(call.args) < 1:
                    continue
                inner = call.args[0]  # filter(...)
                if not isinstance(inner, ast.Call):
                    continue
                if len(inner.args) < 2:
                    continue
                list_arg = inner.args[1]  # the [...] literal
                if not isinstance(list_arg, (ast.List, ast.Tuple)):
                    continue
                names = []
                for elt in list_arg.elts:
                    if isinstance(elt, ast.Name):
                        names.append(elt.id)
                    elif isinstance(elt, ast.Attribute):
                        names.append(elt.attr)
                return names
        return []

    def test_mossy_link_before_torch_dependent_modules(self):
        """mossy_link must appear before all torch-dependent module entries."""
        order = self._modules_list_order()
        self.assertTrue(
            order,
            "__init__.py modules list could not be parsed – check the list syntax",
        )
        self.assertIn(
            "mossy_link",
            order,
            "mossy_link is not in the __init__.py modules list",
        )
        mossy_idx = order.index("mossy_link")

        for dep in self.TORCH_DEPENDENT:
            if dep not in order:
                continue  # module not in list (optional), skip
            dep_idx = order.index(dep)
            self.assertLess(
                mossy_idx,
                dep_idx,
                f"mossy_link (index {mossy_idx}) must appear before "
                f"{dep} (index {dep_idx}) in the __init__.py modules list. "
                f"mossy_link.register() loads the Mossy PyTorch path into "
                f"sys.path and must run first.",
            )

    def test_mossy_link_immediately_after_preferences(self):
        """mossy_link should be the second entry (right after preferences)."""
        order = self._modules_list_order()
        self.assertTrue(order, "__init__.py modules list could not be parsed")
        self.assertIn("preferences", order, "preferences not in modules list")
        self.assertIn("mossy_link", order, "mossy_link not in modules list")
        prefs_idx = order.index("preferences")
        mossy_idx = order.index("mossy_link")
        self.assertEqual(
            mossy_idx,
            prefs_idx + 1,
            f"mossy_link should be at index {prefs_idx + 1} (immediately after "
            f"preferences at {prefs_idx}) so the PyTorch path is in sys.path "
            f"before any torch-dependent module registers. "
            f"Currently mossy_link is at index {mossy_idx}.",
        )

    def test_pytorch_path_property_in_preferences(self):
        """FO4AddonPreferences must define a pytorch_path StringProperty.

        mossy_link._store_pytorch_path_in_prefs() writes to prefs.pytorch_path
        and mossy_link._load_pytorch_path_from_prefs() reads it.  If the
        property does not exist in the class definition the path is never
        persisted and Blender will lose it on restart.
        """
        source = _read("preferences.py")
        self.assertIn(
            "pytorch_path",
            source,
            "preferences.py must define a 'pytorch_path' StringProperty so the "
            "Mossy-provided PyTorch path survives Blender restarts. "
            "mossy_link._store_pytorch_path_in_prefs() and "
            "_load_pytorch_path_from_prefs() depend on this property.",
        )

    def test_deferred_startup_reapplies_mossy_pytorch_path(self):
        """deferred_startup() must re-apply the Mossy PyTorch path before AI caches run.

        RECURRING BUG #13: mossy_link.register() calls _load_pytorch_path_from_prefs()
        synchronously, but get_preferences() can return None on some Blender builds /
        platforms during early registration (before the preference store is fully
        initialised).  If the path is not in sys.path by the time hunyuan3d_helpers,
        hymotion_helpers, and zoedepth_helpers caches run in step 6b of
        deferred_startup(), the AI tools are shown as unavailable at startup even when
        the user's Mossy PyTorch path is correctly saved.

        Fix: deferred_startup() (startup_helpers.py) must call
        mossy_link._load_pytorch_path_from_prefs() as a safety net BEFORE the AI-tool
        availability caches run in step 6b so the path is definitely in sys.path.
        """
        source = _read("startup_helpers.py")
        self.assertIn(
            "_load_pytorch_path_from_prefs",
            source,
            "startup_helpers.deferred_startup() must call "
            "mossy_link._load_pytorch_path_from_prefs() before the AI-tool "
            "availability caches run in step 6b (RECURRING BUG #13). "
            "mossy_link.register() may have found get_preferences() returning "
            "None during early registration, so the safety-net re-apply call "
            "inside deferred_startup() ensures the path is in sys.path by the "
            "time hunyuan3d_helpers / hymotion_helpers / zoedepth_helpers check.",
        )


# ---------------------------------------------------------------------------
# Test 16 – PyTorch warning / tool availability cache (RECURRING BUG #11)
# ---------------------------------------------------------------------------
class TestPyTorchWarningAndToolCaching(unittest.TestCase):
    """Regression tests for the two persistent problems that have recurred
    multiple times across this add-on:

      Problem A – False "PyTorch is required" warning after a successful install
        Root cause: install functions hard-coded the warning string instead of
        checking at runtime whether torch was actually missing.  Additionally,
        the check ignored the Mossy bridge: when PyTorch runs inside the Mossy
        desktop app, ``importlib.util.find_spec("torch")`` always returns None
        even though torch IS available.

      Problem B – Tool status shows "Not checked" / "Not installed" on every
        Blender restart, forcing the user to click "Install" again
        Root cause 1: ``get_cached_availability()`` was missing from
          hunyuan3d_helpers.py → the UI always fell back to the None/"not
          checked" branch.
        Root cause 2: ``AVAILABLE`` globals were initialised to ``False`` so
          register() cached a stale False immediately (before torch paths were
          restored), and ``clear_availability_cache()`` also reset to False
          instead of None.
        Root cause 3: the helpers' ``register()`` ran availability checks before
          ``restore_extra_python_paths()`` had added torch_custom_path to
          sys.path — so the first cached result was always wrong.
        Root cause 4: ``deferred_startup()`` did not refresh the caches, leaving
          the UI showing stale status for the entire session unless the user
          manually clicked "Check Status".

    These tests verify the structural properties of the fix so that any future
    change that reintroduces one of these root causes will immediately fail CI.
    No Blender runtime is required — all checks are pure source / AST analysis.
    """

    # ------------------------------------------------------------------ helpers

    def _functions_in(self, source: str) -> set:
        """Return the set of top-level and method function names in *source*."""
        tree = ast.parse(source)
        return {
            node.name
            for node in ast.walk(tree)
            if isinstance(node, ast.FunctionDef)
        }

    def _assignment_values_in_func(self, source: str, func_name: str,
                                   target_name: str) -> list:
        """Return AST constant values assigned to *target_name* inside *func_name*.

        Useful for checking e.g. that ``HUNYUAN3D_AVAILABLE = None`` (not False)
        appears inside ``clear_availability_cache()``.
        """
        tree = ast.parse(source)
        values = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.FunctionDef) or node.name != func_name:
                continue
            for stmt in ast.walk(node):
                if not isinstance(stmt, ast.Assign):
                    continue
                for target in stmt.targets:
                    tname = (target.id if isinstance(target, ast.Name)
                             else getattr(target, 'attr', None))
                    if tname == target_name:
                        val = stmt.value
                        if isinstance(val, ast.Constant):
                            values.append(val.value)
                        elif isinstance(val, ast.NameConstant):   # Python 3.7
                            values.append(val.value)
        return values

    # =====================================================================
    # Section A: _torch_install_note() correctness
    # =====================================================================

    def test_torch_install_note_defined_in_tool_installers(self):
        """tool_installers.py must define _torch_install_note()."""
        source = _read("tool_installers.py")
        self.assertIn(
            "_torch_install_note",
            self._functions_in(source),
            "_torch_install_note() is missing from tool_installers.py — "
            "all AI-tool install functions depend on it to suppress the "
            "false 'PyTorch required' warning when torch is already available.",
        )

    def test_torch_install_note_checks_mossy_bridge(self):
        """_torch_install_note() must check the Mossy bridge status.

        When PyTorch runs inside the Mossy desktop app, find_spec('torch')
        returns None even though torch IS available.  Without a Mossy check the
        warning fires on every install even when the user has a working setup.
        """
        source = _read("tool_installers.py")
        self.assertIn(
            "mossy_bridge_status",
            source,
            "_torch_install_note() in tool_installers.py does not check "
            "'mossy_bridge_status'.  When PyTorch is provided by Mossy, "
            "find_spec('torch') returns None and the warning fires spuriously. "
            "Add the same Mossy-bridge check used by _mossy_provides_torch().",
        )

    def test_torch_install_note_checks_use_mossy_as_ai_pref(self):
        """_torch_install_note() must also check the use_mossy_as_ai preference."""
        source = _read("tool_installers.py")
        self.assertIn(
            "use_mossy_as_ai",
            source,
            "_torch_install_note() in tool_installers.py does not check the "
            "'use_mossy_as_ai' preference.  Users who enabled 'Use Mossy as AI' "
            "should never see the PyTorch required warning.",
        )

    def test_no_hardcoded_pytorch_warning_in_install_functions(self):
        """No AI-tool install function may contain a hardcoded PyTorch warning.

        The warning must always be produced by calling _torch_install_note()
        so the Mossy-bridge check is applied uniformly.
        """
        source = _read("tool_installers.py")
        # Find every return statement that yields a tuple ending with the
        # hardcoded warning string.
        hardcoded = "PyTorch is required at runtime - install via the Settings panel."
        # We allow the string to appear once inside _torch_install_note() itself
        # (the function that conditionally returns it), but nowhere else.
        occurrences = [
            i + 1
            for i, line in enumerate(source.splitlines())
            if hardcoded in line
        ]
        # _torch_install_note returns it conditionally — that one occurrence is fine.
        non_note_occurrences = []
        tree = ast.parse(source)
        note_func_lines = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == "_torch_install_note":
                for child in ast.walk(node):
                    if hasattr(child, 'lineno'):
                        note_func_lines.add(child.lineno)
        for lineno in occurrences:
            if lineno not in note_func_lines:
                non_note_occurrences.append(lineno)

        if non_note_occurrences:
            self.fail(
                f"Hardcoded PyTorch warning string found outside "
                f"_torch_install_note() on line(s) {non_note_occurrences} in "
                f"tool_installers.py.  All install functions must call "
                f"_torch_install_note() so the Mossy-bridge check is applied."
            )

    def test_all_ai_install_functions_use_torch_install_note(self):
        """Every AI-tool install function must call _torch_install_note()."""
        source = _read("tool_installers.py")
        install_fns = [
            "install_zoedepth",
            "install_triposr",
            "install_hunyuan3d",
            "install_hymotion",
            "install_rignet",
            "install_motion_diffuse",
        ]
        tree = ast.parse(source)
        missing = []
        for fn_name in install_fns:
            fn_node = next(
                (n for n in ast.walk(tree)
                 if isinstance(n, ast.FunctionDef) and n.name == fn_name),
                None,
            )
            if fn_node is None:
                missing.append(f"{fn_name} (function not found)")
                continue
            # Check that _torch_install_note is called inside this function
            calls = [
                n.func.id if isinstance(n.func, ast.Name) else ""
                for n in ast.walk(fn_node)
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
            ]
            if "_torch_install_note" not in calls:
                missing.append(fn_name)

        if missing:
            self.fail(
                f"AI-tool install function(s) do NOT call _torch_install_note():\n"
                + "\n".join(f"  {n}" for n in missing)
                + "\nAdd `_torch_install_note()` to the success return so the "
                "PyTorch warning is only shown when torch is genuinely missing."
            )

    # =====================================================================
    # Section B: get_cached_availability() must exist in AI helpers
    # =====================================================================

    def test_get_cached_availability_in_hunyuan3d_helpers(self):
        """hunyuan3d_helpers.py must define get_cached_availability().

        The UI panel (FO4_PT_SetupAIHunyuan3D) calls this function via
        ``hasattr(hunyuan3d_helpers, 'get_cached_availability')``.  When it is
        absent the panel always falls back to (None, 'status unavailable') and
        shows 'Not checked' on every restart — forcing the user to click
        'Check Status' manually after every Blender restart.
        """
        source = _read("hunyuan3d_helpers.py")
        fns = self._functions_in(source)
        self.assertIn(
            "get_cached_availability",
            fns,
            "hunyuan3d_helpers.py is missing get_cached_availability().  "
            "The Hunyuan3D panel will show 'Not checked' on every restart.",
        )

    def test_get_cached_availability_in_hymotion_helpers(self):
        """hymotion_helpers.py must define get_cached_availability()."""
        source = _read("hymotion_helpers.py")
        fns = self._functions_in(source)
        self.assertIn(
            "get_cached_availability",
            fns,
            "hymotion_helpers.py is missing get_cached_availability().  "
            "The HY-Motion panel will hammer the filesystem on every UI redraw.",
        )

    # =====================================================================
    # Section C: AVAILABLE globals initialised to None, not False
    # =====================================================================

    def test_hunyuan3d_available_initialised_to_none(self):
        """HUNYUAN3D_AVAILABLE must be initialised to None (not False).

        None = "not yet checked"; False = "checked and unavailable".  Starting
        at False means the UI shows 'Not installed' before any check has run,
        which is misleading and causes users to click 'Install' unnecessarily.
        """
        source = _read("hunyuan3d_helpers.py")
        self.assertIn(
            "HUNYUAN3D_AVAILABLE = None",
            source,
            "hunyuan3d_helpers.py initialises HUNYUAN3D_AVAILABLE to something "
            "other than None.  It must be None so the UI shows 'Not checked' "
            "before the deferred startup check runs.",
        )
        self.assertNotIn(
            "HUNYUAN3D_AVAILABLE = False",
            source,
            "hunyuan3d_helpers.py initialises HUNYUAN3D_AVAILABLE to False. "
            "Use None so the UI shows 'Not checked' before startup check.",
        )

    def test_hymotion_available_initialised_to_none(self):
        """HYMOTION_AVAILABLE must be initialised to None (not False)."""
        source = _read("hymotion_helpers.py")
        self.assertIn(
            "HYMOTION_AVAILABLE = None",
            source,
            "hymotion_helpers.py initialises HYMOTION_AVAILABLE to something "
            "other than None.  It must be None.",
        )
        self.assertNotIn(
            "HYMOTION_AVAILABLE = False",
            source,
            "hymotion_helpers.py initialises HYMOTION_AVAILABLE to False. "
            "Use None so the UI shows 'Not checked' before startup check.",
        )

    # =====================================================================
    # Section D: clear_availability_cache() resets to None, not False
    # =====================================================================

    def test_hunyuan3d_clear_cache_resets_to_none(self):
        """clear_availability_cache() in hunyuan3d_helpers must set AVAILABLE=None.

        If it resets to False, the UI shows 'Not installed' immediately after
        clicking 'Install' (before the re-check runs), making it look like the
        install failed.
        """
        source = _read("hunyuan3d_helpers.py")
        vals = self._assignment_values_in_func(
            source, "clear_availability_cache", "HUNYUAN3D_AVAILABLE"
        )
        self.assertTrue(
            vals,
            "clear_availability_cache() in hunyuan3d_helpers.py does not "
            "assign to HUNYUAN3D_AVAILABLE — reset is missing.",
        )
        self.assertNotIn(
            False,
            vals,
            "clear_availability_cache() in hunyuan3d_helpers.py resets "
            "HUNYUAN3D_AVAILABLE to False instead of None. "
            "The UI will show 'Not installed' before the re-check runs.",
        )
        self.assertIn(
            None,
            vals,
            "clear_availability_cache() in hunyuan3d_helpers.py does not "
            "reset HUNYUAN3D_AVAILABLE to None.",
        )

    def test_hymotion_clear_cache_resets_to_none(self):
        """clear_availability_cache() in hymotion_helpers must set AVAILABLE=None."""
        source = _read("hymotion_helpers.py")
        vals = self._assignment_values_in_func(
            source, "clear_availability_cache", "HYMOTION_AVAILABLE"
        )
        self.assertTrue(
            vals,
            "clear_availability_cache() in hymotion_helpers.py does not "
            "assign to HYMOTION_AVAILABLE — reset is missing.",
        )
        self.assertNotIn(False, vals,
            "clear_availability_cache() in hymotion_helpers.py resets "
            "HYMOTION_AVAILABLE to False instead of None.")
        self.assertIn(None, vals,
            "clear_availability_cache() in hymotion_helpers.py does not "
            "reset HYMOTION_AVAILABLE to None.")

    def test_zoedepth_clear_cache_resets_module_globals(self):
        """clear_availability_cache() in zoedepth_helpers must also reset globals.

        Without this, the module-level ZOEDEPTH_AVAILABLE stays False from
        register()-time even after the TTL cache has been cleared.
        """
        source = _read("zoedepth_helpers.py")
        vals = self._assignment_values_in_func(
            source, "clear_availability_cache", "ZOEDEPTH_AVAILABLE"
        )
        self.assertTrue(
            vals,
            "clear_availability_cache() in zoedepth_helpers.py does not "
            "assign to ZOEDEPTH_AVAILABLE.  The module-level global stays "
            "stale after the TTL cache is cleared.",
        )
        self.assertIn(
            None,
            vals,
            "clear_availability_cache() in zoedepth_helpers.py does not "
            "reset ZOEDEPTH_AVAILABLE to None.",
        )

    # =====================================================================
    # Section E: register() must NOT run availability checks at load time
    # =====================================================================

    def _register_calls_check(self, source: str, check_fn: str) -> bool:
        """Return True if register() calls *check_fn* in its body."""
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if not isinstance(node, ast.FunctionDef) or node.name != "register":
                continue
            for child in ast.walk(node):
                if not isinstance(child, ast.Call):
                    continue
                fn = child.func
                name = fn.id if isinstance(fn, ast.Name) else getattr(fn, 'attr', '')
                if name == check_fn:
                    return True
        return False

    def test_hunyuan3d_register_does_not_check_availability(self):
        """hunyuan3d_helpers.register() must NOT call check_hunyuan3d_availability().

        At register() time, torch_custom_path has not been added to sys.path yet
        (that happens later in __init__.register() via restore_extra_python_paths()).
        Calling the check here caches a False result that the UI then shows for
        the entire session.  The deferred_startup() handles the first real check.
        """
        source = _read("hunyuan3d_helpers.py")
        called = self._register_calls_check(source, "check_hunyuan3d_availability")
        self.assertFalse(
            called,
            "hunyuan3d_helpers.register() calls check_hunyuan3d_availability(). "
            "This caches a wrong False result before torch paths are set up. "
            "Remove the call — deferred_startup() performs the first real check.",
        )

    def test_hymotion_register_does_not_check_availability(self):
        """hymotion_helpers.register() must NOT call check_hymotion_availability()."""
        source = _read("hymotion_helpers.py")
        called = self._register_calls_check(source, "check_hymotion_availability")
        self.assertFalse(
            called,
            "hymotion_helpers.register() calls check_hymotion_availability() "
            "before torch paths are ready.  Remove it — use deferred_startup().",
        )

    def test_zoedepth_register_does_not_check_availability(self):
        """zoedepth_helpers.register() must NOT call check_zoedepth_availability()."""
        source = _read("zoedepth_helpers.py")
        called = self._register_calls_check(source, "check_zoedepth_availability")
        self.assertFalse(
            called,
            "zoedepth_helpers.register() calls check_zoedepth_availability() "
            "before torch paths are ready.  Remove it — use deferred_startup().",
        )

    # =====================================================================
    # Section F: deferred_startup() refreshes all tool caches
    # =====================================================================

    def test_deferred_startup_refreshes_hunyuan3d_cache(self):
        """startup_helpers.deferred_startup() must call check_hunyuan3d_availability().

        This is the deferred first check that runs ~2 s after load, by which
        time torch_custom_path is in sys.path.  Without it the user sees stale
        'Not checked' status until they manually click 'Check Status'.
        """
        source = _read("startup_helpers.py")
        self.assertIn(
            "check_hunyuan3d_availability",
            source,
            "startup_helpers.py does not call check_hunyuan3d_availability(). "
            "deferred_startup() must probe Hunyuan3D after torch paths are set "
            "up so the panel shows correct status on every restart.",
        )

    def test_deferred_startup_refreshes_hymotion_cache(self):
        """startup_helpers.deferred_startup() must call check_hymotion_availability()."""
        source = _read("startup_helpers.py")
        self.assertIn(
            "check_hymotion_availability",
            source,
            "startup_helpers.py does not call check_hymotion_availability(). "
            "Add a deferred re-check so HY-Motion status is correct on restart.",
        )

    def test_deferred_startup_invalidates_zoedepth_cache(self):
        """startup_helpers.deferred_startup() must refresh the ZoeDepth status at startup."""
        source = _read("startup_helpers.py")
        self.assertIn(
            "check_zoedepth_availability",
            source,
            "startup_helpers.py does not call check_zoedepth_availability() for "
            "ZoeDepth.  Without this the deferred-startup check is skipped and "
            "diagnostics reports 'status not yet checked' until a UI draw occurs.",
        )

    def test_deferred_startup_invalidates_rignet_cache(self):
        """startup_helpers.deferred_startup() must populate the RigNet status cache at startup."""
        source = _read("startup_helpers.py")
        self.assertIn(
            "_cached_rignet_status",
            source,
            "startup_helpers.py does not call _cached_rignet_status(). "
            "Without this the RigNet panel and diagnostics show 'cache invalidated' "
            "on every startup until the RigNet panel draws for the first time.",
        )

    # =====================================================================
    # Section G: install operators re-probe after a successful install
    # =====================================================================

    def test_hunyuan3d_install_operator_calls_check_not_just_clear(self):
        """FO4_OT_InstallHunyuan3D must call check_hunyuan3d_availability() on success.

        Calling only clear_availability_cache() leaves the panel showing
        'Not checked' after the install completes.  The operator must run the
        fresh check so the panel immediately shows 'Available ✓'.
        """
        source = _read("install_operators.py")
        self.assertIn(
            "check_hunyuan3d_availability",
            source,
            "install_operators.py does not call check_hunyuan3d_availability() "
            "after a successful Hunyuan3D install.  The panel will show "
            "'Not checked' instead of 'Available ✓'.",
        )

    def test_hymotion_install_operator_calls_check_after_success(self):
        """FO4_OT_InstallHyMotion must call check_hymotion_availability() on success."""
        source = _read("install_operators.py")
        self.assertIn(
            "check_hymotion_availability",
            source,
            "install_operators.py does not call check_hymotion_availability() "
            "after a successful HY-Motion install.  Add the check so the panel "
            "immediately reflects the new state.",
        )

    def test_zoedepth_install_operator_calls_check_after_success(self):
        """FO4_OT_InstallZoeDepth must call check_zoedepth_availability() on success."""
        source = _read("install_operators.py")
        self.assertIn(
            "check_zoedepth_availability",
            source,
            "install_operators.py does not call check_zoedepth_availability() "
            "after a successful ZoeDepth install.  Add the check so the panel "
            "immediately reflects the new state.",
        )


# ---------------------------------------------------------------------------
# Section H: core dependency install list
# ---------------------------------------------------------------------------

class TestCoreDependencyInstallList(unittest.TestCase):
    """Verify that _version_constrained_packages() includes all required packages.

    This is a regression guard against accidentally dropping trimesh or pypdf
    from the install list, which would leave users with missing dependencies
    even after clicking 'Install Core Dependencies'.
    """

    def _get_packages(self) -> list[str]:
        """Extract the package list from _version_constrained_packages() source."""
        source = _read("tool_installers.py")
        # Find the function body and collect all quoted package specs
        import re
        # Match quoted strings like "trimesh>=3.20.0" or 'pypdf>=3.0.0'
        # within the _version_constrained_packages function
        fn_match = re.search(
            r"def _version_constrained_packages.*?(?=\ndef |\Z)",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(fn_match, "_version_constrained_packages not found in tool_installers.py")
        fn_body = fn_match.group(0)
        return re.findall(r'["\']([A-Za-z][^"\'>=\s]*)', fn_body)

    def test_trimesh_in_install_list(self):
        """trimesh must be included in _version_constrained_packages()."""
        pkgs = self._get_packages()
        self.assertTrue(
            any(p.lower().startswith("trimesh") for p in pkgs),
            f"trimesh is missing from _version_constrained_packages(). "
            f"Found: {pkgs}.  Add 'trimesh>=3.20.0' to all three Python-version "
            f"branches so the 'Install Core Dependencies' button installs it.",
        )

    def test_pypdf_in_install_list(self):
        """pypdf must be included in _version_constrained_packages() (not the deprecated PyPDF2)."""
        pkgs = self._get_packages()
        # Must have pypdf (the maintained successor to PyPDF2)
        self.assertTrue(
            any(p == "pypdf" for p in pkgs),
            f"pypdf is missing from _version_constrained_packages(). "
            f"Found: {pkgs}.  Add 'pypdf>=3.0.0' (not PyPDF2) to all three "
            f"Python-version branches.",
        )
        # Must NOT list the deprecated PyPDF2 package
        self.assertFalse(
            any(p == "PyPDF2" for p in pkgs),
            "Deprecated PyPDF2 found in _version_constrained_packages(). "
            "Replace with pypdf>=3.0.0 (the maintained successor).",
        )

    def test_pypdf_used_in_knowledge_helpers(self):
        """knowledge_helpers.py must import pypdf, not the deprecated PyPDF2."""
        source = _read("knowledge_helpers.py")
        self.assertIn(
            "import pypdf",
            source,
            "knowledge_helpers.py does not import pypdf.  "
            "Replace 'import PyPDF2' with 'import pypdf' and update PdfReader usage.",
        )
        self.assertNotIn(
            "import PyPDF2",
            source,
            "knowledge_helpers.py still imports the deprecated PyPDF2.  "
            "Replace with 'import pypdf'.",
        )

    def test_self_test_checks_pypdf_not_PyPDF2(self):
        """setup_operators.py self-test must check for 'pypdf', not 'PyPDF2'."""
        source = _read("setup_operators.py")
        self.assertIn(
            '"pypdf"',
            source,
            "setup_operators.py self-test does not check for 'pypdf'.  "
            "Update the core_pkgs dict to use 'pypdf' as the key.",
        )
        self.assertNotIn(
            '"PyPDF2"',
            source,
            "setup_operators.py still checks for the deprecated 'PyPDF2' import name.  "
            "Replace with 'pypdf'.",
        )


class TestPipInstallRobustness(unittest.TestCase):
    """Verify robustness improvements to _pip_install in tool_installers.py.

    These are regression guards for the bug where trimesh/pypdf remained
    [MISSING] even after clicking 'Install Core Dependencies' because:
      1. pip errors were swallowed (check_call didn't capture stderr).
      2. Packages installed to the user site-packages were not on sys.path.
      3. The UI panel's _dep_cache was never cleared after installation.
    """

    def _get_pip_install_body(self) -> str:
        return self._get_function_body("_pip_install")

    def _get_refresh_paths_body(self) -> str:
        return self._get_function_body("_refresh_import_paths")

    def _get_pip_install_requirements_body(self) -> str:
        return self._get_function_body("_pip_install_requirements")

    def _get_function_body(self, func_name: str) -> str:
        source = _read("tool_installers.py")
        import re
        m = re.search(
            rf"def {re.escape(func_name)}\b.*?(?=\ndef |\Z)",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(m, f"{func_name} not found in tool_installers.py")
        return m.group(0)

    def test_pip_install_uses_subprocess_run(self):
        """_pip_install must use subprocess.run (not check_call) to capture stderr."""
        body = self._get_pip_install_body()
        self.assertIn(
            "subprocess.run",
            body,
            "_pip_install must use subprocess.run so that stderr is captured and "
            "included in the error message.  Replace subprocess.check_call with "
            "subprocess.run(cmd, ..., capture_output=True, text=True).",
        )

    def test_pip_install_captures_stderr(self):
        """_pip_install must pass capture_output=True so pip errors are surfaced."""
        body = self._get_pip_install_body()
        self.assertIn(
            "capture_output=True",
            body,
            "_pip_install must pass capture_output=True to subprocess.run so that "
            "pip's error output is included in the failure message shown to the user.",
        )

    def test_refresh_import_paths_adds_user_site(self):
        """_refresh_import_paths must add the user site-packages dir to sys.path.

        When Blender's system site-packages is not writable, pip falls back to
        the user site directory.  That directory is often absent from Blender's
        sys.path, so packages installed there are not importable until it is
        added explicitly via site.addsitedir().
        """
        body = self._get_refresh_paths_body()
        self.assertIn(
            "addsitedir",
            body,
            "_refresh_import_paths must call site.addsitedir(user_site) to ensure "
            "packages installed to the user site-packages are immediately importable "
            "in Blender without restarting.",
        )

    def test_pip_install_calls_refresh_import_paths(self):
        """_pip_install must call _refresh_import_paths() after a successful install."""
        body = self._get_pip_install_body()
        self.assertIn(
            "_refresh_import_paths",
            body,
            "_pip_install must call _refresh_import_paths() after a successful install "
            "to flush import caches and add the user site-packages to sys.path.",
        )

    def test_invalidate_dep_cache_exists_in_ui_panels(self):
        """ui_panels.py must expose invalidate_dep_cache() for post-install refresh."""
        source = _read("ui_panels.py")
        self.assertIn(
            "def invalidate_dep_cache",
            source,
            "ui_panels.py must define invalidate_dep_cache() so that "
            "FO4_OT_InstallPythonDeps can clear the stale _dep_cache after a "
            "successful installation.  Without this, the Setup & Status panel "
            "continues to show [MISSING] for newly installed packages.",
        )

    def test_setup_operators_calls_invalidate_dep_cache(self):
        """setup_operators.py must call invalidate_dep_cache() after a successful install."""
        source = _read("setup_operators.py")
        self.assertIn(
            "invalidate_dep_cache",
            source,
            "setup_operators.py must call ui_panels.invalidate_dep_cache() after "
            "install_python_requirements() succeeds.  Without this, the _dep_cache "
            "in ui_panels.py keeps its stale False entries and the Setup & Status "
            "panel still shows [MISSING] for trimesh/pypdf after a successful install.",
        )

    def test_register_calls_refresh_import_paths_at_startup(self):
        """__init__.py register() must call _refresh_import_paths(_add_lib=False).

        Root cause of the trimesh/pypdf [MISSING] after restart bug:
          pip installs packages into the user site-packages directory (because
          Blender's system site-packages is not writable).  _refresh_import_paths()
          adds that directory to sys.path during the install session, but on the
          NEXT Blender startup sys.path reverts to defaults — Blender's bundled
          Python never includes user site-packages automatically.

        Fix: call _refresh_import_paths(_add_lib=False) at the very start of
        register() so the user site directory is on sys.path before any
        importlib.find_spec() calls or UI dependency checks run.  _add_lib=False
        skips adding _PIP_LIB_DIR (.\\lib) to sys.path here — Blender 5's
        extension policy checker monitors sys.path changes that occur during
        register() and raises "Policy violation with sys.path: .\\lib" (shown
        as a caution triangle in the add-on list) if _PIP_LIB_DIR is added.
        deferred_startup() adds _PIP_LIB_DIR after register() returns.
        """
        import re
        source = _read("__init__.py")
        # Extract the register() function body.  The pattern stops at the next
        # top-level `def ` or end of file.  register() in __init__.py has no
        # nested top-level defs (nested helpers live in startup_helpers.py), so
        # this reliably captures the whole function body including the early
        # _refresh_import_paths() call that must be present.
        m = re.search(
            r"^def register\(\).*?(?=^def unregister\b|\Z)",
            source,
            re.DOTALL | re.MULTILINE,
        )
        self.assertIsNotNone(m, "register() function not found in __init__.py")
        register_body = m.group(0)

        self.assertIn(
            "_refresh_import_paths",
            register_body,
            "__init__.py register() must call tool_installers._refresh_import_paths() "
            "at startup so the user site-packages directory is added to sys.path before "
            "any dependency checks run.  Without this, trimesh and pypdf remain [MISSING] "
            "after every Blender restart even though they were successfully installed "
            "(pip places them in user site-packages, which Blender's Python omits from "
            "sys.path by default).  Add the call at the very top of register(), before "
            "the modules-registration loop.",
        )
        # The call MUST pass _add_lib=False so Blender 5's extension policy
        # checker does not flag "Policy violation with sys.path: .\\lib".
        self.assertIn(
            "_add_lib=False",
            register_body,
            "__init__.py register() must call _refresh_import_paths(_add_lib=False). "
            "Blender 5's extension policy checker monitors sys.path changes during "
            "register() and raises 'Policy violation with sys.path: .\\lib' (shown as "
            "a caution triangle in the add-on preferences list) when _PIP_LIB_DIR is "
            "appended there.  Pass _add_lib=False to suppress the path addition in "
            "register(); deferred_startup() adds it afterwards outside the check window.",
        )

    def test_pip_install_uses_target_dir(self):
        """_pip_install must pass --target pointing to _PIP_LIB_DIR.

        Root cause of RECURRING BUG #14 (trimesh/pypdf [MISSING] after restart):
          pip may install packages to user or system site-packages, and Blender's
          embedded Python may not add those paths to sys.path at startup.  Using
          --target with a known addon-local directory guarantees packages always
          end up somewhere _refresh_import_paths() can reliably add to sys.path.
        """
        body = self._get_pip_install_body()
        self.assertIn(
            "--target",
            body,
            "_pip_install must pass '--target' to pip so packages are installed to "
            "_PIP_LIB_DIR (addon/lib/).  Without this, packages may end up in user or "
            "system site-packages directories that Blender's Python does not include in "
            "sys.path at startup, causing trimesh/pypdf to show [MISSING] after every "
            "Blender restart.",
        )

    def test_pip_install_requirements_uses_target_dir(self):
        """_pip_install_requirements must also pass --target pointing to _PIP_LIB_DIR."""
        body = self._get_pip_install_requirements_body()
        self.assertIn(
            "--target",
            body,
            "_pip_install_requirements must pass '--target' to pip so packages from "
            "requirements files are also installed to the addon-local lib/ directory.  "
            "This ensures they persist across Blender restarts in the same way as "
            "packages installed via _pip_install().",
        )

    def test_refresh_import_paths_adds_lib_dir(self):
        """_refresh_import_paths must append the addon lib/ dir to sys.path.

        The _PIP_LIB_DIR (addon/lib/) is the primary install target used by
        _pip_install() and _pip_install_requirements().  _refresh_import_paths()
        must add it to sys.path (when _add_lib=True, the default) so that
        packages installed there are importable after a Blender restart.
        """
        body = self._get_refresh_paths_body()
        self.assertIn(
            "_PIP_LIB_DIR",
            body,
            "_refresh_import_paths must add _PIP_LIB_DIR (the addon-local lib/ dir) "
            "to sys.path when _add_lib=True (the default).  This is the primary "
            "mechanism that makes pip-installed packages importable after a Blender "
            "restart.  The addsitedir(user_site) call is a secondary backward-compat "
            "fallback only.",
        )

    def test_deferred_startup_adds_pip_lib_dir_to_syspath(self):
        """deferred_startup() must call _refresh_import_paths() to add _PIP_LIB_DIR.

        register() calls _refresh_import_paths(_add_lib=False) to avoid Blender
        5's "Policy violation with sys.path: .\\lib" warning.  deferred_startup()
        — a bpy.app.timers callback that fires 2 s after load, safely outside
        the register() execution window where the policy checker runs — must call
        the full _refresh_import_paths() (without _add_lib=False) so that
        _PIP_LIB_DIR (.\\lib) is added to sys.path and pip-installed packages
        (trimesh, pypdf, …) remain importable after every Blender restart.
        """
        import re
        source = _read("startup_helpers.py")
        m = re.search(
            r"^def deferred_startup\(\).*?^(?=def |\Z)",
            source,
            re.DOTALL | re.MULTILINE,
        )
        self.assertIsNotNone(m, "deferred_startup() not found in startup_helpers.py")
        body = m.group(0)

        self.assertIn(
            "_refresh_import_paths",
            body,
            "startup_helpers.deferred_startup() must call _refresh_import_paths() "
            "(without _add_lib=False) so that _PIP_LIB_DIR is added to sys.path "
            "outside the register() window.  This prevents the Blender 5 policy "
            "checker warning while keeping pip-installed packages importable.",
        )
        # Confirm this call does NOT suppress the lib path (i.e. no _add_lib=False).
        # The full _refresh_import_paths() call must appear without that kwarg.
        self.assertIn(
            "_refresh_import_paths()",
            body,
            "startup_helpers.deferred_startup() must call _refresh_import_paths() "
            "with no arguments (or at least without _add_lib=False) so _PIP_LIB_DIR "
            "IS added to sys.path at this point.",
        )

    def test_ml_lib_dir_constant_defined(self):
        """_ML_LIB_DIR must be defined as a separate directory for heavy ML packages.

        scipy and open3d are installed to _ML_LIB_DIR (addon/lib/ml/) rather
        than _PIP_LIB_DIR (addon/lib/).  _PIP_LIB_DIR is added to sys.path at
        startup; keeping scipy/open3d out of it prevents Blender 5's extension
        policy checker from flagging their many compiled submodules as
        "Policy violation with top level module".
        """
        source = _read("tool_installers.py")
        self.assertIn(
            "_ML_LIB_DIR",
            source,
            "_ML_LIB_DIR constant must be defined in tool_installers.py.  "
            "It holds heavy ML packages (scipy, open3d) that must NOT be in "
            "_PIP_LIB_DIR because their compiled submodules cause Blender 5 "
            "extension policy violations when lib/ is on sys.path at startup.",
        )

    def test_install_rignet_uses_ml_lib_dir(self):
        """install_rignet() must install scipy/open3d to _ML_LIB_DIR, not _PIP_LIB_DIR.

        Installs to _PIP_LIB_DIR would expose scipy submodules via the startup
        sys.path, triggering Blender 5 policy violations for every compiled
        scipy extension.  By routing these packages to _ML_LIB_DIR they are
        only added to sys.path lazily (via _ensure_ml_on_path()) when
        RigNet functionality is actually invoked.
        """
        source = _read("tool_installers.py")
        import re
        m = re.search(
            r"def install_rignet\b.*?(?=\ndef |\Z)",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(m, "install_rignet not found in tool_installers.py")
        body = m.group(0)
        self.assertIn(
            "_ML_LIB_DIR",
            body,
            "install_rignet() must pass target_dir=_ML_LIB_DIR to _pip_install() "
            "so that scipy and open3d land in lib/ml/ rather than lib/.  "
            "Without this, scipy submodules are exposed on sys.path at startup "
            "and Blender 5 flags them as policy violations.",
        )

    def test_ensure_ml_on_path_defined(self):
        """_ensure_ml_on_path() must exist in tool_installers.py."""
        source = _read("tool_installers.py")
        self.assertIn(
            "def _ensure_ml_on_path",
            source,
            "_ensure_ml_on_path() must be defined in tool_installers.py.  "
            "It lazily adds _ML_LIB_DIR to sys.path right before ML packages "
            "(scipy, open3d) are imported, so they are never exposed at startup.",
        )

    def test_migrate_ml_packages_defined(self):
        """_migrate_ml_packages() must exist in tool_installers.py."""
        source = _read("tool_installers.py")
        self.assertIn(
            "def _migrate_ml_packages",
            source,
            "_migrate_ml_packages() must be defined in tool_installers.py.  "
            "It moves existing scipy/open3d installs from lib/ to lib/ml/ so "
            "users who installed RigNet before this fix stop seeing policy "
            "violation warnings on the next Blender restart.",
        )

    def test_register_calls_migrate_ml_packages(self):
        """__init__.py register() must call _migrate_ml_packages() at startup."""
        import re
        source = _read("__init__.py")
        m = re.search(
            r"^def register\(\).*?(?=^def unregister\b|\Z)",
            source,
            re.DOTALL | re.MULTILINE,
        )
        self.assertIsNotNone(m, "register() not found in __init__.py")
        register_body = m.group(0)
        self.assertIn(
            "_migrate_ml_packages",
            register_body,
            "__init__.py register() must call tool_installers._migrate_ml_packages() "
            "at startup to move any existing scipy/open3d files from lib/ to lib/ml/. "
            "Without this, users who installed RigNet before this fix continue to "
            "see Blender 5 policy violation warnings for scipy submodules.",
        )

    def test_rignet_helpers_calls_ensure_ml_on_path(self):
        """rignet_helpers.py must call _ensure_ml_on_path() before importing scipy."""
        source = _read("rignet_helpers.py")
        self.assertIn(
            "_ensure_ml_on_path",
            source,
            "rignet_helpers.py must call tool_installers._ensure_ml_on_path() "
            "before 'from scipy...' so that lib/ml/ is on sys.path at the "
            "point of import.  Without this, scipy is not found when RigNet "
            "is used after the ML lib dir change.",
        )



# ---------------------------------------------------------------------------
# Section I: dual-install detection in addon_diagnostics.py
# ---------------------------------------------------------------------------

class TestDualInstallDetection(unittest.TestCase):
    """Verify that the dual-install sys.modules check in addon_diagnostics.py
    excludes sub-modules of the CURRENT package.

    Without this guard, every sub-module (e.g. bl_ext.user_default.blender_game_tools.preferences)
    would appear in the "dupes" list and the warning would fire on every single-install run.
    """

    def _get_dupes_source(self) -> str:
        source = _read("addon_diagnostics.py")
        import re
        m = re.search(
            r"# ── 3\. Dual-install via sys\.modules.*?(?=\n    # ──)",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(m, "Check #3 (Dual-install via sys.modules) not found in addon_diagnostics.py")
        return m.group(0)

    def test_own_pkg_prefix_excluded_from_dupes(self):
        """The dupes filter must use startswith(own_pkg + '.') to exclude own sub-modules.

        A filter of `k != __package__` is NOT sufficient: it leaves all sub-modules
        in the list, producing a false-positive warning on every single-install run.
        """
        block = self._get_dupes_source()
        self.assertIn(
            "startswith(",
            block,
            "addon_diagnostics.py check #3 does not use startswith() to exclude own "
            "sub-modules from the dupes list.  Add "
            "`not (k == own_pkg or k.startswith(own_pkg + '.'))` to the filter so the "
            "warning only fires for genuinely different installs.",
        )

    def test_own_pkg_variable_used(self):
        """The filter must capture __package__ in a variable (own_pkg) before the list comp."""
        block = self._get_dupes_source()
        self.assertIn(
            "own_pkg",
            block,
            "addon_diagnostics.py check #3 should store __package__ in 'own_pkg' "
            "and use it in the dupes filter.",
        )

    def test_warning_shows_only_foreign_roots(self):
        """The warning message must report only the root package(s) of other installs.

        A dual-installed addon produces 30+ sub-module entries in sys.modules
        (one per Python file in the package).  Listing all of them makes the
        warning extremely noisy.  The check must extract only the *root* keys
        (entries that end with the bare addon name, e.g.
        "bl_ext.blender_org.blender_game_tools") and display those.

        Regression guard: the original code dumped the raw ``dupes`` list which
        contained every sub-module of the other install.
        """
        block = self._get_dupes_source()
        # The root-extraction logic must identify root keys by checking that the
        # key equals name_base OR ends with ("." + name_base).
        self.assertIn(
            "endswith",
            block,
            "addon_diagnostics.py check #3 must extract foreign ROOT packages by "
            "checking `k.endswith('.' + name_base)` so the warning shows only "
            "'bl_ext.blender_org.blender_game_tools' instead of all 30+ sub-modules.",
        )
        # The extracted roots must be stored in a dedicated variable so the warning
        # message uses them instead of the raw full list.
        self.assertIn(
            "foreign_roots",
            block,
            "addon_diagnostics.py check #3 must store root packages in 'foreign_roots' "
            "and use that in the warning, not the raw list of all foreign keys.",
        )

    def test_path_comparison_distinguishes_stale_from_genuine(self):
        """Check #3 must use physical path comparison to tell stale entries from genuine dual-installs.

        When a foreign root module's __file__ lives in the SAME directory as the
        current addon, it is a stale namespace entry (e.g. 'blender_game_tools'
        left over after switching to 'bl_ext.blender_org.blender_game_tools') and
        must be reported as INFO, NOT WARN.  Only roots in a *different* directory
        warrant the WARN.
        """
        block = self._get_dupes_source()
        # Path-comparison branch must be present.
        self.assertIn(
            "stale_roots",
            block,
            "addon_diagnostics.py check #3 must classify foreign_roots into "
            "'stale_roots' (same physical dir → INFO) and 'genuine_roots' "
            "(different dir → WARN) to avoid false-positive dual-install warnings "
            "after an extension-prefix change.",
        )
        self.assertIn(
            "genuine_roots",
            block,
            "addon_diagnostics.py check #3 must classify foreign_roots into "
            "'stale_roots' and 'genuine_roots' for accurate reporting.",
        )
        # The INFO message for stale entries must mention same physical install.
        self.assertIn(
            "same physical install",
            block,
            "addon_diagnostics.py check #3 INFO message for stale entries should "
            "mention 'same physical install' so users understand it is not a "
            "real dual-install.",
        )


# ---------------------------------------------------------------------------
# Section J: check_havok2fbx only requires havok2fbx.exe (not libfbxsdk.dll)
# ---------------------------------------------------------------------------

class TestCheckHavok2FBX(unittest.TestCase):
    """Verify that check_havok2fbx() only requires havok2fbx.exe.

    Earlier versions also required libfbxsdk.dll, which caused a false-positive
    "folder found but expected files missing" warning for statically-linked builds
    or newer releases that don't ship a separate libfbxsdk.dll.

    discover_installed_tools() also only looks for havok2fbx.exe, so the check
    function must be consistent with it.
    """

    def _get_check_source(self) -> str:
        source = _read("tool_installers.py")
        import re
        m = re.search(
            r"def check_havok2fbx\(.*?\n(?=\ndef |\nclass )",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(m, "check_havok2fbx() not found in tool_installers.py")
        return m.group(0)

    def test_only_exe_required(self):
        """check_havok2fbx should succeed with only havok2fbx.exe present."""
        import tempfile, os
        with tempfile.TemporaryDirectory() as tmpdir:
            # Simulate folder with only the exe (no libfbxsdk.dll)
            exe_path = os.path.join(tmpdir, "havok2fbx.exe")
            from pathlib import Path as _Path
            _Path(exe_path).touch()

            # Import the module under test (no bpy required — check_havok2fbx
            # only uses pathlib.Path so it works outside Blender)
            import importlib.util, types
            # Provide a minimal bpy stub so the module can be parsed
            bpy_stub = types.ModuleType("bpy")
            bpy_stub.props = types.ModuleType("bpy.props")
            bpy_stub.types = types.ModuleType("bpy.types")
            bpy_stub.path = types.SimpleNamespace(abspath=lambda p: p)
            original_bpy = sys.modules.get("bpy")
            sys.modules["bpy"] = bpy_stub
            try:
                spec = importlib.util.spec_from_file_location(
                    "_ti_test", _path("tool_installers.py"))
                ti = importlib.util.module_from_spec(spec)
                try:
                    spec.loader.exec_module(ti)
                except Exception:
                    pass  # module may error on bpy internals; check_havok2fbx is pure
                if hasattr(ti, "check_havok2fbx"):
                    result = ti.check_havok2fbx(tmpdir)
                    self.assertTrue(
                        result,
                        "check_havok2fbx() returned False for a folder containing only "
                        "havok2fbx.exe.  The function must not require libfbxsdk.dll.",
                    )
            finally:
                if original_bpy is None:
                    sys.modules.pop("bpy", None)

    def test_libfbxsdk_dll_not_required_in_source(self):
        """The return statement of check_havok2fbx must not gate on libfbxsdk.dll."""
        block = self._get_check_source()
        # Strip the docstring so a mention in documentation doesn't trigger the check.
        import re
        body_only = re.sub(r'""".*?"""', '', block, flags=re.DOTALL)
        self.assertNotIn(
            "dll.is_file()",
            body_only,
            "check_havok2fbx() must not require libfbxsdk.dll — "
            "statically-linked and newer releases don't ship it as a separate file.",
        )

    def test_exe_in_subfolder_passes(self):
        """check_havok2fbx must return True when the exe is in a sub-folder.

        discover_installed_tools() uses rglob() to find the exe recursively
        and then stores the *root* tool folder in the preference.  If
        check_havok2fbx() only checks the top level it will fire a false-positive
        "folder found but expected files missing" warning for that exact scenario.

        Regression guard: the original implementation did only a direct
        top-level check (`Path(path) / "havok2fbx.exe"`).
        """
        import tempfile, os
        from pathlib import Path as _Path
        with tempfile.TemporaryDirectory() as tmpdir:
            # Exe lives one level deeper, like a GitHub release zip that extracts
            # into a versioned sub-directory.
            subfolder = os.path.join(tmpdir, "havok2fbx-win64")
            os.makedirs(subfolder)
            _Path(os.path.join(subfolder, "havok2fbx.exe")).touch()

            import importlib.util, types
            bpy_stub = types.ModuleType("bpy")
            bpy_stub.props = types.ModuleType("bpy.props")
            bpy_stub.types = types.ModuleType("bpy.types")
            bpy_stub.path = types.SimpleNamespace(abspath=lambda p: p)
            original_bpy = sys.modules.get("bpy")
            sys.modules["bpy"] = bpy_stub
            try:
                spec = importlib.util.spec_from_file_location(
                    "_ti_test2", _path("tool_installers.py"))
                ti = importlib.util.module_from_spec(spec)
                try:
                    spec.loader.exec_module(ti)
                except Exception:
                    pass
                if hasattr(ti, "check_havok2fbx"):
                    result = ti.check_havok2fbx(tmpdir)
                    self.assertTrue(
                        result,
                        "check_havok2fbx() returned False when havok2fbx.exe is in a "
                        "sub-folder of the configured path.  The function must search "
                        "recursively (like discover_installed_tools()) so the diagnostics "
                        "check never fires a false-positive 'expected files missing' "
                        "warning for a path set by auto_configure_preferences().",
                    )
            finally:
                if original_bpy is None:
                    sys.modules.pop("bpy", None)

    def test_rglob_fallback_in_source(self):
        """check_havok2fbx source must contain rglob for the recursive search."""
        block = self._get_check_source()
        self.assertIn(
            "rglob",
            block,
            "check_havok2fbx() must use rglob() to search recursively so it stays "
            "consistent with discover_installed_tools() which also uses rglob().",
        )

# ---------------------------------------------------------------------------
# Section K: Havok2FBX diagnostic check uses inline os.walk (not _ti-dependent)
# ---------------------------------------------------------------------------

class TestHavok2FBXDiagnosticInlineCheck(unittest.TestCase):
    """The Havok2FBX block in addon_diagnostics.py must verify the folder with
    an inline os.walk loop — NOT by delegating to ``_ti.check_havok2fbx()``.

    When tool_installers fails to load (_ti is None) the old code short-
    circuited the check entirely and fell straight to 'folder found but
    expected files missing', a false-positive that confused users who had a
    valid installation.  The UModel block already uses os.walk inline; the
    Havok2FBX block must match that pattern.

    Regression guard: the original code was:
        elif _ti and hasattr(_ti, "check_havok2fbx") and _ti.check_havok2fbx(_p):
    """

    def _get_havok_diag_source(self) -> str:
        source = _read("addon_diagnostics.py")
        import re
        m = re.search(
            r"# Havok2FBX\s*[─\-]+.*?(?=\n\s*# [A-Z])",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(
            m,
            "Havok2FBX diagnostic block not found in addon_diagnostics.py",
        )
        return m.group(0)

    def test_uses_os_walk_not_ti(self):
        """The Havok2FBX diagnostic block must use os.walk, not _ti.check_havok2fbx."""
        block = self._get_havok_diag_source()
        self.assertIn(
            "os.walk",
            block,
            "addon_diagnostics.py Havok2FBX block must use os.walk() for inline "
            "path verification so the check works even when tool_installers (_ti) "
            "fails to load.  Without this, a valid installation produces a false-"
            "positive 'folder found but expected files missing' warning whenever "
            "the module load fails.",
        )

    def test_does_not_gate_on_ti(self):
        """The Havok2FBX OK branch must NOT require _ti to be truthy."""
        block = self._get_havok_diag_source()
        # The elif that sets OK must not contain "_ti and"
        ok_line = next(
            (ln for ln in block.splitlines() if "OK" in ln and "Havok2FBX" in ln),
            None,
        )
        # If the OK line is found it should not have the _ti guard; if it is
        # absent the test below will catch the missing os.walk.
        if ok_line:
            self.assertNotIn(
                "_ti and",
                ok_line,
                "The Havok2FBX OK branch must not guard on '_ti and …' — the "
                "inline os.walk check must be used instead so the result is "
                "independent of whether tool_installers loaded successfully.",
            )

    def test_checks_exe_name(self):
        """The inline check must look for 'havok2fbx.exe' or 'havok2fbx'."""
        block = self._get_havok_diag_source()
        self.assertIn(
            "havok2fbx.exe",
            block,
            "addon_diagnostics.py Havok2FBX block must check for 'havok2fbx.exe' "
            "inside the configured folder.",
        )


# ---------------------------------------------------------------------------
# Section J2: check_ckcmd only requires ck-cmd.exe
# ---------------------------------------------------------------------------

class TestCheckCKCmd(unittest.TestCase):
    """Verify that check_ckcmd() finds ck-cmd.exe (top-level and sub-folder)."""

    def _get_check_source(self) -> str:
        source = _read("tool_installers.py")
        import re
        m = re.search(
            r"def check_ckcmd\(.*?\n(?=\ndef |\nclass )",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(m, "check_ckcmd() not found in tool_installers.py")
        return m.group(0)

    def test_toplevel_exe_found(self):
        """check_ckcmd should succeed with ck-cmd.exe in the root folder."""
        import tempfile
        from pathlib import Path as _Path
        with tempfile.TemporaryDirectory() as tmpdir:
            (_Path(tmpdir) / "ck-cmd.exe").touch()

            import importlib.util, types
            bpy_stub = types.ModuleType("bpy")
            bpy_stub.props = types.ModuleType("bpy.props")
            bpy_stub.types = types.ModuleType("bpy.types")
            bpy_stub.path = types.SimpleNamespace(abspath=lambda p: p)
            original_bpy = sys.modules.get("bpy")
            sys.modules["bpy"] = bpy_stub
            try:
                spec = importlib.util.spec_from_file_location(
                    "_ti_ckcmd1", _path("tool_installers.py"))
                ti = importlib.util.module_from_spec(spec)
                try:
                    spec.loader.exec_module(ti)
                except Exception:
                    pass
                if hasattr(ti, "check_ckcmd"):
                    self.assertTrue(
                        ti.check_ckcmd(tmpdir),
                        "check_ckcmd() returned False for a folder containing ck-cmd.exe.",
                    )
            finally:
                if original_bpy is None:
                    sys.modules.pop("bpy", None)

    def test_subfolder_exe_found(self):
        """check_ckcmd must return True when ck-cmd.exe is in a sub-folder."""
        import tempfile, os
        from pathlib import Path as _Path
        with tempfile.TemporaryDirectory() as tmpdir:
            subfolder = os.path.join(tmpdir, "ck-cmd-win64")
            os.makedirs(subfolder)
            (_Path(subfolder) / "ck-cmd.exe").touch()

            import importlib.util, types
            bpy_stub = types.ModuleType("bpy")
            bpy_stub.props = types.ModuleType("bpy.props")
            bpy_stub.types = types.ModuleType("bpy.types")
            bpy_stub.path = types.SimpleNamespace(abspath=lambda p: p)
            original_bpy = sys.modules.get("bpy")
            sys.modules["bpy"] = bpy_stub
            try:
                spec = importlib.util.spec_from_file_location(
                    "_ti_ckcmd2", _path("tool_installers.py"))
                ti = importlib.util.module_from_spec(spec)
                try:
                    spec.loader.exec_module(ti)
                except Exception:
                    pass
                if hasattr(ti, "check_ckcmd"):
                    self.assertTrue(
                        ti.check_ckcmd(tmpdir),
                        "check_ckcmd() returned False when ck-cmd.exe is in a sub-folder.",
                    )
            finally:
                if original_bpy is None:
                    sys.modules.pop("bpy", None)

    def test_rglob_fallback_in_source(self):
        """check_ckcmd source must use rglob for recursive search."""
        block = self._get_check_source()
        self.assertIn(
            "rglob",
            block,
            "check_ckcmd() must use rglob() to search recursively.",
        )


# ---------------------------------------------------------------------------
# Section K2: ck-cmd diagnostic block uses inline os.walk
# ---------------------------------------------------------------------------

class TestCKCmdDiagnosticBlock(unittest.TestCase):
    """The ck-cmd block in addon_diagnostics.py must use inline os.walk."""

    def _get_ckcmd_diag_source(self) -> str:
        source = _read("addon_diagnostics.py")
        import re
        m = re.search(
            r"# ck-cmd\s*[─\-]+.*?(?=\n\s*# [A-Z])",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(
            m,
            "ck-cmd diagnostic block not found in addon_diagnostics.py",
        )
        return m.group(0)

    def test_uses_os_walk(self):
        """The ck-cmd diagnostic block must use os.walk for inline verification."""
        block = self._get_ckcmd_diag_source()
        self.assertIn(
            "os.walk",
            block,
            "addon_diagnostics.py ck-cmd block must use os.walk() for inline path verification.",
        )

    def test_checks_exe_name(self):
        """The ck-cmd block must look for 'ck-cmd.exe'."""
        block = self._get_ckcmd_diag_source()
        self.assertIn(
            "ck-cmd.exe",
            block,
            "addon_diagnostics.py ck-cmd block must check for 'ck-cmd.exe'.",
        )

    def test_install_ckcmd_in_tool_installers(self):
        """tool_installers.py must define install_ckcmd()."""
        source = _read("tool_installers.py")
        self.assertIn(
            "def install_ckcmd(",
            source,
            "tool_installers.py must define install_ckcmd().",
        )

    def test_ckcmd_in_discover_installed_tools(self):
        """discover_installed_tools() must include a 'ckcmd' key."""
        source = _read("tool_installers.py")
        self.assertIn(
            '"ckcmd"',
            source,
            "discover_installed_tools() must include a 'ckcmd' key.",
        )

    def test_ckcmd_path_in_preferences(self):
        """preferences.py must define ckcmd_path StringProperty."""
        source = _read("preferences.py")
        self.assertIn(
            "ckcmd_path",
            source,
            "preferences.py must define ckcmd_path for ck-cmd folder.",
        )

    def test_install_ckcmd_operator_registered(self):
        """install_operators.py must register FO4_OT_InstallCKCmd."""
        source = _read("install_operators.py")
        self.assertIn(
            "FO4_OT_InstallCKCmd",
            source,
            "install_operators.py must define and register FO4_OT_InstallCKCmd.",
        )
    """Verify that the bundled knowledge_base/ directory is present in the add-on root.

    knowledge_helpers._kb_root() falls back to <addon_dir>/knowledge_base/ when
    no custom path is configured.  If that directory is missing, the diagnostic
    check fires "Knowledge base enabled but path not found" even for users who
    have never touched the knowledge base settings.

    The fix: ship knowledge_base/ in the repository so the default path is always
    valid.  At minimum a README.md must be present so load_snippets() returns at
    least one snippet (avoiding the "empty" false-negative).
    """

    def test_knowledge_base_dir_exists(self):
        """knowledge_base/ must exist as a directory inside the add-on root."""
        import os
        addon_root = os.path.dirname(os.path.abspath(__file__))
        kb_dir = os.path.join(addon_root, "knowledge_base")
        self.assertTrue(
            os.path.isdir(kb_dir),
            "knowledge_base/ directory not found at add-on root.  "
            "Create it (with at least a README.md) so the default fallback path "
            "is always valid and the diagnostic check does not fire a false-positive WARN.",
        )

    def test_knowledge_base_has_at_least_one_text_file(self):
        """knowledge_base/ must contain at least one .txt or .md file.

        An empty directory causes knowledge_helpers.status() to return
        (True, '...no snippets loaded...'), which is not an error, but shipping
        at least a README.md in the repo gives users useful onboarding content
        and confirms that load_snippets() returns at least one snippet for a
        default install.
        """
        import os
        addon_root = os.path.dirname(os.path.abspath(__file__))
        kb_dir = os.path.join(addon_root, "knowledge_base")
        if not os.path.isdir(kb_dir):
            self.skipTest("knowledge_base/ directory missing — covered by test_knowledge_base_dir_exists")
        text_files = [
            f for f in os.listdir(kb_dir)
            if f.lower().endswith((".txt", ".md"))
        ]
        self.assertGreater(
            len(text_files),
            0,
            "knowledge_base/ is empty.  Add at least a README.md so "
            "load_snippets() returns at least one snippet for a default install.",
        )


class TestTryImportNoBpyContext(unittest.TestCase):
    """_try_import() must return None silently when __package__ is empty.

    Pytest 9.x imports __init__.py with __package__ == "" (no Blender package
    context).  Previously _try_import() computed full = ".preferences" and
    called importlib.import_module(".preferences") without a package argument,
    producing a noisy TypeError traceback for every single submodule.  The
    guard at the top of _try_import now returns None immediately in that case.
    """

    def test_try_import_returns_none_when_package_empty(self):
        """_try_import must have a guard for falsy __package__."""
        with open(os.path.join(ADDON_DIR, "__init__.py")) as fh:
            source = fh.read()
        # The guard must appear before the f-string that builds `full`.
        # 1500 chars is enough to cover the docstring (~750 chars) plus guard.
        func_start = source.find("def _try_import(")
        self.assertGreater(func_start, -1, "_try_import not found in __init__.py")
        func_body = source[func_start : func_start + 1500]
        self.assertIn(
            "if not __package__",
            func_body,
            "_try_import must guard against falsy __package__ to avoid "
            "TypeError tracebacks when pytest imports __init__.py outside "
            "a Blender extension context.",
        )
        # The guard must come BEFORE the line that builds `full`
        guard_pos = func_body.find("if not __package__")
        full_pos = func_body.find("full = ")
        self.assertLess(
            guard_pos,
            full_pos,
            "The 'if not __package__: return None' guard must appear before "
            "'full = f\"{__package__}...' to prevent the TypeError.",
        )

    def test_no_traceback_printed_for_empty_package(self):
        """Importing __init__.py with __package__='' must not print tracebacks."""
        import io
        import importlib.util
        import types

        # Build a minimal module object that mimics what pytest does:
        # __package__ is set to "" (empty string).
        source_path = os.path.join(ADDON_DIR, "__init__.py")
        with open(source_path) as fh:
            source = fh.read()

        # Compile to a code object so we can exec it with a controlled namespace
        code = compile(source, source_path, "exec")
        fake_mod = types.ModuleType("_test_init_no_pkg")
        fake_mod.__package__ = ""  # simulate pytest context
        fake_mod.__file__ = source_path
        fake_mod.__spec__ = None

        captured = io.StringIO()
        import sys as _sys
        old_stdout = _sys.stdout
        old_stderr = _sys.stderr
        _sys.stdout = captured
        _sys.stderr = captured
        try:
            # exec() is safe here: we're running the project's own source file
            # (not user-supplied input) in an isolated module namespace to
            # simulate pytest's import context.
            exec(code, fake_mod.__dict__)  # noqa: S102
        except Exception:
            pass  # top-level import failures (bpy missing) are expected
        finally:
            _sys.stdout = old_stdout
            _sys.stderr = old_stderr

        output = captured.getvalue()
        self.assertNotIn(
            "TypeError",
            output,
            "No TypeError traceback should be printed when __package__ is empty. "
            "Got output:\n" + output[:500],
        )


class TestInstallLibiglHeadersCheck(unittest.TestCase):
    """install_libigl() must detect missing Python headers and fail clearly.

    libigl >= 2.5 uses scikit-build-core + CMake and falls back to a source
    build whenever no binary wheel is available for the running interpreter.
    Blender's bundled Python does NOT ship C development headers (the
    ``Include/`` directory), so the CMake configuration step always fails with:

        Development: Cannot find the directory ".../python/Include"

    The fix is a pre-flight check in install_libigl() that detects the missing
    headers via ``sysconfig.get_path("include")`` and returns a clear,
    actionable error message instead of dumping a wall of CMake output.
    """

    def test_headers_preflight_check_present(self):
        """install_libigl must guard against missing Python development headers."""
        with open(os.path.join(ADDON_DIR, "tool_installers.py")) as fh:
            source = fh.read()
        tree = ast.parse(source)
        fn_node = next(
            (n for n in ast.walk(tree)
             if isinstance(n, ast.FunctionDef) and n.name == "install_libigl"),
            None,
        )
        self.assertIsNotNone(fn_node, "install_libigl not found in tool_installers.py")

        # The function body must reference sysconfig (for get_path("include"))
        fn_src = ast.get_source_segment(source, fn_node) or ""
        self.assertIn(
            "sysconfig",
            fn_src,
            "install_libigl must use sysconfig to locate Python include dir "
            "and detect missing C development headers before calling pip.",
        )

    def test_headers_preflight_before_pip_call(self):
        """The headers pre-flight check must appear before _pip_install(['libigl'])."""
        with open(os.path.join(ADDON_DIR, "tool_installers.py")) as fh:
            source = fh.read()

        fn_start = source.find("def install_libigl(")
        self.assertGreater(fn_start, -1, "install_libigl not found")
        # Find the next function definition to bound the search
        fn_end = source.find("\ndef ", fn_start + 1)
        fn_body = source[fn_start:fn_end] if fn_end > fn_start else source[fn_start:]

        sysconfig_pos = fn_body.find("sysconfig")
        pip_pos = fn_body.find("_pip_install")
        self.assertGreater(sysconfig_pos, -1, "sysconfig not found in install_libigl")
        self.assertGreater(pip_pos, -1, "_pip_install not found in install_libigl")
        self.assertLess(
            sysconfig_pos,
            pip_pos,
            "sysconfig header check must appear BEFORE the _pip_install call "
            "so that the pre-flight guard fires before pip attempts a source build.",
        )

    def test_headers_check_returns_false_with_actionable_message(self):
        """install_libigl must return (False, <informative str>) when headers missing."""
        import importlib
        import unittest.mock as mock
        import sysconfig as _sysconfig

        # Dynamically reload tool_installers so we get a fresh module object
        # without needing bpy.
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "_test_tool_installers",
            os.path.join(ADDON_DIR, "tool_installers.py"),
        )
        mod = importlib.util.module_from_spec(spec)
        # Stub out bpy so the module-level code doesn't crash
        import types
        fake_bpy = types.ModuleType("bpy")
        fake_bpy.app = types.SimpleNamespace(version=(5, 0, 0))
        import sys as _sys
        _sys.modules.setdefault("bpy", fake_bpy)
        try:
            spec.loader.exec_module(mod)
        except Exception:
            self.skipTest("tool_installers.py could not be loaded outside Blender")

        keywords = ("libigl", "Blender", "Python", "header")

        # Case 1: get_path returns a non-existent directory (Blender scenario)
        with mock.patch.object(
            _sysconfig, "get_path", return_value="/nonexistent/python/Include"
        ):
            ok, msg = mod.install_libigl()
        self.assertFalse(ok, "install_libigl must return False when Include dir is missing")
        for keyword in keywords:
            self.assertIn(
                keyword,
                msg,
                f"Error message must mention '{keyword}' (non-existent path case). "
                f"Got: {msg[:300]}",
            )

        # Case 2: get_path returns None (some embedded/minimal Python builds)
        with mock.patch.object(
            _sysconfig, "get_path", return_value=None
        ):
            ok2, msg2 = mod.install_libigl()
        self.assertFalse(ok2, "install_libigl must return False when get_path returns None")
        for keyword in keywords:
            self.assertIn(
                keyword,
                msg2,
                f"Error message must mention '{keyword}' (None path case). "
                f"Got: {msg2[:300]}",
            )


# ---------------------------------------------------------------------------
# Test – Mossy PyTorch path JSON persistence (RECURRING BUG #12 / #14)
# ---------------------------------------------------------------------------
class TestMossyPytorchPathJsonPersistence(unittest.TestCase):
    """Regression tests for the Mossy-provided PyTorch path not surviving
    Blender restarts (reported repeatedly as "every restart I have to re-add
    pytorch").

    Root cause: _store_pytorch_path_in_prefs() called bpy.ops.wm.save_userpref()
    directly without a window-context override.  From inside a bpy.app.timers
    callback, bpy.context.window can be None, causing save_userpref() to return
    CANCELLED silently.  The path was stored in memory (prefs.pytorch_path = path)
    but never written to the userpref.blend file.

    Fix (three complementary layers):
      1. _store_pytorch_path_in_prefs() now calls save_api_keys() to write the
         path to ~/.blender_game_tools_keys.json (JSON backup that does not
         depend on Blender operator context).
      2. _store_pytorch_path_in_prefs() now calls save_prefs_deferred() (which
         uses temp_override with window=wins[0]) instead of the raw
         bpy.ops.wm.save_userpref() call.
      3. load_api_keys() now reads 'pytorch_path' from the JSON file and:
           a. Restores prefs.pytorch_path if it is currently empty.
           b. Adds the path to sys.path for the current session.
      4. restore_extra_python_paths() now also applies prefs.pytorch_path if set
         (catches the RECURRING BUG #13 case where mossy_link.register() ran
         before get_preferences() was ready).

    These tests verify the structural properties of the fix.
    No Blender runtime required — all checks are pure source analysis.
    """

    # ------------------------------------------------------------------ helpers

    @staticmethod
    def _get_function_source(filename: str, function_name: str) -> str:
        """Return the source text of *function_name* from *filename*.

        Raises AssertionError if the function cannot be found.
        """
        source = _read(filename)
        tree = ast.parse(source, filename=filename)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == function_name:
                func_lines = source.splitlines()[node.lineno - 1: node.end_lineno]
                return "\n".join(func_lines)
        raise AssertionError(f"{function_name}() not found in {filename}")

    def test_save_api_keys_includes_pytorch_path(self):
        """save_api_keys() must include 'pytorch_path' in the JSON data.

        _store_pytorch_path_in_prefs() calls save_api_keys() to persist the
        Mossy-provided pytorch path to the JSON keys file.  If save_api_keys()
        does not include 'pytorch_path' in the written dict, the JSON backup is
        useless and the path will be lost on Blender restart.
        """
        func_src = self._get_function_source("preferences.py", "save_api_keys")
        self.assertIn(
            "pytorch_path",
            func_src,
            "save_api_keys() in preferences.py must include 'pytorch_path' in the "
            "JSON dict it writes to the keys file.  Without this, the Mossy-provided "
            "PyTorch path is never written to the JSON backup, and will be lost when "
            "bpy.ops.wm.save_userpref() fails silently (missing window context in a "
            "timer callback).",
        )

    def test_load_api_keys_restores_pytorch_path(self):
        """load_api_keys() must read and restore 'pytorch_path' from the JSON file.

        The JSON keys file is the reliable backup for the Mossy-provided PyTorch
        path.  load_api_keys() is called during register() AFTER restore_extra_
        python_paths(), so it must directly apply the path to sys.path (not just
        set the pref property) for the current Blender session.
        """
        func_src = self._get_function_source("preferences.py", "load_api_keys")
        self.assertIn(
            "pytorch_path",
            func_src,
            "load_api_keys() in preferences.py must restore 'pytorch_path' from the "
            "JSON keys file back into prefs.pytorch_path and sys.path.  Without this, "
            "the JSON backup written by save_api_keys() is never consumed on startup.",
        )
        self.assertIn(
            "sys.path",
            func_src,
            "load_api_keys() must add the restored pytorch_path to sys.path so torch "
            "is importable immediately after register().  restore_extra_python_paths() "
            "runs before load_api_keys(), so load_api_keys() must do the sys.path "
            "insertion itself when the path was absent from prefs.pytorch_path.",
        )

    def test_store_pytorch_path_uses_save_api_keys(self):
        """_store_pytorch_path_in_prefs() must call save_api_keys() for JSON backup.

        The bare bpy.ops.wm.save_userpref() call that this replaced can return
        CANCELLED silently when bpy.context.window is None inside a timer callback.
        save_api_keys() writes to a plain JSON file and never needs a Blender
        operator context, making it the reliable persistence path.
        """
        func_src = self._get_function_source("mossy_link.py", "_store_pytorch_path_in_prefs")
        self.assertIn(
            "save_api_keys",
            func_src,
            "_store_pytorch_path_in_prefs() in mossy_link.py must call "
            "save_api_keys() to persist the pytorch_path to the JSON keys file. "
            "The direct bpy.ops.wm.save_userpref() call silently fails (returns "
            "CANCELLED) when bpy.context.window is None inside a timer callback, "
            "so a JSON-based backup is required.",
        )

    def test_store_pytorch_path_uses_save_prefs_deferred(self):
        """_store_pytorch_path_in_prefs() must use save_prefs_deferred(), not bare save_userpref().

        save_prefs_deferred() applies a temp_override(window=wins[0]) so the
        save_userpref operator succeeds from a timer callback.  Bare
        bpy.ops.wm.save_userpref() returns CANCELLED silently when
        bpy.context.window is None (RECURRING BUG #12 root cause).
        """
        func_src = self._get_function_source("mossy_link.py", "_store_pytorch_path_in_prefs")
        self.assertNotIn(
            "bpy.ops.wm.save_userpref()",
            func_src,
            "_store_pytorch_path_in_prefs() must NOT call bpy.ops.wm.save_userpref() "
            "directly.  From a timer callback bpy.context.window can be None, causing "
            "the operator to return CANCELLED silently (RECURRING BUG #12).  Use "
            "save_prefs_deferred() which applies a proper window-context override.",
        )
        self.assertIn(
            "save_prefs_deferred",
            func_src,
            "_store_pytorch_path_in_prefs() must call save_prefs_deferred() so that "
            "the Blender user preferences are saved with a proper window-context "
            "override (temp_override(window=wins[0])), preventing the silent "
            "CANCELLED return that caused the pytorch_path to be lost on restart.",
        )

    def test_restore_extra_python_paths_applies_mossy_pytorch_path(self):
        """restore_extra_python_paths() must also apply prefs.pytorch_path to sys.path.

        This adds a third safety net (after mossy_link.register() and deferred_startup)
        so the Mossy-provided path is in sys.path for torch-dependent modules even
        when mossy_link.register() could not read it due to get_preferences()
        returning None during early registration (RECURRING BUG #13 scenario).
        """
        func_src = self._get_function_source("preferences.py", "restore_extra_python_paths")
        self.assertIn(
            "pytorch_path",
            func_src,
            "restore_extra_python_paths() in preferences.py must also check and apply "
            "prefs.pytorch_path (the Mossy-provided path) to sys.path.  Without this, "
            "the path is only applied by mossy_link.register() which may run before "
            "get_preferences() is ready (RECURRING BUG #13), leaving torch unavailable "
            "until deferred_startup() fires 2 seconds later.",
        )



# ---------------------------------------------------------------------------
# Section N: Auto-Fix Step 5 conditional AI cache refresh
# ---------------------------------------------------------------------------

class TestAutoFixStep5Conditional(unittest.TestCase):
    """Auto-Fix Step 5 must only refresh AI tool caches when the status is
    actually unknown/stale.

    The old code ran all four cache refreshes unconditionally, so every call
    to Auto-Fix reported '4 fixed' even when all tools were already available.
    This was misleading and caused users to think something was broken.

    Fix: each refresh must be guarded by a check of the relevant global/cache
    state so it only fires (and only adds to fixed[]) when there is something
    to fix.
    """

    def _get_autofix_source(self) -> str:
        source = _read("addon_diagnostics.py")
        import re
        m = re.search(
            r"# ── Step 5: refresh AI tool availability caches.*?# ── Step 6:",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(m, "Step 5 block not found in addon_diagnostics.py")
        return m.group(0)

    def test_hunyuan3d_refresh_guarded_by_available_check(self):
        """Hunyuan3D refresh must only run when HUNYUAN3D_AVAILABLE is None."""
        block = self._get_autofix_source()
        self.assertIn(
            "HUNYUAN3D_AVAILABLE",
            block,
            "Auto-Fix Step 5 Hunyuan3D refresh must check HUNYUAN3D_AVAILABLE "
            "before calling check_hunyuan3d_availability().  Without this guard "
            "the refresh runs every time even when the tool is already available.",
        )

    def test_hymotion_refresh_guarded_by_available_check(self):
        """HY-Motion refresh must only run when HYMOTION_AVAILABLE is None."""
        block = self._get_autofix_source()
        self.assertIn(
            "HYMOTION_AVAILABLE",
            block,
            "Auto-Fix Step 5 HY-Motion refresh must check HYMOTION_AVAILABLE "
            "before calling check_hymotion_availability().  Without this guard "
            "the refresh runs every time even when the tool is already available.",
        )

    def test_zoedepth_cache_clear_guarded_by_available_check(self):
        """ZoeDepth cache clear must only run when ZOEDEPTH_AVAILABLE is not True."""
        block = self._get_autofix_source()
        self.assertIn(
            "ZOEDEPTH_AVAILABLE",
            block,
            "Auto-Fix Step 5 ZoeDepth cache clear must check ZOEDEPTH_AVAILABLE "
            "before calling clear_availability_cache().  Without this guard the "
            "cache is cleared every time, resetting a confirmed-available result.",
        )

    def test_rignet_invalidation_guarded_by_cache_state(self):
        """RigNet cache invalidation must only run when the cache ts > 0 and not available."""
        block = self._get_autofix_source()
        self.assertIn(
            "_rignet_status_cache",
            block,
            "Auto-Fix Step 5 RigNet invalidation must inspect _rignet_status_cache "
            "before calling _invalidate_rignet_cache().  Without this guard the "
            "cache is invalidated every time, including when RigNet is already "
            "confirmed available.",
        )


# ---------------------------------------------------------------------------
# Section O: Auto-Fix Step 7 — knowledge_base directory auto-creation
# ---------------------------------------------------------------------------

class TestAutoFixStep7KnowledgeBase(unittest.TestCase):
    """Auto-Fix Step 7 must create the knowledge_base/ directory when it is
    missing and knowledge_base_enabled is True in preferences.

    The knowledge_base/ directory is bundled in the repo but may be absent
    on older installs or if it was accidentally deleted.  The diagnostic check
    fires '⚠ Knowledge base enabled but path not found' in that case.  Auto-Fix
    should resolve this silently rather than leaving the user with a persistent
    warning they cannot clear.
    """

    def _get_autofix_source(self) -> str:
        source = _read("addon_diagnostics.py")
        import re
        m = re.search(
            r"# ── Step 7: auto-create missing knowledge_base directory.*?# ── Report",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(
            m,
            "Step 7 (knowledge_base auto-create) not found in addon_diagnostics.py.  "
            "Add a Step 7 block that calls os.makedirs() to create the directory "
            "when knowledge_base_enabled is True and the directory is missing.",
        )
        return m.group(0)

    def test_step7_block_present(self):
        """Step 7 block must be present in Auto-Fix."""
        block = self._get_autofix_source()
        self.assertIn(
            "knowledge_base",
            block,
            "Auto-Fix Step 7 must reference 'knowledge_base' to handle the "
            "'Knowledge base enabled but path not found' warning.",
        )

    def test_step7_uses_makedirs(self):
        """Step 7 must call os.makedirs to create the missing directory."""
        block = self._get_autofix_source()
        self.assertIn(
            "makedirs",
            block,
            "Auto-Fix Step 7 must call os.makedirs() (or equivalent) to create "
            "the knowledge_base directory when it is absent.",
        )

    def test_step7_checks_knowledge_base_enabled(self):
        """Step 7 must only create the directory when knowledge_base_enabled is True."""
        block = self._get_autofix_source()
        self.assertIn(
            "knowledge_base_enabled",
            block,
            "Auto-Fix Step 7 must check 'knowledge_base_enabled' before creating "
            "the directory to avoid silently creating it for users who have the "
            "feature disabled.",
        )


# ---------------------------------------------------------------------------
# Section O2: Diagnostic check auto-creates default knowledge_base/ dir
# ---------------------------------------------------------------------------

class TestKnowledgeBaseDiagnosticAutoCreate(unittest.TestCase):
    """The knowledge-base diagnostic check (check #12) must auto-create the
    default ``knowledge_base/`` directory when it does not exist and no custom
    path is configured — mirroring the behaviour of ``_kb_root()``.

    Regression guard: before this fix the check only called ``os.path.isdir``
    and emitted ``"Knowledge base enabled but path not found"`` for fresh
    extension installs where the sub-directory had never been created.
    """

    def _get_kb_check_source(self) -> str:
        source = _read("addon_diagnostics.py")
        import re
        # Locate the knowledge-base diagnostic block (after "knowledge_base_enabled")
        m = re.search(
            r"_kb_on\s*=\s*getattr.*?(?=\n\s*# ──|\n\s*# ===|\Z)",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(
            m,
            "_kb_on block not found in addon_diagnostics.py",
        )
        return m.group(0)

    def test_diagnostic_attempts_makedirs_for_default_path(self):
        """The diagnostic check must call os.makedirs when the default dir is absent."""
        block = self._get_kb_check_source()
        self.assertIn(
            "makedirs",
            block,
            "The knowledge-base diagnostic check must call os.makedirs() to "
            "auto-create the default directory before emitting WARN, so that "
            "fresh extension installs do not persistently show "
            "'Knowledge base enabled but path not found'.",
        )

    def test_auto_create_only_for_default_path(self):
        """Auto-create must be gated on the path being the default (no custom path)."""
        block = self._get_kb_check_source()
        # The guard variable name used in the fix
        self.assertIn(
            "_kb_is_default",
            block,
            "The auto-create logic in the diagnostic check must be gated on "
            "'_kb_is_default' so it only fires for the bundled default path, "
            "not for a user-configured custom path that truly doesn't exist.",
        )


# ---------------------------------------------------------------------------
# Section P: Dual-install check classifies ghost entries as stale
# ---------------------------------------------------------------------------

class TestDualInstallGhostEntriesClassifiedAsStale(unittest.TestCase):
    """Check #3 must classify foreign roots whose __file__ no longer exists on
    disk as stale (INFO), not genuine (WARN).

    When a previous copy of the addon is uninstalled the files are deleted but
    the sys.modules entry may linger until Blender restarts.  Before this fix,
    the deleted-file path was classified as 'genuine' (different directory →
    WARN) even though the install was gone.  The correct classification is
    'stale' (ghost entry from deleted install → INFO + Auto-Fix can clear it).
    """

    def _get_check3_source(self) -> str:
        source = _read("addon_diagnostics.py")
        import re
        m = re.search(
            r"# ── 3\. Dual-install via sys\.modules.*?(?=\n    # ──)",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(m, "Check #3 (Dual-install via sys.modules) not found in addon_diagnostics.py")
        return m.group(0)

    def test_ghost_entry_check_present(self):
        """Check #3 must inspect os.path.isfile(root_file) to catch ghost entries."""
        block = self._get_check3_source()
        self.assertIn(
            "isfile",
            block,
            "addon_diagnostics.py check #3 must call os.path.isfile(root_file) to "
            "detect ghost entries whose file has been deleted.  Without this check, "
            "a previously uninstalled copy remains classified as 'genuine dual-install' "
            "and raises a persistent WARN that Auto-Fix cannot clear.",
        )

    def test_ghost_entry_goes_to_stale_roots(self):
        """Ghost entries (file deleted) must be appended to stale_roots, not genuine_roots."""
        block = self._get_check3_source()
        # The block must contain logic that appends to stale_roots when the file
        # does not exist: `not os.path.isfile(root_file)` → stale_roots.append(...)
        import re
        # Verify the stale_roots append happens in the branch that checks isfile.
        # We look for the isfile guard followed (within a short span) by stale_roots.append
        has_ghost_to_stale = bool(re.search(
            r"isfile\(root_file\)[^\n]*\n(?:\s+.*\n){0,3}\s+stale_roots\.append",
            block,
        ))
        self.assertTrue(
            has_ghost_to_stale,
            "addon_diagnostics.py check #3 must route ghost entries (not isfile) to "
            "stale_roots so they are reported as INFO (fixable) rather than WARN "
            "(dual-install requiring user action).",
        )


# ---------------------------------------------------------------------------
# Section Q: Auto-Fix Step 0 purges ghost entries (deleted-file installs)
# ---------------------------------------------------------------------------

class TestAutoFixStep0PurgesGhostEntries(unittest.TestCase):
    """Auto-Fix Step 0 must also remove ghost sys.modules entries whose __file__
    no longer exists on disk.

    The old code only purged entries pointing to the SAME physical directory as
    the current install.  Entries from a previously uninstalled copy (different
    directory, file deleted) were left in place, keeping the dual-install WARN
    alive even after the other copy was removed.
    """

    def _get_step0_source(self) -> str:
        source = _read("addon_diagnostics.py")
        import re
        m = re.search(
            r"# ── Step 0: purge stale sys\.modules namespace entries.*?# ── Step 1:",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(m, "Step 0 block not found in addon_diagnostics.py")
        return m.group(0)

    def test_step0_purges_nonexistent_file_entries(self):
        """Step 0 purge list must include entries where __file__ does not exist."""
        block = self._get_step0_source()
        self.assertIn(
            "isfile",
            block,
            "Auto-Fix Step 0 must call os.path.isfile() to detect ghost entries "
            "whose underlying file has been deleted.  Without this, 'bl_ext.blender_org.…' "
            "namespace entries from a removed install are never purged by Auto-Fix.",
        )


# ---------------------------------------------------------------------------
# Section R: Diagnostics quick-access panel
# ---------------------------------------------------------------------------

class TestDiagnosticsPanel(unittest.TestCase):
    """FO4_PT_DiagnosticsPanel must exist, be in the classes tuple, and wire
    up all three essential diagnostic buttons.

    This panel was added so users can always find the Environment Self-Test,
    Run Diagnostics, and Auto-Fix Issues buttons without having to scroll to
    the very bottom of the long DEFAULT_CLOSED Setup & Status panel.
    """

    def _panel_source(self):
        src = _read("ui_panels.py")
        # Extract just the FO4_PT_DiagnosticsPanel class body
        start = src.find("class FO4_PT_DiagnosticsPanel(")
        if start == -1:
            return ""
        # End at the next top-level class definition
        end = src.find("\nclass ", start + 1)
        return src[start:end] if end != -1 else src[start:]

    def test_panel_class_exists(self):
        src = _read("ui_panels.py")
        self.assertIn(
            "class FO4_PT_DiagnosticsPanel(",
            src,
            "FO4_PT_DiagnosticsPanel must be defined in ui_panels.py — "
            "it is the quick-access panel for Environment Check, Run Diagnostics, "
            "and Auto-Fix Issues buttons.",
        )

    def test_panel_id(self):
        body = self._panel_source()
        self.assertIn(
            '"FO4_PT_diagnostics_panel"',
            body,
            "FO4_PT_DiagnosticsPanel must declare bl_idname = 'FO4_PT_diagnostics_panel'",
        )

    def test_not_default_closed(self):
        body = self._panel_source()
        self.assertNotIn(
            "'DEFAULT_CLOSED'",
            body,
            "FO4_PT_DiagnosticsPanel must NOT use DEFAULT_CLOSED — "
            "the whole point is that it opens by default so users can always see "
            "the diagnostic buttons without expanding anything.",
        )

    def test_bl_order_near_top(self):
        body = self._panel_source()
        self.assertIn(
            "bl_order",
            body,
            "FO4_PT_DiagnosticsPanel must set bl_order so it appears near the "
            "top of the sidebar (e.g. bl_order = -15).",
        )

    def test_has_self_test_button(self):
        body = self._panel_source()
        self.assertIn(
            '"fo4.self_test"',
            body,
            "FO4_PT_DiagnosticsPanel must include the fo4.self_test (Environment "
            "Self-Test) button.",
        )

    def test_has_run_diagnostics_button(self):
        body = self._panel_source()
        self.assertIn(
            '"fo4.run_addon_diagnostics"',
            body,
            "FO4_PT_DiagnosticsPanel must include the fo4.run_addon_diagnostics "
            "(Run Diagnostics) button.",
        )

    def test_has_auto_fix_button(self):
        body = self._panel_source()
        self.assertIn(
            '"fo4.fix_addon_issues"',
            body,
            "FO4_PT_DiagnosticsPanel must include the fo4.fix_addon_issues "
            "(Auto-Fix Issues) button.",
        )

    def test_registered_in_classes_tuple(self):
        src = _read("ui_panels.py")
        # Find the classes tuple
        start = src.find("classes = (")
        end   = src.find("\ndef register()", start)
        classes_block = src[start:end] if end != -1 else src[start:]
        self.assertIn(
            "FO4_PT_DiagnosticsPanel",
            classes_block,
            "FO4_PT_DiagnosticsPanel must be listed in the classes tuple in "
            "ui_panels.py so Blender registers it at startup.",
        )



# ---------------------------------------------------------------------------
# Section S – UE4 Importer Extension-policy compliance  (RECURRING BUG #18)
# ---------------------------------------------------------------------------
class TestUEImporterPolicyCompliance(unittest.TestCase):
    """ue_importer_helpers._load_module() must not cause Blender's Extension
    policy checker to fire.  The upstream Blender-UE4-Importer registers bare
    top-level sys.modules names (fo4_blender_ue4_importer, uasset, umat, umesh,
    umap, register_helper) and injects its folder into sys.path.  Both are
    forbidden for Blender 4.2+ / 5.x extensions.

    These tests check the *source code* of ue_importer_helpers.py to confirm
    the three required fixes are present without needing the upstream add-on
    installed.  (RECURRING BUG #18)
    """

    def _src(self):
        return _read("ue_importer_helpers.py")

    # ── Fix A: namespaced module key ────────────────────────────────────────

    def test_module_key_uses_pkg_prefix(self):
        """spec_from_file_location must use a namespaced key, not bare 'fo4_blender_ue4_importer'."""
        src = self._src()
        self.assertNotIn(
            'spec_from_file_location("fo4_blender_ue4_importer"',
            src,
            "spec_from_file_location must NOT use the bare string "
            "'fo4_blender_ue4_importer' — that registers a top-level module "
            "name which Blender's Extension policy checker flags as a violation. "
            "Use a namespaced key derived from __name__ / _pkg instead.",
        )

    def test_pkg_derived_from_own_name(self):
        """_pkg must be derived from __name__ so the key follows the extension namespace."""
        src = self._src()
        self.assertIn(
            "__name__",
            src,
            "ue_importer_helpers._load_module() must derive the package prefix "
            "from __name__ so the sys.modules key is properly namespaced under "
            "the extension's own package (e.g. bl_ext.user_default.blender_game_tools.*).",
        )

    def test_module_key_variable_used_in_sys_modules(self):
        """The dynamic _module_key variable must be what's registered in sys.modules."""
        src = self._src()
        self.assertIn(
            "_module_key",
            src,
            "ue_importer_helpers must build a _module_key variable and use it "
            "when registering the module in sys.modules — not a hard-coded bare string.",
        )
        self.assertIn(
            'sys.modules[_module_key]',
            src,
            "sys.modules registration must use the namespaced _module_key, "
            "not a hard-coded bare module name.",
        )

    # ── Fix B: sys.path cleanup ─────────────────────────────────────────────

    def test_sys_path_snapshot_taken(self):
        """sys.path must be snapshotted before exec_module so injected paths can be removed."""
        src = self._src()
        self.assertIn(
            "_path_before",
            src,
            "ue_importer_helpers._load_module() must snapshot sys.path into "
            "_path_before before calling exec_module() so the IMPORTER_DIR "
            "injection added by the upstream add-on can be removed afterwards.",
        )

    def test_sys_path_cleaned_after_exec(self):
        """The injected IMPORTER_DIR path must be removed from sys.path after loading."""
        src = self._src()
        self.assertIn(
            "_importer_real",
            src,
            "ue_importer_helpers._load_module() must compute _importer_real "
            "(resolved IMPORTER_DIR path) and use it to filter sys.path after "
            "exec_module() — Blender's Extension policy forbids sys.path mutations.",
        )
        self.assertIn(
            "sys.path[:] =",
            src,
            "ue_importer_helpers._load_module() must reassign sys.path[:] after "
            "exec_module() to remove the IMPORTER_DIR injection.",
        )

    # ── Fix C: bare sub-module relocation ───────────────────────────────────

    def test_bare_submodule_relocation_present(self):
        """Bare top-level sub-module names must be moved to namespaced keys."""
        src = self._src()
        self.assertIn(
            "_new_keys",
            src,
            "ue_importer_helpers._load_module() must compute _new_keys "
            "(set of new sys.modules entries added by exec_module) so bare "
            "sub-module names (uasset, umat, umesh, umap, register_helper) "
            "can be relocated to namespaced keys.",
        )
        # Check that a namespaced relocation assignment is present; the exact
        # f-string / format syntax may vary, but it must combine _module_key
        # with the bare key name and write into sys.modules.
        self.assertIn(
            "_module_key",
            src,
            "Bare sub-module names must be re-registered under the namespaced "
            "prefix built from _module_key so Blender's policy checker does "
            "not flag them.",
        )
        self.assertIn(
            "del sys.modules[key]",
            src,
            "The original bare sys.modules key must be deleted after the module "
            "is moved to the namespaced key.",
        )
        # Confirm the relocation writes back into sys.modules using _module_key
        import re as _re
        self.assertTrue(
            _re.search(r'sys\.modules\[.*_module_key.*\]\s*=', src),
            "Sub-module relocation must write sys.modules[...{_module_key}...] = mod_obj "
            "so the bare names are moved into the extension's namespace.",
        )

    # ── Fix D: unregister cleans up namespaced entries ──────────────────────

    def test_unregister_removes_namespaced_entries(self):
        """unregister() must purge all namespaced sys.modules entries it created."""
        src = self._src()
        # Look for the cleanup loop in unregister()
        self.assertIn(
            "sys.modules.pop(key, None)",
            src,
            "ue_importer_helpers.unregister() must call sys.modules.pop() to "
            "remove the namespaced module entries it created — leaving stale "
            "entries causes ghost-module warnings on extension reload.",
        )

    # ── Fix E: register() must NOT call _load_module() ──────────────────────

    def test_register_does_not_call_load_module(self):
        """register() must be a deliberate no-op that defers loading to load_and_register().

        Blender's Extension policy checker monitors sys.modules / sys.path
        mutations during register().  The upstream Blender-UE4-Importer adds
        its folder to sys.path and imports uasset / umat / umesh / umap /
        register_helper as bare top-level names.  Calling _load_module()
        (which calls exec_module on the importer) inside register() therefore
        triggers policy violations.

        Loading must be deferred to load_and_register(), which is only called
        from operator execute() — AFTER Blender's policy-check window has
        closed.  (RECURRING BUG #18)
        """
        import ast, textwrap

        src = self._src()

        # Locate the register() function body in the AST.
        tree = ast.parse(src)
        register_body = None
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == "register":
                register_body = ast.get_source_segment(src, node)
                break

        self.assertIsNotNone(register_body, "register() function not found in ue_importer_helpers.py")

        self.assertNotIn(
            "_load_module",
            register_body,
            "ue_importer_helpers.register() must NOT call _load_module() — "
            "doing so runs exec_module() during Blender's policy-check window "
            "and causes policy violations for bare sys.modules names and the "
            "sys.path mutation made by the upstream Blender-UE4-Importer. "
            "Use load_and_register() from operator execute() instead. "
            "(RECURRING BUG #18)",
        )

    def test_load_and_register_function_exists(self):
        """load_and_register() must exist as the deferred entry-point."""
        src = self._src()
        self.assertIn(
            "def load_and_register",
            src,
            "ue_importer_helpers must expose a load_and_register() function "
            "that is called from operator execute() to load the upstream "
            "importer outside Blender's policy-check window.",
        )

    def test_install_operators_use_load_and_register(self):
        """Both install operators must delegate to load_and_register(), not register()."""
        src = _read("install_operators.py")
        # Count how many times load_and_register is called vs bare register()
        self.assertIn(
            "load_and_register",
            src,
            "install_operators.py must call ue_importer_helpers.load_and_register() "
            "instead of ue_importer_helpers.register() so that the upstream "
            "importer is loaded outside Blender's policy-check window.",
        )

    def test_deferred_startup_auto_loads_ue4_importer(self):
        """deferred_startup() must call load_and_register() when the importer is on disk.

        register() is now a deliberate no-op.  The UE4 importer must be
        loaded in deferred_startup() (the bpy.app.timers callback that fires
        2 s after Blender loads) so it is available every session without the
        user having to click 'Auto-Install' again.  This is the 'memory' that
        persists across sessions: if IMPORTER_INIT exists on disk the importer
        is loaded automatically.
        """
        src = _read("startup_helpers.py")
        self.assertIn(
            "load_and_register",
            src,
            "startup_helpers.deferred_startup() must call "
            "ue_importer_helpers.load_and_register() when IMPORTER_INIT "
            "already exists on disk so the UE4 importer is available every "
            "session without re-downloading or requiring a manual install click.",
        )
        self.assertIn(
            "IMPORTER_INIT.exists()",
            src,
            "startup_helpers.deferred_startup() must check "
            "ue_importer_helpers.IMPORTER_INIT.exists() to decide whether to "
            "load from disk (fast, no network) or skip / auto-download.",
        )


# ---------------------------------------------------------------------------
# Test suite S — tri_export_helpers.py structural checks
# ---------------------------------------------------------------------------
class TestTRIExportHelpers(unittest.TestCase):
    """Structural integrity checks for the TRI morph export module."""

    def _src(self):
        return _read("tri_export_helpers.py")

    def test_file_exists(self):
        """tri_export_helpers.py must exist."""
        self.assertTrue(
            os.path.isfile(_path("tri_export_helpers.py")),
            "tri_export_helpers.py is missing — it provides FO4 .tri morph export",
        )

    def test_tri_magic_constant(self):
        """Module must define the FRTRI003 magic bytes."""
        src = self._src()
        self.assertIn(
            "FRTRI003",
            src,
            "tri_export_helpers must define the FRTRI003 magic constant "
            "used in the FO4 .tri file header.",
        )

    def test_tri_export_helpers_class_exists(self):
        """TRIExportHelpers class must be present."""
        src = self._src()
        self.assertIn(
            "class TRIExportHelpers",
            src,
            "tri_export_helpers must define a TRIExportHelpers class.",
        )

    def test_can_export_method(self):
        """can_export() static method must exist."""
        src = self._src()
        self.assertIn(
            "def can_export",
            src,
            "TRIExportHelpers must provide a can_export() method for "
            "pre-flight validation before calling export_tri().",
        )

    def test_export_tri_method(self):
        """export_tri() static method must exist."""
        src = self._src()
        self.assertIn(
            "def export_tri",
            src,
            "TRIExportHelpers must provide an export_tri() method that "
            "writes the .tri file.",
        )

    def test_struct_pack_used_for_header(self):
        """struct.pack must be used to write the binary header."""
        src = self._src()
        self.assertIn(
            "struct.pack",
            src,
            "tri_export_helpers must use struct.pack to write binary data "
            "for the FRTRI003 format header.",
        )

    def test_int16_deltas(self):
        """Morph deltas must be written as int16."""
        src = self._src()
        self.assertTrue(
            "'<h'" in src or '"<h"' in src,
            "tri_export_helpers must write morph deltas as int16 ('<h') "
            "to match the FRTRI003 morph delta format.",
        )

    def test_operator_registered_in_operators(self):
        """FO4_OT_ExportTRIMorphs must appear in operators.py."""
        src = _read("operators.py")
        self.assertIn(
            "FO4_OT_ExportTRIMorphs",
            src,
            "operators.py must define FO4_OT_ExportTRIMorphs and add it "
            "to the classes tuple so it is registered at startup.",
        )

    def test_operator_in_ui_panels(self):
        """fo4.export_tri_morphs must be wired into ui_panels.py."""
        src = _read("ui_panels.py")
        self.assertIn(
            "fo4.export_tri_morphs",
            src,
            "ui_panels.py must include a call to layout.operator("
            "'fo4.export_tri_morphs') in the export panel.",
        )

    def test_module_imported_in_init(self):
        """tri_export_helpers must be imported in __init__.py."""
        src = _read("__init__.py")
        self.assertIn(
            "tri_export_helpers",
            src,
            "__init__.py must import tri_export_helpers so the module is "
            "loaded as part of the add-on.",
        )

    def test_register_unregister_present(self):
        """Module must have register() and unregister() stubs."""
        src = self._src()
        self.assertIn("def register", src)
        self.assertIn("def unregister", src)


# ---------------------------------------------------------------------------
# Test suite T — navmesh_helpers.py structural checks
# ---------------------------------------------------------------------------
class TestNavmeshHelpers(unittest.TestCase):
    """Structural integrity checks for the navmesh validation module."""

    def _src(self):
        return _read("navmesh_helpers.py")

    def test_file_exists(self):
        """navmesh_helpers.py must exist."""
        self.assertTrue(
            os.path.isfile(_path("navmesh_helpers.py")),
            "navmesh_helpers.py is missing — it provides navmesh validation",
        )

    def test_navmesh_helpers_class_exists(self):
        """NavmeshHelpers class must be present."""
        src = self._src()
        self.assertIn(
            "class NavmeshHelpers",
            src,
            "navmesh_helpers must define a NavmeshHelpers class.",
        )

    def test_validate_method(self):
        """validate() static method must exist."""
        src = self._src()
        self.assertIn(
            "def validate",
            src,
            "NavmeshHelpers must provide a validate() method that checks "
            "navmesh geometry for CK compatibility.",
        )

    def test_tag_as_navmesh_method(self):
        """tag_as_navmesh() helper must exist."""
        src = self._src()
        self.assertIn(
            "def tag_as_navmesh",
            src,
            "NavmeshHelpers must provide a tag_as_navmesh() helper that "
            "marks an object as a navmesh in the viewport.",
        )

    def test_format_report_method(self):
        """format_report() helper must exist."""
        src = self._src()
        self.assertIn(
            "def format_report",
            src,
            "NavmeshHelpers must provide a format_report() helper to "
            "produce a human-readable validation summary.",
        )

    def test_max_verts_constant(self):
        """MAX_VERTS limit constant must be defined."""
        src = self._src()
        self.assertIn(
            "MAX_VERTS",
            src,
            "NavmeshHelpers must expose a MAX_VERTS constant (CK vertex limit).",
        )

    def test_degenerate_triangle_check(self):
        """Module must check for zero-area (degenerate) triangles."""
        src = self._src()
        self.assertIn(
            "calc_area",
            src,
            "NavmeshHelpers.validate() must call f.calc_area() to detect "
            "degenerate (zero-area) triangles that crash CK pathfinding.",
        )

    def test_operator_registered_in_operators(self):
        """FO4_OT_ValidateNavMesh must appear in operators.py."""
        src = _read("operators.py")
        self.assertIn(
            "FO4_OT_ValidateNavMesh",
            src,
            "operators.py must define FO4_OT_ValidateNavMesh and add it "
            "to the classes tuple.",
        )

    def test_operator_in_ui_panels(self):
        """fo4.validate_navmesh must be wired into ui_panels.py."""
        src = _read("ui_panels.py")
        self.assertIn(
            "fo4.validate_navmesh",
            src,
            "ui_panels.py must include a call to layout.operator("
            "'fo4.validate_navmesh').",
        )

    def test_module_imported_in_init(self):
        """navmesh_helpers must be imported in __init__.py."""
        src = _read("__init__.py")
        self.assertIn(
            "navmesh_helpers",
            src,
            "__init__.py must import navmesh_helpers.",
        )

    def test_register_unregister_present(self):
        """Module must have register() and unregister() stubs."""
        src = self._src()
        self.assertIn("def register", src)
        self.assertIn("def unregister", src)


# ---------------------------------------------------------------------------
# Test suite U — Multi-piece convex collision structural checks
# ---------------------------------------------------------------------------
class TestMultiConvexCollision(unittest.TestCase):
    """Structural checks for the multi-piece convex collision operator."""

    def test_operator_class_exists(self):
        """FO4_OT_GenerateMultiConvexCollision must be defined in operators.py."""
        src = _read("operators.py")
        self.assertIn(
            "FO4_OT_GenerateMultiConvexCollision",
            src,
            "operators.py must define FO4_OT_GenerateMultiConvexCollision.",
        )

    def test_operator_in_classes_tuple(self):
        """Operator must be included in the classes tuple."""
        src = _read("operators.py")
        # Check it appears after the classes = ( line
        classes_idx = src.find("classes = (")
        op_idx = src.rfind("FO4_OT_GenerateMultiConvexCollision")
        self.assertGreater(
            op_idx, classes_idx,
            "FO4_OT_GenerateMultiConvexCollision must be inside the classes tuple "
            "so it is registered with Blender at startup.",
        )

    def test_operator_in_ui_panels(self):
        """fo4.generate_multi_convex_collision must be wired into ui_panels.py."""
        src = _read("ui_panels.py")
        self.assertIn(
            "fo4.generate_multi_convex_collision",
            src,
            "ui_panels.py must include a button for 'fo4.generate_multi_convex_collision'.",
        )

    def test_uses_bmesh_convex_hull(self):
        """Implementation must use bmesh.ops.convex_hull for hull generation."""
        src = _read("operators.py")
        self.assertIn(
            "convex_hull",
            src,
            "FO4_OT_GenerateMultiConvexCollision must use bmesh.ops.convex_hull "
            "to generate manifold convex hull pieces.",
        )

    def test_ucx_naming_convention(self):
        """Generated pieces must follow UCX_ naming convention."""
        src = _read("operators.py")
        self.assertIn(
            "UCX_",
            src,
            "Multi-piece collision pieces must be named with the UCX_ prefix "
            "so the FO4 NIF exporter recognises them as collision meshes.",
        )

    def test_max_pieces_property_exists(self):
        """max_pieces property must be declared."""
        src = _read("operators.py")
        self.assertIn(
            "max_pieces",
            src,
            "FO4_OT_GenerateMultiConvexCollision must expose a max_pieces "
            "IntProperty so users can control how many collision pieces are created.",
        )


# ---------------------------------------------------------------------------
# Test suite V — Knowledge base content checks
# ---------------------------------------------------------------------------
class TestKnowledgeBaseContent(unittest.TestCase):
    """Check that bundled knowledge-base snippets are present."""

    _KB_DIR = os.path.join(ADDON_DIR, "knowledge_base")

    def _kb_file(self, name):
        return os.path.join(self._KB_DIR, name)

    def test_nif_structure_snippet_exists(self):
        """knowledge_base/fo4_nif_structure.md must be present."""
        self.assertTrue(
            os.path.isfile(self._kb_file("fo4_nif_structure.md")),
            "knowledge_base/fo4_nif_structure.md is missing. "
            "It provides NIF node-hierarchy reference for the AI Advisor.",
        )

    def test_bsm_format_snippet_exists(self):
        """knowledge_base/fo4_bsm_format.md must be present."""
        self.assertTrue(
            os.path.isfile(self._kb_file("fo4_bsm_format.md")),
            "knowledge_base/fo4_bsm_format.md is missing. "
            "It provides BGSM/BGEM material format reference.",
        )

    def test_common_pitfalls_snippet_exists(self):
        """knowledge_base/fo4_common_pitfalls.md must be present."""
        self.assertTrue(
            os.path.isfile(self._kb_file("fo4_common_pitfalls.md")),
            "knowledge_base/fo4_common_pitfalls.md is missing. "
            "It provides a curated list of common FO4 modding mistakes.",
        )

    def test_animation_pipeline_snippet_exists(self):
        """knowledge_base/fo4_animation_pipeline.md must be present."""
        self.assertTrue(
            os.path.isfile(self._kb_file("fo4_animation_pipeline.md")),
            "knowledge_base/fo4_animation_pipeline.md is missing. "
            "It provides the Blender → HKX animation export pipeline reference.",
        )

    def test_nif_structure_non_empty(self):
        """NIF structure snippet must contain substantive content."""
        path = self._kb_file("fo4_nif_structure.md")
        if not os.path.isfile(path):
            self.skipTest("fo4_nif_structure.md absent — covered by existence test")
        content = open(path, encoding="utf-8").read()
        self.assertIn(
            "BSTriShape",
            content,
            "fo4_nif_structure.md must mention BSTriShape (the FO4 geometry node type).",
        )

    def test_bsm_format_mentions_texture_slots(self):
        """BSM format snippet must describe texture slots."""
        path = self._kb_file("fo4_bsm_format.md")
        if not os.path.isfile(path):
            self.skipTest("fo4_bsm_format.md absent — covered by existence test")
        content = open(path, encoding="utf-8").read()
        self.assertIn(
            "DiffuseTexture",
            content,
            "fo4_bsm_format.md must describe the DiffuseTexture field.",
        )


# ---------------------------------------------------------------------------
# Test suite W — requirements-optional.txt torch/torchvision commented out
# ---------------------------------------------------------------------------
class TestRequirementsOptional(unittest.TestCase):
    """Verify that PyTorch is not installed by default via optional requirements."""

    def _src(self):
        return _read("requirements-optional.txt")

    def test_torch_is_commented_out(self):
        """torch must be commented out so it is not installed by default.

        PyTorch is ~2 GB.  Installing it automatically as part of 'optional
        requirements' would surprise users who only need trimesh/pypdf.
        Users who need PyTorch for AI features must uncomment it explicitly.
        """
        src = self._src()
        # Any uncommented 'torch' line should not exist.
        for line in src.splitlines():
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            self.assertFalse(
                stripped.startswith("torch"),
                "requirements-optional.txt must not have an uncommented "
                "'torch' line.  PyTorch (~2 GB) must be opt-in. "
                "Prefix the line with # to comment it out.",
            )
            self.assertFalse(
                stripped.startswith("torchvision"),
                "requirements-optional.txt must not have an uncommented "
                "'torchvision' line.  Comment it out with #.",
            )

    def test_trimesh_is_active(self):
        """trimesh must remain uncommented (it is a core optional dependency)."""
        src = self._src()
        active_lines = [
            line.strip()
            for line in src.splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
        trimesh_active = any(l.startswith("trimesh") for l in active_lines)
        self.assertTrue(
            trimesh_active,
            "trimesh must remain uncommented in requirements-optional.txt; "
            "it is needed for mesh processing features.",
        )


# ---------------------------------------------------------------------------
# Test suite X — bgsm_helpers.py structural checks
# ---------------------------------------------------------------------------

class TestBGSMHelpers(unittest.TestCase):
    """Structural integrity checks for the BGSM/BGEM material writer module."""

    def _src(self):
        return _read("bgsm_helpers.py")

    def test_file_exists(self):
        """bgsm_helpers.py must exist."""
        self.assertTrue(
            os.path.isfile(_path("bgsm_helpers.py")),
            "bgsm_helpers.py is missing — it provides FO4 .bgsm binary export",
        )

    def test_bgsm_magic_constant(self):
        """Module must define the BGSM magic bytes."""
        src = self._src()
        self.assertIn(
            "BGSM",
            src,
            "bgsm_helpers must define the 'BGSM' magic constant.",
        )

    def test_bgem_magic_constant(self):
        """Module must define the BGEM magic bytes."""
        src = self._src()
        self.assertIn(
            "BGEM",
            src,
            "bgsm_helpers must define the 'BGEM' magic constant.",
        )

    def test_bgsm_data_class_exists(self):
        """BGSMData dataclass must be present."""
        src = self._src()
        self.assertIn(
            "class BGSMData",
            src,
            "bgsm_helpers must define a BGSMData class.",
        )

    def test_bgem_data_class_exists(self):
        """BGEMData dataclass must be present."""
        src = self._src()
        self.assertIn(
            "class BGEMData",
            src,
            "bgsm_helpers must define a BGEMData class.",
        )

    def test_write_bgsm_function_exists(self):
        """write_bgsm() function must exist."""
        src = self._src()
        self.assertIn(
            "def write_bgsm",
            src,
            "bgsm_helpers must provide a write_bgsm() function.",
        )

    def test_read_bgsm_function_exists(self):
        """read_bgsm() function must exist."""
        src = self._src()
        self.assertIn(
            "def read_bgsm",
            src,
            "bgsm_helpers must provide a read_bgsm() function.",
        )

    def test_write_bgem_function_exists(self):
        """write_bgem() function must exist."""
        src = self._src()
        self.assertIn(
            "def write_bgem",
            src,
            "bgsm_helpers must provide a write_bgem() function.",
        )

    def test_blender_mat_to_bgsm_function_exists(self):
        """blender_mat_to_bgsm() function must exist."""
        src = self._src()
        self.assertIn(
            "def blender_mat_to_bgsm",
            src,
            "bgsm_helpers must provide blender_mat_to_bgsm() for Blender→BGSM conversion.",
        )

    def test_bgsm_to_blender_mat_function_exists(self):
        """bgsm_to_blender_mat() function must exist."""
        src = self._src()
        self.assertIn(
            "def bgsm_to_blender_mat",
            src,
            "bgsm_helpers must provide bgsm_to_blender_mat() for BGSM→Blender import.",
        )

    def test_export_bgsm_for_object_function_exists(self):
        """export_bgsm_for_object() must exist."""
        src = self._src()
        self.assertIn(
            "def export_bgsm_for_object",
            src,
            "bgsm_helpers must provide export_bgsm_for_object() for the export operator.",
        )

    def test_import_bgsm_for_object_function_exists(self):
        """import_bgsm_for_object() must exist."""
        src = self._src()
        self.assertIn(
            "def import_bgsm_for_object",
            src,
            "bgsm_helpers must provide import_bgsm_for_object() for the import operator.",
        )

    def test_struct_pack_used(self):
        """struct.pack must be used to write binary data."""
        src = self._src()
        self.assertIn(
            "struct.pack",
            src,
            "bgsm_helpers must use struct.pack to write binary BGSM/BGEM fields.",
        )

    def test_little_endian_format(self):
        """All struct format strings must use little-endian '<' prefix."""
        src = self._src()
        self.assertIn(
            '"<',
            src,
            "bgsm_helpers must use little-endian ('<') struct format strings "
            "(FO4 files are little-endian).",
        )

    def test_nistring_helpers_present(self):
        """NiString read/write helpers must be defined."""
        src = self._src()
        self.assertIn(
            "_write_nistring",
            src,
            "bgsm_helpers must define _write_nistring() for NiString encoding.",
        )
        self.assertIn(
            "_read_nistring",
            src,
            "bgsm_helpers must define _read_nistring() for NiString decoding.",
        )

    def test_texture_slot_names_present(self):
        """Standard texture slot names must appear in the source."""
        src = self._src()
        for slot in ("diffuse_texture", "normal_texture", "smooth_spec_texture",
                     "greyscale_texture", "glow_texture"):
            self.assertIn(
                slot,
                src,
                f"bgsm_helpers.BGSMData must have a '{slot}' field.",
            )

    def test_shader_flags_defined(self):
        """ShaderFlags1/2 constants must be defined."""
        src = self._src()
        self.assertIn(
            "SF1_SPECULAR",
            src,
            "bgsm_helpers must define SF1_SPECULAR shader flag constant.",
        )
        self.assertIn(
            "SF2_DOUBLE_SIDED",
            src,
            "bgsm_helpers must define SF2_DOUBLE_SIDED shader flag constant.",
        )

    def test_roundtrip_bgsm(self):
        """write_bgsm → read_bgsm roundtrip must preserve key fields."""
        import importlib.util
        spec_name = "bgsm_helpers_test_import"
        old = sys.modules.pop(spec_name, None)
        try:
            spec = importlib.util.spec_from_file_location(
                spec_name, _path("bgsm_helpers.py")
            )
            mod = importlib.util.module_from_spec(spec)
            # Register in sys.modules before exec so @dataclass can find the module
            sys.modules[spec_name] = mod
            spec.loader.exec_module(mod)

            data = mod.BGSMData(
                diffuse_texture="textures\\clutter\\desk\\desk01_d.dds",
                normal_texture="textures\\clutter\\desk\\desk01_n.dds",
                alpha=0.75,
                alpha_test=True,
                alpha_test_ref=100,
                smoothness=180.0,
                emit_enabled=True,
                emittance_color=(1.0, 0.5, 0.0),
                emittance_mult=2.0,
            )
            raw = mod.write_bgsm(data)
            self.assertIsInstance(raw, bytes, "write_bgsm must return bytes")
            self.assertTrue(raw[:4] == b"BGSM", "BGSM magic must be first 4 bytes")

            data2 = mod.read_bgsm(raw)
            self.assertEqual(data2.diffuse_texture, data.diffuse_texture)
            self.assertEqual(data2.normal_texture, data.normal_texture)
            self.assertAlmostEqual(data2.alpha, data.alpha, places=5)
            self.assertEqual(data2.alpha_test, data.alpha_test)
            self.assertEqual(data2.alpha_test_ref, data.alpha_test_ref)
            self.assertAlmostEqual(data2.smoothness, data.smoothness, places=2)
            self.assertEqual(data2.emit_enabled, data.emit_enabled)
            self.assertAlmostEqual(data2.emittance_mult, data.emittance_mult, places=5)
        finally:
            sys.modules.pop(spec_name, None)
            if old is not None:
                sys.modules[spec_name] = old

    def test_roundtrip_bgem(self):
        """write_bgem → read_bgem roundtrip must preserve key fields."""
        import importlib.util
        spec_name = "bgem_helpers_test_import"
        old = sys.modules.pop(spec_name, None)
        try:
            spec = importlib.util.spec_from_file_location(
                spec_name, _path("bgsm_helpers.py")
            )
            mod = importlib.util.module_from_spec(spec)
            # Register in sys.modules before exec so @dataclass can find the module
            sys.modules[spec_name] = mod
            spec.loader.exec_module(mod)

            data = mod.BGEMData(
                base_texture="textures\\effects\\fire\\fire01.dds",
                falloff_start_angle=0.2,
                falloff_stop_angle=1.4,
                soft_depth=50.0,
            )
            raw = mod.write_bgem(data)
            self.assertTrue(raw[:4] == b"BGEM", "BGEM magic must be first 4 bytes")

            data2 = mod.read_bgem(raw)
            self.assertEqual(data2.base_texture, data.base_texture)
            self.assertAlmostEqual(data2.falloff_start_angle, data.falloff_start_angle, places=5)
            self.assertAlmostEqual(data2.soft_depth, data.soft_depth, places=3)
        finally:
            sys.modules.pop(spec_name, None)
            if old is not None:
                sys.modules[spec_name] = old

    def test_export_bgsm_operator_in_operators(self):
        """FO4_OT_ExportBGSM must appear in operators.py."""
        src = _read("operators.py")
        self.assertIn(
            "FO4_OT_ExportBGSM",
            src,
            "operators.py must define FO4_OT_ExportBGSM.",
        )

    def test_import_bgsm_operator_in_operators(self):
        """FO4_OT_ImportBGSM must appear in operators.py."""
        src = _read("operators.py")
        self.assertIn(
            "FO4_OT_ImportBGSM",
            src,
            "operators.py must define FO4_OT_ImportBGSM.",
        )

    def test_batch_export_bgsm_operator_in_operators(self):
        """FO4_OT_BatchExportBGSM must appear in operators.py."""
        src = _read("operators.py")
        self.assertIn(
            "FO4_OT_BatchExportBGSM",
            src,
            "operators.py must define FO4_OT_BatchExportBGSM.",
        )

    def test_bgsm_operators_in_classes_tuple(self):
        """All three BGSM operators must be in the operators.py classes tuple."""
        src = _read("operators.py")
        for cls_name in ("FO4_OT_ExportBGSM", "FO4_OT_ImportBGSM", "FO4_OT_BatchExportBGSM"):
            # Find if present after 'classes = ('
            classes_idx = src.find("classes = (")
            self.assertGreater(classes_idx, 0, "operators.py must have a 'classes = (' tuple")
            self.assertIn(
                cls_name,
                src[classes_idx:],
                f"{cls_name} must be in the classes tuple so it is registered at startup.",
            )

    def test_bgsm_buttons_in_ui_panels(self):
        """BGSM operator IDs must be referenced in ui_panels.py."""
        src = _read("ui_panels.py")
        for op_id in ("fo4.export_bgsm", "fo4.import_bgsm", "fo4.batch_export_bgsm"):
            self.assertIn(
                op_id,
                src,
                f"ui_panels.py must include a call to layout.operator('{op_id}').",
            )

    def test_bgsm_module_imported_in_init(self):
        """bgsm_helpers must be imported in __init__.py."""
        src = _read("__init__.py")
        self.assertIn(
            "bgsm_helpers",
            src,
            "__init__.py must import bgsm_helpers so the module is loaded at startup.",
        )

    def test_register_unregister_present(self):
        """Module must have register() and unregister() stubs."""
        src = self._src()
        self.assertIn("def register", src)
        self.assertIn("def unregister", src)


# ---------------------------------------------------------------------------
# Test suite Y — fo4_game_assets.py BA2 extraction checks
# ---------------------------------------------------------------------------

class TestBA2Extraction(unittest.TestCase):
    """Structural integrity checks for the BA2 extraction feature."""

    def _src(self):
        return _read("fo4_game_assets.py")

    def test_extract_ba2_method_exists(self):
        """FO4GameAssets.extract_ba2() static method must exist."""
        src = self._src()
        self.assertIn(
            "def extract_ba2",
            src,
            "fo4_game_assets.FO4GameAssets must have an extract_ba2() method.",
        )

    def test_extract_asset_method_exists(self):
        """FO4GameAssets.extract_asset() static method must exist."""
        src = self._src()
        self.assertIn(
            "def extract_asset",
            src,
            "fo4_game_assets.FO4GameAssets must have an extract_asset() method.",
        )

    def test_find_archive2_method_exists(self):
        """FO4GameAssets._find_archive2() helper must exist."""
        src = self._src()
        self.assertIn(
            "_find_archive2",
            src,
            "fo4_game_assets must define _find_archive2() to locate Archive2.exe.",
        )

    def test_subprocess_used_for_extraction(self):
        """subprocess.run must be used to invoke Archive2.exe."""
        src = self._src()
        self.assertIn(
            "subprocess.run",
            src,
            "fo4_game_assets must use subprocess.run to call Archive2.exe.",
        )

    def test_extract_ba2_operator_in_operators(self):
        """FO4_OT_ExtractBA2Asset must appear in operators.py."""
        src = _read("operators.py")
        self.assertIn(
            "FO4_OT_ExtractBA2Asset",
            src,
            "operators.py must define FO4_OT_ExtractBA2Asset.",
        )

    def test_extract_ba2_operator_in_classes_tuple(self):
        """FO4_OT_ExtractBA2Asset must be in the operators.py classes tuple."""
        src = _read("operators.py")
        classes_idx = src.find("classes = (")
        self.assertGreater(classes_idx, 0)
        self.assertIn(
            "FO4_OT_ExtractBA2Asset",
            src[classes_idx:],
            "FO4_OT_ExtractBA2Asset must be in the classes tuple.",
        )

    def test_extract_ba2_button_in_ui_panels(self):
        """fo4.extract_ba2_asset must be referenced in ui_panels.py."""
        src = _read("ui_panels.py")
        self.assertIn(
            "fo4.extract_ba2_asset",
            src,
            "ui_panels.py must include fo4.extract_ba2_asset operator button.",
        )

    def test_winreg_import_guarded(self):
        """winreg import must be inside a try/except for cross-platform safety."""
        src = self._src()
        # Should have try: import winreg pattern, not a bare import
        self.assertNotIn(
            "\nimport winreg\n",
            src,
            "fo4_game_assets must guard 'import winreg' with try/except "
            "so the module loads on Linux/macOS.",
        )

    def test_extract_ba2_returns_tuple(self):
        """extract_ba2 and extract_asset must return (bool, str) tuples."""
        src = self._src()
        # Both methods should have 'return (False, ' or 'return False,' + str
        self.assertIn(
            "return False",
            src,
            "extract_ba2/extract_asset must return (False, message) on failure.",
        )
        self.assertIn(
            "return True",
            src,
            "extract_ba2/extract_asset must return (True, message) on success.",
        )

    def test_archive2_not_found_message_helpful(self):
        """Missing Archive2.exe error must point the user to the CK."""
        src = self._src()
        self.assertIn(
            "Archive2",
            src,
            "fo4_game_assets must mention Archive2.exe in its extraction error messages.",
        )


class TestPrepareThirdPartyMeshNonManifoldFix(unittest.TestCase):
    """Structural checks for the non-manifold auto-fix added to FO4_OT_PrepareThirdPartyMesh."""

    def _src(self):
        return _read("operators.py")

    def test_fix_non_manifold_property_exists(self):
        """FO4_OT_PrepareThirdPartyMesh must declare fix_non_manifold BoolProperty."""
        src = self._src()
        self.assertIn(
            "fix_non_manifold",
            src,
            "FO4_OT_PrepareThirdPartyMesh must have a fix_non_manifold BoolProperty.",
        )

    def test_fix_non_manifold_default_true(self):
        """fix_non_manifold must default to True so the fix runs automatically."""
        src = self._src()
        # The property declaration block must include default=True near fix_non_manifold
        idx = src.find("fix_non_manifold")
        self.assertGreater(idx, 0)
        # Search in the next 500 chars for the default
        snippet = src[idx: idx + 500]
        self.assertIn(
            "default=True",
            snippet,
            "fix_non_manifold BoolProperty must have default=True.",
        )

    def test_fill_holes_called_in_execute(self):
        """execute() must call fill_holes to repair open-boundary non-manifold edges."""
        src = self._src()
        self.assertIn(
            "fill_holes",
            src,
            "FO4_OT_PrepareThirdPartyMesh.execute() must call bpy.ops.mesh.fill_holes.",
        )

    def test_select_non_manifold_called_in_execute(self):
        """execute() must select non-manifold geometry before attempting the fill."""
        src = self._src()
        self.assertIn(
            "select_non_manifold",
            src,
            "FO4_OT_PrepareThirdPartyMesh.execute() must call "
            "bpy.ops.mesh.select_non_manifold() to target only problem edges.",
        )

    def test_merge_by_distance_called_in_execute(self):
        """execute() must call merge_by_distance to catch duplicate-vert open edges."""
        src = self._src()
        self.assertIn(
            "merge_by_distance",
            src,
            "FO4_OT_PrepareThirdPartyMesh.execute() must call merge_by_distance "
            "as part of non-manifold repair.",
        )

    def test_remaining_nm_warning_is_actionable(self):
        """The warning for unfixable non-manifold edges must guide the user."""
        src = self._src()
        self.assertIn(
            "Alt+Ctrl+Shift+M",
            src,
            "The non-manifold warning must include the keyboard shortcut "
            "Alt+Ctrl+Shift+M so users can immediately select the problem edges.",
        )

    def test_fix_non_manifold_checkbox_in_draw(self):
        """draw() must expose fix_non_manifold so users can disable auto-repair."""
        src = self._src()
        # find the draw() method of PrepareThirdPartyMesh and check it contains the prop
        draw_idx = src.find('col.prop(self, "fix_non_manifold")')
        self.assertGreater(
            draw_idx,
            0,
            'FO4_OT_PrepareThirdPartyMesh.draw() must include '
            'col.prop(self, "fix_non_manifold") so the option is visible in the dialog.',
        )

    def test_nm_fix_suppresses_duplicate_validate_warning(self):
        """validate_mesh non-manifold warning must be suppressed when fix already ran."""
        src = self._src()
        self.assertIn(
            "_nm_fix_attempted",
            src,
            "execute() must track _nm_fix_attempted and skip the duplicate "
            "validate_mesh non-manifold warning when the fix step already reported it.",
        )


if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
