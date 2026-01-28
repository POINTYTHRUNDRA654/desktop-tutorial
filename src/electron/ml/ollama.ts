type OllamaTagsResponse = {
  models: Array<{ name: string }>
}

export type OllamaStatus =
  | { ok: true; baseUrl: string; models: string[] }
  | { ok: false; baseUrl: string; error: string }

export async function getOllamaStatus(baseUrl = 'http://127.0.0.1:11434'): Promise<OllamaStatus> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/tags`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1200)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) {
      return { ok: false, baseUrl, error: `HTTP ${res.status}` }
    }

    const data = (await res.json()) as OllamaTagsResponse
    const models = (data.models ?? []).map((m) => m.name).filter(Boolean)
    return { ok: true, baseUrl, models }
  } catch (err: any) {
    const msg = String(err?.name === 'AbortError' ? 'Timeout' : err?.message || err)
    return { ok: false, baseUrl, error: msg }
  }
}

export type OllamaGenerateRequest = {
  model: string
  prompt: string
}

export type OllamaGenerateResponse =
  | { ok: true; text: string }
  | { ok: false; error: string }

export async function ollamaGenerate(
  req: OllamaGenerateRequest,
  opts?: { baseUrl?: string }
): Promise<OllamaGenerateResponse> {
  const baseUrl = (opts?.baseUrl ?? 'http://127.0.0.1:11434').replace(/\/$/, '')
  const url = `${baseUrl}/api/generate`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model,
        prompt: req.prompt,
        stream: false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status}${text ? `: ${text}` : ''}` }
    }

    const data = (await res.json()) as { response?: string }
    return { ok: true, text: String(data.response ?? '') }
  } catch (err: any) {
    const msg = String(err?.name === 'AbortError' ? 'Timeout' : err?.message || err)
    return { ok: false, error: msg }
  }
}
