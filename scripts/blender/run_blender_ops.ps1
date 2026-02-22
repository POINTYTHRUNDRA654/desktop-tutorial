<#
.SYNOPSIS
    Headless Blender runner for Mossy Link add-on operators.

.DESCRIPTION
    Runs any operator registered by the Mossy Link add-on (mossy_link_addon.py)
    against a .blend file without opening the Blender GUI.
    Covers every operator from the original example add-ons
    (blender_move_x.py / blender_cursor_array.py) plus the full FO4
    automation suite.

.PARAMETER BlendFile
    Path to the .blend file to process. (Required)

.PARAMETER BlenderExe
    Path to the Blender executable. Defaults to "blender" (must be on PATH).

.PARAMETER Operator
    Operator to invoke. Accepted values:
        move_x                   — Move all objects +1 on X (blender_move_x.py)
        cursor_array             — Cursor Array (blender_cursor_array.py)
        fo4_setup_scene          — METRIC / 60 FPS / 18mm FOV  (f4_setup.py)
        fo4_align                — IMPERIAL / 30 FPS / scale 1.0
        fo4_apply_transforms     — Apply Loc/Rot/Scale
        fo4_clean_mesh           — Remove doubles, loose geo
        fo4_check                — FO4 readiness report (printed to stdout)
        fo4_prep_rig             — Apply rest pose to armature
        fo4_uv_check             — UV coverage check
        fo4_generate_lightmap_uv — Add lightmap UV + Smart UV Project
        fo4_lod_setup            — Add Decimate LOD modifiers
        fo4_batch_export         — Batch-export selected meshes

.PARAMETER Total
    Number of steps for cursor_array. Default: 4.

.PARAMETER ExportDir
    Output directory for fo4_batch_export. Default: Desktop\FO4_Exports.

.PARAMETER ExportFormat
    Export format for fo4_batch_export: FBX (default) or OBJ.

.PARAMETER EnableAutoExec
    Pass --enable-autoexec to Blender (allow Python scripts in .blend files).

.PARAMETER DisableAutoExec
    Pass --disable-autoexec to Blender.

.PARAMETER RenderAnim
    Append --render-anim after script execution.

.PARAMETER Save
    Save the .blend file after running the operator (--python-expr bpy.ops.wm.save_mainfile).

.EXAMPLE
    # Move all objects on X axis
    .\run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator move_x -EnableAutoExec

.EXAMPLE
    # Cursor Array with 8 steps
    .\run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator cursor_array -Total 8 -EnableAutoExec

.EXAMPLE
    # Apply FO4 studio standards (METRIC, 60 FPS)
    .\run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator fo4_setup_scene -Save

.EXAMPLE
    # Align to FO4 HKX pipeline (IMPERIAL, 30 FPS)
    .\run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator fo4_align -Save

.EXAMPLE
    # Full FO4 readiness check
    .\run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator fo4_check

.EXAMPLE
    # Batch-export selected meshes as FBX
    .\run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator fo4_batch_export -ExportDir "C:\Exports" -ExportFormat FBX
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$BlendFile,

    [string]$BlenderExe = "blender",

    [ValidateSet(
        "move_x",
        "cursor_array",
        "fo4_setup_scene",
        "fo4_align",
        "fo4_apply_transforms",
        "fo4_clean_mesh",
        "fo4_check",
        "fo4_prep_rig",
        "fo4_uv_check",
        "fo4_generate_lightmap_uv",
        "fo4_lod_setup",
        "fo4_batch_export"
    )]
    [string]$Operator = "move_x",

    [int]$Total = 4,

    [string]$ExportDir = "$env:USERPROFILE\Desktop\FO4_Exports",

    [ValidateSet("FBX","OBJ")]
    [string]$ExportFormat = "FBX",

    [switch]$EnableAutoExec,
    [switch]$DisableAutoExec,
    [switch]$RenderAnim,
    [switch]$Save
)

# ---- Validate mutually exclusive flags ------------------------------------
if ($EnableAutoExec -and $DisableAutoExec) {
    Write-Error "Specify only one: -EnableAutoExec or -DisableAutoExec."
    exit 1
}

if (-not (Test-Path $BlendFile)) {
    Write-Error "Blend file not found: $BlendFile"
    exit 1
}

# ---- Resolve the add-on script (always mossy_link_addon.py) ---------------
$addonScript = Join-Path $PSScriptRoot "..\mossy_link_addon.py"
if (-not (Test-Path $addonScript)) {
    # Fallback: look next to this script (for users who copied it)
    $addonScript = Join-Path $PSScriptRoot "mossy_link_addon.py"
}
if (-not (Test-Path $addonScript)) {
    Write-Error "mossy_link_addon.py not found. Expected at: $addonScript"
    exit 1
}

# ---- Build the Python expression to run the chosen operator ---------------
$pyExpr = switch ($Operator) {
    "move_x"      { "import bpy; bpy.ops.object.move_x()" }
    "cursor_array"{ "import bpy; bpy.ops.object.cursor_array(total=$Total)" }

    # FO4 automation — all implemented in mossy_link_addon.py
    "fo4_setup_scene"      { "import bpy; bpy.ops.mossy.fo4_setup_scene()" }
    "fo4_align"            { "import bpy; bpy.ops.mossy.fo4_align()" }
    "fo4_apply_transforms" { "import bpy; bpy.ops.mossy.fo4_apply_transforms()" }
    "fo4_clean_mesh"       { "import bpy; bpy.ops.mossy.fo4_clean_mesh()" }
    "fo4_check"            { "import bpy; bpy.ops.mossy.fo4_check()" }
    "fo4_prep_rig"         { "import bpy; bpy.ops.mossy.fo4_prep_rig()" }
    "fo4_uv_check"         { "import bpy; bpy.ops.mossy.fo4_uv_check()" }
    "fo4_generate_lightmap_uv" { "import bpy; bpy.ops.mossy.fo4_lightmap_uv()" }
    "fo4_lod_setup"        { "import bpy; bpy.ops.mossy.fo4_lod_setup()" }
    "fo4_batch_export"     {
        $escapedDir = $ExportDir -replace "\\","\\"
        "import bpy; from mossy_link_addon import _auto_batch_export; print(_auto_batch_export(r'$ExportDir', '$ExportFormat'))"
    }
}

# Optional: save after running
if ($Save) {
    $pyExpr += "; bpy.ops.wm.save_mainfile()"
}

# ---- Build Blender argument list ------------------------------------------
$blArgs = @("--background")

if ($EnableAutoExec)  { $blArgs += "--enable-autoexec" }
if ($DisableAutoExec) { $blArgs += "--disable-autoexec" }

$blArgs += $BlendFile
$blArgs += "--python"
$blArgs += $addonScript
$blArgs += "--python-expr"
$blArgs += $pyExpr

if ($RenderAnim) { $blArgs += "--render-anim" }

# ---- Execute ---------------------------------------------------------------
Write-Host ""
Write-Host "Mossy Link — Headless Blender Runner" -ForegroundColor Cyan
Write-Host "  Operator  : $Operator"              -ForegroundColor Green
Write-Host "  Blend file: $BlendFile"
Write-Host "  Blender   : $BlenderExe"
Write-Host ""
Write-Host "Running: $BlenderExe $($blArgs -join ' ')"
Write-Host ""

& $BlenderExe @blArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Blender exited with code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
