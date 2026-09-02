@echo off
setlocal enabledelayedexpansion
title Fallout 4 Advanced AI - Auto Start
cd /d "%~dp0"

echo.
echo =====================================================
echo   Fallout 4 Advanced AI - Mossy Industries
echo   Auto Start
echo =====================================================
echo.

REM ── Paths — update these if you move anything ─────────────────────────────
set KOBOLD_EXE=E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries\Data\F4AI\runtime\koboldcpp.exe
set MODEL=E:\.ai-navigator\models\meta-llama\Meta-Llama-3-8B-Instruct\Meta-Llama-3-8B-Instruct_Q8_0.gguf
set BRIDGE_SCRIPT=%~dp0bridge\mossy_fo4_bridge.py
set MO2_EXE=E:\Mod.Organizer 2\ModOrganizer.exe

REM ── STEP 1: KoboldCPP ─────────────────────────────────────────────────────
echo [1/3] Checking AI engine (KoboldCPP on port 5001)...
curl -s --connect-timeout 2 --max-time 3 "http://127.0.0.1:5001/api/v1/info" >nul 2>&1
if not errorlevel 1 (
    echo       Already running - skipping.
    goto :bridge
)

if not exist "%KOBOLD_EXE%" (
    echo.
    echo [ERROR] KoboldCPP not found:
    echo         %KOBOLD_EXE%
    echo         Make sure "Fallout 4 Advanced AI - Mossy Industries" is
    echo         installed and enabled in MO2.
    echo.
    goto :error
)
if not exist "%MODEL%" (
    echo.
    echo [ERROR] Llama 3 8B model not found:
    echo         %MODEL%
    echo         Check that the model downloaded correctly via AI Navigator.
    echo.
    goto :error
)

echo       Starting KoboldCPP + Llama 3 8B...
echo       (First load takes 30-60 seconds - the model is large.)
start "KoboldCPP" /MIN "%KOBOLD_EXE%" ^
    --model "%MODEL%" ^
    --port 5001 ^
    --host 127.0.0.1 ^
    --contextsize 4096 ^
    --threads 6 ^
    --blasthreads 4 ^
    --quiet

set /a KB_TRY=0
:kb_wait
    set /a KB_TRY+=1
    if !KB_TRY! GTR 45 (
        echo [WARN]  No response after 90s - continuing anyway.
        goto :bridge
    )
    timeout /t 2 /nobreak >nul
    curl -s --connect-timeout 2 --max-time 3 "http://127.0.0.1:5001/api/v1/info" >nul 2>&1
    if errorlevel 1 (
        set /a SECS=KB_TRY*2
        echo       Waiting for model to load... (!SECS!s)
        goto :kb_wait
    )
echo       KoboldCPP is ready.

REM ── STEP 2: F4AI Bridge ───────────────────────────────────────────────────
:bridge
echo.
echo [2/3] Checking F4AI Bridge (port 28485)...
curl -s --connect-timeout 2 --max-time 3 "http://127.0.0.1:28485/status" >nul 2>&1
if not errorlevel 1 (
    echo       Already running - skipping.
    goto :mo2
)

if not exist "%BRIDGE_SCRIPT%" (
    echo.
    echo [ERROR] Bridge script not found:
    echo         %BRIDGE_SCRIPT%
    echo.
    goto :error
)

echo       Starting F4AI bridge...
start "F4AI Bridge" /MIN python "%BRIDGE_SCRIPT%"

REM Give it a few seconds to bind the port
set /a BR_TRY=0
:br_wait
    set /a BR_TRY+=1
    if !BR_TRY! GTR 10 (
        echo [WARN]  Bridge not responding yet - it may still be starting.
        goto :mo2
    )
    timeout /t 1 /nobreak >nul
    curl -s --connect-timeout 2 --max-time 3 "http://127.0.0.1:28485/status" >nul 2>&1
    if errorlevel 1 goto :br_wait
echo       Bridge is ready.

REM ── STEP 3: Mod Organizer 2 ───────────────────────────────────────────────
:mo2
echo.
echo [3/3] Launching Mod Organizer 2...
if exist "%MO2_EXE%" (
    start "" "%MO2_EXE%"
    echo       MO2 launched.
    echo       Click RUN in MO2 to start Fallout 4 via F4SE.
) else (
    echo [WARN]  MO2 not found at: %MO2_EXE%
    echo         Launch MO2 manually, then click Run.
)

echo.
echo =====================================================
echo   All systems go!
echo.
echo   KoboldCPP  - port 5001  (Llama 3 8B)
echo   F4AI Bridge- port 28485
echo   MO2        - click Run to launch F4SE
echo.
echo   In-game: press D-pad Left near an NPC to talk.
echo =====================================================
echo.
pause
exit /b 0

:error
echo   Fix the issue above and run this again.
echo.
pause
exit /b 1
