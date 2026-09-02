@echo off
echo ========================================
echo Fallout 4 Advanced AI - Download Model
echo ========================================
echo.

echo Downloading TinyLlama-1.1B model (~668 MB)...
echo This will be bundled in your release package.
echo.
echo Press any key to start download...
pause >nul

python tools\download_model.py

echo.
echo ========================================
if errorlevel 1 (
	echo Download failed. Check error above.
) else (
	echo Download complete!
	echo Model ready for bundling.
)
echo ========================================
echo.
pause
