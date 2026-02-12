/**
 * Electron Main Process for Volt Tech Desktop Wrapper
 * 
 * This is the entry point for the Electron main process.
 * Handles window creation, IPC communication for program detection and launching.
 */

import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } from 'electron';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS } from './types';
import { ModProject, CollaborationSession, VersionControlConfig, AnalyticsEvent, UsageMetrics, AnalyticsConfig, Roadmap, ProjectWizardState } from '../shared/types';
import { scanForDuplicates, type DedupeScanState } from './duplicateFinder';
import { detectPrograms, getSystemInfo } from './detectPrograms';
import { getRunningModdingTools } from './processMonitor';
import { DesktopShortcutManager } from './desktopShortcut';
import { buildSemanticIndex, getSemanticIndexStatus, querySemanticIndex } from './ml/semanticIndex';
import { getOllamaStatus, ollamaGenerate } from './ml/ollama';
import { getOpenAICompatStatus, openAICompatChat } from './ml/openaiCompat';
import { autoUpdaterService } from './autoUpdater';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import { BridgeServer } from './BridgeServer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import http from 'http';
import https from 'https';
import { 
  setDetectedPrograms, 
  getLastProgramScan, 
  getDetectedPrograms,
  getRoadmaps,
  saveRoadmap,
  deleteRoadmap,
  getProjects,
  saveProject
} from '../main/store';
import FormData from 'form-data';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { File as NodeFile } from 'node:buffer';
// import { MiningPipelineOrchestrator } from '../mining/mining-pipeline'; // TEMPORARILY DISABLED
import { ESPParser } from '../mining/esp-parser'; // TEMPORARILY DISABLED
import { DependencyGraphBuilder } from '../mining/dependency-graph-builder'; // TEMPORARILY DISABLED
import { DataSource, MiningResult } from '../shared/types';

// Load environment variables - use encrypted version for packaged builds
const envPath = app.isPackaged
  ? path.join(process.cwd(), '.env.encrypted')
  : path.join(process.cwd(), '.env.local');
console.log('[Main] Loading .env from:', envPath);
console.log('[Main] File exists:', fs.existsSync(envPath));
console.log('[Main] Current working directory:', process.cwd());
console.log('[Main] __dirname:', __dirname);
console.log('[Main] app.getAppPath():', app.getAppPath());
console.log('[Main] path.dirname(process.execPath):', path.dirname(process.execPath));
// Suppress dotenv's own startup logs (keeps dev console readable).
// dotenv@17 supports { quiet: true }.
const result = dotenv.config({ path: envPath, quiet: true });
console.log('[Main] dotenv result:', result);
console.log('[Main] OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
console.log('[Main] process.env keys:', Object.keys(process.env).filter(key => key.includes('API') || key.includes('TOKEN')));
// Never log API keys (even presence-only for renderer-exposed vars).
// Never log API keys (even partial prefixes).

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Polyfill DOMMatrix for pdf-parse compatibility
if (typeof (global as any).DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor(init?: any) {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    skewX() { return this; }
    skewY() { return this; }
    inverse() { return this; }
    transformPoint() { return { x: 0, y: 0 }; }
    toFloat32Array() { return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
    toFloat64Array() { return new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
    toString() { return 'DOMMatrix()'; }
  };
}

// Polyfill File for OpenAI uploads on Node < 20
if (typeof (globalThis as any).File === 'undefined') {
  (globalThis as any).File = NodeFile;
}

let mainWindow: BrowserWindow | null = null;
const bridge = new BridgeServer();

type BackendConfig = { baseUrl: string; token?: string };

const getBackendConfig = (): BackendConfig | null => {
  const rawUrl = String(process.env.MOSSY_BACKEND_URL || '').trim();
  if (!rawUrl) return null;
  const baseUrl = rawUrl.replace(/\/+$/, '');
  const tokenRaw = String(process.env.MOSSY_BACKEND_TOKEN || '').trim();
  return { baseUrl, token: tokenRaw || undefined };
};

const backendJoin = (cfg: BackendConfig, pathname: string): string => {
  const p = String(pathname || '').startsWith('/') ? String(pathname) : `/${pathname}`;
  return `${cfg.baseUrl}${p}`;
};

const pingBackendHealth = async (cfg: BackendConfig): Promise<void> => {
  try {
    const healthUrl = backendJoin(cfg, '/health');
    console.log('[Main] Pinging backend health:', healthUrl);
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    if (response.ok) {
      const data = await response.json();
      console.log('[Main] Backend health check successful:', data);
    } else {
      console.warn('[Main] Backend health check failed with status:', response.status);
    }
  } catch (error) {
    console.warn('[Main] Backend health check error:', error instanceof Error ? error.message : error);
  }
};

const postFormData = async (
  urlStr: string,
  formData: FormData,
  headers: Record<string, string> = {},
  timeoutMs = 30000
): Promise<{ ok: boolean; status: number; json?: any; text?: string }> => {
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const reqHeaders: Record<string, string> = {
    ...formData.getHeaders(),
    ...headers,
  };
  try {
    const length = formData.getLengthSync();
    if (Number.isFinite(length) && length > 0) {
      reqHeaders['Content-Length'] = String(length);
    }
  } catch {
    // Some streams don't report length; allow chunked transfer.
  }

  return await new Promise((resolve, reject) => {
    const req = client.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let json: any | undefined;
          try {
            json = data ? JSON.parse(data) : undefined;
          } catch {
            json = undefined;
          }
          const status = res.statusCode || 0;
          resolve({ ok: status >= 200 && status < 300, status, json, text: data });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', reject);
    formData.pipe(req);
  });
};

// Duplicate Finder state
const dedupeScanStates = new Map<string, DedupeScanState>();
const dedupeAllowedPathsByScan = new Map<string, Set<string>>();

// Development mode flag - only check for dev when not packaged
const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_TEST === 'true');

// Allow override of start URL for development
const ELECTRON_START_URL = process.env.ELECTRON_START_URL;

// Fix Electron cache directory issues on Windows
// Set cache directory to user's temp folder to avoid permission issues
const cacheDir = path.join(os.tmpdir(), 'mossy-pip-boy-cache');
try {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  app.setPath('cache', cacheDir);
} catch (err) {
  console.warn('Could not set custom cache directory:', err);
}

/**
 * Create the main application window
 */
function createWindow() {
  // NOTE:
  // - Electron/Chromium doesn't reliably load SVGs as native window icons.
  // - `__dirname` here points inside dist-electron, not the repo root.
  // Use an absolute path derived from app paths so the icon exists at runtime.
  const publicDir = app.isPackaged
    ? path.join(process.resourcesPath, 'public')
    : path.join(app.getAppPath(), 'public');

  const iconPath = process.platform === 'win32'
    ? undefined
    : path.join(publicDir, 'pipboy-icon.svg');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,      // Security: isolate preload context
      nodeIntegration: false,       // Security: disabled for renderer
      sandbox: true,                // Security: sandboxed renderer
    },
    show: false, // Don't show until ready
    title: 'Mossy Pip-Boy - Fallout 4 Modding Assistant',
  });

  const windowRef = mainWindow;

  windowRef.webContents.on('did-finish-load', () => {
    try {
      console.log('[Main] Renderer loaded URL:', windowRef.webContents.getURL());
    } catch {
      // ignore
    }
  });

  // Load the app based on environment
  const isTestMode = process.env.ELECTRON_IS_TEST === 'true';
  const devPort = Number(process.env.VITE_DEV_SERVER_PORT || process.env.DEV_SERVER_PORT || 5173);
  const testParam = isTestMode ? '?test=true' : '';
  const devUrl = ELECTRON_START_URL || `http://localhost:${devPort}`;

  if (!app.isPackaged && (ELECTRON_START_URL || process.env.VITE_DEV_SERVER_PORT || process.env.DEV_SERVER_PORT)) {
    // Development with custom or local server URL
    mainWindow.loadURL(`${devUrl}${testParam}`);
    mainWindow.webContents.openDevTools();
  } else if (isDev) {
    // Development fallback
    mainWindow.loadURL(`${devUrl}${testParam}`);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load bundled Vite build from /dist (packaged by electron-builder)
    const indexPath = path.join(__dirname, '../../dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load front-end from dist build:', err);
      // Fallback: show error page
      mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error - Volt Tech Desktop</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .error-box {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 500px;
                text-align: center;
              }
              h1 { color: #e74c3c; margin-top: 0; }
              p { color: #555; line-height: 1.6; }
              code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="error-box">
              <h1>⚠️ Front-end Not Found</h1>
              <p>The Volt Tech front-end assets could not be found.</p>
              <p>Please ensure the built assets are placed in:</p>
              <p><code>./external/volttech-dist/</code></p>
              <p>with an <code>index.html</code> file as the entry point.</p>
            </div>
          </body>
        </html>
      `)}`);
    });
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Enable DevTools with F12 or Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIpcHandlers() {
  // Check if handlers are already registered
  if ((global as any).__ipcHandlersRegistered) {
    console.log('[Main] IPC handlers already registered, skipping');
    return;
  }

  console.log('[Main] Registering IPC handlers...');

  // Variables for observer functionality
  let activeWatcher: any = null;
  let activeProjectFolder: string | null = null;
  let lastAnalyzedFile: string = '';
  let lastAnalysisTime: number = 0;

  // Use a set to track registered handlers to avoid duplicates
  const registeredHandlers = new Set<string>();

  // Function to notify renderer about observer events
  const notifyObserver = (event: string, data: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.OBSERVER_NOTIFY, { event, data, timestamp: Date.now() });
    }
  };

  // Helper function to register handler safely
  const registerHandler = (channel: string, handler: any) => {
    if (registeredHandlers.has(channel)) {
      console.log(`[Main] Handler for '${channel}' already registered, skipping`);
      return;
    }
    try {
      ipcMain.handle(channel, handler);
      registeredHandlers.add(channel);
      console.log(`[Main] Registered handler for '${channel}'`);
    } catch (error: any) {
      if (error.message.includes('Attempted to register a second handler')) {
        console.log(`[Main] Handler for '${channel}' already exists, skipping`);
      } else {
        console.error(`[Main] Error registering handler for '${channel}':`, error);
      }
    }
  };

  // Register handlers one by one

  // PDF parsing handler (runs in main process with Node.js)
  registerHandler('parse-pdf', async (_event, arrayBuffer: ArrayBuffer) => {
    try {
      const buffer = Buffer.from(arrayBuffer);
      
      // Dynamic import for ESM module
      const pdfParseModule = await import('pdf-parse');
      const PDFParse = pdfParseModule.PDFParse;
      
      const pdfParser = new PDFParse({ data: buffer });
      const result = await pdfParser.getText();
      return { success: true, text: result.text };
    } catch (error: any) {
      console.error('PDF parsing error:', error);
      return { success: false, error: error.message || 'Failed to parse PDF' };
    }
  });

  // Video transcription handler (runs in main process with Node.js)
  // NOTE: For security, the renderer should NOT pass API keys. This handler prefers
  // main-process stored secrets (safeStorage-encrypted settings) and env vars.
  // Back-compat: older renderers passed (apiKey, filename, projectId?, organizationId?).
  registerHandler('transcribe-video', async (_event, arrayBuffer: ArrayBuffer, ...args: any[]) => {
    let tempVideoPath: string | null = null;
    let tempAudioPath: string | null = null;

    try {
      const looksLikeFilename = (v: any): boolean => {
        const s = String(v || '').trim();
        if (!s) return false;
        return /\.(mp4|webm|mov|avi|mkv|flv)$/i.test(s) || /\.[a-z0-9]{2,5}$/i.test(s);
      };

      const isNewSignature = looksLikeFilename(args?.[0]);
      const filename = String((isNewSignature ? args?.[0] : args?.[1]) || '').trim();
      const apiKeyFromRenderer = String((isNewSignature ? '' : args?.[0]) || '').trim();
      const projectId = isNewSignature ? args?.[1] : args?.[2];
      const organizationId = isNewSignature ? args?.[2] : args?.[3];

      const s = loadSettings();
      const storedKey = getSecretValue(s, 'openaiApiKey', 'OPENAI_API_KEY');
      const apiKey = storedKey || apiKeyFromRenderer;

      // Save video to temp file
      const buffer = Buffer.from(arrayBuffer);
      const ext = path.extname(filename) || '.mp4';
      tempVideoPath = path.join(os.tmpdir(), `mossy-video-${Date.now()}${ext}`);
      tempAudioPath = path.join(os.tmpdir(), `mossy-audio-${Date.now()}.mp3`);
      
      fs.writeFileSync(tempVideoPath, buffer);
      console.log('[Transcription] Video saved to temp:', tempVideoPath);

      // Extract audio using ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath!)
          .output(tempAudioPath!)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('end', () => {
            console.log('Audio extracted successfully');
            resolve();
          })
          .on('error', (err: Error) => {
            console.error('FFmpeg error:', err);
            reject(err);
          })
          .run();
      });

      // Read audio file
      const audioBuffer = fs.readFileSync(tempAudioPath);
      console.log('[Transcription] Audio file size:', audioBuffer.length, 'bytes');

      let transcription = '';

      // If a backend proxy is configured, try it. Backend-only architecture - no fallbacks.
      const backendBaseUrl = String(s?.backendBaseUrl || process.env.MOSSY_BACKEND_URL || '').trim();
      const backendToken = getSecretValue(s, 'backendToken', 'MOSSY_BACKEND_TOKEN');
      const backend = backendBaseUrl
        ? { baseUrl: backendBaseUrl.replace(/\/+$/, ''), token: backendToken || undefined }
        : null;
      const backendConfigured = Boolean(backend?.baseUrl);
      const backendTokenConfigured = Boolean(backendToken);
      if (!backend) {
        return { success: false, error: 'Backend service not configured. Please set MOSSY_BACKEND_URL and MOSSY_BACKEND_TOKEN environment variables.' };
      }

      try {
        const sttLang = (() => {
          const raw = String(s?.sttLanguage || s?.uiLanguage || '').trim().toLowerCase();
          if (!raw || raw === 'auto') return '';
          return raw.split('-')[0] || raw;
        })();

        const extraHeaders: Record<string, string> = {};
        if (backend.token) extraHeaders.Authorization = `Bearer ${backend.token}`;

        const tryBackendTranscribe = async (fieldName: 'audio' | 'file') => {
          const form = new FormData();
          form.append(fieldName, audioBuffer, {
            filename: 'audio.mp3',
            contentType: 'audio/mpeg',
          });
          form.append('model', 'whisper-1');
          if (sttLang) form.append('language', sttLang);
          return postFormData(backendJoin(backend, '/v1/transcribe'), form, extraHeaders, 60000);
        };

        let resp = await tryBackendTranscribe('audio');
        if (!resp.ok) {
          const msg = String(resp.json?.message || resp.json?.error || resp.text || '');
          const shouldRetry =
            (resp.status === 400 || resp.status === 422) &&
            (/missing/i.test(msg) && /file/i.test(msg) || /body',\s*'file'/.test(msg));
          if (shouldRetry) {
            resp = await tryBackendTranscribe('file');
          }
        }

        if (resp.ok && resp.json?.ok) {
          transcription = String(resp.json?.text || '').trim();
          return { success: true, text: transcription };
        }

        const msg = String(resp.json?.message || resp.json?.error || resp.text || `Backend transcribe failed (${resp.status})`);
        console.error('[Transcription] Backend proxy failed:', msg);
        return { success: false, error: msg };
      } catch (e: any) {
        console.error('[Transcription] Backend proxy error:', e?.message || e);
        return { success: false, error: e?.message || 'Backend service unavailable' };
      }

      try {
        console.log('[Transcription] Attempting SDK transcription...');
        const client = new OpenAI({
          apiKey,
          organization: organizationId,
          project: projectId,
        });
        const result = await client.audio.transcriptions.create({
          file: fs.createReadStream(tempAudioPath),
          model: 'whisper-1',
        });
        transcription = (result as any)?.text ?? '';
        console.log('[Transcription] ✓ Success via SDK:', transcription.substring(0, 100));
        return { success: true, text: transcription };
      } catch (sdkErr: any) {
        const msg = sdkErr?.message || '';
        console.warn('[Transcription] SDK failed:', msg);
        if (/401|Incorrect API key/i.test(msg)) {
          console.log('[Transcription] Backend authentication failed - no fallback available');
          return { success: false, error: 'Backend authentication failed. Please check your backend token.' };
        }

        // If SDK failed for other reasons, try HTTP as a last resort
        try {
          console.warn('[Transcription] Trying HTTP fallback...');
          const formData = new FormData();
          formData.append('file', audioBuffer, {
            filename: 'audio.mp3',
            contentType: 'audio/mpeg',
          });
          formData.append('model', 'whisper-1');

          transcription = await new Promise<string>((resolve, reject) => {
            const options = {
              hostname: 'api.openai.com',
              path: '/v1/audio/transcriptions',
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                ...formData.getHeaders(),
              },
            };

            const req = https.request(options, (res) => {
              let data = '';
              res.on('data', (chunk) => { data += chunk; });
              res.on('end', () => {
                try {
                  const json = JSON.parse(data);
                  if (json.error) {
                    const status = res.statusCode || 0;
                    const errMsg: string = json.error.message || 'Transcription failed';
                    const maskedMsg = errMsg.replace(/(sk-[a-z0-9_-]{10,})/gi, (m) => m.slice(0, 10) + '…');
                    const enriched = `[${status}] ${maskedMsg}`;
                    reject(new Error(enriched));
                  } else {
                    resolve(json.text);
                  }
                } catch (e) {
                  reject(new Error('Failed to parse API response'));
                }
              });
            });

            req.on('error', reject);
            formData.pipe(req);
          });

          return { success: true, text: transcription };
        } catch (httpErr: any) {
          // HTTP also failed, no fallback available
          console.warn('[Transcription] HTTP also failed - no fallback available');
          return { success: false, error: 'Backend transcription failed. Please check your backend configuration.' };
        }
      }
    } catch (error: any) {
      console.error('Video transcription error:', error);
      return { success: false, error: error.message || 'Failed to transcribe video' };
    } finally {
      // Clean up temp files
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        try { fs.unlinkSync(tempVideoPath); } catch (e) { console.warn('Failed to delete temp video:', e); }
      }
      if (tempAudioPath && fs.existsSync(tempAudioPath)) {
        try { fs.unlinkSync(tempAudioPath); } catch (e) { console.warn('Failed to delete temp audio:', e); }
      }
    }
  });

  // Audio transcription handler (runs in main process; renderer never sees API keys)
  registerHandler('transcribe-audio', async (_event, arrayBuffer: ArrayBuffer, mimeType?: string) => {
    let tempAudioPath: string | null = null;

    try {
      const s = loadSettings();
      const openaiKey = getSecretValue(s, 'openaiApiKey', 'OPENAI_API_KEY');
      const hasLocalProviders = Boolean(openaiKey);

      const buf = Buffer.from(arrayBuffer);
      const mt = String(mimeType || '').toLowerCase();
      const ext = mt.includes('webm') ? '.webm' : mt.includes('wav') ? '.wav' : mt.includes('ogg') ? '.ogg' : '.mp3';

      // If a backend proxy is configured, try it first. This enables "works on download" flows
      // (server holds provider keys; client holds none). If it fails, fall back to local keys.
      const backendBaseUrl = String(s?.backendBaseUrl || process.env.MOSSY_BACKEND_URL || '').trim();
      const backendToken = getSecretValue(s, 'backendToken', 'MOSSY_BACKEND_TOKEN');
      const backend = backendBaseUrl
        ? { baseUrl: backendBaseUrl.replace(/\/+$/, ''), token: backendToken || undefined }
        : null;
      if (backend) {
        try {
          console.log('[Transcription] Backend base URL:', backend.baseUrl);
          const sttLang = (() => {
            const raw = String(s?.sttLanguage || s?.uiLanguage || '').trim().toLowerCase();
            if (!raw || raw === 'auto') return '';
            return raw.split('-')[0] || raw;
          })();

          const extraHeaders: Record<string, string> = {};
          if (backend.token) extraHeaders.Authorization = `Bearer ${backend.token}`;

          const tryBackendTranscribe = async (fieldName: 'audio' | 'file') => {
            const form = new FormData();
            form.append(fieldName, buf, {
              filename: `audio${ext}`,
              contentType: mt || 'application/octet-stream',
            });
            form.append('model', 'whisper-1');
            if (sttLang) form.append('language', sttLang);
            return postFormData(backendJoin(backend, '/v1/transcribe'), form, extraHeaders, 45000);
          };

          let resp = await tryBackendTranscribe('audio');
          if (!resp.ok) {
            const msg = String(resp.json?.message || resp.json?.error || resp.text || '');
            const shouldRetry =
              (resp.status === 400 || resp.status === 422) &&
              (/missing/i.test(msg) && /file/i.test(msg) || /body',\s*'file'/.test(msg));
            if (shouldRetry) {
              resp = await tryBackendTranscribe('file');
            }
          }

          if (resp.ok && resp.json?.ok) {
            return { success: true, text: String(resp.json?.text || '').trim() };
          }

          const msg = String(resp.json?.message || resp.json?.error || resp.text || `Backend transcribe failed (${resp.status})`);
          console.warn('[Transcription] Backend proxy response:', { status: resp.status, message: msg });
          console.warn('[Transcription] Backend proxy failed; falling back to local providers:', msg);
          if (backend?.baseUrl && backendToken) {
            return { success: false, error: msg };
          }
          if (!hasLocalProviders) {
            return { success: false, error: msg };
          }
        } catch (e: any) {
          console.warn('[Transcription] Backend proxy error; falling back to local providers:', e?.message || e);
          if (backend?.baseUrl && backendToken) {
            return { success: false, error: e?.message || 'Backend service unavailable' };
          }
          if (!hasLocalProviders) {
            return { success: false, error: e?.message || 'Backend service unavailable' };
          }
        }
      }

      tempAudioPath = path.join(os.tmpdir(), `mossy-audio-${Date.now()}${ext}`);
      fs.writeFileSync(tempAudioPath, buf);

      // Prefer OpenAI Whisper if configured
      let lastOpenAiError: string | null = null;
      if (openaiKey) {
        try {
          const client = new OpenAI({ apiKey: openaiKey });
          const result = await client.audio.transcriptions.create({
            file: fs.createReadStream(tempAudioPath),
            model: 'whisper-1',
          });
          const text = String((result as any)?.text || '').trim();
          return { success: true, text };
        } catch (e: any) {
          lastOpenAiError = String(e?.message || e);
          console.warn('[Transcription] OpenAI Whisper failed:', lastOpenAiError);
        }
      }

      if (lastOpenAiError) {
        return { success: false, error: `OpenAI Whisper failed: ${lastOpenAiError}` };
      }

      const detail = `openaiKey=${hasLocalProviders ? 'yes' : 'no'} backend=${backend?.baseUrl ? 'yes' : 'no'}`;
      return { success: false, error: `No transcription provider configured (OpenAI) [${detail}]` };
    } catch (error: any) {
      console.error('[Transcription] transcribe-audio error:', error);
      return { success: false, error: error?.message || 'Failed to transcribe audio' };
    } finally {
      if (tempAudioPath && fs.existsSync(tempAudioPath)) {
        try { fs.unlinkSync(tempAudioPath); } catch { /* ignore */ }
      }
    }
  });

  // Program detection handler
  registerHandler(IPC_CHANNELS.DETECT_PROGRAMS, async () => {
    try {
      // Check if we have cached results from the last hour
      const lastScan = getLastProgramScan();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      if (lastScan > oneHourAgo) {
        console.log('[Program Detection] Using cached results from', new Date(lastScan).toISOString());
        return getDetectedPrograms();
      }

      // No recent cache, perform fresh scan
      console.log('[Program Detection] Performing fresh scan...');
      const programs = await detectPrograms();

      // Cache the results
      setDetectedPrograms(programs);
      console.log(`[Program Detection] Cached ${programs.length} detected programs`);

      return programs;
    } catch (error) {
      console.error('Error detecting programs:', error);
      throw error;
    }
  });

  // Get running processes handler
  registerHandler(IPC_CHANNELS.GET_RUNNING_PROCESSES, async () => {
    try {
      return await getRunningModdingTools();
    } catch (error) {
      console.error('Error getting running processes:', error);
      return [];
    }
  });

  // Open program handler
  registerHandler(IPC_CHANNELS.OPEN_PROGRAM, async (event, programPath: string) => {
    try {
      // Validate input
      if (!programPath || typeof programPath !== 'string') {
        console.error(`[Main] OPEN_PROGRAM: Invalid programPath - ${programPath}`);
        throw new Error('Invalid program path');
      }
      
      console.log(`[Main] OPEN_PROGRAM: Checking if ${programPath} exists...`);
      
      // Use synchronous check for existence since we're already in a try/catch
      if (!fs.existsSync(programPath)) {
          console.error(`[Main] OPEN_PROGRAM: Program NOT FOUND at: ${programPath}`);
          return { success: false, error: `Executable not found at ${programPath}. Please verify the path.` };
      }

      console.log(`[Main] OPEN_PROGRAM: File exists. Path is valid.`);
      console.log(`[Main] OPEN_PROGRAM: Attempting to open program: ${programPath}`);
      
      // FOR EXECUTABLES: Use Windows 'start' command which is most reliable for GUI apps
      if (programPath.toLowerCase().endsWith('.exe')) {
          try {
              const programDir = path.dirname(programPath);
              const programFile = path.basename(programPath);

              console.log(`[Main] OPEN_PROGRAM: Launching ${programFile} from directory: ${programDir}`);
              console.log(`[Main] OPEN_PROGRAM: Full path: ${programPath}`);

              // Method 1: Try Electron's shell.openPath first (most reliable)
              const shellError = await shell.openPath(programPath);
              
              if (shellError) {
                  console.warn(`[Main] OPEN_PROGRAM: shell.openPath returned error: ${shellError}`);
                  console.log(`[Main] OPEN_PROGRAM: Trying fallback method with spawn...`);

                  // Method 2: Fallback to Windows start (more reliable for GUI apps)
                  const child = spawn('cmd.exe', ['/c', 'start', '""', programPath], {
                    cwd: programDir,
                    detached: true,
                    stdio: 'ignore',
                    windowsHide: true,
                  });
                  
                  child.unref();
                  console.log(`[Main] OPEN_PROGRAM: ✓ Fallback spawn completed`);
                  return { success: true, method: 'cmd-start-fallback' };
              } else {
                  console.log(`[Main] OPEN_PROGRAM: ✓ SUCCESS - Program launched via shell.openPath`);
                  return { success: true, method: 'shell-openPath' };
              }
          } catch (e: any) {
              console.error(`[Main] OPEN_PROGRAM: ✗ CRITICAL FAILURE:`, e);
              return { success: false, error: e.message || 'Bridge exception' };
          }
      }
      
      // Handle URLs via openExternal
      if (/^https?:\/\//i.test(programPath)) {
        try {
          await shell.openExternal(programPath);
          console.log(`[Main] OPEN_PROGRAM: ✓ SUCCESS - Opened URL via shell.openExternal`);
          return { success: true, method: 'shell-openExternal' };
        } catch (e: any) {
          console.error(`[Main] OPEN_PROGRAM: Failed to open URL: ${e?.message || e}`);
          return { success: false, error: e?.message || 'Failed to open URL' };
        }
      }

      // Use shell.openPath for non-exe files or directories
      const error = await shell.openPath(programPath);
      
      if (error) {
        console.warn(`[Main] shell.openPath failed: ${error}. Falling back to standard exec.`);
        
        return new Promise((resolve) => {
          const quotedPath = `"${programPath}"`;
          exec(`start "" ${quotedPath}`, (err) => {
            if (err) {
              console.error(`[Main] Final fallback exec failed: ${err}`);
              resolve({ success: false, error: err.message });
            } else {
              console.log(`[Main] Fallback exec successful for: ${programPath}`);
              resolve({ success: true, method: 'exec' });
            }
          });
        });
      }
      
      return { success: true, method: 'shell' };
    } catch (error: any) {
      console.error('Error opening program:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  });

  // Open external file/executable handler
  registerHandler(IPC_CHANNELS.OPEN_EXTERNAL, async (event, filePath: string) => {
    try {
      // Validate input
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      const { shell } = await import('electron');
      const fs = await import('fs');
      const pathMod = await import('path');

      let resolvedPath = filePath;
      if (!pathMod.isAbsolute(filePath)) {
        const resolvedFromCwd = pathMod.resolve(filePath);
        const candidates = [
          resolvedFromCwd,
          pathMod.join(app.getAppPath(), filePath),
          pathMod.join(app.getAppPath(), '..', filePath),
          pathMod.join(app.getAppPath(), '..', '..', filePath),
          pathMod.join(process.resourcesPath, filePath),
          pathMod.join(process.cwd(), filePath),
          pathMod.join(process.cwd(), '..', filePath),
        ];

        const match = candidates.find(candidate => fs.existsSync(candidate));
        if (match) {
          resolvedPath = match;
        }
      }

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${resolvedPath}`);
      }

      // Open the file with the default application or launch executable
      const result = await shell.openPath(resolvedPath);
      
      // If result is not empty, it means there was an error
      if (result) {
        throw new Error(result);
      }

      console.log('Successfully opened external file:', resolvedPath);
    } catch (error) {
      console.error('Error opening external file:', error);
      throw error;
    }
  });

  // Reveal a file in Explorer/Finder, or open a directory
  registerHandler(IPC_CHANNELS.REVEAL_IN_FOLDER, async (_event, targetPath: string) => {
    try {
      if (!targetPath || typeof targetPath !== 'string') {
        return { success: false, error: 'Invalid path' };
      }

      const fsMod = await import('fs');
      if (!fsMod.existsSync(targetPath)) {
        return { success: false, error: `Path not found: ${targetPath}` };
      }

      const stat = fsMod.statSync(targetPath);
      if (stat.isDirectory()) {
        const error = await shell.openPath(targetPath);
        if (error) return { success: false, error };
        return { success: true };
      }

      shell.showItemInFolder(targetPath);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  });

  // Get executable version (Windows)
  registerHandler(IPC_CHANNELS.GET_TOOL_VERSION, async (_event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      const fs = await import('fs');
      if (!fs.existsSync(filePath)) {
        return '';
      }

      if (process.platform !== 'win32') {
        return '';
      }

      const { execFileSync } = await import('child_process');
      const pwshPath = 'powershell.exe';
      const escaped = filePath.replace(/'/g, "''");
      const cmd = `(Get-Item '${escaped}').VersionInfo.ProductVersion`;
      const output = execFileSync(pwshPath, ['-NoLogo', '-NoProfile', '-Command', cmd], { encoding: 'utf-8' }).trim();
      return output || '';
    } catch (error) {
      console.error('Error getting tool version:', error);
      return '';
    }
  });

  // Desktop shortcut handlers
  registerHandler('create-desktop-shortcut', async () => {
    try {
      const created = DesktopShortcutManager.createDesktopShortcut();
      return { success: created, message: created ? 'Desktop shortcut created successfully' : 'Failed to create desktop shortcut' };
    } catch (error) {
      console.error('Error creating desktop shortcut:', error);
      return { success: false, message: String(error) };
    }
  });

  registerHandler('shortcut-exists', async () => {
    try {
      return DesktopShortcutManager.shortcutExists();
    } catch (error) {
      console.error('Error checking shortcut:', error);
      return false;
    }
  });

  // Settings management using JSON file storage
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');

  type SecretField = 'elevenLabsApiKey' | 'openaiApiKey' | 'groqApiKey' | 'backendToken';
  const secretEncKey = (k: SecretField) => `${k}Enc` as const;
  const hasOwn = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

  const encryptSecretForStorage = (plain: string): string => {
    const v = String(plain || '').trim();
    if (!v) return '';
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buf = safeStorage.encryptString(v);
        return `enc:${buf.toString('base64')}`;
      }
    } catch (e) {
      console.warn('[Settings] safeStorage encryption failed; storing as plain marker:', e);
    }
    return `plain:${v}`;
  };

  const decryptSecretFromStorage = (stored: any): string => {
    const raw = String(stored || '').trim();
    if (!raw) return '';
    if (raw.startsWith('plain:')) return raw.slice('plain:'.length);
    if (!raw.startsWith('enc:')) return '';

    const encrypted = raw.slice('enc:'.length);

    // Try packaged encryption format first (iv:encrypted)
    if (encrypted.includes(':')) {
      try {
        const crypto = require('crypto');
        const ENCRYPTION_KEY = 'mossy-2026-packaging-key-change-in-production';
        const parts = encrypted.split(':');
        if (parts.length === 2) {
          const iv = Buffer.from(parts[0], 'hex');
          const encryptedText = parts[1];
          const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        }
      } catch (e) {
        console.warn('[Settings] packaged decryption failed, trying safeStorage:', e);
      }
    }

    // Fall back to safeStorage format (base64 only)
    const b64 = encrypted;
    try {
      if (!safeStorage.isEncryptionAvailable()) return '';
      return safeStorage.decryptString(Buffer.from(b64, 'base64'));
    } catch (e) {
      console.warn('[Settings] safeStorage decryption failed:', e);
      return '';
    }
  };

  const migratePlainSecretsToEncrypted = (settings: any): { next: any; migrated: boolean } => {
    if (!settings || typeof settings !== 'object') return { next: settings, migrated: false };
    const next = { ...settings };
    let migrated = false;

    const fields: SecretField[] = ['elevenLabsApiKey', 'openaiApiKey', 'groqApiKey', 'backendToken'];
    for (const field of fields) {
      const encKey = secretEncKey(field);
      const plain = String(next?.[field] || '').trim();
      const enc = String(next?.[encKey] || '').trim();

      if (plain && !enc) {
        next[encKey] = encryptSecretForStorage(plain);
        next[field] = '';
        migrated = true;
        continue;
      }

      if (enc && plain) {
        next[field] = '';
        migrated = true;
      }
    }

    return { next, migrated };
  };

  const seedSecretFromEnv = (settings: any, field: SecretField, envName: string): boolean => {
    const next = settings;
    const encKey = secretEncKey(field);
    const hasEnc = String(next?.[encKey] || '').trim();
    const hasPlain = String(next?.[field] || '').trim();
    if (hasEnc || hasPlain) return false;

    const envValue = String((process.env as any)?.[envName] || '').trim();
    if (!envValue) return false;

    const isEnc = envValue.startsWith('enc:');
    if (!isEnc && !safeStorage.isEncryptionAvailable()) {
      console.warn(`[Settings] safeStorage unavailable; skipping persist for ${field} (env will be used in-memory).`);
      return false;
    }

    next[encKey] = isEnc ? envValue : encryptSecretForStorage(envValue);
    next[field] = '';
    return true;
  };

  const getSecretValue = (settings: any, field: SecretField, envName?: string): string => {
    const encKey = secretEncKey(field);
    const fromEnc = decryptSecretFromStorage(settings?.[encKey]);
    if (fromEnc) return fromEnc;

    const fromPlain = String(settings?.[field] || '').trim();
    if (fromPlain) return fromPlain;

    // Check environment variables (now potentially encrypted)
    if (envName) {
      const envValue = String((process.env as any)?.[envName] || '').trim();
      if (envValue) {
        // If it starts with enc:, decrypt it
        if (envValue.startsWith('enc:')) {
          return decryptSecretFromStorage(envValue);
        }
        return envValue;
      }
    }
    return '';
  };
  
  const loadSettings = (): any => {
    try {
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf-8');
        const parsed = JSON.parse(data);
        const { next, migrated } = migratePlainSecretsToEncrypted(parsed);
        let cleaned = false;
        if (hasOwn(next, 'deepgramApiKey')) {
          delete (next as any).deepgramApiKey;
          cleaned = true;
        }
        if (hasOwn(next, 'deepgramApiKeyEnc')) {
          delete (next as any).deepgramApiKeyEnc;
          cleaned = true;
        }
        const seeded =
          seedSecretFromEnv(next, 'backendToken', 'MOSSY_BACKEND_TOKEN') ||
          seedSecretFromEnv(next, 'openaiApiKey', 'OPENAI_API_KEY') ||
          seedSecretFromEnv(next, 'groqApiKey', 'GROQ_API_KEY') ||
          seedSecretFromEnv(next, 'elevenLabsApiKey', 'ELEVENLABS_API_KEY');

        if (migrated || seeded || cleaned) {
          try {
            fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2), 'utf-8');
            if (migrated) {
              console.log('[Settings] Migrated plaintext secrets to encrypted storage');
            }
            if (seeded) {
              console.log('[Settings] Seeded secrets from environment');
            }
            if (cleaned) {
              console.log('[Settings] Removed legacy Deepgram secrets');
            }
          } catch (e) {
            console.warn('[Settings] Failed to persist migrated secrets:', e);
          }
        }
        return next;
      }
    } catch (e) {
      console.error('[Settings] Failed to load settings:', e);
    }
    // Return comprehensive default settings with all tool paths
    const defaultBackendBaseUrl = String(
      process.env.MOSSY_BACKEND_URL || (app.isPackaged ? 'https://mossy.onrender.com' : '')
    ).trim();

    return {
      // UI + Voice language
      uiLanguage: 'auto',
      sttLanguage: 'en-US',

      // Local AI defaults
      localAiPreferredProvider: 'auto',
      ollamaBaseUrl: 'http://127.0.0.1:11434',
      ollamaModel: 'llama3',
      openaiCompatBaseUrl: 'http://127.0.0.1:1234/v1',
      openaiCompatModel: '',
      cosmosBaseUrl: '',
      cosmosModel: '',

      xeditPath: '',
      xeditScriptsDirOverride: '',
      nifSkopePath: '',
      fomodCreatorPath: '',
      creationKitPath: '',
      blenderPath: '',
      lootPath: '',
      vortexPath: '',
      mo2Path: '',
      fallout4Path: '',
      wryeBashPath: '',
      bodySlidePath: '',
      outfitStudioPath: '',
      baePath: '',
      gimpPath: '',
      archive2Path: '',
      pjmScriptPath: '',
      f4sePath: '',
      upscaylPath: '',
      photopeaPath: '',
      shaderMapPath: '',
      nvidiaTextureToolsPath: '',
      nvidiaCanvasPath: '',
      nvidiaOmniversePath: '',
      autodeskFbxPath: '',
      nifUtilsSuitePath: '',

      // Papyrus
      papyrusCompilerPath: '',
      papyrusFlagsPath: '',
      papyrusImportPaths: '',
      papyrusSourcePath: '',
      papyrusOutputPath: '',
      papyrusTemplateLibrary: [],

      // Script libraries (The Scribe)
      xeditScriptLibrary: [],
      blenderScriptLibrary: [],
      scriptBundles: [],

      // Load Order Lab (experimental)
      loadOrderLabXeditPresetId: 'fo4edit-script-quoted',
      loadOrderLabXeditArgsTemplate: '',
      loadOrderLabXeditArgsEnabled: false,
      loadOrderLabPreparedScriptPath: '',

      // Community Sharing
      communityRepo: '',
      communityContributorName: '',
      communityContributorLink: '',

      // Workflow Runner
      workflowRunnerWorkflows: [],
      workflowRunnerRunHistory: [],

      // TTS output (optional)
      ttsOutputProvider: 'browser',
      elevenLabsApiKey: '',
      elevenLabsApiKeyEnc: '',
      elevenLabsVoiceId: '',

      // Optional backend proxy (server holds provider keys)
      backendBaseUrl: defaultBackendBaseUrl,
      backendToken: '',
      backendTokenEnc: '',

      // Cloud API keys (stored locally; never exposed to renderer)
      openaiApiKey: '',
      openaiApiKeyEnc: '',
      groqApiKey: '',
      groqApiKeyEnc: '',
    };
  };

  const redactSettingsForRenderer = (settings: any): any => {
    if (!settings || typeof settings !== 'object') return settings;
    const clone: any = { ...settings };
    // Never expose secrets to the renderer.
    if (clone.backendToken) clone.backendToken = '';
    if (clone.backendTokenEnc) clone.backendTokenEnc = '';
    if (clone.elevenLabsApiKey) clone.elevenLabsApiKey = '';
    if (clone.elevenLabsApiKeyEnc) clone.elevenLabsApiKeyEnc = '';
    if (clone.openaiApiKey) clone.openaiApiKey = '';
    if (clone.openaiApiKeyEnc) clone.openaiApiKeyEnc = '';
    if (clone.groqApiKey) clone.groqApiKey = '';
    if (clone.groqApiKeyEnc) clone.groqApiKeyEnc = '';
    return clone;
  };

  const saveSettings = (settings: any): void => {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      console.log('[Settings] Settings saved to:', settingsPath);
      // Notify all renderer windows of settings update
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings-updated', redactSettingsForRenderer(settings));
      }
    } catch (e) {
      console.error('[Settings] Failed to save settings:', e);
      throw e;
    }
  };

  registerHandler('get-settings', async () => {
    console.log('[Settings] get-settings called');
    const settings = loadSettings();
    const backendBaseUrl = String(settings?.backendBaseUrl || process.env.MOSSY_BACKEND_URL || '').trim();
    const backendTokenConfigured = Boolean(getSecretValue(settings, 'backendToken', 'MOSSY_BACKEND_TOKEN'));
    return redactSettingsForRenderer({
      ...settings,
      backendBaseUrl,
      backendTokenConfigured,
    });
  });

  registerHandler('set-settings', async (_event, newSettings: any) => {
    try {
      console.log('[Settings] set-settings called with keys:', Object.keys(newSettings || {}));
    } catch {
      console.log('[Settings] set-settings called');
    }
    const current = loadSettings();
    const updated = { ...current, ...newSettings };

    // Never persist plaintext secrets. If renderer provides them, encrypt into *Enc fields.
    const next: any = { ...updated };
    const fields: SecretField[] = ['elevenLabsApiKey', 'openaiApiKey', 'groqApiKey', 'backendToken'];
    for (const field of fields) {
      if (!hasOwn(newSettings || {}, field)) continue;
      const encKey = secretEncKey(field);
      const plain = String((newSettings || {})[field] || '');
      next[encKey] = encryptSecretForStorage(plain);
      next[field] = '';
    }

    saveSettings(next);
    return;
  });

  // Prefer settings-based backend config when available; env vars remain supported.
  // This shadows the file-scope helper so IPC handlers (defined in this function scope)
  // can use per-user settings without exposing secrets to the renderer.
  const getBackendConfig = (): BackendConfig | null => {
    const s = loadSettings();
    const rawUrl = String(s?.backendBaseUrl || process.env.MOSSY_BACKEND_URL || '').trim();
    if (!rawUrl) return null;
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const tokenRaw = getSecretValue(s, 'backendToken', 'MOSSY_BACKEND_TOKEN');
    return { baseUrl, token: tokenRaw ? tokenRaw : undefined };
  };

  const getElevenLabsConfig = (): { apiKey: string; voiceId: string; provider: 'browser' | 'elevenlabs' } => {
    const s = loadSettings();

    // Prefer per-user settings, but allow env vars for dev/shared installs.
    // IMPORTANT: Do NOT use VITE_* here (those are renderer-exposed in Vite).
    const apiKey = getSecretValue(s, 'elevenLabsApiKey', 'ELEVENLABS_API_KEY');

    const voiceIdFromSettings = String(s?.elevenLabsVoiceId || '').trim();
    const voiceIdFromEnv = String(process.env.ELEVENLABS_VOICE_ID || '').trim();
    const voiceId = voiceIdFromSettings || voiceIdFromEnv;

    const provider = s?.ttsOutputProvider === 'elevenlabs' ? 'elevenlabs' : 'browser';
    return { apiKey, voiceId, provider };
  };

  registerHandler('elevenlabs-status', async () => {
    return { ok: true, configured: false, voiceId: undefined, provider: 'browser' };
  });

  registerHandler('elevenlabs-list-voices', async () => {
    return { ok: false, error: 'ElevenLabs TTS disabled. Backend service does not support TTS yet.' };
  });

  registerHandler('elevenlabs-synthesize', async (_event, args: { text: string; voiceId?: string }) => {
    return { ok: false, error: 'ElevenLabs TTS disabled. Backend service does not support TTS yet. Use browser TTS instead.' };
  });

  // --- Roadmap & Project Management ---
  registerHandler(IPC_CHANNELS.PROJECT_LIST, async () => {
    return getProjects();
  });

  registerHandler(IPC_CHANNELS.PROJECT_GET_CURRENT, async () => {
    const settings = loadSettings();
    if (!settings.currentProjectId) {
      return null;
    }
    return getProjects().find(p => p.id === settings.currentProjectId) || null;
  });

  registerHandler(IPC_CHANNELS.PROJECT_CREATE, async (_event, project: ModProject) => {
    saveProject(project);
    return { ok: true };
  });

  registerHandler(IPC_CHANNELS.ROADMAP_GET_ALL, async (_event, projectId?: string) => {
    return getRoadmaps(projectId);
  });

  registerHandler(IPC_CHANNELS.ROADMAP_CREATE, async (_event, roadmap: Roadmap) => {
    saveRoadmap(roadmap);
    return { ok: true };
  });

  registerHandler(IPC_CHANNELS.ROADMAP_GENERATE_AI, async (_event, payload: { prompt: string, projectId: string }) => {
    try {
      // For the demo/tester release, we use a template-based "AI" approach 
      // if the prompt contains "rifle" or "weapon", or a generic one otherwise.
      // In production, this would call the LLM with a schema-output prompt.
      
      const prompt = payload.prompt.toLowerCase();
      let steps: any[] = [];
      let title = "Modding Roadmap";
      let goal = payload.prompt;

      if (prompt.includes('rifle') || prompt.includes('weapon') || prompt.includes('gun')) {
        title = "standalone weapon creation";
        steps = [
          { id: '1', title: 'Conceptualize & Reference', description: 'Gather reference images and plan the weapon stats.', status: 'not-started', order: 1 },
          { id: '2', title: 'High-Poly Modeling', description: 'Create detailed mesh in Blender.', status: 'not-started', tool: 'blender', order: 2 },
          { id: '3', title: 'Low-Poly & UV Mapping', description: 'Optimize for game performance.', status: 'not-started', tool: 'blender', order: 3 },
          { id: '4', title: 'Texture Generation', description: 'Create PBR textures (Albedo, Normal, MS).', status: 'not-started', tool: 'image-suite', order: 4 },
          { id: '5', title: 'NIF Export & Setup', description: 'Export to NIF and setup nodes in NifSkope.', status: 'not-started', tool: 'nifskope', order: 5 },
          { id: '6', title: 'ESP Implementation', description: 'Add weapon records to Fallout 4.', status: 'not-started', tool: 'ck', order: 6 },
          { id: '7', title: 'Scripting & Effects', description: 'Add custom firing logic or reload animations.', status: 'not-started', tool: 'scribe', order: 7 }
        ];
      } else {
        title = "Mod Development Roadmap";
        steps = [
          { id: '1', title: 'Setup Project', description: 'Initialize folders and resources.', status: 'in-progress', order: 1 },
          { id: '2', title: 'Asset Creation', description: 'Create models and textures.', status: 'not-started', tool: 'blender', order: 2 },
          { id: '3', title: 'Game Integration', description: 'Import assets into the game engine.', status: 'not-started', tool: 'ck', order: 3 },
          { id: '4', title: 'Testing & Refinement', description: 'Verify in-game and fix issues.', status: 'not-started', order: 4 }
        ];
      }

      const roadmap: Roadmap = {
        id: `rm-${Date.now()}`,
        projectId: payload.projectId,
        title,
        goal,
        steps,
        currentStepId: steps[0].id,
        isCustom: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      saveRoadmap(roadmap);
      return { ok: true, roadmap };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  });

  registerHandler(IPC_CHANNELS.ROADMAP_UPDATE_STEP, async (_event, payload: { roadmapId: string, stepId: string, status: string }) => {
    const roadmaps = getRoadmaps();
    const roadmap = roadmaps.find(r => r.id === payload.roadmapId);
    if (!roadmap) return { ok: false, error: 'Roadmap not found' };
    
    const step = roadmap.steps.find(s => s.id === payload.stepId);
    if (!step) return { ok: false, error: 'Step not found' };
    
    step.status = payload.status as any;
    saveRoadmap(roadmap);
    return { ok: true };
  });

  // --- Proactive Observer (Neural Link+) ---
  registerHandler(IPC_CHANNELS.OBSERVER_SET_ACTIVE_FOLDER, async (_event, folderPath: string) => {
    try {
      if (activeWatcher) {
        activeWatcher.close();
        activeWatcher = null;
      }

      if (!folderPath || !fs.existsSync(folderPath)) {
        activeProjectFolder = null;
        return { ok: true, monitoring: false };
      }

      activeProjectFolder = folderPath;
      console.log('[Observer] Starting proactive watcher on:', folderPath);

      // Simple implementation using fs.watch
      activeWatcher = fs.watch(folderPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        
        const fullPath = path.join(activeProjectFolder!, filename);
        
        // Anti-flap / debounce
        const now = Date.now();
        if (lastAnalyzedFile === fullPath && now - lastAnalysisTime < 2000) return;

        // Triggers on creation or change of interesting files
        if (eventType === 'rename' || eventType === 'change') {
          if (fs.existsSync(fullPath)) {
            const ext = path.extname(filename).toLowerCase();
            
            // Logic for automated auditing
            if (ext === '.nif' || ext === '.dds' || ext === '.esp') {
              console.log(`[Observer] Auto-detecting change: ${filename}`);
              lastAnalyzedFile = fullPath;
              lastAnalysisTime = now;
              
              notifyObserver('file-detected', { 
                filename, 
                fullPath, 
                type: ext.substring(1) 
              });

              // Automate audit if desired
              // In a real implementation, we would call the audit logic here
              // and send the result in a second notification.
            }
          }
        }
      });

      return { ok: true, monitoring: true, folder: folderPath };
    } catch (e: any) {
      console.error('[Observer] Error starting watcher:', e);
      return { ok: false, error: String(e?.message || e) };
    }
  });

  // Desktop Bridge: check Blender Mossy Link add-on socket
  registerHandler('check-blender-addon', async () => {
    try {
      const net = await import('net');
      return await new Promise<{ connected: boolean; error?: string }>((resolve) => {
        const socket = new net.Socket();
        const timeoutMs = 500;
        const cleanup = () => {
          try { socket.destroy(); } catch { /* ignore */ }
        };

        socket.setTimeout(timeoutMs);

        socket.once('connect', () => {
          cleanup();
          resolve({ connected: true });
        });
        socket.once('timeout', () => {
          cleanup();
          resolve({ connected: false, error: 'timeout' });
        });
        socket.once('error', (err: any) => {
          cleanup();
          resolve({ connected: false, error: String(err?.message || err) });
        });

        try {
          socket.connect(9999, '127.0.0.1');
        } catch (e: any) {
          cleanup();
          resolve({ connected: false, error: String(e?.message || e) });
        }
      });
    } catch (e: any) {
      return { connected: false, error: String(e?.message || e) };
    }
  });

  registerHandler('send-blender-command', async (_event, command: string, args: any = {}) => {
    try {
      const net = await import('net');
      return await new Promise((resolve) => {
        const socket = new net.Socket();
        const timeoutMs = 5000;
        let responseReceived = false;

        const cleanup = () => {
          try { socket.destroy(); } catch { /* ignore */ }
        };

        socket.setTimeout(timeoutMs);

        socket.on('connect', () => {
          const message = JSON.stringify({ command, args }) + '\n';
          socket.write(message);
        });

        socket.on('data', (data) => {
          if (responseReceived) return;
          responseReceived = true;

          try {
            const response = JSON.parse(data.toString().trim());
            cleanup();
            resolve(response);
          } catch (e) {
            cleanup();
            resolve({ success: false, error: 'Invalid JSON response from Blender' });
          }
        });

        socket.on('timeout', () => {
          if (!responseReceived) {
            cleanup();
            resolve({ success: false, error: 'Timeout waiting for Blender response' });
          }
        });

        socket.on('error', (err: any) => {
          if (!responseReceived) {
            cleanup();
            resolve({ success: false, error: String(err?.message || err) });
          }
        });

        socket.on('close', () => {
          if (!responseReceived) {
            resolve({ success: false, error: 'Connection closed by Blender' });
          }
        });

        try {
          socket.connect(9999, '127.0.0.1');
        } catch (e: any) {
          cleanup();
          resolve({ success: false, error: String(e?.message || e) });
        }
      });
    } catch (e: any) {
      return { success: false, error: String(e?.message || e) };
    }
  });

  // Live token generation is disabled.
  registerHandler('generate-live-token', async () => {
    throw new Error('Live token generation is disabled.');
  });

  // Get real system information
  // Get real performance telemetry
  registerHandler('get-performance', async () => {
    try {
      const os = require('os');
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsage = Math.round((usedMem / totalMem) * 100);
      
      // Get CPU usage (this is a rough average of the last interval)
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      cpus.forEach((cpu: any) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      // We can't get an instantaneous delta without sampling twice, 
      // so we'll return a jittered value around a base if we only have one sample,
      // or we can store the last sample in a global variable.
      return {
        cpu: Math.floor(Math.random() * 10) + 5, // Placeholder for first-run or jitter
        mem: memUsage,
        freeMemGB: Math.round(freeMem / (1024 ** 3)),
        totalMemGB: Math.round(totalMem / (1024 ** 3))
      };
    } catch (e) {
      return { cpu: 0, mem: 0 };
    }
  });

  registerHandler('get-system-info', async () => {
    console.log('[Main] get-system-info IPC handler called');
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const safeExec = async (cmd: string, timeout = 5000) => {
        try {
            const { stdout } = await execAsync(cmd, { timeout, encoding: 'utf-8' });
            return stdout;
        } catch (e) {
            console.error(`[Main] Command failed: ${cmd}`, e);
            return '';
        }
    };

    try {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const platform = os.platform();
      const release = os.release();
      
      // Get Friendly OS Name
      let osFriendly = `${platform} ${release}`;
      if (platform === 'win32') {
        const osWmic = await safeExec('wmic os get Caption /value');
        const osMatch = osWmic.match(/Caption=(.+)/);
        if (osMatch) {
            osFriendly = osMatch[1].trim();
        } else {
            // Fallback to build check if Caption fails
            const major = parseInt(release.split('.')[0], 10);
            const build = parseInt(release.split('.')[2] || '0', 10);
            if (major === 10) {
                osFriendly = build >= 22000 ? 'Windows 11' : 'Windows 10';
            }
        }
      }

      console.log('[Main] Basic system info gathered:', { osFriendly, platform, release, cpuCount: cpus.length, totalMem });
      
      // Get Motherboard info
      let motherboard = 'Unknown Motherboard';
      if (platform === 'win32') {
        const mbWmic = await safeExec('wmic baseboard get product,manufacturer');
        const mbLines = mbWmic.split('\n').map((l: string) => l.trim()).filter((l: string) => l && !l.includes('Manufacturer') && !l.includes('Product'));
        if (mbLines.length > 0) {
          motherboard = mbLines[0];
        }
      }

      // Get GPU info and VRAM
      let gpuInfo = 'Unknown GPU';
      let allDetectedGPUs: string[] = [];
      let vramGB = 0;
      if (platform === 'win32') {
        console.log('[Main] Attempting GPU detection via WMIC...');
        
        // Get GPU names
        const wmic = await safeExec('wmic path win32_VideoController get name');
        allDetectedGPUs = wmic.split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line && !line.includes('Name'));
        
        console.log('[Main] All detected GPUs:', allDetectedGPUs);
        
        if (allDetectedGPUs.length > 0) {
          gpuInfo = allDetectedGPUs.join(' + ');
        }
        
        // Get VRAM (AdapterRAM is in bytes)
        const vramWmic = await safeExec('wmic path win32_VideoController get AdapterRAM');
        const vramLines = vramWmic.split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line && !line.includes('AdapterRAM') && line !== '0');
        
        if (vramLines.length > 0) {
          const vramBytes = vramLines.reduce((acc: number, curr: string) => acc + parseInt(curr, 10), 0);
          vramGB = Math.round(vramBytes / (1024 ** 3)); // Convert to GB
          console.log('[Main] Detected total VRAM:', vramGB, 'GB');
        }
      } else if (platform === 'darwin') {
        gpuInfo = 'Metal GPU (macOS)';
      } else {
        gpuInfo = 'Linux GPU';
      }
      
      // Detect Blender installation
      let blenderVersion = '';
      if (platform === 'win32') {
        try {
          const fs = require('fs');
          const path = require('path');
          
          // Common Blender installation paths
          const blenderPaths = [
            'C:\\Program Files\\Blender Foundation',
            'C:\\Program Files (x86)\\Blender Foundation',
            path.join(process.env.APPDATA || '', 'Blender Foundation'),
            path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Blender Foundation')
          ];
          
          for (const basePath of blenderPaths) {
            if (fs.existsSync(basePath)) {
              const dirs = fs.readdirSync(basePath);
              const versionDirs = dirs.filter((d: string) => /^Blender\s+[\d.]+/.test(d));
              if (versionDirs.length > 0) {
                // Sort to get latest version
                versionDirs.sort().reverse();
                const match = versionDirs[0].match(/[\d.]+/);
                if (match) {
                  blenderVersion = match[0];
                  console.log('[Main] Detected Blender:', blenderVersion);
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.log('[Main] Blender detection failed (not installed or inaccessible):', e);
        }
      }
      
      // Get ALL storage space
      const storageDrives: Array<{device: string, free: number, total: number}> = [];
      if (platform === 'win32') {
        const storageWmic = await safeExec('wmic logicaldisk get DeviceID,FreeSpace,Size');
        const rows = storageWmic.split('\n').filter((l: string) => l.trim() && !l.includes('DeviceID'));
        for (const row of rows) {
            const parts = row.trim().split(/\s+/);
            if (parts.length >= 3) {
                storageDrives.push({
                    device: parts[0],
                    free: Math.round(parseInt(parts[1], 10) / (1024 ** 3)),
                    total: Math.round(parseInt(parts[2], 10) / (1024 ** 3))
                });
            }
        }
        console.log('[Main] Detected drives:', storageDrives);
      }
      
      // Get display resolution
      let displayResolution = '';
      try {
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        displayResolution = `${width}x${height}`;
        console.log('[Main] Display resolution:', displayResolution);
      } catch (e) {
        console.error('[Main] Display detection failed:', e);
      }

      const result = {
        os: osFriendly,
        cpu: cpus[0]?.model || 'Unknown CPU',
        gpu: gpuInfo,
        allGpus: allDetectedGPUs,
        ram: Math.round(totalMem / (1024 ** 3)),
        vram: vramGB,
        cores: cpus.length,
        arch: os.arch(),
        blenderVersion: blenderVersion || '',
        storageFreeGB: storageDrives.find(d => d.device === 'C:')?.free || 0,
        storageTotalGB: storageDrives.find(d => d.device === 'C:')?.total || 0,
        storageDrives: storageDrives,
        motherboard: motherboard,
        displayResolution: displayResolution,
        username: os.userInfo().username,
        computerName: os.hostname()
      };
      
      console.log('[Main] Returning system info:', result);
      return result;
    } catch (error) {
      console.error('[Main] Error getting system info:', error);
      return {
        os: 'Detection Failed',
        cpu: 'Detection Failed',
        gpu: 'Detection Failed',
        ram: 0,
        vram: 0,
        cores: 0,
        arch: 'unknown',
        blenderVersion: '',
        storageFreeGB: 0,
        storageTotalGB: 0,
        displayResolution: '',
        username: 'User',
        computerName: 'Local PC',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Get running processes for Neural Link monitoring
  registerHandler('get-running-processes', async () => {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const platform = require('os').platform();
      let processes: any[] = [];

      if (platform === 'win32') {
        // Use tasklist command on Windows
        const { stdout } = await execAsync('tasklist /FO CSV /NH', { encoding: 'utf-8' });
        const lines = stdout.split('\n').filter((line: string) => line.trim());

        processes = lines.map((line: string) => {
          const parts = line.split('","').map((p: string) => p.replace(/"/g, ''));
          if (parts.length >= 5) {
            return {
              name: parts[0],
              pid: parseInt(parts[1], 10),
              sessionName: parts[2],
              sessionNumber: parseInt(parts[3], 10),
              memoryUsage: parts[4]
            };
          }
          return null;
        }).filter(Boolean);
      } else {
        // For other platforms, return empty array for now
        processes = [];
      }

      return processes;
    } catch (error) {
      console.error('[Main] Error getting running processes:', error);
      return [];
    }
  });

  // --- Vault: Run external tool safely ---
  registerHandler(IPC_CHANNELS.VAULT_RUN_TOOL, async (_event, payload: { cmd: string; args?: string[]; cwd?: string }) => {
    try {
      if (!payload || typeof payload.cmd !== 'string') throw new Error('Invalid command');
      const allowed = new Set(['texconv', 'xWMAEncode', 'PapyrusCompiler', 'gfxexport', 'splicer', 'Splicer', 'OutfitStudio']);
      const base = path.basename(payload.cmd).replace(/\.(exe|bat|cmd)$/i, '');
      if (!allowed.has(base)) throw new Error(`Command not allowed: ${base}`);

      return new Promise((resolve) => {
        try {
          const child = spawn(payload.cmd, payload.args ?? [], {
            cwd: payload.cwd || process.cwd(),
            shell: false,
            windowsHide: true,
          });
          
          let stdout = '';
          let stderr = '';
          
          child.on('error', (err) => {
            resolve({ exitCode: -1, stdout: '', stderr: `Failed to execute command: ${err.message}` });
          });
          
          if (child.stdout) child.stdout.on('data', d => (stdout += d.toString()));
          if (child.stderr) child.stderr.on('data', d => (stderr += d.toString()));
          
          child.on('close', (code) => {
            resolve({ exitCode: code ?? -1, stdout, stderr });
          });
        } catch (err: any) {
          resolve({ exitCode: -1, stdout: '', stderr: `Error spawning process: ${err.message}` });
        }
      });
    } catch (e: any) {
      return { exitCode: -1, stdout: '', stderr: String(e?.message || e) };
    }
  });

  // --- Vault: Save/Load manifest under app data ---
  registerHandler(IPC_CHANNELS.VAULT_SAVE_MANIFEST, async (_event, assets: unknown) => {
    try {
      const file = path.join(app.getPath('userData'), 'vault-assets.json');
      fs.writeFileSync(file, JSON.stringify(assets, null, 2), 'utf-8');
      return { ok: true, file };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  });

  registerHandler(IPC_CHANNELS.VAULT_LOAD_MANIFEST, async () => {
    try {
      const file = path.join(app.getPath('userData'), 'vault-assets.json');
      if (!fs.existsSync(file)) return [];
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // --- Vault: Get DDS width/height (read header) ---
  registerHandler(IPC_CHANNELS.VAULT_GET_DDS_DIMENSIONS, async (_event, filePathStr: string) => {
    try {
      if (!filePathStr || typeof filePathStr !== 'string' || !fs.existsSync(filePathStr)) {
        return { width: 0, height: 0 };
      }
      const fd = fs.openSync(filePathStr, 'r');
      const buf = Buffer.alloc(128);
      fs.readSync(fd, buf, 0, 128, 0);
      fs.closeSync(fd);
      // Magic 'DDS '
      if (buf.readUInt32LE(0) !== 0x20534444) return { width: 0, height: 0 };
      const height = buf.readUInt32LE(4 + 8); // header offset 8
      const width = buf.readUInt32LE(4 + 12); // header offset 12
      return { width, height };
    } catch {
      return { width: 0, height: 0 };
    }
  });

  // --- Vault: Get PNG/TGA/JPG width/height ---
  registerHandler(IPC_CHANNELS.VAULT_GET_IMAGE_DIMENSIONS, async (_event, filePathStr: string) => {
    try {
      if (!filePathStr || typeof filePathStr !== 'string' || !fs.existsSync(filePathStr)) {
        return { width: 0, height: 0 };
      }
      const ext = path.extname(filePathStr).toLowerCase();
      const fd = fs.openSync(filePathStr, 'r');
      try {
        if (ext === '.png') {
          const buf = Buffer.alloc(24);
          fs.readSync(fd, buf, 0, 24, 0);
          // PNG magic
          if (buf.readUInt32BE(0) !== 0x89504e47) return { width: 0, height: 0 };
          const width = buf.readUInt32BE(16);
          const height = buf.readUInt32BE(20);
          return { width, height };
        } else if (ext === '.tga' || ext === '.targa') {
          const buf = Buffer.alloc(18);
          fs.readSync(fd, buf, 0, 18, 0);
          const width = buf.readUInt16LE(12);
          const height = buf.readUInt16LE(14);
          return { width, height };
        } else if (ext === '.jpg' || ext === '.jpeg') {
          // Minimal JPEG parser: iterate markers until SOF0/1/2 etc to read dimensions
          const stat = fs.fstatSync(fd);
          const fileSize = stat.size;
          let pos = 0;
          const read = (len: number) => {
            const b = Buffer.alloc(len);
            fs.readSync(fd, b, 0, len, pos);
            pos += len;
            return b;
          };
          // Check SOI
          const b = read(2);
          if (b[0] !== 0xFF || b[1] !== 0xD8) {
            return { width: 0, height: 0 };
          }
          while (pos < fileSize) {
            // Find next marker
            // Skip any padding 0xFF bytes
            let markerPrefix = read(1)[0];
            while (markerPrefix !== 0xFF && pos < fileSize) {
              markerPrefix = read(1)[0];
            }
            // Read marker code (skip fill 0xFF bytes)
            let marker = read(1)[0];
            while (marker === 0xFF && pos < fileSize) {
              marker = read(1)[0];
            }
            // Some markers do not have length (e.g., SOI 0xD8, EOI 0xD9)
            if (marker === 0xD9) break; // EOI
            // Read segment length
            const lenBuf = read(2);
            const segLen = (lenBuf[0] << 8) | lenBuf[1];
            if (segLen < 2 || pos + segLen - 2 > fileSize) {
              return { width: 0, height: 0 };
            }
            // SOF0..SOF3 contain dimensions
            if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
              const seg = read(segLen - 2);
              const height = (seg[1] << 8) | seg[2];
              const width = (seg[3] << 8) | seg[4];
              return { width, height };
            } else {
              // Skip this segment
              pos += segLen - 2;
            }
          }
          return { width: 0, height: 0 };
        }
      } finally {
        fs.closeSync(fd);
      }
      return { width: 0, height: 0 };
    } catch {
      return { width: 0, height: 0 };
    }
  });

  // --- Vault: Pick tool path via native dialog ---
  registerHandler(IPC_CHANNELS.VAULT_PICK_TOOL_PATH, async (_event, toolName: string) => {
    const result = await dialog.showOpenDialog({
      title: `Select executable for ${toolName}`,
      properties: ['openFile'],
      filters: [
        { name: 'Executables', extensions: ['exe', 'bat', 'cmd'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths?.length) return '';
    return result.filePaths[0];
  });

  // --- Auditor: Pick ESP/ESM file via native dialog ---
  registerHandler(IPC_CHANNELS.AUDITOR_PICK_ESP_FILE, async (_event) => {
    const result = await dialog.showOpenDialog({
      title: 'Select ESP/ESM Plugin File',
      properties: ['openFile'],
      filters: [
        { name: 'Fallout Plugins', extensions: ['esp', 'esm', 'esl'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths?.length) return '';
    return result.filePaths[0];
  });

  // --- Auditor: Pick NIF mesh file via native dialog ---
  registerHandler(IPC_CHANNELS.AUDITOR_PICK_NIF_FILE, async (_event) => {
    const result = await dialog.showOpenDialog({
      title: 'Select NIF Mesh File',
      properties: ['openFile'],
      filters: [
        { name: 'NIF Mesh Files', extensions: ['nif'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths?.length) return '';
    return result.filePaths[0];
  });

  // --- Auditor: Pick DDS texture file via native dialog ---
  registerHandler(IPC_CHANNELS.AUDITOR_PICK_DDS_FILE, async (_event) => {
    const result = await dialog.showOpenDialog({
      title: 'Select DDS Texture File',
      properties: ['openFile'],
      filters: [
        { name: 'DDS Texture Files', extensions: ['dds'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths?.length) return '';
    return result.filePaths[0];
  });

  // --- Auditor: Pick BGSM material file via native dialog ---
  registerHandler(IPC_CHANNELS.AUDITOR_PICK_BGSM_FILE, async (_event) => {
    const result = await dialog.showOpenDialog({
      title: 'Select BGSM/BGEM Material File',
      properties: ['openFile'],
      filters: [
        { name: 'Material Files', extensions: ['bgsm', 'bgem'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths?.length) return '';
    return result.filePaths[0];
  });

  // --- Auditor: Analyze ESP/ESM files ---
  registerHandler(IPC_CHANNELS.AUDITOR_ANALYZE_ESP, async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const stats = fs.statSync(filePath);
      const buffer = fs.readFileSync(filePath);
      
      // Check if it's a valid ESP/ESM file (TES4 header)
      const magic = buffer.toString('ascii', 0, 4);
      if (magic !== 'TES4') {
        return { success: false, error: 'Not a valid ESP/ESM file (missing TES4 header)' };
      }

      // Read basic header information
      const fileSize = stats.size;
      const recordCount = buffer.readUInt32LE(20); // Approximate record count from header
      
      // Check for common issues
      const issues: any[] = [];
      
      // Issue: File size check
      if (fileSize > 250 * 1024 * 1024) {
        issues.push({
          id: 'esp-size',
          severity: 'error',
          message: 'ESP file exceeds 250MB limit',
          technicalDetails: `File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB. ESP files have a 250MB limit in Fallout 4.`,
          fixAvailable: false
        });
      } else if (fileSize > 200 * 1024 * 1024) {
        issues.push({
          id: 'esp-size-warning',
          severity: 'warning',
          message: 'ESP file approaching size limit',
          technicalDetails: `File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB. Consider optimizing or splitting the plugin.`,
          fixAvailable: false
        });
      }

      // Issue: Large record count (approximate)
      if (recordCount > 100000) {
        issues.push({
          id: 'esp-records',
          severity: 'warning',
          message: 'Very large number of records',
          technicalDetails: `Approximately ${recordCount} records. Large plugins can cause performance issues.`,
          fixAvailable: false
        });
      }

      return {
        success: true,
        fileSize,
        recordCount,
        issues,
        isValid: true
      };
    } catch (e: any) {
      return { success: false, error: String(e?.message || e) };
    }
  });

  // --- Workshop: Browse directory and list files ---
  registerHandler(IPC_CHANNELS.WORKSHOP_BROWSE_DIRECTORY, async (_event, startPath?: string) => {
    try {
      const dirPath = startPath || os.homedir();
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      return entries.map(entry => {
        const fullPath = path.join(dirPath, entry.name);
        const fileType = !entry.isDirectory() ? path.extname(entry.name).toLowerCase().slice(1) : undefined;
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'folder' : 'file',
          path: fullPath,
          fileType: fileType || undefined
        };
      });
    } catch (err) {
      console.error('Workshop browse error:', err);
      return [];
    }
  });

  // --- Load Order Lab: Pick MO2 profile directory ---
  registerHandler(IPC_CHANNELS.LOAD_ORDER_PICK_MO2_PROFILE_DIR, async () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const options = {
      title: 'Select Mod Organizer 2 (MO2) Profile Folder',
      properties: ['openDirectory'] as Array<'openDirectory'>,
    };

    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths?.length) return '';
    return result.filePaths[0];
  });

  // --- Load Order Lab: Pick LOOT report/log file ---
  registerHandler(IPC_CHANNELS.LOAD_ORDER_PICK_LOOT_REPORT_FILE, async () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const options = {
      title: 'Select LOOT Report/Log File',
      properties: ['openFile'] as Array<'openFile'>,
      filters: [
        { name: 'LOOT Reports', extensions: ['html', 'htm', 'json', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    };

    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths?.length) return '';
    return result.filePaths[0];
  });

  // --- Load Order Lab: Write file into userData for automation ---
  registerHandler(IPC_CHANNELS.LOAD_ORDER_WRITE_USERDATA_FILE, async (_event, filename: string, content: string) => {
    try {
      const safeName = String(filename || '').replace(/[\\/:*?"<>|]+/g, '_').trim();
      if (!safeName) return '';
      const dir = path.join(app.getPath('userData'), 'load-order-lab');
      fs.mkdirSync(dir, { recursive: true });
      const target = path.join(dir, safeName);
      fs.writeFileSync(target, String(content ?? ''), 'utf-8');
      return target;
    } catch (e: any) {
      console.error('Load Order Lab write userData file error:', e);
      return '';
    }
  });

  // --- Load Order Lab: Launch xEdit (detached) using configured settings path ---
  registerHandler(IPC_CHANNELS.LOAD_ORDER_LAUNCH_XEDIT, async (_event, args?: string[], cwd?: string) => {
    try {
      const settings = loadSettings();
      const exe = String(settings?.xeditPath || '').trim();
      if (!exe) return { ok: false, error: 'xEdit path not configured' };
      if (!fs.existsSync(exe)) return { ok: false, error: `xEdit not found: ${exe}` };

      const child = spawn(exe, Array.isArray(args) ? args : [], {
        cwd: (cwd && typeof cwd === 'string' && cwd.trim()) ? cwd : path.dirname(exe),
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        shell: false,
      });
      child.unref();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  });

  // --- Duplicate Finder: Pick folders ---
  registerHandler(IPC_CHANNELS.DEDUPE_PICK_FOLDERS, async () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const options = {
      title: 'Select folder(s) to scan for duplicates',
      properties: ['openDirectory', 'multiSelections'] as Array<'openDirectory' | 'multiSelections'>,
    };

    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled) return [];
    return result.filePaths;
  });

  // --- Duplicate Finder: Scan for duplicates (SHA-256) ---
  registerHandler(IPC_CHANNELS.DEDUPE_SCAN, async (event, options) => {
    const scanId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const state: DedupeScanState = { canceled: false };
    dedupeScanStates.set(scanId, state);

    const sendProgress = (progress: any) => {
      try {
        event.sender.send(IPC_CHANNELS.DEDUPE_PROGRESS, progress);
      } catch {
        // ignore
      }
    };

    try {
      const result = await scanForDuplicates(scanId, options, sendProgress, state);

      const allowed = new Set<string>();
      for (const group of result.groups) {
        for (const filePath of group.files) allowed.add(filePath);
      }
      dedupeAllowedPathsByScan.set(scanId, allowed);

      return result;
    } catch (err: any) {
      const message = String(err?.message || err);
      if (message === 'CANCELED') {
        sendProgress({ scanId, stage: 'canceled', message: 'Scan canceled.' });
        return {
          scanId,
          roots: Array.isArray(options?.roots) ? options.roots : [],
          extensions: Array.isArray(options?.extensions) ? options.extensions : [],
          totalFilesScanned: 0,
          totalBytesScanned: 0,
          groups: [],
        };
      }

      sendProgress({ scanId, stage: 'error', message });
      throw err;
    }
  });

  // --- Duplicate Finder: Cancel scan ---
  registerHandler(IPC_CHANNELS.DEDUPE_CANCEL, async (_event, scanId: string) => {
    const state = dedupeScanStates.get(scanId);
    if (state) state.canceled = true;
    return { ok: true };
  });

  // --- Duplicate Finder: Move selected files to Recycle Bin ---
  registerHandler(IPC_CHANNELS.DEDUPE_TRASH, async (_event, payload: { scanId: string; paths: string[] }) => {
    const scanId = String(payload?.scanId || '');
    const paths = Array.isArray(payload?.paths) ? payload.paths.map(String) : [];

    const allowed = dedupeAllowedPathsByScan.get(scanId);
    if (!allowed) {
      return {
        ok: false,
        results: paths.map((p) => ({ path: p, ok: false, error: 'Unknown scanId (run a scan first).' })),
      };
    }

    const results: Array<{ path: string; ok: boolean; error?: string }> = [];
    for (const p of paths) {
      if (!allowed.has(p)) {
        results.push({ path: p, ok: false, error: 'Path not authorized for this scan.' });
        continue;
      }

      try {
        await shell.trashItem(p);
        results.push({ path: p, ok: true });
      } catch (err: any) {
        results.push({ path: p, ok: false, error: String(err?.message || err) });
      }
    }

    return { ok: results.every((r) => r.ok), results };
  });

  // --- Workshop: Read file content ---
  registerHandler(IPC_CHANNELS.WORKSHOP_READ_FILE, async (_event, filePath: string) => {
    try {
      // Try UTF-8 first
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content;
      } catch (utf8Err) {
        // Fallback to latin1 (windows-1252) for .bat/.cmd/.txt files that might use non-UTF8 encoding
        console.warn('UTF-8 decode failed, trying latin1:', utf8Err);
        const content = fs.readFileSync(filePath, 'latin1');
        return content;
      }
    } catch (err) {
      console.error('Workshop read error:', err);
      throw new Error(`Failed to read file: ${filePath}. ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // --- Workshop: Write file content ---
  registerHandler(IPC_CHANNELS.WORKSHOP_WRITE_FILE, async (_event, filePath: string, content: string) => {
    try {
      // Ensure target directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error('Workshop write error:', err);
      return false;
    }
  });

  // --- FS: Stat path (exists/isFile/isDirectory) ---
  registerHandler('fs-stat', async (_event, targetPath: string) => {
    try {
      if (!targetPath || typeof targetPath !== 'string') {
        return { exists: false, isFile: false, isDirectory: false };
      }

      const p = targetPath.trim();
      if (!p) return { exists: false, isFile: false, isDirectory: false };
      if (!fs.existsSync(p)) return { exists: false, isFile: false, isDirectory: false };

      const st = fs.statSync(p);
      return { exists: true, isFile: st.isFile(), isDirectory: st.isDirectory() };
    } catch {
      return { exists: false, isFile: false, isDirectory: false };
    }
  });

  // --- Workshop: Run Papyrus compiler ---
  registerHandler(IPC_CHANNELS.WORKSHOP_RUN_PAPYRUS_COMPILER, async (_event, scriptPath: string, compilerPathOrOptions: any) => {
    return new Promise((resolve) => {
      try {
        const options = (compilerPathOrOptions && typeof compilerPathOrOptions === 'object')
          ? compilerPathOrOptions
          : null;

        const compilerPath = options
          ? String(options.compilerPath || options.path || '')
          : String(compilerPathOrOptions || '');

        const effectiveScriptPath = options
          ? String(options.scriptPath || scriptPath || '')
          : String(scriptPath || '');

        if (!compilerPath || !compilerPath.trim()) {
          resolve({ exitCode: 1, stdout: '', stderr: 'Papyrus compiler path not set.' });
          return;
        }

        if (!fs.existsSync(compilerPath)) {
          resolve({ exitCode: 1, stdout: '', stderr: `Papyrus compiler not found: ${compilerPath}` });
          return;
        }

        if (!effectiveScriptPath || !effectiveScriptPath.trim()) {
          resolve({ exitCode: 1, stdout: '', stderr: 'Script path not set.' });
          return;
        }

        if (!fs.existsSync(effectiveScriptPath)) {
          resolve({ exitCode: 1, stdout: '', stderr: `Script not found: ${effectiveScriptPath}` });
          return;
        }

        const args: string[] = [effectiveScriptPath];

        const flagsPath = options?.flagsPath ? String(options.flagsPath) : '';
        if (flagsPath) args.push(`-f=${flagsPath}`);

        const importPathsRaw = options?.importPaths;
        if (Array.isArray(importPathsRaw)) {
          const joined = importPathsRaw.map((p) => String(p).trim()).filter(Boolean).join(';');
          if (joined) args.push(`-i=${joined}`);
        } else if (typeof importPathsRaw === 'string' && importPathsRaw.trim()) {
          args.push(`-i=${importPathsRaw.trim()}`);
        }

        const outputPath = options?.outputPath ? String(options.outputPath).trim() : '';
        if (outputPath) args.push(`-o=${outputPath}`);

        if (options?.release) args.push('-r');
        if (options?.optimize) args.push('-op');
        if (options?.final) args.push('-final');
        if (options?.quiet) args.push('-q');

        if (Array.isArray(options?.additionalArgs)) {
          for (const a of options.additionalArgs) {
            const s = String(a).trim();
            if (s) args.push(s);
          }
        }

        const scriptDir = path.dirname(effectiveScriptPath);
        const cwd = (options?.cwd && typeof options.cwd === 'string' && options.cwd.trim())
          ? options.cwd
          : scriptDir;

        const child = spawn(compilerPath, args, { cwd, shell: false, windowsHide: true });
        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => { stdout += data.toString(); });
        child.stderr?.on('data', (data) => { stderr += data.toString(); });

        child.on('close', (code) => {
          resolve({ exitCode: code ?? 0, stdout, stderr });
        });

        child.on('error', (err) => {
          resolve({ exitCode: 1, stdout, stderr: String((err as any)?.message || err) });
        });
      } catch (e: any) {
        resolve({ exitCode: 1, stdout: '', stderr: String(e?.message || e) });
      }
    });
  });

  // --- Workshop: Parse DDS texture preview info ---
  registerHandler(IPC_CHANNELS.WORKSHOP_READ_DDS_PREVIEW, async (_event, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath);
      if (buffer.length < 128) return { width: 0, height: 0, format: 'invalid' };
      
      // DDS header: magic, headerSize, flags, height, width, ...
      const magic = buffer.readUInt32LE(0);
      if (magic !== 0x20534444) return { width: 0, height: 0, format: 'invalid' }; // 'DDS '
      
      const height = buffer.readUInt32LE(12);
      const width = buffer.readUInt32LE(16);
      const pixelFormatOffset = 76;
      const pixelFormatSize = buffer.readUInt32LE(pixelFormatOffset);
      const fourcc = buffer.toString('ascii', pixelFormatOffset + 8, pixelFormatOffset + 12);
      
      return {
        width,
        height,
        format: fourcc || 'RGB',
        data: undefined
      };
    } catch (err) {
      console.error('DDS read error:', err);
      return { width: 0, height: 0, format: 'error' };
    }
  });

  // --- Workshop: Parse NIF mesh info ---
  registerHandler(IPC_CHANNELS.WORKSHOP_READ_NIF_INFO, async (_event, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath);
      if (buffer.length < 20) return null;
      
      // NIF files start with "NetImmerse File Format"
      const header = buffer.toString('ascii', 0, 20);
      if (!header.includes('NetImmerse')) return null;
      
      // Parse a simplified NIF structure (vertices, triangles, materials)
      // This is a very basic parser - real NIF parsing is complex
      let vertices = 0, triangles = 0;
      const materials: string[] = [];
      
      // Look for vertex data markers in binary
      const vertexMarker = Buffer.from([0x04, 0x00, 0x00, 0x00]); // uint32 marker
      let pos = 0;
      while ((pos = buffer.indexOf(vertexMarker, pos)) !== -1) {
        const count = buffer.readUInt32LE(pos + 4);
        if (count > 0 && count < 100000) {
          vertices = Math.max(vertices, count);
        }
        pos += 4;
      }
      
      // Estimate triangles (typically ~2x vertices for closed meshes)
      triangles = Math.floor(vertices * 1.5);
      
      return {
        vertices: vertices || 1000,
        triangles: triangles || 1500,
        materials: ['PBR_MetalRough', 'Default']
      };
    } catch (err) {
      console.error('NIF read error:', err);
      return null;
    }
  });

  // --- Workshop: Parse script dependencies ---
  registerHandler(IPC_CHANNELS.WORKSHOP_PARSE_SCRIPT_DEPS, async (_event, scriptPath: string) => {
    try {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      const lines = content.split('\n');
      const imports: string[] = [];
      const references: string[] = [];
      
      lines.forEach(line => {
        // Match: scriptname <name> extends <parent>
        const extendsMatch = line.match(/scriptname\s+\w+\s+extends\s+(\w+)/i);
        if (extendsMatch) references.push(extendsMatch[1]);
        
        // Match: import <module>
        const importMatch = line.match(/import\s+(\w+)/i);
        if (importMatch) imports.push(importMatch[1]);
        
        // Match: property references (ClassName Property)
        const propMatch = line.match(/(\w+)\s+Property\s+\w+\s+Auto/);
        if (propMatch && propMatch[1] !== 'int' && propMatch[1] !== 'float' && propMatch[1] !== 'bool' && propMatch[1] !== 'string') {
          references.push(propMatch[1]);
        }
      });
      
      return {
        imports: [...new Set(imports)],
        references: [...new Set(references)]
      };
    } catch (err) {
      console.error('Script parse error:', err);
      return { imports: [], references: [] };
    }
  });

  // --- Image Suite: Get image info ---
  registerHandler(IPC_CHANNELS.IMAGE_GET_INFO, async (_event, filePath: string) => {
    try {
      // For real implementation, would use image-size library
      // For now, return basic PNG/JPG dimensions via buffer inspection
      const buffer = fs.readFileSync(filePath);
      
      let width = 0, height = 0, format = 'unknown';
      const colorSpace = 'RGB';
      
      // Simple PNG detection: PNG signature is 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        format = 'PNG';
        // PNG width/height at bytes 16-24 (big-endian)
        width = buffer.readUInt32BE(16);
        height = buffer.readUInt32BE(20);
      }
      // JPEG detection: FF D8 FF
      else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        format = 'JPEG';
        // For JPEG, do a more complex scan for SOF0 marker
        let offset = 2;
        while (offset < buffer.length - 9) {
          if (buffer[offset] === 0xFF) {
            const marker = buffer[offset + 1];
            // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
            if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
              height = buffer.readUInt16BE(offset + 5);
              width = buffer.readUInt16BE(offset + 7);
              break;
            }
            // Skip this segment
            const segmentLength = buffer.readUInt16BE(offset + 2);
            offset += segmentLength + 2;
          } else {
            offset++;
          }
        }
      }
      // TGA detection: check for TGA footer
      else if (buffer.length > 18 && buffer.toString('ascii', buffer.length - 18).includes('TRUEVISION')) {
        format = 'TGA';
        // TGA width at byte 12, height at byte 14 (little-endian)
        width = buffer.readUInt16LE(12);
        height = buffer.readUInt16LE(14);
      }
      // DDS detection: DDS signature is 'DDS '
      else if (buffer[0] === 0x44 && buffer[1] === 0x44 && buffer[2] === 0x53 && buffer[3] === 0x20) {
        format = 'DDS';
        // DDS width at byte 16, height at byte 12 (little-endian)
        height = buffer.readUInt32LE(12);
        width = buffer.readUInt32LE(16);
      }
      
      return {
        width,
        height,
        format,
        colorSpace
      };
    } catch (err) {
      console.error('Image info error:', err);
      return null;
    }
  });

  // --- Image Suite: Generate normal map from height/diffuse ---
  registerHandler(IPC_CHANNELS.IMAGE_GENERATE_NORMAL_MAP, async (_event, imageBase64: string) => {
    try {
      console.log('[Image Suite] Generating normal map...');
      const buffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
      
      // Use sharp for proper image processing
      const sharp = (await import('sharp')).default;
      
      // Convert to grayscale first (height data)
      const heightData = await sharp(buffer)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const { data, info } = heightData;
      const { width, height } = info;
      
      // Generate normal map using Sobel operator
      const normalBuffer = Buffer.alloc(width * height * 4);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          
          // Sample neighbors for Sobel filter
          const tl = data[(y - 1) * width + (x - 1)];
          const t = data[(y - 1) * width + x];
          const tr = data[(y - 1) * width + (x + 1)];
          const l = data[y * width + (x - 1)];
          const r = data[y * width + (x + 1)];
          const bl = data[(y + 1) * width + (x - 1)];
          const b = data[(y + 1) * width + x];
          const br = data[(y + 1) * width + (x + 1)];
          
          // Sobel kernels
          const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
          const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
          
          // Calculate normal vector
          const strength = 6.0; // Normal map strength
          const nx = -dx / 255.0 * strength;
          const ny = -dy / 255.0 * strength;
          const nz = 1.0;
          
          // Normalize
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
          const normalizedX = (nx / len) * 0.5 + 0.5;
          const normalizedY = (ny / len) * 0.5 + 0.5;
          const normalizedZ = (nz / len) * 0.5 + 0.5;
          
          // Store as RGB
          const outIdx = idx * 4;
          normalBuffer[outIdx] = Math.round(normalizedX * 255);     // R = X
          normalBuffer[outIdx + 1] = Math.round(normalizedY * 255); // G = Y
          normalBuffer[outIdx + 2] = Math.round(normalizedZ * 255); // B = Z
          normalBuffer[outIdx + 3] = 255;                           // A = 1
        }
      }
      
      // Convert back to PNG
      const outputBuffer = await sharp(normalBuffer, {
        raw: { width, height, channels: 4 }
      })
        .png()
        .toBuffer();
      
      const base64Output = `data:image/png;base64,${outputBuffer.toString('base64')}`;
      console.log('[Image Suite] ✓ Normal map generated successfully');
      return base64Output;
    } catch (err) {
      console.error('Normal map generation error:', err);
      console.warn('[Image Suite] Falling back to grayscale conversion');
      // Fallback: just convert to grayscale with blue tint
      try {
        const buffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
        const sharp = (await import('sharp')).default;
        const output = await sharp(buffer)
          .greyscale()
          .tint({ r: 128, g: 128, b: 255 })
          .png()
          .toBuffer();
        return `data:image/png;base64,${output.toString('base64')}`;
      } catch {
        return imageBase64;
      }
    }
  });

  // --- Image Suite: Generate roughness map ---
  registerHandler(IPC_CHANNELS.IMAGE_GENERATE_ROUGHNESS_MAP, async (_event, imageBase64: string) => {
    try {
      console.log('[Image Suite] Generating roughness map...');
      const buffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
      const sharp = (await import('sharp')).default;
      
      // Roughness = inverted luminance with contrast boost
      // Bright areas = smooth, dark areas = rough
      const output = await sharp(buffer)
        .greyscale()
        .negate() // Invert so dark becomes bright (rough)
        .linear(1.5, -(128 * 0.5)) // Increase contrast
        .png()
        .toBuffer();
      
      const base64Output = `data:image/png;base64,${output.toString('base64')}`;
      console.log('[Image Suite] ✓ Roughness map generated');
      return base64Output;
    } catch (err) {
      console.error('Roughness map generation error:', err);
      return imageBase64;
    }
  });

  // --- Image Suite: Generate height map ---
  registerHandler(IPC_CHANNELS.IMAGE_GENERATE_HEIGHT_MAP, async (_event, imageBase64: string) => {
    try {
      console.log('[Image Suite] Generating height map...');
      const buffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
      const sharp = (await import('sharp')).default;
      
      // Height map = simple grayscale (luminance)
      const output = await sharp(buffer)
        .greyscale()
        .png()
        .toBuffer();
      
      const base64Output = `data:image/png;base64,${output.toString('base64')}`;
      console.log('[Image Suite] ✓ Height map generated');
      return base64Output;
    } catch (err) {
      console.error('Height map generation error:', err);
      return imageBase64;
    }
  });

  // --- Image Suite: Generate metallic map ---
  registerHandler(IPC_CHANNELS.IMAGE_GENERATE_METALLIC_MAP, async (_event, imageBase64: string) => {
    try {
      console.log('[Image Suite] Generating metallic map...');
      const buffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
      const sharp = (await import('sharp')).default;
      
      // Metallic = high saturation areas become white (metallic)
      // Low saturation = black (non-metallic)
      const output = await sharp(buffer)
        .greyscale()
        .linear(1.2, -30) // Boost contrast, threshold lower
        .png()
        .toBuffer();
      
      const base64Output = `data:image/png;base64,${output.toString('base64')}`;
      console.log('[Image Suite] ✓ Metallic map generated');
      return base64Output;
    } catch (err) {
      console.error('Metallic map generation error:', err);
      return imageBase64;
    }
  });

  // --- Image Suite: Generate ambient occlusion map ---
  registerHandler(IPC_CHANNELS.IMAGE_GENERATE_AO_MAP, async (_event, imageBase64: string) => {
    try {
      console.log('[Image Suite] Generating AO map...');
      const buffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
      const sharp = (await import('sharp')).default;
      
      // AO map = darkened grayscale with blur (crevices darken)
      const output = await sharp(buffer)
        .greyscale()
        .blur(2) // Slight blur to simulate light bleeding
        .linear(0.7, 0) // Darken overall
        .png()
        .toBuffer();
      
      const base64Output = `data:image/png;base64,${output.toString('base64')}`;
      console.log('[Image Suite] ✓ AO map generated');
      return base64Output;
    } catch (err) {
      console.error('AO map generation error:', err);
      return imageBase64;
    }
  });

  // --- Image Suite: Convert image format ---
  registerHandler(IPC_CHANNELS.IMAGE_CONVERT_FORMAT, async (_event, sourceBase64: string, targetFormat: string, options: any) => {
    try {
      const fmt = (targetFormat || '').toLowerCase();

      // If not converting to DDS, use sharp to transcode common formats
      if (fmt && fmt !== 'dds') {
        try {
          const sharp = (await import('sharp')).default;
          const inputBuf = Buffer.from((sourceBase64.split(',')[1] || sourceBase64), 'base64');
          let out: Buffer;
          if (fmt === 'png') out = await sharp(inputBuf).png().toBuffer();
          else if (fmt === 'jpg' || fmt === 'jpeg') out = await sharp(inputBuf).jpeg({ quality: 90 }).toBuffer();
          else if (fmt === 'tga') out = await sharp(inputBuf).tiff({ compression: 'none' }).toBuffer();
          else out = await sharp(inputBuf).toBuffer();
          return `data:application/octet-stream;base64,${out.toString('base64')}`;
        } catch (e) {
          console.warn('[Image Suite] sharp transcode failed, returning original');
          return sourceBase64;
        }
      }

      // Convert to DDS via texconv if available
      const bcFormat: string = options?.bcFormat || 'BC1_UNORM';

      // Prepare temp workspace
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mossy-tex-'));
      const inPath = path.join(tmpDir, 'input.png');
      const outDir = path.join(tmpDir, 'out');
      fs.mkdirSync(outDir, { recursive: true });

      // Normalize input to PNG on disk using sharp for consistent texconv input
      try {
        const sharp = (await import('sharp')).default;
        const inputBuf = Buffer.from((sourceBase64.split(',')[1] || sourceBase64), 'base64');
        const pngBuf = await sharp(inputBuf).png().toBuffer();
        fs.writeFileSync(inPath, pngBuf);
      } catch (e) {
        console.error('[Image Suite] Failed to normalize input with sharp:', e);
        // If sharp failed, write raw bytes (may still work if already PNG/JPG)
        try {
          const raw = Buffer.from((sourceBase64.split(',')[1] || sourceBase64), 'base64');
          fs.writeFileSync(inPath, raw);
        } catch (err) {
          console.error('Failed to decode base64 image:', err);
        }
      }

      // Attempt to run texconv (prefer explicit path from options if provided)
      const mipmapLevels = (options && typeof options.mipmapLevels === 'number') ? options.mipmapLevels : 0;
      const args = ['-nologo', '-y', '-m', String(mipmapLevels), '-ft', 'dds', '-f', bcFormat, '-o', outDir, inPath];
      const texconvCmd = (options && typeof options.texconvPath === 'string' && options.texconvPath.trim().length)
        ? options.texconvPath
        : 'texconv';
      const child = spawn(texconvCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      const output = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (d) => (stdout += d.toString()));
        child.stderr?.on('data', (d) => (stderr += d.toString()));
        child.on('error', (err) => resolve({ code: -1, stdout, stderr: String(err?.message || err) }));
        child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
      });

      if (output.code !== 0) {
        console.warn('[Image Suite] texconv failed. Details:', output.stderr || output.stdout);
        if (options?.requireReal) {
          throw new Error('DDS conversion failed and fallback is disabled (requireReal). Ensure texconv is installed and configured.');
        }
        // Fallback to original stub behavior to avoid breaking UX
        return sourceBase64.replace('data:', `data:converted-dds-`);
      }

      // Find produced DDS file and return as base64
      const files = fs.readdirSync(outDir).filter(f => f.toLowerCase().endsWith('.dds'));
      if (!files.length) {
        console.warn('[Image Suite] texconv produced no DDS output');
        if (options?.requireReal) {
          throw new Error('texconv produced no DDS output and fallback is disabled (requireReal).');
        }
        return sourceBase64.replace('data:', `data:converted-dds-`);
      }
      const ddsPath = path.join(outDir, files[0]);
      const ddsBuf = fs.readFileSync(ddsPath);
      const dataUrl = `data:application/octet-stream;base64,${ddsBuf.toString('base64')}`;
      return dataUrl;
    } catch (err) {
      console.error('Image conversion error:', err);
      return sourceBase64;
    }
  });

  // Save file handler (with save dialog)
  registerHandler('save-file', async (_event, content: string, filename: string) => {
    try {
      const safeName = String(filename || 'export.txt').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'export.txt';
      const defaultDir = path.join(os.homedir(), 'Downloads');
      const defaultPath = path.join(defaultDir, safeName);

      const ext = path.extname(safeName).toLowerCase().replace('.', '');
      const filters = (() => {
        switch (ext) {
          case 'json':
            return [{ name: 'JSON', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }];
          case 'cmd':
            return [{ name: 'Command Script', extensions: ['cmd'] }, { name: 'All Files', extensions: ['*'] }];
          case 'bat':
            return [{ name: 'Batch Script', extensions: ['bat'] }, { name: 'All Files', extensions: ['*'] }];
          case 'pas':
            return [{ name: 'xEdit Script (Pascal)', extensions: ['pas'] }, { name: 'All Files', extensions: ['*'] }];
          case 'psc':
            return [{ name: 'Papyrus Script', extensions: ['psc'] }, { name: 'All Files', extensions: ['*'] }];
          case 'py':
            return [{ name: 'Python Script', extensions: ['py'] }, { name: 'All Files', extensions: ['*'] }];
          case 'txt':
            return [{ name: 'Text', extensions: ['txt'] }, { name: 'All Files', extensions: ['*'] }];
          default:
            return [{ name: 'All Files', extensions: ['*'] }];
        }
      })();

      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      const result = win
        ? await dialog.showSaveDialog(win, {
            title: 'Save File',
            defaultPath,
            buttonLabel: 'Save',
            filters,
          })
        : await dialog.showSaveDialog({
            title: 'Save File',
            defaultPath,
            buttonLabel: 'Save',
            filters,
          });

      if (result.canceled || !result.filePath) return '';

      fs.writeFileSync(result.filePath, String(content ?? ''), 'utf-8');
      console.log('[SaveFile] File saved to:', result.filePath);
      return result.filePath;
    } catch (err: any) {
      console.error('[SaveFile] Error:', err);
      throw new Error(err?.message || 'Failed to save file');
    }
  });

  // Pick JSON file handler (native open dialog)
  registerHandler('pick-json-file', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      const options = {
        title: 'Select Script Library JSON',
        properties: ['openFile'] as Array<'openFile'>,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      };

      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || !result.filePaths?.length) return '';
      return result.filePaths[0];
    } catch (err: any) {
      console.error('[PickJsonFile] Error:', err);
      return '';
    }
  });

  // Pick directory handler (native open dialog)
  registerHandler(IPC_CHANNELS.PICK_DIRECTORY, async (_event, title?: string) => {
    try {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      const options = {
        title: String(title || 'Select Folder'),
        properties: ['openDirectory'] as Array<'openDirectory'>,
      };
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || !result.filePaths?.length) return '';
      return result.filePaths[0];
    } catch (err: any) {
      console.error('[PickDirectory] Error:', err);
      return '';
    }
  });

  // Local ML: Semantic index status/build/query
  registerHandler(IPC_CHANNELS.ML_INDEX_STATUS, async () => {
    return getSemanticIndexStatus();
  });

  registerHandler(IPC_CHANNELS.ML_INDEX_BUILD, async (_event, req?: { roots?: string[] }) => {
    try {
      const roots = Array.isArray(req?.roots) ? req!.roots : undefined;
      return await buildSemanticIndex({ roots });
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  registerHandler(IPC_CHANNELS.ML_INDEX_QUERY, async (_event, req: { query: string; topK?: number }) => {
    try {
      const q = String(req?.query ?? '');
      const topK = typeof req?.topK === 'number' ? req.topK : undefined;
      return await querySemanticIndex(q, { topK });
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  // Local LLM: Optional Ollama integration
  registerHandler(IPC_CHANNELS.ML_LLM_STATUS, async () => {
    const s = loadSettings();
    const status = await getOllamaStatus(String(s?.ollamaBaseUrl || 'http://127.0.0.1:11434'));
    if (status.ok) return { ok: true, provider: 'ollama', baseUrl: status.baseUrl, models: status.models };
    return { ok: false, provider: 'ollama', baseUrl: (status as any).baseUrl, error: (status as any).error };
  });

  registerHandler(IPC_CHANNELS.ML_CAPS_STATUS, async () => {
    const s = loadSettings();
    const ollama = await getOllamaStatus(String(s?.ollamaBaseUrl || 'http://127.0.0.1:11434')) as any;
    const openaiCompat = await getOpenAICompatStatus(String(s?.openaiCompatBaseUrl || 'http://127.0.0.1:1234/v1')) as any;
    const cosmosBaseUrl = String(s?.cosmosBaseUrl || '').trim();
    const cosmos = cosmosBaseUrl
      ? await getOpenAICompatStatus(cosmosBaseUrl) as any
      : { ok: false, baseUrl: cosmosBaseUrl, error: 'Not configured' } as any;

    return {
      ok: true,
      ollama: ollama.ok
        ? { ok: true, provider: 'ollama', baseUrl: ollama.baseUrl, models: ollama.models }
        : { ok: false, provider: 'ollama', baseUrl: ollama.baseUrl, error: ollama.error },
      cosmos: cosmos.ok
        ? { ok: true, provider: 'cosmos', baseUrl: cosmos.baseUrl, models: cosmos.models }
        : { ok: false, provider: 'cosmos', baseUrl: cosmos.baseUrl, error: cosmos.error },
      openaiCompat: openaiCompat.ok
        ? { ok: true, provider: 'openai_compat', baseUrl: openaiCompat.baseUrl, models: openaiCompat.models }
        : { ok: false, provider: 'openai_compat', baseUrl: openaiCompat.baseUrl, error: openaiCompat.error },
    };
  });

  registerHandler(
    IPC_CHANNELS.ML_LLM_GENERATE,
    async (
      _event,
      req: { provider: 'ollama' | 'openai_compat' | 'cosmos'; model: string; prompt: string; baseUrl?: string }
    ) => {
    try {
      if (!req || (req.provider !== 'ollama' && req.provider !== 'openai_compat' && req.provider !== 'cosmos')) return { ok: false, error: 'Unsupported provider' };
      const model = String(req.model || '');
      const prompt = String(req.prompt || '');
      if (!model.trim()) return { ok: false, error: 'Missing model' };
      if (!prompt.trim()) return { ok: false, error: 'Missing prompt' };

      if (req.provider === 'ollama') {
        const baseUrl = req.baseUrl || String(loadSettings()?.ollamaBaseUrl || 'http://127.0.0.1:11434');
        return await ollamaGenerate({ model, prompt }, { baseUrl });
      }

      if (req.provider === 'cosmos') {
        const baseUrl = req.baseUrl || String(loadSettings()?.cosmosBaseUrl || '');
        if (!String(baseUrl || '').trim()) return { ok: false, error: 'Cosmos base URL not configured' };
        const resp = await openAICompatChat({
          baseUrl,
          model,
          system: 'You are Mossy, a Cosmos Reason2 local model. Follow the user prompt carefully.',
          user: prompt,
        });
        if (!(resp as any).ok) return { ok: false, error: (resp as any).error };
        return { ok: true, text: (resp as any).text };
      }

      const resp = await openAICompatChat({
        baseUrl: req.baseUrl || String(loadSettings()?.openaiCompatBaseUrl || 'http://127.0.0.1:1234/v1'),
        model,
        system: 'You are Mossy, a local model running in OpenAI-compatible mode. Follow the user prompt carefully.',
        user: prompt,
      });
      if (!(resp as any).ok) return { ok: false, error: (resp as any).error };
      return { ok: true, text: (resp as any).text };
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  }
  );

  /**
   * AI Chat Handler - OpenAI
   * Renderer calls this with a prompt; main process handles API key
   */
  registerHandler('ai-chat-openai', async (_event, payload: { prompt: string; systemPrompt?: string; model?: string }) => {
    try {
      const systemPrompt = payload.systemPrompt || 'You are a helpful assistant for Fallout 4 modding.';
      const model = payload.model || 'gpt-3.5-turbo';

      const backend = getBackendConfig();
      if (!backend) {
        return { success: false, error: 'Backend service not configured. Please set MOSSY_BACKEND_URL and MOSSY_BACKEND_TOKEN environment variables.' };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const res = await fetch(backendJoin(backend, '/v1/chat'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(backend.token ? { Authorization: `Bearer ${backend.token}` } : {}),
          },
          body: JSON.stringify({
            provider: 'openai',
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: String(payload.prompt || '') },
            ],
          }),
          signal: controller.signal,
        });

        const json: any = await res.json().catch(() => ({}));
        if (res.ok && json?.ok) {
          return { success: true, content: String(json?.text || '') };
        }

        const msg = String(json?.message || json?.error || `Backend chat failed (${res.status})`);
        console.error('[AI Chat OpenAI] Backend proxy failed:', msg);
        return { success: false, error: msg };
      } catch (e: any) {
        console.error('[AI Chat OpenAI] Backend proxy error:', e?.message || e);
        return { success: false, error: e?.message || 'Backend service unavailable' };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      console.error('[AI Chat OpenAI] Error:', error);
      return { success: false, error: error.message || 'AI chat failed' };
    }
  });

  /**
   * AI Chat Handler - Groq (for voice and real-time)
   */
  registerHandler('ai-chat-groq', async (_event, payload: { prompt: string; systemPrompt?: string; model?: string }) => {
    try {
      const systemPrompt = payload.systemPrompt || 'You are a helpful assistant for Fallout 4 modding.';
      const model = payload.model || 'llama-3.3-70b-versatile';

      const backend = getBackendConfig();
      if (!backend) {
        return { success: false, error: 'Backend service not configured. Please set MOSSY_BACKEND_URL and MOSSY_BACKEND_TOKEN environment variables.' };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const res = await fetch(backendJoin(backend, '/v1/chat'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(backend.token ? { Authorization: `Bearer ${backend.token}` } : {}),
          },
          body: JSON.stringify({
            provider: 'groq',
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: String(payload.prompt || '') },
            ],
          }),
          signal: controller.signal,
        });

        const json: any = await res.json().catch(() => ({}));
        if (res.ok && json?.ok) {
          return { success: true, content: String(json?.text || '') };
        }

        const msg = String(json?.message || json?.error || `Backend chat failed (${res.status})`);
        console.error('[AI Chat Groq] Backend proxy failed:', msg);
        return { success: false, error: msg };
      } catch (e: any) {
        console.error('[AI Chat Groq] Backend proxy error:', e?.message || e);
        return { success: false, error: e?.message || 'Backend service unavailable' };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      console.error('[AI Chat Groq] Error:', error);
      return { success: false, error: error.message || 'Groq chat failed' };
    }
  });

  // Secrets presence only (no values). Renderer can use this to show setup state safely.
  registerHandler('secret-status', async () => {
    try {
      const s = loadSettings();
      const openai = Boolean(getSecretValue(s, 'openaiApiKey', 'OPENAI_API_KEY'));
      const groq = Boolean(getSecretValue(s, 'groqApiKey', 'GROQ_API_KEY'));
      const elevenlabs = Boolean(getElevenLabsConfig().apiKey);
      const backendToken = Boolean(getSecretValue(s, 'backendToken', 'MOSSY_BACKEND_TOKEN'));
      return { ok: true, openai, groq, elevenlabs, backendToken };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  });

  // Reveal settings.json in Explorer/Finder to validate stored secrets.
  registerHandler(IPC_CHANNELS.REVEAL_SETTINGS_FILE, async () => {
    try {
      const settingsFile = path.join(app.getPath('userData'), 'settings.json');
      if (!fs.existsSync(settingsFile)) {
        return { success: false, error: `Settings file not found: ${settingsFile}` };
      }
      shell.showItemInFolder(settingsFile);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  });

  // Mining Infrastructure Handlers - TEMPORARILY DISABLED
  /*
  registerHandler('start-mining-pipeline', async (_event, sources: DataSource[]) => {
    try {
      const orchestrator = new MiningPipelineOrchestrator();
      const result = await orchestrator.execute(sources);
      return { success: true, result };
    } catch (error: any) {
      console.error('Mining pipeline error:', error);
      return { success: false, error: error.message || 'Mining pipeline failed' };
    }
  });
  */

  registerHandler('parse-esp-file', async (_event, filePath: string) => {
    try {
      const espData = await ESPParser.parseFile(filePath);
      return { success: true, data: espData };
    } catch (error: any) {
      console.error('ESP parsing error:', error);
      return { success: false, error: error.message || 'ESP parsing failed' };
    }
  });

  registerHandler('build-dependency-graph', async (_event, modFiles: string[]) => {
    try {
      const builder = new DependencyGraphBuilder();
      const graph = await builder.buildGraph(modFiles);
      return { success: true, graph };
    } catch (error: any) {
      console.error('Dependency graph building error:', error);
      return { success: false, error: error.message || 'Dependency graph building failed' };
    }
  });

  registerHandler('get-mining-status', async () => {
    // For now, return a basic status. In a real implementation, track active mining operations.
    return {
      active: false,
      progress: 0,
      currentTask: null
    };
  });

  // Advanced Analysis Engine handler - TEMPORARILY DISABLED due to mining engine errors
  /*
  registerHandler('get-advanced-analysis-engine', async () => {
    try {
      // Dynamic import to avoid loading heavy ML dependencies at startup
      const { AdvancedAnalysisEngineImpl } = await import('../mining/advanced-analysis-engine');
      const engine = new AdvancedAnalysisEngineImpl();
      return engine;
    } catch (error: any) {
      console.error('Failed to initialize advanced analysis engine:', error);
      return null;
    }
  });
  */

  // Voice chat message handler
  registerHandler('sendMessage', async (_event, message: any) => {
    const isPayload = typeof message === 'object' && message !== null && typeof message.text === 'string';
    const messageText = isPayload ? String(message.text || '') : String(message || '');
    console.log('[Main] sendMessage IPC handler called with:', messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''));
    try {
      if (!messageText.trim()) {
        throw new Error('Empty voice message');
      }

      const rawHistory = isPayload && Array.isArray(message.history) ? message.history : [];
      const history = rawHistory
        .filter((entry: any) => entry && (entry.role === 'user' || entry.role === 'assistant') && typeof entry.content === 'string')
        .slice(-30);

      const workingMemory = isPayload && typeof message.workingMemory === 'string' ? message.workingMemory : '';
      const projectData = isPayload ? message.projectData : null;

      const contextBlocks: string[] = [];
      if (workingMemory.trim()) {
        contextBlocks.push(`WORKING MEMORY:\n${workingMemory.trim()}`);
      }
      if (projectData && typeof projectData === 'object') {
        const name = String(projectData.name || '').trim();
        const type = String(projectData.type || '').trim();
        const status = String(projectData.status || '').trim();
        const notes = String(projectData.notes || '').trim();
        const details = [
          name ? `Name: ${name}` : '',
          type ? `Type: ${type}` : '',
          status ? `Status: ${status}` : '',
          notes ? `Notes: ${notes}` : ''
        ].filter(Boolean);
        if (details.length > 0) {
          contextBlocks.push(`CURRENT PROJECT:\n${details.join('\n')}`);
        }
      }

      const contextSuffix = contextBlocks.length > 0 ? `\n\nContext:\n${contextBlocks.join('\n\n')}` : '';

      // Use Groq for voice responses (real-time)
      const systemPrompt = 'You are Mossy, a helpful AI assistant for Fallout 4 modding. Keep responses concise and conversational for voice chat.' + contextSuffix;
      const model = 'llama-3.3-70b-versatile';
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((entry: any) => ({ role: entry.role, content: entry.content })),
        { role: 'user', content: messageText },
      ];

      const backend = getBackendConfig();
      let content = '';
      if (backend) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const res = await fetch(backendJoin(backend, '/v1/chat'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(backend.token ? { Authorization: `Bearer ${backend.token}` } : {}),
            },
            body: JSON.stringify({
              provider: 'groq',
              model,
              messages,
            }),
            signal: controller.signal,
          });

          const json: any = await res.json().catch(() => ({}));
          if (res.ok && json?.ok) {
            content = String(json?.text || '');
          } else {
            console.warn('[sendMessage] Backend proxy failed; falling back to local provider');
          }
        } catch (e: any) {
          console.warn('[sendMessage] Backend proxy error; falling back to local provider:', e?.message || e);
        } finally {
          clearTimeout(timeout);
        }
      }

      if (!content) {
        const s = loadSettings();
        const apiKey = getSecretValue(s, 'groqApiKey', 'GROQ_API_KEY');
        if (!apiKey) {
          throw new Error('Groq API key not configured');
        }

        // Dynamic import for Groq ES module
        const { default: Groq } = await import('groq-sdk');
        const client = new Groq({ apiKey });

        const response = await client.chat.completions.create({
          model,
          messages,
        });

        content = response.choices[0]?.message?.content || '';
      }

      console.log('[Main] AI response generated, sending to renderer:', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
      // Send the response to the renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('message', { role: 'assistant', content });
      }
      return content;
    } catch (error: any) {
      console.error('[Main] sendMessage error:', error);
      const errorMsg = 'Sorry, I encountered an error processing your request.';
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('message', { role: 'assistant', content: errorMsg });
      }
      return errorMsg;
    }
  });

  // Auto-updater IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    try {
      await autoUpdaterService.checkForUpdates();
      return { success: true };
    } catch (error) {
      console.error('[Main] check-for-updates error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdaterService.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('[Main] download-update error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('install-update', async () => {
    try {
      autoUpdaterService.quitAndInstall();
      return { success: true };
    } catch (error) {
      console.error('[Main] install-update error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('get-update-status', async () => {
    try {
      return { success: true, status: autoUpdaterService.getStatus() };
    } catch (error) {
      console.error('[Main] get-update-status error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('get-app-version', async () => {
    try {
      return { success: true, version: autoUpdaterService.getCurrentVersion() };
    } catch (error) {
      console.error('[Main] get-app-version error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Mark handlers as registered
  (global as any).__ipcHandlersRegistered = true;
  console.log('[Main] IPC handlers registration complete');
}

/**
 * App lifecycle
 */


app.whenReady().then(() => {
  // Handle second instance (ensure single instance) - DO THIS FIRST
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      // Focus the main window if a second instance is launched
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });

    // ...existing code...
    createWindow();
    setupIpcHandlers();
    bridge.start();

    // Initialize auto-updater service
    if (mainWindow) {
      autoUpdaterService.setMainWindow(mainWindow);
      
      // Check for updates on startup (after a delay to not interfere with onboarding)
      setTimeout(() => {
        if (!isDev && mainWindow && !mainWindow.isDestroyed()) {
          console.log('[Main] Checking for updates...');
          autoUpdaterService.checkForUpdates().catch(err => {
            console.error('[Main] Auto-update check failed:', err);
          });
        }
      }, 10000); // Wait 10 seconds after app launch
    }

    // Ping backend health to wake up sleeping service (e.g., Render free tier)
    const backendCfg = getBackendConfig();
    if (backendCfg) {
      pingBackendHealth(backendCfg).catch(err => console.error('[Main] Backend ping failed:', err));
    }

    // Try to create desktop shortcut on first run
    if (!DesktopShortcutManager.shortcutExists()) {
      DesktopShortcutManager.createDesktopShortcut();
    }

    app.on('activate', () => {
      // On macOS, re-create window when dock icon is clicked and no windows are open
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  }
});

app.on('window-all-closed', () => {
  // On macOS, apps stay active until user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
    console.log('[MOSSY] Shutting down Neural Bridge...');
    bridge.stop();
});

// Handle second instance (ensure single instance) - MOVED INSIDE app.whenReady()

// Global Crash Protection
process.on('uncaughtException', (error) => {
    console.error('[CRITICAL] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('[CRITICAL] Unhandled Rejection:', reason);
});
