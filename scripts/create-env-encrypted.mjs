#!/usr/bin/env node
/**
 * Create .env.encrypted file with placeholder encrypted values
 * This allows the build process to succeed without exposing real API keys
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// This is the key from src/electron/main.ts (search for ENCRYPTION_KEY)
const ENCRYPTION_KEY = 'mossy-2026-packaging-key-change-in-production';

/**
 * Encrypt a value using the enc:IV:DATA format
 */
function encryptValue(plainValue, encryptionKey) {
  if (!plainValue) return '';
  
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(plainValue, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `enc:${iv.toString('hex')}:${encrypted}`;
}

async function main() {
  const envEncryptedPath = path.join(rootDir, '.env.encrypted');
  
  console.log('[Create Encrypted Env] Creating .env.encrypted with placeholder values...');
  
  // Create placeholder API keys (these will be overridden by users via Settings UI)
  const placeholderKeys = {
    OPENAI_API_KEY: 'placeholder-openai-key-configure-in-app-settings',
    GROQ_API_KEY: 'placeholder-groq-key-configure-in-app-settings',
    DEEPGRAM_API_KEY: 'placeholder-deepgram-key-configure-in-app-settings',
    ELEVENLABS_API_KEY: 'placeholder-elevenlabs-key-configure-in-app-settings',
    MOSSY_BACKEND_TOKEN: 'placeholder-backend-token',
    MOSSY_BRIDGE_TOKEN: 'mossy-bridge-default-token-change-in-production',
  };
  
  // Encrypt all values
  const encryptedEntries = [];
  
  for (const [key, value] of Object.entries(placeholderKeys)) {
    const encrypted = encryptValue(value, ENCRYPTION_KEY);
    encryptedEntries.push(`${key}=${encrypted}`);
    console.log(`[Create Encrypted Env] ✓ Encrypted ${key}`);
  }
  
  // Add a header comment
  const header = [
    '# Mossy Encrypted API Keys',
    '# This file contains encrypted placeholder API keys for distribution',
    '# Users can configure their own keys via the app Settings UI',
    '# Format: KEY=enc:IV:ENCRYPTED_DATA',
    '',
  ].join('\n');
  
  const content = header + encryptedEntries.join('\n') + '\n';
  
  fs.writeFileSync(envEncryptedPath, content, 'utf-8');
  
  console.log('[Create Encrypted Env] ✓ Created:', envEncryptedPath);
  console.log('[Create Encrypted Env] ✓ File contains', Object.keys(placeholderKeys).length, 'encrypted keys');
  console.log('[Create Encrypted Env] ✓ This file is safe to commit to git (values are encrypted)');
}

main().catch(err => {
  console.error('[Create Encrypted Env] ERROR:', err);
  process.exit(1);
});
