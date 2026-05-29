import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2, XCircle, Loader2, Play, Copy, ArrowDownToLine, Wrench } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

interface DiagnosticCheck {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'checking' | 'success' | 'error' | 'warning';
  result: string;
  errorDetails?: string;
}

type DiagnosticToolsProps = {
  embedded?: boolean;
};

const DiagnosticTools: React.FC<DiagnosticToolsProps> = ({ embedded = false }) => {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([
    {
      id: 'electron-api',
      name: 'Electron API Available',
      description: 'Check if window.electron?.api is accessible',
      status: 'idle',
      result: ''
    },
    {
      id: 'detect-programs',
      name: 'detectPrograms() Function',
      description: 'Check if detectPrograms function exists and is callable',
      status: 'idle',
      result: ''
    },
    {
      id: 'get-system-info',
      name: 'getSystemInfo() Function',
      description: 'Check if getSystemInfo function exists and is callable',
      status: 'idle',
      result: ''
    },
    {
      id: 'desktop-bridge',
      name: 'Desktop Bridge Active',
      description: 'Check if mossy_bridge_active is set in localStorage',
      status: 'idle',
      result: ''
    },
    {
      id: 'storage-available',
      name: 'localStorage Available',
      description: 'Verify localStorage is accessible for caching',
      status: 'idle',
      result: ''
    },
    {
      id: 'knowledge-vault',
      name: 'Knowledge Vault Loaded',
      description: 'Check if mossy_knowledge_vault is present and readable',
      status: 'idle',
      result: ''
    },
    {
      id: 'install-wizard-state',
      name: 'Install Wizard State',
      description: 'Check if the Install Wizard progress is readable',
      status: 'idle',
      result: ''
    },
    {
      id: 'microphone-permission',
      name: 'Microphone Permission',
      description: 'Check microphone permission state (if supported by browser)',
      status: 'idle',
      result: ''
    },
    {
      id: 'tts-voices',
      name: 'Browser TTS Voices',
      description: 'Check speechSynthesis voice availability',
      status: 'idle',
      result: ''
    },
    {
      id: 'secret-status',
      name: 'Secret Status (Main Process)',
      description: 'Check if main process can see backend/OpenAI/Groq keys',
      status: 'idle',
      result: ''
    },
    // FO4 Environment checks
    {
      id: 'fo4-path',
      name: 'FO4 Game Path Configured',
      description: 'Check if Fallout 4 game path is set in settings',
      status: 'idle',
      result: ''
    },
    {
      id: 'xedit-path',
      name: 'xEdit / FO4Edit Path Configured',
      description: 'Check if xEdit path is set in Tool settings',
      status: 'idle',
      result: ''
    },
    {
      id: 'f4se-check',
      name: 'F4SE / Script Extender Path',
      description: 'Check if F4SE path is configured in settings',
      status: 'idle',
      result: ''
    },
    {
      id: 'creation-kit-check',
      name: 'Creation Kit Path Configured',
      description: 'Check if Creation Kit path is set in Tool settings',
      status: 'idle',
      result: ''
    },
    {
      id: 'ollama-check',
      name: 'Ollama Local AI Running',
      description: 'Ping Ollama at localhost:11434 to check if it is running',
      status: 'idle',
      result: ''
    },
  ]);

  const [testOutput, setTestOutput] = useState<string>('');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [snapshotStatus, setSnapshotStatus] = useState<string>('');
  const [revealStatus, setRevealStatus] = useState<string>('');

  const updateCheck = (id: string, patch: Partial<DiagnosticCheck>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const runDiagnostics = async () => {
    toast('Running diagnostics...', { icon: undefined });

    // Set all to checking
    setChecks(prev => prev.map(c => ({ ...c, status: 'checking' as const, result: '', errorDetails: '' })));

    const api = (window as any).electron?.api || (window as any).electronAPI;
    const hasElectronApi = !!api;
    updateCheck('electron-api', { result: hasElectronApi ? 'Available' : 'Not Available', status: hasElectronApi ? 'success' : 'error' });

    const detectPrograms = typeof api?.detectPrograms === 'function' ? api.detectPrograms : null;
    updateCheck('detect-programs', { result: detectPrograms ? 'Function exists and callable' : 'Function not found', status: detectPrograms ? 'success' : 'error' });

    const getSystemInfo = typeof api?.getSystemInfo === 'function' ? api.getSystemInfo : null;
    updateCheck('get-system-info', { result: getSystemInfo ? 'Function exists and callable' : 'Function not found', status: getSystemInfo ? 'success' : 'error' });

    let bridgeActive = false;
    try {
      bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
    } catch {
      bridgeActive = false;
    }
    updateCheck('desktop-bridge', { result: bridgeActive ? 'Active' : 'Inactive', status: bridgeActive ? 'success' : 'error' });

    try {
      const testKey = '__diagnostic_test__';
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      const ok = retrieved === 'test';
      updateCheck('storage-available', { result: ok ? 'Fully functional' : 'Read/write issue', status: ok ? 'success' : 'error' });
    } catch (e) {
      updateCheck('storage-available', { result: 'Error', errorDetails: (e as Error).message, status: 'error' });
    }

    try {
      let raw = localStorage.getItem('mossy_knowledge_vault');
      if (!raw) {
        localStorage.setItem('mossy_knowledge_vault', JSON.stringify([]));
        raw = JSON.stringify([]);
      }
      const parsed = raw ? JSON.parse(raw) : null;
      const count = Array.isArray(parsed) ? parsed.length : 0;
      updateCheck('knowledge-vault', { result: `Loaded (${count} items)`, status: 'success' });
    } catch (e) {
      updateCheck('knowledge-vault', { result: 'Unreadable', errorDetails: (e as Error).message, status: 'error' });
    }

    try {
      let raw = localStorage.getItem('mossy_install_wizard_state_v1');
      if (!raw) {
        const defaultState = { topic: 'xedit', checked: {}, modManager: 'mo2' };
        localStorage.setItem('mossy_install_wizard_state_v1', JSON.stringify(defaultState));
        raw = JSON.stringify(defaultState);
      }
      const parsed = raw ? JSON.parse(raw) : null;
      const topic = parsed?.topic ? String(parsed.topic) : '';
      const checkedCount = parsed?.checked && typeof parsed.checked === 'object' ? Object.keys(parsed.checked).length : 0;
      updateCheck('install-wizard-state', { result: `Loaded (topic=${topic || 'unknown'}, ${checkedCount} marks)`, status: 'success' });
    } catch (e) {
      updateCheck('install-wizard-state', { result: 'Unreadable', errorDetails: (e as Error).message, status: 'error' });
    }

    // Microphone permission
    try {
      const perms: any = (navigator as any).permissions;
      if (!perms?.query) {
        updateCheck('microphone-permission', { result: 'permissions API not supported', status: 'error' });
      } else {
        const status = await perms.query({ name: 'microphone' });
        const state = String(status?.state || 'unknown');
        updateCheck('microphone-permission', { result: state, status: state === 'granted' ? 'success' : 'error' });
      }
    } catch (e) {
      updateCheck('microphone-permission', { result: 'Error', errorDetails: (e as Error).message, status: 'error' });
    }

    // TTS voices - fixed to use setChecks directly to avoid stale closure
    try {
      const synth = (window as any).speechSynthesis;
      if (!synth?.getVoices) {
        updateCheck('tts-voices', { result: 'speechSynthesis not supported', status: 'error' });
      } else {
        const voices = synth.getVoices();
        const count = Array.isArray(voices) ? voices.length : 0;
        if (count > 0) {
          updateCheck('tts-voices', { result: `Available (${count})`, status: 'success' });
        } else {
          const onVoicesChanged = () => {
            const v = synth.getVoices();
            const c = Array.isArray(v) ? v.length : 0;
            updateCheck('tts-voices', { result: c > 0 ? `Available (${c})` : 'No voices loaded (refresh page)', status: c > 0 ? 'success' : 'error' });
            synth.removeEventListener('voiceschanged', onVoicesChanged);
          };
          synth.addEventListener('voiceschanged', onVoicesChanged);
          setTimeout(() => {
            const v2 = synth.getVoices();
            const c2 = Array.isArray(v2) ? v2.length : 0;
            updateCheck('tts-voices', { result: c2 > 0 ? `Available (${c2})` : 'No voices loaded (refresh page)', status: c2 > 0 ? 'success' : 'error' });
            synth.removeEventListener('voiceschanged', onVoicesChanged);
          }, 1200);
        }
      }
    } catch (e) {
      updateCheck('tts-voices', { result: 'Error', errorDetails: (e as Error).message, status: 'error' });
    }

    // Secret status
    try {
      if (typeof api?.getSecretStatus !== 'function') {
        updateCheck('secret-status', { result: 'API not available', status: 'error' });
      } else {
        const status = await api.getSecretStatus();
        if (!status?.ok) {
          updateCheck('secret-status', {
            result: 'Error',
            errorDetails: String(status?.error || 'Unknown error'),
            status: 'error',
          });
        } else {
          const flags = [
            `backend=${status.backendToken ? 'yes' : 'no'}`,
            `openai=${status.openai ? 'yes' : 'no'}`,
            `groq=${status.groq ? 'yes' : 'no'}`,
          ].join(' | ');
          const anyConfigured = status.backendToken || status.openai || status.groq;
          updateCheck('secret-status', { result: flags, status: anyConfigured ? 'success' : 'error' });
        }
      }
    } catch (e) {
      updateCheck('secret-status', { result: 'Error', errorDetails: (e as Error).message, status: 'error' });
    }

    // --- FO4 ENVIRONMENT CHECKS ---

    // FO4 path, xEdit, F4SE, Creation Kit - all from settings
    try {
      if (typeof api?.getSettings === 'function') {
        const s = await api.getSettings();

        // FO4 game path
        const fo4Path = s?.fo4Path || s?.fallout4Path || s?.fo4GamePath || '';
        if (fo4Path) {
          const leaf = fo4Path.split(/[/\\]/).filter(Boolean).pop() || fo4Path;
          updateCheck('fo4-path', { result: `Configured: ...${leaf}`, status: 'success' });
        } else {
          updateCheck('fo4-path', { result: 'Not configured — set in Settings > Paths', status: 'error' });
        }

        // xEdit path
        const xeditPath = s?.xeditPath || '';
        if (xeditPath) {
          const leaf = xeditPath.split(/[/\\]/).filter(Boolean).pop() || xeditPath;
          updateCheck('xedit-path', { result: `Configured: ${leaf}`, status: 'success' });
        } else {
          updateCheck('xedit-path', { result: 'Not configured — set in Tool Verify', status: 'warning' });
        }

        // F4SE path
        const f4sePath = s?.f4sePath || s?.f4seLoaderPath || '';
        if (f4sePath) {
          const leaf = f4sePath.split(/[/\\]/).filter(Boolean).pop() || f4sePath;
          updateCheck('f4se-check', { result: `Configured: ${leaf}`, status: 'success' });
        } else {
          updateCheck('f4se-check', { result: 'Not configured', status: 'warning' });
        }

        // Creation Kit path
        const ckPath = s?.creationKitPath || s?.ckPath || '';
        if (ckPath) {
          const leaf = ckPath.split(/[/\\]/).filter(Boolean).pop() || ckPath;
          updateCheck('creation-kit-check', { result: `Configured: ${leaf}`, status: 'success' });
        } else {
          updateCheck('creation-kit-check', { result: 'Not configured — set in Tool Verify', status: 'warning' });
        }

      } else {
        ['fo4-path', 'xedit-path', 'f4se-check', 'creation-kit-check'].forEach(id => {
          updateCheck(id, { result: 'Electron API unavailable', status: 'error' });
        });
      }
    } catch (e) {
      ['fo4-path', 'xedit-path', 'f4se-check', 'creation-kit-check'].forEach(id => {
        updateCheck(id, { result: 'Error reading settings', errorDetails: (e as Error).message, status: 'error' });
      });
    }

    // Ollama check — route through Electron IPC so the fetch stays in the main process
    // and never appears as a DevTools network error in the renderer.
    try {
      const api = (window as any).electron?.api;
      if (api?.ml?.getOllamaStatus) {
        const status = await api.ml.getOllamaStatus();
        if (status?.online) {
          const modelCount = typeof status.modelCount === 'number' ? status.modelCount : (Array.isArray(status.models) ? status.models.length : 0);
          updateCheck('ollama-check', { result: `Running — ${modelCount} model${modelCount !== 1 ? 's' : ''} available`, status: 'success' });
        } else {
          updateCheck('ollama-check', { result: 'Not running (Ollama offline)', status: 'error' });
        }
      } else {
        // No IPC available — fall back to direct fetch (dev mode / web build)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch('http://127.0.0.1:11434/api/tags', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          const modelCount = Array.isArray(data?.models) ? data.models.length : 0;
          updateCheck('ollama-check', { result: `Running — ${modelCount} model${modelCount !== 1 ? 's' : ''} available`, status: 'success' });
        } else {
          updateCheck('ollama-check', { result: `Responded with HTTP ${resp.status}`, status: 'error' });
        }
      }
    } catch {
      updateCheck('ollama-check', { result: 'Not running (localhost:11434 unreachable)', status: 'error' });
    }

    toast.success('Diagnostics complete');
  };

  useEffect(() => {
    runDiagnostics().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testDetectPrograms = async () => {
    setIsRunningTest(true);
    setTestOutput('Testing detectPrograms()...\n');

    try {
      const api = (window as any).electron?.api || (window as any).electronAPI;

      if (!api?.detectPrograms) {
        setTestOutput(prev => prev + '\nERROR: detectPrograms function not found\n');
        setIsRunningTest(false);
        return;
      }

      setTestOutput(prev => prev + 'Function found\n');
      setTestOutput(prev => prev + 'Calling detectPrograms()...\n');

      const result = await api.detectPrograms();

      if (!result) {
        setTestOutput(prev => prev + 'ERROR: detectPrograms returned null/undefined\n');
        setIsRunningTest(false);
        return;
      }

      if (!Array.isArray(result)) {
        setTestOutput(prev => prev + `WARNING: Result is not an array, got ${typeof result}\n`);
        setIsRunningTest(false);
        return;
      }

      setTestOutput(prev => prev + `detectPrograms returned ${result.length} programs\n\n`);
      setTestOutput(prev => prev + 'First 10 results:\n');
      setTestOutput(prev => prev + '-'.repeat(60) + '\n');

      result.slice(0, 10).forEach((prog: any, idx: number) => {
        setTestOutput(prev => prev + `${idx + 1}. Name: ${prog.displayName || prog.name}\n`);
        setTestOutput(prev => prev + `   Path: ${prog.path || 'N/A'}\n`);
        if (prog.version) {
          setTestOutput(prev => prev + `   Version: ${prog.version}\n`);
        }
        setTestOutput(prev => prev + '\n');
      });

      setTestOutput(prev => prev + `\nTest completed successfully (${result.length} total programs found)`);
    } catch (e) {
      setTestOutput(prev => prev + `\nERROR: ${(e as Error).message}\n`);
      setTestOutput(prev => prev + `\nStack: ${(e as Error).stack}`);
    }

    setIsRunningTest(false);
  };

  const exportDiagnostics = () => {
    const diagnosticReport = `MOSSY DIAGNOSTIC REPORT
Generated: ${new Date().toISOString()}

=== SYSTEM CHECKS ===
${checks.map(c => `${c.status === 'success' ? 'PASS' : c.status === 'error' ? 'FAIL' : c.status === 'warning' ? 'WARN' : '?'} ${c.name}: ${c.result}${c.errorDetails ? ` (${c.errorDetails})` : ''}`).join('\n')}

=== DETECTION TEST OUTPUT ===
${testOutput || '(No test run yet)'}

=== ENVIRONMENT INFO ===
User Agent: ${navigator.userAgent}
Platform: ${navigator.platform}
Language: ${navigator.language}
LocalStorage Enabled: ${testLocalStorage()}

=== API AVAILABILITY ===
window.electron exists: ${!!(window as any).electron}
window.electronAPI exists: ${!!(window as any).electronAPI}
electron.api exists: ${!!(window as any).electron?.api}

=== DETECTED APIS ===
${listAvailableAPIs()}
`;

    const blob = new Blob([diagnosticReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mossy-diagnostics-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const redactSecretsDeep = (value: unknown): unknown => {
    const redactKey = (key: string) => /(api[_-]?key|token|secret|password|bearer|authorization)/i.test(key);
    if (Array.isArray(value)) return value.map(redactSecretsDeep);
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = redactKey(k) ? 'REDACTED' : redactSecretsDeep(v);
      }
      return out;
    }
    return value;
  };

  const downloadTextFallback = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportDiagnosticsSnapshot = async () => {
    setSnapshotStatus('Building snapshot...');
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI;
      const [systemInfo, performance, settings] = await Promise.all([
        typeof api?.getSystemInfo === 'function' ? api.getSystemInfo().catch(() => null) : Promise.resolve(null),
        typeof api?.getPerformance === 'function' ? api.getPerformance().catch(() => null) : Promise.resolve(null),
        typeof api?.getSettings === 'function' ? api.getSettings().catch(() => null) : Promise.resolve(null),
      ]);

      let errorLogs: unknown[] = [];
      try {
        const raw = localStorage.getItem('mossy_error_logs');
        const parsed = raw ? JSON.parse(raw) : [];
        errorLogs = Array.isArray(parsed) ? parsed : [];
      } catch {
        errorLogs = [];
      }

      const snapshot = {
        generatedAt: new Date().toISOString(),
        app: {
          isElectron: !!api,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          localStorageEnabled: testLocalStorage(),
        },
        checks: checks.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          result: c.result,
          errorDetails: c.errorDetails || '',
        })),
        testOutput: testOutput || '',
        availableApis: listAvailableAPIs(),
        systemInfo,
        performance,
        settings: settings ? redactSecretsDeep(settings) : null,
        errorLogs,
      };

      const json = JSON.stringify(snapshot, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `mossy-diagnostics-snapshot-${timestamp}.json`;

      if (typeof api?.saveFile === 'function') {
        setSnapshotStatus('Waiting for save location...');
        const savedTo = await api.saveFile(json, filename);
        setSnapshotStatus(savedTo ? `Saved: ${savedTo}` : 'Canceled');
      } else {
        downloadTextFallback(json, filename, 'application/json');
        setSnapshotStatus('Downloaded');
      }
    } catch (e) {
      setSnapshotStatus(`Export failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const testLocalStorage = (): boolean => {
    try {
      localStorage.setItem('__test__', 'test');
      localStorage.removeItem('__test__');
      return true;
    } catch {
      return false;
    }
  };

  const listAvailableAPIs = (): string => {
    const api = (window as any).electron?.api || (window as any).electronAPI || {};
    return Object.keys(api).map(key => `- ${key}: ${typeof api[key]}`).join('\n');
  };

  const revealSettingsFile = async () => {
    setRevealStatus('Opening settings file...');
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI;
      if (!api?.revealSettingsFile) {
        setRevealStatus('Not available in this build');
        return;
      }
      const result = await api.revealSettingsFile();
      if (result?.success) {
        setRevealStatus('Opened in file explorer');
      } else {
        setRevealStatus(result?.error ? `Failed: ${result.error}` : 'Failed to open settings file');
      }
    } catch (e) {
      setRevealStatus(e instanceof Error ? `Failed: ${e.message}` : 'Failed to open settings file');
    }
  };

  const statusIcon = (status: DiagnosticCheck['status']) => {
    if (status === 'idle') return <div className="w-5 h-5 rounded-full bg-slate-600" />;
    if (status === 'checking') return <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />;
    if (status === 'success') return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    if (status === 'warning') return <AlertCircle className="w-5 h-5 text-amber-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const containerClassName = embedded ? 'bg-slate-950 p-4' : 'min-h-screen bg-slate-950 p-8 pb-20';

  // Group checks
  const coreChecks = checks.filter(c => !['fo4-path','xedit-path','f4se-check','creation-kit-check','ollama-check'].includes(c.id));
  const fo4Checks = checks.filter(c => ['fo4-path','xedit-path','f4se-check','creation-kit-check','ollama-check'].includes(c.id));

  return (
    <div className={containerClassName}>
      <div className="max-w-4xl mx-auto">
        {!embedded && (
          <div className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-cyan-400" />
                <h1 className="text-4xl font-bold text-white">Diagnostic Tools</h1>
              </div>
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded bg-cyan-900/20 border border-cyan-500/30 text-cyan-100 hover:bg-cyan-900/30 transition-colors"
                title="Open help"
              >
                Help
              </Link>
            </div>
            <p className="text-slate-400">
              Run system diagnostics to check if all Mossy APIs are properly configured, plus verify your FO4 modding environment. Use this to troubleshoot issues.
            </p>
          </div>
        )}

        <ToolsInstallVerifyPanel
          accentClassName="text-cyan-300"
          description="This page validates what the app can see (desktop bridge APIs, storage, mic permissions, cached vault state, and your FO4 tool configuration)."
          verify={[
            'Click "Run All Checks" and confirm each check resolves (no endless "Checking").',
            'FO4 Environment checks may show warnings if paths are not set — configure them in Tool Verify.',
            'Confirm Ollama is running if you use local AI features.'
          ]}
          firstTestLoop={[
            'Run Diagnostics once right after launch (baseline).',
            'Open Tool Verify and set your FO4/xEdit/F4SE paths, then re-run Diagnostics.',
            'If Ollama check fails, start Ollama and re-run.'
          ]}
          troubleshooting={[
            'If Electron API is missing, you are likely running a web preview; use the packaged Electron build for bridge features.',
            'If localStorage fails, disable strict privacy modes/extensions that block storage and reload.'
          ]}
        />

        {/* Core System Checks */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mb-8">
          <div className="bg-slate-800 border-b border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white">Core System Checks</h2>
            <p className="text-slate-400 text-sm mt-2">Verify that all required APIs and storage are available</p>
          </div>
          <div className="p-6 space-y-3">
            {coreChecks.map(check => (
              <div key={check.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="pt-1">{statusIcon(check.status)}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{check.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{check.description}</p>
                    {check.result && (
                      <p className={`text-sm mt-2 font-mono ${check.status === 'success' ? 'text-emerald-300' : check.status === 'warning' ? 'text-amber-300' : 'text-red-300'}`}>
                        {check.result}
                      </p>
                    )}
                    {check.errorDetails && (
                      <p className="text-xs text-red-400 mt-2">{check.errorDetails}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FO4 Environment Checks */}
        <div className="bg-slate-900 border border-orange-800/40 rounded-xl overflow-hidden mb-8">
          <div className="bg-slate-800/70 border-b border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white">FO4 Modding Environment</h2>
            <p className="text-slate-400 text-sm mt-2">Verify Fallout 4 tools, paths, and local AI are configured correctly</p>
          </div>
          <div className="p-6 space-y-3">
            {fo4Checks.map(check => (
              <div key={check.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="pt-1">{statusIcon(check.status)}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{check.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{check.description}</p>
                    {check.result && (
                      <p className={`text-sm mt-2 font-mono ${check.status === 'success' ? 'text-emerald-300' : check.status === 'warning' ? 'text-amber-300' : 'text-red-300'}`}>
                        {check.result}
                      </p>
                    )}
                    {check.errorDetails && (
                      <p className="text-xs text-red-400 mt-2">{check.errorDetails}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Run All Checks button */}
        <div className="mb-8">
          <button
            onClick={runDiagnostics}
            className="w-full px-4 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run All Checks
          </button>
        </div>

        {/* Secrets Helper */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mb-8">
          <div className="bg-slate-800 border-b border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white">Secrets Helper</h2>
            <p className="text-slate-400 text-sm mt-2">Quick links to confirm backend tokens and stored settings.</p>
          </div>
          <div className="p-6 space-y-3">
            <button
              onClick={revealSettingsFile}
              className="w-full px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
            >
              Reveal settings.json
            </button>
            {revealStatus && (
              <div className="text-sm text-slate-300">{revealStatus}</div>
            )}
            <button
              onClick={() => {
                try { window.location.href = '/settings/privacy'; } catch { /* ignore */ }
              }}
              className="w-full px-4 py-3 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold transition-colors"
            >
              Open Privacy Settings (Backend Token)
            </button>
          </div>
        </div>

        {/* Detection Test */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mb-8">
          <div className="bg-slate-800 border-b border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white">Detection Test</h2>
            <p className="text-slate-400 text-sm mt-2">Attempt to detect installed programs and show raw results</p>
          </div>
          <div className="p-6 space-y-4">
            <button
              onClick={testDetectPrograms}
              disabled={isRunningTest}
              className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              {isRunningTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Detection...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Test detectPrograms()
                </>
              )}
            </button>

            {testOutput && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-white text-sm">Test Output:</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(testOutput);
                      toast.success('Output copied to clipboard');
                    }}
                    className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <pre className="text-xs text-slate-300 overflow-auto max-h-64 bg-slate-900/50 rounded p-3 whitespace-pre-wrap break-words">
                  {testOutput}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Export */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="bg-slate-800 border-b border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white">Export Diagnostics</h2>
            <p className="text-slate-400 text-sm mt-2">Download a complete diagnostic report to share with support</p>
          </div>
          <div className="p-6 space-y-3">
            <button
              onClick={() => {
                const api = (window as any).electron?.api || (window as any).electronAPI;
                if (api?.openDevTools) {
                  api.openDevTools();
                } else if ((window as any).electron?.webContents?.openDevTools) {
                  (window as any).electron.webContents.openDevTools();
                } else {
                  toast.error('Dev tools not available. Try pressing F12 or check if you are running the desktop app.');
                }
              }}
              className="w-full px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              Open Developer Tools
            </button>

            <button
              onClick={() => exportDiagnosticsSnapshot().catch(() => {})}
              className="w-full px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Export Diagnostics Snapshot (JSON)
            </button>

            {snapshotStatus && (
              <p className="text-xs text-slate-400 mt-2 font-mono break-words">{snapshotStatus}</p>
            )}

            <div className="h-px bg-slate-700 my-4" />

            <button
              onClick={exportDiagnostics}
              className="w-full px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Export Full Diagnostic Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticTools;
