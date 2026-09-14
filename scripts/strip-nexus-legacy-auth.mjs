// scripts/strip-nexus-legacy-auth.mjs
//
// Deletes the COMPILED output of src/mining/modBrowser.ts (the legacy Nexus
// personal-API-key auth -- the "apikey:" header scheme Nexus's API
// Acceptable Use Policy disallows for a public-facing app) from dist-electron
// before electron-builder packages the app. Only ever invoked by the
// *:nexus-release npm scripts, run after `npm run build` (so the compiled
// file exists to delete) and before `electron-builder` (so it's gone before
// packaging reads dist-electron).
//
// This is a physical removal, not a runtime toggle: main.ts already guards
// its own require() of this module behind isNexusReleaseBuild() so it never
// tries to load a file that isn't there, but the actual reason this script
// exists is so the file never reaches the shipped asar at all -- satisfying
// "remove API key usage entirely" even against a static scan of the
// packaged app's contents, not just behavioral testing.
//
// Never run this against a normal dev/desktop build -- it deletes a real
// compiled file, and nothing regenerates it until the next `npm run build`.

import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const targets = [
  join(repoRoot, 'dist-electron', 'mining', 'modBrowser.js'),
  join(repoRoot, 'dist-electron', 'mining', 'modBrowser.js.map'),
  join(repoRoot, 'dist-electron', 'mining', 'modBrowser.d.ts'),
];

let removedAny = false;
for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target);
    console.log(`[strip-nexus-legacy-auth] Removed ${target}`);
    removedAny = true;
  }
}

if (!removedAny) {
  console.warn(
    '[strip-nexus-legacy-auth] WARNING: no compiled modBrowser output found to remove. ' +
    'Expected dist-electron/mining/modBrowser.js to exist after `npm run build` -- ' +
    'if the build layout changed, this script needs updating, or the Nexus-release ' +
    'package may still ship the legacy Nexus API key code.'
  );
  process.exitCode = 1;
}
