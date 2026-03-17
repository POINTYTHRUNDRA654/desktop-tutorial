param(
    [string]$DownloadUrl = "https://github.com/microsoft/DirectXTex/releases/latest/download/texconv.exe",
    [string]$TargetDir = "$PSScriptRoot/bin"
)

# Purpose: Fetch Microsoft texconv (DirectXTex) for DDS BCn conversion (BC1/BC3/BC5/BC7).
# License: MIT (DirectXTex). Source: https://github.com/microsoft/DirectXTex

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$tempPath = Join-Path ([System.IO.Path]::GetTempPath()) "texconv.exe"
$destPath = Join-Path $TargetDir "texconv.exe"

try {
    Write-Host "Downloading texconv..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $tempPath -UseBasicParsing

    Move-Item -Force $tempPath $destPath
    Write-Host "Installed: $destPath" -ForegroundColor Green
    Write-Host "Usage example: texconv.exe -f BC1_UNORM -o output input.png" -ForegroundColor Green
}
catch {
    Write-Error "Failed to download/install texconv: $($_.Exception.Message)"
    exit 1
}
finally {
    if (Test-Path $tempPath) {
        Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
    }
}
