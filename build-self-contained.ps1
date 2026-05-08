#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build Mossy as a completely self-contained application
    
.DESCRIPTION
    This script:
    1. Builds Nemotron service as standalone executable (PyInstaller)
    2. Builds Electron app (npm)
    3. Packages everything into NSIS installer
    4. Creates final setup.exe with zero external dependencies
#>

param(
    [Switch]$SkipPython,
    [Switch]$SkipElectron,
    [Switch]$SkipInstaller
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Colors for output
$colors = @{
    Success = 'Green'
    Error   = 'Red'
    Info    = 'Cyan'
    Warn    = 'Yellow'
}

function Write-Status { Write-Host "[*] $args" -ForegroundColor $colors.Info }
function Write-Success { Write-Host "[+] $args" -ForegroundColor $colors.Success }
function Write-Error { Write-Host "[!] $args" -ForegroundColor $colors.Error }
function Write-Warn { Write-Host "[⚠] $args" -ForegroundColor $colors.Warn }

$startTime = Get-Date

try {
    Write-Status "Building Mossy Self-Contained Application v5.4.24"
    Write-Status "=============================================="
    Write-Status ""
    
    # Check prerequisites
    Write-Status "Step 1: Checking prerequisites..."
    
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Python not found. Install Python 3.11+"
        exit 1
    }
    Write-Success "Python found: $pythonVersion"
    
    $npmVersion = npm --version
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm not found. Install Node.js"
        exit 1
    }
    Write-Success "npm found: $npmVersion"
    
    # Check for NSIS
    $nsisPath = "C:\Program Files (x86)\NSIS\makensis.exe"
    if (-not (Test-Path $nsisPath)) {
        Write-Warn "NSIS not found. Skipping installer build."
        Write-Warn "Download from: https://nsis.sourceforge.io/"
        $SkipInstaller = $true
    }
    else {
        Write-Success "NSIS found"
    }
    
    # ===== STEP 2: Build Nemotron Service =====
    if (-not $SkipPython) {
        Write-Status ""
        Write-Status "Step 2: Building Nemotron service executable..."
        
        # Install PyInstaller if not present
        pip show pyinstaller >$null 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Status "Installing PyInstaller..."
            pip install pyinstaller --quiet
        }
        
        # Install required dependencies
        Write-Status "Installing Nemotron dependencies..."
        pip install transformers torch torchvision torchaudio --quiet --index-url https://download.pytorch.org/whl/cpu
        
        # Build executable with PyInstaller
        Write-Status "Building executable with PyInstaller..."
        $specFile = "nemotron_service.spec"
        
        if (Test-Path "build") { Remove-Item "build" -Recurse -Force }
        if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
        
        pyinstaller --onedir --noconfirm $specFile
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "PyInstaller build failed"
            exit 1
        }
        
        Write-Success "Nemotron service built successfully"
        Write-Status "- Location: dist/nemotron-service/"
        Write-Status "- Size: $(Get-Item dist/nemotron-service/ | Measure-Object -Sum | %{"{0:N0} MB" -f ($_.Sum/1MB)})"
    }
    
    # ===== STEP 3: Build Electron App =====
    if (-not $SkipElectron) {
        Write-Status ""
        Write-Status "Step 3: Building Electron application..."
        
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Electron build failed"
            exit 1
        }
        
        Write-Success "Electron build completed"
        Write-Status "- dist/ (client bundle)"
        Write-Status "- dist-electron/ (main process)"
    }
    
    # ===== STEP 4: Create NSIS Installer =====
    if (-not $SkipInstaller) {
        Write-Status ""
        Write-Status "Step 4: Creating NSIS installer..."
        
        $nsiFile = "build\mossy-self-contained.nsi"
        if (-not (Test-Path $nsiFile)) {
            Write-Error "NSIS script not found: $nsiFile"
            exit 1
        }
        
        & $nsisPath $nsiFile
        if ($LASTEXITCODE -ne 0) {
            Write-Error "NSIS installer build failed"
            exit 1
        }
        
        Write-Success "Installer created"
        $installerPath = Get-Item "Mossy Setup *.exe" -ErrorAction SilentlyContinue | Sort LastWriteTime -Descending | Select -First 1
        if ($installerPath) {
            $size = "{0:N0} MB" -f ($installerPath.Length / 1MB)
            Write-Status "- Path: $($installerPath.FullName)"
            Write-Status "- Size: $size"
        }
    }
    
    # ===== Summary =====
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Status ""
    Write-Success "=============================================="
    Write-Success "Build completed successfully in $([math]::Round($duration, 2)) seconds"
    Write-Success "=============================================="
    Write-Status ""
    Write-Status "Mossy is now completely self-contained:"
    Write-Status "✓ Nemotron AI included"
    Write-Status "✓ No Docker required"
    Write-Status "✓ No external APIs needed"
    Write-Status "✓ Works offline"
    Write-Status ""
    Write-Status "To distribute:"
    Write-Status "1. Find: Mossy Setup 5.4.24.exe"
    Write-Status "2. Users run the installer"
    Write-Status "3. Launch Mossy - fully functional immediately"
    Write-Status ""
    
}
catch {
    Write-Error "Build failed: $_"
    exit 1
}
