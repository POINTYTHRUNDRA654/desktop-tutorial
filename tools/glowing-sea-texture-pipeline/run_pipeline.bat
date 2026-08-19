@echo off
REM Glowing Sea batch texture enhancement pipeline.
REM Usage: run_pipeline.bat <folder-with-Input-subfolder>
REM   e.g.  run_pipeline.bat "F:\FO4 WORKING FLODER\GlowingSeaBatch"
REM Expects <folder>\Input\ to exist with your source .dds/.png textures.
REM Each stage's intermediate output stays on disk (UV_Mask\, Enhanced\,
REM UV-Locked\) so a failure at stage 3 or 4 doesn't require re-running
REM stage 2's ComfyUI calls.

setlocal
if "%~1"=="" (
    echo Usage: run_pipeline.bat "<folder-containing-Input-subfolder>"
    exit /b 1
)

set ROOT=%~1
set INPUT=%ROOT%\Input
set MASK=%ROOT%\UV_Mask
set ENHANCED=%ROOT%\Enhanced
set LOCKED=%ROOT%\UV-Locked
set OUTPUT=%ROOT%\Output

if not exist "%INPUT%" (
    echo ERROR: %INPUT% does not exist. Create it and put your source textures there first.
    exit /b 1
)

cd /d "%~dp0"

echo.
echo === Stage 1/4: extract_uv_mask ===
python extract_uv_mask.py "%INPUT%" "%MASK%"
if errorlevel 1 (
    echo Stage 1 failed. Stopping.
    exit /b 1
)

echo.
echo === Stage 2/4: enhance (ComfyUI) ===
python enhance.py "%INPUT%" "%ENHANCED%"
if errorlevel 1 (
    echo Stage 2 failed. Stopping — nothing charged/generated past this point.
    exit /b 1
)

echo.
echo === Stage 3/4: composite_lock ===
python composite_lock.py "%INPUT%" "%ENHANCED%" "%MASK%" "%LOCKED%"
if errorlevel 1 (
    echo Stage 3 failed. Stopping. Enhanced\ output is preserved — re-run from stage 3 without re-generating.
    exit /b 1
)

echo.
echo === Stage 4/4: finalize ===
python finalize.py "%INPUT%" "%LOCKED%" "%MASK%" "%OUTPUT%"
if errorlevel 1 (
    echo Stage 4 failed. UV-Locked\ output is preserved — re-run from stage 4 without redoing stages 1-3.
    exit /b 1
)

echo.
echo === Done. Output written to %OUTPUT% ===
if exist "%ROOT%\needs_review.txt" (
    echo NOTE: some textures were flagged for manual review — see %ROOT%\needs_review.txt
)
endlocal
