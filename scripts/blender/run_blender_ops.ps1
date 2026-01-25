param(
    [Parameter(Mandatory=$true)]
    [string]$BlendFile,

    [string]$BlenderExe = "blender",

    [ValidateSet("move_x","cursor_array")]
    [string]$Operator = "move_x",

    [int]$Total = 4,

    [switch]$EnableAutoExec,
    [switch]$DisableAutoExec,
    [switch]$RenderAnim
)

# Validate exclusive auto-exec flags
if ($EnableAutoExec -and $DisableAutoExec) {
    Write-Error "Specify only one: -EnableAutoExec or -DisableAutoExec.";
    exit 1
}

if (-not (Test-Path $BlendFile)) {
    Write-Error "Blend file not found: $BlendFile";
    exit 1
}

# Resolve add-on script based on selected operator
$addonScript = $null
switch ($Operator) {
    "move_x"      { $addonScript = Join-Path $PSScriptRoot "blender_move_x.py" }
    "cursor_array"{ $addonScript = Join-Path $PSScriptRoot "blender_cursor_array.py" }
}

if (-not (Test-Path $addonScript)) {
    Write-Error "Add-on script not found: $addonScript";
    exit 1
}

# Auto-exec override
$autoExecArg = $null
if ($EnableAutoExec) { $autoExecArg = "--enable-autoexec" }
elseif ($DisableAutoExec) { $autoExecArg = "--disable-autoexec" }

# Build Blender args
$blArgs = @()
$blArgs += "--background"
if ($autoExecArg) { $blArgs += $autoExecArg }
$blArgs += $BlendFile
$blArgs += "--python"
$blArgs += $addonScript

# Invoke operator via python-expr
switch ($Operator) {
    "move_x"       { $blArgs += "--python-expr"; $blArgs += "import bpy; bpy.ops.object.move_x()" }
    "cursor_array" { $blArgs += "--python-expr"; $blArgs += "import bpy; bpy.ops.object.cursor_array(total=$Total)" }
}

if ($RenderAnim) { $blArgs += "--render-anim" }

Write-Host "Running:" $BlenderExe ($blArgs -join ' ')

# Execute Blender with composed arguments
& $BlenderExe @blArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Blender exited with code $LASTEXITCODE";
    exit $LASTEXITCODE
}

Write-Host "Done."