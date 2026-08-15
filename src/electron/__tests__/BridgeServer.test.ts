// @vitest-environment node

import fs from 'fs';
import os from 'os';
import path from 'path';
import net from 'net';

// BridgeServer._checkAuth() reads bridgeAuthToken from the same settings.json
// main.ts's loadSettings() writes to (via app.getPath('userData')). Outside a
// real Electron process, `electron`'s app module isn't available, so we mock
// it to point userData at a throwaway temp dir and seed it with a known
// token — otherwise _readSettings() would silently return {} (its catch-all
// fallback) and every request would correctly-but-uselessly 401 forever.
const { tmpUserDataDir, TEST_TOKEN } = vi.hoisted(() => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mossy-bridge-test-'));
  const token = 'test-bridge-auth-token-0123456789abcdef';
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ bridgeAuthToken: token }));
  return { tmpUserDataDir: dir, TEST_TOKEN: token };
});

vi.mock('electron', () => ({
  app: { getPath: (_name: string) => tmpUserDataDir },
  clipboard: { writeText: vi.fn(), readText: vi.fn(() => '') },
  nativeImage: { createFromDataURL: vi.fn() },
  screen: {
    getPrimaryDisplay: vi.fn(() => ({ workAreaSize: { width: 1920, height: 1080 } })),
    getAllDisplays: vi.fn(() => []),
  },
}));

import { BridgeServer } from '../BridgeServer';

async function postJson(port: number, urlPath: string, obj: any, opts: { auth?: string | false } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = opts.auth === undefined ? TEST_TOKEN : opts.auth;
  if (token) headers['X-Mossy-Token'] = token;
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(obj),
  });
  const body = await res.text();
  let json;
  try { json = JSON.parse(body); } catch { json = body; }
  return { status: res.status, body: json };
}

async function getJson(port: number, urlPath: string, opts: { auth?: string | false } = {}) {
  const headers: Record<string, string> = {};
  const token = opts.auth === undefined ? TEST_TOKEN : opts.auth;
  if (token) headers['X-Mossy-Token'] = token;
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { method: 'GET', headers });
  const body = await res.text();
  let json;
  try { json = JSON.parse(body); } catch { json = body; }
  return { status: res.status, body: json };
}

async function getFreePort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((r) => probe.listen(0, '127.0.0.1', r));
  const freePort = (probe.address() as net.AddressInfo).port;
  await new Promise<void>((r) => probe.close(() => r()));
  return freePort;
}

describe('BridgeServer (HTTP)', () => {
  let bridge: BridgeServer;
  let bridgePort: number;
  let addonPort: number;
  let mockServer: net.Server;
  let mode: 'closed' | 'echo' = 'closed';

  beforeAll(async () => {
    mockServer = net.createServer((sock) => {
      if (mode === 'closed') { sock.destroy(); return; }
      sock.on('data', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'script') {
            sock.write(JSON.stringify({ success: true, echoed: parsed.code }));
          } else if (parsed.type === 'text') {
            sock.write(JSON.stringify({ ok: true }));
          } else {
            sock.write(JSON.stringify({ error: 'unknown' }));
          }
        } catch {
          sock.write(JSON.stringify({ error: 'bad json' }));
        }
        sock.end();
      });
    });
    await new Promise<void>((r) => mockServer.listen(0, '127.0.0.1', r));
    addonPort = (mockServer.address() as net.AddressInfo).port;

    bridgePort = await getFreePort();
    bridge = new BridgeServer(addonPort, bridgePort);
    bridge.start();
  });

  afterAll(() => {
    bridge.stop();
    mockServer.close();
    fs.rmSync(tmpUserDataDir, { recursive: true, force: true });
  });

  it('allows GET /health with no token (the Blender add-on\'s check_bridge() calls it unauthenticated)', async () => {
    const resp = await getJson(bridgePort, '/health', { auth: false });
    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('status', 'online');
  }, 10000);

  it('rejects requests with no X-Mossy-Token header with 401', async () => {
    const resp = await postJson(bridgePort, '/execute', { type: 'blender', script: 'print("hi")', target: 'active_instance' }, { auth: false });
    expect(resp.status).toBe(401);
  }, 10000);

  it('rejects requests with an incorrect X-Mossy-Token header with 401', async () => {
    const resp = await postJson(bridgePort, '/execute', { type: 'blender', script: 'print("hi")', target: 'active_instance' }, { auth: 'wrong-token' });
    expect(resp.status).toBe(401);
  }, 10000);

  it('rejects the removed shell execution type with 400, even with a valid token', async () => {
    const resp = await postJson(bridgePort, '/execute', { type: 'shell', script: 'echo hi' });
    expect(resp.status).toBe(400);
  }, 10000);

  it('returns 503 or 504 when blender addon port is closed', async () => {
    const resp = await postJson(bridgePort, '/execute', { type: 'blender', script: 'print("hi")', target: 'active_instance' });
    expect([503, 504]).toContain(resp.status);
    expect(resp.body).toHaveProperty('status', 'error');
    expect(resp.body.message || '').toMatch(/(not responding|timed out)/);
  }, 10000);

  it('forwards script payload to a listening addon and returns its response', async () => {
    mode = 'echo';
    const resp = await postJson(bridgePort, '/execute', { type: 'blender', script: 'foo', target: 'active_instance' });
    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('status', 'success');
    expect(resp.body.response).toMatch(/\"success\":true/);
  }, 10000);

  it('handles text type and proxies payload', async () => {
    mode = 'echo';
    const resp = await postJson(bridgePort, '/execute', { type: 'text', script: 'bar', name: 'test', run: false });
    expect(resp.status).toBe(200);
    expect(resp.body.status).toBe('success');
    expect(resp.body.response).toMatch(/\"ok\":true/);
  }, 10000);
});
