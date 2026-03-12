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
