@echo off
:: install_addon.bat
::
:: ONE-CLICK: Pull latest code, rebuild zips, install into Blender.
::
:: ──────────────────────────────────────────────────────────────────────────
:: WHY GITHUB DESKTOP ALONE IS NOT ENOUGH
::   Pulling in GitHub Desktop only updates the repo folder on your PC.
::   Blender keeps its OWN separate copy of the addon in AppData.
::   You must run THIS script after every pull to push the new files into
::   Blender.  Then fully close and reopen Blender.
:: ──────────────────────────────────────────────────────────────────────────
::
:: HOW TO CREATE A DESKTOP SHORTCUT:
::   1. Right-click this file  →  Send to  →  Desktop (create shortcut)
::   2. After every GitHub Desktop pull, double-click the shortcut.
::   3. When it says "Done!", close ALL Blender windows and reopen Blender.
::
:: What it does:
::   1. git pull  (gets newest code from GitHub for your current branch)
::   2. Rebuilds all four Blender-version zips
::   3. Auto-detects your Blender version
::   4. Deletes the old addon files and installs the fresh ones
::
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_addon.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Installation failed. See the message above for details.
    pause
)
