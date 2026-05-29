/**
 * deploy-full.mjs — Full slim-pack deploy of dist/ + dist-electron/ into app.asar
 * Replaces ALL renderer and electron assets (not just main.js).
 * Run from the project root: node deploy-full.mjs
 */

import { existsSync, rmSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import os from 'os';

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const ROOT   = __dirname.replace(/[/\\]$/, '');
const TMP    = join(os.tmpdir(), 'mossy-full-deploy');
const DEST   = join(ROOT, 'Mossy', 'Mossy NVIDIA', 'resources', 'app.asar');
const BACKUP = DEST + '.bak';

const ASAR_BIN = join(ROOT, 'node_modules', '@electron', 'asar', 'lib', 'asar.js');

// ── helpers ────────────────────────────────────────────────────────────────────
function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

function log(msg) { console.log(msg); }

// ── main ───────────────────────────────────────────────────────────────────────
log('\n════════════════════════════════════════════════════════');
log('  MOSSY.SPACE — Full Slim-Pack Deployer');
log('════════════════════════════════════════════════════════\n');
log(`  ROOT: ${ROOT}`);

// 1. Verify build outputs exist
const distDir         = join(ROOT, 'dist');
const distElectronDir = join(ROOT, 'dist-electron');
if (!existsSync(distDir)) {
  console.error('✗ dist/ not found — run npm run build first'); process.exit(1);
}
if (!existsSync(distElectronDir)) {
  console.error('✗ dist-electron/ not found — run npm run build first'); process.exit(1);
}
log('[1/6] Build outputs verified ✓');

// 2. Verify destination asar exists
if (!existsSync(DEST)) {
  console.error(`✗ app.asar not found at: ${DEST}`); process.exit(1);
}
log(`[2/6] Target asar found ✓`);

// 3. Backup
copyFileSync(DEST, BACKUP);
log(`[3/6] Backup created ✓`);

// 4. Extract existing asar
if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

log('[4/6] Extracting current asar...');
const asar = require(ASAR_BIN);
await asar.extractAll(DEST, TMP);
log(`      Extracted to ${TMP} ✓`);

// 5. Overlay new dist/ and dist-electron/
log('[5/6] Overlaying new build outputs...');

const tmpDist = join(TMP, 'dist');
if (existsSync(tmpDist)) rmSync(tmpDist, { recursive: true, force: true });
copyDir(distDir, tmpDist);
log('      dist/ replaced ✓');

const tmpDistElectron = join(TMP, 'dist-electron');
if (existsSync(tmpDistElectron)) rmSync(tmpDistElectron, { recursive: true, force: true });
copyDir(distElectronDir, tmpDistElectron);
log('      dist-electron/ replaced ✓');

// 6. Slim-pack — native .node modules served from app.asar.unpacked
log('[6/6] Slim-packing (no node_modules in archive)...');
await asar.createPackageWithOptions(TMP, DEST, {
  unpack: '{*.node,*.dll}',
});
rmSync(TMP, { recursive: true, force: true });

log('\n════════════════════════════════════════════════════════');
log('  ✓ DEPLOY COMPLETE');
log('════════════════════════════════════════════════════════');
log(`\n  Deployed to: ${DEST}`);
log('  Backup at:   ' + BACKUP);
log('\n  Close and relaunch Mossy NVIDIA to load the new build.\n');
