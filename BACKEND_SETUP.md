# Mossy Backend Setup

This repo now includes an optional backend server under `src/backend/`.

The goal: **your provider keys live on the server**, not inside the shipped desktop app.

## What it does (today)

- `GET /health` — sanity check
- `POST /v1/chat` — proxies chat to Groq or OpenAI (server-side keys)
- `POST /v1/transcribe` — audio transcription via OpenAI Whisper (server-side key)

## Local run

1) Install deps (already part of the root `package.json`):

- `npm install`

2) Build + run:

- `npm run backend:build`

Then either set env vars inline:

- `MOSSY_API_TOKEN=dev-token GROQ_API_KEY=... OPENAI_API_KEY=... npm run backend:start`

Or create a local env file (recommended):

- Copy `.env.backend.example` → `.env.backend`
- Fill in `GROQ_API_KEY` and/or `OPENAI_API_KEY`
- Run `npm run backend:start`

Or run in watch mode:

- `MOSSY_API_TOKEN=dev-token GROQ_API_KEY=... OPENAI_API_KEY=... npm run backend:dev`

Default port: `8787` (override with `PORT`).

## Auth

If `MOSSY_API_TOKEN` is set, requests must include:

- `Authorization: Bearer <token>`

If `MOSSY_API_TOKEN` is **not** set, auth is disabled (OK for local dev, not OK for public).

### Key safety note (important)

Most providers (and Render) will **hide secret values after you save them**. Treat keys like passwords:

- Copy new keys immediately into a password manager (recommended) or a secure local note.
- If you lose a key value, you generally must **generate a new key** and update your environment variables.

Generate a strong backend token locally (Windows PowerShell):

- `powershell -NoProfile -Command "[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))"`

## Environment

See `.env.backend.example`.

The backend automatically loads (if present), in this order:

- `.env.backend`
- `.env.local`
- `.env`

Existing system environment variables always win.

## Render.com (simple deploy)

1) Create a new **Web Service**
2) Connect your Git repo
3) Set:

- **Build Command**: `npm install && npm run backend:build`
- **Start Command**: `npm run backend:start`

4) Add Environment Variables:

- `MOSSY_API_TOKEN` (required)
- `GROQ_API_KEY` and/or `OPENAI_API_KEY`
- Optional: `GROQ_MODEL`, `OPENAI_MODEL`, `OPENAI_TRANSCRIBE_MODEL`

## Next step (app wiring)

The Electron main process supports routing AI + transcription through the backend when configured:

- `MOSSY_BACKEND_URL` — e.g. `https://your-service.onrender.com`
- `MOSSY_BACKEND_TOKEN` — optional; if set, sent as `Authorization: Bearer <token>`

If the backend call fails, the app falls back to its existing behavior (local stored provider keys, or local whisper fallback where applicable).

Security note: putting a shared bearer token in a distributed client is extractable. For a public "works out of the box" installer, plan for per-user auth/quotas or other abuse controls server-side.
