import type { Router } from 'express';

// Render sets RENDER_GIT_COMMIT automatically on every deploy — surfacing it
// here means deploy recency can be checked with a plain curl to /health,
// instead of relying on reading the Render dashboard (which shows service
// health, not which commit is actually live).
const DEPLOYED_COMMIT = String(process.env.RENDER_GIT_COMMIT || 'unknown').slice(0, 12);

export function registerHealthRoutes(router: Router) {
  // Useful for Render's default health check path (`/`).
  router.get('/', (_req, res) => {
    res.json({ ok: true, service: 'mossy-backend', time: new Date().toISOString(), commit: DEPLOYED_COMMIT });
  });

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'mossy-backend', time: new Date().toISOString(), commit: DEPLOYED_COMMIT });
  });
}
