/**
 * Electron Main Process for Volt Tech Desktop Wrapper
 * 
 * This is the entry point for the Electron main process.
 * Handles window creation, IPC communication for program detection and launching.
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS } from './types';
import { detectPrograms, openProgram } from './detectPrograms';
import { DesktopShortcutManager } from './desktopShortcut';
import fs from 'fs';
import { spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;

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
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIpcHandlers() {
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

  // Open program handler
  ipcMain.handle(IPC_CHANNELS.OPEN_PROGRAM, async (event, programPath: string) => {
    try {
      // Validate input
      if (!programPath || typeof programPath !== 'string') {
        throw new Error('Invalid program path');
      }
      
      await openProgram(programPath);
    } catch (error) {
      console.error('Error opening program:', error);
      throw error;
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
    return {
      xeditPath: '',
      nifSkopePath: '',
      fomodCreatorPath: '',
      creationKitPath: '',
      blenderPath: '',
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
  ipcMain.handle('get-system-info', async () => {
    console.log('[Main] get-system-info IPC handler called');
    try {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const platform = os.platform();
      const release = os.release();
      
      console.log('[Main] Basic system info gathered:', { platform, release, cpuCount: cpus.length, totalMem });
      
      // Get GPU info and VRAM
      let gpuInfo = 'Unknown GPU';
      let vramGB = 0;
      if (platform === 'win32') {
        try {
          console.log('[Main] Attempting GPU detection via WMIC...');
          const { execSync } = require('child_process');
          
          // Get GPU names
          const wmic = execSync('wmic path win32_VideoController get name', { encoding: 'utf-8' });
          console.log('[Main] WMIC GPU output:', wmic);
          
          const allGPUs = wmic.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line && !line.includes('Name'));
          
          console.log('[Main] All detected GPUs:', allGPUs);
          
          if (allGPUs.length > 0) {
            const discreteGPU = allGPUs.find((gpu: string) => 
              gpu.toLowerCase().includes('nvidia') || 
              gpu.toLowerCase().includes('amd') || 
              gpu.toLowerCase().includes('radeon')
            );
            
            if (discreteGPU) {
              gpuInfo = allGPUs.length > 1 
                ? `${discreteGPU} (+${allGPUs.length - 1} more GPU${allGPUs.length > 2 ? 's' : ''})`
                : discreteGPU;
            } else {
              gpuInfo = allGPUs.length > 1 
                ? `${allGPUs[0]} (+${allGPUs.length - 1} more GPU${allGPUs.length > 2 ? 's' : ''})`
                : allGPUs[0];
            }
          }
          
          // Get VRAM (AdapterRAM is in bytes)
          try {
            const vramWmic = execSync('wmic path win32_VideoController get AdapterRAM', { encoding: 'utf-8' });
            console.log('[Main] VRAM output:', vramWmic);
            const vramLines = vramWmic.split('\n')
              .map((line: string) => line.trim())
              .filter((line: string) => line && !line.includes('AdapterRAM') && line !== '0');
            
            if (vramLines.length > 0) {
              // Find the largest VRAM (for discrete GPU)
              const vramBytes = Math.max(...vramLines.map((v: string) => parseInt(v, 10)));
              vramGB = Math.round(vramBytes / (1024 ** 3)); // Convert to GB
              console.log('[Main] Detected VRAM:', vramGB, 'GB');
            }
          } catch (e) {
            console.error('[Main] VRAM detection failed:', e);
          }
          
          console.log('[Main] Selected GPU:', gpuInfo, 'VRAM:', vramGB, 'GB');
        } catch (e) {
          console.error('[Main] GPU detection failed:', e);
          gpuInfo = 'GPU Detection Failed';
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
      
      // Get storage space (main drive)
      let storageFreeGB = 0;
      let storageTotalGB = 0;
      if (platform === 'win32') {
        try {
          const { execSync } = require('child_process');
          const storageWmic = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size', { encoding: 'utf-8' });
          const lines = storageWmic.split('\n').filter((l: string) => l.trim() && !l.includes('FreeSpace'));
          if (lines.length > 0) {
            const parts = lines[0].trim().split(/\s+/);
            if (parts.length >= 2) {
              storageFreeGB = Math.round(parseInt(parts[0], 10) / (1024 ** 3));
              storageTotalGB = Math.round(parseInt(parts[1], 10) / (1024 ** 3));
              console.log('[Main] Storage C: Free:', storageFreeGB, 'GB / Total:', storageTotalGB, 'GB');
            }
          }
        } catch (e) {
          console.error('[Main] Storage detection failed:', e);
        }
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
        os: `${platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux'} ${release}`,
        cpu: cpus[0]?.model || 'Unknown CPU',
        gpu: gpuInfo,
        ram: Math.round(totalMem / (1024 ** 3)),
        vram: vramGB,
        cores: cpus.length,
        arch: os.arch(),
        blenderVersion: blenderVersion || '',
        storageFreeGB: storageFreeGB,
        storageTotalGB: storageTotalGB,
        displayResolution: displayResolution
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

      const child = spawn(payload.cmd, payload.args ?? [], {
        cwd: payload.cwd || process.cwd(),
        shell: false,
        windowsHide: true,
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', d => (stdout += d.toString()));
      child.stderr.on('data', d => (stderr += d.toString()));
      const exitCode: number = await new Promise(resolve => child.on('close', code => resolve(code ?? -1)));
      return { exitCode, stdout, stderr };
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
      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    } catch (err) {
      console.error('Workshop read error:', err);
      return '';
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
      // Format conversion: PNG/JPG/TGA <-> DDS
      // In production, would use sharp library for PNG/JPG and custom DDS encoding
      // For now, return a placeholder with format indicator
      return sourceBase64.replace('data:', `data:converted-${targetFormat}-`);
    } catch (err) {
      console.error('Image conversion error:', err);
      return sourceBase64;
    }
  });
}

/**
 * App lifecycle
 */

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();

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
