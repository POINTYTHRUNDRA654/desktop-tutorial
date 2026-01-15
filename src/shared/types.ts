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
  
  // Audio Settings
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
  sttEnabled: boolean;
  sttLanguage: string;
  
  // UI Settings
  theme: 'light' | 'dark' | 'system';
  alwaysOnTop: boolean;
  startMinimized: boolean;
  
  // Behavior
  autoStart: boolean;
  globalHotkey?: string;

  // External Modding Tools
  xeditPath?: string;
  nifSkopePath?: string;
  fomodCreatorPath?: string;
  creationKitPath?: string;
  blenderPath?: string;
  lootPath?: string;
  vortexPath?: string;
  mo2Path?: string;
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
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  llmApiEndpoint: 'https://api.openai.com/v1/chat/completions',
  llmModel: 'gpt-3.5-turbo',
  ttsEnabled: true,
  ttsVoice: 'default',
  ttsRate: 1.0,
  ttsPitch: 1.0,
  sttEnabled: true,
  sttLanguage: 'en-US',
  theme: 'system',
  alwaysOnTop: false,
  startMinimized: false,
  autoStart: false,
  // Tool paths empty by default; user configures in settings
  xeditPath: '',
  nifSkopePath: '',
  fomodCreatorPath: '',
  creationKitPath: '',
  blenderPath: '',
  lootPath: '',
  vortexPath: '',
  mo2Path: '',
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
  
  // Audio
  ttsSpeak: (text: string) => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  onSttResult: (callback: (text: string) => void) => void;
  
  // Window
  minimizeWindow: () => void;
  closeWindow: () => void;
}

/**
 * Extend Window interface to include our Electron API
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
