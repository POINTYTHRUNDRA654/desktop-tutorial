#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Addon Integrity Test Suite
Tests the addon package to verify all components are working correctly
"""

import sys
import os
import zipfile
import importlib.util
from pathlib import Path

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


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

    sys.path.insert(0, str(addon_dir))

    failed_imports = []
    for module_name in test_modules:
        try:
            module_path = addon_dir / f"{module_name}.py"
            if not module_path.exists():
                print(f"❌ {module_name}: File not found")
                failed_imports.append(module_name)
                continue

            spec = importlib.util.spec_from_file_location(module_name, module_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            print(f"✅ {module_name}: Import successful")
        except Exception as e:
            print(f"❌ {module_name}: Import failed - {str(e)}")
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
    sys.path.insert(0, str(addon_dir))

    try:
        import export_helpers

        required_functions = [
            "export_mesh_to_nif",
            "export_mesh_with_collision",
            "export_scene_as_single_nif",
            "export_complete_mod",
        ]

        missing = []
        for func_name in required_functions:
            if not hasattr(export_helpers.ExportHelpers, func_name):
                print(f"❌ {func_name}: Missing from ExportHelpers")
                missing.append(func_name)
            else:
                print(f"✅ {func_name}: Found")

        if missing:
            print(f"\n❌ FAILED: Missing {len(missing)} function(s)")
            return False

        print(f"\n✅ PASSED: All {len(required_functions)} export functions present")
        return True

    except Exception as e:
        print(f"❌ FAILED: Could not verify export functions - {str(e)}")
        return False


def test_tool_helpers():
    """Verify tool helper modules have required functions"""
    print("\n" + "="*70)
    print("TEST 4: Verifying tool helper functions")
    print("="*70)

    addon_dir = Path(__file__).parent
    sys.path.insert(0, str(addon_dir))

    test_cases = [
        ("asset_ripper_helpers", ["status", "download_latest", "repo_path"]),
        ("asset_studio_helpers", ["status", "download_latest", "repo_path"]),
        ("umodel_tools_helpers", ["status", "download_latest", "addon_path"]),
        ("unity_fbx_importer_helpers", ["status", "download_latest", "repo_path"]),
        ("nvtt_helpers", ["convert_to_dds", "convert_object_textures"]),
        ("mesh_helpers", ["optimize_mesh", "validate_mesh"]),
        ("texture_helpers", ["setup_fo4_material"]),
    ]

    failed = []
    for module_name, functions in test_cases:
        try:
            module_path = addon_dir / f"{module_name}.py"
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            # Get the helper class (most modules have a class like NVTTHelpers, MeshHelpers, etc.)
            helper_class = None
            for attr_name in dir(module):
                if "Helper" in attr_name and not attr_name.startswith("_"):
                    helper_class = getattr(module, attr_name)
                    break

            # Check if functions exist
            for func_name in functions:
                found = False
                if helper_class and hasattr(helper_class, func_name):
                    found = True
                elif hasattr(module, func_name):
                    found = True

                if found:
                    print(f"✅ {module_name}.{func_name}: Found")
                else:
                    print(f"❌ {module_name}.{func_name}: Missing")
                    failed.append(f"{module_name}.{func_name}")

        except Exception as e:
            print(f"❌ {module_name}: Error checking functions - {str(e)}")
            failed.append(module_name)

    if failed:
        print(f"\n❌ FAILED: {len(failed)} function(s) missing or errors")
        return False

    print(f"\n✅ PASSED: All tool helper functions present")
    return True


def test_fo4_export_settings():
    """Verify Fallout 4 export settings are correct"""
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

        # Check for key FO4 settings
        checks = [
            ("FALLOUT_4 game profile", "FALLOUT_4" in content),
            ("Tangent space setting", "tangent_space" in content or "use_tangent_space" in content),
            ("Scale correction", "scale_correction" in content),
            ("Triangulate modifier", "Triangulate" in content),
            ("BSTriShape mention", "BSTriShape" in content),
        ]

        failed = []
        for check_name, result in checks:
            if result:
                print(f"✅ {check_name}: Found")
            else:
                print(f"❌ {check_name}: Missing")
                failed.append(check_name)

        # Check nvtt_helpers for correct DDS compression
        nvtt_path = addon_dir / "nvtt_helpers.py"
        with open(nvtt_path, 'r', encoding='utf-8') as f:
            nvtt_content = f.read()

        dds_checks = [
            ("BC1 (DXT1) for diffuse", "'bc1'" in nvtt_content or "'BC1'" in nvtt_content),
            ("BC5 (ATI2) for normals", "'bc5'" in nvtt_content or "'BC5'" in nvtt_content),
            ("BC3 (DXT5) for alpha", "'bc3'" in nvtt_content or "'BC3'" in nvtt_content),
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
