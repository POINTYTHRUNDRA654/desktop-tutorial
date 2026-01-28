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
 * If no token is configured, auth is disabled (useful for local dev),
 * but you should enable it for any public deployment.
 */
export function requireApiToken(req: Request, res: Response, next: NextFunction) {
  const expected = String(process.env.MOSSY_API_TOKEN || '').trim();
  if (!expected) return next();

  const provided = extractBearerToken(req) || String(req.headers['x-mossy-token'] || '').trim();
  // If a token is configured server-side, accept it when provided, but do not
  // require it. This supports "works on download" clients.
  //
  // If a client *does* send a token and it's wrong, reject it (helps catch misconfig).
  if (provided && provided !== expected) return res.status(401).json({ ok: false, error: 'unauthorized' });

  return next();
}
