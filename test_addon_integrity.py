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
    bpy_app.handlers       = types.SimpleNamespace(persistent=lambda f: f)

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

    zip_candidates = sorted(Path(__file__).parent.glob("fallout4_tutorial_helper-v*.zip"))
    if not zip_candidates:
        print("❌ FAILED: No fallout4_tutorial_helper-v*.zip found in addon directory")
        print("   Run: python build.py  to generate it")
        return False
    zip_path = zip_candidates[-1]   # use the newest one
    print(f"Testing zip: {zip_path.name}")
    addon_dir = "fallout4_tutorial_helper"

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
        # Post-processing (ImageSpace / IMAD)
        "post_processing_helpers.py",
        # Material browser
        "fo4_material_browser.py",
        # Scene diagnostics
        "fo4_scene_diagnostics.py",
        # Scale reference objects
        "fo4_reference_helpers.py",
        # Papyrus script template generator
        "papyrus_helpers.py",
        # Havok physics properties
        "fo4_physics_helpers.py",
        # Mod packaging helpers
        "mod_packaging_helpers.py",
        # Knowledge base docs
        "knowledge_base/fo4_post_processing.md",
        "knowledge_base/fo4_export.md",
        "knowledge_base/fo4_materials.md",
        "knowledge_base/fo4_reference_scale.md",
        "knowledge_base/collision_materials.md",
        "knowledge_base/textures_dds.md",
        "knowledge_base/fo4_papyrus.md",
        "knowledge_base/fo4_physics.md",
        "knowledge_base/fo4_mod_packaging.md",
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
        ("umodel_helpers",          ["status", "download_latest", "tool_path",
                                     "executable_path", "open_download_page"]),
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
            # -----------------------------------------------------------
            # Two-phase Havok collision pipeline
            # -----------------------------------------------------------
            ("Collision NIF postprocess table",  "_COLLISION_NIF_POSTPROCESS" in content),
            ("Pre-export collision properties",  "_apply_collision_nif_properties" in content),
            ("Post-export NIF patcher",          "_postprocess_nif_set_collision" in content),
            ("BSXFlags injection",               "BSXFlags" in content and "integer_data" in content),
            # FO4-specific Havok material enum (Fallout4HavokMaterial) with
            # SkyrimHavokMaterial kept as fallback for older pyffi builds.
            ("FO4 havok_material enum (primary)",  "Fallout4HavokMaterial" in content),
            ("havok_material fallback (Skyrim)",   "SkyrimHavokMaterial" in content),
            # FO4-specific material value names (FO4_HAV_MAT_*)
            ("FO4 havok material value names",    "FO4_HAV_MAT_STONE" in content),
            # FO4-specific collision layer enum (Fallout4Layer / FOL_*)
            ("FO4 collision layer enum (primary)", "Fallout4Layer" in content),
            ("FO4 layer value names (FOL_*)",      "FOL_STATIC" in content),
            ("Collision layer fallback (Skyrim)",  "SkyrimLayer" in content),
            ("bhkNPCollisionObject patch",       "bhkNPCollisionObject" in content),
            ("pyffi NIF read/write",             "NifFormat" in content and "data.read" in content),
            ("Collision called from export",     "_apply_collision_nif_properties" in content
                                                  and "_postprocess_nif_set_collision" in content),
        ]

        failed = []
        for check_name, result in checks:
            if result:
                print(f"✅ {check_name}: Found")
            else:
                print(f"❌ {check_name}: Missing")
                failed.append(check_name)

        # ----------------------------------------------------------------
        # Verify knowledge_base/fo4_export.md uses the correct bsver value
        # ----------------------------------------------------------------
        kb_path = addon_dir / "knowledge_base" / "fo4_export.md"
        with open(kb_path, 'r', encoding='utf-8') as f:
            kb_content = f.read()

        kb_checks = [
            # Correct user_version_2 value: 130 (not 131073)
            ("KB: user_version_2 is 130",     "| 130" in kb_content and "User version 2" in kb_content),
            ("KB: wrong value 131073 absent",  "131073" not in kb_content),
        ]

        for check_name, result in kb_checks:
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

        # ----------------------------------------------------------------
        # Per-type collision physics presets (mesh_helpers.py)
        # ----------------------------------------------------------------
        mesh_helpers_path = addon_dir / "mesh_helpers.py"
        with open(mesh_helpers_path, 'r', encoding='utf-8') as f:
            mesh_content = f.read()

        mesh_checks = [
            ("Per-type physics presets dict",    "_TYPE_PHYSICS_PRESETS" in mesh_content),
            ("Per-type friction values",         "'friction'" in mesh_content),
            ("Per-type restitution values",      "'restitution'" in mesh_content),
            ("Physics used in add_collision_mesh",
             "_TYPE_PHYSICS_PRESETS" in mesh_content
             and "phys['friction']" in mesh_content
             and "phys['restitution']" in mesh_content),
        ]

        for check_name, result in mesh_checks:
            if result:
                print(f"✅ {check_name}: Found")
            else:
                print(f"❌ {check_name}: Missing")
                failed.append(check_name)

        # ----------------------------------------------------------------
        # FO4 game version scene property (addon_integration.py)
        # ----------------------------------------------------------------
        addon_int_path = addon_dir / "addon_integration.py"
        with open(addon_int_path, 'r', encoding='utf-8') as f:
            addon_int_content = f.read()

        version_checks = [
            ("fo4_game_version property registered", "fo4_game_version" in addon_int_content),
            ("OG edition enum item",                 "FALLOUT_4" in addon_int_content),
            ("NG edition enum item",                 "FALLOUT_4_NG" in addon_int_content),
            ("AE edition enum item",                 "FALLOUT_4_AE" in addon_int_content),
            ("fo4_game_version unregistered cleanly",
             "fo4_game_version" in addon_int_content
             and "del bpy.types.Scene.fo4_game_version" in addon_int_content),
        ]

        for check_name, result in version_checks:
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


def test_vegetation_workflow():
    """Verify complete vegetation / custom-mesh NIF export workflow"""
    print("\n" + "="*70)
    print("TEST 9: Verifying vegetation & custom-mesh NIF export workflow")
    print("="*70)

    addon_dir = Path(__file__).parent
    failed = []

    # ----------------------------------------------------------------
    # texture_helpers.py – vegetation material setup
    # ----------------------------------------------------------------
    th_path = addon_dir / "texture_helpers.py"
    with open(th_path, 'r', encoding='utf-8') as f:
        th_content = f.read()

    veg_mat_checks = [
        # setup_vegetation_material must exist
        ("setup_vegetation_material method present",
         "def setup_vegetation_material" in th_content),
        # must set blend_mode to CLIP for alpha test
        ("Alpha Clip blend mode set",
         "'CLIP'" in th_content and "blend_mode" in th_content),
        # must disable backface culling for two-sided rendering
        ("Backface culling disabled",
         "use_backface_culling" in th_content and "False" in th_content),
        # alpha threshold 0.5 → 128/255 FO4 standard
        ("Alpha threshold 0.5 set",
         "alpha_threshold" in th_content and "0.5" in th_content),
        # shadow_method set to CLIP for alpha shadows
        ("Shadow method CLIP set",
         "shadow_method" in th_content and "'CLIP'" in th_content),
        # calls setup_fo4_material internally (reuse existing node layout)
        ("Calls setup_fo4_material internally",
         "setup_fo4_material(obj)" in th_content),
    ]

    for check_name, result in veg_mat_checks:
        if result:
            print(f"✅ {check_name}: Found")
        else:
            print(f"❌ {check_name}: Missing")
            failed.append(check_name)

    # ----------------------------------------------------------------
    # operators.py – new vegetation operators present + registered
    # ----------------------------------------------------------------
    ops_path = addon_dir / "operators.py"
    with open(ops_path, 'r', encoding='utf-8') as f:
        ops_content = f.read()

    veg_op_checks = [
        # New operators defined
        ("SetupVegetationMaterial operator defined",
         "class FO4_OT_SetupVegetationMaterial" in ops_content),
        ("ExportVegetationAsNif operator defined",
         "class FO4_OT_ExportVegetationAsNif" in ops_content),
        ("ExportLODChainAsNif operator defined",
         "class FO4_OT_ExportLODChainAsNif" in ops_content),
        # Operators registered in classes tuple
        ("SetupVegetationMaterial registered",
         "FO4_OT_SetupVegetationMaterial," in ops_content),
        ("ExportVegetationAsNif registered",
         "FO4_OT_ExportVegetationAsNif," in ops_content),
        ("ExportLODChainAsNif registered",
         "FO4_OT_ExportLODChainAsNif," in ops_content),
        # CreateVegetationPreset uses vegetation material for foliage types
        ("Foliage preset uses setup_vegetation_material",
         "setup_vegetation_material" in ops_content
         and "TREE" in ops_content and "BUSH" in ops_content),
        # CombineVegetationMeshes clears orphaned wind vertex groups
        ("Combine clears orphaned wind vertex groups",
         "groups_to_remove" in ops_content and "vertex_groups.remove" in ops_content),
        # ExportVegetationAsNif suppresses collision (GRASS type)
        ("Export vegetation suppresses collision",
         "fo4_collision_type = 'GRASS'" in ops_content
         or "fo4_collision_type='GRASS'" in ops_content),
        # LOD chain export finds LOD objects by naming convention
        ("LOD chain export uses _LOD naming convention",
         "_LOD" in ops_content and "lod_map" in ops_content),
    ]

    for check_name, result in veg_op_checks:
        if result:
            print(f"✅ {check_name}: Found")
        else:
            print(f"❌ {check_name}: Missing")
            failed.append(check_name)

    # ----------------------------------------------------------------
    # ui_panels.py – new buttons in vegetation panel
    # ----------------------------------------------------------------
    ui_path = addon_dir / "ui_panels.py"
    with open(ui_path, 'r', encoding='utf-8') as f:
        ui_content = f.read()

    veg_ui_checks = [
        ("UI: Setup Vegetation Material button",
         '"fo4.setup_vegetation_material"' in ui_content),
        ("UI: Export Vegetation NIF button",
         '"fo4.export_vegetation_as_nif"' in ui_content),
        ("UI: Export LOD Chain as NIF button",
         '"fo4.export_lod_chain_as_nif"' in ui_content),
        ("UI: Wind animation section in vegetation panel",
         '"fo4.apply_wind_animation"' in ui_content
         and '"fo4.generate_wind_weights"' in ui_content),
        ("UI: Batch wind animation button",
         '"fo4.batch_apply_wind_animation"' in ui_content),
    ]

    for check_name, result in veg_ui_checks:
        if result:
            print(f"✅ {check_name}: Found")
        else:
            print(f"❌ {check_name}: Missing")
            failed.append(check_name)

    # ----------------------------------------------------------------
    # knowledge_base/fo4_export.md – vegetation section present
    # ----------------------------------------------------------------
    kb_path = addon_dir / "knowledge_base" / "fo4_export.md"
    with open(kb_path, 'r', encoding='utf-8') as f:
        kb_content = f.read()

    veg_kb_checks = [
        ("KB: vegetation section present",
         "Vegetation" in kb_content and "foliage" in kb_content),
        ("KB: Alpha Clip documented",
         "Alpha Clip" in kb_content and "Alpha_Testing" in kb_content),
        ("KB: Two-sided rendering documented",
         "Two_Sided" in kb_content or "Two-Sided" in kb_content
         or "two-sided" in kb_content),
        ("KB: BC3 DXT5 for foliage diffuse documented",
         "BC3" in kb_content and "DXT5" in kb_content),
        ("KB: Wind vertex group 'Wind' documented",
         '"Wind"' in kb_content or "'Wind'" in kb_content),
        ("KB: LOD chain for vegetation documented",
         "LOD" in kb_content and "meshes/" in kb_content),
        ("KB: step-by-step custom mesh workflow present",
         "Custom mesh workflow" in kb_content
         or "step-by-step" in kb_content.lower()),
    ]

    for check_name, result in veg_kb_checks:
        if result:
            print(f"✅ {check_name}: Found")
        else:
            print(f"❌ {check_name}: Missing")
            failed.append(check_name)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} vegetation workflow check(s) missing")
        return False

    print("\n✅ PASSED: All vegetation & custom-mesh NIF export workflow checks passed")
    return True


def test_texture_node_labels():
    """Verify texture node labels and sanitization are correct for Niftools export"""
    print("\n" + "="*70)
    print("TEST 7: Verifying texture node labels for Niftools NIF export")
    print("="*70)

    addon_dir = Path(__file__).parent
    failed = []

    # ----------------------------------------------------------------
    # 1. setup_fo4_material must use niftools TEX_SLOTS canonical labels.
    #
    # The niftools exporter (io_scene_niftools/utils/consts.py) defines:
    #   TEX_SLOTS.BASE     = "Base"   ← diffuse / albedo  (NOT "Diffuse"!)
    #   TEX_SLOTS.NORMAL   = "Normal"
    #   TEX_SLOTS.SPECULAR = "Specular"
    #   TEX_SLOTS.GLOW     = "Glow"
    #
    # The exporter uses a CONTAINS check:  `if slot_name in node.label`
    # so "Diffuse" NEVER matches "Base" and always raises the error.
    # ----------------------------------------------------------------
    texture_helpers_path = addon_dir / "texture_helpers.py"
    with open(texture_helpers_path, 'r', encoding='utf-8') as f:
        th_content = f.read()

    canonical_label_checks = [
        # Slot 0 MUST use "Base" (TEX_SLOTS.BASE), NOT "Diffuse"
        ('Canonical "Base" label present (TEX_SLOTS.BASE)',
         'label = "Base"' in th_content),
        ('Old "Diffuse" label removed from setup_fo4_material',
         'label = "Diffuse"' not in th_content),
        ('Canonical "Normal" label present',    'label = "Normal"' in th_content),
        ('Canonical "Specular" label present',  'label = "Specular"' in th_content),
        ('Canonical "Glow" label present',      'label = "Glow"' in th_content),
        # The old verbose parenthetical labels must NOT appear
        ('Old "Diffuse (_d)" label removed',    '"Diffuse (_d)"' not in th_content),
        ('Old "Normal Map (_n)" label removed', '"Normal Map (_n)"' not in th_content),
        ('Old "Specular (_s)" label removed',   '"Specular (_s)"' not in th_content),
        ('Old "Glow/Emissive (_g)" removed',    '"Glow/Emissive (_g)"' not in th_content),
        # install_texture node_name_map must use "Base" for DIFFUSE
        ('install_texture DIFFUSE maps to "Base" node',
         "'DIFFUSE':  'Base'" in th_content or "'DIFFUSE': 'Base'" in th_content),
    ]
    for check_name, result in canonical_label_checks:
        if result:
            print(f"✅ texture_helpers: {check_name}")
        else:
            print(f"❌ texture_helpers: {check_name}")
            failed.append(f"texture_helpers: {check_name}")

    # ----------------------------------------------------------------
    # 2. ExportHelpers sanitization must handle the correct TEX_SLOTS
    # ----------------------------------------------------------------
    export_helpers_path = addon_dir / "export_helpers.py"
    with open(export_helpers_path, 'r', encoding='utf-8') as f:
        eh_content = f.read()

    export_checks = [
        ("_sanitize_material_node_labels method present",
         "_sanitize_material_node_labels" in eh_content),
        # Verify the call appears *inside* _prepare_mesh_for_nif by slicing the
        # content from the function definition to the next @staticmethod boundary.
        ("Sanitize called from _prepare_mesh_for_nif",
         "_sanitize_material_node_labels(obj)" in
         eh_content[
             eh_content.find("def _prepare_mesh_for_nif"):
             eh_content.find("@staticmethod",
                              eh_content.find("def _prepare_mesh_for_nif") + 1)
         ]),
        # Must remap "Diffuse" → "Base" (the key fix for the reported error)
        ('Sanitize remaps "Diffuse" to "Base" (TEX_SLOTS.BASE)',
         '"diffuse"' in eh_content and '"Base"' in eh_content),
        # Must still handle legacy parenthetical forms
        ("Legacy label Diffuse (_d) handled in sanitize",
         '"diffuse (_d)"' in eh_content or '"Diffuse (_d)"' in eh_content),
        ("Legacy label Normal Map (_n) handled in sanitize",
         '"normal map (_n)"' in eh_content or '"Normal Map (_n)"' in eh_content),
        ("Legacy label Specular (_s) handled in sanitize",
         '"specular (_s)"' in eh_content or '"Specular (_s)"' in eh_content),
        ("Legacy label Glow/Emissive (_g) handled in sanitize",
         '"glow/emissive (_g)"' in eh_content or '"Glow/Emissive (_g)"' in eh_content),
        # Sanitize must scan ALL TEX_IMAGE nodes (not just named ones)
        ("Sanitize scans all TEX_IMAGE nodes",
         "node.type != 'TEX_IMAGE'" in eh_content or
         'node.type == \'TEX_IMAGE\'' in eh_content),
        # Must use _NIFTOOLS_CANONICAL or equivalent frozenset of real slot names
        ("Sanitize knows niftools canonical slot strings",
         '"Base"' in eh_content and '"Normal"' in eh_content and '"Specular"' in eh_content),
    ]
    for check_name, result in export_checks:
        if result:
            print(f"✅ export_helpers: {check_name}")
        else:
            print(f"❌ export_helpers: {check_name}")
            failed.append(f"export_helpers: {check_name}")

    # ----------------------------------------------------------------
    # 3. NIFTOOLS_SETUP.md must document the correct TEX_SLOTS labels
    # ----------------------------------------------------------------
    niftools_doc_path = addon_dir / "NIFTOOLS_SETUP.md"
    with open(niftools_doc_path, 'r', encoding='utf-8') as f:
        doc_content = f.read()

    doc_checks = [
        ("NIFTOOLS_SETUP documents label error",
         "Do not know how to export texture node" in doc_content),
        ("NIFTOOLS_SETUP documents canonical label table",
         "BSShaderTextureSet slot" in doc_content),
        ("NIFTOOLS_SETUP uses 'Base' (TEX_SLOTS.BASE) for slot 0",
         "| `Base`" in doc_content),
        ("NIFTOOLS_SETUP explains CONTAINS check",
         "contains" in doc_content.lower() or "substring" in doc_content.lower()),
    ]
    for check_name, result in doc_checks:
        if result:
            print(f"✅ NIFTOOLS_SETUP.md: {check_name}")
        else:
            print(f"❌ NIFTOOLS_SETUP.md: {check_name}")
            failed.append(f"NIFTOOLS_SETUP.md: {check_name}")

    if failed:
        print(f"\n❌ FAILED: {len(failed)} texture-label check(s) missing")
        return False

    print(f"\n✅ PASSED: All texture node label checks passed")
    return True


def test_uv_unwrap_quality():
    """Verify UV unwrapping improvements and hybrid workflow are implemented"""
    print("\n" + "="*70)
    print("TEST 8: Verifying UV unwrap quality + hybrid workflow")
    print("="*70)

    addon_dir = Path(__file__).parent
    failed = []

    # ----------------------------------------------------------------
    # advanced_mesh_helpers — optimize_uvs + new helpers
    # ----------------------------------------------------------------
    adv_path = addon_dir / "advanced_mesh_helpers.py"
    with open(adv_path, 'r', encoding='utf-8') as f:
        adv_content = f.read()

    adv_checks = [
        # MIN_STRETCH is now the default method
        ("optimize_uvs default is 'MIN_STRETCH'",
         "method='MIN_STRETCH'" in adv_content),
        # MIN_STRETCH pipeline: CONFORMAL + minimize_stretch(100)
        ("optimize_uvs MIN_STRETCH uses CONFORMAL layout",
         "method='CONFORMAL'" in adv_content),
        ("optimize_uvs MIN_STRETCH runs minimize_stretch with 100 iterations",
         "minimize_stretch(fill_holes=True, iterations=100)" in adv_content),
        # ANGLE still works (critical bug fix from previous session)
        ("optimize_uvs handles 'ANGLE' method",
         "'ANGLE'" in adv_content and "ANGLE_BASED" in adv_content),
        # Backward-compat alias
        ("optimize_uvs handles legacy 'UNWRAP' alias",
         "'UNWRAP'" in adv_content),
        # Safe mode restoration
        ("optimize_uvs has try/finally for mode restoration",
         "try:" in adv_content and "finally:" in adv_content
         and "mode_set(mode='OBJECT')" in adv_content),
        # Restores previously active object
        ("optimize_uvs restores prev_active",
         "prev_active" in adv_content),
        # Better packing
        ("optimize_uvs uses rotate=True in pack_islands",
         "pack_islands(rotate=True" in adv_content),
        # cube_project margin
        ("optimize_uvs passes cube_size to cube_project",
         "cube_project(cube_size=1.0)" in adv_content),
        # New hybrid helpers
        ("scan_uv_complexity method present",
         "def scan_uv_complexity" in adv_content),
        ("scan_uv_complexity detects high-valence vertices (plant/foliage)",
         "high_valence_verts" in adv_content),
        ("scan_uv_complexity returns complexity_score key",
         "'complexity_score'" in adv_content),
        ("scan_uv_complexity returns recommendations key",
         "'recommendations'" in adv_content),
        ("auto_mark_seams method present",
         "def auto_mark_seams" in adv_content),
        ("auto_mark_seams marks boundary edges as seams",
         "is_boundary" in adv_content and "edge.seam = True" in adv_content),
        ("auto_mark_seams respects existing seams by default",
         "clear_existing" in adv_content),
        ("auto_mark_seams uses dihedral angle threshold",
         "calc_face_angle" in adv_content and "threshold_rad" in adv_content),
    ]
    for check_name, result in adv_checks:
        if result:
            print(f"✅ advanced_mesh_helpers: {check_name}")
        else:
            print(f"❌ advanced_mesh_helpers: {check_name}")
            failed.append(f"advanced_mesh_helpers: {check_name}")

    # ----------------------------------------------------------------
    # mesh_helpers.setup_uv_with_texture
    # ----------------------------------------------------------------
    mesh_path = addon_dir / "mesh_helpers.py"
    with open(mesh_path, 'r', encoding='utf-8') as f:
        mesh_content = f.read()

    mesh_checks = [
        # MIN_STRETCH is the new default
        ("setup_uv_with_texture default is 'MIN_STRETCH'",
         "unwrap_method='MIN_STRETCH'" in mesh_content),
        # MIN_STRETCH pipeline uses CONFORMAL + minimize_stretch
        ("setup_uv_with_texture MIN_STRETCH uses CONFORMAL",
         "method='CONFORMAL'" in mesh_content),
        ("setup_uv_with_texture MIN_STRETCH uses minimize_stretch",
         "minimize_stretch" in mesh_content),
        # ANGLE method primes with Smart UV then refines
        ("setup_uv_with_texture ANGLE method primes with smart_project",
         "unwrap_method == 'ANGLE'" in mesh_content
         and "smart_project" in mesh_content),
        # Better packing
        ("setup_uv_with_texture uses rotate=True in pack_islands",
         "pack_islands(rotate=True" in mesh_content),
    ]
    for check_name, result in mesh_checks:
        if result:
            print(f"✅ mesh_helpers: {check_name}")
        else:
            print(f"❌ mesh_helpers: {check_name}")
            failed.append(f"mesh_helpers: {check_name}")

    # ----------------------------------------------------------------
    # operators.py — enum items, defaults, and new operators
    # ----------------------------------------------------------------
    import re as _re

    ops_path = addon_dir / "operators.py"
    with open(ops_path, 'r', encoding='utf-8') as f:
        ops_content = f.read()

    _unwrap_enum_pattern = _re.compile(r"\(\s*'UNWRAP'\s*,")
    _min_stretch_default  = _re.compile(r"default\s*=\s*'MIN_STRETCH'")

    ops_checks = [
        # MIN_STRETCH is the default in all UV operators
        ("UV operators default to 'MIN_STRETCH'",
         len(_min_stretch_default.findall(ops_content)) >= 3),
        # MIN_STRETCH enum item present
        ("Operators expose 'MIN_STRETCH' enum item",
         "('MIN_STRETCH'," in ops_content),
        # Old broken 'UNWRAP' item is gone
        ("Operators no longer expose 'UNWRAP' enum item",
         not _unwrap_enum_pattern.search(ops_content)),
        # ANGLE still present
        ("Operators have 'ANGLE' enum item",
         "'ANGLE'" in ops_content),
        # New hybrid operators registered
        ("FO4_OT_ScanUVComplexity class defined",
         "class FO4_OT_ScanUVComplexity" in ops_content),
        ("FO4_OT_SmartSeamMark class defined",
         "class FO4_OT_SmartSeamMark" in ops_content),
        ("FO4_OT_HybridUnwrap class defined",
         "class FO4_OT_HybridUnwrap" in ops_content),
        ("FO4_OT_ScanUVComplexity registered in classes tuple",
         "FO4_OT_ScanUVComplexity," in ops_content),
        ("FO4_OT_SmartSeamMark registered in classes tuple",
         "FO4_OT_SmartSeamMark," in ops_content),
        ("FO4_OT_HybridUnwrap registered in classes tuple",
         "FO4_OT_HybridUnwrap," in ops_content),
        # HybridUnwrap uses CONFORMAL + minimize_stretch (not smart_project)
        ("HybridUnwrap uses CONFORMAL unwrap",
         "fo4.hybrid_unwrap" in ops_content and "method='CONFORMAL'" in ops_content),
        # SmartSeamMark enters edge-select edit mode after marking
        ("SmartSeamMark enters Edge Select edit mode",
         "mesh_select_mode" in ops_content
         and "(False, True, False)" in ops_content),
        # Face-selective unwrap operators
        ("FO4_OT_PickFacesForUnwrap class defined",
         "class FO4_OT_PickFacesForUnwrap" in ops_content),
        ("FO4_OT_UnwrapSelectedFaces class defined",
         "class FO4_OT_UnwrapSelectedFaces" in ops_content),
        ("FO4_OT_PickFacesForUnwrap registered in classes tuple",
         "FO4_OT_PickFacesForUnwrap," in ops_content),
        ("FO4_OT_UnwrapSelectedFaces registered in classes tuple",
         "FO4_OT_UnwrapSelectedFaces," in ops_content),
        # PickFacesForUnwrap enters Face Select (not edge or vertex)
        ("PickFacesForUnwrap enters Face Select mode",
         "(False, False, True)" in ops_content),
        # UnwrapSelectedFaces uses CONFORMAL + minimize_stretch
        ("UnwrapSelectedFaces uses CONFORMAL unwrap",
         "fo4.unwrap_selected_faces" in ops_content and
         "method='CONFORMAL'" in
         ops_content[
             ops_content.find("class FO4_OT_UnwrapSelectedFaces"):
             ops_content.find("class FO4_OT_Batch",
                              ops_content.find("class FO4_OT_UnwrapSelectedFaces") + 1)
         ]),
    ]
    for check_name, result in ops_checks:
        if result:
            print(f"✅ operators: {check_name}")
        else:
            print(f"❌ operators: {check_name}")
            failed.append(f"operators: {check_name}")

    # ----------------------------------------------------------------
    # ui_panels.py — hybrid workflow + face-picking buttons present
    # ----------------------------------------------------------------
    ui_path = addon_dir / "ui_panels.py"
    with open(ui_path, 'r', encoding='utf-8') as f:
        ui_content = f.read()

    ui_checks = [
        ("UI panel has Scan UV Complexity button",
         "fo4.scan_uv_complexity" in ui_content),
        ("UI panel has Scan & Mark Seams button",
         "fo4.smart_seam_mark" in ui_content),
        ("UI panel has Hybrid Unwrap button",
         "fo4.hybrid_unwrap" in ui_content),
        ("UI panel has Pick Faces to Unwrap button",
         "fo4.pick_faces_for_unwrap" in ui_content),
        ("UI panel has Unwrap Selected Faces button",
         "fo4.unwrap_selected_faces" in ui_content),
    ]
    for check_name, result in ui_checks:
        if result:
            print(f"✅ ui_panels: {check_name}")
        else:
            print(f"❌ ui_panels: {check_name}")
            failed.append(f"ui_panels: {check_name}")

    if failed:
        print(f"\n❌ FAILED: {len(failed)} UV quality check(s) missing")
        return False

    print(f"\n✅ PASSED: All UV unwrap quality + hybrid workflow checks passed")
    return True


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


def test_post_processing():
    """Verify Fallout 4 post-processing module, operators, UI panel, and KB doc"""
    print("\n" + "="*70)
    print("TEST 10: Verifying FO4 post-processing feature")
    print("="*70)

    addon_dir = Path(__file__).parent
    failed = []

    # ----------------------------------------------------------------
    # post_processing_helpers.py – module existence and key symbols
    # ----------------------------------------------------------------
    pp_path = addon_dir / "post_processing_helpers.py"
    if not pp_path.exists():
        print("❌ post_processing_helpers.py: File missing")
        failed.append("post_processing_helpers.py missing")
    else:
        with open(pp_path, 'r', encoding='utf-8') as f:
            pp_content = f.read()

        pp_checks = [
            ("PostProcessingHelpers class",          "class PostProcessingHelpers" in pp_content),
            ("setup_compositor method",              "def setup_compositor" in pp_content),
            ("clear_compositor method",              "def clear_compositor" in pp_content),
            ("apply_preset_to_compositor method",    "def apply_preset_to_compositor" in pp_content),
            ("export_imagespace_data method",        "def export_imagespace_data" in pp_content),
            ("sync_from_scene_props method",         "def sync_from_scene_props" in pp_content),
            ("PRESETS dict defined",                 "PRESETS" in pp_content and "VANILLA" in pp_content),
            ("PRESET_ENUM_ITEMS defined",            "PRESET_ENUM_ITEMS" in pp_content),
            ("register() defined",                   "def register()" in pp_content),
            ("unregister() defined",                 "def unregister()" in pp_content),
            ("fo4_pp_preset scene property",         "fo4_pp_preset" in pp_content),
            ("fo4_pp_bloom_strength property",       "fo4_pp_bloom_strength" in pp_content),
            ("fo4_pp_saturation property",           "fo4_pp_saturation" in pp_content),
            ("fo4_pp_tint_r property",               "fo4_pp_tint_r" in pp_content),
            ("fo4_pp_vignette property",             "fo4_pp_vignette" in pp_content),
            ("fo4_pp_cinematic_bars property",       "fo4_pp_cinematic_bars" in pp_content),
            ("fo4_pp_dof_enabled property",          "fo4_pp_dof_enabled" in pp_content),
            ("fo4_pp_eye_adapt_speed property",      "fo4_pp_eye_adapt_speed" in pp_content),
            ("PIPBOY preset present",                "PIPBOY" in pp_content),
            ("CINEMATIC preset present",             "CINEMATIC" in pp_content),
            ("DRUG preset present",                  "DRUG" in pp_content),
            ("CK field names in export",
             "BloomScale" in pp_content and "EyeAdaptSpeed" in pp_content
             and "TintColor" in pp_content and "CinematicBars" in pp_content),
            ("IMAD block in export",                 "fo4_imagespace_modifier" in pp_content),
            ("FO4_PP_ node tags used",               "FO4_PP_" in pp_content),
        ]

        for check_name, result in pp_checks:
            if result:
                print(f"✅ {check_name}: Found")
            else:
                print(f"❌ {check_name}: Missing")
                failed.append(check_name)

    # ----------------------------------------------------------------
    # operators.py – new operators defined and registered
    # ----------------------------------------------------------------
    ops_path = addon_dir / "operators.py"
    with open(ops_path, 'r', encoding='utf-8') as f:
        ops_content = f.read()

    op_checks = [
        ("post_processing_helpers import in operators",
         "post_processing_helpers" in ops_content),
        ("SetupPostProcessingCompositor operator",
         "class FO4_OT_SetupPostProcessingCompositor" in ops_content),
        ("ApplyPostProcessingPreset operator",
         "class FO4_OT_ApplyPostProcessingPreset" in ops_content),
        ("ClearPostProcessing operator",
         "class FO4_OT_ClearPostProcessing" in ops_content),
        ("ExportImageSpaceData operator",
         "class FO4_OT_ExportImageSpaceData" in ops_content),
        ("SyncPostProcessingProps operator",
         "class FO4_OT_SyncPostProcessingProps" in ops_content),
        ("SetupPostProcessingCompositor registered",
         "FO4_OT_SetupPostProcessingCompositor," in ops_content),
        ("ExportImageSpaceData registered",
         "FO4_OT_ExportImageSpaceData," in ops_content),
        ("ClearPostProcessing registered",
         "FO4_OT_ClearPostProcessing," in ops_content),
    ]

    for check_name, result in op_checks:
        if result:
            print(f"✅ {check_name}: Found")
        else:
            print(f"❌ {check_name}: Missing")
            failed.append(check_name)

    # ----------------------------------------------------------------
    # ui_panels.py – new panel defined and registered
    # ----------------------------------------------------------------
    ui_path = addon_dir / "ui_panels.py"
    with open(ui_path, 'r', encoding='utf-8') as f:
        ui_content = f.read()

    ui_checks = [
        ("FO4_PT_PostProcessingPanel class defined",
         "class FO4_PT_PostProcessingPanel" in ui_content),
        ("FO4_PT_PostProcessingPanel registered in classes",
         "FO4_PT_PostProcessingPanel," in ui_content),
        ("Setup Compositor button",
         '"fo4.setup_post_processing"' in ui_content),
        ("Clear Post-Processing button",
         '"fo4.clear_post_processing"' in ui_content),
        ("Export ImageSpace button",
         '"fo4.export_imagespace_data"' in ui_content),
        ("Apply Preset button",
         '"fo4.apply_pp_preset"' in ui_content),
        ("fo4_pp_preset prop exposed in panel",
         "fo4_pp_preset" in ui_content),
        ("Bloom sliders exposed",
         "fo4_pp_bloom_strength" in ui_content),
        ("Colour grading sliders exposed",
         "fo4_pp_saturation" in ui_content),
        ("Tint sliders exposed",
         "fo4_pp_tint_r" in ui_content),
        ("Vignette slider exposed",
         "fo4_pp_vignette" in ui_content),
        ("CK-only fields section present",
         "fo4_pp_eye_adapt_speed" in ui_content),
    ]

    for check_name, result in ui_checks:
        if result:
            print(f"✅ {check_name}: Found")
        else:
            print(f"❌ {check_name}: Missing")
            failed.append(check_name)

    # ----------------------------------------------------------------
    # __init__.py – module imported and in modules list
    # ----------------------------------------------------------------
    init_path = addon_dir / "__init__.py"
    with open(init_path, 'r', encoding='utf-8') as f:
        init_content = f.read()

    init_checks = [
        ("post_processing_helpers imported in __init__",
         'post_processing_helpers = _try_import("post_processing_helpers")' in init_content),
        ("post_processing_helpers in modules list",
         "post_processing_helpers," in init_content),
    ]

    for check_name, result in init_checks:
        if result:
            print(f"✅ {check_name}: Found")
        else:
            print(f"❌ {check_name}: Missing")
            failed.append(check_name)

    # ----------------------------------------------------------------
    # knowledge_base/fo4_post_processing.md – documentation exists
    # ----------------------------------------------------------------
    kb_path = addon_dir / "knowledge_base" / "fo4_post_processing.md"
    if not kb_path.exists():
        print("❌ knowledge_base/fo4_post_processing.md: File missing")
        failed.append("fo4_post_processing.md missing")
    else:
        with open(kb_path, 'r', encoding='utf-8') as f:
            kb_content = f.read()

        kb_checks = [
            ("IMGS record documented",            "ImageSpace" in kb_content and "IMGS" in kb_content),
            ("IMAD record documented",            "ImageSpace Modifier" in kb_content and "IMAD" in kb_content),
            ("BloomScale field documented",       "BloomScale" in kb_content),
            ("TintColor field documented",        "TintColor" in kb_content),
            ("EyeAdaptSpeed field documented",    "EyeAdaptSpeed" in kb_content),
            ("CinematicBars documented",          "CinematicBars" in kb_content),
            ("Preset table present",              "PIPBOY" in kb_content and "CINEMATIC" in kb_content),
            ("Compositor node reference present", "FO4_PP_Glare" in kb_content),
            ("Workflow steps present",            "Setup Compositor" in kb_content),
            ("CK entry instructions present",     "Creation Kit" in kb_content and "Image Spaces" in kb_content),
        ]

        for check_name, result in kb_checks:
            if result:
                print(f"✅ {check_name}: Found")
            else:
                print(f"❌ {check_name}: Missing")
                failed.append(check_name)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} post-processing check(s) missing")
        return False

    print("\n✅ PASSED: All FO4 post-processing checks passed")
    return True


def test_preferences_migration():
    """Verify all settings live in Scene properties, not AddonPreferences."""
    print("\n" + "="*70)
    print("TEST 11: Verifying preferences → Scene property migration")
    print("="*70)

    failed = []

    prefs_src = Path("preferences.py").read_text()
    ops_src   = Path("operators.py").read_text()
    ui_src    = Path("ui_panels.py").read_text()
    mossy_src = Path("mossy_link.py").read_text()

    # ── FO4AddonPreferences must be a minimal empty shell ────────────────────
    # Slice just the class body: from "class FO4AddonPreferences" up to
    # "def _on_change" (the first module-level function after the class).
    _pref_class_body = prefs_src.split("class FO4AddonPreferences")[1].split("def _on_change")[0]
    structure_checks = [
        ("FO4AddonPreferences class exists",
            "class FO4AddonPreferences" in prefs_src),
        ("FO4AddonPreferences class body has NO StringProperty fields",
            "StringProperty" not in _pref_class_body),
        ("FO4AddonPreferences class body has NO IntProperty fields",
            "IntProperty" not in _pref_class_body),
        ("FO4AddonPreferences class body has NO BoolProperty fields",
            "BoolProperty" not in _pref_class_body),
        ("FO4AddonPreferences draw() is empty (just pass or comment)",
            "def draw(self, context):" in _pref_class_body and
            ("pass" in _pref_class_body or "# No custom UI" in _pref_class_body
             or "# Empty on purpose" in _pref_class_body)),
    ]

    # ── All settings registered as Scene properties ──────────────────────────
    scene_prop_checks = [
        ("fo4_havok2fbx_path on Scene",     '"fo4_havok2fbx_path"' in prefs_src),
        ("fo4_nvtt_path on Scene",           '"fo4_nvtt_path"' in prefs_src),
        ("fo4_ffmpeg_path on Scene",         '"fo4_ffmpeg_path"' in prefs_src),
        ("fo4_texconv_path on Scene",        '"fo4_texconv_path"' in prefs_src),
        ("fo4_assets_path on Scene",         '"fo4_assets_path"' in prefs_src),
        ("fo4_llm_enabled on Scene",         '"fo4_llm_enabled"' in prefs_src),
        ("fo4_llm_api_key on Scene",         '"fo4_llm_api_key"' in prefs_src),
        ("fo4_mossy_port on Scene",          '"fo4_mossy_port"' in prefs_src),
        ("fo4_mossy_token on Scene",         '"fo4_mossy_token"' in prefs_src),
        ("fo4_mossy_autostart on Scene",     '"fo4_mossy_autostart"' in prefs_src),
        ("fo4_use_mossy_ai on Scene",        '"fo4_use_mossy_ai"' in prefs_src),
        ("fo4_advisor_monitor on Scene",     '"fo4_advisor_monitor"' in prefs_src),
        ("fo4_advisor_interval on Scene",    '"fo4_advisor_interval"' in prefs_src),
        ("fo4_opt_doubles on Scene",         '"fo4_opt_doubles"' in prefs_src),
        ("fo4_opt_preserve_uvs on Scene",    '"fo4_opt_preserve_uvs"' in prefs_src),
        ("fo4_opt_apply_transforms on Scene",'"fo4_opt_apply_transforms"' in prefs_src),
        ("fo4_mesh_panel_unified on Scene",  '"fo4_mesh_panel_unified"' in prefs_src),
        ("fo4_auto_install_tools on Scene",  '"fo4_auto_install_tools"' in prefs_src),
        ("fo4_kb_enabled on Scene",          '"fo4_kb_enabled"' in prefs_src),
        ("fo4_kb_path on Scene",             '"fo4_kb_path"' in prefs_src),
    ]

    # ── JSON persistence ──────────────────────────────────────────────────────
    asset_lib_src = Path("asset_library.py").read_text()
    persistence_checks = [
        ("save_settings function defined",   "def save_settings(" in prefs_src),
        ("restore_settings function defined","def restore_settings(" in prefs_src),
        ("load_post handler registered",     "_load_post_handler" in prefs_src),
        ("persistent decorator on handler",  "@bpy.app.handlers.persistent" in prefs_src),
        ("JSON config file name defined",    "_CONFIG_FILE" in prefs_src),
        ("_PERSISTENT tuple defined",        "_PERSISTENT" in prefs_src),
        # Settings must survive scene switches (new scene created / active scene changed)
        ("scene_change handler defined",     "_scene_change_handler" in prefs_src),
        ("scene_change uses depsgraph_update_post",
            "depsgraph_update_post" in prefs_src),
        # Settings must be applied at addon-enable / Blender startup time
        ("restore_settings called at register",
            "restore_settings()" in prefs_src.split("def register(")[1].split("def unregister(")[0]),
        # _on_asset_path_change must save AFTER auto-populating sub-paths
        # Verify by checking that the save call (_on_change) appears after
        # the auto-populate loop in the function body.
        ("_on_asset_path_change saves after auto-populate", (lambda body:
            "fo4_asset_lib_mesh_path" in body and
            body.rfind("_on_change(") > body.index("fo4_asset_lib_mesh_path")
        )(prefs_src.split("def _on_asset_path_change(")[1].split("\ndef ")[0])),
        # asset_library path changes must also persist via save_settings
        ("asset_library._invalidate_game_asset_cache calls save_settings",
            "save_settings" in asset_lib_src),
    ]

    # ── FO4Settings wrapper ───────────────────────────────────────────────────
    wrapper_checks = [
        ("FO4Settings class defined",             "class FO4Settings" in prefs_src),
        ("FO4Settings wraps scene",               "_scene" in prefs_src),
        ("_ATTR_MAP defined for backward compat", "_ATTR_MAP" in prefs_src),
        ("get_preferences() returns FO4Settings", "return FO4Settings(scene)" in prefs_src),
        ("Fallback settings class defined",       "class _FallbackSettings" in prefs_src),
        ("get_preferences never returns None",
            "return FO4Settings(scene)" in prefs_src and
            "_FallbackSettings" in prefs_src),
    ]

    # ── ui_panels.py uses scene.fo4_* directly ───────────────────────────────
    ui_checks = [
        ("SettingsPanel uses scene.fo4_mesh_panel_unified",
            '"fo4_mesh_panel_unified"' in ui_src),
        ("SettingsPanel uses scene.fo4_havok2fbx_path",
            '"fo4_havok2fbx_path"' in ui_src),
        ("SettingsPanel uses scene.fo4_nvtt_path",
            '"fo4_nvtt_path"' in ui_src),
        ("SettingsPanel uses scene.fo4_texconv_path",
            '"fo4_texconv_path"' in ui_src),
        ("SettingsPanel uses scene.fo4_llm_enabled",
            '"fo4_llm_enabled"' in ui_src),
        ("SettingsPanel uses scene.fo4_mossy_port",
            '"fo4_mossy_port"' in ui_src),
        ("SettingsPanel uses scene.fo4_use_mossy_ai",
            '"fo4_use_mossy_ai"' in ui_src),
        ("SettingsPanel no longer reads context.preferences.addons",
            "context.preferences.addons.get" not in ui_src
            or ui_src.count("context.preferences.addons.get") == 0),
        ("AdvisorPanel uses scene.fo4_llm_enabled",
            'scene.fo4_llm_enabled' in ui_src or '"fo4_llm_enabled"' in ui_src),
        ("AdvisorPanel uses scene.fo4_use_mossy_ai",
            'scene.fo4_use_mossy_ai' in ui_src or '"fo4_use_mossy_ai"' in ui_src),
        ("No more 'Preferences → Mossy' help text",
            "Preferences → Mossy Link section" not in ui_src),
    ]

    # ── mossy_link.py uses get_preferences() not addons ──────────────────────
    mossy_checks = [
        ("mossy_link imports preferences",
            "from . import preferences" in mossy_src),
        ("mossy_link calls preferences.get_preferences()",
            "preferences.get_preferences()" in mossy_src),
        ("mossy_link no longer reads ctx.preferences.addons",
            "ctx.preferences.addons" not in mossy_src),
    ]

    all_checks = (
        structure_checks + scene_prop_checks + persistence_checks
        + wrapper_checks + ui_checks + mossy_checks
    )

    for check_name, result in all_checks:
        if result:
            print(f"✅ {check_name}: OK")
        else:
            print(f"❌ {check_name}: FAILED")
            failed.append(check_name)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} preferences-migration check(s) failed")
        return False

    print("\n✅ PASSED: All preferences → Scene migration checks passed")
    return True


def test_new_features():
    """Verify Papyrus, Havok Physics, and Mod Packaging feature completeness."""
    print("\n" + "="*70)
    print("TEST 12: Verifying Papyrus / Havok Physics / Mod Packaging features")
    print("="*70)

    failed = []

    papyrus_src  = Path("papyrus_helpers.py").read_text()
    physics_src  = Path("fo4_physics_helpers.py").read_text()
    packaging_src= Path("mod_packaging_helpers.py").read_text()
    ops_src      = Path("operators.py").read_text()
    ui_src       = Path("ui_panels.py").read_text()
    init_src     = Path("__init__.py").read_text()

    # ── Papyrus helpers ───────────────────────────────────────────────────────
    papyrus_checks = [
        ("PapyrusHelpers class defined",         "class PapyrusHelpers" in papyrus_src),
        ("generate() method present",            "def generate(" in papyrus_src),
        ("export() method present",              "def export(" in papyrus_src),
        ("get_compile_instructions() present",   "def get_compile_instructions(" in papyrus_src),
        ("14 template types defined",
            all(t in papyrus_src for t in (
                '"OBJECT"', '"WEAPON"', '"ARMOR"', '"ACTIVATOR"',
                '"CONTAINER"', '"DOOR"', '"QUEST"', '"MAGIC_EFFECT"',
                '"ALIAS_ACTOR"', '"ALIAS_REF"', '"TERMINAL"',
                '"HOLOTAPE"', '"WORKSHOP"', '"NPC"'))),
        ("TEMPLATE_ENUM_ITEMS defined",          "TEMPLATE_ENUM_ITEMS" in papyrus_src),
        ("register() defined",                   "def register()" in papyrus_src),
        ("unregister() defined",                 "def unregister()" in papyrus_src),
        ("fo4_papyrus_template scene prop",      "fo4_papyrus_template" in papyrus_src),
        ("fo4_papyrus_script_name scene prop",   "fo4_papyrus_script_name" in papyrus_src),
        ("fo4_papyrus_output_dir scene prop",    "fo4_papyrus_output_dir" in papyrus_src),
        ("Quest template has stage fragments",   "Fragment_Stage_" in papyrus_src),
        ("NPC template has OnDeath event",       "OnDeath" in papyrus_src),
        ("Workshop template has OnPowerOn",      "OnPowerOn" in papyrus_src),
        ("Terminal template has entry fragments","Fragment_Terminal_Entry_" in papyrus_src),
        # Operators
        ("FO4_OT_GeneratePapyrusScript operator","FO4_OT_GeneratePapyrusScript" in ops_src),
        ("FO4_OT_ExportPapyrusScript operator",  "FO4_OT_ExportPapyrusScript" in ops_src),
        ("FO4_OT_ShowPapyrusCompileInstructions","FO4_OT_ShowPapyrusCompileInstructions" in ops_src),
        ("All Papyrus ops registered",
            all(o in ops_src for o in (
                "FO4_OT_GeneratePapyrusScript,",
                "FO4_OT_ExportPapyrusScript,",
                "FO4_OT_ShowPapyrusCompileInstructions,"))),
        # Panel
        ("FO4_PT_PapyrusPanel defined",          "FO4_PT_PapyrusPanel" in ui_src),
        ("Papyrus panel in classes tuple",        "FO4_PT_PapyrusPanel," in ui_src),
        ("Papyrus panel shows template prop",     '"fo4_papyrus_template"' in ui_src),
        ("Papyrus panel shows output_dir",        '"fo4_papyrus_output_dir"' in ui_src),
        # Module registered in __init__
        ("papyrus_helpers imported in __init__",  "papyrus_helpers" in init_src),
    ]

    # ── Havok physics helpers ─────────────────────────────────────────────────
    physics_checks = [
        ("PhysicsHelpers class defined",          "class PhysicsHelpers" in physics_src),
        ("setup_rigid_body() method present",     "def setup_rigid_body(" in physics_src),
        ("apply_to_selection() method present",   "def apply_to_selection(" in physics_src),
        ("validate_physics() method present",     "def validate_physics(" in physics_src),
        ("PRESETS dict defined",                  "PRESETS:" in physics_src or "PRESETS = " in physics_src or "PRESETS: dict" in physics_src),
        ("12 presets defined",
            all(p in physics_src for p in (
                '"STATIC_METAL"', '"STATIC_STONE"', '"STATIC_WOOD"',
                '"ANIMSTATIC_DOOR"', '"DYNAMIC_PROP_LIGHT"',
                '"DYNAMIC_PROP_MEDIUM"', '"DYNAMIC_PROP_HEAVY"',
                '"DYNAMIC_DEBRIS"', '"STATIC_GLASS"', '"DYNAMIC_GLASS"',
                '"STATIC_TREE"', '"STATIC_VEHICLE"'))),
        ("PRESET_ENUM_ITEMS defined",             "PRESET_ENUM_ITEMS" in physics_src),
        ("Collision layer constants defined",     "LAYER_STATIC" in physics_src),
        ("fo4_collision_layer written",           '"fo4_collision_layer"' in physics_src),
        ("fo4_motion_type written",               '"fo4_motion_type"' in physics_src),
        ("fo4_havok_mass written",                '"fo4_havok_mass"' in physics_src),
        ("fo4_havok_friction written",            '"fo4_havok_friction"' in physics_src),
        ("fo4_havok_quality written",             '"fo4_havok_quality"' in physics_src),
        ("register() defined",                    "def register()" in physics_src),
        ("fo4_physics_preset scene prop",         "fo4_physics_preset" in physics_src),
        # Operators
        ("FO4_OT_ApplyPhysicsPreset operator",    "FO4_OT_ApplyPhysicsPreset" in ops_src),
        ("FO4_OT_ValidatePhysics operator",       "FO4_OT_ValidatePhysics" in ops_src),
        ("Physics ops registered in classes",
            all(o in ops_src for o in (
                "FO4_OT_ApplyPhysicsPreset,", "FO4_OT_ValidatePhysics,"))),
        # Panel
        ("FO4_PT_HavokPhysicsPanel defined",      "FO4_PT_HavokPhysicsPanel" in ui_src),
        ("Havok panel in classes tuple",          "FO4_PT_HavokPhysicsPanel," in ui_src),
        ("Havok panel shows preset prop",         '"fo4_physics_preset"' in ui_src),
        ("Havok panel shows live warnings",       "fo4_physics_show_warnings" in ui_src),
        ("fo4_physics_helpers imported in __init__", "fo4_physics_helpers" in init_src),
    ]

    # ── Mod packaging helpers ─────────────────────────────────────────────────
    packaging_checks = [
        ("ModPackager class defined",             "class ModPackager" in packaging_src),
        ("create_structure() method present",     "def create_structure(" in packaging_src),
        ("generate_fomod() method present",       "def generate_fomod(" in packaging_src),
        ("generate_readme() method present",      "def generate_readme(" in packaging_src),
        ("validate_structure() method present",   "def validate_structure(" in packaging_src),
        ("_write_ba2_scripts() present",          "def _write_ba2_scripts(" in packaging_src),
        ("export_manifest() method present",      "def export_manifest(" in packaging_src),
        ("info.xml generation in generate_fomod","info.xml" in packaging_src),
        ("ModuleConfig.xml generation",           "ModuleConfig.xml" in packaging_src),
        ("pack_ba2.bat written",                  "pack_ba2.bat" in packaging_src),
        ("pack_ba2.sh written",                   "pack_ba2.sh" in packaging_src),
        ("README.md generation",                  "README.md" in packaging_src),
        ("mod_manifest.json export",              "mod_manifest.json" in packaging_src),
        ("register() defined",                    "def register()" in packaging_src),
        ("fo4_mod_name scene prop",               "fo4_mod_name" in packaging_src),
        ("fo4_mod_root scene prop",               "fo4_mod_root" in packaging_src),
        ("fo4_mod_author scene prop",             "fo4_mod_author" in packaging_src),
        ("fo4_mod_version scene prop",            "fo4_mod_version" in packaging_src),
        # Operators
        ("FO4_OT_CreateModStructure operator",    "FO4_OT_CreateModStructure" in ops_src),
        ("FO4_OT_GenerateFOMOD operator",         "FO4_OT_GenerateFOMOD" in ops_src),
        ("FO4_OT_GenerateReadme operator",        "FO4_OT_GenerateReadme" in ops_src),
        ("FO4_OT_ValidateModStructure operator",  "FO4_OT_ValidateModStructure" in ops_src),
        ("FO4_OT_ExportModManifest operator",     "FO4_OT_ExportModManifest" in ops_src),
        ("Packaging ops registered in classes",
            all(o in ops_src for o in (
                "FO4_OT_CreateModStructure,", "FO4_OT_GenerateFOMOD,",
                "FO4_OT_GenerateReadme,", "FO4_OT_ValidateModStructure,",
                "FO4_OT_ExportModManifest,"))),
        # Panel
        ("FO4_PT_ModPackagingPanel defined",      "FO4_PT_ModPackagingPanel" in ui_src),
        ("Packaging panel in classes tuple",      "FO4_PT_ModPackagingPanel," in ui_src),
        ("Panel shows mod name prop",             '"fo4_mod_name"' in ui_src),
        ("Panel shows mod root prop",             '"fo4_mod_root"' in ui_src),
        ("Panel shows FOMOD generate button",     '"fo4.generate_fomod"' in ui_src),
        ("Panel shows README generate button",    '"fo4.generate_readme"' in ui_src),
        ("Panel shows validate button",           '"fo4.validate_mod_structure"' in ui_src),
        ("mod_packaging_helpers imported in __init__", "mod_packaging_helpers" in init_src),
    ]

    # ── Knowledge base docs ───────────────────────────────────────────────────
    kb_checks = [
        ("fo4_papyrus.md exists",       Path("knowledge_base/fo4_papyrus.md").exists()),
        ("fo4_physics.md exists",       Path("knowledge_base/fo4_physics.md").exists()),
        ("fo4_mod_packaging.md exists", Path("knowledge_base/fo4_mod_packaging.md").exists()),
        ("Papyrus KB covers template types",
            "ObjectReference" in Path("knowledge_base/fo4_papyrus.md").read_text()),
        ("Physics KB covers layer IDs",
            "L_STATIC" in Path("knowledge_base/fo4_physics.md").read_text()),
        ("Packaging KB covers FOMOD",
            "FOMOD" in Path("knowledge_base/fo4_mod_packaging.md").read_text()),
        ("Packaging KB covers BA2",
            "BA2" in Path("knowledge_base/fo4_mod_packaging.md").read_text()),
    ]

    all_checks = papyrus_checks + physics_checks + packaging_checks + kb_checks

    for check_name, result in all_checks:
        if result:
            print(f"✅ {check_name}: OK")
        else:
            print(f"❌ {check_name}: FAILED")
            failed.append(check_name)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} new-features check(s) failed")
        return False

    print("\n✅ PASSED: All Papyrus / Havok Physics / Mod Packaging checks passed")
    return True


def _install_ai_mocks():
    """Install lightweight torch / shap_e / point_e stubs for AI-generation tests.

    Only installed once — subsequent calls are no-ops.  The stubs are just
    enough to exercise the real code paths in shap_e_helpers.py and
    point_e_helpers.py without GPU hardware or actual model weights.
    """
    if "torch" in sys.modules:
        return  # already installed (or real torch is present)

    try:
        import numpy as _np
    except ImportError:
        return  # numpy not available; skip AI mock installation

    class _FakeTensor:
        def __init__(self, data=None):
            self._data = _np.zeros((1024, 3), dtype=_np.float32) if data is None else data
        def cpu(self): return self
        def numpy(self): return self._data
        def __len__(self): return len(self._data)

    class _FakeDevice:
        def __init__(self, s): self.type = str(s).split(":")[0]
        def __str__(self): return "cpu"

    class _FakeCuda:
        @staticmethod
        def is_available(): return False

    class _FakeBackends:
        class cudnn:
            benchmark = False

    class _FakeAmp:
        class autocast:
            def __init__(self, *a, **kw): pass
            def __enter__(self): return self
            def __exit__(self, *a): pass

    class _InferenceMode:
        def __enter__(self): return self
        def __exit__(self, *a): pass

    torch_mod = types.ModuleType("torch")
    torch_mod.__version__  = "2.2.0+mock"
    torch_mod.device       = staticmethod(lambda s: _FakeDevice(str(s)))
    torch_mod.cuda         = _FakeCuda()
    torch_mod.backends     = _FakeBackends()
    torch_mod.amp          = _FakeAmp()
    torch_mod.inference_mode = staticmethod(lambda: _InferenceMode())
    torch_mod.float32      = _np.float32
    sys.modules["torch"] = torch_mod

    # ── shap_e stubs ────────────────────────────────────────────────────────
    class _FakeModel:
        def eval(self): return self
        def half(self): return self

    class _FakeXM(_FakeModel):
        pass

    class _FakeMesh:
        verts = _np.zeros((100, 3), dtype=_np.float32)
        faces = _np.zeros((50, 3), dtype=_np.int32)
        def tri_mesh(self): return self

    se_dl = types.ModuleType("shap_e.models.download")
    se_dl.load_model  = lambda name, device=None: (_FakeXM() if name == "transmitter" else _FakeModel())
    se_dl.load_config = lambda name: {}

    se_gd = types.ModuleType("shap_e.diffusion.gaussian_diffusion")
    se_gd.diffusion_from_config = lambda cfg: object()

    se_sample = types.ModuleType("shap_e.diffusion.sample")
    se_sample.sample_latents = lambda **kw: [_FakeTensor()]

    se_nb = types.ModuleType("shap_e.util.notebooks")
    se_nb.decode_latent_mesh = lambda xm, lat: _FakeMesh()

    for _n, _m in [
        ("shap_e",                          types.ModuleType("shap_e")),
        ("shap_e.models",                   types.ModuleType("shap_e.models")),
        ("shap_e.models.download",          se_dl),
        ("shap_e.diffusion",                types.ModuleType("shap_e.diffusion")),
        ("shap_e.diffusion.gaussian_diffusion", se_gd),
        ("shap_e.diffusion.sample",         se_sample),
        ("shap_e.util",                     types.ModuleType("shap_e.util")),
        ("shap_e.util.notebooks",           se_nb),
    ]:
        sys.modules[_n] = _m

    # ── point_e stubs ───────────────────────────────────────────────────────
    class _FakePointModel(_FakeModel):
        def load_state_dict(self, sd): pass

    class _FakePointCloud:
        coords   = _FakeTensor(_np.zeros((1024, 3), dtype=_np.float32))
        channels = _FakeTensor(_np.zeros((1024, 3), dtype=_np.float32))

    class _FakeSampler:
        def sample_batch_progressive(self, batch_size=1, model_kwargs=None):
            yield [_FakePointCloud()]

    _PE_MODEL_CONFIGS = {
        "base40M-textvec": {}, "base40M": {}, "upsample": {},
    }
    _PE_DIFF_CONFIGS = {
        "base40M-textvec": {"timestep_respacing": "64"},
        "base40M":         {"timestep_respacing": "64"},
        "upsample":        {"timestep_respacing": "64"},
    }

    pe_dl = types.ModuleType("point_e.models.download")
    pe_dl.load_checkpoint = lambda name, device=None: {}

    pe_cfg = types.ModuleType("point_e.models.configs")
    pe_cfg.MODEL_CONFIGS    = _PE_MODEL_CONFIGS
    pe_cfg.model_from_config = lambda cfg, device=None: _FakePointModel()

    pe_dc = types.ModuleType("point_e.diffusion.configs")
    pe_dc.DIFFUSION_CONFIGS      = _PE_DIFF_CONFIGS
    pe_dc.diffusion_from_config  = lambda cfg: object()

    pe_ds = types.ModuleType("point_e.diffusion.sampler")
    pe_ds.PointCloudSampler = lambda **kw: _FakeSampler()

    for _n, _m in [
        ("point_e",                   types.ModuleType("point_e")),
        ("point_e.models",            types.ModuleType("point_e.models")),
        ("point_e.models.download",   pe_dl),
        ("point_e.models.configs",    pe_cfg),
        ("point_e.diffusion",         types.ModuleType("point_e.diffusion")),
        ("point_e.diffusion.configs", pe_dc),
        ("point_e.diffusion.sampler", pe_ds),
    ]:
        sys.modules[_n] = _m

    # ── PIL stub ─────────────────────────────────────────────────────────────
    if "PIL" not in sys.modules:
        pil = types.ModuleType("PIL")
        pil_img = types.ModuleType("PIL.Image")
        pil_img.open = lambda p: object()
        sys.modules["PIL"]       = pil
        sys.modules["PIL.Image"] = pil_img


def test_ai_generation():
    """Verify AI generation helpers (Shap-E & Point-E) work end-to-end.

    Uses lightweight in-process mocks for torch, shap_e, and point_e so the
    test runs without GPU hardware or real model downloads.  It exercises the
    same code paths that Blender operators take when the user clicks
    'Generate'.
    """
    print("\n" + "="*70)
    print("TEST 13: AI Generation (Shap-E & Point-E)")
    print("="*70)

    addon_dir = Path(__file__).parent
    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    # Install AI stubs (no-op if torch already present)
    _install_ai_mocks()

    # numpy is needed by the generation helpers; skip gracefully if absent
    try:
        import numpy  # noqa: F401
    except ImportError:
        print("⚠️  numpy not available — skipping AI generation tests")
        return True

    # ── Load modules ─────────────────────────────────────────────────────────
    # Ensure notification_system is available (used by operators)
    _load_module(addon_dir, "notification_system")

    se_mod, se_err = _load_module(addon_dir, "shap_e_helpers")
    ck("shap_e_helpers imports without error", se_mod is not None, se_err or "")

    pe_mod, pe_err = _load_module(addon_dir, "point_e_helpers")
    ck("point_e_helpers imports without error", pe_mod is not None, pe_err or "")

    if se_mod is None or pe_mod is None:
        return False

    # ── Class structure ───────────────────────────────────────────────────────
    ck("ShapEHelpers class defined at module level",
       hasattr(se_mod, "ShapEHelpers"))
    ck("PointEHelpers class defined at module level",
       hasattr(pe_mod, "PointEHelpers"))

    SE = getattr(se_mod, "ShapEHelpers", None)
    PE = getattr(pe_mod, "PointEHelpers", None)

    for name in ("is_shap_e_installed", "generate_from_text",
                 "generate_from_image", "create_mesh_from_data"):
        ck(f"ShapEHelpers.{name} callable",
           callable(getattr(SE, name, None)) if SE else False)

    for name in ("is_point_e_installed", "generate_from_text",
                 "generate_from_image", "point_cloud_to_mesh"):
        ck(f"PointEHelpers.{name} callable",
           callable(getattr(PE, name, None)) if PE else False)

    if not SE or not PE:
        return False

    # ── Create a shared stub image file for both image-generation tests ───────
    import tempfile
    tmp_fd, tmp_img = tempfile.mkstemp(suffix=".png")
    try:
        try:
            os.write(tmp_fd, b"\x89PNG\r\n\x1a\n" + b"\x00" * 16)
        finally:
            os.close(tmp_fd)

        # ── Shap-E text generation ────────────────────────────────────────────
        try:
            ok, result = SE.generate_from_text(
                "a medieval sword", guidance_scale=15.0, num_inference_steps=16
            )
            ck("Shap-E text generation succeeds", ok, str(result) if not ok else "")
            if ok:
                ck("Shap-E result has vertices", "vertices" in result)
                ck("Shap-E result has faces",    "faces" in result)
        except Exception as exc:
            ck("Shap-E text generation (no exception)", False, str(exc))

        # ── Shap-E image generation ───────────────────────────────────────────
        try:
            ok, result = SE.generate_from_image(
                tmp_img, guidance_scale=3.0, num_inference_steps=16
            )
            ck("Shap-E image generation succeeds", ok, str(result) if not ok else "")
        except Exception as exc:
            ck("Shap-E image generation (no exception)", False, str(exc))

        # ── Point-E text generation ───────────────────────────────────────────
        try:
            ok, result = PE.generate_from_text(
                "a wooden chair", num_samples=1, grid_size=32, num_steps=16
            )
            ck("Point-E text generation succeeds", ok, str(result) if not ok else "")
            if ok:
                ck("Point-E result has coords",     "coords"     in result)
                ck("Point-E result has num_points", "num_points" in result)
        except Exception as exc:
            ck("Point-E text generation (no exception)", False, str(exc))

        # ── Point-E image generation ──────────────────────────────────────────
        try:
            ok, result = PE.generate_from_image(
                tmp_img, num_samples=1, grid_size=32, num_steps=16
            )
            ck("Point-E image generation succeeds", ok, str(result) if not ok else "")
        except Exception as exc:
            ck("Point-E image generation (no exception)", False, str(exc))

        # ── Sampler cache hit (second call must not reload models) ────────────
        try:
            ok2, _ = PE.generate_from_text(
                "another object", num_samples=1, grid_size=32, num_steps=16
            )
            ck("Point-E sampler cache hit on repeated call", ok2)
        except Exception as exc:
            ck("Point-E sampler cache (no exception)", False, str(exc))

    finally:
        try:
            os.unlink(tmp_img)
        except OSError:
            pass

    if failed:
        print(f"\n❌ FAILED: {len(failed)} AI-generation check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: All AI generation checks passed")
    return True


def test_umodel_download():
    """Verify umodel_helpers download configuration and fallback behaviour.

    Checks that:
    - The module exposes the expected constants and functions.
    - DOWNLOAD_CANDIDATES contains at least two URLs (primary + fallback).
    - A browser-like User-Agent is configured so servers do not reject the
      request with a spurious 404.
    - When every URL fails, download_latest() returns False with an
      actionable manual-download message (not a raw HTTP error string).
    """
    print("\n" + "="*70)
    print("TEST 14: UModel Download Configuration")
    print("="*70)

    addon_dir = Path(__file__).parent
    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    mod, err = _load_module(addon_dir, "umodel_helpers")
    ck("umodel_helpers loads without error", mod is not None, err or "")
    if mod is None:
        return False

    # ── Module-level constants ────────────────────────────────────────────────
    ck("DOWNLOAD_CANDIDATES defined", hasattr(mod, "DOWNLOAD_CANDIDATES"))
    ck("_DOWNLOAD_HEADERS defined",   hasattr(mod, "_DOWNLOAD_HEADERS"))
    ck("DOWNLOAD_PAGE_URL defined",   hasattr(mod, "DOWNLOAD_PAGE_URL"))

    candidates = getattr(mod, "DOWNLOAD_CANDIDATES", [])
    ck("At least two download candidates (primary + fallback)",
       len(candidates) >= 2, f"got {len(candidates)}")

    # Use urlparse to check the hostname precisely, not a substring match.
    from urllib.parse import urlparse as _urlparse
    primary_host = _urlparse(candidates[0]).hostname if candidates else ""
    ck("Primary candidate is gildor.org",
       primary_host in ("www.gildor.org", "gildor.org"))
    ck("Fallback candidate present",
       len(candidates) >= 2 and candidates[1].startswith("https://"))

    headers = getattr(mod, "_DOWNLOAD_HEADERS", {})
    ua = headers.get("User-Agent", "")
    ck("User-Agent header is set",        bool(ua))
    ck("User-Agent does not contain 'python'", "python" not in ua.lower(), ua)
    ck("User-Agent looks like a browser",  "Mozilla" in ua, ua)

    # ── Functions present ─────────────────────────────────────────────────────
    for fn in ("status", "download_latest", "tool_path",
               "executable_path", "open_download_page"):
        ck(f"{fn}() callable", callable(getattr(mod, fn, None)))

    # ── Failure message is actionable ─────────────────────────────────────────
    # Patch urlopen to always raise a 404 so we exercise the fallback path.
    import urllib.error as _ue
    import unittest.mock as _mock

    tool_dir = mod.get_tool_dir()

    fake_404 = _ue.HTTPError(
        url="https://example.com", code=404,
        msg="Not Found", hdrs=None, fp=None,
    )

    with _mock.patch.object(mod.urllib.request, "urlopen", side_effect=fake_404):
        ok, msg = mod.download_latest()

    ck("download_latest returns False when all URLs fail", not ok)
    ck("Failure message mentions DOWNLOAD_PAGE_URL",
       mod.DOWNLOAD_PAGE_URL in msg, repr(msg))
    ck("Failure message includes manual download instruction",
       "manually" in msg.lower() or "visit" in msg.lower(), repr(msg))
    ck("Failure message tells user where to extract the zip",
       "extract" in msg.lower() or str(tool_dir) in msg, repr(msg))

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: UModel download configuration is correct")
    return True


def test_umodel_manual_detection():
    """Ensure a manually extracted UModel install is detected even when nested."""
    print("\n" + "="*70)
    print("TEST 15: UModel Manual Install Detection")
    print("="*70)

    addon_dir = Path(__file__).parent
    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    mod, err = _load_module(addon_dir, "umodel_helpers")
    ck("umodel_helpers loads without error", mod is not None, err or "")
    if mod is None:
        return False

    import tempfile

    with tempfile.TemporaryDirectory() as tmpdir:
        install_root = Path(tmpdir) / "umodel"
        nested = install_root / "umodel_win32"
        nested.mkdir(parents=True, exist_ok=True)
        exe_path = nested / "umodel_64.exe"
        exe_path.write_bytes(b"")

        orig_default = mod.DEFAULT_TOOL_DIR
        orig_fallback = mod.FALLBACK_TOOL_DIR
        try:
            mod.DEFAULT_TOOL_DIR = install_root
            mod.FALLBACK_TOOL_DIR = install_root

            ready, message = mod.status()
            ck("status recognizes nested executable", ready, message)
            ck("executable_path returns nested exe", mod.executable_path() == str(exe_path))
            ck("tool_path reports detected folder", mod.tool_path() == str(exe_path.parent))
        finally:
            mod.DEFAULT_TOOL_DIR = orig_default
            mod.FALLBACK_TOOL_DIR = orig_fallback

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: UModel manual install detection works")
    return True


def test_torch_missing_messages():
    """Verify that a missing PyTorch installation yields a helpful message.

    When torch is absent, is_shap_e_installed() and is_point_e_installed()
    must return a message that clearly says PyTorch needs to be installed,
    not the misleading "Shap-E not installed: No module named 'torch'" or
    "Point-E not installed: No module named 'torch'".
    """
    print("\n" + "="*70)
    print("TEST 16: Missing-PyTorch Error Messages (Shap-E & Point-E)")
    print("="*70)

    addon_dir = Path(__file__).parent
    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    # Stash every torch / shap_e / point_e entry so we can restore them later.
    stashed = {k: v for k, v in sys.modules.items()
               if (k == "torch" or k.startswith("torch.")
                   or k.startswith("shap_e") or k.startswith("point_e"))}
    for k in stashed:
        sys.modules.pop(k)

    # Also evict any previously loaded helper modules so the checks run fresh.
    helper_keys = [k for k in sys.modules
                   if "shap_e_helpers" in k or "point_e_helpers" in k]
    stashed_helpers = {k: sys.modules.pop(k) for k in helper_keys}

    try:
        se_mod, se_err = _load_module(addon_dir, "shap_e_helpers")
        ck("shap_e_helpers loads without error (no torch)", se_mod is not None, se_err or "")

        pe_mod, pe_err = _load_module(addon_dir, "point_e_helpers")
        ck("point_e_helpers loads without error (no torch)", pe_mod is not None, pe_err or "")

        if se_mod is None or pe_mod is None:
            return False

        SE = se_mod.ShapEHelpers
        PE = pe_mod.PointEHelpers

        # Clear any availability cache left from earlier tests.
        SE.clear_cache()
        PE.clear_cache()

        ok_se, msg_se = SE.is_shap_e_installed()
        ck("Shap-E availability returns False when torch missing", not ok_se)
        ck("Shap-E message mentions PyTorch", "PyTorch" in msg_se, repr(msg_se))
        ck("Shap-E message does not say 'Shap-E not installed: No module'",
           "Shap-E not installed: No module" not in msg_se, repr(msg_se))

        ok_pe, msg_pe = PE.is_point_e_installed()
        ck("Point-E availability returns False when torch missing", not ok_pe)
        ck("Point-E message mentions PyTorch", "PyTorch" in msg_pe, repr(msg_pe))
        ck("Point-E message does not say 'Point-E not installed: No module'",
           "Point-E not installed: No module" not in msg_pe, repr(msg_pe))

    finally:
        # Remove the freshly loaded (no-torch) helper modules.
        for k in ["fallout4_tutorial_helper.shap_e_helpers",
                  "fallout4_tutorial_helper.point_e_helpers",
                  "shap_e_helpers", "point_e_helpers"]:
            sys.modules.pop(k, None)
        # Restore torch/shap_e/point_e stubs and original helper modules.
        sys.modules.update(stashed)
        sys.modules.update(stashed_helpers)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: Missing-PyTorch messages are correct")
    return True


def test_blender5_access_violation_fix():
    """Verify the Blender 5.0.1 EXCEPTION_ACCESS_VIOLATION fix.

    Calling bpy.ops.wm.quit_blender() directly from within an invoke_confirm
    popup handler crashes Blender 5.0.1 (BLI_addhead / WM_event_add_ui_handler
    / wm_exit_schedule_delayed null-dereference).  The fix is:

    1. FO4_OT_ReloadAddon.execute() must schedule the quit via
       bpy.app.timers.register() so it runs *after* the popup is closed.
    2. FO4_OT_ReloadAddon must have an invoke() that shows invoke_confirm.
    3. The UI panel must expose the restart button (not commented out).
    4. addon_updater must track _needs_restart and show a restart button after
       a successful update.
    """
    print("\n" + "="*70)
    print("TEST 17: Blender 5.0.1 Access-Violation Fix (timer-based quit)")
    print("="*70)

    addon_dir = Path(__file__).parent
    failed = []
    import re

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    ops_src     = (addon_dir / "operators.py").read_text()
    ui_src      = (addon_dir / "ui_panels.py").read_text()
    updater_src = (addon_dir / "addon_updater.py").read_text()

    # ── operators.py checks ───────────────────────────────────────────────────

    ck("FO4_OT_ReloadAddon class present",
       "class FO4_OT_ReloadAddon" in ops_src)

    # Extract just the FO4_OT_ReloadAddon execute() body to verify the timer
    # and quit_blender call are co-located in that method (not elsewhere).
    reload_class_start = ops_src.find("class FO4_OT_ReloadAddon")
    next_class_start   = ops_src.find("\nclass ", reload_class_start + 1)
    reload_class_body  = ops_src[reload_class_start:next_class_start]

    ck("execute() defers quit via bpy.app.timers.register",
       "bpy.app.timers.register" in reload_class_body)

    ck("quit_blender() is inside a lambda passed to timers.register in FO4_OT_ReloadAddon",
       "lambda" in reload_class_body and "quit_blender" in reload_class_body)

    _interval_match = re.search(r"first_interval\s*=\s*([0-9.]+)", reload_class_body)
    _interval_val = None
    if _interval_match:
        try:
            _interval_val = float(_interval_match.group(1))
        except ValueError:
            _interval_val = None
    ck("quit timer uses a non-zero first_interval delay",
       _interval_val is not None and _interval_val > 0.0,
       f"first_interval={_interval_val!r}")

    ck("FO4_OT_ReloadAddon has invoke() using invoke_confirm",
       "invoke_confirm" in reload_class_body)

    ck("FO4_OT_ReloadAddon registered in classes tuple",
       "FO4_OT_ReloadAddon," in ops_src)

    # ── ui_panels.py checks ───────────────────────────────────────────────────

    ck("fo4.reload_addon button present in UI (not commented out)",
       'layout.operator("fo4.reload_addon"' in ui_src
       or 'row.operator("fo4.reload_addon"' in ui_src
       or 'col.operator("fo4.reload_addon"' in ui_src)

    # The old crash-causing comment must be gone.
    ck("'causes crashes' comment removed from UI",
       "causes crashes" not in ui_src)

    # ── addon_updater.py checks ───────────────────────────────────────────────

    ck("_needs_restart flag defined in addon_updater",
       "_needs_restart" in updater_src)

    ck("_needs_restart set to True after successful install",
       "_needs_restart = True" in updater_src)

    ck("_needs_restart reset to False when a new update check starts",
       "_needs_restart = False" in updater_src)

    ck("draw_update_ui shows restart button when _needs_restart",
       "_needs_restart" in updater_src and "fo4.reload_addon" in updater_src)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: Blender 5.0.1 access-violation fix is in place")
    return True


def test_tool_root_preferences():
    """Ensure tool/PyTorch root paths are persisted and default to D: drives."""
    print("\n" + "="*70)
    print("TEST 18: Tool Root Preferences")
    print("="*70)

    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    addon_dir = Path(__file__).parent
    stashed = {k: sys.modules.pop(k) for k in list(sys.modules)
               if k == "preferences" or k.endswith(".preferences")}
    try:
        prefs_mod, err = _load_module(addon_dir, "preferences")
        ck("preferences loads", prefs_mod is not None, err or "")
        if prefs_mod is None:
            return False

        prefs = prefs_mod.get_preferences()
        ck("tools_root default is D:/blender_tools",
           getattr(prefs, "tools_root", "") == "D:/blender_tools",
           getattr(prefs, "tools_root", ""))
        ck("torch_root default is D:/blender_torch",
           getattr(prefs, "torch_root", "") == "D:/blender_torch",
           getattr(prefs, "torch_root", ""))
        ck("fo4_tools_root persisted",
           "fo4_tools_root" in getattr(prefs_mod, "_PERSISTENT", ()))
        ck("fo4_torch_root persisted",
           "fo4_torch_root" in getattr(prefs_mod, "_PERSISTENT", ()))
    except Exception as exc:
        ck("preferences access", False, str(exc))
    finally:
        sys.modules.update(stashed)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: Tool root preferences are configured")
    return True


def test_fo4_readiness_scan_operator():
    """Verify the FO4 readiness scan operator and UI hook exist."""
    print("\n" + "="*70)
    print("TEST 19: FO4 Readiness Scan Operator")
    print("="*70)

    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    addon_dir = Path(__file__).parent
    try:
        ops_src = (addon_dir / "operators.py").read_text(encoding="utf-8")
        ui_src = (addon_dir / "ui_panels.py").read_text(encoding="utf-8")
    except Exception as exc:
        ck("read operators/ui sources", False, str(exc))
        return False

    ck("FO4_OT_ScanFO4Readiness class defined",
       "class FO4_OT_ScanFO4Readiness" in ops_src)
    ck("fo4.scan_fo4_readiness idname present",
       'bl_idname = "fo4.scan_fo4_readiness"' in ops_src)
    ck("Readiness scan registered in classes tuple",
       "FO4_OT_ScanFO4Readiness," in ops_src)
    ck("UI includes readiness scan button",
       "fo4.scan_fo4_readiness" in ui_src)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: FO4 readiness scan operator is wired into UI")
    return True


def test_unity_asset_import_operator():
    """Ensure Unity asset import operator is present and wired to UI."""
    print("\n" + "="*70)
    print("TEST 20: Unity Asset Import Operator")
    print("="*70)

    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    addon_dir = Path(__file__).parent
    try:
        ops_src = (addon_dir / "operators.py").read_text(encoding="utf-8")
        ui_src = (addon_dir / "ui_panels.py").read_text(encoding="utf-8")
    except Exception as exc:
        ck("read operators/ui sources", False, str(exc))
        return False

    ck("FO4_OT_ImportUnityAsset class defined",
       "class FO4_OT_ImportUnityAsset" in ops_src)
    ck("fo4.import_unity_asset idname present",
       'bl_idname = "fo4.import_unity_asset"' in ops_src)
    ck("Unity import operator registered in classes tuple",
       "FO4_OT_ImportUnityAsset," in ops_src)
    ck("Unity panel exposes Import Unity Asset button",
       "fo4.import_unity_asset" in ui_src)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: Unity asset import operator is present and wired")
    return True


def test_unreal_asset_import_operator():
    """Ensure Unreal asset import operator is present and wired to UI."""
    print("\n" + "="*70)
    print("TEST 21: Unreal Asset Import Operator")
    print("="*70)

    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    addon_dir = Path(__file__).parent
    try:
        ops_src = (addon_dir / "operators.py").read_text(encoding="utf-8")
        ui_src = (addon_dir / "ui_panels.py").read_text(encoding="utf-8")
    except Exception as exc:
        ck("read operators/ui sources", False, str(exc))
        return False

    ck("FO4_OT_ImportUnrealAsset class defined",
       "class FO4_OT_ImportUnrealAsset" in ops_src)
    ck("fo4.import_unreal_asset idname present",
       'bl_idname = "fo4.import_unreal_asset"' in ops_src)
    ck("Unreal import operator registered in classes tuple",
       "FO4_OT_ImportUnrealAsset," in ops_src)
    ck("Unreal panel exposes Import Unreal Asset button",
       "fo4.import_unreal_asset" in ui_src)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: Unreal asset import operator is present and wired")
    return True


def test_presets_do_not_create_placeholders_for_game_meshes():
    """Weapon/armor/prop/vegetation presets should not spawn placeholder cubes."""
    print("\n" + "="*70)
    print("TEST 22: Presets Avoid Placeholder Meshes")
    print("="*70)

    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    ops_src = Path(__file__).parent.joinpath("operators.py").read_text(encoding="utf-8")

    ck("Weapon preset no placeholder string",
       "Created placeholder for {self.weapon_type} weapon" not in ops_src)
    ck("Armor preset no placeholder string",
       "Created placeholder for {self.armor_type} armor" not in ops_src)
    ck("Prop preset no placeholder string",
       "Created placeholder for {self.prop_type} prop" not in ops_src)
    ck("Vegetation preset no placeholder string",
       "Created placeholder {self.vegetation_type} vegetation" not in ops_src)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: Game presets no longer spawn placeholder meshes")
    return True


def test_game_imports_apply_textures():
    """Verify game/unity/unreal imports attempt to apply textures/materials."""
    print("\n" + "="*70)
    print("TEST 23: Game Imports Apply Textures")
    print("="*70)

    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    ops_src = Path(__file__).parent.joinpath("operators.py").read_text(encoding="utf-8")

    ck("_auto_apply_textures_from_game_asset helper exists",
       "_auto_apply_textures_from_game_asset" in ops_src)
    ck("_apply_textures_to_active helper exists",
       "_apply_textures_to_active" in ops_src)
    ck("Unity import calls _apply_textures_to_active",
       "Unity import: {msg}" in ops_src and "_apply_textures_to_active(textures" in ops_src)
    ck("Unreal import calls _apply_textures_to_active",
       "Unreal import: {msg}" in ops_src and "_apply_textures_to_active(textures" in ops_src)
    ck("Game preset import calls auto texture apply",
       "_auto_apply_textures_from_game_asset(nif_path)" in ops_src)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: Imports attempt to apply materials/textures")
    return True


def test_panel_draw_correctness():
    """Test that ui_panels.py draw() methods don't use undefined variables
    or invalid icons that would crash panels in Blender 4.x+.
    """
    print("\n" + "="*70)
    print("TEST 24: Panel Draw Correctness")
    print("="*70)

    import ast

    failed = []

    def ck(label, cond, detail=""):
        sym = "✅" if cond else "❌"
        print(f"{sym} {label}{(': ' + detail) if detail else ''}")
        if not cond:
            failed.append(label + ((" — " + detail) if detail else ""))

    ui_src = Path(__file__).parent.joinpath("ui_panels.py").read_text(encoding="utf-8")
    tree = ast.parse(ui_src)

    # 1. Check for invalid/removed Blender icons
    # FACE_MAPS was removed in Blender 4.0 when the Face Maps feature was removed.
    # Using it in layout.operator() raises ValueError and crashes the panel draw.
    removed_icons = ['FACE_MAPS']
    for icon in removed_icons:
        ck(
            f"No removed icon '{icon}' in ui_panels.py",
            f"icon='{icon}'" not in ui_src,
            f"'{icon}' was removed in Blender 4.0; causes ValueError and panel crash",
        )

    # 2. Check each panel draw() for undefined 'has_mesh' variable
    panels_with_has_mesh_bug = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name.startswith('FO4_PT_'):
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name == 'draw':
                    # Collect all variable names assigned in this function
                    assigned = set()
                    for inner in ast.walk(item):
                        if isinstance(inner, ast.Assign):
                            for target in inner.targets:
                                if isinstance(target, ast.Name):
                                    assigned.add(target.id)
                        elif isinstance(inner, ast.AugAssign):
                            if isinstance(inner.target, ast.Name):
                                assigned.add(inner.target.id)

                    # Check if 'has_mesh' is used without being assigned first
                    uses_has_mesh = any(
                        isinstance(inner, ast.Name) and inner.id == 'has_mesh'
                        for inner in ast.walk(item)
                    )
                    if uses_has_mesh and 'has_mesh' not in assigned:
                        panels_with_has_mesh_bug.append(node.name)

    ck(
        "No panel draw() uses 'has_mesh' without defining it",
        len(panels_with_has_mesh_bug) == 0,
        ", ".join(panels_with_has_mesh_bug) if panels_with_has_mesh_bug else "",
    )

    # 3. Ensure Export panel defines has_mesh before using it
    export_has_mesh_defined = False
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == 'FO4_PT_ExportPanel':
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name == 'draw':
                    for inner in ast.walk(item):
                        if isinstance(inner, ast.Assign):
                            for target in inner.targets:
                                if isinstance(target, ast.Name) and target.id == 'has_mesh':
                                    export_has_mesh_defined = True
    ck("FO4_PT_ExportPanel.draw() defines 'has_mesh'", export_has_mesh_defined)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} check(s) failed")
        for f in failed:
            print(f"   • {f}")
        return False

    print("\n✅ PASSED: Panel draw methods are correct")
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
        ("Texture Node Labels", test_texture_node_labels),
        ("UV Unwrap Quality", test_uv_unwrap_quality),
        ("D: Drive Paths", test_d_drive_paths),
        ("Vegetation Workflow", test_vegetation_workflow),
        ("Post-Processing", test_post_processing),
        ("Preferences Migration", test_preferences_migration),
        ("New Features (Papyrus/Physics/Packaging)", test_new_features),
        ("AI Generation (Shap-E & Point-E)",         test_ai_generation),
        ("UModel Download Configuration",             test_umodel_download),
        ("UModel Manual Install Detection",           test_umodel_manual_detection),
        ("Missing-PyTorch Error Messages",            test_torch_missing_messages),
        ("Blender 5.0.1 Access-Violation Fix",        test_blender5_access_violation_fix),
        ("Tool Root Preferences",                     test_tool_root_preferences),
        ("FO4 Readiness Scan Operator",               test_fo4_readiness_scan_operator),
        ("Unity Asset Import Operator",               test_unity_asset_import_operator),
        ("Unreal Asset Import Operator",              test_unreal_asset_import_operator),
        ("Presets Avoid Placeholder Meshes",          test_presets_do_not_create_placeholders_for_game_meshes),
        ("Game Imports Apply Textures",               test_game_imports_apply_textures),
        ("Panel Draw Correctness",                    test_panel_draw_correctness),
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
