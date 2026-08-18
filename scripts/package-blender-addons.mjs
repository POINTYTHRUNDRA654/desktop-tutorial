#!/usr/bin/env node
/**
 * Package Blender Add-ons
 *
 * Bundles the Blender add-on into a single ZIP archive
 * (public/mossy-blender-addons.zip) so the packaged installer can ship it
 * for users to install directly into Blender.
 *
 * CONVERGED (2026-08-14): this used to zip a hand-maintained local copy,
 * public/mossy_link_addon.py — a single-file reimplementation that diverged
 * from POINTYTHRUNDRA654/Blender-add-on. (the actively-developed, separately
 * released product real users actually install, distributed on Nexus as
 * "Mossy Fo4 Blender Addon"). Two independently-developed add-ons both
 * trying to own Blender's TCP port 9999 is not a state to maintain — see
 * docs/ARCHITECTURE.md's "Bridge auth" section for the incident this caused
 * (get_context never worked against the add-on real users actually have
 * installed, discovered the hard way during a live GUI test).
 *
 * So: same pattern as brain-b/nexus/retrieval_tuning.py being a build-time
 * copy of brain-b/retrieval_tuning.py, just across repos instead of within
 * one — this script now downloads the latest published release of
 * Blender-add-on. via `gh release download` rather than maintaining a local
 * duplicate. Requires `gh` authenticated (already true in CI — see
 * .github/workflows/release.yml's own use of `gh` — and for local builds,
 * whichever account has pull access to that repo).
 *
 * Picks the blender5x build by default (newest Blender line) since the
 * in-app download doesn't currently ask which Blender version the user has.
 * Nexus's own listing offers blender42/blender4x/blender5x separately for
 * users who want to pick — this is only the one bundled with the app itself.
 *
 * Files included:
 *   (fetched)  mossy-fo4-blender-addon-*-blender5x.zip contents — the real add-on
 *   scripts/blender/blender_move_x.py  — Move X by One operator (example)
 *   scripts/blender/blender_cursor_array.py — Cursor Array operator (example)
 *   scripts/blender/run_blender_ops.ps1 — Headless automation helper (example)
 *   scripts/blender/README_BLENDER_ADDONS.md — Installation & usage guide
 *   scripts/blender/f4_setup.py        — Fallout 4 environment setup helper (example)
 *
 * Usage:
 *   node scripts/package-blender-addons.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import archiver from 'archiver';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const OUTPUT_PATH = path.join(rootDir, 'public', 'mossy-blender-addons.zip');
const ADDON_REPO = 'POINTYTHRUNDRA654/Blender-add-on.';
const ADDON_ASSET_PATTERN = '*blender5x*';

const EXAMPLE_FILES = [
  {
    src: path.join('scripts', 'blender', 'blender_move_x.py'),
    dest: path.join('example-addons', 'blender_move_x.py'),
  },
  {
    src: path.join('scripts', 'blender', 'blender_cursor_array.py'),
    dest: path.join('example-addons', 'blender_cursor_array.py'),
  },
  {
    src: path.join('scripts', 'blender', 'run_blender_ops.ps1'),
    dest: path.join('example-addons', 'run_blender_ops.ps1'),
  },
  {
    src: path.join('scripts', 'blender', 'README_BLENDER_ADDONS.md'),
    dest: path.join('example-addons', 'README_BLENDER_ADDONS.md'),
  },
  {
    src: path.join('scripts', 'blender', 'f4_setup.py'),
    dest: path.join('example-addons', 'f4_setup.py'),
  },
];

function fetchLatestAddonRelease(destDir) {
  console.log(`Fetching latest ${ADDON_REPO} release (${ADDON_ASSET_PATTERN})...`);
  execFileSync('gh', [
    'release', 'download',
    '--repo', ADDON_REPO,
    '--pattern', ADDON_ASSET_PATTERN,
    '--dir', destDir,
    '--clobber',
  ], { stdio: 'inherit' });

  const zipName = fs.readdirSync(destDir).find((f) => f.endsWith('.zip'));
  if (!zipName) {
    throw new Error(`gh release download reported success but no .zip landed in ${destDir}`);
  }
  return path.join(destDir, zipName);
}

async function main() {
  console.log('Packaging Blender add-ons...');

  const missing = EXAMPLE_FILES.filter((f) => !fs.existsSync(path.join(rootDir, f.src)));
  if (missing.length > 0) {
    console.error('Missing source files:');
    missing.forEach((f) => console.error(`  ${f.src}`));
    process.exit(1);
  }

  const tmpDir = path.join(rootDir, '.tmp-blender-addon-fetch');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  let addonZipPath;
  try {
    addonZipPath = fetchLatestAddonRelease(tmpDir);
  } catch (err) {
    console.error('Failed to fetch the Blender add-on release:', err.message);
    console.error(`Falling back is not implemented on purpose — a stale local copy is exactly`);
    console.error(`the drift this convergence was meant to close. Fix gh auth / network and retry.`);
    process.exit(1);
  }

  // Extract the fetched release zip's entries and re-add them individually
  // rather than nesting a zip inside a zip — a user who downloads and
  // extracts mossy-blender-addons.zip should land directly on ready-to-use
  // add-on files (matching the fetched release's own root-level layout,
  // required by its blender_manifest.toml-based Extension packaging), not
  // another archive they have to extract a second time.
  const fetchedZip = new AdmZip(addonZipPath);
  const fetchedEntries = fetchedZip.getEntries().filter((e) => !e.isDirectory);
  console.log(`  extracted ${fetchedEntries.length} files from ${path.basename(addonZipPath)}`);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(OUTPUT_PATH);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const kb = (archive.pointer() / 1024).toFixed(1);
      console.log(`✓ Created ${OUTPUT_PATH} (${kb} KB)`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Warning:', err.message);
      } else {
        reject(err);
      }
    });

    archive.on('error', reject);

    archive.pipe(output);

    for (const entry of fetchedEntries) {
      archive.append(entry.getData(), { name: entry.entryName });
    }

    for (const { src, dest } of EXAMPLE_FILES) {
      archive.file(path.join(rootDir, src), { name: dest });
    }

    archive.finalize();
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('Fatal error packaging Blender add-ons:', err);
  process.exit(1);
});
