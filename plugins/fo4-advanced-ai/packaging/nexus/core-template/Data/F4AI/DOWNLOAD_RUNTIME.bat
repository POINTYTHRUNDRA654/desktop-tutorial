@echo off
setlocal
cd /d "%~dp0"

echo ==============================================================================
echo  Fallout 4 Advanced AI - Download Runtime Components
echo  Mossy Industries
echo ==============================================================================
echo.
echo  This will download:
echo    - KoboldCPP (Nvidia CUDA build, ~200 MB)
echo    - TinyLlama-1.1B model (~668 MB)
echo.
echo  Files will be placed in the correct folders automatically.
echo  Run this from: Data\F4AI\  (where this bat file lives)
echo.
pause

REM ---- KoboldCPP ---------------------------------------------------------------
if exist "runtime\koboldcpp.exe" (
    echo [F4AI] koboldcpp.exe already present - skipping.
) else (
    echo [F4AI] Downloading KoboldCPP CUDA build...
    mkdir runtime 2>nul
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "Invoke-WebRequest -Uri 'https://github.com/LostRuins/koboldcpp/releases/latest/download/koboldcpp.exe' -OutFile 'runtime\koboldcpp.exe' -UseBasicParsing"
    if exist "runtime\koboldcpp.exe" (
        echo [F4AI] koboldcpp.exe downloaded OK.
    ) else (
        echo [F4AI] ERROR: koboldcpp.exe download failed.
        echo [F4AI] Download manually from:
        echo [F4AI]   https://github.com/LostRuins/koboldcpp/releases/latest
        echo [F4AI] Rename to koboldcpp.exe and place in: runtime\
        goto :model
    )
)

:model
REM ---- Model -------------------------------------------------------------------
if exist "models\tinyllama-1.1b-chat.gguf" (
    echo [F4AI] tinyllama-1.1b-chat.gguf already present - skipping.
) else (
    echo [F4AI] Downloading TinyLlama model (~668 MB) - this may take several minutes...
    mkdir models 2>nul
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "Invoke-WebRequest -Uri 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf' -OutFile 'models\tinyllama-1.1b-chat.gguf' -UseBasicParsing"
    if exist "models\tinyllama-1.1b-chat.gguf" (
        echo [F4AI] Model downloaded OK.
    ) else (
        echo [F4AI] ERROR: Model download failed.
        echo [F4AI] Download manually from:
        echo [F4AI]   https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF
        echo [F4AI] Save as: models\tinyllama-1.1b-chat.gguf
    )
)

echo.
echo ==============================================================================
echo  Done. You can now run AUTO_START.bat to launch the AI.
echo ==============================================================================
echo.
pause
