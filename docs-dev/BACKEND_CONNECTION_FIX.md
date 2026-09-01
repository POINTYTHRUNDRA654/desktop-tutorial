# Mossy Render Backend Connection Fix

**Date:** June 17, 2026  
**Status:** ✅ Applied and verified

## Problem
Mossy was losing the Render backend connection on local runs even though the backend itself was healthy.

## Root Cause
- Dev startup only looked for `.env.local`, so a repo that relied on `.env.encrypted` never loaded the backend token.
- Existing settings could keep `backendBaseUrl` blank, which made the renderer and voice setup treat the backend as unavailable.
- The backend URL and token were present in encrypted form, but they were not being restored early enough for runtime checks.

## Fix Applied
- Dev startup now loads `.env.encrypted` and `.env` as fallback sources.
- Encrypted `enc:` secrets are decrypted during startup in both dev and packaged modes.
- `MOSSY_BACKEND_URL` now defaults to `https://mossy.onrender.com` if it is missing.
- Existing settings are backfilled so `backendBaseUrl` is seeded from the environment when blank.

## Files Touched
- `src/electron/main.ts`

## Verification
- `npm run build` completed successfully.
- `npx tsc -p tsconfig.electron.json --noEmit` completed successfully.

## Recovery Note
If this issue returns on another machine:
1. Confirm `.env.encrypted` is present and being loaded.
2. Confirm `MOSSY_BACKEND_TOKEN` decrypts successfully.
3. Confirm `backendBaseUrl` is stored or seeded in settings.
4. Restart the app after restoring the env/config.
