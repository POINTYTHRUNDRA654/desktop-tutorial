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

  // Voice history persistence (added to match shared-types)
  SAVE_VOICE_HISTORY: 'save-voice-history',
  GET_VOICE_HISTORY_PATH: 'get-voice-history-path',
  OPEN_PROGRAM: 'open-program',
  OPEN_EXTERNAL: 'open-external',
  LAUNCH_TOOL_WITH_FILE: 'launch-tool-with-file',
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
  // special helper for blender add-on ZIP (binary data encoded as base64)
  WORKSHOP_READ_BLENDER_ZIP: 'workshop-read-blender-zip',

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
  AUDITOR_READ_BINARY_FILE: 'auditor-read-binary-file',
  AUDITOR_PICK_ESP_FILE: 'auditor-pick-esp-file',
  AUDITOR_PICK_NIF_FILE: 'auditor-pick-nif-file',
  AUDITOR_PICK_DDS_FILE: 'auditor-pick-dds-file',
  AUDITOR_PICK_BGSM_FILE: 'auditor-pick-bgsm-file',
  AUDITOR_SCAN_MOD_DIRECTORY: 'auditor-scan-mod-directory',
  AUDITOR_SCAN_MOD_DIRECTORY_PATH: 'auditor-scan-mod-directory-path',

  // DDS Converter & Texture Generator
  DDS_CONVERTER_PICK_FILES: 'dds-converter:pick-files',

  // Knowledge Vault file persistence (backup/restore to userData/knowledge-vault.json)
  SAVE_KNOWLEDGE_VAULT: 'save-knowledge-vault',
  LOAD_KNOWLEDGE_VAULT: 'load-knowledge-vault',

  // .NET Desktop Runtime detection (needed by Spriggit and other .NET tools)
  CHECK_DOTNET: 'check-dotnet',

  // Spriggit integration — run Spriggit.CLI.exe serialize and read results
  SPRIGGIT_PICK_CLI: 'spriggit-pick-cli',
  SPRIGGIT_SERIALIZE: 'spriggit-serialize',
  SPRIGGIT_OPEN_FOLDER: 'spriggit-open-folder',
  SPRIGGIT_CLEAR_CACHE: 'spriggit-clear-cache',
  SPRIGGIT_UNBLOCK_FILES: 'spriggit-unblock-files',
  SPRIGGIT_ADD_DEFENDER_EXCLUSION: 'spriggit-add-defender-exclusion',
  SPRIGGIT_VERIFY_DEFENDER_EXCLUSION: 'spriggit-verify-defender-exclusion',

  // Mod Projects file persistence (backup/restore to userData/mod-projects.json)
  SAVE_MOD_PROJECTS: 'save-mod-projects',
  LOAD_MOD_PROJECTS: 'load-mod-projects',

  // Chat History file persistence (backup/restore to userData/chat-history.json)
  SAVE_CHAT_HISTORY: 'save-chat-history',
  LOAD_CHAT_HISTORY: 'load-chat-history',

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

  // Creation Kit Link - path pickers
  CK_PICK_CREATIONKIT_EXE: 'ck-pick-creationkit-exe',
  CK_PICK_FALLOUT4_FOLDER: 'ck-pick-fallout4-folder',
  CK_PICK_PAPYRUS_COMPILER: 'ck-pick-papyrus-compiler',
  CK_PICK_PAPYRUS_FLAGS: 'ck-pick-papyrus-flags',
  CK_PICK_IMPORT_PATHS: 'ck-pick-import-paths',
  CK_PICK_SOURCE_FOLDER: 'ck-pick-source-folder',
  CK_PICK_OUTPUT_FOLDER: 'ck-pick-output-folder',

  // Local ML (offline semantic search)
  ML_INDEX_BUILD: 'ml-index-build',
  ML_INDEX_QUERY: 'ml-index-query',
  ML_INDEX_STATUS: 'ml-index-status',

  // Local capabilities detection
  ML_CAPS_STATUS: 'ml-caps-status',

  // Local LLM (optional, if installed)
  ML_LLM_STATUS: 'ml-llm-status',
  ML_LLM_GENERATE: 'ml-llm-generate',

  // Edition detection
  GET_MOSSY_EDITION: 'get-mossy-edition',

  // GGUF / Unsloth model import
  GGUF_PICK_FILE: 'gguf-pick-file',
  GGUF_IMPORT_TO_OLLAMA: 'gguf-import-to-ollama',

  // NVIDIA fine-tuning (Unsloth)
  FINE_TUNE_PICK_DATASET: 'fine-tune-pick-dataset',
  FINE_TUNE_START: 'fine-tune-start',

  // Training dataset (fine-tuning pipeline)
  TRAINING_DATA_ADD_PAIR: 'training-data-add-pair',
  TRAINING_DATA_GET_STATS: 'training-data-get-stats',
  TRAINING_DATA_EXPORT_JSONL: 'training-data-export-jsonl',
  TRAINING_DATA_CLEAR: 'training-data-clear',

  // Secrets presence-only status
  SECRET_STATUS: 'secret-status',

  // Settings helpers
  REVEAL_SETTINGS_FILE: 'reveal-settings-file',

  // Speech-to-text (main process handles keys)
  TRANSCRIBE_AUDIO: 'transcribe-audio',

  // Fresh-install detection: sent to renderer when a fresh-install.marker is found
  TRIGGER_FRESH_INSTALL: 'trigger-fresh-install',

  // Panel data persistence
  SAVE_PANEL_DATA: 'panel-data-save',
  LOAD_PANEL_DATA: 'panel-data-load',
  DELETE_PANEL_DATA: 'panel-data-delete',

  // ============================================================================
  // MOSSY BRAIN 8 FEATURES (April 2026)
  // ============================================================================

  // 1. Persistent Cross-Session Memory
  MEMORY_STORE_SAVE: 'memory-store-save',
  MEMORY_STORE_LOAD: 'memory-store-load',
  MEMORY_STORE_ADD_FACT: 'memory-store-add-fact',
  MEMORY_STORE_QUERY: 'memory-store-query',
  MEMORY_STORE_GET_ALL: 'memory-store-get-all',
  MEMORY_STORE_DELETE: 'memory-store-delete',
  MEMORY_STORE_UPDATE: 'memory-store-update',

  // 2. Automatic Session Journal
  SESSION_JOURNAL_START: 'session-journal-start',
  SESSION_JOURNAL_END: 'session-journal-end',
  SESSION_JOURNAL_APPEND: 'session-journal-append',
  SESSION_JOURNAL_GET_ENTRIES: 'session-journal-get-entries',

  // 3. Shared Context Bus (Zustand sync to disk)
  CONTEXT_BUS_SYNC: 'context-bus-sync',
  CONTEXT_BUS_LOAD: 'context-bus-load',

  // 4. Auto-Ingestion Pipeline
  AUTO_INGEST_WATCH_START: 'auto-ingest-watch-start',
  AUTO_INGEST_WATCH_STOP: 'auto-ingest-watch-stop',
  AUTO_INGEST_PROCESS_FILE: 'auto-ingest-process-file',
  AUTO_INGEST_FOLDER_CHANGE: 'auto-ingest-folder-change',

  // 5. Unified Semantic Search
  SEARCH_GLOBAL: 'search-global',
  SEARCH_GLOBAL_INDEX: 'search-global-index',

  // 6. Clipboard Intelligence
  CLIPBOARD_WATCH_START: 'clipboard-watch-start',
  CLIPBOARD_WATCH_STOP: 'clipboard-watch-stop',
  CLIPBOARD_DETECTED: 'clipboard-detected',

  // 7. Background Task Queue
  TASK_ENQUEUE: 'task-enqueue',
  TASK_LIST: 'task-list',
  TASK_GET_STATUS: 'task-get-status',
  TASK_CANCEL: 'task-cancel',
  TASK_COMPLETION: 'task-completion',

  // 8. Hardware Sensor Feed
  SYSTEM_METRICS_POLL: 'system-metrics-poll',
  SYSTEM_METRICS_GET: 'system-metrics-get',
  SYSTEM_METRICS_SUBSCRIBE: 'system-metrics-subscribe',
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

// ============================================================================
// MOSSY BRAIN FEATURE TYPES
// ============================================================================

// 1. Persistent Memory Store
export interface MemoryFact {
  id: string;
  fact: string;
  context: string;
  createdAt: string;
  lastUsed: string;
  confidence: number; // 0-1
  source?: string;
  tags?: string[];
}

export type MemoryStoreAddFactRequest = {
  fact: string;
  context: string;
  tags?: string[];
};

export type MemoryStoreQueryRequest = {
  query: string;
  topK?: number;
};

export type MemoryStoreQueryResponse = {
  ok: boolean;
  facts?: MemoryFact[];
  error?: string;
};

// 2. Session Journal
export interface JournalEntry {
  id: string;
  timestamp: string;
  summary: string; // 3-bullet summary
  messagesCount: number;
  duration: number; // seconds
  topics: string[];
}

export type SessionJournalEndRequest = {
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  startTime: number;
};

export type SessionJournalEndResponse = {
  ok: boolean;
  entry?: JournalEntry;
  error?: string;
};

// 3. Shared Context Bus
export interface ContextBusState {
  plans: any[];
  notes: any[];
  discoveredIssues: any[];
  results: any[];
  timestamp: number;
}

// 4. Auto-Ingestion Pipeline
export interface IngestedFile {
  id: string;
  path: string;
  type: 'papyrus' | 'xml' | 'json' | 'crash-log' | 'markdown' | 'script' | 'unknown';
  summary: string;
  facts: MemoryFact[];
  indexedAt: string;
}

export type AutoIngestProcessFileRequest = {
  filePath: string;
  autoSummarize?: boolean;
};

export type AutoIngestProcessFileResponse = {
  ok: boolean;
  ingested?: IngestedFile;
  error?: string;
};

// 5. Unified Semantic Search
export interface SearchResult {
  type: 'chat' | 'plan' | 'journal' | 'doc' | 'asset' | 'memory' | 'training-data';
  id: string;
  title: string;
  preview: string;
  score: number;
  source: string;
  timestamp?: string;
}

export type SearchGlobalRequest = {
  query: string;
  topK?: number;
};

export type SearchGlobalResponse = {
  ok: boolean;
  results?: SearchResult[];
  error?: string;
};

// 6. Clipboard Intelligence
export interface ClipboardDetection {
  type: 'crash-log' | 'papyrus-script' | 'url' | 'mod-description' | 'asset-path' | 'unknown';
  content: string;
  confidence: number; // 0-1
  suggestedActions: Array<{ action: string; label: string }>;
}

// 7. Background Task Queue
export interface BackgroundTask {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
  progress?: { current: number; total: number };
}

export type TaskEnqueueRequest = {
  type: string;
  priority?: number;
  payload?: any;
};

export type TaskEnqueueResponse = {
  ok: boolean;
  taskId?: string;
  error?: string;
};

export type TaskStatusResponse = {
  ok: boolean;
  task?: BackgroundTask;
  error?: string;
};

// 8. Hardware Sensor Feed
export interface SystemMetrics {
  cpu: {
    usage: number; // 0-100
    cores: number;
    temperature?: number; // Celsius
  };
  gpu?: {
    usage: number; // 0-100
    temperature?: number; // Celsius
    vramUsed: number; // MB
    vramTotal: number; // MB
  };
  memory: {
    used: number; // MB
    total: number; // MB
    percentage: number; // 0-100
  };
  disk?: {
    used: number; // GB
    total: number; // GB
    percentage: number; // 0-100
  };
  timestamp: number;
}

export type SystemMetricsResponse = {
  ok: boolean;
  metrics?: SystemMetrics;
  error?: string;
};

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

export type GgufImportRequest = {
  ggufPath: string;
  modelName: string;
  systemPrompt?: string;
};

export type GgufImportResponse =
  | { ok: true; modelName: string }
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

  getSecretStatus: () => Promise<
    | { ok: true; openai: boolean; groq: boolean; backendToken: boolean }
    | { ok: false; error: string }
  >;

  transcribeAudio: (arrayBuffer: ArrayBuffer, mimeType?: string) => Promise<{ success: boolean; text?: string; error?: string }>;
  saveVoiceHistory: (line: string) => Promise<{ success: boolean; error?: string }>;
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
    storageDrives?: Array<{ device: string, free: number, total: number }>;
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

  // Tool auto-download — lets the app download optional tools (e.g. UModel) on demand.
  downloadUModel: (destDir?: string) => Promise<any>;

  // PyTorch — check availability and auto-install builds with CUDA diagnostics
  checkPyTorch: () => Promise<{
    available: boolean;
    version?: string;
    path?: string;
    pythonFound?: boolean;
    cudaAvailable?: boolean;
    computeMode?: 'CPU' | 'CUDA' | 'UNKNOWN';
    cudaIssue?: boolean;
    error?: string;
    troubleshooting?: string[];
  }>;
  installPyTorch: (destDir?: string, mode?: string) => Promise<{
    success: boolean;
    path?: string;
    version?: string;
    message?: string;
    error?: string;
    troubleshooting?: string[];
  }>;
  onPytorchSetupProgress: (callback: (data: { message: string }) => void) => (() => void);
  onFreshInstall: (callback: () => void) => (() => void);

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
  /** Read any mod asset file as binary — returns base64-encoded bytes for the renderer worker */
  readBinaryFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  pickEspFile: () => Promise<string>;
  pickNifFile: () => Promise<string[]>;
  pickDdsFile: () => Promise<string[]>;
  pickBgsmFile: () => Promise<string[]>;
  /** Scan a mod directory for mod files (opens OS folder dialog) */
  scanModDirectory: () => Promise<Array<{ path: string; type: string }>>;
  /** Scan a mod directory for mod files using a pre-selected path (no OS dialog) */
  scanModDirectoryPath: (folderPath: string) => Promise<Array<{ path: string; type: string }>>;

  // Knowledge Vault file persistence
  /** Persist the full Knowledge Vault to userData/knowledge-vault.json */
  saveKnowledgeVault: (items: unknown[]) => Promise<{ ok: boolean; error?: string }>;
  /** Load the Knowledge Vault from userData/knowledge-vault.json (returns [] if not found) */
  loadKnowledgeVaultFromFile: () => Promise<unknown[]>;

  // Spriggit integration
  /** Open a file picker to select Spriggit.CLI.exe — returns selected path or '' */
  spriggitPickCli: () => Promise<string>;
  /**
   * Open the folder containing the given path (e.g. the Spriggit install folder)
   * in the OS file manager so the user can verify the extraction.
   * Returns {ok: true} on success or {ok: false, error} on failure.
   */
  spriggitOpenFolder: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
  /**
   * Clear the Spriggit single-file publish temp-cache directories so Spriggit
   * re-extracts cleanly on the next run.  Attempts both the %LOCALAPPDATA% and
   * %TEMP% paths that .NET single-file apps use.
   * Returns the paths it cleared plus any error string.
   */
  spriggitClearCache: () => Promise<{ ok: boolean; clearedPaths: string[]; error?: string }>;
  /**
   * Add the user's Spriggit folder to Windows Defender exclusions so Smart App Control
   * can no longer block the .NET assemblies Spriggit extracts at runtime.
   * Tries direct Add-MpPreference first (works when Mossy runs as admin); if that fails,
   * returns the folder path and command so the user can run it in an elevated shell.
   * Windows-only; returns ok:false with a message on other platforms.
   */
  spriggitAddDefenderExclusion: () => Promise<{ ok: boolean; excludedPath?: string; error?: string }>;
  /**
   * Check if the Spriggit folder is already excluded from Windows Defender.
   * Returns ok:true with excluded:true/false, or ok:false with error on failure.
   * Windows-only; returns ok:false with a message on other platforms.
   */
  spriggitVerifyDefenderExclusion: () => Promise<{ ok: boolean; excluded?: boolean; targetPath?: string; error?: string }>;
  /**
   * Run Spriggit.CLI.exe serialize on a Fallout 4 Data folder.
   * Returns the list of YAML files produced and their truncated text content,
   * or an error string on failure.
   */
  spriggitSerialize: (params: {
    cliPath: string;
    dataPath: string;
    outputPath: string;
    /** When true, serialize only vanilla/DLC ESMs instead of custom mods. */
    vanillaOnly?: boolean;
    /** Custom NuGet package name, e.g. 'Spriggit.Yaml.Fallout4' (default) or a user-published package. */
    packageName?: string;
    /** Local NuGet source directory — lets Spriggit use locally cached packages instead of downloading from nuget.org. */
    nugetSource?: string;
  }) => Promise<{ ok: boolean; files: Array<{ name: string; content: string }>; error?: string; skippedVanillaCount?: number; skippedCustomCount?: number; noCustomMods?: boolean; noVanillaPlugins?: boolean; fo4Version?: string; fo4Label?: string; spriggitVersion?: string; spriggitVersionTooOld?: boolean }>;

  /** Persist all mod projects to userData/mod-projects.json so work survives reinstalls */
  saveModProjects: (projects: unknown[]) => Promise<{ ok: boolean; error?: string }>;
  /** Load mod projects from userData/mod-projects.json (returns [] if not found) */
  loadModProjectsFromFile: () => Promise<unknown[]>;

  /** Persist chat history to userData/chat-history.json so conversations survive reinstalls */
  saveChatHistory: (messages: unknown[]) => Promise<{ ok: boolean; error?: string }>;
  /** Load chat history from userData/chat-history.json (returns [] if not found) */
  loadChatHistoryFromFile: () => Promise<unknown[]>;

  // Generic file helpers
  pickJsonFile: () => Promise<string>;
  pickDirectory: (title?: string) => Promise<string>;

  // Creation Kit Link - path pickers
  pickCreationKitExe: () => Promise<string>;
  pickFallout4Folder: () => Promise<string>;
  pickPapyrusCompiler: () => Promise<string>;
  pickPapyrusFlags: () => Promise<string>;
  pickImportPaths: () => Promise<string>;
  pickSourceFolder: () => Promise<string>;
  pickOutputFolder: () => Promise<string>;
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

  // GGUF / Unsloth model import
  ggufPickFile: () => Promise<string>;
  ggufImportToOllama: (req: GgufImportRequest) => Promise<GgufImportResponse>;

  // Training dataset (fine-tuning pipeline)
  trainingDataAddPair: (pair: { question: string; answer: string; rating: 'good' | 'bad'; topic?: string; editedAnswer?: string }) => Promise<{ ok: boolean; error?: string }>;
  trainingDataGetStats: () => Promise<{ total: number; good: number; bad: number; topics: Record<string, number> }>;
  trainingDataExportJsonl: (opts?: { goodOnly?: boolean; outputPath?: string }) => Promise<{ ok: boolean; path?: string; count?: number; error?: string }>;
  trainingDataClear: () => Promise<{ ok: boolean; error?: string }>;

  // Duplicate Finder
  pickDedupeFolders: () => Promise<string[]>;
  dedupeScan: (options: DedupeScanOptions) => Promise<DedupeScanResult>;
  dedupeCancel: (scanId: string) => Promise<{ ok: boolean }>;
  onDedupeProgress: (callback: (progress: DedupeProgress) => void) => void;
  dedupeTrash: (payload: { scanId: string; paths: string[] }) => Promise<{
    ok: boolean;
    results: Array<{ path: string; ok: boolean; error?: string }>;
  }>;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => (() => void);
  openDialog: (options: any) => Promise<string | null>;
  listProcesses: (filter?: string) => Promise<any[]>;
  getProcessMetrics: (pid: number) => Promise<any>;
  gameLogMonitor: {
    getLastLogPath: () => Promise<string | null>;
    browseLogFile: () => Promise<string | null>;
    saveLastLogPath: (path: string) => Promise<void>;
    startMonitoring: (path: string) => Promise<void>;
    stopMonitoring: () => Promise<void>;
    onLogUpdate: (callback: (entry: any) => void) => void;
    exportLogs: (entries: any[]) => Promise<void>;
  };
  formIdRemapper: {
    scanConflicts: (path: string) => Promise<{ count: number; conflicts: any[] }>;
    remapFormIds: (path: string) => Promise<{ success: boolean }>;
  };
  modComparisonTool: { compare: (mod1: string, mod2: string) => Promise<{ differences: any[] }>; merge?: () => Promise<any>; export?: () => Promise<any> };
  modConflictVisualizer: { scanLoadOrder: () => Promise<{ plugins: string[]; conflicts: any[] }>; analyze?: () => Promise<any>; resolve?: () => Promise<any> };
  projectTemplates: {
    browsePath: () => Promise<string | null>;
    createProject: (config: { templateId: string; projectName: string; projectPath: string; authorName: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
    downloadTemplate: (templateId: string) => Promise<boolean>;
  };
  voiceCommands: {
    startListening: () => Promise<void>;
    stopListening: () => Promise<void>;
    onTranscript: (callback: (text: string) => void) => void;
  };
  xEditScriptExecutor: {
    getXEditPath: () => Promise<string | null>;
    getPluginList: () => Promise<string[]>;
    browseXEdit: () => Promise<string | null>;
    saveXEditPath: (path: string) => Promise<void>;
    browsePlugin: () => Promise<string | null>;
    onProgress: (callback: (data: { progress: number; text: string }) => void) => void;
    executeScript: (xEditPath: string, plugin: string, scriptId: string) => Promise<{ success: boolean; output: string; errors: string[]; warnings: string[]; duration: number }>;
  };
  fomodCreate: (payload: any) => Promise<any>;
  fomodPreview: (payload: any, selections?: any) => Promise<any>;
  fomodValidate: (payload: any) => Promise<any>;
  fomodExport: (payload: any, outputPath?: any) => Promise<any>;
  fomodSaveProject: (payload: any, projectPath?: any) => Promise<any>;
  modPackagingValidateStructure: (payload: any) => Promise<any>;
  modPackagingGenerateReadme: (payload: any, template?: any) => Promise<any>;
  modPackagingCreateArchive: (payload: any, modInfo?: any, readme?: any, settings?: any) => Promise<any>;
  modPackagingPrepareNexus: (payload: any) => Promise<any>;
  modPackagingIncrementVersion: (version: any, type?: any) => Promise<any>;
  exportAnalyticsReport: (payload: any) => Promise<any>;
  getAppVersion: () => Promise<{ success: boolean; version?: string; error?: string }>;
  aiGenerateScript: (payload: any) => Promise<any>;
  aiPlanWorkflow: (payload: any) => Promise<any>;
  aiDiagnoseError: (payload: any) => Promise<any>;
  aiExplain: (payload: any) => Promise<any>;
  aiSuggestNames: (payload: any) => Promise<any>;
  aiExecuteWorkflow: (payload: any) => Promise<any>;
  versionControlHistory: (payload?: any) => Promise<any>;
  versionControlListBackups: (payload?: any) => Promise<any>;
  versionControlShowChanges: (payload?: any) => Promise<any>;
  versionControlCommit: (payload?: any) => Promise<any>;
  versionControlRestore: (payload?: any) => Promise<any>;
  versionControlCreateBackup: (payload?: any) => Promise<any>;
  versionControlDeleteBackup: (payload?: any) => Promise<any>;
  webSearch: (query: string, type?: string) => Promise<any>;
  browseWeb: (url: string) => Promise<any>;
  testInternetAccess: () => Promise<{
    providers: Array<{ name: string; url: string; ok: boolean; result?: string; empty?: boolean; error?: string; ms: number }>;
    wikiOk: boolean;
    generalOk: boolean;
    summary: string;
  }>;

  // ============================================================================
  // MOSSY BRAIN 8 FEATURES API (April 2026)
  // ============================================================================

  // 1. Persistent Memory Store
  memoryStoreSave: (facts: MemoryFact[]) => Promise<{ ok: boolean; error?: string }>;
  memoryStoreLoad: () => Promise<{ ok: boolean; facts?: MemoryFact[]; error?: string }>;
  memoryStoreAddFact: (req: MemoryStoreAddFactRequest) => Promise<{ ok: boolean; factId?: string; error?: string }>;
  memoryStoreQuery: (req: MemoryStoreQueryRequest) => Promise<MemoryStoreQueryResponse>;
  memoryStoreGetAll: () => Promise<{ ok: boolean; facts?: MemoryFact[]; error?: string }>;
  memoryStoreDelete: (factId: string) => Promise<{ ok: boolean; error?: string }>;
  memoryStoreUpdate: (factId: string, updates: Partial<MemoryFact>) => Promise<{ ok: boolean; error?: string }>;

  // 2. Session Journal
  sessionJournalStart: () => Promise<{ ok: boolean; sessionId?: string; error?: string }>;
  sessionJournalEnd: (req: SessionJournalEndRequest) => Promise<SessionJournalEndResponse>;
  sessionJournalAppend: (entry: JournalEntry) => Promise<{ ok: boolean; error?: string }>;
  sessionJournalGetEntries: (limit?: number) => Promise<{ ok: boolean; entries?: JournalEntry[]; error?: string }>;

  // 3. Shared Context Bus
  contextBusSync: (state: ContextBusState) => Promise<{ ok: boolean; error?: string }>;
  contextBusLoad: () => Promise<{ ok: boolean; state?: ContextBusState; error?: string }>;

  // 4. Auto-Ingestion Pipeline
  autoIngestWatchStart: (folderPath: string) => Promise<{ ok: boolean; error?: string }>;
  autoIngestWatchStop: () => Promise<{ ok: boolean; error?: string }>;
  autoIngestProcessFile: (req: AutoIngestProcessFileRequest) => Promise<AutoIngestProcessFileResponse>;
  onAutoIngestFolderChange: (callback: (folderPath: string) => void) => (() => void);

  // 5. Unified Semantic Search
  searchGlobal: (req: SearchGlobalRequest) => Promise<SearchGlobalResponse>;
  searchGlobalIndex: () => Promise<{ ok: boolean; indexed: number; error?: string }>;

  // 6. Clipboard Intelligence
  clipboardWatchStart: () => Promise<{ ok: boolean; error?: string }>;
  clipboardWatchStop: () => Promise<{ ok: boolean; error?: string }>;
  onClipboardDetected: (callback: (detection: ClipboardDetection) => void) => (() => void);

  // 7. Background Task Queue
  taskEnqueue: (req: TaskEnqueueRequest) => Promise<TaskEnqueueResponse>;
  taskList: (filter?: { status?: string }) => Promise<{ ok: boolean; tasks?: BackgroundTask[]; error?: string }>;
  taskGetStatus: (taskId: string) => Promise<TaskStatusResponse>;
  taskCancel: (taskId: string) => Promise<{ ok: boolean; error?: string }>;
  onTaskCompletion: (callback: (task: BackgroundTask) => void) => (() => void);

  // 8. Hardware Sensor Feed
  systemMetricsPoll: () => Promise<SystemMetricsResponse>;
  systemMetricsGet: () => Promise<SystemMetricsResponse>;
  onSystemMetricsUpdate: (callback: (metrics: SystemMetrics) => void) => (() => void);
}

export interface VoiceChatPayload {
  text: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  workingMemory?: string;
  projectData?: Record<string, any> | null;
}

// Window typings live in src/renderer/src/electron.d.ts
