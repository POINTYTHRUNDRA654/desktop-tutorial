#!/usr/bin/env python3
"""Build a MO2-droppable test zip for bridge + Mossy testing.

This is NOT the Nexus release build. It:
  - Compiles Fallout4_AI_Engine.exe automatically and bundles it in the zip
  - Ships with Mossy bridge ENABLED by default
  - Uses --console mode so you can see bridge output while testing
  - Skips missing optional files (koboldcpp, piper, model)
  - Produces a flat Data/ zip — no FOMOD, drag-and-drop straight into MO2
  - Writes all persistent data to Data/F4AI/NPC_Memories/ at runtime

Usage:
    python tools/build_test_package.py
    python tools/build_test_package.py --version 0.1.0-test
    python tools/build_test_package.py --skip-exe-build   (if exe already exists)
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
CORE_TEMPLATE = REPO_ROOT / "packaging" / "nexus" / "core-template" / "Data" / "F4AI"
EXE_BUILD_OUTPUT = REPO_ROOT / "build_output" / "Fallout4_AI_Engine.exe"

PASSTHROUGH_FILES = [
    "ABOUT_MOSSY_INDUSTRIES.txt",
    "CREDITS.txt",
    "FIRST_RUN.txt",
    "Launch_F4AI_Bridge.bat",
    "NEXUS_TROUBLESHOOTING.txt",
    "README.txt",
]

TEST_CONFIG: dict = {
    "use_bundled_model": 0,
    "ai_temperature": 0.7,
    "enable_memory": 1,
    "speech_speed": 1.0,
    "use_external_model": 0,
    "external_kobold_endpoint": "http://localhost:5001",
    "enable_mossy_bridge": 0,
    "mossy_endpoint": "http://127.0.0.1:8787/v1/chat",
    "mossy_timeout": 5.0,
    "enable_plugin_hooks": 0,
    "plugin_endpoints": [],
    "plugin_timeout": 3.0,
    "disable_auto_update": 1,
}

MOSSY_CHECK_BAT = """\
@echo off
echo [F4AI] KoboldCPP Connection Test
echo [F4AI] Endpoint: http://127.0.0.1:5001
echo.
curl -s --connect-timeout 4 "http://127.0.0.1:5001/api/v1/info" 2>nul
if "%ERRORLEVEL%"=="0" (
    echo.
    echo.
    echo [F4AI] SUCCESS - Mossy responded. Check output above for NPC text.
) else (
    echo [F4AI] FAILED  - Mossy did not respond. Is it running?
)
echo.
echo Status file: %~dp0bridge_status.json
echo.
pause
"""

MOSSY_LAUNCH_BAT = """\
@echo off
setlocal
cd /d "%~dp0"

echo [F4AI] Fallout 4 Advanced AI - Local GPU Mode (Nvidia CUDA)
echo [F4AI] LLM backend : KoboldCPP (port 5001)
echo [F4AI] Memory      : %~dp0NPC_Memories
echo.

REM Step 1 - Start KoboldCPP if not already running
tasklist /FI "IMAGENAME eq koboldcpp.exe" 2>nul | find /I "koboldcpp.exe" >nul
if "%ERRORLEVEL%"=="0" (
    echo [F4AI] KoboldCPP already running.
    goto :start_bridge
)

if not exist "runtime\\koboldcpp.exe" (
    echo [F4AI] ERROR: runtime\\koboldcpp.exe not found.
    echo [F4AI] Download the Nvidia CUDA build of KoboldCPP and place it in:
    echo [F4AI]   %~dp0runtime\\koboldcpp.exe
    echo [F4AI] Then place your model in:
    echo [F4AI]   %~dp0models\\tinyllama-1.1b-chat.gguf
    pause
    exit /b 1
)

if not exist "models\\tinyllama-1.1b-chat.gguf" (
    echo [F4AI] ERROR: models\\tinyllama-1.1b-chat.gguf not found.
    echo [F4AI] Download a GGUF model and place it at:
    echo [F4AI]   %~dp0models\\tinyllama-1.1b-chat.gguf
    pause
    exit /b 1
)

echo [F4AI] Starting KoboldCPP with Nvidia CUDA acceleration...
start /B runtime\\koboldcpp.exe ^
    --model models\\tinyllama-1.1b-chat.gguf ^
    --port 5001 ^
    --usecublas ^
    --contextsize 2048 ^
    --threads 4 ^
    --quiet ^
    >nul 2>&1

echo [F4AI] Waiting for KoboldCPP to load model...
timeout /t 10 /nobreak >nul

curl -s --connect-timeout 3 "http://127.0.0.1:5001/api/v1/info" >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo [F4AI] KoboldCPP is ONLINE.
) else (
    echo [F4AI] KoboldCPP may still be loading. Continuing anyway...
)

:start_bridge
echo.
echo [F4AI] Starting AI bridge engine...
start "" "Fallout4_AI_Engine.exe"
echo [F4AI] All systems go. Launch Fallout 4 via MO2 now.
timeout /t 3 /nobreak >nul
exit
"""

TEST_BUILD_NOTES = """\
F4AI MOSSY TEST BUILD
=====================
This is a private test package. NOT for public release.

WHAT IS INCLUDED
  Fallout4_AI_Engine.exe   compiled bridge engine (console window visible for testing)
  config.json              Mossy bridge pre-enabled, auto-update disabled
  MOSSY_LAUNCH.bat         use this to start the bridge (skips local koboldcpp)
  standard support files

WHAT IS NOT INCLUDED (not needed for bridge testing)
  F4AI_Core.esp            needs Creation Kit
  Data/Scripts/*.pex       needs Papyrus compiler
  runtime/koboldcpp.exe    not used in Mossy mode
  piper.exe / model        TTS skipped when bridge handles response

MEMORY STORAGE (all automatic, no setup needed)
  Data/F4AI/NPC_Memories/           per-NPC dialogue history
  Data/F4AI/NPC_Memories/Training_Cache/  DPO training records
  Data/F4AI/NPC_Memories/Adapters/  LoRA adapters
  tools/modlist_db.json             modlist intelligence database
  MO2 overwrite stays clean.

HOW TO INSTALL
  1. Drag this zip onto the MO2 mod list
  2. Enable the mod
  3. Run Data/F4AI/MOSSY_LAUNCH.bat before launching Fallout 4
  4. Launch Fallout 4 through MO2

MOSSY BRIDGE
  Endpoint : http://127.0.0.1:8765/f4ai/bridge
  Timeout  : 5.0 seconds
  Fallback : [Cognitive Matrix Offline] if Mossy is unreachable
"""


# ──────────────────────────────────────────────────────────────────────────────
# Engine build
# ──────────────────────────────────────────────────────────────────────────────

def ensure_pyinstaller() -> bool:
    try:
        import PyInstaller  # noqa: F401
        return True
    except ImportError:
        pass
    print("[test-build] PyInstaller not found — installing...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "pyinstaller"],
        capture_output=True,
    )
    if result.returncode != 0:
        print("[test-build] ERROR: Failed to install PyInstaller.")
        print(result.stderr.decode(errors="replace"))
        return False
    print("[test-build] PyInstaller installed.")
    return True


def build_engine_exe() -> Path | None:
    """Compile src/main.py into Fallout4_AI_Engine.exe with a visible console window."""
    src_main = REPO_ROOT / "src" / "main.py"
    if not src_main.exists():
        print(f"[test-build] ERROR: {src_main} not found.")
        return None

    dist_dir = REPO_ROOT / "build_output"
    work_dir = REPO_ROOT / "build_temp"

    for d in (dist_dir, work_dir):
        if d.exists():
            shutil.rmtree(d)

    print("[test-build] Compiling Fallout4_AI_Engine.exe (console mode for testing)...")

    # Exclude heavy ML/vision libraries that main.py does not use.
    # These get dragged in from the global Python environment otherwise.
    _exclude = [
        "torch", "torchvision", "torchaudio",
        "transformers", "tokenizers", "huggingface_hub",
        "sklearn", "skimage",
        "tensorflow", "keras",
        "cv2", "PIL",
        "matplotlib", "pandas",
        "numba", "llvmlite",
        "sympy", "IPython",
        "notebook", "jupyter",
        "unsloth", "peft", "trl", "datasets",
        "accelerate", "bitsandbytes",
        "av", "soundfile", "librosa",
        "pyaudio", "sounddevice",
    ]
    exclude_flags: list[str] = []
    for mod in _exclude:
        exclude_flags += ["--exclude-module", mod]

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--console",                          # visible window so you can watch bridge output
        "--name", "Fallout4_AI_Engine",
        "--hidden-import", "tts",
        "--hidden-import", "scipy.io.wavfile",
        "--distpath", str(dist_dir),
        "--workpath", str(work_dir),
        "--specpath", str(work_dir),
        "--clean",
        *exclude_flags,
        str(src_main),
    ]

    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("[test-build] ERROR: PyInstaller build failed.")
        return None

    exe = dist_dir / "Fallout4_AI_Engine.exe"
    if not exe.exists():
        print("[test-build] ERROR: Build finished but exe not found.")
        return None

    size_mb = exe.stat().st_size / (1024 * 1024)
    print(f"[test-build] Engine built: {exe.name}  ({size_mb:.1f} MB)")
    return exe


# ──────────────────────────────────────────────────────────────────────────────
# Zip assembly
# ──────────────────────────────────────────────────────────────────────────────

FOMOD_INFO_XML = """\
<?xml version="1.0" encoding="UTF-8"?>
<fomod>
  <Name>Fallout 4 Advanced AI - Mossy Industries</Name>
  <Author>POINTYTHRUNDRA654 / Mossy Industries</Author>
  <Version>{version}</Version>
  <Description>Mossy Industries AI bridge — test build. Drag into MO2 and install.</Description>
</fomod>
"""

FOMOD_MODULE_XML = """\
<?xml version="1.0" encoding="UTF-8"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">
  <moduleName>Fallout 4 Advanced AI - Mossy Test Build</moduleName>
  <installSteps order="Explicit">
    <installStep name="Install">
      <optionalFileGroups order="Explicit">
        <group name="Core" type="SelectExactlyOne">
          <plugins>
            <plugin name="Install Mossy AI Bridge">
              <description>Installs Fallout4_AI_Engine.exe, Mossy launch scripts, and pre-configured config.json into Data/F4AI/.</description>
              <files>
                <folder source="00 Core" destination="" priority="0" />
              </files>
              <typeDescriptor><type name="Recommended" /></typeDescriptor>
            </plugin>
          </plugins>
        </group>
      </optionalFileGroups>
    </installStep>
  </installSteps>
</config>
"""


def build_test_zip(version: str, output_dir: Path, exe_path: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    zip_path = output_dir / f"F4AI_MossyTest_v{version}.zip"

    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:

        def add_text(arcname: str, content: str) -> None:
            zf.writestr(arcname, content.encode("utf-8"))

        # FOMOD installer — tells MO2 exactly where everything goes
        add_text("fomod/info.xml", FOMOD_INFO_XML.format(version=version))
        add_text("fomod/ModuleConfig.xml", FOMOD_MODULE_XML)

        # All game files go under "00 Core" — FOMOD maps this to Data/
        core = "00 Core/Data/F4AI"

        # Compiled engine
        print(f"[test-build] Bundling {exe_path.name}  ({exe_path.stat().st_size // (1024*1024)} MB)...")
        zf.write(exe_path, f"{core}/Fallout4_AI_Engine.exe")

        # Pass-through support files
        for filename in PASSTHROUGH_FILES:
            src = CORE_TEMPLATE / filename
            if src.exists():
                zf.write(src, f"{core}/{filename}")

        # Generated files
        add_text(f"{core}/config.json", json.dumps(TEST_CONFIG, indent=2))
        add_text(f"{core}/MOSSY_LAUNCH.bat", MOSSY_LAUNCH_BAT)
        add_text(f"{core}/MOSSY_CHECK.bat", MOSSY_CHECK_BAT)
        add_text(f"{core}/TEST_BUILD_NOTES.txt", TEST_BUILD_NOTES)

    return zip_path


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def read_version(override: str | None) -> str:
    if override:
        return override
    v_file = REPO_ROOT / "VERSION"
    if v_file.exists():
        v = v_file.read_text(encoding="utf-8").strip()
        if v:
            return f"{v}-test"
    return "0.1.0-test"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build MO2 test zip for Mossy bridge testing.")
    parser.add_argument("--version", help="Override version string")
    parser.add_argument("--output-dir", default="dist/test")
    parser.add_argument(
        "--skip-exe-build",
        action="store_true",
        help="Skip PyInstaller compile and use existing build_output/Fallout4_AI_Engine.exe",
    )
    args = parser.parse_args()

    version = read_version(args.version)
    output_dir = (REPO_ROOT / args.output_dir).resolve()

    print(f"[test-build] ========================================")
    print(f"[test-build] F4AI Mossy Test Package Builder")
    print(f"[test-build] Version : {version}")
    print(f"[test-build] Output  : {output_dir}")
    print(f"[test-build] ========================================")
    print()

    # Step 1 — build or locate exe
    if args.skip_exe_build:
        if not EXE_BUILD_OUTPUT.exists():
            print(f"[test-build] ERROR: --skip-exe-build set but {EXE_BUILD_OUTPUT} not found.")
            print("[test-build] Run without --skip-exe-build to compile it first.")
            return 1
        exe_path = EXE_BUILD_OUTPUT
        print(f"[test-build] Using existing exe: {exe_path.name}  ({exe_path.stat().st_size // (1024*1024)} MB)")
    else:
        if not ensure_pyinstaller():
            return 1
        exe_path = build_engine_exe()
        if not exe_path:
            return 1

    print()

    # Step 2 — assemble zip
    zip_path = build_test_zip(version, output_dir, exe_path)
    size_mb = zip_path.stat().st_size / (1024 * 1024)

    print()
    print(f"[test-build] ========================================")
    print(f"[test-build] Done: {zip_path.name}  ({size_mb:.1f} MB)")
    print(f"[test-build] ========================================")
    print()
    print("  1. Drag zip onto MO2 mod list")
    print("  2. Enable the mod")
    print("  3. Run Data/F4AI/MOSSY_LAUNCH.bat before launching Fallout 4")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
