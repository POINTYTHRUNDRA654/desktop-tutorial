#!/usr/bin/env node
/**
 * Fix .env.encrypted file to use the correct encryption key
 * 
 * This script:
 * 1. Reads the current .env.encrypted file
 * 2. Attempts to decrypt with various possible keys
 * 3. Re-encrypts with the standardized key from main.ts
 * 4. Validates the result
 * 
 * Usage:
 *   node scripts/fix-env-encryption.mjs
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// This is the key from src/electron/main.ts:1022
const STANDARD_KEY = 'mossy-2026-packaging-key-change-in-production';

/**
 * Decrypt a value using the enc:IV:DATA format
 */
function decryptValue(encryptedValue, encryptionKey) {
  const raw = String(encryptedValue || '').trim();
  if (!raw) return null;
  if (raw.startsWith('plain:')) return raw.slice('plain:'.length);
  if (!raw.startsWith('enc:')) return null;

  const encrypted = raw.slice('enc:'.length);

  if (encrypted.includes(':')) {
    try {
      const parts = encrypted.split(':');
      if (parts.length === 2) {
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}

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

/**
 * Parse .env file into key-value pairs
 */
function parseEnvFile(content) {
  const result = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    result[key] = value;
  }
  
  return result;
}

/**
 * Serialize key-value pairs back to .env format
 */
function serializeEnvFile(obj) {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';
}

async function main() {
  const envEncryptedPath = path.join(rootDir, '.env.encrypted');
  const envBackupPath = path.join(rootDir, '.env.encrypted.backup');
  
  console.log('[Fix Encryption] Starting...');
  console.log('[Fix Encryption] Reading:', envEncryptedPath);
  
  if (!fs.existsSync(envEncryptedPath)) {
    console.error('[Fix Encryption] ERROR: .env.encrypted not found!');
    process.exit(1);
  }
  
  // Backup original file
  const content = fs.readFileSync(envEncryptedPath, 'utf-8');
  fs.writeFileSync(envBackupPath, content, 'utf-8');
  console.log('[Fix Encryption] Backup created:', envBackupPath);
  
  const envVars = parseEnvFile(content);
  
  // Keys that should be encrypted
  const secretKeys = ['OPENAI_API_KEY', 'GROQ_API_KEY', 'DEEPGRAM_API_KEY', 'MOSSY_BACKEND_TOKEN', 'MOSSY_BRIDGE_TOKEN'];
  
  // Try to decrypt with various possible keys
  const possibleKeys = [
    STANDARD_KEY,
    'mossy-2026-packaging-key', // Without the warning suffix
    'your-secret-key-here', // Generic placeholder
  ];
  
  const decrypted = {};
  const failedKeys = [];
  
  for (const key of secretKeys) {
    const value = envVars[key];
    if (!value) {
      console.log(`[Fix Encryption] Skipping ${key} (not present)`);
      continue;
    }
    
    if (!value.startsWith('enc:')) {
      console.log(`[Fix Encryption] Skipping ${key} (not encrypted)`);
      decrypted[key] = value;
      continue;
    }
    
    let success = false;
    for (const possibleKey of possibleKeys) {
      const result = decryptValue(value, possibleKey);
      if (result !== null) {
        console.log(`[Fix Encryption] ✓ Decrypted ${key} with key: ${possibleKey.slice(0, 20)}...`);
        decrypted[key] = result;
        success = true;
        break;
      }
    }
    
    if (!success) {
      console.error(`[Fix Encryption] ✗ Failed to decrypt ${key}`);
      failedKeys.push(key);
    }
  }
  
  if (failedKeys.length > 0) {
    console.error('\n[Fix Encryption] ERROR: Could not decrypt the following keys:');
    failedKeys.forEach(k => console.error(`  - ${k}`));
    console.error('\nPossible solutions:');
    console.error('  1. Add the correct encryption key to possibleKeys array in this script');
    console.error('  2. Use the app Settings UI to configure API keys instead');
    console.error('  3. Create .env.local with plain-text keys for development');
    process.exit(1);
  }
  
  // Re-encrypt all secrets with the standard key
  console.log('\n[Fix Encryption] Re-encrypting with standard key...');
  const reencrypted = { ...envVars };
  
  for (const key of secretKeys) {
    if (decrypted[key]) {
      reencrypted[key] = encryptValue(decrypted[key], STANDARD_KEY);
      console.log(`[Fix Encryption] ✓ Re-encrypted ${key}`);
    }
  }
  
  // Write the new file
  const newContent = serializeEnvFile(reencrypted);
  fs.writeFileSync(envEncryptedPath, newContent, 'utf-8');
  
  console.log('\n[Fix Encryption] ✓ Success!');
  console.log('[Fix Encryption] Updated:', envEncryptedPath);
  console.log('[Fix Encryption] Backup:', envBackupPath);
  
  // Verify by reading back
  console.log('\n[Fix Encryption] Verifying...');
  const verification = parseEnvFile(fs.readFileSync(envEncryptedPath, 'utf-8'));
  let allGood = true;
  
  for (const key of secretKeys) {
    if (decrypted[key]) {
      const verified = decryptValue(verification[key], STANDARD_KEY);
      if (verified === decrypted[key]) {
        console.log(`[Fix Encryption] ✓ Verified ${key}`);
      } else {
        console.error(`[Fix Encryption] ✗ Verification failed for ${key}`);
        allGood = false;
      }
    }
  }
  
  if (allGood) {
    console.log('\n[Fix Encryption] ✓ All keys verified successfully!');
    console.log('[Fix Encryption] The installer will now be able to decrypt API keys.');
  } else {
    console.error('\n[Fix Encryption] ✗ Verification failed! Restoring backup...');
    fs.writeFileSync(envEncryptedPath, content, 'utf-8');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[Fix Encryption] Fatal error:', err);
  process.exit(1);
});
