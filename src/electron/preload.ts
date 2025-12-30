/**
 * Electron Preload Script for Volt Tech Desktop Wrapper
 * 
 * This script runs in a special context that has access to both Node.js APIs
 * and the renderer's DOM. It uses contextBridge to securely expose a limited
 * API to the renderer process.
 * 
 * Security: This is the ONLY bridge between main and renderer processes.
 * Never expose dangerous Node.js APIs directly to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI, IPC_CHANNELS, InstalledProgram } from './types';

/**
 * Exposed API that will be available on window.electron.api
 */
const electronAPI: ElectronAPI = {
  /**
   * Detect installed programs on the host machine
   * @returns Promise resolving to array of installed programs
   */
  detectPrograms: (): Promise<InstalledProgram[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DETECT_PROGRAMS);
  },

  /**
   * Open/launch a program by its executable path
   * @param path - Full path to the program executable
   * @returns Promise resolving when program is launched
   */
  openProgram: (path: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_PROGRAM, path);
  },
};

/**
 * Expose the API to the renderer process via contextBridge
 * This makes it available as window.electron.api in the renderer
 */
contextBridge.exposeInMainWorld('electron', {
  api: electronAPI,
});

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
 * - Always sanitize user input before processing
 * - Never trust data from the renderer process
 */
