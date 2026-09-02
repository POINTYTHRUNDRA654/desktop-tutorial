@echo off
setlocal enabledelayedexpansion
title F4AI - Setup Staging (Download KoboldCPP + TinyLlama)
color 0A

echo ================================================================
echo   Fallout 4 Advanced AI - First-Time Staging Setup
echo   Downloads KoboldCPP and TinyLlama into release staging
echo ================================================================
echo.
echo  KoboldCPP  - by LostRuins / Henk717  (AGPL-3.0)
echo              https://github.com/LostRuins/koboldcpp
echo.
echo  TinyLlama  - by TinyLlama team  (Apache 2.0)
echo              GGUF quantised by TheBloke
echo              https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF
echo.
echo  Both are free and open-source. No cloud. No cost.
echo ================================================================
echo.

set STAGING_DIR=release_staging\core\Data\F4AI
set KOBOLD_EXE=%STAGING_DIR%\koboldcpp.exe
set MODEL_FILE=%STAGING_DIR%\tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf

set KOBOLD_URL=https://github.com/LostRuins/koboldcpp/releases/latest/download/koboldcpp.exe
set MODEL_URL=https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf

REM ── Create staging directory ─────────────────────────────────────
if not exist "%STAGING_DIR%" (
    echo [SETUP] Creating staging directory...
    mkdir "%STAGING_DIR%"
    if errorlevel 1 (
        echo [ERROR] Could not create staging directory.
        pause
        exit /b 1
    )
)
echo [OK] Staging directory: %STAGING_DIR%
echo.

REM ── Download KoboldCPP ───────────────────────────────────────────
if exist "%KOBOLD_EXE%" (
    echo [SKIP] koboldcpp.exe already present - skipping download.
) else (
    echo [DOWNLOAD] KoboldCPP runtime...
    echo           Source : %KOBOLD_URL%
    echo           Target : %KOBOLD_EXE%
    echo.
    curl -L --progress-bar -o "%KOBOLD_EXE%" "%KOBOLD_URL%"
    if errorlevel 1 (
        echo.
        echo [ERROR] KoboldCPP download failed.
        echo         Check your internet connection and try again.
        echo         Or download manually from:
        echo           https://github.com/LostRuins/koboldcpp/releases/latest
        echo         and place koboldcpp.exe in: %STAGING_DIR%
        pause
        exit /b 1
    )
    echo [OK] KoboldCPP downloaded.
)

echo.

REM ── Download TinyLlama GGUF ──────────────────────────────────────
if exist "%MODEL_FILE%" (
    echo [SKIP] TinyLlama model already present - skipping download.
) else (
    echo [DOWNLOAD] TinyLlama 1.1B Chat Q4_K_M model...
    echo           Source : %MODEL_URL%
    echo           Target : %MODEL_FILE%
    echo           Size   : ~670 MB  (this will take a few minutes)
    echo.
    curl -L --progress-bar -o "%MODEL_FILE%" "%MODEL_URL%"
    if errorlevel 1 (
        echo.
        echo [ERROR] TinyLlama download failed.
        echo         Check your internet connection and try again.
        echo         Or download manually from:
        echo           https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF
        echo         File: tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
        echo         Place it in: %STAGING_DIR%
        pause
        exit /b 1
    )
    echo [OK] TinyLlama model downloaded.
)

echo.
echo ================================================================
echo  SETUP COMPLETE
echo ================================================================
echo.
echo  Both files are staged and ready:
echo    koboldcpp.exe                         (inference engine)
echo    tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf (language model)
echo.
echo  Next steps:
echo    1. Run rebuild_for_mo2.bat to build the full release package
echo    2. Install via MO2 FOMOD installer
echo    3. Launch via MOSSY_LAUNCH.bat - KoboldCPP starts automatically
echo.
pause
