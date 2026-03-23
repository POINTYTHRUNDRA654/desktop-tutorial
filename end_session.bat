@echo off
:: end_session.bat
:: Run this at the END of every work session.
:: Commits all local changes and pushes to GitHub.
::
:: This script safely handles the case where GitHub is AHEAD of you
:: (e.g. because CI committed rebuilt zips while you were working).
:: It rebases your local commits on top of the remote so the push succeeds.

echo ============================================================
echo  Blender Add-on  --  End Session Sync
echo ============================================================
echo.

:: Verify we are inside the git repo
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: No git repository found in this folder.
    echo Copy this file into your local add-on folder and try again.
    pause
    exit /b 1
)

:: ── Activate git hooks (safe to run on every session) ───────────────────────
:: Points git at the committed .githooks/ folder so the pre-commit safety
:: check (blocks large model files) is active in VS Code and GitHub Desktop.
git config core.hooksPath .githooks >nul 2>&1
echo Git hooks activated ^(.githooks/pre-commit^).
echo.

:: ── Safety check: scan for large files before staging ───────────────────────
:: AI model files (.gguf, .pt, .pth, .ckpt, etc.) can be gigabytes each and
:: must NEVER be committed.  If any are found untracked or staged, stop now.
:: NOTE: This extension list is intentionally duplicated in .githooks/pre-commit
:: (the cross-platform bash equivalent).  Keep both lists in sync.
echo Checking for large model files that should not be committed...
set LARGE_FILE_FOUND=0
for %%E in (gguf ggml llamafile pt pth ckpt safetensors onnx bin npz npy pkl pickle h5 hdf5 pb tflite) do (
    for /f "tokens=*" %%F in ('git ls-files --others --exclude-standard --full-name 2^>nul ^| findstr /i "\.%%E$"') do (
        echo   WARNING: Large model file found untracked: %%F
        set LARGE_FILE_FOUND=1
    )
    for /f "tokens=*" %%F in ('git diff --cached --name-only --diff-filter=AM 2^>nul ^| findstr /i "\.%%E$"') do (
        echo   WARNING: Large model file found staged: %%F
        set LARGE_FILE_FOUND=1
    )
)
if "%LARGE_FILE_FOUND%"=="1" (
    echo.
    echo STOPPING: Large AI model file(s) detected above.
    echo These files must NOT be committed to Git -- they can be gigabytes in size.
    echo.
    echo They should already be covered by .gitignore.  If git is tracking them
    echo anyway, run the following command to un-track without deleting the file:
    echo.
    echo   git rm --cached path\to\the\model.gguf
    echo.
    echo Then add the file extension to .gitignore if it is not already there.
    pause
    exit /b 1
)
echo   No large model files detected -- safe to proceed.
echo.

:: Show what changed
echo Changed files:
git status --short
echo.

:: ── Step 1: commit any local changes ────────────────────────────────────────
for /f "tokens=*" %%i in ('git status --porcelain') do goto HAS_CHANGES
echo Nothing to commit -- everything is already up to date.
goto SYNC_REMOTE

:HAS_CHANGES
:: Stage everything (large ignored-file types are blocked by .gitignore)
git add .

:: Build a commit message with the current date/time
set TIMESTAMP=%DATE% %TIME%
set MSG=session: save work %TIMESTAMP%

echo Committing: %MSG%
git commit -m "%MSG%"
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Commit failed. Check the output above for details.
    pause
    exit /b 1
)

:: ── Step 2: fetch & rebase so we can push even if CI is ahead ───────────────
:SYNC_REMOTE
echo.
echo Fetching latest from GitHub...
git fetch origin main
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Fetch failed -- check your internet connection.
    echo Your changes are committed locally but not yet pushed.
    pause
    exit /b 1
)

:: Check whether remote is ahead of us
git rev-list HEAD..origin/main --count >nul 2>&1
for /f %%n in ('git rev-list HEAD..origin/main --count') do set BEHIND=%%n
if "%BEHIND%"=="0" goto PUSH

echo.
echo GitHub has %BEHIND% new commit(s) (probably CI rebuilt the zips).
echo Rebasing your work on top of those commits...
git rebase origin/main
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Rebase had conflicts.
    echo Open the conflicted files, resolve them, then run:
    echo   git rebase --continue
    echo Then run end_session.bat again.
    pause
    exit /b 1
)

:: ── Step 3: push ────────────────────────────────────────────────────────────
:PUSH
echo.
echo Pushing to GitHub (main)...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Push failed.
    echo Check your internet connection and GitHub credentials.
    echo You can run fix_git_remote.bat if the remote URL is wrong.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Done!  Your changes have been pushed to GitHub.
echo.
echo  GitHub Actions will now automatically:
echo    1. Rebuild the addon zips for all Blender versions
echo    2. Run the integrity tests
echo    3. Upload the zips as downloadable artifacts (Actions tab)
echo.
echo  The zips are NOT committed back to the repo -- download them
echo  from the Actions tab if you need them.
echo.
echo  Run start_session.bat next time to pull any remote changes.
echo ============================================================
echo.
pause
