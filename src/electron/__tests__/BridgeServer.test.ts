// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BridgeServer } from '../BridgeServer';
import net from 'net';

// helper to do a simple http POST using built-in fetch (Node 18+ has global fetch)
async function postJson(path: string, obj: any) {
  const res = await fetch(`http://127.0.0.1:21337${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  });
  const body = await res.text();
  let json;
  try { json = JSON.parse(body); } catch { json = body; }
  return { status: res.status, body: json };
}

describe('BridgeServer (HTTP)', () => {
  let bridge: BridgeServer;
  let addonPort: number;
  let mockServer: net.Server;
  let mode: 'closed' | 'echo' = 'closed';

  // keep a single server running for the duration of the suite to avoid
  // port flapping/timing issues when rapidly starting/stopping between tests.
  beforeAll(async () => {
    // start a mock addon listener on an ephemeral port and store mode-controlled
    // behavior; begin in "closed" mode so first test sees an unresponsive addon.
    mockServer = net.createServer((sock) => {
      if (mode === 'closed') {
        // immediately destroy the connection to simulate an offline addon
        sock.destroy();
        return;
      }
      // echo mode: behave like a simple Mossy addon
      sock.on('data', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          // script responses mirror structure used by tests
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

    bridge = new BridgeServer(addonPort);
    bridge.start();
  });

  afterAll(() => {
    bridge.stop();
    mockServer.close();
  });

  it('returns 503 or 504 when blender addon port is closed', async () => {
    const resp = await postJson('/execute', { type: 'blender', script: 'print("hi")', target: 'active_instance' });
    // depending on timing we may hit immediate connection failure (503) or a
    // socket timeout (504).  Either is acceptable behaviour.
    expect([503, 504]).toContain(resp.status);
    expect(resp.body).toHaveProperty('status', 'error');
    expect(resp.body.message || '').toMatch(/(not responding|timed out)/);
  }, 10000);

  it('forwards script payload to a listening addon and returns its response', async () => { // timeout 10s
    // switch into echo mode before sending the command
    mode = 'echo';

    const resp = await postJson('/execute', { type: 'blender', script: 'foo', target: 'active_instance' });
    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('status', 'success');
    expect(resp.body.response).toMatch(/\"success\":true/);
  }, 10000);

  it('handles text type and proxies payload', async () => { // timeout 10s
    mode = 'echo';

    const resp = await postJson('/execute', { type: 'text', script: 'bar', name: 'test', run: false });
    expect(resp.status).toBe(200);
    expect(resp.body.status).toBe('success');
    expect(resp.body.response).toMatch(/\"ok\":true/);
  }, 10000);
});
