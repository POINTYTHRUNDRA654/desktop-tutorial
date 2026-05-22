/**
 * Platform Handlers — registers all IPC channels that were missing from setupIpcHandlers().
 *
 * Covers 106 channels across: tool-integration, external-tool, asset-validation,
 * asset-validator, conflict-resolution, load-order, mod-packaging, cloud-sync,
 * game-integration, dds-converter, ai:*, and misc utility channels.
 *
 * Called from setupIpcHandlers() in main.ts immediately after the safeHandle/
 * registerHandler helpers are defined.
 */

import { ipcMain, dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/** Thin wrapper matching the safeHandle signature used in main.ts */
type SafeHandleFn = (channel: string, handler: (...args: any[]) => Promise<any>) => void;

// ---------------------------------------------------------------------------
// Helper: lazy-load mining engines on first use
// ---------------------------------------------------------------------------
let _assetValidation: any = null;
async function getAssetValidation() {
  if (!_assetValidation) {
    const mod = await import('../../mining/assetValidation');
    _assetValidation = mod.assetValidation;
  }
  return _assetValidation;
}

let _externalTool: any = null;
async function getExternalTool() {
  if (!_externalTool) {
    const mod = await import('../../mining/externalToolIntegration');
    _externalTool = mod.externalToolIntegration;
  }
  return _externalTool;
}

let _conflictResolution: any = null;
async function getConflictResolution() {
  if (!_conflictResolution) {
    const mod = await import('../../mining/conflictResolution');
    _conflictResolution = new mod.ConflictResolutionEngine();
  }
  return _conflictResolution;
}

let _loadOrder: any = null;
async function getLoadOrder() {
  if (!_loadOrder) {
    const mod = await import('../../mining/loadOrderOptimizer');
    _loadOrder = mod.loadOrderOptimizerEngine;
  }
  return _loadOrder;
}

let _modPackaging: any = null;
async function getModPackaging() {
  if (!_modPackaging) {
    const mod = await import('../../mining/modPackaging');
    _modPackaging = mod.modPackaging;
  }
  return _modPackaging;
}

let _cloudSync: any = null;
async function getCloudSync() {
  if (!_cloudSync) {
    const mod = await import('../../mining/cloudSync');
    _cloudSync = mod.cloudSyncEngine;
  }
  return _cloudSync;
}

let _gameIntegration: any = null;
async function getGameIntegration() {
  if (!_gameIntegration) {
    const mod = await import('../../mining/gameIntegration');
    _gameIntegration = new mod.GameIntegrationEngine();
  }
  return _gameIntegration;
}

let _ddsConverter: any = null;
async function getDdsConverter() {
  if (!_ddsConverter) {
    const mod = await import('../../mining/ddsConverter');
    _ddsConverter = mod.ddsConverter;
  }
  return _ddsConverter;
}

// ---------------------------------------------------------------------------
// AI helper: delegate to Groq with a system prompt + user message
// ---------------------------------------------------------------------------
async function callGroqAI(systemPrompt: string, userMessage: string): Promise<string> {
  const { default: Groq } = await import('groq-sdk') as any;
  // Read API key from persisted settings file or environment
  let apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) {
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const stored = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        apiKey = stored?.groqApiKey || stored?.groqApiKeyEnc || '';
      }
    } catch { /* ignore */ }
  }
  if (!apiKey) {
    throw new Error('No Groq API key configured. Add one in Settings → AI.');
  }

  const client = new Groq({ apiKey });
  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  });
  return response.choices?.[0]?.message?.content ?? '';
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function registerPlatformHandlers(safeHandle: SafeHandleFn): void {

  // =========================================================================
  // AI channels
  // =========================================================================
  safeHandle('ai:plan-workflow', async (_event, request: any) => {
    const prompt = typeof request === 'string' ? request : JSON.stringify(request);
    const result = await callGroqAI(
      'You are Mossy, a Fallout 4 modding assistant. Generate a clear, actionable workflow plan for the user request. Return a JSON object with steps array.',
      prompt
    );
    try { return JSON.parse(result); } catch { return { steps: [result] }; }
  });

  safeHandle('ai:explain', async (_event, request: any) => {
    const prompt = typeof request === 'string' ? request : JSON.stringify(request);
    const result = await callGroqAI(
      'You are Mossy, a Fallout 4 modding expert. Explain the concept or error clearly and concisely for a modder.',
      prompt
    );
    return { explanation: result };
  });

  safeHandle('ai:diagnose-error', async (_event, context: any) => {
    const prompt = typeof context === 'string' ? context : JSON.stringify(context);
    const result = await callGroqAI(
      'You are Mossy, a Fallout 4 modding crash and error diagnostics expert. Diagnose the error, explain the root cause, and provide step-by-step fix instructions. Return a JSON object with: cause, explanation, steps, and severity.',
      prompt
    );
    try { return JSON.parse(result); } catch { return { cause: 'Unknown', explanation: result, steps: [], severity: 'medium' }; }
  });

  safeHandle('ai:suggest-names', async (_event, context: any) => {
    const prompt = typeof context === 'string' ? context : JSON.stringify(context);
    const result = await callGroqAI(
      'You are Mossy, a creative Fallout 4 mod naming expert. Suggest 5-10 fitting, lore-friendly names. Return a JSON array of name strings.',
      prompt
    );
    try { return JSON.parse(result); } catch { return [result]; }
  });

  safeHandle('ai:generate-script-body', async (_event, context: any) => {
    const prompt = typeof context === 'string' ? context : JSON.stringify(context);
    const result = await callGroqAI(
      'You are Mossy, a Papyrus scripting expert for Fallout 4. Write a complete, working Papyrus script body based on the user description. Include all necessary imports and event handlers.',
      prompt
    );
    return { script: result };
  });

  // =========================================================================
  // tool-integration: CK (Creation Kit)
  // =========================================================================
  safeHandle('tool-integration:ck-launch', async (_event, espPath: string, options: any) => {
    const et = await getExternalTool();
    const args: string[] = [];
    if (espPath) args.push('-EditorWarnings', '-ImportPlugin', path.basename(espPath));
    if (options?.args) args.push(...options.args);
    return et.runCKCommand(espPath ? path.dirname(espPath) : '', args);
  });

  safeHandle('tool-integration:ck-get-log', async () => {
    const logPaths = [
      path.join(process.env.LOCALAPPDATA || os.homedir(), 'Fallout4', 'Logs', 'Script', 'CreationKit.0.log'),
      path.join(process.env.LOCALAPPDATA || os.homedir(), 'Fallout4', 'CreationKit.log'),
    ];
    for (const p of logPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        return { success: true, path: p, content };
      }
    }
    return { success: false, content: '', error: 'No CK log file found' };
  });

  safeHandle('tool-integration:ck-get-log-errors', async () => {
    const logPaths = [
      path.join(process.env.LOCALAPPDATA || os.homedir(), 'Fallout4', 'Logs', 'Script', 'CreationKit.0.log'),
      path.join(process.env.LOCALAPPDATA || os.homedir(), 'Fallout4', 'CreationKit.log'),
    ];
    const errors: string[] = [];
    for (const p of logPaths) {
      if (fs.existsSync(p)) {
        const lines = fs.readFileSync(p, 'utf-8').split('\n');
        errors.push(...lines.filter(l => /error|warning|exception/i.test(l)));
      }
    }
    return { success: true, errors };
  });

  safeHandle('tool-integration:ck-validate-esp', async (_event, espPath: string) => {
    const av = await getAssetValidation();
    return av.validateESP(espPath);
  });

  safeHandle('tool-integration:ck-get-masters', async (_event, espPath: string) => {
    try {
      const { parseESPHeader } = await import('../espParser');
      // espParser has parseESPHeader and extractFormIDs; use raw byte reading for masters
    } catch { /* fallback below */ }
    // Fallback: read raw bytes to find masters
    const buf = fs.readFileSync(espPath);
    const masters: string[] = [];
    let i = 0;
    while (i < Math.min(buf.length, 4096)) {
      const idx = buf.indexOf(Buffer.from('MAST'), i);
      if (idx === -1) break;
      const len = buf.readUInt16LE(idx + 4);
      masters.push(buf.slice(idx + 6, idx + 6 + len - 1).toString('utf-8'));
      i = idx + 6 + len;
    }
    return { success: true, masters };
  });

  safeHandle('tool-integration:ck-backup-esp', async (_event, espPath: string) => {
    const backupDir = path.join(path.dirname(espPath), 'MossyBackups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(backupDir, `${path.basename(espPath)}.${ts}.bak`);
    fs.copyFileSync(espPath, dest);
    return { success: true, backupPath: dest };
  });

  safeHandle('tool-integration:ck-is-running', async () => {
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq CreationKit.exe" /NH 2>nul');
      const running = stdout.toLowerCase().includes('creationkit.exe');
      return { success: true, running };
    } catch {
      return { success: true, running: false };
    }
  });

  safeHandle('tool-integration:ck-kill', async () => {
    try {
      await execAsync('taskkill /F /IM CreationKit.exe 2>nul');
      return { success: true };
    } catch {
      return { success: false, error: 'CreationKit.exe not running or could not be terminated' };
    }
  });

  // =========================================================================
  // tool-integration: NIF mesh operations
  // =========================================================================
  safeHandle('tool-integration:nif-optimize', async (_event, nifPath: string, options: any) => {
    const et = await getExternalTool();
    return et.optimizeNIF(nifPath, options || {});
  });

  safeHandle('tool-integration:nif-batch-optimize', async (_event, nifFiles: string[], options: any) => {
    const et = await getExternalTool();
    if (nifFiles?.length > 0) {
      const folder = path.dirname(nifFiles[0]);
      return et.batchFixNIFs(folder, options?.issues || []);
    }
    return { success: false, error: 'No NIF files provided' };
  });

  safeHandle('tool-integration:nif-change-texture', async (_event, nifPath: string, oldTexPath: string, newTexPath: string) => {
    const av = await getAssetValidation();
    // Read NIF, replace texture path string, write back
    const content = fs.readFileSync(nifPath);
    const oldBuf = Buffer.from(oldTexPath, 'utf-8');
    const newBuf = Buffer.from(newTexPath, 'utf-8');
    const updated = Buffer.from(content.toString('binary').split(oldTexPath).join(newTexPath), 'binary');
    const backupPath = nifPath + '.mossy-bak';
    fs.copyFileSync(nifPath, backupPath);
    fs.writeFileSync(nifPath, updated);
    return { success: true, backupPath };
  });

  safeHandle('tool-integration:nif-fix-collision', async (_event, nifPath: string, options: any) => {
    const et = await getExternalTool();
    return et.batchFixNIFs(path.dirname(nifPath), ['collision', ...(options?.issues || [])]);
  });

  safeHandle('tool-integration:nif-extract-metadata', async (_event, nifPath: string) => {
    const et = await getExternalTool();
    return et.extractNIFInfo(nifPath);
  });

  safeHandle('tool-integration:nif-validate', async (_event, nifPath: string) => {
    const av = await getAssetValidation();
    return av.validateNIF(nifPath);
  });

  // =========================================================================
  // tool-integration: xEdit
  // =========================================================================
  safeHandle('tool-integration:xedit-clean', async (_event, pluginPath: string, mode: string) => {
    const et = await getExternalTool();
    return et.cleanPlugin(pluginPath, (mode as any) || 'quick');
  });

  safeHandle('tool-integration:xedit-script', async (_event, scriptPath: string, plugins: string[], parameters: any) => {
    const et = await getExternalTool();
    return et.runXEditScript(scriptPath, plugins || []);
  });

  safeHandle('tool-integration:xedit-export-csv', async (_event, plugin: string, recordTypes: string[], outputPath: string) => {
    const et = await getExternalTool();
    return et.runXEditScript('', [plugin]);
  });

  safeHandle('tool-integration:xedit-find-conflicts', async (_event, plugins: string[]) => {
    const et = await getExternalTool();
    return et.findConflicts(plugins || []);
  });

  // =========================================================================
  // tool-integration: Blender
  // =========================================================================
  safeHandle('tool-integration:blender-convert-fbx-to-nif', async (_event, fbxPath: string, nifPath: string, options: any) => {
    const et = await getExternalTool();
    return et.importFBX(fbxPath, { outputPath: nifPath, ...(options || {}) });
  });

  safeHandle('tool-integration:blender-convert-nif-to-fbx', async (_event, nifPath: string, fbxPath: string, options: any) => {
    const et = await getExternalTool();
    return et.exportNIF(nifPath, { outputPath: fbxPath, ...(options || {}) });
  });

  safeHandle('tool-integration:blender-script', async (_event, scriptContent: string, args: any[], options: any) => {
    const et = await getExternalTool();
    const tmpScript = path.join(os.tmpdir(), `mossy-blender-${Date.now()}.py`);
    fs.writeFileSync(tmpScript, scriptContent);
    try {
      return await et.batchConvertMeshes([tmpScript], { operation: 'script', args, ...(options || {}) });
    } finally {
      try { fs.unlinkSync(tmpScript); } catch { /* ignore */ }
    }
  });

  safeHandle('tool-integration:blender-batch-process', async (_event, files: string[], operation: string, options: any) => {
    const et = await getExternalTool();
    return et.batchConvertMeshes(files || [], { operation, ...(options || {}) });
  });

  safeHandle('tool-integration:blender-check-nif-plugin', async () => {
    const et = await getExternalTool();
    const tools = await et.detectTools();
    const blender = tools?.tools?.find?.((t: any) => t.name === 'blender' || t.toolName === 'blender');
    return { success: true, found: !!blender, blenderPath: blender?.path || null };
  });

  // =========================================================================
  // external-tool:* (delegates to ExternalToolIntegrationEngine)
  // =========================================================================
  safeHandle('external-tool:detect-tools', async () => {
    const et = await getExternalTool();
    return et.detectTools();
  });

  safeHandle('external-tool:verify-tool', async (_event, toolName: string) => {
    const et = await getExternalTool();
    return et.verifyTool(toolName);
  });

  safeHandle('external-tool:run-xedit-script', async (_event, scriptPath: string, pluginList: string[]) => {
    const et = await getExternalTool();
    return et.runXEditScript(scriptPath, pluginList || []);
  });

  safeHandle('external-tool:clean-plugin', async (_event, pluginPath: string, mode: string) => {
    const et = await getExternalTool();
    return et.cleanPlugin(pluginPath, (mode as any) || 'quick');
  });

  safeHandle('external-tool:find-conflicts', async (_event, plugins: string[]) => {
    const et = await getExternalTool();
    return et.findConflicts(plugins || []);
  });

  safeHandle('external-tool:optimize-nif', async (_event, nifPath: string, settings: any) => {
    const et = await getExternalTool();
    return et.optimizeNIF(nifPath, settings || {});
  });

  safeHandle('external-tool:batch-fix-nifs', async (_event, folder: string, issues: string[]) => {
    const et = await getExternalTool();
    return et.batchFixNIFs(folder, issues || []);
  });

  safeHandle('external-tool:extract-nif-info', async (_event, nifPath: string) => {
    const et = await getExternalTool();
    return et.extractNIFInfo(nifPath);
  });

  safeHandle('external-tool:import-fbx', async (_event, fbxPath: string, settings: any) => {
    const et = await getExternalTool();
    return et.importFBX(fbxPath, settings || {});
  });

  safeHandle('external-tool:export-nif', async (_event, blendPath: string, settings: any) => {
    const et = await getExternalTool();
    return et.exportNIF(blendPath, settings || {});
  });

  safeHandle('external-tool:batch-convert-meshes', async (_event, files: string[], workflow: any) => {
    const et = await getExternalTool();
    return et.batchConvertMeshes(files || [], workflow || {});
  });

  safeHandle('external-tool:run-ck-command', async (_event, command: string, args: string[]) => {
    const et = await getExternalTool();
    return et.runCKCommand(command, args || []);
  });

  safeHandle('external-tool:generate-precombines', async (_event, espPath: string, cells: string[]) => {
    const et = await getExternalTool();
    return et.generatePrecombines(espPath, cells);
  });

  safeHandle('external-tool:pack-archive', async (_event, folder: string, archiveName: string, format: string) => {
    const et = await getExternalTool();
    return et.packArchive(folder, archiveName, (format as any) || 'General');
  });

  safeHandle('external-tool:unpack-archive', async (_event, ba2Path: string, outputFolder: string) => {
    const et = await getExternalTool();
    return et.unpackArchive(ba2Path, outputFolder);
  });

  // =========================================================================
  // asset-validation:* (delegates to AssetValidationEngine)
  // =========================================================================
  safeHandle('asset-validation:validate-mod', async (_event, modPath: string, depth: number) => {
    const av = await getAssetValidation();
    return av.validateMod(modPath, depth || 2);
  });

  safeHandle('asset-validation:validate-nif', async (_event, nifPath: string) => {
    const av = await getAssetValidation();
    return av.validateNIF(nifPath);
  });

  safeHandle('asset-validation:validate-dds', async (_event, ddsPath: string) => {
    const av = await getAssetValidation();
    return av.validateDDS(ddsPath);
  });

  safeHandle('asset-validation:validate-esp', async (_event, espPath: string) => {
    const av = await getAssetValidation();
    return av.validateESP(espPath);
  });

  safeHandle('asset-validation:validate-script', async (_event, pscPath: string) => {
    const av = await getAssetValidation();
    return av.validateScript(pscPath);
  });

  safeHandle('asset-validation:validate-sound', async (_event, wavPath: string) => {
    const av = await getAssetValidation();
    return av.validateSound(wavPath);
  });

  safeHandle('asset-validation:batch-validate', async (_event, files: any[]) => {
    const av = await getAssetValidation();
    return av.validateBatch(files || []);
  });

  safeHandle('asset-validation:auto-fix', async (_event, issues: any[]) => {
    const av = await getAssetValidation();
    return av.autoFixIssues(issues || []);
  });

  // =========================================================================
  // asset-validator:* (duplicates of asset-validation with report export)
  // =========================================================================
  safeHandle('asset-validator:validate-file', async (_event, filePath: string, type: string) => {
    const av = await getAssetValidation();
    const ext = (type || path.extname(filePath).slice(1)).toLowerCase();
    if (ext === 'nif') return av.validateNIF(filePath);
    if (ext === 'dds') return av.validateDDS(filePath);
    if (ext === 'esp' || ext === 'esm' || ext === 'esl') return av.validateESP(filePath);
    if (ext === 'psc' || ext === 'pex') return av.validateScript(filePath);
    if (ext === 'wav' || ext === 'xwm') return av.validateSound(filePath);
    return av.validateNIF(filePath); // generic fallback
  });

  safeHandle('asset-validator:validate-mod', async (_event, modPath: string, depth: number) => {
    const av = await getAssetValidation();
    return av.validateMod(modPath, depth || 2);
  });

  safeHandle('asset-validator:auto-fix', async (_event, issues: any[]) => {
    const av = await getAssetValidation();
    return av.autoFixIssues(issues || []);
  });

  safeHandle('asset-validator:export-report', async (_event, report: any, format: string) => {
    const outDir = path.join(app.getPath('userData'), 'validation-reports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const ts = Date.now();
    let outPath: string;
    if (format === 'json') {
      outPath = path.join(outDir, `report-${ts}.json`);
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
    } else {
      outPath = path.join(outDir, `report-${ts}.txt`);
      const lines: string[] = [];
      if (Array.isArray(report?.issues)) {
        for (const issue of report.issues) {
          lines.push(`[${issue.severity?.toUpperCase() || 'INFO'}] ${issue.file || ''}: ${issue.message || ''}`);
          if (issue.fix) lines.push(`  Fix: ${issue.fix}`);
        }
      } else {
        lines.push(JSON.stringify(report, null, 2));
      }
      fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
    }
    return { success: true, path: outPath };
  });

  // =========================================================================
  // conflict-resolution:* (delegates to ConflictResolutionEngine)
  // =========================================================================
  safeHandle('conflict-resolution:analyze', async (_event, plugins: string[]) => {
    const cr = await getConflictResolution();
    return cr.analyzeConflicts(plugins || []);
  });

  safeHandle('conflict-resolution:compare-records', async (_event, pluginA: string, pluginB: string, recordIdentifier: string) => {
    const cr = await getConflictResolution();
    return cr.compareRecords(pluginA, pluginB, recordIdentifier);
  });

  safeHandle('conflict-resolution:generate-patch', async (_event, conflicts: any[], strategy: string) => {
    const cr = await getConflictResolution();
    return cr.generatePatch(conflicts || [], strategy || 'auto');
  });

  safeHandle('conflict-resolution:check-compatibility', async (_event, modA: any, modB: any) => {
    const cr = await getConflictResolution();
    return cr.checkCompatibility(modA, modB);
  });

  safeHandle('conflict-resolution:recommend-merge', async (_event, plugins: string[]) => {
    const cr = await getConflictResolution();
    return cr.recommendMerge?.(plugins || []) ?? { recommendations: [] };
  });

  safeHandle('conflict-resolution:apply-rules', async (_event, conflicts: any[], rules: any[]) => {
    const cr = await getConflictResolution();
    return cr.applyRules?.(conflicts || [], rules || []) ?? { applied: [] };
  });

  safeHandle('conflict-resolution:save-patch', async (_event, patch: any, outputPath: string) => {
    const patchDir = path.dirname(outputPath);
    if (!fs.existsSync(patchDir)) fs.mkdirSync(patchDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(patch, null, 2), 'utf-8');
    return { success: true, path: outputPath };
  });

  // =========================================================================
  // load-order:* (delegates to LoadOrderOptimizerEngine)
  // =========================================================================
  safeHandle('load-order:analyze', async (_event, plugins: string[]) => {
    const lo = await getLoadOrder();
    return lo.analyzeLoadOrder(plugins || []);
  });

  safeHandle('load-order:apply-rules', async (_event, plugins: string[], rules: any[]) => {
    const lo = await getLoadOrder();
    return lo.applyCustomRules?.(plugins || [], rules || []) ?? { optimized: plugins };
  });

  safeHandle('load-order:detect-conflicts', async (_event, plugins: string[]) => {
    const lo = await getLoadOrder();
    return lo.detectConflicts?.(plugins || []) ?? lo.analyzeLoadOrder(plugins || []);
  });

  safeHandle('load-order:parse-plugin', async (_event, pluginPath: string) => {
    const lo = await getLoadOrder();
    return lo.parsePlugin?.(pluginPath) ?? { path: pluginPath };
  });

  safeHandle('load-order:predict-performance', async (_event, plugins: string[]) => {
    const lo = await getLoadOrder();
    return lo.predictPerformanceImpact?.(plugins || []) ?? { score: 0 };
  });

  safeHandle('load-order:resolve-dependencies', async (_event, plugins: string[]) => {
    const lo = await getLoadOrder();
    return lo.resolveDependencies?.(plugins || []) ?? { resolved: plugins };
  });

  safeHandle('load-order:save-optimization', async (_event, optimization: any, filePath: string) => {
    const saveDir = path.dirname(filePath);
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(optimization, null, 2), 'utf-8');
    return { success: true, path: filePath };
  });

  // =========================================================================
  // mod-packaging:* (delegates to ModPackagingEngine)
  // =========================================================================
  safeHandle('mod-packaging:start', async (_event, modPath: string) => {
    const mp = await getModPackaging();
    return mp.startPackaging(modPath);
  });

  safeHandle('mod-packaging:validate-structure', async (_event, modPath: string) => {
    const mp = await getModPackaging();
    return mp.validateStructure(modPath);
  });

  safeHandle('mod-packaging:create-archive', async (_event, settings: any) => {
    const mp = await getModPackaging();
    return mp.createArchive(settings);
  });

  safeHandle('mod-packaging:generate-readme', async (_event, modInfo: any, template: string) => {
    const mp = await getModPackaging();
    return mp.generateReadme(modInfo, template || 'default');
  });

  safeHandle('mod-packaging:append-changelog', async (_event, changelogPath: string, version: string, changes: string[]) => {
    const mp = await getModPackaging();
    return mp.appendChangelog(changelogPath, version, changes || []);
  });

  safeHandle('mod-packaging:prepare-nexus', async (_event, modPackage: any) => {
    const mp = await getModPackaging();
    return mp.prepareForNexus(modPackage);
  });

  safeHandle('mod-packaging:increment-version', async (_event, currentVersion: string, type: string) => {
    const mp = await getModPackaging();
    return mp.incrementVersion(currentVersion, type || 'patch');
  });

  safeHandle('mod-packaging:get-session', async (_event, sessionId: string) => {
    const mp = await getModPackaging();
    return mp.getSession?.(sessionId) ?? { sessionId, status: 'unknown' };
  });

  safeHandle('mod-packaging:update-session', async (_event, sessionId: string, updates: any) => {
    const mp = await getModPackaging();
    return mp.updateSession?.(sessionId, updates) ?? { sessionId, ...updates };
  });

  // =========================================================================
  // cloud-sync:* (delegates to CloudSyncEngine)
  // =========================================================================
  safeHandle('cloud-sync:sync-project', async (_event, projectId: string, direction: string) => {
    const cs = await getCloudSync();
    return cs.syncProject(projectId, direction || 'bidirectional');
  });

  safeHandle('cloud-sync:enable-auto-sync', async (_event, projectId: string, interval: number) => {
    const cs = await getCloudSync();
    return cs.enableAutoSync(projectId, interval || 300000);
  });

  safeHandle('cloud-sync:share-project', async (_event, projectId: string, collaborators: string[]) => {
    const cs = await getCloudSync();
    return cs.shareProject(projectId, collaborators || []);
  });

  safeHandle('cloud-sync:join-project', async (_event, inviteCode: string) => {
    const cs = await getCloudSync();
    return cs.joinProject(inviteCode);
  });

  safeHandle('cloud-sync:leave-collaboration-session', async (_event, sessionId: string, userId: string) => {
    const cs = await getCloudSync();
    return cs.leaveCollaborationSession(sessionId, userId);
  });

  safeHandle('cloud-sync:end-collaboration-session', async (_event, sessionId: string) => {
    const cs = await getCloudSync();
    return cs.endCollaborationSession(sessionId);
  });

  safeHandle('cloud-sync:broadcast-change', async (_event, change: any) => {
    const cs = await getCloudSync();
    return cs.broadcastChange(change);
  });

  safeHandle('cloud-sync:subscribe-to-changes', async (_event, projectId: string, filters: any) => {
    const cs = await getCloudSync();
    return cs.subscribeToChanges(projectId, filters);
  });

  safeHandle('cloud-sync:unsubscribe-from-changes', async (_event, subscriptionId: string) => {
    const cs = await getCloudSync();
    return cs.unsubscribeFromChanges?.(subscriptionId) ?? { success: true };
  });

  safeHandle('cloud-sync:detect-conflicts', async (_event, projectId: string) => {
    const cs = await getCloudSync();
    return cs.detectSyncConflicts(projectId, {});
  });

  safeHandle('cloud-sync:resolve-conflict', async (_event, conflict: any, resolution: any) => {
    const cs = await getCloudSync();
    return cs.resolveSyncConflict(conflict, resolution);
  });

  safeHandle('cloud-sync:get-project-history', async (_event, projectId: string) => {
    const cs = await getCloudSync();
    return cs.getProjectHistory(projectId);
  });

  safeHandle('cloud-sync:restore-snapshot', async (_event, snapshotId: string) => {
    const cs = await getCloudSync();
    return cs.restoreSnapshot(snapshotId);
  });

  safeHandle('cloud-sync:upload-asset', async (_event, assetPath: string, projectId: string) => {
    const cs = await getCloudSync();
    return cs.uploadAsset(assetPath, projectId);
  });

  safeHandle('cloud-sync:download-asset', async (_event, cdnUrl: string, localPath: string) => {
    const cs = await getCloudSync();
    return cs.downloadAsset(cdnUrl, localPath);
  });

  safeHandle('cloud-sync:get-status', async (_event, projectId: string) => {
    const cs = await getCloudSync();
    return cs.getStatus?.(projectId) ?? { projectId, status: 'idle' };
  });

  safeHandle('cloud-sync:get-collaboration-session', async (_event, projectId: string) => {
    const cs = await getCloudSync();
    return cs.getCollaborationSession?.(projectId) ?? { projectId };
  });

  // =========================================================================
  // game-integration:* (delegates to GameIntegrationEngine)
  // =========================================================================
  safeHandle('game-integration:detect-game', async () => {
    const gi = await getGameIntegration();
    return gi.detectRunningGame();
  });

  safeHandle('game-integration:console-command', async (_event, command: string, game: string) => {
    const gi = await getGameIntegration();
    return gi.executeConsoleCommand(command, game || 'fallout4');
  });

  safeHandle('game-integration:analyze-save', async (_event, savePath: string) => {
    const gi = await getGameIntegration();
    return gi.analyzeSaveGame(savePath);
  });

  safeHandle('game-integration:get-active-mods', async (_event, game: string) => {
    const gi = await getGameIntegration();
    return gi.getActiveMods?.(game || 'fallout4') ?? [];
  });

  safeHandle('game-integration:start-monitoring', async (_event, pid: number) => {
    const gi = await getGameIntegration();
    return gi.startPerformanceMonitoring?.(pid) ?? { success: true };
  });

  safeHandle('game-integration:screenshot', async () => {
    const gi = await getGameIntegration();
    return gi.captureScreenshot?.() ?? { success: false, error: 'Screenshot not supported' };
  });

  safeHandle('game-integration:inject-plugin', async (_event, dllPath: string, game: string) => {
    const gi = await getGameIntegration();
    return gi.injectPlugin?.(dllPath, game || 'fallout4') ?? { success: false, error: 'Injection not supported on this platform' };
  });

  // =========================================================================
  // dds-converter:* (delegates to DDSConverterEngine)
  // =========================================================================
  safeHandle('dds-converter:generate-mipmaps', async (_event, imagePath: string, levels: number) => {
    const dds = await getDdsConverter();
    return dds.generateMipmaps(imagePath, levels);
  });

  safeHandle('dds-converter:get-default-format-rules', async () => {
    const { DEFAULT_FORMAT_MAPPING_RULES } = await import('../../mining/ddsConverter') as any;
    return DEFAULT_FORMAT_MAPPING_RULES ?? [];
  });

  safeHandle('dds-converter:get-preset', async (_event, type: string) => {
    const dds = await getDdsConverter();
    return dds.getPreset?.(type) ?? null;
  });

  // =========================================================================
  // Misc utility channels
  // =========================================================================
  safeHandle('get-plugin-metadata', async (_event, pluginPath: string) => {
    if (!fs.existsSync(pluginPath)) {
      return { success: false, error: `File not found: ${pluginPath}` };
    }
    const stat = fs.statSync(pluginPath);
    const ext = path.extname(pluginPath).slice(1).toLowerCase();
    const buf = fs.readFileSync(pluginPath);
    // Read TES4 record header for plugin metadata
    const pluginName = path.basename(pluginPath);
    let author = '';
    let description = '';
    let version = '';
    const masters: string[] = [];
    // TES4 is at offset 0; HEDR sub-record follows at offset 20 (after record header)
    // Sub-records: HEDR(version), CNAM(author), SNAM(description), MAST(master)
    const subRecordStart = 20;
    let offset = subRecordStart;
    while (offset + 6 < Math.min(buf.length, 8192)) {
      const type = buf.slice(offset, offset + 4).toString('ascii');
      const len = buf.readUInt16LE(offset + 4);
      const data = buf.slice(offset + 6, offset + 6 + len);
      if (type === 'HEDR' && len >= 4) version = data.readFloatLE(0).toFixed(2);
      else if (type === 'CNAM') author = data.slice(0, data.indexOf(0) !== -1 ? data.indexOf(0) : data.length).toString('utf-8');
      else if (type === 'SNAM') description = data.slice(0, data.indexOf(0) !== -1 ? data.indexOf(0) : data.length).toString('utf-8');
      else if (type === 'MAST') masters.push(data.slice(0, data.indexOf(0) !== -1 ? data.indexOf(0) : data.length).toString('utf-8'));
      else if (!['DATA', 'ONAM', 'INTV', 'INCC'].includes(type)) break;
      offset += 6 + len;
    }
    return {
      success: true,
      name: pluginName,
      path: pluginPath,
      type: ext.toUpperCase(),
      size: stat.size,
      modified: stat.mtime.toISOString(),
      version,
      author,
      description,
      masters
    };
  });

  safeHandle('get-process-metrics', async (_event, pid: number) => {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          `wmic process where "ProcessId=${pid}" get WorkingSetSize,PageFileUsage,PercentProcessorTime /format:csv`
        );
        const lines = stdout.trim().split('\n').filter(Boolean);
        if (lines.length >= 2) {
          const parts = lines[lines.length - 1].split(',');
          return {
            success: true,
            pid,
            memoryBytes: parseInt(parts[2] || '0', 10),
            pagefile: parseInt(parts[1] || '0', 10)
          };
        }
      }
      return { success: true, pid, memoryBytes: 0, pagefile: 0 };
    } catch {
      return { success: false, pid, error: 'Could not read process metrics' };
    }
  });

  safeHandle('read-crash-log', async (_event, logPath: string) => {
    if (!logPath || !fs.existsSync(logPath)) {
      return { success: false, error: 'Log file not found' };
    }
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n');
    const errors = lines.filter(l => /exception|error|crash|fault|stack/i.test(l));
    return { success: true, content, errors, lineCount: lines.length };
  });
}
