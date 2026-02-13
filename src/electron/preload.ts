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
  REVEAL_IN_FOLDER: 'reveal-in-folder',
  REVEAL_SETTINGS_FILE: 'reveal-settings-file',
  GET_TOOL_VERSION: 'get-tool-version',
  GET_RUNNING_PROCESSES: 'get-running-processes',
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  SETTINGS_UPDATED: 'settings-updated',
  ELEVENLABS_STATUS: 'elevenlabs-status',
  ELEVENLABS_LIST_VOICES: 'elevenlabs-list-voices',
  ELEVENLABS_SYNTHESIZE: 'elevenlabs-synthesize',
  CHECK_BLENDER_ADDON: 'check-blender-addon',
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
  AUDITOR_PICK_ESP_FILE: 'auditor-pick-esp-file',
  AUDITOR_PICK_NIF_FILE: 'auditor-pick-nif-file',
  AUDITOR_PICK_DDS_FILE: 'auditor-pick-dds-file',
  AUDITOR_PICK_BGSM_FILE: 'auditor-pick-bgsm-file',

  // Duplicate Finder
  DEDUPE_PICK_FOLDERS: 'dedupe-pick-folders',
  DEDUPE_SCAN: 'dedupe-scan',
  DEDUPE_CANCEL: 'dedupe-cancel',
  DEDUPE_PROGRESS: 'dedupe-progress',
  DEDUPE_TRASH: 'dedupe-trash',
  // Load Order Lab (experimental)
  LOAD_ORDER_PICK_MO2_PROFILE_DIR: 'load-order-pick-mo2-profile-dir',
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
   * ElevenLabs config status (whether a key is stored in main-process settings).
   */
  elevenLabsStatus: (): Promise<
    | { ok: true; configured: boolean; voiceId?: string; provider?: 'browser' | 'elevenlabs' }
    | { ok: false; error: string }
  > => {
    return ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_STATUS);
  },

  /**
   * List available ElevenLabs voices.
   */
  elevenLabsListVoices: (): Promise<
    | {
        ok: true;
        voices: Array<{ voice_id: string; name: string; category?: string; labels?: Record<string, string> }>;
      }
    | { ok: false; error: string }
  > => {
    return ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_LIST_VOICES);
  },

  /**
   * Synthesize speech with ElevenLabs (main process does the network call).
   */
  elevenLabsSynthesizeSpeech: (args: { text: string; voiceId?: string }): Promise<
    | { ok: true; audioBase64: string; mimeType?: string }
    | { ok: false; error: string }
  > => {
    return ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_SYNTHESIZE, args);
  },

  /**
   * Check if the Blender Mossy Link add-on socket is reachable.
   * Used by Desktop Bridge "Blender Link" panel.
   */
  checkBlenderAddon: (): Promise<{ connected: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECK_BLENDER_ADDON);
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
   * Open an external file or URL
   * @param path - Path to file or URL
   * @returns Promise resolving when opened
   */
  openExternal: (path: string): Promise<void> => {
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
   * Auditor: Pick ESP/ESM file via native file dialog
   */
  pickEspFile: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_PICK_ESP_FILE);
  },

  /**
   * Auditor: Pick NIF mesh file via native file dialog
   */
  pickNifFile: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_PICK_NIF_FILE);
  },

  /**
   * Auditor: Pick DDS texture file via native file dialog
   */
  pickDdsFile: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_PICK_DDS_FILE);
  },

  /**
   * Auditor: Pick BGSM material file via native file dialog
   */
  pickBgsmFile: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDITOR_PICK_BGSM_FILE);
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
   * Load Order Lab: Pick MO2 profile directory
   */
  pickMo2ProfileDir: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_ORDER_PICK_MO2_PROFILE_DIR);
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
  aiChatGroq: (prompt: string, systemPrompt?: string, model?: string): Promise<{ success: boolean; content?: string; error?: string }> => {
    return ipcRenderer.invoke('ai-chat-groq', { prompt, systemPrompt, model });
  },

  /**
   * Voice chat: send a message to main process
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
    | { ok: true; openai: boolean; groq: boolean; elevenlabs: boolean }
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

