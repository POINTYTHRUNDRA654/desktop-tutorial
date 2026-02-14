import React, { useMemo, useState } from 'react';
import { ArrowDownUp, Sparkles, AlertTriangle, CheckCircle2, Layers, Wand2 } from 'lucide-react';
import type {
  PluginInfo,
  LoadOrderAnalysis,
  OptimizationRules,
  OptimizedLoadOrder,
  SortingRule,
  ConflictMatrix,
  DependencyGraph,
  PerformanceEstimate,
  PriorityPlugin,
} from '../../shared/types';

type LoadOrderOptimizerProps = {
  embedded?: boolean;
};

const getBridge = () => (window as any).electronAPI || (window as any).electron?.api;

const defaultRules: OptimizationRules = {
  algorithm: 'loot',
  priorityPlugins: [],
  conflictResolution: 'last_wins',
  enableESLFirst: true,
  respectGroups: true,
  customRules: [],
  communityRules: true,
};

const LoadOrderOptimizer: React.FC<LoadOrderOptimizerProps> = ({ embedded = false }) => {
  const api = getBridge();

  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [analysis, setAnalysis] = useState<LoadOrderAnalysis | null>(null);
  const [conflicts, setConflicts] = useState<ConflictMatrix | null>(null);
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraph | null>(null);
  const [performance, setPerformance] = useState<PerformanceEstimate | null>(null);
  const [optimized, setOptimized] = useState<OptimizedLoadOrder | null>(null);
  const [rules, setRules] = useState<OptimizationRules>(defaultRules);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [importPath, setImportPath] = useState<string>('');
  const [exportPath, setExportPath] = useState<string>('');
  const [manualPlugin, setManualPlugin] = useState<string>('');
  const [priorityPluginName, setPriorityPluginName] = useState<string>('');
  const [priorityPluginAnchor, setPriorityPluginAnchor] = useState<string>('');
  const [priorityType, setPriorityType] = useState<PriorityPlugin['priority']>('first');
  const [customRuleName, setCustomRuleName] = useState<string>('');
  const [customRuleTarget, setCustomRuleTarget] = useState<string>('');
  const [customRulePriority, setCustomRulePriority] = useState<number>(50);

  const conflictCounts = useMemo(() => {
    if (!conflicts) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (let i = 0; i < conflicts.plugins.length; i++) {
      const pluginName = conflicts.plugins[i];
      const row = conflicts.conflicts[i] || [];
      const total = row.reduce((sum, value) => sum + value, 0);
      counts.set(pluginName, total);
    }
    return counts;
  }, [conflicts]);

  const orderedPlugins = useMemo(() => {
    return [...plugins].sort((a, b) => a.loadIndex - b.loadIndex);
  }, [plugins]);

  const setLoadIndices = (items: PluginInfo[]): PluginInfo[] => {
    return items.map((plugin, idx) => ({ ...plugin, loadIndex: idx }));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...orderedPlugins];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setPlugins(setLoadIndices(next));
    setDragIndex(null);
  };

  const handleAddManualPlugin = () => {
    const name = manualPlugin.trim();
    if (!name) return;
    const next: PluginInfo = {
      fileName: name,
      filePath: name,
      enabled: true,
      type: name.toLowerCase().endsWith('.esm') ? 'esm' : name.toLowerCase().endsWith('.esl') ? 'esl' : 'esp',
      masters: [],
      recordCount: 0,
      formIdPrefix: undefined,
      overrides: [],
      conflicts: [],
      loadIndex: plugins.length,
      size: 0,
      modifiedDate: new Date(),
    };
    setPlugins(setLoadIndices([...plugins, next]));
    setManualPlugin('');
  };

  const handlePickMo2 = async () => {
    setError('');
    try {
      if (!api?.pickMo2ProfileDir) {
        setError('Native picker is not available in this build.');
        return;
      }
      const dir = await api.pickMo2ProfileDir();
      if (dir) setImportPath(dir);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const handlePickVortex = async () => {
    setError('');
    try {
      if (!api?.pickVortexProfileDir) {
        setError('Native picker is not available in this build.');
        return;
      }
      const dir = await api.pickVortexProfileDir();
      if (dir) setImportPath(dir);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const handleImport = async (source: 'mo2' | 'vortex') => {
    setError('');
    setStatus('');
    try {
      if (!api?.loadOrderImport) {
        setError('Load order import is not available in this build.');
        return;
      }
      const result = await api.loadOrderImport(source, importPath.trim() || undefined);
      if (!result?.success) {
        setError(result?.errors?.[0] || 'Import failed.');
        return;
      }
      setPlugins(setLoadIndices(result.plugins || []));
      setStatus(`Imported ${result.plugins.length} plugins from ${source.toUpperCase()}.`);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const handleAnalyze = async () => {
    setError('');
    setStatus('');
    if (!api?.loadOrderAnalyze) {
      setError('Load order analysis is not available in this build.');
      return;
    }
    try {
      setStatus('Analyzing load order...');
      const result = await api.loadOrderAnalyze(orderedPlugins);
      setAnalysis(result);
      setConflicts(result?.conflictMatrix || null);
      setDependencyGraph(result?.dependencyGraph || null);
      if (api?.loadOrderPredictPerformance) {
        const perf = await api.loadOrderPredictPerformance(orderedPlugins);
        setPerformance(perf || null);
      }
      setStatus('Analysis complete.');
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const handleOptimize = async () => {
    setError('');
    setStatus('');
    if (!api?.loadOrderOptimize) {
      setError('Optimization is not available in this build.');
      return;
    }
    try {
      setStatus('Optimizing load order...');
      const result = await api.loadOrderOptimize(orderedPlugins, rules);
      setOptimized(result);
      setStatus('Optimization ready.');
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const handleExport = async (destination: 'mo2' | 'vortex') => {
    setError('');
    setStatus('');
    if (!api?.loadOrderExport) {
      setError('Export is not available in this build.');
      return;
    }
    try {
      const result = await api.loadOrderExport(orderedPlugins, destination, exportPath.trim() || undefined);
      if (!result?.success) {
        setError(result?.error || 'Export failed.');
        return;
      }
      setStatus(`Exported ${result.pluginCount} plugins to ${result.filePath}.`);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const handleAddPriority = () => {
    const plugin = priorityPluginName.trim();
    if (!plugin) return;
    const next: PriorityPlugin = {
      plugin,
      priority: priorityType,
      anchor: priorityPluginAnchor.trim() || undefined,
      reason: 'User priority',
    };
    setRules(prev => ({ ...prev, priorityPlugins: [...prev.priorityPlugins, next] }));
    setPriorityPluginName('');
    setPriorityPluginAnchor('');
  };

  const handleAddCustomRule = () => {
    const name = customRuleName.trim();
    const target = customRuleTarget.trim();
    if (!name || !target) return;
    const rule: SortingRule = {
      id: `rule_${Date.now()}`,
      name,
      description: 'User rule',
      condition: {
        type: 'plugin_name',
        operator: 'contains',
        value: name,
      },
      action: {
        type: 'move_before',
        target,
      },
      priority: customRulePriority,
      enabled: true,
    };
    setRules(prev => ({ ...prev, customRules: [...prev.customRules, rule] }));
    setCustomRuleName('');
    setCustomRuleTarget('');
  };

  const compareList = useMemo(() => {
    if (!optimized) return [];
    const before = orderedPlugins.map(p => p.fileName);
    const after = optimized.plugins;
    return after.map((name, index) => {
      const beforeIndex = before.indexOf(name);
      return { name, beforeIndex, afterIndex: index, changed: beforeIndex !== index };
    });
  }, [optimized, orderedPlugins]);

  return (
    <div className={embedded ? '' : 'min-h-full bg-[#0b0f0b] text-slate-100'}>
      <div className={embedded ? '' : 'max-w-6xl mx-auto px-6 py-10'}>
        {!embedded && (
          <div className="mb-8">
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Load Order Optimizer</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Load Order Optimizer</h1>
            <p className="text-sm font-medium text-slate-300 max-w-2xl">Analyze, optimize, and export your Fallout 4 load order with conflict intelligence.</p>
          </div>
        )}

        {(status || error) && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${error ? 'border-rose-500/40 bg-rose-900/20 text-rose-100' : 'border-emerald-500/30 bg-emerald-900/10 text-emerald-100'}`}>
            {error || status}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 rounded-xl border border-slate-800 bg-black/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Current Load Order</h2>
                <p className="text-xs text-slate-400">Drag to reorder. Import from MO2 or Vortex.</p>
              </div>
              <ArrowDownUp className="w-5 h-5 text-emerald-300" />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    value={importPath}
                    onChange={(e) => setImportPath(e.target.value)}
                    placeholder="Path to plugins.txt or profile folder"
                    className="flex-1 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2 text-xs text-slate-200"
                  />
                  <button
                    className="px-3 py-2 text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-600 rounded-md"
                    onClick={() => handleImport('mo2')}
                  >
                    Import MO2
                  </button>
                  <button
                    className="px-3 py-2 text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 rounded-md"
                    onClick={() => handleImport('vortex')}
                  >
                    Import Vortex
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 rounded-md"
                    onClick={handlePickMo2}
                  >
                    Pick MO2 Profile
                  </button>
                  <button
                    className="px-3 py-2 text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 rounded-md"
                    onClick={handlePickVortex}
                  >
                    Pick Vortex Profile
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={manualPlugin}
                    onChange={(e) => setManualPlugin(e.target.value)}
                    placeholder="Add plugin manually (e.g., MyMod.esp)"
                    className="flex-1 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2 text-xs text-slate-200"
                  />
                  <button
                    className="px-3 py-2 text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 rounded-md"
                    onClick={handleAddManualPlugin}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="mt-4 max-h-[380px] overflow-y-auto space-y-2 pr-2">
                {orderedPlugins.length === 0 && (
                  <div className="text-xs text-slate-400">No plugins loaded yet.</div>
                )}
                {orderedPlugins.map((plugin, index) => {
                  const conflictCount = conflictCounts.get(plugin.fileName) || 0;
                  return (
                    <div
                      key={`${plugin.fileName}-${index}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(index)}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-100">{plugin.fileName}</div>
                        <div className="text-[10px] text-slate-400">{plugin.type.toUpperCase()} • {plugin.enabled ? 'Enabled' : 'Disabled'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {conflictCount > 0 && (
                          <span className="px-2 py-1 rounded-full bg-rose-500/20 text-rose-200">{conflictCount} conflicts</span>
                        )}
                        <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-200">#{index + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="lg:col-span-7 grid grid-cols-1 gap-6">
            <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Analysis Results</h2>
                  <p className="text-xs text-slate-400">Conflicts, dependency tree, and performance score.</p>
                </div>
                <button
                  className="px-3 py-2 text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-600 rounded-md"
                  onClick={handleAnalyze}
                >
                  Analyze
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <div className="text-xs text-slate-400">Performance Score</div>
                  <div className="text-2xl font-black text-white">{analysis?.performanceScore ?? '--'}</div>
                  <div className="text-xs text-slate-500">Stability: {analysis?.stabilityScore ?? '--'}</div>
                  {performance && (
                    <div className="text-xs text-slate-500">Load Impact: {performance.overallScore}</div>
                  )}
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <div className="text-xs text-slate-400">Conflicts Detected</div>
                  <div className="text-2xl font-black text-white">{analysis?.conflicts?.length ?? '--'}</div>
                  <div className="text-xs text-slate-500">Issues: {analysis?.dependencyIssues?.length ?? '--'}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <div className="text-xs text-slate-400 mb-2">Conflict Heatmap</div>
                  <div className="grid grid-cols-6 gap-1">
                    {(conflicts?.heatmapData || []).slice(0, 36).map((cell, idx) => (
                      <div
                        key={`${cell.x}-${cell.y}-${idx}`}
                        className={`h-3 w-3 rounded ${cell.severity === 'critical' ? 'bg-rose-500' : cell.severity === 'major' ? 'bg-orange-500' : cell.severity === 'minor' ? 'bg-yellow-400' : 'bg-slate-700'}`}
                        title={`${cell.plugins[0]} vs ${cell.plugins[1]}: ${cell.value}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <div className="text-xs text-slate-400 mb-2">Dependency Tree</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto text-xs">
                    {(dependencyGraph?.levels || []).map((level, idx) => (
                      <div key={`level-${idx}`} className="flex flex-wrap gap-2">
                        {level.map((node) => (
                          <span key={node} className="px-2 py-1 rounded-full bg-slate-800 text-slate-200">{node}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-400 mb-2">Issues</div>
                <div className="space-y-2">
                  {(analysis?.dependencyIssues || []).slice(0, 5).map((issue, idx) => (
                    <div key={`issue-${idx}`} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                      <div>
                        <div className="text-slate-200">{issue.description}</div>
                        <div className="text-slate-500">Affected: {issue.affectedPlugins.join(', ')}</div>
                      </div>
                    </div>
                  ))}
                  {(analysis?.dependencyIssues || []).length === 0 && (
                    <div className="text-xs text-slate-500">No issues detected.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-400 mb-2">Recommendations</div>
                <div className="space-y-2">
                  {(analysis?.recommendations || []).slice(0, 4).map((rec, idx) => (
                    <div key={`rec-${idx}`} className="text-xs text-slate-200">
                      <strong>{rec.priority.toUpperCase()}</strong> {rec.description} — {rec.suggestedAction}
                    </div>
                  ))}
                  {(analysis?.recommendations || []).length === 0 && (
                    <div className="text-xs text-slate-500">No recommendations yet.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Optimization Options</h2>
                  <p className="text-xs text-slate-400">Algorithm, rules, and priorities.</p>
                </div>
                <button
                  className="px-3 py-2 text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-600 rounded-md"
                  onClick={handleOptimize}
                >
                  Optimize
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <label className="text-slate-400">Algorithm</label>
                  <select
                    value={rules.algorithm}
                    onChange={(e) => setRules(prev => ({ ...prev, algorithm: e.target.value as OptimizationRules['algorithm'] }))}
                    className="w-full rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                  >
                    <option value="loot">LOOT-like</option>
                    <option value="boss">BOSS-like</option>
                    <option value="stability">Stability-first</option>
                    <option value="performance">Performance-first</option>
                    <option value="custom">Custom</option>
                  </select>

                  <label className="text-slate-400">Conflict Strategy</label>
                  <select
                    value={rules.conflictResolution}
                    onChange={(e) => setRules(prev => ({ ...prev, conflictResolution: e.target.value as OptimizationRules['conflictResolution'] }))}
                    className="w-full rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                  >
                    <option value="last_wins">Last wins</option>
                    <option value="first_wins">First wins</option>
                    <option value="manual">Manual</option>
                  </select>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rules.enableESLFirst}
                      onChange={(e) => setRules(prev => ({ ...prev, enableESLFirst: e.target.checked }))}
                    />
                    <span className="text-slate-300">Enable ESL first</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rules.communityRules}
                      onChange={(e) => setRules(prev => ({ ...prev, communityRules: e.target.checked }))}
                    />
                    <span className="text-slate-300">Community rules</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400">Priority Plugins</label>
                  <div className="flex gap-2">
                    <input
                      value={priorityPluginName}
                      onChange={(e) => setPriorityPluginName(e.target.value)}
                      placeholder="Plugin name"
                      className="flex-1 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                    />
                    <select
                      value={priorityType}
                      onChange={(e) => setPriorityType(e.target.value as PriorityPlugin['priority'])}
                      className="rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                    >
                      <option value="first">First</option>
                      <option value="last">Last</option>
                      <option value="before">Before</option>
                      <option value="after">After</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={priorityPluginAnchor}
                      onChange={(e) => setPriorityPluginAnchor(e.target.value)}
                      placeholder="Anchor (optional)"
                      className="flex-1 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                    />
                    <button
                      className="px-3 py-2 rounded-md bg-slate-700/80 hover:bg-slate-700"
                      onClick={handleAddPriority}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rules.priorityPlugins.map((p, idx) => (
                      <span key={`${p.plugin}-${idx}`} className="px-2 py-1 rounded-full bg-slate-800 text-slate-200">
                        {p.plugin} ({p.priority})
                      </span>
                    ))}
                  </div>

                  <label className="text-slate-400">Custom Rules</label>
                  <div className="flex gap-2">
                    <input
                      value={customRuleName}
                      onChange={(e) => setCustomRuleName(e.target.value)}
                      placeholder="Rule name"
                      className="flex-1 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                    />
                    <input
                      value={customRuleTarget}
                      onChange={(e) => setCustomRuleTarget(e.target.value)}
                      placeholder="Target plugin"
                      className="flex-1 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customRulePriority}
                      onChange={(e) => setCustomRulePriority(Number(e.target.value))}
                      className="w-24 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2"
                    />
                    <button
                      className="px-3 py-2 rounded-md bg-slate-700/80 hover:bg-slate-700"
                      onClick={handleAddCustomRule}
                    >
                      Add Rule
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rules.customRules.map((r) => (
                      <span key={r.id} className="px-2 py-1 rounded-full bg-slate-800 text-slate-200">
                        {r.name} (p{r.priority})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Compare & Export</h2>
                  <p className="text-xs text-slate-400">Before/after, conflict improvement, and export.</p>
                </div>
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Layers className="w-4 h-4" /> Current Order
                  </div>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {orderedPlugins.map((plugin, index) => (
                      <div key={`before-${plugin.fileName}-${index}`} className="text-slate-200">{index + 1}. {plugin.fileName}</div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Wand2 className="w-4 h-4" /> Optimized Order
                  </div>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {compareList.map((item) => (
                      <div key={`after-${item.name}`} className={item.changed ? 'text-emerald-200' : 'text-slate-200'}>
                        {item.afterIndex + 1}. {item.name}
                      </div>
                    ))}
                    {compareList.length === 0 && <div className="text-slate-500">Run optimization to see changes.</div>}
                  </div>
                </div>
              </div>

              {optimized && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
                    <div className="text-slate-400">Conflicts Resolved</div>
                    <div className="text-lg font-black text-white">{optimized.improvements.conflictsResolved}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
                    <div className="text-slate-400">Stability Gain</div>
                    <div className="text-lg font-black text-white">{optimized.improvements.stabilityGain}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
                    <div className="text-slate-400">Performance Gain</div>
                    <div className="text-lg font-black text-white">{optimized.improvements.performanceGain}</div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                <input
                  value={exportPath}
                  onChange={(e) => setExportPath(e.target.value)}
                  placeholder="Export path (plugins.txt)"
                  className="w-full rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2 text-xs text-slate-200"
                />
                <div className="flex gap-2">
                  <button className="px-3 py-2 text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-600 rounded-md" onClick={() => handleExport('mo2')}>
                    Export to MO2
                  </button>
                  <button className="px-3 py-2 text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 rounded-md" onClick={() => handleExport('vortex')}>
                    Export to Vortex
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                {optimized ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {optimized ? 'Optimization ready. Review changes before exporting.' : 'Run optimization to enable export comparison.'}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LoadOrderOptimizer;
