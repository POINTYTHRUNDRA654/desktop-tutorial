@echo off
REM build-nvidia.bat -- double-click this instead of the .ps1 directly.
REM It runs the PowerShell script with the execution policy bypassed
REM just for this one run, so it works regardless of your system's
REM PowerShell execution policy setting, and stays open on error.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-nvidia.ps1"
pause
