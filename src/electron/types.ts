/**
 * Shared TypeScript types for Electron processes
 * Used across main, renderer, and preload processes
 */

import type { Message } from '../shared/types';

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
  REVEAL_IN_FOLDER: 'reveal-in-folder',
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
  AUDITOR_PICK_NIF_FILE: 'auditor-pick-nif-file',
  AUDITOR_PICK_DDS_FILE: 'auditor-pick-dds-file',
  AUDITOR_PICK_BGSM_FILE: 'auditor-pick-bgsm-file',

  // Project Management
  PROJECT_LIST: 'project-list',
  PROJECT_CREATE: 'project-create',
  PROJECT_UPDATE: 'project-update',
  PROJECT_DELETE: 'project-delete',
  PROJECT_SWITCH: 'project-switch',
  PROJECT_GET_CURRENT: 'project-get-current',

  // Project Wizard (Phase 3)
  WIZARD_GET_STATE: 'wizard-get-state',
  WIZARD_UPDATE_STEP: 'wizard-update-step',
  WIZARD_SUBMIT_ACTION: 'wizard-submit-action',

  // INI Configuration Manager
  INI_MANAGER_READ_FILE: 'ini-manager-read-file',
  INI_MANAGER_WRITE_FILE: 'ini-manager-write-file',
  INI_MANAGER_FIND_FILES: 'ini-manager-find-files',
  INI_MANAGER_GET_HARDWARE: 'ini-manager-get-hardware',
  INI_MANAGER_BACKUP_FILE: 'ini-manager-backup-file',
  INI_MANAGER_RESTORE_BACKUP: 'ini-manager-restore-backup',

  // Asset Duplicate Scanner
  ASSET_SCANNER_BROWSE_FOLDER: 'asset-scanner-browse-folder',
  ASSET_SCANNER_SCAN_DUPLICATES: 'asset-scanner-scan-duplicates',
  ASSET_SCANNER_CLEANUP_DUPLICATES: 'asset-scanner-cleanup-duplicates',
  ASSET_SCANNER_GET_LAST_PATH: 'asset-scanner-get-last-path',
  ASSET_SCANNER_SAVE_LAST_PATH: 'asset-scanner-save-last-path',

  // Game Log Monitor
  GAME_LOG_MONITOR_BROWSE_LOG: 'game-log-monitor-browse-log',
  GAME_LOG_MONITOR_START: 'game-log-monitor-start',
  GAME_LOG_MONITOR_STOP: 'game-log-monitor-stop',
  GAME_LOG_MONITOR_GET_LAST_PATH: 'game-log-monitor-get-last-path',
  GAME_LOG_MONITOR_SAVE_LAST_PATH: 'game-log-monitor-save-last-path',
  GAME_LOG_MONITOR_EXPORT_LOGS: 'game-log-monitor-export-logs',

  // xEdit Script Executor
  XEDIT_SCRIPT_BROWSE_XEDIT: 'xedit-script-browse-xedit',
  XEDIT_SCRIPT_BROWSE_PLUGIN: 'xedit-script-browse-plugin',
  XEDIT_SCRIPT_GET_XEDIT_PATH: 'xedit-script-get-xedit-path',
  XEDIT_SCRIPT_SAVE_XEDIT_PATH: 'xedit-script-save-xedit-path',
  XEDIT_SCRIPT_GET_PLUGIN_LIST: 'xedit-script-get-plugin-list',
  XEDIT_SCRIPT_EXECUTE: 'xedit-script-execute',

  // Project Templates
  PROJECT_TEMPLATE_BROWSE_PATH: 'project-template-browse-path',
  PROJECT_TEMPLATE_CREATE: 'project-template-create',
  PROJECT_TEMPLATE_DOWNLOAD: 'project-template-download',

  // Mod Conflict Visualizer
  MOD_CONFLICT_SCAN_LOAD_ORDER: 'mod-conflict-scan-load-order',
  MOD_CONFLICT_ANALYZE: 'mod-conflict-analyze',
  MOD_CONFLICT_RESOLVE: 'mod-conflict-resolve',

  // FormID Remapper
  FORMID_REMAPPER_SCAN_CONFLICTS: 'formid-remapper-scan-conflicts',
  FORMID_REMAPPER_REMAP: 'formid-remapper-remap',
  FORMID_REMAPPER_BACKUP: 'formid-remapper-backup',

  // Mod Comparison Tool
  MOD_COMPARISON_COMPARE: 'mod-comparison-compare',
  MOD_COMPARISON_MERGE: 'mod-comparison-merge',
  MOD_COMPARISON_EXPORT: 'mod-comparison-export',

  // Precombine Generator
  PRECOMBINE_GENERATOR_GENERATE: 'precombine-generator-generate',
  PRECOMBINE_GENERATOR_VALIDATE: 'precombine-generator-validate',
  PRECOMBINE_GENERATOR_GET_PJM_PATH: 'precombine-generator-get-pjm-path',

  // Voice Commands
  VOICE_COMMANDS_START: 'voice-commands-start',
  VOICE_COMMANDS_STOP: 'voice-commands-stop',
  VOICE_COMMANDS_EXECUTE: 'voice-commands-execute',

  // Automation Engine
  AUTOMATION_START: 'automation-start',
  AUTOMATION_STOP: 'automation-stop',
  AUTOMATION_GET_SETTINGS: 'automation-get-settings',
  AUTOMATION_UPDATE_SETTINGS: 'automation-update-settings',
  AUTOMATION_TOGGLE_RULE: 'automation-toggle-rule',
  AUTOMATION_TRIGGER_RULE: 'automation-trigger-rule',
  AUTOMATION_GET_STATISTICS: 'automation-get-statistics',
  AUTOMATION_RESET_STATISTICS: 'automation-reset-statistics',

  // Roadmap System (Roadmap System)
  ROADMAP_CREATE: 'roadmap-create',
  ROADMAP_GET_ALL: 'roadmap-get-all',
  ROADMAP_GET_ACTIVE: 'roadmap-get-active',
  ROADMAP_UPDATE_STEP: 'roadmap-update-step',
  ROADMAP_DELETE: 'roadmap-delete',
  ROADMAP_GENERATE_AI: 'roadmap-generate-ai',

  // Proactive Observer (Neural Link+)
  OBSERVER_NOTIFY: 'observer-notify',
  OBSERVER_GET_STATUS: 'observer-get-status',
  OBSERVER_SET_ACTIVE_FOLDER: 'observer-set-active-folder',

  // Duplicate Finder
  DEDUPE_PICK_FOLDERS: 'dedupe-pick-folders',
  DEDUPE_SCAN: 'dedupe-scan',
  DEDUPE_CANCEL: 'dedupe-cancel',
  DEDUPE_PROGRESS: 'dedupe-progress',
  DEDUPE_TRASH: 'dedupe-trash',

  // Load Order Lab (experimental)
  LOAD_ORDER_PICK_MO2_PROFILE_DIR: 'load-order-pick-mo2-profile-dir',
  LOAD_ORDER_PICK_VORTEX_PROFILE_DIR: 'load-order-pick-vortex-profile-dir',
  LOAD_ORDER_PICK_LOOT_REPORT_FILE: 'load-order-pick-loot-report-file',
  LOAD_ORDER_WRITE_USERDATA_FILE: 'load-order-write-userdata-file',
  LOAD_ORDER_LAUNCH_XEDIT: 'load-order-launch-xedit',

  // Generic file helpers
  PICK_JSON_FILE: 'pick-json-file',
  PICK_DIRECTORY: 'pick-directory',
  SAVE_FILE: 'save-file',

  // Local ML (offline semantic search)
  ML_INDEX_BUILD: 'ml-index-build',
  ML_INDEX_QUERY: 'ml-index-query',
  ML_INDEX_STATUS: 'ml-index-status',

  // Local capabilities detection
  ML_CAPS_STATUS: 'ml-caps-status',

  // Local LLM (optional, if installed)
  ML_LLM_STATUS: 'ml-llm-status',
  ML_LLM_GENERATE: 'ml-llm-generate',

  // ElevenLabs TTS (optional)
  ELEVENLABS_STATUS: 'elevenlabs-status',
  ELEVENLABS_LIST_VOICES: 'elevenlabs-list-voices',
  ELEVENLABS_SYNTHESIZE: 'elevenlabs-synthesize',

  // Secrets presence-only status
  SECRET_STATUS: 'secret-status',

  // Settings helpers
  REVEAL_SETTINGS_FILE: 'reveal-settings-file',

  // Speech-to-text (main process handles keys)
  TRANSCRIBE_AUDIO: 'transcribe-audio',
} as const;

export type MlIndexBuildRequest = {
  roots?: string[];
};

export type MlIndexBuildResponse =
  | { ok: true; indexPath: string; indexedChunks: number; indexedSources: number }
  | { ok: false; error: string };

export type MlIndexStatusResponse =
  | { ok: true; indexPath: string; indexedChunks: number; indexedSources: number; model: string; createdAt: string }
  | { ok: false; indexPath: string; reason: string };

export type MlIndexQueryRequest = {
  query: string;
  topK?: number;
};

export type MlIndexQueryResponse =
  | {
      ok: true;
      results: Array<{ score: number; sourcePath: string; title: string; content: string }>;
    }
  | { ok: false; error: string };

export type MlLlmStatusResponse =
  | { ok: true; provider: 'ollama'; baseUrl: string; models: string[] }
  | { ok: false; provider: 'ollama'; baseUrl: string; error: string };

export type MlCapsStatusResponse = {
  ok: true;
  ollama: MlLlmStatusResponse;
  cosmos:
    | { ok: true; provider: 'cosmos'; baseUrl: string; models: string[] }
    | { ok: false; provider: 'cosmos'; baseUrl: string; error: string };
  openaiCompat:
    | { ok: true; provider: 'openai_compat'; baseUrl: string; models: string[] }
    | { ok: false; provider: 'openai_compat'; baseUrl: string; error: string };
};

export type MlLlmGenerateRequest = {
  provider: 'ollama' | 'openai_compat' | 'cosmos';
  model: string;
  prompt: string;
  baseUrl?: string;
};

export type MlLlmGenerateResponse =
  | { ok: true; text: string }
  | { ok: false; error: string };

export type DedupeProgressStage = 'collect' | 'stat' | 'hash' | 'group' | 'done' | 'canceled' | 'error';

export type DedupeProgress = {
  scanId: string;
  stage: DedupeProgressStage;
  current?: number;
  total?: number;
  message?: string;
};

export type DedupeGroup = {
  hash: string;
  size: number;
  files: string[];
};

export type DedupeScanOptions = {
  roots: string[];
  extensions?: string[];
  minSizeBytes?: number;
  maxFiles?: number;
};

export type DedupeScanResult = {
  scanId: string;
  roots: string[];
  extensions: string[];
  totalFilesScanned: number;
  totalBytesScanned: number;
  groups: DedupeGroup[];
};

/**
 * API exposed to renderer via contextBridge
 */
export interface ElectronAPI {
  detectPrograms: () => Promise<InstalledProgram[]>;
  openProgram: (path: string) => Promise<{ success: boolean; error?: string; method?: string }>;
  openExternal: (path: string) => Promise<void>;
  revealInFolder: (path: string) => Promise<{ success: boolean; error?: string }>;
  getRunningProcesses: () => Promise<any[]>;
  getSettings: () => Promise<any>;
  setSettings: (settings: any) => Promise<void>;
  onSettingsUpdated: (callback: (settings: any) => void) => void;

  // Audio - TTS (Text-to-Speech)
  ttsSpeak: (text: string) => Promise<void>;
  onTtsSpeak: (callback: (text: string) => void) => (() => void);

  // Audio - STT (Speech-to-Text)
  sttStart: () => Promise<void>;
  sttStop: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  onSttResult: (callback: (text: string) => void) => (() => void);

  // Real-time STT partial transcript
  onSttPartial: (callback: (partial: string) => void) => (() => void);

  // Real-time mic level
  onMicLevel: (callback: (level: number) => void) => (() => void);

  // Messaging
  sendMessage: (message: string | VoiceChatPayload) => Promise<void>;
  onMessage: (callback: (message: Message) => void) => (() => void);

  // Developer tools
  openDevTools: () => Promise<void>;

  // Window controls
  minimizeWindow: () => void;
  closeWindow: () => void;

  elevenLabsStatus?: () => Promise<
    | { ok: true; configured: boolean; voiceId?: string; provider?: 'browser' | 'elevenlabs' }
    | { ok: false; error: string }
  >;
  elevenLabsListVoices?: () => Promise<
    | {
        ok: true;
        voices: Array<{
          voice_id: string;
          name: string;
          category?: string;
          labels?: Record<string, string>;
        }>;
      }
    | { ok: false; error: string }
  >;
  elevenLabsSynthesizeSpeech?: (args: {
    text: string;
    voiceId?: string;
  }) => Promise<
    | { ok: true; audioBase64: string; mimeType?: string }
    | { ok: false; error: string }
  >;

  getSecretStatus?: () => Promise<
    | { ok: true; openai: boolean; groq: boolean; elevenlabs: boolean }
    | { ok: false; error: string }
  >;

  transcribeAudio?: (arrayBuffer: ArrayBuffer, mimeType?: string) => Promise<{ success: boolean; text?: string; error?: string }>;
  checkBlenderAddon: () => Promise<{ connected: boolean; error?: string }>;
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
  getPerformance: () => Promise<{
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage?: number;
    gpuMemory?: number;
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
  runPapyrusCompiler: (
    scriptPath: string,
    compilerPathOrOptions: string | {
      compilerPath: string;
      scriptPath?: string;
      flagsPath?: string;
      importPaths?: string[] | string;
      outputPath?: string;
      release?: boolean;
      optimize?: boolean;
      final?: boolean;
      quiet?: boolean;
      additionalArgs?: string[];
      cwd?: string;
    }
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  fsStat: (targetPath: string) => Promise<{ exists: boolean; isFile: boolean; isDirectory: boolean }>;
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
  pickNifFile: () => Promise<string>;
  pickDdsFile: () => Promise<string>;
  pickBgsmFile: () => Promise<string>;

  // Generic file helpers
  pickJsonFile: () => Promise<string>;
  pickDirectory: (title?: string) => Promise<string>;
  saveFile: (content: string, filename: string) => Promise<string>;

  // Local ML (offline semantic search)
  mlIndexBuild: (req?: MlIndexBuildRequest) => Promise<MlIndexBuildResponse>;
  mlIndexStatus: () => Promise<MlIndexStatusResponse>;
  mlIndexQuery: (req: MlIndexQueryRequest) => Promise<MlIndexQueryResponse>;

  // Capabilities
  mlCapsStatus: () => Promise<MlCapsStatusResponse>;

  // Local LLM (optional)
  mlLlmStatus: () => Promise<MlLlmStatusResponse>;
  mlLlmGenerate: (req: MlLlmGenerateRequest) => Promise<MlLlmGenerateResponse>;

  // Duplicate Finder
  pickDedupeFolders: () => Promise<string[]>;
  dedupeScan: (options: DedupeScanOptions) => Promise<DedupeScanResult>;
  dedupeCancel: (scanId: string) => Promise<{ ok: boolean }>;
  onDedupeProgress: (callback: (progress: DedupeProgress) => void) => void;
  dedupeTrash: (payload: { scanId: string; paths: string[] }) => Promise<{
    ok: boolean;
    results: Array<{ path: string; ok: boolean; error?: string }>;
  }>;
}

export interface VoiceChatPayload {
  text: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  workingMemory?: string;
  projectData?: Record<string, any> | null;
}

// Window typings live in src/renderer/src/electron.d.ts
