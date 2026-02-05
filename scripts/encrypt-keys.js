/**
 * Script to encrypt API keys for packaging
 * This creates an encrypted environment file that can be safely distributed
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple encryption for packaging (not as secure as safeStorage but distributable)
const ENCRYPTION_KEY = 'mossy-2026-packaging-key-change-in-production';

function encrypt(text) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encrypted) {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Read current .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=');
    }
  }
});

// Keys that need encryption
const sensitiveKeys = [
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
  'DEEPGRAM_API_KEY',
  'MOSSY_BACKEND_TOKEN',
  'MOSSY_BRIDGE_TOKEN'
];

// Create encrypted environment file
const encryptedEnv = {};

// Encrypt sensitive keys
sensitiveKeys.forEach(key => {
  if (envVars[key]) {
    encryptedEnv[key] = `enc:${encrypt(envVars[key])}`;
    console.log(`✓ Encrypted ${key}`);
  }
});

// Keep non-sensitive keys as-is
Object.keys(envVars).forEach(key => {
  if (!sensitiveKeys.includes(key)) {
    encryptedEnv[key] = envVars[key];
  }
});

// Write encrypted environment file
const encryptedEnvPath = path.join(__dirname, '..', '.env.encrypted');
const encryptedContent = Object.entries(encryptedEnv)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync(encryptedEnvPath, encryptedContent);
console.log(`\n✓ Encrypted environment file created: .env.encrypted`);

// Test decryption
console.log('\n🔍 Testing decryption...');
sensitiveKeys.forEach(key => {
  if (encryptedEnv[key] && encryptedEnv[key].startsWith('enc:')) {
    const encrypted = encryptedEnv[key].slice(4);
    const decrypted = decrypt(encrypted);
    const original = envVars[key];
    if (decrypted === original) {
      console.log(`✓ ${key} decryption successful`);
    } else {
      console.log(`✗ ${key} decryption failed`);
    }
  }
});

console.log('\n📦 Ready for packaging! Use .env.encrypted instead of .env.local for distribution.');