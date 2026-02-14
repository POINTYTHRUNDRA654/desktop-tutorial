import { useEffect, useMemo, useState } from 'react';
import { Play, PlusCircle, Download, RotateCw, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import type {
  TestSuite,
  Test,
  TestResult,
  TestResults,
  BenchmarkResult,
  LoadTimeResult,
  MemoryLeakResult,
} from '../../shared/types';

// Fallback to local in-memory engine when Desktop Bridge / preload API is not present
// (preload may later expose testingSuite methods)
let bridge: any = (window as any).electron?.api || (window as any).electronAPI;
try {
  // prefer bridge when available; otherwise import local engine for UI/demo
  if (!bridge || !bridge.testingSuite) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const local = require('../../mining/testingSuite');
    bridge = bridge || { testingSuite: local.testingSuite || local.default };
  }
} catch (err) {
  // ignore — UI will still try to call methods guarded by runtime checks
}

function fmtMs(ms: number | undefined) {
  if (ms === undefined || ms === null) return '-';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export const TestingSuite: React.FC = () => {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResults | null>>({});
  const [recentRuns, setRecentRuns] = useState<TestResults[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  useEffect(() => {
    // create or load a demo suite on mount
    (async () => {
      try {
        const api = (window as any).electron?.api || (window as any).electronAPI || bridge;
        if (api?.testingSuite?.createTestSuite) {
          const demo = await api.testingSuite.createTestSuite('My Mod', 'unit');
          setSuites([demo]);
          setSelectedSuiteId(demo.id);
        }
      } catch (err) {
        console.warn('Failed to create demo suite', err);
      }
    })();
  }, []);

  const selectedSuite = useMemo(() => suites.find((s) => s.id === selectedSuiteId) || null, [suites, selectedSuiteId]);
  const selectedResults = selectedSuiteId ? results[selectedSuiteId] || null : null;

  const runSuite = async (suiteId?: string) => {
    const id = suiteId || selectedSuiteId;
    if (!id) return;
    setRunning(true);
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI || bridge;
      const res: TestResults = await api.testingSuite.runTests(id);
      setResults((r) => ({ ...r, [id]: res }));
      setRecentRuns((rr) => [res, ...rr].slice(0, 10));
    } catch (err) {
      console.error('Run failed', err);
    }
    setRunning(false);
  };

  const runSelected = async () => {
    if (!selectedSuite || !selectedTestId) return;
    setRunning(true);
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI || bridge;
      const t = selectedSuite.tests.find((x) => x.id === selectedTestId);
      if (!t) return;
      const res: TestResult = await api.testingSuite.runSingleTest(selectedTestId);
      // merge into TestResults
      const prev = results[selectedSuite.id];
      const merged: TestResults = prev
        ? { ...prev, results: prev.results.map((r) => (r.testId === res.testId ? res : r)) }
        : { suiteId: selectedSuite.id, timestamp: Date.now(), duration: res.duration || 0, totalTests: 1, passed: res.status === 'pass' ? 1 : 0, failed: res.status === 'fail' ? 1 : 0, skipped: res.status === 'skip' ? 1 : 0, results: [res], summary: `${res.status === 'pass' ? 1 : 0} passed` };
      setResults((r) => ({ ...r, [selectedSuite.id]: merged }));
    } catch (err) {
      console.error(err);
    }
    setRunning(false);
  };

  const runFailedOnly = async () => {
    if (!selectedSuiteId) return;
    const prev = results[selectedSuiteId];
    if (!prev) return;
    const failed = prev.results.filter((r) => r.status === 'fail' || r.status === 'error');
    setRunning(true);
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI || bridge;
      for (const f of failed) {
        await api.testingSuite.runSingleTest(f.testId);
      }
      // re-run full suite to refresh
      await runSuite(selectedSuiteId);
    } catch (err) {
      console.error(err);
    }
    setRunning(false);
  };

  const exportResults = async (format: 'json' | 'html' | 'csv' | 'xml' = 'json') => {
    if (!selectedResults) return;
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI || bridge;
      const out = await api.testingSuite.exportTestResults(selectedResults, format);
      const blob = new Blob([out], { type: format === 'json' ? 'application/json' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-results.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const createSuite = async () => {
    const name = window.prompt('New suite name', 'New Suite');
    if (!name) return;
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI || bridge;
      const s: TestSuite = await api.testingSuite.createTestSuite(name, 'unit');
      setSuites((st) => [...st, s]);
      setSelectedSuiteId(s.id);
    } catch (err) {
      console.error(err);
    }
  };

  const viewReport = async () => {
    if (!selectedResults) return;
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI || bridge;
      const report = await api.testingSuite.generateTestReport(selectedResults);
      alert(`Report generated: ${report.title}\n${new Date(report.timestamp).toLocaleString()}\n\nSummary: Passed ${report.summary.passed}/${report.summary.totalTests} (${Math.round(report.summary.passRate * 100)}%)`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#111214] text-slate-200 min-h-0">
      <div className="p-4 border-b border-black bg-[#1b1b1d] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Testing & QA Suite</h2>
          <div className="text-xs text-slate-400">Automated testing, benchmarks & regression</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => runSuite()} className="px-3 py-1.5 bg-green-900/30 border border-green-700/40 rounded text-xs flex items-center gap-2"><Play className="w-4 h-4"/> Run Selected</button>
          <button onClick={() => runSuite(selectedSuiteId || undefined)} className="px-3 py-1.5 bg-black/30 border border-slate-700 rounded text-xs flex items-center gap-2"><RotateCw className="w-4 h-4"/> Run All</button>
          <button onClick={createSuite} className="px-3 py-1.5 bg-black/20 border border-slate-700 rounded text-xs flex items-center gap-2"><PlusCircle className="w-4 h-4"/> New Suite</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="w-72 border-r border-slate-800 bg-[#151617] p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <strong className="text-xs uppercase">Test Suites</strong>
            <button className="text-[10px] text-slate-400" onClick={() => exportResults('json')} title="Export last results"><Download className="w-3 h-3 inline-block mr-1"/>Export</button>
          </div>

          {suites.length === 0 ? (
            <div className="text-[12px] text-slate-400">No suites. Create one to get started.</div>
          ) : (
            suites.map((s) => (
              <div key={s.id} className={`p-2 rounded mb-2 cursor-pointer border ${selectedSuiteId === s.id ? 'border-purple-600 bg-purple-900/10' : 'border-slate-800'}`} onClick={() => { setSelectedSuiteId(s.id); setSelectedTestId(null); }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div className="text-sm font-semibold">{s.name}</div>
                  </div>
                  <div className="text-xs text-slate-400">{s.tests.length} tests</div>
                </div>
                <div className="mt-2 text-xs text-slate-400 space-y-1">
                  {s.tests.map((t) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={true} readOnly className="accent-purple-500" onClick={() => {}} />
                        <button className="text-[12px] text-slate-200 text-left" onClick={() => setSelectedTestId(t.id)}>{t.name}</button>
                      </div>
                      <div className="text-[11px] text-slate-400">{t.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          <div className="mt-4 text-[11px] text-slate-400">
            <div className="mb-2">Recent:</div>
            <ul className="space-y-1">
              {recentRuns.length === 0 ? <li className="text-[11px]">- No recent runs</li> : recentRuns.map((r, i) => (
                <li key={i} className="text-[11px]">- Run {i + 1} • {new Date(r.timestamp).toLocaleTimeString()}</li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button className="px-2 py-1 bg-black/20 rounded text-xs" onClick={() => runSuite(selectedSuiteId || undefined)}>Run Selected</button>
              <button className="px-2 py-1 bg-black/20 rounded text-xs" onClick={runFailedOnly}>Run Failed</button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-6 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Test Results</h3>
              <div className="text-xs text-slate-400">Live results and failure analysis</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportResults('json')} className="px-3 py-1.5 bg-black/20 border border-slate-700 rounded text-xs flex items-center gap-2"><FileText className="w-3 h-3"/> Export</button>
              <button onClick={viewReport} className="px-3 py-1.5 bg-purple-900/20 border border-purple-700/40 rounded text-xs">View Report</button>
            </div>
          </div>

          {!selectedSuite && (
            <div className="text-slate-500">Select a test suite on the left to see results.</div>
          )}

          {selectedSuite && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f1112] border border-slate-800 rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">{selectedSuite.name}</div>
                    <div className="text-xs text-slate-400">{selectedSuite.tests.length} tests</div>
                  </div>

                  <div className="space-y-2">
                    {(selectedResults?.results || selectedSuite.tests.map((t) => ({ testId: t.id, testName: t.name, status: 'skip', duration: 0 } as TestResult))).map((r) => (
                      <div key={r.testId} className={`p-2 rounded border ${r.status === 'pass' ? 'border-green-700 bg-green-900/5' : r.status === 'fail' ? 'border-red-700 bg-red-900/5' : 'border-slate-800'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${r.status === 'pass' ? 'bg-green-400' : r.status === 'fail' ? 'bg-red-400' : 'bg-slate-600'}`} />
                            <div className="text-sm font-medium">{r.testName || r.testId}</div>
                          </div>
                          <div className="text-xs text-slate-400">{fmtMs((r as any).duration ?? (r as any).durationMs)}</div>
                        </div>
                        {r.status === 'fail' && (r as any).message && <div className="mt-2 text-[12px] text-red-300">└─ {(r as any).message}</div>}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-xs text-slate-400">
                    <div>Summary: {selectedResults ? `${selectedResults.passed}/${selectedResults.totalTests} tests passed` : '—'}</div>
                    <div>Duration: {selectedResults ? fmtMs(selectedResults.duration) : '—'}</div>
                  </div>
                </div>

                <div className="bg-[#0f1112] border border-slate-800 rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Failed Test Details:</div>
                    <div className="text-xs text-slate-400">{selectedResults ? (selectedResults.failed) : 0} failed</div>
                  </div>

                  {selectedResults && selectedResults.failed > 0 ? (
                    <div className="bg-black/20 border border-slate-800 rounded p-3">
                      {selectedResults.results.filter((r) => r.status === 'fail' || r.status === 'error').map((f) => (
                        <div key={f.testId} className="mb-3">
                          <div className="font-mono text-[12px] text-red-300">{f.testName || f.testId}: {(f as any).message || (f as any).error?.message || 'Failed'}</div>
                          {f.stackTrace && <pre className="text-[11px] text-slate-400 mt-2 rounded bg-black/30 p-2">{f.stackTrace}</pre>}
                        </div>
                      ))}

                      <div className="mt-3 flex gap-2">
                        <button className="px-3 py-1.5 bg-black/20 rounded text-xs">View Log</button>
                        <button className="px-3 py-1.5 bg-yellow-900/20 rounded text-xs">Fix</button>
                        <button className="px-3 py-1.5 bg-green-900/20 rounded text-xs" onClick={() => runSuite(selectedSuiteId || undefined)}>Rerun</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No failing tests in the most recent run.</div>
                  )}

                </div>
              </div>

              <div className="mt-6 p-4 border-t border-slate-800 bg-[#0b0b0c] rounded">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Actions</div>
                  <div className="text-xs text-slate-400">Schedule · Export · CI</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => runSuite(selectedSuiteId || undefined)} className="px-3 py-2 bg-green-700/10 rounded text-sm flex items-center gap-2"><Play className="w-4 h-4"/> Run Selected</button>
                  <button className="px-3 py-2 bg-black/20 rounded text-sm">Schedule Tests</button>
                  <button onClick={viewReport} className="px-3 py-2 bg-purple-900/20 rounded text-sm">View Report</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestingSuite;
