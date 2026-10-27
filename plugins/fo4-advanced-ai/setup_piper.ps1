<#
  Installs Piper (offline neural text-to-speech) for the F4AI bridge. Run once:
    powershell -NoProfile -ExecutionPolicy Bypass -File setup_piper.ps1

  Puts piper.exe and two voices in runtime\piper next to this script. Everything runs on this PC; nothing is
  sent online when the mod speaks. This script downloads:
    * Piper 2023.11.14-2 from github.com/rhasspy/piper (MIT licence)
    * voice en_US-joe-medium      (CC0)           from huggingface.co/rhasspy/piper-voices
    * voice en_US-ljspeech-high   (public domain) from huggingface.co/rhasspy/piper-voices
  Only voices whose dataset licence allows redistribution are used. Do not add non-commercial voices
  (for example ryan or hfc_*) if you plan to release the mod.
#>
[CmdletBinding()]
param([string]$Destination = '')
$ErrorActionPreference = 'Stop'
if (-not $Destination) { $Destination = Join-Path $PSScriptRoot 'runtime\piper' }

$piperUrl = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip'
$voiceBase = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US'
$voices = @(
  @{ name = 'en_US-joe-medium';    path = 'joe/medium' },
  @{ name = 'en_US-ljspeech-high'; path = 'ljspeech/high' }
)

function Get-WithRetry([string]$Url, [string]$OutFile, [int]$MinBytes) {
  for ($i = 1; $i -le 6; $i++) {
    try {
      Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing -TimeoutSec 600
      if ((Test-Path $OutFile) -and (Get-Item $OutFile).Length -ge $MinBytes) { return }
    } catch { Write-Host "  attempt $i failed: $($_.Exception.Message)" }
    Start-Sleep -Seconds 3
  }
  throw "Could not download $Url"
}

New-Item -ItemType Directory -Force (Join-Path $Destination 'voices') | Out-Null
if (-not (Test-Path (Join-Path $Destination 'piper.exe'))) {
  Write-Host 'Downloading Piper...'
  $zip = Join-Path $env:TEMP 'piper_windows_amd64.zip'
  $tmp = Join-Path $env:TEMP 'piper_unzip'
  Get-WithRetry $piperUrl $zip 10000000
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive $zip -DestinationPath $tmp -Force
  Copy-Item (Join-Path $tmp 'piper\*') $Destination -Recurse -Force
  Remove-Item $zip, $tmp -Recurse -Force
}
foreach ($v in $voices) {
  foreach ($ext in '.onnx', '.onnx.json') {
    $file = Join-Path $Destination ('voices\' + $v.name + $ext)
    if (-not (Test-Path $file)) {
      Write-Host ('Downloading ' + $v.name + $ext + ' ...')
      $min = 500
      if ($ext -eq '.onnx') { $min = 10000000 }
      Get-WithRetry ($voiceBase + '/' + $v.path + '/' + $v.name + $ext) $file $min
    }
  }
}

# Prove it works: speak a line and check the result is real audio, not just that files exist.
$test = Join-Path $env:TEMP 'f4ai_piper_selftest.wav'
$prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'   # Piper logs normal status lines to stderr
'Piper is ready.' | & (Join-Path $Destination 'piper.exe') --model (Join-Path $Destination 'voices\en_US-joe-medium.onnx') --output_file $test 2>&1 | Out-Null
$piperExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($piperExit -ne 0 -or -not (Test-Path $test) -or (Get-Item $test).Length -lt 5000) { throw 'Piper installed but did not produce audio.' }
Remove-Item $test -Force
Write-Host ('Piper is installed in ' + $Destination + ' and produced test audio.')
