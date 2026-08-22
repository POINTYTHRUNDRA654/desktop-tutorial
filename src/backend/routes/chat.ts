import type { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { Groq, RateLimitError as GroqRateLimitError, BadRequestError as GroqBadRequestError } from 'groq-sdk';
import type { ChatCompletion } from 'groq-sdk/resources/chat/completions';

// Primary model: best quality, moderate free-tier quota (6 k tokens/min, 500 req/day).
// Also has a 131,072-token context window — the smaller of the two models
// used here. llama-3.3-70b-versatile was deprecated by Groq on 2026-06-17;
// openai/gpt-oss-120b is Groq's own recommended migration target.
const GROQ_PRIMARY_MODEL = 'openai/gpt-oss-120b';
// Fallback model: much higher free-tier quota (20 k tokens/min, 14 400 req/day)
// AND a much larger 262,144-token context window (2x the primary model's).
// Used automatically when the primary model hits a 429 rate-limit OR a 400
// context-length-exceeded error — Mossy's system prompt (brain neurons + FO4
// knowledge base + core identity text) is large enough on its own that a
// single opening message can exceed the primary model's 131K window with
// zero conversation history yet; this was a real, confirmed regression.
// llama-3.1-8b-instant was deprecated by Groq on 2026-06-17; qwen/qwen3.6-27b
// is Groq's own recommended migration target.
const GROQ_FALLBACK_MODEL = 'qwen/qwen3.6-27b';

/** True for a 400 that looks like a context-length/request-too-large error,
 *  as opposed to some other bad-request condition retrying wouldn't fix. */
function isContextLengthError(e: unknown): boolean {
  if (!(e instanceof GroqBadRequestError)) return false;
  const msg = e.message || '';
  return /context.?length|reduce.*length|too (long|large)|shorten|maximum.*token|token.*limit/i.test(msg);
}

const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
});

// OpenAI/Groq-compatible tool declaration shape. Mirrors what groq-sdk's
// `tools` param and Groq's own tool-use docs expect -- see
// ChatCompletionTool in groq-sdk/resources/chat/completions for the
// authoritative shape this is a permissive subset of. `parameters` is left
// as z.record(z.any()) rather than fully typed: it's a real JSON Schema
// object (type/properties/required), and re-validating JSON Schema itself
// here would duplicate what Groq's own API already validates.
const ToolSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    parameters: z.record(z.string(), z.any()).optional(),
  }),
});

const ChatRequestSchema = z.object({
  provider: z.enum(['groq', 'openai']).default('groq'),
  model: z.string().min(1).optional(),
  messages: z.array(ChatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32768).optional(),
  // Real native tool-calling -- see this file's registerChatRoutes for the
  // full rationale. Optional: omitting it keeps today's plain-text behavior
  // unchanged for any caller that hasn't been updated yet.
  tools: z.array(ToolSchema).optional(),
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

export type BackendToolCall = {
  id: string;
  name: string;
  // Groq's real response gives arguments as a JSON *string*, matching OpenAI's
  // shape -- parsed here so callers get real objects, with a graceful string
  // fallback if the model ever emits malformed JSON (a real, if rare,
  // possibility with any tool-calling model) so a parse failure doesn't sink
  // the whole response.
  args: Record<string, unknown> | string;
};

/**
 * Call Groq with automatic model fallback on rate-limit (429).
 * Primary model (gpt-oss-120b) gives the best answers; if it is rate-limited
 * we transparently retry once with qwen3.6-27b, which has a much higher
 * free-tier quota.
 */
// reasoning_effort is only requested for GPT-OSS models — Groq's own docs are
// unambiguous about low/medium/high support there. For qwen3.6-27b (the
// fallback here), Groq's documentation is internally inconsistent about which
// values are valid (one page lists low/medium/high, another says only
// none/default for this specific model) — rather than guess on the primary
// chat path every user's traffic goes through, this is left alone for qwen
// and only set where it's verified safe.
function reasoningEffortFor(model: string): 'low' | 'medium' | 'high' | undefined {
  return model.startsWith('openai/gpt-oss') ? 'high' : undefined;
}

async function groqChatWithFallback(
  groq: Groq,
  preferredModel: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature?: number,
  maxTokens?: number,
  tools?: z.infer<typeof ToolSchema>[],
): Promise<{ text: string; model: string; usage: ChatCompletion['usage'] | null; toolCalls: BackendToolCall[] }> {
  const attempt = async (model: string): Promise<ChatCompletion> => {
    const reasoning_effort = reasoningEffortFor(model);
    // tool_choice: 'auto' (not 'required') -- the model should still be able
    // to just answer in plain text when no tool applies, matching how every
    // caller's system prompt already frames tools as optional actions, not a
    // mandatory step on every turn.
    const toolArgs = tools && tools.length > 0 ? { tools, tool_choice: 'auto' as const } : {};
    try {
      return await groq.chat.completions.create({
        model, messages, temperature, max_tokens: maxTokens, stream: false,
        ...toolArgs,
        ...(reasoning_effort ? { reasoning_effort } : {}),
      });
    } catch (e) {
      // Defensive fallback: if the API ever rejects reasoning_effort for this
      // model (spec drift, deprecation), retry once without it rather than
      // failing the whole chat request over an optional quality knob.
      if (reasoning_effort) {
        console.warn(`[Chat] reasoning_effort rejected for ${model}, retrying without it:`, e instanceof Error ? e.message : e);
        return groq.chat.completions.create({ model, messages, temperature, max_tokens: maxTokens, ...toolArgs });
      }
      throw e;
    }
  };

  const extractToolCalls = (completion: ChatCompletion): BackendToolCall[] => {
    const rawCalls = completion.choices?.[0]?.message?.tool_calls;
    if (!Array.isArray(rawCalls)) return [];
    return rawCalls
      .filter((c): c is typeof c & { type: 'function' } => c.type === 'function')
      .map((c) => {
        let args: Record<string, unknown> | string = c.function.arguments;
        try {
          args = JSON.parse(c.function.arguments);
        } catch {
          // Malformed JSON from the model -- keep the raw string rather than
          // dropping the tool call entirely; the caller can decide how to
          // handle an unparseable args string.
        }
        return { id: c.id, name: c.function.name, args };
      });
  };

  try {
    const completion = await attempt(preferredModel);
    return {
      text: completion.choices?.[0]?.message?.content || '',
      model: preferredModel,
      usage: completion.usage ?? null,
      toolCalls: extractToolCalls(completion),
    };
  } catch (e) {
    const rateLimited = e instanceof GroqRateLimitError;
    const tooLong = isContextLengthError(e);
    if ((rateLimited || tooLong) && preferredModel !== GROQ_FALLBACK_MODEL) {
      console.warn(`[Chat] ${tooLong ? 'Context length exceeded' : 'Rate-limited'} on ${preferredModel}, retrying with ${GROQ_FALLBACK_MODEL} (${tooLong ? '262K' : 'higher-quota'} context)`);
      const fallback = await attempt(GROQ_FALLBACK_MODEL);
      return {
        text: fallback.choices?.[0]?.message?.content || '',
        model: GROQ_FALLBACK_MODEL,
        usage: fallback.usage ?? null,
        toolCalls: extractToolCalls(fallback),
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

    const { provider, messages, temperature, maxTokens, tools } = parsed.data;

    try {
      if (provider === 'openai') {
        const client = getOpenAIClient();
        const model = parsed.data.model || String(process.env.OPENAI_MODEL || 'gpt-4o-mini');

        const completion = await client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' as const } : {}),
        });

        const text = completion.choices?.[0]?.message?.content || '';
        const rawCalls = completion.choices?.[0]?.message?.tool_calls || [];
        const toolCalls: BackendToolCall[] = rawCalls
          .filter((c): c is typeof c & { type: 'function' } => c.type === 'function')
          .map((c) => {
            let args: Record<string, unknown> | string = c.function.arguments;
            try { args = JSON.parse(c.function.arguments); } catch { /* keep raw string */ }
            return { id: c.id, name: c.function.name, args };
          });
        return res.json({ ok: true, provider, model, text, usage: completion.usage || null, toolCalls });
      }

      const groq = getGroqClient();
      // Prefer the model from env (operator override) > request model > built-in primary default.
      const preferredModel = String(process.env.GROQ_MODEL || parsed.data.model || GROQ_PRIMARY_MODEL);
      const { text, model: usedModel, usage, toolCalls } = await groqChatWithFallback(groq, preferredModel, messages, temperature, maxTokens, tools);
      return res.json({ ok: true, provider, model: usedModel, text, usage, toolCalls });
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      return res.status(500).json({ ok: false, error: 'chat_failed', message: msg });
    }
  });
}
