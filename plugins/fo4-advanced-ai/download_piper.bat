@echo off
echo ========================================
echo Fallout 4 Advanced AI - Download Piper
echo ========================================
echo.

echo This script will help you download Piper TTS for bundling.
echo.
echo Opening Piper releases page in your browser...
echo.
echo Download: piper_windows_amd64.zip (or latest Windows build)
echo Extract: piper.exe
echo Copy to: release_staging\core\Data\F4AI\piper.exe
echo.

start https://github.com/rhasspy/piper/releases/latest

echo.
echo ========================================
echo After downloading:
echo 1. Extract piper.exe from the ZIP
echo 2. Copy to: release_staging\core\Data\F4AI\piper.exe
echo 3. Run: setup_staging.bat to verify
echo ========================================
echo.
pause
