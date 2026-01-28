import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { apiLimiter } from './middleware/rateLimit';
import { requireApiToken } from './middleware/auth';
import { registerHealthRoutes } from './routes/health';
import { registerChatRoutes } from './routes/chat';
import { registerTranscriptionRoutes } from './routes/transcribe';

const PORT = Number(process.env.PORT || process.env.MOSSY_BACKEND_PORT || 8787);

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Mossy-Token'],
  })
);

app.use(express.json({ limit: '2mb' }));

// Lightweight request logging (no bodies)
app.use((req, _res, next) => {
  console.log(`[backend] ${req.method} ${req.path}`);
  next();
});

// Apply safety to all API routes
app.use(apiLimiter);
app.use(requireApiToken);

const router = express.Router();
registerHealthRoutes(router);
registerChatRoutes(router);
registerTranscriptionRoutes(router);

app.use(router);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'not_found' });
});

app.listen(PORT, () => {
  console.log(`[backend] listening on http://127.0.0.1:${PORT}`);
});
