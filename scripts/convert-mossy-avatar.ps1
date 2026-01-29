$ErrorActionPreference = 'Stop'

$srcPng = Join-Path $PSScriptRoot '..\public\mossy-avatar.png'
$dstJpg = Join-Path $PSScriptRoot '..\public\mossy-avatar.jpg'
$dstRendererJpg = Join-Path $PSScriptRoot '..\src\renderer\public\mossy-avatar.jpg'

if (-not (Test-Path -LiteralPath $srcPng)) {
  throw "Source PNG not found: $srcPng"
}

# Convert PNG -> JPG using System.Drawing (Windows)
Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($srcPng)
try {
  $img.Save($dstJpg, [System.Drawing.Imaging.ImageFormat]::Jpeg)
}
finally {
  $img.Dispose()
}

Copy-Item -LiteralPath $dstJpg -Destination $dstRendererJpg -Force

Get-Item -LiteralPath $dstJpg, $dstRendererJpg | Select-Object FullName, Length | Format-Table -AutoSize
