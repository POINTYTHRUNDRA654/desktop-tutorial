/**
 * ModComparisonTool — FO4 Packaging & Release Hub — Step 3
 *
 * Side-by-side comparison of two Fallout 4 mods:
 *  - Plugin record overrides / Asset path conflicts / Shared dependency analysis
 *  - Load order impact / ESL / ESM flag comparison
 */

import { useState } from 'react';
import {
  GitCompare, ArrowLeftRight, FolderOpen, AlertTriangle, CheckCircle,
  Info, ExternalLink, ChevronDown, ChevronRight, Layers, Shield, Package,
} from 'lucide-react';
import { openExternal } from './utils/openExternal';

const openUrl = (url: string) => void openExternal(url);

interface RecordDiff { formId: string; recordType: string; fieldA: string; fieldB: string; conflict: boolean; }
interface AssetDiff { path: string; inA: boolean; inB: boolean; conflict: boolean; }
interface DependencyDiff { master: string; requiredByA: boolean; requiredByB: boolean; }
interface ComparisonResult {
  records: RecordDiff[]; assets: AssetDiff[]; dependencies: DependencyDiff[];
  pluginFlagsA: { esl: boolean; esm: boolean; esp: boolean };
  pluginFlagsB: { esl: boolean; esm: boolean; esp: boolean };
  loadOrderImpact: string[];
  summary: { recordConflicts: number; assetConflicts: number; sharedDependencies: number; compatible: boolean; };
}
interface ModComparisonToolProps { embedded?: boolean; }

const SeverityBadge: React.FC<{ conflict: boolean }> = ({ conflict }) =>
  conflict ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/30 border border-red-500/40 text-red-300">
      <AlertTriangle className="w-3 h-3" /> Conflict
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400">Diff</span>
  );

const CategoryPanel: React.FC<{
  icon: React.ReactNode; title: string; badge?: string; badgeColor?: string;
  children: React.ReactNode; defaultOpen?: boolean;
}> = ({ icon, title, badge, badgeColor = 'text-slate-400', children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-800 bg-black/30 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-900/70 transition-colors text-left">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-black text-white">{title}</span>
          {badge && <span className={`text-xs font-mono ${badgeColor}`}>{badge}</span>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="border-t border-slate-800 p-4">{children}</div>}
    </div>
  );
};

export default function ModComparisonTool({ embedded = false }: ModComparisonToolProps) {
  const [modA, setModA] = useState('');
  const [modB, setModB] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const compareMods = async () => {
    if (!modA.trim() || !modB.trim()) { setError('Enter both plugin names or paths to compare.'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const api = (window as any).electronAPI;
      if (api?.modComparisonTool?.compare) {
        setResult(await api.modComparisonTool.compare(modA.trim(), modB.trim()));
      } else if (api?.conflictAnalyze) {
        const data = await api.conflictAnalyze([modA.trim(), modB.trim()]);
        const records: RecordDiff[] = (data?.conflicts || []).map((c: any) => ({
          formId: c.formId || '?', recordType: c.recordType || '?',
          fieldA: (c.plugins || [])[0] || modA, fieldB: (c.plugins || [])[1] || modB, conflict: true,
        }));
        setResult({
          records, assets: [], dependencies: [],
          pluginFlagsA: { esl: false, esm: false, esp: true },
          pluginFlagsB: { esl: false, esm: false, esp: true },
          loadOrderImpact: [],
          summary: { recordConflicts: records.filter(r => r.conflict).length, assetConflicts: 0, sharedDependencies: 0, compatible: records.filter(r => r.conflict).length === 0 },
        });
      } else {
        setError('Comparison bridge unavailable. Start the Desktop Bridge to enable live plugin comparison.');
      }
    } catch (err: any) { setError(String(err?.message || err)); }
    finally { setLoading(false); }
  };

  const conflictCount = result ? result.summary.recordConflicts + result.summary.assetConflicts : 0;
  const containerCls = embedded ? 'space-y-4' : 'min-h-screen bg-[#0a0e0a] p-8';

  return (
    <div className={containerCls}>
      <div className={embedded ? '' : 'max-w-7xl mx-auto'}>

        {!embedded && (
          <div className="mb-8">
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase mb-1">Mossy Tutor • Packaging</div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <GitCompare className="w-8 h-8 text-emerald-400" /> Mod Comparison Tool
            </h1>
            <p className="text-slate-400 mt-2">Side-by-side record, asset, and dependency analysis</p>
          </div>
        )}

        {/* Input Panel */}
        <div className="rounded-xl border border-slate-800 bg-black/40 p-5 mb-4">
          <div className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4">Compare Two Plugins</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Plugin A', value: modA, set: setModA },
              { label: 'Plugin B', value: modB, set: setModB },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-xs font-bold text-slate-300 mb-1">{label}</label>
                <div className="flex gap-2">
                  <input type="text" value={value} onChange={e => set(e.target.value)}
                    placeholder="MyMod.esp or full path…"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
                  <button type="button" onClick={async () => {
                    try { const p = await (window as any).electronAPI?.pickEspFile?.(); if (p) set(p); } catch { /* ignore */ }
                  }} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg border border-slate-600 transition-colors" title="Browse for plugin">
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="mb-3 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-xs text-red-300">{error}</div>}

          <button type="button" onClick={compareMods} disabled={!modA || !modB || loading}
            className="w-full px-6 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Comparing…</>
              : <><ArrowLeftRight className="w-5 h-5" /> Compare Plugins</>}
          </button>

          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-blue-900/10 border border-blue-500/20">
            <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-400">
              Tip: Run <strong className="text-slate-300">FO4Edit -quickautoclean</strong> on both plugins first to remove ITMs that would appear as false conflicts.
            </p>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className={`rounded-xl border p-4 flex flex-wrap items-center gap-4 ${result.summary.compatible ? 'border-emerald-600/30 bg-emerald-900/10' : 'border-red-600/30 bg-red-900/10'}`}>
              <div className="flex items-center gap-2">
                {result.summary.compatible ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                <span className={`text-sm font-black ${result.summary.compatible ? 'text-emerald-300' : 'text-red-300'}`}>
                  {result.summary.compatible ? 'Likely Compatible' : `${conflictCount} Conflict${conflictCount !== 1 ? 's' : ''} Found`}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-mono">
                <span className="text-slate-300">Record conflicts: <strong className="text-white">{result.summary.recordConflicts}</strong></span>
                <span className="text-slate-300">Asset conflicts: <strong className="text-white">{result.summary.assetConflicts}</strong></span>
                <span className="text-slate-300">Shared masters: <strong className="text-white">{result.summary.sharedDependencies}</strong></span>
              </div>
            </div>

            {/* Plugin flags */}
            <div className="grid grid-cols-2 gap-3">
              {[{ label: modA || 'Plugin A', flags: result.pluginFlagsA }, { label: modB || 'Plugin B', flags: result.pluginFlagsB }].map(({ label, flags }) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-black/30 p-4">
                  <div className="text-xs font-black text-slate-300 mb-2 truncate">{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {flags.esm && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/30 border border-amber-600/40 text-amber-300">ESM Master</span>}
                    {flags.esl && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/30 border border-blue-600/40 text-blue-300">ESL Light</span>}
                    {flags.esp && !flags.esm && !flags.esl && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">ESP Plugin</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Record Overrides */}
            <CategoryPanel icon={<Layers className="w-4 h-4 text-emerald-300" />} title="Record Overrides"
              badge={`${result.records.length} records`} badgeColor={result.summary.recordConflicts > 0 ? 'text-red-400' : 'text-slate-400'}
              defaultOpen={result.records.length > 0}>
              {result.records.length === 0 ? <p className="text-xs text-slate-500">No record overrides found.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] font-bold uppercase text-slate-500 border-b border-slate-800">
                        <th className="pb-2 pr-3">FormID</th><th className="pb-2 pr-3">Type</th>
                        <th className="pb-2 pr-3">Plugin A</th><th className="pb-2 pr-3">Plugin B</th><th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {result.records.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-900/30">
                          <td className="py-2 pr-3 font-mono text-slate-300">{r.formId}</td>
                          <td className="py-2 pr-3 text-slate-400">{r.recordType}</td>
                          <td className="py-2 pr-3 text-slate-300 max-w-[140px] truncate" title={r.fieldA}>{r.fieldA}</td>
                          <td className="py-2 pr-3 text-slate-300 max-w-[140px] truncate" title={r.fieldB}>{r.fieldB}</td>
                          <td className="py-2"><SeverityBadge conflict={r.conflict} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CategoryPanel>

            {/* Asset Conflicts */}
            <CategoryPanel icon={<Package className="w-4 h-4 text-amber-300" />} title="Asset Path Conflicts"
              badge={`${result.assets.length} assets`} badgeColor={result.summary.assetConflicts > 0 ? 'text-red-400' : 'text-slate-400'}>
              {result.assets.length === 0
                ? <p className="text-xs text-slate-500">No asset paths compared — requires Desktop Bridge with file access.</p>
                : (
                  <div className="space-y-2">
                    {result.assets.map((a, i) => (
                      <div key={i} className={`flex items-center justify-between p-2 rounded border text-xs ${a.conflict ? 'border-red-500/30 bg-red-900/10' : 'border-slate-800 bg-slate-900/20'}`}>
                        <span className="font-mono text-slate-300 truncate flex-1 mr-3">{a.path}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.inA ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-600/30' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}>A</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.inB ? 'bg-blue-900/30 text-blue-400 border border-blue-600/30' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}>B</span>
                          {a.conflict && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CategoryPanel>

            {/* Shared Dependencies */}
            <CategoryPanel icon={<Shield className="w-4 h-4 text-blue-300" />} title="Shared Master Dependencies" badge={`${result.dependencies.length} masters`}>
              {result.dependencies.length === 0 ? <p className="text-xs text-slate-500">No shared masters detected.</p> : (
                <div className="space-y-2">
                  {result.dependencies.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border border-slate-800 bg-slate-900/20 text-xs">
                      <span className="font-mono text-slate-300">{d.master}</span>
                      <div className="flex gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.requiredByA ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-600/30' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}>A</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.requiredByB ? 'bg-blue-900/30 text-blue-400 border border-blue-600/30' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}>B</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CategoryPanel>

            {/* Load Order */}
            <CategoryPanel icon={<GitCompare className="w-4 h-4 text-slate-300" />} title="Load Order Recommendations">
              {result.loadOrderImpact.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">General load order rules:</p>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    <li>• The plugin that loads <strong className="text-slate-300">later</strong> wins all record conflicts.</li>
                    <li>• A compatibility patch should load <strong className="text-slate-300">after both</strong> plugins.</li>
                    <li>• ESL-flagged plugins do not consume a load-order slot but still override by position.</li>
                    <li>• If conflicts are significant, create a compatibility patch in FO4Edit rather than relying on load order.</li>
                  </ul>
                  <button type="button" onClick={() => openUrl('https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:border-emerald-600/40 transition-colors">
                    <ExternalLink className="w-3 h-3" /> Download FO4Edit (Nexus)
                  </button>
                </div>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-400">
                  {result.loadOrderImpact.map((line, i) => <li key={i}>• {line}</li>)}
                </ul>
              )}
            </CategoryPanel>
          </div>
        )}

        {!result && !loading && (
          <div className="rounded-xl border border-slate-800 bg-black/20 p-8 text-center">
            <GitCompare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Enter two plugin names above and click Compare.</p>
            <p className="text-xs text-slate-600 mt-1">Results: record overrides, asset conflicts, shared dependencies, and load order guidance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
