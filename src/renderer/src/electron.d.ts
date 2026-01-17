// Type definitions for Electron API exposed via preload
interface ElectronAPI {
  detectPrograms: () => Promise<any[]>;
  getRunningProcesses: () => Promise<any[]>;
  openProgram: (path: string) => Promise<void>;
  saveFile: (content: string, filename: string) => Promise<string>;
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
    motherboard?: string;
    storageDrives?: Array<{device: string, free: number, total: number}>;
  }>;
  getPerformance: () => Promise<{
    cpu: number;
    mem: number;
    freeMemGB: number;
    totalMemGB: number;
  }>;
}

interface Window {
  electron?: {
    api?: ElectronAPI;
  };
  electronAPI?: ElectronAPI;
}
