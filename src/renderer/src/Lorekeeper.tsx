import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
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
  // Fixed 2026-08-26 (Bug 6): textureReduction/billboardMode/mergeChance used to be
  // sent as fabricated CLI flags to a tool that doesn't accept them (see runLODGen
  // below). xLODGen/FO4LODGen-family tools are configured and run through their own
  // GUI, so these settings now live here only as your own planning notes.
  notes: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'launched' | 'done' | 'error';
  lastRun?: string;
  errorLog?: string;
  fullLog?: string;
}

interface PrecombineJob {
  id: string;
  name: string;
  // Fixed 2026-08-26 (Bug 6): the real tool is PJM's Previs Patching Scripts (Nexus
  // #69978) via GeneratePrevisibines.bat, which takes the plugin name as its one
  // real argument -- see runPrecombineJob below. pluginName is what's actually
  // passed to the tool; cellRange/interiorCells/includeStatics/includeDynamic/
  // prpMode/billboardFallback are kept as your own planning notes only, they are
  // NOT passed to the script (it operates on the whole plugin, not a cell range).
  pluginName: string;
  cellRange: string;
  interiorCells: boolean;
  includeStatics: boolean;
  includeDynamic: boolean;
  prpMode: boolean;
  billboardFallback: boolean;
  preset?: 'interior-dungeon' | 'dense-exterior' | 'settlement' | 'custom';
  status: 'pending' | 'processing' | 'done' | 'error';
  lastRun?: string;
  errorLog?: string;
  fullLog?: string;
}

type LorekeeperProps = {
  embedded?: boolean;
};

const Lorekeeper: React.FC<LorekeeperProps> = ({ embedded = false }) => {
  // Fixed 2026-08-26 (Bug 6, CK Hub tooling verification): these used to regex-match
  // fabricated output patterns ("Mesh reduction: X%", "Created N precombined NIF",
  // "Compression ratio: X%", etc) that no real Fallout 4 tool actually prints. Real
  // tool output is now just kept and shown as a raw log -- nothing here is invented
  // and presented to the user as a "parsed metric" the tool didn't actually report.

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
  const [newJobPlugin, setNewJobPlugin] = useState('');
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
      toast.error('Set your LOD tool path first');
      return;
    }
    setProcessingIds(prev => new Set(prev).add(asset.id));
    try {
      // Fixed 2026-08-26 (Bug 6): xLODGen/FO4LODGen-family tools are GUI applications
      // you configure and drive yourself (worldspace, LOD level, texture reduction,
      // billboards, etc all live in the tool's own UI/INI, not a documented CLI) --
      // there is no verified real command-line contract for scripting per-asset LOD
      // generation headlessly. This used to fabricate flags (--texture-reduction,
      // --merge-chance, --billboard-mode) that don't correspond to any real tool.
      // This now just launches the configured executable so you can run LOD
      // generation for real in its own window. It cannot honestly auto-detect
      // success from that -- mark the job Done/Error yourself below once you're done.
      const result = await api?.runTool?.({ cmd: lodgenPath, args: [] });
      const log = [result?.stdout, result?.stderr].filter(Boolean).join('\n')
        || 'Launched. Configure and run LOD generation in the tool\'s own window, then mark this job Done or Error yourself.';
      setLodAssets(prev => prev.map(a => a.id === asset.id ? {
        ...a,
        status: 'launched',
        lastRun: new Date().toISOString().slice(0, 16).replace('T', ' '),
        errorLog: '',
        fullLog: log,
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

  // New 2026-08-26 (Bug 6): since runLODGen can only launch the real tool -- not
  // truthfully detect whether LOD generation actually succeeded inside it -- this
  // lets the user record the real outcome themselves after checking the tool's window.
  const markLODStatus = (assetId: string, status: 'done' | 'error') => {
    setLodAssets(prev => prev.map(a => a.id === assetId ? { ...a, status } : a));
  };

  // New 2026-08-26 (Bug 6): there was previously no way to add a LOD asset to this
  // list at all -- setLodAssets was only ever called from localStorage load and from
  // run-result updates, so this panel was permanently empty as shipped.
  const [newLodName, setNewLodName] = useState('');
  const [newLodNif, setNewLodNif] = useState('');
  const addLODAsset = () => {
    if (!newLodName.trim() || !newLodNif.trim()) {
      toast.error('Enter both a name and a source NIF path');
      return;
    }
    const asset: LODAsset = {
      id: `lod-${Date.now()}`,
      name: newLodName.trim(),
      sourceNif: newLodNif.trim(),
      lodPass: 'lod0',
      targetDir: '',
      notes: '',
      priority: 'normal',
      status: 'pending',
    };
    setLodAssets(prev => [asset, ...prev]);
    setNewLodName('');
    setNewLodNif('');
  };

  const runPrecombineJob = async (job: PrecombineJob) => {
    if (!pjmPath) {
      toast.error('Set the GeneratePrevisibines.bat path first');
      return;
    }
    if (!job.pluginName.trim()) {
      toast.error('This job has no plugin name set -- edit it before running.');
      return;
    }
    setProcessingIds(prev => new Set(prev).add(job.id));
    try {
      // Fixed 2026-08-26 (Bug 6): the real tool is PJM's Previs Patching Scripts
      // (Nexus #69978, by PJMail), run via the bundled GeneratePrevisibines.bat as
      // `GeneratePrevisibines.bat "PluginName.esp"` -- it orchestrates FO4Edit + the
      // CK to regenerate precombines/previs for that one plugin. This used to pass
      // fabricated flags (--cells, --interior, --statics, --prp, --billboard-fallback)
      // the real script does not accept. Double check this against the exact PJM
      // version you have installed -- script interfaces can change between releases
      // -- but a single plugin-name argument is the real, documented invocation.
      const args = [job.pluginName.trim()];
      const result = await api?.runTool?.({ cmd: pjmPath, args });
      const log = [result?.stdout, result?.stderr].filter(Boolean).join('\n') || 'Precombine job completed.';
      setPrecombineJobs(prev => prev.map(p => p.id === job.id ? {
        ...p,
        status: result?.exitCode === 0 ? 'done' : 'error',
        lastRun: new Date().toISOString().slice(0, 16).replace('T', ' '),
        errorLog: result?.exitCode === 0 ? '' : log,
        fullLog: log,
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
    if (!newJobPlugin.trim()) {
      toast.error('Enter the plugin (.esp/.esm) name this job is for first');
      return;
    }
    const newJob: PrecombineJob = {
      id: `prp-${Date.now()}`,
      name: `${presetKey.replace('-', ' ').toUpperCase()} — ${newJobPlugin.trim()}`,
      pluginName: newJobPlugin.trim(),
      cellRange: '',
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
    setNewJobPlugin('');
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
            <p className="text-xs text-slate-400 font-mono">LODGEN • PRP • PJM - FO4 Optimization Pipeline</p>
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
              "If output paths look wrong, fix presets/targets first—don't run large batches blindly.",
            ]}
          />
        </div>
      </div>

  <div ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-6 flex flex-col gap-6">
        {/* Fixed 2026-08-26 (Bug 6, CK Hub tooling verification): this panel used to
            drive fabricated CLI tools ("LODGEN.exe"/"PJM.exe" with made-up flags and
            made-up output parsing) that don't correspond to any real Fallout 4 tool.
            Corrected: the Precombine Jobs runner below now invokes the real PJM tool
            (GeneratePrevisibines.bat "PluginName.esp", Nexus #69978) with its real,
            single plugin-name argument instead of invented flags. The LOD Generation
            runner now honestly launches your configured LOD tool's own GUI instead of
            pretending to script it -- there is no verified real CLI contract for
            headless per-asset LOD automation, so this no longer claims one. This
            banner stays as a standing reminder of that distinction and to flag that
            the exact GeneratePrevisibines.bat argument/flag set should be checked
            against whatever version is actually installed, since script interfaces
            can change between releases and this was corrected without web access. */}
        <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl p-4 mb-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed">
            <div className="font-bold text-amber-300 mb-1">Read before using this panel</div>
            <b>Precombine Jobs</b> now runs the real <code className="text-amber-300">GeneratePrevisibines.bat "PluginName.esp"</code>{' '}
            (PJM's Previs Patching Scripts, Nexus #69978) — verify that matches the exact version you have installed
            before relying on it; script interfaces can change between releases.{' '}
            <b>LOD Generation</b> only launches your configured LOD tool (e.g. xLODGen/FO4LODGen) — it opens the
            tool's own window for you to configure and run LOD generation yourself, then you mark the job
            Done or Error here afterward. Neither runner can auto-verify a real tool's success beyond its exit code.
          </div>
        </div>

        {/* Tool Paths Config */}
        <div ref={toolPathsSectionRef} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Folder className="w-4 h-4 text-forge-accent" /> Tool Paths
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-500 text-xs">LOD tool</span>
              <input
                value={lodgenPath}
                onChange={e => setLodgenPath(e.target.value)}
                placeholder="Path to your LOD tool's exe (e.g. FO4LODGen64.exe / xLODGen64.exe)"
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
                placeholder="Path to GeneratePrevisibines.bat"
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
              <Zap className="w-4 h-4 text-amber-400" /> LOD Generation
            </div>
            <div className="text-xs text-slate-400">
              {completedLOD} done / {pendingLOD} pending
            </div>
          </div>
          {/* New 2026-08-26 (Bug 6): there was previously no way to add an entry here at all. */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Asset name..."
              value={newLodName}
              onChange={e => setNewLodName(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
            />
            <input
              type="text"
              placeholder="Source NIF path..."
              value={newLodNif}
              onChange={e => setNewLodNif(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
            />
            <button
              onClick={addLODAsset}
              className="px-3 py-1 bg-forge-accent text-slate-900 hover:bg-sky-400 rounded text-xs font-bold"
            >
              Add
            </button>
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
                    asset.status === 'launched' ? 'bg-blue-900/20 text-blue-400 border-blue-700' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {asset.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>LOD Pass: <span className="text-forge-accent font-mono">{asset.lodPass}</span></div>
                  {asset.notes && <div className="col-span-2 text-slate-400">Notes: {asset.notes}</div>}
                </div>
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
                    <RefreshCw className="w-3 h-3" /> {processingIds.has(asset.id) ? 'Launching...' : 'Launch Tool'}
                  </button>
                  {asset.status === 'launched' && (
                    <>
                      <button
                        onClick={() => markLODStatus(asset.id, 'done')}
                        className="px-2 py-1 text-xs rounded border border-emerald-700 text-emerald-400 hover:bg-emerald-900/20"
                        title="Mark this LOD job Done"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => markLODStatus(asset.id, 'error')}
                        className="px-2 py-1 text-xs rounded border border-red-700 text-red-400 hover:bg-red-900/20"
                        title="Mark this LOD job Error"
                      >
                        <AlertTriangle className="w-3 h-3" />
                      </button>
                    </>
                  )}
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
          
          {/* New 2026-08-26 (Bug 6): presets used to create a job with no way to say
              which plugin it's actually for -- pluginName is what's really passed to
              GeneratePrevisibines.bat, so it's required before a preset can be applied. */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="Plugin for this job (e.g. MyMod.esp)..."
              value={newJobPlugin}
              onChange={e => setNewJobPlugin(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
            />
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
                    <p className="text-xs text-slate-400">Plugin: <span className="text-purple-300 font-mono">{job.pluginName}</span> {job.preset && <span className="text-purple-400">| Preset: {job.preset.replace('-', ' ')}</span>}</p>
                    {job.cellRange && <p className="text-[10px] text-slate-500">Notes: {job.cellRange}</p>}
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
                    <RefreshCw className="w-3 h-3" /> {processingIds.has(job.id) ? 'Processing...' : 'Run GeneratePrevisibines.bat'}
                  </button>
                  {job.fullLog && (
                    <button
                      onClick={() => setSelectedPrecombine(job)}
                      className="px-2 py-1 text-xs rounded border border-slate-600 text-slate-300 hover:border-forge-accent"
                      title="View log"
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
                {selectedLOD.notes && (
                  <div className="mb-2 text-slate-300"><strong>Notes:</strong> {selectedLOD.notes}</div>
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
                <p className="text-slate-300 mb-2"><strong>Plugin:</strong> {selectedPrecombine.pluginName}</p>
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