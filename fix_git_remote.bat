@echo off
:: fix_git_remote.bat
:: Run this from inside your local Blender add-on folder to reconnect it
:: to the GitHub remote after GitHub Desktop loses the connection.

echo ============================================================
echo  Blender Add-on Git Remote Fix
echo ============================================================
echo.

:: Make sure we are inside a git repo
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: No git repository found in this folder.
    echo Please copy this file into your local add-on folder
    echo ^(the one that contains __init__.py^) and try again.
    pause
    exit /b 1
)

echo Current remote:
git remote -v
echo.

:: Set (or update) the origin remote URL
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo Adding remote origin...
    git remote add origin https://github.com/POINTYTHRUNDRA654/Blender-add-on.
) else (
    echo Updating remote origin URL...
    git remote set-url origin https://github.com/POINTYTHRUNDRA654/Blender-add-on.
)

echo.
echo New remote:
git remote -v
echo.

:: Fetch latest info from GitHub (does not change any local files)
echo Fetching from GitHub (no local files will be changed)...
git fetch origin
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Fetch failed. Check your internet connection and that
    echo you are logged in to GitHub on this machine.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Remote reconnected successfully!
echo.
echo  Your local files have NOT been changed.
echo  Open GitHub Desktop - your repository should appear again.
echo  Use "Fetch origin" in Desktop to sync with GitHub.
echo ============================================================
echo.

:: Try to open GitHub Desktop if it is installed
:: GitHub Desktop registers itself as "github" in PATH
where github >nul 2>&1
if %errorlevel% equ 0 (
    echo Opening GitHub Desktop...
    start github
) else (
    :: Fall back to the default Windows installation path
    set "GH_EXE=%LOCALAPPDATA%\GitHubDesktop\GitHubDesktop.exe"
    if exist "%GH_EXE%" (
        echo Opening GitHub Desktop...
        start "" "%GH_EXE%"
    ) else (
        echo ^(GitHub Desktop not found - open it manually.^)
    )
)

pause
