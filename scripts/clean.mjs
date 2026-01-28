import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const targets = [
  'dist',
  'dist-electron',
  'release',
];

const rm = (relPath) => {
  const p = path.resolve(projectRoot, relPath);
  try {
    fs.rmSync(p, { recursive: true, force: true });
    // eslint-disable-next-line no-console
    console.log('[clean] removed', relPath);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[clean] failed to remove', relPath, '-', e?.message || e);
  }
};

for (const t of targets) rm(t);

// Remove release-test-* folders created by local packaging/debug runs.
for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name.startsWith('release-test-')) {
    rm(entry.name);
  }
}
