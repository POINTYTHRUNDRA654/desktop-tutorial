/**
 * Opt-in "download and set up for me" installs for the onboarding "Your PC" step.
 *
 * Only programs whose official download can be verified are offered here:
 *  - Ollama:     latest GitHub release of ollama/ollama, OllamaSetup.exe checked
 *                against the release's sha256sum.txt and its Authenticode signer
 *                (Ollama Inc.), then run as a per-user Inno Setup install into the
 *                folder the user picked. The model folder is a separate choice
 *                (OLLAMA_MODELS), because models are the multi-GB part.
 *  - Python:     newest 3.13.x on python.org whose 64-bit Windows installer has a
 *                published SHA-256, checked against it and its signer (Python
 *                Software Foundation), installed per-user into the chosen folder,
 *                then pip installs the Glowing Sea pipeline's requirements.
 *  - PhotoCraft: latest GitHub release of storytold/photocraft, portable zip
 *                checked against SHA256SUMS.txt, extracted into the chosen folder.
 *
 * Installers are downloaded next to the chosen folder, on the same drive (not C:\\ temp),
 * so a user short on C: space isn't blocked by the download itself, and deleted after.
 * A step only reports success after a real check (the program answers / the file
 * exists); any failure says what happened and what is left on disk.
 */
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type ComponentId = 'ollama' | 'python' | 'photocraft';
export type Progress = { id: ComponentId; phase: 'resolve' | 'download' | 'verify' | 'install' | 'configure' | 'done'; message: string; received?: number; total?: number };
type Report = (p: Progress) => void;

const LOCAL_PROGRAMS = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs');

export function defaultLocations(): Record<ComponentId, string> & { ollamaModels: string } {
  return {
    ollama: path.join(LOCAL_PROGRAMS, 'Ollama'),
    ollamaModels: process.env.OLLAMA_MODELS || path.join(os.homedir(), '.ollama', 'models'),
    python: path.join(LOCAL_PROGRAMS, 'Python', 'Python313'),
    photocraft: path.join(LOCAL_PROGRAMS, 'PhotoCraft'),
  };
}

/** Free space (GB) on the drive that would hold `dir` (walks up to the nearest existing folder). */
export function freeSpaceGB(dir: string): number | null {
  let probe = path.resolve(dir);
  while (!fs.existsSync(probe)) {
    const up = path.dirname(probe);
    if (up === probe) return null;
    probe = up;
  }
  try {
    const st = fs.statfsSync(probe);
    return Math.round(((st.bavail * st.bsize) / 1024 ** 3) * 10) / 10;
  } catch {
    return null;
  }
}

function run(cmd: string, args: string[], opts: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    let out = '';
    let done = false;
    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env || process.env, windowsHide: true });
    const finish = (code: number | null) => { if (!done) { done = true; clearTimeout(t); resolve({ code, out }); } };
    const t = setTimeout(() => { try { child.kill(); } catch { /* gone */ } finish(null); }, opts.timeoutMs ?? 30 * 60_000);
    child.stdout?.on('data', (d) => { out += d.toString(); });
    child.stderr?.on('data', (d) => { out += d.toString(); });
    child.on('error', (e) => { out += String(e.message); finish(null); });
    child.on('close', (c) => finish(c));
  });
}

async function githubLatest(repo: string): Promise<{ tag: string; assets: { name: string; url: string; size: number }[] }> {
  const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { 'User-Agent': 'Mossy-Setup', Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`GitHub answered HTTP ${r.status} for ${repo}'s latest release.`);
  const j: any = await r.json();
  return { tag: String(j.tag_name), assets: (j.assets || []).map((a: any) => ({ name: String(a.name), url: String(a.browser_download_url), size: Number(a.size) })) };
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mossy-Setup' }, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} downloading ${url}`);
  return r.text();
}

/** Temporary download folder beside the install folder, on the same drive. */
function downloadDirFor(targetDir: string): string {
  return path.join(path.dirname(path.resolve(targetDir)), '.mossy-download');
}

const TRUSTED_HOSTS = ['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com', 'www.python.org'];

/** Streams url to dest, hashing as it goes. Returns the SHA-256 (hex). */
async function download(id: ComponentId, url: string, dest: string, report: Report): Promise<string> {
  const host = new URL(url).hostname;
  if (!TRUSTED_HOSTS.includes(host)) throw new Error(`Refusing to download from an unexpected host: ${host}`);
  const controller = new AbortController();
  let idle = setTimeout(() => controller.abort(), 120_000);
  const r = await fetch(url, { headers: { 'User-Agent': 'Mossy-Setup' }, redirect: 'follow', signal: controller.signal });
  const finalHost = new URL(r.url).hostname;
  if (!TRUSTED_HOSTS.includes(finalHost)) throw new Error(`Download redirected to an unexpected host: ${finalHost}`);
  if (!r.ok || !r.body) throw new Error(`HTTP ${r.status} downloading ${path.basename(dest)}`);
  const total = Number(r.headers.get('content-length')) || undefined;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(dest);
  const reader = r.body.getReader();
  let received = 0;
  let lastReport = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      clearTimeout(idle);
      idle = setTimeout(() => controller.abort(), 120_000);
      hash.update(value);
      received += value.length;
      if (!out.write(Buffer.from(value))) await new Promise<void>((res) => out.once('drain', () => res()));
      if (Date.now() - lastReport > 400) {
        lastReport = Date.now();
        report({ id, phase: 'download', message: `Downloading ${path.basename(dest)}`, received, total });
      }
    }
  } catch (e: any) {
    out.destroy();
    try { fs.rmSync(dest, { force: true }); } catch { /* best effort */ }
    throw new Error(e?.name === 'AbortError' ? 'The download stalled (no data for 2 minutes). Check your connection and try again.' : String(e?.message || e));
  } finally {
    clearTimeout(idle);
  }
  await new Promise<void>((res, rej) => out.end((err?: Error | null) => (err ? rej(err) : res())));
  report({ id, phase: 'download', message: `Downloaded ${path.basename(dest)}`, received, total: total ?? received });
  return hash.digest('hex');
}

/** Windows Authenticode: valid signature whose signer subject contains `expected`. */
async function verifySigner(file: string, expected: string): Promise<void> {
  const ps = `$s = Get-AuthenticodeSignature -LiteralPath '${file.replace(/'/g, "''")}'; "$($s.Status)|$($s.SignerCertificate.Subject)"`;
  // Windows PowerShell 5.1 must not inherit a PowerShell 7 PSModulePath (Mossy started from a
  // pwsh window): it then fails to autoload Microsoft.PowerShell.Security. Without the variable
  // it rebuilds its own default module path.
  const env = { ...process.env };
  delete env.PSModulePath;
  const r = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeoutMs: 60_000, env });
  const [status, subject = ''] = r.out.trim().split('|');
  if (status !== 'Valid' || !subject.includes(expected)) {
    throw new Error(`Signature check failed for ${path.basename(file)} (status ${status || 'unknown'}, signer "${subject || 'none'}"); expected a valid signature from ${expected}. Nothing was installed.`);
  }
}

/** Re-reads PATH from the registry so programs installed just now are found without restarting Mossy. */
export async function refreshPathFromRegistry(): Promise<void> {
  const ps = "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')";
  const r = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeoutMs: 20_000 });
  const fresh = r.out.trim();
  if (r.code === 0 && fresh.length > 10) process.env.PATH = fresh;
}

async function setUserEnv(name: string, value: string): Promise<void> {
  const ps = `[Environment]::SetEnvironmentVariable('${name}', '${value.replace(/'/g, "''")}', 'User')`;
  const r = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeoutMs: 20_000 });
  if (r.code !== 0) throw new Error(`Could not set ${name}: ${r.out.trim()}`);
  process.env[name] = value;
}

async function waitFor(check: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

const ollamaUp = () => fetch('http://127.0.0.1:11434/api/version', { signal: AbortSignal.timeout(2000) }).then((r) => r.ok).catch(() => false);

/** Restarts the Ollama tray app so a new OLLAMA_MODELS takes effect. */
export async function restartOllama(installDir?: string): Promise<boolean> {
  await run('taskkill', ['/IM', 'ollama app.exe', '/F'], { timeoutMs: 15_000 });
  await run('taskkill', ['/IM', 'ollama.exe', '/F'], { timeoutMs: 15_000 });
  const app = [installDir && path.join(installDir, 'ollama app.exe'), path.join(LOCAL_PROGRAMS, 'Ollama', 'ollama app.exe')].find((p) => p && fs.existsSync(p));
  if (!app) return false;
  spawn(app, [], { detached: true, stdio: 'ignore', env: process.env }).unref();
  return waitFor(ollamaUp, 60_000);
}

/** Points Ollama's model storage at `dir` (user env OLLAMA_MODELS) and restarts it. Existing models stay where they were. */
export async function setOllamaModelsDir(dir: string): Promise<{ success: boolean; error?: string }> {
  try {
    fs.mkdirSync(dir, { recursive: true });
    await setUserEnv('OLLAMA_MODELS', dir);
    const up = await restartOllama();
    return up ? { success: true } : { success: false, error: 'Saved the model folder, but Ollama did not come back up within a minute. Start Ollama from the Start menu.' };
  } catch (e: any) {
    return { success: false, error: String(e?.message || e) };
  }
}

async function installOllama(targetDir: string, modelsDir: string | undefined, report: Report, verifyOnly = false): Promise<string> {
  report({ id: 'ollama', phase: 'resolve', message: 'Finding the latest Ollama release on GitHub' });
  const rel = await githubLatest('ollama/ollama');
  const setup = rel.assets.find((a) => a.name === 'OllamaSetup.exe');
  const sums = rel.assets.find((a) => a.name === 'sha256sum.txt');
  if (!setup || !sums) throw new Error(`Ollama ${rel.tag} has no OllamaSetup.exe/sha256sum.txt on GitHub.`);
  const expected = (await fetchText(sums.url)).split(/\r?\n/).find((l) => /OllamaSetup\.exe$/.test(l.trim()))?.trim().split(/\s+/)[0]?.toLowerCase();
  if (!expected) throw new Error('sha256sum.txt has no entry for OllamaSetup.exe.');

  const dlDir = downloadDirFor(targetDir);
  const file = path.join(dlDir, `OllamaSetup-${rel.tag}.exe`);
  const actual = await download('ollama', setup.url, file, report);
  report({ id: 'ollama', phase: 'verify', message: 'Checking the download (SHA-256 and Ollama Inc. signature)' });
  if (actual !== expected) { fs.rmSync(file, { force: true }); throw new Error('The download does not match Ollama\'s published SHA-256. It was deleted; nothing was installed.'); }
  await verifySigner(file, 'Ollama Inc.');
  if (verifyOnly) { fs.rmSync(file, { force: true }); return `Verified OllamaSetup.exe ${rel.tag} (SHA-256 ${actual}, signed by Ollama Inc.); not installed.`; }

  if (modelsDir) {
    report({ id: 'ollama', phase: 'configure', message: `Setting the model folder to ${modelsDir}` });
    fs.mkdirSync(modelsDir, { recursive: true });
    await setUserEnv('OLLAMA_MODELS', modelsDir);
  }
  report({ id: 'ollama', phase: 'install', message: `Installing Ollama ${rel.tag} into ${targetDir}` });
  const r = await run(file, ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', `/DIR=${targetDir}`], { timeoutMs: 20 * 60_000 });
  try { fs.rmSync(file, { force: true }); } catch { /* leave it */ }
  if (r.code !== 0) throw new Error(`The Ollama installer exited with code ${r.code}.`);
  await refreshPathFromRegistry();
  report({ id: 'ollama', phase: 'configure', message: 'Waiting for Ollama to start' });
  const up = (await waitFor(ollamaUp, 45_000)) || (await restartOllama(targetDir));
  if (!up) throw new Error(`Ollama installed into ${targetDir}, but it did not start. Open Ollama from the Start menu, then press Recheck.`);
  return `Ollama ${rel.tag} installed in ${targetDir} and running.`;
}

async function installPython(targetDir: string, report: Report, requirementsFile: string | null, verifyOnly = false): Promise<string> {
  report({ id: 'python', phase: 'resolve', message: 'Finding the newest Python 3.13 installer on python.org' });
  const rels: any[] = await (await fetch('https://www.python.org/api/v2/downloads/release/?is_published=true&pre_release=false', { signal: AbortSignal.timeout(30_000) })).json() as any[];
  const candidates = rels.filter((r) => /^Python 3\.13\.\d+$/.test(r.name)).sort((a, b) => String(b.release_date).localeCompare(String(a.release_date)));
  let pick: { name: string; url: string; sha256: string } | null = null;
  for (const c of candidates.slice(0, 6)) {
    const id = String(c.resource_uri).split('/').filter(Boolean).pop();
    const files: any[] = await (await fetch(`https://www.python.org/api/v2/downloads/release_file/?release=${id}`, { signal: AbortSignal.timeout(30_000) })).json() as any[];
    const w = files.find((f) => f.name === 'Windows installer (64-bit)' && f.sha256_sum);
    if (w) { pick = { name: c.name, url: String(w.url), sha256: String(w.sha256_sum).toLowerCase() }; break; }
  }
  if (!pick) throw new Error('python.org lists no recent Python 3.13 Windows installer with a published SHA-256.');

  const dlDir = downloadDirFor(targetDir);
  const file = path.join(dlDir, path.basename(new URL(pick.url).pathname));
  const actual = await download('python', pick.url, file, report);
  report({ id: 'python', phase: 'verify', message: 'Checking the download (SHA-256 and Python Software Foundation signature)' });
  if (actual !== pick.sha256) { fs.rmSync(file, { force: true }); throw new Error('The download does not match python.org\'s published SHA-256. It was deleted; nothing was installed.'); }
  await verifySigner(file, 'Python Software Foundation');
  if (verifyOnly) { fs.rmSync(file, { force: true }); return `Verified ${pick.name} installer (SHA-256 ${actual}, signed by the Python Software Foundation); not installed.`; }

  report({ id: 'python', phase: 'install', message: `Installing ${pick.name} into ${targetDir}` });
  const r = await run(file, ['/quiet', 'InstallAllUsers=0', 'PrependPath=1', 'Include_test=0', `TargetDir=${targetDir}`], { timeoutMs: 20 * 60_000 });
  try { fs.rmSync(file, { force: true }); } catch { /* leave it */ }
  const exe = path.join(targetDir, 'python.exe');
  if (r.code !== 0 || !fs.existsSync(exe)) throw new Error(`The Python installer exited with code ${r.code}${fs.existsSync(exe) ? '' : ' and python.exe is not in the chosen folder'}.`);
  await refreshPathFromRegistry();

  if (requirementsFile && fs.existsSync(requirementsFile)) {
    report({ id: 'python', phase: 'configure', message: 'Installing the texture tools\' Python packages (Pillow, numpy, requests)' });
    const pip = await run(exe, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', requirementsFile], { timeoutMs: 15 * 60_000 });
    if (pip.code !== 0) throw new Error(`${pick.name} installed in ${targetDir}, but installing packages failed: ${pip.out.trim().split(/\r?\n/).slice(-3).join(' ')}`);
  }
  const ver = await run(exe, ['--version'], { timeoutMs: 20_000 });
  return `${ver.out.trim() || pick.name} installed in ${targetDir}.`;
}

async function installPhotoCraft(targetDir: string, report: Report): Promise<{ message: string; exe: string }> {
  report({ id: 'photocraft', phase: 'resolve', message: 'Finding the latest PhotoCraft release on GitHub' });
  const rel = await githubLatest('storytold/photocraft');
  const zip = rel.assets.find((a) => /windows-x64-portable\.zip$/.test(a.name));
  const sums = rel.assets.find((a) => a.name === 'SHA256SUMS.txt');
  if (!zip || !sums) throw new Error(`PhotoCraft ${rel.tag} has no Windows portable zip/SHA256SUMS.txt.`);
  const expected = (await fetchText(sums.url)).split(/\r?\n/).find((l) => l.trim().endsWith(zip.name))?.trim().split(/\s+/)[0]?.toLowerCase();
  if (!expected) throw new Error(`SHA256SUMS.txt has no entry for ${zip.name}.`);

  const dlDir = downloadDirFor(targetDir);
  const file = path.join(dlDir, zip.name);
  const actual = await download('photocraft', zip.url, file, report);
  report({ id: 'photocraft', phase: 'verify', message: 'Checking the download (SHA-256)' });
  if (actual !== expected) { fs.rmSync(file, { force: true }); throw new Error('The download does not match PhotoCraft\'s published SHA-256. It was deleted; nothing was installed.'); }

  report({ id: 'photocraft', phase: 'install', message: `Unpacking into ${targetDir}` });
  const AdmZip = require('adm-zip');
  fs.mkdirSync(targetDir, { recursive: true });
  new AdmZip(file).extractAllTo(targetDir, true);
  try { fs.rmSync(file, { force: true }); } catch { /* leave it */ }
  const folder = zip.name.replace(/\.zip$/, '');
  const exe = [path.join(targetDir, folder, 'photocraft.exe'), path.join(targetDir, 'photocraft.exe')].find((p) => fs.existsSync(p));
  if (!exe) throw new Error(`Unpacked ${zip.name}, but photocraft.exe was not where expected in ${targetDir}.`);
  return { message: `PhotoCraft ${rel.tag} installed in ${path.dirname(exe)}.`, exe };
}

export async function installComponent(
  id: ComponentId,
  /** verifyOnly: download and check, then stop before installing (used by the automated test). */
  opts: { targetDir: string; modelsDir?: string; requirementsFile?: string | null; verifyOnly?: boolean },
  report: Report,
): Promise<{ success: boolean; message?: string; error?: string; exe?: string }> {
  try {
    const target = path.resolve(opts.targetDir);
    const free = freeSpaceGB(target);
    const needGB = id === 'ollama' ? 4 : id === 'python' ? 0.5 : 0.5;
    if (free !== null && free < needGB) throw new Error(`Only ${free} GB is free on that drive; this needs about ${needGB} GB. Pick a folder on another drive.`);
    if (id === 'ollama') {
      const message = await installOllama(target, opts.modelsDir, report, opts.verifyOnly);
      report({ id, phase: 'done', message });
      return { success: true, message };
    }
    if (id === 'python') {
      const message = await installPython(target, report, opts.requirementsFile ?? null, opts.verifyOnly);
      report({ id, phase: 'done', message });
      return { success: true, message };
    }
    const r = await installPhotoCraft(target, report);
    report({ id, phase: 'done', message: r.message });
    return { success: true, message: r.message, exe: r.exe };
  } catch (e: any) {
    return { success: false, error: String(e?.message || e) };
  }
}
