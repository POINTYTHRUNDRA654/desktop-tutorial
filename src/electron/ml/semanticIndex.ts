import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export type SemanticChunk = {
  id: string
  sourcePath: string
  title: string
  content: string
  embeddingB64: string
}

export type SemanticIndex = {
  version: 1
  model: string
  createdAt: string
  sources: Array<{ sourcePath: string; mtimeMs: number; size: number }>
  chunks: SemanticChunk[]
}

type EmbeddingVector = Float32Array

// Model string = cache-bust key. Bump when embedding algorithm changes.
const DEFAULT_MODEL = 'local-fnv1a-tfidf-bigram-trigram-v2'
const INDEX_VERSION = 1 as const

function getIndexFilePath(): string {
  return path.join(app.getPath('userData'), 'semantic-index.v1.json')
}

function encodeFloat32ToBase64(vec: EmbeddingVector): string {
  return Buffer.from(vec.buffer).toString('base64')
}

function decodeFloat32FromBase64(b64: string): EmbeddingVector {
  const buf = Buffer.from(b64, 'base64')
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4))
}

function normalize(vec: EmbeddingVector): EmbeddingVector {
  let sumSq = 0
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i]
  const denom = Math.sqrt(sumSq) || 1
  const out = new Float32Array(vec.length)
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / denom
  return out
}

function dot(a: EmbeddingVector, b: EmbeddingVector): number {
  const n = Math.min(a.length, b.length)
  let s = 0
  for (let i = 0; i < n; i++) s += a[i] * b[i]
  return s
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  if (!(await fileExists(filePath))) return null
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const tmp = `${filePath}.tmp`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, filePath)
}

function isProbablyIgnoredDir(dirName: string): boolean {
  const lowered = dirName.toLowerCase()
  return (
    lowered === 'node_modules' ||
    lowered === '.git' ||
    lowered === 'dist' ||
    lowered === 'out' ||
    lowered === 'build' ||
    lowered === '.vite' ||
    lowered === '.electron-vite' ||
    lowered === 'coverage' ||
    lowered === '.next'
  )
}

async function walkForMarkdown(rootDir: string): Promise<string[]> {
  const results: string[] = []

  async function walk(currentDir: string): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const full = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        if (isProbablyIgnoredDir(entry.name)) continue
        await walk(full)
      } else if (entry.isFile()) {
        if (entry.name.toLowerCase().endsWith('.md')) results.push(full)
      }
    }
  }

  await walk(rootDir)
  return results
}

function chunkMarkdown(sourcePath: string, markdown: string): Array<{ title: string; content: string }> {
  const lines = markdown.split(/\r?\n/)

  const sections: Array<{ title: string; lines: string[] }> = []
  let currentTitle = path.basename(sourcePath)
  let currentLines: string[] = []

  const pushSection = () => {
    const text = currentLines.join('\n').trim()
    if (text.length > 0) sections.push({ title: currentTitle, lines: [...currentLines] })
  }

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line)
    if (match) {
      pushSection()
      currentTitle = match[2].trim() || currentTitle
      currentLines = [line]
    } else {
      currentLines.push(line)
    }
  }
  pushSection()

  const maxChars = 2000   // technical docs need more context per chunk
  const overlap = 300    // increased proportionally

  const chunks: Array<{ title: string; content: string }> = []

  for (const section of sections) {
    const text = section.lines.join('\n').trim()
    if (text.length <= maxChars) {
      chunks.push({ title: section.title, content: text })
      continue
    }

    let start = 0
    while (start < text.length) {
      const end = Math.min(text.length, start + maxChars)
      const slice = text.slice(start, end)
      chunks.push({ title: section.title, content: slice })
      if (end >= text.length) break
      start = Math.max(0, end - overlap)
    }
  }

  return chunks
}

let cachedEmbedder:
  | null
  | ((text: string) => Promise<EmbeddingVector>)
  | { pending: Promise<(text: string) => Promise<EmbeddingVector>> } = null

const LOCAL_EMBED_DIM = 512

// Stop words — excluded from unigrams, kept in bigrams/trigrams for phrase capture
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','has','have','had','do','does',
  'did','will','would','could','should','may','might','shall','can','this',
  'that','these','those','it','its','they','them','their','we','our','you',
  'your','he','she','his','her','i','me','my','not','no','so','if','as',
])

function hashToken(token: string): number {
  // FNV-1a — low collision rate for short strings
  let hash = 2166136261
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function hashPair(h1: number, h2: number): number {
  return (Math.imul(h1, 31) ^ h2) >>> 0
}

function tokenizeForEmbedding(text: string): { unigrams: string[]; all: string[] } {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
  const all = raw
  const unigrams = raw.filter((t) => !STOP_WORDS.has(t))
  return { unigrams, all }
}

/**
 * Local TF-IDF-style embedding with unigram, bigram, and trigram features.
 * Improvements over original frequency hash:
 *   - Stop words excluded from unigrams (less noise)
 *   - Bigrams + trigrams capture "load order", "creation kit" etc.
 *   - sqrt-TF compression prevents common words dominating
 *   - Positional boost for heading/title region (first 30 tokens)
 *   - 512-dim vs 384 — more space before hash collisions hurt recall
 */
function embedLocally(text: string): EmbeddingVector {
  const out = new Float32Array(LOCAL_EMBED_DIM)
  const { unigrams, all } = tokenizeForEmbedding(text)
  if (!all.length) return out

  // Unigram features (stop-word-free, sqrt-TF)
  const unigramFreq: Map<string, number> = new Map()
  for (const t of unigrams) unigramFreq.set(t, (unigramFreq.get(t) || 0) + 1)
  const totalUnigrams = unigrams.length || 1
  for (const [token, freq] of unigramFreq) {
    out[hashToken(token) % LOCAL_EMBED_DIM] += Math.sqrt(freq / totalUnigrams)
  }

  // Bigram features (all tokens including stop words)
  for (let i = 0; i < all.length - 1; i++) {
    out[hashPair(hashToken(all[i]), hashToken(all[i + 1])) % LOCAL_EMBED_DIM] += 0.6
  }

  // Trigram features
  for (let i = 0; i < all.length - 2; i++) {
    out[hashPair(hashPair(hashToken(all[i]), hashToken(all[i + 1])), hashToken(all[i + 2])) % LOCAL_EMBED_DIM] += 0.35
  }

  // Positional boost: first 30 tokens (title / heading region)
  for (const t of all.slice(0, 30)) {
    if (!STOP_WORDS.has(t)) out[hashToken('__head_' + t) % LOCAL_EMBED_DIM] += 0.4
  }

  return normalize(out)
}

async function getEmbedder(model: string): Promise<(text: string) => Promise<EmbeddingVector>> {
  if (cachedEmbedder && typeof cachedEmbedder === 'function') return cachedEmbedder
  if (cachedEmbedder && typeof cachedEmbedder === 'object' && 'pending' in cachedEmbedder) return cachedEmbedder.pending

  const pending = (async () => {
    const embed = async (text: string): Promise<EmbeddingVector> => {
      void model
      return embedLocally(text)
    }

    cachedEmbedder = embed
    return embed
  })()

  cachedEmbedder = { pending }
  return pending
}

function getBundledKnowledgeRoots(): string[] {
  // In dev, `public` lives under the repo root.
  // In production, electron-builder copies `public` into `process.resourcesPath/public`.
  const publicDir = app.isPackaged
    ? path.join(process.resourcesPath, 'public')
    : path.join(app.getAppPath(), 'public')

  return [path.join(publicDir, 'knowledge'), publicDir]
}

async function getSourcesSnapshot(mdFiles: string[]): Promise<SemanticIndex['sources']> {
  const sources: SemanticIndex['sources'] = []
  for (const filePath of mdFiles) {
    try {
      const stat = await fs.stat(filePath)
      sources.push({ sourcePath: filePath, mtimeMs: stat.mtimeMs, size: stat.size })
    } catch {
      // Ignore missing/unreadable.
    }
  }
  sources.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
  return sources
}

function sourcesEqual(a: SemanticIndex['sources'], b: SemanticIndex['sources']): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].sourcePath !== b[i].sourcePath) return false
    if (a[i].mtimeMs !== b[i].mtimeMs) return false
    if (a[i].size !== b[i].size) return false
  }
  return true
}

export async function getSemanticIndexStatus(): Promise<
  | { ok: true; indexPath: string; indexedChunks: number; indexedSources: number; model: string; createdAt: string }
  | { ok: false; indexPath: string; reason: string }
> {
  const indexPath = getIndexFilePath()
  const index = await readJsonIfExists<SemanticIndex>(indexPath)
  if (!index) return { ok: false, indexPath, reason: 'Index not built yet.' }
  if (index.version !== INDEX_VERSION) return { ok: false, indexPath, reason: 'Index version mismatch.' }

  return {
    ok: true,
    indexPath,
    indexedChunks: index.chunks.length,
    indexedSources: index.sources.length,
    model: index.model,
    createdAt: index.createdAt,
  }
}

export async function buildSemanticIndex(opts?: {
  roots?: string[]
  model?: string
}): Promise<{ ok: true; indexPath: string; indexedChunks: number; indexedSources: number } | { ok: false; error: string }> {
  const model = opts?.model ?? DEFAULT_MODEL
  const roots = (
    opts?.roots?.length
      ? opts.roots
      : [process.cwd(), app.getAppPath(), ...getBundledKnowledgeRoots()]
  ).filter(Boolean)

  const seen = new Set<string>()
  const mdFiles: string[] = []
  for (const root of roots) {
    const absRoot = path.resolve(root)
    if (seen.has(absRoot)) continue
    seen.add(absRoot)
    const found = await walkForMarkdown(absRoot)
    for (const f of found) mdFiles.push(f)
  }

  const uniqueMd = Array.from(new Set(mdFiles)).sort((a, b) => a.localeCompare(b))
  const sources = await getSourcesSnapshot(uniqueMd)

  const indexPath = getIndexFilePath()
  const existing = await readJsonIfExists<SemanticIndex>(indexPath)
  if (existing && existing.version === INDEX_VERSION && existing.model === model && sourcesEqual(existing.sources, sources)) {
    return { ok: true, indexPath, indexedChunks: existing.chunks.length, indexedSources: existing.sources.length }
  }

  const embedder = await getEmbedder(model)

  const chunks: SemanticChunk[] = []
  for (const source of sources) {
    let md
    try {
      md = await fs.readFile(source.sourcePath, 'utf-8')
    } catch {
      continue
    }

    const chunkDefs = chunkMarkdown(source.sourcePath, md)
    for (let i = 0; i < chunkDefs.length; i++) {
      const def = chunkDefs[i]
      const vec = await embedder(def.content)
      chunks.push({
        id: `${source.sourcePath}::${i}`,
        sourcePath: source.sourcePath,
        title: def.title,
        content: def.content,
        embeddingB64: encodeFloat32ToBase64(vec),
      })
    }
  }

  const index: SemanticIndex = {
    version: INDEX_VERSION,
    model,
    createdAt: new Date().toISOString(),
    sources,
    chunks,
  }

  await writeJsonAtomic(indexPath, index)
  return { ok: true, indexPath, indexedChunks: chunks.length, indexedSources: sources.length }
}

export async function querySemanticIndex(query: string, opts?: { topK?: number }): Promise<
  | {
      ok: true
      results: Array<{ score: number; sourcePath: string; title: string; content: string }>
      keywordMode?: boolean
    }
  | { ok: false; error: string }
> {
  const trimmed = query.trim()
  if (!trimmed) return { ok: true, results: [] }

  const topK = Math.max(1, Math.min(25, opts?.topK ?? 8))

  const indexPath = getIndexFilePath()
  const index = await readJsonIfExists<SemanticIndex>(indexPath)

  // No AI index yet — fall back to fast keyword search over bundled knowledge files.
  if (!index) {
    return keywordFallbackSearch(trimmed, { topK })
  }

  try {
    const embedder = await getEmbedder(index.model)
    const qVec = await embedder(trimmed)

    const scored = index.chunks
      .map((chunk) => {
        const vec = decodeFloat32FromBase64(chunk.embeddingB64)
        const score = dot(qVec, vec)
        return {
          score,
          sourcePath: chunk.sourcePath,
          title: chunk.title,
          content: chunk.content,
        }
      })
      .sort((a, b) => b.score - a.score)

    return { ok: true, results: scored.slice(0, topK) }
  } catch (err: any) {
    // AI embedder failed (model not downloaded, no internet, etc.) — fall back to keyword search.
    const fallback = await keywordFallbackSearch(trimmed, { topK })
    return { ...fallback, keywordMode: true }
  }
}

async function keywordFallbackSearch(
  query: string,
  opts?: { topK?: number },
): Promise<{
  ok: true
  results: Array<{ score: number; sourcePath: string; title: string; content: string }>
  keywordMode: true
}> {
  const topK = Math.max(1, Math.min(25, opts?.topK ?? 8))
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1)

  const roots = getBundledKnowledgeRoots()
  const mdFiles: string[] = []
  for (const root of roots) {
    try {
      const found = await walkForMarkdown(root)
      mdFiles.push(...found)
    } catch {
      // skip unreadable roots
    }
  }

  const results: Array<{ score: number; sourcePath: string; title: string; content: string }> = []

  for (const filePath of Array.from(new Set(mdFiles))) {
    try {
      const md = await fs.readFile(filePath, 'utf-8')
      const chunks = chunkMarkdown(filePath, md)

      for (const chunk of chunks) {
        const haystack = (chunk.title + ' ' + chunk.content).toLowerCase()
        let score = 0
        for (const term of terms) {
          const matches = haystack.split(term).length - 1
          score += matches
        }
        if (score > 0) {
          results.push({ score, sourcePath: filePath, title: chunk.title, content: chunk.content })
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  results.sort((a, b) => b.score - a.score)
  return { ok: true, results: results.slice(0, topK), keywordMode: true }
}
