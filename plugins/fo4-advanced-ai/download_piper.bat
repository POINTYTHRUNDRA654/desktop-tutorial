@echo off
rem Piper (offline voice) is installed by setup_piper.ps1: it downloads piper.exe and two licence-checked voices.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_piper.ps1"
pause
