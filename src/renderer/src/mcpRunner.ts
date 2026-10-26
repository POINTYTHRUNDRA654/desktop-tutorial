/**
 * Renderer half of the optional MCP bridge (see src/electron/mcpBridge.ts).
 * Loaded by main.tsx. It only listens for requests; the main-process half
 * decides whether the bridge runs at all (off unless the user turned it on).
 *
 * Runs tool calls through executeMossyTool() -- the same engine chat and
 * voice use -- so the do-not-touch whitelist and permission checks apply.
 * UI-state setters are no-ops here: tools still do their real work, they
 * just don't repaint chat-panel state that belongs to a chat turn.
 */
import { executeMossyTool } from './MossyTools';
import { toGroqTools } from './MossyBrain';
import { LocalAIEngine } from './LocalAIEngine';

type McpRequest =
  | { id: string; kind: 'list' }
  | { id: string; kind: 'call'; name: string; args: any }
  | { id: string; kind: 'lesson'; lesson: any };

function getApi(): any {
  return (window as any).electron?.api || (window as any).electronAPI;
}

function jsonSafe(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return String(value);
  }
}

function log(extra: Record<string, unknown>): void {
  try {
    void getApi()?.writeDiagnosticLog?.(`[mcp-bridge] ${JSON.stringify({ timestamp: new Date().toISOString(), ...extra })}`);
  } catch { /* diagnostics only */ }
}

async function proposeLesson(lesson: any): Promise<unknown> {
  const program = String(lesson?.program || '').trim();
  const observation = String(lesson?.observation || '').trim();
  if (!program || !observation) throw new Error('program and observation are required');

  let base = 'http://127.0.0.1:8766';
  try {
    const s: any = await (LocalAIEngine as any).getLocalAiSettings();
    if (s?.brainBBaseUrl) base = String(s.brainBBaseUrl);
  } catch { /* default */ }

  const conn = await getApi()?.getBridgeConnection?.().catch(() => null);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (conn?.token) headers['X-Mossy-Token'] = String(conn.token);

  const res = await fetch(`${base}/change-gate/propose`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      program,
      observation,
      suggestedCorrection: lesson?.suggestedCorrection ?? null,
      sourceContext: { source: 'mcp-bridge', verification: lesson?.verification ?? null, proposedAt: Date.now() },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Brain B refused the lesson (HTTP ${res.status}): ${data?.error || 'no detail'}`);
  return data;
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${ms / 1000}s`)), ms))]);
}

async function blenderDirect(name: string, args: Record<string, any>): Promise<unknown> {
  const api = getApi();
  if (!api?.checkBlenderAddon || !api?.sendBlenderCommand) {
    return { success: false, result: 'Blender bridge API not available in this build.' };
  }
  const chk: any = await withTimeout<any>(api.checkBlenderAddon(), 8000, 'Blender link check').catch((e: any) => ({ connected: false, error: String(e?.message || e) }));
  if (!chk?.connected) {
    localStorage.setItem('mossy_blender_active', 'false');
    return { success: false, result: `Blender add-on is not answering on port 9999${chk?.error ? ` (${chk.error})` : ''}.` };
  }
  localStorage.setItem('mossy_blender_active', 'true');
  // mossy_link.py rejects commands without the shared link token (fail-closed),
  // same token DesktopBridge.tsx passes from settings.blenderLinkToken.
  let token: string | undefined;
  try { token = (await api.getSettings?.())?.blenderLinkToken || undefined; } catch { /* no token */ }
  if (name === 'get_blender_scene_info') {
    return withTimeout(api.sendBlenderCommand('get_context', {}, token), 30000, 'Blender get_context');
  }
  const code = String(args.script || args.code || '');
  return withTimeout(api.sendBlenderCommand('script', { code }, token), 50000, 'Blender script');
}

async function handle(req: McpRequest): Promise<unknown> {
  if (req.kind === 'list') {
    return toGroqTools().map((t) => ({
      name: t.function.name,
      description: t.function.description || '',
      inputSchema: t.function.parameters || { type: 'object', properties: {} },
    }));
  }
  if (req.kind === 'lesson') return proposeLesson(req.lesson);

  // Blender tools go straight to the add-on socket. MossyTools' execute path
  // opens a Save dialog (saveToDownloads) and trusts a possibly stale
  // 'mossy_blender_active' flag, which hangs an unattended MCP call.
  if (req.name === 'execute_blender_script' || req.name === 'get_blender_scene_info') {
    return blenderDirect(req.name, req.args || {});
  }
  const isBlenderLinked = localStorage.getItem('mossy_blender_active') === 'true';
  return executeMossyTool(req.name, req.args || {}, {
    isBlenderLinked,
    setProfile: () => {},
    setProjectData: () => {},
    setProjectContext: () => {},
    setShowProjectPanel: () => {},
  });
}

const api = getApi();
if (api?.on && api?.invoke && !(window as any).__mossyMcpBridge) {
  (window as any).__mossyMcpBridge = true;
  api.on('mcp-bridge:request', async (req: McpRequest) => {
    const started = Date.now();
    try {
      const result = await handle(req);
      await api.invoke('mcp-bridge:response', { id: req.id, ok: true, result: jsonSafe(result) });
      log({ kind: req.kind, name: (req as any).name, ok: true, ms: Date.now() - started });
    } catch (e: any) {
      await api.invoke('mcp-bridge:response', { id: req.id, ok: false, error: String(e?.message || e) });
      log({ kind: req.kind, name: (req as any).name, ok: false, error: String(e?.message || e) });
    }
  });
  console.log('[mcp-bridge] renderer runner ready');
}
