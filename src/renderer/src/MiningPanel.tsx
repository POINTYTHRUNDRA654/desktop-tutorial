/**
 * Mining Panel — FO4 Asset Analysis Hub
 * API: window.electronAPI.miningPipeline.*
 */

import React, { useState, useCallback } from 'react';
import {
  FolderOpen, Play, StopCircle, Download, Upload,
  AlertCircle, CheckCircle, Clock, Search, X,
  ChevronRight, Database, FileText, Layers,
  Activity, Trash2, Image, Film, RefreshCw,
  AlertTriangle, Info, Cpu, HardDrive,
} from 'lucide-react';
import { DataSource } from '../../shared/types';

type MiningTab =
  | 'pipeline' | 'esp' | 'dependencies'
  | 'performance' | 'unused-assets'
  | 'lod' | 'textures' | 'animations';

interface ProgressState { percent: number; task: string }

interface MiningResultView {
  espData: Map<string, any>;
  correlations: any[];
  dependencyGraph: {
    nodes: Map<string, any>;
    edges: any[];
    cycles: string[][];
    loadOrder: string[];
  };
  performanceReport: {
    baselineMetrics: { fps: number | { average: number }; memoryUsage: number; loadTime: number };
    recommendations: Array<{ type: string; description: string; expectedImprovement: { fpsDelta: number } }>;
  };
  errors: string[];
  assetDiscovery?: {
    unusedAssets?: { totalAssets: number; unusedAssets: any[]; potentialSpaceSavings: number; recommendations: string[] };
    lodOptimizations?: { totalMeshes: number; optimizedMeshes: any[]; recommendations: string[] };
    textureResolutions?: { totalTextures: number; lowResTextures: any[]; potentialQualityImprovement: number; recommendations: string[] };
    animationOptimizations?: { totalAnimations: number; optimizableAnimations: any[]; potentialSavings: { totalFileSize: number }; recommendations: string[] };
  };
}

const api = () => (window as any).electronAPI;

const humanBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
};

const TabBtn: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-3 py-1.5 text-[11px] font-bold rounded-md whitespace-nowrap transition-all ${active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}>
    {label}
  </button>
);

const SectionCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; accent?: string }> = ({ title, icon, children, accent = 'emerald' }) => (
  <div className={`rounded-xl border border-${accent}-500/20 bg-slate-900/60 p-5 mb-4`}>
    <h3 className={`text-sm font-bold text-${accent}-300 mb-3 flex items-center gap-2`}>{icon}{title}</h3>
    {children}
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; message: string; sub?: string }> = ({ icon, message, sub }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
    <div className="mb-3 opacity-40">{icon}</div>
    <p className="text-sm font-semibold text-slate-400">{message}</p>
    {sub && <p className="text-xs mt-1 text-slate-600 max-w-xs text-center">{sub}</p>}
  </div>
);

const SOURCE_TYPES: { value: DataSource['type']; label: string }[] = [
  { value: 'esp', label: 'ESP / ESM / ESL Plugin' },
  { value: 'nif', label: 'NIF Mesh' },
  { value: 'dds', label: 'DDS Texture' },
  { value: 'hkx', label: 'Havok Animation (.hkx)' },
  { value: 'bsa', label: 'BSA / BA2 Archive' },
  { value: 'log', label: 'Crash / Debug Log' },
  { value: 'benchmark', label: 'Benchmark Data (.json)' },
];

const SourceRow: React.FC<{ source: DataSource; index: number; onUpdate: (i: number, u: Partial<DataSource>) => void; onRemove: (i: number) => void }> = ({ source, index, onUpdate, onRemove }) => {
  const browse = async () => {
    try {
      if (source.type === 'esp') { const p = await api()?.pickEspFile?.(); if (p) onUpdate(index, { path: p }); }
      else if (source.type === 'nif') { const paths = await api()?.pickNifFile?.(); if (paths?.length) onUpdate(index, { path: paths[0] }); }
      else if (source.type === 'dds') { const paths = await api()?.pickDdsFile?.(); if (paths?.length) onUpdate(index, { path: paths[0] }); }
      else if (source.type === 'log') { const res = await api()?.ckPickLogFile?.(); if (res?.path) onUpdate(index, { path: res.path }); }
      else { const dir = await api()?.pickDirectory?.(); if (dir) onUpdate(index, { path: dir }); }
    } catch { /* silent */ }
  };
  return (
    <div className="flex gap-2 items-center bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
      <select value={source.type} onChange={e => onUpdate(index, { type: e.target.value as DataSource['type'] })} className="text-[11px] bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1.5 min-w-[170px]">
        {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input type="text" placeholder="Path to file or folder…" value={source.path} onChange={e => onUpdate(index, { path: e.target.value })} className="flex-1 text-[11px] bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1.5 placeholder-slate-600 font-mono" />
      <button onClick={browse} className="p-1.5 rounded text-slate-400 hover:text-emerald-300 hover:bg-emerald-900/30 transition-colors" title="Browse"><FolderOpen className="w-4 h-4" /></button>
      <input type="number" value={source.priority} min={1} max={10} onChange={e => onUpdate(index, { priority: parseInt(e.target.value) || 1 })} className="w-14 text-[11px] bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1.5 text-center" title="Priority" />
      <button onClick={() => onRemove(index)} className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"><X className="w-4 h-4" /></button>
    </div>
  );
};

const PipelineTab: React.FC<{ sources: DataSource[]; setSources: React.Dispatch<React.SetStateAction<DataSource[]>>; isMining: boolean; progress: ProgressState | null; result: MiningResultView | null; onStart: () => void; onExport: () => void; onImportPluginsTxt: () => void }> = ({ sources, setSources, isMining, progress, result, onStart, onExport, onImportPluginsTxt }) => {
  const addSource = (type: DataSource['type'] = 'esp') => setSources(s => [...s, { type, path: '', priority: s.length + 1 }]);
  const updateSource = (i: number, u: Partial<DataSource>) => setSources(s => { const a = [...s]; a[i] = { ...a[i], ...u }; return a; });
  const removeSource = (i: number) => setSources(s => s.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => addSource('esp')} disabled={isMining} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300 transition-all disabled:opacity-40">
            <Database className="w-3.5 h-3.5" /> Add Source
          </button>
          <button onClick={onImportPluginsTxt} disabled={isMining} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-blue-500/40 hover:text-blue-300 transition-all disabled:opacity-40" title="Bulk-add from plugins.txt">
            <Upload className="w-3.5 h-3.5" /> Import plugins.txt
          </button>
        </div>
        <div className="flex gap-2">
          {result && <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-800 border border-slate-700 text-blue-300 hover:bg-blue-900/20 transition-all"><Download className="w-3.5 h-3.5" /> Export JSON</button>}
          <button onClick={onStart} disabled={isMining || sources.length === 0} className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-black rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {isMining ? <><StopCircle className="w-3.5 h-3.5 animate-pulse" /> Running…</> : <><Play className="w-3.5 h-3.5" /> Start Mining Pipeline</>}
          </button>
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
          <Database className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-semibold">No data sources added</p>
          <p className="text-xs text-slate-600 mt-1">Add ESP/ESM plugins, NIF meshes, DDS textures, or BA2 archives to begin.</p>
          <button onClick={() => addSource('esp')} className="mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 transition-all">+ Add First Source</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
            <span className="text-[10px] text-slate-600">Type · Path · Browse · Priority · Remove</span>
          </div>
          {sources.map((s, i) => <SourceRow key={i} source={s} index={i} onUpdate={updateSource} onRemove={removeSource} />)}
        </div>
      )}

      {isMining && progress && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {progress.task}</span>
            <span className="text-xs font-mono text-emerald-400">{Math.round(progress.percent)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      {result && !isMining && (
        <SectionCard title="Pipeline Complete" icon={<CheckCircle className="w-4 h-4" />}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'ESP Files', value: result.espData.size },
              { label: 'Correlations', value: result.correlations.length },
              { label: 'Dep Edges', value: result.dependencyGraph.edges.length },
              { label: 'Errors', value: result.errors.length, warn: result.errors.length > 0 },
            ].map(s => (
              <div key={s.label} className={`rounded-lg p-3 border ${s.warn && s.value > 0 ? 'border-amber-500/30 bg-amber-900/10' : 'border-slate-700 bg-slate-800/40'}`}>
                <div className={`text-2xl font-black ${s.warn && s.value > 0 ? 'text-amber-400' : 'text-white'}`}>{s.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.errors.slice(0, 5).map((e, i) => (
                <div key={i} className="text-[11px] text-amber-300 bg-amber-900/10 rounded px-2 py-1 flex items-start gap-1.5"><AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{e}</div>
              ))}
              {result.errors.length > 5 && <p className="text-[10px] text-slate-500 pl-1">…and {result.errors.length - 5} more errors.</p>}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
};

const ESPTab: React.FC<{ result: MiningResultView | null }> = ({ result }) => {
  void result;
  const [search, setSearch] = useState('');
  const [parsedEsp, setParsedEsp] = useState<any>(null);
  const [espPath, setEspPath] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const browseParse = async () => {
    try { const p = await api()?.pickEspFile?.(); if (p) { setEspPath(p); doParseEsp(p); } } catch { /* silent */ }
  };
  const doParseEsp = async (fp: string) => {
    if (!fp) return;
    setIsParsing(true); setParseError(null); setParsedEsp(null);
    try {
      const raw = await api()?.miningPipeline?.parseESP?.(fp);
      if (raw?.success === false) throw new Error(raw.error || 'Parse failed');
      setParsedEsp(raw?.data ?? raw);
    } catch (e: any) { setParseError(e?.message || 'Failed to parse ESP file'); }
    finally { setIsParsing(false); }
  };

  const records: any[] = parsedEsp?.records ?? [];
  const filtered = search ? records.filter(r => r.type?.toLowerCase().includes(search.toLowerCase()) || r.editorId?.toLowerCase().includes(search.toLowerCase()) || r.formId?.toString(16)?.includes(search.toLowerCase())) : records.slice(0, 200);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input type="text" placeholder="Path to .esp / .esm / .esl…" value={espPath} onChange={e => setEspPath(e.target.value)} className="flex-1 text-[11px] bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1.5 placeholder-slate-600 font-mono" />
        <button onClick={browseParse} disabled={isParsing} className="flex items-center gap-1 px-3 py-1.5 text-[11px] rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40 transition-all disabled:opacity-40">
          <FolderOpen className="w-3.5 h-3.5" /> Browse
        </button>
        <button onClick={() => doParseEsp(espPath)} disabled={isParsing || !espPath} className="flex items-center gap-1 px-4 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 transition-all disabled:opacity-40">
          {isParsing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Parsing…</> : <><FileText className="w-3.5 h-3.5" /> Parse ESP</>}
        </button>
      </div>
      {parseError && <div className="rounded-lg border border-red-500/30 bg-red-900/10 p-3 text-sm text-red-300 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{parseError}</div>}
      {parsedEsp && (
        <SectionCard title={`${parsedEsp.fileName ?? 'Plugin'} — ${records.length.toLocaleString()} records`} icon={<FileText className="w-4 h-4" />}>
          {parsedEsp.masters?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-500 self-center">Masters:</span>
              {parsedEsp.masters.map((m: string) => <span key={m} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">{m}</span>)}
            </div>
          )}
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input type="text" placeholder="Search by record type, EditorID, or FormID (hex)…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-slate-700">{['Type', 'FormID', 'EditorID', 'Flags', 'Data Size'].map(h => <th key={h} className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                    <td className="py-1 px-2 font-mono font-bold text-emerald-400">{r.type}</td>
                    <td className="py-1 px-2 font-mono text-blue-300">{r.formId != null ? `0x${r.formId.toString(16).toUpperCase().padStart(8, '0')}` : '—'}</td>
                    <td className="py-1 px-2 text-slate-300">{r.editorId ?? '—'}</td>
                    <td className="py-1 px-2 font-mono text-slate-500">{r.flags != null ? `0x${r.flags.toString(16).toUpperCase()}` : '—'}</td>
                    <td className="py-1 px-2 text-slate-500">{r.dataSize != null ? humanBytes(r.dataSize) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="py-8 text-center text-slate-600 text-xs">No records match "{search}"</div>}
            {!search && records.length > 200 && <p className="text-[10px] text-slate-600 text-center pt-2">Showing first 200 of {records.length.toLocaleString()} records.</p>}
          </div>
        </SectionCard>
      )}
      {!parsedEsp && !isParsing && !parseError && <EmptyState icon={<FileText className="w-12 h-12" />} message="No plugin loaded" sub="Browse or enter a path to parse an ESP/ESM/ESL plugin." />}
    </div>
  );
};

const DependenciesTab: React.FC<{ result: MiningResultView | null }> = ({ result }) => {
  const graph = result?.dependencyGraph;
  if (!graph) return <EmptyState icon={<Layers className="w-12 h-12" />} message="Run the Mining Pipeline first" sub="The dependency graph appears here after a completed pipeline run." />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Plugins', value: graph.nodes.size, icon: <Database className="w-4 h-4" /> },
          { label: 'Dependencies', value: graph.edges.length, icon: <ChevronRight className="w-4 h-4" /> },
          { label: 'Circular Deps', value: graph.cycles.length, icon: <AlertTriangle className="w-4 h-4" />, warn: graph.cycles.length > 0 },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.warn && s.value > 0 ? 'border-red-500/30 bg-red-900/10' : 'border-slate-700 bg-slate-800/40'}`}>
            <div className={`flex items-center gap-2 mb-1 ${s.warn && s.value > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{s.icon}<span className="text-xs font-bold">{s.label}</span></div>
            <div className="text-2xl font-black text-white">{s.value}</div>
          </div>
        ))}
      </div>
      {graph.loadOrder.length > 0 && (
        <SectionCard title="Resolved Load Order" icon={<Layers className="w-4 h-4" />}>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {graph.loadOrder.map((plugin, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                <span className="font-mono text-slate-600 w-6 text-right shrink-0">{i.toString(16).toUpperCase().padStart(2, '0')}</span>
                <span className="text-slate-300">{plugin}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
      {graph.cycles.length > 0 && (
        <SectionCard title="Circular Dependencies Detected" icon={<AlertTriangle className="w-4 h-4" />} accent="red">
          <div className="space-y-2">{graph.cycles.map((cycle, i) => <div key={i} className="text-[11px] font-mono text-red-300 bg-red-900/10 rounded px-3 py-2">{cycle.join(' → ')}</div>)}</div>
        </SectionCard>
      )}
      <SectionCard title="Full Dependency Map" icon={<Database className="w-4 h-4" />}>
        <div className="space-y-0.5 max-h-80 overflow-y-auto">
          {graph.edges.length === 0 ? <p className="text-xs text-slate-600">No dependency edges recorded.</p>
            : graph.edges.map((edge: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                <span className="text-slate-300 font-semibold">{edge.from ?? edge.source ?? '?'}</span>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="text-emerald-400">{edge.to ?? edge.target ?? '?'}</span>
                {edge.type && <span className="text-[10px] text-slate-600 ml-auto">{edge.type}</span>}
              </div>
            ))}
        </div>
      </SectionCard>
    </div>
  );
};

const PerformanceTab: React.FC<{ result: MiningResultView | null }> = ({ result }) => {
  const report = result?.performanceReport;
  if (!report) return <EmptyState icon={<Activity className="w-12 h-12" />} message="Run the Mining Pipeline first" sub="Performance baseline and recommendations appear here." />;
  const fps = typeof report.baselineMetrics.fps === 'number' ? report.baselineMetrics.fps : (report.baselineMetrics.fps as any)?.average ?? 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Avg FPS', value: fps.toFixed(1), icon: <Activity className="w-4 h-4 text-blue-400" /> },
          { label: 'Memory', value: `${report.baselineMetrics.memoryUsage} MB`, icon: <HardDrive className="w-4 h-4 text-purple-400" /> },
          { label: 'Load Time', value: `${report.baselineMetrics.loadTime}s`, icon: <Clock className="w-4 h-4 text-amber-400" /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 mb-1 text-slate-400">{s.icon}<span className="text-xs font-bold">{s.label}</span></div>
            <div className="text-2xl font-black text-white">{s.value}</div>
          </div>
        ))}
      </div>
      <SectionCard title="Optimization Recommendations" icon={<Cpu className="w-4 h-4" />}>
        {report.recommendations.length === 0 ? <p className="text-xs text-slate-500">No recommendations — load order looks clean.</p> : (
          <div className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-white">{rec.description}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${rec.expectedImprovement.fpsDelta > 5 ? 'bg-emerald-900/40 text-emerald-300' : rec.expectedImprovement.fpsDelta > 0 ? 'bg-blue-900/40 text-blue-300' : 'bg-slate-700 text-slate-400'}`}>
                    {rec.expectedImprovement.fpsDelta > 0 ? '+' : ''}{rec.expectedImprovement.fpsDelta.toFixed(1)} FPS
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{rec.type}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const UnusedAssetsTab: React.FC<{ result: MiningResultView | null }> = ({ result }) => {
  const data = result?.assetDiscovery?.unusedAssets;
  if (!data) return <EmptyState icon={<Trash2 className="w-12 h-12" />} message="Run the Mining Pipeline first" sub="Unused asset detection requires BSA/BA2 or loose-file sources." />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Assets', value: data.totalAssets.toLocaleString() },
          { label: 'Unused', value: data.unusedAssets.length.toLocaleString(), warn: true },
          { label: 'Potential Savings', value: humanBytes(data.potentialSpaceSavings) },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.warn && data.unusedAssets.length > 0 ? 'border-amber-500/30 bg-amber-900/10' : 'border-slate-700 bg-slate-800/40'}`}>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <SectionCard title={`Unused Assets (${data.unusedAssets.length})`} icon={<Trash2 className="w-4 h-4" />} accent="amber">
        <div className="space-y-0.5 max-h-72 overflow-y-auto">
          {data.unusedAssets.slice(0, 50).map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[11px] py-1 border-b border-slate-800/50">
              <span className="text-[10px] font-bold text-slate-500 w-12 shrink-0 uppercase">{a.type}</span>
              <span className="flex-1 font-mono text-slate-300 truncate">{a.path}</span>
              <span className="text-slate-500 text-[10px] shrink-0">{humanBytes(a.size)}</span>
              <span className="text-amber-400 text-[10px] shrink-0">{a.reason}</span>
            </div>
          ))}
          {data.unusedAssets.length > 50 && <p className="text-[10px] text-slate-600 text-center pt-2">+{data.unusedAssets.length - 50} more — export JSON for the full list.</p>}
        </div>
      </SectionCard>
      {data.recommendations.length > 0 && (
        <SectionCard title="Recommendations" icon={<Info className="w-4 h-4" />}>
          {data.recommendations.map((r, i) => <div key={i} className="flex gap-2 text-[11px] text-slate-300 py-0.5"><ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />{r}</div>)}
        </SectionCard>
      )}
    </div>
  );
};

const LODTab: React.FC<{ result: MiningResultView | null }> = ({ result }) => {
  const data = result?.assetDiscovery?.lodOptimizations;
  if (!data) return <EmptyState icon={<Layers className="w-12 h-12" />} message="Run the Mining Pipeline first" sub="LOD analysis requires NIF mesh sources in the pipeline." />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4"><div className="text-2xl font-black text-white">{data.totalMeshes.toLocaleString()}</div><div className="text-[10px] text-slate-500 mt-0.5">Total Meshes Scanned</div></div>
        <div className={`rounded-xl border p-4 ${data.optimizedMeshes.length > 0 ? 'border-amber-500/30 bg-amber-900/10' : 'border-slate-700 bg-slate-800/40'}`}><div className="text-2xl font-black text-white">{data.optimizedMeshes.length.toLocaleString()}</div><div className="text-[10px] text-slate-500 mt-0.5">Need LOD Optimization</div></div>
      </div>
      <SectionCard title="LOD Optimization Candidates" icon={<Layers className="w-4 h-4" />} accent="amber">
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {data.optimizedMeshes.length === 0 ? <p className="text-xs text-slate-500">All meshes have acceptable LOD chains.</p>
            : data.optimizedMeshes.slice(0, 20).map((opt: any, i: number) => (
              <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                <p className="text-[11px] font-mono text-slate-300 truncate mb-1">{opt.meshPath}</p>
                <div className="flex gap-3 text-[10px] text-slate-500 mb-1">
                  <span>∆ {opt.potentialSavings?.triangles?.toLocaleString() ?? '?'} tris</span>
                  <span>Issues: {opt.issues?.length ?? 0}</span>
                </div>
                {opt.suggestions?.slice(0, 2).map((s: string, si: number) => <div key={si} className="flex gap-1.5 text-[10px] text-slate-400"><ChevronRight className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />{s}</div>)}
              </div>
            ))}
        </div>
      </SectionCard>
      {data.recommendations.length > 0 && (
        <SectionCard title="General LOD Recommendations" icon={<Info className="w-4 h-4" />}>
          {data.recommendations.map((r, i) => <div key={i} className="flex gap-2 text-[11px] text-slate-300 py-0.5"><ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />{r}</div>)}
        </SectionCard>
      )}
    </div>
  );
};

const TexturesTab: React.FC<{ result: MiningResultView | null }> = ({ result }) => {
  const data = result?.assetDiscovery?.textureResolutions;
  if (!data) return <EmptyState icon={<Image className="w-12 h-12" />} message="Run the Mining Pipeline first" sub="Texture analysis requires DDS texture sources in the pipeline." />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Textures', value: data.totalTextures.toLocaleString() },
          { label: 'Low-Res', value: data.lowResTextures.length.toLocaleString(), warn: true },
          { label: 'Quality Gain', value: `+${data.potentialQualityImprovement.toFixed(0)}%` },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.warn && data.lowResTextures.length > 0 ? 'border-amber-500/30 bg-amber-900/10' : 'border-slate-700 bg-slate-800/40'}`}>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <SectionCard title="Upscale Candidates" icon={<Image className="w-4 h-4" />} accent="blue">
        {data.lowResTextures.length === 0 ? <p className="text-xs text-slate-500">All textures meet recommended resolution thresholds.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-slate-700">{['Usage', 'File', 'Current', 'Target', 'Priority', 'Quality'].map(h => <th key={h} className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-500 uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {data.lowResTextures.slice(0, 25).map((t: any, i: number) => (
                  <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/20">
                    <td className="py-1 px-2 text-blue-400 text-[10px] font-bold uppercase">{t.texture?.usage ?? '—'}</td>
                    <td className="py-1 px-2 font-mono text-slate-300 truncate max-w-[160px]">{t.texture?.path?.split('/').pop() ?? '—'}</td>
                    <td className="py-1 px-2 font-mono text-amber-400">{t.texture?.width}×{t.texture?.height}</td>
                    <td className="py-1 px-2 font-mono text-emerald-400">{t.recommendedResolution?.width}×{t.recommendedResolution?.height}</td>
                    <td className="py-1 px-2 text-slate-400">{t.priority}</td>
                    <td className="py-1 px-2 text-emerald-400">+{t.qualityImprovement}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      {data.recommendations.length > 0 && (
        <SectionCard title="Texture Recommendations" icon={<Info className="w-4 h-4" />}>
          {data.recommendations.map((r, i) => <div key={i} className="flex gap-2 text-[11px] text-slate-300 py-0.5"><ChevronRight className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />{r}</div>)}
        </SectionCard>
      )}
    </div>
  );
};

const AnimationsTab: React.FC<{ result: MiningResultView | null }> = ({ result }) => {
  const data = result?.assetDiscovery?.animationOptimizations;
  if (!data) return <EmptyState icon={<Film className="w-12 h-12" />} message="Run the Mining Pipeline first" sub="Animation analysis requires HKX animation sources in the pipeline." />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Animations', value: data.totalAnimations.toLocaleString() },
          { label: 'Optimizable', value: data.optimizableAnimations.length.toLocaleString(), warn: true },
          { label: 'File Savings', value: humanBytes(data.potentialSavings.totalFileSize) },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.warn && data.optimizableAnimations.length > 0 ? 'border-amber-500/30 bg-amber-900/10' : 'border-slate-700 bg-slate-800/40'}`}>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <SectionCard title="Animation Optimization Candidates" icon={<Film className="w-4 h-4" />} accent="purple">
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {data.optimizableAnimations.length === 0 ? <p className="text-xs text-slate-500">No animation optimizations identified.</p>
            : data.optimizableAnimations.slice(0, 20).map((opt: any, i: number) => (
              <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                <p className="text-[11px] font-mono text-slate-300 truncate mb-1">{(opt.animation as any)?.path?.split('/').pop() ?? `Animation ${i + 1}`}</p>
                <div className="flex gap-3 text-[10px] text-slate-500 mb-1">
                  <span>Duration: {((opt.animation as any)?.duration ?? 0).toFixed(2)}s</span>
                  <span>Keyframes: {(opt.animation as any)?.keyframeCount ?? '?'} → {Math.floor(((opt.animation as any)?.keyframeCount ?? 0) * opt.recommendedKeyframeReduction)}</span>
                  <span className="text-amber-400">Quality impact: {opt.qualityImpact}%</span>
                </div>
                {opt.suggestions?.slice(0, 2).map((s: string, si: number) => <div key={si} className="flex gap-1.5 text-[10px] text-slate-400"><ChevronRight className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />{s}</div>)}
              </div>
            ))}
        </div>
      </SectionCard>
      {data.recommendations.length > 0 && (
        <SectionCard title="General Animation Recommendations" icon={<Info className="w-4 h-4" />}>
          {data.recommendations.map((r, i) => <div key={i} className="flex gap-2 text-[11px] text-slate-300 py-0.5"><ChevronRight className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />{r}</div>)}
        </SectionCard>
      )}
    </div>
  );
};

const TABS: { id: MiningTab; label: string }[] = [
  { id: 'pipeline',      label: 'Data Pipeline' },
  { id: 'esp',           label: 'ESP Analysis' },
  { id: 'dependencies',  label: 'Dependencies' },
  { id: 'performance',   label: 'Performance' },
  { id: 'unused-assets', label: 'Unused Assets' },
  { id: 'lod',           label: 'LOD Optimization' },
  { id: 'textures',      label: 'Texture Resolution' },
  { id: 'animations',    label: 'Animation Frames' },
];

export const MiningPanel: React.FC = () => {
  const [tab, setTab]           = useState<MiningTab>('pipeline');
  const [sources, setSources]   = useState<DataSource[]>([]);
  const [isMining, setIsMining] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult]     = useState<MiningResultView | null>(null);

  const startMining = useCallback(async () => {
    const miningApi = (window as any).electronAPI?.miningPipeline;
    if (!miningApi?.executePipeline) {
      console.error('[MiningPanel] electronAPI.miningPipeline.executePipeline not available');
      return;
    }
    setIsMining(true);
    setProgress({ percent: 0, task: 'Initialising pipeline…' });
    // Poll the real pipeline status (miningState, updated live by the
    // orchestrator's progress callback in main.ts) instead of faking a timer.
    const poller = setInterval(async () => {
      try {
        const status = await (window as any).electronAPI?.getMiningStatus?.();
        const s = status?.data ?? status;
        if (s && typeof s.progress === 'number') {
          setProgress({ percent: s.progress, task: s.currentTask || 'Working…' });
        }
      } catch { /* status poll is best-effort */ }
    }, 400);
    try {
      const raw = await miningApi.executePipeline(sources);
      clearInterval(poller);
      setProgress({ percent: 100, task: 'Pipeline complete.' });
      const data: MiningResultView = raw?.data ?? raw ?? {
        espData: new Map(), correlations: [], errors: [],
        dependencyGraph: { nodes: new Map(), edges: [], cycles: [], loadOrder: [] },
        performanceReport: { baselineMetrics: { fps: 0, memoryUsage: 0, loadTime: 0 }, recommendations: [] },
      };
      if (data.espData && !(data.espData instanceof Map)) data.espData = new Map(Object.entries(data.espData));
      if (data.dependencyGraph?.nodes && !(data.dependencyGraph.nodes instanceof Map)) data.dependencyGraph.nodes = new Map(Object.entries(data.dependencyGraph.nodes));
      setResult(data);
    } catch (err) {
      clearInterval(poller);
      console.error('[MiningPanel] Pipeline error:', err);
      setProgress({ percent: 0, task: 'Pipeline failed — see DevTools console for details.' });
    } finally {
      setIsMining(false);
    }
  }, [sources]);

  const exportJSON = useCallback(() => {
    if (!result) return;
    const payload = {
      ...result,
      espData: Object.fromEntries(result.espData),
      dependencyGraph: { ...result.dependencyGraph, nodes: Object.fromEntries(result.dependencyGraph.nodes) },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fo4-mining-results-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const importPluginsTxt = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.txt';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const text = (ev.target?.result as string) ?? '';
        const plugins = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && /\.(esp|esm|esl)$/i.test(l));
        const newSources: DataSource[] = plugins.map((p, i) => ({ type: 'esp', path: p, priority: sources.length + i + 1 }));
        setSources(s => [...s, ...newSources]);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [sources.length]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-base font-black text-white mb-0.5">Core Mining Infrastructure</h2>
        <p className="text-[11px] text-slate-400">
          Multi-source pipeline — parse ESP/ESM/ESL plugins, correlate NIF assets, build dependency graphs,
          detect conflicts, analyse performance, scan for unused assets, and generate LOD/texture/animation reports.
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {TABS.map(t => <TabBtn key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
      </div>
      <div className="min-h-[300px]">
        {tab === 'pipeline'      && <PipelineTab sources={sources} setSources={setSources} isMining={isMining} progress={progress} result={result} onStart={startMining} onExport={exportJSON} onImportPluginsTxt={importPluginsTxt} />}
        {tab === 'esp'           && <ESPTab result={result} />}
        {tab === 'dependencies'  && <DependenciesTab result={result} />}
        {tab === 'performance'   && <PerformanceTab result={result} />}
        {tab === 'unused-assets' && <UnusedAssetsTab result={result} />}
        {tab === 'lod'           && <LODTab result={result} />}
        {tab === 'textures'      && <TexturesTab result={result} />}
        {tab === 'animations'    && <AnimationsTab result={result} />}
      </div>
    </div>
  );
};
