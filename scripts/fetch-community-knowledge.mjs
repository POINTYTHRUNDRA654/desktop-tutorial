/**
 * fetch-community-knowledge.mjs
 *
 * Pulls shared knowledge packs from the community GitHub repo
 * (POINTYTHRUNDRA654/mossy-knowledge) and writes them into
 * resources/public/bundled-knowledge/ so they ship with the installer.
 *
 * Runs as part of the prebuild:vite pipeline.
 * Gracefully exits (non-blocking) if the repo doesn't exist yet or is
 * unreachable — a missing repo must never break the build.
 */

import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BUNDLED_DIR = path.join(REPO_ROOT, 'resources', 'public', 'bundled-knowledge');
const MANIFEST_PATH = path.join(BUNDLED_DIR, 'manifest.json');

const GITHUB_API_BASE = 'https://api.github.com';
const OWNER = 'POINTYTHRUNDRA654';
const REPO = 'mossy-knowledge';
const COMMUNITY_PATH = 'community-knowledge';

/** Perform an HTTPS GET and return the response body as a string, or null on any error. */
function httpsGet(url) {
  return new Promise((resolve) => {
    const opts = new URL(url);
    const req = https.get(
      {
        hostname: opts.hostname,
        path: opts.pathname + opts.search,
        headers: {
          'User-Agent': 'Mossy-Build-Script/1.0',
          Accept: 'application/vnd.github.v3+json',
        },
      },
      (res) => {
        // Follow a single redirect (GitHub raw content uses 302)
        if (res.statusCode === 301 || res.statusCode === 302) {
          httpsGet(res.headers.location).then(resolve);
          res.resume();
          return;
        }
        if (res.statusCode === 404 || res.statusCode === 403) {
          resolve(null); // Not found or not accessible — caller decides how to handle
          res.resume();
          return;
        }
        if (res.statusCode !== 200) {
          resolve(null); // Treat any unexpected HTTP status as "skip gracefully"
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        res.on('error', () => resolve(null));
      }
    );
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readManifest() {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString().slice(0, 10),
      description: "Mossy's curated knowledge base - bundled with installer",
      packs: [],
    };
  }
}

async function writeManifest(manifest) {
  manifest.lastUpdated = new Date().toISOString().slice(0, 10);
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

async function main() {
  await ensureDir(BUNDLED_DIR);

  // 1. Check whether the community knowledge repo exists.
  const listUrl = `${GITHUB_API_BASE}/repos/${OWNER}/${REPO}/contents/${COMMUNITY_PATH}`;
  let listing;
  try {
    const raw = await httpsGet(listUrl);
    if (raw === null) {
      console.log('[fetch-community-knowledge] Community repo not found — skipping.');
      return;
    }
    listing = JSON.parse(raw);
  } catch (err) {
    console.warn('[fetch-community-knowledge] Could not reach GitHub API:', err.message, '— skipping.');
    return;
  }

  if (!Array.isArray(listing)) {
    console.warn('[fetch-community-knowledge] Unexpected API response — skipping.');
    return;
  }

  const jsonFiles = listing.filter((f) => f.type === 'file' && f.name.endsWith('.json'));
  if (jsonFiles.length === 0) {
    console.log('[fetch-community-knowledge] No community knowledge packs found yet.');
    return;
  }

  // 2. Load the current manifest.
  const manifest = await readManifest();

  let addedCount = 0;
  let updatedCount = 0;

  for (const fileEntry of jsonFiles) {
    // Use the SHA as the pack version so we only re-bundle when content changes.
    const packId = fileEntry.name.replace(/\.json$/i, '');
    const packVersion = fileEntry.sha.slice(0, 8); // short SHA
    const destFile = path.join(BUNDLED_DIR, fileEntry.name);

    // Check if we already have this exact version bundled.
    const existing = manifest.packs.find((p) => p.id === packId);
    if (existing && existing.version === packVersion) {
      continue; // Up to date
    }

    // 3. Download the pack content.
    let raw;
    try {
      raw = await httpsGet(fileEntry.download_url);
      if (raw === null) continue;
    } catch (err) {
      console.warn(`[fetch-community-knowledge] Failed to download ${fileEntry.name}:`, err.message);
      continue;
    }

    let packData;
    try {
      packData = JSON.parse(raw);
    } catch {
      console.warn(`[fetch-community-knowledge] Invalid JSON in ${fileEntry.name} — skipping.`);
      continue;
    }

    const itemCount = Array.isArray(packData.items) ? packData.items.length : 0;
    if (itemCount === 0) continue;

    // 4. Write the pack file to bundled-knowledge/.
    await fs.writeFile(destFile, JSON.stringify(packData, null, 2) + '\n', 'utf-8');

    // 5. Update manifest entry.
    const entry = {
      id: packId,
      name: packData.packName || packId,
      version: packVersion,
      file: fileEntry.name,
      description: packData.description || '',
      itemCount,
      autoImport: true,
    };

    if (existing) {
      Object.assign(existing, entry);
      updatedCount++;
    } else {
      manifest.packs.push(entry);
      addedCount++;
    }
  }

  // 6. Bump manifest version if anything changed so the in-app import detects new packs.
  if (addedCount > 0 || updatedCount > 0) {
    const [major, minor, patch] = (manifest.version || '1.0.0').split('.').map(Number);
    manifest.version = `${major}.${minor}.${patch + 1}`;
    await writeManifest(manifest);
    console.log(
      `[fetch-community-knowledge] Bundled ${addedCount} new pack(s), updated ${updatedCount} — manifest now v${manifest.version}.`
    );
  } else {
    console.log('[fetch-community-knowledge] All community packs already up to date.');
  }
}

main().catch((err) => {
  // Non-blocking: never fail CI/build if community knowledge is unreachable.
  console.warn('[fetch-community-knowledge] Unexpected error (non-blocking):', err?.message ?? err);
  process.exitCode = 0;
});
