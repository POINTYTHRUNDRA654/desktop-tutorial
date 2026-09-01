#!/usr/bin/env node
/**
 * Clean Build Outputs
 *
 * Removes stale compiled artifacts before a build so that deleted source files
 * never leave behind orphaned output files that could be bundled into a release.
 *
 * Targets:
 *   --electron   dist-electron/   (TypeScript compiler output)
 *   --release    release/         (electron-builder installer output)
 *   --all        dist/, dist-electron/, release/   (default when no flag given)
 *
 * Usage:
 *   node scripts/clean.mjs              # clean everything
 *   node scripts/clean.mjs --electron   # clean only dist-electron/
 *   node scripts/clean.mjs --release    # clean only release/
 */

import { rmSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const targets = {
  electron: ['dist-electron'],
  release: ['release'],
  all: ['dist', 'dist-electron', 'release'],
};

const args = process.argv.slice(2);
const flag = args.find(a => a.startsWith('--'))?.replace('--', '');
const dirs = targets[flag] ?? targets.all;

for (const dir of dirs) {
  const full = resolve(rootDir, dir);
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true });
    console.log(`[clean] ✓ Removed ${dir}/`);
  } else {
    console.log(`[clean] ✓ ${dir}/ already clean`);
  }
}
