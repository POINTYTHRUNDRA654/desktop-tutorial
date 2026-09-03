/**
 * precheck-renderer.mjs
 *
 * Pre-build sanity checks for renderer source files.
 * Catches three classes of silent failures before esbuild sees them:
 *
 *   0. NULL BYTES — embedded \x00 bytes from Write-tool corruption that cause
 *      silent truncation; TypeScript ignores them but the compiled bundle is wrong.
 *
 *   1. CURLY/SMART QUOTES — Unicode typographic quotes (U+2018/19/1C/1D)
 *      that TypeScript tolerates but esbuild rejects with "Unexpected '"".
 *
 *   2. TRUNCATED / STRUCTURALLY BROKEN FILES — caught by running tsc
 *      in noEmit mode before vite gets involved.
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed (build should not proceed)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const RENDERER_SRC = join(ROOT, 'src', 'renderer', 'src');
const ELECTRON_SRC = join(ROOT, 'src', 'electron');

// ── Helpers ────────────────────────────────────────────────────────────────

const CURLY_QUOTES = /[‘’“”]/g;

// Files that legitimately contain literal curly-quote characters as data --
// e.g. the TTS sanitizer's own "detect and strip curly quotes" regex/tests --
// rather than as an accidental smart-quote typo that would break esbuild.
// Every hit in these files was checked by hand and confirmed to sit inside a
// properly-delimited string or regex literal (so esbuild parses it fine);
// keep this list short and specific rather than loosening the check itself.
const CURLY_QUOTE_ALLOWLIST = new Set([
  join('renderer', 'src', 'utils', 'sanitizeForSpeech.ts'),
  join('renderer', 'src', 'utils', 'sanitizeForSpeech.test.ts'),
]);

function* walkTs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTs(full);
    } else if (entry.isFile() && ['.ts', '.tsx'].includes(extname(entry.name))) {
      yield full;
    }
  }
}

function findCurlyQuotes(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const matches = [...lines[i].matchAll(CURLY_QUOTES)];
    for (const m of matches) {
      hits.push({ line: i + 1, col: m.index + 1, char: m[0], code: m[0].codePointAt(0).toString(16).toUpperCase() });
    }
  }
  return hits;
}

// ── Check 0: Null Bytes ────────────────────────────────────────────────────
// The Cowork/Claude Write tool silently embeds \x00 bytes in large files.
// TypeScript ignores them but Vite compiles the corrupted version, producing
// a truncated bundle with the wrong runtime behaviour.

console.log('\n► precheck-renderer: scanning for null bytes (Write-tool corruption)…');
let nullByteErrors = 0;

for (const dir of [RENDERER_SRC, ELECTRON_SRC]) {
  for (const filePath of walkTs(dir)) {
    const raw = readFileSync(filePath);
    const count = raw.reduce((n, b) => n + (b === 0 ? 1 : 0), 0);
    if (count > 0) {
      const rel = relative(ROOT, filePath);
      console.error(`\n  ERROR ${rel}`);
      console.error(`      ${count} null byte(s) detected — file is corrupted.`);
      console.error('      Fix: run  node scripts/strip-nulls.cjs  then rebuild.');
      nullByteErrors += count;
    }
  }
}

if (nullByteErrors === 0) {
  console.log('  OK No null bytes found.');
} else {
  console.error(`\n  ERROR ${nullByteErrors} null byte(s) across source files. Build aborted.`);
}

// ── Check 1: Curly Quotes ──────────────────────────────────────────────────

console.log('\n► precheck-renderer: scanning for curly/smart quotes…');
let curlyErrors = 0;

for (const filePath of walkTs(RENDERER_SRC)) {
  const relToSrc = relative(join(ROOT, 'src'), filePath);
  if (CURLY_QUOTE_ALLOWLIST.has(relToSrc)) {
    continue;
  }
  const hits = findCurlyQuotes(filePath);
  if (hits.length > 0) {
    const rel = relative(ROOT, filePath);
    console.error(`\n  ✘ ${rel}`);
    for (const h of hits) {
      console.error(`      line ${h.line}:${h.col}  U+${h.code}  '${h.char}'`);
    }
    curlyErrors += hits.length;
  }
}

if (curlyErrors === 0) {
  console.log('  ✓ No curly quotes found.');
} else {
  console.error(`\n  ✘ ${curlyErrors} curly quote(s) found. Replace with straight ASCII quotes (' or ").`);
}
