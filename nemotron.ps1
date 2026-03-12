#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Nemotron Docker management script for Windows PowerShell

.DESCRIPTION
    Builds, starts, stops, and manages the Nemotron NeMo service container

.EXAMPLE
    .\nemotron.ps1 setup
    .\nemotron.ps1 build
    .\nemotron.ps1 up
    .\nemotron.ps1 health
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet('setup', 'build', 'up', 'down', 'logs', 'health', 'test', 'clean', 'help')]
    [string]$Command = 'help'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$composeFile = 'docker-compose.nemotron.yml'
$imageName = 'mossy-nemotron:latest'
$baseUrl = 'http://localhost:5000'

function Write-Status { Write-Host "[*] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[+] $args" -ForegroundColor Green }
function Write-Error { Write-Host "[!] $args" -ForegroundColor Red }

function Show-Help {
    Write-Host @"
Nemotron Docker Management

Usage: .\nemotron.ps1 [command]

Commands:
  setup      - First-time setup (check Docker, build, start)
  build      - Build the Docker image
  up         - Start the service
  down       - Stop the service
  logs       - View container logs
  health     - Check service health
  test       - Run a test generation
  clean      - Remove image and containers
  help       - Show this help message

Examples:
  .\nemotron.ps1 setup
  .\nemotron.ps1 health
  .\nemotron.ps1 test
"@
}

function Test-Docker {
    try {
        $version = docker --version
        Write-Success "Docker found: $version"
        return $true
    }
    catch {
        Write-Error "Docker not found. Install Docker Desktop for Windows:"
        Write-Host "  https://www.docker.com/products/docker-desktop"
        return $false
    }
}

function Test-ComposeFile {
    if (-not (Test-Path $composeFile)) {
        Write-Error "File not found: $composeFile"
        return $false
    }
    return $true
}

function Invoke-Build {
    Write-Status "Building Nemotron Docker image..."
    docker build -f Dockerfile.nemotron -t $imageName .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Build complete"
    }
    else {
        Write-Error "Build failed"
    }
}

function Invoke-Up {
    Write-Status "Starting Nemotron service..."
    docker-compose -f $composeFile up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Service started"
        Write-Host "Check health with: .\nemotron.ps1 health"
    }
    else {
        Write-Error "Failed to start service"
    }
}

function Invoke-Down {
    Write-Status "Stopping Nemotron service..."
    docker-compose -f $composeFile down
    Write-Success "Service stopped"
}

function Invoke-Logs {
    Write-Status "Showing container logs (Ctrl+C to exit)..."
    docker-compose -f $composeFile logs -f
}

function Invoke-Health {
    Write-Status "Checking service health..."
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/health" `
            -Method Get `
            -ErrorAction Stop `
            -TimeoutSec 5
        
        Write-Success "Service is healthy:"
        $response | ConvertTo-Json | Write-Host -ForegroundColor Green
    }
    catch {
        Write-Error "Service is not responding"
        Write-Host "Make sure it's running with: .\nemotron.ps1 up"
    }
}

function Invoke-Test {
    Write-Status "Testing text generation..."
    
    $body = @{
        prompt     = "Explain quantum computing in simple terms."
        max_tokens = 50
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/nemotron" `
            -Method Post `
            -Body $body `
            -ContentType "application/json" `
            -ErrorAction Stop `
            -TimeoutSec 60
        
        Write-Success "Generation successful"
        Write-Host "Prompt: $($response.prompt)" -ForegroundColor Gray
        Write-Host "Response: $($response.response)" -ForegroundColor Green
        Write-Host "Latency: $($response.latency)ms"
    }
    catch {
        Write-Error "Test failed: $($_.Exception.Message)"
    }
}

function Invoke-Clean {
    Write-Status "Cleaning up..."
    docker-compose -f $composeFile down 2>$null
    docker rmi $imageName 2>$null
    Write-Success "Cleanup complete"
}

function Invoke-Setup {
    if (-not (Test-Docker)) { return }
    if (-not (Test-ComposeFile)) { return }
    
    Write-Status "Running setup..."
    Invoke-Build
    Invoke-Up
    
    Write-Status "Waiting for service to be healthy..."
    Start-Sleep -Seconds 5
    
    Invoke-Health
}

# Route to appropriate function
switch ($Command) {
    'help' { Show-Help }
    'setup' { Invoke-Setup }
    'build' { if (Test-ComposeFile) { Invoke-Build } }
    'up' { if (Test-ComposeFile) { Invoke-Up } }
    'down' { if (Test-ComposeFile) { Invoke-Down } }
    'logs' { if (Test-ComposeFile) { Invoke-Logs } }
    'health' { Invoke-Health }
    'test' { Invoke-Test }
    'clean' { if (Test-ComposeFile) { Invoke-Clean } }
    default { Write-Error "Unknown command: $Command"; Show-Help }
}
