/**
 * Measures this PC for the onboarding "Your PC" step (see
 * src/shared/hardwareCapabilities.ts for what the numbers are used for).
 *
 * Why not wmic: wmic.exe is gone from current Windows 11 builds, and
 * Win32_VideoController.AdapterRAM is a 32-bit field that reports at most
 * 4 GB (an 8 GB RTX 2070 reads as 4095 MB). VRAM comes from nvidia-smi
 * for NVIDIA cards and from the display driver's registry key
 * (HardwareInformation.qwMemorySize, 64-bit) for everything else.
 *
 * Every field is measured or left null; nothing is guessed.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { GpuInfo, HardwareProfile } from '../shared/hardwareCapabilities';

function run(cmd: string, args: string[], timeoutMs = 8000): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    let out = '';
    let done = false;
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(cmd, args, { windowsHide: true });
    } catch {
      resolve({ code: null, out: '' });
      return;
    }
    const finish = (code: number | null) => { if (!done) { done = true; clearTimeout(timer); resolve({ code, out }); } };
    const timer = setTimeout(() => { try { child.kill(); } catch { /* already gone */ } finish(null); }, timeoutMs);
    child.stdout?.on('data', (d) => { out += d.toString(); });
    child.stderr?.on('data', (d) => { out += d.toString(); });
    child.on('error', () => finish(null));
    child.on('close', (code) => finish(code));
  });
}

async function firstLineVersion(cmd: string, args: string[]): Promise<string | null> {
  const r = await run(cmd, args);
  if (r.code !== 0) return null;
  const line = r.out.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  return line || null;
}

const vendorOf = (name: string): GpuInfo['vendor'] => {
  const n = name.toLowerCase();
  if (/nvidia|geforce|quadro|rtx|gtx/.test(n)) return 'nvidia';
  if (/amd|radeon/.test(n)) return 'amd';
  if (/intel/.test(n)) return 'intel';
  return 'other';
};

export async function detectGpus(): Promise<GpuInfo[]> {
  const gpus: GpuInfo[] = [];

  // NVIDIA: exact VRAM and driver from nvidia-smi.
  const smi = await run('nvidia-smi', ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader,nounits']);
  if (smi.code === 0) {
    for (const line of smi.out.split(/\r?\n/)) {
      const [name, mem, driver] = line.split(',').map((x) => x?.trim());
      if (!name) continue;
      const vram = Number.parseInt(mem, 10);
      gpus.push({ name, vendor: 'nvidia', vramMB: Number.isFinite(vram) ? vram : null, vramSource: Number.isFinite(vram) ? 'nvidia-smi' : null, driverVersion: driver || null });
    }
  }

  // Every adapter (AMD/Intel, or NVIDIA without nvidia-smi): name + 64-bit VRAM from the driver registry key.
  if (process.platform === 'win32') {
    const script = [
      "$k='HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}'",
      "Get-ChildItem $k -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match '^\\d{4}$' } | ForEach-Object {",
      "  $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue",
      "  if ($p.DriverDesc) { [pscustomobject]@{ name = [string]$p.DriverDesc; bytes = $p.'HardwareInformation.qwMemorySize'; driver = [string]$p.DriverVersion } }",
      "} | ConvertTo-Json -Compress",
    ].join('\n');
    const reg = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], 12000);
    // PowerShell exits 1 here even on success (a non-terminating error reading the class key's
    // 'Properties' subkey sets it), so trust the output when it parses rather than the exit code.
    const regOut = reg.out.trim();
    if (regOut.startsWith('[') || regOut.startsWith('{')) {
      try {
        const parsed = JSON.parse(regOut);
        const rows: { name: string; bytes: unknown; driver: string }[] = Array.isArray(parsed) ? parsed : [parsed];
        for (const r of rows) {
          const name = String(r.name || '').trim();
          if (!name || /basic display|basic render|remote display|virtual/i.test(name)) continue;
          const vendor = vendorOf(name);
          // nvidia-smi already gave exact numbers for NVIDIA cards.
          if (vendor === 'nvidia' && gpus.some((g) => g.vendor === 'nvidia' && g.vramSource === 'nvidia-smi')) continue;
          if (gpus.some((g) => g.name === name)) continue;
          const bytes = typeof r.bytes === 'number' ? r.bytes : Number.parseInt(String(r.bytes ?? ''), 10);
          const vramMB = Number.isFinite(bytes) && bytes > 0 ? Math.round(bytes / (1024 * 1024)) : null;
          gpus.push({ name, vendor, vramMB, vramSource: vramMB ? 'registry' : null, driverVersion: r.driver || null });
        }
      } catch { /* unparseable output -- keep what nvidia-smi gave */ }
    }
  }
  return gpus;
}

async function detectOllama(): Promise<HardwareProfile['prerequisites']['ollama']> {
  const base = 'http://127.0.0.1:11434';
  let running = false;
  let version: string | null = null;
  let models: string[] = [];
  try {
    const v = await fetch(`${base}/api/version`, { signal: AbortSignal.timeout(2500) });
    if (v.ok) { running = true; version = String(((await v.json()) as any)?.version || '') || null; }
  } catch { /* not running */ }
  if (running) {
    try {
      const t = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (t.ok) models = (((await t.json()) as any)?.models || []).map((m: any) => String(m?.name || '')).filter(Boolean);
    } catch { /* keep empty list */ }
  }
  let installed = running;
  if (!installed) {
    const candidates = [path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe'), 'C:\\Program Files\\Ollama\\ollama.exe'];
    installed = candidates.some((c) => { try { return fs.existsSync(c); } catch { return false; } });
    if (!installed) installed = (await run('where', ['ollama'])).code === 0;
  }
  return { installed, running, version, models };
}

function findPhotoCraft(settings: Record<string, unknown>): string | null {
  const configured = String(settings.photocraftPath || '').trim();
  const roots = [configured, path.join(process.env.LOCALAPPDATA || '', 'Programs', 'PhotoCraft'), 'C:\\Program Files\\PhotoCraft'].filter(Boolean);
  for (const r of roots) {
    try {
      if (r.toLowerCase().endsWith('.exe')) { if (fs.existsSync(r)) return r; continue; }
      if (!fs.existsSync(r)) continue;
      const direct = path.join(r, 'photocraft.exe');
      if (fs.existsSync(direct)) return direct;
      for (const e of fs.readdirSync(r, { withFileTypes: true })) {
        const nested = path.join(r, e.name, 'photocraft.exe');
        if (e.isDirectory() && fs.existsSync(nested)) return nested;
      }
    } catch { /* unreadable -- try next */ }
  }
  return null;
}

export async function getHardwareProfile(opts: { edition: 'nvidia' | 'universal'; settings: Record<string, unknown>; dataDir: string }): Promise<HardwareProfile> {
  const release = os.release();
  const build = Number.parseInt(release.split('.')[2] || '', 10);
  let freeDiskGB: number | null = null;
  try {
    const st = fs.statfsSync(opts.dataDir);
    freeDiskGB = Math.round(((st.bavail * st.bsize) / 1024 ** 3) * 10) / 10;
  } catch { /* leave null */ }

  // Same install record main.ts's brainb:scan reads (userData/brain-b/brainb-installed.json).
  let brainB: string | null = null;
  try {
    const record = JSON.parse(fs.readFileSync(path.join(opts.dataDir, 'brain-b', 'brainb-installed.json'), 'utf-8'));
    brainB = record?.version ? String(record.version) : null;
  } catch { /* not installed */ }

  const comfyPath = String(opts.settings.comfyuiPath || '').trim();
  const [gpus, ollama, python, git, dotnet, comfyRunning] = await Promise.all([
    detectGpus(),
    detectOllama(),
    firstLineVersion('python', ['--version']),
    firstLineVersion('git', ['--version']),
    firstLineVersion('dotnet', ['--version']),
    fetch('http://127.0.0.1:8188/system_stats', { signal: AbortSignal.timeout(2500) }).then((r) => r.ok).catch(() => false),
  ]);

  return {
    measuredAt: Date.now(),
    os: { release, build: Number.isFinite(build) ? build : null },
    cpu: { model: os.cpus()[0]?.model?.trim() || 'Unknown CPU', logicalCores: os.cpus().length },
    ramGB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    freeDiskGB,
    gpus,
    edition: opts.edition,
    prerequisites: {
      ollama,
      python,
      git,
      dotnet,
      comfyui: { running: comfyRunning, configuredPath: comfyPath && fs.existsSync(comfyPath) ? comfyPath : null },
      photocraft: findPhotoCraft(opts.settings),
      brainB,
    },
  };
}
