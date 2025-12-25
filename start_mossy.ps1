## Start Mossy Assistant in voice mode

# Wait a bit so drives (G:, H:) are mounted
Start-Sleep -Seconds 20

# Go to Mossy folder
Set-Location "D:\MossyAssistant"

# Activate virtual environment
& "D:\MossyAssistant\venv\Scripts\Activate.ps1"

# Run Mossy
python "D:\MossyAssistant\mossy_assistant.py" --voice

