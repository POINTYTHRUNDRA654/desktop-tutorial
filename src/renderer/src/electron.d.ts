// Type definitions for Electron API exposed via preload
interface ElectronAPI {
  detectPrograms: () => Promise<any[]>;
  openProgram: (path: string) => Promise<void>;
  getSystemInfo: () => Promise<{
    os: string;
    cpu: string;
    gpu: string;
    ram: number;
    cores: number;
    arch: string;
    vram?: number;
    blenderVersion?: string;
    storageFreeGB?: number;
    storageTotalGB?: number;
    displayResolution?: string;
  }>;
}

interface Window {
  electron?: {
    api?: ElectronAPI;
  };
}
