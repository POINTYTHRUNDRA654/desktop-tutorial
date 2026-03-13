param(
    [string]$BlenderVersion = "3.6",
    [string]$AddonZipUrl = "https://github.com/niftools/blender_niftools_addon/releases/download/v0.1.1/blender_niftools_addon-v0.1.1-2023-11-03-0305c8d5.zip",
    [string]$TargetDir = ""
)

# Purpose: Download and install the Blender Niftools add-on (v0.1.1) for NIF export.
# On Blender 3.x: installs to scripts\addons (standard add-on path).
# On Blender 4.2+ / 5.x: still installs to scripts\addons (legacy add-on path).
#   After installation the user must:
#     1. Open Blender → Edit → Preferences → Add-ons
#     2. Enable "Allow Legacy Add-ons" (checkbox at the top of the Add-ons list)
#     3. Search for "NetImmerse" and enable "NetImmerse/Gamebryo (.nif)"
# API patches for Blender 5.x (calc_normals_split removal, etc.) are applied
# automatically by the Fallout 4 Mod Assistant add-on before every NIF export.

$ErrorActionPreference = "Stop"

# ── Determine install directory ───────────────────────────────────────────────
if (-not $TargetDir) {
    $TargetDir = "$env:APPDATA\Blender Foundation\Blender\$BlenderVersion\scripts\addons"
}

# Parse major version to detect Blender 4.2+ / 5.x
$majorMinor = $BlenderVersion -split '\.'
$major = if ($majorMinor.Count -ge 1) { [int]$majorMinor[0] } else { 3 }
$minor = if ($majorMinor.Count -ge 2) { [int]$majorMinor[1] } else { 6 }
$isModernBlender = ($major -gt 4) -or ($major -eq 4 -and $minor -ge 2)

# Ensure TLS 1.2 for GitHub downloads
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

Write-Host "Installing Niftools add-on for Blender $BlenderVersion" -ForegroundColor Cyan
Write-Host "Download: $AddonZipUrl"
Write-Host "Target:    $TargetDir"

if ($isModernBlender) {
    Write-Host ""
    Write-Host "NOTE: Blender $BlenderVersion uses the Extensions system." -ForegroundColor Yellow
    Write-Host "Niftools v0.1.1 will be installed as a Legacy Add-on." -ForegroundColor Yellow
    Write-Host "After installation you MUST:" -ForegroundColor Yellow
    Write-Host "  1. Open Blender -> Edit -> Preferences -> Add-ons" -ForegroundColor Yellow
    Write-Host "  2. Enable 'Allow Legacy Add-ons' (checkbox at top)" -ForegroundColor Yellow
    Write-Host "  3. Search for 'NetImmerse' and enable the add-on" -ForegroundColor Yellow
    Write-Host "  API patches for Blender 5.x are applied automatically." -ForegroundColor Green
    Write-Host ""
}

$tempZip = Join-Path ([System.IO.Path]::GetTempPath()) "blender_niftools_addon.zip"

try {
    if (-not (Test-Path $TargetDir)) {
        Write-Host "Creating target directory..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    }

    Write-Host "Downloading..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $AddonZipUrl -OutFile $tempZip -UseBasicParsing

    Write-Host "Extracting..." -ForegroundColor Yellow
    Expand-Archive -LiteralPath $tempZip -DestinationPath $TargetDir -Force

    Write-Host "Installed to: $TargetDir" -ForegroundColor Green
    if ($isModernBlender) {
        Write-Host "Remember: enable 'Allow Legacy Add-ons' in Blender Preferences!" -ForegroundColor Yellow
    }
    Write-Host "Restart Blender and enable: NetImmerse/Gamebryo (.nif)" -ForegroundColor Green
}
catch {
    Write-Error "Failed: $($_.Exception.Message)"
    exit 1
}
finally {
    if (Test-Path $tempZip) {
        Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
    }
}
