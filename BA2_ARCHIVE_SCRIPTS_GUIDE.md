# BA2 Archive Management Scripts - Complete Guide for Fallout 4

## What are BA2 Archives?

**BA2 (Bethesda Archive Version 2)** is the proprietary archive format used by Fallout 4 to package game assets into compressed containers.

### Why Use BA2 Archives?

**Benefits:**
- ✅ **Performance:** Faster loading than loose files
- ✅ **Organization:** Clean Data folder
- ✅ **Compatibility:** Required for Bethesda.net mods
- ✅ **Distribution:** Single file vs thousands
- ✅ **Protection:** Assets harder to extract/modify
- ✅ **Compression:** Smaller download size

**Drawbacks:**
- ❌ **Harder to modify:** Must extract → edit → repack
- ❌ **Load order matters:** Later archives override earlier ones
- ❌ **Creation Kit required:** Or third-party tools

---

## BA2 Archive Types

Fallout 4 uses **three types** of BA2 archives:

### 1. **General Archives** (Main)
**Extension:** `.ba2` (e.g., `MyMod - Main.ba2`)

**Contains:**
- Meshes (`.nif`)
- Materials (`.bgsm`, `.bgem`)
- Scripts (`.pex`)
- Misc files (`.xml`, `.txt`)
- Sounds (`.xwm`, `.fuz`)

**Compression:** LZ4 or None

### 2. **Texture Archives**
**Extension:** `.ba2` (e.g., `MyMod - Textures.ba2`)

**Contains:**
- Textures (`.dds`)
- All texture types (diffuse, normal, specular, etc.)

**Compression:** DXT (built-in DDS compression)

**Special:** Name MUST end with `- Textures.ba2`

### 3. **DLC Archives**
**Extension:** `.ba2` (e.g., `DLCRobot - Main.ba2`)

**Contains:** Same as General Archives

**Difference:** DLC prefix recognized by game

---

## Tools for BA2 Management

### 1. **Archive2.exe** (Official)

**Location:** `Fallout 4\Tools\Archive2\Archive2.exe`

**Source:** Comes with Creation Kit

**Pros:**
- ✅ Official Bethesda tool
- ✅ Supports all BA2 features
- ✅ Command-line scriptable
- ✅ Most reliable

**Cons:**
- ❌ Creation Kit required
- ❌ No GUI
- ❌ Complex syntax

**Download:** Install Creation Kit from Bethesda Launcher

### 2. **BSArch** (Third-Party)

**Developer:** Elminster (xEdit team)

**Pros:**
- ✅ Open source
- ✅ Cross-platform (Windows, Linux)
- ✅ Command-line
- ✅ Simple syntax
- ✅ No CK required

**Cons:**
- ⚠️ May not support latest BA2 features

**Download:** https://github.com/TES5Edit/BSArch

### 3. **B.A.E. (Bethesda Archive Extractor)**

**Purpose:** GUI tool for browsing/extracting

**Pros:**
- ✅ User-friendly GUI
- ✅ Preview files
- ✅ Drag and drop extraction

**Cons:**
- ❌ Cannot create BA2s
- ❌ Extract only

**Download:** Nexus Mods

### 4. **Cathedral Assets Optimizer** (CAO)

**Purpose:** Batch optimize and pack assets

**Pros:**
- ✅ Automated optimization
- ✅ Texture compression
- ✅ NIF optimization
- ✅ BA2 packing

**Cons:**
- ⚠️ Learning curve
- ⚠️ May alter assets

**Download:** Nexus Mods

---

## Archive2.exe Complete Reference

### Command Syntax

```batch
Archive2.exe <archive.ba2> [options]
```

### Common Operations

**Create Archive:**
```batch
Archive2.exe MyMod.ba2 -c=MyMod.txt -root="D:\MyMod\Data" -fo4
```

**Extract Archive:**
```batch
Archive2.exe MyMod.ba2 -x -d="D:\Extracted"
```

**List Contents:**
```batch
Archive2.exe MyMod.ba2 -l
```

### Options Reference

| Option | Description | Example |
|--------|-------------|---------|
| `-c=<file>` | Create archive from file list | `-c=filelist.txt` |
| `-x` | Extract archive | `-x` |
| `-d=<dir>` | Extract to directory | `-d="C:\Output"` |
| `-l` | List contents | `-l` |
| `-root=<dir>` | Root directory for packing | `-root="D:\MyMod\Data"` |
| `-fo4` | Fallout 4 format | `-fo4` |
| `-fo4dds` | FO4 texture archive | `-fo4dds` |
| `-compression=<type>` | Compression method | `-compression=lz4` |

### Compression Types

| Type | Usage | Speed | Ratio |
|------|-------|-------|-------|
| `none` | No compression | Fastest | 1:1 |
| `lz4` | General archives | Fast | 2:1 |
| `zip` | Legacy (don't use) | Medium | 2:1 |

**Note:** Texture archives always use DXT (automatic)

---

## Creating BA2 Archives

### Method 1: Archive2.exe (Manual)

**Step 1: Organize Your Files**
```
MyMod/
├── Textures/
│   ├── Weapons/
│   │   └── MyWeapon_d.dds
│   └── Armor/
│       └── MyArmor_d.dds
├── Meshes/
│   └── Weapons/
│       └── MyWeapon.nif
└── Materials/
    └── Weapons/
        └── MyWeapon.bgsm
```

**Step 2: Create File List**

Create `MyMod_Main.txt`:
```
Meshes\Weapons\MyWeapon.nif
Materials\Weapons\MyWeapon.bgsm
```

Create `MyMod_Textures.txt`:
```
Textures\Weapons\MyWeapon_d.dds
Textures\Armor\MyArmor_d.dds
```

**Step 3: Run Archive2**

**For Main Archive:**
```batch
cd "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Tools\Archive2"

Archive2.exe "D:\MyMod\MyMod - Main.ba2" ^
  -c="D:\MyMod\MyMod_Main.txt" ^
  -root="D:\MyMod" ^
  -fo4 ^
  -compression=lz4
```

**For Texture Archive:**
```batch
Archive2.exe "D:\MyMod\MyMod - Textures.ba2" ^
  -c="D:\MyMod\MyMod_Textures.txt" ^
  -root="D:\MyMod" ^
  -fo4dds
```

**Step 4: Verify**
```batch
Archive2.exe "D:\MyMod\MyMod - Main.ba2" -l
```

### Method 2: Automated PowerShell Script

**Script: `Create-BA2.ps1`**

```powershell
<#
.SYNOPSIS
    Automatically creates BA2 archives for Fallout 4 mods
.DESCRIPTION
    Scans mod folder, separates textures from other assets,
    creates optimized BA2 archives automatically
.PARAMETER ModPath
    Path to mod folder containing loose files
.PARAMETER OutputPath
    Path to save BA2 archives
.PARAMETER ModName
    Name of mod (used for archive names)
.EXAMPLE
    .\Create-BA2.ps1 -ModPath "D:\MyMod" -OutputPath "D:\Output" -ModName "MyWeaponMod"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ModPath,
    
    [Parameter(Mandatory=$true)]
    [string]$OutputPath,
    
    [Parameter(Mandatory=$true)]
    [string]$ModName
)

# Configuration
$Archive2Path = "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Tools\Archive2\Archive2.exe"
$TempPath = "$env:TEMP\BA2Temp"

# Verify Archive2.exe exists
if (-not (Test-Path $Archive2Path)) {
    Write-Error "Archive2.exe not found at: $Archive2Path"
    Write-Error "Please install Creation Kit or update path"
    exit 1
}

# Create temp directory
New-Item -ItemType Directory -Path $TempPath -Force | Out-Null

Write-Host "Scanning mod files..." -ForegroundColor Cyan

# Get all files recursively
$AllFiles = Get-ChildItem -Path $ModPath -Recurse -File

# Separate textures from other files
$TextureFiles = $AllFiles | Where-Object { $_.Extension -eq ".dds" }
$MainFiles = $AllFiles | Where-Object { $_.Extension -ne ".dds" }

Write-Host "Found $($MainFiles.Count) main files and $($TextureFiles.Count) texture files" -ForegroundColor Green

# Create file lists
$MainListPath = "$TempPath\${ModName}_Main.txt"
$TextureListPath = "$TempPath\${ModName}_Textures.txt"

# Generate main file list
if ($MainFiles.Count -gt 0) {
    $MainFiles | ForEach-Object {
        $RelativePath = $_.FullName.Substring($ModPath.Length + 1)
        Add-Content -Path $MainListPath -Value $RelativePath
    }
    
    Write-Host "Creating Main archive..." -ForegroundColor Cyan
    
    $MainArchive = "$OutputPath\$ModName - Main.ba2"
    
    & $Archive2Path $MainArchive `
        "-c=$MainListPath" `
        "-root=$ModPath" `
        "-fo4" `
        "-compression=lz4"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Main archive created: $MainArchive" -ForegroundColor Green
        $MainSize = (Get-Item $MainArchive).Length / 1MB
        Write-Host "  Size: $([math]::Round($MainSize, 2)) MB" -ForegroundColor White
    } else {
        Write-Error "Failed to create Main archive"
    }
}

# Generate texture file list
if ($TextureFiles.Count -gt 0) {
    $TextureFiles | ForEach-Object {
        $RelativePath = $_.FullName.Substring($ModPath.Length + 1)
        Add-Content -Path $TextureListPath -Value $RelativePath
    }
    
    Write-Host "Creating Texture archive..." -ForegroundColor Cyan
    
    $TextureArchive = "$OutputPath\$ModName - Textures.ba2"
    
    & $Archive2Path $TextureArchive `
        "-c=$TextureListPath" `
        "-root=$ModPath" `
        "-fo4dds"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Texture archive created: $TextureArchive" -ForegroundColor Green
        $TextureSize = (Get-Item $TextureArchive).Length / 1MB
        Write-Host "  Size: $([math]::Round($TextureSize, 2)) MB" -ForegroundColor White
    } else {
        Write-Error "Failed to create Texture archive"
    }
}

# Cleanup temp files
Remove-Item -Path $TempPath -Recurse -Force

Write-Host "`nBA2 creation complete!" -ForegroundColor Green
Write-Host "Archives saved to: $OutputPath" -ForegroundColor Cyan
```

**Usage:**
```powershell
.\Create-BA2.ps1 -ModPath "D:\MyMod" -OutputPath "D:\FalloutMods" -ModName "MyWeaponPack"
```

**Output:**
```
Scanning mod files...
Found 15 main files and 30 texture files
Creating Main archive...
✓ Main archive created: D:\FalloutMods\MyWeaponPack - Main.ba2
  Size: 5.43 MB
Creating Texture archive...
✓ Texture archive created: D:\FalloutMods\MyWeaponPack - Textures.ba2
  Size: 128.76 MB

BA2 creation complete!
Archives saved to: D:\FalloutMods
```

---

## Merging Multiple Mods into BA2

### Scenario: Merge 3 Weapon Mods

**Goal:** Combine multiple mods into single BA2 for performance

**Mods to Merge:**
- WeaponMod1 (10 files)
- WeaponMod2 (8 files)
- WeaponMod3 (12 files)

**Result:** WeaponCollection.ba2 (30 files)

### PowerShell Script: `Merge-ModsToBA2.ps1`

```powershell
<#
.SYNOPSIS
    Merges multiple mods into a single BA2 archive
.DESCRIPTION
    Takes multiple mod folders, consolidates files, handles conflicts,
    creates unified BA2 archive
.PARAMETER ModPaths
    Array of paths to mods to merge
.PARAMETER OutputName
    Name for merged mod
.PARAMETER ConflictResolution
    How to handle file conflicts: "UseFirst", "UseLast", "Prompt"
.EXAMPLE
    .\Merge-ModsToBA2.ps1 -ModPaths @("D:\Mod1", "D:\Mod2") -OutputName "MergedMod"
#>

param(
    [Parameter(Mandatory=$true)]
    [string[]]$ModPaths,
    
    [Parameter(Mandatory=$true)]
    [string]$OutputName,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("UseFirst", "UseLast", "Prompt")]
    [string]$ConflictResolution = "UseLast",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "$env:USERPROFILE\Desktop"
)

$Archive2Path = "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Tools\Archive2\Archive2.exe"
$TempMerge = "$env:TEMP\BA2Merge_$([guid]::NewGuid().ToString('N'))"

# Create temp merge directory
New-Item -ItemType Directory -Path $TempMerge -Force | Out-Null

Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         FALLOUT 4 MOD MERGER TO BA2          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan

# File tracking
$FileRegistry = @{}
$Conflicts = @()

# Process each mod
foreach ($ModPath in $ModPaths) {
    if (-not (Test-Path $ModPath)) {
        Write-Warning "Mod path not found: $ModPath (skipping)"
        continue
    }
    
    $ModName = Split-Path $ModPath -Leaf
    Write-Host "`nProcessing: $ModName" -ForegroundColor Yellow
    
    $Files = Get-ChildItem -Path $ModPath -Recurse -File
    Write-Host "  Files: $($Files.Count)" -ForegroundColor White
    
    foreach ($File in $Files) {
        $RelativePath = $File.FullName.Substring($ModPath.Length + 1)
        $DestPath = Join-Path $TempMerge $RelativePath
        
        # Check for conflicts
        if ($FileRegistry.ContainsKey($RelativePath)) {
            $Conflicts += [PSCustomObject]@{
                File = $RelativePath
                Mod1 = $FileRegistry[$RelativePath]
                Mod2 = $ModName
            }
            
            # Handle conflict
            switch ($ConflictResolution) {
                "UseFirst" {
                    Write-Host "  CONFLICT: $RelativePath (keeping first)" -ForegroundColor Red
                    continue # Skip this file
                }
                "UseLast" {
                    Write-Host "  CONFLICT: $RelativePath (using latest)" -ForegroundColor Yellow
                    # Will overwrite below
                }
                "Prompt" {
                    $Choice = Read-Host "  CONFLICT: $RelativePath`n  Keep [1] $($FileRegistry[$RelativePath]) or [2] $ModName ?"
                    if ($Choice -ne "2") {
                        continue # Skip
                    }
                }
            }
        }
        
        # Copy file
        $DestDir = Split-Path $DestPath -Parent
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        Copy-Item -Path $File.FullName -Destination $DestPath -Force
        
        $FileRegistry[$RelativePath] = $ModName
    }
}

Write-Host "`n" + ("─" * 47) -ForegroundColor Cyan
Write-Host "Merge Summary:" -ForegroundColor Green
Write-Host "  Total files: $($FileRegistry.Count)" -ForegroundColor White
Write-Host "  Conflicts: $($Conflicts.Count)" -ForegroundColor White

if ($Conflicts.Count -gt 0) {
    Write-Host "`nConflicts:" -ForegroundColor Yellow
    $Conflicts | ForEach-Object {
        Write-Host "  • $($_.File)" -ForegroundColor White
        Write-Host "    $($_.Mod1) → $($_.Mod2)" -ForegroundColor Gray
    }
}

# Now create BA2 from merged folder
Write-Host "`nCreating BA2 archive..." -ForegroundColor Cyan

# Separate textures and main files
$AllFiles = Get-ChildItem -Path $TempMerge -Recurse -File
$TextureFiles = $AllFiles | Where-Object { $_.Extension -eq ".dds" }
$MainFiles = $AllFiles | Where-Object { $_.Extension -ne ".dds" }

# Create file lists
$MainList = "$TempMerge\main.txt"
$TextureList = "$TempMerge\textures.txt"

# Main files
if ($MainFiles.Count -gt 0) {
    $MainFiles | ForEach-Object {
        $RelPath = $_.FullName.Substring($TempMerge.Length + 1)
        Add-Content -Path $MainList -Value $RelPath
    }
    
    $MainArchive = "$OutputPath\$OutputName - Main.ba2"
    & $Archive2Path $MainArchive "-c=$MainList" "-root=$TempMerge" "-fo4" "-compression=lz4"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $OutputName - Main.ba2" -ForegroundColor Green
    }
}

# Texture files
if ($TextureFiles.Count -gt 0) {
    $TextureFiles | ForEach-Object {
        $RelPath = $_.FullName.Substring($TempMerge.Length + 1)
        Add-Content -Path $TextureList -Value $RelPath
    }
    
    $TextureArchive = "$OutputPath\$OutputName - Textures.ba2"
    & $Archive2Path $TextureArchive "-c=$TextureList" "-root=$TempMerge" "-fo4dds"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $OutputName - Textures.ba2" -ForegroundColor Green
    }
}

# Cleanup
Remove-Item -Path $TempMerge -Recurse -Force

Write-Host "`n╔═══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║            MERGE COMPLETE!                    ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host "Output: $OutputPath" -ForegroundColor Cyan
```

**Usage:**
```powershell
.\Merge-ModsToBA2.ps1 `
    -ModPaths @("D:\Mods\WeaponPack1", "D:\Mods\WeaponPack2", "D:\Mods\WeaponPack3") `
    -OutputName "AllWeapons" `
    -ConflictResolution "UseLast"
```

**Output:**
```
╔═══════════════════════════════════════════════╗
║         FALLOUT 4 MOD MERGER TO BA2          ║
╚═══════════════════════════════════════════════╝

Processing: WeaponPack1
  Files: 10

Processing: WeaponPack2
  Files: 8
  CONFLICT: Textures\Weapons\Common_d.dds (using latest)

Processing: WeaponPack3
  Files: 12
  CONFLICT: Meshes\Weapons\Barrel.nif (using latest)

───────────────────────────────────────────────
Merge Summary:
  Total files: 28
  Conflicts: 2

Conflicts:
  • Textures\Weapons\Common_d.dds
    WeaponPack1 → WeaponPack2
  • Meshes\Weapons\Barrel.nif
    WeaponPack2 → WeaponPack3

Creating BA2 archive...
✓ AllWeapons - Main.ba2
✓ AllWeapons - Textures.ba2

╔═══════════════════════════════════════════════╗
║            MERGE COMPLETE!                    ║
╚═══════════════════════════════════════════════╝
Output: C:\Users\YourName\Desktop
```

---

## Merging Mod Files into Original BA2

### WARNING: Modifying Official Archives

**⚠️ IMPORTANT:** Modifying official Fallout 4 BA2 files is **NOT RECOMMENDED** for several reasons:

1. **Steam Verification:** Will detect modified files and redownload
2. **Updates:** Game updates will overwrite your changes
3. **Multiplayer:** May cause issues in Fallout 76 (if applicable)
4. **Mod Conflicts:** Hard to track what's been changed
5. **Backup Required:** Must backup originals first

**Better Alternative:** Create separate BA2 that loads AFTER vanilla (load order)

### If You Must Merge (Educational Purposes)

**Scenario:** Add custom textures to `Fallout4 - Textures1.ba2`

### Script: `Merge-IntoVanillaBA2.ps1`

```powershell
<#
.SYNOPSIS
    Merges mod files into original Fallout 4 BA2 (NOT RECOMMENDED)
.DESCRIPTION
    Extracts vanilla BA2, adds mod files, repacks
    FOR EDUCATIONAL PURPOSES ONLY
.PARAMETER VanillaBA2
    Path to vanilla BA2
.PARAMETER ModFiles
    Path to mod files to merge
.PARAMETER BackupPath
    Path to save backup
.EXAMPLE
    .\Merge-IntoVanillaBA2.ps1 -VanillaBA2 "F4\Fallout4 - Textures1.ba2" -ModFiles "D:\MyTextures"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$VanillaBA2,
    
    [Parameter(Mandatory=$true)]
    [string]$ModFiles,
    
    [Parameter(Mandatory=$false)]
    [string]$BackupPath = "$env:USERPROFILE\Desktop\BA2_Backups"
)

Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║              ⚠️ WARNING ⚠️                    ║" -ForegroundColor Red
Write-Host "║  Modifying vanilla BA2 is NOT RECOMMENDED!   ║" -ForegroundColor Red
Write-Host "║  This may cause issues with game updates.   ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Red

$Confirm = Read-Host "Type 'I UNDERSTAND' to continue"
if ($Confirm -ne "I UNDERSTAND") {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

$Archive2Path = "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Tools\Archive2\Archive2.exe"
$TempExtract = "$env:TEMP\BA2Extract_$([guid]::NewGuid().ToString('N'))"

# Verify files exist
if (-not (Test-Path $VanillaBA2)) {
    Write-Error "Vanilla BA2 not found: $VanillaBA2"
    exit 1
}

if (-not (Test-Path $ModFiles)) {
    Write-Error "Mod files not found: $ModFiles"
    exit 1
}

# Create backup
Write-Host "`nCreating backup..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
$BackupFile = Join-Path $BackupPath (Split-Path $VanillaBA2 -Leaf)
Copy-Item -Path $VanillaBA2 -Destination $BackupFile -Force
Write-Host "✓ Backup saved: $BackupFile" -ForegroundColor Green

# Extract vanilla BA2
Write-Host "`nExtracting vanilla BA2..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $TempExtract -Force | Out-Null
& $Archive2Path $VanillaBA2 "-x" "-d=$TempExtract"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to extract vanilla BA2"
    exit 1
}

$VanillaFileCount = (Get-ChildItem -Path $TempExtract -Recurse -File).Count
Write-Host "✓ Extracted $VanillaFileCount files" -ForegroundColor Green

# Copy mod files
Write-Host "`nMerging mod files..." -ForegroundColor Cyan
$ModFilesList = Get-ChildItem -Path $ModFiles -Recurse -File

foreach ($File in $ModFilesList) {
    $RelativePath = $File.FullName.Substring($ModFiles.Length + 1)
    $DestPath = Join-Path $TempExtract $RelativePath
    $DestDir = Split-Path $DestPath -Parent
    
    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
    Copy-Item -Path $File.FullName -Destination $DestPath -Force
    
    Write-Host "  + $RelativePath" -ForegroundColor Yellow
}

Write-Host "✓ Merged $($ModFilesList.Count) mod files" -ForegroundColor Green

# Repack BA2
Write-Host "`nRepacking BA2..." -ForegroundColor Cyan

# Detect archive type
$IsTextureArchive = $VanillaBA2 -match "Textures"
$ArchiveType = if ($IsTextureArchive) { "-fo4dds" } else { "-fo4" }

# Create file list
$FileList = "$TempExtract\filelist.txt"
Get-ChildItem -Path $TempExtract -Recurse -File | ForEach-Object {
    if ($_.Name -ne "filelist.txt") {
        $RelPath = $_.FullName.Substring($TempExtract.Length + 1)
        Add-Content -Path $FileList -Value $RelPath
    }
}

# Create new BA2
$TempBA2 = "$TempExtract\temp.ba2"
& $Archive2Path $TempBA2 "-c=$FileList" "-root=$TempExtract" $ArchiveType

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create new BA2"
    exit 1
}

# Replace original
Write-Host "`nReplacing original BA2..." -ForegroundColor Cyan
Move-Item -Path $TempBA2 -Destination $VanillaBA2 -Force

# Cleanup
Remove-Item -Path $TempExtract -Recurse -Force

Write-Host "`n╔═══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║            MERGE COMPLETE!                    ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host "Modified: $VanillaBA2" -ForegroundColor Yellow
Write-Host "Backup: $BackupFile" -ForegroundColor Cyan
Write-Host "`n⚠️ Remember: Steam may redownload this file!" -ForegroundColor Red
```

**Usage:**
```powershell
.\Merge-IntoVanillaBA2.ps1 `
    -VanillaBA2 "C:\Games\Fallout4\Data\Fallout4 - Textures1.ba2" `
    -ModFiles "D:\MyCustomTextures"
```

---

## Batch BA2 Creation Script

**For Mod Authors:** Process multiple mods at once

### Script: `Batch-CreateBA2.ps1`

```powershell
<#
.SYNOPSIS
    Batch creates BA2 archives for multiple mods
.DESCRIPTION
    Scans a directory containing multiple mod folders,
    creates BA2 archives for each automatically
.PARAMETER ModsDirectory
    Directory containing mod folders
.PARAMETER OutputDirectory
    Directory to save BA2 archives
.EXAMPLE
    .\Batch-CreateBA2.ps1 -ModsDirectory "D:\ModProjects" -OutputDirectory "D:\Release"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ModsDirectory,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDirectory = "$ModsDirectory\BA2Output"
)

$Archive2Path = "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Tools\Archive2\Archive2.exe"

# Get all subdirectories (each is a mod)
$ModFolders = Get-ChildItem -Path $ModsDirectory -Directory

Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       BATCH BA2 ARCHIVE CREATOR               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "Found $($ModFolders.Count) mod folders" -ForegroundColor White

# Create output directory
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$SuccessCount = 0
$FailCount = 0

foreach ($ModFolder in $ModFolders) {
    $ModName = $ModFolder.Name
    Write-Host "`n" + ("─" * 47) -ForegroundColor Gray
    Write-Host "Processing: $ModName" -ForegroundColor Yellow
    
    try {
        # Get files
        $AllFiles = Get-ChildItem -Path $ModFolder.FullName -Recurse -File
        
        if ($AllFiles.Count -eq 0) {
            Write-Warning "  No files found, skipping"
            continue
        }
        
        Write-Host "  Files: $($AllFiles.Count)" -ForegroundColor White
        
        # Separate by type
        $TextureFiles = $AllFiles | Where-Object { $_.Extension -eq ".dds" }
        $MainFiles = $AllFiles | Where-Object { $_.Extension -ne ".dds" }
        
        $TempPath = "$env:TEMP\BA2Batch_$ModName"
        New-Item -ItemType Directory -Path $TempPath -Force | Out-Null
        
        # Main archive
        if ($MainFiles.Count -gt 0) {
            $MainList = "$TempPath\main.txt"
            $MainFiles | ForEach-Object {
                $RelPath = $_.FullName.Substring($ModFolder.FullName.Length + 1)
                Add-Content -Path $MainList -Value $RelPath
            }
            
            $MainArchive = "$OutputDirectory\$ModName - Main.ba2"
            & $Archive2Path $MainArchive "-c=$MainList" "-root=$($ModFolder.FullName)" "-fo4" "-compression=lz4" 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                $Size = [math]::Round((Get-Item $MainArchive).Length / 1MB, 2)
                Write-Host "  ✓ Main.ba2 ($Size MB)" -ForegroundColor Green
            }
        }
        
        # Texture archive
        if ($TextureFiles.Count -gt 0) {
            $TextureList = "$TempPath\textures.txt"
            $TextureFiles | ForEach-Object {
                $RelPath = $_.FullName.Substring($ModFolder.FullName.Length + 1)
                Add-Content -Path $TextureList -Value $RelPath
            }
            
            $TextureArchive = "$OutputDirectory\$ModName - Textures.ba2"
            & $Archive2Path $TextureArchive "-c=$TextureList" "-root=$($ModFolder.FullName)" "-fo4dds" 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                $Size = [math]::Round((Get-Item $TextureArchive).Length / 1MB, 2)
                Write-Host "  ✓ Textures.ba2 ($Size MB)" -ForegroundColor Green
            }
        }
        
        Remove-Item -Path $TempPath -Recurse -Force
        $SuccessCount++
        
    } catch {
        Write-Error "  ✗ Failed: $_"
        $FailCount++
    }
}

Write-Host "`n" + ("═" * 47) -ForegroundColor Cyan
Write-Host "Batch Processing Complete!" -ForegroundColor Green
Write-Host "  Success: $SuccessCount mods" -ForegroundColor Green
Write-Host "  Failed: $FailCount mods" -ForegroundColor Red
Write-Host "  Output: $OutputDirectory" -ForegroundColor Cyan
```

**Usage:**
```powershell
.\Batch-CreateBA2.ps1 -ModsDirectory "D:\ModProjects" -OutputDirectory "D:\Release"
```

**Output:**
```
╔═══════════════════════════════════════════════╗
║       BATCH BA2 ARCHIVE CREATOR               ║
╚═══════════════════════════════════════════════╝
Found 5 mod folders

───────────────────────────────────────────────
Processing: WeaponMod1
  Files: 25
  ✓ Main.ba2 (3.45 MB)
  ✓ Textures.ba2 (45.23 MB)

───────────────────────────────────────────────
Processing: ArmorMod1
  Files: 18
  ✓ Main.ba2 (2.10 MB)
  ✓ Textures.ba2 (32.50 MB)

...

═══════════════════════════════════════════════
Batch Processing Complete!
  Success: 5 mods
  Failed: 0 mods
  Output: D:\Release
```

---

## Advanced Techniques

### 1. Smart Archive Splitting

**Problem:** Large texture archives (>2GB) cause issues

**Solution:** Auto-split by size

```powershell
function Split-LargeBA2 {
    param($Files, $MaxSizeMB = 2000)
    
    $Archives = @()
    $CurrentArchive = @()
    $CurrentSize = 0
    
    foreach ($File in $Files) {
        $FileSize = (Get-Item $File.FullName).Length / 1MB
        
        if (($CurrentSize + $FileSize) -gt $MaxSizeMB) {
            # Start new archive
            $Archives += ,$CurrentArchive
            $CurrentArchive = @()
            $CurrentSize = 0
        }
        
        $CurrentArchive += $File
        $CurrentSize += $FileSize
    }
    
    # Add last archive
    if ($CurrentArchive.Count -gt 0) {
        $Archives += ,$CurrentArchive
    }
    
    return $Archives
}

# Usage
$TextureFiles = Get-ChildItem "D:\Mod\Textures" -Recurse -File -Filter "*.dds"
$ArchiveGroups = Split-LargeBA2 -Files $TextureFiles -MaxSizeMB 2000

for ($i = 0; $i -lt $ArchiveGroups.Count; $i++) {
    $ArchiveName = "MyMod - Textures$($i + 1).ba2"
    # Create BA2 with $ArchiveGroups[$i]
}
```

### 2. Compression Comparison

**Test different compression methods:**

```powershell
$CompressionTypes = @("none", "lz4")
$Results = @()

foreach ($Type in $CompressionTypes) {
    $Start = Get-Date
    
    & $Archive2Path "Test_$Type.ba2" `
        "-c=filelist.txt" `
        "-root=D:\Mod" `
        "-fo4" `
        "-compression=$Type"
    
    $End = Get-Date
    $Duration = ($End - $Start).TotalSeconds
    $Size = (Get-Item "Test_$Type.ba2").Length / 1MB
    
    $Results += [PSCustomObject]@{
        Compression = $Type
        Time = $Duration
        Size = $Size
        Ratio = [math]::Round(100 / $Size, 2)
    }
}

$Results | Format-Table -AutoSize
```

**Output:**
```
Compression Time   Size     Ratio
----------- ----   ----     -----
none        2.3    450.23   0.22
lz4         8.7    225.67   0.44
```

### 3. Verify BA2 Integrity

```powershell
function Test-BA2Integrity {
    param([string]$BA2Path)
    
    Write-Host "Verifying: $BA2Path" -ForegroundColor Cyan
    
    # List contents
    $Output = & $Archive2Path $BA2Path "-l" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Archive is corrupted!" -ForegroundColor Red
        return $false
    }
    
    # Count files
    $FileCount = ($Output | Where-Object { $_ -match "^\s+\d+" }).Count
    Write-Host "✓ Archive OK ($FileCount files)" -ForegroundColor Green
    return $true
}

# Usage
Test-BA2Integrity "D:\MyMod - Main.ba2"
```

---

## Best Practices

### 1. **Naming Conventions**

```
✓ CORRECT:
- MyMod - Main.ba2
- MyMod - Textures.ba2
- DLCMyMod - Main.ba2

✗ WRONG:
- MyMod_Main.ba2 (underscore instead of dash + space)
- MyModTextures.ba2 (missing "- Textures")
- MyMod.ba2 (too generic)
```

### 2. **Archive Organization**

**Main Archive Should Contain:**
- Meshes (.nif)
- Materials (.bgsm, .bgem)
- Scripts (.pex)
- Sounds (.xwm, .fuz)
- Misc (.xml, .txt)

**Texture Archive Should Contain:**
- ONLY .dds files
- ALL texture types

**Don't Mix:** Never put .dds in Main archive

### 3. **Compression Settings**

| File Type | Compression | Reason |
|-----------|-------------|--------|
| Textures (.dds) | DXT (auto) | Already compressed |
| Meshes (.nif) | LZ4 | Good ratio, fast |
| Scripts (.pex) | LZ4 | Small files benefit |
| Sounds (.xwm) | None | Already compressed |

### 4. **Performance Tips**

**DO:**
- ✅ Split large archives (>2GB)
- ✅ Separate textures from main files
- ✅ Use LZ4 for general archives
- ✅ Test load times before/after

**DON'T:**
- ❌ Pack everything in one archive
- ❌ Use ZIP compression (outdated)
- ❌ Include unnecessary files
- ❌ Forget to test in-game

### 5. **Bethesda.net Requirements**

If uploading to Bethesda.net:

```
REQUIRED:
✅ All assets in BA2 (no loose files)
✅ Proper naming (- Main.ba2, - Textures.ba2)
✅ Under 2GB per archive
✅ Total mod under 2GB (console limits)

FORBIDDEN:
❌ Loose files
❌ .exe or .dll files
❌ External dependencies
❌ Adult content
```

---

## Troubleshooting

### Issue 1: "Archive2.exe not found"

**Solution:**
```powershell
# Check if Creation Kit is installed
$CKPath = "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Tools"
if (-not (Test-Path $CKPath)) {
    Write-Host "Install Creation Kit via Bethesda Launcher" -ForegroundColor Yellow
}
```

### Issue 2: "Failed to create BA2"

**Causes:**
- File paths too long (>260 characters)
- Special characters in filenames
- Files locked by other programs
- Insufficient disk space

**Solution:**
```powershell
# Check for long paths
Get-ChildItem "D:\Mod" -Recurse -File | Where-Object { $_.FullName.Length -gt 240 } | ForEach-Object {
    Write-Warning "Path too long: $($_.FullName)"
}
```

### Issue 3: "Textures don't appear in-game"

**Causes:**
- Archive not named "- Textures.ba2"
- Wrong compression type
- Not registered in plugin

**Solution:**
```ini
; In your plugin's INI (e.g., MyMod.ini)
[Archive]
sResourceDataDirsFinal=STRINGS\, TEXTURES\
sResourceArchiveList=MyMod - Main.ba2, MyMod - Textures.ba2
```

### Issue 4: "BA2 too large (>2GB)"

**Solution:** Split into multiple archives

```powershell
# Split textures by resolution
$Textures4K = Get-ChildItem -Filter "*_4K.dds"
$Textures2K = Get-ChildItem -Filter "*_2K.dds"

# Create separate archives
Create-BA2 -Files $Textures4K -Name "MyMod - Textures4K"
Create-BA2 -Files $Textures2K -Name "MyMod - Textures2K"
```

---

## Summary

### Key Takeaways:

✅ **BA2 archives improve performance** vs loose files  
✅ **Archive2.exe is the official tool** (comes with CK)  
✅ **Separate Main and Texture archives** (required)  
✅ **Use LZ4 compression** for general files  
✅ **Texture archives use DXT** (automatic)  
✅ **PowerShell scripts automate** batch processing  
✅ **Merging mods requires conflict resolution**  
✅ **DON'T modify vanilla BA2s** (use load order instead)  

### Quick Reference:

**Create Main Archive:**
```batch
Archive2.exe "MyMod - Main.ba2" -c=filelist.txt -root="D:\Mod" -fo4 -compression=lz4
```

**Create Texture Archive:**
```batch
Archive2.exe "MyMod - Textures.ba2" -c=textures.txt -root="D:\Mod" -fo4dds
```

**Extract Archive:**
```batch
Archive2.exe "MyMod - Main.ba2" -x -d="D:\Extracted"
```

---

*Last Updated: January 2026*  
*Fallout 4 Version: 1.10.163+*  
*Archive2 Version: 2.0 (Creation Kit 1.10+)*  
*Difficulty: Intermediate*  
*Required Tool: Archive2.exe (Creation Kit) or BSArch*
