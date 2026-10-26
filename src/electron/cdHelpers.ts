/**
 * Creative Director AI helpers -- optional local services for the Vault-Tec
 * Creative Director panel (tools/creative-director-helpers, shipped with Mossy):
 *   creative_director.py  :8767  quest/dialogue/NPC/world drafts, lore search
 *   ai_helper.py          :8769  research peer (8766 is Brain B)
 *   virtual_mod_lab.py    :8768  experiment peer
 * All three listen on 127.0.0.1 only and use the local Ollama (or KoboldCpp);
 * lore search embeds through Ollama (nomic-embed-text), so nothing reaches the
 * internet except the one-time model pull the user opts into here.
 *
 * Install = copy the scripts to the folder the user chose, make a private
 * Python virtual environment there, pip install requirements.txt, and set the
 * chat model. Mossy starts/stops the services and stops them when it quits.
 */
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

export const CD_HELPER_SERVICES = [
  { script: 'ai_helper.py', port: 8769 }, // not 8766: that is Brain B's port
  { script: 'virtual_mod_lab.py', port: 8768 },
  { script: 'creative_director.py', port: 8767 },
] as const;

type Report = (p: { id: 'cd-helpers'; phase: string; message: string; received?: number; total?: number }) => void;

function run(cmd: string, args: string[], cwd?: string, timeoutMs = 20 * 60_000): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    let out = '';
    let done = false;
    const child = spawn(cmd, args, { cwd, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    const finish = (code: number | null) => { if (!done) { done = true; clearTimeout(t); resolve({ code, out }); } };
    const t = setTimeout(() => { try { child.kill(); } catch { /* gone */ } finish(null); }, timeoutMs);
    child.stdout?.on('data', (d) => { out += d.toString(); });
    child.stderr?.on('data', (d) => { out += d.toString(); });
    child.on('error', (e) => { out += e.message; finish(null); });
    child.on('close', (c) => finish(c));
  });
}

const venvPython = (dir: string) => path.join(dir, 'venv', 'Scripts', 'python.exe');

export function cdHelpersInstalled(dir: string | null | undefined): boolean {
  return !!dir && fs.existsSync(venvPython(dir)) && fs.existsSync(path.join(dir, 'creative_director.py'));
}

/** Finds a system Python >= 3.10 to build the virtual environment from. */
async function findBasePython(): Promise<string | null> {
  for (const [cmd, args] of [['python', []], ['py', ['-3']]] as [string, string[]][]) {
    const r = await run(cmd, [...args, '-c', 'import sys; print(sys.executable); print(sys.version_info[:2] >= (3, 10))'], undefined, 20_000);
    const [exe, ok] = r.out.trim().split(/\r?\n/);
    if (r.code === 0 && ok === 'True' && exe && fs.existsSync(exe)) return exe;
  }
  return null;
}

export async function installCdHelpers(opts: { targetDir: string; sourceDir: string; ollamaModel: string | null }, report: Report): Promise<{ message: string; dir: string }> {
  const dir = path.resolve(opts.targetDir);
  report({ id: 'cd-helpers', phase: 'resolve', message: 'Looking for Python 3.10 or newer' });
  const basePy = await findBasePython();
  if (!basePy) throw new Error('Python 3.10 or newer was not found. Install Python first (Your PC > Texture batch tools), then try again.');

  report({ id: 'cd-helpers', phase: 'install', message: `Copying the helpers into ${dir}` });
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(opts.sourceDir)) {
    const src = path.join(opts.sourceDir, f);
    if (!fs.statSync(src).isFile()) continue;
    // Keep the user's own settings on a reinstall; scripts are always refreshed.
    if (f === 'creative_director_config.json' && fs.existsSync(path.join(dir, f))) continue;
    fs.copyFileSync(src, path.join(dir, f));
  }

  report({ id: 'cd-helpers', phase: 'install', message: 'Creating a private Python environment' });
  if (!fs.existsSync(venvPython(dir))) {
    const v = await run(basePy, ['-m', 'venv', path.join(dir, 'venv')], dir, 5 * 60_000);
    if (v.code !== 0) throw new Error(`Could not create the Python environment: ${v.out.trim().split(/\r?\n/).slice(-2).join(' ')}`);
  }
  report({ id: 'cd-helpers', phase: 'install', message: 'Installing Python packages (FastAPI, ChromaDB, Ollama client...); about 400 MB' });
  const pip = await run(venvPython(dir), ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', path.join(dir, 'requirements.txt')], dir);
  if (pip.code !== 0) throw new Error(`Installing packages failed: ${pip.out.trim().split(/\r?\n/).slice(-3).join(' ')}`);

  const cfgPath = path.join(dir, 'creative_director_config.json');
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    if (!cfg.ollama_model && opts.ollamaModel) {
      cfg.ollama_model = opts.ollamaModel;
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
    }
  } catch { /* config unreadable -- the service falls back to its defaults */ }

  report({ id: 'cd-helpers', phase: 'configure', message: 'Downloading the lore-search model through Ollama (nomic-embed-text, about 270 MB)' });
  let embedNote = '';
  try {
    const r = await fetch('http://127.0.0.1:11434/api/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'nomic-embed-text', stream: false }), signal: AbortSignal.timeout(30 * 60_000) });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || j?.status !== 'success') embedNote = ' Lore search model not downloaded yet (Ollama said: ' + (j?.error || `HTTP ${r.status}`) + ').';
  } catch {
    embedNote = ' Ollama was not running, so the lore search model is not downloaded yet; start Ollama and run: ollama pull nomic-embed-text.';
  }
  return { message: `Creative Director AI helpers installed in ${dir}.${embedNote}`, dir };
}

const running: ChildProcess[] = [];

async function portAnswers(port: number): Promise<boolean> {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch { return false; }
}

export async function cdHelpersStatus(dir: string | null | undefined) {
  const ports = await Promise.all(CD_HELPER_SERVICES.map((s) => portAnswers(s.port)));
  return {
    installed: cdHelpersInstalled(dir),
    dir: dir || null,
    services: CD_HELPER_SERVICES.map((s, i) => ({ script: s.script, port: s.port, running: ports[i] })),
  };
}

export async function startCdHelpers(dir: string, logDir: string): Promise<{ success: boolean; error?: string; services?: { script: string; port: number; running: boolean }[] }> {
  if (!cdHelpersInstalled(dir)) return { success: false, error: 'The helpers are not installed. Install them from Settings > Your PC.' };
  fs.mkdirSync(logDir, { recursive: true });
  for (const s of CD_HELPER_SERVICES) {
    if (await portAnswers(s.port)) continue;
    const log = fs.openSync(path.join(logDir, s.script.replace('.py', '.log')), 'a');
    const child = spawn(venvPython(dir), ['-u', s.script], { cwd: dir, windowsHide: true, stdio: ['ignore', log, log], env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    running.push(child);
    child.on('exit', () => { const i = running.indexOf(child); if (i >= 0) running.splice(i, 1); });
  }
  // The main service loads ChromaDB and probes Ollama on start; give it time.
  const end = Date.now() + 60_000;
  let status = await cdHelpersStatus(dir);
  while (Date.now() < end && status.services.some((s) => !s.running)) {
    await new Promise((r) => setTimeout(r, 1500));
    status = await cdHelpersStatus(dir);
  }
  const down = status.services.filter((s) => !s.running).map((s) => s.script);
  return down.length
    ? { success: false, error: `Not answering after 60 s: ${down.join(', ')}. See the logs in ${logDir}.`, services: status.services }
    : { success: true, services: status.services };
}

export function stopCdHelpers(): number {
  let n = 0;
  for (const c of [...running]) { try { c.kill(); n++; } catch { /* already gone */ } }
  running.length = 0;
  return n;
}
