import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, Wand2, Filter, FileDown } from 'lucide-react';
import type {
  ConflictAnalysis,
  Conflict,
  ConflictSeverity,
  ConflictType,
  ConflictRule,
  ResolvedConflicts,
  ResolutionStrategy,
  PatchESP,
} from '../../shared/types';

type ConflictResolverProps = {
  embedded?: boolean;
};

const getBridge = () => (window as any).electronAPI || (window as any).electron?.api;

const ConflictResolver: React.FC<ConflictResolverProps> = ({ embedded = false }) => {
  const api = getBridge();

  const [pluginInput, setPluginInput] = useState<string>('');
  const [plugins, setPlugins] = useState<string[]>([]);
  const [scanDepth, setScanDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [analysis, setAnalysis] = useState<ConflictAnalysis | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<ConflictSeverity | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ConflictType | 'all'>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [rules, setRules] = useState<ConflictRule[]>([]);
  const [resolved, setResolved] = useState<ResolvedConflicts | null>(null);
  const [patch, setPatch] = useState<PatchESP | null>(null);
  const [patchName, setPatchName] = useState<string>('ConflictResolutionPatch.esp');
  const [patchDescription, setPatchDescription] = useState<string>('');
  const [loadPosition, setLoadPosition] = useState<'last' | 'before' | 'after'>('last');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const conflicts = analysis?.conflicts || [];

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(conflict => {
      if (selectedSeverity !== 'all' && conflict.severity !== selectedSeverity) return false;
      if (selectedType !== 'all' && conflict.type !== selectedType) return false;
      if (searchText) {
        const term = searchText.toLowerCase();
        const matches = `${conflict.recordType} ${conflict.formId || ''} ${conflict.plugins.join(' ')}`.toLowerCase();
        if (!matches.includes(term)) return false;
      }
      return true;
    });
  }, [conflicts, selectedSeverity, selectedType, searchText]);

  const handleAddPlugin = () => {
    const value = pluginInput.trim();
    if (!value) return;
    setPlugins(prev => Array.from(new Set([...prev, value])));
    setPluginInput('');
  };

  const handleScan = async () => {
    setError('');
    setStatus('');
    if (!api?.conflictAnalyze) {
      setError('Conflict analyzer is not available in this build.');
      return;
    }
    try {
      setStatus('Scanning conflicts...');
      const result = await api.conflictAnalyze(plugins);
      setAnalysis(result);
      setResolved(null);
      setPatch(null);
      setStatus(`Scan complete (${scanDepth}).`);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const handleApplyRules = async () => {
    setError('');
    if (!api?.conflictApplyRules || !analysis) return;
    try {
      const result = await api.conflictApplyRules(analysis.conflicts, rules);
      setResolved(result);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const handleGeneratePatch = async (strategy: ResolutionStrategy) => {
    setError('');
    if (!api?.conflictGeneratePatch || !analysis) return;
    try {
      const result = await api.conflictGeneratePatch(analysis.conflicts, strategy);
      setPatch({
        ...result,
        fileName: patchName || result.fileName,
        description: patchDescription || result.description,
        loadPosition,
      });
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const summary = analysis?.summary;

  return (
    <div className={embedded ? '' : 'min-h-full bg-[#0b0f0b] text-slate-100'}>
      <div className={embedded ? '' : 'max-w-6xl mx-auto px-6 py-10'}>
        {!embedded && (
          <div className="mb-8">
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Conflict Resolution</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Conflict Resolver</h1>
            <p className="text-sm font-medium text-slate-300 max-w-2xl">Scan, resolve, and generate patch metadata for load order conflicts.</p>
          </div>
        )}

        {(status || error) && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${error ? 'border-rose-500/40 bg-rose-900/20 text-rose-100' : 'border-emerald-500/30 bg-emerald-900/10 text-emerald-100'}`}>
            {error || status}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-4 rounded-xl border border-slate-800 bg-black/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Conflict Scanner</h2>
                <p className="text-xs text-slate-400">Load order import and scan depth.</p>
              </div>
              <Layers className="w-5 h-5 text-emerald-300" />
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex gap-2">
                <input
                  value={pluginInput}
                  onChange={(e) => setPluginInput(e.target.value)}
                  placeholder="Plugin path (e.g. MyMod.esp)"
                  className="flex-1 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2 text-slate-200"
                />
                <button className="px-3 py-2 rounded-md bg-slate-700/80 hover:bg-slate-700" onClick={handleAddPlugin}>Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {plugins.map((plugin) => (
                  <span key={plugin} className="px-2 py-1 rounded-full bg-slate-800 text-slate-200">{plugin}</span>
                ))}
                {plugins.length === 0 && <span className="text-slate-500">No plugins selected.</span>}
              </div>
              <div>
                <label className="text-slate-400">Scan depth</label>
                <select
                  value={scanDepth}
                  onChange={(e) => setScanDepth(e.target.value as 'quick' | 'standard' | 'deep')}
                  className="w-full rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                >
                  <option value="quick">Quick</option>
                  <option value="standard">Standard</option>
                  <option value="deep">Deep</option>
                </select>
              </div>
              <button className="w-full px-3 py-2 rounded-md bg-emerald-600/80 hover:bg-emerald-600" onClick={handleScan}>
                Scan Conflicts
              </button>
              <button className="w-full px-3 py-2 rounded-md bg-slate-700/80 hover:bg-slate-700 flex items-center justify-center gap-2">
                <FileDown className="w-4 h-4" /> Export Conflict Report
              </button>
            </div>
          </section>

          <section className="lg:col-span-8 space-y-6">
            <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Conflict Browser</h2>
                  <p className="text-xs text-slate-400">Filter by severity/type, search by FormID or record.</p>
                </div>
                <Filter className="w-5 h-5 text-emerald-300" />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value as ConflictSeverity | 'all')}
                  className="rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                </select>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ConflictType | 'all')}
                  className="rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                >
                  <option value="all">All Types</option>
                  <option value="record_override">Record Override</option>
                  <option value="asset">Asset</option>
                  <option value="script">Script</option>
                  <option value="navmesh">NavMesh</option>
                  <option value="ai_package">AI Package</option>
                </select>
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search FormID or record"
                  className="rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                />
              </div>

              <div className="mt-4 max-h-64 overflow-y-auto space-y-2 text-xs">
                {filteredConflicts.map((conflict) => (
                  <div key={conflict.id} className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="text-slate-100 font-semibold">{conflict.recordType} {conflict.formId || ''}</div>
                      <span className="text-[10px] uppercase text-emerald-200">{conflict.severity}</span>
                    </div>
                    <div className="text-slate-400">{conflict.plugins.join(' → ')}</div>
                    <div className="text-slate-500">{conflict.description}</div>
                  </div>
                ))}
                {filteredConflicts.length === 0 && <div className="text-slate-500">No conflicts match the filter.</div>}
              </div>

              {summary && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                    <div className="text-slate-400">Total Conflicts</div>
                    <div className="text-lg font-black text-white">{summary.total}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                    <div className="text-slate-400">Critical</div>
                    <div className="text-lg font-black text-white">{summary.bySeverity.critical}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                    <div className="text-slate-400">NavMesh</div>
                    <div className="text-lg font-black text-white">{summary.byType.navmesh}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Resolution Wizard</h2>
                  <p className="text-xs text-slate-400">Recommendations, AI suggestions, and batch rules.</p>
                </div>
                <Wand2 className="w-5 h-5 text-emerald-300" />
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <button
                  className="w-full px-3 py-2 rounded-md bg-emerald-600/80 hover:bg-emerald-600"
                  onClick={() => handleGeneratePatch('ai-suggest')}
                >
                  Apply AI Suggestion
                </button>
                <button
                  className="w-full px-3 py-2 rounded-md bg-slate-700/80 hover:bg-slate-700"
                  onClick={handleApplyRules}
                >
                  Apply Rule Set
                </button>

                {resolved && (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Resolved {resolved.resolved.length} conflicts
                    </div>
                    <div className="text-slate-400">Unresolved: {resolved.unresolved.length}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Patch Generator</h2>
                  <p className="text-xs text-slate-400">Patch metadata with load position and masters.</p>
                </div>
                <AlertTriangle className="w-5 h-5 text-amber-300" />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <input
                  value={patchName}
                  onChange={(e) => setPatchName(e.target.value)}
                  placeholder="Patch file name"
                  className="rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                />
                <select
                  value={loadPosition}
                  onChange={(e) => setLoadPosition(e.target.value as 'last' | 'before' | 'after')}
                  className="rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                >
                  <option value="last">Load last</option>
                  <option value="before">Load before</option>
                  <option value="after">Load after</option>
                </select>
                <input
                  value={patchDescription}
                  onChange={(e) => setPatchDescription(e.target.value)}
                  placeholder="Patch description"
                  className="md:col-span-2 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button className="px-3 py-2 rounded-md bg-emerald-600/80 hover:bg-emerald-600" onClick={() => handleGeneratePatch('last-wins')}>
                  Generate ESP
                </button>
                <button className="px-3 py-2 rounded-md bg-slate-700/80 hover:bg-slate-700" onClick={() => handleGeneratePatch('merge-all')}>
                  Merge All
                </button>
                <button className="px-3 py-2 rounded-md bg-slate-700/80 hover:bg-slate-700" onClick={() => handleGeneratePatch('manual')}>
                  Manual Override
                </button>
              </div>

              {patch && (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
                  <div className="text-slate-200 font-semibold">{patch.fileName}</div>
                  <div className="text-slate-400">Masters: {patch.masters.join(', ') || 'None'}</div>
                  <div className="text-slate-500">Records: {patch.records.length}</div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolver;
