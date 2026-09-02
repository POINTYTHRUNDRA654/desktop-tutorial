@echo off
title Mossy FO4 Advanced AI Bridge
color 0A

echo ============================================================
echo   Mossy FO4 Advanced AI Bridge
echo   Connecting Fallout 4 to Mossy AI Assistant
echo ============================================================
echo.

:: Use Mossy's bundled Python (same one that powers the Mossy Bridge)
:: Mossy installs Python internally — no separate install required.
set MOSSY_PYTHON=
for %%P in (
    "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
    "%LOCALAPPDATA%\Programs\Mossy\resources\python\python.exe"
    "%APPDATA%\Mossy\python\python.exe"
    "%LOCALAPPDATA%\mossy-ai\python\python.exe"
) do (
    if exist %%P (
        set MOSSY_PYTHON=%%P
        goto :found_python
    )
)

:: Fallback: check if Mossy exposed python to PATH (some installs do this)
where mossy-python >nul 2>&1
if not errorlevel 1 (
    set MOSSY_PYTHON=mossy-python
    goto :found_python
)

:: Final fallback: system Python (only if Mossy's isn't found)
where python >nul 2>&1
if not errorlevel 1 (
    set MOSSY_PYTHON=python
    echo [NOTE] Using system Python (Mossy bundled Python not found)
    goto :found_python
)

echo [ERROR] Could not find Python.
echo        Mossy should provide Python automatically.
echo        Try relaunching from inside Mossy instead.
pause
exit /b 1

:found_python
echo [OK] Python: %MOSSY_PYTHON%

:: Check if bridge script exists
if not exist "%~dp0mossy_fo4_bridge.py" (
    echo [ERROR] mossy_fo4_bridge.py not found in %~dp0
    pause
    exit /b 1
)

echo [OK] Bridge script found

:: ── Voice dependencies (STT mic capture + TTS voice output) ──────────────────
:: Without these the bridge still runs, but NPCs get "Hello." instead of your
:: spoken words (no STT) and produce no voice audio (no TTS).
echo Checking voice dependencies (STT/TTS)...
%MOSSY_PYTHON% -c "import faster_whisper, sounddevice, numpy, edge_tts, pydub, pyttsx3" >nul 2>&1
if errorlevel 1 (
    echo [SETUP] Installing voice dependencies - one-time, may take a few minutes...
    %MOSSY_PYTHON% -m pip install --quiet faster-whisper sounddevice numpy edge-tts pydub pyttsx3
    %MOSSY_PYTHON% -c "import faster_whisper, sounddevice, numpy" >nul 2>&1
    if errorlevel 1 (
        echo [WARN] STT install incomplete - push-to-talk will use generic greetings.
    ) else (
        echo [OK] Voice dependencies installed
    )
) else (
    echo [OK] Voice dependencies present
)
echo.
echo Starting bridge server on localhost:28485...
echo.
echo In Mossy, go to: FO4 AI ^> Bridge tab ^> Connect
echo.

%MOSSY_PYTHON% "%~dp0mossy_fo4_bridge.py"

if errorlevel 1 (
    echo.
    echo [ERROR] Bridge exited with an error.
    pause
)
