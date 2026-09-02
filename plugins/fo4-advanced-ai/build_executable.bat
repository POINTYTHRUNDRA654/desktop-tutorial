@echo off
echo ========================================
echo Fallout 4 Advanced AI - Build Executable
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

echo Running build script...
echo.

python tools\build_engine_executable.py

echo.
echo ========================================
if errorlevel 1 (
	echo Build FAILED - Check errors above
) else (
	echo Build completed successfully!
	echo Check release_staging\core\Data\F4AI\
)
echo ========================================
echo.
pause
