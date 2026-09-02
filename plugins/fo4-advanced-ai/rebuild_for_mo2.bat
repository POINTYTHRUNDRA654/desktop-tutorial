@echo off
setlocal enabledelayedexpansion
title F4AI - Rebuild for MO2
color 0A

echo ================================================================
echo   Fallout 4 Advanced AI - Rebuild for MO2
echo   Mossy Industries
echo ================================================================
echo.
echo This will:
echo   1. Compile src\main.py  ^> Fallout4_AI_Engine.exe
echo   2. Sync config.json to staging
echo   3. Build the FOMOD zip  ^> dist\nexus\
echo.
echo Requires: Python 3.10+, PyInstaller (auto-installed if missing)
echo Requires: release_staging\core\ with runtime files already present
echo           (koboldcpp, model, piper - from a previous build)
echo.

REM ── Check Python ──────��──────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH.
    echo         Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [OK] %%v

REM ── Check staging directory exists ───��───────────────────────────
if not exist "release_staging\core\Data\F4AI\" (
    echo.
    echo [ERROR] release_staging\core\Data\F4AI\ not found.
    echo.
    echo  You need to set up the staging directory first.
    echo  Run setup_staging.bat, then copy the following into
    echo  release_staging\core\Data\F4AI\:
    echo    - runtime\koboldcpp.exe
    echo    - models\tinyllama-1.1b-chat.gguf
    echo    - piper.exe + voice model .onnx files
    echo.
    echo  Once staged, run this script again.
    pause
    exit /b 1
)
echo [OK] Staging directory found

echo.
echo ================================================================
echo  STEP 1: Compile Fallout4_AI_Engine.exe
echo ================================================================
echo.

python tools\build_engine_executable.py
if errorlevel 1 (
    echo.
    echo [ERROR] Exe build failed. Check errors above.
    echo         Common fix: pip install pyinstaller requests faster-whisper
    pause
    exit /b 1
)
echo.
echo [OK] Exe built and copied to staging.

echo.
echo ================================================================
echo  STEP 2: Sync config.json to staging
echo ================================================================
echo.

copy /Y "src\config.json" "release_staging\core\Data\F4AI\config.json"
if errorlevel 1 (
    echo [WARN] Could not auto-copy config.json - copying manually...
    python -c "import shutil; shutil.copy2('src/config.json', 'release_staging/core/Data/F4AI/config.json')"
)

REM Also keep packaging template in sync
copy /Y "src\config.json" "packaging\nexus\core-template\Data\F4AI\config.json" >nul 2>&1

echo [OK] config.json synced to staging.

REM Show what Mossy bridge is set to
python -c "import json; c=json.load(open('src/config.json')); print('[INFO] enable_mossy_bridge =', c.get('enable_mossy_bridge', '?'), '| mossy_timeout =', c.get('mossy_timeout', '?'), 's')"

echo.
echo ================================================================
echo  STEP 3: Build FOMOD release zip
echo ================================================================
echo.

python tools\build_nexus_release.py --channel alpha
if errorlevel 1 (
    echo.
    echo [ERROR] Release build failed. Check errors above.
    echo         Make sure all required files are in release_staging\core\
    echo         See REQUIRED_CORE_FILES in tools\build_nexus_release.py
    pause
    exit /b 1
)

echo.
echo ================================================================
echo  BUILD COMPLETE
echo ================================================================
echo.

REM Find and display the output zip
for /f "delims=" %%z in ('dir /b /s "dist\nexus\*.zip" 2^>nul') do (
    echo [ZIP] %%z
    for %%s in ("%%z") do echo [SIZE] %%~zs bytes
)

echo.
echo To install in MO2:
echo   1. Open Mod Organizer 2
echo   2. Click the install-from-file icon (top-left)
echo   3. Browse to the zip shown above
echo   4. Follow the FOMOD installer
echo   5. Disable / delete the old F4AI mod entry
echo   6. Enable the new one
echo.
pause
