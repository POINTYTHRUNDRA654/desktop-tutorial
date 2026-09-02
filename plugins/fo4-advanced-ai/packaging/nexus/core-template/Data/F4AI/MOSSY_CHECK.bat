@echo off
echo [F4AI] Mossy Connection Test
echo [F4AI] Endpoint: http://127.0.0.1:8787/v1/chat
echo.

curl -s --connect-timeout 4 -X POST "http://127.0.0.1:8787/v1/chat" ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"system\",\"content\":\"You are Curie in Fallout 4. Say one sentence.\"},{\"role\":\"user\",\"content\":\"Connection test.\"}],\"temperature\":0.7}" ^
  2>nul

if "%ERRORLEVEL%"=="0" (
    echo.
    echo.
    echo [F4AI] SUCCESS - Mossy responded. Check output above for NPC text.
) else (
    echo.
    echo [F4AI] FAILED  - Mossy did not respond.
    echo [F4AI] Make sure the Mossy desktop app is open.
    echo [F4AI] Then run this test again.
)

echo.
echo Status file: %~dp0bridge_status.json
echo.
pause
