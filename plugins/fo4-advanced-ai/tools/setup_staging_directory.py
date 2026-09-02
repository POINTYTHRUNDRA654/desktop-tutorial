#!/usr/bin/env python3
"""Set up release_staging/core directory structure with templates and instructions.

Part of Mossy Industries - Advancing AI in Gaming
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path


STAGING_STRUCTURE = {
    "Data": {
        "Scripts": {
            "_README.txt": """\
Place compiled Papyrus scripts here (.pex files):
- F4AI_QueueManager.pex
- F4AI_FeedbackMonitor.pex
- F4AI_PushToTalkTrigger.pex
- F4AI_VisionWidgetManager.pex
- F4AI_InterNpcManager.pex

To compile from source:
1. Open Creation Kit
2. Go to Gameplay > Papyrus Script Manager
3. For each .psc file in papyrus/ folder:
   - Click "New Script"
   - Enter script name (without .psc extension)
   - Compile
   - Copy resulting .pex file here
""",
        },
        "F4AI": {
            "_README.txt": """\
Place runtime files here:
- Fallout4_AI_Engine.exe (build with: python tools/build_engine_executable.py)
- piper.exe (download from: https://github.com/rhasspy/piper/releases/)
- en_US-lessac-medium.onnx (download from Piper)
- en_US-lessac-medium.onnx.json (download from Piper)

IMPORTANT: Piper TTS executable (piper.exe) must be bundled for one-click installation.
Download the Windows binary (piper_windows_amd64.zip) from the Piper releases page.

Voice model download:
https://github.com/rhasspy/piper/releases/

Look for "en_US-lessac-medium" voice model and download both files.

config.json, Launch_F4AI_Bridge.bat, and user docs are provided
by packaging/nexus/core-template and will be merged during build.
""",
        },
        "_README.txt": """\
Place F4AI_Core.esp plugin file directly in this Data/ folder.

To create the plugin:
1. Open Creation Kit
2. Create new plugin: F4AI_Core.esp
3. Add required forms/scripts
4. Save plugin
5. Copy F4AI_Core.esp here
""",
    }
}


def create_structure(base_path: Path, structure: dict) -> None:
    """Recursively create directory structure with README files."""
    for name, content in structure.items():
        target = base_path / name
        if isinstance(content, dict):
            target.mkdir(parents=True, exist_ok=True)
            create_structure(target, content)
        else:
            target.write_text(content, encoding="utf-8")


def copy_core_template(repo_root: Path) -> None:
    """Copy config.json and other templates from packaging/nexus/core-template."""
    template_src = repo_root / "packaging/nexus/core-template/Data/F4AI"
    staging_target = repo_root / "release_staging/core/Data/F4AI"

    if not template_src.exists():
        print(f"[setup-staging] ⚠️ Template directory not found: {template_src}")
        return

    staging_target.mkdir(parents=True, exist_ok=True)

    # Copy template files (these will be in the final package)
    template_files = ["config.json", "Launch_F4AI_Bridge.bat", "FIRST_RUN.txt", "NEXUS_TROUBLESHOOTING.txt"]

    for filename in template_files:
        src_file = template_src / filename
        if src_file.exists():
            dest_file = staging_target / filename
            shutil.copy2(src_file, dest_file)
            print(f"[setup-staging] ✅ Copied template: {filename}")
        else:
            print(f"[setup-staging] ⚠️ Template not found: {filename}")


def check_missing_files(repo_root: Path) -> list[str]:
    """Check which required files are still missing."""
    staging_root = repo_root / "release_staging/core"

    required = [
        "Data/F4AI_Core.esp",
        "Data/Scripts/F4AI_QueueManager.pex",
        "Data/Scripts/F4AI_FeedbackMonitor.pex",
        "Data/Scripts/F4AI_PushToTalkTrigger.pex",
        "Data/Scripts/F4AI_VisionWidgetManager.pex",
        "Data/Scripts/F4AI_InterNpcManager.pex",
        "Data/F4AI/Fallout4_AI_Engine.exe",
        "Data/F4AI/piper.exe",
        "Data/F4AI/en_US-lessac-medium.onnx",
        "Data/F4AI/en_US-lessac-medium.onnx.json",
    ]

    missing = []
    for file_path in required:
        if not (staging_root / file_path).exists():
            missing.append(file_path)

    return missing


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    staging_core = repo_root / "release_staging/core"

    print("[setup-staging] Release Staging Directory Setup")
    print("=" * 60)

    # Check if directory already exists
    if staging_core.exists():
        print(f"[setup-staging] ⚠️ Directory already exists: {staging_core}")
        response = input("[setup-staging] Recreate structure? (y/n): ").strip().lower()
        if response != "y":
            print("[setup-staging] Aborted.")
            return 0

    # Create directory structure
    print(f"[setup-staging] Creating directory structure in: {staging_core}")
    create_structure(staging_core, STAGING_STRUCTURE)
    print("[setup-staging] ✅ Directory structure created")

    # Copy template files
    print("[setup-staging] Copying template files...")
    copy_core_template(repo_root)

    # Check what's missing
    print("\n" + "=" * 60)
    missing = check_missing_files(repo_root)

    if missing:
        print("[setup-staging] 📋 Required files still needed:")
        print()

        # Group by type
        scripts = [f for f in missing if f.endswith(".pex")]
        plugin = [f for f in missing if f.endswith(".esp")]
        executable = [f for f in missing if f.endswith(".exe") and "Fallout4_AI_Engine" in f]
        piper = [f for f in missing if f.endswith(".exe") and "piper" in f]
        voice = [f for f in missing if ".onnx" in f]

        if plugin:
            print("  🔧 PLUGIN FILE:")
            for f in plugin:
                print(f"     - {f}")
            print("     → Create in Creation Kit and copy to release_staging/core/Data/")
            print()

        if scripts:
            print("  📜 PAPYRUS SCRIPTS:")
            for f in scripts:
                print(f"     - {f}")
            print("     → Compile .psc files from papyrus/ folder using Creation Kit")
            print()

        if executable:
            print("  ⚙️ PYTHON EXECUTABLE:")
            for f in executable:
                print(f"     - {f}")
            print("     → Run: python tools/build_engine_executable.py")
            print()

        if piper:
            print("  🔊 PIPER TTS EXECUTABLE:")
            for f in piper:
                print(f"     - {f}")
            print("     → Download from: https://github.com/rhasspy/piper/releases/")
            print("     → Extract piper.exe from piper_windows_amd64.zip")
            print("     → REQUIRED for one-click installation!")
            print()

        if voice:
            print("  🎤 VOICE MODELS:")
            for f in voice:
                print(f"     - {f}")
            print("     → Download from: https://github.com/rhasspy/piper/releases/")
            print("     → Look for 'en_US-lessac-medium' model")
            print()
    else:
        print("[setup-staging] ✅ All required files are present!")
        print("[setup-staging] Ready to build release package.")

    print("=" * 60)
    print("[setup-staging] Next steps:")
    print("  1. Compile Papyrus scripts in Creation Kit")
    print("  2. Create F4AI_Core.esp plugin")
    print("  3. Run: python tools/build_engine_executable.py")
    print("  4. Download and place voice models")
    print("  5. Run: python tools/build_nexus_release.py --channel alpha")
    print()
    print("[setup-staging] Check _README.txt files in each directory for detailed instructions.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
