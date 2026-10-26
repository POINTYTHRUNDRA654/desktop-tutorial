/**
 * MCP bridge (optional, off by default): lets Claude Code, the Claude desktop
 * app or any MCP client use Mossy's real tools on this PC, through the
 * mossy-mcp stdio server in tools/mossy-mcp/.
 *
 *   mossy-mcp (stdio)  --HTTP-->  this server (127.0.0.1 only, own token)
 *                      --IPC-->   renderer's mcpRunner.ts
 *                      --------> executeMossyTool() (the same engine chat/voice use)
 *
 * Tools run in the renderer because that's where executeMossyTool lives, so
 * Mossy's window has to be open. Her do-not-touch whitelist and permission
 * checks inside executeMossyTool apply exactly as they do for chat.
 *
 * Security: loopback bind, a fresh random token per launch (NOT the Bridge
 * Server's token), timing-safe compare, fail-closed, Host-header check and
 * any request carrying an Origin header rejected -- so a browser tab can't
 * reach it even via DNS rebinding. Token + port are written to
 * <userData>/mcp-bridge.json for mossy-mcp to read, and the file is removed
 * on quit. Starts only when the user turned it on (Settings > Claude / MCP
 * bridge, setting mcpBridgeEnabled) or an mcp-bridge.enable /
 * localdev-mcp.enable marker file exists in userData.
 */
import { app, ipcMain, BrowserWindow } from 'electron';
import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_PORT = 21340;
const CALL_TIMEOUT_MS = 180_000;

type Pending = { resolve: (v: any) => void; reject: (e: Error) => void; timer: NodeJS.Timeout };

export function mcpBridgeEnabled(settings: Record<string, unknown> | null | undefined): boolean {
  if (settings?.mcpBridgeEnabled === true) return true;
  const dir = app.getPath('userData');
  return ['mcp-bridge.enable', 'localdev-mcp.enable'].some((f) => fs.existsSync(path.join(dir, f)));
}

export function start(opts: { getWindow: () => BrowserWindow | null; settings: Record<string, unknown> | null | undefined }): void {
  if (!mcpBridgeEnabled(opts.settings)) {
    console.log('[mcp-bridge] off (turn it on in Settings > Claude / MCP bridge)');
    return;
  }

  // Optional: send lessons approved through the bridge into a source checkout's
  // brain-b/knowledge folder (for people developing Mossy itself). Set
  // MOSSY_REPO_DIR to that checkout; nothing happens without it.
  const repoDir = process.env.MOSSY_REPO_DIR;
  const repoLessons = repoDir ? path.join(repoDir, 'brain-b', 'knowledge') : '';
  if (repoLessons && !process.env.MOSSY_LESSONS_DIR && fs.existsSync(repoLessons)) {
    process.env.MOSSY_LESSONS_DIR = repoLessons;
    console.log(`[mcp-bridge] Brain B lessons -> ${repoLessons}`);
  }

  const port = Number(process.env.MOSSY_MCP_PORT) || DEFAULT_PORT;
  const token = crypto.randomBytes(32).toString('hex');
  const tokenBuf = Buffer.from(token);
  const discoveryFile = path.join(app.getPath('userData'), 'mcp-bridge.json');
  const pending = new Map<string, Pending>();

  ipcMain.handle('mcp-bridge:response', (_e, msg: { id: string; ok: boolean; result?: any; error?: string }) => {
    const p = pending.get(msg?.id);
    if (!p) return false;
    clearTimeout(p.timer);
    pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error || 'Tool failed with no error message'));
    return true;
  });

  const askRenderer = (kind: 'list' | 'call' | 'lesson', payload: any): Promise<any> => {
    const win = opts.getWindow();
    if (!win || win.isDestroyed()) {
      return Promise.reject(new Error("Mossy's main window isn't open, so her tools can't run. Open Mossy and try again."));
    }
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Mossy didn't answer within ${CALL_TIMEOUT_MS / 1000}s. The window may still be loading, or the tool is stuck.`));
      }, CALL_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      win.webContents.send('mcp-bridge:request', { id, kind, ...payload });
    });
  };

  const send = (res: http.ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  const server = http.createServer((req, res) => {
    const host = String(req.headers.host || '');
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(res, 403, { error: 'Bad Host header' });
    if (req.headers.origin) return send(res, 403, { error: 'Browser requests are not allowed' });

    const provided = Buffer.from(String(req.headers['x-mossy-mcp-token'] || ''));
    const authed = provided.length === tokenBuf.length && crypto.timingSafeEqual(provided, tokenBuf);
    if (!authed) return send(res, 401, { error: 'Missing or invalid x-mossy-mcp-token' });

    const url = (req.url || '').split('?')[0];
    let body = '';
    req.on('data', (c) => {
      body += c.toString();
      if (body.length > 5_000_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        if (req.method === 'GET' && url === '/health') {
          const win = opts.getWindow();
          return send(res, 200, { ok: true, windowOpen: !!win && !win.isDestroyed() });
        }
        if (req.method === 'GET' && url === '/tools') {
          return send(res, 200, { tools: await askRenderer('list', {}) });
        }
        const parsed = body ? JSON.parse(body) : {};
        if (req.method === 'POST' && url === '/tool') {
          if (!parsed?.name || typeof parsed.name !== 'string') return send(res, 400, { error: 'name is required' });
          const result = await askRenderer('call', { name: parsed.name, args: parsed.args || {} });
          return send(res, 200, { result });
        }
        if (req.method === 'POST' && url === '/lesson') {
          return send(res, 200, { result: await askRenderer('lesson', { lesson: parsed }) });
        }
        return send(res, 404, { error: `Unknown route ${req.method} ${url}` });
      } catch (e: any) {
        return send(res, 500, { error: String(e?.message || e) });
      }
    });
  });

  server.on('error', (e: any) => {
    console.error(`[mcp-bridge] could not listen on 127.0.0.1:${port}: ${e?.message || e}`);
  });

  server.listen(port, '127.0.0.1', () => {
    try {
      fs.writeFileSync(discoveryFile, JSON.stringify({ port, token, pid: process.pid, startedAt: new Date().toISOString() }), { mode: 0o600 });
    } catch (e: any) {
      console.error('[mcp-bridge] could not write discovery file:', e?.message || e);
    }
    console.log(`[mcp-bridge] listening on 127.0.0.1:${port}`);
  });

  app.on('will-quit', () => {
    try { server.close(); } catch { /* ignore */ }
    try { fs.unlinkSync(discoveryFile); } catch { /* ignore */ }
  });
}
