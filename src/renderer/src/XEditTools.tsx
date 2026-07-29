/**
 * XEditTools - Unified xEdit/FO4Edit interface
 * Full professional script library for Fallout 4 plugin management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocalAIEngine } from './LocalAIEngine';
import {
  Database, Play, AlertTriangle, CheckCircle2,
  Code, Zap, FileText, Search, Settings,
  CheckCircle, AlertCircle, Loader, ShieldCheck,
  Layers, Hash, List, Wrench, Archive,
} from 'lucide-react';

interface XEditScript {
  id: string;
  name: string;
  description: string;
  detail: string;
  category: 'Cleaning' | 'Analysis' | 'Utility' | 'Advanced' | 'Conversion' | 'ESL' | 'Quest';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: React.ElementType;
  estimatedTime: string;
  requiresPlugin: boolean;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  duration: number;
}

const XEDIT_SCRIPTS: XEditScript[] = [
  // ── Cleaning ────────────────────────────────────────────────────────────────
  {
    id: 'clean-itm',
    name: 'Clean ITMs (Identical to Master)',
    description: 'Removes records that are identical to masters',
    detail: 'Essential first clean step. Applies the filter for cleaning, then removes every record whose data is byte-for-byte identical to the master it overrides. Reduces save bloat and prevents silent overrides.',
    category: 'Cleaning',
    difficulty: 'beginner',
    icon: CheckCircle2,
    estimatedTime: '1-5 min',
    requiresPlugin: true,
  },
  {
    id: 'clean-udr',
    name: 'Clean UDRs (Undelete and Disable References)',
    description: 'Fixes deleted references by undeleting and disabling them properly',
    detail: 'Deleted placed references cause CTDs when the engine tries to resolve a FormID that no longer exists. This converts them to disabled refs with the XSCL/XDCR pattern that the engine can handle safely.',
    category: 'Cleaning',
    difficulty: 'beginner',
    icon: CheckCircle2,
    estimatedTime: '2-10 min',
    requiresPlugin: true,
  },
  {
    id: 'batch-clean',
    name: 'Batch Clean (ITM + UDR)',
    description: 'Run ITM cleaning and UDR fixing in a single automated pass',
    detail: 'Chains both cleaning operations back-to-back. Saves time when cleaning multiple plugins. Applies filter, removes ITMs, then undeletes disabled references. Always back up before running.',
    category: 'Cleaning',
    difficulty: 'beginner',
    icon: CheckCircle2,
    estimatedTime: '2-12 min',
    requiresPlugin: true,
  },
  // ── Analysis ─────────────────────────────────────────────────────────────────
  {
    id: 'check-errors',
    name: 'Check for Errors',
    description: 'Scans the plugin for broken FormID references and invalid records',
    detail: 'Right-click → Check for Errors in xEdit. Unresolved FormID references ("Could not be resolved") indicate broken cross-references. Fix or remove those records before distributing. Required quality gate.',
    category: 'Analysis',
    difficulty: 'beginner',
    icon: AlertTriangle,
    estimatedTime: '1-3 min',
    requiresPlugin: true,
  },
  {
    id: 'find-conflicts',
    name: 'Find Conflicts',
    description: 'Scans for record conflicts between this plugin and others in the load order',
    detail: 'Loads the full load order and applies the conflict filter. Highlights records where this plugin overrides or is overridden by other plugins. Essential before generating a compatibility patch.',
    category: 'Analysis',
    difficulty: 'intermediate',
    icon: Search,
    estimatedTime: '5-15 min',
    requiresPlugin: true,
  },
  {
    id: 'analyze-overrides',
    name: 'Analyze Override Count by Record Type',
    description: 'Reports how many records of each signature your plugin overrides',
    detail: 'Groups all overrides by record signature (WEAP, ARMO, CELL, NPC_, etc.) and prints counts to the Messages panel. Useful for understanding a plugin\'s scope before patching.',
    category: 'Analysis',
    difficulty: 'intermediate',
    icon: Layers,
    estimatedTime: '1-3 min',
    requiresPlugin: true,
  },
  {
    id: 'export-cells',
    name: 'Export Cell Data',
    description: 'Export all CELL records touched by this plugin to a CSV',
    detail: 'Iterates CELL records and writes EditorID, FormID, grid coords, and worldspace to a CSV file. Use this to identify which exterior cells need precombine regeneration before a CK rebuild.',
    category: 'Analysis',
    difficulty: 'intermediate',
    icon: Database,
    estimatedTime: '1-2 min',
    requiresPlugin: true,
  },
  // ── ESL / FormID ─────────────────────────────────────────────────────────────
  {
    id: 'compact-esl',
    name: 'Compact FormIDs for ESL Flag',
    description: 'Reassigns all new FormIDs to the 0x000–0x7FF ESL-safe range',
    detail: 'ESL plugins can only define FormIDs in 0x000–0x7FF (2048 slots). Run this BEFORE flagging as ESL and BEFORE distributing. Never compact after a save-game has referenced this plugin — it will break those saves.',
    category: 'ESL',
    difficulty: 'intermediate',
    icon: Hash,
    estimatedTime: '< 1 min',
    requiresPlugin: true,
  },
  {
    id: 'formid-range-check',
    name: 'FormID Range Check (ESL Eligibility)',
    description: 'Verifies whether all new FormIDs already fit in the ESL-safe range',
    detail: 'Scans all records added by this plugin and reports whether their FormIDs are already within 0x000–0x7FF. If they are, you can flag the plugin as ESL without compacting. If not, compact first.',
    category: 'ESL',
    difficulty: 'beginner',
    icon: Hash,
    estimatedTime: '< 1 min',
    requiresPlugin: true,
  },
  {
    id: 'record-count',
    name: 'Record Count by Type',
    description: 'Counts how many records of each type the plugin defines or overrides',
    detail: 'Prints a breakdown of record signatures and counts to the Messages panel. Helps you decide whether a plugin is a candidate for ESL conversion (≤2048 new records in the ESL range).',
    category: 'ESL',
    difficulty: 'beginner',
    icon: List,
    estimatedTime: '< 1 min',
    requiresPlugin: true,
  },
  // ── Quest / SEQ ──────────────────────────────────────────────────────────────
  {
    id: 'generate-seq',
    name: 'Generate SEQ File (Quest Fixer)',
    description: 'Creates the SEQ sequence file required for quests to start on save load',
    detail: 'Any quest with the Start Game Enabled flag must have a matching .seq file in <mod>/SEQ/. Without it, the quest never starts when loading an existing save. Run via xEdit script or use the CK\'s Game → Create SEQ File menu.',
    category: 'Quest',
    difficulty: 'beginner',
    icon: Zap,
    estimatedTime: '< 1 min',
    requiresPlugin: true,
  },
  // ── Utility ──────────────────────────────────────────────────────────────────
  {
    id: 'export-formids',
    name: 'Export FormIDs',
    description: 'Exports all FormIDs defined or overridden by this plugin to a text file',
    detail: 'Useful for documentation, cross-referencing with Papyrus scripts, or auditing before compacting for ESL. Output includes EditorID, signature, and hex FormID for every record.',
    category: 'Utility',
    difficulty: 'intermediate',
    icon: FileText,
    estimatedTime: '1-3 min',
    requiresPlugin: true,
  },
  {
    id: 'master-list',
    name: 'Audit Master List',
    description: 'Lists all masters declared by this plugin and checks they are present in the load order',
    detail: 'Iterates the MAST records in the plugin\'s file header and checks each against the currently loaded files. Missing masters are flagged — they will cause a CTD on game startup.',
    category: 'Utility',
    difficulty: 'beginner',
    icon: ShieldCheck,
    estimatedTime: '< 1 min',
    requiresPlugin: true,
  },
  {
    id: 'batch-rename',
    name: 'Batch Rename Records',
    description: 'Rename multiple records at once using pattern matching on EditorID',
    detail: 'Prompts for a search string and replacement string and renames all matching EditorIDs. Only affects the plugin you loaded. Useful for housekeeping before distributing a mod.',
    category: 'Utility',
    difficulty: 'intermediate',
    icon: Wrench,
    estimatedTime: '< 1 min',
    requiresPlugin: true,
  },
  // ── Conversion ───────────────────────────────────────────────────────────────
  {
    id: 'esm-to-esp',
    name: 'Convert ESM → ESP',
    description: 'Clears the ESM file header flag, converting a master to a standard plugin',
    detail: 'Useful when you want to edit a master file as an active file in the CK. The CK treats ESMs differently from ESPs — removing the flag lets you save changes directly. Re-flag as ESM before distributing if required.',
    category: 'Conversion',
    difficulty: 'intermediate',
    icon: Code,
    estimatedTime: '< 1 min',
    requiresPlugin: true,
  },
  {
    id: 'esp-to-esm',
    name: 'Convert ESP → ESM',
    description: 'Sets the ESM file header flag, converting a plugin to a master file',
    detail: 'Required when other plugins need to declare this file as a master. Masters must load before dependents — set the ESM flag and move the file to the top of the load order.',
    category: 'Conversion',
    difficulty: 'intermediate',
    icon: Code,
    estimatedTime: '< 1 min',
    requiresPlugin: true,
  },
  {
    id: 'esp-to-esl',
    name: 'Flag as ESL (Light Plugin)',
    description: 'Sets the ESL flag in the file header — compact FormIDs first',
    detail: 'Sets the 0x0200 bit in TES4 header flags. ALWAYS run Compact FormIDs for ESL first. Once flagged and distributed, never remove the flag or change FormIDs — it will break saves.',
    category: 'Conversion',
    difficulty: 'intermediate',
    icon: Code,
    estimatedTime: '< 1 min',
    requiresPlugin: true,
  },
  // ── Advanced ─────────────────────────────────────────────────────────────────
  {
    id: 'merge-plugins',
    name: 'Merge Plugins',
    description: 'Combines multiple plugins into one to save load order slots',
    detail: 'Advanced operation. Copies all records from selected source plugins into a new merged ESP, renumbers FormIDs to avoid collisions, and adds all sources as masters. Requires a clean save before swapping. Use zMerge or Merge Plugins Standalone for complex merges.',
    category: 'Advanced',
    difficulty: 'advanced',
    icon: Archive,
    estimatedTime: '10-30 min',
    requiresPlugin: false,
  },
];

const STORAGE_KEY_SKILL = 'xedit_skill_level';

export const XEditTools: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scripts' | 'settings'>('scripts');
  const [isConnected, setIsConnected] = useState(false);
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY_SKILL);
    return (saved === 'beginner' || saved === 'intermediate' || saved === 'advanced') ? saved : 'intermediate';
  });
  const [xEditPath, setXEditPath] = useState('');
  const [fo4DataPath, setFo4DataPath] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState('');
  const [selectedScript, setSelectedScript] = useState<XEditScript | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [message, setMessage] = useState('');
  const [availablePlugins, setAvailablePlugins] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const api = (window as any).electron?.api || (window as any).electronAPI;

  // Persist skill level
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_SKILL, skillLevel);
  }, [skillLevel]);

  // Check xEdit running via Neural Link
  useEffect(() => {
    const checkXEdit = () => {
      try {
        const activeTools = localStorage.getItem('mossy_active_tools');
        if (activeTools) {
          const data = JSON.parse(activeTools);
          const xEditRunning = data.tools?.some((t: any) =>
            t.name.toLowerCase().includes('fo4edit') ||
            t.name.toLowerCase().includes('xedit')
          );
          setIsConnected(xEditRunning);
        }
      } catch { /* non-critical */ }
    };
    checkXEdit();
    const iv = setInterval(checkXEdit, 5000);
    return () => clearInterval(iv);
  }, []);

  // Load saved settings
  useEffect(() => {
    const load = async () => {
      try {
        const s = await (window as any).electronAPI?.getSettings?.();
        const xp = String(s?.xeditPath || '').trim();
        const dp = String(s?.fo4DataPath || '').trim();
        if (xp) setXEditPath(xp);
        if (dp) setFo4DataPath(dp);
      } catch { /* ignore */ }
    };
    void load();

    // Load plugin list from bridge
    const loadPlugins = async () => {
      try {
        if (api?.xEditScriptExecutor?.getPluginList) {
          const plugins = await api.xEditScriptExecutor.getPluginList();
          if (Array.isArray(plugins)) setAvailablePlugins(plugins);
        }
      } catch { /* ignore */ }
    };
    void loadPlugins();
  }, []);

  const browseForXEdit = async () => {
    try {
      if (api?.xEditScriptExecutor?.browseXEdit) {
        const path = await api.xEditScriptExecutor.browseXEdit();
        if (path) {
          setXEditPath(path);
          await api.xEditScriptExecutor.saveXEditPath?.(path);
          await (window as any).electronAPI?.setSettings?.({ xeditPath: path });
          setMessage('xEdit path updated.');
        }
      } else if (api?.pickFile) {
        const path = await api.pickFile({ filters: [{ name: 'Executable', extensions: ['exe'] }] });
        if (path) { setXEditPath(path); setMessage('xEdit path set.'); }
      }
    } catch (e: any) {
      setMessage('Failed to browse for xEdit: ' + (e?.message || e));
    }
  };

  const saveSettings = async () => {
    try {
      await (window as any).electronAPI?.setSettings?.({ xeditPath: xEditPath, fo4DataPath: fo4DataPath });
      await api?.xEditScriptExecutor?.saveXEditPath?.(xEditPath);
      setMessage('Settings saved.');
    } catch {
      setMessage('Failed to save settings.');
    }
  };

  const browseForPlugin = async () => {
    try {
      const path = await (api?.xEditScriptExecutor?.browsePlugin?.() || api?.pickEspFile?.());
      if (path) setSelectedPlugin(path);
    } catch { /* ignore */ }
  };

  const executeScript = async () => {
    if (!selectedScript) { setMessage('Select a script first.'); return; }
    if (selectedScript.requiresPlugin && !selectedPlugin) { setMessage('Select a target plugin first.'); return; }
    if (!xEditPath) { setMessage('Configure xEdit path in the Settings tab first.'); return; }

    setIsExecuting(true);
    setProgress(0);
    setProgressText('Initializing...');
    setExecutionResult(null);

    try {
      let unsub: (() => void) | undefined;
      if (api?.xEditScriptExecutor?.onProgress) {
        unsub = api.xEditScriptExecutor.onProgress((d: { progress: number; text: string }) => {
          setProgress(d.progress);
          setProgressText(d.text);
        });
      } else {
        const iv = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 500);
        unsub = () => clearInterval(iv);
      }

      if (api?.xEditScriptExecutor?.runToolAction) {
        const result = await api.xEditScriptExecutor.runToolAction({ scriptId: selectedScript.id, pluginPath: selectedPlugin, xEditPath });
        unsub?.();
        setProgress(100);
        setProgressText('Complete');
        setExecutionResult(result);
        LocalAIEngine.recordAction('xedit_script_execution', {
          scriptId: selectedScript.id,
          scriptName: selectedScript.name,
          plugin: selectedPlugin,
          success: result.success,
          duration: result.duration,
        }).catch(() => {});
        setMessage(result.success
          ? `Script executed successfully in ${result.duration}s`
          : `Script failed: ${result.errors.join(', ')}`
        );
      } else {
        unsub?.();
        setProgress(0);
        setProgressText('');
        setExecutionResult({
          success: false,
          output: '',
          errors: ['xEdit IPC not available. Make sure xEdit is configured and the Desktop Bridge is running.'],
          warnings: [],
          duration: 0,
        });
        setMessage('xEdit IPC not available — configure xEdit path in Settings.');
      }
    } catch (e: any) {
      setMessage(`Execution failed: ${e?.message || e}`);
      setExecutionResult({ success: false, output: '', errors: [e?.message || 'Unknown error'], warnings: [], duration: 0 });
    } finally {
      setIsExecuting(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(XEDIT_SCRIPTS.map(s => s.category)))];

  const filteredScripts = XEDIT_SCRIPTS.filter(script => {
    const matchesCat = filterCategory === 'all' || script.category === filterCategory;
    const matchesSearch = !searchQuery ||
      script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill =
      skillLevel === 'advanced' ||
      (skillLevel === 'intermediate' && script.difficulty !== 'advanced') ||
      (skillLevel === 'beginner' && script.difficulty === 'beginner');
    return matchesCat && matchesSearch && matchesSkill;
  });

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 p-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <Database className="w-7 h-7" /> xEdit Tools
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">Execute xEdit/FO4Edit scripts and manage plugins</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
              isConnected ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-800 text-slate-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? 'xEdit Connected' : 'xEdit Not Running'}
            </div>
          </div>
          <div className="flex gap-2">
            {(['scripts', 'settings'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  activeTab === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}>
                {t === 'scripts' ? <><Code className="w-4 h-4 inline mr-1.5" />Scripts</> : <><Settings className="w-4 h-4 inline mr-1.5" />Settings</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-5">
          {message && (
            <div className="mb-4 p-3 rounded-lg border bg-blue-900/20 border-blue-700 text-blue-300 text-sm">{message}</div>
          )}

          {/* Scripts Tab */}
          {activeTab === 'scripts' && (
            <div className="space-y-5">
              {/* Skill Level */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <label className="block text-sm font-bold text-emerald-300 mb-2">Skill Level</label>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                    <button key={level} onClick={() => setSkillLevel(level)}
                      className={`px-4 py-2 rounded text-sm font-bold capitalize ${
                        skillLevel === level ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}>
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {skillLevel === 'beginner' && 'Showing safe, well-documented scripts only.'}
                  {skillLevel === 'intermediate' && 'Showing beginner + intermediate scripts.'}
                  {skillLevel === 'advanced' && 'Showing all scripts including advanced operations.'}
                </p>
              </div>

              {/* Target Plugin */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <label className="block text-sm font-bold text-emerald-300 mb-2">Target Plugin</label>
                <div className="flex gap-2">
                  <select value={selectedPlugin} onChange={e => setSelectedPlugin(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300">
                    <option value="">Select a plugin...</option>
                    {availablePlugins.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button onClick={browseForPlugin}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold">
                    Browse
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" placeholder="Search scripts..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300" />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300">
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                  ))}
                </select>
              </div>

              {/* Scripts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredScripts.map(script => {
                  const Icon = script.icon;
                  const isSelected = selectedScript?.id === script.id;
                  return (
                    <button key={script.id} onClick={() => setSelectedScript(script)}
                      className={`text-left p-4 rounded-lg border transition-all ${
                        isSelected ? 'bg-emerald-900/30 border-emerald-600' : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                      }`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm mb-1 leading-tight">{script.name}</h3>
                          <p className="text-xs text-slate-400 mb-2 leading-relaxed">{script.description}</p>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">{script.category}</span>
                            <span className={`px-1.5 py-0.5 rounded ${
                              script.difficulty === 'beginner' ? 'bg-emerald-900/30 text-emerald-400' :
                              script.difficulty === 'intermediate' ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-red-900/30 text-red-400'
                            }`}>{script.difficulty}</span>
                            <span className="text-slate-500">{script.estimatedTime}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredScripts.length === 0 && (
                  <div className="col-span-3 text-center py-8 text-slate-500 text-sm">
                    No scripts match the current filters.
                  </div>
                )}
              </div>

              {/* Selected Script Detail + Execute */}
              {selectedScript && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4">
                  {/* Detail */}
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4">
                    <div className="text-sm font-bold text-emerald-300 mb-1">{selectedScript.name}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedScript.detail}</p>
                  </div>

                  {/* Execute row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">
                        {selectedScript.requiresPlugin && !selectedPlugin && (
                          <span className="text-amber-400">Select a target plugin above to run this script.</span>
                        )}
                        {(!selectedScript.requiresPlugin || selectedPlugin) && xEditPath && (
                          <span className="text-emerald-300">Ready to execute via {xEditPath.split('\\').pop()}</span>
                        )}
                        {(!selectedScript.requiresPlugin || selectedPlugin) && !xEditPath && (
                          <span className="text-amber-400">Set xEdit path in Settings to enable execution.</span>
                        )}
                      </p>
                    </div>
                    <button onClick={executeScript}
                      disabled={isExecuting || (selectedScript.requiresPlugin && !selectedPlugin) || !xEditPath}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-bold flex items-center gap-2 text-sm">
                      {isExecuting ? <><Loader className="w-4 h-4 animate-spin" /> Executing...</> : <><Play className="w-4 h-4" /> Execute Script</>}
                    </button>
                  </div>

                  {/* Progress */}
                  {isExecuting && (
                    <div>
                      <div className="text-xs text-slate-300 mb-1.5">{progressText}</div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div className="bg-emerald-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {executionResult && (
                    <div className={`rounded-lg border p-4 ${
                      executionResult.success ? 'bg-emerald-900/20 border-emerald-700' : 'bg-red-900/20 border-red-700'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {executionResult.success
                          ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                          : <AlertCircle className="w-5 h-5 text-red-400" />}
                        <span className="font-bold text-sm">{executionResult.success ? 'Success' : 'Failed'}</span>
                      </div>
                      {executionResult.output && (
                        <pre className="text-xs bg-black/30 p-3 rounded overflow-x-auto mb-2 leading-relaxed">{executionResult.output}</pre>
                      )}
                      {executionResult.errors.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-bold text-red-400 mb-1">Errors:</div>
                          <ul className="text-xs text-red-300 list-disc list-inside space-y-0.5">
                            {executionResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        </div>
                      )}
                      {executionResult.warnings.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-bold text-yellow-400 mb-1">Warnings:</div>
                          <ul className="text-xs text-yellow-300 list-disc list-inside space-y-0.5">
                            {executionResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          const summary = `I just ran the xEdit script "${selectedScript?.name}" on plugin "${selectedPlugin}".\n\nResult: ${executionResult.success ? 'Success' : 'Failed'} (${executionResult.duration}s)\n${executionResult.output ? `Output:\n${executionResult.output}\n` : ''}${executionResult.errors.length > 0 ? `Errors:\n${executionResult.errors.join('\n')}\n` : ''}${executionResult.warnings.length > 0 ? `Warnings:\n${executionResult.warnings.join('\n')}` : ''}\n\nCan you help me understand these results?`;
                          navigate('/chat', { state: { prefill: summary } });
                        }}
                        className="mt-2 w-full py-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 rounded text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        Ask Mossy about this result
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <label className="block text-sm font-bold text-emerald-300 mb-2">xEdit / FO4Edit Path</label>
                <div className="flex gap-2">
                  <input type="text" value={xEditPath} onChange={e => setXEditPath(e.target.value)}
                    placeholder="C:\Tools\xEdit\FO4Edit.exe"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 font-mono" />
                  <button onClick={browseForXEdit}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded font-bold text-sm">Browse</button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Path to FO4Edit.exe (or xEdit.exe, SSEEdit.exe for other games)</p>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <label className="block text-sm font-bold text-emerald-300 mb-2">FO4 Data Directory</label>
                <div className="flex gap-2">
                  <input type="text" value={fo4DataPath} onChange={e => setFo4DataPath(e.target.value)}
                    placeholder="C:\Program Files (x86)\Steam\steamapps\common\Fallout4\Data"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 font-mono" />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Used for plugin discovery and SEQ file generation</p>
              </div>

              <button onClick={saveSettings}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-sm">
                Save Settings
              </button>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <h3 className="font-bold text-white mb-3 text-sm">Quick Links</h3>
                <div className="space-y-2">
                  <a href="https://www.nexusmods.com/fallout4/mods/2737" target="_blank" rel="noopener noreferrer"
                    className="block p-3 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors">
                    <span className="font-bold text-white">Download FO4Edit</span>
                    <span className="block text-xs text-slate-500 mt-0.5">by ElminsterAU — Nexus Mods (Fallout 4)</span>
                  </a>
                  <a href="https://tes5edit.github.io/" target="_blank" rel="noopener noreferrer"
                    className="block p-3 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors">
                    <span className="font-bold text-white">xEdit Documentation</span>
                    <span className="block text-xs text-slate-500 mt-0.5">Official wiki: cleaning, scripting, and record editing guides</span>
                  </a>
                  <a href="https://github.com/matortheeternal/smash" target="_blank" rel="noopener noreferrer"
                    className="block p-3 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors">
                    <span className="font-bold text-white">Merge Plugins Standalone</span>
                    <span className="block text-xs text-slate-500 mt-0.5">Automated plugin merging tool (complex merges)</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default XEditTools;
