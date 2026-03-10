#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Addon Integrity Test Suite
Tests the addon package to verify all components are working correctly
"""

import sys
import os
import zipfile
import importlib
import importlib.util
import types
from pathlib import Path

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# ---------------------------------------------------------------------------
# Blender stubs
# ---------------------------------------------------------------------------
# Many add-on modules begin with `import bpy` (and bmesh / mathutils).
# When running outside Blender these modules don't exist, so the test
# installs lightweight stubs so the add-on code can be loaded and
# inspected without a running Blender instance.

def _install_bpy_stub():
    """Install bpy / bmesh / mathutils stubs into sys.modules.

    Safe to call multiple times — already-installed stubs are left alone.
    """
    if "bpy" in sys.modules:
        return  # already installed

    # ------------------------------------------------------------------
    # Tiny helpers
    # ------------------------------------------------------------------
    def _noop(*a, **kw):
        return None

    def _prop(*a, **kw):
        """All bpy.props.* constructors return a sentinel annotation."""
        return None

    class _Any:
        """Flexible stand-in: absorbs any attribute access or call."""
        def __getattr__(self, n):
            return _Any()
        def __call__(self, *a, **kw):
            return _Any()
        def __iter__(self):
            return iter([])
        def __bool__(self):
            return False
        def get(self, k, d=None):
            return d

    # ------------------------------------------------------------------
    # bpy.props
    # ------------------------------------------------------------------
    bpy_props = types.ModuleType("bpy.props")
    for _p in (
        "StringProperty", "IntProperty", "FloatProperty", "BoolProperty",
        "EnumProperty", "FloatVectorProperty", "IntVectorProperty",
        "PointerProperty", "CollectionProperty",
    ):
        setattr(bpy_props, _p, _prop)

    # ------------------------------------------------------------------
    # bpy.types  — base classes for Operator, Panel, etc.
    # ------------------------------------------------------------------
    bpy_types = types.ModuleType("bpy.types")
    for _t in (
        "Operator", "Panel", "PropertyGroup", "AddonPreferences",
        "UIList", "Menu", "Header", "NodeTree", "Node", "NodeSocket",
    ):
        setattr(bpy_types, _t, type(_t, (), {}))
    bpy_types.WindowManager = type("WindowManager", (), {})

    # ------------------------------------------------------------------
    # bpy.utils
    # ------------------------------------------------------------------
    bpy_utils = types.ModuleType("bpy.utils")
    bpy_utils.register_class   = _noop
    bpy_utils.unregister_class = _noop
    bpy_utils.previews         = _Any()

    # ------------------------------------------------------------------
    # bpy.app
    # ------------------------------------------------------------------
    bpy_app = types.ModuleType("bpy.app")
    bpy_app.version        = (4, 0, 0)
    bpy_app.version_string = "4.0.0"
    bpy_app.timers         = _Any()

    # ------------------------------------------------------------------
    # bpy.path
    # ------------------------------------------------------------------
    bpy_path = types.ModuleType("bpy.path")
    bpy_path.abspath = lambda p: p

    # ------------------------------------------------------------------
    # bpy main module
    # ------------------------------------------------------------------
    bpy_mod = types.ModuleType("bpy")
    bpy_mod.props   = bpy_props
    bpy_mod.types   = bpy_types
    bpy_mod.utils   = bpy_utils
    bpy_mod.app     = bpy_app
    bpy_mod.path    = bpy_path
    bpy_mod.context = _Any()
    bpy_mod.ops     = _Any()
    bpy_mod.data    = _Any()

    sys.modules["bpy"]       = bpy_mod
    sys.modules["bpy.props"] = bpy_props
    sys.modules["bpy.types"] = bpy_types
    sys.modules["bpy.utils"] = bpy_utils
    sys.modules["bpy.app"]   = bpy_app
    sys.modules["bpy.path"]  = bpy_path

    # ------------------------------------------------------------------
    # bmesh
    # ------------------------------------------------------------------
    class _BMVerts(list):
        def ensure_lookup_table(self): pass

    class _BMEdges(list):
        def ensure_lookup_table(self): pass

    class _BMFaces(list):
        def ensure_lookup_table(self): pass

    class _BMLoopsUV:
        active = None

    class _BMLoopsLayers:
        uv = _BMLoopsUV()

    class _BMLoops:
        layers = _BMLoopsLayers()

    class _BMesh:
        verts = _BMVerts()
        edges = _BMEdges()
        faces = _BMFaces()
        loops = _BMLoops()

        def from_mesh(self, m): pass
        def to_mesh(self, m): pass
        def free(self): pass
        def normal_update(self): pass
        def __enter__(self): return self
        def __exit__(self, *a): pass

    bmesh_mod = types.ModuleType("bmesh")
    bmesh_mod.new  = lambda: _BMesh()
    bmesh_mod.ops  = _Any()
    bmesh_mod.types = _Any()
    sys.modules["bmesh"] = bmesh_mod

    # ------------------------------------------------------------------
    # mathutils
    # ------------------------------------------------------------------
    class Vector(tuple):
        def __new__(cls, v=(0, 0, 0)):
            return tuple.__new__(cls, v)

    class Matrix(list):
        pass

    class Euler(tuple):
        def __new__(cls, v=(0, 0, 0)):
            return tuple.__new__(cls, v)

    mathutils_mod = types.ModuleType("mathutils")
    mathutils_mod.Vector = Vector
    mathutils_mod.Matrix = Matrix
    mathutils_mod.Euler  = Euler
    sys.modules["mathutils"] = mathutils_mod


def _register_addon_package(addon_dir: Path):
    """Register *addon_dir* as the ``fallout4_tutorial_helper`` package.

    This lets relative imports (``from . import preferences``) inside
    add-on modules resolve correctly when the files are loaded directly
    from disk by the test runner.
    """
    pkg_name = "fallout4_tutorial_helper"
    if pkg_name in sys.modules:
        return

    pkg = types.ModuleType(pkg_name)
    pkg.__path__    = [str(addon_dir)]
    pkg.__package__ = pkg_name
    pkg.__file__    = str(addon_dir / "__init__.py")
    sys.modules[pkg_name] = pkg

    # Pre-populate lightweight stubs for the most-imported sub-modules so
    # modules can do ``from . import preferences`` without loading the full
    # Blender-dependent module.
    _prefs = types.ModuleType(f"{pkg_name}.preferences")
    _prefs.get_preferences                  = lambda: None
    _prefs.get_llm_config                   = lambda: {}
    _prefs.get_configured_ffmpeg_path       = lambda: None
    _prefs.get_configured_nvcompress_path   = lambda: None
    _prefs.get_configured_texconv_path      = lambda: None
    _prefs.get_havok2fbx_path               = lambda: None
    sys.modules[f"{pkg_name}.preferences"]  = _prefs
    # Also available as the bare name so direct imports also work
    sys.modules.setdefault("preferences", _prefs)


def _load_module(addon_dir: Path, module_name: str):
    """Load *module_name* from *addon_dir* with all stubs in place.

    Returns ``(module, None)`` on success or ``(None, error_string)``
    on failure.
    """
    pkg_name  = "fallout4_tutorial_helper"
    full_name = f"{pkg_name}.{module_name}"

    # Return cached module if already loaded
    if full_name in sys.modules:
        return sys.modules[full_name], None

    module_path = addon_dir / f"{module_name}.py"
    if not module_path.exists():
        return None, "File not found"

    spec = importlib.util.spec_from_file_location(full_name, module_path)
    module = importlib.util.module_from_spec(spec)
    module.__package__ = pkg_name
    sys.modules[full_name] = module
    # Also make it reachable as the bare module name so cross-imports work
    sys.modules.setdefault(module_name, module)

    try:
        spec.loader.exec_module(module)
        return module, None
    except Exception as exc:
        sys.modules.pop(full_name, None)
        sys.modules.pop(module_name, None)
        return None, str(exc)



def test_zip_contents():
    """Verify all required files are in the zip with correct structure"""
    print("\n" + "="*70)
    print("TEST 1: Checking zip file contents and structure")
    print("="*70)

    zip_path = Path(__file__).parent / "fallout4_tutorial_helper-v2.1.3.zip"
    addon_dir = "fallout4_tutorial_helper"

    if not zip_path.exists():
        print(f"❌ FAILED: Zip file not found at {zip_path}")
        return False

    required_files = [
        "__init__.py",
        "operators.py",
        "ui_panels.py",
        "preferences.py",
        "export_helpers.py",
        "asset_ripper_helpers.py",
        "asset_studio_helpers.py",
        "umodel_tools_helpers.py",
        "unity_fbx_importer_helpers.py",
        "nvtt_helpers.py",
        "mesh_helpers.py",
        "texture_helpers.py",
        "tool_installers.py",
        "notification_system.py",
    ]

    with zipfile.ZipFile(zip_path, 'r') as zf:
        zip_contents = zf.namelist()
        print(f"Zip contains {len(zip_contents)} files")

        # Check if files are in the correct directory
        files_in_addon_dir = [f for f in zip_contents if f.startswith(f"{addon_dir}/")]
        files_at_root = [f for f in zip_contents if not f.startswith(f"{addon_dir}/")]

        if files_at_root:
            print(f"❌ FAILED: Found {len(files_at_root)} files at root level (should be in {addon_dir}/ directory)")
            for f in files_at_root[:5]:  # Show first 5
                print(f"  - {f}")
            return False

        print(f"✅ All files properly contained in {addon_dir}/ directory")

        # Check for required files
        missing = []
        for required in required_files:
            expected_path = f"{addon_dir}/{required}"
            if expected_path not in zip_contents:
                missing.append(required)

        if missing:
            print(f"❌ FAILED: Missing required files: {', '.join(missing)}")
            return False

        print(f"✅ PASSED: All {len(required_files)} required files present in correct structure")
        return True


def test_module_imports():
    """Test if all modules can be imported without errors"""
    print("\n" + "="*70)
    print("TEST 2: Testing module imports")
    print("="*70)

    addon_dir = Path(__file__).parent

    test_modules = [
        "export_helpers",
        "asset_ripper_helpers",
        "asset_studio_helpers",
        "umodel_tools_helpers",
        "unity_fbx_importer_helpers",
        "nvtt_helpers",
        "mesh_helpers",
        "texture_helpers",
        "tool_installers",
        "notification_system",
    ]

    failed_imports = []
    for module_name in test_modules:
        module, err = _load_module(addon_dir, module_name)
        if module is not None:
            print(f"✅ {module_name}: Import successful")
        else:
            print(f"❌ {module_name}: Import failed - {err}")
            failed_imports.append(module_name)

    if failed_imports:
        print(f"\n❌ FAILED: {len(failed_imports)} module(s) failed to import")
        return False

    print(f"\n✅ PASSED: All {len(test_modules)} modules imported successfully")
    return True


def test_export_functions():
    """Verify critical export functions exist and have correct signatures"""
    print("\n" + "="*70)
    print("TEST 3: Verifying export functions")
    print("="*70)

    addon_dir = Path(__file__).parent

    module, err = _load_module(addon_dir, "export_helpers")
    if module is None:
        print(f"❌ FAILED: Could not load export_helpers - {err}")
        return False

    required_functions = [
        "export_mesh_to_nif",
        "export_mesh_with_collision",
        "export_scene_as_single_nif",
        "export_complete_mod",
    ]

    missing = []
    for func_name in required_functions:
        if hasattr(module.ExportHelpers, func_name):
            print(f"✅ {func_name}: Found")
        else:
            print(f"❌ {func_name}: Missing from ExportHelpers")
            missing.append(func_name)

    if missing:
        print(f"\n❌ FAILED: Missing {len(missing)} function(s)")
        return False

    print(f"\n✅ PASSED: All {len(required_functions)} export functions present")
    return True


def test_tool_helpers():
    """Verify tool helper modules have required functions"""
    print("\n" + "="*70)
    print("TEST 4: Verifying tool helper functions")
    print("="*70)

    addon_dir = Path(__file__).parent

    test_cases = [
        ("asset_ripper_helpers",    ["status", "download_latest", "repo_path"]),
        ("asset_studio_helpers",    ["status", "download_latest", "repo_path"]),
        ("umodel_tools_helpers",    ["status", "download_latest", "addon_path"]),
        ("unity_fbx_importer_helpers", ["status", "download_latest", "repo_path"]),
        ("nvtt_helpers",    ["convert_to_dds", "convert_object_textures"]),
        ("mesh_helpers",    ["optimize_mesh", "validate_mesh"]),
        ("texture_helpers", ["setup_fo4_material"]),
    ]

    failed = []
    for module_name, functions in test_cases:
        module, err = _load_module(addon_dir, module_name)
        if module is None:
            print(f"❌ {module_name}: Load failed - {err}")
            failed.append(module_name)
            continue

        # Find the primary helper class (name contains "Helper")
        helper_class = next(
            (getattr(module, n) for n in dir(module)
             if "Helper" in n and not n.startswith("_")),
            None,
        )

        for func_name in functions:
            found = (
                (helper_class is not None and hasattr(helper_class, func_name))
                or hasattr(module, func_name)
            )
            if found:
                print(f"✅ {module_name}.{func_name}: Found")
            else:
                print(f"❌ {module_name}.{func_name}: Missing")
                failed.append(f"{module_name}.{func_name}")

    if failed:
        print(f"\n❌ FAILED: {len(failed)} function(s) missing or errors")
        return False

    print(f"\n✅ PASSED: All tool helper functions present")
    return True


def test_fo4_export_settings():
    """Verify Fallout 4 NIF export settings are correct"""
    print("\n" + "="*70)
    print("TEST 5: Verifying Fallout 4 NIF export configuration")
    print("="*70)

    addon_dir = Path(__file__).parent
    sys.path.insert(0, str(addon_dir))

    try:
        # Read export_helpers.py to check for correct FO4 settings
        export_helpers_path = addon_dir / "export_helpers.py"
        with open(export_helpers_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # ----------------------------------------------------------------
        # Core FO4 export settings
        # ----------------------------------------------------------------
        checks = [
            ("FALLOUT_4 game profile",          "FALLOUT_4" in content),
            ("Tangent space setting",            "tangent_space" in content or "use_tangent_space" in content),
            ("Scale correction",                 "scale_correction" in content),
            ("Triangulate modifier",             "Triangulate" in content),
            ("BSTriShape mention",               "BSTriShape" in content),
            # Automation: scene settings applied automatically before every export
            ("Auto scene settings method",       "_apply_niftools_scene_settings" in content),
            ("Scene game property set auto",     "niftools_scene" in content and "ns.game" in content),
            ("NIF version auto-set",             "nif_version" in content and "20.2.0.7" in content),
            ("User version auto-set",            "user_version" in content),
            ("Game enum fallbacks",              '"Fallout 4"' in content or "'Fallout 4'" in content),
            # -----------------------------------------------------------
            # Blender 4.x face_maps compatibility patch (the fix for the
            # reported AttributeError crash in niftools v0.1.1)
            # -----------------------------------------------------------
            ("Blender 4.x compat patch method", "_apply_niftools_blender4_compat_patches" in content),
            ("face_maps AttributeError fix",     "face_maps" in content and "hasattr" in content),
            ("get_polygon_parts patch",          "_patched_get_polygon_parts" in content),
            ("export_skin_partition patch",      "_patched_export_skin_partition" in content),
            # -----------------------------------------------------------
            # Three Fallout 4 editions (OG / NG / AE)
            # -----------------------------------------------------------
            ("FO4 OG profile present",           "FALLOUT_4" in content),
            ("FO4 NG profile present",           "FALLOUT_4_NG" in content),
            ("FO4 AE profile present",           "FALLOUT_4_AE" in content),
            # -----------------------------------------------------------
            # Authoritative NIF version numbers (from niftools/nifxml)
            # -----------------------------------------------------------
            ("FO4 bsver 130 (authoritative)",    '"user_version_2":           130' in content),
            ("FO3/NV bsver 34",                  '"user_version_2":           34' in content),
            ("Skyrim bsver 83",                  '"user_version_2":           83' in content),
            ("Skyrim SE bsver 100",              '"user_version_2":           100' in content),
            # -----------------------------------------------------------
            # Multi-game profiles beyond FO4
            # -----------------------------------------------------------
            ("NIF game profiles dict",           "_NIF_GAME_PROFILES" in content),
            ("Game alias map",                   "_NIF_GAME_ALIAS_MAP" in content),
            ("Skyrim profile present",           '"SKYRIM"' in content),
            ("Oblivion profile present",         '"OBLIVION"' in content),
            ("FO3 profile present",              '"FALLOUT_3"' in content),
            # -----------------------------------------------------------
            # Per-game skin partition settings
            # -----------------------------------------------------------
            ("Skin partition kwarg",             "skin_partition" in content),
            ("Max bones per partition",          "max_bones_per_partition" in content),
            # -----------------------------------------------------------
            # Compat patch called at both NIF export sites
            # -----------------------------------------------------------
            ("Compat patch called in export_mesh_to_nif",
             content.count("_apply_niftools_blender4_compat_patches") >= 3),
        ]

        failed = []
        for check_name, result in checks:
            if result:
                print(f"✅ {check_name}: Found")
            else:
                print(f"❌ {check_name}: Missing")
                failed.append(check_name)

        # ----------------------------------------------------------------
        # DDS texture compression (nvtt_helpers)
        # ----------------------------------------------------------------
        nvtt_path = addon_dir / "nvtt_helpers.py"
        with open(nvtt_path, 'r', encoding='utf-8') as f:
            nvtt_content = f.read()

        dds_checks = [
            ("BC1 (DXT1) for diffuse", "'bc1'" in nvtt_content or "'BC1'" in nvtt_content),
            ("BC5 (ATI2) for normals", "'bc5'" in nvtt_content or "'BC5'" in nvtt_content),
            ("BC3 (DXT5) for alpha",   "'bc3'" in nvtt_content or "'BC3'" in nvtt_content),
        ]

        for check_name, result in dds_checks:
            if result:
                print(f"✅ {check_name}: Found")
            else:
                print(f"❌ {check_name}: Missing")
                failed.append(check_name)

        if failed:
            print(f"\n❌ FAILED: {len(failed)} configuration(s) missing")
            return False

        print(f"\n✅ PASSED: All Fallout 4 export settings configured correctly")
        return True

    except Exception as e:
        print(f"❌ FAILED: Could not verify FO4 settings - {str(e)}")
        return False


def test_d_drive_paths():
    """Verify D: drive path configuration"""
    print("\n" + "="*70)
    print("TEST 6: Verifying D: drive tool paths")
    print("="*70)

    addon_dir = Path(__file__).parent

    helper_files = [
        "asset_ripper_helpers.py",
        "asset_studio_helpers.py",
        "umodel_tools_helpers.py",
        "unity_fbx_importer_helpers.py",
        "tool_installers.py",
    ]

    failed = []
    for helper_file in helper_files:
        try:
            file_path = addon_dir / helper_file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            if 'D:/blender_tools' in content or 'D:/blender_tools/' in content:
                print(f"✅ {helper_file}: D: drive path configured")
            else:
                print(f"❌ {helper_file}: D: drive path NOT found")
                failed.append(helper_file)

        except Exception as e:
            print(f"❌ {helper_file}: Error checking - {str(e)}")
            failed.append(helper_file)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} file(s) missing D: drive configuration")
        return False

    print(f"\n✅ PASSED: All tool helpers configured for D: drive")
    return True


def run_all_tests():
    """Run all test suites"""
    print("\n" + "="*70)
    print("FALLOUT 4 ADDON INTEGRITY TEST SUITE")
    print("="*70)

    # Install Blender API stubs so bpy-dependent modules can be imported
    # outside of a live Blender instance.
    addon_dir = Path(__file__).parent
    _install_bpy_stub()
    _register_addon_package(addon_dir)

    tests = [
        ("Zip Contents", test_zip_contents),
        ("Module Imports", test_module_imports),
        ("Export Functions", test_export_functions),
        ("Tool Helpers", test_tool_helpers),
        ("FO4 Export Settings", test_fo4_export_settings),
        ("D: Drive Paths", test_d_drive_paths),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        try:
            result = test_func()
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"\n❌ TEST CRASHED: {test_name} - {str(e)}")
            failed += 1

    print("\n" + "="*70)
    print("FINAL TEST RESULTS")
    print("="*70)
    print(f"✅ Passed: {passed}/{len(tests)}")
    print(f"❌ Failed: {failed}/{len(tests)}")

    if failed == 0:
        print("\n🎉 ALL TESTS PASSED! Addon is ready for use.")
        return 0
    else:
        print(f"\n⚠️  {failed} test suite(s) failed - review errors above")
        return 1


if __name__ == '__main__':
    exit_code = run_all_tests()
    sys.exit(exit_code)
