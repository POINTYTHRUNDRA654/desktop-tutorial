/**
 * Mossy Persistent Whisper Server Manager
 * ========================================
 * Spawns whisper_server.py ONCE at app start, keeps it alive, and routes
 * transcription requests through stdin/stdout — eliminating the model-reload
 * overhead of the old spawn-per-call approach.
 *
 * Old path:  spawn process → load model (~2 s) → infer (~0.5 s) → exit   = ~2.5 s/clip
 * New path:  [model already loaded] → infer → result                       = ~0.15–0.8 s/clip
 *
 * The Python script is embedded as a string constant and written to userData
 * on first use, so it works regardless of asar packaging details.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app } from 'electron';

// ── Embedded Python script ────────────────────────────────────────────────────
// Kept here (not a separate .py file) so it survives the asar pack/deploy
// cycle without needing special unpack rules or manual file copying.
const WHISPER_SERVER_PY = `#!/usr/bin/env python3
"""
Mossy Persistent Whisper Server -- v2 (GPU-accelerated)
========================================================
Loads the faster-whisper model ONCE on startup, handles unlimited transcription
requests via stdin/stdout. No per-clip spawn or model-reload overhead.

Windows DLL note: pip-installed nvidia-cublas-cu12 / nvidia-cudnn-cu12 drop their
DLLs in site-packages/nvidia/<pkg>/bin/ which is NOT on Windows DLL search path.
We call os.add_dll_directory() for every nvidia bin dir before importing ctranslate2
so GPU mode works without needing the CUDA Toolkit installed system-wide.
"""

import sys
import os
import json
import traceback


def _fix_windows_dll_paths():
    """Add nvidia pip-package bin dirs to DLL search path (Windows only)."""
    if sys.platform != "win32":
        return
    try:
        import site
        dirs = site.getsitepackages() if hasattr(site, "getsitepackages") else []
        user_site = site.getusersitepackages() if hasattr(site, "getusersitepackages") else ""
        if user_site:
            dirs = list(dirs) + [user_site]
        for sp in dirs:
            nvidia_root = os.path.join(sp, "nvidia")
            if not os.path.isdir(nvidia_root):
                continue
            for pkg in os.listdir(nvidia_root):
                bin_dir = os.path.join(nvidia_root, pkg, "bin")
                if os.path.isdir(bin_dir):
                    try:
                        os.add_dll_directory(bin_dir)
                    except Exception:
                        pass
            # Also add ctranslate2 dir (contains OpenBLAS DLLs)
            ct2_dir = os.path.join(sp, "ctranslate2")
            if os.path.isdir(ct2_dir):
                try:
                    os.add_dll_directory(ct2_dir)
                except Exception:
                    pass
    except Exception:
        pass


def _detect_device():
    """Return ('cuda', 'float16') when CUDA GPU available, else ('cpu', 'int8')."""
    override = os.environ.get("MOSSY_WHISPER_DEVICE", "auto").strip().lower()
    if override == "cpu":
        return "cpu", "int8"
    if override == "cuda":
        return "cuda", "float16"

    # On Windows: nvidia-cublas-cu12 / nvidia-cudnn-cu12 pip packages do NOT
    # bundle DLLs on Windows (Linux only). CUDA Toolkit must be installed
    # system-wide. Probe for cublas64_12.dll before committing to GPU mode —
    # if it can't be loaded, fall through to CPU immediately.
    if sys.platform == "win32":
        import ctypes
        try:
            ctypes.WinDLL("cublas64_12.dll")
        except OSError:
            return "cpu", "int8"

    try:
        import ctranslate2
        if ctranslate2.get_cuda_device_count() > 0:
            return "cuda", "float16"
    except Exception:
        pass

    return "cpu", "int8"


def main() -> None:
    # Fix Windows DLL paths before any GPU-related imports
    _fix_windows_dll_paths()

    model_size = os.environ.get("MOSSY_WHISPER_MODEL", "base.en").strip()
    cache_dir  = os.environ.get("MOSSY_WHISPER_CACHE_DIR") or None
    lang       = os.environ.get("MOSSY_WHISPER_LANG", "en").strip() or None
    beam_size  = int(os.environ.get("MOSSY_WHISPER_BEAM", "1"))

    # -- Import faster-whisper ------------------------------------------------
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        _send({"type": "ready", "error": "faster_whisper_not_installed",
               "hint": "pip install faster-whisper nvidia-cublas-cu12 nvidia-cudnn-cu12"})
        return

    # -- Auto-detect device ---------------------------------------------------
    device, compute_type = _detect_device()

    # -- Load model -----------------------------------------------------------
    try:
        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            download_root=cache_dir,
            cpu_threads=0 if device == "cuda" else max(4, os.cpu_count() or 4),
            num_workers=1,
        )
    except Exception as e:
        if device == "cuda":
            # GPU load failed -- fall back to CPU automatically
            try:
                device, compute_type = "cpu", "int8"
                model = WhisperModel(
                    model_size,
                    device=device,
                    compute_type=compute_type,
                    download_root=cache_dir,
                    cpu_threads=max(4, os.cpu_count() or 4),
                    num_workers=1,
                )
            except Exception as e2:
                _send({"type": "ready", "error": "model_load_failed: " + str(e2)})
                return
        else:
            _send({"type": "ready", "error": "model_load_failed: " + str(e)})
            return

    # Signal ready
    _send({"type": "ready", "device": device, "compute": compute_type,
           "model": model_size, "beam": beam_size})

    # -- Request loop ---------------------------------------------------------
    for raw_line in sys.stdin:
        raw_line = raw_line.strip()
        if not raw_line:
            continue

        req_id = "0"
        try:
            req = json.loads(raw_line)
            req_id = str(req.get("id", "0"))
            audio_path = req.get("path", "")

            if not audio_path or not os.path.exists(audio_path):
                _send({"id": req_id, "success": False, "error": "file_not_found",
                       "message": "Audio file not found: " + audio_path})
                continue

            req_lang = req.get("language", lang)
            req_beam = int(req.get("beam", beam_size))

            segments, info = model.transcribe(
                audio_path,
                beam_size=req_beam,
                language=req_lang,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=300,
                    speech_pad_ms=200,
                ),
                condition_on_previous_text=False,
                without_timestamps=True,
                word_timestamps=False,
            )

            text = " ".join(seg.text.strip() for seg in segments).strip()

            _send({
                "id": req_id,
                "success": True,
                "text": text,
                "language": info.language,
                "language_probability": round(info.language_probability, 3),
                "device": device,
            })

        except json.JSONDecodeError as e:
            _send({"id": req_id, "success": False, "error": "invalid_json", "message": str(e)})
        except Exception as e:
            err_str = str(e)
            # GPU BLAS/cuDNN DLL missing at inference time — reload on CPU and retry.
            if device == "cuda" and any(k in err_str.lower() for k in ("cublas", "cudnn", "cuda", "dll")):
                try:
                    device = "cpu"
                    compute_type = "int8"
                    model = WhisperModel(
                        model_size, device="cpu", compute_type="int8",
                        download_root=cache_dir,
                        cpu_threads=max(4, os.cpu_count() or 4), num_workers=1,
                    )
                    segments, info = model.transcribe(
                        audio_path, beam_size=req_beam, language=req_lang,
                        vad_filter=True,
                        vad_parameters=dict(min_silence_duration_ms=300, speech_pad_ms=200),
                        condition_on_previous_text=False,
                        without_timestamps=True, word_timestamps=False,
                    )
                    text = " ".join(seg.text.strip() for seg in segments).strip()
                    _send({"id": req_id, "success": True, "text": text,
                           "language": info.language,
                           "language_probability": round(info.language_probability, 3),
                           "device": device})
                    continue
                except Exception as e2:
                    _send({"id": req_id, "success": False, "error": "transcribe_failed",
                           "message": str(e2), "traceback": traceback.format_exc()})
            else:
                _send({"id": req_id, "success": False, "error": "transcribe_failed",
                       "message": err_str, "traceback": traceback.format_exc()})


def _send(obj: dict) -> None:
    print(json.dumps(obj), flush=True)


if __name__ == "__main__":
    main()
`;

interface PendingRequest {
  resolve: (result: TranscribeResult) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
}

export interface TranscribeResult {
  success: boolean;
  text?: string;
  language?: string;
  language_probability?: number;
  device?: string;
  error?: string;
  message?: string;
}

interface ReadySignal {
  type: 'ready';
  device?: string;
  compute?: string;
  model?: string;
  beam?: number;
  error?: string;
  hint?: string;
}

const TRANSCRIBE_TIMEOUT_MS = 30_000;
const RESTART_DELAY_MS      = 3_000;
const MAX_RESTART_ATTEMPTS  = 5;

export class WhisperServerManager {
  private process: ChildProcess | null = null;
  private ready = false;
  private readyDevice = 'cpu';
  private readyCompute = 'int8';
  private pending = new Map<string, PendingRequest>();
  private nextId = 1;
  private restartAttempts = 0;
  private stopping = false;
  private lineBuffer = '';
  /** Set by runWhisperAutoInstall once faster-whisper is confirmed installed. */
  private configuredPythonPath: string | null = null;

  /** Called by runWhisperAutoInstall after faster-whisper is installed. */
  setPythonPath(pythonExe: string): void {
    this.configuredPythonPath = pythonExe;
    console.log(`[WhisperMgr] Python path configured: ${pythonExe}`);
    // Start the server now that we know Python is ready
    if (!this.ready && !this.process) {
      this.start().catch(e => console.warn('[WhisperMgr] Auto-start after setPythonPath failed:', e));
    }
  }

  /** Start (or restart) the whisper_server.py process. */
  async start(): Promise<{ device: string; compute: string }> {
    this.stopping = false;
    // Priority: env override → auto-install result → system 'python'
    const pythonPath = process.env.LOCAL_WHISPER_PYTHON || this.configuredPythonPath || 'python';
    const scriptPath = this._ensureScript();

    console.log(`[WhisperMgr] Starting server: ${pythonPath} ${scriptPath}`);

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      MOSSY_WHISPER_MODEL: process.env.MOSSY_WHISPER_MODEL || 'base.en',
      MOSSY_WHISPER_BEAM:  process.env.MOSSY_WHISPER_BEAM  || '1',
      MOSSY_WHISPER_LANG:  process.env.MOSSY_WHISPER_LANG  || 'en',
    };

    this.process = spawn(pythonPath, [scriptPath], {
      env,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.lineBuffer = '';
    this.process.stdout?.setEncoding('utf8');
    this.process.stderr?.setEncoding('utf8');

    this.process.stdout?.on('data', (chunk: string) => this._onData(chunk));
    this.process.stderr?.on('data', (chunk: string) => {
      console.warn('[WhisperMgr] stderr:', chunk.trim());
    });
    this.process.on('close', (code) => this._onClose(code));
    this.process.on('error', (err) => {
      console.error('[WhisperMgr] process error:', err);
      this._rejectAll(err);
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Whisper server startup timed out (60 s)'));
      }, 60_000);

      const onceReady = (signal: ReadySignal) => {
        clearTimeout(timer);
        if (signal.error) {
          reject(new Error(`Whisper server startup failed: ${signal.error}. ${signal.hint || ''}`));
          return;
        }
        this.ready = true;
        this.readyDevice  = signal.device  || 'cpu';
        this.readyCompute = signal.compute || 'int8';
        this.restartAttempts = 0;
        console.log(`[WhisperMgr] Ready — device=${this.readyDevice} compute=${this.readyCompute} model=${signal.model} beam=${signal.beam}`);
        resolve({ device: this.readyDevice, compute: this.readyCompute });
      };

      (this as any)._onReadyCallback = onceReady;
    });
  }

  /** Transcribe an audio ArrayBuffer. Writes temp file, sends to server, returns result. */
  async transcribe(arrayBuffer: ArrayBuffer, mimeType?: string): Promise<TranscribeResult> {
    const ext = (mimeType || '').includes('wav') ? '.wav' : (mimeType || '').includes('ogg') ? '.ogg' : '.webm';
    const tmpPath = path.join(os.tmpdir(), `mossy_wsp_${Date.now()}${ext}`);
    try {
      fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer));
    } catch (e: any) {
      return { success: false, error: 'tmp_write_failed', message: e.message };
    }

    try {
      return await this._sendRequest(tmpPath);
    } finally {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }

  get isReady(): boolean { return this.ready; }
  get device(): string   { return this.readyDevice; }

  stop(): void {
    this.stopping = true;
    this.ready = false;
    if (this.process) {
      try { this.process.kill(); } catch { /* ignore */ }
      this.process = null;
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Write the embedded Python script to userData (if not already there / outdated)
   * and return the on-disk path Python can actually read.
   */
  private _ensureScript(): string {
    const dest = path.join(app.getPath('userData'), 'whisper_server.py');
    try {
      fs.writeFileSync(dest, WHISPER_SERVER_PY, { encoding: 'utf8' });
      console.log(`[WhisperMgr] Script written to ${dest}`);
    } catch (e) {
      console.error('[WhisperMgr] Failed to write script:', e);
    }
    return dest;
  }

  private _onData(chunk: string): void {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split('\n');
    this.lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (obj.type === 'ready') {
          const cb = (this as any)._onReadyCallback as ((s: ReadySignal) => void) | undefined;
          if (cb) {
            (this as any)._onReadyCallback = undefined;
            cb(obj as ReadySignal);
          }
        } else if (obj.id !== undefined) {
          const req = this.pending.get(String(obj.id));
          if (req) {
            clearTimeout(req.timeout);
            this.pending.delete(String(obj.id));
            req.resolve(obj as TranscribeResult);
          }
        }
      } catch (e) {
        console.warn('[WhisperMgr] Failed to parse stdout line:', trimmed, e);
      }
    }
  }

  private async _sendRequest(audioPath: string): Promise<TranscribeResult> {
    if (!this.ready || !this.process?.stdin) {
      try {
        console.warn('[WhisperMgr] Not ready — attempting start...');
        await this.start();
      } catch (e: any) {
        return { success: false, error: 'server_not_ready', message: e.message };
      }
    }

    const id = String(this.nextId++);
    const request = JSON.stringify({ id, path: audioPath }) + '\n';

    return new Promise<TranscribeResult>((resolve) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        resolve({ success: false, error: 'timeout', message: `Transcription timed out after ${TRANSCRIBE_TIMEOUT_MS / 1000}s` });
      }, TRANSCRIBE_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject: (e) => resolve({ success: false, error: 'rejected', message: e.message }), timeout });

      try {
        this.process!.stdin!.write(request);
      } catch (e: any) {
        clearTimeout(timeout);
        this.pending.delete(id);
        resolve({ success: false, error: 'stdin_write_failed', message: e.message });
      }
    });
  }

  private _onClose(code: number | null): void {
    console.warn(`[WhisperMgr] Process exited (code=${code})`);
    this.ready = false;
    this._rejectAll(new Error(`Whisper server exited (code=${code})`));

    if (!this.stopping && this.restartAttempts < MAX_RESTART_ATTEMPTS) {
      this.restartAttempts++;
      console.log(`[WhisperMgr] Restarting in ${RESTART_DELAY_MS}ms (attempt ${this.restartAttempts}/${MAX_RESTART_ATTEMPTS})`);
      setTimeout(() => {
        if (!this.stopping) this.start().catch(e => console.error('[WhisperMgr] Restart failed:', e));
      }, RESTART_DELAY_MS);
    } else if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      console.error('[WhisperMgr] Max restart attempts reached — giving up');
    }
  }

  private _rejectAll(err: Error): void {
    for (const [, req] of this.pending.entries()) {
      clearTimeout(req.timeout);
      req.resolve({ success: false, error: 'server_crashed', message: err.message });
    }
    this.pending.clear();
  }
}

// Singleton — shared across all IPC handlers in main process
export const whisperServer = new WhisperServerManager();
