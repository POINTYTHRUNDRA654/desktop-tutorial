/**
 * Electron Main Process for Volt Tech Desktop Wrapper
 * 
 * This is the entry point for the Electron main process.
 * Handles window creation, IPC communication for program detection and launching.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from './types';
import { detectPrograms, openProgram } from './detectPrograms';

let mainWindow: BrowserWindow | null = null;

// Development mode flag
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Allow override of start URL for development
const ELECTRON_START_URL = process.env.ELECTRON_START_URL;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,      // Security: isolate preload context
      nodeIntegration: false,       // Security: disabled for renderer
      sandbox: true,                // Security: sandboxed renderer
    },
    show: false, // Don't show until ready
    title: 'Volt Tech Desktop',
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
}

/**
 * App lifecycle
 */

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();

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
