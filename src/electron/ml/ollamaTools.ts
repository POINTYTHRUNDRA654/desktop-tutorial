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
 * Uses Ollama's native /api/chat (not the OpenAI-compatible /v1): only the
 * native API takes a context size per request (options.num_ctx) and a
 * thinking switch (think: false). Without num_ctx the /v1 endpoint silently
 * cut Mossy's prompt to its last ~4,096 tokens (Ollama log, 2026-10-27:
 * "truncating input prompt limit=4099 prompt=73729"). Tool calls are reshaped
 * to the same {id, name, args-as-JSON-string} form Lemonade's openaiCompat
 * client returns, so LocalAIEngine treats both identically.
 *
 * Model choice is checked, not assumed: Ollama reports per model whether it
 * supports tools (/api/show -> capabilities). The user's chat model is used
 * when it can call tools; otherwise the first installed model from
 * TOOL_MODEL_PREFERENCE that reports "tools". Many popular models (gemma2,
 * llama3) cannot, and Ollama rejects a tools request for them outright.
 */

import type { OpenAICompatToolCall } from './openaiCompat'

/** Context size requested for every tool-chat call. 8192 matches the
 *  OLLAMA_CONTEXT_LENGTH Mossy's setup uses, so Brain B's own calls to the same
 *  model (which send no num_ctx) reuse the loaded model instead of reloading
 *  it (measured 2026-10-27: no reload between the two). LocalAIEngine keeps
 *  its local prompt inside this budget (see LOCAL_TOOL_PROMPT_BUDGET). */
export const OLLAMA_TOOL_NUM_CTX = 8192

/** Models good enough to teach with, tried first, in this order. Evals on
 *  Billy's PC with thinking switched off (as Mossy calls them), scored
 *  against known-correct answers:
 *  - 2026-10-27: gemma4:12b got the ESL fact right where qwen3.5:9b taught
 *    the opposite; both used tools correctly.
 *  - 2026-11-04, with today's Brain B entries (SEQ, ESL limits, Papyrus
 *    timers) as context: both 9/9 on teaching. Tools through this native
 *    API: qwen3.5:9b 12/12, gemma4:12b 8/12 (it made only the first of three
 *    requested calls, every time). Screenshots (see ollamaVisionChat):
 *    qwen3.5:9b 17/22, gemma4:12b 14/22. qwen3.5:9b is also about half the
 *    size, so chat, Brain B and Screen Awareness share one loaded model.
 *  LocalAIEngine tries these BEFORE Lemonade's Qwen3-4B, which confidently
 *  taught wrong facts. */
export const TOOL_MODEL_PREFERENCE = ['qwen3.5:9b', 'qwen3.5', 'gemma4:12b', 'gemma4']

/** Models that can read screenshots, best first (2026-11-04 eval on three of
 *  Billy's real screenshots: Blender, the Creation Kit, Mossy's own hubs).
 *  qwen3.5:9b read Blender's version, mode and selected object where
 *  gemma4:12b sees images at much lower detail (it named the Creation Kit
 *  "Mod Organizer 2"). Any other installed model that reports "vision" is
 *  used only when none of these is installed. */
export const VISION_MODEL_PREFERENCE = ['qwen3.5:9b', 'qwen3.5', 'gemma4:12b', 'gemma4']

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
async function getCapabilities(baseUrl: string, tagsTimeoutMs = 1500): Promise<Map<string, string[]>> {
  if (capCache && capCache.baseUrl === baseUrl && Date.now() - capCache.at < CAP_CACHE_MS) return capCache.byModel
  const tags = await fetchJson(`${baseUrl}/api/tags`, undefined, tagsTimeoutMs)
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
  const controller = new AbortController()
  // A 12B model on first use has to load into VRAM; allow for that.
  const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 180_000)
  try {
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: pick.model,
        stream: false,
        messages: req.messages,
        ...(req.tools && req.tools.length > 0 ? { tools: req.tools } : {}),
        // Thinking models (gemma4, qwen3.5) otherwise spend the whole answer
        // budget on hidden reasoning and return EMPTY text -- found
        // 2026-10-27 in the real app (qwen3.5:9b answered "ok" with no text).
        think: false,
        keep_alive: '30m',
        options: { num_ctx: OLLAMA_TOOL_NUM_CTX, num_predict: 1024, temperature: 0.4 },
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `${pick.model}: HTTP ${res.status}${text ? `: ${text}` : ''}` }
    }
    const data = (await res.json()) as any
    const message = data?.message ?? {}
    const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : []
    // The native API has no tool_choice. 'required' turns (Brain B classified
    // the turn as wanting an action) can still come back as plain text; the
    // caller treats that like any other answer.
    const toolCalls: OpenAICompatToolCall[] | undefined = rawCalls.length > 0
      ? rawCalls.map((tc: any, i: number) => {
          const args = tc?.function?.arguments
          return {
            id: String(tc?.id ?? `call_${i}`),
            name: String(tc?.function?.name ?? ''),
            args: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
          }
        })
      : undefined
    return { ok: true, text: String(message.content ?? ''), toolCalls, model: pick.model }
  } catch (err: any) {
    const msg = String(err?.name === 'AbortError' ? 'timed out' : err?.message || err)
    return { ok: false, error: `${pick.model}: ${msg}` }
  } finally {
    clearTimeout(timeout)
  }
}

export type OllamaVisionModelPick =
  | { ok: true; model: string; reason: 'chat-model' | 'preferred' | 'any-vision' }
  | { ok: false; error: string }

/** The user's chat model when it can see images (so Screen Awareness reuses
 *  the model already loaded for chat), else the best installed one. */
export async function pickOllamaVisionModel(baseUrl: string, chatModel?: string): Promise<OllamaVisionModelPick> {
  const base = baseUrl.replace(/\/$/, '')
  let caps: Map<string, string[]>
  try {
    // 5 s, not chat's 1.5 s: a screen check is not waiting on a person, and
    // right after Mossy starts Ollama answered too late for 1.5 s although
    // it was running (packaged-build test, 2026-11-04).
    caps = await getCapabilities(base, 5000)
  } catch (err: any) {
    return { ok: false, error: `Ollama is not reachable at ${base} (${String(err?.name === 'AbortError' ? 'no answer within 5s' : err?.message || err)})` }
  }
  const canSee = (name: string) => (caps.get(name) ?? []).includes('vision')
  const installed = [...caps.keys()]
  if (chatModel) {
    const match = installed.find((n) => sameModel(n, chatModel))
    if (match && canSee(match)) return { ok: true, model: match, reason: 'chat-model' }
  }
  for (const want of VISION_MODEL_PREFERENCE) {
    const match = installed.find((n) => sameModel(n, want))
    if (match && canSee(match)) return { ok: true, model: match, reason: 'preferred' }
  }
  const any = installed.find(canSee)
  if (any) return { ok: true, model: any, reason: 'any-vision' }
  return {
    ok: false,
    error: installed.length
      ? `None of the installed Ollama models can read images (installed: ${installed.join(', ')}). Install one with "ollama pull ${VISION_MODEL_PREFERENCE[0]}".`
      : `Ollama is running but has no models installed. Install one that can read images with "ollama pull ${VISION_MODEL_PREFERENCE[0]}".`,
  }
}

export type OllamaVisionChatRequest = {
  baseUrl: string
  chatModel?: string
  /** data:image/...;base64,... as captured by Screen Awareness, or bare base64. */
  imageDataUrl: string
  textPrompt: string
  systemPrompt?: string
  timeoutMs?: number
}

export type OllamaVisionChatResponse =
  | { ok: true; text: string; model: string }
  | { ok: false; error: string }

/** One screenshot + prompt through Ollama's native /api/chat (images field).
 *  Same think/keep_alive/num_ctx as ollamaToolChat, so a model shared with
 *  chat stays loaded instead of reloading for every screen check. */
export async function ollamaVisionChat(req: OllamaVisionChatRequest): Promise<OllamaVisionChatResponse> {
  const base = req.baseUrl.replace(/\/$/, '')
  const image = String(req.imageDataUrl || '').replace(/^data:[^;,]+;base64,/, '')
  if (!image) return { ok: false, error: 'No image was given to the vision check.' }
  const pick = await pickOllamaVisionModel(base, req.chatModel)
  if (!pick.ok) return pick
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 180_000)
  try {
    const messages: Array<Record<string, unknown>> = []
    if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt })
    messages.push({ role: 'user', content: req.textPrompt, images: [image] })
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: pick.model,
        stream: false,
        messages,
        think: false,
        keep_alive: '30m',
        options: { num_ctx: OLLAMA_TOOL_NUM_CTX, num_predict: 1024, temperature: 0.2 },
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `${pick.model}: HTTP ${res.status}${text ? `: ${text}` : ''}` }
    }
    const data = (await res.json()) as any
    const text = String(data?.message?.content ?? '')
    if (!text.trim()) return { ok: false, error: `${pick.model} returned an empty answer for the screenshot.` }
    return { ok: true, text, model: pick.model }
  } catch (err: any) {
    const msg = String(err?.name === 'AbortError' ? 'timed out' : err?.message || err)
    return { ok: false, error: `${pick.model}: ${msg}` }
  } finally {
    clearTimeout(timeout)
  }
}
