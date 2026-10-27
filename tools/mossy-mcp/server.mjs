#!/usr/bin/env node
/**
 * mossy-mcp -- a dependency-free MCP stdio server that lets Claude (Claude
 * Code or the Claude desktop app) or any MCP client use Mossy's real tools on
 * this machine. It talks to the running Mossy app through
 * src/electron/mcpBridge.ts, which listens on 127.0.0.1 and writes its port +
 * per-launch token to <Mossy's data folder>\mcp-bridge.json. The bridge is off
 * until turned on in Mossy: Settings > Claude / MCP bridge.
 *
 * stdout carries protocol messages only; all logging goes to stderr.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

const SERVER_INFO = { name: 'mossy', version: '0.1.0' };
const MAX_TEXT = 100_000;

const log = (...a) => process.stderr.write(`[mossy-mcp] ${a.join(' ')}\n`);

function discoveryCandidates() {
  if (process.env.MOSSY_MCP_DISCOVERY) return [process.env.MOSSY_MCP_DISCOVERY];
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  // Installed builds use their productName as the userData folder; dev runs use mossy-desktop.
  return ['Mossy NVIDIA', 'Mossy Universal', 'mossy-desktop', 'Mossy', 'mossy', 'Electron']
    .flatMap((d) => ['mcp-bridge.json', 'localdev-mcp.json'].map((f) => path.join(appData, d, f)))
    .concat([path.join(os.homedir(), '.mossy-desktop', 'mcp-bridge.json')]);
}

function readDiscovery() {
  let best = null;
  for (const file of discoveryCandidates()) {
    try {
      const stat = fs.statSync(file);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data?.port && data?.token && (!best || stat.mtimeMs > best.mtime)) best = { ...data, mtime: stat.mtimeMs, file };
    } catch { /* not there */ }
  }
  return best;
}

async function mossy(method, route, body) {
  const d = readDiscovery();
  if (!d) throw new Error("Mossy isn't reachable (no mcp-bridge.json found). Start Mossy, turn on Settings > Claude / MCP bridge, restart her, then retry.");
  let res;
  try {
    res = await fetch(`http://127.0.0.1:${d.port}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-mossy-mcp-token': d.token },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(200_000),
    });
  } catch (e) {
    throw new Error(`Couldn't reach Mossy on port ${d.port} (${e?.message || e}). She may have closed; restart her and retry.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Mossy returned HTTP ${res.status}`);
  return data;
}

const LOCAL_TOOLS = [
  {
    name: 'mossy_status',
    description: "Check whether Mossy is running and her window is open, so her tools can be called. Use this first if any Mossy tool fails to connect.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'propose_lesson',
    description:
      "Propose a lesson for Mossy's brain via Brain B's ChangeGate review queue. Only call this AFTER the fix or finding was verified through the real path " +
      '(real compiler, real scan, real in-app result) -- never from review alone. It does not become knowledge until approved in ChangeGate. ' +
      "'program' is the program or topic the lesson is about -- any of: blender, creation-kit, xedit, nifskope, textures, materials, " +
      "meshes, collision, previs, plugins, papyrus, archive2, mod-organizer, bodyslide, outfit-studio, gimp, comfyui (other short names are accepted too).",
    inputSchema: {
      type: 'object',
      properties: {
        program: { type: 'string', description: "Program or topic, e.g. 'textures', 'plugins', 'blender', 'creation-kit'." },
        observation: { type: 'string', description: 'What goes wrong / the pattern to recognise, in plain words.' },
        suggestedCorrection: { type: 'string', description: 'How to fix or avoid it.' },
        verification: { type: 'string', description: 'How this was proven (e.g. "compiled with PapyrusCompiler.exe, scan_plugin clean").' },
      },
      required: ['program', 'observation', 'verification'],
    },
  },
];

async function listTools() {
  try {
    const { tools } = await mossy('GET', '/tools');
    return [...LOCAL_TOOLS, ...(Array.isArray(tools) ? tools : [])];
  } catch (e) {
    log('tools/list: Mossy unreachable --', e.message);
    return LOCAL_TOOLS;
  }
}

function asText(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (text === undefined) text = 'null';
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT) + `\n...[truncated, ${text.length} chars total]`;
  return text;
}

async function callTool(name, args) {
  try {
    if (name === 'mossy_status') {
      const d = readDiscovery();
      if (!d) return { content: [{ type: 'text', text: "Mossy isn't running (no discovery file). Start her, then retry." }], isError: true };
      const h = await mossy('GET', '/health');
      return { content: [{ type: 'text', text: asText({ ...h, port: d.port, startedAt: d.startedAt, discoveryFile: d.file }) }] };
    }
    if (name === 'propose_lesson') {
      const { result } = await mossy('POST', '/lesson', args || {});
      return { content: [{ type: 'text', text: asText(result) }] };
    }
    const { result } = await mossy('POST', '/tool', { name, args: args || {} });
    const failed = result && typeof result === 'object' && (result.success === false || result.error);
    return { content: [{ type: 'text', text: asText(result) }], isError: !!failed };
  } catch (e) {
    return { content: [{ type: 'text', text: String(e?.message || e) }], isError: true };
  }
}

function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function replyError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

async function handle(msg) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;
  try {
    switch (method) {
      case 'initialize':
        return reply(id, {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions:
            "These are Mossy's real tools running on this PC (Fallout 4 modding). Mossy's app must be open. " +
            'Verify results through the real path before calling propose_lesson.',
        });
      case 'ping':
        return isRequest && reply(id, {});
      case 'tools/list':
        return reply(id, { tools: await listTools() });
      case 'tools/call':
        return reply(id, await callTool(params?.name, params?.arguments));
      default:
        if (method?.startsWith('notifications/')) return;
        if (isRequest) replyError(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    if (isRequest) replyError(id, -32603, String(e?.message || e));
  }
}

const inFlight = new Set();
const track = (p) => { inFlight.add(p); p.finally(() => inFlight.delete(p)); };

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return log('ignoring non-JSON line'); }
  for (const m of Array.isArray(msg) ? msg : [msg]) track(handle(m));
});
// Let in-flight tool calls finish and write their replies before exiting.
rl.on('close', () => { Promise.allSettled([...inFlight]).then(() => process.exit(0)); });
log('started');
