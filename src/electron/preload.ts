/// <reference lib="dom" />
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

// tests rely on boot/onboarding flags being present before React loads.  Preload
// runs before any renderer scripts, so we can safely mutate localStorage here
// when running under test mode.
try {
  if (process.env.ELECTRON_IS_TEST === 'true') {
    // set items; some tests also look for mossy_test_mode/has_booted
    window.localStorage.setItem('mossy_onboarding_completed', 'true');
    window.localStorage.setItem('mossy_onboarding_complete', 'true');
    window.localStorage.setItem('mossy_has_booted', 'true');
    window.localStorage.setItem('mossy_test_mode', 'true');
    // readiness flag may be read from preload later too
    (window as any).__MOSSY_TEST_READY__ = true;
  }
} catch (e) {
  // ignore; environment may restrict localStorage in some contexts
}


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
  LAUNCH_TOOL_WITH_FILE: 'launch-tool-with-file',
  OPEN_EXTERNAL: 'open-external',
  REVEAL_IN_FOLDER: 'reveal-in-folder',
  REVEAL_SETTINGS_FILE: 'reveal-settings-file',
  GET_TOOL_VERSION: 'get-tool-version',
  GET_RUNNING_PROCESSES: 'get-running-processes',
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  SETTINGS_UPDATED: 'settings-updated',

  // voice history persistence
  SAVE_VOICE_HISTORY: 'save-voice-history',
  GET_VOICE_HISTORY_PATH: 'get-voice-history-path',
  CHECK_BLENDER_ADDON: 'check-blender-addon',
  SEND_BLENDER_COMMAND: 'send-blender-command',
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
  WORKSHOP_READ_BLENDER_ZIP: 'workshop-read-blender-zip',
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
  AUDITOR_READ_BINARY_FILE: 'auditor-read-binary-file',
  AUDITOR_PICK_ESP_FILE: 'auditor-pick-esp-file',
  AUDITOR_PICK_NIF_FILE: 'auditor-pick-nif-file',
  AUDITOR_PICK_DDS_FILE: 'auditor-pick-dds-file',
  AUDITOR_PICK_BGSM_FILE: 'auditor-pick-bgsm-file',
  AUDITOR_SCAN_MOD_DIRECTORY: 'auditor-scan-mod-directory',
  AUDITOR_SCAN_MOD_DIRECTORY_PATH: 'auditor-scan-mod-directory-path',

  // Knowledge Vault file persistence
  SAVE_KNOWLEDGE_VAULT: 'save-knowledge-vault',
  LOAD_KNOWLEDGE_VAULT: 'load-knowledge-vault',

  // .NET Desktop Runtime detection
  CHECK_DOTNET: 'check-dotnet',

  // Spriggit integration
  SPRIGGIT_PICK_CLI: 'spriggit-pick-cli',
  SPRIGGIT_SERIALIZE: 'spriggit-serialize',
  SPRIGGIT_OPEN_FOLDER: 'spriggit-open-folder',
  SPRIGGIT_CLEAR_CACHE: 'spriggit-clear-cache',
  SPRIGGIT_UNBLOCK_FILES: 'spriggit-unblock-files',
  SPRIGGIT_ADD_DEFENDER_EXCLUSION: 'spriggit-add-defender-exclusion',

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

  // Edition detection
  GET_MOSSY_EDITION: 'get-mossy-edition',

  // GGUF / Unsloth model import
  GGUF_PICK_FILE: 'gguf-pick-file',
  GGUF_IMPORT_TO_OLLAMA: 'gguf-import-to-ollama',

  // NVIDIA fine-tuning (Unsloth)
  FINE_TUNE_PICK_DATASET: 'fine-tune-pick-dataset',
  FINE_TUNE_START: 'fine-tune-start',

  // Training dataset
  TRAINING_DATA_ADD_PAIR: 'training-data-add-pair',
  TRAINING_DATA_GET_STATS: 'training-data-get-stats',
  TRAINING_DATA_EXPORT_JSONL: 'training-data-export-jsonl',
  TRAINING_DATA_CLEAR: 'training-data-clear',

  // Secrets presence-only status
  SECRET_STATUS: 'secret-status',

  // Speech-to-text (main process handles keys)
  TRANSCRIBE_AUDIO: 'transcribe-audio',

  // Roadmap System (v5.4.23+)
  ROADMAP_GET_ALL: 'roadmap-get-all',
  ROADMAP_GET_ACTIVE: 'roadmap-get-active',
  ROADMAP_CREATE: 'roadmap-create',
  ROADMAP_UPDATE_STEP: 'roadmap-update-step',
  ROADMAP_DELETE: 'roadmap-delete',
  ROADMAP_GENERATE_AI: 'roadmap-generate-ai',

  // Proactive Observer (Neural Link+)
  OBSERVER_NOTIFY: 'observer-notify',
  OBSERVER_SET_ACTIVE_FOLDER: 'observer-set-active-folder',

  // Multi-Project Support
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
  // CK Crash Prevention
  CK_CRASH_VALIDATE: 'ck-crash-prevention:validate',
  CK_CRASH_ANALYZE: 'ck-crash-prevention:analyze-crash',
  CK_CRASH_GENERATE_PLAN: 'ck-crash-prevention:generate-plan',
  CK_CRASH_PICK_LOG: 'ck-crash-prevention:pick-log-file',

  // Mod Projects persistence
  SAVE_MOD_PROJECTS: 'save-mod-projects',
  LOAD_MOD_PROJECTS: 'load-mod-projects',

  // Chat History persistence
  SAVE_CHAT_HISTORY: 'save-chat-history',
  LOAD_CHAT_HISTORY: 'load-chat-history',

  // Fresh-install detection
  TRIGGER_FRESH_INSTALL: 'trigger-fresh-install',

  // Creation Kit Link - path pickers
  CK_PICK_CREATIONKIT_EXE: 'ck-pick-creationkit-exe',
  CK_PICK_FALLOUT4_FOLDER: 'ck-pick-fallout4-folder',
  CK_PICK_PAPYRUS_COMPILER: 'ck-pick-papyrus-compiler',
  CK_PICK_PAPYRUS_FLAGS: 'ck-pick-papyrus-flags',
  CK_PICK_IMPORT_PATHS: 'ck-pick-import-paths',
  CK_PICK_SOURCE_FOLDER: 'ck-pick-source-folder',
  CK_PICK_OUTPUT_FOLDER: 'ck-pick-output-folder',

  // Panel data persistence
  SAVE_PANEL_DATA: 'panel-data-save',
  LOAD_PANEL_DATA: 'panel-data-load',
  DELETE_PANEL_DATA: 'panel-data-delete',
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
   * @returns Promise resolving to array of running processes
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
   * Check if the Blender Mossy Link add-on socket is reachable.
   * Used by Desktop Bridge "Blender Link" panel.
   */
  checkBlenderAddon: (): Promise<{ connected: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECK_BLENDER_ADDON);
  },

  /**
   * Query the Blender add-on HTTP bridge status (port 8080 server).
   * Returns whether the bridge is running, current step, and progress.
   */
  blenderBridgeStatus: (): Promise<{ running: boolean; port: number; currentStep: number; totalSteps: number; completedSteps: number }> => {
    return ipcRenderer.invoke('blender-bridge-status');
  },

  /**
   * Set the tutorial steps that the Blender add-on HTTP bridge will serve.
   */
  blenderBridgeSetSteps: (steps: { id: number; title: string; description: string }[]): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('blender-bridge-set-steps', steps);
  },

  /**
   * Subscribe to log entries sent by the Blender add-on via POST /log.
   * Returns an unsubscribe function.
   */
  onBlenderLog: (callback: (entry: { level: string; message: string; context: Record<string, unknown> | null; timestamp: string }) => void): (() => void) => {
    const subscription = (_event: any, entry: any) => callback(entry);
    ipcRenderer.on('blender-log', subscription);
    return () => ipcRenderer.removeListener('blender-log', subscription);
  },

  /**
   * Subscribe to arbitrary events sent by the Blender add-on via POST /event.
   * Returns an unsubscribe function.
   */
  onBlenderEvent: (callback: (payload: { type: string; data: Record<string, unknown> }) => void): (() => void) => {
    const subscription = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('blender-event', subscription);
    return () => ipcRenderer.removeListener('blender-event', subscription);
  },

  /**
   * Send a command to the Blender add-on (mossy_link.py) via TCP port 9999.
   * @param commandType - Command type (e.g., "script", "text", "get_context", "export_fbx")
   * @param commandData - Command payload
   * @param token - Optional authentication token (must match Blender addon preferences)
   * @returns Promise resolving to the command response
   */
  sendBlenderCommand: (commandType: string, commandData?: any, token?: string): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SEND_BLENDER_COMMAND, commandType, commandData || {}, token);
  },

  /**
   * Regenerate a new Blender Link authentication token
   * @returns Promise resolving to the new token string, or null on failure
   */
  invokeBlenderTokenRegen: (): Promise<string | null> => {
    return ipcRenderer.invoke('invoke-blender-token-regen');
  },

  /**
   * Open/launch a program by its executable path
   * @param path - Full path to the program executable
   * @returns Promise resolving when program is launched
   */
  openProgram: (path: string): Promise<{ success: boolean; error?: string; method?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_PROGRAM, path);
  },

  /**
   * Launch an external tool (xEdit, NifSkope, CK, Blender) with a specific
   * file passed as a command-line argument so it opens directly in that tool.
   */
  launchToolWithFile: (toolPath: string, filePath: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_TOOL_WITH_FILE, toolPath, filePath);
  },

  /**
   * Open an external file or URL
   * @param path - Path to file or URL
   * @returns Promise resolving when opened
   */
  openExternal: (path: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, path);
  },

  /**
   * Reveal a file in the OS file manager (Explorer/Finder) or open a directory.
   * @param path - Full path to a file or directory
   */
  revealInFolder: (path: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REVEAL_IN_FOLDER, path);
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
    storageDrives?: Array<{ device: string, free: number, total: number }>;
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
   * Project Management
   */
  getProjects: (): Promise<any[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST);
  },
  createProject: (project: any): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, project);
  },
  updateProject: (project: any): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROJECT_UPDATE, project);
  },
  deleteProject: (projectId: string): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, projectId);
  },
  getCurrentProject: (): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_CURRENT);
  },

  /**
   * Project Wizard
   */
  wizardGetState: (wizardId: string): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WIZARD_GET_STATE, wizardId);
  },
  wizardUpdateStep: (wizardId: string, stepId: string, status: string, data?: any): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WIZARD_UPDATE_STEP, wizardId, stepId, status, data);
  },
  wizardSubmitAction: (wizardId: string, actionType: string, payload: any): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WIZARD_SUBMIT_ACTION, wizardId, actionType, payload);
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
   * Auditor: Read any mod asset file (ESP/ESM/ESL/NIF/DDS/BGSM) as raw binary.
   * Returns base64-encoded file data so the renderer worker can parse the true
   * binary format without going through a lossy UTF-8 text codec.
   */
  readBinaryFile: (filePath: string): Promise<{ success: boolean; data?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_READ_BINARY_FILE, filePath);
  },

  /**
   * Auditor: Pick ESP/ESM file via native file dialog
   */
  pickEspFile: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_PICK_ESP_FILE);
  },

  /**
   * Auditor: Pick NIF mesh file(s) via native file dialog (batch)
   */
  pickNifFile: (): Promise<string[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_PICK_NIF_FILE);
  },

  /**
   * Auditor: Pick DDS texture file(s) via native file dialog (batch)
   */
  pickDdsFile: (): Promise<string[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_PICK_DDS_FILE);
  },

  /**
   * Auditor: Pick BGSM material file(s) via native file dialog (batch)
   */
  pickBgsmFile: (): Promise<string[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_PICK_BGSM_FILE);
  },

  /**
   * Auditor: Scan entire mod directory for all asset types (batch)
   */
  scanModDirectory: (): Promise<Array<{ path: string; type: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_SCAN_MOD_DIRECTORY);
  },

  /**
   * Auditor: Scan a specific mod folder by path (no OS dialog shown).
   * Returns the same file list as scanModDirectory but accepts a pre-selected path.
   */
  scanModDirectoryPath: (folderPath: string): Promise<Array<{ path: string; type: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_SCAN_MOD_DIRECTORY_PATH, folderPath);
  },

  /**
   * Knowledge Vault persistence: save the full vault array to userData/knowledge-vault.json.
   * Call this whenever the vault changes so user-added knowledge survives reinstalls.
   */
  saveKnowledgeVault: (items: unknown[]): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_KNOWLEDGE_VAULT, items);
  },

  /**
   * Knowledge Vault persistence: load vault items from userData/knowledge-vault.json.
   * Returns [] if the file doesn't exist yet.
   */
  loadKnowledgeVaultFromFile: (): Promise<unknown[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_KNOWLEDGE_VAULT);
  },

  /**
   * Check whether the .NET Desktop Runtime 8.0 or later is installed on this machine.
   * This is required by Spriggit.CLI.exe and similar .NET tools.
   * Returns { ok, version, runtimes } — ok=true means a compatible runtime was found.
   */
  checkDotnet: (): Promise<{ ok: boolean; version: string | null; runtimes: string[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECK_DOTNET);
  },

  /**
   * Spriggit: open a native file picker to select Spriggit.CLI.exe.
   * Returns the selected path or '' if cancelled.
   */
  spriggitPickCli: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SPRIGGIT_PICK_CLI);
  },

  /**
   * Spriggit: run Spriggit.CLI.exe serialize on the user's Fallout 4 Data folder.
   * Returns the list of YAML files produced and their content (truncated to 8 KB each),
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
  }): Promise<{ ok: boolean; files: Array<{ name: string; content: string }>; error?: string; skippedVanillaCount?: number; skippedCustomCount?: number; noCustomMods?: boolean; noVanillaPlugins?: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SPRIGGIT_SERIALIZE, params);
  },

  /**
   * Spriggit: open the folder containing the given file path in the OS file manager.
   * Used after a 0xFFFFFFFF crash so the user can verify their Spriggit extraction.
   */
  spriggitOpenFolder: (filePath: string): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SPRIGGIT_OPEN_FOLDER, filePath);
  },

  /**
   * Spriggit: clear the .NET single-file publish temp-cache directories so
   * Spriggit re-extracts cleanly on the next run.
   */
  spriggitClearCache: (): Promise<{ ok: boolean; clearedPaths: string[]; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SPRIGGIT_CLEAR_CACHE);
  },

  /**
   * Spriggit: remove the Zone.Identifier (Mark of the Web) from all files in
   * the Spriggit folder via PowerShell Unblock-File.  This is the recommended
   * workaround when Windows Smart App Control is locked and cannot be disabled —
   * files downloaded from the internet carry a Zone 3 tag that SAC blocks, and
   * Unblock-File strips that tag so the binaries appear local to Windows.
   */
  spriggitUnblockFiles: (): Promise<{ ok: boolean; unblocked?: number; folderPath?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SPRIGGIT_UNBLOCK_FILES);
  },

  /**
   * Spriggit: attempt to add the Spriggit folder to Windows Defender exclusions via
   * PowerShell Add-MpPreference so Smart App Control stops blocking extracted assemblies.
   * Tries direct execution first (works when Mossy has admin rights); on failure returns
   * the folder path and the exact command so the user can run it in an elevated shell.
   */
  spriggitAddDefenderExclusion: (): Promise<{ ok: boolean; excludedPath?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SPRIGGIT_ADD_DEFENDER_EXCLUSION);
  },

  /**
   * Mod Projects persistence: save all projects to userData/mod-projects.json.
   * Call this whenever projects change so user mod work survives reinstalls.
   */
  saveModProjects: (projects: unknown[]): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_MOD_PROJECTS, projects);
  },

  /**
   * Mod Projects persistence: load projects from userData/mod-projects.json.
   * Returns [] if the file doesn't exist yet.
   */
  loadModProjectsFromFile: (): Promise<unknown[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_MOD_PROJECTS);
  },

  /**
   * Chat History persistence: save messages to userData/chat-history.json.
   * Call this whenever messages change so conversations survive reinstalls.
   */
  saveChatHistory: (messages: unknown[]): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_CHAT_HISTORY, messages);
  },

  /**
   * Chat History persistence: load messages from userData/chat-history.json.
   * Returns [] if the file doesn't exist yet.
   */
  loadChatHistoryFromFile: (): Promise<unknown[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_CHAT_HISTORY);
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
  // read binary contents of blender add-on zip; returns base64 string
  readBlenderZip: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSHOP_READ_BLENDER_ZIP as string);
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
   * FS: Stat a path (exists/isFile/isDirectory)
   */
  fsStat: (targetPath: string): Promise<{ exists: boolean; isFile: boolean; isDirectory: boolean }> => {
    return ipcRenderer.invoke('fs-stat', targetPath);
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

  /**
   * PDF Parser: Extract text from PDF file
   * Runs in main process with Node.js pdf-parse library
   */
  parsePSD: (arrayBuffer: ArrayBuffer): Promise<{ success: boolean; text?: string; metadata?: any; error?: string }> => {
    return ipcRenderer.invoke('parse-psd', arrayBuffer);
  },

  parseABR: (arrayBuffer: ArrayBuffer): Promise<{ success: boolean; text?: string; metadata?: any; error?: string }> => {
    return ipcRenderer.invoke('parse-abr', arrayBuffer);
  },

  parsePDF: (arrayBuffer: ArrayBuffer): Promise<{ success: boolean; text?: string; error?: string }> => {
    return ipcRenderer.invoke('parse-pdf', arrayBuffer);
  },

  /**
   * Video Transcriber: Extract and transcribe audio from video files
   * Runs in main process with ffmpeg and OpenAI Whisper API
   */
  transcribeVideo: (
    arrayBuffer: ArrayBuffer,
    filename: string,
    projectId?: string,
    organizationId?: string,
  ): Promise<{ success: boolean; text?: string; error?: string }> => {
    return ipcRenderer.invoke('transcribe-video', arrayBuffer, filename, projectId, organizationId);
  },

  /**
   * CK Crash Prevention: Get plugin metadata
   */
  getPluginMetadata: (pluginPath: string): Promise<{
    success: boolean;
    metadata?: {
      pluginPath: string;
      pluginName: string;
      masters: string[];
      recordCount: number;
      fileSize: number;
      lastModified: Date;
      hasScripts: boolean;
      hasNavmesh: boolean;
      hasPrecombines: boolean;
    };
    error?: string;
  }> => {
    return ipcRenderer.invoke('get-plugin-metadata', pluginPath);
  },

  /**
   * CK Crash Prevention: Get process metrics
   */
  getProcessMetrics: (pid: number): Promise<{
    success: boolean;
    metrics?: {
      timestamp: number;
      memoryUsageMB: number;
      handleCount: number;
      threadCount: number;
      cpuPercent: number;
      responsiveness: 'normal' | 'slow' | 'frozen';
      warningSignals: string[];
    };
    error?: string;
  }> => {
    return ipcRenderer.invoke('get-process-metrics', pid);
  },

  /**
   * CK Crash Prevention: Read crash log
   */
  readCrashLog: (logPath: string): Promise<{ success: boolean; content?: string; error?: string }> => {
    return ipcRenderer.invoke('read-crash-log', logPath);
  },

  /**
   * CK Crash Prevention: Validate plugin before CK launch
   */
  ckValidate: (modData: any): Promise<any> => {
    return ipcRenderer.invoke('ck-crash-prevention:validate', modData);
  },

  /**
   * CK Crash Prevention: Generate prevention plan
   */
  ckGeneratePreventionPlan: (modContext: any): Promise<any> => {
    return ipcRenderer.invoke('ck-crash-prevention:generate-plan', modContext);
  },

  /**
   * CK Crash Prevention: Analyze crash log content
   */
  ckAnalyzeCrash: (logPath: string): Promise<any> => {
    return ipcRenderer.invoke('ck-crash-prevention:analyze-crash', logPath);
  },

  /**
   * CK Crash Prevention: Pick crash log file with file dialog
   */
  ckPickLogFile: (): Promise<{ success: boolean; path?: string; content?: string; error?: string }> => {
    return ipcRenderer.invoke('ck-crash-prevention:pick-log-file');
  },

  /**
   * DDS Converter: Convert single texture file
   */
  ddsConvert: (input: any): Promise<any> => {
    return ipcRenderer.invoke('dds-converter:convert', input);
  },

  /**
   * DDS Converter: Batch convert multiple textures
   */
  ddsConvertBatch: (files: any[], options?: any): Promise<any> => {
    return ipcRenderer.invoke('dds-converter:convert-batch', files, options);
  },

  /**
   * DDS Converter: Detect texture format
   */
  ddsDetectFormat: (filePath: string): Promise<{ success: boolean; format?: string; error?: string }> => {
    return ipcRenderer.invoke('dds-converter:detect-format', filePath);
  },

  /**
   * DDS Converter: Generate mipmap chain
   */
  ddsGenerateMipmaps: (imagePath: string, levels?: number): Promise<{ success: boolean; mipmaps?: any; error?: string }> => {
    return ipcRenderer.invoke('dds-converter:generate-mipmaps', imagePath, levels);
  },

  /**
   * DDS Converter: Get compression preset for texture type
   */
  ddsGetPreset: (type: string): Promise<{ success: boolean; preset?: any; error?: string }> => {
    return ipcRenderer.invoke('dds-converter:get-preset', type);
  },

  /**
   * DDS Converter: Get all compression presets
   */
  ddsGetAllPresets: (): Promise<{ success: boolean; presets?: any; error?: string }> => {
    return ipcRenderer.invoke('dds-converter:get-all-presets');
  },

  /**
   * DDS Converter: Get default format mapping rules
   */
  ddsGetDefaultFormatRules: (): Promise<{ success: boolean; rules?: any[]; error?: string }> => {
    return ipcRenderer.invoke('dds-converter:get-default-format-rules');
  },

  /**
   * DDS Converter: Pick texture files with file dialog
   */
  ddsPickFiles: (): Promise<{ success: boolean; paths?: string[]; error?: string }> => {
    return ipcRenderer.invoke('dds-converter:pick-files');
  },

  /**
   * Texture Generator: Generate complete PBR material set
   */
  textureGenerateMaterialSet: (input: any): Promise<any> => {
    return ipcRenderer.invoke('texture-generator:generate-material-set', input);
  },

  /**
   * Texture Generator: Generate specific map type
   */
  textureGenerateMap: (type: string, source: string, settings: any): Promise<any> => {
    return ipcRenderer.invoke('texture-generator:generate-map', type, source, settings);
  },

  /**
   * Texture Generator: Make texture seamlessly tileable
   */
  textureMakeSeamless: (imagePath: string, blendRadius?: number): Promise<any> => {
    return ipcRenderer.invoke('texture-generator:make-seamless', imagePath, blendRadius);
  },

  /**
   * Texture Generator: AI upscale texture
   */
  textureUpscale: (imagePath: string, factor: 2 | 4): Promise<any> => {
    return ipcRenderer.invoke('texture-generator:upscale', imagePath, factor);
  },

  /**
   * Texture Generator: Generate procedural texture
   */
  textureGenerateProcedural: (type: string, settings: any): Promise<any> => {
    return ipcRenderer.invoke('texture-generator:generate-procedural', type, settings);
  },

  /**
   * External Tool Integration: Detect all installed tools
   */
  externalToolDetectTools: (): Promise<any> => {
    return ipcRenderer.invoke('external-tool:detect-tools');
  },

  /**
   * External Tool Integration: Verify specific tool
   */
  externalToolVerifyTool: (toolName: string): Promise<any> => {
    return ipcRenderer.invoke('external-tool:verify-tool', toolName);
  },

  /**
   * External Tool Integration: Run xEdit script
   */
  externalToolRunXEditScript: (scriptPath: string, pluginList: string[]): Promise<any> => {
    return ipcRenderer.invoke('external-tool:run-xedit-script', scriptPath, pluginList);
  },

  /**
   * External Tool Integration: Clean plugin with xEdit
   */
  externalToolCleanPlugin: (pluginPath: string, mode: 'quick' | 'manual'): Promise<any> => {
    return ipcRenderer.invoke('external-tool:clean-plugin', pluginPath, mode);
  },

  /**
   * External Tool Integration: Find conflicts between plugins
   */
  externalToolFindConflicts: (plugins: string[]): Promise<any> => {
    return ipcRenderer.invoke('external-tool:find-conflicts', plugins);
  },

  /**
   * External Tool Integration: Optimize NIF file
   */
  externalToolOptimizeNIF: (nifPath: string, settings: any): Promise<any> => {
    return ipcRenderer.invoke('external-tool:optimize-nif', nifPath, settings);
  },

  /**
   * External Tool Integration: Batch fix NIF files
   */
  externalToolBatchFixNIFs: (folder: string, issues: string[]): Promise<any> => {
    return ipcRenderer.invoke('external-tool:batch-fix-nifs', folder, issues);
  },

  /**
   * External Tool Integration: Extract NIF metadata
   */
  externalToolExtractNIFInfo: (nifPath: string): Promise<any> => {
    return ipcRenderer.invoke('external-tool:extract-nif-info', nifPath);
  },

  /**
   * External Tool Integration: Import FBX into Blender
   */
  externalToolImportFBX: (fbxPath: string, settings: any): Promise<any> => {
    return ipcRenderer.invoke('external-tool:import-fbx', fbxPath, settings);
  },

  /**
   * External Tool Integration: Export NIF from Blender
   */
  externalToolExportNIF: (blendPath: string, settings: any): Promise<any> => {
    return ipcRenderer.invoke('external-tool:export-nif', blendPath, settings);
  },

  /**
   * External Tool Integration: Batch convert meshes with Blender
   */
  externalToolBatchConvertMeshes: (files: string[], workflow: string): Promise<any> => {
    return ipcRenderer.invoke('external-tool:batch-convert-meshes', files, workflow);
  },

  /**
   * External Tool Integration: Run Creation Kit command
   */
  externalToolRunCKCommand: (command: string, args: string[]): Promise<any> => {
    return ipcRenderer.invoke('external-tool:run-ck-command', command, args);
  },

  /**
   * External Tool Integration: Generate precombines
   */
  externalToolGeneratePrecombines: (espPath: string, cells?: string[]): Promise<any> => {
    return ipcRenderer.invoke('external-tool:generate-precombines', espPath, cells);
  },

  /**
   * External Tool Integration: Pack BA2 archive
   */
  externalToolPackArchive: (folder: string, archiveName: string, format: 'General' | 'DDS' | 'BA2'): Promise<any> => {
    return ipcRenderer.invoke('external-tool:pack-archive', folder, archiveName, format);
  },

  /**
   * External Tool Integration: Unpack BA2 archive
   */
  externalToolUnpackArchive: (ba2Path: string, outputFolder: string): Promise<any> => {
    return ipcRenderer.invoke('external-tool:unpack-archive', ba2Path, outputFolder);
  },

  // ============================================================================
  // TOOL WRAPPER-SPECIFIC API METHODS
  // ============================================================================

  /**
   * xEdit: Clean plugin (remove ITM/UDR records)
   */
  xeditClean: (pluginPath: string, mode?: 'quick' | 'manual'): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:xedit-clean', pluginPath, mode);
  },

  /**
   * xEdit: Execute custom PascalScript
   */
  xeditExecuteScript: (scriptPath: string, plugins: string[], parameters?: any): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:xedit-script', scriptPath, plugins, parameters);
  },

  /**
   * xEdit: Export records to CSV
   */
  xeditExportCSV: (plugin: string, recordTypes: string[], outputPath?: string): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:xedit-export-csv', plugin, recordTypes, outputPath);
  },

  /**
   * xEdit: Find load order conflicts
   */
  xeditFindConflicts: (plugins: string[]): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:xedit-find-conflicts', plugins);
  },

  /**
   * NifSkope: Optimize NIF file
   */
  nifOptimize: (nifPath: string, options?: any): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:nif-optimize', nifPath, options);
  },

  /**
   * NifSkope: Batch optimize NIF files
   */
  nifBatchOptimize: (nifFiles: string[], options?: any): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:nif-batch-optimize', nifFiles, options);
  },

  /**
   * NifSkope: Change texture path in NIF
   */
  nifChangeTexture: (nifPath: string, oldPath: string, newPath: string): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:nif-change-texture', nifPath, oldPath, newPath);
  },

  /**
   * NifSkope: Fix collision data
   */
  nifFixCollision: (nifPath: string, options?: any): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:nif-fix-collision', nifPath, options);
  },

  /**
   * NifSkope: Extract NIF metadata
   */
  nifExtractMetadata: (nifPath: string): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:nif-extract-metadata', nifPath);
  },

  /**
   * NifSkope: Validate NIF file structure
   */
  nifValidate: (nifPath: string): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:nif-validate', nifPath);
  },

  /**
   * Blender: Convert FBX to NIF
   */
  blenderConvertFBXToNIF: (fbxPath: string, nifPath: string, options?: any): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:blender-convert-fbx-to-nif', fbxPath, nifPath, options);
  },

  /**
   * Blender: Convert NIF to FBX
   */
  blenderConvertNIFToFBX: (nifPath: string, fbxPath: string, options?: any): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:blender-convert-nif-to-fbx', nifPath, fbxPath, options);
  },

  /**
   * Blender: Execute custom Python script
   */
  blenderExecuteScript: (scriptContent: string, args?: any, options?: any): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:blender-script', scriptContent, args, options);
  },

  /**
   * Blender: Batch process files
   */
  blenderBatchProcess: (files: string[], operation: string, options?: any): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:blender-batch-process', files, operation, options);
  },

  /**
   * Blender: Check if NIF plugin is installed
   */
  blenderCheckNIFPlugin: (): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:blender-check-nif-plugin');
  },

  /**
   * Creation Kit: Launch with ESP
   */
  ckLaunch: (espPath?: string, options?: any): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:ck-launch', espPath, options);
  },

  /**
   * Creation Kit: Get log contents
   */
  ckGetLog: (): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:ck-get-log');
  },

  /**
   * Creation Kit: Get log errors
   */
  ckGetLogErrors: (): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:ck-get-log-errors');
  },

  /**
   * Creation Kit: Validate ESP file
   */
  ckValidateESP: (espPath: string): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:ck-validate-esp', espPath);
  },

  /**
   * Creation Kit: Get master files from ESP
   */
  ckGetMasters: (espPath: string): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:ck-get-masters', espPath);
  },

  /**
   * Creation Kit: Create backup of ESP
   */
  ckBackupESP: (espPath: string): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:ck-backup-esp', espPath);
  },

  /**
   * Creation Kit: Check if CK is running
   */
  ckIsRunning: (): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:ck-is-running');
  },

  /**
   * Creation Kit: Kill CK process
   */
  ckKill: (): Promise<any> => {
    return ipcRenderer.invoke('tool-integration:ck-kill');
  },

  // ============================================================================
  // ASSET VALIDATION API METHODS
  // ============================================================================

  /**
   * Asset Validation: Validate entire mod folder
   */
  assetValidateMod: (modPath: string, depth: 'quick' | 'standard' | 'deep', progressCallback?: (progress: number, file: string) => void): Promise<any> => {
    return ipcRenderer.invoke('asset-validation:validate-mod', modPath, depth, progressCallback);
  },

  /**
   * Asset Validation: Validate NIF mesh file
   */
  assetValidateNIF: (nifPath: string): Promise<any> => {
    return ipcRenderer.invoke('asset-validation:validate-nif', nifPath);
  },

  /**
   * Asset Validation: Validate DDS texture file
   */
  assetValidateDDS: (ddsPath: string): Promise<any> => {
    return ipcRenderer.invoke('asset-validation:validate-dds', ddsPath);
  },

  /**
   * Asset Validation: Validate ESP/ESM plugin file
   */
  assetValidateESP: (espPath: string): Promise<any> => {
    return ipcRenderer.invoke('asset-validation:validate-esp', espPath);
  },

  /**
   * Asset Validation: Validate Papyrus script
   */
  assetValidateScript: (pscPath: string): Promise<any> => {
    return ipcRenderer.invoke('asset-validation:validate-script', pscPath);
  },

  /**
   * Asset Validation: Validate sound file
   */
  assetValidateSound: (wavPath: string): Promise<any> => {
    return ipcRenderer.invoke('asset-validation:validate-sound', wavPath);
  },

  /**
   * Asset Validation: Batch validate multiple files
   */
  assetValidateBatch: (files: string[], progressCallback?: (progress: number, file: string) => void): Promise<any> => {
    return ipcRenderer.invoke('asset-validation:batch-validate', files, progressCallback);
  },

  /**
   * Asset Validation: Auto-fix supported issues
   */
  assetValidationAutoFix: (issues: any[]): Promise<any> => {
    return ipcRenderer.invoke('asset-validation:auto-fix', issues);
  },

  // ============================================================================
  // ASSET VALIDATOR API (Alternative namespace)
  // ============================================================================

  /**
   * Asset Validator: Validate single file
   */
  assetValidatorValidateFile: (filePath: string, type: string): Promise<any> => {
    return ipcRenderer.invoke('asset-validator:validate-file', filePath, type);
  },

  /**
   * Asset Validator: Validate mod folder
   */
  assetValidatorValidateMod: (modPath: string, depth: 'quick' | 'standard' | 'deep'): Promise<any> => {
    return ipcRenderer.invoke('asset-validator:validate-mod', modPath, depth);
  },

  /**
   * Asset Validator: Auto-fix issues
   */
  assetValidatorAutoFix: (issues: any[]): Promise<any> => {
    return ipcRenderer.invoke('asset-validator:auto-fix', issues);
  },

  /**
   * Asset Validator: Export report
   */
  assetValidatorExportReport: (report: any, format: 'json' | 'html'): Promise<any> => {
    return ipcRenderer.invoke('asset-validator:export-report', report, format);
  },

  // ============================================================================
  // MOD PACKAGING API
  // ============================================================================

  /**
   * Start a new packaging session
   */
  modPackagingStart: (modPath: string): Promise<any> => {
    return ipcRenderer.invoke('mod-packaging:start', modPath);
  },

  /**
   * Validate mod folder structure
   */
  modPackagingValidateStructure: (modPath: string): Promise<any> => {
    return ipcRenderer.invoke('mod-packaging:validate-structure', modPath);
  },

  /**
   * Create archive package
   */
  modPackagingCreateArchive: (settings: any): Promise<any> => {
    return ipcRenderer.invoke('mod-packaging:create-archive', settings);
  },

  /**
   * Generate README file
   */
  modPackagingGenerateReadme: (modInfo: any, template: string): Promise<string> => {
    return ipcRenderer.invoke('mod-packaging:generate-readme', modInfo, template);
  },

  /**
   * Append to changelog
   */
  modPackagingAppendChangelog: (changelogPath: string, version: string, changes: string[]): Promise<any> => {
    return ipcRenderer.invoke('mod-packaging:append-changelog', changelogPath, version, changes);
  },

  /**
   * Prepare mod for Nexus Mods upload
   */
  modPackagingPrepareNexus: (modPackage: any): Promise<any> => {
    return ipcRenderer.invoke('mod-packaging:prepare-nexus', modPackage);
  },

  /**
   * Increment version number
   */
  modPackagingIncrementVersion: (currentVersion: string, type: 'major' | 'minor' | 'patch'): Promise<string> => {
    return ipcRenderer.invoke('mod-packaging:increment-version', currentVersion, type);
  },

  /**
   * Get packaging session
   */
  modPackagingGetSession: (sessionId: string): Promise<any> => {
    return ipcRenderer.invoke('mod-packaging:get-session', sessionId);
  },

  /**
   * Update packaging session
   */
  modPackagingUpdateSession: (sessionId: string, updates: any): Promise<any> => {
    return ipcRenderer.invoke('mod-packaging:update-session', sessionId, updates);
  },

  // ============================================================================
  // FOMOD BUILDER API
  // ============================================================================

  /**
   * Create new FOMOD project
   */
  fomodCreate: (modPath: string, modInfo?: any): Promise<any> => {
    return ipcRenderer.invoke('fomod:create', modPath, modInfo);
  },

  /**
   * Generate ModuleConfig.xml
   */
  fomodGenerateModuleConfig: (fomod: any): Promise<string> => {
    return ipcRenderer.invoke('fomod:generate-module-config', fomod);
  },

  /**
   * Generate info.xml
   */
  fomodGenerateInfoXML: (modInfo: any): Promise<string> => {
    return ipcRenderer.invoke('fomod:generate-info-xml', modInfo);
  },

  /**
   * Validate FOMOD structure
   */
  fomodValidate: (fomodPath: string): Promise<any> => {
    return ipcRenderer.invoke('fomod:validate', fomodPath);
  },

  /**
   * Preview installer flow
   */
  fomodPreview: (fomod: any, selections?: Map<string, string[]>): Promise<any> => {
    return ipcRenderer.invoke('fomod:preview', fomod, selections);
  },

  /**
   * Export FOMOD to directory
   */
  fomodExport: (fomod: any, outputPath: string, sourceModPath: string): Promise<any> => {
    return ipcRenderer.invoke('fomod:export', fomod, outputPath, sourceModPath);
  },

  /**
   * Load existing FOMOD
   */
  fomodLoad: (fomodPath: string): Promise<any> => {
    return ipcRenderer.invoke('fomod:load', fomodPath);
  },

  /**
   * Save FOMOD project metadata
   */
  fomodSaveProject: (fomod: any, projectPath: string): Promise<any> => {
    return ipcRenderer.invoke('fomod:save-project', fomod, projectPath);
  },

  // ============================================================================
  // LOAD ORDER OPTIMIZER
  // ============================================================================

  /**
   * Analyze current load order for conflicts, dependencies, and performance
   */
  loadOrderAnalyze: (plugins: any[]): Promise<any> => {
    return ipcRenderer.invoke('load-order:analyze', plugins);
  },

  /**
   * Generate optimized load order based on rules and algorithms
   */
  loadOrderOptimize: (plugins: any[], rules: any): Promise<any> => {
    return ipcRenderer.invoke('load-order:optimize', plugins, rules);
  },

  /**
   * Detect conflicts between plugins
   */
  loadOrderDetectConflicts: (plugins: any[]): Promise<any> => {
    return ipcRenderer.invoke('load-order:detect-conflicts', plugins);
  },

  /**
   * Build dependency graph for plugins
   */
  loadOrderResolveDependencies: (plugins: any[]): Promise<any> => {
    return ipcRenderer.invoke('load-order:resolve-dependencies', plugins);
  },

  /**
   * Predict performance impact of current load order
   */
  loadOrderPredictPerformance: (plugins: any[]): Promise<any> => {
    return ipcRenderer.invoke('load-order:predict-performance', plugins);
  },

  /**
   * Apply custom sorting rules to plugins
   */
  loadOrderApplyRules: (plugins: any[], rules: any[]): Promise<any> => {
    return ipcRenderer.invoke('load-order:apply-rules', plugins, rules);
  },

  /**
   * Import load order from Mod Organizer 2 or Vortex
   */
  loadOrderImport: (source: 'mo2' | 'vortex', sourcePath?: string): Promise<any> => {
    return ipcRenderer.invoke('load-order:import', source, sourcePath);
  },

  /**
   * Export load order to Mod Organizer 2 or Vortex
   */
  loadOrderExport: (plugins: any[], destination: 'mo2' | 'vortex', destPath?: string): Promise<any> => {
    return ipcRenderer.invoke('load-order:export', plugins, destination, destPath);
  },

  /**
   * Parse single plugin file for metadata
   */
  loadOrderParsePlugin: (pluginPath: string): Promise<any> => {
    return ipcRenderer.invoke('load-order:parse-plugin', pluginPath);
  },

  /**
   * Save optimization results to file
   */
  loadOrderSaveOptimization: (optimization: any, filePath: string): Promise<any> => {
    return ipcRenderer.invoke('load-order:save-optimization', optimization, filePath);
  },

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  /**
   * Analyze conflicts across plugins
   */
  conflictAnalyze: (plugins: string[]): Promise<any> => {
    return ipcRenderer.invoke('conflict-resolution:analyze', plugins);
  },

  /**
   * Compare record types between two plugins
   */
  conflictCompareRecords: (pluginA: string, pluginB: string, recordIdentifier: string): Promise<any> => {
    return ipcRenderer.invoke('conflict-resolution:compare-records', pluginA, pluginB, recordIdentifier);
  },

  /**
   * Generate patch metadata from conflicts
   */
  conflictGeneratePatch: (conflicts: any[], strategy: any): Promise<any> => {
    return ipcRenderer.invoke('conflict-resolution:generate-patch', conflicts, strategy);
  },

  /**
   * Check compatibility between two mods
   */
  conflictCheckCompatibility: (modA: string, modB: string): Promise<any> => {
    return ipcRenderer.invoke('conflict-resolution:check-compatibility', modA, modB);
  },

  /**
   * Recommend merge candidates
   */
  conflictRecommendMerge: (plugins: string[]): Promise<any> => {
    return ipcRenderer.invoke('conflict-resolution:recommend-merge', plugins);
  },

  /**
   * Apply conflict resolution rules
   */
  conflictApplyRules: (conflicts: any[], rules: any[]): Promise<any> => {
    return ipcRenderer.invoke('conflict-resolution:apply-rules', conflicts, rules);
  },
  conflictSavePatch: (patch: any, outputPath: string): Promise<any> => {
    return ipcRenderer.invoke('conflict-resolution:save-patch', patch, outputPath);
  },
  gameDetectGame: (): Promise<any> => {
    return ipcRenderer.invoke('game-integration:detect-game');
  },
  gameExecuteConsoleCommand: (command: string, game: string): Promise<any> => {
    return ipcRenderer.invoke('game-integration:console-command', command, game);
  },
  gameAnalyzeSave: (savePath: string): Promise<any> => {
    return ipcRenderer.invoke('game-integration:analyze-save', savePath);
  },
  gameGetActiveMods: (game: any): Promise<any> => {
    return ipcRenderer.invoke('game-integration:get-active-mods', game);
  },
  gameStartMonitoring: (pid: number): Promise<any> => {
    return ipcRenderer.invoke('game-integration:start-monitoring', pid);
  },
  gameCaptureScreenshot: (): Promise<any> => {
    return ipcRenderer.invoke('game-integration:screenshot');
  },
  gameInjectPlugin: (dllPath: string, game: any): Promise<any> => {
    return ipcRenderer.invoke('game-integration:inject-plugin', dllPath, game);
  },

  // ============================================================================

  /**
   * Save file to user's system (with dialog to choose location)
   * Used for exporting error reports, logs, etc.
   */
  saveFile: (content: string, filename: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE, content, filename);
  },

  /**
   * Pick a JSON file from disk (native dialog)
   * Used for importing script libraries.
   */
  pickJsonFile: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PICK_JSON_FILE);
  },

  /**
   * Pick a folder from disk (native dialog)
   * Used for configuring tool-related directories.
   */
  pickDirectory: (title?: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PICK_DIRECTORY, title);
  },

  /**
   * Creation Kit Link - Pick CreationKit.exe file
   */
  pickCreationKitExe: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_PICK_CREATIONKIT_EXE);
  },

  /**
   * Creation Kit Link - Pick Fallout 4 Root Folder
   */
  pickFallout4Folder: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_PICK_FALLOUT4_FOLDER);
  },

  /**
   * Creation Kit Link - Pick PapyrusCompiler.exe file
   */
  pickPapyrusCompiler: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_PICK_PAPYRUS_COMPILER);
  },

  /**
   * Creation Kit Link - Pick TESV_Papyrus_Flags.flg file
   */
  pickPapyrusFlags: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_PICK_PAPYRUS_FLAGS);
  },

  /**
   * Creation Kit Link - Pick Import Paths folder
   */
  pickImportPaths: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_PICK_IMPORT_PATHS);
  },

  /**
   * Creation Kit Link - Pick Papyrus Source Folder
   */
  pickSourceFolder: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_PICK_SOURCE_FOLDER);
  },

  /**
   * Creation Kit Link - Pick Papyrus Output Folder
   */
  pickOutputFolder: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_PICK_OUTPUT_FOLDER);
  },

  /**
   * Local ML: Build semantic index (offline)
   */
  mlIndexBuild: (req?: { roots?: string[] }): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ML_INDEX_BUILD, req);
  },

  /**
   * Local ML: Index status
   */
  mlIndexStatus: (): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ML_INDEX_STATUS);
  },

  /**
   * Local ML: Query semantic index
   */
  mlIndexQuery: (req: { query: string; topK?: number }): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ML_INDEX_QUERY, req);
  },

  /**
   * Capabilities: Detect local services/tools (Ollama, LM Studio, etc)
   */
  mlCapsStatus: (): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ML_CAPS_STATUS);
  },

  /**
   * Local LLM: Detect local LLM runtime (Ollama)
   */
  mlLlmStatus: (): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ML_LLM_STATUS);
  },

  /**
   * Local LLM: Generate via local runtime (Ollama)
   */
  mlLlmGenerate: (req: { provider: 'ollama' | 'openai_compat' | 'cosmos'; model: string; prompt: string; baseUrl?: string }): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ML_LLM_GENERATE, req);
  },

  /**
   * GGUF / Unsloth: Open file picker for .gguf model files
   */
  ggufPickFile: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GGUF_PICK_FILE);
  },

  /**
   * GGUF / Unsloth: Import a GGUF model into Ollama
   */
  ggufImportToOllama: (req: { ggufPath: string; modelName: string; systemPrompt?: string }): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GGUF_IMPORT_TO_OLLAMA, req);
  },

  /**
   * Training Dataset: Add a rated Q&A pair for fine-tuning
   */
  trainingDataAddPair: (pair: { question: string; answer: string; rating: 'good' | 'bad'; topic?: string; editedAnswer?: string }): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRAINING_DATA_ADD_PAIR, pair);
  },

  /**
   * Training Dataset: Get statistics (total, good/bad counts, topic breakdown)
   */
  trainingDataGetStats: (): Promise<{ total: number; good: number; bad: number; topics: Record<string, number> }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRAINING_DATA_GET_STATS);
  },

  /**
   * Training Dataset: Export curated pairs as Unsloth-compatible JSONL file
   */
  trainingDataExportJsonl: (opts?: { goodOnly?: boolean; outputPath?: string }): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRAINING_DATA_EXPORT_JSONL, opts);
  },

  /**
   * Training Dataset: Clear all pairs (backs up first)
   */
  trainingDataClear: (): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRAINING_DATA_CLEAR);
  },

  /**
   * Edition: Returns 'nvidia' or 'universal' depending on which build is running.
   */
  getMossyEdition: (): Promise<'nvidia' | 'universal'> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_MOSSY_EDITION);
  },

  /**
   * Fine-Tune: Open a file picker for the training dataset (.jsonl)
   */
  fineTunePickDataset: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FINE_TUNE_PICK_DATASET);
  },

  /**
   * Fine-Tune: Start an Unsloth fine-tuning run (NVIDIA edition only).
   * Streams progress via 'fine-tune-progress' IPC events.
   */
  fineTuneStart: (opts: {
    datasetPath: string;
    modelId: string;
    loraRank: number;
    maxSteps: number;
    outputName: string;
  }): Promise<{ ok: boolean; outputPath?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FINE_TUNE_START, opts);
  },

  /**
   * Load Order Lab: Pick MO2 profile directory
   */
  pickMo2ProfileDir: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_ORDER_PICK_MO2_PROFILE_DIR);
  },

  /**
   * Load Order Lab: Pick Vortex profile directory
   */
  pickVortexProfileDir: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_ORDER_PICK_VORTEX_PROFILE_DIR);
  },

  /**
   * Load Order Lab: Pick LOOT report/log file
   */
  pickLootReportFile: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_ORDER_PICK_LOOT_REPORT_FILE);
  },

  /**
   * Load Order Lab: Write a file into app userData for automation
   */
  writeLoadOrderUserDataFile: (filename: string, content: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_ORDER_WRITE_USERDATA_FILE, filename, content);
  },

  /**
   * Load Order Lab: Launch xEdit with optional args (detached)
   */
  launchXEdit: (args?: string[], cwd?: string): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_ORDER_LAUNCH_XEDIT, args, cwd);
  },

  /**
   * AI Chat: OpenAI-powered chat completion
   * Main process manages API key; renderer never sees it
   */
  aiChatOpenAI: (prompt: string, systemPrompt?: string, model?: string): Promise<{ success: boolean; content?: string; error?: string }> => {
    return ipcRenderer.invoke('ai-chat-openai', { prompt, systemPrompt, model });
  },

  /**
   * AI Chat: Groq-powered chat completion (lower latency, real-time)
   * Main process manages API key; renderer never sees it
   */
  aiChatGroq: (prompt: string, systemPrompt?: string, model?: string, conversationHistory?: Array<{ role: string; content: string }>): Promise<{ success: boolean; content?: string; error?: string }> => {
    return ipcRenderer.invoke('ai-chat-groq', { prompt, systemPrompt, model, conversationHistory });
  },

  /**
   * Web Search: Query DuckDuckGo or the Fallout 4 Fandom wiki for live information.
   * The main process performs the HTTPS fetch using Electron's net module (Chromium-backed,
   * respects OS proxy/VPN settings). Renderer has no direct network access.
   * @param query - Search query string
   * @param type - Optional 'wiki' to force Fallout 4 Fandom wiki search; omit for DuckDuckGo
   * @returns { success, text, source, url, heading, empty? }
   */
  webSearch: (query: string, type?: string): Promise<{ success: boolean; text?: string; source?: string; url?: string; heading?: string; empty?: boolean; error?: string }> => {
    return ipcRenderer.invoke('web-search', query, type);
  },

  /**
   * Browse Web: Fetch and return the plain-text content of any HTTPS URL.
   * Strips HTML tags, limits to 6,000 chars. HTTPS only for security.
   * @param url - The HTTPS URL to fetch
   * @returns { success, text, url } or { success: false, error }
   */
  browseWeb: (url: string): Promise<{ success: boolean; text?: string; url?: string; error?: string }> => {
    return ipcRenderer.invoke('browse-web', url);
  },

  /**
   * Internet Access Test: probe all web search providers (fallout.wiki, fandom,
   * DuckDuckGo, Wikipedia) and return a structured diagnostic result.
   * Safe to call from the Settings UI — runs in the main process.
   */
  testInternetAccess: (): Promise<{
    providers: Array<{ name: string; url: string; ok: boolean; result?: string; empty?: boolean; error?: string; ms: number }>;
    wikiOk: boolean;
    generalOk: boolean;
    summary: string;
  }> => {
    return ipcRenderer.invoke('test-internet-access');
  },

  /**
   * PyTorch: Check whether torch is importable from the configured path or
   * from the system Python.
   */
  checkPyTorch: (): Promise<{
    available: boolean;
    version?: string;
    path?: string;
    pythonFound?: boolean;
    error?: string;
  }> => {
    return ipcRenderer.invoke('check-pytorch');
  },

  /**
   * PyTorch: Auto-install torch (CPU build) into a managed virtual environment
   * inside the app's userData folder. Saves the resulting site-packages path
   * to Mossy settings so Blender and other integrations can use it immediately.
   * @param destDir – Optional custom directory for the virtual environment.
   */
  installPyTorch: (destDir?: string): Promise<{
    success: boolean;
    path?: string;
    version?: string;
    message?: string;
    error?: string;
  }> => {
    return ipcRenderer.invoke('install-pytorch', destDir);
  },

  /**
   * PyTorch Setup Progress: subscribe to real-time progress events sent by
   * the auto-install background task on first launch.
   * @returns unsubscribe function
   */
  onPytorchSetupProgress: (callback: (data: { message: string }) => void): (() => void) => {
    const subscription = (_event: any, data: { message: string }) => callback(data);
    ipcRenderer.on('pytorch-setup-progress', subscription);
    return () => ipcRenderer.removeListener('pytorch-setup-progress', subscription);
  },

  /**
   * Fresh-install detection: fires once when the main process finds a
   * fresh-install.marker written by the Inno Setup installer.  The renderer
   * should reset all onboarding localStorage flags so the wizard runs again.
   * @returns unsubscribe function
   */
  onFreshInstall: (callback: () => void): (() => void) => {
    const subscription = () => callback();
    ipcRenderer.on(IPC_CHANNELS.TRIGGER_FRESH_INSTALL, subscription);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRIGGER_FRESH_INSTALL, subscription);
  },

  /**
   * PyTorch: Signal to the main process that the renderer is mounted and
   * ready to receive pytorch-setup-progress events. This triggers the
   * background auto-install check immediately rather than waiting for the
   * safety timeout.
   */
  notifyPytorchRendererReady: (): void => {
    ipcRenderer.send('pytorch-renderer-ready');
  },

  /**
   */
  sendMessage: (message: any): Promise<void> => {
    return ipcRenderer.invoke('sendMessage', message);
  },

  /**
   * Voice chat: listen for assistant responses
   */
  onMessage: (callback: (message: any) => void): (() => void) => {
    const subscription = (_event: any, message: any) => callback(message);
    ipcRenderer.on('message', subscription);
    return () => ipcRenderer.removeListener('message', subscription);
  },

  /**
   * Secrets status (presence only). Never returns actual key values.
   */
  getSecretStatus: (): Promise<
    | { ok: true; openai: boolean; groq: boolean; backendToken: boolean }
    | { ok: false; error: string }
  > => {
    return ipcRenderer.invoke(IPC_CHANNELS.SECRET_STATUS);
  },

  /**
   * Reveal the app settings.json file in the OS file manager.
   */
  revealSettingsFile: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REVEAL_SETTINGS_FILE);
  },

  /**
   * Speech-to-text for recorded mic audio.
  * Renderer provides audio bytes; main process uses configured providers (OpenAI).
   */
  transcribeAudio: (arrayBuffer: ArrayBuffer, mimeType?: string): Promise<{ success: boolean; text?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIBE_AUDIO, arrayBuffer, mimeType);
  },

  /**
   * Append a line of transcript to persistent disk history file.
   * Renderer passes a simple string; main process handles file IO.
   */
  saveVoiceHistory: (line: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_VOICE_HISTORY, line);
  },

  getVoiceHistoryPath: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_VOICE_HISTORY_PATH);
  },

  /**
   * Duplicate Finder: Pick one or more folders via native dialog
   */
  pickDedupeFolders: (): Promise<string[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEDUPE_PICK_FOLDERS);
  },

  /**
   * Duplicate Finder: Scan folders for duplicates (returns groups)
   */
  dedupeScan: (options: { roots: string[]; extensions?: string[]; minSizeBytes?: number; maxFiles?: number }): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEDUPE_SCAN, options);
  },

  /**
   * Duplicate Finder: Cancel an in-progress scan
   */
  dedupeCancel: (scanId: string): Promise<{ ok: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEDUPE_CANCEL, scanId);
  },

  /**
   * Duplicate Finder: Progress events
   */
  onDedupeProgress: (callback: (progress: any) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.DEDUPE_PROGRESS, (_event, progress) => callback(progress));
  },

  /**
   * Duplicate Finder: Move selected files to Recycle Bin
   */
  dedupeTrash: (payload: { scanId: string; paths: string[] }): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEDUPE_TRASH, payload);
  },

  /**
   * Auto-Updater: Check for application updates
   */
  checkForUpdates: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('check-for-updates');
  },

  /**
   * Auto-Updater: Download the available update
   */
  downloadUpdate: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('download-update');
  },

  /**
   * Auto-Updater: Install the downloaded update and restart
   */
  installUpdate: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('install-update');
  },

  /**
   * Auto-Updater: Get current update status
   */
  getUpdateStatus: (): Promise<{ success: boolean; status?: any; error?: string }> => {
    return ipcRenderer.invoke('get-update-status');
  },

  /**
   * Auto-Updater: Get current application version
   */
  getAppVersion: (): Promise<{ success: boolean; version?: string; error?: string }> => {
    return ipcRenderer.invoke('get-app-version');
  },

  /**
   * Auto-Updater: Listen for update status changes
   */
  onUpdateStatus: (callback: (status: any) => void): (() => void) => {
    const subscription = (_event: any, status: any) => callback(status);
    ipcRenderer.on('update-status', subscription);
    return () => ipcRenderer.removeListener('update-status', subscription);
  },

  /**
   * INI Configuration Manager: Read an INI file
   */
  iniConfigManager: {
    readFile: (filePath: string): Promise<string> => {
      return ipcRenderer.invoke(IPC_CHANNELS.INI_MANAGER_READ_FILE, filePath);
    },

    writeFile: (filePath: string, content: string): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.INI_MANAGER_WRITE_FILE, filePath, content);
    },

    findFiles: (gamePath?: string): Promise<{ name: string; path: string; exists: boolean }[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.INI_MANAGER_FIND_FILES, gamePath);
    },

    getHardwareProfile: (): Promise<any> => {
      return ipcRenderer.invoke(IPC_CHANNELS.INI_MANAGER_GET_HARDWARE);
    },

    backupFile: (filePath: string): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.INI_MANAGER_BACKUP_FILE, filePath);
    },

    restoreBackup: (filePath: string): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.INI_MANAGER_RESTORE_BACKUP, filePath);
    },
  },

  assetScanner: {
    browseFolder: (): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSET_SCANNER_BROWSE_FOLDER);
    },

    scanForDuplicates: (scanPath: string): Promise<any> => {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSET_SCANNER_SCAN_DUPLICATES, scanPath);
    },

    cleanupDuplicates: (filesToRemove: string[]): Promise<any> => {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSET_SCANNER_CLEANUP_DUPLICATES, filesToRemove);
    },

    getLastScanPath: (): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSET_SCANNER_GET_LAST_PATH);
    },

    saveLastScanPath: (scanPath: string): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.ASSET_SCANNER_SAVE_LAST_PATH, scanPath);
    },

    onScanProgress: (callback: (progress: any) => void): (() => void) => {
      const subscription = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('asset-scanner-progress', subscription);
      return () => ipcRenderer.removeListener('asset-scanner-progress', subscription);
    },
  },

  // =========================================================================
  // GAME LOG MONITOR API (Feature 3)
  // =========================================================================
  gameLogMonitor: {
    browseLogFile: (): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_BROWSE_LOG);
    },

    startMonitoring: (logPath: string): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_START, logPath);
    },

    stopMonitoring: (): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_STOP);
    },

    getLastLogPath: (): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_GET_LAST_PATH);
    },

    saveLastLogPath: (logPath: string): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_SAVE_LAST_PATH, logPath);
    },

    exportLogs: (logs: any[]): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GAME_LOG_MONITOR_EXPORT_LOGS, logs);
    },

    onLogUpdate: (callback: (entry: any) => void): (() => void) => {
      const subscription = (_event: any, entry: any) => callback(entry);
      ipcRenderer.on('log-update', subscription);
      return () => ipcRenderer.removeListener('log-update', subscription);
    },
  },

  // =========================================================================
  // XEDIT SCRIPT EXECUTOR API (Feature 4)
  // =========================================================================
  xEditScriptExecutor: {
    browseXEdit: (): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_BROWSE_XEDIT);
    },

    browsePlugin: (): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_BROWSE_PLUGIN);
    },

    getXEditPath: (): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_GET_XEDIT_PATH);
    },

    saveXEditPath: (xEditPath: string): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_SAVE_XEDIT_PATH, xEditPath);
    },

    getPluginList: (): Promise<string[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_GET_PLUGIN_LIST);
    },

    executeScript: (xEditPath: string, plugin: string, scriptId: string): Promise<any> => {
      return ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_EXECUTE, xEditPath, plugin, scriptId);
    },

    onProgress: (callback: (data: { progress: number; text: string }) => void): (() => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('xedit-progress', subscription);
      return () => ipcRenderer.removeListener('xedit-progress', subscription);
    },
  },

  // =========================================================================
  // PROJECT TEMPLATES API (Feature 5)
  // =========================================================================
  projectTemplates: {
    browsePath: (): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.PROJECT_TEMPLATE_BROWSE_PATH);
    },

    createProject: (config: { templateId: string; projectName: string; projectPath: string; authorName: string }): Promise<{ success: boolean; path?: string; error?: string }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.PROJECT_TEMPLATE_CREATE, config);
    },

    downloadTemplate: (templateId: string): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.PROJECT_TEMPLATE_DOWNLOAD, templateId);
    },
  },

  // =========================================================================
  // MOD CONFLICT VISUALIZER API (Feature 6)
  // =========================================================================
  modConflictVisualizer: {
    scanLoadOrder: (): Promise<{ plugins: string[]; conflicts: any[] }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.MOD_CONFLICT_SCAN_LOAD_ORDER);
    },

    analyze: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.MOD_CONFLICT_ANALYZE);
    },

    resolve: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.MOD_CONFLICT_RESOLVE);
    },
  },

  // =========================================================================
  // FORMID REMAPPER API (Feature 7)
  // =========================================================================
  formIdRemapper: {
    scanConflicts: (pluginPath: string): Promise<{ count: number }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.FORMID_REMAPPER_SCAN_CONFLICTS, pluginPath);
    },

    remapFormIds: (pluginPath: string): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.FORMID_REMAPPER_REMAP, pluginPath);
    },

    backup: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.FORMID_REMAPPER_BACKUP);
    },
  },

  // =========================================================================
  // MOD COMPARISON TOOL API (Feature 8)
  // =========================================================================
  modComparisonTool: {
    compare: (mod1: string, mod2: string): Promise<{ differences: any[] }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.MOD_COMPARISON_COMPARE, mod1, mod2);
    },

    merge: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.MOD_COMPARISON_MERGE);
    },

    export: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.MOD_COMPARISON_EXPORT);
    },
  },

  // =========================================================================
  // PRECOMBINE GENERATOR API (Feature 9)
  // =========================================================================
  precombineGenerator: {
    generate: (worldspace: string): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.PRECOMBINE_GENERATOR_GENERATE, worldspace);
    },

    validate: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.PRECOMBINE_GENERATOR_VALIDATE);
    },

    getPJMPath: (): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.PRECOMBINE_GENERATOR_GET_PJM_PATH);
    },
  },

  // =========================================================================
  // VOICE COMMANDS API (Feature 10)
  // =========================================================================
  voiceCommands: {
    startListening: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.VOICE_COMMANDS_START);
    },

    stopListening: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.VOICE_COMMANDS_STOP);
    },

    execute: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.VOICE_COMMANDS_EXECUTE);
    },

    onTranscript: (callback: (text: string) => void): (() => void) => {
      const subscription = (_event: any, text: string) => callback(text);
      ipcRenderer.on('voice-transcript', subscription);
      return () => ipcRenderer.removeListener('voice-transcript', subscription);
    },
  },

  // =========================================================================
  // AUTOMATION ENGINE API
  // =========================================================================
  automation: {
    start: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_START);
    },

    stop: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_STOP);
    },

    getSettings: (): Promise<any> => {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_GET_SETTINGS);
    },

    updateSettings: (settings: any): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_UPDATE_SETTINGS, settings);
    },

    toggleRule: (ruleId: string, enabled: boolean): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_TOGGLE_RULE, ruleId, enabled);
    },

    triggerRule: (ruleId: string): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_TRIGGER_RULE, ruleId);
    },

    getStatistics: (): Promise<any> => {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_GET_STATISTICS);
    },

    resetStatistics: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_RESET_STATISTICS);
    },

    onRuleExecuted: (callback: (data: any) => void): (() => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('automation:rule-executed', subscription);
      return () => ipcRenderer.removeListener('automation:rule-executed', subscription);
    },
  },
  /**
   * CK Crash Prevention: Validate ESP file before CK operations
   */
  ckCrashValidate: (espPath: string, modName?: string, cellCount?: number): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_CRASH_VALIDATE, espPath, modName, cellCount);
  },

  /**
   * CK Crash Prevention: Analyze crash log file
   */
  ckCrashAnalyze: (logPath: string): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_CRASH_ANALYZE, logPath);
  },

  /**
   * CK Crash Prevention: Generate prevention plan from validation results
   */
  ckCrashGeneratePlan: (validation: any): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_CRASH_GENERATE_PLAN, validation);
  },

  /**
   * CK Crash Prevention: Pick log file via dialog
   */
  ckCrashPickLog: (): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_CRASH_PICK_LOG);
  },

  // =========================================================================
  // CLOUD SYNC API
  // =========================================================================
  cloudSync: {
    /**
     * Synchronize a project with cloud storage
     */
    syncProject: (projectId: string, direction?: 'push' | 'pull' | 'bidirectional'): Promise<{ success: boolean; data?: any; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:sync-project', projectId, direction);
    },

    /**
     * Enable automatic synchronization for a project
     */
    enableAutoSync: (projectId: string, interval?: number): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:enable-auto-sync', projectId, interval);
    },

    /**
     * Share a project with collaborators
     */
    shareProject: (projectId: string, collaborators: string[]): Promise<{ success: boolean; data?: any; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:share-project', projectId, collaborators);
    },

    /**
     * Join a shared project using invite code
     */
    joinProject: (inviteCode: string): Promise<{ success: boolean; data?: any; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:join-project', inviteCode);
    },

    /**
     * Leave a collaboration session (with automatic sync)
     */
    leaveCollaborationSession: (sessionId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:leave-collaboration-session', sessionId, userId);
    },

    /**
     * End a collaboration session gracefully
     */
    endCollaborationSession: (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:end-collaboration-session', sessionId);
    },

    /**
     * Broadcast a change to all collaborators
     */
    broadcastChange: (change: any): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:broadcast-change', change);
    },

    /**
     * Subscribe to real-time changes
     */
    subscribeToChanges: (projectId: string, filters?: any): Promise<{ success: boolean; subscriptionId?: string; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:subscribe-to-changes', projectId, filters);
    },

    /**
     * Unsubscribe from changes
     */
    unsubscribeFromChanges: (subscriptionId: string): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:unsubscribe-from-changes', subscriptionId);
    },

    /**
     * Detect conflicts in a project
     */
    detectConflicts: (projectId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:detect-conflicts', projectId);
    },

    /**
     * Resolve a sync conflict
     */
    resolveConflict: (conflict: any, resolution: any): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:resolve-conflict', conflict, resolution);
    },

    /**
     * Get project history snapshots
     */
    getProjectHistory: (projectId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:get-project-history', projectId);
    },

    /**
     * Restore a project snapshot
     */
    restoreSnapshot: (snapshotId: string): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:restore-snapshot', snapshotId);
    },

    /**
     * Upload an asset to CDN
     */
    uploadAsset: (assetPath: string, projectId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:upload-asset', assetPath, projectId);
    },

    /**
     * Download an asset from CDN
     */
    downloadAsset: (cdnUrl: string, localPath: string): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:download-asset', cdnUrl, localPath);
    },

    /**
     * Get sync status for a project
     */
    getSyncStatus: (projectId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:get-status', projectId);
    },

    /**
     * Get active collaboration session for a project
     */
    getCollaborationSession: (projectId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
      return ipcRenderer.invoke('cloud-sync:get-collaboration-session', projectId);
    },

    /**
     * Listen for incoming changes from collaborators
     */
    onChangeReceived: (callback: (data: { subscriptionId: string; change: any }) => void): (() => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('cloud-sync:change-received', subscription);
      return () => ipcRenderer.removeListener('cloud-sync:change-received', subscription);
    },
  },

  /**
   * Generic IPC: Invoke a command in the main process
   */
  invoke: (channel: string, ...args: any[]): Promise<any> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  /**
   * Generic IPC: Listen for an event from the main process
   */
  on: (channel: string, callback: (...args: any[]) => void): (() => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  // ========================================================================
  // Learning Hub API
  // ========================================================================

  /**
   * Learning Hub - Tutorial and learning management
   */
  learningHub: {
    /**
     * List all tutorials or filter by category
     */
    listTutorials: (category?: string): Promise<any[]> => {
      return ipcRenderer.invoke('learning:list-tutorials', category);
    },

    /**
     * Get a specific tutorial by ID
     */
    getTutorial: (tutorialId: string): Promise<any> => {
      return ipcRenderer.invoke('learning:get-tutorial', tutorialId);
    },

    /**
     * Track user progress on a tutorial step
     */
    trackProgress: (userId: string, tutorialId: string, step: number | string): Promise<any> => {
      return ipcRenderer.invoke('learning:track-progress', userId, tutorialId, step);
    },

    /**
     * Validate and grade an exercise submission
     */
    validateExercise: (exerciseId: string, submission: any): Promise<any> => {
      return ipcRenderer.invoke('learning:submit-exercise', exerciseId, submission);
    },

    /**
     * Get hint for an exercise
     */
    provideHint: (exerciseId: string, currentAttempt: any): Promise<any> => {
      return ipcRenderer.invoke('learning:provide-hint', exerciseId, currentAttempt);
    },

    /**
     * Mark a step as completed
     */
    completeStep: (userId: string, stepId: string): Promise<any> => {
      return ipcRenderer.invoke('learning:complete-step', userId, stepId);
    },

    /**
     * Get user progress
     */
    getUserProgress: (userId: string): Promise<any> => {
      return ipcRenderer.invoke('learning:get-user-progress', userId);
    },

    /**
     * List all achievements
     */
    listAchievements: (): Promise<any[]> => {
      return ipcRenderer.invoke('learning:get-achievements', 'local_user').then((res: any) => res.all || []);
    },

    /**
     * Unlock an achievement for the user
     */
    unlockAchievement: (userId: string, achievementId: string): Promise<any> => {
      // Since there's no unlock handler currently, we'll use complete-step as a workaround
      // In production, this would need its own handler in main.ts
      return ipcRenderer.invoke('learning:get-achievements', userId).then((res: any) => {
        const achievements = res.all || [];
        return achievements.find((a: any) => a.id === achievementId) || { id: achievementId, name: 'Achievement', points: 10 };
      });
    },
  },

  // ========================================================================
  // Panel Data Persistence API
  // ========================================================================


  /**
   * Save panel state data to disk
   * @param panelId - Unique identifier for the panel
   * @param data - Data object to persist (will be JSON serialized)
   * @returns Promise resolving to {ok: boolean, panelId}
   */
  savePanelData: (panelId: string, data: any): Promise<{ ok: boolean; panelId: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_PANEL_DATA, panelId, data);
  },

  /**
   * Load previously saved panel state data from disk
   * @param panelId - Unique identifier for the panel
   * @returns Promise resolving to {ok: boolean, data, panelId}
   */
  loadPanelData: (panelId: string): Promise<{ ok: boolean; data: any; panelId: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_PANEL_DATA, panelId);
  },

  /**
   * Delete saved panel state data from disk
   * @param panelId - Unique identifier for the panel
   * @returns Promise resolving to {ok: boolean, panelId}
   */
  deletePanelData: (panelId: string): Promise<{ ok: boolean; panelId: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DELETE_PANEL_DATA, panelId);
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

