import type { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

function getOpenAIClient(): OpenAI {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return new OpenAI({ apiKey });
}

export function registerTranscriptionRoutes(router: Router) {
  router.post('/v1/transcribe', upload.single('audio'), async (req, res) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ ok: false, error: 'missing_file' });
      }

      const model = String(process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
      const language = typeof req.body?.language === 'string' ? String(req.body.language) : undefined;

      const client = getOpenAIClient();

      // OpenAI SDK expects a File-like object in some runtimes; in Node it supports a Blob.
      const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' });

      const resp = await client.audio.transcriptions.create({
        model,
        file: blob as any,
        language,
      });

      const text = (resp as any).text || '';
      return res.json({ ok: true, text });
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      return res.status(500).json({ ok: false, error: 'transcribe_failed', message: msg });
    }
  });
}
