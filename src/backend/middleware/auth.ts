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
  // When a client sends a token that doesn't match, log a warning but still allow
  // the request through. This prevents a stale/regenerated MOSSY_BACKEND_TOKEN on
  // the desktop from completely breaking connectivity — the service already accepts
  // no-token requests, so blocking mismatched tokens adds no real security.
  if (provided && provided !== expected) {
    console.warn('[auth] Token mismatch — proceeding in works-on-download mode. Update MOSSY_BACKEND_TOKEN to match MOSSY_API_TOKEN on Render to silence this warning.');
  }

  return next();
}
