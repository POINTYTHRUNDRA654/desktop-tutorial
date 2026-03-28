# Voice Diagnostics Quick Reference

## 🚀 How to Test Voice with Diagnostics

### Step 1: Open DevTools
1. Press **F12** in Mossy
2. Click "Console" tab
3. Keep it visible while testing voice

### Step 2: Test Web-Search Voice Query
Say or type: **"Go online and find all Fallout 4 weapon information"**

### Expected Console Output
```
[VoiceService] 🎙️ speak() called - text length: 145 chars
[VoiceService] 🎙️ speak() complete - elapsed: 2300 ms

[LiveContext] 🎯 Calling LocalAIEngine.generateResponse for voice
[LocalAIEngine] 🌐 WEB SEARCH TRIGGER DETECTED - Query: go online and find all...
[LocalAIEngine] Calling webSearch with type: wiki
[LocalAIEngine] ✅ WEB SEARCH SUCCESS - Results length: 2847 chars | Source: wiki
[LiveContext] ✅ AI response received - duration: 3200 ms

[LiveContext] 🔊 Starting TTS playback - response length: 450 chars
[VoiceService] 🎙️ speak() complete - elapsed: 1800 ms
[LiveContext] 🔊 TTS playback complete - duration: 1800 ms
```

### ✅ What This Means
- `🌐 WEB SEARCH TRIGGER DETECTED` = Web-search activated ✓
- `✅ WEB SEARCH SUCCESS` = Got data from Fallout wiki ✓
- `🔊 TTS complete` = Voice finished speaking ✓
- Total time ~7 seconds = Normal for online queries ✓

## 📊 Performance Benchmarks

| Scenario | Expected Time | What It Means |
|----------|----------------|--------------|
| Local query (no web-search) | 2-3 seconds | Fast, no API calls |
| With web-search (wiki hit) | 4-6 seconds | Includes API latency |
| With web-search (general) | 5-8 seconds | Multiple fallbacks |
| Slow response (10+ seconds) | 10+ seconds | Check if API down or timeout |

## 🔍 What to Look For

### Problem: Web-search NOT triggering
**Symptoms:** No `🌐 WEB SEARCH TRIGGER DETECTED` message
**Solution:** Query might not match trigger patterns. Try:
- "Go online and search for..."
- "Search the internet for..."
- "Find information about..."
- "Look up..."

### Problem: Web-search timing out
**Symptoms:** `AI response received` but no `✅ WEB SEARCH SUCCESS`
**Solution:** Network might be slow. Check:
- DevTools → Network tab for failed requests
- Fallout wiki accessibility
- DuckDuckGo API status

### Problem: TTS taking 5+ seconds
**Symptoms:** `speak() complete - elapsed: 5000+ ms`
**Solution:** Browser voice synthesis queue might be backed up. Check:
- Settings → Voice → Try different voice
- Close other tabs (reduce browser load)
- Restart Mossy

### Problem: Response looping
**Symptoms:** Same response repeated multiple times
**Solution:** Check transcription errors in console:
- Look for "Backend transcription failed"
- Check microphone permissions
- Try restarting Mossy

## 🎯 Production Verification Checklist

Before distributing Mossy v5.4.24, verify:

- [ ] Voice responds within 5 seconds for local queries
- [ ] Web-search queries show `🌐 WEB SEARCH TRIGGER DETECTED`
- [ ] Mossy speaks response after AI processes
- [ ] No transcription error loops
- [ ] TTS speaker can be changed in Settings
- [ ] Both voice and text modes work identically
- [ ] DevTools console has clear diagnostic logs

## 📱 Sharing Diagnostics with Users

If a user reports voice issues, ask them to:

1. Open DevTools (F12)
2. Reproduce the problem
3. Copy console output (Ctrl+A, Ctrl+C in console)
4. Paste in bug report with description

This will show you exactly what's happening in real-time.

## 🔧 For Developers

### Adding More Diagnostics
If you need additional logging, follow this pattern:

```typescript
// In LocalAIEngine, at start of operation:
console.log('[LocalAIEngine] [OPERATION_NAME] Starting with input:', inputPreview);

// At key decision points:
console.log('[LocalAIEngine] [OPERATION_NAME] Condition met, proceeding to:', nextStep);

// At end of operation:
console.log('[LocalAIEngine] [OPERATION_NAME] Complete - duration:', duration, 'ms');
```

### Timing Measurements
Always measure key operations:

```typescript
const start = Date.now();
// ... operation ...
const duration = Date.now() - start;
console.log('[Component] Operation complete - elapsed:', duration, 'ms');
```

## 📝 Files Location

- **Diagnostic logs:** Browser Console (F12)
- **Documentation:** `VOICE_DIAGNOSTICS_IMPLEMENTATION.md`
- **Source files:**
  - `src/renderer/src/voice-service.ts` (TTS timing)
  - `src/renderer/src/LocalAIEngine.ts` (Web-search)
  - `src/renderer/src/LiveContext.tsx` (Pipeline flow)

---

**Status:** ✅ Ready for distribution  
**Build:** `npm run build` → `npm run package:win`  
**Test:** `npm run dev` with DevTools open
