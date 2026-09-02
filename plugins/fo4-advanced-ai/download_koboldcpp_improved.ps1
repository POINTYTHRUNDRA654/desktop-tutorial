Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "KoboldCPP Runtime Download" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

$koboldUrl = "https://github.com/LostRuins/koboldcpp/releases/latest/download/koboldcpp.exe"
$runtimeDir = "release_staging\core\Data\F4AI\runtime"
$koboldPath = Join-Path $runtimeDir "koboldcpp.exe"

# Create directory
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

# Download koboldcpp.exe
if (Test-Path $koboldPath) {
	Write-Host "✅ koboldcpp.exe already exists" -ForegroundColor Green
} else {
	Write-Host "Downloading koboldcpp.exe..." -ForegroundColor Yellow
	try {
		Invoke-WebRequest -Uri $koboldUrl -OutFile $koboldPath -UseBasicParsing
		Write-Host "✅ koboldcpp.exe downloaded" -ForegroundColor Green
	} catch {
		Write-Host "❌ Failed: $_" -ForegroundColor Red
		Read-Host "Press Enter to exit"
		exit 1
	}
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "✅ KoboldCPP runtime ready!" -ForegroundColor Green
Write-Host "   Location: $runtimeDir" -ForegroundColor White
Write-Host "============================================================`n" -ForegroundColor Cyan

Read-Host "Press Enter to exit"
