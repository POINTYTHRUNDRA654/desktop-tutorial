@echo off
setlocal

set VCVARS=C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat
set CL_EXE=cl
set F4SE_SRC=D:\src\f4se
set SRC=D:\Projects\Fallout-4-advanced-AI\f4se_plugin\src\MiscUtil.cpp
set OUT_DIR=D:\Projects\Fallout-4-advanced-AI\f4se_plugin\build_direct
REM MO2 mod root = Data root (flat layout, same as compile_papyrus.bat's Scripts
REM deploy) — no "Data\" subfolder. The old path here had an extra "Data\" that
REM never existed under the mod folder, so this copy silently failed every time
REM while the script still printed "Deployed to MO2 and game directory."
set DEPLOY_MO2=E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries\F4SE\Plugins
set DEPLOY_GAME=E:\Steam\steamapps\common\Fallout 4\Data\F4SE\Plugins

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

echo [F4AI] Setting up VS 2026 native toolset (14.5x / cl 19.50+)...
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 (
    echo ERROR: vcvars64.bat failed - check VS 2026 install
    pause
    exit /b 1
)

echo [F4AI] Compiling F4AI_MiscUtil.dll...
"%CL_EXE%" /LD /EHsc /MD /O2 /std:c++17 ^
    /I "%F4SE_SRC%" ^
    /DWIN32_LEAN_AND_MEAN /DNOMINMAX ^
    "%SRC%" ^
    /Fe"%OUT_DIR%\F4AI_MiscUtil.dll" ^
    /Fo"%OUT_DIR%\MiscUtil.obj" ^
    /link /DLL kernel32.lib user32.lib 2>&1

if exist "%OUT_DIR%\F4AI_MiscUtil.dll" (
    echo [F4AI] Build succeeded.
    if not exist "%DEPLOY_GAME%" mkdir "%DEPLOY_GAME%"
    if not exist "%DEPLOY_MO2%" mkdir "%DEPLOY_MO2%"
    copy /Y "%OUT_DIR%\F4AI_MiscUtil.dll" "%DEPLOY_MO2%\F4AI_MiscUtil.dll"
    if errorlevel 1 (
        echo [F4AI] WARNING: MO2 deploy copy failed - check DEPLOY_MO2 path.
    ) else (
        echo [F4AI] Deployed to MO2 mod folder.
    )
    copy /Y "%OUT_DIR%\F4AI_MiscUtil.dll" "%DEPLOY_GAME%\F4AI_MiscUtil.dll"
    if errorlevel 1 (
        echo [F4AI] WARNING: game folder deploy copy failed - check DEPLOY_GAME path.
    ) else (
        echo [F4AI] Deployed to game directory.
    )
) else (
    echo [F4AI] BUILD FAILED - DLL not produced.
)

echo.
pause
endlocal
