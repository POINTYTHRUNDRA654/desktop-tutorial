/**
 * pytorch-auto-install.ts
 *
 * Standalone module for PyTorch auto-download, installation, and registration
 * with Mossy. Extracted from main.ts so the logic can be unit-tested without
 * launching Electron.
 *
 * Exported functions:
 *   runPytorchAutoInstall  – top-level orchestrator (called on first launch)
 *   bootstrapEmbeddedPip   – prepares the Windows embedded Python for pip
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import https from 'https';
import { spawn } from 'child_process';

// ─── Public types ────────────────────────────────────────────────────────────

/** Minimal window surface needed to send IPC progress events. */
export interface ProgressWindow {
  isDestroyed(): boolean;
  webContents: { send(channel: string, data: unknown): void };
}

/** Injected I/O for settings persistence (keeps this module free of Electron). */
export interface SettingsIO {
  loadSettings(): Record<string, unknown>;
  saveSettings(s: Record<string, unknown>): void;
}

// ─── runCmd helper ───────────────────────────────────────────────────────────

const INSTALL_TIMEOUT_MS = 600_000; // 10 min

type CmdResult = { code: number; stdout: string; stderr: string };

/** Spawn a subprocess, capture its output, and resolve when it exits. */
export function runCmd(
  cmd: string,
  args: string[],
  extraEnv?: Record<string, string>,
): Promise<CmdResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: INSTALL_TIMEOUT_MS,
      windowsHide: true,
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
    });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    child.stdout?.on('data', (d: Buffer) => { stdoutChunks.push(d.toString()); });
    child.stderr?.on('data', (d: Buffer) => { stderrChunks.push(d.toString()); });
    child.on('close', (code: number | null) =>
      resolve({ code: code ?? -1, stdout: stdoutChunks.join(''), stderr: stderrChunks.join('') }),
    );
    child.on('error', (err: Error) => resolve({ code: -1, stdout: '', stderr: err.message }));
  });
}

// ─── bootstrapEmbeddedPip ────────────────────────────────────────────────────

/**
 * Prepares the Windows embedded Python at embeddedPythonExe to accept pip by:
 *  1. Enabling site-packages in the ._pth file (removes the `#import site` comment)
 *  2. Bootstrapping pip by running get-pip.py if not already present
 *
 * All dependencies (the runner and progress sink) are passed as parameters so
 * the function is straightforward to test in isolation.
 *
 * Returns true if pip is ready, false on failure.
 */
export async function bootstrapEmbeddedPip(
  embeddedPythonExe: string,
  sendProgress: (msg: string) => void,
  runner: (
    cmd: string,
    args: string[],
    env?: Record<string, string>,
  ) => Promise<CmdResult>,
): Promise<boolean> {
  try {
    const embeddedDir = path.dirname(embeddedPythonExe);

    // 1. Uncomment `import site` in the ._pth file so pip works
    const pthFiles = fs.readdirSync(embeddedDir).filter((f) => f.endsWith('._pth'));
    for (const pthFile of pthFiles) {
      const pthPath = path.join(embeddedDir, pthFile);
      let content = fs.readFileSync(pthPath, 'utf-8');
      if (content.includes('#import site')) {
        content = content.replace('#import site', 'import site');
        fs.writeFileSync(pthPath, content, 'utf-8');
        console.log(`[PyTorch Auto-Setup] Enabled site-packages in ${pthFile}`);
      }
    }

    // 2. Check if pip is already bootstrapped
    const pipCheck = await runner(embeddedPythonExe, ['-m', 'pip', '--version']);
    if (pipCheck.code === 0) return true;

    // 3. Bootstrap pip using get-pip.py
    sendProgress('Bootstrapping pip for bundled Python…');
    const getPipPath = path.join(os.tmpdir(), 'get-pip.py');

    if (!fs.existsSync(getPipPath)) {
      await new Promise<void>((resolve, reject) => {
        const GET_PIP_URL = 'https://bootstrap.pypa.io/get-pip.py';
        const req = https.get(GET_PIP_URL, { timeout: 30_000 }, (res) => {
          if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
          const out = fs.createWriteStream(getPipPath);
          res.pipe(out);
          out.on('finish', () => out.close(() => resolve()));
          out.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timed out')); });
      });
    }

    const result = await runner(embeddedPythonExe, [getPipPath]);
    if (result.code !== 0) {
      sendProgress(`⚠️ Could not bootstrap pip: ${result.stderr}`);
      return false;
    }

    const verify = await runner(embeddedPythonExe, ['-m', 'pip', '--version']);
    return verify.code === 0;
  } catch (err: any) {
    sendProgress(`⚠️ Pip bootstrap error: ${err?.message || String(err)}`);
    return false;
  }
}

// ─── runPytorchAutoInstall ───────────────────────────────────────────────────

/**
 * Background helper called on first launch when PyTorch is not yet configured.
 * Sends progress events to the renderer so the user can follow along without
 * any manual action.
 *
 * Priority order for finding a Python executable:
 *   1. System Python (already installed by the user)
 *   2. Bundled embedded Python (bundled with the installer at resources/python-embedded/)
 *
 * PyTorch (CPU build) is installed to:
 *   <userDataPath>/pytorch-packages/   (via pip install --target)
 *
 * The resulting path is saved to Mossy settings as pytorchPath.
 *
 * @param win          Renderer window used to send IPC progress messages (may be null).
 * @param userDataPath Path returned by app.getPath('userData') in the caller.
 * @param io           loadSettings / saveSettings implementations from main.ts.
 */
export async function runPytorchAutoInstall(
  win: ProgressWindow | null,
  userDataPath: string,
  io: SettingsIO,
): Promise<void> {
  const sendProgress = (msg: string) => {
    console.log('[PyTorch Auto-Setup]', msg);
    if (win && !win.isDestroyed()) {
      win.webContents.send('pytorch-setup-progress', { message: msg });
    }
  };

  // Local runner that uses the module-level runCmd (mockable in tests via vi.mock)
  const runner = (cmd: string, args: string[], extraEnv?: Record<string, string>) =>
    runCmd(cmd, args, extraEnv);

  try {
    const torchPackagesDir = path.join(userDataPath, 'pytorch-packages');

    // ── 1. Find Python ────────────────────────────────────────────────────────
    const systemCandidates = process.platform === 'win32'
      ? ['python', 'python3', 'py']
      : ['python3', 'python'];

    let pythonExe = '';

    for (const candidate of systemCandidates) {
      const r = await runner(candidate, ['--version']);
      if (r.code === 0) { pythonExe = candidate; break; }
    }

    // Fall back to bundled embedded Python (Windows only)
    if (!pythonExe && process.platform === 'win32') {
      const bundledPython = path.join(process.resourcesPath, 'python-embedded', 'python.exe');
      if (fs.existsSync(bundledPython)) {
        sendProgress('System Python not found. Using bundled Python…');
        const pipBootstrapped = await bootstrapEmbeddedPip(bundledPython, sendProgress, runner);
        if (pipBootstrapped) {
          pythonExe = bundledPython;
        }
      }
    }

    if (!pythonExe) {
      sendProgress('⚠️ Python not found. Visit https://www.python.org/downloads/ to install Python 3.8+, then restart Mossy.');
      return;
    }

    // ── 2. Check if torch is already importable ───────────────────────────────
    const alreadyInstalled = await runner(pythonExe, ['-c', 'import torch; print(torch.__version__)']);
    if (alreadyInstalled.code === 0 && alreadyInstalled.stdout.trim()) {
      const version = alreadyInstalled.stdout.trim();
      const spResult = await runner(pythonExe, [
        '-c', 'import torch, os; print(os.path.dirname(os.path.dirname(torch.__file__)))',
      ]);
      const sitePkgs = spResult.code === 0 ? spResult.stdout.trim() : '';
      if (sitePkgs) {
        const s = io.loadSettings();
        io.saveSettings({ ...s, pytorchPath: sitePkgs });
        sendProgress(`✅ PyTorch ${version} detected and configured automatically.`);
        return;
      }
    }

    // ── 3. Install torch (CPU) with --target ──────────────────────────────────
    sendProgress('📦 Setting up PyTorch AI features… (downloading ~200 MB, please wait)');
    fs.mkdirSync(torchPackagesDir, { recursive: true });

    const pipBaseArgs = ['-m', 'pip', 'install', 'torch', 'torchvision',
      '--target', torchPackagesDir,
      '--index-url', 'https://download.pytorch.org/whl/cpu',
      '--timeout', '300', '--no-cache-dir'];

    const pipResult = await runner(pythonExe, pipBaseArgs);

    if (pipResult.code !== 0) {
      sendProgress('Retrying without torchvision…');
      const retry = await runner(pythonExe, ['-m', 'pip', 'install', 'torch',
        '--target', torchPackagesDir,
        '--index-url', 'https://download.pytorch.org/whl/cpu',
        '--timeout', '300', '--no-cache-dir']);
      if (retry.code !== 0) {
        sendProgress(`❌ PyTorch installation failed. Open Settings → External Tools to try manually.\n${pipResult.stderr || pipResult.stdout}`);
        return;
      }
    }

    // ── 4. Verify and save path ───────────────────────────────────────────────
    const verifyResult = await runner(pythonExe, [
      '-c',
      'import sys, os; sys.path.insert(0, os.environ["MOSSY_TORCH_PATH"]); import torch; print(torch.__version__)',
    ], { MOSSY_TORCH_PATH: torchPackagesDir });

    if (verifyResult.code !== 0) {
      sendProgress('❌ PyTorch installed but cannot be imported. Open Settings → External Tools to configure manually.');
      return;
    }

    const torchVersion = verifyResult.stdout.trim();
    const s = io.loadSettings();
    io.saveSettings({ ...s, pytorchPath: torchPackagesDir });
    sendProgress(`✅ PyTorch ${torchVersion} set up automatically. AI features are ready!`);

  } catch (err: any) {
    sendProgress(`❌ Auto-setup error: ${err?.message || String(err)}`);
  }
}
