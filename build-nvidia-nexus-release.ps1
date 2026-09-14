# build-nvidia-nexus-release.ps1 -- Nexus-safe NVIDIA build for uploading to Nexus Mods.
#
# WHY THIS IS SEPARATE FROM build-nvidia.ps1:
# Nexus's review team rejected the last submission over the legacy Nexus
# personal-API-key auth path in the Mod Browser code (src/mining/modBrowser.ts)
# -- their API Acceptable Use Policy disallows a public-facing app using a
# user's personal API key instead of registered SSO/OAuth. That path is now
# gated off behind a build-time flag (mossyReleaseChannel=nexus-release,
# read via isNexusReleaseBuild() in main.ts) rather than removed from the
# source outright, so it stays fully available in your normal desktop
# builds/dev runs -- this script is the ONLY thing that sets the flag.
#
# Use build-nvidia.ps1 (unchanged) for your own day-to-day desktop use.
# Use THIS script only when building the artifact you're about to upload
# to Nexus.
#
# HOW TO RUN THIS: same as build-nvidia.ps1 -- from a normal PowerShell or
# Windows Terminal window, NOT from VS Code's integrated terminal.

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

    Write-Host "==> Running NEXUS-RELEASE build (npm run build:win:nvidia:nexus-release)..." -ForegroundColor Yellow
    Write-Host "    This build has the legacy Nexus personal-API-key auth disabled." -ForegroundColor Yellow
    npm run build:win:nvidia:nexus-release
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
