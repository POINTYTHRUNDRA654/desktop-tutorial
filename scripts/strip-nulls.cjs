/**
 * strip-nulls.cjs
 *
 * Strips embedded null bytes (\x00) from all .ts and .tsx source files
 * in src/renderer/src/ and src/electron/.
 *
 * Root cause: the Cowork/Claude Write tool silently embeds null bytes in
 * large files, causing silent truncation in the compiled Vite bundle.
 *
 * Usage:
 *   node scripts/strip-nulls.cjs
 *
 * Safe to run at any time — only modifies files that actually contain nulls.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = [
  path.join(ROOT, 'src', 'renderer', 'src'),
  path.join(ROOT, 'src', 'electron'),
];

function walkTs(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, results);
    else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(full);
    }
  }
  return results;
}

let fixed = 0;
let clean = 0;

for (const dir of SCAN_DIRS) {
  for (const filePath of walkTs(dir)) {
    const raw = fs.readFileSync(filePath);
    const nullCount = raw.reduce((n, b) => n + (b === 0 ? 1 : 0), 0);
    if (nullCount > 0) {
      const cleaned = Buffer.from(raw.filter(b => b !== 0));
      fs.writeFileSync(filePath, cleaned);
      const rel = path.relative(ROOT, filePath);
      console.log('[FIXED] ' + rel + '  (' + nullCount + ' null bytes removed)');
      fixed++;
    } else {
      clean++;
    }
  }
}

console.log('\nDone. Fixed: ' + fixed + '  Already clean: ' + clean);
if (fixed > 0) {
  console.log('\nRun  npm run build  now to produce a correct bundle.');
}
