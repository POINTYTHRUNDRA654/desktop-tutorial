/**
 * UpscaylExtension — Upscayl AI upscaler integration for MOSSY.SPACE
 *
 * Detects Upscayl installation and its bundled CLI binary (upscayl-bin).
 * Queues upscale jobs and executes them via the electron WORKFLOW_RUNNER_RUN_TOOL
 * IPC channel, which spawns upscayl-bin with the correct arguments.
 * Falls back to simulation if upscayl-bin is not found.
 *
 * Upscayl-bin CLI: upscayl-bin -i <input> -o <output> -s <scale> -n <model>
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Maximize2, Play, RefreshCw, AlertTriangle, CheckCircle2,
  Image, Upload, Download, Settings, FolderOpen, BookOpen,
  ChevronRight, Search, ExternalLink,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UpscaleJob {
  id: string;
  fileName: string;
  inputPath: string;
  outputPath: string;
  originalW: number;
  originalH: number;
  targetScale: 2 | 3 | 4;
  model: string;
  outputFormat: 'png' | 'jpg' | 'webp';
  status: 'queued' | 'processing' | 'complete' | 'error';
  progress: number;
  errorMsg?: string;
}

interface UpscaleModel {
  id: string;
  name: string;
  type: 'general' | 'anime' | 'photo' | 'face';
  description: string;
  fo4Use: string;
}

// ─── Model catalogue ─────────────────────────────────────────────────────────

const UPSCALE_MODELS: UpscaleModel[] = [
  {
    id: 'realesrgan-x4plus',
    name: 'RealESRGAN x4plus',
    type: 'general',
    description: 'Best for general images and textures.',
    fo4Use: 'Diffuse maps, environment textures, prop textures.',
  },
  {
    id: 'realesrgan-x4plus-anime',
    name: 'RealESRGAN x4plus (Anime)',
    type: 'anime',
    description: 'Optimized for art with flat-shading or stylised lines.',
    fo4Use: 'Concept art references, UI icons, menu backgrounds.',
  },
  {
    id: 'remacri',
    name: 'Remacri',
    type: 'general',
    description: 'High-detail model for photographic and rendered images.',
    fo4Use: 'Screenshot-derived textures, face textures.',
  },
  {
    id: 'ultramix-balanced',
    name: 'Ultramix Balanced',
    type: 'general',
    description: 'Balanced sharpness across all content types.',
    fo4Use: 'General-purpose upscaling when unsure which model to use.',
  },
];

// Common Upscayl binary locations (Windows)
const UPSCAYL_BIN_CANDIDATES = [
  'C:\\Program Files\\Upscayl\\resources\\bin\\upscayl-bin.exe',
  'C:\\Program Files (x86)\\Upscayl\\resources\\bin\\upscayl-bin.exe',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function basename(p: string): string {
  return p.replace(/.*[/\\]/, '');
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

async function findUpscaylBin(bridge: any): Promise<string | null> {
  if (!bridge?.readFile) return null;

  // Check stored setting first
  const settings = await bridge.getSettings?.().catch(() => null);
  const stored: string = settings?.upscaylPath || '';
  if (stored) {
    const binFromStored = stored.toLowerCase().endsWith('upscayl-bin.exe')
      ? stored
      : stored.replace(/upscayl\.exe$/i, 'resources\\bin\\upscayl-bin.exe');
    try { await bridge.readFile(binFromStored); return binFromStored; } catch { /* try others */ }
  }

  // AppData path (most common for user installs)
  const profile = (window as any).__env?.LOCALAPPDATA || '';
  if (profile) {
    const appDataBin = `${profile}\\Programs\\upscayl\\resources\\bin\\upscayl-bin.exe`;
    try { await bridge.readFile(appDataBin); return appDataBin; } catch { /* try others */ }
  }

  for (const candidate of UPSCAYL_BIN_CANDIDATES) {
    try { await bridge.readFile(candidate); return candidate; } catch { /* try next */ }
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const UpscaylExtension: React.FC = () => {
  const navigate = useNavigate();
  const [isConnected,    setIsConnected]    = useState(false);
  const [upscaylBinPath, setUpscaylBinPath] = useState<string | null>(null);
  const [checking,       setChecking]       = useState(false);
  const [selectedFiles,  setSelectedFiles]  = useState<Array<{ name: string; path: string; w: number; h: number }>>([]);
  const [selectedModel,  setSelectedModel]  = useState(UPSCALE_MODELS[0].id);
  const [selectedScale,  setSelectedScale]  = useState<2 | 3 | 4>(4);
  const [outputFormat,   setOutputFormat]   = useState<'png' | 'jpg' | 'webp'>('png');
  const [outputDir,      setOutputDir]      = useState('');
  const [jobs,           setJobs]           = useState<UpscaleJob[]>([]);
  const [statusMsg,      setStatusMsg]      = useState('');
  const [searchQuery,    setSearchQuery]    = useState('');

  // ─── Connection check ─────────────────────────────────────────────────────

  const checkConnection = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
      const binPath = await findUpscaylBin(bridge);
      setUpscaylBinPath(binPath);

      // Also check Neural Link
      let liveDetected = false;
      try {
        const data = JSON.parse(localStorage.getItem('mossy_active_tools') || '{}');
        liveDetected = data.tools?.some((t: any) => t.name.toLowerCase().includes('upscayl')) ?? false;
      } catch { /* ignore */ }

      setIsConnected(!!binPath || liveDetected);
    } finally {
      if (!silent) setChecking(false);
    }
  }, []);

  useEffect(() => { void checkConnection(); }, []);

  // Periodic silent check every 15s
  useEffect(() => {
    const id = setInterval(() => void checkConnection(true), 15_000);
    return () => clearInterval(id);
  }, [checkConnection]);

  // ─── File selection ───────────────────────────────────────────────────────

  const browseForImages = async () => {
    const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
    try {
      const folderPath: string | undefined =
        await bridge?.pickDirectory?.('Select image folder') ?? undefined;
      if (!folderPath) return;

      setStatusMsg(`Scanning folder: ${folderPath}`);
      const entries: Array<{ name: string; path: string; type: string }> =
        (await bridge?.browseDirectory?.(folderPath)) ?? [];

      const images = entries.filter((e) =>
        e.type === 'file' && /\.(png|jpg|jpeg|bmp|tiff|tga|webp)$/i.test(e.name)
      );

      if (!images.length) { setStatusMsg('No image files found in selected folder.'); return; }

      setSelectedFiles(images.map((e) => ({ name: e.name, path: e.path, w: 0, h: 0 })));
      setOutputDir(folderPath + '\\upscayl_output');
      setStatusMsg(`${images.length} image(s) selected from ${folderPath}`);
    } catch (e: any) {
      setStatusMsg(`Browse failed: ${e?.message || e}`);
    }
  };

  const pickOutputDir = async () => {
    const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
    try {
      const dir = await bridge?.pickDirectory?.('Select output folder');
      if (dir) { setOutputDir(dir); setStatusMsg(`Output folder set to: ${dir}`); }
    } catch { setStatusMsg('Could not open folder picker.'); }
  };

  // ─── Upscaling ───────────────────────────────────────────────────────────

  const startUpscale = async () => {
    const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
    const filesToProcess = selectedFiles.length > 0
      ? selectedFiles
      : [{ name: 'demo_texture.png', path: '', w: 512, h: 512 }]; // demo fallback

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const jobId = `${Date.now()}-${i}`;
      const outFileName = `${stripExt(file.name)}_${selectedScale}x_${selectedModel}.${outputFormat}`;
      const outPath = outputDir ? `${outputDir}\\${outFileName}` : outFileName;

      const job: UpscaleJob = {
        id: jobId,
        fileName: file.name,
        inputPath: file.path,
        outputPath: outPath,
        originalW: file.w || 512,
        originalH: file.h || 512,
        targetScale: selectedScale,
        model: selectedModel,
        outputFormat,
        status: 'queued',
        progress: 0,
      };

      setJobs((prev) => [...prev, job]);

      // Small stagger between jobs
      await new Promise<void>((r) => setTimeout(r, i * 200));

      // Try real upscayl-bin execution
      if (upscaylBinPath && file.path && bridge?.workflowRunnerRunTool) {
        setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'processing', progress: 10 } : j));
        try {
          const args = [
            '-i', file.path,
            '-o', outPath,
            '-s', String(selectedScale),
            '-n', selectedModel,
            '-f', outputFormat,
          ];
          const result = await bridge.workflowRunnerRunTool({ cmd: upscaylBinPath, args });
          if (result?.exitCode === 0) {
            setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'complete', progress: 100 } : j));
            continue;
          } else {
            throw new Error(result?.stderr || `Exit code ${result?.exitCode}`);
          }
        } catch (err: any) {
          setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'error', errorMsg: err?.message || 'Upscayl failed' } : j));
          continue;
        }
      }

      // Simulation fallback
      runSimulation(jobId);
    }
  };

  const runSimulation = (jobId: string) => {
    let delay = 600;
    [30, 60, 85, 100].forEach((pct) => {
      setTimeout(() => {
        setJobs((prev) => prev.map((j) => {
          if (j.id !== jobId) return j;
          if (pct === 100) return { ...j, status: 'complete', progress: 100 };
          return { ...j, status: 'processing', progress: pct };
        }));
      }, delay);
      delay += 900;
    });
  };

  // ─── Actions ─────────────────────────────────────────────────────────────

  const openOutputFolder = async () => {
    const bridge: any = (window as any).electron?.api;
    if (outputDir && bridge?.openProgram) {
      await bridge.openProgram(outputDir).catch(() => null);
    } else if (bridge?.assetScanner?.browseFolder) {
      await bridge.assetScanner.browseFolder();
    } else {
      setStatusMsg('Set an output folder above, then open it from Windows Explorer.');
    }
  };

  const exportJobLog = async () => {
    const bridge: any = (window as any).electron?.api;
    const completed = jobs.filter((j) => j.status === 'complete' || j.status === 'error');
    if (!completed.length) { setStatusMsg('No completed jobs to export.'); return; }
    if (!bridge?.saveFile) { setStatusMsg('Export not available.'); return; }
    const lines = [
      `# Upscayl Job Log — ${new Date().toLocaleString()}`,
      `# Model: ${selectedModel} · Scale: ${selectedScale}x · Format: ${outputFormat.toUpperCase()}`,
      '',
      ...completed.map((j) =>
        `[${j.status.toUpperCase()}] ${j.fileName} → ${j.outputPath}${j.errorMsg ? ` (${j.errorMsg})` : ''}`
      ),
    ];
    try {
      const saved = await bridge.saveFile(lines.join('\n'), 'upscayl-job-log.txt');
      if (saved) setStatusMsg(`Exported ${completed.length} job(s) to: ${saved}`);
    } catch { setStatusMsg('Export failed.'); }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const queuedCount    = jobs.filter((j) => j.status === 'queued').length;
  const processingCount = jobs.filter((j) => j.status === 'processing').length;
  const completedCount = jobs.filter((j) => j.status === 'complete').length;
  const errorCount     = jobs.filter((j) => j.status === 'error').length;
  const selectedModelInfo = UPSCALE_MODELS.find((m) => m.id === selectedModel);

  const filteredFiles = selectedFiles.filter((f) =>
    !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const previewW = 512 * selectedScale;
  const previewH = 512 * selectedScale;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Maximize2 className="w-6 h-6 text-emerald-400" /> Upscayl Integration
              </h1>
              <p className="text-slate-400 mt-1 text-sm">AI texture upscaling · batch processing · DDS-ready output</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs ${isConnected ? 'bg-green-900/30 border border-green-500/30 text-green-300' : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'Upscayl Ready' : 'Not Detected'}
              </div>
              <button onClick={() => void checkConnection()} disabled={checking}
                className="px-3 py-1.5 text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-200 rounded-lg hover:bg-emerald-600/30 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking…' : 'Recheck'}
              </button>
            </div>
          </div>

          {/* Not detected */}
          {!isConnected && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-5 flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-300 mb-1 text-sm">Upscayl Not Found</h3>
                <p className="text-sm text-slate-300 mb-2">
                  Upscayl was not detected on this system. Install it, then set the path in Settings → External Tools.
                  Upscaling will run in simulation mode until <code className="bg-slate-800 px-1 rounded text-xs">upscayl-bin.exe</code> is found.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => void checkConnection()} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                  <button onClick={() => { const b: any = (window as any).electron?.api; b?.openExternal?.('https://upscayl.org/').catch(() => window.open('https://upscayl.org/', '_blank')); }}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Get Upscayl
                  </button>
                  <button onClick={() => navigate('/settings')}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </button>
                </div>
                {upscaylBinPath === null && (
                  <p className="text-xs text-slate-500 mt-2">
                    Checked: {UPSCAYL_BIN_CANDIDATES.join(', ')} + AppData/Local/Programs/upscayl
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Configuration */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5">
            <h3 className="text-sm font-bold text-white mb-4">Upscale Configuration</h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-4">
                {/* Model */}
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">AI Model</label>
                  <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm">
                    {UPSCALE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                    ))}
                  </select>
                  {selectedModelInfo && (
                    <div className="mt-1.5 text-xs text-slate-400">
                      <p>{selectedModelInfo.description}</p>
                      <p className="text-emerald-400/80 mt-0.5">FO4 use: {selectedModelInfo.fo4Use}</p>
                    </div>
                  )}
                </div>

                {/* Scale */}
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">Scale Factor</label>
                  <div className="flex gap-2">
                    {([2, 3, 4] as const).map((scale) => (
                      <button key={scale} onClick={() => setSelectedScale(scale)}
                        className={`flex-1 px-3 py-2.5 rounded-lg font-semibold text-sm transition-colors ${selectedScale === scale ? 'bg-emerald-600 text-white' : 'bg-slate-900/50 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                        {scale}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output format */}
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">Output Format</label>
                  <div className="flex gap-2">
                    {(['png', 'jpg', 'webp'] as const).map((fmt) => (
                      <button key={fmt} onClick={() => setOutputFormat(fmt)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${outputFormat === fmt ? 'bg-emerald-600 text-white' : 'bg-slate-900/50 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">After upscaling, convert PNG to DDS (BC1/BC3/BC7) for in-game use.</p>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* File selection */}
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">Image Source</h4>
                    {selectedFiles.length > 0 && (
                      <button onClick={() => { setSelectedFiles([]); setStatusMsg(''); }} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
                    )}
                  </div>
                  <button onClick={browseForImages}
                    className="w-full px-3 py-2.5 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2 text-sm mb-2">
                    <Upload className="w-4 h-4" />
                    {selectedFiles.length > 0 ? `${selectedFiles.length} image(s) selected` : 'Select Image Folder'}
                  </button>

                  {/* Output dir */}
                  <button onClick={pickOutputDir}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-xs">
                    <FolderOpen className="w-3.5 h-3.5" />
                    {outputDir ? basename(outputDir) : 'Set Output Folder'}
                  </button>
                </div>

                {/* Preview */}
                <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-lg">
                  <h4 className="text-xs font-bold text-emerald-300 mb-2">Output Preview</h4>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Input (est.):</span>
                      <span className="font-mono">512 × 512</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Upscaled:</span>
                      <span className="font-mono text-emerald-400">{previewW} × {previewH}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Format:</span>
                      <span className="font-mono">{outputFormat.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">CLI:</span>
                      <span className="font-mono text-slate-500 text-[10px]">upscayl-bin -{selectedScale}x -{selectedModel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* File list */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400 font-medium">{selectedFiles.length} files queued</p>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter…" className="pl-6 pr-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-xs text-white w-32" />
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredFiles.slice(0, 50).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 bg-slate-900/40 rounded text-xs text-slate-300">
                      <Image className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                  {filteredFiles.length > 50 && (
                    <p className="text-xs text-slate-500 text-center py-1">+{filteredFiles.length - 50} more</p>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => void startUpscale()}
              className={`w-full mt-5 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm ${isConnected ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'}`}>
              <Play className="w-4 h-4" />
              {isConnected ? 'Start Upscaling' : 'Start Upscaling (Simulation)'}
              {selectedFiles.length > 0 && <span className="text-xs opacity-70">· {selectedFiles.length} file(s)</span>}
            </button>
          </div>

          {/* Job Queue */}
          {jobs.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Processing Queue</h3>
                <div className="flex gap-3 text-xs">
                  <span className="text-blue-400">{queuedCount} queued</span>
                  <span className="text-yellow-400">{processingCount} running</span>
                  <span className="text-green-400">{completedCount} done</span>
                  {errorCount > 0 && <span className="text-red-400">{errorCount} errors</span>}
                </div>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {jobs.slice(-20).reverse().map((job) => (
                  <div key={job.id} className={`p-3 rounded-lg border ${job.status === 'complete' ? 'bg-green-900/20 border-green-500/30' : job.status === 'processing' ? 'bg-yellow-900/20 border-yellow-500/30' : job.status === 'error' ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Image className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-white truncate">{job.fileName}</span>
                        </div>
                        <div className="text-xs text-slate-400 mb-1.5">
                          {job.targetScale}x · {job.model} · {job.outputFormat.toUpperCase()}
                          {job.outputPath && <span className="ml-2 text-slate-500">→ {basename(job.outputPath)}</span>}
                        </div>
                        {job.status === 'processing' && (
                          <div className="w-full bg-slate-900/50 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                          </div>
                        )}
                        {job.errorMsg && <p className="text-xs text-red-400 mt-0.5">{job.errorMsg}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${job.status === 'complete' ? 'bg-green-500/20 text-green-300' : job.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' : job.status === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                          {job.status}
                        </span>
                        {job.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        {job.status === 'processing' && <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Models */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5">
            <h3 className="text-sm font-bold text-white mb-3">Available AI Models</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {UPSCALE_MODELS.map((model) => (
                <div key={model.id} onClick={() => setSelectedModel(model.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedModel === model.id ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-slate-900/50 border-slate-700/50 hover:border-emerald-500/30'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white text-sm">{model.name}</span>
                    <span className="text-[10px] px-1.5 bg-slate-700 text-slate-300 rounded capitalize">{model.type}</span>
                  </div>
                  <p className="text-xs text-slate-400">{model.description}</p>
                  <p className="text-[10px] text-emerald-400/70 mt-0.5">FO4: {model.fo4Use}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5">
            <h3 className="text-sm font-bold text-white mb-3">Quick Actions</h3>
            {statusMsg && <div className="mb-3 px-3 py-2 bg-slate-900/70 border border-slate-600/50 rounded text-xs text-slate-300">{statusMsg}</div>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button onClick={openOutputFolder} className="px-3 py-2.5 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-900/30 transition-colors flex items-center gap-2 justify-center text-sm"><FolderOpen className="w-4 h-4" /> Open Output</button>
              <button onClick={browseForImages} className="px-3 py-2.5 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors flex items-center gap-2 justify-center text-sm"><Upload className="w-4 h-4" /> Add Images</button>
              <button onClick={exportJobLog} className="px-3 py-2.5 bg-cyan-900/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-900/30 transition-colors flex items-center gap-2 justify-center text-sm"><Download className="w-4 h-4" /> Export Log</button>
              <button onClick={() => navigate('/settings')} className="px-3 py-2.5 bg-emerald-900/20 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-900/30 transition-colors flex items-center gap-2 justify-center text-sm"><Settings className="w-4 h-4" /> Settings</button>
            </div>
          </div>

          {/* FO4 Guide */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-300">Upscayl for FO4 Modding — Texture Pipeline</span>
            </div>
            <div className="space-y-1">
              {[
                'Use RealESRGAN-x4plus for diffuse (albedo) textures. Max recommended output: 4x the original (512→2048, 1024→4096).',
                'For face/NPC textures, use Remacri to preserve skin-pore and fine-detail fidelity before FaceGen import.',
                'After upscaling, convert PNG to DDS using the Textures & Materials hub — BC1 for no-alpha, BC3 for alpha, BC5 for normals.',
                'Normal maps should NOT be upscaled with AI — bake new normals from the high-res source mesh instead (xNormal/Substance).',
                'Batch upscale a folder of vanilla 512x textures overnight, then run the batch DDS converter to get game-ready assets.',
              ].map((tip, i) => (
                <div key={i} className="flex gap-2">
                  <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
