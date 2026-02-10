# Voice Chat Crash Debug Log

## Steps to Debug:

1. Open Mossy application
2. Open DevTools (F12 or Ctrl+Shift+I)
3. Go to Console tab
4. Click on Mossy's avatar (bottom-right corner)
5. Copy ALL the console output and paste it here

## What to look for:
- Which step number did it reach? (Step 1-9)
- What was the last message before crash?
- Any red error messages?

## Common Issues:
- API key missing: Configure OpenAI/Groq in Desktop Settings (or set OPENAI_API_KEY/GROQ_API_KEY for development)
- Microphone permission denied: Click "Allow" when browser asks
- Audio context error: Try refreshing the page
