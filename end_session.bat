@echo off
:: end_session.bat
:: Run this at the END of every work session.
:: Commits all local changes and pushes to GitHub.
:: GitHub Actions will then automatically rebuild the zips and push them back.

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

:: Show what changed
echo Changed files:
git status --short
echo.

:: Check if there is anything to commit
git status --porcelain >nul 2>&1
git diff --quiet && git diff --cached --quiet
if %errorlevel% equ 0 (
    :: Check untracked files too
    for /f %%i in ('git status --porcelain') do (
        goto HAS_CHANGES
    )
    echo Nothing to commit -- everything is already up to date.
    echo Pushing any unpushed commits anyway...
    goto PUSH
)

:HAS_CHANGES
:: Stage everything
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
echo    3. Commit the new zips back to main
echo.
echo  Run start_session.bat next time to pull those rebuilt zips.
echo ============================================================
echo.
pause
