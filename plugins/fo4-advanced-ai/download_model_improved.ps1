Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TinyLlama Model Download" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

$modelUrl = "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
$modelPath = "release_staging\core\Data\F4AI\models\tinyllama-1.1b-chat.gguf"

# Create directory
New-Item -ItemType Directory -Force -Path (Split-Path $modelPath) | Out-Null

if (Test-Path $modelPath) {
	$sizeMB = (Get-Item $modelPath).Length / 1MB
	Write-Host "✅ Model already downloaded: $modelPath" -ForegroundColor Green
	Write-Host "   Size: $([math]::Round($sizeMB, 1)) MB`n" -ForegroundColor White
	Write-Host "Delete the file to re-download." -ForegroundColor Yellow
	Read-Host "Press Enter to exit"
	exit 0
}

Write-Host "Downloading TinyLlama-1.1B-Chat (~668 MB)..." -ForegroundColor Yellow
Write-Host "Source: $modelUrl" -ForegroundColor Gray
Write-Host "Target: $modelPath" -ForegroundColor Gray
Write-Host "`nThis may take 5-15 minutes depending on your connection...`n" -ForegroundColor Yellow

try {
	# Use WebClient for better progress
	$webClient = New-Object System.Net.WebClient

	# Register progress event
	Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -SourceIdentifier WebClient.DownloadProgressChanged -Action {
		$percent = $EventArgs.ProgressPercentage
		$receivedMB = $EventArgs.BytesReceived / 1MB
		$totalMB = $EventArgs.TotalBytesToReceive / 1MB
		Write-Progress -Activity "Downloading TinyLlama" -Status "$([math]::Round($receivedMB, 1)) MB / $([math]::Round($totalMB, 1)) MB" -PercentComplete $percent
	} | Out-Null

	# Start download
	$webClient.DownloadFileAsync($modelUrl, (Resolve-Path -Path "." | Join-Path -ChildPath $modelPath))

	# Wait for download
	while ($webClient.IsBusy) {
		Start-Sleep -Milliseconds 100
	}

	# Cleanup
	Unregister-Event -SourceIdentifier WebClient.DownloadProgressChanged
	$webClient.Dispose()

	Write-Host "`n============================================================" -ForegroundColor Cyan
	Write-Host "✅ Download complete!" -ForegroundColor Green
	$sizeMB = (Get-Item $modelPath).Length / 1MB
	Write-Host "   Model: $modelPath" -ForegroundColor White
	Write-Host "   Size: $([math]::Round($sizeMB, 1)) MB" -ForegroundColor White
	Write-Host "============================================================`n" -ForegroundColor Cyan

} catch {
	Write-Host "`n❌ Download failed: $_" -ForegroundColor Red
	Write-Host "`nYou can manually download from:" -ForegroundColor Yellow
	Write-Host $modelUrl -ForegroundColor Cyan
	Write-Host "`nSave to: $modelPath`n" -ForegroundColor Yellow
	Read-Host "Press Enter to exit"
	exit 1
}

Read-Host "Press Enter to exit"
