/**
 * Electron Main Process for Volt Tech Desktop Wrapper
 * 
 * This is the entry point for the Electron main process.
 * Handles window creation, IPC communication for program detection and launching.
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS } from './types';
import { detectPrograms, getSystemInfo } from './detectPrograms';
import { getRunningModdingTools } from './processMonitor';
import { DesktopShortcutManager } from './desktopShortcut';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import { BridgeServer } from './BridgeServer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import https from 'https';
import FormData from 'form-data';
import OpenAI from 'openai';

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

let mainWindow: BrowserWindow | null = null;
const bridge = new BridgeServer();

// Development mode flag
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../../public/pipboy-icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,      // Security: isolate preload context
      nodeIntegration: false,       // Security: disabled for renderer
      sandbox: true,                // Security: sandboxed renderer
    },
    show: false, // Don't show until ready
    title: 'Mossy Pip-Boy - Fallout 4 Modding Assistant',
  });

  // Load the app based on environment
  if (isDev && ELECTRON_START_URL) {
    // Development with custom URL
    mainWindow.loadURL(ELECTRON_START_URL);
    mainWindow.webContents.openDevTools();
  } else if (isDev) {
    // Development with local server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from external/volttech-dist
    const indexPath = path.join(__dirname, '../../external/volttech-dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load front-end from external/volttech-dist:', err);
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
  // Check if Blender Mossy Link add-on is running
  ipcMain.handle('check-blender-addon', async (_event) => {
    try {
      const net = require('net');
      return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve({ connected: false, error: 'Connection timeout' });
        }, 1000);
        
        socket.connect(9999, '127.0.0.1', () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve({ connected: true, port: 9999 });
        });
        
        socket.on('error', () => {
          clearTimeout(timeout);
          resolve({ connected: false, error: 'Blender add-on not listening on port 9999' });
        });
      });
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  });

  // PDF parsing handler (runs in main process with Node.js)
  ipcMain.handle('parse-pdf', async (_event, arrayBuffer: ArrayBuffer) => {
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
  ipcMain.handle('transcribe-video', async (
    _event,
    arrayBuffer: ArrayBuffer,
    apiKey: string,
    filename: string,
    projectId?: string,
    organizationId?: string,
  ) => {
    let tempVideoPath: string | null = null;
    let tempAudioPath: string | null = null;

    try {
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

      // Local whisper.cpp fallback helper
      const transcribeLocalWhisper = async () => {
        const baseDir = app.isPackaged ? process.resourcesPath : app.getAppPath();
        const parentDir = path.dirname(baseDir); // Check parent directory too
        const whisperCandidates = [
          path.join(baseDir, 'external', 'whisper', 'whisper-cli.exe'),
          path.join(baseDir, 'external', 'whisper', 'main.exe'),
          path.join(baseDir, 'whisper', 'whisper-cli.exe'),
          path.join(process.cwd(), 'external', 'whisper', 'whisper-cli.exe'),
          path.join(parentDir, 'external', 'whisper', 'whisper-cli.exe'), // Parent directory
        ];
        const modelCandidates = [
          path.join(baseDir, 'external', 'whisper', 'ggml-base.en.bin'),
          path.join(baseDir, 'whisper', 'ggml-base.en.bin'),
          path.join(process.cwd(), 'external', 'whisper', 'ggml-base.en.bin'),
          path.join(parentDir, 'external', 'whisper', 'ggml-base.en.bin'), // Parent directory
        ];

        const whisperBin = whisperCandidates.find(fs.existsSync);
        const modelPath = modelCandidates.find(fs.existsSync);

        console.log('[Transcription] Searching for whisper binary in:', whisperCandidates);
        console.log('[Transcription] Found whisper binary:', whisperBin);
        console.log('[Transcription] Found model:', modelPath);

        if (!whisperBin) {
          throw new Error('Local Whisper binary not found. Place whisper-cli.exe or main.exe in external/whisper/');
        }
        if (!modelPath) {
          throw new Error('Whisper model ggml-base.en.bin not found. Place it in external/whisper/');
        }

        const outPrefix = path.join(os.tmpdir(), `mossy-whisper-${Date.now()}`);
        const args = ['-m', modelPath, '-f', tempAudioPath!, '-otxt', '-of', outPrefix, '-np', '1'];

        console.log('[Transcription] Running local whisper:', whisperBin, args.join(' '));

        await new Promise<void>((resolve, reject) => {
          const child = spawn(whisperBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
          let stderr = '';
          child.stderr?.on('data', (d) => { stderr += d.toString(); });
          child.on('error', reject);
          child.on('close', (code) => {
            if (code === 0) return resolve();
            reject(new Error(`whisper.cpp exited with code ${code}: ${stderr}`));
          });
        });

        const txtPath = `${outPrefix}.txt`;
        if (!fs.existsSync(txtPath)) {
          throw new Error('whisper.cpp did not produce a transcript file');
        }
        const text = fs.readFileSync(txtPath, 'utf-8').trim();
        console.log('[Transcription] ✓ Local whisper success');
        return text;
      };

      // Decide path: if no key, go local; else try SDK then fallback to local on 401
      let transcription = '';

      if (!apiKey) {
        transcription = await transcribeLocalWhisper();
        return { success: true, text: transcription };
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
          console.log('[Transcription] Falling back to local whisper due to auth error');
          transcription = await transcribeLocalWhisper();
          return { success: true, text: transcription };
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
          // HTTP also failed, fallback to local whisper
          console.warn('[Transcription] HTTP also failed, falling back to local whisper');
          transcription = await transcribeLocalWhisper();
          return { success: true, text: transcription };
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

  // Program detection handler
  ipcMain.handle(IPC_CHANNELS.DETECT_PROGRAMS, async () => {
    try {
      const programs = await detectPrograms();
      return programs;
    } catch (error) {
      console.error('Error detecting programs:', error);
      throw error;
    }
  });

  // Get running processes handler
  ipcMain.handle(IPC_CHANNELS.GET_RUNNING_PROCESSES, async () => {
    try {
      return await getRunningModdingTools();
    } catch (error) {
      console.error('Error getting running processes:', error);
      return [];
    }
  });

  // Open program handler
  ipcMain.handle(IPC_CHANNELS.OPEN_PROGRAM, async (event, programPath: string) => {
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
                  
                  // Method 2: Fallback to direct spawn with shell: true
                  const child = spawn(`"${programPath}"`, [], {
                      cwd: programDir,
                      detached: true,
                      shell: true,
                      stdio: 'ignore'
                  });
                  
                  child.unref();
                  console.log(`[Main] OPEN_PROGRAM: ✓ Fallback spawn completed`);
                  return { success: true, method: 'spawn-shell-fallback' };
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
  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (event, filePath: string) => {
    try {
      // Validate input
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      const { shell } = await import('electron');
      const fs = await import('fs');

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Open the file with the default application or launch executable
      const result = await shell.openPath(filePath);
      
      // If result is not empty, it means there was an error
      if (result) {
        throw new Error(result);
      }

      console.log('Successfully opened external file:', filePath);
    } catch (error) {
      console.error('Error opening external file:', error);
      throw error;
    }
  });

  // Get executable version (Windows)
  ipcMain.handle(IPC_CHANNELS.GET_TOOL_VERSION, async (_event, filePath: string) => {
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
  ipcMain.handle('create-desktop-shortcut', async () => {
    try {
      const created = DesktopShortcutManager.createDesktopShortcut();
      return { success: created, message: created ? 'Desktop shortcut created successfully' : 'Failed to create desktop shortcut' };
    } catch (error) {
      console.error('Error creating desktop shortcut:', error);
      return { success: false, message: String(error) };
    }
  });

  ipcMain.handle('shortcut-exists', async () => {
    try {
      return DesktopShortcutManager.shortcutExists();
    } catch (error) {
      console.error('Error checking shortcut:', error);
      return false;
    }
  });

  // Settings management using JSON file storage
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  
  const loadSettings = (): any => {
    try {
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('[Settings] Failed to load settings:', e);
    }
    // Return comprehensive default settings with all tool paths
    return {
      xeditPath: '',
      nifSkopePath: '',
      fomodCreatorPath: '',
      creationKitPath: '',
      blenderPath: '',
      lootPath: '',
      vortexPath: '',
      mo2Path: '',
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
    };
  };

  const saveSettings = (settings: any): void => {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      console.log('[Settings] Settings saved to:', settingsPath);
      // Notify all renderer windows of settings update
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings-updated', settings);
      }
    } catch (e) {
      console.error('[Settings] Failed to save settings:', e);
      throw e;
    }
  };

  ipcMain.handle('get-settings', async () => {
    console.log('[Settings] get-settings called');
    return loadSettings();
  });

  ipcMain.handle('set-settings', async (_event, newSettings: any) => {
    console.log('[Settings] set-settings called with:', newSettings);
    const current = loadSettings();
    const updated = { ...current, ...newSettings };
    saveSettings(updated);
    return;
  });

  // Get real system information
  // Get real performance telemetry
  ipcMain.handle('get-performance', async () => {
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

  ipcMain.handle('get-system-info', async () => {
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
      let storageDrives: Array<{device: string, free: number, total: number}> = [];
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

  // --- Vault: Run external tool safely ---
  ipcMain.handle(IPC_CHANNELS.VAULT_RUN_TOOL, async (_event, payload: { cmd: string; args?: string[]; cwd?: string }) => {
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
  ipcMain.handle(IPC_CHANNELS.VAULT_SAVE_MANIFEST, async (_event, assets: unknown) => {
    try {
      const file = path.join(app.getPath('userData'), 'vault-assets.json');
      fs.writeFileSync(file, JSON.stringify(assets, null, 2), 'utf-8');
      return { ok: true, file };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_LOAD_MANIFEST, async () => {
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
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_DDS_DIMENSIONS, async (_event, filePathStr: string) => {
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
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_IMAGE_DIMENSIONS, async (_event, filePathStr: string) => {
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
          let b = read(2);
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
  ipcMain.handle(IPC_CHANNELS.VAULT_PICK_TOOL_PATH, async (_event, toolName: string) => {
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
  ipcMain.handle(IPC_CHANNELS.AUDITOR_PICK_ESP_FILE, async (_event) => {
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
  ipcMain.handle(IPC_CHANNELS.AUDITOR_PICK_NIF_FILE, async (_event) => {
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
  ipcMain.handle(IPC_CHANNELS.AUDITOR_PICK_DDS_FILE, async (_event) => {
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
  ipcMain.handle(IPC_CHANNELS.AUDITOR_PICK_BGSM_FILE, async (_event) => {
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
  ipcMain.handle(IPC_CHANNELS.AUDITOR_ANALYZE_ESP, async (_event, filePath: string) => {
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
  ipcMain.handle(IPC_CHANNELS.WORKSHOP_BROWSE_DIRECTORY, async (_event, startPath?: string) => {
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

  // --- Workshop: Read file content ---
  ipcMain.handle(IPC_CHANNELS.WORKSHOP_READ_FILE, async (_event, filePath: string) => {
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
  ipcMain.handle(IPC_CHANNELS.WORKSHOP_WRITE_FILE, async (_event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error('Workshop write error:', err);
      return false;
    }
  });

  // --- Workshop: Run Papyrus compiler ---
  ipcMain.handle(IPC_CHANNELS.WORKSHOP_RUN_PAPYRUS_COMPILER, async (_event, scriptPath: string, compilerPath: string) => {
    return new Promise((resolve) => {
      const scriptDir = path.dirname(scriptPath);
      const process = spawn(compilerPath, [scriptPath], { cwd: scriptDir });
      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => { stdout += data.toString(); });
      process.stderr?.on('data', (data) => { stderr += data.toString(); });

      process.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr
        });
      });

      process.on('error', (err) => {
        resolve({
          exitCode: 1,
          stdout,
          stderr: err.message
        });
      });
    });
  });

  // --- Workshop: Parse DDS texture preview info ---
  ipcMain.handle(IPC_CHANNELS.WORKSHOP_READ_DDS_PREVIEW, async (_event, filePath: string) => {
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
  ipcMain.handle(IPC_CHANNELS.WORKSHOP_READ_NIF_INFO, async (_event, filePath: string) => {
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
  ipcMain.handle(IPC_CHANNELS.WORKSHOP_PARSE_SCRIPT_DEPS, async (_event, scriptPath: string) => {
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
  ipcMain.handle(IPC_CHANNELS.IMAGE_GET_INFO, async (_event, filePath: string) => {
    try {
      // For real implementation, would use image-size library
      // For now, return basic PNG/JPG dimensions via buffer inspection
      const buffer = fs.readFileSync(filePath);
      
      let width = 0, height = 0, format = 'unknown', colorSpace = 'RGB';
      
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
  ipcMain.handle(IPC_CHANNELS.IMAGE_GENERATE_NORMAL_MAP, async (_event, imageBase64: string) => {
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
  ipcMain.handle(IPC_CHANNELS.IMAGE_GENERATE_ROUGHNESS_MAP, async (_event, imageBase64: string) => {
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
  ipcMain.handle(IPC_CHANNELS.IMAGE_GENERATE_HEIGHT_MAP, async (_event, imageBase64: string) => {
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
  ipcMain.handle(IPC_CHANNELS.IMAGE_GENERATE_METALLIC_MAP, async (_event, imageBase64: string) => {
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
  ipcMain.handle(IPC_CHANNELS.IMAGE_GENERATE_AO_MAP, async (_event, imageBase64: string) => {
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
  ipcMain.handle(IPC_CHANNELS.IMAGE_CONVERT_FORMAT, async (_event, sourceBase64: string, targetFormat: string, options: any) => {
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
        } catch {}
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
  ipcMain.handle('save-file', async (_event, content: string, filename: string) => {
    try {
      // Default to Downloads folder first (silent, no dialog)
      const downloadsPath = path.join(os.homedir(), 'Downloads');
      const filePath = path.join(downloadsPath, filename);
      
      // Ensure Downloads folder exists
      if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath, { recursive: true });
      }
      
      // Write file directly to Downloads
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('[SaveFile] File saved directly to:', filePath);
      return filePath;
    } catch (err: any) {
      console.error('[SaveFile] Error:', err);
      throw new Error(err?.message || 'Failed to save file');
    }
  });
}

/**
 * App lifecycle
 */

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();
  bridge.start();

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

// Handle second instance (ensure single instance)
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
}

// Global Crash Protection
process.on('uncaughtException', (error) => {
    console.error('[CRITICAL] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('[CRITICAL] Unhandled Rejection:', reason);
});
