import rateLimit from 'express-rate-limit';

function toInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const apiLimiter = rateLimit({
  windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  limit: toInt(process.env.RATE_LIMIT_MAX, 60),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
