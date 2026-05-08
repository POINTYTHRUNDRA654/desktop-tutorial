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

app.listen(PORT, () => console.log(`Token server listening on :${PORT}`));
