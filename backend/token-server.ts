import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Choose a realtime-capable model. Keep this in env so you can swap later.
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';

// Optional: pick a voice supported by your realtime model.
const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || 'marin';

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * Creates an ephemeral client secret for browser-side WebRTC.
 * IMPORTANT: OPENAI_API_KEY must never go to the browser.
 */
app.get('/token', async (_req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

    // Session config per OpenAI WebRTC guide
    const body = {
      session: {
        type: 'realtime',
        model: REALTIME_MODEL,
        audio: { output: { voice: REALTIME_VOICE } },
      },
    };

    const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: 'token_mint_failed', details: data });
    }

    // Return the whole payload; frontend will read `client_secret.value`
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'server_error', details: String(e) });
  }
});

/**
 * Bearer-token auth middleware.
 * If MOSSY_BACKEND_TOKEN is set, every /v1/* request must carry it.
 * The /health and /token endpoints remain open so the desktop app can
 * wake the service and WebRTC sessions still work unauthenticated.
 */
function authMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) {
  const expected = process.env.MOSSY_BACKEND_TOKEN;
  if (!expected) return next(); // no token configured → open
  const auth = (req.headers['authorization'] as string | undefined) || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token !== expected) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

/**
 * POST /v1/chat
 * Body: { provider?: 'groq'|'openai', model?: string, messages: array, maxTokens?: number }
 * Returns: { ok: true, text: string } | { ok: false, error: string }
 */
app.post('/v1/chat', authMiddleware, async (req, res) => {
  try {
    const { provider = 'groq', model, messages, maxTokens = 1024 } = req.body as {
      provider?: string;
      model?: string;
      messages: Array<{ role: string; content: string }>;
      maxTokens?: number;
    };

    let apiKey: string | undefined;
    let apiUrl: string;
    let resolvedModel: string;

    if (provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY;
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      resolvedModel = model || 'gpt-4o-mini';
    } else {
      // default: groq
      apiKey = process.env.GROQ_API_KEY;
      apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      resolvedModel = model || 'llama-3.1-8b-instant';
    }

    if (!apiKey) {
      console.error(`[/v1/chat] Missing API key for provider: ${provider}`);
      return res.status(500).json({ ok: false, error: `Server misconfiguration: missing API key for ${provider}` });
    }

    const groqRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages,
        max_tokens: maxTokens,
      }),
    });

    const data = await groqRes.json() as any;

    if (!groqRes.ok) {
      const errMsg = data?.error?.message || `Upstream API error ${groqRes.status}`;
      console.error('[/v1/chat] Upstream error:', errMsg);
      return res.status(groqRes.status).json({ ok: false, error: errMsg });
    }

    const text: string = data?.choices?.[0]?.message?.content || '';
    return res.json({ ok: true, text });
  } catch (e) {
    console.error('[/v1/chat] Exception:', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => console.log(`Token server listening on :${PORT}`));
