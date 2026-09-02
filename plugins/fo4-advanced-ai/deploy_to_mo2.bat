@echo off
setlocal enabledelayedexpansion
title F4AI - Deploy Compiled Scripts to MO2 + Game

REM ── Set this to your MO2 mod folder ──────────────────────────────────────────
set MO2_MOD_DIR=E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries

REM ── Set this to your Fallout 4 Data folder ────────────────────────────────────
REM (Used to deploy scripts directly, bypassing MO2 USVFS for loose pex files)
set FO4_DATA=E:\Steam\steamapps\common\Fallout 4\Data

set SCRIPT_DIR=%~dp0
set SOURCE_PEX=%SCRIPT_DIR%compiled_pex
set DEST_SCRIPTS=%MO2_MOD_DIR%\Scripts
set DEST_GAME_SCRIPTS=%FO4_DATA%\Scripts

echo [F4AI] Deploying compiled scripts...
echo [F4AI] MO2 mod  : %MO2_MOD_DIR%
echo [F4AI] Game Data: %FO4_DATA%
echo.

if not exist "%SOURCE_PEX%" (
    echo [ERROR] compiled_pex\ folder not found.
    echo         Run compile_papyrus.bat first.
    pause
    exit /b 1
)

REM ── 1. Deploy to MO2 mod folder (for proper mod management) ──────────────────
echo [F4AI] -- MO2 mod folder --
if not exist "%DEST_SCRIPTS%" mkdir "%DEST_SCRIPTS%"
if not exist "%DEST_SCRIPTS%\F4AI" mkdir "%DEST_SCRIPTS%\F4AI"

set COUNT=0
for %%F in ("%SOURCE_PEX%\F4AI\*.pex") do (
    copy /Y "%%F" "%DEST_SCRIPTS%\F4AI\" >nul
    echo Copied to MO2: F4AI\%%~nxF
    set /a COUNT+=1
)
for %%F in ("%SOURCE_PEX%\*.pex") do (
    copy /Y "%%F" "%DEST_SCRIPTS%\" >nul
    echo Copied to MO2: %%~nxF
    set /a COUNT+=1
)

REM ── 2. Deploy to base game Data\Scripts\ (bypasses MO2 USVFS) ────────────────
REM MO2's USVFS does not reliably serve loose pex files in subdirectories.
REM Copying directly to the game folder ensures the Papyrus VM can find them.
echo.
echo [F4AI] -- Base game Data\Scripts\ (direct install) --
if not exist "%DEST_GAME_SCRIPTS%\F4AI" mkdir "%DEST_GAME_SCRIPTS%\F4AI"

set GAME_COUNT=0
for %%F in ("%SOURCE_PEX%\F4AI\*.pex") do (
    copy /Y "%%F" "%DEST_GAME_SCRIPTS%\F4AI\" >nul
    echo Copied to game: F4AI\%%~nxF
    set /a GAME_COUNT+=1
)
REM Stubs (MiscUtil.pex, StringUtil.pex) go to top-level Scripts\, not F4AI\
for %%F in ("%SOURCE_PEX%\*.pex") do (
    copy /Y "%%F" "%DEST_GAME_SCRIPTS%\" >nul
    echo Copied to game: %%~nxF
    set /a GAME_COUNT+=1
)

REM ── 3. Deploy F4AI_MiscUtil.dll to F4SE\Plugins ───────────────────────────────
echo.
echo [F4AI] -- F4SE Plugin DLL --
set DEST_F4SE=%MO2_MOD_DIR%\Data\F4SE\Plugins
if not exist "%DEST_F4SE%" mkdir "%DEST_F4SE%"
set DEST_GAME_F4SE=%FO4_DATA%\F4SE\Plugins
if not exist "%DEST_GAME_F4SE%" mkdir "%DEST_GAME_F4SE%"

set DLL_SRC=%SCRIPT_DIR%f4se_plugin\build\Release\F4AI_MiscUtil.dll
if exist "%DLL_SRC%" (
    copy /Y "%DLL_SRC%" "%DEST_F4SE%\" >nul
    copy /Y "%DLL_SRC%" "%DEST_GAME_F4SE%\" >nul
    echo Copied: F4AI_MiscUtil.dll ^> MO2 + game F4SE\Plugins\
) else (
    echo [WARNING] F4AI_MiscUtil.dll not found at: %DLL_SRC%
    echo           See f4se_plugin\BUILD_INSTRUCTIONS.txt to compile it.
)

REM ── 4. Deploy Hydra ScriptObjects JSON ────────────────────────────────────────
set DEST_HYDRA=%MO2_MOD_DIR%\Data\Hydra\ScriptObjects
if not exist "%DEST_HYDRA%" mkdir "%DEST_HYDRA%"
if exist "%SCRIPT_DIR%Data\Hydra\ScriptObjects\F4AI_Monitors.json" (
    copy /Y "%SCRIPT_DIR%Data\Hydra\ScriptObjects\F4AI_Monitors.json" "%DEST_HYDRA%\" >nul
    echo Copied: F4AI_Monitors.json ^> MO2 Hydra\ScriptObjects\
)

echo.
echo [F4AI] Done.
echo [F4AI] MO2 mod folder : !COUNT! .pex deployed
echo [F4AI] Base game folder: !GAME_COUNT! .pex deployed (direct, bypasses USVFS)
echo [F4AI] Refresh MO2 (F5), then launch through MO2 to test.
echo.
pause
