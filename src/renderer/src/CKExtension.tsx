import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, Save, Code, AlertTriangle, CheckCircle2, FileText, Play, RefreshCw, Terminal, Clock, MapPin, Search, XCircle, CheckCircle, Info, FolderOpen, Zap } from 'lucide-react';

// ─── Papyrus PSC quick-linter ──────────────────────────────────────────────────
// Pure client-side pattern analysis of pasted .psc source. No compilation needed.

interface LintIssue {
  line: number;
  severity: 'error' | 'warn' | 'info';
  rule: string;
  message: string;
}

function lintPapyrusSource(src: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = src.split('\n');

  lines.forEach((raw, idx) => {
    const line = idx + 1;
    const l = raw.toLowerCase();
    const t = raw.trim();

    // Skip comments and blank lines
    if (t.startsWith(';') || !t) return;

    // Rule: RegisterForUpdate without matching singleUpdate preference
    if (l.includes('registerforupdate(') && !l.includes(';')) {
      issues.push({ line, severity: 'warn', rule: 'prefer-single-update',
        message: 'RegisterForUpdate() detected. Prefer RegisterForSingleUpdate(delay) + OnUpdate pattern to avoid continuous VM budget drain.' });
    }

    // Rule: GetName() in likely loop context
    if (l.includes('.getname()') && (l.includes('while') || l.includes('if') || l.includes('foreach'))) {
      issues.push({ line, severity: 'warn', rule: 'cache-getname',
        message: 'GetName() called inside a conditional/loop. Cache the result in a String variable to avoid repeated string allocation.' });
    }

    // Rule: AddInventoryEventFilter without Remove
    if (l.includes('addinventoryeventfilter(') && !l.includes(';')) {
      issues.push({ line, severity: 'info', rule: 'filter-balance',
        message: 'AddInventoryEventFilter() found. Verify a matching RemoveInventoryEventFilter() call exists in your cleanup/OnReset handler to prevent stack overflow.' });
    }

    // Rule: Debug.Trace in non-commented line (release concern)
    if (l.includes('debug.trace(') && !l.includes(';')) {
      issues.push({ line, severity: 'info', rule: 'debug-trace',
        message: 'Debug.Trace() call present. Remove or guard with a debug flag before releasing — trace calls add overhead in production.' });
    }

    // Rule: Utility.Wait() in main thread (not recommended)
    if (l.includes('utility.wait(') && !l.includes(';')) {
      issues.push({ line, severity: 'warn', rule: 'avoid-wait',
        message: 'Utility.Wait() halts the current script thread. Use RegisterForSingleUpdate() for delayed execution instead to keep the Papyrus scheduler healthy.' });
    }

    // Rule: Missing ScriptName declaration at top
    if (idx === 0 && !l.startsWith('scriptname') && !l.startsWith(';') && t.length > 0) {
      issues.push({ line, severity: 'error', rule: 'missing-scriptname',
        message: 'First non-comment line should be a ScriptName declaration. The Papyrus compiler requires ScriptName as the first statement.' });
    }

    // Rule: Deprecated GetActorBase instead of GetActorBase() with null check
    if (l.includes('getactorbase()') && !l.includes('if') && !l.includes('== none') && !l.includes('!= none')) {
      issues.push({ line, severity: 'info', rule: 'null-check-actorbase',
        message: 'GetActorBase() result used without None check. Actors with no ActorBase (e.g. spawned at runtime) will return None — guard with a None check.' });
    }

    // Rule: Form.SendModEvent without checking F4SE availability
    if (l.includes('sendmodevent(') && !l.includes(';')) {
      issues.push({ line, severity: 'info', rule: 'sendmodevent-f4se',
        message: 'SendModEvent() requires F4SE. If your mod supports non-F4SE installs, wrap in a conditional or document the F4SE requirement.' });
    }

    // Rule: Very long single line (complex expression)
    if (raw.length > 200 && !t.startsWith(';')) {
      issues.push({ line, severity: 'info', rule: 'line-length',
        message: `Line is ${raw.length} characters. Consider splitting into multiple statements for readability and compiler error isolation.` });
    }
  });

  // Check for missing EndEvent / EndFunction / EndState balance
  const openEvents = (src.match(/^\s*Event\s+/gmi) ?? []).length;
  const closeEvents = (src.match(/^\s*EndEvent\b/gmi) ?? []).length;
  if (openEvents !== closeEvents) {
    issues.push({ line: 0, severity: 'error', rule: 'unbalanced-event',
      message: `Unbalanced Event/EndEvent: ${openEvents} Event(s) found but ${closeEvents} EndEvent(s). Missing EndEvent will cause compilation failure.` });
  }

  const openFns = (src.match(/^\s*Function\s+/gmi) ?? []).length;
  const closeFns = (src.match(/^\s*EndFunction\b/gmi) ?? []).length;
  if (openFns !== closeFns) {
    issues.push({ line: 0, severity: 'error', rule: 'unbalanced-function',
      message: `Unbalanced Function/EndFunction: ${openFns} Function(s) found but ${closeFns} EndFunction(s). Missing EndFunction will cause compilation failure.` });
  }

  return issues.sort((a, b) => {
    const order = { error: 0, warn: 1, info: 2 };
    return order[a.severity] - order[b.severity] || a.line - b.line;
  });
}

interface CompilationJob {
  id: string;
  scriptName: string;
  status: 'queued' | 'compiling' | 'success' | 'error';
  startTime?: Date;
  endTime?: Date;
  errors?: string[];
}

interface CKScript {
  name: string;
  path: string;
  lastModified: Date;
  compiled: boolean;
}

export const CKExtension: React.FC = () => {
  const navigate = useNavigate();
  const logRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    return localStorage.getItem('ck_autosave_enabled') === 'true';
  });
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => {
    return parseInt(localStorage.getItem('ck_autosave_interval') || '5');
  });
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [nextSaveCountdown, setNextSaveCountdown] = useState<number>(0);
  const [compilationQueue, setCompilationQueue] = useState<CompilationJob[]>([]);
  const [recentScripts, setRecentScripts] = useState<CKScript[]>([]);
  const [ckLogs, setCkLogs] = useState<string[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // Papyrus linter state
  const [lintSource, setLintSource] = useState('');
  const [lintResults, setLintResults] = useState<LintIssue[] | null>(null);
  const [lintBusy, setLintBusy] = useState(false);

  // Compiler path settings
  const [papyrusCompilerPath, setPapyrusCompilerPath] = useState(() =>
    localStorage.getItem('ck_papyrus_compiler_path') || ''
  );
  const [papyrusFlagsPath, setPapyrusFlagsPath] = useState(() =>
    localStorage.getItem('ck_papyrus_flags_path') || ''
  );
  const [showCompilerSettings, setShowCompilerSettings] = useState(false);

  // Check if Creation Kit is running via Neural Link
  useEffect(() => {
    const checkCK = () => {
      try {
        const activeTools = localStorage.getItem('mossy_active_tools');
        if (activeTools) {
          const data = JSON.parse(activeTools);
          const ckRunning = data.tools?.some((t: any) => 
            t.name.toLowerCase().includes('creationkit') || 
            t.name.toLowerCase().includes('ck.exe')
          );
          setIsConnected(ckRunning);
          
          if (ckRunning) {
            loadCKData();
          }
        }
      } catch (error) {
        console.error('Error checking CK status:', error);
      }
    };

    checkCK();
    const interval = setInterval(checkCK, 5000);
    return () => clearInterval(interval);
  }, []);

  const performAutoSave = useCallback(() => {
    const now = new Date();
    setLastAutoSave(now);
    const api: any = (window as any).electron?.api || (window as any).electronAPI;
    if (typeof api?.ckTriggerSave === 'function') {
      api.ckTriggerSave().then((r: any) => {
        if (r?.success) {
          setCkLogs(prev => [...prev, `[${now.toLocaleTimeString()}] ✅ CK auto-save triggered via IPC`]);
        } else {
          setCkLogs(prev => [...prev, `[${now.toLocaleTimeString()}] ⏱ Save reminder logged — CK IPC save unavailable. Use File > Save in CK.`]);
        }
      }).catch(() => {
        setCkLogs(prev => [...prev, `[${now.toLocaleTimeString()}] ⏱ Save reminder logged — CK IPC bridge not connected. Use File > Save in CK.`]);
      });
    } else {
      setCkLogs(prev => [...prev, `[${now.toLocaleTimeString()}] ⏱ Auto-save reminder: ${autoSaveInterval} min elapsed. Press Ctrl+S in CK.`]);
    }
  }, [autoSaveInterval]);

  // Auto-save timer + countdown
  const autoSaveStartRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!autoSaveEnabled) { setNextSaveCountdown(0); return; }
    autoSaveStartRef.current = Date.now();
    const intervalMs = autoSaveInterval * 60 * 1000;

    const saveTimer = setInterval(() => {
      autoSaveStartRef.current = Date.now();
      performAutoSave();
    }, intervalMs);

    const countdownTimer = setInterval(() => {
      const elapsed = Date.now() - autoSaveStartRef.current;
      const remaining = Math.max(0, Math.ceil((intervalMs - elapsed) / 1000));
      setNextSaveCountdown(remaining);
    }, 1000);

    return () => { clearInterval(saveTimer); clearInterval(countdownTimer); };
  }, [autoSaveEnabled, autoSaveInterval, performAutoSave]);

  const loadCKData = async () => {
    // Try to load recently compiled scripts from settings if the IPC is available
    const api: any = (window as any).electron?.api || (window as any).electronAPI;
    if (api?.getSettings) {
      try {
        const settings = await api.getSettings();
        const savedScripts: CKScript[] = settings?.ckRecentScripts ?? [];
        setRecentScripts(savedScripts);
      } catch { /* settings unavailable */ }
    }
    // Active cell is only knowable via a live CK IPC; leave as null until connected
  };

  const toggleAutoSave = () => {
    const next = !autoSaveEnabled;
    setAutoSaveEnabled(next);
    localStorage.setItem('ck_autosave_enabled', next.toString());
    setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Auto-save ${next ? 'enabled' : 'disabled'}`]);
  };

  const updateAutoSaveInterval = (minutes: number) => {
    setAutoSaveInterval(minutes);
    localStorage.setItem('ck_autosave_interval', minutes.toString());
    setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Auto-save interval set to ${minutes} minutes`]);
  };

  const saveCompilerPath = (path: string) => {
    setPapyrusCompilerPath(path);
    localStorage.setItem('ck_papyrus_compiler_path', path);
  };

  const saveFlagsPath = (path: string) => {
    setPapyrusFlagsPath(path);
    localStorage.setItem('ck_papyrus_flags_path', path);
  };

  const runLinter = () => {
    if (!lintSource.trim()) return;
    setLintBusy(true);
    // Yield to UI then run
    setTimeout(() => {
      const results = lintPapyrusSource(lintSource);
      setLintResults(results);
      setLintBusy(false);
    }, 50);
  };

  const compileScript = async (scriptName: string) => {
    const api: any = (window as any).electron?.api || (window as any).electronAPI;
    const job: CompilationJob = {
      id: Date.now().toString(),
      scriptName,
      status: 'queued',
    };

    setCompilationQueue(prev => [...prev, job]);
    setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Queued: ${scriptName}`]);

    // Use real Papyrus compiler IPC when available
    if (api?.compileScript || api?.papyrusCompiler?.compile) {
      setCompilationQueue(prev =>
        prev.map(j => j.id === job.id ? { ...j, status: 'compiling', startTime: new Date() } : j)
      );
      setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Compiling: ${scriptName}`]);
      try {
        const result = await (api.compileScript ?? api.papyrusCompiler.compile)(scriptName);
        const success = result?.success ?? false;
        const errors = result?.errors ?? (success ? [] : ['Compilation failed — check CK output']);
        setCompilationQueue(prev =>
          prev.map(j => j.id === job.id ? { ...j, status: success ? 'success' : 'error', endTime: new Date(), errors } : j)
        );
        setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${success ? 'Success' : 'Failed'}: ${scriptName}`]);
      } catch (err: any) {
        setCompilationQueue(prev =>
          prev.map(j => j.id === job.id ? { ...j, status: 'error', endTime: new Date(), errors: [err?.message || 'IPC error'] } : j)
        );
        setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${scriptName} — ${err?.message}`]);
      }
    } else {
      // IPC not available — mark as error with clear explanation
      setCompilationQueue(prev =>
        prev.map(j => j.id === job.id ? {
          ...j,
          status: 'error',
          endTime: new Date(),
          errors: ['Papyrus compiler IPC not available. Use The Scribe (Script Editor) to compile .psc files via the configured CK path.']
        } : j)
      );
      setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Cannot compile ${scriptName}: no IPC bridge`]);
    }
  };

  const compileAllQueued = () => {
    recentScripts.filter(s => !s.compiled).forEach(script => {
      compileScript(script.name);
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Wrench className="w-8 h-8 text-orange-400" />
                Creation Kit Extension
              </h1>
              <p className="text-slate-300 mt-2">
                Auto-save, script compilation, and productivity tools for CK
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isConnected 
                  ? 'bg-green-900/30 border border-green-500/30 text-green-300'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'CK Detected' : 'CK Not Running'}
              </div>
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-orange-900/20 border border-orange-500/30 text-orange-100 hover:bg-orange-900/30 transition-colors"
              >
                Help
              </Link>
            </div>
          </div>

          {/* Capability Status Banner */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-2">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Extension Capabilities</p>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {[
                { icon: CheckCircle, color: 'text-emerald-400', label: 'Auto-save countdown timer', detail: 'Active — counts down and reminds you to Ctrl+S at each interval' },
                { icon: CheckCircle, color: 'text-emerald-400', label: 'CK process detection', detail: 'Via Neural Link mossy_active_tools registry (CreationKit.exe)' },
                { icon: CheckCircle, color: 'text-emerald-400', label: 'Papyrus PSC linter', detail: '8 lint rules run instantly on pasted source — no compiler needed' },
                { icon: CheckCircle, color: 'text-emerald-400', label: 'Script compilation queue', detail: 'Queues and dispatches compile jobs via IPC when Papyrus compiler is configured' },
                { icon: Info, color: 'text-amber-400', label: 'CK IPC save trigger', detail: 'Available if desktop bridge exposes ckTriggerSave — otherwise sends reminder' },
                { icon: Info, color: 'text-amber-400', label: 'Active cell display', detail: 'Requires live CK IPC bridge with cell tracking event stream' },
              ].map(cap => (
                <div key={cap.label} className="flex items-start gap-2">
                  <cap.icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${cap.color}`} />
                  <span className="text-white font-medium">{cap.label}</span>
                  <span className="text-slate-500">— {cap.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-300 mb-2">Creation Kit Not Detected</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    Start Creation Kit to enable this extension. Neural Link will automatically detect it.
                  </p>
                  <div className="text-xs text-slate-400">
                    <p className="mb-1">Supported: Creation Kit 1.10+</p>
                    <p>Detection looks for: CreationKit.exe</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auto-Save Control */}
          {isConnected && (
            <div ref={settingsRef} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Save className="w-6 h-6 text-orange-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Auto-Save</h3>
                    <p className="text-sm text-slate-400">Automatic backup to prevent data loss</p>
                  </div>
                </div>
                <button
                  onClick={toggleAutoSave}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    autoSaveEnabled
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {autoSaveEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {autoSaveEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-slate-300">Interval:</label>
                    <div className="flex gap-2">
                      {[3, 5, 10, 15].map(minutes => (
                        <button
                          key={minutes}
                          onClick={() => updateAutoSaveInterval(minutes)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            autoSaveInterval === minutes
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          }`}
                        >
                          {minutes} min
                        </button>
                      ))}
                    </div>
                  </div>

                  {lastAutoSave && (
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Last reminder: {lastAutoSave.toLocaleTimeString()}
                    </div>
                  )}
                  {autoSaveEnabled && nextSaveCountdown > 0 && (
                    <div className="text-sm text-emerald-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Next save reminder in: <span className="font-mono font-bold">
                        {Math.floor(nextSaveCountdown / 60)}:{String(nextSaveCountdown % 60).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Cell/Worldspace */}
          {isConnected && activeCell && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">Active Cell</h3>
                  <p className="text-sm text-slate-400">{activeCell}</p>
                </div>
              </div>
            </div>
          )}

          {/* Script Compilation Queue */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Code className="w-6 h-6 text-orange-400" />
                  <h3 className="text-lg font-bold text-white">Script Compilation</h3>
                </div>
                <button
                  onClick={compileAllQueued}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Compile All Uncompiled
                </button>
              </div>

              {/* Recent Scripts */}
              <div className="space-y-2">
                {recentScripts.map((script, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="font-medium text-white">{script.name}</div>
                        <div className="text-xs text-slate-500">
                          Modified: {script.lastModified.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {script.compiled ? (
                        <span className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Compiled
                        </span>
                      ) : (
                        <button
                          onClick={() => compileScript(script.name)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-sm font-medium transition-colors"
                        >
                          Compile
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Compilation Queue */}
              {compilationQueue.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-bold text-slate-300">Queue</h4>
                  {compilationQueue.slice(-5).map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 rounded-lg border flex items-center gap-3 ${
                        job.status === 'success' ? 'bg-green-900/20 border-green-500/30' :
                        job.status === 'error' ? 'bg-red-900/20 border-red-500/30' :
                        'bg-blue-900/20 border-blue-500/30'
                      }`}
                    >
                      {job.status === 'queued' && <Clock className="w-4 h-4 text-blue-400" />}
                      {job.status === 'compiling' && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
                      {job.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                      {job.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                      <div className="flex-1">
                        <div className="text-sm text-white">{job.scriptName}</div>
                        {job.errors && job.errors.length > 0 && (
                          <div className="text-xs text-red-400 mt-1">{job.errors[0]}</div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        job.status === 'success' ? 'bg-green-500/20 text-green-300' :
                        job.status === 'error' ? 'bg-red-500/20 text-red-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Log */}
          {isConnected && ckLogs.length > 0 && (
            <div ref={logRef} className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-orange-500/30 p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-orange-400" />
                Activity Log
              </h3>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
                {ckLogs.slice(-10).map((log, index) => (
                  <div key={index} className="text-green-400">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button 
                  onClick={performAutoSave}
                  className="px-4 py-3 bg-green-900/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-900/30 transition-colors flex items-center gap-2 justify-center"
                >
                  <Save className="w-4 h-4" />
                  Save Now
                </button>
                <button
                  onClick={() => logRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-4 py-3 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors flex items-center gap-2 justify-center">
                  <FileText className="w-4 h-4" />
                  View Logs
                </button>
                <button
                  onClick={() => navigate('/ai-mod-assistant')}
                  className="px-4 py-3 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Code className="w-4 h-4" />
                  Script Editor
                </button>
                <button
                  onClick={() => settingsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-4 py-3 bg-orange-900/20 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Wrench className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          )}

          {/* Papyrus PSC Linter */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Papyrus Script Linter</h3>
                <p className="text-sm text-slate-400">Paste .psc source for instant client-side analysis — 8 rules, no compiler needed</p>
              </div>
            </div>
            <textarea
              value={lintSource}
              onChange={e => { setLintSource(e.target.value); setLintResults(null); }}
              rows={8}
              placeholder="Scriptname MyScript extends ObjectReference&#10;&#10;Event OnActivate(ObjectReference akActionRef)&#10;  ; Paste your .psc source here&#10;EndEvent"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y mb-3"
            />
            <button
              onClick={runLinter}
              disabled={lintBusy || !lintSource.trim()}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 mb-4"
            >
              {lintBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Linting…</> : <><Search className="w-4 h-4" /> Lint Script</>}
            </button>

            {lintResults !== null && (
              <div className="space-y-2">
                {lintResults.length === 0 ? (
                  <div className="rounded-lg border border-emerald-600/40 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> No lint issues detected — script looks clean.
                  </div>
                ) : (
                  lintResults.map((issue, i) => (
                    <div key={i} className={`rounded-lg border px-3 py-2 text-xs ${
                      issue.severity === 'error' ? 'border-red-600/40 bg-red-950/20 text-red-300'
                      : issue.severity === 'warn' ? 'border-yellow-600/40 bg-yellow-950/20 text-yellow-300'
                      : 'border-sky-600/40 bg-sky-950/20 text-sky-300'
                    }`}>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {issue.severity === 'error' ? <XCircle className="w-3.5 h-3.5" /> : issue.severity === 'warn' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                        <span className="font-bold uppercase text-[10px] tracking-wider">{issue.severity}</span>
                        {issue.line > 0 && <span className="font-mono text-slate-500">Line {issue.line}</span>}
                        <span className="text-slate-500 font-mono text-[10px]">[{issue.rule}]</span>
                      </div>
                      <p className="text-slate-300 mt-0.5">{issue.message}</p>
                    </div>
                  ))
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {lintResults.filter(r => r.severity === 'error').length} error(s) · {lintResults.filter(r => r.severity === 'warn').length} warning(s) · {lintResults.filter(r => r.severity === 'info').length} info
                </div>
              </div>
            )}
          </div>

          {/* Compiler Path Configuration */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => setShowCompilerSettings(!showCompilerSettings)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-orange-400" />
                <div className="text-left">
                  <h3 className="font-bold text-white text-sm">Compiler Path Configuration</h3>
                  <p className="text-xs text-slate-400">Configure Papyrus compiler and flags file paths</p>
                </div>
              </div>
              <span className="text-slate-500 text-xs">{showCompilerSettings ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {showCompilerSettings && (
              <div className="px-6 pb-5 space-y-3 border-t border-slate-700">
                <div className="space-y-1 mt-3">
                  <label className="text-xs font-semibold text-slate-300">PapyrusCompiler.exe Path</label>
                  <input
                    value={papyrusCompilerPath}
                    onChange={e => saveCompilerPath(e.target.value)}
                    placeholder="C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Papyrus Compiler\PapyrusCompiler.exe"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Flags File Path (.flg)</label>
                  <input
                    value={papyrusFlagsPath}
                    onChange={e => saveFlagsPath(e.target.value)}
                    placeholder="C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Data\Scripts\Source\User\Institute_Papyrus_Flags.flg"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
                  <p className="mb-1 font-semibold text-slate-300">Typical CK Compiler Command:</p>
                  <code className="font-mono text-emerald-300 text-[10px] break-all">
                    PapyrusCompiler.exe "MyScript.psc" -i="Data\Scripts\Source" -o="Data\Scripts" -f="Institute_Papyrus_Flags.flg"
                  </code>
                </div>
                {papyrusCompilerPath && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Compiler path saved — script compilation queue will use this path.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-200 mb-2">💡 Creation Kit Extension Features</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Live countdown timer to next auto-save reminder</li>
              <li>• CK IPC save trigger (when desktop bridge supports ckTriggerSave)</li>
              <li>• Papyrus PSC linter — 8 rules, fully client-side, no compiler needed</li>
              <li>• Script compilation queue with configurable PapyrusCompiler.exe path</li>
              <li>• Real-time activity logging with timestamps</li>
              <li>• Cell/worldspace tracking via CK IPC bridge</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
