@echo off
REM Fallout 4 Blender Add-on Setup Script
REM For Windows
REM This script helps install dependencies for the add-on

echo ================================================
echo Fallout 4 Blender Add-on - Setup Script
echo ================================================
echo.

REM ------------------------------------------------
REM Check and initialise Git LFS
REM ------------------------------------------------
echo Checking for Git LFS...

REM Try git lfs via PATH first
git lfs version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Git LFS found on PATH
    goto :run_lfs_install
)

REM Not on PATH -- search common D:\Program Files locations (Git for Windows on D:)
set "GIT_LFS_DIR="
for %%P in (
    "D:\Program Files\Git\cmd\git-lfs.exe"
    "D:\Program Files\Git LFS\git-lfs.exe"
    "D:\Programs\Git\cmd\git-lfs.exe"
    "D:\Programs\Git LFS\git-lfs.exe"
) do (
    if exist %%P (
        set "GIT_LFS_DIR=%%~dpP"
        goto :lfs_found_on_d
    )
)

REM git-lfs not found anywhere
echo [WARNING] Git LFS not found.
echo.
echo Please install Git LFS from: https://git-lfs.github.com/
echo After installation, re-run this script or run: git lfs install
echo.
goto :after_lfs

:lfs_found_on_d
echo [OK] Git LFS found at %GIT_LFS_DIR%

REM Add the D-drive directory to this session's PATH
set "PATH=%GIT_LFS_DIR%;%PATH%"

REM Also write it into the user's permanent PATH so GitHub Desktop finds it.
REM (setx writes to HKCU; no admin rights required.  GitHub Desktop must be
REM  restarted after this for the new PATH to take effect.)
for /f "tokens=2*" %%A in (
    'reg query "HKCU\Environment" /v PATH 2^>nul'
) do set "CURRENT_USER_PATH=%%B"

REM Only append if the directory is not already in the user PATH
echo %CURRENT_USER_PATH% | find /i "%GIT_LFS_DIR%" >nul 2>&1
if %errorlevel% neq 0 (
    setx PATH "%GIT_LFS_DIR%;%CURRENT_USER_PATH%" >nul
    echo [OK] Git LFS directory added to your permanent user PATH.
    echo      Please RESTART GitHub Desktop so it picks up the new PATH.
) else (
    echo [OK] Git LFS directory already in permanent user PATH.
)

:run_lfs_install
echo Initialising Git LFS hooks...
git lfs install
if %errorlevel% equ 0 (
    echo [OK] Git LFS initialised
) else (
    echo [WARNING] git lfs install returned an error - check your Git LFS installation
)

:after_lfs
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo.
    echo Please install Python 3.8 or higher from:
    echo   https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo [OK] Python found
python --version
echo.

REM Check if pip is installed
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pip not found!
    echo.
    echo Please reinstall Python and make sure pip is included.
    pause
    exit /b 1
)

echo [OK] pip found
echo.

REM Upgrade pip and setuptools
echo Upgrading pip and setuptools...
python -m pip install --upgrade pip setuptools
if %errorlevel% neq 0 (
    echo [WARNING] Failed to upgrade pip/setuptools
    echo Continuing anyway...
) else (
    echo [OK] pip and setuptools upgraded
)
echo.

REM Install core dependencies
echo Installing core Python dependencies...
if exist requirements.txt (
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [WARNING] Some core dependencies failed to install
    ) else (
        echo [OK] Core dependencies installed
    )
) else (
    echo [NOTE] requirements.txt not found, skipping
)
echo.

REM Optional AI/ML dependencies
echo ================================================
echo Optional AI/ML Dependencies
echo ================================================
echo.
echo The following are OPTIONAL dependencies for AI features:
echo   - Shap-E (text/image to 3D)
echo   - Point-E (fast point cloud generation)
echo   - PyTorch (required for AI models)
echo   - Other ML models
echo.
set /p INSTALL_AI="Do you want to install optional AI dependencies? (y/n): "
if /i "%INSTALL_AI%"=="y" (
    echo Installing optional dependencies...
    if exist requirements-optional.txt (
        pip install -r requirements-optional.txt
        if %errorlevel% neq 0 (
            echo [WARNING] Some optional dependencies failed to install
        ) else (
            echo [OK] Optional dependencies installed
        )
    ) else (
        echo Installing PyTorch and basic ML dependencies...
        pip install torch torchvision pillow numpy
        if %errorlevel% neq 0 (
            echo [WARNING] Some ML dependencies failed to install
        ) else (
            echo [OK] Basic ML dependencies installed
        )
    )
) else (
    echo Skipping optional dependencies
)
echo.

REM Optional: install external CLI tools (ffmpeg, nvtt, texconv, whisper)
python "%~dp0\tools\install_all_tools.py"

echo.

REM Installation summary
echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Next steps:
echo   1. Open Blender
echo   2. Go to Edit ^> Preferences ^> Add-ons
echo   3. Click 'Install' and select this add-on folder
echo   4. Enable 'Fallout 4 Tutorial Helper'
echo   5. Press N in 3D viewport to see the Fallout 4 tab
echo.
echo For AI features (optional):
echo   - Install Shap-E: gh repo clone openai/shap-e
echo   - Install Point-E: gh repo clone openai/point-e
echo.
echo For more information, see:
echo   - INSTALLATION.md
echo   - SETUP_GUIDE.md
echo   - README.md
echo.
echo Setup completed successfully!
echo.
pause
