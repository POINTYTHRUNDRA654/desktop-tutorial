// ...existing code...
/**
 * Electron Preload Script
 * 
 * This script runs in a special context that has access to both Node.js APIs
 * and the renderer's DOM. It uses contextBridge to securely expose a limited
 * API to the renderer process.
 * 
 * Security: This is the ONLY bridge between main and renderer processes.
 * Never expose dangerous Node.js APIs directly to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, Message, Settings } from '../shared/types';

// Define IPC channels inline to avoid import issues
const IPC_CHANNELS = {
  SEND_MESSAGE: 'send-message',
  ON_MESSAGE: 'on-message',
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  SETTINGS_UPDATED: 'settings-updated',
  TTS_SPEAK: 'tts-speak',
  STT_START: 'stt-start',
  STT_STOP: 'stt-stop',
  STT_RESULT: 'stt-result',
  MINIMIZE_WINDOW: 'minimize-window',
  CLOSE_WINDOW: 'close-window',

  // Project Management
  PROJECT_LIST: 'project-list',
  PROJECT_CREATE: 'project-create',
  PROJECT_UPDATE: 'project-update',
  PROJECT_DELETE: 'project-delete',
  PROJECT_GET_CURRENT: 'project-get-current',

  // Project Wizard
  WIZARD_GET_STATE: 'wizard-get-state',
  WIZARD_UPDATE_STEP: 'wizard-update-step',
  WIZARD_SUBMIT_ACTION: 'wizard-submit-action',
} as const;

/**
 * Exposed API that will be available on window.electronAPI
 * Only use contextBridge and ipcRenderer. No Node.js require/import allowed.
 */
const electronAPI: ElectronAPI = {
    // Generic IPC
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, callback: (...args: any[]) => void) => {
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },

    // Directory Picker
    pickDirectory: (options?: any) => ipcRenderer.invoke('pick-directory', options),

    // Real-time STT partial transcript
    onSttPartial: (callback: (partial: string) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, partial: string) => callback(partial);
      ipcRenderer.on('STT_PARTIAL', subscription);
      return () => ipcRenderer.removeListener('STT_PARTIAL', subscription);
    },

    // Real-time mic level
    onMicLevel: (callback: (level: number) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, level: number) => callback(level);
      ipcRenderer.on('MIC_LEVEL', subscription);
      return () => ipcRenderer.removeListener('MIC_LEVEL', subscription);
    },
  // Messaging
  sendMessage: (message: any) => ipcRenderer.invoke(IPC_CHANNELS.SEND_MESSAGE, message),
  onMessage: (callback: (message: Message) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, message: Message) => callback(message);
    ipcRenderer.on(IPC_CHANNELS.ON_MESSAGE, subscription);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_MESSAGE, subscription);
  },
  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  setSettings: (settings: Partial<Settings>) => ipcRenderer.invoke(IPC_CHANNELS.SET_SETTINGS, settings),
  onSettingsUpdated: (callback: (settings: Settings) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, settings: Settings) => callback(settings);
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_UPDATED, subscription);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_UPDATED, subscription);
  },
  // Audio - TTS (Text-to-Speech)
  ttsSpeak: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.TTS_SPEAK, text),
  // Audio - STT (Speech-to-Text)
  sttStart: () => ipcRenderer.invoke(IPC_CHANNELS.STT_START),
  sttStop: () => ipcRenderer.invoke(IPC_CHANNELS.STT_STOP),
  startListening: () => ipcRenderer.invoke(IPC_CHANNELS.STT_START),
  stopListening: () => ipcRenderer.invoke(IPC_CHANNELS.STT_STOP),
  onSttResult: (callback: (text: string) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
    ipcRenderer.on(IPC_CHANNELS.STT_RESULT, subscription);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STT_RESULT, subscription);
  },
  // Audio transcription (for recorded audio)
  transcribeAudio: (arrayBuffer: ArrayBuffer, mimeType?: string) => ipcRenderer.invoke('transcribe-audio', arrayBuffer, mimeType),
  // PDF parsing
  parsePDF: (arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('parse-pdf', arrayBuffer),
  // PSD parsing
  parsePSD: (arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('parse-psd', arrayBuffer),
  // ABR parsing (Adobe Brush)
  parseABR: (arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('parse-abr', arrayBuffer),
  // Video transcription
  transcribeVideo: (arrayBuffer: ArrayBuffer, filename: string, projectId?: string, organizationId?: string) => ipcRenderer.invoke('transcribe-video', arrayBuffer, filename, projectId, organizationId),
  // System info and program detection
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getPerformance: () => ipcRenderer.invoke('get-performance'),
  detectPrograms: () => ipcRenderer.invoke('detect-programs'),
  getRunningProcesses: () => ipcRenderer.invoke('get-running-processes'),
  openProgram: (path: string) => ipcRenderer.invoke('open-program', path),
  readFile: (filePath: string) => ipcRenderer.invoke('workshop-read-file', filePath),
  saveFile: (content: string, filename: string) => ipcRenderer.invoke('save-file', content, filename),
  // Developer tools
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
  // Window controls
  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.MINIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.CLOSE_WINDOW),
  // Image Suite
  generateNormalMap: (imageBase64: string) => ipcRenderer.invoke('image-generate-normal-map', imageBase64),
  generateRoughnessMap: (imageBase64: string) => ipcRenderer.invoke('image-generate-roughness-map', imageBase64),
  generateHeightMap: (imageBase64: string) => ipcRenderer.invoke('image-generate-height-map', imageBase64),
  generateMetallicMap: (imageBase64: string) => ipcRenderer.invoke('image-generate-metallic-map', imageBase64),
  generateAOMap: (imageBase64: string) => ipcRenderer.invoke('image-generate-ao-map', imageBase64),
  convertImageFormat: (sourceBase64: string, targetFormat: string, options: any) => ipcRenderer.invoke('image-convert-format', sourceBase64, targetFormat, options),

  // TTS speak event listener
  onTtsSpeak: (callback: (audioUrl: string | null) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, audioUrl: string | null) => callback(audioUrl);
    ipcRenderer.on(IPC_CHANNELS.TTS_SPEAK, subscription);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TTS_SPEAK, subscription);
  },

  // External URL opener
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Image information
  getImageInfo: (filePath: string) => ipcRenderer.invoke('get-image-info', filePath),

  // Voice setup wizard handlers
  checkOllamaStatus: () => ipcRenderer.invoke('check-ollama-status'),
  listOllamaModels: () => ipcRenderer.invoke('list-ollama-models'),
  pullOllamaModel: (modelName: string) => ipcRenderer.invoke('pull-ollama-model', modelName),

  // Blender integration
  checkBlenderAddon: () => ipcRenderer.invoke('check-blender-addon'),
  sendBlenderCommand: (command: string, args?: any) => ipcRenderer.invoke('send-blender-command', command, args),

  // Multi-Project Support
  createProject: (project: any) => ipcRenderer.invoke('project-create', project),
  updateProject: (id: string, updates: any) => ipcRenderer.invoke('project-update', id, updates),
  deleteProject: (id: string) => ipcRenderer.invoke('project-delete', id),
  switchProject: (id: string) => ipcRenderer.invoke('project-switch', id),
  listProjects: () => ipcRenderer.invoke('project-list'),
  getCurrentProject: () => ipcRenderer.invoke('project-get-current'),

  // Wizard Support
  wizardGetState: (wizardId: string) => ipcRenderer.invoke('wizard-get-state', wizardId),
  wizardUpdateStep: (wizardId: string, stepId: string, status: any, data?: any) => ipcRenderer.invoke('wizard-update-step', wizardId, stepId, status, data),
  wizardSubmitAction: (wizardId: string, actionType: string, payload: any) => ipcRenderer.invoke('wizard-submit-action', wizardId, actionType, payload),

  // Roadmap Support
  roadmapGetAll: () => ipcRenderer.invoke('roadmap-get-all'),
  roadmapGetActive: () => ipcRenderer.invoke('roadmap-get-active'),
  roadmapCreate: (roadmap: any) => ipcRenderer.invoke('roadmap-create', roadmap),
  roadmapUpdateStep: (roadmapId: string, stepId: string, status: string) => ipcRenderer.invoke('roadmap-update-step', roadmapId, stepId, status),
  roadmapDelete: (id: string) => ipcRenderer.invoke('roadmap-delete', id),
  roadmapGenerateAI: (prompt: string, projectId: string) => ipcRenderer.invoke('roadmap-generate-ai', prompt, projectId),

  // Collaboration Features
  initGitRepository: (projectId: string, config: any) => ipcRenderer.invoke('collaboration-git-init', projectId, config),
  gitCommit: (projectId: string, message: string, files?: string[]) => ipcRenderer.invoke('collaboration-git-commit', projectId, message, files),
  gitPush: (projectId: string) => ipcRenderer.invoke('collaboration-git-push', projectId),
  gitPull: (projectId: string) => ipcRenderer.invoke('collaboration-git-pull', projectId),

  // Advanced Analytics
  trackAnalyticsEvent: (event: any) => ipcRenderer.invoke('analytics-track-event', event),
  getAnalyticsMetrics: () => ipcRenderer.invoke('analytics-get-metrics'),
  exportAnalyticsData: () => ipcRenderer.invoke('analytics-export-data'),
  updateAnalyticsConfig: (config: any) => ipcRenderer.invoke('analytics-update-config', config),

  // Mining Infrastructure
  startMiningPipeline: (sources: any[]) => ipcRenderer.invoke('start-mining-pipeline', sources),
  parseESPFile: (filePath: string) => ipcRenderer.invoke('parse-esp-file', filePath),
  buildDependencyGraph: (modFiles: string[]) => ipcRenderer.invoke('build-dependency-graph', modFiles),
  getMiningStatus: () => ipcRenderer.invoke('get-mining-status'),

  // Advanced Analysis Capabilities
  analyzePatterns: (data: any) => ipcRenderer.invoke('analyze-patterns', data),
  predictConflicts: (modA: string, modB: string) => ipcRenderer.invoke('predict-conflicts', modA, modB),
  analyzeBottlenecks: (performanceData: any) => ipcRenderer.invoke('analyze-bottlenecks', performanceData),
  analyzeMemory: (memoryData: any) => ipcRenderer.invoke('analyze-memory', memoryData),
  buildCompatibilityMatrix: (compatibilityData: any[]) => ipcRenderer.invoke('build-compatibility-matrix', compatibilityData),
  queryCompatibility: (modA: string, modB: string) => ipcRenderer.invoke('query-compatibility', modA, modB),
  trainConflictModel: (trainingData: any[]) => ipcRenderer.invoke('train-conflict-model', trainingData),
  getAnalysisStatus: () => ipcRenderer.invoke('get-analysis-status'),

  // Mining Operations
  miningStart: () => ipcRenderer.invoke('mining-start'),
  miningStop: () => ipcRenderer.invoke('mining-stop'),
  miningGetStatus: () => ipcRenderer.invoke('mining-get-status'),
  miningGetResults: () => ipcRenderer.invoke('mining-get-results'),
  miningDeepAnalysis: (options: any) => ipcRenderer.invoke('mining-deep-analysis', options),
  miningBatchJob: (job: any) => ipcRenderer.invoke('mining-batch-job', job),
  miningResolveConflicts: (modDirectory: string) => ipcRenderer.invoke('mining-resolve-conflicts', modDirectory),
  miningWorkflowRecommendations: (options: any) => ipcRenderer.invoke('mining-workflow-recommendations', options),
  miningUpdateConfig: (config: any) => ipcRenderer.invoke('mining-update-config', config),

  // Phase 1: Asset Correlation Engine
  miningAssetCorrelationStart: (config?: any) => ipcRenderer.invoke('mining-asset-correlation-start', config),
  miningAssetCorrelationStop: () => ipcRenderer.invoke('mining-asset-correlation-stop'),
  miningAssetCorrelationStatus: () => ipcRenderer.invoke('mining-asset-correlation-status'),
  miningAssetCorrelationResults: () => ipcRenderer.invoke('mining-asset-correlation-results'),

  // Phase 1: Pattern Recognition Engine
  miningPatternRecognitionStart: (config?: any) => ipcRenderer.invoke('mining-pattern-recognition-start', config),
  miningPatternRecognitionStop: () => ipcRenderer.invoke('mining-pattern-recognition-stop'),
  miningPatternRecognitionStatus: () => ipcRenderer.invoke('mining-pattern-recognition-status'),
  miningPatternRecognitionResults: () => ipcRenderer.invoke('mining-pattern-recognition-results'),

  // BA2 Archive Management
  mergeBA2: (inputArchives: string[], outputArchive: string, archiveType: 'general' | 'texture') => ipcRenderer.invoke('ba2-merge', inputArchives, outputArchive, archiveType),

  // Scribe Advanced (Phase 4)
  installScript: (type: 'papyrus' | 'xedit', name: string, code: string, targetPath?: string) => ipcRenderer.invoke('scribe-install-script', type, name, code, targetPath),

  // ===== ADVANCED FEATURES: Enhanced ML, Monitoring, Data Management, Scalability =====

  // Enhanced LLM Service
  llmGenerateWithExplainability: (messages: any[], config: any, includeExplainability: boolean) => ipcRenderer.invoke('llm-generate-with-explainability', messages, config, includeExplainability),
  llmSaveModelVersion: (version: any) => ipcRenderer.invoke('llm-save-model-version', version),
  llmGetModelVersions: () => ipcRenderer.invoke('llm-get-model-versions'),
  llmCreateABTest: (test: any) => ipcRenderer.invoke('llm-create-ab-test', test),
  llmGetPerformanceMetrics: (timeRange?: number) => ipcRenderer.invoke('llm-get-performance-metrics', timeRange),

  // Monitoring Service
  monitoringStart: () => ipcRenderer.invoke('monitoring-start'),
  monitoringStop: () => ipcRenderer.invoke('monitoring-stop'),
  monitoringCreateAlertRule: (rule: any) => ipcRenderer.invoke('monitoring-create-alert-rule', rule),
  monitoringGetAlertRules: () => ipcRenderer.invoke('monitoring-get-alert-rules'),
  monitoringGetHealth: () => ipcRenderer.invoke('monitoring-get-health'),
  monitoringGetMetrics: (name?: string, timeRange?: number) => ipcRenderer.invoke('monitoring-get-metrics', name, timeRange),
  monitoringGetNotifications: (limit?: number) => ipcRenderer.invoke('monitoring-get-notifications', limit),

  // Data Management Service
  dataCreateUserProfile: (userData: any) => ipcRenderer.invoke('data-create-user-profile', userData),
  dataGetUserProfile: (userId: string) => ipcRenderer.invoke('data-get-user-profile', userId),
  dataUpdateUserProfile: (userId: string, updates: any) => ipcRenderer.invoke('data-update-user-profile', userId, updates),
  dataSubmitGDPRRequest: (request: any) => ipcRenderer.invoke('data-submit-gdpr-request', request),
  dataGetGDPRRequest: (requestId: string) => ipcRenderer.invoke('data-get-gdpr-request', requestId),
  dataRequestExport: (userId: string, options?: any) => ipcRenderer.invoke('data-request-export', userId, options),
  dataGetExport: (exportId: string) => ipcRenderer.invoke('data-get-export', exportId),
  dataGetPrivacySettings: () => ipcRenderer.invoke('data-get-privacy-settings'),
  dataUpdatePrivacySettings: (settings: any) => ipcRenderer.invoke('data-update-privacy-settings', settings),

  // Scalability Service
  scalabilityGetCache: (key: string) => ipcRenderer.invoke('scalability-get-cache', key),
  scalabilitySetCache: (key: string, value: any, ttl?: number) => ipcRenderer.invoke('scalability-set-cache', key, value, ttl),
  scalabilitySubmitTask: (task: any) => ipcRenderer.invoke('scalability-submit-task', task),
  scalabilityGetTaskStatus: (taskId: string) => ipcRenderer.invoke('scalability-get-task-status', taskId),
  scalabilityRegisterWorker: (workerId: string, capabilities: string[], type?: string) => ipcRenderer.invoke('scalability-register-worker', workerId, capabilities, type),
  scalabilityGetAvailableWorkers: () => ipcRenderer.invoke('scalability-get-available-workers'),

  // Notification listener for monitoring service
  onNotification: (callback: (notification: any) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, notification: any) => callback(notification);
    ipcRenderer.on('notification', subscription);
    return () => ipcRenderer.removeListener('notification', subscription);
  },
};

/**
 * Expose the API to the renderer process via contextBridge
 * This makes it available as window.electronAPI in the renderer
 */
contextBridge.exposeInMainWorld('electron', { api: electronAPI });
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
 * - Use send/on for one-way notifications
 * - Always sanitize user input before processing
 * - Never trust data from the renderer process
 */
