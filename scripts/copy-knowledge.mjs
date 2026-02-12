import fs from 'node:fs/promises';
import path from 'node:path';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function emptyDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          await fs.rm(full, { recursive: true, force: true });
        } else {
          await fs.rm(full, { force: true });
        }
      })
    );
  } catch {
    // ignore
  }
}

async function main() {
  const repoRoot = process.cwd();
  const destDir = path.join(repoRoot, 'public', 'knowledge');
  const visualsSrcDir = path.join(repoRoot, 'visual-guide-images');
  const visualsDestDir = path.join(repoRoot, 'public', 'visual-guide-images');

  await ensureDir(destDir);
  await emptyDir(destDir);

  await ensureDir(visualsDestDir);
  await emptyDir(visualsDestDir);

  const entries = await fs.readdir(repoRoot, { withFileTypes: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  let copied = 0;
  for (const name of mdFiles) {
    const src = path.join(repoRoot, name);
    const dest = path.join(destDir, name);
    await fs.copyFile(src, dest);
    copied++;
  }

  try {
    const visualEntries = await fs.readdir(visualsSrcDir, { withFileTypes: true });
    const images = visualEntries.filter((e) => e.isFile());
    await Promise.all(
      images.map(async (entry) => {
        const src = path.join(visualsSrcDir, entry.name);
        const dest = path.join(visualsDestDir, entry.name);
        await fs.copyFile(src, dest);
      })
    );
    // eslint-disable-next-line no-console
    console.log(`[copy-knowledge] Copied ${images.length} tutorial images to ${visualsDestDir}`);
  } catch {
    // ignore missing visual guide images
  }

  // eslint-disable-next-line no-console
  console.log(`[copy-knowledge] Copied ${copied} markdown files to ${destDir}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[copy-knowledge] Failed:', err);
  process.exitCode = 1;
});
