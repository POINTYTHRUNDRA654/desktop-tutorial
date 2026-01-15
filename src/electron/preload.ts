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

// Inline types to avoid module resolution issues in sandbox
interface InstalledProgram {
  name: string;
  displayName: string;
  path: string;
  icon?: string;
  version?: string;
  publisher?: string;
}

const IPC_CHANNELS = {
  DETECT_PROGRAMS: 'detect-programs',
  OPEN_PROGRAM: 'open-program',
  OPEN_EXTERNAL: 'open-external',
  GET_TOOL_VERSION: 'get-tool-version',
  GET_RUNNING_PROCESSES: 'get-running-processes',
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  SETTINGS_UPDATED: 'settings-updated',
  VAULT_RUN_TOOL: 'vault-run-tool',
  VAULT_SAVE_MANIFEST: 'vault-save-manifest',
  VAULT_LOAD_MANIFEST: 'vault-load-manifest',
  VAULT_GET_DDS_DIMENSIONS: 'vault-get-dds-dimensions',
  VAULT_GET_IMAGE_DIMENSIONS: 'vault-get-image-dimensions',
  VAULT_PICK_TOOL_PATH: 'vault-pick-tool-path',
  WORKSHOP_BROWSE_DIRECTORY: 'workshop-browse-directory',
  WORKSHOP_READ_FILE: 'workshop-read-file',
  WORKSHOP_WRITE_FILE: 'workshop-write-file',
  WORKSHOP_RUN_PAPYRUS_COMPILER: 'workshop-run-papyrus-compiler',
  WORKSHOP_READ_DDS_PREVIEW: 'workshop-read-dds-preview',
  WORKSHOP_READ_NIF_INFO: 'workshop-read-nif-info',
  WORKSHOP_PARSE_SCRIPT_DEPS: 'workshop-parse-script-deps',
  // Image Suite
  IMAGE_GENERATE_NORMAL_MAP: 'image-generate-normal-map',
  IMAGE_GENERATE_ROUGHNESS_MAP: 'image-generate-roughness-map',
  IMAGE_GENERATE_HEIGHT_MAP: 'image-generate-height-map',
  IMAGE_GENERATE_METALLIC_MAP: 'image-generate-metallic-map',
  IMAGE_GENERATE_AO_MAP: 'image-generate-ao-map',
  IMAGE_GET_INFO: 'image-get-info',
  IMAGE_CONVERT_FORMAT: 'image-convert-format',
  // FOMOD Assembler
  FOMOD_SCAN_MOD_FOLDER: 'fomod-scan-mod-folder',
  FOMOD_ANALYZE_STRUCTURE: 'fomod-analyze-structure',
  FOMOD_VALIDATE_XML: 'fomod-validate-xml',
  FOMOD_EXPORT_PACKAGE: 'fomod-export-package',
  // Auditor
  AUDITOR_ANALYZE_ESP: 'auditor-analyze-esp',
} as const;

/**
 * Exposed API that will be available on window.electron.api
 */
const electronAPI = {
  /**
   * Detect installed programs on the host machine
   * @returns Promise resolving to array of installed programs
   */
  detectPrograms: (): Promise<InstalledProgram[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DETECT_PROGRAMS);
  },

  /**
   * Get currently running modding tools
   */
  getRunningProcesses: (): Promise<any[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_RUNNING_PROCESSES);
  },

  /**
   * Get settings from Electron store
   */
  getSettings: (): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
  },

  /**
   * Update settings in Electron store
   */
  setSettings: (settings: any): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SET_SETTINGS, settings);
  },

  /**
   * Listen for settings updates
   */
  onSettingsUpdated: (callback: (settings: any) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_UPDATED, (_event, settings) => callback(settings));
  },

  /**
   * Open/launch a program by its executable path
   * @param path - Full path to the program executable
   * @returns Promise resolving when program is launched
   */
  openProgram: (path: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_PROGRAM, path);
  },

  /**
   * Open an external file or URL
   * @param path - Path to file or URL
   * @returns Promise resolving when opened
   */
  openExternal: (path: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, path);
  },

  /**
   * Get executable version info (Windows). Returns empty string if unavailable.
   */
  getToolVersion: (path: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_TOOL_VERSION, path);
  },

  /**
   * Get real system information
   * @returns Promise resolving to system specs
   */
  getSystemInfo: (): Promise<{
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
    allGpus?: string[];
    storageDrives?: Array<{device: string, free: number, total: number}>;
    motherboard?: string;
    username?: string;
    computerName?: string;
  }> => {
    return ipcRenderer.invoke('get-system-info');
  },

  getPerformance: (): Promise<{
    cpu: number;
    mem: number;
    freeMemGB: number;
    totalMemGB: number;
  }> => {
    return ipcRenderer.invoke('get-performance');
  },

  /**
   * Vault: Run a whitelisted external tool and capture output
   */
  runTool: (payload: { cmd: string; args?: string[]; cwd?: string }): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_RUN_TOOL, payload);
  },

  /**
   * Vault: Save/Load manifest to userData
   */
  saveVaultManifest: (assets: unknown): Promise<{ ok: boolean; file?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_SAVE_MANIFEST, assets);
  },
  loadVaultManifest: (): Promise<unknown[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_LOAD_MANIFEST);
  },

  /**
   * Vault: Read DDS dimensions from file header
   */
  getDdsDimensions: (filePath: string): Promise<{ width: number; height: number }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_DDS_DIMENSIONS, filePath);
  },

  /**
   * Vault: Read PNG/TGA dimensions
   */
  getImageDimensions: (filePath: string): Promise<{ width: number; height: number }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_IMAGE_DIMENSIONS, filePath);
  },

  /** Open file picker to choose tool path */
  pickToolPath: (toolName: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_PICK_TOOL_PATH, toolName);
  },

  /**
   * Auditor: Analyze ESP/ESM file
   */
  analyzeEsp: (filePath: string): Promise<{ success: boolean; fileSize?: number; recordCount?: number; issues?: any[]; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_ANALYZE_ESP, filePath);
  },

  /**
   * Workshop: Browse directory and list files/folders
   */
  browseDirectory: (startPath?: string): Promise<{ name: string; type: 'folder' | 'file'; path: string; fileType?: string }[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSHOP_BROWSE_DIRECTORY, startPath);
  },

  /**
   * Workshop: Read file content
   */
  readFile: (filePath: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSHOP_READ_FILE, filePath);
  },

  /**
   * Workshop: Write file content
   */
  writeFile: (filePath: string, content: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSHOP_WRITE_FILE, filePath, content);
  },

  /**
   * Workshop: Run Papyrus compiler
   */
  runPapyrusCompiler: (scriptPath: string, compilerPath: string): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSHOP_RUN_PAPYRUS_COMPILER, scriptPath, compilerPath);
  },

  /**
   * Workshop: Read DDS texture preview info
   */
  readDdsPreview: (filePath: string): Promise<{ width: number; height: number; format: string; data?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSHOP_READ_DDS_PREVIEW, filePath);
  },

  /**
   * Workshop: Read NIF mesh info
   */
  readNifInfo: (filePath: string): Promise<{ vertices: number; triangles: number; materials: string[] } | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSHOP_READ_NIF_INFO, filePath);
  },

  /**
   * Workshop: Parse script dependencies
   */
  parseScriptDeps: (scriptPath: string): Promise<{ imports: string[]; references: string[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSHOP_PARSE_SCRIPT_DEPS, scriptPath);
  },

  /**
   * Image Suite: Get image metadata (dimensions, format, color space)
   */
  getImageInfo: (filePath: string): Promise<{ width: number; height: number; format: string; colorSpace: string } | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMAGE_GET_INFO, filePath);
  },

  /**
   * Image Suite: Generate normal map from diffuse/height texture
   * Uses Sobel edge detection to compute surface normals
   */
  generateNormalMap: (imageBase64: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMAGE_GENERATE_NORMAL_MAP, imageBase64);
  },

  /**
   * Image Suite: Generate roughness map from diffuse texture
   * High values indicate rough surfaces, low values are smooth/shiny
   */
  generateRoughnessMap: (imageBase64: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMAGE_GENERATE_ROUGHNESS_MAP, imageBase64);
  },

  /**
   * Image Suite: Generate height map from diffuse texture
   * Preserves luminance information as height information
   */
  generateHeightMap: (imageBase64: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMAGE_GENERATE_HEIGHT_MAP, imageBase64);
  },

  /**
   * Image Suite: Generate metallic map from diffuse texture
   * Detects edges and high-contrast areas to indicate metallic regions
   */
  generateMetallicMap: (imageBase64: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMAGE_GENERATE_METALLIC_MAP, imageBase64);
  },

  /**
   * Image Suite: Generate ambient occlusion map from diffuse texture
   * Simulates local occlusion based on luminance variance
   */
  generateAOMap: (imageBase64: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMAGE_GENERATE_AO_MAP, imageBase64);
  },

  /**
   * Image Suite: Convert image format (PNG/JPG/TGA <-> DDS)
   * Supports compression options for DDS output
   */
  convertImageFormat: (sourceBase64: string, targetFormat: string, options: any): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMAGE_CONVERT_FORMAT, sourceBase64, targetFormat, options);
  },

  /**
   * FOMOD Assembler: Scan mod folder and return file list
   */
  fomodScanModFolder: (folderPath: string): Promise<{ path: string; name: string; size: number; isDir: boolean }[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FOMOD_SCAN_MOD_FOLDER, folderPath);
  },

  /**
   * FOMOD Assembler: Analyze file structure and suggest FOMOD organization
   */
  fomodAnalyzeStructure: (files: string[]): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FOMOD_ANALYZE_STRUCTURE, files);
  },

  /**
   * FOMOD Assembler: Validate FOMOD XML against schema
   */
  fomodValidateXML: (xml: string): Promise<{ valid: boolean; errors: string[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FOMOD_VALIDATE_XML, xml);
  },

  /**
   * FOMOD Assembler: Export complete FOMOD package as zip
   */
  fomodExportPackage: (outputPath: string, structure: any, files: any[]): Promise<{ success: boolean; path?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FOMOD_EXPORT_PACKAGE, outputPath, structure, files);
  },
};

/**
 * Expose the API to the renderer process via contextBridge
 * This makes it available as window.electron.api in the renderer
 * Also exposed as window.electronAPI for compatibility
 */
contextBridge.exposeInMainWorld('electron', {
  api: electronAPI,
});

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
 * - Always sanitize user input before processing
 * - Never trust data from the renderer process
 */
