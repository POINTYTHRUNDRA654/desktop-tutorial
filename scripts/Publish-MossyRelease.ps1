<#
.SYNOPSIS
    Publishes a new Mossy release to GitHub with the specified version.

.DESCRIPTION
    Automates the process of creating a GitHub release for Mossy.
    Finds the latest executable, creates the release, and uploads it with release notes.

.PARAMETER Version
    The version number for the release (e.g., "5.4.28").
    If not provided, extracts version from the latest .exe in the release folder.

.PARAMETER ReleaseNotes
    Custom release notes as a string. If not provided, uses default template.

.PARAMETER Draft
    If specified, creates the release as a draft instead of published.

.EXAMPLE
    .\Publish-MossyRelease.ps1 -Version "5.4.28"
    Creates published release v5.4.28 with default notes

.EXAMPLE
    .\Publish-MossyRelease.ps1 -Version "5.4.28" -ReleaseNotes "Bug fixes and improvements" -Draft
    Creates draft release with custom notes
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Version,

    [Parameter(Mandatory = $false)]
    [string]$ReleaseNotes = @"
## Installation / Setup

After downloading and launching Mossy, the program will scan your system for supported software related to its workflow features.

Before Mossy works with any detected programs, you will be asked to choose which ones you want to allow it to access. Mossy does not assume permission automatically — the user decides what Mossy is allowed to work with.

Once that is done, a built-in tutorial will walk you through the rest of the setup process and help you finish configuration step by step.

## Getting Started

* Download and install Mossy
* Open the application
* Let Mossy scan for supported programs
* Select which programs Mossy is allowed to work with
* Complete the guided tutorial

This setup process is intended to make onboarding easier while keeping the user in control.
"@,

    [Parameter(Mandatory = $false)]
    [switch]$Draft

    ,

    [Parameter(Mandatory = $false)]
    [switch]$SkipSafetySnapshot

    ,

    [Parameter(Mandatory = $false)]
    [switch]$SnapshotOnly
)

# Colors for output
$ColorSuccess = 'Green'
$ColorError = 'Red'
$ColorInfo = 'Cyan'
$ColorWarning = 'Yellow'

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    $color = switch ($Status) {
        "SUCCESS" { $ColorSuccess }
        "ERROR" { $ColorError }
        "WARNING" { $ColorWarning }
        default { $ColorInfo }
    }
    Write-Host "[$Status] $Message" -ForegroundColor $color
}

function New-SafetySnapshot {
    param([string]$RepoRoot)

    $currentBranch = (git branch --show-current 2>$null).Trim()
    if (-not $currentBranch) {
        throw "Unable to determine the current git branch."
    }

    $fullCommit = (git rev-parse HEAD 2>$null).Trim()
    $shortCommit = (git rev-parse --short HEAD 2>$null).Trim()
    if (-not $fullCommit) {
        throw "Unable to resolve current git commit."
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $snapshotDir = Join-Path $RepoRoot ".release-safety"
    if (-not (Test-Path $snapshotDir)) {
        New-Item -ItemType Directory -Path $snapshotDir | Out-Null
    }

    $backupBranch = "backup/pre-release-$timestamp"
    git show-ref --verify --quiet "refs/heads/$backupBranch"
    if ($LASTEXITCODE -eq 0) {
        $backupBranch = "$backupBranch-$shortCommit"
    }

    git branch $backupBranch $fullCommit
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create backup branch '$backupBranch'."
    }

    $workingPatchPath = Join-Path $snapshotDir "$timestamp-working.patch"
    $stagedPatchPath = Join-Path $snapshotDir "$timestamp-staged.patch"
    $metadataPath = Join-Path $snapshotDir "$timestamp-metadata.json"

    git diff --binary | Out-File -FilePath $workingPatchPath -Encoding utf8
    git diff --cached --binary | Out-File -FilePath $stagedPatchPath -Encoding utf8

    $metadata = @{
        timestamp = (Get-Date).ToString("o")
        sourceBranch = $currentBranch
        sourceCommit = $fullCommit
        backupBranch = $backupBranch
        workingPatch = $workingPatchPath
        stagedPatch = $stagedPatchPath
    } | ConvertTo-Json
    Set-Content -Path $metadataPath -Value $metadata -Encoding utf8

    return @{
        BackupBranch = $backupBranch
        SourceBranch = $currentBranch
        SourceCommit = $shortCommit
        WorkingPatch = $workingPatchPath
        StagedPatch = $stagedPatchPath
    }
}

try {
    Write-Status "Starting Mossy release process..." "INFO"

    # Ensure script runs from repository root context
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    Push-Location $repoRoot

    if (-not $SkipSafetySnapshot) {
        Write-Status "Creating pre-release safety snapshot..." "INFO"
        $snapshot = New-SafetySnapshot -RepoRoot $repoRoot
        Write-Status "Safety snapshot created on branch $($snapshot.BackupBranch)" "SUCCESS"
        Write-Status "Rollback command: git switch $($snapshot.BackupBranch)" "INFO"
        Write-Status "Patch backups: $($snapshot.WorkingPatch), $($snapshot.StagedPatch)" "INFO"
    }

    if ($SnapshotOnly) {
        if ($SkipSafetySnapshot) {
            throw "SnapshotOnly cannot be combined with SkipSafetySnapshot."
        }

        Write-Status "Snapshot-only mode complete. No release was created." "SUCCESS"
        exit 0
    }

    # Verify gh is installed
    $ghVersion = gh --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub CLI (gh) is not installed or not in PATH. Please install it first."
    }
    Write-Status "GitHub CLI verified: $($ghVersion[0])" "SUCCESS"

    # Get the release directory
    $releaseDir = Join-Path $PSScriptRoot ".." "release"
    if (-not (Test-Path $releaseDir)) {
        throw "Release directory not found at $releaseDir"
    }

    # If version not provided, extract from latest .exe
    if (-not $Version) {
        $latestExe = Get-ChildItem $releaseDir -Filter "Mossy*.exe" -ErrorAction SilentlyContinue |
        Sort-Object CreationTime -Descending |
        Select-Object -First 1

        if (-not $latestExe) {
            throw "No Mossy exe files found in $releaseDir"
        }

        # Extract version from filename (e.g., "Mossy 5.4.27.exe" -> "5.4.27")
        if ($latestExe.BaseName -match "Mossy\s+([\d.]+)") {
            $Version = $matches[1]
            Write-Status "Version extracted from file: $Version" "INFO"
        }
        else {
            throw "Could not extract version from filename: $($latestExe.Name)"
        }

        $exePath = $latestExe.FullName
    }
    else {
        # Find exe matching the version
        $exePath = Join-Path $releaseDir "Mossy $Version.exe"
        if (-not (Test-Path $exePath)) {
            throw "Exe file not found: $exePath"
        }
    }

    Write-Status "Using executable: $([System.IO.Path]::GetFileName($exePath))" "INFO"

    # Verify version matches package.json
    $pkgJsonPath = Join-Path $PSScriptRoot ".." "package.json"
    if (Test-Path $pkgJsonPath) {
        $pkgVersion = (Get-Content $pkgJsonPath -Raw | ConvertFrom-Json).version
        if ($Version -and $Version -ne $pkgVersion) {
            throw "Version mismatch: provided version '$Version' does not match package.json version '$pkgVersion'. Update package.json first, then rebuild before publishing."
        }
        Write-Status "✅ Version $Version matches package.json version $pkgVersion" "SUCCESS"
    }

    # Prepare the release tag
    $tag = "v$Version"

    # Check if release already exists
    gh release view $tag 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Release $tag already exists. Skipping creation." "WARNING"
        Write-Status "You can add files with: gh release upload $tag `"<file>`"" "INFO"
        exit 0
    }

    # Build the gh command
    $ghArgs = @(
        "release", "create", $tag,
        "`"$exePath`"",
        "--title", "`"Mossy v$Version`"",
        "--notes", "`"$ReleaseNotes`""
    )

    if ($Draft) {
        $ghArgs += "--draft"
        Write-Status "Creating DRAFT release..." "INFO"
    }
    else {
        Write-Status "Creating published release..." "INFO"
    }

    # Create the release
    Write-Status "Uploading executable (this may take a moment)..." "INFO"
    
    $cmd = "gh $($ghArgs -join ' ')"
    Invoke-Expression $cmd

    if ($LASTEXITCODE -eq 0) {
        Write-Status "Release $tag created successfully!" "SUCCESS"
        Write-Status "Release URL: https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases/tag/$tag" "INFO"
    }
    else {
        throw "Failed to create release"
    }
}
catch {
    Write-Status $_.Exception.Message "ERROR"
    exit 1
}
finally {
    Pop-Location
}
