param(
    [string]$BlenderVersion = "3.6",
    [string]$AddonZipUrl = "https://github.com/niftools/blender_niftools_addon/releases/download/v0.1.1/blender_niftools_addon-v0.1.1-2023-11-03-0305c8d5.zip",
    [string]$TargetDir = "$env:APPDATA\Blender Foundation\Blender\$BlenderVersion\scripts\addons"
)

# Purpose: Download and install the Blender Niftools add-on for Fallout 4 NIF export.
# Notes:
# - v0.1.1 officially supports Blender up to 3.6 and is not marked compatible with 4.x yet.
# - If you run Blender 4.x, install 3.6 LTS alongside for the NIF export step or rely on FBX fallback.

$ErrorActionPreference = "Stop"

# Ensure TLS 1.2 for GitHub downloads
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

Write-Host "Installing Niftools add-on for Blender $BlenderVersion" -ForegroundColor Cyan
Write-Host "Download: $AddonZipUrl"
Write-Host "Target:    $TargetDir"

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
