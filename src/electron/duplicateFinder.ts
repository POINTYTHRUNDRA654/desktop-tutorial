import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { DedupeGroup, DedupeProgress, DedupeScanOptions, DedupeScanResult } from './types';

const DEFAULT_EXTENSIONS = ['.dds', '.nif', '.png', '.tga', '.jpg', '.jpeg', '.glb', '.fbx', '.obj', '.dae'] as const;

const normalizeExtensions = (extensions?: string[]) => {
  const raw = (extensions ?? []).map((e) => String(e || '').trim()).filter(Boolean);
  const normalized = raw.length ? raw : [...DEFAULT_EXTENSIONS];
  return Array.from(
    new Set(
      normalized
        .map((e) => (e.startsWith('.') ? e : `.${e}`))
        .map((e) => e.toLowerCase()),
    ),
  );
};

const isSubpathOfAnyRoot = (filePath: string, roots: string[]) => {
  const normalizedFile = path.resolve(filePath);
  return roots.some((root) => {
    const normalizedRoot = path.resolve(root);
    const rel = path.relative(normalizedRoot, normalizedFile);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  });
};

const mapWithConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>) => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    // eslint prefers `for (;;)` over `while (true)` for intentional infinite loops.
    for (;;) {
      const currentIndex = nextIndex++;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
};

const sha256File = async (filePath: string) => {
  return await new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

export type DedupeScanState = {
  canceled: boolean;
};

export const scanForDuplicates = async (
  scanId: string,
  options: DedupeScanOptions,
  sendProgress: (progress: DedupeProgress) => void,
  state: DedupeScanState,
): Promise<DedupeScanResult> => {
  const roots = (options.roots ?? []).map((r) => String(r || '').trim()).filter(Boolean);
  if (!roots.length) {
    throw new Error('No folders selected.');
  }

  const extensions = normalizeExtensions(options.extensions);
  const minSizeBytes = Math.max(0, Number(options.minSizeBytes ?? 1));
  const maxFiles = options.maxFiles != null ? Math.max(1, Number(options.maxFiles)) : undefined;

  const shouldCancel = () => state.canceled;

  const maybeYield = async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  };

  // 1) Collect file paths
  sendProgress({ scanId, stage: 'collect', message: 'Collecting files…' });

  const collected: string[] = [];
  const stack = roots.map((r) => path.resolve(r));

  const extensionSet = new Set(extensions);

  while (stack.length) {
    if (shouldCancel()) throw new Error('CANCELED');

    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (shouldCancel()) throw new Error('CANCELED');

      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (!extensionSet.has(ext)) continue;

      collected.push(full);

      if (maxFiles && collected.length >= maxFiles) {
        stack.length = 0;
        break;
      }
    }

    if (collected.length % 250 === 0) {
      sendProgress({ scanId, stage: 'collect', current: collected.length, message: 'Collecting files…' });
      await maybeYield();
    }
  }

  // 2) Stat + group by size
  sendProgress({ scanId, stage: 'stat', current: 0, total: collected.length, message: 'Reading file sizes…' });

  type FileStat = { path: string; size: number };
  const stats = await mapWithConcurrency(
    collected,
    32,
    async (filePath, index): Promise<FileStat | null> => {
      if (shouldCancel()) throw new Error('CANCELED');
      try {
        const st = await fs.promises.stat(filePath);
        if (!st.isFile()) return null;
        return { path: filePath, size: st.size };
      } catch {
        return null;
      } finally {
        if (index % 250 === 0) {
          sendProgress({ scanId, stage: 'stat', current: index, total: collected.length, message: 'Reading file sizes…' });
        }
      }
    },
  );

  const sizeMap = new Map<number, string[]>();
  let totalBytesScanned = 0;

  for (const entry of stats) {
    if (!entry) continue;
    totalBytesScanned += entry.size;
    const list = sizeMap.get(entry.size) ?? [];
    list.push(entry.path);
    sizeMap.set(entry.size, list);
  }

  const candidates: Array<{ size: number; files: string[] }> = [];
  for (const [size, files] of sizeMap.entries()) {
    if (size < minSizeBytes) continue;
    if (files.length > 1) candidates.push({ size, files });
  }

  const candidateFiles = candidates.flatMap((c) => c.files);

  // 3) Hash candidates
  sendProgress({
    scanId,
    stage: 'hash',
    current: 0,
    total: candidateFiles.length,
    message: `Hashing candidates (SHA-256)…`,
  });

  type Hashed = { path: string; size: number; hash: string };

  // Use a smaller concurrency to avoid trashing the disk.
  const hashed = await mapWithConcurrency(candidateFiles, 4, async (filePath, index): Promise<Hashed | null> => {
    if (shouldCancel()) throw new Error('CANCELED');

    let st: fs.Stats;
    try {
      st = await fs.promises.stat(filePath);
      if (!st.isFile()) return null;
    } catch {
      return null;
    }

    try {
      const hash = await sha256File(filePath);
      return { path: filePath, size: st.size, hash };
    } catch {
      return null;
    } finally {
      if (index % 25 === 0) {
        sendProgress({ scanId, stage: 'hash', current: index, total: candidateFiles.length, message: 'Hashing candidates (SHA-256)…' });
      }
    }
  });

  // 4) Group duplicates
  sendProgress({ scanId, stage: 'group', message: 'Grouping duplicates…' });

  const hashMap = new Map<string, string[]>();
  for (const entry of hashed) {
    if (!entry) continue;
    if (entry.size < minSizeBytes) continue;
    const key = `${entry.size}:${entry.hash}`;
    const list = hashMap.get(key) ?? [];
    list.push(entry.path);
    hashMap.set(key, list);
  }

  const groups: DedupeGroup[] = [];
  for (const [key, files] of hashMap.entries()) {
    if (files.length < 2) continue;

    const [sizeStr, hash] = key.split(':');
    const size = Number(sizeStr);

    const sortedFiles = files
      .filter((p) => isSubpathOfAnyRoot(p, roots))
      .sort((a, b) => a.localeCompare(b));

    if (sortedFiles.length >= 2) {
      groups.push({ hash, size, files: sortedFiles });
    }
  }

  groups.sort((a, b) => {
    // Bigger potential savings first
    const savingsA = a.size * (a.files.length - 1);
    const savingsB = b.size * (b.files.length - 1);
    return savingsB - savingsA;
  });

  sendProgress({ scanId, stage: 'done', message: `Found ${groups.length} duplicate groups.` });

  return {
    scanId,
    roots,
    extensions,
    totalFilesScanned: collected.length,
    totalBytesScanned,
    groups,
  };
};
