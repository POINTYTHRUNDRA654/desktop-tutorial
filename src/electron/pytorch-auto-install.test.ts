// @vitest-environment node
/**
 * pytorch-auto-install.test.ts
 *
 * Virtual test suite for the PyTorch automatic download, installation, and
 * registration flow.
 *
 * Covers:
 *  1. PyTorch already installed → detected and pytorchPath registered in Mossy settings
 *  2. PyTorch not installed → pip installs it, verifies import, registers pytorchPath
 *  3. pip install fails with torchvision → retries without it, succeeds
 *  4. pip install fails even without torchvision → reports failure, no settings write
 *  5. No Python found on the system → reports Python-not-found message
 *  6. Registered pytorchPath is visible in Mossy's get-mossy-capabilities payload
 *     (pytorch.available === true) — simulates what the Blender add-on reads
 *  7. bootstrapEmbeddedPip: pip already present → returns true without downloading
 *  8. bootstrapEmbeddedPip: pip absent, get-pip.py bootstraps successfully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import path from 'path';

// ── Module mocks ─────────────────────────────────────────────────────────────
// Must be hoisted before the module under test is imported.

vi.mock('child_process', () => ({ spawn: vi.fn() }));
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(() => [] as string[]),
      readFileSync: vi.fn(() => ''),
      writeFileSync: vi.fn(),
      createWriteStream: vi.fn(),
    },
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(() => [] as string[]),
    readFileSync: vi.fn(() => ''),
    writeFileSync: vi.fn(),
    createWriteStream: vi.fn(),
  };
});

// ── Import module under test after mocks are declared ────────────────────────
import { runPytorchAutoInstall, bootstrapEmbeddedPip } from './pytorch-auto-install';
import { spawn } from 'child_process';
import fs from 'fs';

// ── Helper types / factories ──────────────────────────────────────────────────

/** Simulates a ChildProcess that exits immediately with the given outcome. */
function makeProcess(code: number, stdout: string, stderr = '') {
  const proc = new EventEmitter() as any;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setImmediate(() => {
    if (stdout) proc.stdout.emit('data', Buffer.from(stdout));
    if (stderr) proc.stderr.emit('data', Buffer.from(stderr));
    proc.emit('close', code);
  });
  return proc;
}

/** Minimal ProgressWindow stub. */
function makeWindow() {
  const messages: string[] = [];
  const win = {
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn((_channel: string, data: { message: string }) => {
        messages.push(data.message);
      }),
    },
    messages,
  };
  return win;
}

/** Settings store stub. */
function makeSettingsIO(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  return {
    loadSettings: vi.fn(() => ({ ...store })),
    saveSettings: vi.fn((s: Record<string, unknown>) => { Object.assign(store, s); }),
    store,
  };
}

const USER_DATA = '/home/user/.config/mossy-desktop';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runPytorchAutoInstall', () => {
  const spawnMock = vi.mocked(spawn);
  const existsSyncMock = vi.mocked(fs.existsSync);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: bundled Python does not exist
    existsSyncMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Test 1: PyTorch already installed ──────────────────────────────────────

  it('detects pre-installed PyTorch and registers pytorchPath without installing', async () => {
    const io = makeSettingsIO();
    const win = makeWindow();

    // python --version → success
    // import torch; print(torch.__version__) → 2.1.0
    // import torch, os; print(os.path.dirname(...)) → /usr/local/lib/python3.11/site-packages
    const SITE_PKGS = '/usr/local/lib/python3.11/site-packages';
    spawnMock
      .mockReturnValueOnce(makeProcess(0, 'Python 3.11.0\n'))          // python --version
      .mockReturnValueOnce(makeProcess(0, '2.1.0\n'))                   // import torch
      .mockReturnValueOnce(makeProcess(0, `${SITE_PKGS}\n`));           // find site-packages

    await runPytorchAutoInstall(win, USER_DATA, io);

    // pytorchPath should be saved
    expect(io.saveSettings).toHaveBeenCalledOnce();
    expect(io.store.pytorchPath).toBe(SITE_PKGS);

    // Progress message should confirm detection
    expect(win.messages.some((m) => m.includes('✅') && m.includes('detected'))).toBe(true);

    // pip install must NOT have been invoked
    const pipCalls = spawnMock.mock.calls.filter(([, args]) =>
      (args as string[]).includes('install'),
    );
    expect(pipCalls).toHaveLength(0);
  });

  // ── Test 2: PyTorch not installed → install succeeds ──────────────────────

  it('installs PyTorch via pip, verifies import, and registers pytorchPath', async () => {
    const io = makeSettingsIO();
    const win = makeWindow();
    const TORCH_DIR = `${USER_DATA}/pytorch-packages`;

    spawnMock
      .mockReturnValueOnce(makeProcess(0, 'Python 3.11.0\n'))           // python --version
      .mockReturnValueOnce(makeProcess(1, '', 'No module named torch'))  // import torch → not found
      .mockReturnValueOnce(makeProcess(0, 'Successfully installed…\n')) // pip install with torchvision
      .mockReturnValueOnce(makeProcess(0, '2.1.0\n'));                   // verify import

    await runPytorchAutoInstall(win, USER_DATA, io);

    // pytorchPath should point to the pytorch-packages directory
    expect(io.saveSettings).toHaveBeenCalledOnce();
    expect(io.store.pytorchPath).toBe(TORCH_DIR);

    // Should have sent a "set up automatically" success message
    expect(win.messages.some((m) => m.includes('✅') && m.includes('set up automatically'))).toBe(true);

    // pip install was called
    const pipCalls = spawnMock.mock.calls.filter(([, args]) =>
      (args as string[]).includes('install'),
    );
    expect(pipCalls.length).toBeGreaterThanOrEqual(1);
  });

  // ── Test 3: pip fails with torchvision → retry without it → success ────────

  it('retries pip install without torchvision when the first attempt fails', async () => {
    const io = makeSettingsIO();
    const win = makeWindow();

    spawnMock
      .mockReturnValueOnce(makeProcess(0, 'Python 3.11.0\n'))           // python --version
      .mockReturnValueOnce(makeProcess(1, '', 'No module named torch'))  // import torch → not found
      .mockReturnValueOnce(makeProcess(1, '', 'pip error torchvision'))  // pip with torchvision → fails
      .mockReturnValueOnce(makeProcess(0, 'Successfully installed…\n')) // pip without torchvision → ok
      .mockReturnValueOnce(makeProcess(0, '2.1.0\n'));                   // verify import

    await runPytorchAutoInstall(win, USER_DATA, io);

    // Still registers successfully
    expect(io.saveSettings).toHaveBeenCalledOnce();
    expect(win.messages.some((m) => m.includes('✅'))).toBe(true);

    // Retry message must appear
    expect(win.messages.some((m) => m.includes('Retrying'))).toBe(true);
  });

  // ── Test 4: pip install fails even without torchvision → error reported ────

  it('reports install failure and does NOT write pytorchPath when pip always fails', async () => {
    const io = makeSettingsIO();
    const win = makeWindow();

    spawnMock
      .mockReturnValueOnce(makeProcess(0, 'Python 3.11.0\n'))           // python --version
      .mockReturnValueOnce(makeProcess(1, '', 'No module named torch'))  // import torch → not found
      .mockReturnValueOnce(makeProcess(1, '', 'Connection refused'))     // pip with torchvision → fails
      .mockReturnValueOnce(makeProcess(1, '', 'Connection refused'));    // pip retry → also fails

    await runPytorchAutoInstall(win, USER_DATA, io);

    expect(io.saveSettings).not.toHaveBeenCalled();
    expect(win.messages.some((m) => m.includes('❌') && m.includes('installation failed'))).toBe(true);
  });

  // ── Test 5: No Python found → user-friendly message ───────────────────────

  it('reports Python not found when no Python executable is available', async () => {
    const io = makeSettingsIO();
    const win = makeWindow();

    // Use mockImplementation so a fresh process is returned for every spawn call
    spawnMock.mockImplementation(() => makeProcess(1, '', 'command not found'));

    // Also no bundled python (existsSync already returns false by default)
    await runPytorchAutoInstall(win, USER_DATA, io);

    expect(io.saveSettings).not.toHaveBeenCalled();
    expect(win.messages.some((m) => m.includes('Python not found'))).toBe(true);
  });

  // ── Test 6: Import verification fails after install ────────────────────────

  it('reports import failure when torch cannot be loaded after installation', async () => {
    const io = makeSettingsIO();
    const win = makeWindow();

    spawnMock
      .mockReturnValueOnce(makeProcess(0, 'Python 3.11.0\n'))           // python --version
      .mockReturnValueOnce(makeProcess(1, '', 'No module named torch'))  // import torch → not found
      .mockReturnValueOnce(makeProcess(0, 'Successfully installed…\n')) // pip install → ok
      .mockReturnValueOnce(makeProcess(1, '', 'import error'));          // verify import → fails

    await runPytorchAutoInstall(win, USER_DATA, io);

    expect(io.saveSettings).not.toHaveBeenCalled();
    expect(win.messages.some((m) => m.includes('❌') && m.includes('cannot be imported'))).toBe(true);
  });
});

// ── Mossy capabilities / Blender registration tests ──────────────────────────

describe('Mossy capabilities reflect PyTorch registration (Blender integration)', () => {
  /**
   * Simulate the logic from the get-mossy-capabilities IPC handler:
   *
   *   pytorch: {
   *     available: Boolean(s?.pytorchPath && fs.existsSync(s.pytorchPath)),
   *     path: s?.pytorchPath || null,
   *   }
   *
   * This is what the Blender add-on reads when it calls get-mossy-capabilities.
   */
  function getMossyCapabilities(settings: Record<string, unknown>) {
    const pytorchPath = settings.pytorchPath as string | undefined;
    return {
      pytorch: {
        available: Boolean(pytorchPath && fs.existsSync(pytorchPath)),
        path: pytorchPath ?? null,
        models: ['upscaling', 'super-resolution', 'style-transfer', 'pose-estimation'],
      },
    };
  }

  /** Simulate blender-pytorch-inference path guard. */
  function blenderPytorchInference(settings: Record<string, unknown>) {
    const pytorchPath = settings.pytorchPath as string | undefined;
    if (!pytorchPath || !fs.existsSync(pytorchPath)) {
      return { success: false, error: 'PyTorch is not configured or not found.' };
    }
    return { success: true, message: 'PyTorch inference ready' };
  }

  const existsSyncMock = vi.mocked(fs.existsSync);

  beforeEach(() => vi.clearAllMocks());

  it('capabilities show pytorch.available=true after successful auto-install', async () => {
    const TORCH_DIR = `${USER_DATA}/pytorch-packages`;
    const spawnMock = vi.mocked(spawn);

    spawnMock
      .mockReturnValueOnce(makeProcess(0, 'Python 3.11.0\n'))
      .mockReturnValueOnce(makeProcess(1, '', 'No module named torch'))
      .mockReturnValueOnce(makeProcess(0, 'Successfully installed…\n'))
      .mockReturnValueOnce(makeProcess(0, '2.1.0\n'));

    existsSyncMock.mockReturnValue(false);

    const io = makeSettingsIO();
    await runPytorchAutoInstall(null, USER_DATA, io);

    // Simulate existsSync returning true for the newly installed directory
    existsSyncMock.mockImplementation((p) => p === TORCH_DIR);

    const caps = getMossyCapabilities(io.store);
    expect(caps.pytorch.available).toBe(true);
    expect(caps.pytorch.path).toBe(TORCH_DIR);
    expect(caps.pytorch.models).toContain('upscaling');
  });

  it('capabilities show pytorch.available=false when PyTorch was never installed', () => {
    existsSyncMock.mockReturnValue(false);
    const caps = getMossyCapabilities({});
    expect(caps.pytorch.available).toBe(false);
    expect(caps.pytorch.path).toBeNull();
  });

  it('blender-pytorch-inference succeeds when pytorchPath is registered', () => {
    const TORCH_DIR = `${USER_DATA}/pytorch-packages`;
    existsSyncMock.mockImplementation((p) => p === TORCH_DIR);

    const result = blenderPytorchInference({ pytorchPath: TORCH_DIR });
    expect(result.success).toBe(true);
  });

  it('blender-pytorch-inference fails gracefully when PyTorch is not registered', () => {
    existsSyncMock.mockReturnValue(false);
    const result = blenderPytorchInference({});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/PyTorch is not configured/);
  });
});

// ── bootstrapEmbeddedPip tests ────────────────────────────────────────────────

describe('bootstrapEmbeddedPip', () => {
  const existsSyncMock = vi.mocked(fs.existsSync);
  const readdirSyncMock = vi.mocked(fs.readdirSync);

  beforeEach(() => vi.clearAllMocks());

  it('returns true immediately when pip is already available', async () => {
    readdirSyncMock.mockReturnValue([] as any); // no ._pth files
    const runner = vi.fn().mockResolvedValue({ code: 0, stdout: 'pip 23.0', stderr: '' });

    const result = await bootstrapEmbeddedPip('/python-embedded/python.exe', vi.fn(), runner);
    expect(result).toBe(true);
    expect(runner).toHaveBeenCalledOnce(); // only the pip --version check
  });

  it('bootstraps pip via get-pip.py when pip is absent', async () => {
    readdirSyncMock.mockReturnValue([] as any);
    existsSyncMock.mockReturnValue(true); // get-pip.py already in tmpdir → skip download

    const runner = vi.fn()
      .mockResolvedValueOnce({ code: 1, stdout: '', stderr: 'no pip' })   // pip --version → absent
      .mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' })          // run get-pip.py
      .mockResolvedValueOnce({ code: 0, stdout: 'pip 23.0', stderr: '' }); // verify

    const result = await bootstrapEmbeddedPip('/python-embedded/python.exe', vi.fn(), runner);
    expect(result).toBe(true);
    expect(runner).toHaveBeenCalledTimes(3);
  });

  it('returns false when get-pip.py bootstrap fails', async () => {
    readdirSyncMock.mockReturnValue([] as any);
    existsSyncMock.mockReturnValue(true); // get-pip.py exists

    const runner = vi.fn()
      .mockResolvedValueOnce({ code: 1, stdout: '', stderr: 'no pip' })    // pip --version → absent
      .mockResolvedValueOnce({ code: 1, stdout: '', stderr: 'error' });    // run get-pip.py → fails

    const sendProgress = vi.fn();
    const result = await bootstrapEmbeddedPip('/python-embedded/python.exe', sendProgress, runner);
    expect(result).toBe(false);
    expect(sendProgress).toHaveBeenCalledWith(expect.stringContaining('Could not bootstrap pip'));
  });

  it('patches ._pth file to enable site-packages before checking pip', async () => {
    const pthContent = '# Python path config\n#import site\n';
    readdirSyncMock.mockReturnValue(['python311._pth'] as any);
    vi.mocked(fs.readFileSync).mockReturnValue(pthContent as any);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    const runner = vi.fn().mockResolvedValue({ code: 0, stdout: 'pip 23.0', stderr: '' });

    await bootstrapEmbeddedPip('/python-embedded/python.exe', vi.fn(), runner);

    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    expect(callArgs).toBeDefined();
    const [writePath, writeContent] = callArgs as [string, string, string];
    expect(writePath).toContain('python311._pth');
    expect(writeContent).toContain('import site');
    expect(writeContent).not.toContain('#import site');
  });
});
