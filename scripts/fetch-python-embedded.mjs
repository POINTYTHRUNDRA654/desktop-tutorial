#!/usr/bin/env node
/**
 * fetch-python-embedded.mjs
 *
 * Downloads the Windows Embeddable Python distribution and extracts it to
 * resources/python-embedded/ so that electron-builder can bundle it with the
 * installer as an extraResource.
 *
 * This script runs as part of the prepackage step (see package.json).
 * It is idempotent: if python.exe already exists in the target directory,
 * it skips the download entirely.
 *
 * On non-Windows host machines the script only downloads if FORCE_FETCH_PYTHON=1
 * is set, allowing CI on Linux to skip it.  The bundled Python is Windows-only
 * (x64) and is only used at runtime on Windows targets.
 *
 * Usage:
 *   node scripts/fetch-python-embedded.mjs
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DEST_DIR = path.join(ROOT_DIR, 'resources', 'python-embedded');

// Windows embeddable Python 3.11 (amd64) — stable, widely compatible, includes
// all modules needed by pip and PyTorch.
const PYTHON_VERSION = '3.11.9';
const PYTHON_ZIP_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;
const ZIP_NAME = `python-${PYTHON_VERSION}-embed-amd64.zip`;
const ZIP_PATH = path.join(ROOT_DIR, 'resources', ZIP_NAME);
const PYTHON_EXE = path.join(DEST_DIR, 'python.exe');

/** Follow up to maxRedirects HTTP 3xx redirects then stream to destPath. */
function downloadFile(url, destPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const doGet = (target, hops) => {
      if (hops > maxRedirects) {
        reject(new Error('Too many redirects'));
        return;
      }
      if (!target.startsWith('https://')) {
        reject(new Error(`Refusing non-HTTPS URL: ${target}`));
        return;
      }
      const req = https.get(target, { timeout: 120_000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          doGet(res.headers.location, hops + 1);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${target}`));
          return;
        }
        const out = fs.createWriteStream(destPath);
        res.pipe(out);
        out.on('finish', () => out.close(() => resolve()));
        out.on('error', reject);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Download timed out')); });
    };
    doGet(url, 0);
  });
}

/** Extract a ZIP file using PowerShell's Expand-Archive (Windows only). */
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
    ], { stdio: 'inherit', windowsHide: true, timeout: 60_000 });
    ps.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`PowerShell Expand-Archive exited with code ${code}`));
    });
    ps.on('error', reject);
  });
}

async function main() {
  // Skip on non-Windows hosts unless forced (e.g. Linux CI)
  if (process.platform !== 'win32' && process.env.FORCE_FETCH_PYTHON !== '1') {
    console.log('[fetch-python-embedded] Non-Windows host detected. Skipping embedded Python download.');
    console.log('[fetch-python-embedded] Set FORCE_FETCH_PYTHON=1 to override.');
    return;
  }

  // Idempotency check: skip if python.exe is already present
  if (fs.existsSync(PYTHON_EXE)) {
    console.log(`[fetch-python-embedded] Embedded Python already present at ${PYTHON_EXE}. Skipping.`);
    return;
  }

  // Ensure destination directory exists
  fs.mkdirSync(DEST_DIR, { recursive: true });

  // 1. Download the ZIP
  console.log(`[fetch-python-embedded] Downloading Python ${PYTHON_VERSION} embedded (x64)...`);
  console.log(`[fetch-python-embedded] Source: ${PYTHON_ZIP_URL}`);
  await downloadFile(PYTHON_ZIP_URL, ZIP_PATH);
  console.log(`[fetch-python-embedded] Download complete: ${ZIP_PATH}`);

  // 2. Extract
  console.log(`[fetch-python-embedded] Extracting to ${DEST_DIR}...`);
  await extractZip(ZIP_PATH, DEST_DIR);
  console.log('[fetch-python-embedded] Extraction complete.');

  // 3. Clean up ZIP (keep disk usage low)
  try { fs.unlinkSync(ZIP_PATH); } catch { /* non-critical */ }

  // 4. Verify python.exe is present
  if (!fs.existsSync(PYTHON_EXE)) {
    throw new Error(`Extraction succeeded but python.exe not found in ${DEST_DIR}`);
  }

  console.log(`[fetch-python-embedded] ✅ Embedded Python ${PYTHON_VERSION} ready at ${PYTHON_EXE}`);
}

main().catch((err) => {
  console.error('[fetch-python-embedded] ❌ Failed:', err.message);
  // Non-fatal: the installer can still be built; auto-install will fall back to system Python
  process.exitCode = 0;
});
