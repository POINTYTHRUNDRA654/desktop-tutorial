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

  // Dev-only files that track repo history, agent memory, or contributor/maintainer
  // workflows. These are never part of the in-app knowledge base.
  const DEV_ONLY_FILES = new Set([
    'CHANGES.md',          // code-change sync guard (dev history)
    'PROJECT_MEMORY.md',   // agent session memory
    'CONTRIBUTING.md',
    'CONTRIBUTING_TRANSLATIONS.md',
    'SECURITY.md',
    'README.md',
    'README_ONBOARDING.md',
    'README_RECOVERY.md',
    'COMPREHENSIVE_PAGE_TEST_PLAN.md',
    'TESTING.md',
    'TESTING_GUIDE.md',
    'TEST_REPORT.md',
    'HANDLER_IMPLEMENTATION_SUMMARY.md',
    'IPC_HANDLER_RESPONSE_AUDIT.md',
    'IMPLEMENTATION_COMPLETE.md',
    'SIZE_OPTIMIZATION_SUMMARY.md',
    'REPOSITORY_CLEANUP_GUIDE.md',
    'GIT_UPDATE_GUIDE.md',
    'RECOVERY_INSTRUCTIONS.md',
    'QUICK_RELEASE_GUIDE.md',
    'VERSION_MANAGEMENT.md',
    'QUICK_BUILD_REFERENCE.md',
  ]);

  const entries = await fs.readdir(repoRoot, { withFileTypes: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md') && !DEV_ONLY_FILES.has(e.name))
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
