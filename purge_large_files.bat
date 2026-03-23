@echo off
setlocal EnableDelayedExpansion
:: purge_large_files.bat
::
:: Run this when GitHub Desktop shows gigabytes of data "waiting to push"
:: that you did not intentionally add.
::
:: What this script does
:: ─────────────────────
:: 1. Fetches the latest state of origin/main so comparisons are accurate.
:: 2. Scans the commits that are waiting to be pushed for known large-file types.
:: 3. Scans the git index (tracked files) for the same types.
:: 4. If any are found, asks you to confirm removal.
:: 5. Soft-resets all pending commits back to one clean staging area.
:: 6. Removes the large files from that staging area (files stay on your disk).
:: 7. Re-commits only the safe files in one clean commit.
::
:: After running this script, the pending push will contain only Python code
:: and config files.  Double-click end_session.bat to push.
::
:: The files on your disk are NEVER deleted — only their git tracking is removed.

echo ============================================================
echo  Blender Add-on  --  Purge Large Files from Pending Push
echo ============================================================
echo.

:: ── Verify we are inside the git repo ────────────────────────────────────────
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: No git repository found in this folder.
    echo Copy this file into your local add-on folder and try again.
    pause
    exit /b 1
)

:: ── Activate git hooks (safe to run every time) ───────────────────────────────
git config core.hooksPath .githooks >nul 2>&1

:: ── Fetch origin so our comparison is up to date ─────────────────────────────
echo Fetching latest from GitHub so we can compare correctly...
git fetch origin main >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Could not fetch from GitHub.
    echo Comparisons will use the last known state of origin/main.
    echo.
)

:: ── Check how many commits are ahead of origin/main ──────────────────────────
for /f %%n in ('git rev-list origin/main..HEAD --count 2^>nul') do set AHEAD=%%n
if "%AHEAD%"=="" set AHEAD=0

echo Commits ahead of origin/main: %AHEAD%

if "%AHEAD%"=="0" (
    echo.
    echo You are already up to date with origin/main -- no pending commits to clean.
    echo.
    echo If GitHub Desktop still shows data waiting to push, try:
    echo   1. Close GitHub Desktop completely and reopen it.
    echo   2. Click Fetch origin.
    echo   3. If it persists, run fix_git_remote.bat to reset the remote URL.
    pause
    exit /b 0
)

:: ── Extensions to look for ───────────────────────────────────────────────────
:: AI / LLM model weights (can be 2-8 GB each)
set LARGE_EXTS=gguf ggml ggmf llamafile pt pth ckpt safetensors onnx
:: NumPy / pickle / HDF5 data files
set LARGE_EXTS=%LARGE_EXTS% bin npz npy pkl pickle h5 hdf5 pb tflite
:: Addon release zips (built by CI, never committed)
set LARGE_EXTS=%LARGE_EXTS% zip
:: Blender project files
set LARGE_EXTS=%LARGE_EXTS% blend
:: Large texture / media files
set LARGE_EXTS=%LARGE_EXTS% tga tif tiff dds exr hdr mp4 avi mov mkv wav mp3 ogg
:: Windows executables / libraries that should be in LFS not plain git
set LARGE_EXTS=%LARGE_EXTS% exe dll msi pdb lib

:: ── Scan pending commits for large files ─────────────────────────────────────
echo.
echo Scanning %AHEAD% pending commit(s) and the git index for large files...
echo.

set FOUND_ANY=0

for %%E in (%LARGE_EXTS%) do (
    for /f "tokens=*" %%F in ('git diff --name-only origin/main HEAD 2^>nul ^| findstr /i "\.%%E$" 2^>nul') do (
        echo   [PENDING COMMIT]  %%F
        set FOUND_ANY=1
    )
)

for %%E in (%LARGE_EXTS%) do (
    for /f "tokens=*" %%F in ('git ls-files 2^>nul ^| findstr /i "\.%%E$" 2^>nul') do (
        echo   [TRACKED FILE]    %%F
        set FOUND_ANY=1
    )
)

if "!FOUND_ANY!"=="0" (
    echo   Nothing suspicious found in the %AHEAD% pending commit(s).
    echo.
    echo The 3 GB may have already been removed in a previous fix, but the
    echo git object database still holds the old blobs.  A full garbage-
    echo collect usually fixes GitHub Desktop's size estimate:
    echo.
    echo   git gc --aggressive --prune=now
    echo.
    echo Or do a fresh clone (see GIT_RECOVERY_GUIDE.md) which will only
    echo download the current clean state.
    pause
    exit /b 0
)

:: ── Confirm with the user ─────────────────────────────────────────────────────
echo.
echo The files listed above will be REMOVED FROM GIT TRACKING.
echo  * The actual files on your hard drive will NOT be deleted.
echo  * They will just be un-tracked so git stops trying to push them.
echo  * Their extensions are already in .gitignore so they won't come back.
echo.
echo All %AHEAD% pending commit(s) will be collapsed into one clean commit
echo that contains only Python, config, and documentation files.
echo.
set /p CONFIRM=Type  YES  and press Enter to continue, or anything else to cancel: 
if /i not "!CONFIRM!"=="YES" (
    echo.
    echo Cancelled -- no changes made.
    pause
    exit /b 0
)

:: ── Soft-reset: collapse pending commits into one staging area ────────────────
echo.
echo Soft-resetting to origin/main (keeps all file changes staged)...
git reset --soft origin/main
if %errorlevel% neq 0 (
    echo ERROR: git reset failed.  Your commits have not been changed.
    pause
    exit /b 1
)

:: ── Remove large files from the staging area ─────────────────────────────────
echo Removing large files from the git index...
for %%E in (%LARGE_EXTS%) do (
    git rm --cached --ignore-unmatch -r "*.%%E" >nul 2>&1
)
echo   Done.

:: ── Rebuild a clean commit ───────────────────────────────────────────────────
echo.
echo Staging all remaining safe files...
git add .
if %errorlevel% neq 0 (
    echo ERROR: git add failed.
    pause
    exit /b 1
)

:: Build a commit message with current date/time
set TIMESTAMP=%DATE% %TIME%
set MSG=session: save work %TIMESTAMP% (large files purged)

echo Committing clean files: %MSG%
git commit -m "%MSG%"
if %errorlevel% neq 0 (
    echo.
    echo Nothing left to commit after removing large files.
    echo Your working tree is clean.
) else (
    echo Commit created successfully.
)

:: ── Final clean-up of orphaned git objects ────────────────────────────────────
echo.
echo Cleaning up orphaned git objects (this may take a moment)...
git gc --prune=now >nul 2>&1
echo   Done.

:: ── Summary ───────────────────────────────────────────────────────────────────
echo.
echo ============================================================
echo  Done!
echo.
echo  The large files have been removed from git tracking.
echo  The files themselves are still on your hard drive.
echo.
echo  Your pending push should now be tiny (Python + config only).
echo  GitHub Desktop may need a moment to recalculate the size.
echo.
echo  Next steps:
echo    1. Check GitHub Desktop -- the pending push should be small now.
echo    2. Double-click  end_session.bat  to push your clean code.
echo.
echo  To prevent this from happening again, make sure your AI model
echo  files (.gguf, .pt, etc.) live OUTSIDE the repository folder.
echo ============================================================
echo.
pause
