import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, Activity, Play, Square, Brain, FolderOpen, GitBranch, ChevronDown, ChevronUp, CheckCircle, XCircle, RefreshCw, FileText, Clipboard, Lightbulb } from 'lucide-react';
import { analyzeCrashLogText, generatePreventionPlan, type CrashDiagnosis as EngineDiagnosis } from './ckCrashEngine';

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

// IPC-returned crash diagnosis shape (may differ slightly from engine's pure type)
interface IpcCrashDiagnosis {
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

interface ModValidationIssue {
  id?: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  autoFixable?: boolean;
}

interface ModValidationReport {
  modPath: string;
  totalFiles: number;
  totalSizeMB?: string;
  issues: ModValidationIssue[];
  summary?: {
    errors: number;
    warnings: number;
    info: number;
  };
  compliance?: {
    score?: number;
    rating?: string;
  };
}

// -------------------------------------------------------

const api = () => (window as any).electron?.api || (window as any).electronAPI;

const isMissingIpcHandlerError = (error: unknown, channel: string) => {
  const message = String((error as any)?.message || error || '');
  return message.includes(`No handler registered for '${channel}'`);
};

const severityColor = (s: string) => {
  switch (s) {
    case 'critical': return 'text-red-400';
    case 'high': return 'text-orange-400';
    case 'medium': return 'text-yellow-400';
    default: return 'text-slate-400';
  }
};

const modIssueColor = (s: string) => {
  switch (s) {
    case 'error': return 'text-red-400';
    case 'warning': return 'text-yellow-400';
    default: return 'text-slate-400';
  }
};

const isZipPath = (p: string) => /\.zip$/i.test(p.trim());
const isPluginPath = (p: string) => /\.(esp|esm|esl)$/i.test(p.trim());

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
  const [crashDiagnosis, setCrashDiagnosis] = useState<IpcCrashDiagnosis | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // Paste-log (client-side instant analysis — no file picker needed)
  const [pastedLog, setPastedLog] = useState('');
  const [pasteAnalysis, setPasteAnalysis] = useState<EngineDiagnosis | null>(null);

  // Prevention plan (generated client-side after validation)
  const [preventionPlan, setPreventionPlan] = useState<ReturnType<typeof generatePreventionPlan> | null>(null);

  // Full mod package scan state
  const [modPackagePath, setModPackagePath] = useState('');
  const [modScanPath, setModScanPath] = useState('');
  const [modScanBusy, setModScanBusy] = useState(false);
  const [modScanError, setModScanError] = useState('');
  const [modScanReport, setModScanReport] = useState<ModValidationReport | null>(null);
  const [modAutoFixBusy, setModAutoFixBusy] = useState(false);

  const unwrapModReport = (raw: any): ModValidationReport | null => {
    if (!raw) return null;
    if (raw?.success === true && raw?.data?.report) return raw.data.report as ModValidationReport;
    if (raw?.report) return raw.report as ModValidationReport;
    return null;
  };

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
    if (!a) { toast.error('Desktop bridge not available'); return; }
    try {
      // Prefer dedicated CK picker, then fallback to generic invoke and tool picker.
      if (typeof a.ckPickPlugin === 'function') {
        try {
          const result = await a.ckPickPlugin();
          if (result?.success && result.path) {
            setSelectedPlugin(result.path);
            toast.success('Plugin selected');
            return;
          }
        } catch (error) {
          if (!isMissingIpcHandlerError(error, 'ck-crash-prevention:pick-plugin')) {
            throw error;
          }
        }
      }

      if (typeof a.pickToolPath === 'function') {
        const picked = await a.pickToolPath('Fallout 4 Plugin (ESP/ESM/ESL)');
        if (picked && /\.(esp|esm|esl)$/i.test(String(picked))) {
          setSelectedPlugin(String(picked));
          toast.success('Plugin selected');
          return;
        }
      }

      if (typeof a.invoke === 'function') {
        try {
          const result = await a.invoke('ck-crash-prevention:pick-plugin');
          if (result?.success && result.path) {
            setSelectedPlugin(result.path);
            toast.success('Plugin selected');
            return;
          }
        } catch {
          // Optional fallback channel may be unavailable in some runtime builds.
        }
      }

      toast('No plugin selected.', { icon: '📁' });
    } catch (e: any) {
      const msg = String(e?.message || e || 'Unknown picker error');
      console.error('File picker error:', e);
      toast.error(`Plugin picker failed: ${msg}`);
    }
  };

  const pickSpriggitCli = async () => {
    const a = api();
    if (!a) { toast.error('Desktop bridge not available'); return; }
    try {
      if (typeof a.spriggitPickCli === 'function') {
        const result = await a.spriggitPickCli();
        if (result) {
          setSpriggitCliPath(result);
          toast.success('Spriggit CLI selected');
          return;
        }
      }

      if (typeof a.pickToolPath === 'function') {
        const result = await a.pickToolPath('Spriggit CLI');
        if (result) {
          setSpriggitCliPath(String(result));
          toast.success('Spriggit CLI selected');
          return;
        }
      }

      toast('No file selected.', { icon: '📁' });
    } catch (e: any) {
      const msg = String(e?.message || e || 'Unknown picker error');
      console.error('File picker error:', e);
      toast.error(`Spriggit picker failed: ${msg}`);
    }
  };

  const pickSpriggitDataFolder = async () => {
    const a = api();
    if (!a) { toast.error('Desktop bridge not available'); return; }
    try {
      if (typeof a.pickDirectory === 'function') {
        const result = await a.pickDirectory('Select Fallout 4 Data Folder');
        if (result) {
          setSpriggitDataPath(result);
          toast.success('Data folder selected');
          return;
        }
      }

      toast('No folder selected.', { icon: '📁' });
    } catch (e: any) {
      const msg = String(e?.message || e || 'Unknown folder picker error');
      console.error('Folder picker error:', e);
      toast.error(`Folder picker failed: ${msg}`);
    }
  };

  const pickModPackage = async () => {
    const a = api();
    if (!a) { toast.error('Desktop bridge not available'); return; }
    try {
      if (typeof a.ckPickModPackage === 'function') {
        try {
          const picked = await a.ckPickModPackage();
          if (picked?.success && picked.path) {
            setModPackagePath(String(picked.path));
            setModScanPath('');
            setModScanReport(null);
            setModScanError('');
            toast.success('Mod package selected');
            return;
          }
        } catch (error) {
          if (!isMissingIpcHandlerError(error, 'ck-crash-prevention:pick-mod-package')) {
            throw error;
          }
        }
      }

      if (typeof a.pickDirectory === 'function') {
        const folder = await a.pickDirectory('Select Mod Folder');
        if (folder) {
          setModPackagePath(String(folder));
          setModScanPath('');
          setModScanReport(null);
          setModScanError('');
          toast.success('Mod folder selected');
          return;
        }
      }

      if (typeof a.invoke === 'function') {
        try {
          const picked = await a.invoke('ck-crash-prevention:pick-mod-package');
          if (picked?.success && picked.path) {
            setModPackagePath(String(picked.path));
            setModScanPath('');
            setModScanReport(null);
            setModScanError('');
            toast.success('Mod package selected');
            return;
          }
        } catch {
          // Optional fallback channel may be unavailable in some runtime builds.
        }
      }

      toast('No mod package selected.', { icon: '📦' });
    } catch (e: any) {
      const msg = String(e?.message || e || 'Unknown picker error');
      toast.error(`Mod package picker failed: ${msg}`);
    }
  };

  const runModScan = async () => {
    const rawPath = modPackagePath.trim();
    if (!rawPath) {
      toast('Select a mod folder or ZIP first.', { icon: '📦' });
      return;
    }

    const a = api();
    if (!a) {
      toast.error('Desktop bridge not available');
      return;
    }

    setModScanBusy(true);
    setModScanError('');
    setModScanReport(null);

    try {
      let scanTarget = rawPath;

      if (isZipPath(rawPath)) {
        let extractResult: any = null;
        if (typeof a.ckExtractZip === 'function') {
          extractResult = await a.ckExtractZip(rawPath);
        } else if (typeof a.invoke === 'function') {
          extractResult = await a.invoke('ck-crash-prevention:extract-zip', rawPath);
        }

        if (!extractResult?.success || !extractResult.extractedPath) {
          throw new Error(extractResult?.error || 'ZIP extraction failed');
        }
        scanTarget = String(extractResult.extractedPath);
      }

      // If user gave an individual plugin, scan the parent folder and keep plugin selected.
      if (isPluginPath(scanTarget)) {
        setSelectedPlugin(scanTarget);
        const normalized = scanTarget.replace(/\\/g, '/');
        const lastSlash = normalized.lastIndexOf('/');
        if (lastSlash > 0) {
          scanTarget = scanTarget.slice(0, lastSlash);
        }
      }

      let response: any;
      if (typeof a.assetValidatorValidateMod === 'function') {
        response = await a.assetValidatorValidateMod(scanTarget, 'standard');
      } else if (typeof a.invoke === 'function') {
        response = await a.invoke('asset-validator:validate-mod', scanTarget, 'standard');
      } else {
        throw new Error('Asset validator API not available');
      }

      const report = unwrapModReport(response);
      if (!report) {
        const maybeError = response?.error || response?.message || 'No report returned';
        throw new Error(String(maybeError));
      }

      setModScanPath(scanTarget);
      setModScanReport(report);
      const issueCount = Array.isArray(report.issues) ? report.issues.length : 0;
      toast.success(`Mod scan complete: ${issueCount} issue(s) found`);
    } catch (e: any) {
      const msg = String(e?.message || e || 'Scan failed');
      setModScanError(msg);
      toast.error(`Mod scan failed: ${msg}`);
    } finally {
      setModScanBusy(false);
    }
  };

  const runAutoFix = async () => {
    if (!modScanReport?.issues?.length) {
      toast('Run a mod scan first.', { icon: '🛠️' });
      return;
    }

    const autoFixable = modScanReport.issues.filter((issue) => issue.autoFixable);
    if (autoFixable.length === 0) {
      toast('No auto-fixable issues found in this report.', { icon: 'ℹ️' });
      return;
    }

    const approved = window.confirm(
      `Apply ${autoFixable.length} auto-fix operation(s)? This can rename files (spaces -> underscores). Back up your mod first.`
    );
    if (!approved) {
      toast('Auto-fix cancelled.', { icon: '✋' });
      return;
    }

    const a = api();
    if (!a) {
      toast.error('Desktop bridge not available');
      return;
    }

    setModAutoFixBusy(true);
    try {
      let response: any;
      if (typeof a.assetValidatorAutoFix === 'function') {
        response = await a.assetValidatorAutoFix(autoFixable);
      } else if (typeof a.invoke === 'function') {
        response = await a.invoke('asset-validator:auto-fix', autoFixable);
      } else {
        throw new Error('Auto-fix API not available');
      }

      if (response?.success === false) {
        throw new Error(String(response?.error || 'Auto-fix failed'));
      }

      const payload = response?.data ?? response;
      const appliedCount = Number(payload?.appliedCount ?? 0);
      const failedCount = Number(payload?.failedCount ?? 0);

      if (failedCount > 0) {
        toast(`Auto-fix applied ${appliedCount}, failed ${failedCount}.`, { icon: '⚠️' });
      } else {
        toast.success(`Auto-fix applied ${appliedCount} change(s).`);
      }

      await runModScan();
    } catch (e: any) {
      const msg = String(e?.message || e || 'Auto-fix failed');
      toast.error(`Auto-fix failed: ${msg}`);
    } finally {
      setModAutoFixBusy(false);
    }
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
      // Generate a client-side prevention plan from validation results
      setPreventionPlan(generatePreventionPlan({
        crashRisk: result.crashRisk ?? 0,
        issues: result.issues ?? [],
        hasNavmesh: result.issues?.some((i: ValidationIssue) => i.type === 'navmesh_conflict'),
        hasPrecombines: result.issues?.some((i: ValidationIssue) => i.message?.toLowerCase().includes('precombine')),
      }));
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
      const result = await a.spriggitSerialize({ cliPath: spriggitCliPath, dataPath: spriggitDataPath, outputPath: '' });
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
      const rawProcs = await a.getRunningProcesses();
      const procs: any[] = (rawProcs as any)?.data ?? (Array.isArray(rawProcs) ? rawProcs : []);
      const ck = procs.filter((p: any) => {
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
    if (!a) { toast.error('Desktop bridge not available'); return; }
    setAnalysisError('');
    setCrashDiagnosis(null);
    try {
      toast('Select a CK crash log (.log or .txt) — not your ESP.', { icon: '📄' });

      let picked: { success?: boolean; path?: string } | null = null;
      if (typeof a.ckPickLogFile === 'function') {
        try {
          picked = await a.ckPickLogFile();
        } catch (error) {
          if (!isMissingIpcHandlerError(error, 'ck-crash-prevention:pick-log-file')) {
            throw error;
          }
        }
      } else if (typeof a.invoke === 'function') {
        picked = await a.invoke('ck-crash-prevention:pick-log-file');
      }

      if ((!picked?.success || !picked.path) && typeof a.invoke === 'function') {
        try {
          picked = await a.invoke('ck-crash-prevention:pick-log-file');
        } catch {
          // Optional fallback channel may be unavailable in some runtime builds.
        }
      }

      if (!picked?.success || !picked.path) {
        toast('No log selected.', { icon: '📄' });
        return;
      }

      setSelectedLogPath(picked.path);
      setActiveTab('postcrash');
      await analyzeLog(picked.path);
    } catch (e: any) {
      const msg = String(e?.message || e || 'Unknown picker error');
      toast.error(`Log picker failed: ${msg}`);
    }
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
      setCrashDiagnosis(result as IpcCrashDiagnosis);
      toast.success(`Diagnosis: ${result.crashType || 'unknown'}`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setAnalysisError(msg);
      toast.error(`Analysis failed: ${msg}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Paste-log instant analysis (client-side, no file picker) ─────────────

  const analyzePastedLog = () => {
    if (!pastedLog.trim()) { toast('Paste a crash log first.', { icon: '📋' }); return; }
    const result = analyzeCrashLogText(pastedLog);
    setPasteAnalysis(result);
    setActiveTab('postcrash');
    toast.success(`Instant diagnosis: ${result.crashType} (${result.confidence} confidence)`);
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

                  {/* Prevention plan */}
                  {preventionPlan && (
                    <div className="rounded border border-blue-700/40 bg-blue-950/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-300" />
                        <span className="text-xs font-bold text-blue-300">Prevention Plan</span>
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${preventionPlan.priority === 'critical' ? 'border-red-500/50 text-red-300 bg-red-900/20' : preventionPlan.priority === 'high' ? 'border-orange-500/50 text-orange-300 bg-orange-900/20' : 'border-blue-500/50 text-blue-300 bg-blue-900/20'}`}>
                          {preventionPlan.priority.toUpperCase()} · −{preventionPlan.estimatedRiskReduction}% risk · {preventionPlan.estimatedTime}
                        </span>
                      </div>
                      <ol className="space-y-1">
                        {preventionPlan.steps.map((step) => (
                          <li key={step.order} className="text-xs text-slate-300 flex gap-2">
                            <span className="text-blue-400 font-bold flex-shrink-0">{step.order}.</span>
                            <span><span className="font-semibold text-white">{step.action}</span> — {step.description}{step.tool ? <span className="text-slate-400"> [{step.tool}]</span> : null}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Full mod package scan + real auto-fix */}
            <div className="space-y-3 rounded border border-mossy-border bg-mossy-bg p-4">
              <h2 className="font-semibold text-white">Full Mod Scan & Repair</h2>
              <p className="text-xs text-mossy-text-muted">
                Scan a full mod folder or ZIP package. Auto-fix runs only real operations currently implemented by Mossy.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={modPackagePath}
                  onChange={(e) => setModPackagePath(e.target.value)}
                  placeholder="Mod folder, ZIP, or plugin path..."
                  className="flex-1 rounded border border-mossy-border bg-mossy-darker px-3 py-2 text-mossy-text placeholder-mossy-text-muted focus:outline-none focus:ring-2 focus:ring-mossy-accent"
                />
                <button
                  onClick={pickModPackage}
                  className="rounded border border-mossy-border bg-mossy-accent px-3 py-2 text-black font-semibold hover:bg-mossy-accent-hover transition-colors flex items-center gap-1"
                >
                  <FolderOpen className="w-4 h-4" /> Load
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={runModScan}
                  disabled={modScanBusy}
                  className="flex-1 rounded bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {modScanBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning…</> : <><Shield className="w-4 h-4" /> Scan Mod Package</>}
                </button>
                <button
                  onClick={runAutoFix}
                  disabled={modAutoFixBusy || !modScanReport}
                  className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
                  title="Applies only real supported fixes (currently filename normalization)"
                >
                  {modAutoFixBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Fixing…</> : <><CheckCircle className="w-4 h-4" /> Auto-Fix</>}
                </button>
              </div>

              {modScanPath && (
                <div className="text-xs text-slate-400">
                  Scan target: {modScanPath}
                </div>
              )}

              {modScanError && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded px-3 py-2">
                  ❌ {modScanError}
                </div>
              )}

              {modScanReport && (
                <div className="space-y-3 rounded border border-mossy-border bg-mossy-darker p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Report Summary</span>
                    <span className="text-slate-300">
                      Score {modScanReport.compliance?.score ?? 0} / 100 ({modScanReport.compliance?.rating || 'Unknown'})
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded border border-red-700/40 bg-red-900/20 px-2 py-1 text-red-300">Errors: {modScanReport.summary?.errors ?? 0}</div>
                    <div className="rounded border border-yellow-700/40 bg-yellow-900/20 px-2 py-1 text-yellow-300">Warnings: {modScanReport.summary?.warnings ?? 0}</div>
                    <div className="rounded border border-slate-700/40 bg-slate-900/20 px-2 py-1 text-slate-300">Info: {modScanReport.summary?.info ?? 0}</div>
                  </div>

                  <div className="text-xs text-slate-400">
                    Files scanned: {modScanReport.totalFiles} · Size: {modScanReport.totalSizeMB || 'n/a'} MB
                  </div>

                  {modScanReport.issues.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-auto pr-1">
                      {modScanReport.issues.map((issue, idx) => (
                        <div key={`${issue.id || issue.type}-${idx}`} className="rounded border border-mossy-border bg-mossy-bg px-3 py-2 text-xs">
                          <div className={`font-semibold ${modIssueColor(issue.severity)}`}>
                            [{issue.severity}] {issue.message}
                          </div>
                          <div className="text-slate-400 mt-1">Type: {issue.type}</div>
                          {issue.file && <div className="text-slate-500 break-all">{issue.file}</div>}
                          <div className="mt-1 text-slate-300">
                            Fix guidance: {issue.autoFixable ? 'Mossy can auto-fix this now.' : 'Manual repair needed with CK/xEdit/toolchain for this issue type.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400">No issues found in mod package scan.</div>
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
            <p className="text-sm text-mossy-text-muted">Load a CK crash log (.log / .txt) for AI-powered diagnosis, or paste raw log text below for instant client-side analysis.</p>

            {/* Paste log — instant client-side analysis */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Clipboard className="w-3.5 h-3.5" /> Paste Crash Log (instant — no file needed)
              </div>
              <textarea
                value={pastedLog}
                onChange={(e) => { setPastedLog(e.target.value); setPasteAnalysis(null); }}
                placeholder="Paste your Addictol / Buffout 4 / X-Cell crash log text here…"
                rows={5}
                className="w-full rounded border border-mossy-border bg-mossy-darker px-3 py-2 text-xs text-mossy-text placeholder-mossy-text-muted focus:outline-none focus:ring-2 focus:ring-mossy-accent resize-y font-mono"
              />
              <button
                onClick={analyzePastedLog}
                disabled={!pastedLog.trim()}
                className="flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-40"
              >
                <Brain className="h-4 w-4" /> Analyse Pasted Log
              </button>

              {pasteAnalysis && (
                <div className="space-y-2 rounded border border-purple-700/40 bg-purple-950/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{pasteAnalysis.preventable ? '⚠️' : '🚨'} {pasteAnalysis.crashType}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${pasteAnalysis.confidence === 'high' ? 'border-emerald-500/50 text-emerald-300' : pasteAnalysis.confidence === 'medium' ? 'border-yellow-500/50 text-yellow-300' : 'border-slate-500/50 text-slate-400'}`}>
                      {pasteAnalysis.confidence} confidence
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">{pasteAnalysis.rootCause}</div>
                  {pasteAnalysis.affectedComponent && <div className="text-xs text-slate-400">Component: {pasteAnalysis.affectedComponent}</div>}
                  {pasteAnalysis.recommendations.length > 0 && (
                    <ul className="space-y-0.5 mt-1">
                      {pasteAnalysis.recommendations.map((r, i) => (
                        <li key={i} className="text-xs text-slate-300">• {r}</li>
                      ))}
                    </ul>
                  )}
                  {pasteAnalysis.stackTrace && pasteAnalysis.stackTrace.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-slate-400 hover:text-white">Stack trace ({pasteAnalysis.stackTrace.length} frames)</summary>
                      <pre className="mt-1 overflow-auto rounded bg-black/40 p-2 text-slate-300 text-[10px]">{pasteAnalysis.stackTrace.join('\n')}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-mossy-border pt-3">
              <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Or load a log file via Electron file picker</div>
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
            title="Load a CK crash log (.log / .txt) for AI-powered diagnosis"
          >
            <AlertTriangle className="h-4 w-4" /> Analyze Crash Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default CKCrashPrevention;
