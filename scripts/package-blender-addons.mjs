#!/usr/bin/env node
/**
 * Package Blender Add-ons
 *
 * Bundles all Blender add-on files into a single ZIP archive
 * (public/mossy-blender-addons.zip) so the packaged installer
 * can ship them for users to install directly into Blender.
 *
 * Files included:
 *   public/mossy_link_addon.py         — Mossy Link AI integration add-on
 *   scripts/blender/blender_move_x.py  — Move X by One operator
 *   scripts/blender/blender_cursor_array.py — Cursor Array operator
 *   scripts/blender/run_blender_ops.ps1 — Headless automation helper
 *   scripts/blender/README_BLENDER_ADDONS.md — Installation & usage guide
 *   scripts/blender/f4_setup.py        — Fallout 4 environment setup helper
 *
 * Usage:
 *   node scripts/package-blender-addons.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const OUTPUT_PATH = path.join(rootDir, 'public', 'mossy-blender-addons.zip');

/** Files to bundle: { src (relative to rootDir), dest (path inside ZIP) } */
const ADDON_FILES = [
  {
    src: path.join('public', 'mossy_link_addon.py'),
    dest: 'mossy_link_addon.py',
  },
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

async function main() {
  console.log('Packaging Blender add-ons...');

  // Verify all source files exist before starting
  const missing = ADDON_FILES.filter(
    (f) => !fs.existsSync(path.join(rootDir, f.src))
  );
  if (missing.length > 0) {
    console.error('Missing source files:');
    missing.forEach((f) => console.error(`  ${f.src}`));
    process.exit(1);
  }

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(OUTPUT_PATH);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const kb = (archive.pointer() / 1024).toFixed(1);
      console.log(`✓ Created ${OUTPUT_PATH} (${kb} KB, ${ADDON_FILES.length} files)`);
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

    for (const { src, dest } of ADDON_FILES) {
      archive.file(path.join(rootDir, src), { name: dest });
    }

    archive.finalize();
  });
}

main().catch((err) => {
  console.error('Fatal error packaging Blender add-ons:', err);
  process.exit(1);
});
