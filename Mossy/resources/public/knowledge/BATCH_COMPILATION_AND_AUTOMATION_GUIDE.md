# Batch Compilation & Automation Guide

## Overview

Batch compilation and automation streamline mod development workflows. They enable efficient compilation, continuous integration, and automated testing of Papyrus scripts.

**Key Concepts**:
- **Batch Compilation**: Compile multiple scripts at once
- **Project Files**: Organize compilation settings
- **Automation**: Automated workflows and CI/CD
- **Build Pipelines**: Multi-stage compilation
- **Testing**: Automated validation

---

## Batch Compilation

### Batch File Setup

Create a batch file for automated compilation:

```batch
@echo off
REM Fallout 4 Batch Compilation Script

SET CREATION_KIT=C:\Games\Fallout4\CreationKit.exe
SET SCRIPT_DIR=D:\MyMod\Scripts\Source
SET OUTPUT_DIR=D:\MyMod\Scripts
SET IMPORT_DIRS=D:\Fallout4_Data\Scripts\Source
SET PAPYRUS_FLAGS=TESV_Papyrus_Flags.flg

echo Compiling Fallout 4 scripts...
echo Source: %SCRIPT_DIR%
echo Output: %OUTPUT_DIR%

REM Compile all scripts
FOR /R "%SCRIPT_DIR%" %%F IN (*.psc) DO (
  echo Compiling: %%F
  "%CREATION_KIT%" -p "%PAPYRUS_FLAGS%" -i "%IMPORT_DIRS%" -o "%OUTPUT_DIR%" "%%F"
)

echo Compilation complete!
pause
```

### Windows PowerShell Script

Modern PowerShell automation:

```powershell
# Fallout 4 Script Compilation Script

$CreationKit = "C:\Games\Fallout4\CreationKit.exe"
$ScriptDir = "D:\MyMod\Scripts\Source"
$OutputDir = "D:\MyMod\Scripts"
$ImportDirs = "D:\Fallout4_Data\Scripts\Source"
$PapyrusFlags = "TESV_Papyrus_Flags.flg"

Write-Host "Starting Fallout 4 script compilation..."
Write-Host "Source: $ScriptDir"
Write-Host "Output: $OutputDir"

# Get all script files
$scripts = Get-ChildItem -Path $ScriptDir -Filter "*.psc" -Recurse

Write-Host "Found $($scripts.Count) scripts to compile"

# Compile each script
foreach ($script in $scripts) {
    Write-Host "Compiling: $($script.FullName)"
    
    & $CreationKit `
        -p $PapyrusFlags `
        -i $ImportDirs `
        -o $OutputDir `
        $script.FullName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK]"
    } else {
        Write-Host "  [ERROR] Exit code: $LASTEXITCODE"
    }
}

Write-Host "Compilation complete!"
```

---

## Project Files

### Creating Project Files

Project files (`.ppj`) organize compilation settings:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PapyrusProject xmlns="PapyrusProject.xsd">
  <Imports>
    <Import>D:\Fallout4_Data\Scripts\Source</Import>
  </Imports>
  <Scripts>
    <Script>MyScript.psc</Script>
    <Script>QuestScript.psc</Script>
    <Script>ActorScript.psc</Script>
  </Scripts>
  <Output>D:\MyMod\Scripts</Output>
  <Flags>TESV_Papyrus_Flags.flg</Flags>
  <Debug>True</Debug>
  <Optimization>True</Optimization>
  <Final>False</Final>
</PapyrusProject>
```

### Using Project Files

Compile with project file:

```batch
REM Use project file for compilation
CreationKit.exe -p TESV_Papyrus_Flags.flg -project MyProject.ppj
```

### Multi-Configuration Projects

Handle different compilation modes:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PapyrusProject xmlns="PapyrusProject.xsd">
  <ProjectName>MyMod</ProjectName>
  
  <!-- Development Configuration -->
  <Configuration Name="Development">
    <Output>D:\MyMod\Scripts\Development</Output>
    <Debug>True</Debug>
    <Optimization>False</Optimization>
    <Final>False</Final>
  </Configuration>
  
  <!-- Release Configuration -->
  <Configuration Name="Release">
    <Output>D:\MyMod\Scripts\Release</Output>
    <Debug>False</Debug>
    <Optimization>True</Optimization>
    <Final>True</Final>
  </Configuration>
</PapyrusProject>
```

---

## Automated Testing

### Script Validation

Test scripts for compilation errors:

```powershell
# Test all scripts compile without errors

$ScriptDir = "D:\MyMod\Scripts\Source"
$CompilationErrors = @()

$scripts = Get-ChildItem -Path $ScriptDir -Filter "*.psc" -Recurse

foreach ($script in $scripts) {
    Write-Host "Testing: $($script.Name)"
    
    # Try to compile
    $output = & CreationKit.exe -test $script.FullName 2>&1
    
    # Check for errors
    if ($output -match "ERROR") {
        $CompilationErrors += $script.FullName
        Write-Host "  [FAILED]"
    } else {
        Write-Host "  [PASSED]"
    }
}

# Report results
if ($CompilationErrors.Count -gt 0) {
    Write-Host "FAILED: $($CompilationErrors.Count) script(s) have errors"
    $CompilationErrors | ForEach-Object { Write-Host "  - $_" }
} else {
    Write-Host "SUCCESS: All scripts compiled successfully"
}
```

### Syntax Checking

Validate syntax without compilation:

```powershell
# Check syntax of all scripts

$ScriptDir = "D:\MyMod\Scripts\Source"
$SyntaxErrors = @()

$scripts = Get-ChildItem -Path $ScriptDir -Filter "*.psc" -Recurse

foreach ($script in $scripts) {
    # Check for common syntax issues
    $content = Get-Content $script.FullName
    
    # Check for unclosed blocks
    $opens = @(($content | Select-String -Pattern "^(State|Function|Event|If|While)" | Measure-Object).Count)
    $closes = @(($content | Select-String -Pattern "^(EndState|EndFunction|EndEvent|EndIf|EndWhile)" | Measure-Object).Count)
    
    if ($opens -ne $closes) {
        $SyntaxErrors += $script.FullName
        Write-Host "Syntax Error: $($script.Name) - Mismatched blocks"
    }
}

if ($SyntaxErrors.Count -gt 0) {
    Write-Host "Found $($SyntaxErrors.Count) syntax errors"
} else {
    Write-Host "All scripts pass syntax check"
}
```

---

## Build Pipeline

### Multi-Stage Compilation

Organize compilation into stages:

```powershell
# Three-stage build pipeline

Write-Host "=== Stage 1: Validate ==="
if (-not (Validate-Scripts)) {
    Write-Host "Validation failed, aborting build"
    exit 1
}

Write-Host "=== Stage 2: Compile ==="
if (-not (Compile-Scripts)) {
    Write-Host "Compilation failed, aborting build"
    exit 1
}

Write-Host "=== Stage 3: Test ==="
if (-not (Test-Scripts)) {
    Write-Host "Tests failed, aborting build"
    exit 1
}

Write-Host "=== Build Successful ==="

function Validate-Scripts {
    Write-Host "Validating script syntax..."
    # Validation logic
    return $true
}

function Compile-Scripts {
    Write-Host "Compiling scripts..."
    # Compilation logic
    return $true
}

function Test-Scripts {
    Write-Host "Testing compiled scripts..."
    # Testing logic
    return $true
}
```

### Build Configuration

Environment-specific builds:

```powershell
# Build configuration based on environment

param(
    [ValidateSet("Development", "Release", "Final")]
    [string]$Configuration = "Development"
)

$BuildConfig = @{
    Development = @{
        Debug = $true
        Optimization = $false
        Final = $false
        OutputSuffix = "_Dev"
    }
    Release = @{
        Debug = $false
        Optimization = $true
        Final = $false
        OutputSuffix = "_Release"
    }
    Final = @{
        Debug = $false
        Optimization = $true
        Final = $true
        OutputSuffix = ""
    }
}

$Config = $BuildConfig[$Configuration]

Write-Host "Building with configuration: $Configuration"
Write-Host "  Debug: $($Config.Debug)"
Write-Host "  Optimization: $($Config.Optimization)"
Write-Host "  Final: $($Config.Final)"

# Use these settings for compilation
```

---

## Continuous Integration

### GitHub Actions CI

Automated testing on GitHub:

```yaml
# .github/workflows/compile.yml

name: Compile Scripts

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'Scripts/**'
  pull_request:
    branches: [ main ]

jobs:
  compile:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Environment
      run: |
        echo "Script directory: Scripts/Source"
        dir Scripts/Source
    
    - name: Validate Scripts
      run: powershell -File Scripts/validate.ps1
    
    - name: Compile Scripts
      run: powershell -File Scripts/compile.ps1
    
    - name: Test Compilation
      run: powershell -File Scripts/test.ps1
    
    - name: Report Results
      if: always()
      run: echo "Compilation finished"
```

### GitLab CI

Alternative CI configuration:

```yaml
# .gitlab-ci.yml

stages:
  - validate
  - compile
  - test

validate:
  stage: validate
  script:
    - powershell -File scripts/validate.ps1
  only:
    - merge_requests

compile:
  stage: compile
  script:
    - powershell -File scripts/compile.ps1
  artifacts:
    paths:
      - Scripts/Compiled/

test:
  stage: test
  script:
    - powershell -File scripts/test.ps1
  dependencies:
    - compile
```

---

## Automated Packaging

### Package Creator

Create distributable packages:

```powershell
# Package compiled scripts for distribution

param(
    [string]$Version = "1.0.0",
    [string]$OutputPath = "D:\Releases"
)

$ModName = "MyMod"
$CompiledScripts = "D:\MyMod\Scripts"
$PackageName = "$ModName-$Version.7z"
$PackagePath = Join-Path $OutputPath $PackageName

Write-Host "Creating package: $PackageName"

# Create package structure
$tempDir = "D:\Temp\$ModName"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse
}

New-Item -ItemType Directory -Path $tempDir | Out-Null
Copy-Item $CompiledScripts -Destination "$tempDir\Scripts" -Recurse

# Create compressed archive
& 7z a -t7z $PackagePath $tempDir

Write-Host "Package created: $PackagePath"
Write-Host "Size: $((Get-Item $PackagePath).Length / 1MB) MB"
```

### Version Management

Manage versions automatically:

```powershell
# Increment version based on commit history

$VersionFile = "version.txt"
$CurrentVersion = Get-Content $VersionFile

# Parse version
$parts = $CurrentVersion.Split('.')
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

# Check last commit
$lastCommit = git log -1 --format=%s

if ($lastCommit -match "BREAKING") {
    $major++
    $minor = 0
    $patch = 0
} elseif ($lastCommit -match "FEATURE") {
    $minor++
    $patch = 0
} else {
    $patch++
}

$newVersion = "$major.$minor.$patch"
$newVersion | Set-Content $VersionFile

Write-Host "Version updated: $CurrentVersion -> $newVersion"
```

---

## Troubleshooting Compilation

### Common Issues

**Issue**: Scripts won't compile

```powershell
# Diagnostic script

Write-Host "Checking compilation environment..."

# Check Creation Kit exists
if (-not (Test-Path "C:\Games\Fallout4\CreationKit.exe")) {
    Write-Host "ERROR: Creation Kit not found"
}

# Check script directory
if (-not (Test-Path "Scripts\Source")) {
    Write-Host "ERROR: Script source directory not found"
}

# Check import paths
$imports = @(
    "D:\Fallout4_Data\Scripts\Source",
    "Scripts\Source"
)

foreach ($import in $imports) {
    if (Test-Path $import) {
        Write-Host "Import path OK: $import"
    } else {
        Write-Host "ERROR: Import path not found: $import"
    }
}
```

**Issue**: Slow compilation

```powershell
# Optimize compilation speed

Write-Host "Optimization tips:"
Write-Host "1. Disable debug output: -final flag"
Write-Host "2. Use project files instead of individual scripts"
Write-Host "3. Compile only changed scripts"
Write-Host "4. Use parallel compilation if available"
Write-Host "5. Check for circular dependencies"

# Check for potential issues
$ScriptDir = "Scripts\Source"
$scripts = Get-ChildItem -Path $ScriptDir -Filter "*.psc"

Write-Host "Total scripts: $($scripts.Count)"

# Find largest scripts (may be slow)
$scripts | 
    Select-Object Name, @{Name="Lines"; Expression={(Get-Content $_.FullName).Length}} |
    Sort-Object Lines -Descending |
    Select-Object -First 5 |
    ForEach-Object { Write-Host "  $($_.Name): $($_.Lines) lines" }
```

---

## Best Practices

### 1. Version Control Source Scripts
```powershell
# Good: Track .psc source files
git add Scripts/Source/*.psc

# Bad: Tracking compiled scripts
git add Scripts/*.pex
```

### 2. Automate Routine Tasks
```powershell
# Good: Automatic compilation on save
Watch-Item "Scripts\Source" -Filter "*.psc" -Action { Compile-Scripts }

# Bad: Manual compilation each time
# User runs command manually
```

### 3. Document Build Steps
```powershell
# Good: Clear documentation
Write-Host @"
Build Instructions:
1. Run 'compile.ps1' to compile scripts
2. Run 'test.ps1' to validate
3. Run 'package.ps1' to create release
"@

# Bad: No documentation
# Users guess how to build
```

### 4. Test Before Release
```powershell
# Good: Comprehensive testing
foreach ($test in $testSuite) {
    Run-Test $test
}

# Bad: No testing
# Release untested code
```

---

## Integration with IDEs

### Visual Studio Code

Setup VSCode compilation task:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Compile Scripts",
            "type": "shell",
            "command": "powershell",
            "args": [
                "-File",
                "scripts/compile.ps1"
            ],
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "problemMatcher": {
                "pattern": {
                    "regexp": "^ERROR: (.*)$",
                    "message": 1
                }
            }
        }
    ]
}
```

---

## Related Resources

- **PAPYRUS_COMPILER_GUIDE.md**: Compiler reference
- **SCRIPT_FILES_GUIDE.md**: File types and workflows
- **ERROR_HANDLING_AND_TROUBLESHOOTING_GUIDE.md**: Troubleshooting

---

## Quick Reference

| Task | Command |
|------|---------|
| Compile single script | `CreationKit.exe -p flags.flg -i imports -o output script.psc` |
| Compile with project | `CreationKit.exe -p flags.flg -project project.ppj` |
| Batch compile | Use PowerShell loop with for-each |
| Set final flags | Add `-final` flag |
| Enable optimization | Add `-op` flag |
| Get version info | `git describe --tags` |
| Create archive | `7z a -t7z package.7z folder/` |
| Run tests | PowerShell test script |
