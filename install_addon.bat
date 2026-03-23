@echo off
:: install_addon.bat
::
:: ONE-CLICK: Pull latest code, rebuild zips, install into Blender.
::
:: HOW TO CREATE A DESKTOP SHORTCUT:
::   1. Right-click this file  →  Send to  →  Desktop (create shortcut)
::   2. Double-click the shortcut any time you want the latest addon installed.
::
:: What it does:
::   1. git pull  (get newest code from GitHub)
::   2. Rebuilds all four Blender-version zips
::   3. Auto-detects your Blender version
::   4. Extracts the right zip straight into Blender's add-on folder
::
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_addon.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Installation failed. See the message above for details.
    pause
)
