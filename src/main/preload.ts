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

  // Bridge & Plugin Activity — sent from Main to Renderer when external bridges
  // (Desktop Bridge, Blender Bridge, MO2 Bridge, future plugins) report activity.
  BRIDGE_ACTIVITY: 'bridge-activity',
} as const;

const isNoHandlerRegisteredError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('No handler registered for');
};

const invokeWithFallback = async (channel: string, ...args: any[]): Promise<any> => {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (error: unknown) {
    if (!isNoHandlerRegisteredError(error)) {
      throw error;
    }

    switch (channel) {
      case 'plugin-manager:list-installed':
        return [];
      case 'whats-new-get-current':
        return { ok: false, entry: null, error: 'What\'s New service unavailable' };
      case 'get-update-status':
        return { success: false, error: 'Auto-update status unavailable' };
      case 'secret-status':
        return { ok: false, error: 'Secret status unavailable' };
      default:
        throw error;
    }
  }
};

/**
 * Exposed API that will be available on window.electronAPI
 * Only use contextBridge and ipcRenderer. No Node.js require/import allowed.
 */
const electronAPI: ElectronAPI = {
    // Generic IPC
    invoke: (channel: string, ...args: any[]) => invokeWithFallback(channel, ...args),
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
  // CK Crash Prevention
  getPluginMetadata: (pluginPath: string) => ipcRenderer.invoke('get-plugin-metadata', pluginPath),
  getProcessMetrics: (pid: number) => ipcRenderer.invoke('get-process-metrics', pid),
  readCrashLog: (logPath: string) => ipcRenderer.invoke('read-crash-log', logPath),
  ckValidate: (espPath: string) => ipcRenderer.invoke('ck-crash-prevention:validate', espPath),
  ckGeneratePreventionPlan: (validationResult: any) => ipcRenderer.invoke('ck-crash-prevention:generate-plan', validationResult),
  ckAnalyzeCrash: (logPath: string) => ipcRenderer.invoke('ck-crash-prevention:analyze-crash', logPath),
  ckPickLogFile: () => ipcRenderer.invoke('ck-crash-prevention:pick-log-file'),
  // DDS Converter
  ddsConvert: (input: any) => ipcRenderer.invoke('dds-converter:convert', input),
  ddsConvertBatch: (files: any[], options?: any) => ipcRenderer.invoke('dds-converter:convert-batch', files, options),
  ddsDetectFormat: (filePath: string) => ipcRenderer.invoke('dds-converter:detect-format', filePath),
  ddsGenerateMipmaps: (imagePath: string, levels?: number) => ipcRenderer.invoke('dds-converter:generate-mipmaps', imagePath, levels),
  ddsGetPreset: (type: string) => ipcRenderer.invoke('dds-converter:get-preset', type),
  ddsGetAllPresets: () => ipcRenderer.invoke('dds-converter:get-all-presets'),
  ddsGetDefaultFormatRules: () => ipcRenderer.invoke('dds-converter:get-default-format-rules'),
  ddsPickFiles: () => ipcRenderer.invoke('dds-converter:pick-files'),
  // Texture Generator
  textureGenerateMaterialSet: (input: any) => ipcRenderer.invoke('texture-generator:generate-material-set', input),
  textureGenerateMap: (type: string, source: string, settings: any) => ipcRenderer.invoke('texture-generator:generate-map', type, source, settings),
  textureMakeSeamless: (imagePath: string, blendRadius?: number) => ipcRenderer.invoke('texture-generator:make-seamless', imagePath, blendRadius),
  textureUpscale: (imagePath: string, factor: 2 | 4) => ipcRenderer.invoke('texture-generator:upscale', imagePath, factor),
  textureGenerateProcedural: (type: string, settings: any) => ipcRenderer.invoke('texture-generator:generate-procedural', type, settings),
  // External Tool Integration
  externalToolDetectTools: () => ipcRenderer.invoke('external-tool:detect-tools'),
  externalToolVerifyTool: (toolName: string) => ipcRenderer.invoke('external-tool:verify-tool', toolName),
  externalToolRunXEditScript: (scriptPath: string, pluginList: string[]) => ipcRenderer.invoke('external-tool:run-xedit-script', scriptPath, pluginList),
  externalToolCleanPlugin: (pluginPath: string, mode: 'quick' | 'manual') => ipcRenderer.invoke('external-tool:clean-plugin', pluginPath, mode),
  externalToolFindConflicts: (plugins: string[]) => ipcRenderer.invoke('external-tool:find-conflicts', plugins),
  externalToolOptimizeNIF: (nifPath: string, settings: any) => ipcRenderer.invoke('external-tool:optimize-nif', nifPath, settings),
  externalToolBatchFixNIFs: (folder: string, issues: string[]) => ipcRenderer.invoke('external-tool:batch-fix-nifs', folder, issues),
  externalToolExtractNIFInfo: (nifPath: string) => ipcRenderer.invoke('external-tool:extract-nif-info', nifPath),
  externalToolImportFBX: (fbxPath: string, settings: any) => ipcRenderer.invoke('external-tool:import-fbx', fbxPath, settings),
  externalToolExportNIF: (blendPath: string, settings: any) => ipcRenderer.invoke('external-tool:export-nif', blendPath, settings),
  externalToolBatchConvertMeshes: (files: string[], workflow: string) => ipcRenderer.invoke('external-tool:batch-convert-meshes', files, workflow),
  externalToolRunCKCommand: (command: string, args: string[]) => ipcRenderer.invoke('external-tool:run-ck-command', command, args),
  externalToolGeneratePrecombines: (espPath: string, cells?: string[]) => ipcRenderer.invoke('external-tool:generate-precombines', espPath, cells),
  externalToolPackArchive: (folder: string, archiveName: string, format: 'General' | 'DDS' | 'BA2') => ipcRenderer.invoke('external-tool:pack-archive', folder, archiveName, format),
  externalToolUnpackArchive: (ba2Path: string, outputFolder: string) => ipcRenderer.invoke('external-tool:unpack-archive', ba2Path, outputFolder),
  // Tool wrapper-specific methods
  xeditClean: (pluginPath: string, mode?: 'quick' | 'manual') => ipcRenderer.invoke('tool-integration:xedit-clean', pluginPath, mode),
  xeditExecuteScript: (scriptPath: string, plugins: string[], parameters?: any) => ipcRenderer.invoke('tool-integration:xedit-script', scriptPath, plugins, parameters),
  xeditExportCSV: (plugin: string, recordTypes: string[], outputPath?: string) => ipcRenderer.invoke('tool-integration:xedit-export-csv', plugin, recordTypes, outputPath),
  xeditFindConflicts: (plugins: string[]) => ipcRenderer.invoke('tool-integration:xedit-find-conflicts', plugins),
  nifOptimize: (nifPath: string, options?: any) => ipcRenderer.invoke('tool-integration:nif-optimize', nifPath, options),
  nifBatchOptimize: (nifFiles: string[], options?: any) => ipcRenderer.invoke('tool-integration:nif-batch-optimize', nifFiles, options),
  nifChangeTexture: (nifPath: string, oldPath: string, newPath: string) => ipcRenderer.invoke('tool-integration:nif-change-texture', nifPath, oldPath, newPath),
  nifFixCollision: (nifPath: string, options?: any) => ipcRenderer.invoke('tool-integration:nif-fix-collision', nifPath, options),
  nifExtractMetadata: (nifPath: string) => ipcRenderer.invoke('tool-integration:nif-extract-metadata', nifPath),
  nifValidate: (nifPath: string) => ipcRenderer.invoke('tool-integration:nif-validate', nifPath),
  blenderConvertFBXToNIF: (fbxPath: string, nifPath: string, options?: any) => ipcRenderer.invoke('tool-integration:blender-convert-fbx-to-nif', fbxPath, nifPath, options),
  blenderConvertNIFToFBX: (nifPath: string, fbxPath: string, options?: any) => ipcRenderer.invoke('tool-integration:blender-convert-nif-to-fbx', nifPath, fbxPath, options),
  blenderExecuteScript: (scriptContent: string, args?: any, options?: any) => ipcRenderer.invoke('tool-integration:blender-script', scriptContent, args, options),
  blenderBatchProcess: (files: string[], operation: string, options?: any) => ipcRenderer.invoke('tool-integration:blender-batch-process', files, operation, options),
  blenderCheckNIFPlugin: () => ipcRenderer.invoke('tool-integration:blender-check-nif-plugin'),
  ckLaunch: (espPath?: string, options?: any) => ipcRenderer.invoke('tool-integration:ck-launch', espPath, options),
  ckGetLog: () => ipcRenderer.invoke('tool-integration:ck-get-log'),
  ckGetLogErrors: () => ipcRenderer.invoke('tool-integration:ck-get-log-errors'),
  ckValidateESP: (espPath: string) => ipcRenderer.invoke('tool-integration:ck-validate-esp', espPath),
  ckGetMasters: (espPath: string) => ipcRenderer.invoke('tool-integration:ck-get-masters', espPath),
  ckBackupESP: (espPath: string) => ipcRenderer.invoke('tool-integration:ck-backup-esp', espPath),
  ckIsRunning: () => ipcRenderer.invoke('tool-integration:ck-is-running'),
  ckKill: () => ipcRenderer.invoke('tool-integration:ck-kill'),
  // Asset Validation
  assetValidateMod: (modPath: string, depth: 'quick' | 'standard' | 'deep', progressCallback?: any) => ipcRenderer.invoke('asset-validation:validate-mod', modPath, depth, progressCallback),
  assetValidateNIF: (nifPath: string) => ipcRenderer.invoke('asset-validation:validate-nif', nifPath),
  assetValidateDDS: (ddsPath: string) => ipcRenderer.invoke('asset-validation:validate-dds', ddsPath),
  assetValidateESP: (espPath: string) => ipcRenderer.invoke('asset-validation:validate-esp', espPath),
  assetValidateScript: (pscPath: string) => ipcRenderer.invoke('asset-validation:validate-script', pscPath),
  assetValidateSound: (wavPath: string) => ipcRenderer.invoke('asset-validation:validate-sound', wavPath),
  assetValidateBatch: (files: string[], progressCallback?: any) => ipcRenderer.invoke('asset-validation:batch-validate', files, progressCallback),
  assetValidationAutoFix: (issues: any[]) => ipcRenderer.invoke('asset-validation:auto-fix', issues),
  // Asset Validator (alternative namespace)
  assetValidatorValidateFile: (filePath: string, type: string) => ipcRenderer.invoke('asset-validator:validate-file', filePath, type),
  assetValidatorValidateMod: (modPath: string, depth: 'quick' | 'standard' | 'deep') => ipcRenderer.invoke('asset-validator:validate-mod', modPath, depth),
  assetValidatorAutoFix: (issues: any[]) => ipcRenderer.invoke('asset-validator:auto-fix', issues),
  assetValidatorExportReport: (report: any, format: 'json' | 'html') => ipcRenderer.invoke('asset-validator:export-report', report, format),
  // Mod Packaging
  modPackagingStart: (modPath: string) => ipcRenderer.invoke('mod-packaging:start', modPath),
  modPackagingValidateStructure: (modPath: string) => ipcRenderer.invoke('mod-packaging:validate-structure', modPath),
  modPackagingCreateArchive: (settings: any) => ipcRenderer.invoke('mod-packaging:create-archive', settings),
  modPackagingGenerateReadme: (modInfo: any, template: string) => ipcRenderer.invoke('mod-packaging:generate-readme', modInfo, template),
  // Documentation generator wrappers (convenience)
  generateProjectDocs: (projectPath: string) => ipcRenderer.invoke('docs:generate-project', projectPath),
  generateReadme: (projectData: any, template?: string) => ipcRenderer.invoke('docs:generate-readme', projectData, template),
  generateAPIDoc: (code: string, language: string) => ipcRenderer.invoke('docs:generate-api', code, language),
  documentAssets: (assetFolder: string) => ipcRenderer.invoke('docs:document-assets', assetFolder),
  generateWiki: (project: any) => ipcRenderer.invoke('docs:generate-wiki', project),
  exportDocumentation: (doc: any, format: string) => ipcRenderer.invoke('docs:export', doc, format),
  modPackagingAppendChangelog: (changelogPath: string, version: string, changes: string[]) => ipcRenderer.invoke('mod-packaging:append-changelog', changelogPath, version, changes),
  modPackagingPrepareNexus: (modPackage: any) => ipcRenderer.invoke('mod-packaging:prepare-nexus', modPackage),
  modPackagingIncrementVersion: (currentVersion: string, type: 'major' | 'minor' | 'patch') => ipcRenderer.invoke('mod-packaging:increment-version', currentVersion, type),
  modPackagingGetSession: (sessionId: string) => ipcRenderer.invoke('mod-packaging:get-session', sessionId),
  modPackagingUpdateSession: (sessionId: string, updates: any) => ipcRenderer.invoke('mod-packaging:update-session', sessionId, updates),
  // FOMOD Builder
  fomodCreate: (modPath: string, modInfo?: any) => ipcRenderer.invoke('fomod:create', modPath, modInfo),
  fomodGenerateModuleConfig: (fomod: any) => ipcRenderer.invoke('fomod:generate-module-config', fomod),
  fomodGenerateInfoXML: (modInfo: any) => ipcRenderer.invoke('fomod:generate-info-xml', modInfo),
  fomodValidate: (fomodPath: string) => ipcRenderer.invoke('fomod:validate', fomodPath),
  fomodPreview: (fomod: any, selections?: Map<string, string[]>) => ipcRenderer.invoke('fomod:preview', fomod, selections),
  fomodExport: (fomod: any, outputPath: string, sourceModPath: string) => ipcRenderer.invoke('fomod:export', fomod, outputPath, sourceModPath),
  fomodLoad: (fomodPath: string) => ipcRenderer.invoke('fomod:load', fomodPath),
  fomodSaveProject: (fomod: any, projectPath: string) => ipcRenderer.invoke('fomod:save-project', fomod, projectPath),
  // Load Order Optimizer
  loadOrderAnalyze: (plugins: any[]) => ipcRenderer.invoke('load-order:analyze', plugins),
  loadOrderOptimize: (plugins: any[], rules: any) => ipcRenderer.invoke('load-order:optimize', plugins, rules),
  loadOrderDetectConflicts: (plugins: any[]) => ipcRenderer.invoke('load-order:detect-conflicts', plugins),
  loadOrderResolveDependencies: (plugins: any[]) => ipcRenderer.invoke('load-order:resolve-dependencies', plugins),
  loadOrderPredictPerformance: (plugins: any[]) => ipcRenderer.invoke('load-order:predict-performance', plugins),
  loadOrderApplyRules: (plugins: any[], rules: any[]) => ipcRenderer.invoke('load-order:apply-rules', plugins, rules),
  loadOrderImport: (source: 'mo2' | 'vortex', sourcePath?: string) => ipcRenderer.invoke('load-order:import', source, sourcePath),
  loadOrderExport: (plugins: any[], destination: 'mo2' | 'vortex', destPath?: string) => ipcRenderer.invoke('load-order:export', plugins, destination, destPath),
  loadOrderParsePlugin: (pluginPath: string) => ipcRenderer.invoke('load-order:parse-plugin', pluginPath),
  loadOrderSaveOptimization: (optimization: any, filePath: string) => ipcRenderer.invoke('load-order:save-optimization', optimization, filePath),
  pickMo2ProfileDir: () => ipcRenderer.invoke('load-order-pick-mo2-profile-dir'),
  pickVortexProfileDir: () => ipcRenderer.invoke('load-order-pick-vortex-profile-dir'),
  conflictAnalyze: (plugins: string[]) => ipcRenderer.invoke('conflict-resolution:analyze', plugins),
  conflictCompareRecords: (pluginA: string, pluginB: string, recordIdentifier: string) => ipcRenderer.invoke('conflict-resolution:compare-records', pluginA, pluginB, recordIdentifier),
  conflictGeneratePatch: (conflicts: any[], strategy: any) => ipcRenderer.invoke('conflict-resolution:generate-patch', conflicts, strategy),
  conflictCheckCompatibility: (modA: string, modB: string) => ipcRenderer.invoke('conflict-resolution:check-compatibility', modA, modB),
  conflictRecommendMerge: (plugins: string[]) => ipcRenderer.invoke('conflict-resolution:recommend-merge', plugins),
  conflictApplyRules: (conflicts: any[], rules: any[]) => ipcRenderer.invoke('conflict-resolution:apply-rules', conflicts, rules),
  conflictSavePatch: (patch: any, outputPath: string) => ipcRenderer.invoke('conflict-resolution:save-patch', patch, outputPath),

  // Game Integration
  gameDetectGame: () => ipcRenderer.invoke('game-integration:detect-game'),
  gameExecuteConsoleCommand: (command: string, game: string) => ipcRenderer.invoke('game-integration:console-command', command, game),
  gameAnalyzeSave: (savePath: string) => ipcRenderer.invoke('game-integration:analyze-save', savePath),
  gameGetActiveMods: (game: any) => ipcRenderer.invoke('game-integration:get-active-mods', game),
  gameStartMonitoring: (pid: number) => ipcRenderer.invoke('game-integration:start-monitoring', pid),
  gameCaptureScreenshot: () => ipcRenderer.invoke('game-integration:screenshot'),
  gameInjectPlugin: (dllPath: string, game: any) => ipcRenderer.invoke('game-integration:inject-plugin', dllPath, game),

  // Quest Editor helpers
  createQuest: (name: string, type?: string, description?: string) => ipcRenderer.invoke('quest-editor:create-quest', name, type, description),
  loadQuest: (espPath: string | undefined, questId: string) => ipcRenderer.invoke('quest-editor:load-quest', espPath, questId),
  saveQuest: (quest: any, espPath?: string) => ipcRenderer.invoke('quest-editor:save-quest', quest, espPath),
  addQuestStage: (quest: any, stage: any) => ipcRenderer.invoke('quest-editor:add-stage', quest, stage),
  generateQuestScript: (quest: any) => ipcRenderer.invoke('quest-editor:generate-script', quest),
  createDialogueBranch: (npc: string, topic: string, questId?: string) => ipcRenderer.invoke('quest-editor:create-dialogue', npc, topic, questId),
  validateQuest: (quest: any) => ipcRenderer.invoke('quest-editor:validate', quest),
  simulateQuest: (quest: any, choices?: any[]) => ipcRenderer.invoke('quest-editor:simulate', quest, choices),

  // Cell Editor helpers
  loadCell: (espPath: string | undefined, cellId: string) => ipcRenderer.invoke('cell-editor:load-cell', espPath, cellId),
  saveCell: (cell: any, espPath?: string) => ipcRenderer.invoke('cell-editor:save-cell', cell, espPath),
  createCell: (name: string, type?: string) => ipcRenderer.invoke('cell-editor:create-cell', name, type),
  placeObject: (cell: any, baseObject: string, position: any, rotation: any) => ipcRenderer.invoke('cell-editor:place-object', cell, baseObject, position, rotation),
  moveObject: (refId: string, position: any) => ipcRenderer.invoke('cell-editor:move-object', refId, position),
  deleteObject: (refId: string) => ipcRenderer.invoke('cell-editor:delete-object', refId),
  duplicateObject: (refId: string, offset: any) => ipcRenderer.invoke('cell-editor:duplicate-object', refId, offset),
  generateNavmesh: (cell: any, settings?: any) => ipcRenderer.invoke('cell-editor:generate-navmesh', cell, settings),
  editNavmesh: (navmesh: any, triangles: any[]) => ipcRenderer.invoke('cell-editor:edit-navmesh', navmesh, triangles),
  finalizeNavmesh: (navmesh: any) => ipcRenderer.invoke('cell-editor:finalize-navmesh', navmesh),
  placeLight: (cell: any, light: any) => ipcRenderer.invoke('cell-editor:place-light', cell, light),
  bakeAO: (cell: any) => ipcRenderer.invoke('cell-editor:bake-ao', cell),
  generateCollision: (staticCollection: any[]) => ipcRenderer.invoke('cell-editor:generate-collision', staticCollection),
  generateOcclusionPlanes: (cell: any) => ipcRenderer.invoke('cell-editor:generate-occlusion-planes', cell),
  createCombinedMesh: (references: any[]) => ipcRenderer.invoke('cell-editor:create-combined-mesh', references),

  // Audio Editor (renderer -> main)
  audioEditor: {
    convertToXWM: (wavPath: string, quality?: number) => ipcRenderer.invoke('audio-editor:convert-to-xwm', wavPath, quality),
    convertToFUZ: (wavPath: string, lipPath?: string) => ipcRenderer.invoke('audio-editor:convert-to-fuz', wavPath, lipPath),
    batchConvertAudio: (files: string[], format: string) => ipcRenderer.invoke('audio-editor:batch-convert', files, format),
    generateLipSync: (wavPath: string, text: string) => ipcRenderer.invoke('audio-editor:generate-lipsync', wavPath, text),
    phonemeAnalysis: (wavPath: string) => ipcRenderer.invoke('audio-editor:phoneme-analysis', wavPath),
    createMusicTrack: (name: string, layers: any[], type?: string) => ipcRenderer.invoke('audio-editor:create-music-track', name, layers, type),
    setMusicConditions: (track: any, conditions: any[]) => ipcRenderer.invoke('audio-editor:set-music-conditions', track, conditions),
    createMusicPlaylist: (tracks: string[], transitionType?: string, transitionDuration?: number, shuffle?: boolean) => ipcRenderer.invoke('audio-editor:create-playlist', tracks, transitionType, transitionDuration, shuffle),
    createSoundDescriptor: (sound: any) => ipcRenderer.invoke('audio-editor:create-descriptor', sound),
    set3DAttenuation: (descriptorId: string, curve: any) => ipcRenderer.invoke('audio-editor:set-3d-attenuation', descriptorId, curve),
    playAudio: (audioPath: string) => ipcRenderer.invoke('audio-editor:play-audio', audioPath),
    stopAudio: () => ipcRenderer.invoke('audio-editor:stop-audio'),
    createAmbientSound: (sounds: string[], layering: string) => ipcRenderer.invoke('audio-editor:create-ambient', sounds, layering),
    normalizeVolume: (audioFiles: string[]) => ipcRenderer.invoke('audio-editor:normalize-volume', audioFiles),
    removeNoise: (audioPath: string, strength?: number) => ipcRenderer.invoke('audio-editor:remove-noise', audioPath, strength),
    applyEffect: (audioPath: string, effect: any) => ipcRenderer.invoke('audio-editor:apply-effect', audioPath, effect),
  },

  // Testing Suite (renderer -> main)
  testingSuite: {
    createTestSuite: (suiteName: string, config?: any) => ipcRenderer.invoke('testing:create-test-suite', suiteName, config),
    runAllTests: (suiteId: string) => ipcRenderer.invoke('testing:run-all-tests', suiteId),
    runSingleTest: (suiteId: string, testId: string) => ipcRenderer.invoke('testing:run-single-test', suiteId, testId),
    testLoadOrder: (loadOrderPath: string) => ipcRenderer.invoke('testing:test-load-order', loadOrderPath),
    testScriptCompilation: (scriptPath: string) => ipcRenderer.invoke('testing:test-script-compilation', scriptPath),
    testAssetIntegrity: (assetPath: string) => ipcRenderer.invoke('testing:test-asset-integrity', assetPath),
    benchmarkPerformance: (profileName?: string) => ipcRenderer.invoke('testing:benchmark-performance', profileName),
    generateTestReport: (resultId: string) => ipcRenderer.invoke('testing:generate-test-report', resultId),
    getTestHistory: (suiteId: string, limit?: number) => ipcRenderer.invoke('testing:get-test-history', suiteId, limit),
    saveTestResults: (testData: any) => ipcRenderer.invoke('testing:save-test-results', testData),
  },

  // Platform 15: Advanced Workflow Automation API
  workflowAutomation: {
    createWorkflow: (workflowName: string, description?: string, tags?: string[]) => ipcRenderer.invoke('workflow:create-workflow', workflowName, description, tags),
    saveWorkflow: (workflowId: string, updates: any) => ipcRenderer.invoke('workflow:save-workflow', workflowId, updates),
    loadWorkflow: (workflowId: string) => ipcRenderer.invoke('workflow:load-workflow', workflowId),
    deleteWorkflow: (workflowId: string) => ipcRenderer.invoke('workflow:delete-workflow', workflowId),
    runWorkflow: (workflowId: string) => ipcRenderer.invoke('workflow:run-workflow', workflowId),
    getWorkflows: () => ipcRenderer.invoke('workflow:get-workflows'),
    exportWorkflow: (workflowId: string) => ipcRenderer.invoke('workflow:export-workflow', workflowId),
    importWorkflow: (importJson: string) => ipcRenderer.invoke('workflow:import-workflow', importJson),
    getWorkflowHistory: (workflowId?: string, limit?: number) => ipcRenderer.invoke('workflow:get-workflow-history', workflowId, limit),
    validateWorkflow: (workflowId: string) => ipcRenderer.invoke('workflow:validate-workflow', workflowId),
  },

  // Platform 16: Advanced Analytics & Reporting API
  analyticsReporting: {
    trackEvent: (eventName: string, category?: string, properties?: Record<string, any>) => ipcRenderer.invoke('analytics:track-event', eventName, category, properties),
    getMetricsSummary: () => ipcRenderer.invoke('analytics:get-metrics-summary'),
    getBuildStatistics: () => ipcRenderer.invoke('analytics:build-statistics'),
    getAssetUsageReport: () => ipcRenderer.invoke('analytics:asset-usage-report'),
    getPerformanceHistory: () => ipcRenderer.invoke('analytics:performance-history'),
    generateReport: (reportType?: string, timeRange?: any) => ipcRenderer.invoke('analytics:generate-report', reportType, timeRange),
    getDashboardData: () => ipcRenderer.invoke('analytics:get-dashboard-data'),
    exportReport: (reportId: string, format?: string) => ipcRenderer.invoke('analytics:export-report', reportId, format),
    getAnalyticsConfig: () => ipcRenderer.invoke('analytics:get-analytics-config'),
    updateAnalyticsConfig: (updates: any) => ipcRenderer.invoke('analytics:update-analytics-config', updates),
  },

  // Platform 17: Git Integration API
  gitIntegration: {
    initRepo: (repoPath: string, repoName?: string) => ipcRenderer.invoke('git:init-repo', repoPath, repoName),
    commit: (repoId: string, message: string, author?: string) => ipcRenderer.invoke('git:commit', repoId, message, author),
    push: (repoId: string, remoteName?: string, branch?: string) => ipcRenderer.invoke('git:push', repoId, remoteName, branch),
    pull: (repoId: string, remoteName?: string, branch?: string) => ipcRenderer.invoke('git:pull', repoId, remoteName, branch),
    createBranch: (repoId: string, branchName: string, baseBranch?: string) => ipcRenderer.invoke('git:create-branch', repoId, branchName, baseBranch),
    switchBranch: (repoId: string, branchName: string) => ipcRenderer.invoke('git:switch-branch', repoId, branchName),
    getBranches: (repoId?: string) => ipcRenderer.invoke('git:get-branches', repoId),
    getDiff: (repoId: string, fromCommit?: string, toCommit?: string) => ipcRenderer.invoke('git:get-diff', repoId, fromCommit, toCommit),
    mergeBranch: (repoId: string, sourceBranch: string, targetBranch?: string) => ipcRenderer.invoke('git:merge-branch', repoId, sourceBranch, targetBranch),
    getHistory: (repoId?: string, limit?: number) => ipcRenderer.invoke('git:get-history', repoId, limit),
  },

  // Platform 18: Nexus Mods Auto-Uploader API
  nexusUploader: {
    initConfig: (apiKey?: string, apiUrl?: string) => ipcRenderer.invoke('nexus:init-config', apiKey, apiUrl),
    authenticate: (apiKey: string) => ipcRenderer.invoke('nexus:authenticate', apiKey),
    getGameInfo: (gameName?: string) => ipcRenderer.invoke('nexus:get-game-info', gameName),
    createMod: (modName: string, description?: string, category?: string) => ipcRenderer.invoke('nexus:create-mod', modName, description, category),
    updateMod: (modId: string, updates: any) => ipcRenderer.invoke('nexus:update-mod', modId, updates),
    uploadFile: (modId: string, filePath: string, version?: string) => ipcRenderer.invoke('nexus:upload-file', modId, filePath, version),
    publishMod: (modId: string, publishNow?: boolean) => ipcRenderer.invoke('nexus:publish-mod', modId, publishNow),
    getUploadHistory: (modId?: string, limit?: number) => ipcRenderer.invoke('nexus:get-upload-history', modId, limit),
    getModStats: (modId: string) => ipcRenderer.invoke('nexus:get-mod-stats', modId),
    generateChangelog: (modId: string, fromVersion?: string, toVersion?: string) => ipcRenderer.invoke('nexus:generate-changelog', modId, fromVersion, toVersion),
  },

  // Platform 19: Interactive Tutorial System API
  interactiveTutorials: {
    createSession: (tutorialId: string, title?: string) => ipcRenderer.invoke('tutorial:create-session', tutorialId, title),
    getProgress: (sessionId: string) => ipcRenderer.invoke('tutorial:get-progress', sessionId),
    completeStep: (sessionId: string, stepNumber: number) => ipcRenderer.invoke('tutorial:complete-step', sessionId, stepNumber),
    getTutorials: () => ipcRenderer.invoke('tutorial:get-tutorials'),
    getTutorialContent: (tutorialId: string) => ipcRenderer.invoke('tutorial:get-tutorial-content', tutorialId),
    skipTutorial: (sessionId: string) => ipcRenderer.invoke('tutorial:skip-tutorial', sessionId),
    getRecommendations: (userLevel?: string) => ipcRenderer.invoke('tutorial:get-recommendations', userLevel),
    saveProgress: (sessionId: string) => ipcRenderer.invoke('tutorial:save-progress', sessionId),
    resetProgress: (sessionId?: string) => ipcRenderer.invoke('tutorial:reset-progress', sessionId),
    getTutorialStats: (tutorialId?: string) => ipcRenderer.invoke('tutorial:get-tutorial-stats', tutorialId),
  },

  aiTextureEnhancer: {
    initEnhancer: (filterName?: string, gpuEnabled?: boolean) => ipcRenderer.invoke('enhance:init-enhancer', filterName, gpuEnabled),
    loadFilters: () => ipcRenderer.invoke('enhance:load-filters'),
    getFilterInfo: (filterId: string) => ipcRenderer.invoke('enhance:get-filter-info', filterId),
    startEnhance: (inputPath: string, outputPath?: string, filterId?: string) => ipcRenderer.invoke('enhance:start-enhance', inputPath, outputPath, filterId),
    enhanceBatch: (inputPaths: string[], filterId?: string) => ipcRenderer.invoke('enhance:enhance-batch', inputPaths, filterId),
    getEnhancementProgress: (sessionId: string) => ipcRenderer.invoke('enhance:get-enhancement-progress', sessionId),
    cancelEnhancement: (sessionId: string) => ipcRenderer.invoke('enhance:cancel-enhancement', sessionId),
    getEnhancementHistory: (limit?: number) => ipcRenderer.invoke('enhance:get-enhancement-history', limit),
    compareEnhancements: (beforePath: string, afterPath: string) => ipcRenderer.invoke('enhance:compare-enhancements', beforePath, afterPath),
    exportEnhanced: (sessionId: string, format?: string) => ipcRenderer.invoke('enhance:export-enhanced', sessionId, format),
  },

  aiVoiceGeneration: {
    initTts: (voiceProfile?: string, gpuEnabled?: boolean) => ipcRenderer.invoke('voice:init-tts', voiceProfile, gpuEnabled),
    loadVoiceProfiles: () => ipcRenderer.invoke('voice:load-voice-profiles'),
    getVoiceProfileInfo: (profileId: string) => ipcRenderer.invoke('voice:get-voice-profile-info', profileId),
    generateVoice: (text: string, profileId?: string, emotion?: string) => ipcRenderer.invoke('voice:generate-voice', text, profileId, emotion),
    generateBatchDialogue: (dialogueList: Array<{text: string, profileId?: string}>) => ipcRenderer.invoke('voice:generate-batch-dialogue', dialogueList),
    getGenerationProgress: (sessionId: string) => ipcRenderer.invoke('voice:get-generation-progress', sessionId),
    cloneVoiceProfile: (audioSamplePath: string, profileName: string) => ipcRenderer.invoke('voice:clone-voice-profile', audioSamplePath, profileName),
    generateLipsync: (sessionId: string, animationFormat?: string) => ipcRenderer.invoke('voice:generate-lipsync', sessionId, animationFormat),
    getVoiceHistory: (limit?: number) => ipcRenderer.invoke('voice:get-voice-history', limit),
    exportVoiceAudio: (sessionId: string, format?: string) => ipcRenderer.invoke('voice:export-voice-audio', sessionId, format),
  },

  modDependencyManager: {
    addModDependency: (modName: string, dependencies: Array<{name: string, version?: string}>) => ipcRenderer.invoke('deps:add-mod-dependency', modName, dependencies),
    getModDependencies: (modName: string) => ipcRenderer.invoke('deps:get-mod-dependencies', modName),
    detectConflicts: () => ipcRenderer.invoke('deps:detect-conflicts'),
    resolveConflict: (conflictId: string, resolution: string) => ipcRenderer.invoke('deps:resolve-conflict', conflictId, resolution),
    getConflictReport: (limit?: number) => ipcRenderer.invoke('deps:get-conflict-report', limit),
    optimizeLoadOrder: (modList: string[]) => ipcRenderer.invoke('deps:optimize-load-order', modList),
    validateDependencies: (modName: string) => ipcRenderer.invoke('deps:validate-dependencies', modName),
    exportDependencyList: (format?: string) => ipcRenderer.invoke('deps:export-dependency-list', format),
    importDependencyList: (importPath: string, format?: string) => ipcRenderer.invoke('deps:import-dependency-list', importPath, format),
    getDependencyStats: () => ipcRenderer.invoke('deps:get-dependency-stats'),
  },

  releaseAutomation: {
    createReleasePackage: (modName: string, version: string, files: string[]) => ipcRenderer.invoke('release:create-release-package', modName, version, files),
    generateChangelog: (modName: string, version: string, changes: string[]) => ipcRenderer.invoke('release:generate-changelog', modName, version, changes),
    bumpVersion: (modName: string, currentVersion: string, bumpType?: string) => ipcRenderer.invoke('release:bump-version', modName, currentVersion, bumpType),
    createReleaseNotes: (modName: string, version: string, changelog: string, highlights?: string[]) => ipcRenderer.invoke('release:create-release-notes', modName, version, changelog, highlights),
    validateRelease: (packageId: string) => ipcRenderer.invoke('release:validate-release', packageId),
    publishToNexus: (packageId: string, nexusModId: string, releaseNotes?: string) => ipcRenderer.invoke('release:publish-to-nexus', packageId, nexusModId, releaseNotes),
    getReleaseHistory: (modName: string, limit?: number) => ipcRenderer.invoke('release:get-release-history', modName, limit),
    manageReleaseTags: (packageId: string, tags: string[], action?: string) => ipcRenderer.invoke('release:manage-release-tags', packageId, tags, action),
    exportRelease: (packageId: string, format?: string) => ipcRenderer.invoke('release:export-release', packageId, format),
    scheduleRelease: (packageId: string, releaseDate: number, timezone?: string) => ipcRenderer.invoke('release:schedule-release', packageId, releaseDate, timezone),
  },

  assetIntegrityAuditor: {
    scanNifMesh: (filePath: string, modName?: string) => ipcRenderer.invoke('audit:scan-nif-mesh', filePath, modName),
    scanDdsTexture: (filePath: string, modName?: string) => ipcRenderer.invoke('audit:scan-dds-texture', filePath, modName),
    scanEspPlugin: (filePath: string, modName?: string) => ipcRenderer.invoke('audit:scan-esp-plugin', filePath, modName),
    validatePapyrusScripts: (scriptContent: string, modName?: string) => ipcRenderer.invoke('audit:validate-papyrus-scripts', scriptContent, modName),
    checkAudioCompatibility: (filePath: string, modName?: string) => ipcRenderer.invoke('audit:check-audio-compatibility', filePath, modName),
    generateReport: (modName: string, auditIds: string[]) => ipcRenderer.invoke('audit:generate-report', modName, auditIds),
    getAuditHistory: (modName: string, limit?: number) => ipcRenderer.invoke('audit:get-audit-history', modName, limit),
    exportAuditData: (reportId: string, format?: string) => ipcRenderer.invoke('audit:export-audit-data', reportId, format),
    compareVersions: (modName: string, version1Id: string, version2Id: string) => ipcRenderer.invoke('audit:compare-versions', modName, version1Id, version2Id),
    batchScanAssets: (modName: string, assetPaths: string[], assetTypes?: string[]) => ipcRenderer.invoke('audit:batch-scan-assets', modName, assetPaths, assetTypes),
  },

  scriptingAssistant: {
    getTemplate: (templateType: string) => ipcRenderer.invoke('codeGenerator:get-template', templateType),
    generateStub: (functionName: string, parameters?: any[], returnType?: string) => ipcRenderer.invoke('codeGenerator:generate-stub', functionName, parameters, returnType),
    validateSyntax: (scriptContent: string) => ipcRenderer.invoke('codeGenerator:validate-syntax', scriptContent),
    getSnippets: (category?: string) => ipcRenderer.invoke('codeGenerator:get-snippets', category),
    generateEventHandlers: (scriptType: string, events?: string[]) => ipcRenderer.invoke('codeGenerator:generate-event-handlers', scriptType, events),
    formatScript: (scriptContent: string) => ipcRenderer.invoke('codeGenerator:format-script', scriptContent),
    getDocumentation: (functionName: string, category?: string) => ipcRenderer.invoke('codeGenerator:get-documentation', functionName, category),
    generateFromSpec: (specification: string, scriptType?: string) => ipcRenderer.invoke('codeGenerator:generate-from-spec', specification, scriptType),
    optimizeScript: (scriptContent: string) => ipcRenderer.invoke('codeGenerator:optimize-script', scriptContent),
    testInSandbox: (scriptContent: string, testParams?: any) => ipcRenderer.invoke('codeGenerator:test-in-sandbox', scriptContent, testParams),
  },

  performanceProfiler: {
    startMonitoring: (sessionName?: string) => ipcRenderer.invoke('perf:start-monitoring', sessionName),
    getFpsMetrics: (sessionId: string) => ipcRenderer.invoke('perf:get-fps-metrics', sessionId),
    analyzeMemory: (sessionId: string, threshold?: number) => ipcRenderer.invoke('perf:analyze-memory', sessionId, threshold),
    measureLoadTime: (modPath: string) => ipcRenderer.invoke('perf:measure-load-time', modPath),
    detectBottlenecks: (sessionId: string) => ipcRenderer.invoke('perf:detect-bottlenecks', sessionId),
    suggestOptimizations: (sessionId: string) => ipcRenderer.invoke('perf:suggest-optimizations', sessionId),
    compareSessions: (session1Id: string, session2Id: string) => ipcRenderer.invoke('perf:compare-sessions', session1Id, session2Id),
    exportReport: (sessionId: string, format?: string) => ipcRenderer.invoke('perf:export-report', sessionId, format),
    stopMonitoring: (sessionId: string) => ipcRenderer.invoke('perf:stop-monitoring', sessionId),
    getSessionHistory: (limit?: number) => ipcRenderer.invoke('perf:get-session-history', limit),
  },

  modlistManager: {
    createModlist: (listName: string, description?: string) => ipcRenderer.invoke('modlist:create-modlist', listName, description),
    addModToList: (modlistId: string, modEntry: any) => ipcRenderer.invoke('modlist:add-mod-to-list', modlistId, modEntry),
    removeModFromList: (modlistId: string, modId: string) => ipcRenderer.invoke('modlist:remove-mod-from-list', modlistId, modId),
    getModlist: (modlistId: string) => ipcRenderer.invoke('modlist:get-modlist', modlistId),
    exportModlist: (modlistId: string, format?: string) => ipcRenderer.invoke('modlist:export-modlist', modlistId, format),
    importModlist: (importPath: string, listName?: string) => ipcRenderer.invoke('modlist:import-modlist', importPath, listName),
    validateModlist: (modlistId: string) => ipcRenderer.invoke('modlist:validate-modlist', modlistId),
    getModlistStats: (modlistId: string) => ipcRenderer.invoke('modlist:get-modlist-stats', modlistId),
    shareModlist: (modlistId: string, platform?: string) => ipcRenderer.invoke('modlist:share-modlist', modlistId, platform),
    compareModlists: (modlist1Id: string, modlist2Id: string) => ipcRenderer.invoke('modlist:compare-modlists', modlist1Id, modlist2Id),
  },

  conflictResolutionEngine: {
    scanForConflicts: (modlistId: string) => ipcRenderer.invoke('conflict:scan-for-conflicts', modlistId),
    detectPluginConflicts: (modlistId: string) => ipcRenderer.invoke('conflict:detect-plugin-conflicts', modlistId),
    detectAssetConflicts: (modlistId: string) => ipcRenderer.invoke('conflict:detect-asset-conflicts', modlistId),
    detectScriptConflicts: (modlistId: string) => ipcRenderer.invoke('conflict:detect-script-conflicts', modlistId),
    suggestConflictResolution: (conflictId: string) => ipcRenderer.invoke('conflict:suggest-conflict-resolution', conflictId),
    autoResolveConflicts: (conflictId: string, strategy?: string) => ipcRenderer.invoke('conflict:auto-resolve-conflicts', conflictId, strategy),
    generatePatch: (conflictId: string, patchType?: string) => ipcRenderer.invoke('conflict:generate-patch', conflictId, patchType),
    validateResolution: (resolutionId: string) => ipcRenderer.invoke('conflict:validate-resolution', resolutionId),
    getConflictReport: (scanId: string) => ipcRenderer.invoke('conflict:get-conflict-report', scanId),
    exportConflictData: (scanId: string, format?: string) => ipcRenderer.invoke('conflict:export-conflict-data', scanId, format),
  },

  advancedTroubleshooting: {
    analyzeCrashLog: (logPath: string) => ipcRenderer.invoke('diag:analyze-crash-log', logPath),
    diagnoseCTDIssues: (modlistId: string) => ipcRenderer.invoke('diag:diagnose-ctd-issues', modlistId),
    checkModCompatibility: (mod1: string, mod2: string) => ipcRenderer.invoke('diag:check-mod-compatibility', mod1, mod2),
    generateDiagnosticsReport: (modlistId: string) => ipcRenderer.invoke('diag:generate-diagnostics-report', modlistId),
    suggestTroubleshootingSteps: (issue: string) => ipcRenderer.invoke('diag:suggest-troubleshooting-steps', issue),
    testGameStability: (modlistId: string, duration?: number) => ipcRenderer.invoke('diag:test-game-stability', modlistId, duration),
    debugScriptErrors: (scriptContent: string, modName?: string) => ipcRenderer.invoke('diag:debug-script-errors', scriptContent, modName),
    analyzeLoadOrderIssues: (loadOrder: string[]) => ipcRenderer.invoke('diag:analyze-load-order-issues', loadOrder),
    runSystemDiagnostics: () => ipcRenderer.invoke('diag:run-system-diagnostics'),
    generateTroubleshootingGuide: (issue: string, modlistId?: string) => ipcRenderer.invoke('diag:generate-troubleshooting-guide', issue, modlistId),
  },

  loadOrderOptimizer: {
    analyzeLoadOrder: (loadOrder: string[]) => ipcRenderer.invoke('loadorder:analyze-load-order', loadOrder),
    suggestOptimalOrder: (loadOrder: string[], conflictMap?: any) => ipcRenderer.invoke('loadorder:suggest-optimal-order', loadOrder, conflictMap),
    detectMasterDependencies: (pluginName: string) => ipcRenderer.invoke('loadorder:detect-master-dependencies', pluginName),
    prioritizePlugins: (loadOrder: string[], priorityMap?: any) => ipcRenderer.invoke('loadorder:prioritize-plugins', loadOrder, priorityMap),
    validateLoadOrderIntegrity: (loadOrder: string[]) => ipcRenderer.invoke('loadorder:validate-load-order-integrity', loadOrder),
    compareLoadOrders: (loadOrder1: string[], loadOrder2: string[]) => ipcRenderer.invoke('loadorder:compare-load-orders', loadOrder1, loadOrder2),
    exportLoadOrder: (loadOrder: string[], format?: string) => ipcRenderer.invoke('loadorder:export-load-order', loadOrder, format),
    importLoadOrder: (filePath: string, mergeMode?: string) => ipcRenderer.invoke('loadorder:import-load-order', filePath, mergeMode),
    autoOptimizeLoadOrder: (loadOrder: string[], strategy?: string) => ipcRenderer.invoke('loadorder:auto-optimize-load-order', loadOrder, strategy),
    getLoadOrderStatistics: (loadOrder: string[]) => ipcRenderer.invoke('loadorder:get-load-order-statistics', loadOrder),
  },

  papyrusCompiler: {
    compileScript: (scriptPath: string, flags?: string) => ipcRenderer.invoke('papyrus:compile-script', scriptPath, flags),
    batchCompile: (scriptFolder: string, flags?: string) => ipcRenderer.invoke('papyrus:batch-compile', scriptFolder, flags),
    validateSyntax: (scriptContent: string) => ipcRenderer.invoke('papyrus:validate-syntax', scriptContent),
    generateDebugInfo: (scriptPath: string) => ipcRenderer.invoke('papyrus:generate-debug-info', scriptPath),
    profileScriptPerformance: (scriptPath: string) => ipcRenderer.invoke('papyrus:profile-script-performance', scriptPath),
    detectScriptIssues: (scriptContent: string) => ipcRenderer.invoke('papyrus:detect-script-issues', scriptContent),
    getCompilerVersion: () => ipcRenderer.invoke('papyrus:get-compiler-version'),
    configureCompiler: (config: any) => ipcRenderer.invoke('papyrus:configure-compiler', config),
    analyzeCompilationReport: (reportPath: string) => ipcRenderer.invoke('papyrus:analyze-compilation-report', reportPath),
    exportCompilationStats: (format?: string) => ipcRenderer.invoke('papyrus:export-compilation-stats', format),
  },

  archiveManager: {
    createArchive: (archivePath: string, fileList: string[], archiveType?: string) => ipcRenderer.invoke('archive:create-archive', archivePath, fileList, archiveType),
    extractArchive: (archivePath: string, extractPath?: string) => ipcRenderer.invoke('archive:extract-archive', archivePath, extractPath),
    listArchiveContents: (archivePath: string) => ipcRenderer.invoke('archive:list-archive-contents', archivePath),
    validateArchiveIntegrity: (archivePath: string) => ipcRenderer.invoke('archive:validate-archive-integrity', archivePath),
    addFilesToArchive: (archivePath: string, filePaths: string[]) => ipcRenderer.invoke('archive:add-files-to-archive', archivePath, filePaths),
    removeFilesFromArchive: (archivePath: string, fileNames: string[]) => ipcRenderer.invoke('archive:remove-files-from-archive', archivePath, fileNames),
    convertArchiveFormat: (archivePath: string, targetFormat: string) => ipcRenderer.invoke('archive:convert-archive-format', archivePath, targetFormat),
    compressArchive: (archivePath: string, compressionLevel?: number) => ipcRenderer.invoke('archive:compress-archive', archivePath, compressionLevel),
    getArchiveStatistics: (archivePath: string) => ipcRenderer.invoke('archive:get-archive-statistics', archivePath),
    optimizeArchive: (archivePath: string, strategy?: string) => ipcRenderer.invoke('archive:optimize-archive', archivePath, strategy),
  },

  enbPresetManager: {
    createPreset: (presetName: string, settings: any) => ipcRenderer.invoke('enb:create-preset', presetName, settings),
    loadPreset: (presetId: string) => ipcRenderer.invoke('enb:load-preset', presetId),
    exportPreset: (presetId: string, exportPath?: string) => ipcRenderer.invoke('enb:export-preset', presetId, exportPath),
    importPreset: (filePath: string, presetName?: string) => ipcRenderer.invoke('enb:import-preset', filePath, presetName),
    validatePreset: (presetId: string) => ipcRenderer.invoke('enb:validate-preset', presetId),
    applyPresetSettings: (presetId: string) => ipcRenderer.invoke('enb:apply-preset-settings', presetId),
    comparePresets: (presetId1: string, presetId2: string) => ipcRenderer.invoke('enb:compare-presets', presetId1, presetId2),
    deletePreset: (presetId: string) => ipcRenderer.invoke('enb:delete-preset', presetId),
    optimizePresetPerformance: (presetId: string) => ipcRenderer.invoke('enb:optimize-preset-performance', presetId),
    getInstalledPresets: () => ipcRenderer.invoke('enb:get-installed-presets'),
  },

  communityRatings: {
    fetchModRatings: (modId: string) => ipcRenderer.invoke('community:fetch-mod-ratings', modId),
    getReviewsForMod: (modId: string, limit?: number) => ipcRenderer.invoke('community:get-reviews-for-mod', modId, limit),
    submitRating: (modId: string, rating: number, userId?: string) => ipcRenderer.invoke('community:submit-rating', modId, rating, userId),
    submitReview: (modId: string, reviewText: string, rating?: number) => ipcRenderer.invoke('community:submit-review', modId, reviewText, rating),
    getTrendingMods: (limit?: number, category?: string) => ipcRenderer.invoke('community:get-trending-mods', limit, category),
    analyzeRatingTrends: (modId: string, timeframe?: string) => ipcRenderer.invoke('community:analyze-rating-trends', modId, timeframe),
    filterReviewsByCriteria: (modId: string, criteria: any) => ipcRenderer.invoke('community:filter-reviews-by-criteria', modId, criteria),
    getPopularEndorsements: (limit?: number) => ipcRenderer.invoke('community:get-popular-endorsements', limit),
    compareModRatings: (modId1: string, modId2: string) => ipcRenderer.invoke('community:compare-mod-ratings', modId1, modId2),
    exportRatingData: (modId: string, format?: string) => ipcRenderer.invoke('community:export-rating-data', modId, format),
  },

  meshOptimizer: {
    analyzeNifFile: (filePath: string) => ipcRenderer.invoke('mesh:analyze-nif-file', filePath),
    reducePolygonCount: (filePath: string, reductionPercentage?: number) => ipcRenderer.invoke('mesh:reduce-polygon-count', filePath, reductionPercentage),
    optimizeVertexData: (filePath: string, options?: any) => ipcRenderer.invoke('mesh:optimize-vertex-data', filePath, options),
    generateLodMeshes: (filePath: string, lodLevels?: number) => ipcRenderer.invoke('mesh:generate-lod-meshes', filePath, lodLevels),
    removeUnusedData: (filePath: string) => ipcRenderer.invoke('mesh:remove-unused-data', filePath),
    batchOptimizeMeshes: (filePaths: string[], options?: any) => ipcRenderer.invoke('mesh:batch-optimize-meshes', filePaths, options),
    compareOptimizationResults: (beforePath: string, afterPath: string) => ipcRenderer.invoke('mesh:compare-optimization-results', beforePath, afterPath),
    validateMeshIntegrity: (filePath: string) => ipcRenderer.invoke('mesh:validate-mesh-integrity', filePath),
    exportOptimizationReport: (filePath: string, format?: string) => ipcRenderer.invoke('mesh:export-optimization-report', filePath, format),
    getAnalysisSummary: (limit?: number) => ipcRenderer.invoke('mesh:get-analysis-summary', limit),
  },

  animationRetargeting: {
    importAnimationFile: (filePath: string, format?: string) => ipcRenderer.invoke('animation:import-animation-file', filePath, format),
    retargetSkeleton: (animationId: string, targetSkeleton: string) => ipcRenderer.invoke('animation:retarget-skeleton', animationId, targetSkeleton),
    validateBoneStructure: (filePath: string) => ipcRenderer.invoke('animation:validate-bone-structure', filePath),
    blendAnimations: (animationIds: string[], blendMode?: string) => ipcRenderer.invoke('animation:blend-animations', animationIds, blendMode),
    createCustomAnimation: (name: string, frameCount: number, boneData?: any) => ipcRenderer.invoke('animation:create-custom-animation', name, frameCount, boneData),
    exportAnimation: (animationId: string, outputPath: string, format?: string) => ipcRenderer.invoke('animation:export-animation', animationId, outputPath, format),
    batchRetargetAnimations: (animationIds: string[], targetSkeleton: string) => ipcRenderer.invoke('animation:batch-retarget-animations', animationIds, targetSkeleton),
    compareAnimations: (animationId1: string, animationId2: string) => ipcRenderer.invoke('animation:compare-animations', animationId1, animationId2),
    getRetargetingSummary: (limit?: number) => ipcRenderer.invoke('animation:get-retargeting-summary', limit),
    optimizeKeyframes: (animationId: string, tolerance?: number) => ipcRenderer.invoke('animation:optimize-keyframes', animationId, tolerance),
  },

  dialogueManager: {
    createDialogueTree: (npcId: string, dialogueName: string) => ipcRenderer.invoke('dialogue:create-dialogue-tree', npcId, dialogueName),
    addDialogueNode: (treeId: string, nodeData: any) => ipcRenderer.invoke('dialogue:add-dialogue-node', treeId, nodeData),
    addVoiceLine: (nodeId: string, voicePath: string, voiceActor?: string) => ipcRenderer.invoke('dialogue:add-voice-line', nodeId, voicePath, voiceActor),
    setDialogueConditions: (nodeId: string, conditions: any[]) => ipcRenderer.invoke('dialogue:set-dialogue-conditions', nodeId, conditions),
    exportDialogueTree: (treeId: string, format?: string) => ipcRenderer.invoke('dialogue:export-dialogue-tree', treeId, format),
    importDialogueFile: (filePath: string, npcId?: string) => ipcRenderer.invoke('dialogue:import-dialogue-file', filePath, npcId),
    validateDialogueTree: (treeId: string) => ipcRenderer.invoke('dialogue:validate-dialogue-tree', treeId),
    batchImportDialogues: (filePaths: string[]) => ipcRenderer.invoke('dialogue:batch-import-dialogues', filePaths),
    getDialogueSystemStats: (limit?: number) => ipcRenderer.invoke('dialogue:get-dialogue-system-stats', limit),
    compareDialogueTrees: (treeId1: string, treeId2: string) => ipcRenderer.invoke('dialogue:compare-dialogue-trees', treeId1, treeId2),
  },

  textureManager: {
    createMaterialDefinition: (materialName: string, properties?: any) => ipcRenderer.invoke('texture:create-material-definition', materialName, properties),
    createTextureAtlas: (atlasName: string, textureList: string[]) => ipcRenderer.invoke('texture:create-texture-atlas', atlasName, textureList),
    applyMaterialProperties: (materialId: string, properties: any) => ipcRenderer.invoke('texture:apply-material-properties', materialId, properties),
    manageTextureReplacements: (sourceTexture: string, replacementTexture: string) => ipcRenderer.invoke('texture:manage-texture-replacements', sourceTexture, replacementTexture),
    validateMaterialCompatibility: (materialId: string, targetEngine?: string) => ipcRenderer.invoke('texture:validate-material-compatibility', materialId, targetEngine),
    optimizeMaterialPerformance: (materialId: string, targetMemory?: number) => ipcRenderer.invoke('texture:optimize-material-performance', materialId, targetMemory),
    batchProcessMaterials: (materialIds: string[], operation: string) => ipcRenderer.invoke('texture:batch-process-materials', materialIds, operation),
    exportMaterialPackage: (materialId: string, format?: string) => ipcRenderer.invoke('texture:export-material-package', materialId, format),
    getMaterialStatistics: (limit?: number) => ipcRenderer.invoke('texture:get-material-statistics', limit),
    importMaterialPackage: (filePath: string, materialName?: string) => ipcRenderer.invoke('texture:import-material-package', filePath, materialName),
  },

  pluginAnalyzer: {
    analyzePluginFile: (filePath: string) => ipcRenderer.invoke('plugin:analyze-plugin-file', filePath),
    validatePluginReferences: (pluginPath: string) => ipcRenderer.invoke('plugin:validate-plugin-references', pluginPath),
    mergePlugins: (pluginPaths: string[], outputPath: string) => ipcRenderer.invoke('plugin:merge-plugins', pluginPaths, outputPath),
    analyzePluginDependencies: (pluginPath: string) => ipcRenderer.invoke('plugin:analyze-plugin-dependencies', pluginPath),
    detectPluginConflicts: (pluginPaths: string[]) => ipcRenderer.invoke('plugin:detect-plugin-conflicts', pluginPaths),
    optimizePluginLoadOrder: (pluginPaths: string[]) => ipcRenderer.invoke('plugin:optimize-plugin-load-order', pluginPaths),
    generateCompatibilityReport: (pluginPaths: string[], format?: string) => ipcRenderer.invoke('plugin:generate-compatibility-report', pluginPaths, format),
    batchValidatePlugins: (filePaths: string[]) => ipcRenderer.invoke('plugin:batch-validate-plugins', filePaths),
    getPluginManagementStats: (limit?: number) => ipcRenderer.invoke('plugin:get-plugin-management-stats', limit),
    exportPluginAnalysis: (analysisId: string, format?: string) => ipcRenderer.invoke('plugin:export-plugin-analysis', analysisId, format),
  },

  scriptGenerator: {
    generatePapyrusScript: (scriptName: string, scriptType?: string) => ipcRenderer.invoke('papyrusGen:generate-papyrus-script', scriptName, scriptType),
    createEventHandler: (eventName: string, parameters?: string[]) => ipcRenderer.invoke('papyrusGen:create-event-handler', eventName, parameters),
    generatePropertyDefinition: (propertyName: string, propertyType?: string) => ipcRenderer.invoke('papyrusGen:generate-property-definition', propertyName, propertyType),
    createValidationHelper: (helperName: string, validationType?: string) => ipcRenderer.invoke('papyrusGen:create-validation-helper', helperName, validationType),
    generateOptimizationPattern: (patternName: string, optimizationType?: string) => ipcRenderer.invoke('papyrusGen:generate-optimization-pattern', patternName, optimizationType),
    generateDocumentation: (scriptId: string, format?: string) => ipcRenderer.invoke('papyrusGen:generate-documentation', scriptId, format),
    batchGenerateScripts: (scriptConfigs: any[]) => ipcRenderer.invoke('papyrusGen:batch-generate-scripts', scriptConfigs),
    validatePapyrusSyntax: (code: string) => ipcRenderer.invoke('papyrusGen:validate-papyrus-syntax', code),
    applyTypeSafetyPatterns: (scriptId: string) => ipcRenderer.invoke('papyrusGen:apply-type-safety-patterns', scriptId),
    getGeneratorStatistics: (limit?: number) => ipcRenderer.invoke('papyrusGen:get-generator-statistics', limit),
  },

  formManager: {
    createFormReference: (formId: string, formData?: any) => ipcRenderer.invoke('form:create-form-reference', formId, formData),
    getFormProperties: (referenceId: string) => ipcRenderer.invoke('form:get-form-properties', referenceId),
    updateEntityState: (entityId: string, stateData: any) => ipcRenderer.invoke('form:update-entity-state', entityId, stateData),
    registerEventListener: (referenceId: string, eventType: string) => ipcRenderer.invoke('form:register-event-listener', referenceId, eventType),
    serializeReference: (referenceId: string, format?: string) => ipcRenderer.invoke('form:serialize-reference', referenceId, format),
    validateReferenceIntegrity: (referenceId: string) => ipcRenderer.invoke('form:validate-reference-integrity', referenceId),
    batchUpdateReferences: (referenceUpdates: any[]) => ipcRenderer.invoke('form:batch-update-references', referenceUpdates),
    optimizeReferencePerformance: (referenceId: string) => ipcRenderer.invoke('form:optimize-reference-performance', referenceId),
    getReferenceManagerStatistics: (limit?: number) => ipcRenderer.invoke('form:get-reference-manager-statistics', limit),
    deserializeReference: (serializedData: string, format?: string) => ipcRenderer.invoke('form:deserialize-reference', serializedData, format),
  },

  assetManager: {
    streamLargeAsset: (assetPath: string, chunkSize?: number) => ipcRenderer.invoke('asset:stream-large-asset', assetPath, chunkSize),
    manageMemoryEfficiently: (strategy?: string) => ipcRenderer.invoke('asset:manage-memory-efficiently', strategy),
    loadResource: (resourceId: string, priority?: number) => ipcRenderer.invoke('asset:load-resource', resourceId, priority),
    unloadResource: (resourceId: string) => ipcRenderer.invoke('asset:unload-resource', resourceId),
    optimizeCachePerformance: (cacheStrategy?: string) => ipcRenderer.invoke('asset:optimize-cache-performance', cacheStrategy),
    handleMemoryPressure: (pressureLevel?: string) => ipcRenderer.invoke('asset:handle-memory-pressure', pressureLevel),
    getMemoryDiagnostics: (detailed?: boolean) => ipcRenderer.invoke('asset:get-memory-diagnostics', detailed),
    batchStreamAssets: (assetPaths: string[]) => ipcRenderer.invoke('asset:batch-stream-assets', assetPaths),
    getStreamingStatistics: (limit?: number) => ipcRenderer.invoke('asset:get-streaming-statistics', limit),
    validateResourceIntegrity: (resourceId: string) => ipcRenderer.invoke('asset:validate-resource-integrity', resourceId),
  },

  scriptCacheManager: {
    loadCachedScript: (scriptId: string, forceRecompile?: boolean) => ipcRenderer.invoke('scriptCache:load-cached-script', scriptId, forceRecompile),
    saveScriptCache: (scriptId: string, compiledData: any, compressionLevel?: number) => ipcRenderer.invoke('scriptCache:save-script-cache', scriptId, compiledData, compressionLevel),
    validateCacheIntegrity: (cacheId: string) => ipcRenderer.invoke('scriptCache:validate-cache-integrity', cacheId),
    optimizeCacheStructure: (optimization?: string) => ipcRenderer.invoke('scriptCache:optimize-cache-structure', optimization),
    clearCacheEntry: (cacheId: string) => ipcRenderer.invoke('scriptCache:clear-cache-entry', cacheId),
    getCacheStatistics: (limit?: number) => ipcRenderer.invoke('scriptCache:get-cache-statistics', limit),
    batchUpdateCache: (updates: any[]) => ipcRenderer.invoke('scriptCache:batch-update-cache', updates),
    analyzeScriptPerformance: (scriptId: string) => ipcRenderer.invoke('scriptCache:analyze-script-performance', scriptId),
    generateCacheReport: (reportFormat?: string) => ipcRenderer.invoke('scriptCache:generate-cache-report', reportFormat),
    monitorCacheHealth: (detailedMetrics?: boolean) => ipcRenderer.invoke('scriptCache:monitor-cache-health', detailedMetrics),
  },

  formID: {
    scanForCollisions: (modPaths: string[]) => ipcRenderer.invoke('formID:scan-for-collisions', modPaths),
    detectCollision: (formID: string, affectedMods: string[]) => ipcRenderer.invoke('formID:detect-collision', formID, affectedMods),
    generateFormIDMapping: (modPath: string, baseFormID?: string) => ipcRenderer.invoke('formID:generate-formid-mapping', modPath, baseFormID),
    validateFormIDIntegrity: (modPath: string) => ipcRenderer.invoke('formID:validate-formid-integrity', modPath),
    remapConflictingFormIDs: (collisionId: string, targetModID: string) => ipcRenderer.invoke('formID:remap-conflicting-formids', collisionId, targetModID),
    getCollisionReport: (reportId: string) => ipcRenderer.invoke('formID:get-collision-report', reportId),
    batchScanMods: (modPaths: string[]) => ipcRenderer.invoke('formID:batch-scan-mods', modPaths),
    monitorFormIDHealth: (modPath: string) => ipcRenderer.invoke('formID:monitor-formid-health', modPath),
    getFormIDStatistics: (limit?: number) => ipcRenderer.invoke('formID:get-formid-statistics', limit),
  },

















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
  roadmapCreate: (name: string, description?: string, projectId?: string) => ipcRenderer.invoke('roadmap-create', { name, description, projectId }),
  roadmapUpdateStep: (roadmapId: string, stepId: string, status: string) => ipcRenderer.invoke('roadmap-update-step', { roadmapId, stepId, status }),
  roadmapDelete: (roadmapId: string) => ipcRenderer.invoke('roadmap-delete', roadmapId),
  roadmapGenerateAI: (prompt: string, projectId: string) => ipcRenderer.invoke('roadmap-generate-ai', { prompt, projectId }),

  // What's New (Platform 7)
  whatsNewGetAll: () => ipcRenderer.invoke('whats-new-get-all'),
  whatsNewGetCurrent: () => invokeWithFallback('whats-new-get-current'),
  whatsNewGetChangelog: () => ipcRenderer.invoke('whats-new-get-changelog'),
  whatsNewMarkSeen: (version: string) => ipcRenderer.invoke('whats-new-mark-seen', { version }),
  whatsNewDismiss: (version: string) => ipcRenderer.invoke('whats-new-dismiss', { version }),
  whatsNewReset: () => ipcRenderer.invoke('whats-new-reset'),

  // Collaboration Features
  initGitRepository: (projectId: string, config: any) => ipcRenderer.invoke('collaboration-git-init', projectId, config),
  gitCommit: (projectId: string, message: string, files?: string[]) => ipcRenderer.invoke('collaboration-git-commit', projectId, message, files),
  gitPush: (projectId: string) => ipcRenderer.invoke('collaboration-git-push', projectId),
  gitPull: (projectId: string) => ipcRenderer.invoke('collaboration-git-pull', projectId),

  // Advanced Analytics
  trackAnalyticsEvent: (event: any) => ipcRenderer.invoke('analytics-track-event', event),
  getAnalyticsMetrics: () => ipcRenderer.invoke('analytics-get-metrics'),
  exportAnalyticsData: () => ipcRenderer.invoke('analytics-export-data'),
  exportAnalyticsReport: (format: string) => ipcRenderer.invoke('analytics-export-report', format),
  updateAnalyticsConfig: (config: any) => ipcRenderer.invoke('analytics-update-config', config),

  // Version Control
  versionControlInit: (projectPath: string) => ipcRenderer.invoke('version-control:init', projectPath),
  versionControlCommit: (message: string, files?: string[]) => ipcRenderer.invoke('version-control:commit', message, files),
  versionControlHistory: (limit?: number) => ipcRenderer.invoke('version-control:history', limit),
  versionControlCreateBranch: (branchName: string) => ipcRenderer.invoke('version-control:create-branch', branchName),
  versionControlMergeBranch: (source: string, target: string) => ipcRenderer.invoke('version-control:merge-branch', source, target),
  versionControlDiff: (fileA: string, fileB: string) => ipcRenderer.invoke('version-control:diff', fileA, fileB),
  versionControlShowChanges: (commitHash: string) => ipcRenderer.invoke('version-control:show-changes', commitHash),
  versionControlPush: (remote: string, branch: string) => ipcRenderer.invoke('version-control:push', remote, branch),
  versionControlPull: (remote: string, branch: string) => ipcRenderer.invoke('version-control:pull', remote, branch),
  versionControlClone: (repoUrl: string, localPath: string) => ipcRenderer.invoke('version-control:clone', repoUrl, localPath),
  versionControlBackup: (projectPath: string) => ipcRenderer.invoke('version-control:backup', projectPath),
  versionControlRestore: (backupId: string, targetPath: string) => ipcRenderer.invoke('version-control:restore', backupId, targetPath),
  versionControlListBackups: () => ipcRenderer.invoke('version-control:list-backups'),
  versionControlResolveConflict: (file: string, resolution: 'ours' | 'theirs' | 'manual') => ipcRenderer.invoke('version-control:resolve-conflict', file, resolution),

  // AI Assistant Engine
  aiGenerateScript: (request: any) => ipcRenderer.invoke('ai:generate-script', request),
  aiSuggestNames: (request: any) => ipcRenderer.invoke('ai:suggest-names', request),
  aiBatchRenameAssets: (request: any) => ipcRenderer.invoke('ai:batch-rename', request),
  aiPlanWorkflow: (request: any) => ipcRenderer.invoke('ai:plan-workflow', request),
  aiExecuteWorkflow: (plan: any) => ipcRenderer.invoke('ai:execute-workflow', plan),
  aiGenerateDocumentation: (request: any) => ipcRenderer.invoke('ai:generate-docs', request),
  aiSearch: (request: any) => ipcRenderer.invoke('ai:search', request),
  aiBuildSearchIndex: (sourceFolder: string) => ipcRenderer.invoke('ai:build-index', sourceFolder),
  aiDiagnoseError: (context: any) => ipcRenderer.invoke('ai:diagnose-error', context),
  aiAnalyzeLogs: (logContent: string, context?: any) => ipcRenderer.invoke('ai:analyze-logs', logContent, context),
  aiExplain: (request: any) => ipcRenderer.invoke('ai:explain', request),
  aiSuggestTutorial: (request: any) => ipcRenderer.invoke('ai:suggest-tutorial', request),
  aiGetRelatedConcepts: (concept: string) => ipcRenderer.invoke('ai:get-related', concept),
  aiGetStatus: () => ipcRenderer.invoke('ai:get-status'),
  aiGetConfig: () => ipcRenderer.invoke('ai:get-config'),
  aiUpdateConfig: (config: any) => ipcRenderer.invoke('ai:update-config', config),
  aiSubmitFeedback: (feedback: any) => ipcRenderer.invoke('ai:submit-feedback', feedback),
  aiGetUsageStatistics: () => ipcRenderer.invoke('ai:get-stats'),

  // Learning Hub wrappers
  learningHub: {
    getTutorial: (tutorialId: string) => ipcRenderer.invoke('learning:get-tutorial', tutorialId),
    listTutorials: (category?: string) => ipcRenderer.invoke('learning:list-tutorials', category),
    trackProgress: (userId: string, tutorialId: string, step: number | string) => ipcRenderer.invoke('learning:track-progress', userId, tutorialId, step),
    validateExercise: (exerciseId: string, submission: any) => ipcRenderer.invoke('learning:submit-exercise', exerciseId, submission),
    submitExercise: (exerciseId: string, answer: any) => ipcRenderer.invoke('learning:submit-exercise', exerciseId, answer),
    completeStep: (userId: string, stepId: string) => ipcRenderer.invoke('learning:complete-step', userId, stepId),
    getUserProgress: (userId: string) => ipcRenderer.invoke('learning:get-user-progress', userId),
    provideHint: (exerciseId: string, currentAttempt?: any) => ipcRenderer.invoke('learning:provide-hint', exerciseId, currentAttempt),
    unlockAchievement: (userId: string, achievementId: string) => ipcRenderer.invoke('learning:unlock-achievement', userId, achievementId),
    listAchievements: (userId?: string) => ipcRenderer.invoke('learning:get-achievements', userId),
  },

  // AI Assistant Alternative API (simplified interface)
  aiAssistantGenerateScript: (description: string) => ipcRenderer.invoke('ai-assistant:generate-script', description),
  aiAssistantChat: (message: string, context?: any) => ipcRenderer.invoke('ai-assistant:chat', message, context),
  aiAssistantExplainCode: (code: string) => ipcRenderer.invoke('ai-assistant:explain-code', code),
  aiAssistantSuggestFixes: (error: string, context?: any) => ipcRenderer.invoke('ai-assistant:suggest-fixes', error, context),
  aiAssistantRefactorCode: (code: string, improvements?: string[]) => ipcRenderer.invoke('ai-assistant:refactor-code', code, improvements || []),
  aiAssistantParseIntent: (userInput: string) => ipcRenderer.invoke('ai-assistant:parse-intent', userInput),
  aiAssistantAnalyzeImage: (imagePath: string, question?: string) => ipcRenderer.invoke('ai-assistant:analyze-image', imagePath, question || ''),

  // Mod Browser (workshop) wrappers
  modBrowser: {
    searchMods: (query: string, filters?: any) => ipcRenderer.invoke('mod-browser:search', query, filters),
    getModDetails: (modId: string) => ipcRenderer.invoke('mod-browser:get-details', modId),
    downloadMod: (modId: string, destination: string) => ipcRenderer.invoke('mod-browser:download', modId, destination),
    rateMod: (modId: string, rating: number, review: string) => ipcRenderer.invoke('mod-browser:rate', modId, rating, review),
    authenticateNexus: (apiKey: string) => ipcRenderer.invoke('mod-browser:authenticate-nexus', apiKey),
    getModReviews: (modId: string) => ipcRenderer.invoke('mod-browser:get-reviews', modId),
    createCollection: (name: string, mods: string[], description?: string) => ipcRenderer.invoke('mod-browser:create-collection', name, mods, description),
    shareCollection: (collectionId: string) => ipcRenderer.invoke('mod-browser:share-collection', collectionId),
    endorseMod: (modId: string) => ipcRenderer.invoke('mod-browser:endorse-mod', modId),
    getTrendingMods: (timeframe?: string) => ipcRenderer.invoke('mod-browser:trending', timeframe),
  },

  // Platform 9: Load Order Management API
  loadOrder: {
    getAll: () => ipcRenderer.invoke('load-order:get-all'),
    getCurrent: () => ipcRenderer.invoke('load-order:get-current'),
    create: (name: string, description?: string) => ipcRenderer.invoke('load-order:create', name, description),
    updateOrder: (loadOrderId: string, plugins: any[]) => ipcRenderer.invoke('load-order:update-order', loadOrderId, plugins),
    validate: (loadOrderId: string) => ipcRenderer.invoke('load-order:validate', loadOrderId),
    analyzeConflicts: (loadOrderId: string) => ipcRenderer.invoke('load-order:analyze-conflicts', loadOrderId),
    optimize: (loadOrderId: string) => ipcRenderer.invoke('load-order:optimize', loadOrderId),
    export: (loadOrderId: string, format: string) => ipcRenderer.invoke('load-order:export', loadOrderId, format),
    import: (name: string, content: string, format: string) => ipcRenderer.invoke('load-order:import', name, content, format),
    delete: (loadOrderId: string) => ipcRenderer.invoke('load-order:delete', loadOrderId),
  },

  // Platform 10: Conflict Resolution API
  conflictResolver: {
    analyze: (pluginPaths: string[]) => ipcRenderer.invoke('conflict-resolver:analyze', pluginPaths),
    detect: (plugin1: string, plugin2: string) => ipcRenderer.invoke('conflict-resolver:detect', plugin1, plugin2),
    resolve: (conflicts: any[], strategy: string) => ipcRenderer.invoke('conflict-resolver:resolve', conflicts, strategy),
    generatePatch: (conflicts: any[], patchName: string) => ipcRenderer.invoke('conflict-resolver:generate-patch', conflicts, patchName),
    addRule: (ruleData: any) => ipcRenderer.invoke('conflict-resolver:add-rule', ruleData),
    getRules: () => ipcRenderer.invoke('conflict-resolver:get-rules'),
    deleteRule: (ruleId: string) => ipcRenderer.invoke('conflict-resolver:delete-rule', ruleId),
    applyRules: (conflicts: any[], ruleIds?: string[]) => ipcRenderer.invoke('conflict-resolver:apply-rules', conflicts, ruleIds),
    exportAnalysis: (analysis: any, format: string) => ipcRenderer.invoke('conflict-resolver:export-analysis', analysis, format),
    importRules: (content: string, format: string) => ipcRenderer.invoke('conflict-resolver:import-rules', content, format),
  },

  // Platform 11: Plugin Manager API
  pluginManager: {
    listInstalled: () => invokeWithFallback('plugin-manager:list-installed'),
    listMarketplace: () => ipcRenderer.invoke('plugin-manager:list-marketplace'),
    install: (pluginId: string, version: string) => ipcRenderer.invoke('plugin-manager:install', pluginId, version),
    uninstall: (pluginId: string) => ipcRenderer.invoke('plugin-manager:uninstall', pluginId),
    toggle: (pluginId: string, enabled: boolean) => ipcRenderer.invoke('plugin-manager:toggle', pluginId, enabled),
    update: (pluginId: string, newVersion: string) => ipcRenderer.invoke('plugin-manager:update', pluginId, newVersion),
    getSettings: () => ipcRenderer.invoke('plugin-manager:get-settings'),
    setSettings: (settings: any) => ipcRenderer.invoke('plugin-manager:set-settings', settings),
    getDetails: (pluginId: string) => ipcRenderer.invoke('plugin-manager:get-details', pluginId),
    validate: (pluginId: string) => ipcRenderer.invoke('plugin-manager:validate', pluginId),
  },

  // Platform 12: Team Workspace API
  teamWorkspace: {
    createWorkspace: (name: string, description?: string) => ipcRenderer.invoke('team-workspace:create-workspace', name, description),
    listWorkspaces: () => ipcRenderer.invoke('team-workspace:list-workspaces'),
    getWorkspace: (workspaceId: string) => ipcRenderer.invoke('team-workspace:get-workspace', workspaceId),
    joinWorkspace: (workspaceId: string, userId: string) => ipcRenderer.invoke('team-workspace:join-workspace', workspaceId, userId),
    leaveWorkspace: (workspaceId: string, userId: string) => ipcRenderer.invoke('team-workspace:leave-workspace', workspaceId, userId),
    assignTask: (workspaceId: string, taskData: any) => ipcRenderer.invoke('team-workspace:assign-task', workspaceId, taskData),
    updateProgress: (taskId: string, progressData: any) => ipcRenderer.invoke('team-workspace:update-progress', taskId, progressData),
    addComment: (taskId: string, comment: string, userId: string) => ipcRenderer.invoke('team-workspace:add-comment', taskId, comment, userId),
    getComments: (taskId: string) => ipcRenderer.invoke('team-workspace:get-comments', taskId),
    lockFile: (workspaceId: string, filePath: string, userId: string) => ipcRenderer.invoke('team-workspace:lock-file', workspaceId, filePath, userId),
  },

  // Platform 13: Mining Pipeline API
  miningPipeline: {
    executePipeline: (sources: any[]) => ipcRenderer.invoke('mining:execute-pipeline', sources),
    parseESP: (filePath: string) => ipcRenderer.invoke('mining:parse-esp', filePath),
    buildDependencyGraph: (espData: any) => ipcRenderer.invoke('mining:build-dependency-graph', espData),
    extractForms: (espDataId: string) => ipcRenderer.invoke('mining:extract-forms', espDataId),
    analyzeConflicts: (espDataIds: string[]) => ipcRenderer.invoke('mining:analyze-conflicts', espDataIds),
    generateReport: (pipelineId: string) => ipcRenderer.invoke('mining:generate-report', pipelineId),
    validateMaster: (masterPath: string, dependencyPaths: string[]) => ipcRenderer.invoke('mining:validate-master', masterPath, dependencyPaths),
    scanAssetReferences: (espDataId: string) => ipcRenderer.invoke('mining:scan-asset-references', espDataId),
    cacheMiningData: (dataId: string, data: any) => ipcRenderer.invoke('mining:cache-mining-data', dataId, data),
    getCachedData: (cacheKey: string) => ipcRenderer.invoke('mining:get-cached-data', cacheKey),
  },

  // Security / Scanning API (preload -> main)
  security: {
    scanFile: (path: string) => ipcRenderer.invoke('security:scan-file', path),
    scanArchive: (path: string) => ipcRenderer.invoke('security:scan-archive', path),
    scanScript: (path: string) => ipcRenderer.invoke('security:scan-script', path),
    analyzePapyrusScript: (code: string) => ipcRenderer.invoke('security:analyze-papyrus', code),
    generateChecksum: (path: string, algorithm: 'md5' | 'sha256' = 'sha256') => ipcRenderer.invoke('security:generate-checksum', path, algorithm),
    verifyChecksum: (path: string, expectedHash: string) => ipcRenderer.invoke('security:verify-checksum', path, expectedHash),
    verifySignature: (path: string, signature: string, publicKey: string) => ipcRenderer.invoke('security:verify-signature', path, signature, publicKey),
    runInSandbox: (executable: string, args: string[], config?: any) => ipcRenderer.invoke('security:run-sandbox', executable, args, config),
    updateThreatDatabase: () => ipcRenderer.invoke('security:update-db'),
    updateThreats: () => ipcRenderer.invoke('security:update-threats'),
    checkAgainstDatabase: (hash: string) => ipcRenderer.invoke('security:check-db', hash),
  },
  aiAssistantSuggestNames: (assetType: string, context: string) => ipcRenderer.invoke('ai-assistant:suggest-names', assetType, context),
  aiAssistantParseWorkflow: (naturalLanguage: string) => ipcRenderer.invoke('ai-assistant:parse-workflow', naturalLanguage),
  aiAssistantExecuteWorkflow: (plan: any) => ipcRenderer.invoke('ai-assistant:execute-workflow', plan),
  aiAssistantGenerateReadme: (projectData: any) => ipcRenderer.invoke('ai-assistant:generate-readme', projectData),
  aiAssistantDiagnoseError: (errorLog: string, context: any) => ipcRenderer.invoke('ai-assistant:diagnose-error', errorLog, context),

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

  // Web access — allows Mossy to fetch live information from the internet
  // via the secure main-process HTTPS layer (renderer has no direct access).
  webSearch: (query: string, type?: string) => ipcRenderer.invoke('web-search', query, type),
  browseWeb: (url: string) => ipcRenderer.invoke('browse-web', url),

  // Tool auto-download — lets the app download optional tools (e.g. UModel) on demand.
  downloadUModel: (destDir?: string) => ipcRenderer.invoke('download-umodel', destDir),

  // PyTorch — check availability and auto-install a CPU-only build on demand.
  checkPyTorch: () => ipcRenderer.invoke('check-pytorch'),
  installPyTorch: (destDir?: string) => ipcRenderer.invoke('install-pytorch', destDir),
  onPytorchSetupProgress: (callback: (data: { message: string }) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: { message: string }) => callback(data);
    ipcRenderer.on('pytorch-setup-progress', subscription);
    return () => ipcRenderer.removeListener('pytorch-setup-progress', subscription);
  },
  notifyPytorchRendererReady: () => ipcRenderer.send('pytorch-renderer-ready'),
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
