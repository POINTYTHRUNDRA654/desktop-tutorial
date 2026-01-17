import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, XCircle, Loader2, Play, Copy, Download } from 'lucide-react';

interface DiagnosticCheck {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'checking' | 'success' | 'error';
  result: string;
  errorDetails?: string;
}

const DiagnosticTools: React.FC = () => {
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
    }
  ]);

  const [testOutput, setTestOutput] = useState<string>('');
  const [isRunningTest, setIsRunningTest] = useState(false);

  const runDiagnostics = async () => {
    const updatedChecks = checks.map(c => ({ ...c, status: 'checking' as const, result: '', errorDetails: '' }));
    setChecks(updatedChecks);

    // Check Electron API
    updatedChecks[0].status = 'success';
    const hasElectronApi = !!(window as any).electron?.api || !!(window as any).electronAPI;
    updatedChecks[0].result = hasElectronApi ? 'Available' : 'Not Available';
    updatedChecks[0].status = hasElectronApi ? 'success' : 'error';

    // Check detectPrograms
    updatedChecks[1].status = 'checking';
    const detectPrograms = typeof (window as any).electron?.api?.detectPrograms === 'function' 
      ? (window as any).electron.api.detectPrograms
      : typeof (window as any).electronAPI?.detectPrograms === 'function'
      ? (window as any).electronAPI.detectPrograms
      : null;
    
    updatedChecks[1].result = detectPrograms ? 'Function exists and callable' : 'Function not found';
    updatedChecks[1].status = detectPrograms ? 'success' : 'error';

    // Check getSystemInfo
    updatedChecks[2].status = 'checking';
    const getSystemInfo = typeof (window as any).electron?.api?.getSystemInfo === 'function'
      ? (window as any).electron.api.getSystemInfo
      : typeof (window as any).electronAPI?.getSystemInfo === 'function'
      ? (window as any).electronAPI.getSystemInfo
      : null;

    updatedChecks[2].result = getSystemInfo ? 'Function exists and callable' : 'Function not found';
    updatedChecks[2].status = getSystemInfo ? 'success' : 'error';

    // Check Desktop Bridge
    updatedChecks[3].status = 'checking';
    const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
    updatedChecks[3].result = bridgeActive ? 'Active' : 'Inactive';
    updatedChecks[3].status = bridgeActive ? 'success' : 'error';

    // Check localStorage
    updatedChecks[4].status = 'checking';
    try {
      const testKey = '__diagnostic_test__';
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      updatedChecks[4].result = retrieved === 'test' ? 'Fully functional' : 'Read/write issue';
      updatedChecks[4].status = retrieved === 'test' ? 'success' : 'error';
    } catch (e) {
      updatedChecks[4].result = 'Error';
      updatedChecks[4].errorDetails = (e as Error).message;
      updatedChecks[4].status = 'error';
    }

    setChecks(updatedChecks);
  };

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

  return (
    <div className="min-h-screen bg-slate-950 p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl font-bold text-white">Diagnostic Tools</h1>
          </div>
          <p className="text-slate-400">
            Run system diagnostics to check if all Mossy APIs are properly configured. Use this to troubleshoot issues.
          </p>
        </div>

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
              onClick={exportDiagnostics}
              className="w-full px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Full Diagnostic Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticTools;
