@echo off
setlocal
cd /d "%~dp0"
if exist "Fallout4_AI_Engine.exe" (
  start "F4AI Bridge" /min "Fallout4_AI_Engine.exe"
  echo [F4AI] Bridge started.
  exit /b 0
)
echo [F4AI] Fallout4_AI_Engine.exe not found in Data/F4AI.
echo [F4AI] Reinstall the mod package and verify the core archive includes the engine executable.
pause
exit /b 1
