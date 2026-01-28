/**
 * Shared TypeScript types for the Desktop AI Assistant
 * Used across main, renderer, and preload processes
 */

/**
 * Message in the chat history
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/**
 * Application settings stored persistently
 */
export interface Settings {
  // LLM Configuration
  llmApiEndpoint: string;
  llmApiKey?: string;
  llmModel: string;

  // Local AI (optional)
  localAiPreferredProvider?: 'auto' | 'ollama' | 'openai_compat' | 'off';
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  openaiCompatBaseUrl?: string;
  openaiCompatModel?: string;
  
  // Audio Settings
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
  sttEnabled: boolean;
  sttLanguage: string;
  
  // UI Settings
  theme: 'light' | 'dark' | 'system';
  /** UI language (BCP-47 tag like 'en', 'en-US', 'es', or 'auto' to follow OS). */
  uiLanguage?: string;
  alwaysOnTop: boolean;
  startMinimized: boolean;
  
  // Behavior
  autoStart: boolean;
  globalHotkey?: string;

  // External Modding Tools
  xeditPath?: string;
  nifSkopePath?: string;
  xeditScriptsDirOverride?: string;
  fomodCreatorPath?: string;
  creationKitPath?: string;
  blenderPath?: string;
  lootPath?: string;
  vortexPath?: string;
  mo2Path?: string;
  
  // Game Paths
  fallout4Path?: string;

  // Creation Kit / Papyrus
  papyrusCompilerPath?: string;
  papyrusFlagsPath?: string;
  papyrusImportPaths?: string; // semicolon-separated
  papyrusSourcePath?: string; // where .psc live (e.g. Data\\Scripts\\Source\\User)
  papyrusOutputPath?: string; // where .pex output goes (e.g. Data\\Scripts)
  papyrusTemplateLibrary?: PapyrusTemplate[];

  // Script libraries (The Scribe)
  xeditScriptLibrary?: ScriptTemplate[];
  blenderScriptLibrary?: ScriptTemplate[];
  scriptBundles?: ScriptBundle[];
  wryeBashPath?: string;
  bodySlidePath?: string;
  outfitStudioPath?: string;
  baePath?: string;
  gimpPath?: string;
  archive2Path?: string;
  pjmScriptPath?: string;
  f4sePath?: string;
  upscaylPath?: string;
  photopeaPath?: string;
  shaderMapPath?: string;
  nvidiaTextureToolsPath?: string;
  autodeskFbxPath?: string;
  photoDemonPath?: string;
  unWrap3Path?: string;
  nifUtilsSuitePath?: string;
  nvidiaOmniversePath?: string;
  spin3dPath?: string;
  nvidiaCanvasPath?: string;

  // Community Sharing
  communityRepo?: string; // GitHub repo in the form "owner/repo"
  communityContributorName?: string;
  communityContributorLink?: string;

  // Load Order Lab (experimental)
  loadOrderLabXeditPresetId?: string;
  loadOrderLabXeditArgsTemplate?: string;
  loadOrderLabXeditArgsEnabled?: boolean;
  loadOrderLabPreparedScriptPath?: string;

  // Workflow Runner
  workflowRunnerWorkflows?: WorkflowRunnerWorkflow[];
  workflowRunnerRunHistory?: WorkflowRunnerRun[];
}

export type WorkflowRunnerStepType = 'runTool' | 'openProgram' | 'openExternal' | 'revealInFolder';

export interface WorkflowRunnerStep {
  id: string;
  type: WorkflowRunnerStepType;
  label: string;
  cmd?: string;
  args?: string;
  cwd?: string;
  target?: string;
}

export interface WorkflowRunnerWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowRunnerStep[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunnerRun {
  id: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
  endedAt: string;
  success: boolean;
  logs: Array<{ at: string; level: 'info' | 'warn' | 'error'; message: string }>;
}

export interface PapyrusTemplate {
  id: string;
  title: string;
  description?: string;
  author?: string;
  scriptName: string;
  extendsType: string;
  templateKind?: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptTemplate {
  id: string;
  title: string;
  description?: string;
  author?: string;
  scriptType: 'xedit' | 'blender';
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptBundle {
  id: string;
  title: string;
  description?: string;
  author?: string;
  templates: ScriptTemplate[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  llmApiEndpoint: 'https://api.openai.com/v1/chat/completions',
  llmModel: 'gpt-3.5-turbo',
  localAiPreferredProvider: 'auto',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'llama3',
  openaiCompatBaseUrl: 'http://127.0.0.1:1234/v1',
  openaiCompatModel: '',
  ttsEnabled: true,
  ttsVoice: 'default',
  ttsRate: 1.0,
  ttsPitch: 1.0,
  sttEnabled: true,
  sttLanguage: 'en-US',
  theme: 'system',
  uiLanguage: 'auto',
  alwaysOnTop: false,
  startMinimized: false,
  autoStart: false,
  // Tool paths empty by default; user configures in settings
  xeditPath: '',
    xeditScriptsDirOverride: '',
  nifSkopePath: '',
  fomodCreatorPath: '',
  creationKitPath: '',
  blenderPath: '',
  lootPath: '',
  vortexPath: '',
  mo2Path: '',
  fallout4Path: '',
  wryeBashPath: '',
  bodySlidePath: '',
  outfitStudioPath: '',
  baePath: '',
  gimpPath: '',
  archive2Path: '',
  pjmScriptPath: '',
  f4sePath: '',
  upscaylPath: '',
  photopeaPath: '',
  shaderMapPath: '',
  nvidiaTextureToolsPath: '',
  autodeskFbxPath: '',
  photoDemonPath: '',
  unWrap3Path: '',
  nifUtilsSuitePath: '',
  nvidiaOmniversePath: '',
  spin3dPath: '',
  nvidiaCanvasPath: '',

  // Papyrus
  papyrusCompilerPath: '',
  papyrusFlagsPath: '',
  papyrusImportPaths: '',
  papyrusSourcePath: '',
  papyrusOutputPath: '',
  papyrusTemplateLibrary: [],

  // Script libraries (The Scribe)
  xeditScriptLibrary: [],
  blenderScriptLibrary: [],
  scriptBundles: [],

  // Community Sharing
  communityRepo: '',
  communityContributorName: '',
  communityContributorLink: '',

  // Load Order Lab (experimental)
  loadOrderLabXeditPresetId: 'fo4edit-script-quoted',
  loadOrderLabXeditArgsTemplate: '',
  loadOrderLabXeditArgsEnabled: false,
  loadOrderLabPreparedScriptPath: '',

  // Workflow Runner
  workflowRunnerWorkflows: [],
  workflowRunnerRunHistory: [],
};

/**
 * IPC Channel names for main <-> renderer communication
 */
export const IPC_CHANNELS = {
  // Messages
  SEND_MESSAGE: 'send-message',
  ON_MESSAGE: 'on-message',
  
  // Settings
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  SETTINGS_UPDATED: 'settings-updated',
  
  // Audio
  TTS_SPEAK: 'tts-speak',
  STT_START: 'stt-start',
  STT_STOP: 'stt-stop',
  STT_RESULT: 'stt-result',
  
  // Window
  MINIMIZE_WINDOW: 'minimize-window',
  CLOSE_WINDOW: 'close-window',
} as const;

/**
 * API for the preload script (exposed to renderer via contextBridge)
 */
export interface ElectronAPI {
  // Messaging
  sendMessage: (message: string) => Promise<void>;
  onMessage: (callback: (message: Message) => void) => void;
  
  // Settings
  getSettings: () => Promise<Settings>;
  setSettings: (settings: Partial<Settings>) => Promise<void>;
  onSettingsUpdated: (callback: (settings: Settings) => void) => void;

  // Desktop Bridge
  checkBlenderAddon?: () => Promise<{ connected: boolean; error?: string }>;
  
  // Audio
  ttsSpeak: (text: string) => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  onSttResult: (callback: (text: string) => void) => void;
  
  // Window
  minimizeWindow: () => void;
  closeWindow: () => void;

  // Optional extended bridge APIs (not always present in every build)
  readFile?: (filePath: string) => Promise<string>;
  saveFile?: (content: string, filename: string) => Promise<string>;
  openProgram?: (path: string) => Promise<{ success: boolean; error?: string; method?: string }>;

  // Load Order Lab (experimental)
  pickMo2ProfileDir?: () => Promise<string>;
  pickLootReportFile?: () => Promise<string>;
  writeLoadOrderUserDataFile?: (filename: string, content: string) => Promise<string>;
  launchXEdit?: (args?: string[], cwd?: string) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Extend Window interface to include our Electron API
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
