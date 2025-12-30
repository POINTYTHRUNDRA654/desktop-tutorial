/**
 * Shared TypeScript types for Electron processes
 * Used across main, renderer, and preload processes
 */

/**
 * Installed program information
 */
export interface InstalledProgram {
  name: string;
  displayName: string;
  path: string;
  icon?: string;
  version?: string;
  publisher?: string;
}

/**
 * IPC Channel names for main <-> renderer communication
 */
export const IPC_CHANNELS = {
  // Program detection and launching
  DETECT_PROGRAMS: 'detect-programs',
  OPEN_PROGRAM: 'open-program',
} as const;

/**
 * API exposed to renderer via contextBridge
 */
export interface ElectronAPI {
  detectPrograms: () => Promise<InstalledProgram[]>;
  openProgram: (path: string) => Promise<void>;
}

/**
 * Extend Window interface to include our Electron API
 */
declare global {
  interface Window {
    electron: {
      api: ElectronAPI;
    };
  }
}
