@echo off
:: resolve_conflicts.bat
:: Run this when GitHub Desktop is stuck on a merge conflict and you
:: cannot click through the conflict-resolution UI.
::
:: It will show you the conflicting files and let you choose what to do:
::   A) Accept all changes from GitHub (keep the remote version of every file)
::   B) Keep all your local changes (discard the incoming remote changes)
::   C) Abort the merge entirely (return to your last clean commit)
::
:: If you want to resolve file-by-file, see the instructions below.

echo ============================================================
echo  Blender Add-on -- Merge Conflict Recovery
echo ============================================================
echo.

:: Make sure we are inside a git repo
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: No git repository found in this folder.
    echo Copy this file into your local add-on folder and try again.
    pause
    exit /b 1
)

:: ── Check for an active merge ────────────────────────────────────────────────
if exist ".git\MERGE_HEAD" goto MERGE_IN_PROGRESS
if exist ".git\rebase-merge" goto REBASE_IN_PROGRESS
if exist ".git\rebase-apply" goto REBASE_IN_PROGRESS

:: No active merge -- check for unresolved conflict markers anyway
echo No active merge or rebase detected.
echo.
echo Scanning for leftover conflict markers ^(^<^<^<^<^<^<^<^)...
git --no-pager diff --check 2>nul
if %errorlevel% equ 0 (
    echo   No conflict markers found. Your working tree looks clean.
) else (
    echo   Conflict markers were found in the files listed above.
    echo   Open those files, search for ^<^<^<^<^<^<^< and fix them manually,
    echo   then run:  git add .  followed by  git commit
)
echo.
pause
exit /b 0

:: ── Active rebase conflict ───────────────────────────────────────────────────
:REBASE_IN_PROGRESS
echo A rebase is in progress and has hit a conflict.
echo.
echo Conflicting files:
git --no-pager diff --name-only --diff-filter=U
echo.
echo What would you like to do?
echo.
echo   [A] Accept the incoming changes ^(--theirs^) for every conflicting file
echo   [B] Keep your local changes   ^(--ours^)   for every conflicting file
echo   [C] Abort the rebase entirely ^(returns to your pre-rebase state^)
echo   [Q] Quit -- I will fix this manually
echo.
set /p CHOICE=Enter A, B, C or Q and press Enter: 

if /i "%CHOICE%"=="A" goto REBASE_THEIRS
if /i "%CHOICE%"=="B" goto REBASE_OURS
if /i "%CHOICE%"=="C" goto REBASE_ABORT
if /i "%CHOICE%"=="Q" goto QUIT
echo Invalid choice. Please run the script again.
pause
exit /b 1

:REBASE_THEIRS
echo.
echo Accepting incoming ^(remote^) changes for all conflicting files...
for /f "tokens=*" %%F in ('git diff --name-only --diff-filter=U') do (
    echo   Resolving: %%F
    git checkout --theirs -- "%%F"
    git add "%%F"
)
git rebase --continue
if %errorlevel% neq 0 (
    echo.
    echo Some conflicts may remain. Repeat this script or run:
    echo   git rebase --continue
)
goto DONE

:REBASE_OURS
echo.
echo Keeping your local changes for all conflicting files...
for /f "tokens=*" %%F in ('git diff --name-only --diff-filter=U') do (
    echo   Resolving: %%F
    git checkout --ours -- "%%F"
    git add "%%F"
)
git rebase --continue
if %errorlevel% neq 0 (
    echo.
    echo Some conflicts may remain. Repeat this script or run:
    echo   git rebase --continue
)
goto DONE

:REBASE_ABORT
echo.
echo Aborting rebase -- returning to your pre-rebase state...
git rebase --abort
echo Done. Your branch is back to where it was before the rebase started.
goto DONE

:: ── Active merge conflict ────────────────────────────────────────────────────
:MERGE_IN_PROGRESS
echo A merge is in progress and has hit a conflict.
echo.
echo Conflicting files:
git --no-pager diff --name-only --diff-filter=U
echo.
echo What would you like to do?
echo.
echo   [A] Accept the incoming changes ^(--theirs^) for every conflicting file
echo       ^(Use this to "take what GitHub has" -- your local edits to those
echo        specific lines will be replaced by the remote version^)
echo.
echo   [B] Keep your local changes   ^(--ours^)   for every conflicting file
echo       ^(Use this to keep exactly what you had before pulling -- the
echo        incoming remote changes to those lines will be discarded^)
echo.
echo   [C] Abort the merge entirely
echo       ^(Cancels the merge and returns your branch to its pre-merge state;
echo        your committed work is NOT lost -- you just won't have the remote
echo        changes until you try again^)
echo.
echo   [Q] Quit -- I will open the files and fix the markers manually
echo.
set /p CHOICE=Enter A, B, C or Q and press Enter: 

if /i "%CHOICE%"=="A" goto MERGE_THEIRS
if /i "%CHOICE%"=="B" goto MERGE_OURS
if /i "%CHOICE%"=="C" goto MERGE_ABORT
if /i "%CHOICE%"=="Q" goto QUIT
echo Invalid choice. Please run the script again.
pause
exit /b 1

:MERGE_THEIRS
echo.
echo Accepting incoming ^(remote^) changes for all conflicting files...
for /f "tokens=*" %%F in ('git diff --name-only --diff-filter=U') do (
    echo   Resolving: %%F
    git checkout --theirs -- "%%F"
    git add "%%F"
)
echo.
echo All conflicts resolved ^(remote version kept^).
echo Completing the merge commit...
git commit --no-edit
if %errorlevel% neq 0 (
    echo.
    echo Commit failed. You may need to run:  git commit
    echo and enter a commit message.
)
goto DONE

:MERGE_OURS
echo.
echo Keeping your local changes for all conflicting files...
for /f "tokens=*" %%F in ('git diff --name-only --diff-filter=U') do (
    echo   Resolving: %%F
    git checkout --ours -- "%%F"
    git add "%%F"
)
echo.
echo All conflicts resolved ^(local version kept^).
echo Completing the merge commit...
git commit --no-edit
if %errorlevel% neq 0 (
    echo.
    echo Commit failed. You may need to run:  git commit
    echo and enter a commit message.
)
goto DONE

:MERGE_ABORT
echo.
echo Aborting merge -- returning to your pre-merge state...
git merge --abort
echo Done. Your branch is back to where it was before the merge started.
goto DONE

:QUIT
echo.
echo No changes made. To resolve conflicts manually:
echo.
echo   1. Open each conflicting file in a text editor or VS Code.
echo   2. Search for ^<^<^<^<^<^<^< -- each block looks like:
echo.
echo         ^<^<^<^<^<^<^< HEAD
echo         ... your version ...
echo         ^=^=^=^=^=^=^=
echo         ... incoming version ...
echo         ^>^>^>^>^>^>^> origin/main
echo.
echo   3. Delete the marker lines and keep the text you want.
echo   4. Save the file.
echo   5. Run:  git add .
echo   6. Then: git commit  (for a merge) or  git rebase --continue  (for rebase)
echo.
pause
exit /b 0

:DONE
echo.
echo ============================================================
echo  Conflict resolution complete.
echo  Next step: run end_session.bat to push your changes.
echo ============================================================
echo.
pause
