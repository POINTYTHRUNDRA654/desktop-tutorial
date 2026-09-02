@echo off
setlocal
cd /d "%~dp0"

echo [F4AI] Downloading TinyLlama model (~668 MB)...
echo [F4AI] This will take several minutes. Do not close this window.
echo.

mkdir models 2>nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf' -OutFile 'models\tinyllama-1.1b-chat.gguf' -UseBasicParsing"

if exist "models\tinyllama-1.1b-chat.gguf" (
    echo.
    echo [F4AI] Model downloaded successfully!
) else (
    echo.
    echo [F4AI] Download failed. Try running as Administrator.
)

echo.
pause
