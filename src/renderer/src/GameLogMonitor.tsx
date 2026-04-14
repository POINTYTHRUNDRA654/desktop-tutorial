import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, FileText,
  Play, Square, TrendingUp, X, Download, Bug, Brain,
  ChevronRight, Zap, RefreshCw
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type LogLevel = 'info' | 'warning' | 'error' | 'crash';
type LogCategory =
  | 'script' | 'navmesh' | 'memory' | 'precombine'
  | 'animation' | 'missing' | 'dll' | 'master' | 'general';
type TabId = 'papyrus' | 'game' | 'buffout';
type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
type FilterLevel = 'all' | 'warning' | 'error' | 'crash';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  mod?: string;
  scriptName?: string;
  category: LogCategory;
  fixHint?: string;
  raw: string;
}

interface CrashPrediction {
  risk: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  recommendation: string;
}

interface BuffoutDiagnosis {
  crashType: string;
  rootCause: string;
  affectedComponent: string;
  recommendations: string[];
  preventable: boolean;
  stackTrace?: string[];
}

interface Stats {
  total: number;
  warnings: number;
  errors: number;
  crashes: number;
}

// ─── Pattern Engine ───────────────────────────────────────────────────────────

interface PatternRule {
  regex: RegExp;
  level: LogLevel;
  category: LogCategory;
  fixHint: string;
}

const PAPYRUS_PATTERNS: PatternRule[] = [
  {
    regex: /cannot call .+ on a none object/i,
    level: 'error',
    category: 'script',
    fixHint:
      'A script property is unbound (None). Open the Quest or reference in CK, go to Properties, and fill every empty slot. Verify the form exists in your load order.',
  },
  {
    regex: /\[None\]\./,
    level: 'error',
    category: 'script',
    fixHint:
      'Calling a method on an unbound reference. Add a None-check (If akTarget == None) before the method call, or ensure the alias/variable is initialised in OnInit.',
  },
  {
    regex: /property .+? on script .+? is not the right type/i,
    level: 'error',
    category: 'script',
    fixHint:
      'A script property points to a record of the wrong type (e.g., an ACHR filled into an Actor property). Correct the binding in CK Properties.',
  },
  {
    regex: /cannot bind script .+? because its script .+? does not exist/i,
    level: 'error',
    category: 'script',
    fixHint:
      'Missing .pex compiled script file. Reinstall the mod or recompile the Papyrus source. Ensure Data\\Scripts\\ contains the .pex.',
  },
  {
    regex: /failed to find property .+? on script/i,
    level: 'error',
    category: 'script',
    fixHint:
      'The script has a property that no longer exists in the compiled .pex. Recompile, or the mod was updated and old save data has stale references.',
  },
  {
    regex: /stack dump|dumping stacks|stack overflow/i,
    level: 'error',
    category: 'script',
    fixHint:
      'Papyrus stack overflow — usually infinite recursion or a tight event loop. Check RegisterForUpdate calls; use OnActivate/OnHit rather than polling loops.',
  },
  {
    regex: /vm is frozen/i,
    level: 'warning',
    category: 'script',
    fixHint:
      'The VM froze (script queue saturated). Reduce RegisterForUpdate frequency, split work over multiple frames, or disable scripts from mods you are not actively using.',
  },
  {
    regex: /vm is thawing/i,
    level: 'info',
    category: 'script',
    fixHint:
      'VM resumed after freeze. Repeated freeze/thaw cycles indicate chronic script overload — profile which mods are flooding the queue.',
  },
  {
    regex: /a script is performing an operation that may cause/i,
    level: 'warning',
    category: 'script',
    fixHint:
      'Expensive operation detected (large array iteration or GetNthRef loops). Optimise the script or split work across RegisterForSingleUpdate callbacks.',
  },
  {
    regex: /error: unable to link types associated with function/i,
    level: 'error',
    category: 'script',
    fixHint:
      'Type-linking failure at runtime. The script was compiled against a different version of a dependency. Recompile all dependent scripts.',
  },
  {
    regex: /navm|navmesh/i,
    level: 'error',
    category: 'navmesh',
    fixHint:
      'Navmesh error. Load the plugin in xEdit 4.0.3+, find [D] NAVM records, and remap them with "Change FormID". Deleted navmesh records are a leading CTD cause.',
  },
  {
    regex: /out of memory|memory allocation failed|std::bad_alloc/i,
    level: 'crash',
    category: 'memory',
    fixHint:
      'Memory exhaustion. Install Addictol (Nexus #84214) — the all-in-one stability tool for OG/NG/1.11.x. Do NOT also install Buffout 4 or X-Cell alongside it.',
  },
  {
    regex: /failed to allocate/i,
    level: 'error',
    category: 'memory',
    fixHint:
      'Memory allocation failure. Update or install Addictol (#84214) — do NOT also install Buffout 4 or X-Cell.',
  },
  {
    regex: /precombine|previs/i,
    level: 'warning',
    category: 'precombine',
    fixHint:
      'Precombine/Previs conflict. Install Previs Repair Pack (PRP, Nexus #69798) or rebuild previs for the affected cell.',
  },
  {
    regex: /failed to find animation graph|animation graph/i,
    level: 'error',
    category: 'animation',
    fixHint:
      "Animation graph missing or incompatible. Verify skeleton NIF and behavior graph files (hkx). Run FNIS or Nemesis after installing animation mods.",
  },
  {
    regex: /cannot open store for class|failed to open store/i,
    level: 'error',
    category: 'missing',
    fixHint:
      'Asset file (NIF, DDS, etc.) is missing. Reinstall the mod and verify Data folder contents.',
  },
  {
    regex: /failed to load plugin|master file .+? not found|missing master/i,
    level: 'crash',
    category: 'master',
    fixHint:
      'Required master ESP/ESM is missing or disabled. Check load order in MO2/Vortex and ensure all masters are installed and active.',
  },
  {
    regex: /dll.+?failed|failed.+?dll|cannot load.+?dll/i,
    level: 'error',
    category: 'dll',
    fixHint:
      'DLL plugin failed to load. Ensure F4SE version matches the game executable. Install Address Library AiO (Nexus #47327) and check all DLL requirements.',
  },
];

const GAME_PATTERNS: PatternRule[] = [
  {
    regex: /out of memory|memory allocation/i,
    level: 'crash',
    category: 'memory',
    fixHint:
      'Memory exhaustion. Install Addictol (Nexus #84214) — the all-in-one stability tool for OG/NG/1.11.x. Do NOT also install Buffout 4 or X-Cell.',
  },
  {
    regex: /master file not found|missing master/i,
    level: 'crash',
    category: 'master',
    fixHint:
      'Missing master ESP/ESM. Check load order — a mod requires a master that is not installed or enabled.',
  },
  {
    regex: /navmesh|navm/i,
    level: 'error',
    category: 'navmesh',
    fixHint:
      'Navmesh error. Deleted navmesh records in plugins cause CTDs. Use xEdit to remap or undelete them.',
  },
  {
    regex: /precombine|previs/i,
    level: 'warning',
    category: 'precombine',
    fixHint:
      'Precombine conflict. Install Previs Repair Pack (PRP) or rebuild previsibines for affected cells.',
  },
  {
    regex: /failed to load|cannot load|file not found/i,
    level: 'error',
    category: 'missing',
    fixHint:
      'Asset or file missing. Reinstall the mod and verify all required files are in the Data folder.',
  },
  {
    regex: /script.+?error|error.+?script/i,
    level: 'error',
    category: 'script',
    fixHint:
      'Script error in game log. Open the Papyrus Log tab for detailed information.',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_LOG_ENTRIES = 2000;
const MAX_VISIBLE_AFFECTED_MODS = 12;
const MAX_STACK_FRAMES_FOR_AI = 10;

const LEVEL_ORDER: Record<LogLevel, number> = { info: 0, warning: 1, error: 2, crash: 3 };

const CATEGORY_COLORS: Record<LogCategory, string> = {
  script: 'text-purple-400',
  navmesh: 'text-orange-400',
  memory: 'text-red-500',
  precombine: 'text-yellow-500',
  animation: 'text-blue-400',
  missing: 'text-pink-400',
  dll: 'text-amber-400',
  master: 'text-red-400',
  general: 'text-slate-400',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'text-slate-300',
  warning: 'text-yellow-400',
  error: 'text-orange-400',
  crash: 'text-red-500',
};

const PAPYRUS_PATH_HINT = 'Documents\\My Games\\Fallout4\\Logs\\Script\\Papyrus.0.log';
const GAME_PATH_HINT = 'Documents\\My Games\\Fallout4\\Fallout4.log';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _entryCounter = 0;

function extractMod(line: string): string | undefined {
  const m = line.match(/\[([A-Za-z0-9_\- .]+\.es[mpl])\]/i);
  return m ? m[1] : undefined;
}

function extractScript(line: string): string | undefined {
  const m =
    line.match(/\[([A-Za-z0-9_:]+)\]\s*->/i) ||
    line.match(/script\s+([A-Za-z0-9_:]+)/i);
  return m ? m[1] : undefined;
}

function enrichLine(raw: string, patterns: PatternRule[]): Partial<LogEntry> {
  for (const p of patterns) {
    if (p.regex.test(raw)) {
      return { level: p.level, category: p.category, fixHint: p.fixHint };
    }
  }
  const lower = raw.toLowerCase();
  if (lower.includes('error') || lower.includes('failed'))
    return { level: 'error', category: 'general' };
  if (lower.includes('warning') || lower.includes('warn'))
    return { level: 'warning', category: 'general' };
  if (lower.includes('crash')) return { level: 'crash', category: 'general' };
  return { level: 'info', category: 'general' };
}

function buildEntry(rawLine: string, tab: TabId): LogEntry {
  const id = `e-${_entryCounter++}`;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const patterns = tab === 'papyrus' ? PAPYRUS_PATTERNS : GAME_PATTERNS;
  const enriched = enrichLine(rawLine, patterns);
  return {
    id,
    timestamp,
    level: enriched.level ?? 'info',
    message: rawLine.length > 200 ? rawLine.slice(0, 200) + '…' : rawLine,
    mod: extractMod(rawLine),
    scriptName: extractScript(rawLine),
    category: enriched.category ?? 'general',
    fixHint: enriched.fixHint,
    raw: rawLine,
  };
}

function computeCrashPrediction(entries: LogEntry[]): CrashPrediction | null {
  const recent = entries.slice(-100);
  const indicators: string[] = [];
  let risk: CrashPrediction['risk'] = 'low';

  const crashes = recent.filter(e => e.level === 'crash').length;
  const errors = recent.filter(e => e.level === 'error').length;
  const warnings = recent.filter(e => e.level === 'warning').length;
  const memErrors = recent.filter(e => e.category === 'memory').length;
  const navErrors = recent.filter(e => e.category === 'navmesh').length;
  const masterErrors = recent.filter(e => e.category === 'master').length;
  const vmFrozen = recent.some(e => /vm is frozen/i.test(e.raw));
  const stackDump = recent.some(e => /stack dump|stack overflow/i.test(e.raw));
  const vmTerminated = recent.some(e =>
    /vm.*terminated|script.*terminated/i.test(e.raw)
  );

  if (crashes > 0 || masterErrors > 0 || vmTerminated) {
    risk = 'critical';
    if (crashes > 0)
      indicators.push(`${crashes} crash-level event${crashes > 1 ? 's' : ''} detected`);
    if (masterErrors > 0) indicators.push('Missing master file — game may not start');
    if (vmTerminated) indicators.push('Script VM terminated — save and restart immediately');
  } else if (errors > 10 || memErrors > 2 || navErrors > 1 || stackDump) {
    risk = 'high';
    if (errors > 10) indicators.push(`${errors} errors in last 100 entries`);
    if (memErrors > 2) indicators.push(`${memErrors} memory errors — install Addictol #84214`);
    if (navErrors > 1) indicators.push(`${navErrors} navmesh errors — CTD risk`);
    if (stackDump) indicators.push('Script stack overflow detected');
  } else if (errors > 3 || warnings > 20 || vmFrozen) {
    risk = 'medium';
    if (errors > 3) indicators.push(`${errors} errors detected`);
    if (warnings > 20) indicators.push(`${warnings} warnings in last 100 entries`);
    if (vmFrozen) indicators.push('Papyrus VM froze — script overload');
  } else if (warnings > 5) {
    risk = 'low';
  }

  if (indicators.length === 0 && risk === 'low') return null;

  const recommendations: Record<CrashPrediction['risk'], string> = {
    low: 'System is stable. Monitor closely.',
    medium: 'Elevated risk. Save your game and monitor script load.',
    high: 'High risk — save soon. Check Papyrus log for error details.',
    critical: 'SAVE IMMEDIATELY. Crash is likely imminent.',
  };

  return { risk, indicators, recommendation: recommendations[risk] };
}

// ─── AI helper ────────────────────────────────────────────────────────────────

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MOSSY_SYSTEM =
  'You are Mossy, an expert Fallout 4 modding assistant specialised in debugging Papyrus scripts, crash logs, and plugin conflicts. Give concise, actionable advice in 2-3 sentences.';

async function askMossy(prompt: string): Promise<string> {
  const api = (window as any).electron?.api ?? (window as any).electronAPI;
  if (!api?.aiChatGroq) return 'AI assistant not configured.';
  const res = await api.aiChatGroq(prompt, MOSSY_SYSTEM, GROQ_MODEL);
  if (res?.success && res?.content) return String(res.content);
  return String(res?.error ?? 'AI request failed.');
}

// ─── Small reusable bits ──────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: CrashPrediction['risk'] }) {
  const styles: Record<CrashPrediction['risk'], string> = {
    low: 'bg-green-900/40 text-green-400 border-green-700',
    medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-700',
    high: 'bg-orange-900/40 text-orange-400 border-orange-700',
    critical: 'bg-red-900/40 text-red-400 border-red-600 animate-pulse',
  };
  const labels: Record<CrashPrediction['risk'], string> = {
    low: '🟢 LOW',
    medium: '🟡 MEDIUM',
    high: '🟠 HIGH',
    critical: '🔴 CRITICAL',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-bold ${styles[risk]}`}>
      {labels[risk]}
    </span>
  );
}

function CategoryBadge({ category }: { category: LogCategory }) {
  return (
    <span
      className={`text-xs font-mono px-1.5 py-0.5 rounded bg-slate-700/50 ${CATEGORY_COLORS[category]}`}
    >
      {category}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GameLogMonitor() {
  const [activeTab, setActiveTab] = useState<TabId>('papyrus');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [logPath, setLogPath] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, warnings: 0, errors: 0, crashes: 0 });
  const [crashPrediction, setCrashPrediction] = useState<CrashPrediction | null>(null);
  const [message, setMessage] = useState('');

  // Filters
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMod, setFilterMod] = useState('');
  const [searchText, setSearchText] = useState('');

  // Entry detail / AI
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [entryAdvice, setEntryAdvice] = useState('');
  const [isLoadingEntryAdvice, setIsLoadingEntryAdvice] = useState(false);

  // Buffout crash analysis
  const [buffoutPath, setBuffoutPath] = useState('');
  const [buffoutDiagnosis, setBuffoutDiagnosis] = useState<BuffoutDiagnosis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [crashAdvice, setCrashAdvice] = useState('');
  const [isLoadingCrashAdvice, setIsLoadingCrashAdvice] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const cleanupListenerRef = useRef<(() => void) | null>(null);
  // Keep a ref so the monitoring callback always reads the latest tab
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // Restore last log path on mount
  useEffect(() => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    api?.gameLogMonitor?.getLastLogPath?.()
      .then((p: string | null) => { if (p) setLogPath(p); })
      .catch(() => { });
  }, []);

  // Auto-scroll log stream
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logEntries.length]);

  // Cleanup listener on unmount
  useEffect(() => () => { cleanupListenerRef.current?.(); }, []);

  // Derived: affected mods list
  const affectedMods = useMemo(() => {
    const mods = new Set<string>();
    logEntries.forEach(e => { if (e.mod) mods.add(e.mod); });
    return Array.from(mods);
  }, [logEntries]);

  // Derived: filtered entries
  const filteredEntries = useMemo(() => {
    return logEntries.filter(e => {
      if (filterLevel !== 'all' && LEVEL_ORDER[e.level] < LEVEL_ORDER[filterLevel as LogLevel])
        return false;
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterMod && (!e.mod || !e.mod.toLowerCase().includes(filterMod.toLowerCase())))
        return false;
      if (searchText && !e.raw.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [logEntries, filterLevel, filterCategory, filterMod, searchText]);

  // Add a new log entry
  const addEntry = useCallback((rawLine: string, tab: TabId) => {
    if (!rawLine.trim()) return;
    const entry = buildEntry(rawLine, tab);
    setLogEntries(prev => {
      const next = [...prev, entry].slice(-MAX_LOG_ENTRIES);
      setCrashPrediction(computeCrashPrediction(next));
      return next;
    });
    setStats(prev => ({
      total: prev.total + 1,
      warnings: prev.warnings + (entry.level === 'warning' ? 1 : 0),
      errors: prev.errors + (entry.level === 'error' ? 1 : 0),
      crashes: prev.crashes + (entry.level === 'crash' ? 1 : 0),
    }));
  }, []);

  // Browse for log file
  const browseLog = useCallback(async () => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    const result = await api?.gameLogMonitor?.browseLogFile?.().catch(() => null);
    if (result) {
      setLogPath(result);
      await api?.gameLogMonitor?.saveLastLogPath?.(result).catch(() => { });
    }
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (!logPath) { setMessage('Please select a log file first'); return; }
    try {
      const ok = await api?.gameLogMonitor?.startMonitoring?.(logPath);
      if (!ok) { setMessage('Failed to start monitoring — check file path'); return; }
      setIsMonitoring(true);
      setMessage('Monitoring started');
      cleanupListenerRef.current?.();
      const cleanup = api?.gameLogMonitor?.onLogUpdate?.((raw: any) => {
        const line =
          typeof raw === 'string' ? raw : (raw?.message ?? raw?.raw ?? '');
        addEntry(line, activeTabRef.current);
      });
      cleanupListenerRef.current = cleanup ?? null;
    } catch {
      setMessage('Error starting monitor');
    }
  }, [logPath, addEntry]);

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    cleanupListenerRef.current?.();
    cleanupListenerRef.current = null;
    await api?.gameLogMonitor?.stopMonitoring?.().catch(() => { });
    setIsMonitoring(false);
    setMessage('Monitoring stopped');
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogEntries([]);
    setStats({ total: 0, warnings: 0, errors: 0, crashes: 0 });
    setCrashPrediction(null);
    setSelectedEntry(null);
    setEntryAdvice('');
    setMessage('Logs cleared');
  }, []);

  // Export logs
  const exportLogs = useCallback(async () => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    await api?.gameLogMonitor?.exportLogs?.(logEntries).catch(() => { });
    setMessage('Logs exported');
  }, [logEntries]);

  // Ask Mossy about a single log entry
  const askAboutEntry = useCallback(
    async (entry: LogEntry) => {
      setSelectedEntry(entry);
      setEntryAdvice('');
      setIsLoadingEntryAdvice(true);
      const safeRaw = entry.raw.slice(0, 500);
      const prompt = [
        `Fallout 4 ${activeTab === 'papyrus' ? 'Papyrus' : 'game'} log error:`,
        `Level: ${entry.level.toUpperCase()}`,
        `Category: ${entry.category}`,
        entry.mod ? `Mod: ${entry.mod}` : '',
        entry.scriptName ? `Script: ${entry.scriptName}` : '',
        `Message: ${safeRaw}`,
        entry.fixHint ? `Known fix hint: ${entry.fixHint}` : '',
        'Explain this error and how to fix it. Be specific and actionable.',
      ]
        .filter(Boolean)
        .join('\n');
      const advice = await askMossy(prompt).catch(e => `Error: ${e}`);
      setEntryAdvice(advice);
      setIsLoadingEntryAdvice(false);
    },
    [activeTab]
  );

  // Pick Buffout crash log file
  const pickBuffoutLog = useCallback(async () => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    const result = await api?.ckPickLogFile?.().catch(() => null);
    if (result?.success && result.path) {
      setBuffoutPath(result.path);
      setBuffoutDiagnosis(null);
      setCrashAdvice('');
    }
  }, []);

  // Analyze Buffout crash log
  const analyzeBuffout = useCallback(async () => {
    if (!buffoutPath) { setMessage('Select a Buffout crash log first'); return; }
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    setIsAnalyzing(true);
    setBuffoutDiagnosis(null);
    setCrashAdvice('');
    try {
      const res = await api?.ckAnalyzeCrash?.(buffoutPath);
      if (res?.success && res?.diagnosis) {
        setBuffoutDiagnosis(res.diagnosis as BuffoutDiagnosis);
      } else {
        setMessage(res?.error ?? 'Analysis failed');
      }
    } catch {
      setMessage('Analysis error');
    }
    setIsAnalyzing(false);
  }, [buffoutPath]);

  // Ask Mossy for full crash fix plan
  const askAboutCrash = useCallback(async () => {
    if (!buffoutDiagnosis) return;
    setIsLoadingCrashAdvice(true);
    const prompt = [
      'Crash log analysis for Fallout 4 (Addictol crash logger):',
      `Crash Type: ${buffoutDiagnosis.crashType}`,
      `Root Cause: ${buffoutDiagnosis.rootCause}`,
      `Affected Component: ${buffoutDiagnosis.affectedComponent}`,
      `Preventable: ${buffoutDiagnosis.preventable ? 'Yes' : 'Unknown'}`,
      `Recommendations: ${buffoutDiagnosis.recommendations.join('; ')}`,
      buffoutDiagnosis.stackTrace
        ? `Stack trace: ${buffoutDiagnosis.stackTrace.slice(0, MAX_STACK_FRAMES_FOR_AI).join(' | ')}`
        : '',
      'Give me a detailed step-by-step fix plan. Reference specific tools (xEdit, Addictol, CLASSIC scanner) as appropriate.',
    ]
      .filter(Boolean)
      .join('\n');
    const advice = await askMossy(prompt).catch(e => `Error: ${e}`);
    setCrashAdvice(advice);
    setIsLoadingCrashAdvice(false);
  }, [buffoutDiagnosis]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  const pathHint = activeTab === 'papyrus' ? PAPYRUS_PATH_HINT : GAME_PATH_HINT;

  const crashRiskBg: Record<string, string> = {
    low: 'bg-green-900/30 border-green-700',
    medium: 'bg-yellow-900/30 border-yellow-600',
    high: 'bg-orange-900/30 border-orange-600',
    critical: 'bg-red-900/30 border-red-600',
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-green-400" />
          <span className="font-bold text-green-400">Mod Debugger</span>
          {isMonitoring && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full border border-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex rounded overflow-hidden border border-slate-600">
          {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(s => (
            <button
              key={s}
              onClick={() => setSkillLevel(s)}
              aria-label={`Set skill level to ${s}`}
              className={`px-2 py-1 text-xs capitalize ${skillLevel === s
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700'
                }`}
            >
              {s === 'beginner' ? '🟢' : s === 'intermediate' ? '🟡' : '🔴'}{' '}
              {s.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-slate-800/50 border-b border-slate-700 flex-shrink-0">
        {(
          [
            { id: 'papyrus', label: '📜 Papyrus Log', desc: 'Script errors' },
            { id: 'game', label: '🎮 Game Log', desc: 'Engine events' },
            { id: 'buffout', label: '💥 Crash Analysis', desc: 'Addictol crash logs' },
          ] as { id: TabId; label: string; desc: string }[]
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setMessage('');
            }}
            className={`px-4 py-2 flex flex-col items-start transition-colors ${activeTab === tab.id
                ? 'bg-slate-700 text-white border-b-2 border-green-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
          >
            <span className="text-xs font-medium">{tab.label}</span>
            <span className="text-[10px] text-slate-500">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Status message */}
      {message && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-blue-900/30 border-b border-blue-700 flex-shrink-0 text-blue-300 text-xs">
          <span>{message}</span>
          <button onClick={() => setMessage('')}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Crash prediction banner */}
      {crashPrediction && activeTab !== 'buffout' && (
        <div
          className={`px-4 py-2 border-b flex items-start gap-3 flex-shrink-0 ${crashRiskBg[crashPrediction.risk]
            }`}
        >
          <AlertTriangle
            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${crashPrediction.risk === 'critical'
                ? 'text-red-400'
                : crashPrediction.risk === 'high'
                  ? 'text-orange-400'
                  : 'text-yellow-400'
              }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <RiskBadge risk={crashPrediction.risk} />
              <span className="text-white text-xs font-semibold">
                {crashPrediction.recommendation}
              </span>
            </div>
            {crashPrediction.indicators.length > 0 && (
              <ul className="mt-0.5 space-y-0.5">
                {crashPrediction.indicators.map((ind, i) => (
                  <li key={i} className="text-slate-300 text-[11px]">
                    • {ind}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar (papyrus / game tabs only) ── */}
        {activeTab !== 'buffout' && (
          <div className="w-44 flex-shrink-0 bg-slate-800/30 border-r border-slate-700 flex flex-col overflow-y-auto">

            {/* File picker + controls */}
            <div className="p-3 border-b border-slate-700 space-y-2">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Log File</div>
              <input
                type="text"
                value={logPath}
                onChange={e => setLogPath(e.target.value)}
                placeholder={pathHint}
                title={pathHint}
                className="w-full px-2 py-1 text-[11px] bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-green-500"
              />
              <button
                onClick={browseLog}
                className="w-full px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
              >
                Browse…
              </button>
              {!isMonitoring ? (
                <button
                  onClick={startMonitoring}
                  disabled={!logPath}
                  className="w-full px-2 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3" /> Start
                </button>
              ) : (
                <button
                  onClick={stopMonitoring}
                  className="w-full px-2 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded flex items-center justify-center gap-1"
                >
                  <Square className="w-3 h-3" /> Stop
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="p-3 border-b border-slate-700 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Stats</div>
              {[
                { label: 'Total', value: stats.total, color: 'text-slate-300' },
                { label: 'Warnings', value: stats.warnings, color: 'text-yellow-400' },
                { label: 'Errors', value: stats.errors, color: 'text-orange-400' },
                { label: 'Crashes', value: stats.crashes, color: 'text-red-400' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-[11px]">
                  <span className={row.color}>{row.label}</span>
                  <span className="text-white font-mono">{row.value}</span>
                </div>
              ))}
              {stats.total > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Err rate</span>
                  <span className="text-white font-mono">
                    {((stats.errors / stats.total) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-slate-700 space-y-2">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Filter</div>
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value as FilterLevel)}
                className="w-full px-1 py-1 text-[11px] bg-slate-700 text-white rounded border border-slate-600"
              >
                <option value="all">All levels</option>
                <option value="warning">Warn+</option>
                <option value="error">Error+</option>
                <option value="crash">Crash only</option>
              </select>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full px-1 py-1 text-[11px] bg-slate-700 text-white rounded border border-slate-600"
              >
                <option value="all">All categories</option>
                <option value="script">Script</option>
                <option value="navmesh">Navmesh</option>
                <option value="memory">Memory</option>
                <option value="precombine">Precombine</option>
                <option value="animation">Animation</option>
                <option value="missing">Missing file</option>
                <option value="dll">DLL</option>
                <option value="master">Master</option>
              </select>
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search…"
                className="w-full px-2 py-1 text-[11px] bg-slate-700 text-white rounded border border-slate-600"
              />
            </div>

            {/* Affected mods */}
            {affectedMods.length > 0 && (
              <div className="p-3 border-b border-slate-700">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                  Affected Mods ({affectedMods.length})
                </div>
                <div className="space-y-1">
                  {affectedMods.slice(0, MAX_VISIBLE_AFFECTED_MODS).map(mod => (
                    <button
                      key={mod}
                      onClick={() => setFilterMod(filterMod === mod ? '' : mod)}
                      className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate ${filterMod === mod
                          ? 'bg-green-800/50 text-green-300'
                          : 'text-slate-300 hover:bg-slate-700'
                        }`}
                      title={mod}
                    >
                      {mod}
                    </button>
                  ))}
                  {affectedMods.length > MAX_VISIBLE_AFFECTED_MODS && (
                    <div className="text-[10px] text-slate-500">
                      +{affectedMods.length - MAX_VISIBLE_AFFECTED_MODS} more…
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Export / Clear */}
            <div className="p-3 mt-auto border-t border-slate-700 space-y-1">
              <button
                onClick={exportLogs}
                disabled={logEntries.length === 0}
                className="w-full px-2 py-1 text-[11px] bg-slate-700 hover:bg-slate-600 text-white rounded disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" /> Export
              </button>
              <button
                onClick={clearLogs}
                disabled={logEntries.length === 0}
                className="w-full px-2 py-1 text-[11px] bg-slate-700 hover:bg-red-900/50 text-white rounded disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Log stream (papyrus / game) ── */}
        {activeTab !== 'buffout' && (
          <div className="flex flex-1 overflow-hidden">
            {/* Entry list */}
            <div className="flex-1 overflow-y-auto font-mono text-xs bg-slate-950">
              {filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 px-4">
                  <Activity className="w-8 h-8 mb-2 opacity-30" />
                  {logEntries.length === 0 ? (
                    <>
                      <p>No entries yet.</p>
                      <p className="mt-1 text-center">Select a log file and click Start.</p>
                      <div className="mt-4 text-[10px] text-slate-600 text-center max-w-xs">
                        <p className="font-semibold text-slate-500 mb-1">Common path:</p>
                        <p className="break-all">{pathHint}</p>
                      </div>
                    </>
                  ) : (
                    <p>No entries match current filters.</p>
                  )}
                </div>
              ) : (
                <div>
                  {filteredEntries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setSelectedEntry(selectedEntry?.id === entry.id ? null : entry);
                        setEntryAdvice('');
                      }}
                      className={`w-full text-left px-3 py-1.5 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${selectedEntry?.id === entry.id ? 'bg-slate-800' : ''
                        }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-slate-600 flex-shrink-0 w-14 text-[10px]">
                          [{entry.timestamp}]
                        </span>
                        <span
                          className={`flex-shrink-0 w-11 text-center font-bold uppercase text-[10px] ${LEVEL_COLORS[entry.level]
                            }`}
                        >
                          {entry.level}
                        </span>
                        <CategoryBadge category={entry.category} />
                        {entry.mod && (
                          <span className="text-blue-400 text-[10px] truncate max-w-[6rem]">
                            [{entry.mod}]
                          </span>
                        )}
                        {entry.scriptName && (
                          <span className="text-purple-300 text-[10px] truncate max-w-[6rem]">
                            {entry.scriptName}
                          </span>
                        )}
                        <span
                          className={`flex-1 truncate min-w-0 ${LEVEL_COLORS[entry.level]}`}
                        >
                          {entry.message}
                        </span>
                        {entry.fixHint && (
                          <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>

            {/* Entry detail panel */}
            {selectedEntry && (
              <div className="w-72 flex-shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                  <span className="text-xs font-bold text-white">Entry Detail</span>
                  <button
                    onClick={() => {
                      setSelectedEntry(null);
                      setEntryAdvice('');
                    }}
                  >
                    <X className="w-3 h-3 text-slate-400 hover:text-white" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <RiskBadge
                        risk={
                          selectedEntry.level === 'crash'
                            ? 'critical'
                            : selectedEntry.level === 'error'
                              ? 'high'
                              : selectedEntry.level === 'warning'
                                ? 'medium'
                                : 'low'
                        }
                      />
                      <CategoryBadge category={selectedEntry.category} />
                    </div>
                    {selectedEntry.mod && (
                      <div className="text-[11px] text-blue-400">
                        Mod: {selectedEntry.mod}
                      </div>
                    )}
                    {selectedEntry.scriptName && (
                      <div className="text-[11px] text-purple-300">
                        Script: {selectedEntry.scriptName}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500">{selectedEntry.timestamp}</div>
                  </div>

                  <div className="bg-slate-900 rounded p-2 text-[11px] text-slate-200 break-words font-mono">
                    {selectedEntry.raw}
                  </div>

                  {selectedEntry.fixHint && (
                    <div className="bg-amber-900/30 border border-amber-700 rounded p-2">
                      <div className="text-[10px] text-amber-400 font-bold mb-1">
                        💡 FIX HINT
                      </div>
                      <p className="text-[11px] text-amber-100">{selectedEntry.fixHint}</p>
                    </div>
                  )}

                  <button
                    onClick={() => askAboutEntry(selectedEntry)}
                    disabled={isLoadingEntryAdvice}
                    className="w-full px-3 py-2 bg-green-800/50 hover:bg-green-800 text-green-300 rounded border border-green-700 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    {isLoadingEntryAdvice ? 'Asking Mossy…' : 'Ask Mossy for Help'}
                  </button>

                  {entryAdvice && (
                    <div className="bg-slate-900/50 rounded p-2 border border-slate-600">
                      <div className="text-[10px] text-green-400 font-bold mb-1">
                        🌿 Mossy says:
                      </div>
                      <p className="text-[11px] text-slate-200 whitespace-pre-wrap">
                        {entryAdvice}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Buffout crash analysis tab ── */}
        {activeTab === 'buffout' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {skillLevel === 'beginner' && (
              <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-300">
                <p className="font-semibold text-white mb-1">What are crash logs?</p>
                <p>
                  Addictol (Nexus{' '}
                  <span className="text-green-400">#84214</span>) — the all-in-one stability tool — writes a detailed{' '}
                  <code className="text-yellow-300">.log</code> file every time Fallout 4
                  crashes. Files are saved to{' '}
                  <code className="text-yellow-300">
                    %LOCALAPPDATA%\Fallout4\F4SE\
                  </code>
                  . Load one here and Mossy will diagnose what went wrong.
                </p>
              </div>
            )}

            {/* File picker */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-red-400" />
                <span className="font-semibold text-white text-sm">
                  Crash Log (Addictol)
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={buffoutPath}
                  onChange={e => setBuffoutPath(e.target.value)}
                  placeholder="%LOCALAPPDATA%\Fallout4\F4SE\crash-XXXX.log"
                  aria-label="Crash log file path"
                  className="flex-1 px-3 py-2 text-xs bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={pickBuffoutLog}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
                >
                  Browse…
                </button>
                <button
                  onClick={analyzeBuffout}
                  disabled={!buffoutPath || isAnalyzing}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded text-xs flex items-center gap-1.5 disabled:opacity-40"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  {isAnalyzing ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>
              {skillLevel !== 'beginner' && (
                <p className="mt-2 text-[10px] text-slate-500">
                  Crash logs are at{' '}
                  <code className="text-slate-400">%LOCALAPPDATA%\Fallout4\F4SE\</code>{' '}
                  — written by Addictol (Nexus #84214); requires Address Library AiO (#47327)
                </p>
              )}
            </div>

            {/* Diagnosis result */}
            {buffoutDiagnosis && (
              <div className="space-y-4">
                {/* Crash type header */}
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-bold text-white text-sm capitalize">
                          {buffoutDiagnosis.crashType.replace(/_/g, ' ')} Crash
                        </span>
                        {buffoutDiagnosis.preventable && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-400 border border-green-700">
                            Preventable
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400">Root Cause:</span>
                          <p className="text-white mt-0.5">{buffoutDiagnosis.rootCause}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Affected Component:</span>
                          <p className="text-white mt-0.5">
                            {buffoutDiagnosis.affectedComponent}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Recommended Fixes
                  </h3>
                  <ol className="space-y-2">
                    {buffoutDiagnosis.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-green-400 font-mono font-bold flex-shrink-0">
                          {i + 1}.
                        </span>
                        <span className="text-slate-200">{rec}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Stack trace */}
                {buffoutDiagnosis.stackTrace &&
                  buffoutDiagnosis.stackTrace.length > 0 && (
                    <div className="bg-slate-800 rounded-lg p-4">
                      <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        Stack Trace ({buffoutDiagnosis.stackTrace.length} frames)
                      </h3>
                      <div className="bg-slate-900 rounded p-3 font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto space-y-0.5">
                        {buffoutDiagnosis.stackTrace.map((frame, i) => (
                          <div key={i}>
                            <span className="text-slate-600 mr-2">
                              {String(i).padStart(2, '0')}
                            </span>
                            {frame}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Ask Mossy */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <button
                    onClick={askAboutCrash}
                    disabled={isLoadingCrashAdvice}
                    className="w-full px-4 py-3 bg-green-800/50 hover:bg-green-800 text-green-300 rounded border border-green-700 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Brain className="w-4 h-4" />
                    {isLoadingCrashAdvice
                      ? 'Mossy is thinking…'
                      : 'Ask Mossy for a Full Fix Plan'}
                  </button>
                  {crashAdvice && (
                    <div className="mt-3 bg-slate-900/50 rounded p-3 border border-slate-600">
                      <div className="text-xs text-green-400 font-bold mb-2">
                        🌿 Mossy's Fix Plan:
                      </div>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">
                        {crashAdvice}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!buffoutDiagnosis && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Bug className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Select a crash log and click Analyze</p>
                <p className="text-xs mt-1 text-slate-600">
                  Requires Addictol (Nexus #84214) or Buffout 4 NG (legacy, #64880)
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
