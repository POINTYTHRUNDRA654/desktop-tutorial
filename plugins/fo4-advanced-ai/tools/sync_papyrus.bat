@echo off
REM sync_papyrus.bat
REM Copies all F4AI Papyrus source files from the project folder to both:
REM   1. The MO2 mod folder (served via VFS when CK is launched through MO2)
REM   2. The game Data folder (direct fallback)
REM Run this after editing any .psc file, then recompile in CK.

SET PROJECT=D:\Projects\Fallout-4-advanced-AI\papyrus
SET STUBS=D:\Projects\Fallout-4-advanced-AI\papyrus\stubs
SET MO2_TARGET=E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries\Data\Scripts\Source\User\F4AI
SET GAME_TARGET=E:\Steam\steamapps\common\Fallout 4\Data\Scripts\Source\User\F4AI
SET MO2_STUBS=E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries\Data\Scripts\Source\User
SET GAME_STUBS=E:\Steam\steamapps\common\Fallout 4\Data\Scripts\Source\User
SET MO2_STALE=E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries\Data\Scripts\Source\User

echo.
echo === Syncing Papyrus source files ===
echo From: %PROJECT%
echo.

IF NOT EXIST "%MO2_TARGET%" (
    echo Creating MO2 target folder...
    mkdir "%MO2_TARGET%"
)
IF NOT EXIST "%GAME_TARGET%" (
    echo Creating game target folder...
    mkdir "%GAME_TARGET%"
)

echo Removing stale un-namespaced copies from Source\User\ ...
del /F /Q "%MO2_STALE%\F4AI_*.psc" >nul 2>&1

FOR %%F IN ("%PROJECT%\F4AI_*.psc") DO (
    echo Copying %%~nxF ...
    copy /Y "%%F" "%MO2_TARGET%\%%~nxF" >nul
    copy /Y "%%F" "%GAME_TARGET%\%%~nxF" >nul
)

echo Copying stubs ...
FOR %%F IN ("%STUBS%\*.psc") DO (
    echo   %%~nxF
    copy /Y "%%F" "%MO2_STUBS%\%%~nxF" >nul
    copy /Y "%%F" "%GAME_STUBS%\%%~nxF" >nul
)

echo.
echo === Done. Recompile in CK now. ===
echo.
pause
