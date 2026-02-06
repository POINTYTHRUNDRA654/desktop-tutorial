# Mossy Desktop – Project Memory (living doc)

This file exists because chat sessions/timeouts aren’t durable. Treat this as the canonical “what we built / why / what’s next”.

## Current goals (product)
- **Installer should feel functional on download**.
- **Secrets should not be exposed to the renderer/UI**.
- Optional: **shared memory bank** so all users benefit from learnings.

## What we fixed / changed recently
### 1) Avatar missing in packaged builds
- Root cause: hardcoded absolute asset paths (e.g. `/mossy-avatar.svg`) can break under Electron `file://` packaging.
- Fix: use a base-aware URL via Vite `import.meta.env.BASE_URL` (centralized in the avatar helper), and update all avatar consumers.

### 2) Electron dev server port mismatch
- Root cause: Electron main process was hardcoded to load `http://localhost:5173` while `.env`/Vite used `5174`.
- Fix: main process dev URL now respects `VITE_DEV_SERVER_PORT`/`DEV_SERVER_PORT`.

### 3) Key handling alignment + privacy
- Root cause: some UI previously stored keys in `localStorage`, but the main process reads secrets from its own settings/env. That made “voice” look broken after reinstall/reset.
- Fix: keys are managed via Electron IPC settings (main process owns secrets); renderer only sees **presence booleans** via `getSecretStatus()`.

### 4) Secrets encrypted at rest on the user machine
- Implemented encrypted storage using Electron `safeStorage`:
  - Keys are stored as encrypted `*Enc` fields in `settings.json`.
  - Plaintext secret fields are cleared and never sent to the renderer.
  - Automatic migration converts any legacy plaintext secrets to encrypted storage.
- Primary implementation: `src/electron/main.ts`.

### 5) Remove “keys in renderer” leaks
- Video transcription no longer requires passing an OpenAI key from renderer to main.
- ElevenLabs renderer-side fetch fallback was removed so the ElevenLabs key is never used in renderer; it must go through IPC.

## Important constraints (non-negotiable security reality)
- If you ship a desktop app with **shared provider keys baked into the client**, they can be extracted. This cannot be made “truly hidden” in a distributed client.
- Therefore, “download → fully functional without users adding keys” requires **one** of:
  1) **Backend you control** (client calls your API; provider keys live server-side)
  2) **Fully local/offline** models/tools (bigger installer; hardware constraints)
  3) Users supply their own keys (now stored securely)

## Voice pipeline (current architecture)
- **TTS**:
  - Default: browser SpeechSynthesis
  - Optional: ElevenLabs via main-process IPC
- **STT**:
  - `transcribe-audio` IPC in main process (OpenAI Whisper or Deepgram)
- **LLM**:
  - Cloud: Groq via main-process IPC
  - Local option exists via `ml-llm-generate` (Ollama / OpenAI-compatible)

## What still blocks “works on download”
- Live voice currently depends on cloud services for full functionality unless:
  - you provide a backend with your keys, or
  - users provide their own keys, or
  - you ship local STT+LLM defaults.

Also: some flows still hard-fail when cloud config is missing (candidate to change to graceful fallback).

## Recommended cheapest/easiest deployment path (for ‘works on download’)
### Backend (keys stay server-side)
- Run a small API service that exposes:
  - `POST /chat`
  - `POST /transcribe`
  - `POST /tts`
- Store provider keys as environment variables on the host.
- Add abuse protection:
  - a single `APP_API_KEY` header (minimum viable)
  - rate limiting + quotas

**Host recommendation for this app class (voice + uploads):** Render (simple persistent Node service, easy env vars/logs).

### Shared memory bank (all users)
For a shared memory bank, the main cost isn’t hosting—it’s:
- embedding generation
- STT usage
- LLM usage for summarization/curation

**Recommended approach:** hybrid memory
- Private-by-default per user.
- Explicit “Share to community memory” button for global memory.
- Moderation/filters to avoid PII and low-quality content.

**Stack recommendation:**
- Supabase (Postgres + pgvector + Auth) for memory storage + vector search.
- Render for the API service (or Supabase Edge Functions if constraints allow).

## Cost control suggestions
- Only embed/store **summaries** and high-signal outcomes.
- Batch embeddings in a queue.
- Rate limit chat/transcribe endpoints.
- Cap audio duration per request.

## Next engineering steps (if we continue)
1) Make Live voice **graceful without keys** (no hard throws):
   - Allow “TTS-only” mode; show setup guidance banner.
   - Use local LLM when available.
2) Add backend client option:
   - `VITE_BACKEND_URL` (renderer) and IPC calls to backend.
3) Implement shared memory API + DB schema:
   - `memories` table (user_id, content, summary, tags, created_at)
   - `embeddings` / vector column for semantic search.

## File touchpoints (high signal)
- `src/electron/main.ts` – IPC, settings, secret storage, transcription/chat
- `src/electron/preload.ts` – renderer bridge
- `src/renderer/src/PrivacySettings.tsx` – key configuration UI (renderer calls `setSettings`, shows `getSecretStatus`)
- `src/renderer/src/LiveContext.tsx` – voice session + gating behavior

---

If something in this doc diverges from code, update the doc as part of the next change.
