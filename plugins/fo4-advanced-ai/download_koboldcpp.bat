@echo off
echo ========================================
echo Download KoboldCPP Runtime
echo ========================================
echo.

echo Downloading KoboldCPP portable runtime...
echo This will be bundled in your release package.
echo.

python tools\download_koboldcpp.py

echo.
echo ========================================
if errorlevel 1 (
	echo Download failed.
) else (
	echo Download complete!
)
echo ========================================
echo.
pause
