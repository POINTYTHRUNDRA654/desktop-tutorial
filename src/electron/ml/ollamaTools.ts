/**
 * Ollama tool-calling chat -- Mossy's second local tool-capable path, used
 * when Lemonade Server isn't running.
 *
 * Why this exists: since 6.0.0 there is no cloud path at all, so every chat
 * turn is answered locally, and most turns carry tools. Before this, a
 * tool-carrying turn could only be answered by Lemonade; with Lemonade closed
 * Mossy replied "Lemonade Server isn't running" even while Ollama was up with
 * several tool-capable models installed (seen 2026-10-27 on Billy's PC).
 *
 * Uses Ollama's OpenAI-compatible endpoint (<ollamaBaseUrl>/v1) through the
 * existing openAICompatChat client, so tool calls come back in exactly the
 * shape Lemonade's do (see lemonade.ts) and LocalAIEngine treats them the same.
 *
 * Model choice is checked, not assumed: Ollama reports per model whether it
 * supports tools (/api/show -> capabilities). The user's chat model is used
 * when it can call tools; otherwise the first installed model from
 * TOOL_MODEL_PREFERENCE that reports "tools". Many popular models (gemma2,
 * llama3) cannot, and Ollama rejects a tools request for them outright.
 */

import { openAICompatChat, type OpenAICompatToolCall } from './openaiCompat'

/** Models good enough to teach with, tried first, in this order. From a
 *  tutoring eval run 2026-10-27 on Billy's PC with thinking switched off (as
 *  Mossy calls them): real beginner questions answered with Brain B's
 *  retrieved context and scored against known-correct answers, plus a plain
 *  question (must not trigger a tool) and a request that must (see
 *  CHANGELOG.md). gemma4:12b got the core fact right where qwen3.5:9b taught
 *  the opposite (ESL plugins); both used tools correctly. LocalAIEngine tries
 *  these BEFORE Lemonade's Qwen3-4B, which confidently taught wrong facts. */
export const TOOL_MODEL_PREFERENCE = ['gemma4:12b', 'gemma4', 'qwen3.5:9b', 'qwen3.5']

/** Tool-capable but weaker in the same eval (llama3.1:8b answered a plain
 *  question with a tool call; mistral:7b skipped a requested tool call).
 *  Only used as a last resort, after Lemonade, so Mossy still answers. */
export const LAST_RESORT_TOOL_MODELS = ['llama3.1:8b', 'llama3.1', 'mistral:7b', 'mistral', 'qwen2.5-coder:7b']

type Capabilities = { at: number; baseUrl: string; byModel: Map<string, string[]> }
let capCache: Capabilities | null = null
const CAP_CACHE_MS = 5 * 60_000

async function fetchJson(url: string, init: RequestInit | undefined, timeoutMs: number): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

/** Installed models and what each one says it can do. Cached for 5 minutes
 *  so a normal chat turn costs no extra round trips. */
async function getCapabilities(baseUrl: string): Promise<Map<string, string[]>> {
  if (capCache && capCache.baseUrl === baseUrl && Date.now() - capCache.at < CAP_CACHE_MS) return capCache.byModel
  const tags = await fetchJson(`${baseUrl}/api/tags`, undefined, 1500)
  const names: string[] = (tags?.models ?? []).map((m: any) => String(m?.name ?? '')).filter(Boolean)
  const byModel = new Map<string, string[]>()
  await Promise.all(names.map(async (name) => {
    try {
      const show = await fetchJson(`${baseUrl}/api/show`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: name }),
      }, 4000)
      byModel.set(name, Array.isArray(show?.capabilities) ? show.capabilities.map(String) : [])
    } catch {
      byModel.set(name, [])
    }
  }))
  capCache = { at: Date.now(), baseUrl, byModel }
  return byModel
}

const sameModel = (a: string, b: string) =>
  a === b || a === `${b}:latest` || b === `${a}:latest`

export type OllamaToolModelPick =
  | { ok: true; model: string; reason: 'chat-model' | 'preferred' | 'last-resort' }
  | { ok: false; error: string }

export async function pickOllamaToolModel(baseUrl: string, chatModel?: string, allowLastResort = false): Promise<OllamaToolModelPick> {
  const base = baseUrl.replace(/\/$/, '')
  let caps: Map<string, string[]>
  try {
    caps = await getCapabilities(base)
  } catch (err: any) {
    return { ok: false, error: `Ollama is not reachable at ${base} (${String(err?.name === 'AbortError' ? 'no answer within 1.5s' : err?.message || err)})` }
  }
  const canTool = (name: string) => (caps.get(name) ?? []).includes('tools')
  const installed = [...caps.keys()]
  if (chatModel) {
    const match = installed.find((n) => sameModel(n, chatModel))
    if (match && canTool(match)) return { ok: true, model: match, reason: 'chat-model' }
  }
  for (const want of allowLastResort ? [...TOOL_MODEL_PREFERENCE, ...LAST_RESORT_TOOL_MODELS] : TOOL_MODEL_PREFERENCE) {
    const match = installed.find((n) => sameModel(n, want))
    if (match && canTool(match)) return { ok: true, model: match, reason: TOOL_MODEL_PREFERENCE.includes(want) ? 'preferred' : 'last-resort' }
  }
  return {
    ok: false,
    error: installed.length
      ? `No suitable tool-capable Ollama model is installed (installed: ${installed.join(', ')}). Install one with "ollama pull ${TOOL_MODEL_PREFERENCE[0]}".`
      : 'Ollama is running but has no models installed.',
  }
}

export type OllamaToolChatRequest = {
  baseUrl: string
  chatModel?: string
  messages: Array<{ role: string; content: string }>
  tools?: Array<{ type: 'function'; function: { name: string; description?: string; parameters?: Record<string, unknown> } }>
  toolChoice?: 'auto' | 'required'
  timeoutMs?: number
  /** Also accept the weaker LAST_RESORT_TOOL_MODELS (used after Lemonade failed). */
  allowLastResort?: boolean
}

export type OllamaToolChatResponse =
  | { ok: true; text: string; toolCalls?: OpenAICompatToolCall[]; model: string }
  | { ok: false; error: string }

export async function ollamaToolChat(req: OllamaToolChatRequest): Promise<OllamaToolChatResponse> {
  const base = req.baseUrl.replace(/\/$/, '')
  const pick = await pickOllamaToolModel(base, req.chatModel, !!req.allowLastResort)
  if (!pick.ok) return pick
  const resp = await openAICompatChat({
    baseUrl: `${base}/v1`,
    model: pick.model,
    system: '', // unused -- messages always overrides system/user
    user: '',
    messages: req.messages,
    tools: req.tools,
    toolChoice: req.toolChoice,
    // Thinking models (gemma4, qwen3.5) otherwise spend openAICompatChat's
    // whole 1024-token budget on hidden reasoning and return EMPTY text --
    // found 2026-10-27 in the real app: qwen3.5:9b answered "ok" with no text.
    // 'none' measured: always an answer, tools still called when required.
    extraBody: { reasoning_effort: 'none' },
    // A 9B model on first use has to load into VRAM; 30s (the client default)
    // is not enough for that, so allow longer unless the caller says otherwise.
    timeoutMs: req.timeoutMs ?? 180_000,
  })
  if (!resp.ok) return { ok: false, error: `${pick.model}: ${resp.error}` }
  return { ...resp, model: pick.model }
}
