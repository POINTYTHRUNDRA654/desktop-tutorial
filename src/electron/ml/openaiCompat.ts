export type OpenAICompatStatus =
  | { ok: true; baseUrl: string; models: string[] }
  | { ok: false; baseUrl: string; error: string }

type OpenAICompatModelsResponse = {
  data?: Array<{ id: string }>
}

export async function getOpenAICompatStatus(baseUrl = 'http://127.0.0.1:1234/v1'): Promise<OpenAICompatStatus> {
  const base = baseUrl.replace(/\/$/, '')
  const url = `${base}/models`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1200)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) {
      return { ok: false, baseUrl, error: `HTTP ${res.status}` }
    }

    const data = (await res.json()) as OpenAICompatModelsResponse
    const models = (data.data ?? []).map((m) => m.id).filter(Boolean)

    return { ok: true, baseUrl, models }
  } catch (err: any) {
    const msg = String(err?.name === 'AbortError' ? 'Timeout' : err?.message || err)
    return { ok: false, baseUrl, error: msg }
  }
}

/** Mirrors Groq's real tool-call shape (see src/backend/routes/chat.ts's
 *  BackendToolCall) so callers can treat a Lemonade/OpenAI-compat tool call
 *  identically to a Groq one downstream -- `args` is the raw JSON string the
 *  model produced (OpenAI's `arguments` field is always a string, never an
 *  object), parsed leniently by the caller with the same string fallback
 *  chat.ts already uses for Groq. */
export type OpenAICompatToolCall = {
  id: string
  name: string
  args: string
}

export type OpenAICompatChatRequest = {
  baseUrl?: string
  model: string
  system: string
  user: string
  /** Full messages array, overriding system/user above when provided --
   *  needed for tool-call turns, which must carry real conversation history
   *  (and, on a follow-up turn, prior tool results) rather than the
   *  flattened single-string prompt every other caller of this module uses.
   *  system/user stay required so every EXISTING caller (cosmos, LM Studio)
   *  keeps working unchanged. */
  messages?: Array<{ role: string; content: string }>
  tools?: Array<{ type: 'function'; function: { name: string; description?: string; parameters?: Record<string, unknown> } }>
  toolChoice?: 'auto' | 'required'
  timeoutMs?: number
}

export type OpenAICompatChatResponse =
  | { ok: true; text: string; toolCalls?: OpenAICompatToolCall[] }
  | { ok: false; error: string }

export async function openAICompatChat(req: OpenAICompatChatRequest): Promise<OpenAICompatChatResponse> {
  const baseUrl = (req.baseUrl ?? 'http://127.0.0.1:1234/v1').replace(/\/$/, '')
  const url = `${baseUrl}/chat/completions`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 30_000)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model,
        stream: false,
        messages: req.messages ?? [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        temperature: 0.4,
        max_tokens: 1024,
        ...(req.tools && req.tools.length > 0
          ? { tools: req.tools, tool_choice: req.toolChoice ?? 'auto' }
          : {}),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status}${text ? `: ${text}` : ''}` }
    }

    const data = (await res.json()) as any
    const message = data?.choices?.[0]?.message
    const text: string = message?.content ?? data?.choices?.[0]?.delta?.content ?? ''

    const rawToolCalls = message?.tool_calls
    const toolCalls: OpenAICompatToolCall[] | undefined = Array.isArray(rawToolCalls) && rawToolCalls.length > 0
      ? rawToolCalls.map((tc: any) => ({
          id: String(tc?.id ?? ''),
          name: String(tc?.function?.name ?? ''),
          args: String(tc?.function?.arguments ?? '{}'),
        }))
      : undefined

    return { ok: true, text: String(text), toolCalls }
  } catch (err: any) {
    const msg = String(err?.name === 'AbortError' ? 'Timeout' : err?.message || err)
    return { ok: false, error: msg }
  }
}
