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
import type { IpcResponse, IpcErrorCode, SimpleResponse, FilePathResponse, ArrayResponse, ItemResponse } from './types/ipcErrors';
import {
  IPC_HANDLER_CONTRACT_VERSION,
  IPC_REGISTRATION_REPORT_CHANNEL,
  REQUIRED_IPC_HANDLER_CHANNELS,
} from './ipc-required-handlers';

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

// Auditor-specific response types
interface AuditorAnalysisResult {
  fileSize?: number;
  recordCount?: number;
  issues?: any[];
}

interface AuditorBinaryResult {
  data?: string; // base64-encoded
}

interface AuditorFixResult {
  message?: string;
  backedUpTo?: string | null;
  scriptPath?: string;
  scriptContent?: string;
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
  WORKFLOW_RUNNER_RUN_TOOL: 'workflow-runner:run-tool',
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
  AUDITOR_APPLY_ESP_FIX: 'auditor-apply-esp-fix',

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
  SPRIGGIT_VERIFY_DEFENDER_EXCLUSION: 'spriggit-verify-defender-exclusion',

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

  // Script Installation & Execution
  INSTALL_SCRIPT: 'install-script',
  XEDIT_SCRIPT_EXECUTE_SCRIPT: 'xedit-script-execute-script',
  CK_PLUGIN_VALIDATE: 'ck-plugin-validate',
  CK_LAUNCH_WITH_PLUGIN: 'ck-launch-with-plugin',

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

  // BA2 Archive Manager
  PICK_BA2_FILE: 'pick-ba2-file',

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

  // What's New (Platform 7)
  WHATS_NEW_GET_ALL: 'whats-new-get-all',
  WHATS_NEW_GET_CURRENT: 'whats-new-get-current',
  WHATS_NEW_GET_CHANGELOG: 'whats-new-get-changelog',
  WHATS_NEW_MARK_SEEN: 'whats-new-mark-seen',
  WHATS_NEW_DISMISS: 'whats-new-dismiss',
  WHATS_NEW_RESET: 'whats-new-reset',

  // Proactive Observer (Neural Link+)
  OBSERVER_NOTIFY: 'observer-notify',
  OBSERVER_SET_ACTIVE_FOLDER: 'observer-set-active-folder',

  // Bridge & Plugin Activity — sent from Main to Renderer whenever an external
  // bridge (Desktop Bridge, Blender Bridge, MO2 Bridge, future plugins) records
  // user activity.  Payload: ActivityEvent (source, eventType, detail?, panel?).
  BRIDGE_ACTIVITY: 'bridge-activity',

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
  CK_CRASH_PICK_LOG_FILE: 'ck-crash-prevention:pick-log-file',
  CK_CRASH_PICK_PLUGIN: 'ck-crash-prevention:pick-plugin',
  CK_CRASH_PICK_MOD_PACKAGE: 'ck-crash-prevention:pick-mod-package',
  CK_CRASH_EXTRACT_ZIP: 'ck-crash-prevention:extract-zip',

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

  // Mossy Brain Feature 1: Persistent Memory Store
  MEMORY_STORE_SAVE: 'memory-store-save',
  MEMORY_STORE_LOAD: 'memory-store-load',
  MEMORY_STORE_ADD_FACT: 'memory-store-add-fact',
  MEMORY_STORE_QUERY: 'memory-store-query',
  MEMORY_STORE_GET_ALL: 'memory-store-get-all',
  MEMORY_STORE_DELETE: 'memory-store-delete',
  MEMORY_STORE_UPDATE: 'memory-store-update',

  // Mossy Brain Feature 2: Session Journal
  SESSION_JOURNAL_START: 'session-journal-start',
  SESSION_JOURNAL_END: 'session-journal-end',
  SESSION_JOURNAL_APPEND: 'session-journal-append',
  SESSION_JOURNAL_GET_ENTRIES: 'session-journal-get-entries',

  // Mossy Brain Feature 3: Shared Context Bus
  CONTEXT_BUS_SYNC: 'context-bus-sync',
  CONTEXT_BUS_LOAD: 'context-bus-load',

  // Mossy Brain Feature 4: Auto-Ingestion Pipeline
  AUTO_INGEST_WATCH_START: 'auto-ingest-watch-start',
  AUTO_INGEST_WATCH_STOP: 'auto-ingest-watch-stop',
  AUTO_INGEST_PROCESS_FILE: 'auto-ingest-process-file',
  AUTO_INGEST_FOLDER_CHANGE: 'auto-ingest-folder-change',

  // Mossy Brain Feature 5: Unified Semantic Search
  SEARCH_GLOBAL: 'search-global',
  SEARCH_GLOBAL_INDEX: 'search-global-index',

  // Mossy Brain Feature 6: Clipboard Intelligence
  CLIPBOARD_WATCH_START: 'clipboard-watch-start',
  CLIPBOARD_WATCH_STOP: 'clipboard-watch-stop',
  CLIPBOARD_DETECTED: 'clipboard-detected',

  // Mossy Brain Feature 7: Background Task Queue
  TASK_ENQUEUE: 'task-enqueue',
  TASK_LIST: 'task-list',
  TASK_GET_STATUS: 'task-get-status',
  TASK_CANCEL: 'task-cancel',
  TASK_COMPLETION: 'task-completion',

  // Mossy Brain Feature 8: Hardware Sensor Feed
  SYSTEM_METRICS_POLL: 'system-metrics-poll',
  SYSTEM_METRICS_GET: 'system-metrics-get',
  SYSTEM_METRICS_SUBSCRIBE: 'system-metrics-subscribe',
} as const;

const isNoHandlerRegisteredError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('No handler registered for');
};

const OPTIONAL_IPC_CHANNELS = {
  SECRET_STATUS: IPC_CHANNELS.SECRET_STATUS,
  WHATS_NEW_GET_CURRENT: IPC_CHANNELS.WHATS_NEW_GET_CURRENT,
  UPDATE_STATUS: 'get-update-status',
  PLUGIN_LIST_INSTALLED: 'plugin-manager:list-installed',
} as const;

const invokeWithFallback = async <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
  try {
    return await ipcRenderer.invoke(channel, ...args) as T;
  } catch (error: unknown) {
    if (!isNoHandlerRegisteredError(error)) {
      throw error;
    }

    switch (channel) {
      case OPTIONAL_IPC_CHANNELS.SECRET_STATUS:
        console.debug(`[Preload] IPC handler for '${channel}' not yet ready, using fallback`);
        return { ok: false, error: 'Secret status unavailable' } as T;
      case OPTIONAL_IPC_CHANNELS.WHATS_NEW_GET_CURRENT:
        console.debug(`[Preload] IPC handler for '${channel}' not yet ready, using fallback`);
        return { ok: false, entry: null, error: 'What\'s New service unavailable' } as T;
      case OPTIONAL_IPC_CHANNELS.UPDATE_STATUS:
        console.debug(`[Preload] IPC handler for '${channel}' not yet ready, using fallback`);
        return { success: false, error: 'Auto-update status unavailable' } as T;
      case OPTIONAL_IPC_CHANNELS.PLUGIN_LIST_INSTALLED:
        console.debug(`[Preload] IPC handler for '${channel}' not yet ready, using fallback`);
        return [] as T;
      default:
        throw error;
    }
  }
};

/**
 * Exposed API that will be available on window.electron.api
 */
const electronAPI = {
  /**
   * All API methods now return IpcResponse<T> for consistent error handling
   * 
   * Success: { success: true, data: T, timestamp: number }
   * Error:   { success: false, error: string, code: IpcErrorCode, timestamp: number }
   * 
   * Always check response.success before accessing response.data
   */
  detectPrograms: (): Promise<IpcResponse<InstalledProgram[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DETECT_PROGRAMS);
  },

  /**
   * Get currently running modding tools
   * @returns Promise resolving to IpcResponse with array of running processes
   */
  getRunningProcesses: (): Promise<IpcResponse<any[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_RUNNING_PROCESSES);
  },

  /**
   * Get settings from Electron store
   * @returns Promise resolving to IpcResponse with settings object
   */
  getSettings: (): Promise<IpcResponse<any>> => {
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
   * Report activity from an external bridge or plugin to the main process.
   * The main process broadcasts a 'bridge-activity' IPC event back to the renderer,
   * where MossyObserver picks it up and feeds it into panelActivity.ts.
   *
   * Usage from any bridge plugin:
   *   window.electron.api.reportBridgeActivity('mo2-bridge', 'profile-changed', 'Default Profile')
   *   window.electron.api.reportBridgeActivity('blender-bridge', 'script-executed', 'NIF Export')
   *
   * @param source  - Bridge/plugin identifier (e.g. 'mo2-bridge', 'blender-bridge', 'desktop-bridge')
   * @param eventType - What happened (e.g. 'session-started', 'file-loaded', 'error')
   * @param detail  - Optional human-readable detail string
   * @param panel   - Optional panel route if relevant
   */
  reportBridgeActivity: (source: string, eventType: string, detail?: string, panel?: string): void => {
    ipcRenderer.send(IPC_CHANNELS.BRIDGE_ACTIVITY, { source, eventType, detail, panel, at: Date.now() });
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
   * Workflow Runner: run a user-configured tool/command and capture output.
   * Uses a dedicated channel that is not subject to the Vault allowlist so that
   * any executable the user has configured in their workflow can be launched.
   */
  workflowRunnerRunTool: (payload: { cmd: string; args?: string[]; cwd?: string }): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_RUNNER_RUN_TOOL, payload);
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
  listProjects: (): Promise<any[]> => {
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
  switchProject: (projectId: string): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROJECT_SWITCH, projectId);
  },
  joinCollaborationSession: (sessionId: string): Promise<any> => {
    return ipcRenderer.invoke('collaboration-join-session', sessionId);
  },
  leaveCollaborationSession: (sessionId: string): Promise<any> => {
    return ipcRenderer.invoke('collaboration-leave-session', sessionId);
  },
  listCollaborationSessions: (): Promise<any[]> => {
    return ipcRenderer.invoke('collaboration-list-sessions');
  },
  createCollaborationSession: (payload: { projectId: string; name?: string; description?: string }): Promise<any> => {
    return ipcRenderer.invoke('collaboration-create-session', payload);
  },
  initGitRepository: (projectId: string, config: any): Promise<any> => {
    return ipcRenderer.invoke('collaboration-git-init', projectId, config);
  },
  gitCommit: (projectId: string, message: string): Promise<any> => {
    return ipcRenderer.invoke('collaboration-git-commit', projectId, message);
  },
  gitPush: (projectId: string): Promise<any> => {
    return ipcRenderer.invoke('collaboration-git-push', projectId);
  },
  gitPull: (projectId: string): Promise<any> => {
    return ipcRenderer.invoke('collaboration-git-pull', projectId);
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
   * AI Assistant: Generate script for given context
   * Generates Papyrus, XML, Python, or JSON code from natural language description
   * Tries Groq first (faster), falls back to OpenAI
   */
  aiGenerateScript: (request: any): Promise<any> => {
    return ipcRenderer.invoke('ai-generate-script', request);
  },

  /**
   * AI Assistant: Plan workflow based on user request
   */
  aiPlanWorkflow: (request: any): Promise<any> => {
    return ipcRenderer.invoke('ai:plan-workflow', request);
  },

  /**
   * AI Assistant: Explain modding concepts
   */
  aiExplain: (request: any): Promise<any> => {
    return ipcRenderer.invoke('ai:explain', request);
  },

  /**
   * AI Assistant: Diagnose error from context
   */
  aiDiagnoseError: (context: any): Promise<any> => {
    return ipcRenderer.invoke('ai:diagnose-error', context);
  },

  /**
   * AI Assistant: Suggest names for entities
   */
  aiSuggestNames: (context: any): Promise<any> => {
    return ipcRenderer.invoke('ai:suggest-names', context);
  },

  /**
   * AI Assistant: Generate script body
   */
  aiGenerateScriptBody: (context: any): Promise<any> => {
    return ipcRenderer.invoke('ai:generate-script-body', context);
  },

  /**
   * Get startup diagnostics (token status, backend URL, etc)
   */
  getDiagnostics: (): Promise<any> => {
    return ipcRenderer.invoke('app:get-diagnostics');
  },
  getIpcRegistrationReport: (): Promise<any> => {
    return ipcRenderer.invoke(IPC_REGISTRATION_REPORT_CHANNEL);
  },
  getRequiredIpcHandlerContract: () => {
    return {
      version: IPC_HANDLER_CONTRACT_VERSION,
      requiredChannels: [...REQUIRED_IPC_HANDLER_CHANNELS],
    };
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
   * @returns IpcResponse with analysis results (fileSize, recordCount, issues)
   */
  analyzeEsp: (filePath: string): Promise<IpcResponse<AuditorAnalysisResult>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_ANALYZE_ESP, filePath);
  },

  /**
   * Auditor: Read any mod asset file (ESP/ESM/ESL/NIF/DDS/BGSM) as raw binary.
   * Returns base64-encoded file data so the renderer worker can parse the true
   * binary format without going through a lossy UTF-8 text codec.
   * @returns IpcResponse with base64-encoded binary data
   */
  readBinaryFile: (filePath: string): Promise<IpcResponse<AuditorBinaryResult>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_READ_BINARY_FILE, filePath);
  },

  /**
   * Auditor: Apply an auto-fix to an ESP/ESM/ESL plugin.
   * fixType: 'set_esl_flag' | 'generate_udr_script' | 'generate_itm_script'
   * Always creates a .bak backup before any in-place modification.
   * @returns IpcResponse with fix result (message, backedUpTo, scriptPath, etc.)
   */
  applyEspFix: (filePath: string, fixType: string): Promise<IpcResponse<AuditorFixResult>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_APPLY_ESP_FIX, filePath, fixType);
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
   * Check if the Spriggit folder is already excluded from Windows Defender.
   * Returns ok:true with excluded:true/false, or ok:false with error on failure.
   */
  spriggitVerifyDefenderExclusion: (): Promise<{ ok: boolean; excluded?: boolean; targetPath?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SPRIGGIT_VERIFY_DEFENDER_EXCLUSION);
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
   * CK Crash Prevention: Pick plugin file (ESP/ESM/ELS)
   */
  ckPickPlugin: (): Promise<{ success: boolean; path?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_CRASH_PICK_PLUGIN);
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
   * Legacy alias for folder picker used by some renderer modules.
   */
  selectDirectory: (title?: string): Promise<string> => {
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
   * BA2 Archive Manager: Open native file picker restricted to .ba2 archives.
   * Returns the selected path or '' if cancelled.
   */
  pickBa2File: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PICK_BA2_FILE);
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
   * Install Script: Install xEdit (.pas) or Papyrus (.psc) scripts to their target directories
   */
  installScript: (type: 'xedit' | 'papyrus', name: string, content: string): Promise<{ success: boolean; path?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INSTALL_SCRIPT, type, name, content);
  },

  /**
   * xEdit Script: Execute xEdit script with optional plugin parameter
   */
  xeditRunScriptWithPlugin: (scriptPath: string, pluginPath?: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.XEDIT_SCRIPT_EXECUTE_SCRIPT, scriptPath, pluginPath || '');
  },

  /**
   * CK Plugin: Validate ESP/ESM plugin file format
   */
  ckValidatePlugin: (espPath: string): Promise<{ success: boolean; issues?: Array<{ type: string; message: string }>; validationPassed?: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_PLUGIN_VALIDATE, espPath);
  },

  /**
   * CK Plugin: Launch Creation Kit with specific plugin loaded
   */
  ckLaunchWithPlugin: (pluginPath: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_LAUNCH_WITH_PLUGIN, pluginPath);
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
   * Main process manages API key; renderer never sees it.
   * Falls back to a direct Render-backend call when the IPC handler is not
   * registered (e.g. during a cold startup or partial handler registration).
   */
  aiChatGroq: async (prompt: string, systemPrompt?: string, model?: string, conversationHistory?: Array<{ role: string; content: string }>): Promise<{ success: boolean; content?: string; error?: string }> => {
    try {
      return await ipcRenderer.invoke('ai-chat-groq', { prompt, systemPrompt, model, conversationHistory });
    } catch (ipcErr: unknown) {
      if (!isNoHandlerRegisteredError(ipcErr)) {
        throw ipcErr;
      }

      // IPC handler is not registered – call the Render backend directly.
      // The preload runs in Node context so process.env is available.
      const backendUrl = String(process.env.MOSSY_BACKEND_URL || 'https://mossy.onrender.com').replace(/\/+$/, '');
      const backendToken = String(process.env.MOSSY_BACKEND_TOKEN || '').trim();

      if (!backendUrl) {
        console.warn('[Preload] aiChatGroq: no backend URL configured');
        return { success: false, error: 'No backend URL configured. Set MOSSY_BACKEND_URL.' };
      }

      try {
        const resolvedSystemPrompt = systemPrompt || 'You are a helpful assistant for Fallout 4 modding.';
        const resolvedModel = model || 'llama-3.1-8b-instant';
        const history = Array.isArray(conversationHistory)
          ? conversationHistory
              .filter((e) => e != null && (e.role === 'user' || e.role === 'assistant') && typeof e.content === 'string' && e.content.trim() !== '')
              .slice(-20)
          : [];
        const messages = [
          { role: 'system' as const, content: resolvedSystemPrompt },
          ...history,
          { role: 'user' as const, content: String(prompt || '') },
        ];

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        let res: Response;
        try {
          res = await fetch(`${backendUrl}/v1/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
            },
            body: JSON.stringify({ provider: 'groq', model: resolvedModel, messages, maxTokens: 1024 }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        interface BackendChatResponse { ok?: boolean; text?: string; message?: string; error?: string; }
        const json: BackendChatResponse = await res.json().catch(() => ({}));
        if (res.ok && json?.ok) {
          return { success: true, content: String(json?.text || '') };
        }
        const errMsg = String(json?.message || json?.error || `HTTP ${res.status}`);
        console.warn('[Preload] aiChatGroq backend fallback failed:', errMsg);
        return { success: false, error: errMsg };
      } catch (fetchErr: unknown) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr ?? 'Backend request failed');
        console.warn('[Preload] aiChatGroq backend fallback error:', msg);
        return { success: false, error: msg };
      }
    }
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
    return invokeWithFallback(IPC_CHANNELS.SECRET_STATUS);
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
    return invokeWithFallback(OPTIONAL_IPC_CHANNELS.UPDATE_STATUS);
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
   * CK Crash Prevention: Pick a full mod package path (folder/archive)
   */
  ckPickModPackage: (): Promise<{ success: boolean; path?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_CRASH_PICK_MOD_PACKAGE);
  },

  /**
   * CK Crash Prevention: Extract a .zip archive to temporary directory for scan
   */
  ckExtractZip: (archivePath: string): Promise<{ success: boolean; extractedPath?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CK_CRASH_EXTRACT_ZIP, archivePath);
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
    return invokeWithFallback(channel, ...args);
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

  // ============================================================================
  // MOSSY BRAIN FEATURE 1: PERSISTENT MEMORY STORE
  // ============================================================================

  /**
   * Save all facts to disk
   */
  memoryStoreSave: (facts: any[]): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MEMORY_STORE_SAVE, facts);
  },

  /**
   * Load all facts from disk
   */
  memoryStoreLoad: (): Promise<{ ok: boolean; facts?: any[]; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MEMORY_STORE_LOAD);
  },

  /**
   * Add a new fact to memory
   */
  memoryStoreAddFact: (req: { fact: string; context: string; tags?: string[] }): Promise<{ ok: boolean; factId?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MEMORY_STORE_ADD_FACT, req);
  },

  /**
   * Query facts by keyword (returns top-K ranked results)
   */
  memoryStoreQuery: (req: { query: string; topK?: number }): Promise<{ ok: boolean; facts?: any[]; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MEMORY_STORE_QUERY, req);
  },

  /**
   * Get all facts
   */
  memoryStoreGetAll: (): Promise<{ ok: boolean; facts?: any[]; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MEMORY_STORE_GET_ALL);
  },

  /**
   * Delete a fact by ID
   */
  memoryStoreDelete: (factId: string): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MEMORY_STORE_DELETE, factId);
  },

  /**
   * Update a fact by ID (partial updates)
   */
  memoryStoreUpdate: (factId: string, updates: any): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MEMORY_STORE_UPDATE, factId, updates);
  },

  // ============================================================================
  // MOSSY BRAIN FEATURE 2: SESSION JOURNAL
  // ============================================================================

  /**
   * Start a new session
   */
  sessionJournalStart: (): Promise<{ ok: boolean; sessionId?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_JOURNAL_START);
  },

  /**
   * End current session and auto-summarize
   */
  sessionJournalEnd: (req: { chatMessages: any[]; startTime: number }): Promise<{ ok: boolean; entry?: any; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_JOURNAL_END, req);
  },

  /**
   * Manually append a journal entry
   */
  sessionJournalAppend: (entry: any): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_JOURNAL_APPEND, entry);
  },

  /**
   * Get recent journal entries
   */
  sessionJournalGetEntries: (limit?: number): Promise<{ ok: boolean; entries?: any[]; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_JOURNAL_GET_ENTRIES, limit);
  },

  // ============================================================================
  // MOSSY BRAIN FEATURE 3: SHARED CONTEXT BUS
  // ============================================================================

  /**
   * Sync context bus state to disk
   */
  contextBusSync: (state: any): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONTEXT_BUS_SYNC, state);
  },

  /**
   * Load context bus state from disk
   */
  contextBusLoad: (): Promise<{ ok: boolean; state?: any; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONTEXT_BUS_LOAD);
  },

  // ============================================================================
  // MOSSY BRAIN FEATURE 4: AUTO-INGESTION PIPELINE
  // ============================================================================

  /**
   * Start watching a folder for new files
   */
  autoIngestWatchStart: (folderPath: string): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTO_INGEST_WATCH_START, folderPath);
  },

  /**
   * Stop watching for files
   */
  autoIngestWatchStop: (): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTO_INGEST_WATCH_STOP);
  },

  /**
   * Process a single file for ingestion
   */
  autoIngestProcessFile: (req: { filePath: string; autoSummarize?: boolean }): Promise<{ ok: boolean; ingested?: any; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTO_INGEST_PROCESS_FILE, req);
  },

  /**
   * Listen for folder changes during auto-ingest
   */
  onAutoIngestFolderChange: (callback: (folderPath: string) => void): (() => void) => {
    const listener = (_event: any, folderPath: string) => callback(folderPath);
    ipcRenderer.on(IPC_CHANNELS.AUTO_INGEST_FOLDER_CHANGE, listener);
    return () => ipcRenderer.off(IPC_CHANNELS.AUTO_INGEST_FOLDER_CHANGE, listener);
  },

  // ============================================================================
  // MOSSY BRAIN FEATURE 5: UNIFIED SEMANTIC SEARCH
  // ============================================================================

  /**
   * Global search across all knowledge sources
   */
  searchGlobal: (req: { query: string; topK?: number }): Promise<{ ok: boolean; results?: any[]; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SEARCH_GLOBAL, req);
  },

  /**
   * Trigger global semantic index rebuild
   */
  searchGlobalIndex: (): Promise<{ ok: boolean; indexed?: number; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SEARCH_GLOBAL_INDEX);
  },

  // ============================================================================
  // MOSSY BRAIN FEATURE 6: CLIPBOARD INTELLIGENCE
  // ============================================================================

  /**
   * Start monitoring clipboard for smart detection
   */
  clipboardWatchStart: (): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WATCH_START);
  },

  /**
   * Stop monitoring clipboard
   */
  clipboardWatchStop: (): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WATCH_STOP);
  },

  /**
   * Listen for clipboard detection events
   */
  onClipboardDetected: (callback: (detection: any) => void): (() => void) => {
    const listener = (_event: any, detection: any) => callback(detection);
    ipcRenderer.on(IPC_CHANNELS.CLIPBOARD_DETECTED, listener);
    return () => ipcRenderer.off(IPC_CHANNELS.CLIPBOARD_DETECTED, listener);
  },

  // ============================================================================
  // MOSSY BRAIN FEATURE 7: BACKGROUND TASK QUEUE
  // ============================================================================

  /**
   * Enqueue a background task
   */
  taskEnqueue: (req: { type: string; priority?: number; payload?: any }): Promise<{ ok: boolean; taskId?: string; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TASK_ENQUEUE, req);
  },

  /**
   * List all tasks
   */
  taskList: (filter?: { status?: string }): Promise<{ ok: boolean; tasks?: any[]; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TASK_LIST, filter);
  },

  /**
   * Get status of a single task
   */
  taskGetStatus: (taskId: string): Promise<{ ok: boolean; task?: any; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TASK_GET_STATUS, taskId);
  },

  /**
   * Cancel a task
   */
  taskCancel: (taskId: string): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TASK_CANCEL, taskId);
  },

  /**
   * Listen for task completion events
   */
  onTaskCompletion: (callback: (task: any) => void): (() => void) => {
    const listener = (_event: any, task: any) => callback(task);
    ipcRenderer.on(IPC_CHANNELS.TASK_COMPLETION, listener);
    return () => ipcRenderer.off(IPC_CHANNELS.TASK_COMPLETION, listener);
  },

  // ============================================================================
  // MOSSY BRAIN FEATURE 8: HARDWARE SENSOR FEED
  // ============================================================================

  /**
   * Poll hardware metrics once
   */
  systemMetricsPoll: (): Promise<{ ok: boolean; metrics?: any; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_METRICS_POLL);
  },

  /**
   * Get latest cached metrics
   */
  systemMetricsGet: (): Promise<{ ok: boolean; metrics?: any; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_METRICS_GET);
  },

  /**
   * Subscribe to hardware metrics updates
   */
  onSystemMetricsUpdate: (callback: (metrics: any) => void): (() => void) => {
    const listener = (_event: any, metrics: any) => callback(metrics);
    ipcRenderer.on(IPC_CHANNELS.SYSTEM_METRICS_SUBSCRIBE, listener);
    return () => ipcRenderer.off(IPC_CHANNELS.SYSTEM_METRICS_SUBSCRIBE, listener);
  },

  // Mod Browser
  modBrowser: {
    searchMods: (query: string, filters?: any): Promise<any[]> =>
      ipcRenderer.invoke('mod-browser:search', query, filters),
    getModDetails: (modId: string): Promise<any> =>
      ipcRenderer.invoke('mod-browser:get-details', modId),
    downloadMod: (modId: string, destination: string): Promise<any> =>
      ipcRenderer.invoke('mod-browser:download', modId, destination),
    rateMod: (modId: string, rating: number, review: string): Promise<void> =>
      ipcRenderer.invoke('mod-browser:rate', modId, rating, review),
    authenticateNexus: (apiKey: string): Promise<any> =>
      ipcRenderer.invoke('mod-browser:authenticate-nexus', apiKey),
    getModReviews: (modId: string): Promise<any[]> =>
      ipcRenderer.invoke('mod-browser:get-reviews', modId),
    createCollection: (name: string, mods: string[], description?: string): Promise<any> =>
      ipcRenderer.invoke('mod-browser:create-collection', name, mods, description),
    shareCollection: (collectionId: string): Promise<any> =>
      ipcRenderer.invoke('mod-browser:share-collection', collectionId),
    endorseMod: (modId: string): Promise<void> =>
      ipcRenderer.invoke('mod-browser:endorse-mod', modId),
    getTrendingMods: (timeframe?: string): Promise<any[]> =>
      ipcRenderer.invoke('mod-browser:trending', timeframe),
  },

  // Platform 9: Load Order Management API
  loadOrder: {
    getAll: (): Promise<any[]> =>
      ipcRenderer.invoke('load-order:get-all'),
    getCurrent: (): Promise<any> =>
      ipcRenderer.invoke('load-order:get-current'),
    create: (name: string, description?: string): Promise<any> =>
      ipcRenderer.invoke('load-order:create', name, description),
    updateOrder: (loadOrderId: string, plugins: any[]): Promise<any> =>
      ipcRenderer.invoke('load-order:update-order', loadOrderId, plugins),
    validate: (loadOrderId: string): Promise<any> =>
      ipcRenderer.invoke('load-order:validate', loadOrderId),
    analyzeConflicts: (loadOrderId: string): Promise<any[]> =>
      ipcRenderer.invoke('load-order:analyze-conflicts', loadOrderId),
    optimize: (loadOrderId: string): Promise<any> =>
      ipcRenderer.invoke('load-order:optimize', loadOrderId),
    export: (loadOrderId: string, format: string): Promise<any> =>
      ipcRenderer.invoke('load-order:export', loadOrderId, format),
    import: (name: string, content: string, format: string): Promise<any> =>
      ipcRenderer.invoke('load-order:import', name, content, format),
    delete: (loadOrderId: string): Promise<any> =>
      ipcRenderer.invoke('load-order:delete', loadOrderId),
  },

  // Platform 10: Conflict Resolution API
  conflictResolver: {
    analyze: (pluginPaths: string[]): Promise<any> =>
      ipcRenderer.invoke('conflict-resolver:analyze', pluginPaths),
    detect: (plugin1: string, plugin2: string): Promise<any[]> =>
      ipcRenderer.invoke('conflict-resolver:detect', plugin1, plugin2),
    resolve: (conflicts: any[], strategy: string): Promise<any> =>
      ipcRenderer.invoke('conflict-resolver:resolve', conflicts, strategy),
    generatePatch: (conflicts: any[], patchName: string): Promise<any> =>
      ipcRenderer.invoke('conflict-resolver:generate-patch', conflicts, patchName),
    addRule: (ruleData: any): Promise<any> =>
      ipcRenderer.invoke('conflict-resolver:add-rule', ruleData),
    getRules: (): Promise<any[]> =>
      ipcRenderer.invoke('conflict-resolver:get-rules'),
    deleteRule: (ruleId: string): Promise<any> =>
      ipcRenderer.invoke('conflict-resolver:delete-rule', ruleId),
    applyRules: (conflicts: any[], ruleIds?: string[]): Promise<any> =>
      ipcRenderer.invoke('conflict-resolver:apply-rules', conflicts, ruleIds),
    exportAnalysis: (analysis: any, format: string): Promise<any> =>
      ipcRenderer.invoke('conflict-resolver:export-analysis', analysis, format),
    importRules: (content: string, format: string): Promise<any> =>
      ipcRenderer.invoke('conflict-resolver:import-rules', content, format),
  },

  // Platform 11: Plugin Manager API
  pluginManager: {
    listInstalled: (): Promise<any[]> =>
      invokeWithFallback(OPTIONAL_IPC_CHANNELS.PLUGIN_LIST_INSTALLED),
    installFromPath: (pluginPath: string): Promise<any> =>
      ipcRenderer.invoke('plugin-manager:install-from-path', pluginPath),
    listMarketplace: (): Promise<any[]> =>
      ipcRenderer.invoke('plugin-manager:list-marketplace'),
    install: (pluginId: string, version: string): Promise<any> =>
      ipcRenderer.invoke('plugin-manager:install', pluginId, version),
    uninstall: (pluginId: string): Promise<any> =>
      ipcRenderer.invoke('plugin-manager:uninstall', pluginId),
    toggle: (pluginId: string, enabled: boolean): Promise<any> =>
      ipcRenderer.invoke('plugin-manager:toggle', pluginId, enabled),
    update: (pluginId: string, newVersion: string): Promise<any> =>
      ipcRenderer.invoke('plugin-manager:update', pluginId, newVersion),
    getSettings: (): Promise<any> =>
      ipcRenderer.invoke('plugin-manager:get-settings'),
    setSettings: (settings: any): Promise<any> =>
      ipcRenderer.invoke('plugin-manager:set-settings', settings),
    getDetails: (pluginId: string): Promise<any> =>
      ipcRenderer.invoke('plugin-manager:get-details', pluginId),
    validate: (pluginId: string): Promise<any> =>
      ipcRenderer.invoke('plugin-manager:validate', pluginId),
  },

  // Platform 12: Team Workspace API
  teamWorkspace: {
    createWorkspace: (name: string, description?: string): Promise<any> =>
      ipcRenderer.invoke('team-workspace:create-workspace', name, description),
    listWorkspaces: (): Promise<any[]> =>
      ipcRenderer.invoke('team-workspace:list-workspaces'),
    getWorkspace: (workspaceId: string): Promise<any> =>
      ipcRenderer.invoke('team-workspace:get-workspace', workspaceId),
    joinWorkspace: (workspaceId: string, userId: string): Promise<any> =>
      ipcRenderer.invoke('team-workspace:join-workspace', workspaceId, userId),
    leaveWorkspace: (workspaceId: string, userId: string): Promise<any> =>
      ipcRenderer.invoke('team-workspace:leave-workspace', workspaceId, userId),
    assignTask: (workspaceId: string, taskData: any): Promise<any> =>
      ipcRenderer.invoke('team-workspace:assign-task', workspaceId, taskData),
    updateProgress: (taskId: string, progressData: any): Promise<any> =>
      ipcRenderer.invoke('team-workspace:update-progress', taskId, progressData),
    addComment: (taskId: string, comment: string, userId: string): Promise<any> =>
      ipcRenderer.invoke('team-workspace:add-comment', taskId, comment, userId),
    getComments: (taskId: string): Promise<any[]> =>
      ipcRenderer.invoke('team-workspace:get-comments', taskId),
    lockFile: (workspaceId: string, filePath: string, userId: string): Promise<any> =>
      ipcRenderer.invoke('team-workspace:lock-file', workspaceId, filePath, userId),
  },

  // Platform 13: Mining Pipeline API
  miningPipeline: {
    executePipeline: (sources: any[]): Promise<any> =>
      ipcRenderer.invoke('mining:execute-pipeline', sources),
    parseESP: (filePath: string): Promise<any> =>
      ipcRenderer.invoke('mining:parse-esp', filePath),
    buildDependencyGraph: (espData: any): Promise<any> =>
      ipcRenderer.invoke('mining:build-dependency-graph', espData),
    extractForms: (espDataId: string): Promise<any> =>
      ipcRenderer.invoke('mining:extract-forms', espDataId),
    analyzeConflicts: (espDataIds: string[]): Promise<any> =>
      ipcRenderer.invoke('mining:analyze-conflicts', espDataIds),
    generateReport: (pipelineId: string): Promise<any> =>
      ipcRenderer.invoke('mining:generate-report', pipelineId),
    validateMaster: (masterPath: string, dependencyPaths: string[]): Promise<any> =>
      ipcRenderer.invoke('mining:validate-master', masterPath, dependencyPaths),
    scanAssetReferences: (espDataId: string): Promise<any> =>
      ipcRenderer.invoke('mining:scan-asset-references', espDataId),
    cacheMiningData: (dataId: string, data: any): Promise<any> =>
      ipcRenderer.invoke('mining:cache-mining-data', dataId, data),
    getCachedData: (cacheKey: string): Promise<any> =>
      ipcRenderer.invoke('mining:get-cached-data', cacheKey),
  },

  // Platform 14: Testing Suite API
  testingSuite: {
    createTestSuite: (suiteName: string, config?: any): Promise<any> =>
      ipcRenderer.invoke('testing:create-test-suite', suiteName, config),
    runAllTests: (suiteId: string): Promise<any> =>
      ipcRenderer.invoke('testing:run-all-tests', suiteId),
    runSingleTest: (suiteId: string, testId: string): Promise<any> =>
      ipcRenderer.invoke('testing:run-single-test', suiteId, testId),
    testLoadOrder: (loadOrderPath: string): Promise<any> =>
      ipcRenderer.invoke('testing:test-load-order', loadOrderPath),
    testScriptCompilation: (scriptPath: string): Promise<any> =>
      ipcRenderer.invoke('testing:test-script-compilation', scriptPath),
    testAssetIntegrity: (assetPath: string): Promise<any> =>
      ipcRenderer.invoke('testing:test-asset-integrity', assetPath),
    benchmarkPerformance: (profileName?: string): Promise<any> =>
      ipcRenderer.invoke('testing:benchmark-performance', profileName),
    generateTestReport: (resultId: string): Promise<any> =>
      ipcRenderer.invoke('testing:generate-test-report', resultId),
    getTestHistory: (suiteId: string, limit?: number): Promise<any> =>
      ipcRenderer.invoke('testing:get-test-history', suiteId, limit),
    saveTestResults: (testData: any): Promise<any> =>
      ipcRenderer.invoke('testing:save-test-results', testData),
  },

  // Platform 15: Advanced Workflow Automation API
  workflowAutomation: {
    createWorkflow: (workflowName: string, description?: string, tags?: string[]): Promise<any> =>
      ipcRenderer.invoke('workflow:create-workflow', workflowName, description, tags),
    saveWorkflow: (workflowId: string, updates: any): Promise<any> =>
      ipcRenderer.invoke('workflow:save-workflow', workflowId, updates),
    loadWorkflow: (workflowId: string): Promise<any> =>
      ipcRenderer.invoke('workflow:load-workflow', workflowId),
    deleteWorkflow: (workflowId: string): Promise<any> =>
      ipcRenderer.invoke('workflow:delete-workflow', workflowId),
    runWorkflow: (workflowId: string): Promise<any> =>
      ipcRenderer.invoke('workflow:run-workflow', workflowId),
    getWorkflows: (): Promise<any> =>
      ipcRenderer.invoke('workflow:get-workflows'),
    exportWorkflow: (workflowId: string): Promise<any> =>
      ipcRenderer.invoke('workflow:export-workflow', workflowId),
    importWorkflow: (importJson: string): Promise<any> =>
      ipcRenderer.invoke('workflow:import-workflow', importJson),
    getWorkflowHistory: (workflowId?: string, limit?: number): Promise<any> =>
      ipcRenderer.invoke('workflow:get-workflow-history', workflowId, limit),
    validateWorkflow: (workflowId: string): Promise<any> =>
      ipcRenderer.invoke('workflow:validate-workflow', workflowId),
  },

  // Platform 16: Advanced Analytics & Reporting API
  analyticsReporting: {
    trackEvent: (eventName: string, category?: string, properties?: Record<string, any>): Promise<any> =>
      ipcRenderer.invoke('analytics:track-event', eventName, category, properties),
    getMetricsSummary: (): Promise<any> =>
      ipcRenderer.invoke('analytics:get-metrics-summary'),
    getBuildStatistics: (): Promise<any> =>
      ipcRenderer.invoke('analytics:build-statistics'),
    getAssetUsageReport: (): Promise<any> =>
      ipcRenderer.invoke('analytics:asset-usage-report'),
    getPerformanceHistory: (): Promise<any> =>
      ipcRenderer.invoke('analytics:performance-history'),
    generateReport: (reportType?: string, timeRange?: any): Promise<any> =>
      ipcRenderer.invoke('analytics:generate-report', reportType, timeRange),
    getDashboardData: (): Promise<any> =>
      ipcRenderer.invoke('analytics:get-dashboard-data'),
    exportReport: (reportId: string, format?: string): Promise<any> =>
      ipcRenderer.invoke('analytics:export-report', reportId, format),
    getAnalyticsConfig: (): Promise<any> =>
      ipcRenderer.invoke('analytics:get-analytics-config'),
    updateAnalyticsConfig: (updates: any): Promise<any> =>
      ipcRenderer.invoke('analytics:update-analytics-config', updates),
    clearData: (): Promise<any> =>
      ipcRenderer.invoke('analytics:clear-data'),
  },

  getAnalyticsMetrics: async (): Promise<any> => {
    const response = await ipcRenderer.invoke('analytics:get-metrics-summary');
    if (response?.success === false) {
      throw new Error(response.error || 'Failed to get analytics metrics');
    }
    const summary = response?.summary || {};
    return {
      sessionDuration: (summary.timeSpent || 0) * 60 * 1000,
      featuresUsed: Array.isArray(summary.topFeatures) ? summary.topFeatures.map((item: any) => item.feature) : [],
      filesProcessed: summary.assetsCreated || 0,
      errorsEncountered: summary.errorsEncountered || 0,
      toolsLaunched: [],
    };
  },
  exportAnalyticsData: async (): Promise<string> => {
    const response = await ipcRenderer.invoke('analytics:get-dashboard-data');
    if (response?.success === false) {
      throw new Error(response.error || 'Failed to export analytics data');
    }
    return JSON.stringify(response?.dashboardData?.recentEvents || [], null, 2);
  },
  getAnalyticsConfig: async (): Promise<any> => {
    const response = await ipcRenderer.invoke('analytics:get-analytics-config');
    if (response?.success === false) {
      throw new Error(response.error || 'Failed to load analytics config');
    }
    return response?.config || response;
  },
  updateAnalyticsConfig: async (updates: any): Promise<any> => {
    const response = await ipcRenderer.invoke('analytics:update-analytics-config', updates);
    if (response?.success === false) {
      throw new Error(response.error || 'Failed to update analytics config');
    }
    return response?.config || response;
  },
  clearAnalyticsData: (): Promise<any> => ipcRenderer.invoke('analytics:clear-data'),

  // Platform 17: Git Integration API
  gitIntegration: {
    initRepo: (repoPath: string, repoName?: string): Promise<any> =>
      ipcRenderer.invoke('git:init-repo', repoPath, repoName),
    commit: (repoId: string, message: string, author?: string): Promise<any> =>
      ipcRenderer.invoke('git:commit', repoId, message, author),
    push: (repoId: string, remoteName?: string, branch?: string): Promise<any> =>
      ipcRenderer.invoke('git:push', repoId, remoteName, branch),
    pull: (repoId: string, remoteName?: string, branch?: string): Promise<any> =>
      ipcRenderer.invoke('git:pull', repoId, remoteName, branch),
    createBranch: (repoId: string, branchName: string, baseBranch?: string): Promise<any> =>
      ipcRenderer.invoke('git:create-branch', repoId, branchName, baseBranch),
    switchBranch: (repoId: string, branchName: string): Promise<any> =>
      ipcRenderer.invoke('git:switch-branch', repoId, branchName),
    getBranches: (repoId?: string): Promise<any> =>
      ipcRenderer.invoke('git:get-branches', repoId),
    getDiff: (repoId: string, fromCommit?: string, toCommit?: string): Promise<any> =>
      ipcRenderer.invoke('git:get-diff', repoId, fromCommit, toCommit),
    mergeBranch: (repoId: string, sourceBranch: string, targetBranch?: string): Promise<any> =>
      ipcRenderer.invoke('git:merge-branch', repoId, sourceBranch, targetBranch),
    getHistory: (repoId?: string, limit?: number): Promise<any> =>
      ipcRenderer.invoke('git:get-history', repoId, limit),
  },

  // Platform 18: Nexus Mods Auto-Uploader API
  nexusUploader: {
    initConfig: (apiKey?: string, apiUrl?: string): Promise<any> =>
      ipcRenderer.invoke('nexus:init-config', apiKey, apiUrl),
    authenticate: (apiKey: string): Promise<any> =>
      ipcRenderer.invoke('nexus:authenticate', apiKey),
    getGameInfo: (gameName?: string): Promise<any> =>
      ipcRenderer.invoke('nexus:get-game-info', gameName),
    createMod: (modName: string, description?: string, category?: string): Promise<any> =>
      ipcRenderer.invoke('nexus:create-mod', modName, description, category),
    updateMod: (modId: string, updates: any): Promise<any> =>
      ipcRenderer.invoke('nexus:update-mod', modId, updates),
    uploadFile: (modId: string, filePath: string, version?: string): Promise<any> =>
      ipcRenderer.invoke('nexus:upload-file', modId, filePath, version),
    publishMod: (modId: string, publishNow?: boolean): Promise<any> =>
      ipcRenderer.invoke('nexus:publish-mod', modId, publishNow),
    getUploadHistory: (modId?: string, limit?: number): Promise<any> =>
      ipcRenderer.invoke('nexus:get-upload-history', modId, limit),
    getModStats: (modId: string): Promise<any> =>
      ipcRenderer.invoke('nexus:get-mod-stats', modId),
    generateChangelog: (modId: string, fromVersion?: string, toVersion?: string): Promise<any> =>
      ipcRenderer.invoke('nexus:generate-changelog', modId, fromVersion, toVersion),
  },

  // Platform 19: Interactive Tutorial System API
  interactiveTutorials: {
    createSession: (tutorialId: string, title?: string): Promise<any> =>
      ipcRenderer.invoke('tutorial:create-session', tutorialId, title),
    getProgress: (sessionId: string): Promise<any> =>
      ipcRenderer.invoke('tutorial:get-progress', sessionId),
    completeStep: (sessionId: string, stepNumber: number): Promise<any> =>
      ipcRenderer.invoke('tutorial:complete-step', sessionId, stepNumber),
    getTutorials: (): Promise<any> =>
      ipcRenderer.invoke('tutorial:get-tutorials'),
    getTutorialContent: (tutorialId: string): Promise<any> =>
      ipcRenderer.invoke('tutorial:get-tutorial-content', tutorialId),
    skipTutorial: (sessionId: string): Promise<any> =>
      ipcRenderer.invoke('tutorial:skip-tutorial', sessionId),
    getRecommendations: (userLevel?: string): Promise<any> =>
      ipcRenderer.invoke('tutorial:get-recommendations', userLevel),
    saveProgress: (sessionId: string): Promise<any> =>
      ipcRenderer.invoke('tutorial:save-progress', sessionId),
    resetProgress: (sessionId?: string): Promise<any> =>
      ipcRenderer.invoke('tutorial:reset-progress', sessionId),
    getTutorialStats: (tutorialId?: string): Promise<any> =>
      ipcRenderer.invoke('tutorial:get-tutorial-stats', tutorialId),
  },

aiTextureEnhancer: {
      initEnhancer: (filterName?: string, gpuEnabled?: boolean): Promise<any> =>
        ipcRenderer.invoke('enhance:init-enhancer', filterName, gpuEnabled),
      loadFilters: (): Promise<any> =>
        ipcRenderer.invoke('enhance:load-filters'),
      getFilterInfo: (filterId: string): Promise<any> =>
        ipcRenderer.invoke('enhance:get-filter-info', filterId),
      startEnhance: (inputPath: string, outputPath?: string, filterId?: string): Promise<any> =>
        ipcRenderer.invoke('enhance:start-enhance', inputPath, outputPath, filterId),
      enhanceBatch: (inputPaths: string[], filterId?: string): Promise<any> =>
        ipcRenderer.invoke('enhance:enhance-batch', inputPaths, filterId),
      getEnhancementProgress: (sessionId: string): Promise<any> =>
        ipcRenderer.invoke('enhance:get-enhancement-progress', sessionId),
      cancelEnhancement: (sessionId: string): Promise<any> =>
        ipcRenderer.invoke('enhance:cancel-enhancement', sessionId),
      getEnhancementHistory: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('enhance:get-enhancement-history', limit),
      compareEnhancements: (beforePath: string, afterPath: string): Promise<any> =>
        ipcRenderer.invoke('enhance:compare-enhancements', beforePath, afterPath),
      exportEnhanced: (sessionId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('enhance:export-enhanced', sessionId, format),
  },
    aiVoiceGeneration: {
      initTts: (voiceProfile?: string, gpuEnabled?: boolean): Promise<any> =>
        ipcRenderer.invoke('voice:init-tts', voiceProfile, gpuEnabled),
      loadVoiceProfiles: (): Promise<any> =>
        ipcRenderer.invoke('voice:load-voice-profiles'),
      getVoiceProfileInfo: (profileId: string): Promise<any> =>
        ipcRenderer.invoke('voice:get-voice-profile-info', profileId),
      generateVoice: (text: string, profileId?: string, emotion?: string): Promise<any> =>
        ipcRenderer.invoke('voice:generate-voice', text, profileId, emotion),
      generateBatchDialogue: (dialogueList: Array<{text: string, profileId?: string}>): Promise<any> =>
        ipcRenderer.invoke('voice:generate-batch-dialogue', dialogueList),
      getGenerationProgress: (sessionId: string): Promise<any> =>
        ipcRenderer.invoke('voice:get-generation-progress', sessionId),
      cloneVoiceProfile: (audioSamplePath: string, profileName: string): Promise<any> =>
        ipcRenderer.invoke('voice:clone-voice-profile', audioSamplePath, profileName),
      generateLipsync: (sessionId: string, animationFormat?: string): Promise<any> =>
        ipcRenderer.invoke('voice:generate-lipsync', sessionId, animationFormat),
      getVoiceHistory: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('voice:get-voice-history', limit),
      exportVoiceAudio: (sessionId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('voice:export-voice-audio', sessionId, format),
    },
    modDependencyManager: {
      addModDependency: (modName: string, dependencies: Array<{name: string, version?: string}>): Promise<any> =>
        ipcRenderer.invoke('deps:add-mod-dependency', modName, dependencies),
      getModDependencies: (modName: string): Promise<any> =>
        ipcRenderer.invoke('deps:get-mod-dependencies', modName),
      detectConflicts: (): Promise<any> =>
        ipcRenderer.invoke('deps:detect-conflicts'),
      resolveConflict: (conflictId: string, resolution: string): Promise<any> =>
        ipcRenderer.invoke('deps:resolve-conflict', conflictId, resolution),
      getConflictReport: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('deps:get-conflict-report', limit),
      optimizeLoadOrder: (modList: string[]): Promise<any> =>
        ipcRenderer.invoke('deps:optimize-load-order', modList),
      validateDependencies: (modName: string): Promise<any> =>
        ipcRenderer.invoke('deps:validate-dependencies', modName),
      exportDependencyList: (format?: string): Promise<any> =>
        ipcRenderer.invoke('deps:export-dependency-list', format),
      importDependencyList: (importPath: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('deps:import-dependency-list', importPath, format),
      getDependencyStats: (): Promise<any> =>
        ipcRenderer.invoke('deps:get-dependency-stats'),
    },
    releaseAutomation: {
      createReleasePackage: (modName: string, version: string, files: string[]): Promise<any> =>
        ipcRenderer.invoke('release:create-release-package', modName, version, files),
      generateChangelog: (modName: string, version: string, changes: string[]): Promise<any> =>
        ipcRenderer.invoke('release:generate-changelog', modName, version, changes),
      bumpVersion: (modName: string, currentVersion: string, bumpType?: string): Promise<any> =>
        ipcRenderer.invoke('release:bump-version', modName, currentVersion, bumpType),
      createReleaseNotes: (modName: string, version: string, changelog: string, highlights?: string[]): Promise<any> =>
        ipcRenderer.invoke('release:create-release-notes', modName, version, changelog, highlights),
      validateRelease: (packageId: string): Promise<any> =>
        ipcRenderer.invoke('release:validate-release', packageId),
      publishToNexus: (packageId: string, nexusModId: string, releaseNotes?: string): Promise<any> =>
        ipcRenderer.invoke('release:publish-to-nexus', packageId, nexusModId, releaseNotes),
      getReleaseHistory: (modName: string, limit?: number): Promise<any> =>
        ipcRenderer.invoke('release:get-release-history', modName, limit),
      manageReleaseTags: (packageId: string, tags: string[], action?: string): Promise<any> =>
        ipcRenderer.invoke('release:manage-release-tags', packageId, tags, action),
      exportRelease: (packageId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('release:export-release', packageId, format),
      scheduleRelease: (packageId: string, releaseDate: number, timezone?: string): Promise<any> =>
        ipcRenderer.invoke('release:schedule-release', packageId, releaseDate, timezone),
    },
    assetIntegrityAuditor: {
      scanNifMesh: (filePath: string, modName?: string): Promise<any> =>
        ipcRenderer.invoke('audit:scan-nif-mesh', filePath, modName),
      scanDdsTexture: (filePath: string, modName?: string): Promise<any> =>
        ipcRenderer.invoke('audit:scan-dds-texture', filePath, modName),
      scanEspPlugin: (filePath: string, modName?: string): Promise<any> =>
        ipcRenderer.invoke('audit:scan-esp-plugin', filePath, modName),
      validatePapyrusScripts: (scriptContent: string, modName?: string): Promise<any> =>
        ipcRenderer.invoke('audit:validate-papyrus-scripts', scriptContent, modName),
      checkAudioCompatibility: (filePath: string, modName?: string): Promise<any> =>
        ipcRenderer.invoke('audit:check-audio-compatibility', filePath, modName),
      generateReport: (modName: string, auditIds: string[]): Promise<any> =>
        ipcRenderer.invoke('audit:generate-report', modName, auditIds),
      getAuditHistory: (modName: string, limit?: number): Promise<any> =>
        ipcRenderer.invoke('audit:get-audit-history', modName, limit),
      exportAuditData: (reportId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('audit:export-audit-data', reportId, format),
      compareVersions: (modName: string, version1Id: string, version2Id: string): Promise<any> =>
        ipcRenderer.invoke('audit:compare-versions', modName, version1Id, version2Id),
      batchScanAssets: (modName: string, assetPaths: string[], assetTypes?: string[]): Promise<any> =>
        ipcRenderer.invoke('audit:batch-scan-assets', modName, assetPaths, assetTypes),
    },
    scriptingAssistant: {
      getTemplate: (templateType: string): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:get-template', templateType),
      generateStub: (functionName: string, parameters?: any[], returnType?: string): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:generate-stub', functionName, parameters, returnType),
      validateSyntax: (scriptContent: string): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:validate-syntax', scriptContent),
      getSnippets: (category?: string): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:get-snippets', category),
      generateEventHandlers: (scriptType: string, events?: string[]): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:generate-event-handlers', scriptType, events),
      formatScript: (scriptContent: string): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:format-script', scriptContent),
      getDocumentation: (functionName: string, category?: string): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:get-documentation', functionName, category),
      generateFromSpec: (specification: string, scriptType?: string): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:generate-from-spec', specification, scriptType),
      optimizeScript: (scriptContent: string): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:optimize-script', scriptContent),
      testInSandbox: (scriptContent: string, testParams?: any): Promise<any> =>
        ipcRenderer.invoke('codeGenerator:test-in-sandbox', scriptContent, testParams),
    },
    performanceProfiler: {
      startMonitoring: (sessionName?: string): Promise<any> =>
        ipcRenderer.invoke('perf:start-monitoring', sessionName),
      getFpsMetrics: (sessionId: string): Promise<any> =>
        ipcRenderer.invoke('perf:get-fps-metrics', sessionId),
      analyzeMemory: (sessionId: string, threshold?: number): Promise<any> =>
        ipcRenderer.invoke('perf:analyze-memory', sessionId, threshold),
      measureLoadTime: (modPath: string): Promise<any> =>
        ipcRenderer.invoke('perf:measure-load-time', modPath),
      detectBottlenecks: (sessionId: string): Promise<any> =>
        ipcRenderer.invoke('perf:detect-bottlenecks', sessionId),
      suggestOptimizations: (sessionId: string): Promise<any> =>
        ipcRenderer.invoke('perf:suggest-optimizations', sessionId),
      compareSessions: (session1Id: string, session2Id: string): Promise<any> =>
        ipcRenderer.invoke('perf:compare-sessions', session1Id, session2Id),
      exportReport: (sessionId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('perf:export-report', sessionId, format),
      stopMonitoring: (sessionId: string): Promise<any> =>
        ipcRenderer.invoke('perf:stop-monitoring', sessionId),
      getSessionHistory: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('perf:get-session-history', limit),
    },
    modlistManager: {
      createModlist: (listName: string, description?: string): Promise<any> =>
        ipcRenderer.invoke('modlist:create-modlist', listName, description),
      addModToList: (modlistId: string, modEntry: any): Promise<any> =>
        ipcRenderer.invoke('modlist:add-mod-to-list', modlistId, modEntry),
      removeModFromList: (modlistId: string, modId: string): Promise<any> =>
        ipcRenderer.invoke('modlist:remove-mod-from-list', modlistId, modId),
      getModlist: (modlistId: string): Promise<any> =>
        ipcRenderer.invoke('modlist:get-modlist', modlistId),
      exportModlist: (modlistId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('modlist:export-modlist', modlistId, format),
      importModlist: (importPath: string, listName?: string): Promise<any> =>
        ipcRenderer.invoke('modlist:import-modlist', importPath, listName),
      validateModlist: (modlistId: string): Promise<any> =>
        ipcRenderer.invoke('modlist:validate-modlist', modlistId),
      getModlistStats: (modlistId: string): Promise<any> =>
        ipcRenderer.invoke('modlist:get-modlist-stats', modlistId),
      shareModlist: (modlistId: string, platform?: string): Promise<any> =>
        ipcRenderer.invoke('modlist:share-modlist', modlistId, platform),
      compareModlists: (modlist1Id: string, modlist2Id: string): Promise<any> =>
        ipcRenderer.invoke('modlist:compare-modlists', modlist1Id, modlist2Id),
    },
    conflictResolutionEngine: {
      scanForConflicts: (modlistId: string): Promise<any> =>
        ipcRenderer.invoke('conflict:scan-for-conflicts', modlistId),
      detectPluginConflicts: (modlistId: string): Promise<any> =>
        ipcRenderer.invoke('conflict:detect-plugin-conflicts', modlistId),
      detectAssetConflicts: (modlistId: string): Promise<any> =>
        ipcRenderer.invoke('conflict:detect-asset-conflicts', modlistId),
      detectScriptConflicts: (modlistId: string): Promise<any> =>
        ipcRenderer.invoke('conflict:detect-script-conflicts', modlistId),
      suggestConflictResolution: (conflictId: string): Promise<any> =>
        ipcRenderer.invoke('conflict:suggest-conflict-resolution', conflictId),
      autoResolveConflicts: (conflictId: string, strategy?: string): Promise<any> =>
        ipcRenderer.invoke('conflict:auto-resolve-conflicts', conflictId, strategy),
      generatePatch: (conflictId: string, patchType?: string): Promise<any> =>
        ipcRenderer.invoke('conflict:generate-patch', conflictId, patchType),
      validateResolution: (resolutionId: string): Promise<any> =>
        ipcRenderer.invoke('conflict:validate-resolution', resolutionId),
      getConflictReport: (scanId: string): Promise<any> =>
        ipcRenderer.invoke('conflict:get-conflict-report', scanId),
      exportConflictData: (scanId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('conflict:export-conflict-data', scanId, format),
    },

    advancedTroubleshooting: {
      analyzeCrashLog: (logPath: string): Promise<any> =>
        ipcRenderer.invoke('diag:analyze-crash-log', logPath),
      diagnoseCTDIssues: (modlistId: string): Promise<any> =>
        ipcRenderer.invoke('diag:diagnose-ctd-issues', modlistId),
      checkModCompatibility: (mod1: string, mod2: string): Promise<any> =>
        ipcRenderer.invoke('diag:check-mod-compatibility', mod1, mod2),
      generateDiagnosticsReport: (modlistId: string): Promise<any> =>
        ipcRenderer.invoke('diag:generate-diagnostics-report', modlistId),
      suggestTroubleshootingSteps: (issue: string): Promise<any> =>
        ipcRenderer.invoke('diag:suggest-troubleshooting-steps', issue),
      testGameStability: (modlistId: string, duration?: number): Promise<any> =>
        ipcRenderer.invoke('diag:test-game-stability', modlistId, duration),
      debugScriptErrors: (scriptContent: string, modName?: string): Promise<any> =>
        ipcRenderer.invoke('diag:debug-script-errors', scriptContent, modName),
      analyzeLoadOrderIssues: (loadOrder: string[]): Promise<any> =>
        ipcRenderer.invoke('diag:analyze-load-order-issues', loadOrder),
      runSystemDiagnostics: (): Promise<any> =>
        ipcRenderer.invoke('diag:run-system-diagnostics'),
      generateTroubleshootingGuide: (issue: string, modlistId?: string): Promise<any> =>
        ipcRenderer.invoke('diag:generate-troubleshooting-guide', issue, modlistId),
    },

    loadOrderOptimizer: {
      analyzeLoadOrder: (loadOrder: string[]): Promise<any> =>
        ipcRenderer.invoke('loadorder:analyze-load-order', loadOrder),
      suggestOptimalOrder: (loadOrder: string[], conflictMap?: any): Promise<any> =>
        ipcRenderer.invoke('loadorder:suggest-optimal-order', loadOrder, conflictMap),
      detectMasterDependencies: (pluginName: string): Promise<any> =>
        ipcRenderer.invoke('loadorder:detect-master-dependencies', pluginName),
      prioritizePlugins: (loadOrder: string[], priorityMap?: any): Promise<any> =>
        ipcRenderer.invoke('loadorder:prioritize-plugins', loadOrder, priorityMap),
      validateLoadOrderIntegrity: (loadOrder: string[]): Promise<any> =>
        ipcRenderer.invoke('loadorder:validate-load-order-integrity', loadOrder),
      compareLoadOrders: (loadOrder1: string[], loadOrder2: string[]): Promise<any> =>
        ipcRenderer.invoke('loadorder:compare-load-orders', loadOrder1, loadOrder2),
      exportLoadOrder: (loadOrder: string[], format?: string): Promise<any> =>
        ipcRenderer.invoke('loadorder:export-load-order', loadOrder, format),
      importLoadOrder: (filePath: string, mergeMode?: string): Promise<any> =>
        ipcRenderer.invoke('loadorder:import-load-order', filePath, mergeMode),
      autoOptimizeLoadOrder: (loadOrder: string[], strategy?: string): Promise<any> =>
        ipcRenderer.invoke('loadorder:auto-optimize-load-order', loadOrder, strategy),
      getLoadOrderStatistics: (loadOrder: string[]): Promise<any> =>
        ipcRenderer.invoke('loadorder:get-load-order-statistics', loadOrder),
    },

    papyrusCompiler: {
      compileScript: (scriptPath: string, flags?: string): Promise<any> =>
        ipcRenderer.invoke('papyrus:compile-script', scriptPath, flags),
      batchCompile: (scriptFolder: string, flags?: string): Promise<any> =>
        ipcRenderer.invoke('papyrus:batch-compile', scriptFolder, flags),
      validateSyntax: (scriptContent: string): Promise<any> =>
        ipcRenderer.invoke('papyrus:validate-syntax', scriptContent),
      generateDebugInfo: (scriptPath: string): Promise<any> =>
        ipcRenderer.invoke('papyrus:generate-debug-info', scriptPath),
      profileScriptPerformance: (scriptPath: string): Promise<any> =>
        ipcRenderer.invoke('papyrus:profile-script-performance', scriptPath),
      detectScriptIssues: (scriptContent: string): Promise<any> =>
        ipcRenderer.invoke('papyrus:detect-script-issues', scriptContent),
      getCompilerVersion: (): Promise<any> =>
        ipcRenderer.invoke('papyrus:get-compiler-version'),
      configureCompiler: (config: any): Promise<any> =>
        ipcRenderer.invoke('papyrus:configure-compiler', config),
      analyzeCompilationReport: (reportPath: string): Promise<any> =>
        ipcRenderer.invoke('papyrus:analyze-compilation-report', reportPath),
      exportCompilationStats: (format?: string): Promise<any> =>
        ipcRenderer.invoke('papyrus:export-compilation-stats', format),
    },

    archiveManager: {
      createArchive: (archivePath: string, fileList: string[], archiveType?: string): Promise<any> =>
        ipcRenderer.invoke('archive:create-archive', archivePath, fileList, archiveType),
      extractArchive: (archivePath: string, extractPath?: string): Promise<any> =>
        ipcRenderer.invoke('archive:extract-archive', archivePath, extractPath),
      listArchiveContents: (archivePath: string): Promise<any> =>
        ipcRenderer.invoke('archive:list-archive-contents', archivePath),
      validateArchiveIntegrity: (archivePath: string): Promise<any> =>
        ipcRenderer.invoke('archive:validate-archive-integrity', archivePath),
      addFilesToArchive: (archivePath: string, filePaths: string[]): Promise<any> =>
        ipcRenderer.invoke('archive:add-files-to-archive', archivePath, filePaths),
      removeFilesFromArchive: (archivePath: string, fileNames: string[]): Promise<any> =>
        ipcRenderer.invoke('archive:remove-files-from-archive', archivePath, fileNames),
      convertArchiveFormat: (archivePath: string, targetFormat: string): Promise<any> =>
        ipcRenderer.invoke('archive:convert-archive-format', archivePath, targetFormat),
      compressArchive: (archivePath: string, compressionLevel?: number): Promise<any> =>
        ipcRenderer.invoke('archive:compress-archive', archivePath, compressionLevel),
      getArchiveStatistics: (archivePath: string): Promise<any> =>
        ipcRenderer.invoke('archive:get-archive-statistics', archivePath),
      optimizeArchive: (archivePath: string, strategy?: string): Promise<any> =>
        ipcRenderer.invoke('archive:optimize-archive', archivePath, strategy),
    },

    enbPresetManager: {
      createPreset: (presetName: string, settings: any): Promise<any> =>
        ipcRenderer.invoke('enb:create-preset', presetName, settings),
      loadPreset: (presetId: string): Promise<any> =>
        ipcRenderer.invoke('enb:load-preset', presetId),
      exportPreset: (presetId: string, exportPath?: string): Promise<any> =>
        ipcRenderer.invoke('enb:export-preset', presetId, exportPath),
      importPreset: (filePath: string, presetName?: string): Promise<any> =>
        ipcRenderer.invoke('enb:import-preset', filePath, presetName),
      validatePreset: (presetId: string): Promise<any> =>
        ipcRenderer.invoke('enb:validate-preset', presetId),
      applyPresetSettings: (presetId: string): Promise<any> =>
        ipcRenderer.invoke('enb:apply-preset-settings', presetId),
      comparePresets: (presetId1: string, presetId2: string): Promise<any> =>
        ipcRenderer.invoke('enb:compare-presets', presetId1, presetId2),
      deletePreset: (presetId: string): Promise<any> =>
        ipcRenderer.invoke('enb:delete-preset', presetId),
      optimizePresetPerformance: (presetId: string): Promise<any> =>
        ipcRenderer.invoke('enb:optimize-preset-performance', presetId),
      getInstalledPresets: (): Promise<any> =>
        ipcRenderer.invoke('enb:get-installed-presets'),
    },

    communityRatings: {
      fetchModRatings: (modId: string): Promise<any> =>
        ipcRenderer.invoke('community:fetch-mod-ratings', modId),
      getReviewsForMod: (modId: string, limit?: number): Promise<any> =>
        ipcRenderer.invoke('community:get-reviews-for-mod', modId, limit),
      submitRating: (modId: string, rating: number, userId?: string): Promise<any> =>
        ipcRenderer.invoke('community:submit-rating', modId, rating, userId),
      submitReview: (modId: string, reviewText: string, rating?: number): Promise<any> =>
        ipcRenderer.invoke('community:submit-review', modId, reviewText, rating),
      getTrendingMods: (limit?: number, category?: string): Promise<any> =>
        ipcRenderer.invoke('community:get-trending-mods', limit, category),
      analyzeRatingTrends: (modId: string, timeframe?: string): Promise<any> =>
        ipcRenderer.invoke('community:analyze-rating-trends', modId, timeframe),
      filterReviewsByCriteria: (modId: string, criteria: any): Promise<any> =>
        ipcRenderer.invoke('community:filter-reviews-by-criteria', modId, criteria),
      getPopularEndorsements: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('community:get-popular-endorsements', limit),
      compareModRatings: (modId1: string, modId2: string): Promise<any> =>
        ipcRenderer.invoke('community:compare-mod-ratings', modId1, modId2),
      exportRatingData: (modId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('community:export-rating-data', modId, format),
    },

    meshOptimizer: {
      analyzeNifFile: (filePath: string): Promise<any> =>
        ipcRenderer.invoke('mesh:analyze-nif-file', filePath),
      reducePolygonCount: (filePath: string, reductionPercentage?: number): Promise<any> =>
        ipcRenderer.invoke('mesh:reduce-polygon-count', filePath, reductionPercentage),
      optimizeVertexData: (filePath: string, options?: any): Promise<any> =>
        ipcRenderer.invoke('mesh:optimize-vertex-data', filePath, options),
      generateLodMeshes: (filePath: string, lodLevels?: number): Promise<any> =>
        ipcRenderer.invoke('mesh:generate-lod-meshes', filePath, lodLevels),
      removeUnusedData: (filePath: string): Promise<any> =>
        ipcRenderer.invoke('mesh:remove-unused-data', filePath),
      batchOptimizeMeshes: (filePaths: string[], options?: any): Promise<any> =>
        ipcRenderer.invoke('mesh:batch-optimize-meshes', filePaths, options),
      compareOptimizationResults: (beforePath: string, afterPath: string): Promise<any> =>
        ipcRenderer.invoke('mesh:compare-optimization-results', beforePath, afterPath),
      validateMeshIntegrity: (filePath: string): Promise<any> =>
        ipcRenderer.invoke('mesh:validate-mesh-integrity', filePath),
      exportOptimizationReport: (filePath: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('mesh:export-optimization-report', filePath, format),
      getAnalysisSummary: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('mesh:get-analysis-summary', limit),
    },

    animationRetargeting: {
      importAnimationFile: (filePath: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('animation:import-animation-file', filePath, format),
      retargetSkeleton: (animationId: string, targetSkeleton: string): Promise<any> =>
        ipcRenderer.invoke('animation:retarget-skeleton', animationId, targetSkeleton),
      validateBoneStructure: (filePath: string): Promise<any> =>
        ipcRenderer.invoke('animation:validate-bone-structure', filePath),
      blendAnimations: (animationIds: string[], blendMode?: string): Promise<any> =>
        ipcRenderer.invoke('animation:blend-animations', animationIds, blendMode),
      createCustomAnimation: (name: string, frameCount: number, boneData?: any): Promise<any> =>
        ipcRenderer.invoke('animation:create-custom-animation', name, frameCount, boneData),
      exportAnimation: (animationId: string, outputPath: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('animation:export-animation', animationId, outputPath, format),
      batchRetargetAnimations: (animationIds: string[], targetSkeleton: string): Promise<any> =>
        ipcRenderer.invoke('animation:batch-retarget-animations', animationIds, targetSkeleton),
      compareAnimations: (animationId1: string, animationId2: string): Promise<any> =>
        ipcRenderer.invoke('animation:compare-animations', animationId1, animationId2),
      getRetargetingSummary: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('animation:get-retargeting-summary', limit),
      optimizeKeyframes: (animationId: string, tolerance?: number): Promise<any> =>
        ipcRenderer.invoke('animation:optimize-keyframes', animationId, tolerance),
    },

    dialogueManager: {
      createDialogueTree: (npcId: string, dialogueName: string): Promise<any> =>
        ipcRenderer.invoke('dialogue:create-dialogue-tree', npcId, dialogueName),
      addDialogueNode: (treeId: string, nodeData: any): Promise<any> =>
        ipcRenderer.invoke('dialogue:add-dialogue-node', treeId, nodeData),
      addVoiceLine: (nodeId: string, voicePath: string, voiceActor?: string): Promise<any> =>
        ipcRenderer.invoke('dialogue:add-voice-line', nodeId, voicePath, voiceActor),
      setDialogueConditions: (nodeId: string, conditions: any[]): Promise<any> =>
        ipcRenderer.invoke('dialogue:set-dialogue-conditions', nodeId, conditions),
      exportDialogueTree: (treeId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('dialogue:export-dialogue-tree', treeId, format),
      importDialogueFile: (filePath: string, npcId?: string): Promise<any> =>
        ipcRenderer.invoke('dialogue:import-dialogue-file', filePath, npcId),
      validateDialogueTree: (treeId: string): Promise<any> =>
        ipcRenderer.invoke('dialogue:validate-dialogue-tree', treeId),
      batchImportDialogues: (filePaths: string[]): Promise<any> =>
        ipcRenderer.invoke('dialogue:batch-import-dialogues', filePaths),
      getDialogueSystemStats: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('dialogue:get-dialogue-system-stats', limit),
      compareDialogueTrees: (treeId1: string, treeId2: string): Promise<any> =>
        ipcRenderer.invoke('dialogue:compare-dialogue-trees', treeId1, treeId2),
    },

    textureManager: {
      createMaterialDefinition: (materialName: string, properties?: any): Promise<any> =>
        ipcRenderer.invoke('texture:create-material-definition', materialName, properties),
      createTextureAtlas: (atlasName: string, textureList: string[]): Promise<any> =>
        ipcRenderer.invoke('texture:create-texture-atlas', atlasName, textureList),
      applyMaterialProperties: (materialId: string, properties: any): Promise<any> =>
        ipcRenderer.invoke('texture:apply-material-properties', materialId, properties),
      manageTextureReplacements: (sourceTexture: string, replacementTexture: string): Promise<any> =>
        ipcRenderer.invoke('texture:manage-texture-replacements', sourceTexture, replacementTexture),
      validateMaterialCompatibility: (materialId: string, targetEngine?: string): Promise<any> =>
        ipcRenderer.invoke('texture:validate-material-compatibility', materialId, targetEngine),
      optimizeMaterialPerformance: (materialId: string, targetMemory?: number): Promise<any> =>
        ipcRenderer.invoke('texture:optimize-material-performance', materialId, targetMemory),
      batchProcessMaterials: (materialIds: string[], operation: string): Promise<any> =>
        ipcRenderer.invoke('texture:batch-process-materials', materialIds, operation),
      exportMaterialPackage: (materialId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('texture:export-material-package', materialId, format),
      getMaterialStatistics: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('texture:get-material-statistics', limit),
      importMaterialPackage: (filePath: string, materialName?: string): Promise<any> =>
        ipcRenderer.invoke('texture:import-material-package', filePath, materialName),
    },

    pluginAnalyzer: {
      analyzePluginFile: (filePath: string): Promise<any> =>
        ipcRenderer.invoke('plugin:analyze-plugin-file', filePath),
      validatePluginReferences: (pluginPath: string): Promise<any> =>
        ipcRenderer.invoke('plugin:validate-plugin-references', pluginPath),
      mergePlugins: (pluginPaths: string[], outputPath: string): Promise<any> =>
        ipcRenderer.invoke('plugin:merge-plugins', pluginPaths, outputPath),
      analyzePluginDependencies: (pluginPath: string): Promise<any> =>
        ipcRenderer.invoke('plugin:analyze-plugin-dependencies', pluginPath),
      detectPluginConflicts: (pluginPaths: string[]): Promise<any> =>
        ipcRenderer.invoke('plugin:detect-plugin-conflicts', pluginPaths),
      optimizePluginLoadOrder: (pluginPaths: string[]): Promise<any> =>
        ipcRenderer.invoke('plugin:optimize-plugin-load-order', pluginPaths),
      generateCompatibilityReport: (pluginPaths: string[], format?: string): Promise<any> =>
        ipcRenderer.invoke('plugin:generate-compatibility-report', pluginPaths, format),
      batchValidatePlugins: (filePaths: string[]): Promise<any> =>
        ipcRenderer.invoke('plugin:batch-validate-plugins', filePaths),
      getPluginManagementStats: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('plugin:get-plugin-management-stats', limit),
      exportPluginAnalysis: (analysisId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('plugin:export-plugin-analysis', analysisId, format),
    },

    scriptGenerator: {
      generatePapyrusScript: (scriptName: string, scriptType?: string): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:generate-papyrus-script', scriptName, scriptType),
      createEventHandler: (eventName: string, parameters?: string[]): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:create-event-handler', eventName, parameters),
      generatePropertyDefinition: (propertyName: string, propertyType?: string): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:generate-property-definition', propertyName, propertyType),
      createValidationHelper: (helperName: string, validationType?: string): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:create-validation-helper', helperName, validationType),
      generateOptimizationPattern: (patternName: string, optimizationType?: string): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:generate-optimization-pattern', patternName, optimizationType),
      generateDocumentation: (scriptId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:generate-documentation', scriptId, format),
      batchGenerateScripts: (scriptConfigs: any[]): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:batch-generate-scripts', scriptConfigs),
      validatePapyrusSyntax: (code: string): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:validate-papyrus-syntax', code),
      applyTypeSafetyPatterns: (scriptId: string): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:apply-type-safety-patterns', scriptId),
      getGeneratorStatistics: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('papyrusGen:get-generator-statistics', limit),
    },

    formManager: {
      createFormReference: (formId: string, formData?: any): Promise<any> =>
        ipcRenderer.invoke('form:create-form-reference', formId, formData),
      getFormProperties: (referenceId: string): Promise<any> =>
        ipcRenderer.invoke('form:get-form-properties', referenceId),
      updateEntityState: (entityId: string, stateData: any): Promise<any> =>
        ipcRenderer.invoke('form:update-entity-state', entityId, stateData),
      registerEventListener: (referenceId: string, eventType: string): Promise<any> =>
        ipcRenderer.invoke('form:register-event-listener', referenceId, eventType),
      serializeReference: (referenceId: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('form:serialize-reference', referenceId, format),
      validateReferenceIntegrity: (referenceId: string): Promise<any> =>
        ipcRenderer.invoke('form:validate-reference-integrity', referenceId),
      batchUpdateReferences: (referenceUpdates: any[]): Promise<any> =>
        ipcRenderer.invoke('form:batch-update-references', referenceUpdates),
      optimizeReferencePerformance: (referenceId: string): Promise<any> =>
        ipcRenderer.invoke('form:optimize-reference-performance', referenceId),
      getReferenceManagerStatistics: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('form:get-reference-manager-statistics', limit),
      deserializeReference: (serializedData: string, format?: string): Promise<any> =>
        ipcRenderer.invoke('form:deserialize-reference', serializedData, format),
    },

    assetManager: {
      streamLargeAsset: (assetPath: string, chunkSize?: number): Promise<any> =>
        ipcRenderer.invoke('asset:stream-large-asset', assetPath, chunkSize),
      manageMemoryEfficiently: (strategy?: string): Promise<any> =>
        ipcRenderer.invoke('asset:manage-memory-efficiently', strategy),
      loadResource: (resourceId: string, priority?: number): Promise<any> =>
        ipcRenderer.invoke('asset:load-resource', resourceId, priority),
      unloadResource: (resourceId: string): Promise<any> =>
        ipcRenderer.invoke('asset:unload-resource', resourceId),
      optimizeCachePerformance: (cacheStrategy?: string): Promise<any> =>
        ipcRenderer.invoke('asset:optimize-cache-performance', cacheStrategy),
      handleMemoryPressure: (pressureLevel?: string): Promise<any> =>
        ipcRenderer.invoke('asset:handle-memory-pressure', pressureLevel),
      getMemoryDiagnostics: (detailed?: boolean): Promise<any> =>
        ipcRenderer.invoke('asset:get-memory-diagnostics', detailed),
      batchStreamAssets: (assetPaths: string[]): Promise<any> =>
        ipcRenderer.invoke('asset:batch-stream-assets', assetPaths),
      getStreamingStatistics: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('asset:get-streaming-statistics', limit),
      validateResourceIntegrity: (resourceId: string): Promise<any> =>
        ipcRenderer.invoke('asset:validate-resource-integrity', resourceId),
    },

    scriptCacheManager: {
      loadCachedScript: (scriptId: string, forceRecompile?: boolean): Promise<any> =>
        ipcRenderer.invoke('scriptCache:load-cached-script', scriptId, forceRecompile),
      saveScriptCache: (scriptId: string, compiledData: any, compressionLevel?: number): Promise<any> =>
        ipcRenderer.invoke('scriptCache:save-script-cache', scriptId, compiledData, compressionLevel),
      validateCacheIntegrity: (cacheId: string): Promise<any> =>
        ipcRenderer.invoke('scriptCache:validate-cache-integrity', cacheId),
      optimizeCacheStructure: (optimization?: string): Promise<any> =>
        ipcRenderer.invoke('scriptCache:optimize-cache-structure', optimization),
      clearCacheEntry: (cacheId: string): Promise<any> =>
        ipcRenderer.invoke('scriptCache:clear-cache-entry', cacheId),
      getCacheStatistics: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('scriptCache:get-cache-statistics', limit),
      batchUpdateCache: (updates: any[]): Promise<any> =>
        ipcRenderer.invoke('scriptCache:batch-update-cache', updates),
      analyzeScriptPerformance: (scriptId: string): Promise<any> =>
        ipcRenderer.invoke('scriptCache:analyze-script-performance', scriptId),
      generateCacheReport: (reportFormat?: string): Promise<any> =>
        ipcRenderer.invoke('scriptCache:generate-cache-report', reportFormat),
      monitorCacheHealth: (detailedMetrics?: boolean): Promise<any> =>
        ipcRenderer.invoke('scriptCache:monitor-cache-health', detailedMetrics),
    },

    formID: {
      scanForCollisions: (modPaths: string[]): Promise<any> =>
        ipcRenderer.invoke('formID:scan-for-collisions', modPaths),
      detectCollision: (formID: string, affectedMods: string[]): Promise<any> =>
        ipcRenderer.invoke('formID:detect-collision', formID, affectedMods),
      generateFormIDMapping: (modPath: string, baseFormID?: string): Promise<any> =>
        ipcRenderer.invoke('formID:generate-formid-mapping', modPath, baseFormID),
      validateFormIDIntegrity: (modPath: string): Promise<any> =>
        ipcRenderer.invoke('formID:validate-formid-integrity', modPath),
      remapConflictingFormIDs: (collisionId: string, targetModID: string): Promise<any> =>
        ipcRenderer.invoke('formID:remap-conflicting-formids', collisionId, targetModID),
      getCollisionReport: (reportId: string): Promise<any> =>
        ipcRenderer.invoke('formID:get-collision-report', reportId),
      batchScanMods: (modPaths: string[]): Promise<any> =>
        ipcRenderer.invoke('formID:batch-scan-mods', modPaths),
      monitorFormIDHealth: (modPath: string): Promise<any> =>
        ipcRenderer.invoke('formID:monitor-formid-health', modPath),
      getFormIDStatistics: (limit?: number): Promise<any> =>
        ipcRenderer.invoke('formID:get-formid-statistics', limit),
    },

  // Diagnostics - listen for startup diagnostics from main process
  onDiagnostics: (callback: (diagnostics: any) => void): (() => void) => {
    const listener = (_event: any, diagnostics: any) => {
      console.log('[Preload] Received diagnostics from main:', diagnostics);
      callback(diagnostics);
    };
    ipcRenderer.on('main:diagnostics', listener);
    return () => ipcRenderer.removeListener('main:diagnostics', listener);
  },

  // Transcription logs - listen for transcription debug logs from main process
  onTranscriptionLog: (callback: (log: any) => void): (() => void) => {
    const listener = (_event: any, log: any) => {
      console.log(log.msg, log.data);
      callback(log);
    };
    ipcRenderer.on('transcription-log', listener);
    return () => ipcRenderer.removeListener('transcription-log', listener);
  },

  // Texture Enhancer listeners
  onEnhancerProgress: (callback: (data: any) => void): (() => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('enhancer:progress', listener);
    return () => ipcRenderer.removeListener('enhancer:progress', listener);
  },

  onEnhancerComplete: (callback: (data: any) => void): (() => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('enhancer:complete', listener);
    return () => ipcRenderer.removeListener('enhancer:complete', listener);
  },

  onEnhancerError: (callback: (data: any) => void): (() => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('enhancer:error', listener);
    return () => ipcRenderer.removeListener('enhancer:error', listener);
  },

  onEnhancerJobStarted: (callback: (data: any) => void): (() => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('enhancer:job-started', listener);
    return () => ipcRenderer.removeListener('enhancer:job-started', listener);
  },

  // Bethel Integration API
  bethel: {
    createSession: (): Promise<any> =>
      ipcRenderer.invoke('bethel:create-session'),
    analyzeUploadedMod: (jobId: string): Promise<any> =>
      ipcRenderer.invoke('bethel:analyze', jobId),
    enhanceMod: (jobId: string, enhancementLevel?: 4 | 8 | 16): Promise<any> =>
      ipcRenderer.invoke('bethel:enhance', jobId, enhancementLevel || 4),
    exportEnhancedMod: (jobId: string, format?: 'zip' | 'fomod' | 'default'): Promise<any> =>
      ipcRenderer.invoke('bethel:export', jobId, format || 'zip'),
    getJob: (jobId: string): Promise<any> =>
      ipcRenderer.invoke('bethel:get-job', jobId),
    listJobs: (limit?: number): Promise<any> =>
      ipcRenderer.invoke('bethel:list-jobs', limit || 50),
  },

  // Bethel event listeners
  onBethelAnalyzed: (callback: (data: any) => void): (() => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('bethel:analyzed', listener);
    return () => ipcRenderer.removeListener('bethel:analyzed', listener);
  },

  onBethelEnhancementComplete: (callback: (data: any) => void): (() => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('bethel:enhancement-complete', listener);
    return () => ipcRenderer.removeListener('bethel:enhancement-complete', listener);
  },

  onBethelExportComplete: (callback: (data: any) => void): (() => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('bethel:export-complete', listener);
    return () => ipcRenderer.removeListener('bethel:export-complete', listener);
  },

  // Mining Pipeline API (gated by MOSSY_MINING_ENABLED environment variable)
  mining: {
    executePipeline: (sources: any[]): Promise<any> =>
      ipcRenderer.invoke('mining:execute-pipeline', sources),
    parseESP: (filePath: string): Promise<any> =>
      ipcRenderer.invoke('mining:parse-esp', filePath),
    buildDependencyGraph: (espData: any): Promise<any> =>
      ipcRenderer.invoke('mining:build-dependency-graph', espData),
  },

  // Panel Data Persistence API
  panels: {
    saveData: (panelId: string, data: any): Promise<any> =>
      ipcRenderer.invoke('panel:save-data', panelId, data),
    loadData: (panelId: string): Promise<any> =>
      ipcRenderer.invoke('panel:load-data', panelId),
    deleteData: (panelId: string): Promise<any> =>
      ipcRenderer.invoke('panel:delete-data', panelId),
  },

  // ML/LLM API
  ml: {
    getOllamaStatus: (baseUrl?: string): Promise<any> =>
      ipcRenderer.invoke('ml:get-ollama-status', baseUrl),
    ollamaPull: (modelName: string, opts?: any): Promise<any> =>
      ipcRenderer.invoke('ml:ollama-pull', modelName, opts),
    getOpenAICompatStatus: (baseUrl?: string): Promise<any> =>
      ipcRenderer.invoke('ml:get-openai-compat-status', baseUrl),
  },

  // ============================================================================
  // Platform #4: Asset Pipeline API
  // ============================================================================

  // DDS Converter API
  dds: {
    convert: (params: { inputPath: string; outputPath: string; format: string; textureType?: string; generateMipmaps?: boolean; quality?: string }): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('dds-convert', params),
    detectFormat: (filePath: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('dds-detect-format', filePath),
    pickFiles: (): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('dds-pick-files'),
    getAllPresets: (): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('dds-get-all-presets'),
  },

  // Material Editor API
  material: {
    loadManifest: (filePath: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('material:load-manifest', filePath),
    saveManifest: (params: { filePath: string; manifest: any }): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('material:save-manifest', params),
  },

  // Asset Validator API
  assetValidator: {
    validateMod: (modPath: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('asset-validator:validate-mod', modPath),
    validateFile: (filePath: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('asset-validator:validate-file', filePath),
  },

  // Image Suite API
  imageSuite: {
    generatePBR: (params: { sourceImagePath: string; mapsToGenerate: string[] }): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('image-suite:generate-pbr', params),
    convertFormat: (params: { inputPath: string; outputPath: string; format: string }): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('image-suite:convert-format', params),
  },

  // Asset Optimizer API
  optimizer: {
    startJob: (params: { inputPath: string; outputPath: string; optimizationType: string; settings: any }): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('optimizer:start-job', params),
    getProgress: (jobId: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('optimizer:get-progress', jobId),
  },

  // 3D Viewer API
  assetViewer3D: {
    loadAsset: (assetPath: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('3d-viewer:load-asset', assetPath),
  },

  // Platform #5: Neural Link API
  neuralLink: {
    installScript: (type: string, name: string, code: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('install-script', { type, name, code }),
    executeScriptInXEdit: (scriptPath: string, pluginPath?: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('xedit-script-execute', { scriptPath, pluginPath }),
    validateCKPlugin: (pluginPath: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('ck-plugin-validate', pluginPath),
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
 * Auto-log diagnostics when received from main process
 */
ipcRenderer.on('main:diagnostics', (_event, diagnostics) => {
  console.log('[Main Process Diagnostics]', diagnostics);
  if (diagnostics.backendTokenLoaded) {
    console.log('[✓] Backend token loaded (length:', diagnostics.backendTokenLength, ')');
  } else {
    console.warn('[✗] Backend token NOT loaded');
  }
  console.log('[Backend URL]', diagnostics.backendUrl);
});

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
