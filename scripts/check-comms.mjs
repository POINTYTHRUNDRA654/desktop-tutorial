#!/usr/bin/env node
/**
 * check-comms.mjs  —  Live communication health check for Mossy
 *
 * Usage:  node scripts/check-comms.mjs
 *    or:  npm run check-comms
 *
 * What it tests (in order):
 *   1. .env.encrypted is present and the Groq key decrypts without error
 *   2. Primary Groq model (llama-3.3-70b-versatile) responds to a real API call
 *   3. Fallback Groq model (llama-3.1-8b-instant) responds to a real API call
 *   4. Render backend /v1/chat responds (if URL + token are configured in env)
 *
 * Exit code 0 = all critical checks passed.
 * Exit code 1 = one or more critical checks failed.
 *
 * Run this before packaging or after updating a Groq key to confirm comms are live.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ─── Shared with setup-keys.mjs and src/electron/main.ts ────────────────────
const ENCRYPTION_KEY = 'mossy-2026-packaging-key-change-in-production';

function decrypt(stored) {
  if (!stored || !stored.startsWith('enc:')) return stored ?? null; // plaintext passthrough
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

function readEnvFile() {
  const envPath = path.join(ROOT, '.env.encrypted');
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const vars = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const raw = trimmed.slice(eq + 1);
    vars[key] = raw;
  }
  return vars;
}

// ─── Colour helpers ──────────────────────────────────────────────────────────
const G = '\x1b[32m';   // green
const R = '\x1b[31m';   // red
const Y = '\x1b[33m';   // yellow
const B = '\x1b[34m';   // blue
const D = '\x1b[2m';    // dim
const Z = '\x1b[0m';    // reset

const ok   = (msg) => console.log(`  ${G}✓${Z}  ${msg}`);
const fail = (msg) => console.log(`  ${R}✗${Z}  ${msg}`);
const warn = (msg) => console.log(`  ${Y}⚠${Z}  ${msg}`);
const info = (msg) => console.log(`  ${B}ℹ${Z}  ${msg}`);

// ─── Groq live call ──────────────────────────────────────────────────────────
const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const TEST_MESSAGES = [
  { role: 'system', content: 'You are a test. Respond with exactly: OK' },
  { role: 'user',   content: 'Ping' },
];
const TIMEOUT_MS = 15_000;

async function callGroqDirect(apiKey, model) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: TEST_MESSAGES, max_tokens: 10 }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
      return { ok: false, error: msg, status: res.status };
    }
    const text = json?.choices?.[0]?.message?.content || '';
    return { ok: true, text: text.trim() };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, error: `Timed out after ${TIMEOUT_MS / 1000}s` };
    // 'fetch failed' is Node's generic wrapper — surface the root cause if available
    const cause = e?.cause?.message || e?.cause?.code;
    const msg = cause ? `${e.message} (${cause})` : (e?.message || String(e));
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Backend live call ───────────────────────────────────────────────────────
async function callBackend(backendUrl, token) {
  const url = backendUrl.replace(/\/$/, '') + '/v1/chat';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        provider: 'groq',
        model: 'llama-3.1-8b-instant',  // use the cheaper fallback for health checks
        messages: TEST_MESSAGES,
        maxTokens: 10,
      }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.message || json?.error || `HTTP ${res.status}`;
      return { ok: false, error: msg, status: res.status };
    }
    if (!json?.ok) {
      return { ok: false, error: json?.message || json?.error || 'Backend returned ok:false' };
    }
    return { ok: true, text: String(json?.text || '').trim() };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, error: `Timed out after ${TIMEOUT_MS / 1000}s` };
    const cause = e?.cause?.message || e?.cause?.code;
    const msg = cause ? `${e.message} (${cause})` : (e?.message || String(e));
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(58));
  console.log('  Mossy Communication Health Check');
  console.log('═'.repeat(58));

  let criticalFailures = 0;

  // ── Step 1: read and decrypt .env.encrypted ──────────────────────────────
  console.log(`\n${D}── Step 1: Environment file ──────────────────────────────${Z}`);
  const envPath = path.join(ROOT, '.env.encrypted');
  if (!fs.existsSync(envPath)) {
    fail('.env.encrypted not found — run: npm run setup-keys');
    process.exit(1);
  }
  ok('.env.encrypted found');

  const raw = readEnvFile();
  const groqKey = decrypt(raw['GROQ_API_KEY'] || '');
  // MOSSY_BACKEND_URL is stored as plaintext (it's not a secret); decrypt() passes it through unchanged
  const backendUrl = decrypt(raw['MOSSY_BACKEND_URL'] || '') || '';
  const backendToken = decrypt(raw['MOSSY_BACKEND_TOKEN'] || '');

  if (!groqKey) {
    fail('GROQ_API_KEY missing or could not be decrypted — run: npm run setup-keys');
    criticalFailures++;
  } else if (!groqKey.startsWith('gsk_')) {
    warn(`GROQ_API_KEY decrypted but unexpected prefix (got: ${groqKey.slice(0, 6)}...) — expected gsk_`);
  } else {
    ok(`GROQ_API_KEY decrypted — ${groqKey.slice(0, 8)}...${groqKey.slice(-4)} (${groqKey.length} chars)`);
  }

  if (!groqKey) {
    fail('Cannot continue without a Groq API key.');
    console.log('\n' + '═'.repeat(58));
    process.exit(1);
  }

  // ── Step 2: Primary Groq model ───────────────────────────────────────────
  const PRIMARY = 'llama-3.3-70b-versatile';
  console.log(`\n${D}── Step 2: Groq direct — primary model ───────────────────${Z}`);
  info(`Calling Groq API with ${PRIMARY} ...`);
  const r2 = await callGroqDirect(groqKey, PRIMARY);
  if (r2.ok) {
    ok(`${PRIMARY} responded: "${r2.text}"`);
  } else if (r2.status === 429) {
    warn(`${PRIMARY} rate-limited (429) — fallback model will be used automatically`);
  } else {
    fail(`${PRIMARY} failed: ${r2.error}`);
    criticalFailures++;
  }

  // ── Step 3: Fallback Groq model ──────────────────────────────────────────
  const FALLBACK = 'llama-3.1-8b-instant';
  console.log(`\n${D}── Step 3: Groq direct — fallback model ──────────────────${Z}`);
  info(`Calling Groq API with ${FALLBACK} ...`);
  const r3 = await callGroqDirect(groqKey, FALLBACK);
  if (r3.ok) {
    ok(`${FALLBACK} responded: "${r3.text}"`);
  } else if (r3.status === 429) {
    warn(`${FALLBACK} also rate-limited (429) — try again in a few minutes`);
    criticalFailures++;
  } else {
    fail(`${FALLBACK} failed: ${r3.error}`);
    criticalFailures++;
  }

  // ── Step 4: Render backend ───────────────────────────────────────────────
  console.log(`\n${D}── Step 4: Render backend ────────────────────────────────${Z}`);
  if (!backendUrl) {
    warn('MOSSY_BACKEND_URL not set — skipping backend check');
    info('Set MOSSY_BACKEND_URL in .env.encrypted to enable this check');
  } else {
    info(`Calling backend at ${backendUrl} ...`);
    const r4 = await callBackend(backendUrl, backendToken || '');
    if (r4.ok) {
      ok(`Backend responded: "${r4.text}"`);
    } else if (r4.status === 401 || r4.status === 403) {
      warn(`Backend auth failed (${r4.status}) — check MOSSY_BACKEND_TOKEN and Render env vars`);
      // Not a critical failure — the desktop will fall back to direct SDK
    } else if (!r4.status) {
      // No HTTP status means a network-level failure (DNS, connection refused, timeout)
      warn(`Backend unreachable (network error): ${r4.error} — desktop will use direct Groq SDK as fallback`);
    } else {
      warn(`Backend returned error (${r4.status}): ${r4.error} — desktop will use direct Groq SDK as fallback`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(58));
  if (criticalFailures === 0) {
    console.log(`  ${G}✓ All critical checks passed — Mossy comms are live${Z}`);
    console.log(`\n  ${D}Next steps:${Z}`);
    console.log(`    npm run build && npm run package:win`);
  } else {
    console.log(`  ${R}✗ ${criticalFailures} critical check${criticalFailures > 1 ? 's' : ''} failed${Z}`);
    console.log(`\n  ${D}Common fixes:${Z}`);
    console.log(`    • Groq key issues → npm run setup-keys`);
    console.log(`    • Get a new key → https://console.groq.com → API Keys`);
    console.log(`    • Render key → dashboard → Environment → GROQ_API_KEY`);
  }
  console.log('═'.repeat(58) + '\n');

  process.exit(criticalFailures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n[check-comms] Unexpected error:', err?.message || err);
  process.exit(1);
});
