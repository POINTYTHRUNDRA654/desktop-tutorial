@echo off
echo ========================================
echo Fallout 4 Advanced AI - Build Release
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
	echo ERROR: Python not found in PATH
	echo Please install Python 3.12+ and add to PATH
	pause
	exit /b 1
)

echo Running release builder...
echo This will create the Nexus-ready ZIP file
echo.

python tools\build_nexus_release.py --channel alpha

echo.
echo ========================================
if errorlevel 1 (
	echo Build FAILED - Check errors above
	echo Common issues:
	echo   - Missing files in release_staging\core\
	echo   - Run setup_staging.bat first
	echo   - Check BUILD_TOOLS_SUMMARY.md
) else (
	echo Build completed successfully!
	echo Output: dist\nexus\*.zip
	echo.
	echo Ready for Nexus upload!
)
echo ========================================
echo.
pause
