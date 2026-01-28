import type { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { Groq } from 'groq-sdk';

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
      const model = parsed.data.model || String(process.env.GROQ_MODEL || 'llama-3.1-70b-versatile');

      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const text = completion.choices?.[0]?.message?.content || '';
      return res.json({ ok: true, provider, model, text, usage: (completion as any).usage || null });
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      return res.status(500).json({ ok: false, error: 'chat_failed', message: msg });
    }
  });
}
