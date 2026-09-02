@echo off
setlocal enabledelayedexpansion
title F4AI - Quick Config Patch for MO2
color 0B

echo ================================================================
echo   Fallout 4 Advanced AI - Quick Config Patch
echo   Updates config.json only (no exe rebuild needed)
echo ================================================================
echo.

REM ── Try to find the MO2 mods directory automatically ─────────────
set MO2_MOD_PATH=

REM Common MO2 install locations
for %%D in (
    "%LOCALAPPDATA%\ModOrganizer\Fallout 4\mods"
    "%PROGRAMFILES%\ModOrganizer\mods"
    "%PROGRAMFILES(X86)%\ModOrganizer\mods"
    "C:\ModOrganizer\mods"
    "C:\MO2\mods"
    "D:\ModOrganizer\mods"
    "D:\MO2\mods"
    "D:\Games\ModOrganizer\mods"
    "D:\Games\MO2\mods"
    "E:\ModOrganizer\mods"
    "E:\MO2\mods"
    "E:\Games\ModOrganizer\mods"
    "E:\Mod.Organizer-2.5.2 Game Mods"
    "E:\Games\MO2\mods"
) do (
    if exist %%D (
        set MO2_MOD_PATH=%%~D
        goto :found_mo2
    )
)

echo [WARN] Could not auto-detect MO2 mods directory.
echo        Please enter the path manually (or press Enter to skip):
set /p MO2_MOD_PATH="MO2 mods path: "
set MO2_MOD_PATH=!MO2_MOD_PATH:"=!
if "!MO2_MOD_PATH!"=="" goto :no_mo2

:found_mo2
echo [OK] MO2 mods directory: !MO2_MOD_PATH!
echo.

REM ── Find the F4AI mod folder inside MO2 mods ─────────────────────
set F4AI_INSTALL=
for /d %%F in ("!MO2_MOD_PATH!\*F4AI*" "!MO2_MOD_PATH!\*Fallout4_AI*" "!MO2_MOD_PATH!\*Fallout 4 Advanced*") do (
    if exist "%%F\Data\F4AI\config.json" (
        set F4AI_INSTALL=%%F
        goto :found_f4ai
    )
)

echo [WARN] Could not find F4AI mod folder inside MO2 mods.
echo        Checked: !MO2_MOD_PATH!
echo.
echo        Enter the full path to your F4AI mod folder
echo        (the one that contains Data\F4AI\config.json):
set /p F4AI_INSTALL="F4AI mod path: "
set F4AI_INSTALL=!F4AI_INSTALL:"=!
if "!F4AI_INSTALL!"=="" goto :no_mo2

:found_f4ai
echo [OK] F4AI mod folder: !F4AI_INSTALL!
echo.

REM ── Show current vs new config ────────────────────────────────────
echo Current config.json in MO2:
python -c "import json; c=json.load(open('!F4AI_INSTALL!\\Data\\F4AI\\config.json')); print('  enable_mossy_bridge =', c.get('enable_mossy_bridge','?')); print('  mossy_timeout =', c.get('mossy_timeout','?')); print('  mossy_endpoint =', c.get('mossy_endpoint','?'))" 2>nul || echo   (could not read)

echo.
echo New config.json (src\config.json):
python -c "import json; c=json.load(open('src\\config.json')); print('  enable_mossy_bridge =', c.get('enable_mossy_bridge','?')); print('  mossy_timeout =', c.get('mossy_timeout','?')); print('  mossy_endpoint =', c.get('mossy_endpoint','?'))"

echo.
set /p CONFIRM="Apply patch? (y/n): "
if /i "!CONFIRM!" neq "y" (
    echo Cancelled.
    pause
    exit /b 0
)

REM ── Apply patch ───────────────────────────────────────────────────
copy /Y "src\config.json" "!F4AI_INSTALL!\Data\F4AI\config.json"
if errorlevel 1 (
    echo [ERROR] Copy failed. Check permissions or path.
    pause
    exit /b 1
)

echo.
echo [OK] config.json patched in MO2 install.
echo     No reinstall needed - change takes effect next game launch.
echo.
pause
exit /b 0

:no_mo2
echo.
echo Skipping auto-patch. To apply manually:
echo   Copy src\config.json
echo   Paste to: ^<MO2 mods^>\^<F4AI mod folder^>\Data\F4AI\config.json
echo.
pause
