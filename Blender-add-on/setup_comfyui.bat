@echo off
REM ComfyUI Setup Script for Embedded Python
REM This script helps install ComfyUI and its extensions with embedded Python

echo ================================================
echo ComfyUI Setup with Embedded Python
echo ================================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Check if this is being run from ComfyUI directory
if not exist "python_embeded\python.exe" (
    echo [ERROR] This script should be run from the ComfyUI directory
    echo        OR python_embeded folder not found.
    echo.
    echo Directory structure should be:
    echo   ComfyUI\
    echo     python_embeded\
    echo       python.exe
    echo.
    echo If you're setting up ComfyUI, please:
    echo   1. Download ComfyUI portable version
    echo   2. Extract to a folder
    echo   3. Run this script from that folder
    echo.
    pause
    exit /b 1
)

echo [OK] Found embedded Python
.\python_embeded\python.exe --version
echo.

REM Step 1: Upgrade pip
echo Step 1: Upgrading pip and setuptools...
.\python_embeded\python.exe -s -m pip install --upgrade pip setuptools
if %errorlevel% neq 0 (
    echo [WARNING] Failed to upgrade pip/setuptools
    echo Continuing anyway...
) else (
    echo [OK] pip and setuptools upgraded
)
echo.

REM Step 2: Install core ComfyUI requirements
echo Step 2: Installing ComfyUI core requirements...
if exist "requirements.txt" (
    .\python_embeded\python.exe -s -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install core requirements
        pause
        exit /b 1
    ) else (
        echo [OK] Core requirements installed
    )
) else (
    echo [WARNING] requirements.txt not found in current directory
    echo [INFO] Skipping core requirements installation
)
echo.

REM Step 3: Install PyTorch
echo Step 3: PyTorch Installation
echo.
echo Choose PyTorch version:
echo   1. CUDA (NVIDIA GPU) - Recommended for GPU acceleration
echo   2. CPU only - For systems without NVIDIA GPU
echo   3. Skip - Already installed or will install manually
echo.
set /p TORCH_CHOICE="Enter choice (1-3): "

if "%TORCH_CHOICE%"=="1" (
    echo Installing PyTorch with CUDA support...
    .\python_embeded\python.exe -s -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install PyTorch with CUDA
    ) else (
        echo [OK] PyTorch with CUDA installed
    )
) else if "%TORCH_CHOICE%"=="2" (
    echo Installing PyTorch CPU version...
    .\python_embeded\python.exe -s -m pip install torch torchvision
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install PyTorch CPU
    ) else (
        echo [OK] PyTorch CPU installed
    )
) else (
    echo Skipping PyTorch installation
)
echo.

REM Step 4: Install ComfyUI-GGUF extension
echo Step 4: ComfyUI-GGUF Extension
echo.
set /p INSTALL_GGUF="Do you want to install ComfyUI-GGUF extension? (y/n): "

if /i "%INSTALL_GGUF%"=="y" (
    if not exist "custom_nodes" (
        echo Creating custom_nodes directory...
        mkdir custom_nodes
    )
    
    cd custom_nodes
    
    if exist "ComfyUI-GGUF" (
        echo [INFO] ComfyUI-GGUF already exists, updating...
        cd ComfyUI-GGUF
        git pull
        cd ..
    ) else (
        echo Cloning ComfyUI-GGUF...
        git clone https://github.com/city96/ComfyUI-GGUF.git
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to clone ComfyUI-GGUF
            echo [INFO] Make sure git is installed
            cd ..
            goto skip_gguf
        )
    )
    
    echo Installing ComfyUI-GGUF dependencies...
    cd ..
    .\python_embeded\python.exe -s -m pip install -r .\custom_nodes\ComfyUI-GGUF\requirements.txt
    if %errorlevel% neq 0 (
        echo [WARNING] Some dependencies failed to install
    ) else (
        echo [OK] ComfyUI-GGUF dependencies installed
    )
    
    :skip_gguf
) else (
    echo Skipping ComfyUI-GGUF installation
)
echo.

REM Step 5: Verify installation
echo ================================================
echo Verification
echo ================================================
echo.
echo Installed packages:
.\python_embeded\python.exe -s -m pip list
echo.

echo Testing PyTorch (if installed):
.\python_embeded\python.exe -c "try: import torch; print('[OK] PyTorch version:', torch.__version__); print('[OK] CUDA available:', torch.cuda.is_available()); print('[OK] CUDA version:', torch.version.cuda if torch.cuda.is_available() else 'N/A')\nexcept: print('[INFO] PyTorch not installed or import failed')" 2>nul
echo.

REM Step 6: Summary
echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Next steps:
echo   1. Download AI models to models/checkpoints/
echo   2. Run ComfyUI: python_embeded\python.exe main.py
echo   3. Access UI: http://localhost:8188
echo.
echo For GGUF models:
echo   - Place GGUF model files in models/checkpoints/
echo   - Use GGUF loader node in ComfyUI
echo.
echo Useful commands:
echo   - List packages: .\python_embeded\python.exe -m pip list
echo   - Install package: .\python_embeded\python.exe -s -m pip install [package]
echo   - Update package: .\python_embeded\python.exe -s -m pip install --upgrade [package]
echo.
echo For help, see:
echo   - COMFYUI_INTEGRATION.md
echo   - EMBEDDED_PYTHON_GUIDE.md
echo.
pause
