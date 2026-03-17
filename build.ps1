# Build script for Fallout 4 Tutorial Helper addon
# Creates a versioned archive for Blender distribution

param(
    [string]$Version = "2.3.0"
)

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $RootDir "build_temp"
$ArchiveName = "fallout4_tutorial_helper-v$Version.zip"
$ArchivePath = Join-Path $RootDir $ArchiveName

# Clean up any existing build directory
if (Test-Path $BuildDir) {
    Remove-Item $BuildDir -Recurse -Force
}

# Create build directory structure
New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
$AddonDir = Join-Path $BuildDir "fallout4_addon"
New-Item -ItemType Directory -Path $AddonDir -Force | Out-Null

# Files to exclude from the archive
$Exclude = @(
    ".git",
    ".gitignore",
    ".vscode",
    "build_temp",
    "build.log",
    "build.ps1",
    "*.zip",
    "README.md",
    ".DS_Store",
    "Thumbs.db"
)

# Copy addon files
Write-Host "Copying addon files..."
Get-ChildItem $RootDir -Exclude $Exclude | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item $_.FullName $AddonDir -Recurse -Force
    } else {
        Copy-Item $_.FullName $AddonDir -Force
    }
}

# Create archive
Write-Host "Creating archive: $ArchivePath"
if (Test-Path $ArchivePath) {
    Remove-Item $ArchivePath -Force
}

Compress-Archive -Path $AddonDir -DestinationPath $ArchivePath -CompressionLevel Optimal

Write-Host "Archive created: $ArchivePath"
Write-Host "Size: $(Get-Item $ArchivePath | Select-Object -ExpandProperty Length) bytes"

# Clean up build directory
Remove-Item $BuildDir -Recurse -Force

Write-Host "Build complete!"
