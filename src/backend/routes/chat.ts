import type { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { Groq, RateLimitError as GroqRateLimitError } from 'groq-sdk';
import type { ChatCompletion } from 'groq-sdk/resources/chat/completions';

// Primary model: best quality, moderate free-tier quota (6 k tokens/min, 500 req/day)
const GROQ_PRIMARY_MODEL = 'llama-3.3-70b-versatile';
// Fallback model: much higher free-tier quota (20 k tokens/min, 14 400 req/day)
// Used automatically when the primary model hits a 429 rate-limit.
const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant';

const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
});

const ChatRequestSchema = z.object({
  provider: z.enum(['groq', 'openai']).default('groq'),
  model: z.string().min(1).optional(),
  messages: z.array(ChatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(8192).optional(),
});

function getOpenAIClient(): OpenAI {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return new OpenAI({ apiKey });
}

function getGroqClient(): Groq {
  const apiKey = String(process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing GROQ_API_KEY');
  return new Groq({ apiKey });
}

/**
 * Call Groq with automatic model fallback on rate-limit (429).
 * Primary model (70b) gives the best answers; if it is rate-limited we transparently
 * retry once with the 8b-instant model which has a ~28× higher free-tier quota.
 */
async function groqChatWithFallback(
  groq: Groq,
  preferredModel: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature?: number,
  maxTokens?: number,
): Promise<{ text: string; model: string; usage: ChatCompletion['usage'] | null }> {
  const attempt = async (model: string): Promise<ChatCompletion> =>
    groq.chat.completions.create({ model, messages, temperature, max_tokens: maxTokens });

  try {
    const completion = await attempt(preferredModel);
    return {
      text: completion.choices?.[0]?.message?.content || '',
      model: preferredModel,
      usage: completion.usage ?? null,
    };
  } catch (e) {
    if (e instanceof GroqRateLimitError && preferredModel !== GROQ_FALLBACK_MODEL) {
      console.warn(`[Chat] Groq rate-limited on ${preferredModel}, retrying with ${GROQ_FALLBACK_MODEL}`);
      const fallback = await attempt(GROQ_FALLBACK_MODEL);
      return {
        text: fallback.choices?.[0]?.message?.content || '',
        model: GROQ_FALLBACK_MODEL,
        usage: fallback.usage ?? null,
      };
    }
    throw e;
  }
}

export function registerChatRoutes(router: Router) {
  router.post('/v1/chat', async (req, res) => {
    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_request', details: parsed.error.flatten() });
    }

    const { provider, messages, temperature, maxTokens } = parsed.data;

    try {
      if (provider === 'openai') {
        const client = getOpenAIClient();
        const model = parsed.data.model || String(process.env.OPENAI_MODEL || 'gpt-4o-mini');

        const completion = await client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });

        const text = completion.choices?.[0]?.message?.content || '';
        return res.json({ ok: true, provider, model, text, usage: completion.usage || null });
      }

      const groq = getGroqClient();
      // Prefer the model from env (operator override) > request model > built-in primary default.
      const preferredModel = String(process.env.GROQ_MODEL || parsed.data.model || GROQ_PRIMARY_MODEL);
      const { text, model: usedModel, usage } = await groqChatWithFallback(groq, preferredModel, messages, temperature, maxTokens);
      return res.json({ ok: true, provider, model: usedModel, text, usage });
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      return res.status(500).json({ ok: false, error: 'chat_failed', message: msg });
    }
  });
}
