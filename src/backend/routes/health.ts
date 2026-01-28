import type { Router } from 'express';

export function registerHealthRoutes(router: Router) {
  // Useful for Render's default health check path (`/`).
  router.get('/', (_req, res) => {
    res.json({ ok: true, service: 'mossy-backend', time: new Date().toISOString() });
  });

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'mossy-backend', time: new Date().toISOString() });
  });
}
