@echo off
:: start_session.bat
:: Run this at the START of every work session.
:: Pulls the latest code from GitHub.
::
:: If you have uncommitted local changes this script will stash them first,
:: pull the latest commits, then restore your changes on top -- so nothing
:: is ever lost.

echo ============================================================
echo  Blender Add-on  --  Start Session Sync
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

:: Make sure the remote is pointing at the right place
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: No git remote named "origin" found.
    echo Run fix_git_remote.bat first, then try again.
    pause
    exit /b 1
)

:: ── Step 1: stash any uncommitted local changes ─────────────────────────────
set STASHED=0
for /f "tokens=*" %%i in ('git status --porcelain') do goto DO_STASH
goto PULL

:DO_STASH
echo You have local changes -- stashing them temporarily so we can pull...
git stash push -m "start_session auto-stash"
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Could not stash local changes.
    echo Close any programs that may have files locked, then try again.
    pause
    exit /b 1
)
set STASHED=1

:: ── Step 2: pull latest from GitHub ─────────────────────────────────────────
:PULL
echo.
echo Pulling latest changes from GitHub (main)...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Pull failed.
    if "%STASHED%"=="1" (
        echo Your local changes are safely stashed.
        echo Fix the pull error, then run:  git stash pop
    )
    echo Check your internet connection and GitHub credentials.
    pause
    exit /b 1
)

:: ── Step 3: restore stashed changes ─────────────────────────────────────────
if "%STASHED%"=="0" goto DONE

echo.
echo Restoring your local changes...
git stash pop
if %errorlevel% neq 0 (
    echo.
    echo NOTE: Some of your local changes conflicted with the pulled updates.
    echo Open the conflicted files, resolve them, then run:  git stash drop
    echo ^(Your other changes are already restored.^)
    pause
    exit /b 1
)

:DONE
echo.
echo ============================================================
echo  Ready!  You are up to date with GitHub.
echo ============================================================
echo.
pause
