import http from 'http';

const PORT            = 8765;
const KOBOLD_PORT     = 5001;
const PY_BRIDGE_PORT  = 28485;

const NPC_ROLE_PROMPTS: Record<string, string> = {
  settler:   "a hardworking settler of the Commonwealth, cautious but hopeful",
  companion: "the Sole Survivor's trusted companion, loyal and battle-hardened",
  raider:    "a brutal raider who lives by violence and intimidation",
  robot:     "a robotic unit following directives with mechanical precision",
  ghoul:     "a ghoul scarred by centuries of radiation, haunted by pre-war memories",
  default:   "a survivor of the post-nuclear Commonwealth",
};

function buildNpcSystemPrompt(name: string, role: string, extraCtx: string): string {
  const roleDesc = NPC_ROLE_PROMPTS[role.toLowerCase()] ?? NPC_ROLE_PROMPTS.default;
  const base = `You are ${name}, ${roleDesc}. Speak in character. Keep responses under 2 sentences. Be terse, gritty, and era-appropriate.`;
  return extraCtx ? `${base} Context: ${extraCtx}` : base;
}

async function probePort(port: number, path: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port, path, timeout: 1500 }, (res) => {
      res.resume(); res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function callKoboldChat(messages: { role: string; content: string }[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'default', messages, max_tokens: 150, stream: false });
    const req = http.request(
      { hostname: '127.0.0.1', port: KOBOLD_PORT, path: '/v1/chat/completions', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 10_000 },
      (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)?.choices?.[0]?.message?.content ?? ''); }
          catch { reject(new Error('Invalid KoboldCPP response')); }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('KoboldCPP timeout')); });
    req.write(body); req.end();
  });
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 65_536) reject(new Error('Body too large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

/**
 * F4AIBridgeServer — Mossy's bridge for the Fallout 4 Advanced AI addon.
 *
 * Mirrors the Blender bridge pattern (BridgeServer.ts) but for F4AI.
 * Listens on port 8765 so the F4AI Python bridge (and future Papyrus hooks)
 * can call Mossy for NPC dialogue, context enrichment, and status checks.
 *
 * Endpoints
 *   GET  /health           → liveness check
 *   GET  /f4ai/status      → KoboldCPP + Python bridge probe
 *   POST /f4ai/bridge      → NPC dialogue generation via KoboldCPP
 */
export class F4AIBridgeServer {
  private _server: http.Server | null = null;

  get port(): number { return PORT; }

  isRunning(): boolean { return this._server !== null; }

  start(): void {
    if (this._server) return;

    this._server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

      const url    = req.url  ?? '/';
      const method = req.method ?? 'GET';

      const ok  = (obj: object) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      const err = (code: number, msg: string) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: msg })); };

      try {
        // ── Health ─────────────────────────────────────────────────────────────
        if (url === '/health' && method === 'GET') {
          ok({ ok: true, service: 'Mossy F4AI Bridge', port: PORT });
          return;
        }

        // ── Status (KoboldCPP + Python bridge probe) ────────────────────────────
        if (url === '/f4ai/status' && method === 'GET') {
          const [kobold, pyBridge] = await Promise.all([
            probePort(KOBOLD_PORT,    '/api/v1/info'),
            probePort(PY_BRIDGE_PORT, '/llm/status'),
          ]);
          ok({ active: true, kobold_running: kobold, python_bridge_running: pyBridge,
               kobold_port: KOBOLD_PORT, python_bridge_port: PY_BRIDGE_PORT });
          return;
        }

        // ── NPC dialogue via KoboldCPP ──────────────────────────────────────────
        if (url === '/f4ai/bridge' && method === 'POST') {
          const body = await readBody(req);
          const { npc_id = 'unknown', npc_name = 'Stranger', npc_role = 'default',
                  player_input = '', dialogue_history = [], context = '' } = body;

          const system = buildNpcSystemPrompt(npc_name, npc_role, context);
          const messages: { role: string; content: string }[] = [
            { role: 'system', content: system },
            ...dialogue_history.map((d: any) => ({
              role: d.speaker === 'player' ? 'user' : 'assistant',
              content: d.text ?? '',
            })),
            { role: 'user', content: player_input },
          ];

          const koboldUp = await probePort(KOBOLD_PORT, '/api/v1/info');
          if (!koboldUp) { err(503, 'KoboldCPP not running on port ' + KOBOLD_PORT); return; }

          const dialogue = await callKoboldChat(messages);
          ok({ ok: true, dialogue, source: 'koboldcpp', npc_id, npc_name });
          return;
        }

        err(404, 'Unknown endpoint');
      } catch (e: any) {
        console.error('[F4AI Bridge] Handler error:', e?.message);
        err(500, e?.message ?? 'Internal error');
      }
    });

    this._server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(`[F4AI Bridge] Port ${PORT} in use — bridge not started`);
      } else {
        console.error('[F4AI Bridge]', e);
      }
    });

    this._server.listen(PORT, '127.0.0.1', () => {
      console.log(`[F4AI Bridge] Active on port ${PORT}`);
    });
  }

  stop(): void {
    if (this._server) { this._server.close(); this._server = null; }
  }
}
