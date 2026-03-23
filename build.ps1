# Build script for Fallout 4 Tutorial Helper addon
#
# Delegates all packaging to build_addon.py so that the zips produced here
# are identical to those created by the GitHub Actions CI workflow:
#
#   fallout4_tutorial_helper-v{VER}-blender3x.zip   (Blender 3.6 LTS)
#   fallout4_tutorial_helper-v{VER}-blender4x.zip   (Blender 4.0-4.1)
#   fallout4_tutorial_helper-v{VER}-blender42.zip   (Blender 4.2+ Extension)
#   fallout4_tutorial_helper-v{VER}-blender5x.zip   (Blender 5.x)
#
# Each zip contains a single inner folder named fallout4_tutorial_helper/
# which is required for correct Blender installation and addon import.
#
# Usage:
#   .\build.ps1            # build all four variant zips into the repo root
#   .\build.ps1 -Variant blender42   # build only one variant

param(
    [string]$Variant = "all",
    [string]$OutDir  = "."
)

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Resolve python – prefer 'python', fall back to 'python3'
$PythonExe = "python"
try {
    & $PythonExe --version 2>&1 | Out-Null
} catch {
    $PythonExe = "python3"
}

$BuildScript = Join-Path $RootDir "build_addon.py"

Write-Host "Building with: $PythonExe $BuildScript --version $Variant --outdir $OutDir"

& $PythonExe $BuildScript --version $Variant --outdir $OutDir

if ($LASTEXITCODE -ne 0) {
    Write-Error "build_addon.py failed (exit code $LASTEXITCODE)."
    exit $LASTEXITCODE
}

Write-Host "Build complete!"
