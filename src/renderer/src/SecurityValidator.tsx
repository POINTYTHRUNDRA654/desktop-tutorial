import React, { useEffect, useState, useRef } from 'react';

// prefer preload API when available, otherwise fall back to in-memory engine for dev
let bridge: any = (window as any).electron?.api || (window as any).electronAPI;
try {
  if (!bridge || !bridge.security) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const local = require('../../mining/securityValidator');
    bridge = bridge || { security: local.securityValidator || local.default };
  }
} catch (err) {
  // ignore; UI will still render but actions will fail gracefully
}

const LOCAL_QUARANTINE_KEY = 'security:quarantine';
const LOCAL_WHITELIST_KEY = 'security:whitelist';

function readLocal(key: string, fallback: any) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

const SecurityValidator: React.FC = () => {
  const [path, setPath] = useState('');
  const [code, setCode] = useState('Event OnUpdate()\nEndEvent');
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [lastReport, setLastReport] = useState<any>(null);
  const [quarantine, setQuarantine] = useState<string[]>(() => readLocal(LOCAL_QUARANTINE_KEY, []));
  const [whitelist, setWhitelist] = useState<string[]>(() => readLocal(LOCAL_WHITELIST_KEY, []));
  const [autoScanOnDownload, setAutoScanOnDownload] = useState(false);
  const progressRef = useRef<number>(0);
  const progressTimer = useRef<number | null>(null);

  useEffect(() => {
    const onAutoScan = (e: any) => {
      if (!autoScanOnDownload) return;
      const file = e?.detail?.filePath;
      if (file) doScanFile(file);
    };
    window.addEventListener('security:auto-scan-download', onAutoScan as any);
    return () => window.removeEventListener('security:auto-scan-download', onAutoScan as any);
  }, [autoScanOnDownload]);

  useEffect(() => {
    localStorage.setItem(LOCAL_QUARANTINE_KEY, JSON.stringify(quarantine));
  }, [quarantine]);

  useEffect(() => {
    localStorage.setItem(LOCAL_WHITELIST_KEY, JSON.stringify(whitelist));
  }, [whitelist]);

  const startProgress = () => {
    setProgress(5);
    progressRef.current = 5;
    if (progressTimer.current) window.clearInterval(progressTimer.current);
    progressTimer.current = window.setInterval(() => {
      progressRef.current = Math.min(98, progressRef.current + Math.random() * 8);
      setProgress(Math.floor(progressRef.current));
    }, 250) as unknown as number;
  };

  const stopProgress = () => {
    if (progressTimer.current) { window.clearInterval(progressTimer.current); progressTimer.current = null; }
    setProgress(100);
    setTimeout(() => setProgress(0), 400);
  };

  const doScanFile = async (p?: string) => {
    const target = p || path;
    if (!target) return alert('Provide a file path');
    if (whitelist.includes(target)) return setLastReport({ info: 'Whitelisted — skipped' });

    setScanning(true);
    startProgress();
    try {
      const res = await bridge.security.scanFile(target);
      setLastReport({ type: 'file', path: target, result: res });
    } catch (err) {
      setLastReport({ error: String(err) });
    }
    stopProgress();
    setScanning(false);
  };

  const doScanArchive = async () => {
    if (!path) return alert('Provide archive path');
    setScanning(true); startProgress();
    try {
      const res = await bridge.security.scanArchive(path);
      setLastReport({ type: 'archive', path, result: res });
    } catch (err) { setLastReport({ error: String(err) }); }
    stopProgress(); setScanning(false);
  };

  const doScanScript = async () => {
    if (!path) return alert('Provide script path');
    setScanning(true); startProgress();
    try {
      const res = await bridge.security.scanScript(path);
      setLastReport({ type: 'script', path, result: res });
    } catch (err) { setLastReport({ error: String(err) }); }
    stopProgress(); setScanning(false);
  };

  const analyzeCode = async () => {
    setScanning(true); startProgress();
    try {
      const res = await bridge.security.analyzePapyrusScript(code);
      setLastReport({ type: 'analysis', result: res });
    } catch (err) { setLastReport({ error: String(err) }); }
    stopProgress(); setScanning(false);
  };

  const generateReportFile = async () => {
    if (!lastReport) return alert('No report to export');
    const filename = `security-report-${Date.now()}.json`;
    try {
      await bridge.saveFile(JSON.stringify(lastReport, null, 2), filename);
      alert(`Report saved: ${filename}`);
    } catch (err) { alert('Failed to save report'); }
  };

  const quarantineItem = (p: string) => {
    if (!quarantine.includes(p)) setQuarantine(s => [p, ...s]);
  };
  const restoreItem = (p: string) => setQuarantine(s => s.filter(x => x !== p));
  const addWhitelist = (p: string) => { if (!whitelist.includes(p)) setWhitelist(s => [p, ...s]); };
  const removeWhitelist = (p: string) => setWhitelist(s => s.filter(x => x !== p));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    const first = files[0].path || (files[0] as any).name;
    setPath(first);
    doScanFile(first);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  return (
    <div className="p-6 min-h-full bg-[#07100a] text-slate-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Security Validator</h1>
          <div className="flex items-center gap-4">
            <label className="text-xs text-slate-400 flex items-center gap-2"><input type="checkbox" checked={autoScanOnDownload} onChange={e=>setAutoScanOnDownload(e.target.checked)} /> Auto-scan on download</label>
            <button className="px-3 py-2 bg-emerald-700/10 rounded text-sm" onClick={() => bridge.security.updateThreatDatabase?.() && alert('Threat DB update requested')}>Update DB</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 bg-[#08120c] border border-slate-800 rounded" onDrop={onDrop} onDragOver={onDragOver}>
            <label className="text-sm text-slate-300">File / Folder / Script (drag & drop supported)</label>
            <input className="w-full mt-2 p-2 bg-black/10 border border-slate-800 rounded text-sm" value={path} onChange={e => setPath(e.target.value)} placeholder="C:/path/to/file or folder" />

            <div className="mt-4 flex gap-2">
              <button className="px-3 py-2 bg-emerald-700/10 rounded text-sm" onClick={() => doScanFile()} disabled={scanning}>Scan File</button>
              <button className="px-3 py-2 bg-purple-700/10 rounded text-sm" onClick={doScanArchive} disabled={scanning}>Scan Archive</button>
              <button className="px-3 py-2 bg-amber-700/10 rounded text-sm" onClick={doScanScript} disabled={scanning}>Scan Script</button>
            </div>

            <div className="mt-4">
              <div className="h-2 bg-slate-800 rounded overflow-hidden">
                <div style={{ width: `${progress}%` }} className="h-2 bg-emerald-500 transition-all" />
              </div>
              <div className="mt-2 text-xs text-slate-500">{scanning ? `Scanning (${progress}%)` : 'Idle'}</div>
            </div>

            <div className="mt-6">
              <button className="px-3 py-2 bg-sky-700/10 rounded text-sm" onClick={generateReportFile} disabled={!lastReport}>Export Report</button>
            </div>
          </div>

          <div className="p-4 bg-[#08120c] border border-slate-800 rounded">
            <label className="text-sm text-slate-300">Papyrus / Script Analyzer</label>
            <textarea className="w-full mt-2 p-2 bg-black/10 border border-slate-800 rounded text-sm h-40" value={code} onChange={e => setCode(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <button className="px-3 py-2 bg-emerald-700/10 rounded text-sm" onClick={analyzeCode} disabled={scanning}>Analyze</button>
              <button className="px-3 py-2 bg-slate-700/10 rounded text-sm" onClick={() => setCode('')}>Clear</button>
            </div>

            <div className="mt-6 text-xs text-slate-400">Drag a file onto the left pane to quickly scan. Quarantine or whitelist results below.</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-6">
          <div className="p-4 bg-[#06100a] border border-slate-800 rounded">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Latest Result</div>
            </div>
            <pre className="text-xs text-slate-300 max-h-56 overflow-auto whitespace-pre-wrap">{lastReport ? JSON.stringify(lastReport, null, 2) : 'No result yet'}</pre>
            {lastReport?.result?.threats?.length > 0 && (
              <div className="mt-3">
                <button className="px-3 py-2 bg-rose-700/10 rounded text-sm" onClick={() => quarantineItem(lastReport.path)}>Quarantine</button>
                <button className="ml-2 px-3 py-2 bg-slate-700/10 rounded text-sm" onClick={() => addWhitelist(lastReport.path)}>Whitelist</button>
              </div>
            )}
          </div>

          <div className="p-4 bg-[#06100a] border border-slate-800 rounded">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Quarantine</div>
              <div className="text-xs text-slate-500">{quarantine.length} items</div>
            </div>
            {quarantine.length === 0 ? <div className="text-xs text-slate-500">No quarantined items</div> : quarantine.map((q, i) => (
              <div key={i} className="flex items-center justify-between text-sm mb-2">
                <div className="truncate">{q}</div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-slate-700/10 rounded text-xs" onClick={() => restoreItem(q)}>Restore</button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-[#06100a] border border-slate-800 rounded">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Whitelist</div>
              <div className="text-xs text-slate-500">{whitelist.length} items</div>
            </div>
            <div className="mb-3 flex gap-2">
              <input className="flex-1 p-2 bg-black/10 border border-slate-800 rounded text-sm" placeholder="Add path or hash" id="wl-input" />
              <button className="px-3 py-2 bg-purple-700/10 rounded text-sm" onClick={() => { const v = (document.getElementById('wl-input') as HTMLInputElement).value; if (v) addWhitelist(v); (document.getElementById('wl-input') as HTMLInputElement).value=''; }}>Add</button>
            </div>
            {whitelist.length === 0 ? <div className="text-xs text-slate-500">No whitelist entries</div> : whitelist.map((w, i) => (
              <div key={i} className="flex items-center justify-between text-sm mb-2">
                <div className="truncate">{w}</div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-rose-700/10 rounded text-xs" onClick={() => removeWhitelist(w)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityValidator;
