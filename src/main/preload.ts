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
    createTestSuite: (name: string, type: string) => ipcRenderer.invoke('testing:create-suite', name, type),
    runTests: (suiteId: string) => ipcRenderer.invoke('testing:run-tests', suiteId),
    runSingleTest: (testId: string) => ipcRenderer.invoke('testing:run-single-test', testId),
    testLoadOrder: (plugins: string[]) => ipcRenderer.invoke('testing:test-load-order', plugins),
    testSaveGameCompatibility: (savePath: string, modList: string[]) => ipcRenderer.invoke('testing:test-save-compat', savePath, modList),
    testScriptCompilation: (scripts: string[]) => ipcRenderer.invoke('testing:test-scripts', scripts),
    testAssetIntegrity: (assets: string[]) => ipcRenderer.invoke('testing:test-assets', assets),
    benchmarkModPerformance: (mod: string) => ipcRenderer.invoke('testing:benchmark', mod),
    createBaseline: (modVersion: string) => ipcRenderer.invoke('testing:create-baseline', modVersion),
    compareToBaseline: (current: any, baseline: any) => ipcRenderer.invoke('testing:compare-baseline', current, baseline),
    generateTestReport: (results: any) => ipcRenderer.invoke('testing:generate-report', results),
    exportTestResults: (results: any, format: 'json' | 'html' | 'pdf' | 'junit' | 'markdown') => ipcRenderer.invoke('testing:export-results', results, format),
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
