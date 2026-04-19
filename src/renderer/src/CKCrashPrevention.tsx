import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, Activity, Play, Square, Brain, FolderOpen, GitBranch, ChevronDown, ChevronUp, CheckCircle, XCircle, RefreshCw, FileText } from 'lucide-react';

interface Props {
  onClose?: () => void;
}

// --- result shapes returned by the IPC handlers ---

interface ValidationIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  solution: string;
  affectedRecords?: string[];
}

interface ESPValidationResult {
  valid: boolean;
  crashRisk: number;
  memoryEstimateMB?: number;
  issues: ValidationIssue[];
  warnings: string[];
  recommendations: string[];
}

interface CrashDiagnosis {
  crashType: string;
  severity?: string;
  rootCause: string;
  likelyPlugin?: string;
  recommendations: string[];
  preventable: boolean;
  stackTrace?: string[];
  memoryAddress?: string;
  timestamp?: string;
}

// -------------------------------------------------------

const api = () => (window as any).electron?.api || (window as any).electronAPI;

const severityColor = (s: string) => {
  switch (s) {
    case 'critical': return 'text-red-400';
    case 'high': return 'text-orange-400';
    case 'medium': return 'text-yellow-400';
    default: return 'text-slate-400';
  }
};

const CKCrashPrevention: React.FC<Props> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'preflight' | 'monitoring' | 'postcrash'>('preflight');
  const [selectedPlugin, setSelectedPlugin] = useState<string>('');
  const [spriggitOpen, setSpriggitOpen] = useState(false);
  const [spriggitCliPath, setSpriggitCliPath] = useState('');
  const [spriggitDataPath, setSpriggitDataPath] = useState('');

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ESPValidationResult | null>(null);
  const [validationError, setValidationError] = useState('');

  // Spriggit state
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState('');
  const [convertError, setConvertError] = useState('');

  // Live monitor state
  const [monitoring, setMonitoring] = useState(false);
  const [ckProcesses, setCkProcesses] = useState<any[]>([]);
  const [monitorError, setMonitorError] = useState('');
  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Post-crash state
  const [selectedLogPath, setSelectedLogPath] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [crashDiagnosis, setCrashDiagnosis] = useState<CrashDiagnosis | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // Stop monitor on unmount
  useEffect(() => {
    return () => {
      if (monitorRef.current) {
        clearInterval(monitorRef.current);
        monitorRef.current = null;
      }
      setMonitoring(false);
    };
  }, []);

  // ── File pickers ──────────────────────────────────────

  const pickPlugin = async () => {
    const a = api();
    if (!a?.ckPickPlugin) { toast.error('File picker not available'); return; }
    try {
      const result = await a.ckPickPlugin();
      if (result?.success && result.path) setSelectedPlugin(result.path);
    } catch (e) { console.error('File picker error:', e); }
  };

  const pickSpriggitCli = async () => {
    const a = api();
    if (!a?.ckPickPlugin) { toast.error('File picker not available'); return; }
    try {
      const result = await a.ckPickPlugin();
      if (result?.success && result.path) setSpriggitCliPath(result.path);
    } catch (e) { console.error('File picker error:', e); }
  };

  const pickSpriggitDataFolder = async () => {
    const a = api();
    if (!a?.pickDirectory) { toast.error('Folder picker not available'); return; }
    try {
      const result = await a.pickDirectory('Select Fallout 4 Data Folder');
      if (result) setSpriggitDataPath(result);
    } catch (e) { console.error('Folder picker error:', e); }
  };

  // ── Validate plugin ───────────────────────────────────

  const runValidation = async (pluginPath?: string) => {
    const path = (pluginPath ?? selectedPlugin).trim();
    if (!path) { toast('Select a plugin first.', { icon: '📁' }); return; }
    const a = api();
    if (!a?.ckCrashValidate) { toast.error('Validation API not available'); return; }

    setActiveTab('preflight');
    setValidating(true);
    setValidationResult(null);
    setValidationError('');
    try {
      const result = await a.ckCrashValidate(path);
      if (!result) throw new Error('No result returned');
      setValidationResult(result as ESPValidationResult);
      const risk = result.crashRisk ?? 0;
      if (risk > 60) toast.error(`High crash risk detected: ${risk}%`);
      else if (risk > 30) toast(`Moderate crash risk: ${risk}%`, { icon: '⚠️' });
      else toast.success('Plugin validated — low crash risk');
    } catch (e: any) {
      const msg = String(e?.message || e);
      setValidationError(msg);
      toast.error(`Validation failed: ${msg}`);
    } finally {
      setValidating(false);
    }
  };

  // ── Spriggit Convert & Digest ─────────────────────────

  const runConvert = async () => {
    if (!spriggitCliPath.trim()) { toast('Set Spriggit.CLI.exe path first.', { icon: '📁' }); return; }
    if (!spriggitDataPath.trim()) { toast('Set Fallout 4 Data Folder first.', { icon: '📁' }); return; }
    const a = api();
    if (!a?.spriggitSerialize) { toast.error('Spriggit API not available'); return; }

    setConverting(true);
    setConvertMsg('');
    setConvertError('');
    try {
      const result = await a.spriggitSerialize({ spriggitPath: spriggitCliPath, dataPath: spriggitDataPath });
      if (result?.ok === false) {
        setConvertError(result.error || 'Serialization failed');
        toast.error(result.error || 'Serialization failed');
      } else {
        const count = result?.files?.length ?? 0;
        setConvertMsg(`Converted ${count} file(s) successfully.`);
        toast.success(`Spriggit: ${count} file(s) converted`);
      }
    } catch (e: any) {
      const msg = String(e?.message || e);
      setConvertError(msg);
      toast.error(`Convert failed: ${msg}`);
    } finally {
      setConverting(false);
    }
  };

  // ── Live Monitor ──────────────────────────────────────

  const pollCKProcesses = async () => {
    const a = api();
    if (!a?.getRunningProcesses) return;
    try {
      const procs: any[] = await a.getRunningProcesses();
      const ck = (procs || []).filter((p: any) => {
        const name = String(p?.name || p?.processName || '').toLowerCase();
        return name.includes('creationkit') || name.includes('ck.exe');
      });
      setCkProcesses(ck);
    } catch (e) { /* silent poll failure */ }
  };

  const startMonitoring = async () => {
    if (monitoring) return; // already running
    const a = api();
    if (!a?.getRunningProcesses) { toast.error('Process monitor API not available'); return; }
    setActiveTab('monitoring');
    setMonitorError('');
    setMonitoring(true);
    await pollCKProcesses();
    monitorRef.current = setInterval(pollCKProcesses, 3000);
    toast.success('Live monitor started — polling every 3 s');
  };

  const stopMonitoring = () => {
    if (monitorRef.current) { clearInterval(monitorRef.current); monitorRef.current = null; }
    setMonitoring(false);
    toast('Monitor stopped.', { icon: '⏹️' });
  };

  // ── Crash log analysis ────────────────────────────────

  const pickAndAnalyzeLog = async () => {
    const a = api();
    if (!a?.ckPickLogFile) { toast.error('Log file picker not available'); return; }
    setActiveTab('postcrash');
    setAnalysisError('');
    setCrashDiagnosis(null);
    try {
      const picked = await a.ckPickLogFile();
      if (!picked?.success || !picked.path) return;
      setSelectedLogPath(picked.path);
      await analyzeLog(picked.path);
    } catch (e: any) { toast.error(String(e?.message || e)); }
  };

  const analyzeLog = async (logPath: string) => {
    const a = api();
    if (!a?.ckCrashAnalyze) { toast.error('Crash analysis API not available'); return; }
    setAnalyzing(true);
    setAnalysisError('');
    setCrashDiagnosis(null);
    try {
      const result = await a.ckCrashAnalyze(logPath);
      if (!result) throw new Error('No diagnosis returned');
      setCrashDiagnosis(result as CrashDiagnosis);
      toast.success(`Diagnosis: ${result.crashType || 'unknown'}`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setAnalysisError(msg);
      toast.error(`Analysis failed: ${msg}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-mossy-darker text-mossy-text">
      {/* Header */}
      <div className="border-b border-mossy-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-mossy-accent" />
            <div>
              <h1 className="text-xl font-bold">Creation Kit Crash Prevention</h1>
              <p className="text-sm text-mossy-text-muted">Validate plugins and monitor CK stability</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded p-2 transition-colors hover:bg-mossy-border" title="Close">
              <Square className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-mossy-border p-4">
        <div className="flex gap-2">
          {(['preflight', 'monitoring', 'postcrash'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded border px-4 py-2 transition-colors ${activeTab === tab
                ? 'border-mossy-accent bg-mossy-accent/10 text-white'
                : 'border-mossy-border text-mossy-text-muted hover:text-mossy-text'}`}
            >
              {tab === 'preflight' && 'Pre-flight Checks'}
              {tab === 'monitoring' && 'Live Monitor'}
              {tab === 'postcrash' && 'Post-Crash Analysis'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ── Pre-flight Checks ── */}
        {activeTab === 'preflight' && (
          <div className="space-y-4">
            {/* Plugin picker */}
            <div className="space-y-3 rounded border border-mossy-border bg-mossy-bg p-4">
              <h2 className="font-semibold text-white">Select Plugin to Validate</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedPlugin}
                  onChange={(e) => setSelectedPlugin(e.target.value)}
                  placeholder="Plugin path (drag & drop or paste)..."
                  className="flex-1 rounded border border-mossy-border bg-mossy-darker px-3 py-2 text-mossy-text placeholder-mossy-text-muted focus:outline-none focus:ring-2 focus:ring-mossy-accent"
                />
                <button
                  onClick={pickPlugin}
                  className="rounded border border-mossy-border bg-mossy-accent px-3 py-2 text-black font-semibold hover:bg-mossy-accent-hover transition-colors flex items-center gap-1"
                >
                  <FolderOpen className="w-4 h-4" /> Load
                </button>
              </div>
              <button
                onClick={() => runValidation()}
                disabled={validating}
                className="w-full rounded bg-emerald-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {validating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Validating…</> : <><Shield className="w-4 h-4" /> Validate Plugin</>}
              </button>

              {/* Validation results */}
              {validationError && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded px-3 py-2">
                  ❌ {validationError}
                </div>
              )}
              {validationResult && (
                <div className="space-y-3">
                  {/* Risk header */}
                  <div className={`flex items-center justify-between rounded border px-3 py-2 ${validationResult.crashRisk > 60 ? 'border-red-700/60 bg-red-900/20' : validationResult.crashRisk > 30 ? 'border-yellow-700/60 bg-yellow-900/20' : 'border-emerald-700/60 bg-emerald-900/20'}`}>
                    <span className="font-semibold text-white">
                      {validationResult.valid ? '✅ Plugin OK' : '⚠️ Issues found'}
                    </span>
                    <span className={`text-sm font-bold ${validationResult.crashRisk > 60 ? 'text-red-400' : validationResult.crashRisk > 30 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      Crash risk: {validationResult.crashRisk ?? 0}%
                    </span>
                  </div>

                  {/* Issues */}
                  {validationResult.issues?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-300">Issues ({validationResult.issues.length})</div>
                      {validationResult.issues.map((issue, i) => (
                        <div key={i} className="rounded border border-mossy-border bg-mossy-darker px-3 py-2 text-xs">
                          <div className={`font-semibold ${severityColor(issue.severity)}`}>[{issue.severity}] {issue.message}</div>
                          <div className="text-slate-400 mt-1">💡 {issue.solution}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  {validationResult.recommendations?.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-300">Recommendations</div>
                      {validationResult.recommendations.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300">{r}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Spriggit section */}
            <div className="rounded border border-mossy-border bg-mossy-bg">
              <button
                onClick={() => setSpriggitOpen(!spriggitOpen)}
                className="w-full border-b border-mossy-border px-4 py-3 text-left transition-colors hover:bg-mossy-darker"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GitBranch className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-emerald-300">Spriggit Vanilla ESM Digest</div>
                      <div className="text-xs text-mossy-text-muted">Convert ESMs to Knowledge Vault</div>
                    </div>
                  </div>
                  {spriggitOpen ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
                </div>
              </button>

              {spriggitOpen && (
                <div className="space-y-3 border-t border-mossy-border p-4">
                  <p className="text-xs text-mossy-text-muted">Convert vanilla ESMs to YAML using Spriggit.CLI.exe</p>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-mossy-text-muted">Spriggit.CLI.exe</label>
                      <div className="flex gap-2">
                        <input type="text" value={spriggitCliPath} onChange={(e) => setSpriggitCliPath(e.target.value)}
                          placeholder="Paste path or use Load button..."
                          className="flex-1 rounded border border-mossy-border bg-mossy-darker px-2 py-1.5 text-xs text-mossy-text placeholder-mossy-text-muted focus:outline-none focus:ring-2 focus:ring-mossy-accent" />
                        <button onClick={pickSpriggitCli}
                          className="rounded border border-mossy-border bg-mossy-accent px-2 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-mossy-accent-hover flex items-center gap-1">
                          <FolderOpen className="h-3.5 w-3.5" /> Load
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-mossy-text-muted">Fallout 4 Data Folder</label>
                      <div className="flex gap-2">
                        <input type="text" value={spriggitDataPath} onChange={(e) => setSpriggitDataPath(e.target.value)}
                          placeholder="Paste path or use Load button..."
                          className="flex-1 rounded border border-mossy-border bg-mossy-darker px-2 py-1.5 text-xs text-mossy-text placeholder-mossy-text-muted focus:outline-none focus:ring-2 focus:ring-mossy-accent" />
                        <button onClick={pickSpriggitDataFolder}
                          className="rounded border border-mossy-border bg-mossy-accent px-2 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-mossy-accent-hover flex items-center gap-1">
                          <FolderOpen className="h-3.5 w-3.5" /> Load
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={runConvert}
                      disabled={converting}
                      className="flex w-full items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {converting ? <><RefreshCw className="h-4 w-4 animate-spin" /> Converting…</> : <><Brain className="h-4 w-4" /> Convert & Digest</>}
                    </button>

                    {convertError && <div className="text-xs text-red-400">❌ {convertError}</div>}
                    {convertMsg && <div className="text-xs text-emerald-400">✅ {convertMsg}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Live Monitor ── */}
        {activeTab === 'monitoring' && (
          <div className="space-y-3 rounded border border-mossy-border bg-mossy-bg p-4">
            <h2 className="font-semibold text-white">Live Monitor</h2>
            <p className="text-sm text-mossy-text-muted">
              Detects a running Creation Kit process and polls it every 3 seconds.
            </p>
            <div className="flex gap-2">
              {!monitoring ? (
                <button
                  onClick={startMonitoring}
                  className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Play className="h-4 w-4" /> Start
                </button>
              ) : (
                <button
                  onClick={stopMonitoring}
                  className="flex items-center gap-2 rounded bg-slate-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-500"
                >
                  <Square className="h-4 w-4" /> Stop
                </button>
              )}
              {monitoring && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Monitoring…
                </span>
              )}
            </div>

            {monitorError && <div className="text-xs text-red-400">❌ {monitorError}</div>}

            {monitoring && (
              <div className="space-y-2">
                {ckProcesses.length === 0 ? (
                  <div className="text-xs text-slate-400">Creation Kit not detected — start CK and it will appear here.</div>
                ) : (
                  ckProcesses.map((p: any, i: number) => (
                    <div key={i} className="rounded border border-emerald-700/40 bg-emerald-900/20 px-3 py-2 text-xs">
                      <span className="font-semibold text-emerald-300">{p.name || p.processName || 'CreationKit.exe'}</span>
                      {p.pid && <span className="ml-2 text-slate-400">PID {p.pid}</span>}
                      {p.memoryMB != null && <span className="ml-2 text-slate-300">{p.memoryMB} MB</span>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Post-Crash Analysis ── */}
        {activeTab === 'postcrash' && (
          <div className="space-y-3 rounded border border-mossy-border bg-mossy-bg p-4">
            <h2 className="font-semibold text-white">Crash Analysis</h2>
            <p className="text-sm text-mossy-text-muted">Load a CK crash log (.log / .txt) for AI-powered diagnosis.</p>

            {selectedLogPath && (
              <div className="text-xs text-slate-400 truncate">📄 {selectedLogPath}</div>
            )}

            <div className="flex gap-2">
              <button
                onClick={pickAndAnalyzeLog}
                disabled={analyzing}
                className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
              >
                {analyzing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Analyzing…</> : <><FileText className="h-4 w-4" /> Load & Analyze</>}
              </button>

              {selectedLogPath && !analyzing && (
                <button
                  onClick={() => analyzeLog(selectedLogPath)}
                  className="flex items-center gap-2 rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
                >
                  <RefreshCw className="h-4 w-4" /> Re-analyze
                </button>
              )}
            </div>

            {analysisError && <div className="text-xs text-red-400">❌ {analysisError}</div>}

            {crashDiagnosis && (
              <div className="space-y-3">
                <div className={`rounded border px-3 py-2 ${crashDiagnosis.preventable ? 'border-yellow-700/60 bg-yellow-900/20' : 'border-red-700/60 bg-red-900/20'}`}>
                  <div className="font-semibold text-white">
                    {crashDiagnosis.preventable ? '⚠️' : '🚨'} {crashDiagnosis.crashType || 'Unknown crash type'}
                    {crashDiagnosis.severity && <span className={`ml-2 text-sm ${severityColor(crashDiagnosis.severity)}`}>({crashDiagnosis.severity})</span>}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">{crashDiagnosis.rootCause}</div>
                  {crashDiagnosis.likelyPlugin && (
                    <div className="mt-1 text-xs text-slate-400">Likely plugin: {crashDiagnosis.likelyPlugin}</div>
                  )}
                </div>

                {crashDiagnosis.recommendations?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-300">Recommendations</div>
                    {crashDiagnosis.recommendations.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300">• {r}</div>
                    ))}
                  </div>
                )}

                {crashDiagnosis.stackTrace && crashDiagnosis.stackTrace.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-400 hover:text-white">Stack trace ({crashDiagnosis.stackTrace.length} frames)</summary>
                    <pre className="mt-2 overflow-auto rounded bg-black/40 p-2 text-slate-300">
                      {crashDiagnosis.stackTrace.join('\n')}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-mossy-border bg-mossy-bg p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runValidation()}
            disabled={validating}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
          >
            <Shield className="h-4 w-4" /> Validate
          </button>
          <button
            onClick={monitoring ? stopMonitoring : startMonitoring}            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Activity className="h-4 w-4" /> {monitoring ? 'Stop Monitor' : 'Monitor'}
          </button>
          <button
            onClick={pickAndAnalyzeLog}
            disabled={analyzing}
            className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-3 font-semibold text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-60"
          >
            <AlertTriangle className="h-4 w-4" /> Analyze
          </button>
        </div>
      </div>
    </div>
  );
};

export default CKCrashPrevention;

