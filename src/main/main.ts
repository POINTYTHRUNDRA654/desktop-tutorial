/**
 * Electron Main Process
 * 
 * This is the entry point for the Electron main process.
 * Handles window creation, IPC communication, tray icon, and system integration.
 */

import { app, BrowserWindow, ipcMain, Tray, globalShortcut } from 'electron';
import path from 'path';
import { IPC_CHANNELS, Message, Settings } from '../shared/types';
import { getStore, saveMessage, getSettings, setSettings } from './store';

let mainWindow: BrowserWindow | null = null;
const tray: Tray | null = null;
let isQuitting = false;

// Development mode flag
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false, // Security: disabled for renderer
      sandbox: true,
    },
    show: false, // Don't show until ready
    title: 'Desktop AI Assistant',
  });

  // Load settings and apply window preferences
  const settings = getSettings();
  if (settings.alwaysOnTop) {
    mainWindow.setAlwaysOnTop(true);
  }

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (!settings.startMinimized) {
      mainWindow?.show();
    }
  });

  // Handle window close (minimize to tray instead of closing)
  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create system tray icon and menu
 * TODO: Replace with actual icon files in resources/
 */
function createTray() {
  // TODO: Add proper tray icon files
  // tray = new Tray(path.join(__dirname, '../../resources/tray-icon.png'));
  
  // For now, create tray without icon (will use default)
  // Uncomment when icon files are added
  /*
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Desktop AI Assistant');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
  */
}

/**
 * Register global hotkey for quick activation
 * TODO: Make hotkey configurable via settings
 * 
 * Note: Global shortcuts are restricted on some platforms (e.g., macOS requires accessibility permissions).
 * Consider using electron-localshortcut for in-app shortcuts or documenting OS-specific requirements.
 */
function registerGlobalShortcut() {
  const settings = getSettings();
  
  if (settings.globalHotkey) {
    // Example: 'CommandOrControl+Shift+A'
    // TODO: Validate hotkey format and handle registration errors
    /*
    const registered = globalShortcut.register(settings.globalHotkey, () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    if (!registered) {
      console.error('Global shortcut registration failed');
    }
    */
  }
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIpcHandlers() {
  // Message handling
  ipcMain.handle(IPC_CHANNELS.SEND_MESSAGE, async (event, messageText: string) => {
    try {
      // Save user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        timestamp: Date.now(),
      };
      saveMessage(userMessage);

      // TODO: Call LLM API here
      // For now, return a placeholder response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a placeholder response. Implement LLM integration in src/main/llm-service.ts',
        timestamp: Date.now() + 1,
      };
      saveMessage(assistantMessage);

      // Send response back to renderer
      mainWindow?.webContents.send(IPC_CHANNELS.ON_MESSAGE, assistantMessage);
    } catch (error) {
      console.error('Error handling message:', error);
      throw error;
    }
  });

  // Settings management
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, async (event, newSettings: Partial<Settings>) => {
    const updatedSettings = setSettings(newSettings);
    
    // Apply settings that affect window
    if (mainWindow) {
      if (newSettings.alwaysOnTop !== undefined) {
        mainWindow.setAlwaysOnTop(newSettings.alwaysOnTop);
      }
    }

    // Notify renderer of settings update
    mainWindow?.webContents.send(IPC_CHANNELS.SETTINGS_UPDATED, updatedSettings);
  });

  // TTS (Text-to-Speech)
  ipcMain.handle(IPC_CHANNELS.TTS_SPEAK, async (event, text: string) => {
    // TODO: Implement TTS using node-based library or send to renderer
    // For now, we'll rely on renderer-side Web Speech API
    console.log('TTS request:', text);
  });

  // STT (Speech-to-Text) - Start listening
  ipcMain.handle(IPC_CHANNELS.STT_START, async () => {
    // TODO: Implement STT using node-based library or cloud service
    // For now, we'll rely on renderer-side Web Speech API
    console.log('STT start requested');
  });

  // STT - Stop listening
  ipcMain.handle(IPC_CHANNELS.STT_STOP, async () => {
    console.log('STT stop requested');
  });

  // Window controls
  ipcMain.on(IPC_CHANNELS.MINIMIZE_WINDOW, () => {
    mainWindow?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => {
    mainWindow?.close();
  });
}

/**
 * App lifecycle
 */

app.whenReady().then(() => {
  // Initialize store
  getStore();

  // Create window and setup
  createWindow();
  createTray();
  registerGlobalShortcut();
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

app.on('will-quit', () => {
  // Set quitting flag so window close won't prevent quit
  isQuitting = true;
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
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

/**
 * Auto-start configuration
 * 
 * Platform-specific instructions for enabling auto-start on login:
 * 
 * Windows:
 * - Use app.setLoginItemSettings() API (requires packaged app)
 * - Or create a shortcut in %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
 * 
 * macOS:
 * - Use app.setLoginItemSettings() API (requires packaged app)
 * - Or add to System Preferences > Users & Groups > Login Items
 * 
 * Linux:
 * - Create .desktop file in ~/.config/autostart/
 * - Example: desktop-ai-assistant.desktop with Exec pointing to app binary
 * 
 * Example code (uncomment when ready to enable):
 * 
 * function configureAutoStart(enable: boolean) {
 *   if (app.isPackaged) {
 *     app.setLoginItemSettings({
 *       openAtLogin: enable,
 *       openAsHidden: true, // Start minimized
 *     });
 *   } else {
 *     console.log('Auto-start only available in packaged app');
 *   }
 * }
 */
