@echo off
REM build-nvidia-nexus-release.bat -- double-click this instead of the .ps1 directly.
REM Builds the Nexus-safe NVIDIA release (legacy Nexus personal-API-key auth
REM disabled). Use build-nvidia.bat for your normal desktop builds.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-nvidia-nexus-release.ps1"
pause
