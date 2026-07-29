import type { Request, Response, NextFunction } from 'express';

function extractBearerToken(req: Request): string {
  const h = String(req.headers['authorization'] || '').trim();
  if (!h) return '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

/**
 * Simple shared-token auth.
 *
 * - Set `MOSSY_API_TOKEN` in the backend environment.
 * - Client sends `Authorization: Bearer <token>`.
 *
 * If no token is configured, auth is disabled (useful for local dev).
 *
 * Once a token IS configured, it is genuinely required — a request with no
 * token is rejected the same as one with a wrong token. This backend is
 * publicly reachable (the desktop app calls it over the internet, e.g. a
 * Render deployment), and the previous version of this check only rejected
 * a *wrong* token while silently letting an absent token through — meaning
 * anyone who found the public URL could call /v1/chat and /v1/transcribe
 * with no token at all and consume the operator's own Groq/OpenAI quota and
 * billing. The Electron client always sends MOSSY_BACKEND_TOKEN (decrypted
 * from the packaged .env.encrypted at startup) once it's set server-side, so
 * enforcing it here does not break the legitimate desktop client.
 */
export function requireApiToken(req: Request, res: Response, next: NextFunction) {
  const expected = String(process.env.MOSSY_API_TOKEN || '').trim();
  if (!expected) return next();

  const provided = extractBearerToken(req) || String(req.headers['x-mossy-token'] || '').trim();
  if (!provided || provided !== expected) return res.status(401).json({ ok: false, error: 'unauthorized' });

  return next();
}
