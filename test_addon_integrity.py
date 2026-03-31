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



# ---------------------------------------------------------------------------
# Section K: bundled knowledge_base/ directory must exist
# ---------------------------------------------------------------------------

class TestKnowledgeBaseDirectoryBundled(unittest.TestCase):
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
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
