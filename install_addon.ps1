#Requires -Version 5.1
<#
.SYNOPSIS
    Pull latest code, rebuild zips, and install the addon straight into Blender.

.DESCRIPTION
    Steps performed:
      1. git pull --rebase  (get the newest code from GitHub)
      2. python build_addon.py  (rebuild all four Blender-version zips)
      3. Auto-detect the highest Blender version installed on this PC
      4. Extract the matching zip into Blender's add-on / extension folder

    Supported Blender versions: 3.6 LTS, 4.0-4.1, 4.2+, 5.x

.EXAMPLE
    # Recommended — double-click install_addon.bat (no policy prompt)
    # Or right-click this file and choose "Run with PowerShell"
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Repo root = folder that contains this script ─────────────────────────────
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Fallout 4 Mod Assistant  --  Build and Install"             -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

try {

# ── 1. Pull latest code from GitHub ──────────────────────────────────────────
Write-Host "[1/4] Pulling latest code from GitHub..." -ForegroundColor Yellow
Set-Location $RepoDir
$pullOut = & git pull --rebase origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warning "git pull failed — building from current local code instead."
    Write-Warning ($pullOut -join "`n")
} else {
    Write-Host ($pullOut -join "`n")
}
Write-Host ""

# ── 2. Build all zip variants ─────────────────────────────────────────────────
Write-Host "[2/4] Building addon zips..." -ForegroundColor Yellow

# Try 'python' first (Windows standard), fall back to 'python3' (WSL / some installs)
$pythonCmd = $null
foreach ($cmd in @("python", "python3")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $pythonCmd = $cmd
        break
    }
}
if (-not $pythonCmd) {
    throw "Python not found. Install Python 3.x and make sure it is in your PATH."
}

& $pythonCmd "$RepoDir\build_addon.py" --outdir "$RepoDir"
if ($LASTEXITCODE -ne 0) { throw "build_addon.py failed — see output above." }
Write-Host ""

# ── 3. Detect the newest Blender version installed ───────────────────────────
Write-Host "[3/4] Detecting Blender installation..." -ForegroundColor Yellow

$blenderBase = Join-Path $env:APPDATA "Blender Foundation\Blender"
if (-not (Test-Path $blenderBase)) {
    throw "Blender not found at:`n  $blenderBase`nInstall Blender first, then run this script again."
}

$blenderVersionDirs = Get-ChildItem $blenderBase -Directory |
    Where-Object { $_.Name -match '^\d+\.\d+' } |
    Sort-Object { [version]$_.Name } -Descending

if (-not $blenderVersionDirs) {
    throw "No Blender version folders found in:`n  $blenderBase"
}

$blenderDir = $blenderVersionDirs[0].FullName
$blenderVer = [version]$blenderVersionDirs[0].Name
Write-Host "  Found Blender $blenderVer"
Write-Host "  Path: $blenderDir"
Write-Host ""

# ── 4. Choose the right zip variant and install ───────────────────────────────
Write-Host "[4/4] Installing addon into Blender $blenderVer..." -ForegroundColor Yellow

if ($blenderVer -ge [version]"5.0") {
    # Blender 5.x — Extension format, files at zip root
    $variant     = "blender5x"
    $isExtension = $true
    $destDir     = Join-Path $blenderDir "extensions\user_default\blender_game_tools"
} elseif ($blenderVer -ge [version]"4.2") {
    # Blender 4.2+ — Extension format, files at zip root
    $variant     = "blender42"
    $isExtension = $true
    $destDir     = Join-Path $blenderDir "extensions\user_default\blender_game_tools"
} elseif ($blenderVer -ge [version]"4.0") {
    # Blender 4.0-4.1 — legacy add-on format, zip has blender_game_tools/ subfolder
    $variant     = "blender4x"
    $isExtension = $false
    $destDir     = Join-Path $blenderDir "scripts\addons"
} else {
    # Blender 3.x — legacy add-on format
    $variant     = "blender3x"
    $isExtension = $false
    $destDir     = Join-Path $blenderDir "scripts\addons"
}

# Locate the built zip
$zipFile = Get-ChildItem $RepoDir -Filter "blender_game_tools-v*-$variant.zip" |
           Select-Object -First 1
if (-not $zipFile) {
    throw "Zip not found for variant '$variant' in:`n  $RepoDir"
}

Write-Host "  Zip:  $($zipFile.Name)"
Write-Host "  Into: $destDir"
Write-Host ""

if ($isExtension) {
    # Extension zips have all files at the root.
    # They must be extracted *into* a named extension subfolder.
    if (Test-Path $destDir) { Remove-Item $destDir -Recurse -Force }
    New-Item $destDir -ItemType Directory -Force | Out-Null
    Expand-Archive -Path $zipFile.FullName -DestinationPath $destDir -Force

} else {
    # Legacy add-on zips have a blender_game_tools/ subfolder inside.
    # Extract to the addons folder; the subfolder becomes the add-on module.
    $addonDir = Join-Path $destDir "blender_game_tools"
    if (Test-Path $addonDir) { Remove-Item $addonDir -Recurse -Force }
    New-Item $destDir -ItemType Directory -Force | Out-Null
    Expand-Archive -Path $zipFile.FullName -DestinationPath $destDir -Force
}

Write-Host "============================================================" -ForegroundColor Green
Write-Host " Done!  Addon installed for Blender $blenderVer"             -ForegroundColor Green
Write-Host " Restart Blender (or reload scripts) to activate the update."-ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

} catch {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host " ERROR: $_"                                                    -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

Read-Host "Press Enter to close"
