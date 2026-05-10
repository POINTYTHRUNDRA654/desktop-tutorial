import type { ElectronAPI as ElectronAPIType } from '../../electron/types';

// Electron adds a `path` property to File objects (Chromium extension)
declare global {
  interface File {
    /** Absolute file-system path — available in Electron renderer only */
    readonly path: string;
  }
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.json' {
  const value: any;
  export default value;
}

declare global {
  interface Window {
    electron: {
      api: ElectronAPIType;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
    electronAPI?: ElectronAPIType;
    automationAPI?: {
      automation: {
        getSettings: () => Promise<any>;
        getStatistics: () => Promise<any>;
        start: () => Promise<void>;
        stop: () => Promise<void>;
        toggleRule: (id: string, enabled: boolean) => Promise<void>;
        triggerRule: (id: string) => Promise<void>;
        resetStatistics: () => Promise<void>;
      };
    };
  }
}

export { };
