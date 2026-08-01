@echo off
setlocal enabledelayedexpansion
title F4AI - Compile Papyrus Scripts

REM ── Log file ──────────────────────────────────────────────────────────────────
set LOG=%~dp0compile_log.txt
echo F4AI Papyrus Compile Log > "%LOG%"
echo Started: %DATE% %TIME% >> "%LOG%"
echo. >> "%LOG%"

REM ── Auto-detect Creation Kit ──────────────────────────────────────────────────
set CK_EXE=

for %%P in (
    "E:\Steam\steamapps\common\Fallout 4\CreationKit.exe"
    "D:\Steam\steamapps\common\Fallout 4\CreationKit.exe"
    "C:\Steam\steamapps\common\Fallout 4\CreationKit.exe"
    "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\CreationKit.exe"
    "C:\Program Files\Steam\steamapps\common\Fallout 4\CreationKit.exe"
) do (
    if exist %%P (
        set CK_EXE=%%~P
        goto :ck_found
    )
)

for /f "tokens=2*" %%A in ('reg query "HKLM\SOFTWARE\Bethesda Softworks\Fallout4" /v "installed path" 2^>nul') do set FO4_ROOT=%%B
if defined FO4_ROOT (
    if exist "%FO4_ROOT%CreationKit.exe" (
        set CK_EXE=%FO4_ROOT%CreationKit.exe
        goto :ck_found
    )
)

echo [ERROR] Could not find CreationKit.exe. >> "%LOG%"
echo [ERROR] Could not find CreationKit.exe.
echo         Set CK_EXE at the top of this script to the full path.
pause
exit /b 1

:ck_found
for %%F in ("%CK_EXE%") do set FO4_ROOT=%%~dpF
set FO4_DATA=%FO4_ROOT%Data

echo [F4AI] Creation Kit : %CK_EXE%
echo [F4AI] Fallout Data  : %FO4_DATA%
echo.
echo [F4AI] Creation Kit : %CK_EXE% >> "%LOG%"
echo [F4AI] Fallout Data  : %FO4_DATA% >> "%LOG%"

REM ── Compiler and flags file ────────────────────────────────────────────────────
set COMPILER=%FO4_ROOT%Papyrus Compiler\PapyrusCompiler.exe
if not exist "%COMPILER%" (
    echo [ERROR] Papyrus compiler not found at: %COMPILER% >> "%LOG%"
    echo [ERROR] Papyrus compiler not found at: %COMPILER%
    pause & exit /b 1
)

REM Flags file — check known locations, then do a full search under FO4_ROOT
set FLAGS_FILE=
for %%P in (
    "%FO4_DATA%\Scripts\Source\Base\TESV_Papyrus_Flags.flg"
    "%FO4_DATA%\Scripts\Source\TESV_Papyrus_Flags.flg"
    "%FO4_ROOT%Papyrus Compiler\TESV_Papyrus_Flags.flg"
    "%FO4_ROOT%TESV_Papyrus_Flags.flg"
    "%FO4_DATA%\Scripts\Source\Base\Institute_Papyrus_Flags.flg"
    "%FO4_DATA%\Scripts\Source\Institute_Papyrus_Flags.flg"
) do (
    if exist %%P (
        set FLAGS_FILE=%%~P
        goto :flags_found
    )
)

REM Last resort — search the whole FO4 folder tree
echo [F4AI] Searching for flags file under %FO4_ROOT%...
for /f "delims=" %%F in ('dir /s /b "%FO4_ROOT%*Papyrus_Flags.flg" 2^>nul') do (
    set FLAGS_FILE=%%F
    goto :flags_found
)

echo [ERROR] Cannot find Papyrus flags file anywhere under %FO4_ROOT% >> "%LOG%"
echo [ERROR] Cannot find Papyrus flags file.
echo         Run the Creation Kit at least once to trigger a full install,
echo         or check that the CK DLC is installed in Steam.
pause & exit /b 1

:flags_found
echo [F4AI] Flags file   : %FLAGS_FILE%
echo [F4AI] Flags file   : %FLAGS_FILE% >> "%LOG%"
echo.

REM ── Directories ───────────────────────────────────────────────────────────────
set SCRIPT_DIR=%~dp0
set OUTPUT_DIR=%SCRIPT_DIR%compiled_pex
set STAGING=%SCRIPT_DIR%_compile_staging

REM ── MO2 mod folder — update this if you move your MO2 instance ────────────────
set MO2_MOD_DIR=E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries

REM Clean and recreate staging — scripts must be in F4AI\ subfolder to match namespace
if exist "%STAGING%" rmdir /s /q "%STAGING%"
mkdir "%STAGING%\F4AI"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Copy F4AI namespace scripts into staging\F4AI\
copy /Y "%SCRIPT_DIR%papyrus\*.psc" "%STAGING%\F4AI\" >nul 2>&1

REM ── Compile runtime stubs (MiscUtil.pex, StringUtil.pex) ─────────────────────
REM These are NOT import-only stubs — they must be compiled to .pex and deployed
REM to Data\Scripts\ so the game can load them at runtime.
echo [F4AI] Compiling runtime stubs (MiscUtil, StringUtil)...
echo [F4AI] Compiling runtime stubs... >> "%LOG%"
set STUB_IMPORTS=.;%FO4_DATA%\Scripts\Source\User;%FO4_DATA%\Scripts\Source\Base
set STUB_ERRORS=0
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
pushd "%SCRIPT_DIR%papyrus\stubs"
for %%F in ("MiscUtil.psc" "StringUtil.psc" "JsonUtil.psc") do (
    echo Compiling stub: %%~nxF
    echo Compiling stub: %%~nxF >> "%LOG%"
    "%COMPILER%" "%%F" -o="%OUTPUT_DIR%" -i="%STUB_IMPORTS%" -f="%FLAGS_FILE%" >> "%LOG%" 2>&1
    if exist "%OUTPUT_DIR%\%%~nF.pex" (
        echo [OK]   stub %%~nxF
        echo [OK]   stub %%~nxF >> "%LOG%"
    ) else (
        echo [WARN] stub %%~nxF failed to compile - check that F4SE pex is already installed
        echo [WARN] stub %%~nxF failed >> "%LOG%"
        set /a STUB_ERRORS+=1
    )
)
popd
echo.

REM ── Import paths (absolute, used by mod scripts section) ──────────────────────
set IMPORTS_ABS=%STAGING%;%SCRIPT_DIR%papyrus\stubs;%SCRIPT_DIR%papyrus\Hydra_Stubs;%FO4_DATA%\Scripts\Source\User;%FO4_DATA%\Scripts\Source\Base

echo [F4AI] Compiling F4AI namespace scripts...
echo [F4AI] Compiling F4AI namespace scripts... >> "%LOG%"
echo.

set ERRORS=0

REM ── Compile F4AI\ namespace scripts ───────────────────────────────────────────
REM CRITICAL: pushd into staging so CWD = source root.
REM The compiler derives scriptname from path relative to CWD, so:
REM   CWD = _compile_staging\
REM   file = F4AI\F4AI_CombatMonitor.psc  (relative)
REM   → expected scriptname = F4AI:F4AI_CombatMonitor  ✓
REM Using "." as first import so the compiler can resolve F4AI: references.
set IMPORTS_REL=.;%SCRIPT_DIR%papyrus\stubs;%SCRIPT_DIR%papyrus\Hydra_Stubs;%FO4_DATA%\Scripts\Source\User;%FO4_DATA%\Scripts\Source\Base

pushd "%STAGING%"
for %%F in ("F4AI\*.psc") do (
    echo Compiling: %%~nxF
    echo Compiling: %%~nxF >> "%LOG%"
    REM Delete stale pex first so a leftover from an old run can't fake an [OK]
    if exist "%OUTPUT_DIR%\F4AI\%%~nF.pex" del /q "%OUTPUT_DIR%\F4AI\%%~nF.pex"
    "%COMPILER%" "%%F" -o="%OUTPUT_DIR%" -i="%IMPORTS_REL%" -f="%FLAGS_FILE%" -op >> "%LOG%" 2>&1
    REM Papyrus compiler v2.8 exits 0 even on failure — check for pex instead
    REM Compiler mirrors folder structure: F4AI\Script.psc -> compiled_pex\F4AI\Script.pex
    if exist "%OUTPUT_DIR%\F4AI\%%~nF.pex" (
        echo [OK]   %%~nxF
        echo [OK]   %%~nxF >> "%LOG%"
    ) else (
        echo [FAIL] %%~nxF
        echo [FAIL] %%~nxF >> "%LOG%"
        set /a ERRORS+=1
    )
)
popd

REM ── Compile mod\Data\Scripts\Source\ (non-namespaced) ─────────────────────────
set MOD_ERRORS=0
set MOD_COUNT=0
if exist "%SCRIPT_DIR%mod\Data\Scripts\Source\*.psc" (
    echo.
    echo [F4AI] Compiling mod\Data\Scripts\Source\ scripts...
    echo [F4AI] Compiling mod\Data\Scripts\Source\ scripts... >> "%LOG%"

    REM pushd so CWD = script source folder; compiler derives bare scriptname (no namespace)
    set MOD_IMPORTS=.;%SCRIPT_DIR%papyrus\stubs;%SCRIPT_DIR%papyrus\Hydra_Stubs;%FO4_DATA%\Scripts\Source\User;%FO4_DATA%\Scripts\Source\Base;%STAGING%

    pushd "%SCRIPT_DIR%mod\Data\Scripts\Source"
    for %%F in ("*.psc") do (
        echo Compiling: %%~nxF
        echo Compiling: %%~nxF >> "%LOG%"
        REM Delete stale pex first so a leftover from an old run can't fake an [OK]
        if exist "%OUTPUT_DIR%\%%~nF.pex" del /q "%OUTPUT_DIR%\%%~nF.pex"
        "%COMPILER%" "%%F" -o="%OUTPUT_DIR%" -i="!MOD_IMPORTS!" -f="%FLAGS_FILE%" -op >> "%LOG%" 2>&1
        if exist "%OUTPUT_DIR%\%%~nF.pex" (
            echo [OK]   %%~nxF
            echo [OK]   %%~nxF >> "%LOG%"
        ) else (
            echo [FAIL] %%~nxF
            echo [FAIL] %%~nxF >> "%LOG%"
            set /a MOD_ERRORS+=1
        )
        set /a MOD_COUNT+=1
    )
    popd
)

REM ── Cleanup staging ───────────────────────────────────────────────────────────
rmdir /s /q "%STAGING%" >nul 2>&1

REM ── Deploy: project mod folder ────────────────────────────────────────────────
echo. >> "%LOG%"
echo [F4AI] Deploying to project mod folder... >> "%LOG%"
echo [F4AI] Deploying to project mod folder...
robocopy "%OUTPUT_DIR%" "%SCRIPT_DIR%mod\Data\Scripts" *.pex /NFL /NDL /NJH /NJS >> "%LOG%" 2>&1
robocopy "%OUTPUT_DIR%\F4AI" "%SCRIPT_DIR%mod\Data\Scripts\F4AI" *.pex /NFL /NDL /NJH /NJS >> "%LOG%" 2>&1
echo [F4AI] Project deploy done. >> "%LOG%"

REM ── Deploy to MO2 mod folder ───────────────────────────────────────────────────
REM MO2 mod root = Data root (flat layout — no Data\ subfolder).
REM Scripts\F4AI\ at mod root maps to Data\Scripts\F4AI\ in-game.
echo [F4AI] Deploying to MO2 mod folder... >> "%LOG%"
echo [F4AI] Deploying to MO2 mod folder...
if not exist "%MO2_MOD_DIR%" (
    echo [WARN] MO2_MOD_DIR not found: %MO2_MOD_DIR% >> "%LOG%"
    echo [WARN] MO2_MOD_DIR not found: %MO2_MOD_DIR%
    goto :mo2_skip
)

echo [F4AI]   Scripts: %MO2_MOD_DIR%\Scripts\F4AI >> "%LOG%"
if not exist "%MO2_MOD_DIR%\Scripts\F4AI" mkdir "%MO2_MOD_DIR%\Scripts\F4AI"
robocopy "%OUTPUT_DIR%" "%MO2_MOD_DIR%\Scripts" *.pex /IS /NFL /NDL /NJH /NJS >> "%LOG%" 2>&1
robocopy "%OUTPUT_DIR%\F4AI" "%MO2_MOD_DIR%\Scripts\F4AI" *.pex /IS /NFL /NDL /NJH /NJS >> "%LOG%" 2>&1

echo [F4AI] MO2 deploy done. >> "%LOG%"
echo [F4AI] MO2 deploy done.

REM ── Deploy Hydra static data files (SaveMap namespace registrations, etc.) ──────
echo [F4AI] Deploying Hydra data files... >> "%LOG%"
echo [F4AI] Deploying Hydra data files...
if exist "%SCRIPT_DIR%mod\Data\Hydra" (
    robocopy "%SCRIPT_DIR%mod\Data\Hydra" "%MO2_MOD_DIR%\Hydra" /E /IS /NFL /NDL /NJH /NJS >> "%LOG%" 2>&1
    echo [F4AI] Hydra data deploy done. >> "%LOG%"
    echo [F4AI] Hydra data deploy done.
)

:mo2_skip

REM ── Summary ───────────────────────────────────────────────────────────────────
echo.
echo ==============================================================================
if %ERRORS% EQU 0 (
    if %MOD_ERRORS% EQU 0 (
        if %STUB_ERRORS% EQU 0 (
            echo [F4AI] ALL SCRIPTS COMPILED AND DEPLOYED SUCCESSFULLY.
            echo [F4AI] ALL SCRIPTS COMPILED AND DEPLOYED SUCCESSFULLY. >> "%LOG%"
        ) else (
            echo [F4AI] Core scripts OK. %STUB_ERRORS% runtime stubs FAILED ^(F4SE pex installed?^).
            echo [F4AI] Core scripts OK. %STUB_ERRORS% runtime stubs FAILED. >> "%LOG%"
        )
    ) else (
        echo [F4AI] F4AI scripts OK. %MOD_ERRORS% mod scripts FAILED. %STUB_ERRORS% stubs FAILED.
        echo [F4AI] F4AI scripts OK. %MOD_ERRORS% mod scripts FAILED. %STUB_ERRORS% stubs FAILED. >> "%LOG%"
    )
) else (
    echo [F4AI] %ERRORS% F4AI scripts FAILED. %MOD_ERRORS% mod scripts FAILED. %STUB_ERRORS% stubs FAILED.
    echo [F4AI] %ERRORS% F4AI scripts FAILED. %MOD_ERRORS% mod scripts FAILED. %STUB_ERRORS% stubs FAILED. >> "%LOG%"
)
echo See compile_log.txt for full details.
echo ==============================================================================
echo.
endlocal
pause
