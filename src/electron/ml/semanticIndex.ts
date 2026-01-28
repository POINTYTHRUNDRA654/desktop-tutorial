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

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2'
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

  const maxChars = 1200
  const overlap = 200

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

async function getEmbedder(model: string): Promise<(text: string) => Promise<EmbeddingVector>> {
  if (cachedEmbedder && typeof cachedEmbedder === 'function') return cachedEmbedder
  if (cachedEmbedder && typeof cachedEmbedder === 'object' && 'pending' in cachedEmbedder) return cachedEmbedder.pending

  const pending = (async () => {
    // Lazy import so Electron main stays fast on startup.
    const { pipeline } = await import('@xenova/transformers')

    const extractor = await pipeline('feature-extraction', model, {
      quantized: true,
    })

    const embed = async (text: string): Promise<EmbeddingVector> => {
      // Return normalized mean-pooled embeddings.
      const output = await extractor(text, {
        pooling: 'mean',
        normalize: true,
      })

      // Transformers.js returns a Tensor-like object. Ensure we get Float32Array.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = output
      const vec: Float32Array = data.data ?? data
      if (!(vec instanceof Float32Array)) {
        return normalize(Float32Array.from(vec))
      }
      return vec
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
    }
  | { ok: false; error: string }
> {
  const trimmed = query.trim()
  if (!trimmed) return { ok: true, results: [] }

  const indexPath = getIndexFilePath()
  const index = await readJsonIfExists<SemanticIndex>(indexPath)
  if (!index) return { ok: false, error: 'Index not built. Run build first.' }

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

  const topK = Math.max(1, Math.min(25, opts?.topK ?? 8))
  return { ok: true, results: scored.slice(0, topK) }
}
