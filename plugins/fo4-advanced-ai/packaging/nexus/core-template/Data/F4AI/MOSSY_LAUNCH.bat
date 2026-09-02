@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo [F4AI] Fallout 4 Advanced AI - Mossy Bridge Mode
echo [F4AI] Endpoint : http://127.0.0.1:8787/v1/chat

REM Show the user where memory is stored (reads memory_path from config.json if set)
set MEMORY_DISPLAY=
for /f "tokens=2 delims=:," %%A in ('findstr /i "memory_path" "%~dp0config.json" 2^>nul') do (
    set RAW=%%~A
    set RAW=!RAW: =!
    set RAW=!RAW:"=!
    if not "!RAW!"=="" set MEMORY_DISPLAY=!RAW!
)
if "!MEMORY_DISPLAY!"=="" set MEMORY_DISPLAY=%USERPROFILE%\Documents\My Games\Fallout4\F4AI\NPC_Memories
echo [F4AI] Memory   : !MEMORY_DISPLAY!
echo [F4AI] To change memory location: edit memory_path in config.json
echo.

REM ── Check Mossy is running (retry up to 3 times, 2s apart) ───────
set MOSSY_ONLINE=0
set RETRY=0

:check_loop
set /a RETRY+=1

REM Try /health first, fall back to root — either a response = Mossy is up
curl -s --connect-timeout 3 --max-time 4 "http://127.0.0.1:8787/health" >nul 2>&1
if not errorlevel 1 (
    set MOSSY_ONLINE=1
    goto :mossy_done
)
curl -s --connect-timeout 3 --max-time 4 "http://127.0.0.1:8787/" >nul 2>&1
if not errorlevel 1 (
    set MOSSY_ONLINE=1
    goto :mossy_done
)

if !RETRY! LSS 3 (
    echo [F4AI] Waiting for Mossy... (attempt !RETRY!/3)
    timeout /t 2 /nobreak >nul
    goto :check_loop
)

:mossy_done
if "!MOSSY_ONLINE!"=="1" (
    echo [F4AI] Mossy is ONLINE.
) else (
    echo [F4AI] WARNING: Mossy not detected at 127.0.0.1:8787
    echo [F4AI] Continuing anyway - bridge will use local KoboldCPP AI.
    echo [F4AI] To enable Mossy responses: open Mossy, then re-run this launcher.
    echo.
    timeout /t 4 /nobreak >nul
)

REM ── Start KoboldCPP with TinyLlama if not already running ────────
echo.
echo [F4AI] Checking local AI engine (KoboldCPP)...

set KOBOLD_RUNNING=0
curl -s --connect-timeout 2 --max-time 3 "http://127.0.0.1:5001/api/v1/info" >nul 2>&1
if not errorlevel 1 set KOBOLD_RUNNING=1

if "!KOBOLD_RUNNING!"=="1" (
    echo [F4AI] KoboldCPP already running on port 5001.
) else (
    if exist "%~dp0koboldcpp.exe" (
        if exist "%~dp0tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf" (
            echo [F4AI] Starting KoboldCPP + TinyLlama...
            echo [F4AI] Credit: KoboldCPP by LostRuins/Henk717 ^(AGPL-3.0^)
            echo [F4AI]         TinyLlama GGUF by TheBloke ^(Apache 2.0^)
            start "" /B "%~dp0koboldcpp.exe" --model "%~dp0tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf" ^
                --port 5001 --host 127.0.0.1 --contextsize 2048 --threads 4 ^
                --blasthreads 4 --nommap --quiet

            REM Wait up to 20s for KoboldCPP to be ready
            set KB_RETRY=0
            :kb_wait
            set /a KB_RETRY+=1
            timeout /t 2 /nobreak >nul
            curl -s --connect-timeout 2 --max-time 3 "http://127.0.0.1:5001/api/v1/info" >nul 2>&1
            if not errorlevel 1 (
                echo [F4AI] KoboldCPP is ready.
                goto :kb_done
            )
            if !KB_RETRY! LSS 10 (
                echo [F4AI] Waiting for KoboldCPP... (!KB_RETRY!/10^)
                goto :kb_wait
            )
            echo [F4AI] WARNING: KoboldCPP did not respond after 20s.
            :kb_done
        ) else (
            echo [F4AI] WARNING: TinyLlama model not found - run setup_staging.bat
        )
    ) else (
        echo [F4AI] WARNING: koboldcpp.exe not found - run setup_staging.bat
    )
)

echo.
echo [F4AI] Starting AI bridge engine...
start "" "Fallout4_AI_Engine.exe"
echo [F4AI] Bridge started. Launch Fallout 4 via MO2 now.
timeout /t 3 /nobreak >nul
exit
