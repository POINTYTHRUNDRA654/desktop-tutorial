/**
 * Mossy Persistent Background-Removal (RMBG-2.0) Server Manager
 * ===============================================================
 * Spawns rmbg_server.py ONCE, keeps it alive, and routes background-removal
 * requests through stdin/stdout — mirrors whisperServerManager.ts's pattern
 * exactly (model-reload overhead paid once, not per image).
 *
 * RMBG-2.0 (BRIA AI) is licensed CC BY-NC 4.0 — non-commercial use only. This
 * is only wired into MOSSY.SPACE because MOSSY.SPACE itself is and will
 * remain free/non-commercial; see feedback_rmbg_license_constraint memory.
 * The model is also GATED on HuggingFace: the user must personally log in,
 * accept BRIA's license on the model page, and provide their own access
 * token (settings.huggingFaceToken) — this script cannot and does not try
 * to bypass that consent step.
 *
 * The Python script is embedded as a string constant and written to userData
 * on first use, so it works regardless of asar packaging details.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// ── Embedded Python script ────────────────────────────────────────────────────
const RMBG_SERVER_PY = `#!/usr/bin/env python3
"""
Mossy Persistent RMBG-2.0 Server
=================================
Loads BRIA AI's RMBG-2.0 background-removal model ONCE on startup, handles
unlimited requests via stdin/stdout. CC BY-NC 4.0 — non-commercial use only.
"""

import sys
import os
import json
import traceback


def _send(obj: dict) -> None:
    print(json.dumps(obj), flush=True)


def main() -> None:
    hf_token = os.environ.get("MOSSY_HF_TOKEN", "").strip()
    if hf_token:
        os.environ["HF_TOKEN"] = hf_token
        os.environ["HUGGINGFACE_HUB_TOKEN"] = hf_token

    try:
        import torch
        from PIL import Image
        from torchvision import transforms
        from transformers import AutoModelForImageSegmentation
    except ImportError as e:
        _send({"type": "ready", "error": "dependencies_not_installed",
               "hint": "pip install torch torchvision transformers pillow kornia. Missing: " + str(e)})
        return

    device = "cuda" if torch.cuda.is_available() else "cpu"

    try:
        model = AutoModelForImageSegmentation.from_pretrained(
            "briaai/RMBG-2.0", trust_remote_code=True
        )
        torch.set_float32_matmul_precision("high")
        model.to(device)
        model.eval()
    except Exception as e:
        err_str = str(e)
        if "401" in err_str or "gated" in err_str.lower() or "access" in err_str.lower():
            _send({"type": "ready", "error": "gated_access_denied",
                   "hint": "Log into huggingface.co, accept BRIA's license at "
                           "huggingface.co/briaai/RMBG-2.0, then generate an access "
                           "token and paste it into the Background Remover tab."})
        else:
            _send({"type": "ready", "error": "model_load_failed: " + err_str})
        return

    image_size = (1024, 1024)
    transform_image = transforms.Compose([
        transforms.Resize(image_size),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [1.0, 1.0, 1.0]),
    ])

    _send({"type": "ready", "device": device})

    for raw_line in sys.stdin:
        raw_line = raw_line.strip()
        if not raw_line:
            continue

        req_id = "0"
        try:
            req = json.loads(raw_line)
            req_id = str(req.get("id", "0"))
            image_path = req.get("imagePath", "")
            output_path = req.get("outputPath", "")

            if not image_path or not os.path.exists(image_path):
                _send({"id": req_id, "success": False, "error": "file_not_found",
                       "message": "Image file not found: " + image_path})
                continue

            image = Image.open(image_path).convert("RGB")
            input_tensor = transform_image(image).unsqueeze(0).to(device)

            with torch.no_grad():
                preds = model(input_tensor)[-1].sigmoid().cpu()
            pred = preds[0].squeeze()
            mask = transforms.ToPILImage()(pred).resize(image.size)

            result_image = image.copy()
            result_image.putalpha(mask)
            result_image.save(output_path)

            _send({"id": req_id, "success": True, "outputPath": output_path, "device": device})

        except json.JSONDecodeError as e:
            _send({"id": req_id, "success": False, "error": "invalid_json", "message": str(e)})
        except Exception as e:
            _send({"id": req_id, "success": False, "error": "inference_failed",
                   "message": str(e), "traceback": traceback.format_exc()})


if __name__ == "__main__":
    main()
`;

interface PendingRequest {
  resolve: (result: BgRemovalResult) => void;
  timeout: NodeJS.Timeout;
}

export interface BgRemovalResult {
  success: boolean;
  outputPath?: string;
  device?: string;
  error?: string;
  message?: string;
}

interface ReadySignal {
  type: 'ready';
  device?: string;
  error?: string;
  hint?: string;
}

const REQUEST_TIMEOUT_MS = 60_000; // segmentation is slower than a Whisper clip, especially on CPU
const RESTART_DELAY_MS    = 3_000;
const MAX_RESTART_ATTEMPTS = 5;

export class RmbgServerManager {
  private process: ChildProcess | null = null;
  private ready = false;
  private readyDevice = 'cpu';
  private pending = new Map<string, PendingRequest>();
  private nextId = 1;
  private restartAttempts = 0;
  private stopping = false;
  private lineBuffer = '';
  private configuredPythonPath: string | null = null;
  private hfToken = '';

  /** Called once runRmbgAutoInstall confirms the dedicated RMBG env is ready. */
  setPythonPath(pythonExe: string): void {
    this.configuredPythonPath = pythonExe;
    console.log(`[RmbgMgr] Python path configured: ${pythonExe}`);
  }

  /** Called whenever the user saves/updates their HuggingFace access token in settings. */
  setHfToken(token: string): void {
    this.hfToken = token || '';
    // A changed token only takes effect on the next (re)start — restart the server if it's already running.
    if (this.process) this.stop();
  }

  get isReady(): boolean { return this.ready; }
  get device(): string { return this.readyDevice; }
  get hasPythonPath(): boolean { return !!this.configuredPythonPath; }

  async start(): Promise<{ device: string }> {
    if (!this.configuredPythonPath) {
      throw new Error('Background Remover is not installed yet — run setup first.');
    }
    this.stopping = false;
    const scriptPath = this._ensureScript();

    console.log(`[RmbgMgr] Starting server: ${this.configuredPythonPath} ${scriptPath}`);

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      MOSSY_HF_TOKEN: this.hfToken,
    };

    this.process = spawn(this.configuredPythonPath, [scriptPath], {
      env,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.lineBuffer = '';
    this.process.stdout?.setEncoding('utf8');
    this.process.stderr?.setEncoding('utf8');

    this.process.stdout?.on('data', (chunk: string) => this._onData(chunk));
    this.process.stderr?.on('data', (chunk: string) => {
      console.warn('[RmbgMgr] stderr:', chunk.trim());
    });
    this.process.on('close', (code) => this._onClose(code));
    this.process.on('error', (err) => {
      console.error('[RmbgMgr] process error:', err);
      this._rejectAll(err);
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('RMBG server startup timed out (90s) — first load can be slow while the model downloads.'));
      }, 90_000);

      const onceReady = (signal: ReadySignal) => {
        clearTimeout(timer);
        if (signal.error) {
          reject(new Error(`RMBG server startup failed: ${signal.error}. ${signal.hint || ''}`));
          return;
        }
        this.ready = true;
        this.readyDevice = signal.device || 'cpu';
        this.restartAttempts = 0;
        console.log(`[RmbgMgr] Ready — device=${this.readyDevice}`);
        resolve({ device: this.readyDevice });
      };

      (this as any)._onReadyCallback = onceReady;
    });
  }

  /** Removes the background from one image file, writing an alpha-masked PNG to outputPath. */
  async removeBackground(imagePath: string, outputPath: string): Promise<BgRemovalResult> {
    if (!this.ready || !this.process?.stdin) {
      try {
        await this.start();
      } catch (e: any) {
        return { success: false, error: 'server_not_ready', message: e.message };
      }
    }

    const id = String(this.nextId++);
    const request = JSON.stringify({ id, imagePath, outputPath }) + '\n';

    return new Promise<BgRemovalResult>((resolve) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        resolve({ success: false, error: 'timeout', message: `Background removal timed out after ${REQUEST_TIMEOUT_MS / 1000}s` });
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve, timeout });

      try {
        this.process!.stdin!.write(request);
      } catch (e: any) {
        clearTimeout(timeout);
        this.pending.delete(id);
        resolve({ success: false, error: 'stdin_write_failed', message: e.message });
      }
    });
  }

  stop(): void {
    this.stopping = true;
    this.ready = false;
    if (this.process) {
      try { this.process.kill(); } catch { /* ignore */ }
      this.process = null;
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _ensureScript(): string {
    const dest = path.join(app.getPath('userData'), 'rmbg_server.py');
    try {
      fs.writeFileSync(dest, RMBG_SERVER_PY, { encoding: 'utf8' });
    } catch (e) {
      console.error('[RmbgMgr] Failed to write script:', e);
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
            req.resolve(obj as BgRemovalResult);
          }
        }
      } catch (e) {
        console.warn('[RmbgMgr] Failed to parse stdout line:', trimmed, e);
      }
    }
  }

  private _onClose(code: number | null): void {
    console.warn(`[RmbgMgr] Process exited (code=${code})`);
    this.ready = false;
    this._rejectAll(new Error(`RMBG server exited (code=${code})`));

    if (!this.stopping && this.restartAttempts < MAX_RESTART_ATTEMPTS) {
      this.restartAttempts++;
      setTimeout(() => {
        if (!this.stopping) this.start().catch(e => console.error('[RmbgMgr] Restart failed:', e));
      }, RESTART_DELAY_MS);
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
export const rmbgServer = new RmbgServerManager();
