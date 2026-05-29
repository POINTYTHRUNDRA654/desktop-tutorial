/**
 * Crash Log Analyzer — FO4 Asset Analysis Hub
 *
 * Parses Buffout 4 / Buffout 4 NG / CLASSIC-style crash logs.
 * Identifies probable culprits: FormIDs, plugins, script stack frames,
 * engine modules, and provides actionable fix recommendations.
 */

import React, { useState, useCallback } from 'react';
import {
  AlertTriangle, FolderOpen, RefreshCw, ChevronRight,
  CheckCircle, FileText, Cpu, HardDrive, Copy, Info,
  Zap, Search,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrashEntry {
  formId?: string;
  plugin?: string;
  address?: string;
  module?: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  fix: string;
}

interface ParsedCrashLog {
  version: string;
  gameVersion: string;
  crashTime: string;
  exception: string;
  callstack: string[];
  plugins: string[];
  formIdHits: Array<{ formId: string; plugin: string; editorId?: string }>;
  probableCauses: CrashEntry[];
  systemInfo: { os: string; cpu: string; gpu: string; ram: string };
  rawLog: string;
}

// ─── Pattern Definitions ──────────────────────────────────────────────────────

const KNOWN_CRASH_PATTERNS: Array<{
  pattern: RegExp;
  description: string;
  severity: CrashEntry['severity'];
  fix: string;
  module?: string;
}> = [
  {
    pattern: /Papyrus.*overload|PAPYRUS.*stack/i,
    description: 'Papyrus VM overload — scripts are stacking faster than they can execute',
    severity: 'high',
    fix: 'Identify polling scripts running faster than 500ms. Use event-driven design. Run Fallrim Tools to remove orphan scripts from your save.',
  },
  {
    pattern: /NiMemoryManager|out of memory|memory allocation/i,
    description: 'Memory allocation failure — VRAM or RAM exhausted',
    severity: 'critical',
    fix: 'Install X-Cell (Nexus #84214) for memory management. Reduce texture resolution of installed mods. Limit to one ENB at a time.',
  },
  {
    pattern: /BSFaceGenNiNode|FaceGen|face gen/i,
    description: 'FaceGen NiNode crash — corrupted or missing NPC face geometry',
    severity: 'high',
    fix: 'Run "Build Morphs" in BodySlide for all installed mods with face geometry. Install High FPS Physics Fix or X-Cell which patch this crash vector.',
  },
  {
    pattern: /precombined|PreCombined|pre-combined/i,
    description: 'Precombine mesh crash — a mod broke precombines in this cell',
    severity: 'high',
    fix: 'Identify which mod edits this exterior cell and regenerate precombines, or use PRP (Previs Repair Pack) to restore vanilla precombine data.',
  },
  {
    pattern: /NiRefObject.*DeleteThis|dangling ref|null ref/i,
    description: 'Dangling/null reference — deleted placed reference still being accessed',
    severity: 'critical',
    fix: 'Use xEdit "Undelete and Disable References" to fix UDRs in your load order. Run LOOT to sort load order.',
  },
  {
    pattern: /ScrapHeap|scrap heap|Bethesda\.net.*crash/i,
    description: 'ScrapHeap overflow — engine ran out of short-term memory pool',
    severity: 'high',
    fix: 'Install Buffout 4 NG or X-Cell — both patch the ScrapHeap allocator. Reduce active scripts in your load order.',
  },
  {
    pattern: /AnimationGraph|hkbBehaviorGraph|Havok/i,
    description: 'Havok animation graph crash — incompatible or corrupted behaviour file',
    severity: 'high',
    fix: 'Ensure only one animation framework (AAF, Kinky Crafting, etc.) is active. Validate HKX files with HKXPack. Check for animation mod conflicts.',
  },
  {
    pattern: /EXCEPTION_ACCESS_VIOLATION/i,
    description: 'Access Violation — reading/writing an invalid memory address',
    severity: 'critical',
    fix: 'This is the most common FO4 crash. Install Buffout 4 NG (Nexus #47359) + X-Cell (Nexus #84214) as a baseline. Then check FormID hits below for the specific record involved.',
  },
  {
    pattern: /EXCEPTION_STACK_OVERFLOW/i,
    description: 'Stack overflow — infinite recursion in a script or native call chain',
    severity: 'critical',
    fix: 'Examine the Papyrus log for recursive function calls. Check leveled list depth — stacks of > 5 nested lists can trigger this.',
  },
  {
    pattern: /BSResource.*Archive|ba2|bsa.*not found/i,
    description: 'BA2/BSA archive load failure — missing or corrupt archive',
    severity: 'high',
    fix: 'Verify mod files are intact. Ensure BA2s are registered in Fallout4.ini under [Archive] sResourceArchive2List. Re-download the offending mod.',
  },
  {
    pattern: /LOD.*mesh|TES4LOD|lodgen/i,
    description: 'LOD mesh crash — corrupted or incompatible LOD data',
    severity: 'medium',
    fix: 'Regenerate LOD with xLODGen + DynDOLOD. Ensure you ran them in order: xLODGen terrain → TexGen → DynDOLOD.',
  },
  {
    pattern: /CombinedObject|combined mesh/i,
    description: 'Combined (precombined) mesh crash — corrupted precombine record',
    severity: 'high',
    fix: 'A mod is editing statics inside a precombined zone. Regenerate precombines for the cell, or use PRP to restore.',
  },
  {
    pattern: /NavMesh|findCover|pathfind/i,
    description: 'NavMesh pathfinding crash — invalid navigation mesh in active cell',
    severity: 'medium',
    fix: 'Use CK NavMesh tools to identify disjoint islands in the affected cell. Ensure navmesh is finalized before packaging the mod.',
  },
];

const FORMID_REGEX = /\b(0[xX][0-9A-Fa-f]{8}|FF[0-9A-Fa-f]{6})\b/g;
const PLUGIN_LINE_REGEX = /\[(FE:)?[0-9A-Fa-f]{1,6}\]\s+(.+\.(esp|esm|esl))/gi;
const BUFFOUT_EXCEPTION_REGEX = /Unhandled exception ".+?" at .+\n(.+)/;
const GAME_VER_REGEX = /Fallout4(?:\.exe)?\s+([\d.]+)/i;
const BUFFOUT_VER_REGEX = /Buffout\s*4(?:\s+NG)?\s+v?([\d.]+)/i;
const TIMESTAMP_REGEX = /(\d{4}[-/]\d{2}[-/]\d{2}[\sT]\d{2}:\d{2}:\d{2})/;

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseCrashLog(raw: string): ParsedCrashLog {
  const lines = raw.split(/\r?\n/);

  // Version / game version
  const gameVerMatch = raw.match(GAME_VER_REGEX);
  const buffoutVerMatch = raw.match(BUFFOUT_VER_REGEX);
  const timestampMatch = raw.match(TIMESTAMP_REGEX);

  // Exception
  const exceptionLine = lines.find(l => l.includes('Unhandled exception') || l.includes('EXCEPTION_'));
  const exception = exceptionLine?.trim() ?? 'Unknown exception';

  // Call stack
  const callstackStart = lines.findIndex(l => /CALL STACK|callstack|backtrace/i.test(l));
  const callstackEnd   = callstackStart >= 0
    ? lines.findIndex((l, i) => i > callstackStart && /^(PROBABLE CAUSE|PLUGINS|MODULES|$)/i.test(l))
    : -1;
  const callstack = callstackStart >= 0
    ? lines.slice(callstackStart + 1, callstackEnd > 0 ? callstackEnd : callstackStart + 40)
        .filter(l => l.trim())
    : [];

  // Plugins section
  const pluginStart = lines.findIndex(l => /^PLUGINS:/i.test(l.trim()));
  const pluginEnd   = pluginStart >= 0
    ? lines.findIndex((l, i) => i > pluginStart && /^[A-Z]/.test(l) && !/^\s+/.test(l))
    : -1;
  const pluginLines = pluginStart >= 0
    ? lines.slice(pluginStart + 1, pluginEnd > 0 ? pluginEnd : pluginStart + 300)
    : [];

  const plugins: string[] = [];
  for (const line of pluginLines) {
    const m = line.match(/\[(?:FE:)?[0-9A-Fa-f]+\]\s+(.+)/);
    if (m) plugins.push(m[1].trim());
  }

  // FormID extraction
  const formIdMatches = [...raw.matchAll(FORMID_REGEX)];
  const uniqueFormIds = [...new Set(formIdMatches.map(m => m[0].toUpperCase()))];
  const formIdHits = uniqueFormIds.slice(0, 20).map(id => ({
    formId: id,
    plugin: guessPluginFromFormId(id, plugins),
  }));

  // System info
  const osLine  = lines.find(l => /OS:/i.test(l));
  const cpuLine = lines.find(l => /CPU:|Processor:/i.test(l));
  const gpuLine = lines.find(l => /GPU:|Graphics:/i.test(l));
  const ramLine = lines.find(l => /RAM:|Memory:/i.test(l));

  // Pattern matching for probable causes
  const probableCauses: CrashEntry[] = [];
  for (const p of KNOWN_CRASH_PATTERNS) {
    if (p.pattern.test(raw)) {
      probableCauses.push({
        description: p.description,
        severity: p.severity,
        fix: p.fix,
        module: p.module,
      });
    }
  }
  // Always include generic access violation if nothing else matched
  if (probableCauses.length === 0) {
    probableCauses.push({
      description: 'Unclassified crash — no matching pattern found in log',
      severity: 'medium',
      fix: 'Install Buffout 4 NG (Nexus #47359) if not already present — it provides detailed crash logs. Run CLASSIC (Nexus #56255) to auto-scan the log. Check FormID hits below for involved records.',
    });
  }

  return {
    version:     buffoutVerMatch?.[1] ?? 'Unknown',
    gameVersion: gameVerMatch?.[1] ?? 'Unknown',
    crashTime:   timestampMatch?.[1] ?? 'Unknown',
    exception,
    callstack,
    plugins,
    formIdHits,
    probableCauses,
    systemInfo: {
      os:  osLine?.split(/:\s*/)[1]?.trim()  ?? 'Unknown',
      cpu: cpuLine?.split(/:\s*/)[1]?.trim() ?? 'Unknown',
      gpu: gpuLine?.split(/:\s*/)[1]?.trim() ?? 'Unknown',
      ram: ramLine?.split(/:\s*/)[1]?.trim() ?? 'Unknown',
    },
    rawLog: raw,
  };
}

function guessPluginFromFormId(formId: string, plugins: string[]): string {
  const hex = formId.replace(/^0X/, '').replace(/^0x/, '');
  if (hex.length < 2) return 'Unknown';
  // The first two hex digits = load order index
  const modIdx = parseInt(hex.slice(0, 2), 16);
  if (modIdx < plugins.length) return plugins[modIdx];
  // FE:xxx range = ESL space
  if (formId.startsWith('FF') || formId.startsWith('0XFF')) return 'Temporary/Dynamic form';
  return 'Unknown plugin';
}

// ─── Severity badge ───────────────────────────────────────────────────────────

const SevBadge: React.FC<{ sev: CrashEntry['severity'] }> = ({ sev }) => {
  const map: Record<CrashEntry['severity'], string> = {
    critical: 'bg-red-900/40 border-red-500/40 text-red-300',
    high:     'bg-orange-900/40 border-orange-500/40 text-orange-300',
    medium:   'bg-amber-900/40 border-amber-500/40 text-amber-300',
    low:      'bg-slate-800 border-slate-700 text-slate-400',
  };
  return (
    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[sev]}`}>
      {sev}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const CrashLogAnalyzer: React.FC = () => {
  const [parsed, setParsed]     = useState<ParsedCrashLog | null>(null);
  const [rawText, setRawText]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'causes' | 'formids' | 'plugins' | 'stack' | 'system'>('causes');
  const [filter, setFilter]     = useState('');
  const [copied, setCopied]     = useState(false);

  const api = () => (window as any).electronAPI;

  const analyzeText = useCallback((text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    // Run synchronously — parser is fast even on 10 k-line logs
    try {
      const result = parseCrashLog(text);
      setParsed(result);
      setActiveSection('causes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFile = useCallback(async () => {
    try {
      const res = await api()?.ckPickLogFile?.();
      if (!res?.content) return;
      setRawText(res.content);
      analyzeText(res.content);
    } catch {
      // If that API isn't available, fall back to file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.log,.txt,.crash';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const text = (ev.target?.result as string) ?? '';
          setRawText(text);
          analyzeText(text);
        };
        reader.readAsText(file);
      };
      input.click();
    }
  }, [analyzeText]);

  const copyReport = useCallback(() => {
    if (!parsed) return;
    const lines = [
      `FO4 Crash Log Analysis — ${parsed.crashTime}`,
      `Game: ${parsed.gameVersion}  Buffout: ${parsed.version}`,
      '',
      '=== PROBABLE CAUSES ===',
      ...parsed.probableCauses.map(c => `[${c.severity.toUpperCase()}] ${c.description}\n  Fix: ${c.fix}`),
      '',
      '=== FORMID HITS ===',
      ...parsed.formIdHits.map(f => `${f.formId} — ${f.plugin}`),
      '',
      '=== PLUGINS ===',
      ...parsed.plugins.map((p, i) => `[${i.toString(16).toUpperCase().padStart(2, '0')}] ${p}`),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [parsed]);

  const SECTIONS: { id: typeof activeSection; label: string; count?: number }[] = [
    { id: 'causes',  label: 'Probable Causes', count: parsed?.probableCauses.length },
    { id: 'formids', label: 'FormID Hits',      count: parsed?.formIdHits.length },
    { id: 'plugins', label: 'Plugins',           count: parsed?.plugins.length },
    { id: 'stack',   label: 'Call Stack',        count: parsed?.callstack.length },
    { id: 'system',  label: 'System Info' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-red-500/20 bg-slate-900/60 p-4">
        <h2 className="text-base font-black text-white mb-0.5 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Crash Log Analyzer
        </h2>
        <p className="text-[11px] text-slate-400">
          Parses Buffout 4 / Buffout 4 NG crash logs. Identifies probable culprits via FormIDs,
          call-stack patterns, plugin mapping, and 13 known crash signatures. For generation of crash
          logs, install <span className="text-emerald-400 font-semibold">Buffout 4 NG</span> (Nexus #47359)
          and optionally <span className="text-emerald-400 font-semibold">CLASSIC</span> (Nexus #56255).
        </p>
      </div>

      {/* Load controls */}
      <div className="flex gap-2">
        <button
          onClick={loadFile}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-red-500/40 hover:text-red-300 transition-all disabled:opacity-40"
        >
          <FolderOpen className="w-3.5 h-3.5" /> Load crash log
        </button>
        {parsed && (
          <button
            onClick={copyReport}
            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:text-blue-300 transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy Report'}
          </button>
        )}
      </div>

      {/* Paste area */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
          Or paste crash log here
        </label>
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder="Paste the contents of your crash log (.log file from Documents\My Games\Fallout4\F4SE\)…"
          rows={5}
          className="w-full text-[11px] font-mono bg-slate-900 border border-slate-700 text-slate-300 rounded-lg p-3 resize-y placeholder-slate-600 focus:border-red-500/40 focus:outline-none"
        />
        <button
          onClick={() => analyzeText(rawText)}
          disabled={isLoading || !rawText.trim()}
          className="mt-2 flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-black rounded-lg bg-red-700/80 hover:bg-red-600 text-white transition-all disabled:opacity-40"
        >
          {isLoading
            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analysing…</>
            : <><Zap className="w-3.5 h-3.5" /> Analyse</>}
        </button>
      </div>

      {/* Results */}
      {parsed && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Game',     value: parsed.gameVersion },
                { label: 'Buffout',  value: `v${parsed.version}` },
                { label: 'Plugins',  value: parsed.plugins.length },
                { label: 'FormIDs',  value: parsed.formIdHits.length },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-base font-black text-white">{s.value}</div>
                  <div className="text-[10px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-slate-900/60 border border-slate-700 p-2 font-mono text-[10px] text-amber-300 break-all">
              {parsed.exception}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex flex-wrap gap-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  activeSection === s.id
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {s.label}
                {s.count != null && (
                  <span className={`text-[10px] px-1 rounded font-black ${activeSection === s.id ? 'text-red-400' : 'text-slate-600'}`}>
                    {s.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Probable Causes */}
          {activeSection === 'causes' && (
            <div className="space-y-3">
              {parsed.probableCauses.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-300 text-sm py-6 justify-center">
                  <CheckCircle className="w-5 h-5" /> No known crash patterns matched.
                </div>
              ) : parsed.probableCauses.map((c, i) => (
                <div key={i} className={`rounded-xl border p-4 ${
                  c.severity === 'critical' ? 'border-red-500/40 bg-red-950/20' :
                  c.severity === 'high'     ? 'border-orange-500/40 bg-orange-950/20' :
                  'border-amber-500/40 bg-amber-950/20'
                }`}>
                  <div className="flex items-start gap-2 mb-2">
                    <SevBadge sev={c.severity} />
                    <p className="text-[12px] font-bold text-white">{c.description}</p>
                  </div>
                  <div className="flex gap-1.5 text-[11px] text-slate-300">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><span className="font-semibold text-emerald-400">Fix: </span>{c.fix}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FormID Hits */}
          {activeSection === 'formids' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">
                FormIDs extracted from the crash log, mapped to their likely owning plugin based on load order index.
                Cross-reference these with xEdit to identify the exact records involved.
              </p>
              {parsed.formIdHits.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No FormIDs found in this log.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-500 uppercase">FormID</th>
                        <th className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-500 uppercase">Probable Plugin</th>
                        <th className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-500 uppercase">xEdit Search</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.formIdHits.map((h, i) => (
                        <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/20">
                          <td className="py-1.5 px-2 font-mono font-bold text-blue-300">{h.formId}</td>
                          <td className="py-1.5 px-2 text-slate-300">{h.plugin}</td>
                          <td className="py-1.5 px-2 text-slate-500 text-[10px]">
                            Filter: <span className="font-mono text-emerald-400">{h.formId}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Plugins */}
          {activeSection === 'plugins' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input
                  type="text"
                  placeholder="Filter plugins…"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-600"
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-0.5">
                {parsed.plugins
                  .filter(p => !filter || p.toLowerCase().includes(filter.toLowerCase()))
                  .map((plugin, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] py-0.5 px-1">
                    <span className="font-mono text-slate-600 w-6 text-right shrink-0">
                      {i.toString(16).toUpperCase().padStart(2, '0')}
                    </span>
                    <span className={`${
                      plugin.endsWith('.esm') ? 'text-emerald-400' :
                      plugin.endsWith('.esl') ? 'text-blue-400' : 'text-slate-300'
                    }`}>{plugin}</span>
                  </div>
                ))}
                {parsed.plugins.length === 0 && (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No plugin list found in log. Ensure Buffout 4 NG is installed.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Call Stack */}
          {activeSection === 'stack' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">
                Raw call stack from the crash log. Each frame shows the instruction pointer and
                (if symbols are present) the function name.
              </p>
              <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 max-h-96 overflow-y-auto">
                {parsed.callstack.length === 0 ? (
                  <p className="text-xs text-slate-500">No call stack in log.</p>
                ) : parsed.callstack.map((line, i) => (
                  <div key={i} className="font-mono text-[10px] text-slate-400 py-0.5 hover:text-slate-200 transition-colors">
                    <span className="text-slate-700 mr-2">{String(i).padStart(3, '0')}</span>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Info */}
          {activeSection === 'system' && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" /> System Information
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'OS',  value: parsed.systemInfo.os },
                  { label: 'CPU', value: parsed.systemInfo.cpu },
                  { label: 'GPU', value: parsed.systemInfo.gpu },
                  { label: 'RAM', value: parsed.systemInfo.ram },
                ].map(s => (
                  <div key={s.label} className="flex gap-3 text-[11px]">
                    <span className="text-slate-500 w-10 shrink-0 font-bold uppercase">{s.label}</span>
                    <span className="text-slate-300">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-blue-900/10 border border-blue-500/20 p-3">
                <p className="text-[11px] text-blue-300 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  System info availability depends on your Buffout 4 NG config.
                  Enable <span className="font-mono mx-0.5">GameInfo = true</span> in <span className="font-mono">config.toml</span> for full hardware details.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!parsed && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <FileText className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-sm font-semibold text-slate-500">Load or paste a crash log to analyse it</p>
          <p className="text-xs mt-1 max-w-sm text-center text-slate-600">
            Crash logs are generated by Buffout 4 NG and saved to:
            <br />
            <span className="font-mono text-slate-500 text-[10px]">
              Documents\My Games\Fallout4\F4SE\crash-*.log
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default CrashLogAnalyzer;
