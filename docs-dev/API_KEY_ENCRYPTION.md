# API Key Encryption System

## Overview

This repository uses **encrypted API keys** for security. Keys are stored in `.env.encrypted` and automatically decrypted by the application at runtime when packaged.

## How It Works

### Encryption Format
```
enc:IV:ENCRYPTED_DATA
```

**Encryption Method:**
- Algorithm: AES-256-CBC
- Key Derivation: scrypt with salt
- Initialization Vector (IV): Random 16 bytes per encryption

### File Structure

**Development (.env.local):**
- Plain-text keys (git-ignored)
- Used during local development
- Never committed to repository

**Production (.env.encrypted):**
- Encrypted keys (committed to repository)
- Safe to distribute
- Auto-decrypted by packaged app

## Security Features

✅ **Keys Never Exposed in Source Code**
- All sensitive keys encrypted with strong AES-256-CBC
- Encryption key embedded in compiled application
- No plain-text keys in repository

✅ **Automatic Decryption**
- App automatically decrypts on startup (packaged builds only)
- Development uses `.env.local` (plain text, git-ignored)
- No manual intervention needed

✅ **Safe Distribution**
- `.env.encrypted` can be safely committed to git
- Installers include encrypted keys
- Users get working API keys without manual configuration

## Encrypted Keys

The following keys are encrypted in `.env.encrypted`:

- `OPENAI_API_KEY` - OpenAI API access
- `GROQ_API_KEY` - Groq AI API access  
- `DEEPGRAM_API_KEY` - Deepgram speech-to-text
- `MOSSY_BACKEND_TOKEN` - Backend authentication
- `MOSSY_BRIDGE_TOKEN` - Internal bridge security

## Encryption Workflow

### For Developers

1. **Development Setup:**
   ```bash
   # Create .env.local with your API keys (plain text)
   cp .env.example .env.local
   # Edit .env.local with your keys
   ```

2. **Local Development:**
   - App reads `.env.local` (plain text)
   - Keys never leave your machine
   - `.env.local` is git-ignored

3. **Before Packaging:**
   ```bash
   # Encrypt keys from .env.local to .env.encrypted
   node scripts/encrypt-keys.js
   ```

### For Production

1. **Packaged App Startup:**
   - Reads `.env.encrypted`
   - Detects `enc:` prefix
   - Automatically decrypts in memory
   - Uses decrypted keys for API calls

2. **No User Action Needed:**
   - Keys work out of the box
   - No configuration required
   - Secure by default

## Code Implementation

### Encryption (scripts/encrypt-keys.js)
```javascript
function encrypt(text) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}
```

### Decryption (src/electron/main.ts)
```typescript
const decryptEnvVar = (key: string) => {
  const value = process.env[key];
  if (!value || !value.startsWith('enc:')) return;
  
  const encrypted = value.slice('enc:'.length);
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const cryptoKey = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', cryptoKey, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  process.env[key] = decrypted;
};
```

## Maintenance Tools

### Fix Encryption Key Mismatch
If keys were encrypted with wrong key:
```bash
node scripts/fix-env-encryption.mjs
```

This script:
- Tries multiple possible encryption keys
- Re-encrypts with standardized key
- Validates the result
- Creates backup before changes

### Encrypt New Keys
After updating `.env.local`:
```bash
node scripts/encrypt-keys.js
```

## Security Best Practices

### ✅ DO:
- Keep `.env.local` in `.gitignore` (already configured)
- Use encrypted `.env.encrypted` for distribution
- Rotate keys periodically
- Use environment-specific keys (dev/prod)

### ❌ DON'T:
- Never commit `.env.local` to git
- Never decrypt keys manually and expose them
- Never hardcode keys in source code
- Never share encryption key publicly

## Fallback Mechanism

The app has multiple fallback options:

1. **Primary:** Auto-decrypt `.env.encrypted` (packaged builds)
2. **Fallback 1:** Read `.env.local` (development)
3. **Fallback 2:** Use in-app Settings UI to configure keys
4. **Fallback 3:** Render backend with server-side keys

This ensures the app works in all scenarios.

## For Render Backend

The Render backend should use **environment variables** directly (not encrypted):

1. Go to Render dashboard
2. Navigate to Environment tab
3. Add keys as plain environment variables:
   ```
   GROQ_API_KEY=<your-key-here>
   OPENAI_API_KEY=<your-key-here>
   MOSSY_API_TOKEN=<secure-token>
   ```

Render environment variables are already secure - no encryption needed on server side.

## Architecture Benefits

**Security:**
- Keys encrypted at rest in repository
- Only decrypted in memory when needed
- No exposure in distributed installers

**Convenience:**
- Users don't need to configure API keys
- App works immediately after installation
- Developers can still use plain text locally

**Flexibility:**
- Easy key rotation (re-encrypt and commit)
- Multiple deployment options
- Graceful fallbacks if decryption fails

## Verification

To verify encryption is working:

```bash
# Check .env.encrypted has encrypted keys
grep "enc:" .env.encrypted

# Should show lines like:
# OPENAI_API_KEY=enc:abc123:def456...
# GROQ_API_KEY=enc:789xyz:012abc...
```

To verify app can decrypt:

```bash
# Run app in packaged mode
npm run build
npm run start

# Check logs for:
# [Main] ✓ Decrypted OPENAI_API_KEY
# [Main] ✓ Decrypted GROQ_API_KEY
```

## Troubleshooting

### Keys not working in packaged app?
1. Check if `.env.encrypted` exists
2. Verify `enc:` prefix on sensitive keys
3. Run `node scripts/fix-env-encryption.mjs`
4. Rebuild and test

### Need to update keys?
1. Update `.env.local` with new keys
2. Run `node scripts/encrypt-keys.js`
3. Commit updated `.env.encrypted`
4. Rebuild application

### Development keys not working?
1. Ensure `.env.local` exists
2. Check keys are plain text (no `enc:` prefix)
3. Restart development server

## Conclusion

The encrypted API key system provides:
- ✅ **Security** - Keys protected in repository
- ✅ **Convenience** - Auto-decryption in packaged builds
- ✅ **Distribution** - Safe to share installer with keys
- ✅ **Development** - Easy local development with plain text

**The keys stay encrypted until runtime, ensuring maximum security while maintaining usability.**
