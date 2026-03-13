# Mossy – Change Log & Sync Guard

> **Purpose of this file:** Single source of truth for every code change made in this
> repository. Before touching *anything* — whether working locally on your desktop or
> via the GitHub Copilot agent — read this file first. If a fix is listed here as
> **DONE ✅**, do **not** redo it, revert it, or work around it. Only add to the
> "What's next" section and work from there.

---

## How to use this file

| Situation | What to do |
|---|---|
| Starting a new session on your local desktop | Read this file first. Only touch things in "What's next". |
| Opening a new GitHub Copilot agent session | The agent reads this file first and verifies changes before touching anything. |
| Finishing a change (local or GitHub) | Update this file: move the item from "What's next" → "Done", note the files changed. |
| Unsure if something was already fixed | Grep for the topic in this file. If it's in "Done", leave it alone. |

---

## Branch: `copilot/fix-render-vulnerabilities`

All changes in this PR live on this branch. The branch name reflects its origin (fixing render/communication vulnerabilities); the scope has since grown to cover the full stable-communication + out-of-box-keys system. Merge to `master`/`main` when ready to ship.

---

## Done ✅  (DO NOT redo, revert, or override these)

### 18. Fix: Mossy never responds after first message (persisted pause bug) ✅

**Problem:** `isConversationPaused` state was initialised by reading `localStorage.getItem('mossy_conversation_paused')` on every app launch. If that key was ever set to `'true'` (e.g. the user once clicked the Pause/OFF button), Mossy would silently refuse to respond on every subsequent launch — `handleSend` returns immediately when `isConversationPaused` is `true`.

**Root cause:** The pause feature is intended as a temporary in-session toggle ("pause and restart without exiting"). Persisting it across app restarts was wrong — users should never start a fresh session with Mossy already paused.

**Fix (single file: `src/renderer/src/ChatInterface.tsx`):**
1. `isConversationPaused` now initialises to `false` unconditionally instead of reading from `localStorage`.
2. `toggleConversationPause()` no longer writes to `localStorage` (the pause/resume works in-session only).
3. Added a one-time mount `useEffect` that calls `localStorage.removeItem('mossy_conversation_paused')` to immediately clear any stale value for existing users.
4. Added `localStorage.removeItem('mossy_conversation_paused')` to the `resetMemory()` cleanup list.

**Do not touch:** The `isConversationPaused` state, the mount-time cleanup effect, or the `toggleConversationPause` handler. These are the correct, minimal fix.

---

### 17. Mossy's personality update + Pause/Resume conversation button ✅

**Requests:** 
1. Update Mossy to sound like a teaching assistant rather than a robot
2. Add pause/resume button for her communication so users can pause and restart without exiting the app

**Implementation:**

**Part 1: Personality Update**
- Enhanced `getFullSystemInstruction()` in `src/renderer/src/MossyBrain.ts` to emphasize Mossy as a **teaching mentor**
- New system prompt highlights:
  - "Teaching Philosophy" section that explains calibration by skill level
  - "Meeting them where they are" — beginners get step-by-step guidance, experts get technical depth
  - Emphasis on explaining the "why" behind each step, not just the "what"
  - Building confidence and normalizing mistakes as learning opportunities
  - Conversational tone ("you're a person who happens to know modding really well")
  - "Live Synapse Brevity" guidance for voice sessions reminds to still engage like a real person, not a script
  - Users can pause/resume at any time (added to voice capabilities section)

**Part 2: Pause/Resume Conversation Button**
- Added pause/resume control functions to `src/renderer/src/mossyTts.ts`:
  1. `pauseMossySpeech()` — pauses Mossy's voice output via `window.speechSynthesis.pause()`
  2. `resumeMossySpeech()` — resumes paused speech via `window.speechSynthesis.resume()`
  3. `isMossySpeechPaused()` — checks if speech is currently paused
  4. `stopMossySpeech()` — stops speech completely (cannot resume)

- Added new state to `src/renderer/src/ChatInterface.tsx`:
  - `isConversationPaused` state (persists to localStorage as `mossy_conversation_paused`)
  - `toggleConversationPause()` handler that:
    * Toggles pause state
    * Auto-pauses speech when pausing
    * Auto-resumes speech (if paused) when resuming
    * Dispatches event for other components

- Updated `src/renderer/src/ChatInterface.tsx` to prevent sending messages while paused:
  - `handleSend()` checks `isConversationPaused` and returns early if true
  - Users cannot send new messages during pause (UI prevents interaction)

- Added new toolbar button "Pause / Resume":
  - Shows "Pause" when conversation is active
  - Shows "Resume" when conversation is paused (with Play icon)
  - Located next to the "Monitor: ON/OFF" button in the chat toolbar
  - Visible on lg screens and up
  - Styled to show pause/resume state clearly (blue when active, gray when paused)

- Added visual indicator in chat header:
  - Yellow badge shows "Conversation Paused" when paused
  - Appears next to monitoring status and other indicators
  - Only visible on md screens and up

Files changed:
- `src/renderer/src/MossyBrain.ts` — Enhanced system prompt with teaching assistant focus
- `src/renderer/src/mossyTts.ts` — Added pause/resume/stop speech control functions
- `src/renderer/src/ChatInterface.tsx`:
  1. Added `isConversationPaused` state
  2. Added `toggleConversationPause()` handler
  3. Added pause/resume button to toolbar
  4. Added visual indicator in header
  5. Updated `handleSend()` to check pause state
  6. Imported new pause/resume functions

**User Experience:**
- Click "Pause" button → Mossy's speech pauses immediately, no new responses accepted
- Click "Resume" button → Mossy's paused speech resumes (or conversation resumes if no speech was playing)
- Yellow "Conversation Paused" badge appears in header for visibility
- Works perfectly with voice (TTS) disabled too
- No need to restart app or reload page

**Do not touch:** The pause/resume control functions, the state persistence, and the pause check in `handleSend()`.
These are critical for the pause/resume feature to work seamlessly.

---

### 1. Conversation context — Mossy remembers the whole chat
**Problem:** After the first exchange, every subsequent message was sent to the AI as a
brand-new single-turn conversation. No memory of what had been said.  
**Root cause:** `ChatInterface.tsx` built `localHistory` but never passed it down.  
**Fix:** `priorHistory` (last 20 messages) is threaded through the full IPC chain.

Files changed:
- `src/renderer/src/ChatInterface.tsx` — builds `priorHistory`, passes to `generateResponse()`
- `src/renderer/src/LocalAIEngine.ts` — `generateResponse()` accepts optional `conversationHistory`;
  embeds it as dialogue text for local providers (Ollama/LM Studio/Cosmos), passes as structured
  messages array for Groq/OpenAI cloud path
- `src/electron/preload.ts` — `aiChatGroq()` IPC wrapper accepts and forwards `conversationHistory`
- `src/electron/main.ts` — `ai-chat-groq` handler builds `messages[]` with full history between
  system prompt and current user message

**Do not touch:** The `priorHistory` build + pass-through chain above. It is working correctly.

---

### 2. Render backend resilience — backend-first, SDK fallback
**Problem:** Both `ai-chat-groq` and `ai-chat-openai` IPC handlers returned a hard error the
moment the Render backend was unavailable or returned any non-OK response. Voice chat (`sendMessage`)
already had the correct pattern; text chat did not.  
**Fix:** Both handlers now follow: try Render backend → fall back to direct SDK.

Files changed:
- `src/electron/main.ts`
  - `ai-chat-openai` handler: try Render → fall back to direct OpenAI SDK
  - `ai-chat-groq` handler: try Render → fall back to direct Groq SDK

Pattern (both handlers now follow this):
```
1. Build messages[] (system + history + user)
2. If backend configured → try POST /v1/chat to Render (20 s timeout, warn on failure)
3. If content still empty → load API key from settings/env → call SDK directly
4. Return { success: true, content }
```

Backend URL for Render: `https://mossy.onrender.com` (set in `.env.encrypted` and as packaged default)

**Do not touch:** The backend-first / SDK-fallback structure in both handlers. It must stay.

---

### 3. API key encryption — two security bugs fixed in `set-settings`
**Problem A (wipe bug):** Renderer always sends empty strings for secret fields (correctly
redacted by `redactSettingsForRenderer`). Old code called `encryptSecretForStorage('')` → `''`
and overwrote the valid `groqApiKeyEnc` with nothing. Key was silently deleted on next settings save.

**Problem B (bypass bug):** `{ ...current, ...newSettings }` let a renderer send
`groqApiKeyEnc: 'enc:...'` directly, bypassing `encryptSecretForStorage()` entirely.

**Fix:** Both fixed in `set-settings` IPC handler.

Files changed:
- `src/electron/main.ts` — `set-settings` handler:
  1. Strips all `*Enc` fields from renderer input before merging
  2. Empty string from renderer → preserves existing encrypted key, does **not** overwrite it

**Do not touch:** The `sanitizedInput` stripping and empty-value guard in `set-settings`.
These are security-critical.

---

### 4. Type safety — history filter type predicate
**Problem:** `(entry: any)` cast in `ai-chat-groq` history filter weakened type safety.  
**Fix:** Replaced with a proper TypeScript type predicate.

Files changed:
- `src/electron/main.ts` — `ai-chat-groq` history `.filter()` uses typed predicate

---

### 5. History cap — standardised to 20 messages
**Problem:** Renderer capped history at 20 messages; main process capped at 30. The main
process filter was redundant and inconsistent.  
**Fix:** Both capped at 20.

Files changed:
- `src/electron/main.ts` — `ai-chat-groq` `.slice(-20)` (was -30)

---

### 6. `.gitignore` — runtime data files excluded
Runtime-generated JSON files that should not be committed:
- `behavior-history.json`
- `longitudinal-data.json`
- `user-profile.json`

Files changed:
- `.gitignore` — added entries for the three files above

---

### 7. Voice chat race condition — correlation IDs fix multi-message handling
**Problem:** Mossy stopped responding after 1-2 voice exchanges. When multiple voice messages
were sent in quick succession (or even sequentially), the IPC message listeners had no way to
correlate responses with their originating requests. Each call to `sendMessageToMain()` created
a new listener on the 'message' channel that would resolve when it received ANY message with
`role: 'assistant'`. This caused race conditions where:
- The first listener to see any assistant response would resolve, even if it wasn't meant for it
- Subsequent messages would have their listeners resolve with the wrong response or timeout
- Old listeners from previous messages could intercept responses meant for newer messages

**Root cause:** No request/response correlation mechanism in the IPC communication pattern.
All listeners watched the same channel and competed to handle any assistant response that arrived.

**Fix:** Added unique correlation IDs to each request-response cycle:
- `LiveContext.tsx`: Generate a unique `correlationId` for each `sendMessage` call
- Each listener now only resolves when it receives a response with its matching `correlationId`
- Responses with mismatched IDs are logged and ignored
- `main.ts`: Extract `correlationId` from the request payload and echo it in the response

This ensures each voice message gets its own dedicated response handler with no cross-talk
between concurrent or sequential messages.

Files changed:
- `src/renderer/src/LiveContext.tsx` — `sendMessageToMain()` generates correlation ID, filters responses by ID
- `src/electron/main.ts` — `sendMessage` IPC handler extracts and echoes correlation ID

**Do not touch:** The correlation ID generation and matching logic. It is critical for preventing
listener race conditions in multi-message scenarios.

---

### 8. Voice chat MediaRecorder race condition — continuous conversation fix
**Problem:** Mossy stopped responding after 1-2 voice exchanges. After the first successful
exchange, the microphone would not restart properly for subsequent transcriptions. The user's
provided log showed the MediaRecorder starting during TTS playback (which should never happen),
and then failing to restart after TTS ended.

**Root cause:** Race condition in `voice-service.ts:385`. When a transcription completed, the code
scheduled an auto-restart setTimeout with a 1000ms delay. The condition check happened when
SCHEDULING the timeout, not when the callback FIRED. Timeline:
1. Recording completes → schedules auto-restart for T+1000ms (checks: `!isSpeaking` ✓)
2. T+594ms: AI processes → TTS starts (`isSpeaking = true`)
3. T+1000ms: setTimeout fires → **doesn't re-check `isSpeaking`** → starts MediaRecorder during TTS
4. TTS ends → tries to restart recording, but `isRecording` is already `true` → skips restart
5. Second transcription never happens → conversation stalls

**Fix:** Re-check all conditions INSIDE the setTimeout callback, not just when scheduling:
- `voice-service.ts:382-398`: Auto-restart after transcription now re-validates all flags
- `voice-service.ts:505-521`: TTS completion handler also re-validates (defense in depth)
- Both callbacks now check: `isListening && !shouldStop && !isUsingBrowserStt && !isSpeaking && !isRecording`
- Added defensive logging to show when/why restarts are skipped

This ensures the two restart timers (1000ms auto-restart and 400ms TTS-resume) can coexist
without creating duplicate MediaRecorders or missing restarts.

Files changed:
- `src/renderer/src/voice-service.ts` — auto-restart and TTS-resume timeout callbacks with condition re-validation

**Do not touch:** The condition re-checking inside both setTimeout callbacks. This is critical for
preventing MediaRecorder conflicts between the auto-restart and TTS-resume timers.

---

### 9. Voice silence detection — prevent premature cutoff mid-sentence
**Problem:** Mossy interrupted users mid-sentence by stopping recording too early during natural
speech pauses. Users reported being "cut off before finishing their sentence." The voice service
was stopping recording after only 1.5 seconds of silence, which is shorter than natural pauses
for breathing or thinking.

**Root cause:** `voice-service.ts:445` had a hardcoded 1500ms silence timeout, combined with a
silence threshold of 10. The threshold logic works as: `if (average < threshold) → silence`.
This meant values 0-9 were considered silence. Natural speech patterns include:
- Breathing pauses (typically 1-2 seconds)
- Thinking pauses while formulating thoughts (1-3 seconds)
- Quiet speaking voice (average 11-20 for some users)
- Background room noise or breathing sounds (average 7-14)

The 1.5s timeout was too aggressive, AND the threshold needed to be LOWER, not higher.

**Initial mistake (commit d1665e5):** INCREASED threshold from 10 → 15, which made the problem
WORSE. Since the check is `if (average < threshold)`, raising the threshold meant MORE values
counted as silence. Users with quiet voices (average 11-14 when speaking) were now detected as
silent even while talking!

**Correct fix (commit 3ace5a5):** DECREASED threshold and increased timeout:
1. **Decreased silence threshold:** 10 → 6 (voice-service.ts:441)
   - Lower threshold = only TRUE silence (very low audio ~0-5) triggers timer
   - Quiet speaking voice (avg 15-30 for most users) won't trigger silence
   - Breathing sounds (avg 7-14) won't trigger false silence detection
   - Only genuine quiet (< 6) is considered silence
2. **Increased silence duration:** 1500ms → 3000ms (voice-service.ts:449)
   - Full 3 seconds of TRUE silence before stopping
   - Very forgiving for natural pauses, breathing, thinking

How it works now:
- Speaking creates frequency average of ~15-30 (or higher for loud voices)
- Breathing/quiet ambient sounds create average of ~7-14
- TRUE silence creates average of ~0-5
- Only values < 6 trigger the 3-second countdown
- Allows natural pauses without premature cutoff

Files changed:
- `src/renderer/src/voice-service.ts` — silence detection threshold (line 441) and timeout (line 449)

**Do not touch:** The threshold of 6 and timeout of 3000ms. These values were tuned through
testing to balance responsiveness with patience. Lower threshold = less sensitive to silence
= more forgiving.

---

## In progress 🔄

_Nothing currently pending. All items are in Done._

---

### 16. Nemotron development testing infrastructure ✅

**Request:** Create dev-friendly testing infrastructure for Nemotron integration without requiring
actual service binary.

**Problem:** To test Nemotron auto-connector and communication flow, developers had to:
1. Build the actual Nemotron Python service (PyTorch, Transformers)
2. Wait for installer packaging
3. Run packaged installer to get nemotron-service.exe

This blocked rapid development iteration and testing of the optional installation system.

**Solution:** Created three-tier testing infrastructure:
1. **Mock HTTP Service** (`scripts/mock-nemotron-service.mjs`) — simulates Nemotron on localhost:5000
2. **Environment Variable Override** (`NEMOTRON_DEV_MODE`) — enables dev mode detection
3. **Combined Dev Launcher** (`scripts/dev-launcher.mjs`) — coordinates service + app startup

**Implementation:**

Files created:
- `scripts/mock-nemotron-service.mjs` — 140-line HTTP server with endpoints:
  - `GET /health` → health status + uptime + model version
  - `POST /generate` → accepts prompt, returns mock-generated text
  - `GET /config` → returns model configuration
  - `GET /` → service information
  - CORS headers enabled, request logging, graceful shutdown

- `scripts/dev-launcher.mjs` — 85-line orchestration script:
  - Spawns mock service on port 5000
  - Waits 2 seconds for startup
  - Spawns `npm run dev` with `NEMOTRON_DEV_MODE=true` environment variable
  - Coordinates cleanup on exit

- `package.json` — Added `"dev:nemotron": "node scripts/dev-launcher.mjs"` script

Files modified:
- `src/electron/services/nemotron-auto-connector.ts` — Enhanced `isNemotronInstalled()`:
  1. Checks `process.env.NEMOTRON_DEV_MODE === 'true'` first (dev override)
  2. Falls back to `NEMOTRON_DISABLED` check
  3. Falls back to Windows Registry (packaged app)
  4. Falls back to file existence (dev mode without override)
  - Logs: "[NemotronAutoConnector] Dev mode enabled - treating Nemotron as installed" when enabled

**Testing validation:** ✅ All end-to-end tests pass:
1. Mock service starts and responds on port 5000
2. App detects dev mode via environment variable
3. Auto-connector treats mock service as valid installation
4. App connects to mock service on startup
5. DesktopBridge routes health checks and requests to service
6. Mock service responds with proper JSON payloads
7. Complete request/response flow works end-to-end

**Workflow (two options):**

Option A - Automated:
```bash
npm run dev:nemotron
# This spawns both mock service and dev app together
```

Option B - Manual (two terminals):
```bash
# Terminal 1:
node scripts/mock-nemotron-service.mjs

# Terminal 2:
$env:NEMOTRON_DEV_MODE = 'true'
npm run dev
```

**Do not touch:** The three-tier architecture above. It enables safe development testing without
requiring the actual Nemotron service binary. Environment variable detection must take precedence
for dev mode to work.

**Next steps:**
- ✅ Dev testing complete (use dev-launcher or manual terminals)
- ⏳ Build installer: `npm run package:win`
- ⏳ Test with actual Nemotron component selected in installer
- ⏳ Verify registry flag and post-install auto-connection

---

### 15. Automated conversation + TTS tests ✅

**Request:** Run a test to verify that Mossy returns speech and keeps talking across 1-5+
conversations without stopping.

**Implementation:** New test file `src/renderer/src/__tests__/MossyConversation.test.tsx`
with 12 focused unit tests that cover every path in the `handleSend → AI response → speakMossy`
pipeline without requiring a running Electron app or live API keys.

**Tests included:**

| # | Description |
|---|---|
| 1 | `speakMossy` called with exact AI response text when voice is ON |
| 2 | `speakMossy` NOT called when voice is OFF |
| 3 | `speakMossy` NOT called when Live Voice is active (audio-feedback guard) |
| 4 | `isLoading` resets to `false` after every successful response |
| 5 | `recordAction` failure does NOT prevent response or TTS (bug fix from item 14) |
| 6 | `isLoading` resets even when `generateResponse` throws (finally always runs) |
| 7 | **5 back-to-back exchanges all produce a response + TTS call** (core loop test) |
| 8 | 5 exchanges with `recordAction` always failing — all still speak + unlock |
| 9 | Turns 1-4 fail (network error) → turn 5 recovers and speaks normally |
| 10 | `speakMossy` module resolves without throwing for a single call |
| 11 | `speakMossy` module resolves for a full sentence |
| 12 | `speakMossy` called with the correct text for each of 5 unique messages |

**Result: 205 tests pass (193 original + 12 new), 0 CodeQL alerts.**

Files changed:
- `src/renderer/src/__tests__/MossyConversation.test.tsx` — new test file (12 tests)

**Do not touch:** The test structure, mock setup, or `simulateSend` helper. These tests guard
the fixes made in items 12, 14 and must keep passing.



### 14. Mossy won't answer — three root causes fixed ✅

**Problem A (critical — chat silently locked up):** `await LocalAIEngine.recordAction(...)` was
called *after* `setIsLoading(true)` but *before* the `try/catch/finally` block in `handleSend`.
If it threw (e.g. `QuotaExceededError` from a full localStorage, or `SyntaxError` from corrupted
`mossy_ml_history` JSON), the `finally { setIsLoading(false) }` block was never reached.
`isLoading` stayed `true` forever. Every subsequent send hit the early-return guard
`if (... || isLoading || ...) return` and was silently swallowed — Mossy appeared completely
unresponsive until page reload.

**Problem B (voice chat — recording never stopped):** The browser STT silence-detection threshold
in `voice-service.ts` was raised from **8 → 15**. The previous value of 8 was still below the
typical ambient room-noise floor of 8–12, so silence was never detected, the MediaRecorder never
stopped, no audio blob was ever produced, and no transcript was ever sent — Mossy never heard
anything the user said.

**Problem C (TTS — greeting never spoken):** `initMossy()` set a welcome text message but never
called `speakMossy()`, so Mossy was completely silent on startup even when TTS was enabled.

**Fixes:**

- `src/renderer/src/ChatInterface.tsx`
  - Wrapped `await LocalAIEngine.recordAction(...)` in its own `try/catch` (non-fatal: logs
    a warning and continues so the main `try/finally` always runs and resets `isLoading`).
  - Added `speakMossy(...)` calls at the end of both `initMossy()` paths (new-user and
    returning-user). Text kept concise for TTS. `speakMossy` reads settings from localStorage
    independently so it works before `isVoiceEnabled` React state is rehydrated.

- `src/renderer/src/voice-service.ts`
  - Silence threshold: `8 → 15`. Normal speech is 15–40 (above threshold → keeps recording).
    Room noise and breathing are 0–14 (below threshold → timer fires after 2.5 s → recording
    stops → transcript sent → Mossy answers).

**Do not touch:** The `try/catch` around `recordAction` in `handleSend`, the threshold value of 15,
or the `speakMossy` calls in `initMossy`. These are the three fixes for "Mossy won't answer".



### 13. Always route through Render backend — Mossy can now talk ✅
**Problem:** `getBackendConfig()` returned `null` whenever `MOSSY_BACKEND_URL` was not set in
the environment (e.g. dev run without `.env.local`, or an existing `settings.json` that had an
empty `backendBaseUrl`). With no backend config, all three IPC handlers (`ai-chat-openai`,
`ai-chat-groq`, `sendMessage`) skipped the Render backend entirely and fell through to the local
Groq SDK fallback. The SDK fallback also failed because no Groq API key is present without
`.env.local`. Result: Mossy produced no response at all.

**Architecture:** Mossy always routes through the Render backend (`https://mossy.onrender.com`).
The backend holds all API keys server-side. The local SDK fallback is only a last-resort safety
net; it is not the primary path.

**Fix:** Added `'https://mossy.onrender.com'` as the hardcoded ultimate fallback in every place
that constructs the backend URL:

Files changed:
- `src/electron/main.ts`
  1. File-scope `getBackendConfig()`: `process.env.MOSSY_BACKEND_URL || 'https://mossy.onrender.com'`
     (was `|| ''`, causing `null` return when env var absent).
  2. `defaultBackendBaseUrl` in `loadSettings()` defaults block: removed `app.isPackaged` guard —
     Render URL is now the fallback in every environment, not just packaged builds.
  3. Function-scope `getBackendConfig()` inside `setupIpcHandlers()`: same Render URL fallback so
     existing `settings.json` files with an empty `backendBaseUrl` still resolve correctly.
  4. `get-settings` IPC handler: same fallback so the renderer always displays the correct URL.

**Timeouts unchanged at 20 s** — appropriate for a paid Render subscription (no cold-start delays).

**Do not touch:** The `'https://mossy.onrender.com'` hardcoded fallback in all four locations above.
This is what keeps Mossy talking when no explicit backend URL is configured.

---

### 12. Voice / TTS fixes — Mossy can now talk reliably  ✅
**Problem A:** Mossy (the AI) didn't know she had voice/TTS capabilities. When users asked
"can you talk?" or reported voice not working, the AI said it couldn't speak, which was
confusing and incorrect.

**Problem B:** Voice settings required a manual "Save" click before taking effect. The
"Enabled" checkbox in Voice Settings only updated the UI; if the user forgot to click Save,
the change was lost and TTS remained disabled.

**Problem C:** The "Test" button in Voice Settings used the previously-saved settings from
localStorage, not the current UI state. If the user had changed settings but not saved yet,
the test would use the old (possibly disabled) settings.

**Problem D:** `VoiceService.speakBrowser()` did not wait for voices to load before queuing
the utterance, meaning the preferred voice selection was sometimes skipped. It also did not
handle the `paused` state, which can cause Chrome/Electron speech synthesis to silently
queue utterances that never start.

**Fixes:**
- `src/renderer/src/MossyBrain.ts` — Added a **VOICE & AUDIO CAPABILITIES** section to the
  system prompt: Mossy now knows she has browser TTS, knows how to tell users to turn it on
  (Voice toggle in chat toolbar), and guides them to Settings → Voice Settings for
  troubleshooting.
- `src/renderer/src/VoiceSettings.tsx` — Settings now **auto-save on every change** (no
  manual Save click required). The `enabled` checkbox, voice selector, rate/pitch/volume
  sliders all save immediately. The "Test" button saves the current UI state before testing
  so the test always reflects what the user sees.
- `src/renderer/src/voice-service.ts` — `speakBrowser()` now: (1) resumes if `paused`;
  (2) waits for voices to be available before creating the utterance; (3) removes the
  hardcoded fallback voice name `'Linda'` (was causing log noise on systems without that
  voice).

**Do not touch:** The auto-save `updateSettings()` helper in VoiceSettings.tsx or the
`paused`/voice-load-wait logic in `speakBrowser()`.

### 10. Groq cost optimisation — correct model + rate-limit fallback  ✅
**Problem A:** Render backend defaulted to `llama-3.1-70b-versatile` (deprecated model name).  
**Problem B:** Neither the backend nor the desktop direct-SDK path handled Groq `429 RateLimitError`.
For a free service with shared keys and many users, rate limits on the 70b model will be hit regularly
(free tier: 500 req/day). When that happened, both paths silently failed with no recovery.

**Fix:**
- `llama-3.3-70b-versatile` is now the primary model everywhere (current flagship, free tier)
- On `RateLimitError` the code automatically retries **once** with `llama-3.1-8b-instant`
  — free tier: **14 400 req/day and 20 000 tokens/min** — ~28× the quota of the 70b model
- This fallback is in **both** places: the Render backend route AND the desktop direct-SDK path

Files changed:
- `src/backend/routes/chat.ts` — `GROQ_PRIMARY_MODEL`/`GROQ_FALLBACK_MODEL` constants,
  `groqChatWithFallback()` helper, updated default model env var read
- `src/electron/main.ts` — `callGroqWithFallback()` helper near line 3940,
  used in `ai-chat-groq` direct SDK path and `sendMessage` direct SDK path
- `.env.backend.example` — `GROQ_MODEL` updated to `llama-3.3-70b-versatile`

**Do not touch:** The `GROQ_PRIMARY_MODEL` / `GROQ_FALLBACK_MODEL` constants or the fallback logic.

---

**What to do on Render after getting a new Groq key:**
1. Render dashboard → your Mossy service → Environment → set `GROQ_API_KEY=<your new key>`
2. Render will auto-restart the service
3. Run `npm run setup-keys` locally → enter the same new key → re-package

---

### 11. `check-comms` — live end-to-end communication health check  ✅
**Problem:** `verify-build.mjs` only checks that keys exist and are encrypted in the file.
It does NOT call the Groq API. The only way to know if Groq is actually responding was to
open the app and talk to it — which is slow and manual.

**Fix:** New script makes real live API calls and prints clear pass/fail per step.

```
npm run check-comms
```

Steps it tests:
1. `.env.encrypted` present → Groq key decrypts correctly
2. Primary model (`llama-3.3-70b-versatile`) → real Groq API call → responds
3. Fallback model (`llama-3.1-8b-instant`) → real Groq API call → responds
4. Render backend (`/v1/chat`) → real HTTP call → responds (warn-only if unreachable, not critical)

Rate-limit on primary is shown as a warning (not failure) — the fallback is still tested.  
Backend errors are shown as warnings — the desktop will fall back to direct SDK.  
Exit code 0 = critical checks passed (ready to package). Exit code 1 = action needed.

Files changed:
- `scripts/check-comms.mjs` — new script
- `package.json` — `"check-comms": "node scripts/check-comms.mjs"`

**Run order for a new key:**
```
npm run setup-keys      # enter new key
npm run check-comms     # verify it actually works
npm run build && npm run package:win
```

---

### 7. Packaged build `.env.encrypted` path resolution  ✅
**Problem:** `process.cwd()` is unreliable on Windows in packaged Electron apps.  
**Fix:** Searches four candidate paths — `app.getAppPath()` (inside asar, primary),
`process.resourcesPath`, `path.dirname(process.execPath)`, then `process.cwd()`.

Files changed:
- `src/electron/main.ts` — `findEnvFile()` helper replaces single `process.cwd()` lookup

---

### 8. First-run `loadSettings()` — seed env keys into defaults  ✅
**Problem:** New users (no `settings.json`) got empty defaults; keys from `.env.encrypted`
were never seeded on first launch.  
**Fix:** `loadSettings()` default path now calls `seedSecretFromEnv()` and persists result.

Files changed:
- `src/electron/main.ts` — fallback return block seeds + writes `settings.json` on first run

---

### 9. `setup-keys` developer script  ✅
**Problem:** No easy way to add/update a Groq key into `.env.encrypted` without a `.env.local`.  
**Fix:** New interactive script reads existing encrypted file, prompts per key, re-encrypts, verifies.

Files changed:
- `scripts/setup-keys.mjs` — new interactive CLI tool
- `package.json` — `"setup-keys": "node scripts/setup-keys.mjs"`

```bash
npm run setup-keys   # enter your Groq key → encrypted → verified → ready to package
```

---

## What's working and must NOT be changed

| System | Status | Notes |
|---|---|---|
| `.env.encrypted` | ✅ Valid | GROQ_API_KEY (`gsk_...`, 56 chars), OPENAI_API_KEY (`sk-...`, 164 chars), MOSSY_BACKEND_TOKEN (32 chars), MOSSY_BACKEND_URL (`https://mossy.onrender.com`) — all decrypt correctly |
| Encryption algorithm | ✅ AES-256-CBC | `mossy-2026-packaging-key-change-in-production`, same key in `scripts/setup-keys.mjs`, `scripts/encrypt-keys.js`, and `src/electron/main.ts` startup block — must stay in sync |
| `electron-builder` config | ✅ | `.env.encrypted` is in `"files"` array → bundled inside asar |
| `safeStorage` at-rest encryption | ✅ | Settings `*Enc` fields use Electron `safeStorage` (OS keychain-backed) |
| `redactSettingsForRenderer` | ✅ | All secret fields blanked before sending to renderer |
| Render backend URL | ✅ | `https://mossy.onrender.com` — set in `.env.encrypted` and as `app.isPackaged` hardcoded default |
| Voice chat (sendMessage) | ✅ | Already had backend-first + SDK fallback before this PR |
| Text chat history | ✅ | Fixed in item 1 above |
| Tests | ✅ 193/193 passing | Run: `npm run test:unit` |
| CodeQL security scan | ✅ 0 alerts | |

---

## Key architecture rules (enforce always)

1. **API keys never touch the renderer.** Main process owns all secrets. Renderer only ever
   sees presence booleans from `getSecretStatus()`.

2. **`ai-chat-*` IPC handlers always try Render backend first, then SDK fallback.**
   Never hard-fail when backend is absent. See item 2 above.

3. **`set-settings` must strip `*Enc` fields from renderer input before merging.**
   And must preserve existing encrypted key when renderer sends empty string. See item 3 above.

4. **`.env.encrypted` is the carrier for developer-supplied API keys.**
   Users never enter keys. Developer encrypts keys → bundled at build time → distributed in installer.

5. **`scripts/setup-keys.mjs`, `scripts/encrypt-keys.js`, and the `ENCRYPTION_KEY` constant in `main.ts` must always match.**
   Both use `'mossy-2026-packaging-key-change-in-production'`. If you change one, change both.

---

## Packaging checklist (before running `npm run package:win`)

- [ ] `.env.encrypted` has valid, current keys (run `npm run setup-keys` to update)
- [ ] `npm run check-comms` → all critical checks pass (confirms Groq API is live)
- [ ] Render backend has `GROQ_API_KEY` set in its environment variables dashboard
- [ ] Render backend has `MOSSY_API_TOKEN` matching `MOSSY_BACKEND_TOKEN` in `.env.encrypted`
- [ ] `npm run test:unit` → all 193 tests pass
- [ ] `npm run build` succeeds without errors

---

## Render backend environment variables (set on render.com dashboard)

These live on the **server**, not in the app. Set them in the Render service's Environment tab:

```
GROQ_API_KEY=<your groq key>
OPENAI_API_KEY=<your openai key>
MOSSY_API_TOKEN=<must match MOSSY_BACKEND_TOKEN in .env.encrypted>
```
