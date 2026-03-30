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
        fo4.* — it closes the gap that lets wm.mossy_link_toggle and
        torch.install_custom_path silently vanish when their classes are
        removed or renamed.

        Prefixes checked:
          fo4.*   — exclusively ours, all must be in our files
          torch.* — exclusively ours, all must be in our files
          wm.*    — shared with Blender; only flag ops not in KNOWN_BLENDER_OPERATORS
                    and not defined in our files
        """
        # Blender built-in wm.* operators we call but do NOT define ourselves.
        # Only add entries here for genuine Blender built-ins (verified in the
        # Blender Python API docs); anything else must have a bl_idname in one
        # of our operator files.
        KNOWN_BLENDER_OPERATORS = {
            "wm.url_open",   # bpy.ops.wm.url_open() — opens a URL in the OS browser
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
                    f"(will crash in worker subprocess — see RECURRING BUG #6)"
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
                "Nested f-string(s) with backslash detected — pre-compute the value "
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

        IMPORTANT — RECURRING BUG #1 (see DEVELOPMENT_NOTES.md):
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
            # always draws the button — prevents the "loading..." label problem
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
            "torch_path_manager.py is missing — PyTorch operators will be unavailable",
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
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
