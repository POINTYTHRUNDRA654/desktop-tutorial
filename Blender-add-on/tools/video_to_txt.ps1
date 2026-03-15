param(
    [string]$VideoDir = "",
    [string]$OutputDir = "knowledge_base",
    [string]$WhisperCmd = "whisper"
)

# Extract audio with ffmpeg and transcribe via whisper CLI (optional).
# Requirements:
# - ffmpeg in PATH
# - openai-whisper installed: pip install openai-whisper (or faster-whisper if you adapt the command)
# Note: This can be heavy; use small/medium models as appropriate.

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Error "ffmpeg not found in PATH"
    exit 1
}
if (-not (Get-Command $WhisperCmd -ErrorAction SilentlyContinue)) {
    Write-Error "whisper CLI not found. Install: pip install openai-whisper"
    exit 1
}

if (-not $VideoDir) {
    Write-Error "Provide -VideoDir"
    exit 1
}

$VideoDir = (Resolve-Path $VideoDir).Path
$OutputDir = (Resolve-Path $OutputDir -ErrorAction SilentlyContinue)
if (-not $OutputDir) {
    $OutputDir = Join-Path (Get-Location) "knowledge_base"
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

Get-ChildItem -Path $VideoDir -Recurse -Include *.mp4,*.mkv,*.mov,*.webm | ForEach-Object {
    $video = $_.FullName
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($video)
    $wav = Join-Path $env:TEMP "$stem.wav"
    $txt = Join-Path $OutputDir "$stem.txt"

    Write-Host "Extracting audio: $video" -ForegroundColor Yellow
    ffmpeg -y -i "$video" -vn -ac 1 -ar 16000 -f wav "$wav" | Out-Null

    Write-Host "Transcribing via whisper -> $txt" -ForegroundColor Cyan
    & $WhisperCmd "$wav" --model small --language en --output_format txt --output_dir (Split-Path $txt) | Out-Null

    $outFile = Join-Path (Split-Path $txt) "$stem.txt"
    if (Test-Path $outFile) {
        Move-Item -Force $outFile $txt
        Write-Host "Wrote $txt" -ForegroundColor Green
    } else {
        Write-Warning "Whisper output not found for $video"
    }

    Remove-Item $wav -Force -ErrorAction SilentlyContinue
}
