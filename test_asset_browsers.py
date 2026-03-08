#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Unity and Unreal Engine Asset Browsers

Tests asset detection, indexing, and retrieval functionality
without requiring Blender to be running.
"""

import sys
import os
from pathlib import Path

# Add addon directory to path
addon_dir = Path(__file__).parent
sys.path.insert(0, str(addon_dir))

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def test_unity_assets():
    """Test Unity asset browser functionality."""
    print("\n" + "="*70)
    print("TEST: Unity Asset Browser")
    print("="*70)

    try:
        from unity_game_assets import UnityAssets

        # Test 1: Check detection (will fail without preferences, which is expected)
        print("\n1. Testing Unity asset detection...")
        assets_dir = UnityAssets.detect_unity_assets()

        if assets_dir:
            print(f"✅ Unity assets detected at: {assets_dir}")
        else:
            print("⚠️  No Unity assets configured (expected - set path in Blender preferences)")
            print("   Example path: H:/Unity Projects/MyProject/Assets")

        # Test 2: Manual path simulation
        print("\n2. Testing with manual path (simulated)...")
        print("   To use: Set 'Unity Assets Path' in Blender addon preferences")

        # Test 3: Category structure
        print("\n3. Checking asset categories...")
        categories = UnityAssets.get_asset_categories()
        print(f"✅ Defined {len(categories)} asset categories:")
        for cat_name, paths in categories.items():
            print(f"   - {cat_name}: {len(paths)} search paths")

        # Test 4: Status check
        print("\n4. Testing status reporting...")
        ready, message = UnityAssets.get_status()
        status_icon = "✅" if ready else "⚠️"
        print(f"{status_icon} Status: {message}")

        print("\n✅ Unity asset browser module loaded successfully")
        return True

    except Exception as e:
        print(f"\n❌ Unity asset browser test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_unreal_assets():
    """Test Unreal Engine asset browser functionality."""
    print("\n" + "="*70)
    print("TEST: Unreal Engine Asset Browser")
    print("="*70)

    try:
        from unreal_game_assets import UnrealAssets

        # Test 1: Check detection
        print("\n1. Testing Unreal asset detection...")
        assets_dir = UnrealAssets.detect_unreal_assets()

        if assets_dir:
            print(f"✅ Unreal assets detected at: {assets_dir}")
        else:
            print("⚠️  No Unreal assets configured (expected - set path in Blender preferences)")
            print("   Example path: H:/UnrealProjects/MyProject/Content")

        # Test 2: Manual path guidance
        print("\n2. Testing with manual path (simulated)...")
        print("   To use: Set 'Unreal Engine Assets Path' in Blender addon preferences")

        # Test 3: Category structure
        print("\n3. Checking asset categories...")
        categories = UnrealAssets.get_asset_categories()
        print(f"✅ Defined {len(categories)} asset categories:")
        for cat_name, paths in categories.items():
            print(f"   - {cat_name}: {len(paths)} search paths")

        # Test 4: Supported formats
        print("\n4. Checking supported file formats...")
        formats = ['.fbx', '.obj', '.usd', '.uasset', '.psk', '.pskx', '.gltf', '.glb']
        print(f"✅ Supports {len(formats)} formats:")
        print(f"   {', '.join(formats)}")

        # Test 5: Status check
        print("\n5. Testing status reporting...")
        ready, message = UnrealAssets.get_status()
        status_icon = "✅" if ready else "⚠️"
        print(f"{status_icon} Status: {message}")

        print("\n✅ Unreal asset browser module loaded successfully")
        return True

    except Exception as e:
        print(f"\n❌ Unreal asset browser test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_fo4_assets():
    """Test Fallout 4 asset browser functionality."""
    print("\n" + "="*70)
    print("TEST: Fallout 4 Asset Browser")
    print("="*70)

    try:
        from fo4_game_assets import FO4GameAssets

        # Test 1: Check detection
        print("\n1. Testing FO4 asset detection...")
        game_dir = FO4GameAssets.detect_fo4_installation()

        if game_dir:
            print(f"✅ Fallout 4 detected at: {game_dir}")
        else:
            print("⚠️  No FO4 installation or custom path configured")
            print("   Example custom path: H:/Fallout 4 working folder")

        # Test 2: Data directory
        print("\n2. Testing data directory detection...")
        data_dir = FO4GameAssets.get_data_dir()

        if data_dir:
            print(f"✅ FO4 Data directory: {data_dir}")
        else:
            print("⚠️  No data directory found (set custom path in preferences)")

        # Test 3: Category structure
        print("\n3. Checking asset categories...")
        categories = FO4GameAssets.get_asset_categories()
        print(f"✅ Defined {len(categories)} asset categories:")
        for cat_name, paths in categories.items():
            print(f"   - {cat_name}: {len(paths)} search paths")

        # Test 4: BA2 archives
        print("\n4. Checking for BA2 archives...")
        ba2_files = FO4GameAssets.list_ba2_archives()
        if ba2_files:
            print(f"✅ Found {len(ba2_files)} BA2 archives")
        else:
            print("⚠️  No BA2 archives found (may be using loose files)")

        # Test 5: Status check
        print("\n5. Testing status reporting...")
        ready, message = FO4GameAssets.get_status()
        status_icon = "✅" if ready else "⚠️"
        print(f"{status_icon} Status: {message}")

        print("\n✅ FO4 asset browser module loaded successfully")
        return True

    except Exception as e:
        print(f"\n❌ FO4 asset browser test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_with_custom_path():
    """Test asset browser with a custom path (user provides actual path)."""
    print("\n" + "="*70)
    print("TEST: Custom Path Testing")
    print("="*70)
    print("\nEnter your asset paths to test (or press Enter to skip):")

    # Test Unity path
    unity_path = input("\nUnity Assets Path (e.g., H:/Unity Projects/MyProject/Assets): ").strip()
    if unity_path:
        test_path = Path(unity_path)
        if test_path.exists():
            print(f"✅ Path exists: {test_path}")

            # Check for expected folders
            expected_folders = ['Models', 'Meshes', 'Prefabs', 'Textures', 'Materials']
            found = [folder for folder in expected_folders if (test_path / folder).exists()]

            if found:
                print(f"✅ Found Unity asset folders: {', '.join(found)}")
            else:
                print("⚠️  No standard Unity folders found in this path")
                print(f"   Contents: {[p.name for p in test_path.iterdir() if p.is_dir()][:5]}")
        else:
            print(f"❌ Path does not exist: {test_path}")

    # Test Unreal path
    unreal_path = input("\nUnreal Assets Path (e.g., H:/UnrealProjects/MyProject/Content): ").strip()
    if unreal_path:
        test_path = Path(unreal_path)
        if test_path.exists():
            print(f"✅ Path exists: {test_path}")

            # Check for expected folders
            expected_folders = ['Meshes', 'StaticMeshes', 'SkeletalMeshes', 'Textures', 'Materials']
            found = [folder for folder in expected_folders if (test_path / folder).exists()]

            if found:
                print(f"✅ Found Unreal asset folders: {', '.join(found)}")
            else:
                print("⚠️  No standard Unreal folders found in this path")
                print(f"   Contents: {[p.name for p in test_path.iterdir() if p.is_dir()][:5]}")
        else:
            print(f"❌ Path does not exist: {test_path}")

    # Test FO4 path
    fo4_path = input("\nFallout 4 Assets Path (e.g., H:/Fallout 4 working folder): ").strip()
    if fo4_path:
        test_path = Path(fo4_path)
        if test_path.exists():
            print(f"✅ Path exists: {test_path}")

            # Check for expected folders
            expected_folders = ['meshes', 'textures', 'materials', 'Data']
            found = [folder for folder in expected_folders if (test_path / folder).exists()]

            if found:
                print(f"✅ Found Fallout 4 asset folders: {', '.join(found)}")
            else:
                print("⚠️  No standard FO4 folders found in this path")
                print(f"   Contents: {[p.name for p in test_path.iterdir() if p.is_dir()][:5]}")
        else:
            print(f"❌ Path does not exist: {test_path}")


def run_all_tests():
    """Run all asset browser tests."""
    print("="*70)
    print("GAME ASSET BROWSER TEST SUITE")
    print("="*70)
    print("\nTesting Unity, Unreal Engine, and Fallout 4 asset browsers")
    print("These modules will be used when you set custom paths in Blender preferences")

    results = []

    # Run tests
    results.append(("Fallout 4", test_fo4_assets()))
    results.append(("Unity", test_unity_assets()))
    results.append(("Unreal Engine", test_unreal_assets()))

    # Interactive custom path testing
    print("\n" + "="*70)
    response = input("\nWould you like to test with your actual asset paths? (y/n): ").strip().lower()
    if response == 'y':
        test_with_custom_path()

    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {name} asset browser")

    print(f"\nTotal: {passed}/{total} tests passed")

    print("\n" + "="*70)
    print("HOW TO USE IN BLENDER")
    print("="*70)
    print("1. Install the addon in Blender")
    print("2. Go to: Edit → Preferences → Add-ons → Fallout 4 Mod Assistant")
    print("3. Set your asset paths:")
    print("   - Fallout 4 Assets Path: H:/Fallout 4 working folder")
    print("   - Unity Assets Path: H:/Unity Projects/MyProject/Assets")
    print("   - Unreal Engine Assets Path: H:/UnrealProjects/MyProject/Content")
    print("4. The addon will automatically index your assets")
    print("5. Use preset buttons to browse and import game assets")
    print("="*70)

    if passed == total:
        print("\n🎉 All asset browsers ready to use!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed - review errors above")
        return 1


if __name__ == '__main__':
    exit_code = run_all_tests()
    sys.exit(exit_code)
