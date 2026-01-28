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

export type OpenAICompatChatRequest = {
  baseUrl?: string
  model: string
  system: string
  user: string
}

export type OpenAICompatChatResponse =
  | { ok: true; text: string }
  | { ok: false; error: string }

export async function openAICompatChat(req: OpenAICompatChatRequest): Promise<OpenAICompatChatResponse> {
  const baseUrl = (req.baseUrl ?? 'http://127.0.0.1:1234/v1').replace(/\/$/, '')
  const url = `${baseUrl}/chat/completions`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model,
        stream: false,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        temperature: 0.4,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status}${text ? `: ${text}` : ''}` }
    }

    const data = (await res.json()) as any
    const text =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      ''

    return { ok: true, text: String(text) }
  } catch (err: any) {
    const msg = String(err?.name === 'AbortError' ? 'Timeout' : err?.message || err)
    return { ok: false, error: msg }
  }
}
