import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, XCircle, Loader2, Play, Copy, ArrowDownToLine } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

interface DiagnosticCheck {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'checking' | 'success' | 'error';
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
    }
  ]);

  const [testOutput, setTestOutput] = useState<string>('');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [snapshotStatus, setSnapshotStatus] = useState<string>('');
  const [revealStatus, setRevealStatus] = useState<string>('');

  const runDiagnostics = async () => {
    const updatedChecks: DiagnosticCheck[] = checks.map(c => ({ ...c, status: 'checking', result: '', errorDetails: '' }));

    const setCheck = (id: string, patch: Partial<DiagnosticCheck>) => {
      const idx = updatedChecks.findIndex(c => c.id === id);
      if (idx === -1) return;
      updatedChecks[idx] = { ...updatedChecks[idx], ...patch };
    };

    setChecks(updatedChecks);

    const api = (window as any).electron?.api || (window as any).electronAPI;
    const hasElectronApi = !!api;
    setCheck('electron-api', { result: hasElectronApi ? 'Available' : 'Not Available', status: hasElectronApi ? 'success' : 'error' });

    const detectPrograms = typeof api?.detectPrograms === 'function' ? api.detectPrograms : null;
    setCheck('detect-programs', { result: detectPrograms ? 'Function exists and callable' : 'Function not found', status: detectPrograms ? 'success' : 'error' });

    const getSystemInfo = typeof api?.getSystemInfo === 'function' ? api.getSystemInfo : null;
    setCheck('get-system-info', { result: getSystemInfo ? 'Function exists and callable' : 'Function not found', status: getSystemInfo ? 'success' : 'error' });

    let bridgeActive = false;
    try {
      bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
    } catch {
      bridgeActive = false;
    }
    setCheck('desktop-bridge', { result: bridgeActive ? 'Active' : 'Inactive', status: bridgeActive ? 'success' : 'error' });

    try {
      const testKey = '__diagnostic_test__';
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      const ok = retrieved === 'test';
      setCheck('storage-available', { result: ok ? 'Fully functional' : 'Read/write issue', status: ok ? 'success' : 'error' });
    } catch (e) {
      setCheck('storage-available', { result: 'Error', errorDetails: (e as Error).message, status: 'error' });
    }

    // Knowledge Vault - initialize if missing
    try {
      let raw = localStorage.getItem('mossy_knowledge_vault');
      if (!raw) {
        // Initialize with empty array
        localStorage.setItem('mossy_knowledge_vault', JSON.stringify([]));
        raw = JSON.stringify([]);
      }
      const parsed = raw ? JSON.parse(raw) : null;
      const count = Array.isArray(parsed) ? parsed.length : 0;
      setCheck('knowledge-vault', { result: `Loaded (${count} items)`, status: 'success' });
    } catch (e) {
      setCheck('knowledge-vault', { result: 'Unreadable', errorDetails: (e as Error).message, status: 'error' });
    }

    // Install Wizard progress - initialize if missing
    try {
      let raw = localStorage.getItem('mossy_install_wizard_state_v1');
      if (!raw) {
        // Initialize with default state
        const defaultState = { topic: 'xedit', checked: {}, modManager: 'mo2' };
        localStorage.setItem('mossy_install_wizard_state_v1', JSON.stringify(defaultState));
        raw = JSON.stringify(defaultState);
      }
      const parsed = raw ? JSON.parse(raw) : null;
      const topic = parsed?.topic ? String(parsed.topic) : '';
      const checkedCount = parsed?.checked && typeof parsed.checked === 'object' ? Object.keys(parsed.checked).length : 0;
      setCheck('install-wizard-state', { result: `Loaded (topic=${topic || 'unknown'}, ${checkedCount} marks)`, status: 'success' });
    } catch (e) {
      setCheck('install-wizard-state', { result: 'Unreadable', errorDetails: (e as Error).message, status: 'error' });
    }

    // Microphone permission (best-effort)
    try {
      const perms: any = (navigator as any).permissions;
      if (!perms?.query) {
        setCheck('microphone-permission', { result: 'permissions API not supported', status: 'error' });
      } else {
        const status = await perms.query({ name: 'microphone' });
        const state = String(status?.state || 'unknown');
        setCheck('microphone-permission', { result: state, status: state === 'granted' ? 'success' : 'error' });
      }
    } catch (e) {
      setCheck('microphone-permission', { result: 'Error', errorDetails: (e as Error).message, status: 'error' });
    }

    // TTS voices - handle async loading
    try {
      const synth = (window as any).speechSynthesis;
      if (!synth?.getVoices) {
        setCheck('tts-voices', { result: 'speechSynthesis not supported', status: 'error' });
      } else {
        // Voices may load asynchronously, so check immediately and also listen for changes
        const checkVoices = () => {
          const voices = synth.getVoices();
          const count = Array.isArray(voices) ? voices.length : 0;
          if (count > 0) {
            setCheck('tts-voices', { result: `Available (${count})`, status: 'success' });
            return true;
          }
          return false;
        };

        // Check immediately
        if (!checkVoices()) {
          // If no voices yet, wait for voiceschanged event or try again after a short delay
          const voicesChangedHandler = () => {
            checkVoices();
            synth.removeEventListener('voiceschanged', voicesChangedHandler);
          };
          synth.addEventListener('voiceschanged', voicesChangedHandler);

          // Also try after a short delay in case voiceschanged doesn't fire
          setTimeout(() => {
            if (!checkVoices()) {
              setCheck('tts-voices', { result: 'No voices loaded yet (refresh page)', status: 'error' });
            }
            synth.removeEventListener('voiceschanged', voicesChangedHandler);
          }, 1000);
        }
      }
    } catch (e) {
      setCheck('tts-voices', { result: 'Error', errorDetails: (e as Error).message, status: 'error' });
    }

    // Secret status (presence-only, main process)
    try {
      if (typeof api?.getSecretStatus !== 'function') {
        setCheck('secret-status', { result: 'API not available', status: 'error' });
      } else {
        const status = await api.getSecretStatus();
        if (!status?.ok) {
          setCheck('secret-status', {
            result: 'Error',
            errorDetails: String(status?.error || 'Unknown error'),
            status: 'error',
          });
        } else {
          const flags = [
            `backend=${status.backendToken ? 'yes' : 'no'}`,
            `openai=${status.openai ? 'yes' : 'no'}`,
            `elevenlabs=${status.elevenlabs ? 'yes' : 'no'}`,
            `groq=${status.groq ? 'yes' : 'no'}`,
          ].join(' | ');
          const anyConfigured = status.backendToken || status.openai || status.elevenlabs || status.groq;
          setCheck('secret-status', { result: flags, status: anyConfigured ? 'success' : 'error' });
        }
      }
    } catch (e) {
      setCheck('secret-status', { result: 'Error', errorDetails: (e as Error).message, status: 'error' });
    }

    setChecks(updatedChecks);
  };

  // Auto-run when opening the page (quick health view)
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
        setTestOutput(prev => prev + '\n❌ ERROR: detectPrograms function not found\n');
        setIsRunningTest(false);
        return;
      }

      setTestOutput(prev => prev + '✓ Function found\n');
      setTestOutput(prev => prev + '⏳ Calling detectPrograms()...\n');

      const result = await api.detectPrograms();

      if (!result) {
        setTestOutput(prev => prev + '❌ ERROR: detectPrograms returned null/undefined\n');
        setIsRunningTest(false);
        return;
      }

      if (!Array.isArray(result)) {
        setTestOutput(prev => prev + `⚠️  WARNING: Result is not an array, got ${typeof result}\n`);
        setIsRunningTest(false);
        return;
      }

      setTestOutput(prev => prev + `✓ detectPrograms returned ${result.length} programs\n\n`);
      setTestOutput(prev => prev + 'First 10 results:\n');
      setTestOutput(prev => prev + '─'.repeat(60) + '\n');

      result.slice(0, 10).forEach((prog: any, idx: number) => {
        setTestOutput(prev => prev + `${idx + 1}. Name: ${prog.displayName || prog.name}\n`);
        setTestOutput(prev => prev + `   Path: ${prog.path || 'N/A'}\n`);
        if (prog.version) {
          setTestOutput(prev => prev + `   Version: ${prog.version}\n`);
        }
        setTestOutput(prev => prev + '\n');
      });

      setTestOutput(prev => prev + `\n✓ Test completed successfully (${result.length} total programs found)`);
    } catch (e) {
      setTestOutput(prev => prev + `\n❌ ERROR: ${(e as Error).message}\n`);
      setTestOutput(prev => prev + `\nStack: ${(e as Error).stack}`);
    }

    setIsRunningTest(false);
  };

  const exportDiagnostics = () => {
    const diagnosticReport = `MOSSY DIAGNOSTIC REPORT
Generated: ${new Date().toISOString()}

=== SYSTEM CHECKS ===
${checks.map(c => `${c.status === 'success' ? '✓' : c.status === 'error' ? '✗' : '?'} ${c.name}: ${c.result}${c.errorDetails ? ` (${c.errorDetails})` : ''}`).join('\n')}

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
electronAPI exists: ${!!(window as any).electronAPI}

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

    if (Array.isArray(value)) {
      return value.map(redactSecretsDeep);
    }

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
          description: c.description,
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

  const containerClassName = embedded ? 'bg-slate-950 p-4' : 'min-h-screen bg-slate-950 p-8 pb-20';

  return (
    <div className={containerClassName}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
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
              Run system diagnostics to check if all Mossy APIs are properly configured. Use this to troubleshoot issues.
            </p>
          </div>
        )}

        <ToolsInstallVerifyPanel
          accentClassName="text-cyan-300"
          description="This page validates what the app can see (desktop bridge APIs, storage, mic permissions, and cached vault state)."
          verify={[
            'Click “Run Diagnostics” and confirm each check resolves to Success/Error (no endless “Checking…”).',
            'If using the desktop app, confirm Electron API checks show Success.',
            'Copy the available API list and confirm it includes the functions you expect for your workflow.'
          ]}
          firstTestLoop={[
            'Run Diagnostics once right after launch (baseline).',
            'Open Desktop Bridge and Tools Settings, then return and re-run Diagnostics.',
            'If you are troubleshooting voice, confirm mic permission and TTS voice availability checks.'
          ]}
          troubleshooting={[
            'If Electron API is missing, you are likely running a web preview; use the packaged Electron build for bridge features.',
            'If localStorage fails, disable strict privacy modes/extensions that block storage and reload.'
          ]}
        />

        {/* System Checks */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mb-8">
          <div className="bg-slate-800 border-b border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white">System Checks</h2>
            <p className="text-slate-400 text-sm mt-2">Verify that all required APIs are available</p>
          </div>

          <div className="p-6 space-y-4">
            {checks.map(check => (
              <div key={check.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    {check.status === 'idle' && <div className="w-5 h-5 rounded-full bg-slate-600" />}
                    {check.status === 'checking' && <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />}
                    {check.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {check.status === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-white">{check.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{check.description}</p>
                    {check.result && (
                      <p className={`text-sm mt-2 font-mono ${check.status === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
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

            <button
              onClick={runDiagnostics}
              className="w-full px-4 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-colors flex items-center justify-center gap-2 mt-6"
            >
              <Play className="w-4 h-4" />
              Run All Checks
            </button>
          </div>
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
                try {
                  window.location.href = '/settings/privacy';
                } catch {
                  // ignore
                }
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
            <p className="text-slate-400 text-sm mt-2">Attempt to detect installed programs and show results</p>
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
                      alert('Output copied to clipboard');
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

          <div className="p-6">
            <button
              onClick={() => {
                const api = (window as any).electron?.api || (window as any).electronAPI;
                if (api?.openDevTools) {
                  api.openDevTools();
                } else {
                  // Fallback: try to open dev tools directly
                  if ((window as any).electron?.webContents?.openDevTools) {
                    (window as any).electron.webContents.openDevTools();
                  } else {
                    alert('Dev tools not available. Try pressing F12 or check if you are running the desktop app.');
                  }
                }
              }}
              className="w-full px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors flex items-center justify-center gap-2 mb-4"
            >
              🔧 Open Developer Tools
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
