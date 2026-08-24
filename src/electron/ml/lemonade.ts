/**
 * Lemonade Server integration — Brain B / Mossy's real local tool-calling
 * fallback, used when the primary Groq/cloud path fails or is unreachable.
 *
 * Live-verified 2026-08-24 against Lemonade Server v11.7.0 running
 * Qwen3-4B-Instruct-2507-GGUF: conversational (tool_choice:auto, no false
 * tool call), forced single tool call, and forced multi/parallel tool call
 * all passed cleanly over 13+ repeated runs, matching what's already live on
 * Groq/qwen3.6-27b. See CHANGELOG.md and memory for the full comparison —
 * including why GitHub issue #1562 ("llama.cpp backend crashes on parallel
 * tool calls from small models") did not reproduce here, and why that's not
 * the same thing as it being fixed upstream (it's still open).
 *
 * Chosen over Lemonade's Ollama- and Anthropic-compatible dialects (Lemonade
 * genuinely supports all three unchanged) because the OpenAI dialect needed
 * the least new client code: src/electron/ml/openaiCompat.ts already existed
 * as a pure-fetch, Electron-free OpenAI-compat client wired to two other
 * providers, and its tool-call shape (arguments as a JSON string) already
 * matches src/backend/routes/chat.ts's Groq BackendToolCall convention
 * exactly -- zero new parsing logic. The Ollama dialect would have needed a
 * client built from scratch (the existing ollamaGenerate() is prompt-only,
 * no tool-calling shape at all); the Anthropic dialect needs a different
 * response parser (content blocks, not a tool_calls array) on top of that.
 */

import { getOpenAICompatStatus, openAICompatChat, type OpenAICompatToolCall } from './openaiCompat'

export const LEMONADE_DEFAULT_BASE_URL = 'http://127.0.0.1:13305/api/v1'
export const LEMONADE_DEFAULT_MODEL = 'Qwen3-4B-Instruct-2507-GGUF'

export type LemonadeStatus =
  | { ok: true; baseUrl: string; modelLoaded: string | null; backendReady: boolean }
  | { ok: false; baseUrl: string; error: string }

/**
 * Hits Lemonade's own /health (not the generic /models list every other
 * openai_compat provider is checked against) because it reports whether a
 * model is actually loaded and the backend process is alive -- /models
 * alone would report "ok" for the whole download catalog even with the
 * server up and nothing loaded, which isn't a state this fallback can
 * actually generate from. Short timeout (1.5s): this fires on every failed
 * Groq turn, so a genuinely-not-running Lemonade must fail fast, not make
 * the user wait through this check on top of the Groq timeout that already
 * happened.
 */
export async function getLemonadeStatus(baseUrl = LEMONADE_DEFAULT_BASE_URL): Promise<LemonadeStatus> {
  const base = baseUrl.replace(/\/$/, '')
  const url = `${base}/health`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return { ok: false, baseUrl: base, error: `HTTP ${res.status}` }
    const data = (await res.json()) as any
    const loaded = data?.model_loaded ?? null
    const modelEntries = Array.isArray(data?.all_models_loaded) ? data.all_models_loaded : []
    const backendReady = modelEntries.length > 0
      ? modelEntries.every((m: any) => m?.backend_health === 'ready' && m?.backend_alive === true)
      : data?.status === 'ok'
    return { ok: true, baseUrl: base, modelLoaded: loaded, backendReady }
  } catch (err: any) {
    const msg = String(err?.name === 'AbortError' ? 'Lemonade Server did not respond within 1.5s' : err?.message || err)
    return { ok: false, baseUrl: base, error: msg }
  }
}

export type LemonadeChatRequest = {
  baseUrl?: string
  model?: string
  messages: Array<{ role: string; content: string }>
  tools?: Array<{ type: 'function'; function: { name: string; description?: string; parameters?: Record<string, unknown> } }>
  toolChoice?: 'auto' | 'required'
  timeoutMs?: number
}

export type LemonadeChatResponse =
  | { ok: true; text: string; toolCalls?: OpenAICompatToolCall[] }
  | { ok: false; error: string }

/** Thin wrapper over openAICompatChat pointed at Lemonade's real base URL
 *  and default model -- see this module's docstring for why the OpenAI
 *  dialect (not Ollama or Anthropic) was chosen. Does NOT itself check
 *  getLemonadeStatus() first; callers that need the fast honest-degradation
 *  path (see LocalAIEngine.ts's attemptLocalFallback) should call that
 *  separately before this, so an unreachable server fails in ~1.5s instead
 *  of waiting out this function's own request timeout. */
export async function lemonadeChat(req: LemonadeChatRequest): Promise<LemonadeChatResponse> {
  return openAICompatChat({
    baseUrl: req.baseUrl ?? LEMONADE_DEFAULT_BASE_URL,
    model: req.model || LEMONADE_DEFAULT_MODEL,
    system: '', // unused — messages below always overrides system/user
    user: '',
    messages: req.messages,
    tools: req.tools,
    toolChoice: req.toolChoice,
    timeoutMs: req.timeoutMs,
  })
}
