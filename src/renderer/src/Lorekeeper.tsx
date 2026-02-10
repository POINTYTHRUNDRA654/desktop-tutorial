import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mountain, AlertTriangle, Zap, RefreshCw, Folder, Database, Copy, CheckCircle2 } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxy } from './components/useWheelScrollProxy';

// --- Types ---
type LODPass = 'lod0' | 'lod1' | 'lod2' | 'lod3' | 'lod4';
type PrecombineType = 'static' | 'dynamic' | 'billboard';

interface LODAsset {
  id: string;
  name: string;
  sourceNif: string;
  lodPass: LODPass;
  targetDir: string;
  textureReduction: number; // % reduction: 50, 25, 10
  billboardMode: 'none' | 'auto' | 'custom';
  mergeChance: number; // 0-100 for LOD1+
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'done' | 'error';
  lastRun?: string;
  errorLog?: string;
  outputFiles: string[];
  meshReduction?: number; // % mesh reduction achieved
  estimatedMemorySavings?: number; // MB
  triangleCount?: { before: number; after: number };
  fullLog?: string;
}

interface PrecombineJob {
  id: string;
  name: string;
  cellRange: string; // e.g., "01000000-01FFFFFF" for worldspace 01
  interiorCells: boolean;
  includeStatics: boolean;
  includeDynamic: boolean;
  prpMode: boolean; // Pre-rendered Patches
  billboardFallback: boolean;
  preset?: 'interior-dungeon' | 'dense-exterior' | 'settlement' | 'custom';
  status: 'pending' | 'processing' | 'done' | 'error';
  lastRun?: string;
  errorLog?: string;
  outputBA2?: string;
  outputNifs?: number;
  totalMeshes?: number;
  compressionRatio?: number; // %
  fullLog?: string;
}

type LorekeeperProps = {
  embedded?: boolean;
};

const Lorekeeper: React.FC<LorekeeperProps> = ({ embedded = false }) => {
  // --- Parsing Utilities ---
  const parseLODGenOutput = (output: string): Partial<LODAsset> => {
    const result: Partial<LODAsset> = {};
    const lines = output.split('\n');
    
    // Extract NIF files generated
    const nifMatch = output.match(/Generated.*?:\s*([\w\-_\.\s\/]+\.nif)/gi);
    if (nifMatch) result.outputFiles = nifMatch.map(m => m.replace(/Generated.*?:\s*/, ''));
    
    // Extract mesh reduction %
    const reductionMatch = output.match(/Mesh reduction:\s*([\d.]+)%/i);
    if (reductionMatch) result.meshReduction = parseFloat(reductionMatch[1]);
    
    // Extract triangle counts
    const triMatch = output.match(/Triangles:\s*(\d+)\s*->\s*(\d+)/i);
    if (triMatch) result.triangleCount = { before: parseInt(triMatch[1]), after: parseInt(triMatch[2]) };
    
    // Extract memory savings
    const memMatch = output.match(/Memory savings:\s*([\d.]+)\s*MB/i);
    if (memMatch) result.estimatedMemorySavings = parseFloat(memMatch[1]);
    
    result.fullLog = output;
    return result;
  };

  const parsePJMOutput = (output: string): Partial<PrecombineJob> => {
    const result: Partial<PrecombineJob> = {};
    
    // Extract output NIF count
    const nifMatch = output.match(/Created\s*(\d+)\s*precombined NIF/i);
    if (nifMatch) result.outputNifs = parseInt(nifMatch[1]);
    
    // Extract total meshes processed
    const meshMatch = output.match(/Processed\s*(\d+)\s*meshes?/i);
    if (meshMatch) result.totalMeshes = parseInt(meshMatch[1]);
    
    // Extract BA2 path
    const ba2Match = output.match(/BA2:\s*([^\n]+\.ba2)/i);
    if (ba2Match) result.outputBA2 = ba2Match[1].trim();
    
    // Extract compression ratio
    const compMatch = output.match(/Compression ratio:\s*([\d.]+)%/i);
    if (compMatch) result.compressionRatio = parseFloat(compMatch[1]);
    
    result.fullLog = output;
    return result;
  };

  const precombinePresets: Record<string, Partial<PrecombineJob>> = {
    'interior-dungeon': {
      interiorCells: true,
      includeStatics: true,
      includeDynamic: false,
      prpMode: true,
      billboardFallback: false,
    },
    'dense-exterior': {
      interiorCells: false,
      includeStatics: true,
      includeDynamic: false,
      prpMode: true,
      billboardFallback: true,
    },
    'settlement': {
      interiorCells: false,
      includeStatics: true,
      includeDynamic: true,
      prpMode: false,
      billboardFallback: false,
    },
  };

  const [lodAssets, setLodAssets] = useState<LODAsset[]>([]);
  const [precombineJobs, setPrecombineJobs] = useState<PrecombineJob[]>([]);
  const [selectedLOD, setSelectedLOD] = useState<LODAsset | null>(null);
  const [selectedPrecombine, setSelectedPrecombine] = useState<PrecombineJob | null>(null);
  const [searchLOD, setSearchLOD] = useState('');
  const [searchPrecombine, setSearchPrecombine] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [lodgenPath, setLodgenPath] = useState(() => {
    try { return localStorage.getItem('lorekeeper-lodgen-path') || ''; } catch { return ''; }
  });
  const [pjmPath, setPjmPath] = useState(() => {
    try { return localStorage.getItem('lorekeeper-pjm-path') || ''; } catch { return ''; }
  });
  const [newPresetName, setNewPresetName] = useState('');
  const api = (window as any).electron?.api;

  const toolPathsSectionRef = useRef<HTMLDivElement | null>(null);
  const lodSectionRef = useRef<HTMLDivElement | null>(null);
  const precombineSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lorekeeper-lod-assets');
    if (stored) {
      try {
        setLodAssets(JSON.parse(stored));
      } catch {
        setLodAssets([]);
      }
    }

    const storedPrecombines = localStorage.getItem('lorekeeper-precombines');
    if (storedPrecombines) {
      try {
        setPrecombineJobs(JSON.parse(storedPrecombines));
      } catch {
        setPrecombineJobs([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lorekeeper-lod-assets', JSON.stringify(lodAssets));
  }, [lodAssets]);

  useEffect(() => {
    localStorage.setItem('lorekeeper-precombines', JSON.stringify(precombineJobs));
  }, [precombineJobs]);

  useEffect(() => {
    localStorage.setItem('lorekeeper-lodgen-path', lodgenPath);
  }, [lodgenPath]);

  useEffect(() => {
    localStorage.setItem('lorekeeper-pjm-path', pjmPath);
  }, [pjmPath]);

  const runLODGen = async (asset: LODAsset) => {
    if (!lodgenPath) {
      alert('Set LODGEN tool path first');
      return;
    }
    setProcessingIds(prev => new Set(prev).add(asset.id));
    try {
      const args = [
        '--input', asset.sourceNif,
        '--lod-level', asset.lodPass.replace('lod', ''),
        '--output', asset.targetDir,
        '--texture-reduction', asset.textureReduction.toString(),
        '--merge-chance', asset.mergeChance.toString(),
        ...(asset.billboardMode !== 'none' ? ['--billboard-mode', asset.billboardMode] : []),
      ];
      const result = await api?.runTool?.({ cmd: lodgenPath, args });
      const log = [result?.stdout, result?.stderr].filter(Boolean).join('\n') || 'LOD generation completed.';
      const parsed = parseLODGenOutput(log);
      setLodAssets(prev => prev.map(a => a.id === asset.id ? {
        ...a,
        status: result?.exitCode === 0 ? 'done' : 'error',
        lastRun: new Date().toISOString().slice(0, 16).replace('T', ' '),
        errorLog: result?.exitCode === 0 ? '' : log,
        outputFiles: parsed.outputFiles || [],
        meshReduction: parsed.meshReduction,
        estimatedMemorySavings: parsed.estimatedMemorySavings,
        triangleCount: parsed.triangleCount,
        fullLog: parsed.fullLog
      } : a));
    } catch (e) {
      setLodAssets(prev => prev.map(a => a.id === asset.id ? {
        ...a, status: 'error', errorLog: String(e), lastRun: new Date().toISOString().slice(0, 16).replace('T', ' ')
      } : a));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  };

  const runPrecombineJob = async (job: PrecombineJob) => {
    if (!pjmPath) {
      alert('Set PJM tool path first');
      return;
    }
    setProcessingIds(prev => new Set(prev).add(job.id));
    try {
      const args = [
        '--cells', job.cellRange,
        ...(job.interiorCells ? ['--interior'] : []),
        ...(job.includeStatics ? ['--statics'] : []),
        ...(job.includeDynamic ? ['--dynamic'] : []),
        ...(job.prpMode ? ['--prp'] : []),
        ...(job.billboardFallback ? ['--billboard-fallback'] : []),
      ];
      const result = await api?.runTool?.({ cmd: pjmPath, args });
      const log = [result?.stdout, result?.stderr].filter(Boolean).join('\n') || 'Precombine job completed.';
      const parsed = parsePJMOutput(log);
      setPrecombineJobs(prev => prev.map(p => p.id === job.id ? {
        ...p,
        status: result?.exitCode === 0 ? 'done' : 'error',
        lastRun: new Date().toISOString().slice(0, 16).replace('T', ' '),
        errorLog: result?.exitCode === 0 ? '' : log,
        outputBA2: parsed.outputBA2 || '',
        outputNifs: parsed.outputNifs,
        totalMeshes: parsed.totalMeshes,
        compressionRatio: parsed.compressionRatio,
        fullLog: parsed.fullLog
      } : p));
    } catch (e) {
      setPrecombineJobs(prev => prev.map(p => p.id === job.id ? {
        ...p, status: 'error', errorLog: String(e), lastRun: new Date().toISOString().slice(0, 16).replace('T', ' ')
      } : p));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = precombinePresets[presetKey as keyof typeof precombinePresets];
    if (!preset) return;
    const newJob: PrecombineJob = {
      id: `prp-${Date.now()}`,
      name: `${presetKey.replace('-', ' ').toUpperCase()} (${new Date().toLocaleTimeString()})`,
      cellRange: '00000000-0000FFFF',
      preset: presetKey as 'interior-dungeon' | 'dense-exterior' | 'settlement' | 'custom',
      status: 'pending',
      interiorCells: preset.interiorCells ?? false,
      includeStatics: preset.includeStatics ?? true,
      includeDynamic: preset.includeDynamic ?? false,
      prpMode: preset.prpMode ?? false,
      billboardFallback: preset.billboardFallback ?? false,
    };
    setPrecombineJobs(prev => [newJob, ...prev]);
    setNewPresetName('');
  };

  const filteredLOD = lodAssets.filter(a => a.name.toLowerCase().includes(searchLOD.toLowerCase()));
  const filteredPrecombine = precombineJobs.filter(j => j.name.toLowerCase().includes(searchPrecombine.toLowerCase()));

  const pendingLOD = lodAssets.filter(a => a.status === 'pending').length;
  const completedLOD = lodAssets.filter(a => a.status === 'done').length;
  const pendingPrecombine = precombineJobs.filter(j => j.status === 'pending').length;
  const completedPrecombine = precombineJobs.filter(j => j.status === 'done').length;

  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const wheelProxy = useWheelScrollProxy(mainScrollRef);

  const containerClassName = embedded
    ? 'w-full flex flex-col bg-forge-dark text-slate-200 min-h-[720px] overflow-hidden rounded-lg border border-slate-800'
    : 'h-full flex flex-col bg-forge-dark text-slate-200 min-h-0 overflow-hidden';

  return (
    <div className={containerClassName} onWheel={wheelProxy}>
      {/* Header */}
      {!embedded && (
        <div className="p-4 border-b border-slate-700 bg-forge-panel flex justify-between items-center z-10 shadow-md">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Mountain className="w-6 h-6 text-forge-accent" />
              The Lorekeeper (LOD Gen & Precombines)
            </h2>
            <p className="text-xs text-slate-400 font-mono">LODGEN • PRP • PJM – FO4 Optimization Pipeline</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/reference"
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] font-black uppercase tracking-widest text-slate-200 transition-colors"
              title="Open help"
            >
              Help
            </Link>
          </div>
        </div>
      )}

      <div className="p-4 max-h-72 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ToolsInstallVerifyPanel
            className="mb-0"
            accentClassName="text-forge-accent"
            description="Lorekeeper is for FO4 optimization workflows (LOD generation + precombines/PRP planning). It relies on you configuring real tool paths below."
            tools={[
              {
                label: 'Search Nexus: LODGen / xLODGen (FO4)',
                href: 'https://www.nexusmods.com/fallout4/search/?gsearch=LODGen&gsearchtype=mods',
                note: 'Use search to find the current maintained LOD tool for FO4.',
                kind: 'search',
              },
              {
                label: 'Search Nexus: PRP / Previsibines Repair Pack',
                href: 'https://www.nexusmods.com/fallout4/search/?gsearch=PRP&gsearchtype=mods',
                note: 'Use search to find the current PRP resources and documentation.',
                kind: 'search',
              },
            ]}
            verify={[
              'Set tool paths (LODGEN/PJM/etc) and confirm they persist after refresh.',
              'Create a new job and confirm it appears in the job list.',
            ]}
            firstTestLoop={[
              'Run one small job (tiny cell range / single test asset) before doing a full worldspace pass.',
              'Inspect output logs and confirm output paths match your mod staging folder.',
            ]}
            troubleshooting={[
              'If Run does nothing, confirm your executable paths are correct and accessible.',
              'If output paths look wrong, fix presets/targets first—don’t run large batches blindly.',
            ]}
          />
        </div>
      </div>

  <div ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Tool Paths Config */}
        <div ref={toolPathsSectionRef} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Folder className="w-4 h-4 text-forge-accent" /> Tool Paths
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-500 text-xs">LODGEN</span>
              <input
                value={lodgenPath}
                onChange={e => setLodgenPath(e.target.value)}
                placeholder="Path to LODGEN.exe"
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              />
              <button
                onClick={async () => {
                  const p = await api?.pickToolPath?.('LODGEN');
                  if (p) setLodgenPath(p);
                }}
                className="px-2 py-1 border border-slate-700 rounded hover:border-forge-accent text-xs"
              >
                Browse
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-500 text-xs">PJM</span>
              <input
                value={pjmPath}
                onChange={e => setPjmPath(e.target.value)}
                placeholder="Path to PJM.exe"
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              />
              <button
                onClick={async () => {
                  const p = await api?.pickToolPath?.('PJM');
                  if (p) setPjmPath(p);
                }}
                className="px-2 py-1 border border-slate-700 rounded hover:border-forge-accent text-xs"
              >
                Browse
              </button>
            </div>
          </div>
        </div>

        {/* LOD Generation */}
        <div ref={lodSectionRef} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Zap className="w-4 h-4 text-amber-400" /> LOD Generation (LODGEN)
            </div>
            <div className="text-xs text-slate-400">
              {completedLOD} done / {pendingLOD} pending
            </div>
          </div>
          <input
            type="text"
            placeholder="Search LOD assets..."
            value={searchLOD}
            onChange={e => setSearchLOD(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 mb-3"
          />
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLOD.map(asset => (
              <div key={asset.id} className="bg-slate-950/60 border border-slate-800 rounded p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-white text-sm">{asset.name}</p>
                    <p className="text-xs text-slate-400">{asset.sourceNif}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                    asset.status === 'done' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-700' :
                    asset.status === 'error' ? 'bg-red-900/20 text-red-400 border-red-700' :
                    asset.status === 'processing' ? 'bg-blue-900/20 text-blue-400 border-blue-700' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {asset.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                  <div>LOD Pass: <span className="text-forge-accent font-mono">{asset.lodPass}</span></div>
                  <div>Texture Reduction: <span className="text-forge-accent">{asset.textureReduction}%</span></div>
                  <div>Merge: <span className="text-forge-accent">{asset.mergeChance}%</span></div>
                  <div>Billboard: <span className="text-forge-accent">{asset.billboardMode}</span></div>
                </div>
                {asset.status === 'done' && (asset.meshReduction !== undefined || asset.estimatedMemorySavings !== undefined) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-2 bg-emerald-900/20 border border-emerald-700 rounded p-2">
                    {asset.meshReduction !== undefined && <div>Mesh Reduction: <span className="text-emerald-400 font-bold">{asset.meshReduction}%</span></div>}
                    {asset.estimatedMemorySavings !== undefined && <div>Memory Saved: <span className="text-emerald-400 font-bold">{asset.estimatedMemorySavings} MB</span></div>}
                    {asset.triangleCount && <div>Triangles: <span className="text-emerald-400 font-mono">{asset.triangleCount.before} → {asset.triangleCount.after}</span></div>}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => runLODGen(asset)}
                    disabled={processingIds.has(asset.id) || !lodgenPath}
                    className={`flex-1 px-2 py-1 text-xs rounded font-bold flex items-center justify-center gap-1 ${
                      processingIds.has(asset.id)
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-forge-accent text-slate-900 hover:bg-sky-400'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" /> {processingIds.has(asset.id) ? 'Processing...' : 'Generate'}
                  </button>
                  {asset.errorLog && (
                    <button
                      onClick={() => setSelectedLOD(asset)}
                      className="px-2 py-1 text-xs rounded border border-red-700 text-red-400 hover:bg-red-900/20"
                    >
                      <AlertTriangle className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {asset.lastRun && <p className="text-[10px] text-slate-500 mt-1">Last run: {asset.lastRun}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Precombine Jobs */}
        <div ref={precombineSectionRef} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Database className="w-4 h-4 text-purple-400" /> Precombine Jobs (PRP/PJM)
            </div>
            <div className="text-xs text-slate-400">
              {completedPrecombine} done / {pendingPrecombine} pending
            </div>
          </div>
          
          {/* Preset Templates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => applyPreset('interior-dungeon')}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold flex items-center justify-center gap-1"
            >
              + Interior Dungeon
            </button>
            <button
              onClick={() => applyPreset('dense-exterior')}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold flex items-center justify-center gap-1"
            >
              + Dense Exterior
            </button>
            <button
              onClick={() => applyPreset('settlement')}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold flex items-center justify-center gap-1"
            >
              + Settlement
            </button>
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Custom name..."
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              />
              <button
                onClick={() => newPresetName && applyPreset('custom')}
                disabled={!newPresetName}
                className="px-2 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-600 rounded text-xs font-bold"
              >
                Add
              </button>
            </div>
          </div>
          
          <input
            type="text"
            placeholder="Search precombine jobs..."
            value={searchPrecombine}
            onChange={e => setSearchPrecombine(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 mb-3"
          />
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPrecombine.map(job => (
              <div key={job.id} className="bg-slate-950/60 border border-slate-800 rounded p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-white text-sm">{job.name}</p>
                    <p className="text-xs text-slate-400">Cell Range: {job.cellRange} {job.preset && <span className="text-purple-400">| Preset: {job.preset.replace('-', ' ')}</span>}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                    job.status === 'done' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-700' :
                    job.status === 'error' ? 'bg-red-900/20 text-red-400 border-red-700' :
                    job.status === 'processing' ? 'bg-blue-900/20 text-blue-400 border-blue-700' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {job.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                  <div>Mode: <span className="text-forge-accent">{job.prpMode ? 'PRP' : 'Standard'}</span></div>
                  <div>Interior: <span className="text-forge-accent">{job.interiorCells ? 'Yes' : 'No'}</span></div>
                  <div>Statics: <span className="text-forge-accent">{job.includeStatics ? 'Yes' : 'No'}</span></div>
                  <div>Billboard: <span className="text-forge-accent">{job.billboardFallback ? 'Yes' : 'No'}</span></div>
                </div>
                {job.status === 'done' && (job.outputNifs !== undefined || job.compressionRatio !== undefined) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-2 bg-emerald-900/20 border border-emerald-700 rounded p-2">
                    {job.outputNifs !== undefined && <div>Output NIFs: <span className="text-emerald-400 font-bold">{job.outputNifs}</span></div>}
                    {job.totalMeshes !== undefined && <div>Meshes: <span className="text-emerald-400 font-bold">{job.totalMeshes}</span></div>}
                    {job.compressionRatio !== undefined && <div>Compression: <span className="text-emerald-400 font-bold">{job.compressionRatio}%</span></div>}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => runPrecombineJob(job)}
                    disabled={processingIds.has(job.id) || !pjmPath}
                    className={`flex-1 px-2 py-1 text-xs rounded font-bold flex items-center justify-center gap-1 ${
                      processingIds.has(job.id)
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-500'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" /> {processingIds.has(job.id) ? 'Processing...' : 'Run PJM'}
                  </button>
                  {job.outputBA2 && (
                    <button
                      onClick={() => navigator.clipboard?.writeText(job.outputBA2 || '')}
                      className="px-2 py-1 text-xs rounded border border-slate-600 text-slate-300 hover:border-forge-accent"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {job.lastRun && <p className="text-[10px] text-slate-500 mt-1">Last run: {job.lastRun}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Details Panel */}
        {(selectedLOD || selectedPrecombine) && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Details</h3>
              <button
                onClick={() => {
                  setSelectedLOD(null);
                  setSelectedPrecombine(null);
                }}
                className="text-slate-500 hover:text-white text-lg"
              >
                ×
              </button>
            </div>
            {selectedLOD && (
              <div className="bg-slate-950/60 rounded p-3 text-xs max-h-96 overflow-y-auto">
                <p className="text-slate-300 mb-2"><strong>Asset:</strong> {selectedLOD.name}</p>
                {selectedLOD.meshReduction !== undefined && (
                  <div className="mb-2 text-slate-300">
                    <strong>Metrics:</strong> {selectedLOD.meshReduction}% mesh reduction, {selectedLOD.estimatedMemorySavings} MB saved
                    {selectedLOD.triangleCount && <div className="text-slate-400">Triangles: {selectedLOD.triangleCount.before} → {selectedLOD.triangleCount.after}</div>}
                  </div>
                )}
                {selectedLOD.outputFiles.length > 0 && (
                  <div className="mb-2 text-slate-300">
                    <strong>Generated:</strong>
                    {selectedLOD.outputFiles.map((f, i) => <div key={i} className="text-slate-400 font-mono text-[10px]">{f}</div>)}
                  </div>
                )}
                {selectedLOD.fullLog && (
                  <div className="bg-slate-900 border border-slate-700 rounded p-2 text-red-300 font-mono whitespace-pre-wrap text-[10px]">
                    {selectedLOD.fullLog}
                  </div>
                )}
                {selectedLOD.errorLog && (
                  <div className="bg-red-900/20 border border-red-700 rounded p-2 text-red-300 font-mono whitespace-pre-wrap">
                    {selectedLOD.errorLog}
                  </div>
                )}
                {selectedLOD.lastRun && <p className="text-slate-400 mt-2">Last run: {selectedLOD.lastRun}</p>}
              </div>
            )}
            {selectedPrecombine && (
              <div className="bg-slate-950/60 rounded p-3 text-xs max-h-96 overflow-y-auto">
                <p className="text-slate-300 mb-2"><strong>Job:</strong> {selectedPrecombine.name}</p>
                {selectedPrecombine.outputNifs !== undefined && (
                  <div className="mb-2 text-slate-300">
                    <strong>Output:</strong> {selectedPrecombine.outputNifs} NIFs, {selectedPrecombine.totalMeshes} meshes processed
                    {selectedPrecombine.compressionRatio !== undefined && <div className="text-slate-400">Compression ratio: {selectedPrecombine.compressionRatio}%</div>}
                    {selectedPrecombine.outputBA2 && <div className="text-slate-400 font-mono text-[10px]">BA2: {selectedPrecombine.outputBA2}</div>}
                  </div>
                )}
                {selectedPrecombine.fullLog && (
                  <div className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 font-mono whitespace-pre-wrap text-[10px]">
                    {selectedPrecombine.fullLog}
                  </div>
                )}
                {selectedPrecombine.errorLog && (
                  <div className="bg-red-900/20 border border-red-700 rounded p-2 text-red-300 font-mono whitespace-pre-wrap">
                    {selectedPrecombine.errorLog}
                  </div>
                )}
                {selectedPrecombine.lastRun && <p className="text-slate-400 mt-2">Last run: {selectedPrecombine.lastRun}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lorekeeper;