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
  OPEN_EXTERNAL: 'open-external',
  GET_TOOL_VERSION: 'get-tool-version',
  GET_RUNNING_PROCESSES: 'get-running-processes',
  // Vault integration
  VAULT_RUN_TOOL: 'vault-run-tool',
  VAULT_SAVE_MANIFEST: 'vault-save-manifest',
  VAULT_LOAD_MANIFEST: 'vault-load-manifest',
  VAULT_GET_DDS_DIMENSIONS: 'vault-get-dds-dimensions',
  VAULT_GET_IMAGE_DIMENSIONS: 'vault-get-image-dimensions',
  VAULT_PICK_TOOL_PATH: 'vault-pick-tool-path',
  // Workshop integration
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
  // Auditor ESP Analysis
  AUDITOR_ANALYZE_ESP: 'auditor-analyze-esp',
  AUDITOR_PICK_ESP_FILE: 'auditor-pick-esp-file',
} as const;

/**
 * API exposed to renderer via contextBridge
 */
export interface ElectronAPI {
  detectPrograms: () => Promise<InstalledProgram[]>;
  openProgram: (path: string) => Promise<void>;
  openExternal: (path: string) => Promise<void>;
  getToolVersion: (path: string) => Promise<string>;
  getRunningProcesses: () => Promise<any[]>;
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
    allGpus?: string[];
    storageDrives?: Array<{device: string, free: number, total: number}>;
    motherboard?: string;
    username?: string;
    computerName?: string;
  }>;
  // Vault
  runTool: (payload: { cmd: string; args?: string[]; cwd?: string }) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  saveVaultManifest: (assets: unknown) => Promise<{ ok: boolean; file?: string; error?: string }>;
  loadVaultManifest: () => Promise<unknown[]>;
  getDdsDimensions: (filePath: string) => Promise<{ width: number; height: number }>;
  getImageDimensions: (filePath: string) => Promise<{ width: number; height: number }>;
  pickToolPath: (toolName: string) => Promise<string>;
  // Workshop
  browseDirectory: (startPath?: string) => Promise<{ name: string; type: 'folder' | 'file'; path: string; fileType?: string }[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  runPapyrusCompiler: (scriptPath: string, compilerPath: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  readDdsPreview: (filePath: string) => Promise<{ width: number; height: number; format: string; data?: string }>;
  readNifInfo: (filePath: string) => Promise<{ vertices: number; triangles: number; materials: string[] } | null>;
  parseScriptDeps: (scriptPath: string) => Promise<{ imports: string[]; references: string[] }>;
  // Image Suite
  generateNormalMap: (imageBase64: string) => Promise<string>;
  generateRoughnessMap: (imageBase64: string) => Promise<string>;
  generateHeightMap: (imageBase64: string) => Promise<string>;
  generateMetallicMap: (imageBase64: string) => Promise<string>;
  getImageInfo: (filePath: string) => Promise<{ width: number; height: number; format: string; colorSpace: string } | null>;
  convertImageFormat: (sourceBase64: string, targetFormat: string, options: any) => Promise<string>;
  generateAOMap: (imageBase64: string) => Promise<string>;
  // FOMOD Assembler
  fomodScanModFolder: (folderPath: string) => Promise<{ path: string; name: string; size: number; isDir: boolean }[]>;
  fomodAnalyzeStructure: (files: string[]) => Promise<any>;
  fomodValidateXML: (xml: string) => Promise<{ valid: boolean; errors: string[] }>;
  fomodExportPackage: (outputPath: string, structure: any, files: any[]) => Promise<{ success: boolean; path?: string; error?: string }>;
  // Auditor
  analyzeEsp: (filePath: string) => Promise<{ success: boolean; fileSize?: number; recordCount?: number; issues?: any[]; error?: string }>;
  pickEspFile: () => Promise<string>;
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
