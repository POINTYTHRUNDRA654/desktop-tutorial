/**
 * deploy-full.cjs - Full slim-pack deploy of dist/ + dist-electron/ into app.asar
 * Run from the project root: node deploy-full.cjs
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const os   = require('os');

const ROOT   = __dirname;
const TMP    = path.join(os.tmpdir(), 'mossy-full-deploy');
const DEST   = path.join(ROOT, 'Mossy', 'Mossy NVIDIA', 'resources', 'app.asar');
const BACKUP = DEST + '.bak';
const ASAR   = require(path.join(ROOT, 'node_modules', '@electron', 'asar', 'lib', 'asar.js'));

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function main() {
  console.log('\n[MOSSY.SPACE] Full Slim-Pack Deployer\n');
  console.log('ROOT: ' + ROOT);

  // 1. Verify build outputs
  const distDir         = path.join(ROOT, 'dist');
  const distElectronDir = path.join(ROOT, 'dist-electron');
  if (!fs.existsSync(distDir))         { console.error('ERROR: dist/ not found'); process.exit(1); }
  if (!fs.existsSync(distElectronDir)) { console.error('ERROR: dist-electron/ not found'); process.exit(1); }
  console.log('[1/6] Build outputs verified');

  // 2. Verify destination
  if (!fs.existsSync(DEST)) { console.error('ERROR: app.asar not found at ' + DEST); process.exit(1); }
  console.log('[2/6] Target asar found: ' + DEST);

  // 3. Backup
  fs.copyFileSync(DEST, BACKUP);
  console.log('[3/6] Backup created: ' + BACKUP);

  // 4. Extract existing asar
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  console.log('[4/6] Extracting current asar...');
  ASAR.extractAll(DEST, TMP);
  console.log('      Extracted to ' + TMP);

  // 5. Overlay new build outputs
  console.log('[5/6] Overlaying new build outputs...');
  const tmpDist = path.join(TMP, 'dist');
  if (fs.existsSync(tmpDist)) fs.rmSync(tmpDist, { recursive: true, force: true });
  copyDir(distDir, tmpDist);
  console.log('      dist/ replaced');

  const tmpDE = path.join(TMP, 'dist-electron');
  if (fs.existsSync(tmpDE)) fs.rmSync(tmpDE, { recursive: true, force: true });
  copyDir(distElectronDir, tmpDE);
  console.log('      dist-electron/ replaced');

  // 6. Slim-pack (native .node modules stay in app.asar.unpacked)
  console.log('[6/6] Slim-packing...');
  await ASAR.createPackageWithOptions(TMP, DEST, { unpack: '{*.node,*.dll}' });
  fs.rmSync(TMP, { recursive: true, force: true });

  console.log('\nDEPLOY COMPLETE');
  console.log('Deployed to: ' + DEST);
  console.log('Backup at:   ' + BACKUP);
  console.log('\nClose and relaunch Mossy NVIDIA to load the new build.\n');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
