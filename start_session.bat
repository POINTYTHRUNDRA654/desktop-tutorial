@echo off
:: start_session.bat
:: Run this at the START of every work session.
:: Pulls the latest code and CI-rebuilt zips from GitHub.

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

echo Pulling latest changes from GitHub (main)...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Pull failed.
    echo Check your internet connection and GitHub credentials.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Ready!  You are up to date with GitHub.
echo ============================================================
echo.
pause
