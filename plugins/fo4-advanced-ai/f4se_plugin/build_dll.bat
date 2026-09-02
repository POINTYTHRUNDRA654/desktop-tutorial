@echo off
setlocal enabledelayedexpansion

REM ════════════════════════════════════════════════════════════════════════════
REM  F4AI_MiscUtil.dll — Build and Deploy
REM  Ctrl+Shift+B in VS Code, or double-click this file.
REM ════════════════════════════════════════════════════════════════════════════

set PROJECT_DIR=D:\Projects\Fallout-4-advanced-AI\f4se_plugin
set BUILD_DIR=%PROJECT_DIR%\build
set DEPLOY_TO=E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries\Data\F4SE\Plugins

REM -- F4SE source path is saved in f4se_src_path.txt after first setup ---------
set CONFIG_FILE=%PROJECT_DIR%\f4se_src_path.txt
set F4SE_SRC=

if exist "%CONFIG_FILE%" (
    set /p F4SE_SRC=<"%CONFIG_FILE%"
)

REM -- Validate saved path (in case it was moved) --------------------------------
if defined F4SE_SRC (
    if not exist "%F4SE_SRC%\f4se\PluginAPI.h" set F4SE_SRC=
)

REM -- First-time setup: prompt for F4SE source ----------------------------------
if not defined F4SE_SRC (
    echo.
    echo  ┌─────────────────────────────────────────────────────────────────┐
    echo  │  FIRST-TIME SETUP: F4SE C++ Source Required                     │
    echo  │                                                                 │
    echo  │  To rebuild the DLL, you need the F4SE source code.            │
    echo  │  This is different from the F4SE runtime you already have.     │
    echo  │                                                                 │
    echo  │  1. Go to:  https://f4se.silverlock.org                        │
    echo  │  2. Download: f4se_0_07_XX_src.7z  (newest 0.7.x version)     │
    echo  │  3. Extract it somewhere, e.g.:  C:\dev\f4se_src               │
    echo  │     (the folder should contain a subfolder called "f4se")      │
    echo  │  4. Come back and run this script again.                       │
    echo  └─────────────────────────────────────────────────────────────────┘
    echo.
    set /p F4SE_SRC=Paste the path to your extracted F4SE source folder:
    REM Strip any surrounding quotes the user may have pasted
    set F4SE_SRC=!F4SE_SRC:"=!
    if not exist "!F4SE_SRC!\f4se\PluginAPI.h" (
        echo.
        echo  ERROR: !F4SE_SRC!\f4se\PluginAPI.h not found.
        echo         Make sure you pointed at the folder that CONTAINS the "f4se" subfolder.
        pause
        exit /b 1
    )
    echo !F4SE_SRC!> "%CONFIG_FILE%"
    echo [F4AI] Path saved to f4se_src_path.txt for future builds.
)

echo [F4AI] F4SE source: %F4SE_SRC%

REM -- Find Visual Studio 2022 ---------------------------------------------------
set VSWHERE="%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist %VSWHERE% (
    echo.
    echo  ERROR: vswhere.exe not found. Visual Studio 2022 does not appear to be installed.
    echo         Install "Desktop development with C++" workload from visualstudio.microsoft.com
    pause
    exit /b 1
)

for /f "usebackq delims=" %%i in (`%VSWHERE% -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set VS_PATH=%%i

if not defined VS_PATH (
    echo  ERROR: Visual Studio with C++ tools not found.
    pause
    exit /b 1
)

call "%VS_PATH%\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
echo [F4AI] MSVC environment ready.

REM -- CMake configure (only needed once, or if cache was deleted) ---------------
if not exist "%BUILD_DIR%\CMakeCache.txt" (
    echo [F4AI] Configuring cmake (first time or cache was cleared)...
    cmake -S "%PROJECT_DIR%" -B "%BUILD_DIR%" -A x64 -DF4SE_SOURCE_DIR="%F4SE_SRC%"
    if errorlevel 1 (
        echo.
        echo  CMake configure FAILED. Check the output above.
        pause
        exit /b 1
    )
)

REM -- Build ---------------------------------------------------------------------
echo [F4AI] Building...
cmake --build "%BUILD_DIR%" --config Release
if errorlevel 1 (
    echo.
    echo  Build FAILED. Check the compiler errors above.
    pause
    exit /b 1
)

REM -- Deploy to MO2 mod ---------------------------------------------------------
set DLL=%BUILD_DIR%\Release\F4AI_MiscUtil.dll
if not exist "%DLL%" (
    echo  ERROR: Expected output not found: %DLL%
    pause
    exit /b 1
)

if not exist "%DEPLOY_TO%" (
    echo  Creating deploy folder...
    mkdir "%DEPLOY_TO%"
)

copy /Y "%DLL%" "%DEPLOY_TO%\F4AI_MiscUtil.dll" >nul
echo [F4AI] Deployed  →  %DEPLOY_TO%\F4AI_MiscUtil.dll
echo.
echo  ✓ Build complete. Launch Fallout 4 via F4SE through MO2.
echo    Check: Documents\My Games\Fallout4\F4SE\f4se.log
echo    Look for: plugin F4AI MiscUtil (00000001 ...) loaded correctly
echo.
pause
