import type { ElectronAPI as ElectronAPIType } from '../../electron/types';

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
    electron?: {
      api?: ElectronAPIType;
    };
    /**
     * Preload compatibility alias.
     * Prefer `window.electron.api`, but many renderer modules still use this.
     */
    electronAPI: ElectronAPIType;
  }
}

export {};
