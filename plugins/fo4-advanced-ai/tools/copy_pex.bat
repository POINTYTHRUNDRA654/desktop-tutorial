@echo off
REM copy_pex.bat
REM Copies compiled F4AI .pex files from the CK output folder into the MO2 mod folder.
REM Run this after a successful batch compile in CK.

SET GAME_PEX=E:\Steam\steamapps\common\Fallout 4\Data\Scripts\F4AI
SET MO2_PEX=E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries\Data\Scripts\F4AI

echo.
echo === Copying compiled .pex files ===
echo From: %GAME_PEX%
echo To:   %MO2_PEX%
echo.

IF NOT EXIST "%MO2_PEX%" (
    echo Creating target folder...
    mkdir "%MO2_PEX%"
)

SET COUNT=0
FOR %%F IN ("%GAME_PEX%\F4AI_*.pex") DO (
    echo Copying %%~nxF ...
    copy /Y "%%F" "%MO2_PEX%\%%~nxF" >nul
    SET /A COUNT+=1
)

echo.
IF %COUNT%==0 (
    echo WARNING: No .pex files found in %GAME_PEX%
    echo Make sure you ran a batch compile in CK first.
) ELSE (
    echo === Done. %COUNT% file(s) copied. ===
)
echo.
pause
