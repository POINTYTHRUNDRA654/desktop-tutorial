# Mossy ↔ Render Backend — Permanent Fix Reference

> **Keep this file.** This fixes the recurring "not connecting to backend" issue.  
> Every time the connection breaks, start here — **do not spend an hour debugging**.

---

## What Breaks and Why

Mossy AI chat routes through `https://mossy.onrender.com`.  
The desktop app and the Render service must share a **secret token**.  
If they get out of sync, every AI request gets a `401 Unauthorized` or silent failure.

Two things can cause a mismatch:
1. A Copilot session "rotates" the token in `.env.encrypted` without updating Render.
2. Render is redeployed and the env var is lost or reset.

---

## The Token Value (DO NOT CHANGE without updating both sides)

The desktop app's `.env.encrypted` holds the token **encrypted**.  
Decrypted, the value is:

```
61eb68af0a4daee3eebcae5d6a9b6638
```

This must be set in **two places**:

| Location | Variable name | Value |
|---|---|---|
| Render dashboard → Environment | `MOSSY_BACKEND_TOKEN` | `61eb68af0a4daee3eebcae5d6a9b6638` |
| `.env.encrypted` (this repo) | `MOSSY_BACKEND_TOKEN` | `enc:76fa80f159032db06b9903c75e4969f4:077ee485bae345dcc58ce488580ccc075be47197f8cbec8c27efc18204a7f40e8b72018bf38d4399c43933f77111dbc0` |

---

## Fix Checklist — Run This Every Time It Breaks

### Step 1 — Check the Render service is live

Open PowerShell and run:
```powershell
Invoke-RestMethod https://mossy.onrender.com/health
```
- ✅ Returns `{ ok = True }` → service is up, token is the issue (go to Step 2)
- ❌ Hangs or errors → Render is sleeping or down (go to Step 1b)

**Step 1b — Wake up Render (free tier sleeps)**
1. Go to https://dashboard.render.com
2. Find the `mossy` service
3. If status is **Suspended**: click **Resume Service**
4. If status is **Failed**: click **Logs**, look for the error, then click **Manual Deploy**
5. Wait 60 seconds, retry the health check above

---

### Step 2 — Verify the token on Render

1. Go to https://dashboard.render.com → your `mossy` service
2. Click **Environment** tab
3. Find `MOSSY_BACKEND_TOKEN`
4. The value must be exactly: `61eb68af0a4daee3eebcae5d6a9b6638`
5. If it is wrong or missing: set it, click **Save Changes**, then **Manual Deploy**

---

### Step 3 — Verify `.env.encrypted` in the repo

The `MOSSY_BACKEND_TOKEN` line in `.env.encrypted` must be:
```
MOSSY_BACKEND_TOKEN=enc:76fa80f159032db06b9903c75e4969f4:077ee485bae345dcc58ce488580ccc075be47197f8cbec8c27efc18204a7f40e8b72018bf38d4399c43933f77111dbc0
```

If it was changed by a Copilot session, restore it to the line above.

---

### Step 4 — Rebuild and deploy the desktop app

After any change to `.env.encrypted`, you must rebuild:

```powershell
# In D:\Projects\desktop-tutorial
npm run build
node deploy-full.cjs
```

Then **close and relaunch Mossy NVIDIA**.

---

### Step 5 — Verify the connection

In PowerShell:
```powershell
$token = "61eb68af0a4daee3eebcae5d6a9b6638"
$body = '{"messages":[{"role":"user","content":"ping"}],"model":"llama-3.1-8b-instant"}'
Invoke-RestMethod https://mossy.onrender.com/v1/chat `
  -Method POST `
  -Headers @{ Authorization = "******"; "Content-Type" = "application/json" } `
  -Body $body
```
- ✅ Returns `{ ok = True; text = "..." }` → working
- ❌ `401` → token mismatch, go back to Step 2
- ❌ `500 missing API key` → Groq key not set on Render (see below)

---

## Render Environment Variables — Full List

Set all of these in Render → Environment tab:

```
MOSSY_BACKEND_TOKEN = 61eb68af0a4daee3eebcae5d6a9b6638
GROQ_API_KEY        = <your Groq key from https://console.groq.com/keys>
PORT                = 8787
GROQ_MODEL          = llama-3.1-8b-instant
```

`GROQ_API_KEY` is free. Get one at https://console.groq.com/keys if missing.

---

## Why This Kept Breaking

| Date | What happened |
|---|---|
| May 2026 | Working — token `61eb68af0a4daee3eebcae5d6a9b6638`, Render had matching value |
| June 16 | Copilot session `d1f11e21` "rotated" token but stored a corrupted 29-char value instead of 32-char — every request failed |
| June 17 | Copilot session `f06390f` improved env loading but didn't fix the corrupted token |
| June 17 (this fix) | Token restored to original 32-char working value, docs corrected |

**Root cause**: Copilot sessions sometimes corrupt the token when editing `.env.encrypted`.  
**Prevention**: Never let a Copilot session change `.env.encrypted` unless you verify the decrypted token still matches Render.

---

## Render Build Settings (verify these are set)

| Field | Value |
|---|---|
| Branch | `master` |
| Root Directory | *(empty)* |
| Build Command | `npm install` |
| Start Command | `npx tsx backend/token-server.ts` |
| Auto-Deploy | ✅ On |

---

## Emergency: Token is completely unknown / lost

Generate a new one in PowerShell:
```powershell
$bytes = New-Object byte[] 16
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
```

Then:
1. Set `MOSSY_BACKEND_TOKEN=<new-value>` in Render
2. Re-encrypt with: `node scripts/encrypt-env.mjs` (or ask Copilot to re-encrypt the specific key)
3. Update `.env.encrypted` with the new encrypted value
4. Rebuild + deploy the desktop app
