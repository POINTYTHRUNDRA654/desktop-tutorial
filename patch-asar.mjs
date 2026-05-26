/**
 * patch-asar.mjs — patches the installed Mossy NVIDIA app with freshly compiled main.js
 * Run from an ADMIN command prompt:
 *   node patch-asar.mjs
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT  = 'D:\\Projects\\desktop-tutorial';
const ASAR  = join(ROOT, 'node_modules\\.bin\\asar.cmd');
const TSC   = join(ROOT, 'node_modules\\.bin\\tsc.cmd');
const BUILT = join(ROOT, 'dist-electron\\electron\\main.js');
const TMP   = 'C:\\Temp\\mossy-asar-patch';

// ── helpers ────────────────────────────────────────────────────────────────────
const run = (cmd, label) => {
  console.log(`\n  → ${label}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
  } catch (e) {
    console.error(`\n✗ FAILED: ${label}`);
    process.exit(1);
  }
};

const findFile = (dir, name) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    } else if (entry === name) return full;
  }
  return null;
};

const findAllAsars = () => {
  const candidates = [
    // win-unpacked (highest priority — this is what you run from the release folder)
    join(ROOT, 'release\\win-unpacked\\resources\\app.asar'),
    // D:\ installs
    'D:\\Program Files\\desktop-tutorial\\Mossy NVIDIA\\resources\\app.asar',
    'D:\\Program Files (x86)\\desktop-tutorial\\Mossy NVIDIA\\resources\\app.asar',
    // F:\ installs
    'F:\\Program Files\\desktop-tutorial\\Mossy NVIDIA\\resources\\app.asar',
    'F:\\Program Files (x86)\\desktop-tutorial\\Mossy NVIDIA\\resources\\app.asar',
    // C:\ installs
    'C:\\Program Files\\desktop-tutorial\\Mossy NVIDIA\\resources\\app.asar',
    'C:\\Program Files (x86)\\desktop-tutorial\\Mossy NVIDIA\\resources\\app.asar',
    // E:\ installs
    'E:\\Program Files\\desktop-tutorial\\Mossy NVIDIA\\resources\\app.asar',
  ];
  const found = [];
  for (const c of candidates) {
    if (existsSync(c)) { console.log(`  ✓ Found: ${c}`); found.push(c); }
  }
  return found;
};

// ── main ───────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════');
console.log('  Mossy AI — Asar Hot-Patcher (Node.js edition)');
console.log('══════════════════════════════════════════════════\n');

// 1. Compile main.ts
console.log('[1/5] Compiling src/electron/main.ts...');
run(`"${TSC}" -p tsconfig.electron.json`, 'tsc -p tsconfig.electron.json');
if (!existsSync(BUILT)) {
  console.error(`\n✗ Compiled file not found: ${BUILT}`);
  process.exit(1);
}
console.log(`  ✓ Compiled OK`);

// 2. Find all installed asars (win-unpacked + any Program Files install)
console.log('\n[2/5] Locating all installed app.asar files...');
const ALL_ASARS = findAllAsars();
if (ALL_ASARS.length === 0) {
  console.error('\n✗ Could not find any app.asar on any drive.');
  console.error('  Run the installer first, then re-run this script.');
  process.exit(1);
}
console.log(`  Found ${ALL_ASARS.length} asar(s) to patch.`);

// 3–5. Patch each one
let patchNum = 3;
for (const INSTALLED of ALL_ASARS) {
  const BACKUP = INSTALLED.replace(/\.asar$/, '.asar.bak');

  console.log(`\n[${patchNum}/5] Backing up: ${INSTALLED}`);
  copyFileSync(INSTALLED, BACKUP);
  console.log(`  ✓ Backup: ${BACKUP}`);
  patchNum++;

  console.log(`\n[${patchNum}/5] Extracting, patching, repacking...`);
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  run(`"${ASAR}" extract "${INSTALLED}" "${TMP}"`, `asar extract → ${INSTALLED}`);

  const TARGET = findFile(TMP, 'main.js');
  if (!TARGET) {
    console.error('\n✗ Could not find main.js inside extracted asar!');
    process.exit(1);
  }
  console.log(`  Patching: ${TARGET}`);
  copyFileSync(BUILT, TARGET);
  console.log(`  ✓ main.js replaced`);

  run(`"${ASAR}" pack "${TMP}" "${INSTALLED}"`, `asar pack → ${INSTALLED}`);
  rmSync(TMP, { recursive: true, force: true });
  console.log(`  ✓ Repacked: ${INSTALLED}`);
  patchNum++;
}
console.log('\n══════════════════════════════════════════════════');
console.log('  ✓ PATCH COMPLETE — launch Mossy NVIDIA to test!');
console.log('══════════════════════════════════════════════════');
console.log('\n  Fixed: analytics:get-analytics-config handler');
console.log('  Fixed: securityValidator crash blocker');
console.log('  Fixed: main.ts truncation + app lifecycle');
console.log(`\n  Patched ${ALL_ASARS.length} location(s):`);
ALL_ASARS.forEach(p => console.log(`    • ${p}`));
console.log('\n  To rollback: replace app.asar with app.asar.bak\n');
