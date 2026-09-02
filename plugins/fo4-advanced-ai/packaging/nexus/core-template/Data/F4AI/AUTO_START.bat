@echo off
setlocal
cd /d "%~dp0"

echo [F4AI] Fallout 4 Advanced AI - Auto Start
echo [F4AI] Checking AI backend status...

REM Check if KoboldCPP is already running
tasklist /FI "IMAGENAME eq koboldcpp.exe" 2>NUL | find /I /N "koboldcpp.exe">NUL
if "%ERRORLEVEL%"=="0" (
	echo [F4AI] AI backend already running.
	goto :start_bridge
)

REM Start KoboldCPP with bundled model
echo [F4AI] Starting bundled AI backend...
echo [F4AI] This may take 10-30 seconds on first run...

REM Check if model file exists
if not exist "models\tinyllama-1.1b-chat.gguf" (
	echo [F4AI] ERROR: AI model not found!
	echo [F4AI] Model should be at: models\tinyllama-1.1b-chat.gguf
	echo [F4AI] Please reinstall the mod from Nexus.
	pause
	exit /b 1
)

REM Check if KoboldCPP exists
if not exist "runtime\koboldcpp.exe" (
	echo [F4AI] ERROR: KoboldCPP runtime not found!
	echo [F4AI] Runtime should be at: runtime\koboldcpp.exe
	echo [F4AI] Please reinstall the mod from Nexus.
	pause
	exit /b 1
)

REM Start KoboldCPP in background with bundled model
start /B runtime\koboldcpp.exe ^
	--model models\tinyllama-1.1b-chat.gguf ^
	--port 5001 ^
	--threads 4 ^
	--contextsize 2048 ^
	--quiet ^
	>nul 2>&1

echo [F4AI] AI backend starting... (waiting 10 seconds)
timeout /t 10 /nobreak >nul

REM Verify KoboldCPP started
tasklist /FI "IMAGENAME eq koboldcpp.exe" 2>NUL | find /I /N "koboldcpp.exe">NUL
if not "%ERRORLEVEL%"=="0" (
	echo [F4AI] WARNING: AI backend may not have started.
	echo [F4AI] Continuing anyway...
)

:start_bridge
REM Check if bridge executable exists
if not exist "Fallout4_AI_Engine.exe" (
	echo [F4AI] ERROR: Bridge executable not found!
	echo [F4AI] File should be: Fallout4_AI_Engine.exe
	echo [F4AI] Please reinstall the mod from Nexus.
	pause
	exit /b 1
)

REM Start Python bridge
echo [F4AI] Starting F4AI Bridge...
start /MIN "" "Fallout4_AI_Engine.exe"

echo [F4AI] All systems ready!
echo [F4AI] You can now launch Fallout 4.
echo.
echo [F4AI] This window will close in 5 seconds...
timeout /t 5 /nobreak >nul

exit
