/**
 * Electron Preload Script
 * 
 * This script runs in a special context that has access to both Node.js APIs
 * and the renderer's DOM. It uses contextBridge to securely expose a limited
 * API to the renderer process.
 * 
 * Security: This is the ONLY bridge between main and renderer processes.
 * Never expose dangerous Node.js APIs directly to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI, IPC_CHANNELS, Message, Settings } from '../shared/types';

/**
 * Exposed API that will be available on window.electronAPI
 */
const electronAPI: ElectronAPI = {
  // Messaging
  sendMessage: (message: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SEND_MESSAGE, message);
  },

  onMessage: (callback: (message: Message) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, message: Message) => {
      callback(message);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_MESSAGE, subscription);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_MESSAGE, subscription);
    };
  },

  // Settings
  getSettings: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
  },

  setSettings: (settings: Partial<Settings>) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SET_SETTINGS, settings);
  },

  onSettingsUpdated: (callback: (settings: Settings) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, settings: Settings) => {
      callback(settings);
    };
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_UPDATED, subscription);
    
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_UPDATED, subscription);
    };
  },

  // Audio - TTS (Text-to-Speech)
  ttsSpeak: (text: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.TTS_SPEAK, text);
  },

  // Audio - STT (Speech-to-Text)
  startListening: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.STT_START);
  },

  stopListening: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.STT_STOP);
  },

  onSttResult: (callback: (text: string) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, text: string) => {
      callback(text);
    };
    ipcRenderer.on(IPC_CHANNELS.STT_RESULT, subscription);
    
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.STT_RESULT, subscription);
    };
  },

  // Window controls
  minimizeWindow: () => {
    ipcRenderer.send(IPC_CHANNELS.MINIMIZE_WINDOW);
  },

  closeWindow: () => {
    ipcRenderer.send(IPC_CHANNELS.CLOSE_WINDOW);
  },
};

/**
 * Expose the API to the renderer process via contextBridge
 * This makes it available as window.electronAPI in the renderer
 */
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

/**
 * Security Notes:
 * 
 * 1. contextIsolation: true (in main.ts) ensures this preload script runs in an isolated context
 * 2. nodeIntegration: false ensures renderer cannot directly access Node.js APIs
 * 3. sandbox: true adds an additional security layer
 * 4. We only expose specific, validated functions via contextBridge
 * 5. Never expose the entire ipcRenderer or Node.js modules to the renderer
 * 
 * Best practices:
 * - Validate all inputs in IPC handlers (in main.ts)
 * - Use invoke/handle for request-response patterns (returns Promise)
 * - Use send/on for one-way notifications
 * - Always sanitize user input before processing
 * - Never trust data from the renderer process
 */
