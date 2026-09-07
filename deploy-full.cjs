#!/usr/bin/env node
/**
 * deploy-full.cjs — full Universal build + package, in one command.
 *
 * RECREATED 2026-09-07. The original deploy-full.cjs was never committed to
 * git — it was personal, dev-desktop-only tooling (same category as a few
 * other root-level scripts this repo intentionally keeps untracked) — and it
 * got lost from disk at some point, taking the only copy of "how the full
 * deploy actually works" with it. That's fixed properly now instead of just
 * being recreated blind:
 *
 *   - The real reason this script used to also extract/patch/repack
 *     app.asar by hand was that scripts/*.py (needed at runtime by the
 *     Creative Director's FO4-world-scan feature, fo4_strings_scan.py in
 *     particular — see src/electron/main.ts) was never declared to
 *     electron-builder, so packaging silently produced an app missing those
 *     files unless something copied them in afterward.
 *   - That's now declared as a real, git-tracked extraResources entry in
 *     package.json's `build` config ("scripts" -> "scripts", *.py only), so
 *     a plain electron-builder run already produces a correct package. No
 *     asar surgery needed anymore, which means nothing here is a single
 *     point of failure the way the old script was.
 *
 * This file is now just a thin, TRACKED wrapper so `node deploy-full.cjs`
 * keeps working exactly as before: builds the renderer + main process, then
 * packages the Universal (non-NVIDIA) Windows build via electron-builder.
 *
 * Billy's usual workflow, unchanged: run this, then separately run the
 * NVIDIA build by hand (`npm run package:win:nvidia`).
 */

const { execSync } = require('child_process');

function run(cmd) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('══════════════════════════════════════════════════');
console.log('  Mossy — Full Deploy (Universal build)');
console.log('══════════════════════════════════════════════════');

// npm run build == validate-version + vite build + tsc (src/electron/**)
run('npm run build');

// Package the Universal Windows build. Equivalent to `npm run package:win`,
// spelled out here so this script keeps working even if that npm script
// ever changes shape.
run('npx electron-builder --win');

console.log('\n══════════════════════════════════════════════════');
console.log('  ✓ Universal build complete — see release/ for the installer.');
console.log('  Next: run the NVIDIA build (npm run package:win:nvidia) if needed.');
console.log('══════════════════════════════════════════════════');
