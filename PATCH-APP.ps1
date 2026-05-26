# PATCH-APP.ps1 — Hot-patches the installed Mossy NVIDIA asar with freshly compiled main.js
# Run once after any main.ts change to push the fix into the installed app instantly.
# Must run as Administrator (write access to Program Files).

param()

# ── Self-elevate if not admin ──────────────────────────────────────────────────
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]'Administrator')) {
    Write-Host "Requesting admin rights..." -ForegroundColor Yellow
    $args2 = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process powershell -Verb RunAs -ArgumentList $args2 -Wait
    exit
}

Set-Location "D:\Projects\desktop-tutorial"
$ErrorActionPreference = "Stop"

$ASAR_TOOL    = "D:\Projects\desktop-tutorial\node_modules\.bin\asar.cmd"

# ── Auto-detect installed app.asar ────────────────────────────────────────────
# Search every fixed drive for the installed Mossy NVIDIA asar
Write-Host "Searching for installed Mossy NVIDIA..." -ForegroundColor Gray
$INSTALLED = $null
$SEARCH_NAMES = @(
    "Mossy NVIDIA\resources\app.asar",
    "desktop-tutorial\Mossy NVIDIA\resources\app.asar",
    "Mossy AI\resources\app.asar",
    "Mossy\resources\app.asar"
)
$DRIVES = (Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Root -ne $null }).Root
foreach ($drive in $DRIVES) {
    foreach ($name in $SEARCH_NAMES) {
        $candidate = Join-Path $drive "Program Files\$name"
        if (Test-Path $candidate) { $INSTALLED = $candidate; break }
        $candidate = Join-Path $drive $name
        if (Test-Path $candidate) { $INSTALLED = $candidate; break }
    }
    if ($INSTALLED) { break }
}

# Also check if electron-builder installed it directly under the project release folder
if (-not $INSTALLED) {
    $releaseAsar = "D:\Projects\desktop-tutorial\release\win-unpacked\resources\app.asar"
    if (Test-Path $releaseAsar) { $INSTALLED = $releaseAsar }
}

if (-not $INSTALLED) {
    Write-Host ""
    Write-Host "  ✗ Could not auto-detect the installed app.asar on any drive." -ForegroundColor Red
    Write-Host "  Drives searched: $($DRIVES -join ', ')" -ForegroundColor Gray
    Write-Host ""
    $INSTALLED = Read-Host "Paste the full path to app.asar (or press Enter to exit)"
    if (-not $INSTALLED -or -not (Test-Path $INSTALLED)) {
        Write-Host "Path not found. Exiting." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "  ✓ Found: $INSTALLED" -ForegroundColor Green
$BACKUP = ($INSTALLED -replace '\.asar$', '.asar.bak')
$EXTRACT_DIR  = "$env:TEMP\mossy-asar-patch"
$COMPILED_JS  = "D:\Projects\desktop-tutorial\dist-electron\electron\main.js"

Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Mossy AI — Asar Hot-Patcher" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Compile main.ts ────────────────────────────────────────────────────
Write-Host "[1/5] Compiling src/electron/main.ts..." -ForegroundColor Yellow
try {
    & "D:\Projects\desktop-tutorial\node_modules\.bin\tsc.cmd" -p tsconfig.electron.json
    Write-Host "      ✓ TypeScript compiled OK" -ForegroundColor Green
} catch {
    Write-Host "      ✗ TSC compile failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix any TypeScript errors above, then re-run this script." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path $COMPILED_JS)) {
    Write-Host "      ✗ Expected compiled output not found: $COMPILED_JS" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "      ✓ Found compiled main.js ($([Math]::Round((Get-Item $COMPILED_JS).Length/1KB))KB)" -ForegroundColor Green

# ── Step 2: Backup installed asar ─────────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Backing up installed app.asar..." -ForegroundColor Yellow
if (-not (Test-Path $INSTALLED)) {
    Write-Host "      ✗ Installed app not found at: $INSTALLED" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Copy-Item $INSTALLED $BACKUP -Force
Write-Host "      ✓ Backup saved: app.asar.bak" -ForegroundColor Green

# ── Step 3: Extract asar ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Extracting app.asar..." -ForegroundColor Yellow
if (Test-Path $EXTRACT_DIR) { Remove-Item $EXTRACT_DIR -Recurse -Force }
& $ASAR_TOOL extract $INSTALLED $EXTRACT_DIR
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ✗ asar extract failed (exit $LASTEXITCODE)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "      ✓ Extracted to $EXTRACT_DIR" -ForegroundColor Green

# ── Step 4: Patch main.js inside extracted folder ─────────────────────────────
Write-Host ""
Write-Host "[4/5] Patching main.js inside asar..." -ForegroundColor Yellow

# Find the main.js location inside the extracted asar
$TARGETS = @(
    "$EXTRACT_DIR\dist-electron\electron\main.js",
    "$EXTRACT_DIR\dist-electron\main.js",
    "$EXTRACT_DIR\electron\main.js",
    "$EXTRACT_DIR\main.js"
)
$TARGET = $null
foreach ($t in $TARGETS) {
    if (Test-Path $t) { $TARGET = $t; break }
}
if (-not $TARGET) {
    Write-Host "      Searching for main.js in extracted asar..." -ForegroundColor Gray
    $found = Get-ChildItem $EXTRACT_DIR -Filter "main.js" -Recurse | Select-Object -First 1
    if ($found) { $TARGET = $found.FullName }
}
if (-not $TARGET) {
    Write-Host "      ✗ Could not find main.js inside extracted asar!" -ForegroundColor Red
    Write-Host "      Contents of extract dir:" -ForegroundColor Gray
    Get-ChildItem $EXTRACT_DIR | ForEach-Object { Write-Host "        $_" -ForegroundColor Gray }
    Read-Host "Press Enter to exit"
    exit 1
}

$oldSize = [Math]::Round((Get-Item $TARGET).Length/1KB)
Copy-Item $COMPILED_JS $TARGET -Force
$newSize = [Math]::Round((Get-Item $TARGET).Length/1KB)
Write-Host "      ✓ Patched: $TARGET" -ForegroundColor Green
Write-Host "        Old size: ${oldSize}KB  →  New size: ${newSize}KB" -ForegroundColor Gray

# ── Step 5: Repack and replace ────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Repacking and replacing app.asar..." -ForegroundColor Yellow

# Kill Mossy if running (can't replace an open asar)
$mossy = Get-Process -Name "Mossy NVIDIA" -ErrorAction SilentlyContinue
if ($mossy) {
    Write-Host "      Closing Mossy NVIDIA (cannot replace open asar)..." -ForegroundColor Yellow
    $mossy | Stop-Process -Force
    Start-Sleep -Seconds 2
}

& $ASAR_TOOL pack $EXTRACT_DIR $INSTALLED
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ✗ asar pack failed (exit $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "      Restoring backup..." -ForegroundColor Yellow
    Copy-Item $BACKUP $INSTALLED -Force
    Read-Host "Press Enter to exit"
    exit 1
}

# Cleanup temp dir
Remove-Item $EXTRACT_DIR -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ PATCH COMPLETE — Launch Mossy NVIDIA to test!" -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Fixed: analytics:get-analytics-config IPC handler" -ForegroundColor Cyan
Write-Host "  Fixed: securityValidator bare-require crash blocker" -ForegroundColor Cyan
Write-Host "  Fixed: main.ts truncation (isMinimized / lifecycle)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  If something breaks, restore with:" -ForegroundColor Gray
Write-Host "  Copy-Item '$BACKUP' '$INSTALLED' -Force" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
