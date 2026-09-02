@echo off
setlocal enabledelayedexpansion
title F4AI - Rebuild Zip from MO2 Installation
color 0A

echo ================================================================
echo   Fallout 4 Advanced AI - Rebuild Zip from MO2
echo   Mossy Industries
echo ================================================================
echo.
echo This script:
echo   1. Finds your existing F4AI mod in MO2 on E:\
echo   2. Copies those files into release_staging\core\
echo   3. Overlays the latest fixes (config, bat files, launcher)
echo   4. Builds a fresh FOMOD zip ready for MO2
echo.

REM ── Find Python ────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ from python.org
    pause & exit /b 1
)

REM ── Find the F4AI mod folder in MO2 on E:\ ───────────────────
echo [1/4] Locating F4AI in MO2...
set F4AI_SRC=

for /d %%M in (
    "E:\Mod.Organizer-2.5.2 Game\mods\Fallout 4 Advanced AI"
    "E:\Mod.Organizer-2.5.2 Game\mods\Fallout4AdvancedAI"
    "E:\Mod.Organizer-2.5.2 Game\mods\F4AI"
    "E:\ModOrganizer\mods\Fallout 4 Advanced AI"
    "E:\MO2\mods\Fallout 4 Advanced AI"
) do (
    if exist "%%M\Data\F4AI\Fallout4_AI_Engine.exe" (
        set F4AI_SRC=%%M
        goto :found_src
    )
)

REM Broader search if above fails
echo [INFO] Scanning E:\Mod.Organizer-2.5.2 Game\mods\ for F4AI...
for /d %%D in ("E:\Mod.Organizer-2.5.2 Game\mods\*") do (
    if exist "%%D\Data\F4AI\Fallout4_AI_Engine.exe" (
        set F4AI_SRC=%%D
        goto :found_src
    )
)

echo [ERROR] Could not find F4AI mod with Fallout4_AI_Engine.exe in MO2.
echo         Please enter the full path to the mod folder
echo         (the one containing Data\F4AI\Fallout4_AI_Engine.exe):
set /p F4AI_SRC="F4AI mod path: "
if not exist "!F4AI_SRC!\Data\F4AI\Fallout4_AI_Engine.exe" (
    echo [ERROR] Fallout4_AI_Engine.exe not found at that path. Exiting.
    pause & exit /b 1
)

:found_src
echo [OK] Found: !F4AI_SRC!
echo.

REM ── Set up staging directory ───────────────────────────────────
echo [2/4] Staging files from MO2 installation...
set STAGING=release_staging\core

if exist "%STAGING%" (
    rmdir /s /q "%STAGING%"
)
mkdir "%STAGING%"

REM Copy everything from the existing MO2 mod
xcopy /E /I /Y "!F4AI_SRC!\*" "%STAGING%\" >nul 2>&1
echo [OK] Copied existing mod files to staging.

REM ── Overlay updated files ──────────────────────────────────────
echo [3/4] Applying latest fixes...

REM Updated config (Mossy enabled, longer timeout)
copy /Y "src\config.json"                                               "%STAGING%\Data\F4AI\config.json" >nul
echo [OK] config.json  (enable_mossy_bridge=1, timeout=5s)

REM Fixed MOSSY_LAUNCH.bat (retry loop, non-blocking, correct errorlevel check)
copy /Y "packaging\nexus\core-template\Data\F4AI\MOSSY_LAUNCH.bat"     "%STAGING%\Data\F4AI\MOSSY_LAUNCH.bat" >nul
echo [OK] MOSSY_LAUNCH.bat  (fixed Mossy detection + no blocking pause)

REM Fixed MOSSY_CHECK.bat (escaped JSON quotes in curl)
copy /Y "packaging\nexus\core-template\Data\F4AI\MOSSY_CHECK.bat"      "%STAGING%\Data\F4AI\MOSSY_CHECK.bat" >nul
echo [OK] MOSSY_CHECK.bat  (fixed curl JSON escaping)

REM Excel launcher (links to MOSSY_LAUNCH.bat)
copy /Y "packaging\nexus\core-template\Data\F4AI\F4AI_Launcher.xlsx"   "%STAGING%\Data\F4AI\F4AI_Launcher.xlsx" >nul
echo [OK] F4AI_Launcher.xlsx  (one-click launcher)

REM FOMOD files
xcopy /E /I /Y "packaging\nexus\fomod\*" "%STAGING%\..\fomod\" >nul 2>&1

echo.

REM ── Build the zip ──────────────────────────────────────────────
echo [4/4] Building FOMOD zip...
echo.
python tools\build_nexus_release.py --channel alpha
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed. Check errors above.
    pause & exit /b 1
)

echo.
echo ================================================================
echo   BUILD COMPLETE
echo ================================================================
echo.

for /f "delims=" %%Z in ('dir /b /s "dist\nexus\*.zip" 2^>nul') do (
    echo [ZIP]  %%Z
    for %%S in ("%%Z") do echo [SIZE] %%~zS bytes
)

echo.
echo HOW TO INSTALL IN MO2:
echo   1. In MO2 click the install-from-archive button (top left)
echo   2. Browse to the zip shown above
echo   3. Follow the FOMOD installer steps
echo   4. Disable the old F4AI mod entry in MO2
echo   5. Enable the new one
echo   6. Click MOSSY_LAUNCH.bat or open F4AI_Launcher.xlsx to start
echo.
pause
