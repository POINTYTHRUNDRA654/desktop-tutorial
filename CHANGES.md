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

## In progress 🔄

_Nothing currently pending. All items are in Done._

---

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
