# Mossy Packaging Guide

## Overview

This guide explains how to properly package Mossy for distribution, including handling encrypted environment variables and ensuring dev/production parity.

## Critical Components

### 1. Environment Variables

**Development (.env.local)**
- Plain-text API keys for local development
- Not committed to git (in `.gitignore`)
- Format: `OPENAI_API_KEY=sk-...`

**Production (.env.encrypted)**
- Encrypted API keys for distribution
- Committed to git (safe to share)
- Format: `OPENAI_API_KEY=enc:IV:ENCRYPTED_DATA`

### 2. Encryption Key

Location: `src/electron/main.ts:1022`

```typescript
const ENCRYPTION_KEY = 'mossy-2026-packaging-key-change-in-production';
```

⚠️ **IMPORTANT**: This key must match what was used to encrypt `.env.encrypted`

### 3. Automatic Decryption

When packaged (`app.isPackaged === true`), the main process automatically:
1. Loads `.env.encrypted` from the app directory
2. Detects `enc:` prefixed values
3. Decrypts them using the `ENCRYPTION_KEY`
4. Makes them available to the app

## Packaging Process

### Step 1: Fix Environment Encryption

Before packaging, ensure `.env.encrypted` uses the correct key:

```bash
node scripts/fix-env-encryption.mjs
```

This script:
- ✓ Backs up the current `.env.encrypted`
- ✓ Attempts to decrypt with known keys
- ✓ Re-encrypts with the standard key from `main.ts`
- ✓ Verifies the result

### Step 2: Build the App

```bash
npm run build
```

This:
- Copies knowledge base markdown files to `public/knowledge/`
- Builds the Vite renderer process to `dist/`
- Compiles TypeScript Electron main process to `dist-electron/`

### Step 3: Package for Distribution

**Windows (NSIS installer):**
```bash
npm run package:win
```

**All platforms:**
```bash
npm run package
```

Output goes to `release/` directory.

### Step 4: Verify Packaging

Check that the installer includes:
- ✓ `dist/` - Renderer bundle
- ✓ `dist-electron/` - Main process
- ✓ `.env.encrypted` - Encrypted config
- ✓ `public/` - Knowledge base and assets
- ✓ `external/volttech-dist/` - External dependencies

## Dev vs Production Differences

| Feature | Development | Production |
|---------|-------------|------------|
| **Environment File** | `.env.local` (plain) | `.env.encrypted` (encrypted) |
| **API Key Loading** | Direct from dotenv | Decrypt after dotenv |
| **DevTools** | Auto-open | Closed by default |
| **Window Load** | Vite dev server (5174) | Bundled `dist/index.html` |
| **Backend URL** | From env or empty | `https://mossy.onrender.com` |
| **Hot Reload** | Enabled | Disabled |
| **Source Maps** | Full | None |

## Troubleshooting

### "API keys not working in installer"

**Symptom**: Mossy AI features don't work in the packaged app, but work in dev.

**Cause**: Encryption key mismatch between `.env.encrypted` and `main.ts`.

**Solution**:
```bash
node scripts/fix-env-encryption.mjs
npm run package:win
```

### "Environment file not found"

**Symptom**: Console shows `.env.encrypted` doesn't exist.

**Cause**: File not included in electron-builder config.

**Solution**: Check `package.json` `build.files` array includes `.env.encrypted`.

### "Decryption fails"

**Symptom**: Console shows "Failed to decrypt OPENAI_API_KEY".

**Possible causes**:
1. Wrong encryption key in `main.ts`
2. Corrupted `.env.encrypted` file
3. Missing encryption prefix (`enc:`)

**Solution**:
1. Run `node scripts/fix-env-encryption.mjs`
2. If that fails, manually create `.env.encrypted` with encrypted values
3. Or, configure API keys in the app Settings UI (which handles encryption automatically)

## Security Notes

### ✅ Safe Practices

- ✓ `.env.encrypted` can be committed to git
- ✓ Encryption key in source code is acceptable for open-source apps
- ✓ Users can override with Settings UI
- ✓ Settings UI uses Electron `safeStorage` (OS keychain)

### ⚠️ Important Warnings

- ⚠️ Never commit `.env.local` (plain-text keys)
- ⚠️ Don't use `VITE_*` prefix for secrets (exposed to renderer)
- ⚠️ Change encryption key for production deployments
- ⚠️ Revoke and rotate any keys committed by mistake

## Alternative: Settings UI Configuration

Users don't need to rely on `.env.encrypted`. They can configure API keys via:

1. Open Mossy
2. Navigate to Settings
3. Enter API keys in the form
4. Keys are encrypted with OS keychain (`safeStorage`)

This is actually **more secure** than `.env.encrypted` because:
- Uses OS-level encryption
- Never exposed in source code
- Per-user configuration

## Build Artifacts

After `npm run build`:
```
dist/                    # Vite renderer output
├── index.html          # Entry point
├── assets/             # Bundled JS/CSS
└── ...

dist-electron/          # Electron main output
├── electron/
│   └── main.js        # Main process entry
└── ...
```

After `npm run package:win`:
```
release/
├── Mossy Setup 5.4.21.exe    # Windows installer
├── win-unpacked/              # Unpacked app (for testing)
└── ...
```

## Electron Builder Configuration

See `package.json` `build` section:

```json
{
  "build": {
    "appId": "com.volttech.desktop",
    "productName": "Mossy",
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      ".env.encrypted"  // ← Must be here!
    ],
    "extraResources": [
      { "from": "public", "to": "public" }
    ]
  }
}
```

## Verification Checklist

Before releasing:

- [ ] Run `node scripts/fix-env-encryption.mjs`
- [ ] Verify script reports "All keys verified successfully"
- [ ] Run `npm run build`
- [ ] Check `dist/` and `dist-electron/` exist
- [ ] Run `npm run package:win`
- [ ] Check installer created in `release/`
- [ ] Test installer on clean machine
- [ ] Verify API keys work (check console for "✓ Decrypted OPENAI_API_KEY")
- [ ] Test Mossy AI features work
- [ ] Verify onboarding flow works
- [ ] Check program detection works
- [ ] Test Neural Link (Blender/CK/xEdit monitoring)

## Related Files

- `src/electron/main.ts` - Main process, env loading, decryption
- `scripts/fix-env-encryption.mjs` - Encryption fix utility
- `.env.example` - Template for `.env.local`
- `.env.encrypted` - Encrypted production config
- `package.json` - Build scripts and electron-builder config

## Support

If you encounter issues:
1. Check console logs (Ctrl+Shift+I / Cmd+Option+I)
2. Look for `[Main]` prefix logs about env loading
3. Verify encryption with the fix script
4. Open an issue with console output
