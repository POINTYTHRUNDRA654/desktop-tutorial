# build-nvidia.ps1 -- Automated Mossy NVIDIA build
#
# WHY THIS EXISTS:
# The Claude Code VS Code extension holds file handles open on files inside
# this project (including release\win-unpacked\resources\app.asar) for its
# codebase-context feature. electron-builder can't delete/replace that file
# while VS Code is running, which causes the packaging step to fail with
# "The process cannot access the file because it is being used by another
# process." Fully closing VS Code releases those handles.
#
# HOW TO RUN THIS:
# Run it from a NORMAL PowerShell or Windows Terminal window -- NOT from
# VS Code's integrated terminal. If you run it from inside VS Code's
# terminal, this script gets killed the moment it closes VS Code, since
# that terminal is a child process of VS Code itself.
#
# Easiest setup: right-click this file -> "Run with PowerShell", or make a
# desktop shortcut to it. Or open Windows Terminal (not through VS Code)
# and run:  .\build-nvidia.ps1

$repoRoot = "D:\Projects\desktop-tutorial"
$buildExitCode = 1

try {
    Set-Location $repoRoot

    Write-Host "==> Closing VS Code so it releases its file locks..." -ForegroundColor Cyan
    Get-Process "Code" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2

    Write-Host "==> Cleaning release\win-unpacked..." -ForegroundColor Cyan
    if (Test-Path "release\win-unpacked") {
        Remove-Item -Recurse -Force "release\win-unpacked"
    }

    Write-Host "==> Running build (npm run build:win:nvidia)..." -ForegroundColor Cyan
    npm run build:win:nvidia
    $buildExitCode = $LASTEXITCODE

    if ($buildExitCode -eq 0) {
        Write-Host "==> Build succeeded." -ForegroundColor Green
    } else {
        Write-Host "==> Build FAILED (exit code $buildExitCode) -- scroll up for the real error." -ForegroundColor Red
    }

    Write-Host "==> Reopening VS Code..." -ForegroundColor Cyan
    Start-Process "code" -ArgumentList "`"$repoRoot`""

    Write-Host "==> Done." -ForegroundColor Cyan
}
catch {
    Write-Host "==> SCRIPT ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
}
finally {
    Write-Host ""
    Read-Host "Press Enter to close this window"
}

exit $buildExitCode
