#!/usr/bin/env node
/**
 * setup-keys.mjs  –  Interactive API key setup for Mossy packaging
 *
 * Usage:  node scripts/setup-keys.mjs
 *    or:  npm run setup-keys
 *
 * What it does:
 *   1. Reads the existing .env.encrypted (preserves any keys already there)
 *   2. Prompts for each secret key — press Enter to keep the existing value
 *   3. Encrypts every key with AES-256-CBC using the same key as main.ts
 *   4. Writes an updated .env.encrypted
 *   5. Runs a self-verification (decrypts and checks) so you know it worked
 *
 * After running this script:
 *   npm run build && npm run package:win
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Must match the constant in src/electron/main.ts decryptEnvVar block.
// IMPORTANT: This key is embedded in the compiled binary (standard for packaged Electron apps).
// It protects keys at rest in the distributed installer; it is NOT a secret that can be hidden
// from a determined reverse-engineer. The real security model is: API keys live on the Render
// backend; .env.encrypted only carries them as a direct-SDK fallback.
// To rotate: update this constant here AND in src/electron/main.ts, then re-run setup-keys.
const ENCRYPTION_KEY = 'mossy-2026-packaging-key-change-in-production';

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function encrypt(plaintext) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `enc:${iv.toString('hex')}:${encrypted}`;
}

function decrypt(stored) {
  if (!stored || !stored.startsWith('enc:')) return null;
  try {
    const parts = stored.slice(4).split(':');
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let d = decipher.update(parts[1], 'hex', 'utf8');
    d += decipher.final('utf8');
    return d;
  } catch {
    return null;
  }
}

// ─── .env file helpers ────────────────────────────────────────────────────────

function parseEnvFile(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    vars[key] = val;
  }
  return vars;
}

function serializeEnvFile(vars) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
}

// ─── Interactive prompt ───────────────────────────────────────────────────────

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const encryptedPath = path.join(ROOT, '.env.encrypted');

  // Load existing .env.encrypted
  let existing = {};
  if (fs.existsSync(encryptedPath)) {
    existing = parseEnvFile(fs.readFileSync(encryptedPath, 'utf-8'));
    console.log('\n✓ Loaded existing .env.encrypted\n');
  } else {
    console.log('\n⚠  No .env.encrypted found — will create a new one.\n');
  }

  // Determine current decrypted values for display (show prefix only, never full key)
  const currentDisplay = (rawValue) => {
    if (!rawValue) return '(empty)';
    const dec = decrypt(rawValue);
    if (dec) {
      // Show type prefix only (gsk_, sk-, etc.) — never enough to be usable
      const prefix = dec.substring(0, 4);
      return `${prefix}... (${dec.length} chars, already encrypted)`;
    }
    return `... (plain text, will be encrypted)`;
  };

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('─────────────────────────────────────────────────────────');
  console.log('  Mossy Key Setup — press Enter to keep existing values');
  console.log('─────────────────────────────────────────────────────────\n');

  // Secret keys to manage
  const secretKeys = [
    { env: 'GROQ_API_KEY',        label: 'Groq API key (starts with gsk_)' },
    { env: 'OPENAI_API_KEY',      label: 'OpenAI API key (starts with sk-)' },
    { env: 'MOSSY_BACKEND_TOKEN', label: 'Render backend auth token (MOSSY_API_TOKEN on Render)' },
    { env: 'MOSSY_BRIDGE_TOKEN',  label: 'Internal bridge token (any random string)' },
    { env: 'DEEPGRAM_API_KEY',    label: 'Deepgram API key (optional, leave blank to skip)' },
  ];

  const updated = { ...existing };

  for (const { env, label } of secretKeys) {
    const current = existing[env];
    console.log(`${label}`);
    if (current) {
      console.log(`  Current: ${currentDisplay(current)}`);
    }
    const input = (await prompt(rl, `  New value (Enter to keep): `)).trim();

    if (input) {
      updated[env] = encrypt(input);
      console.log(`  ✓ Encrypted\n`);
    } else if (current) {
      // Keep existing — but ensure it's encrypted
      if (!current.startsWith('enc:')) {
        updated[env] = encrypt(current);
        console.log(`  ✓ Re-encrypted existing plain-text value\n`);
      } else {
        console.log(`  → Keeping existing encrypted value\n`);
      }
    } else {
      console.log(`  → Skipped (no value)\n`);
    }
  }

  // Non-secret keys — prompt for Render URL
  const urlCurrent = existing['MOSSY_BACKEND_URL'] || 'https://mossy.onrender.com';
  console.log(`Render backend URL`);
  console.log(`  Current: ${urlCurrent}`);
  const urlInput = (await prompt(rl, `  New value (Enter to keep): `)).trim();
  updated['MOSSY_BACKEND_URL'] = urlInput || urlCurrent;

  rl.close();

  // Write updated .env.encrypted
  fs.writeFileSync(encryptedPath, serializeEnvFile(updated), 'utf-8');
  console.log(`\n✓ Written to ${encryptedPath}\n`);

  // Self-verification
  console.log('─────────────────────────────────────────────────────────');
  console.log('  Verification');
  console.log('─────────────────────────────────────────────────────────');
  let allOk = true;
  for (const { env } of secretKeys) {
    const val = updated[env];
    if (!val) {
      console.log(`  ⚠  ${env}: not set`);
      continue;
    }
    if (val.startsWith('enc:')) {
      const dec = decrypt(val);
      if (dec && dec.length > 0) {
        console.log(`  ✓ ${env}: decrypts OK (${dec.length} chars)`);
      } else {
        console.log(`  ✗ ${env}: DECRYPTION FAILED — please re-run and enter the key again`);
        allOk = false;
      }
    } else {
      console.log(`  ✗ ${env}: plain text stored — this should not happen`);
      allOk = false;
    }
  }
  console.log(`  ✓ MOSSY_BACKEND_URL: ${updated['MOSSY_BACKEND_URL']}`);

  console.log('\n─────────────────────────────────────────────────────────');
  if (allOk) {
    console.log('  ✅ All keys verified. Ready to package:');
    console.log('     npm run build && npm run package:win');
  } else {
    console.log('  ❌ Some keys failed verification. Re-run setup-keys before packaging.');
  }
  console.log('─────────────────────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('setup-keys failed:', err);
  process.exit(1);
});
