import React, { useState } from 'react';

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

const SecurityPanel: React.FC = () => {
  const [path, setPath] = useState('');
  const [hash, setHash] = useState('');
  const [code, setCode] = useState('Event OnInit()\nEndEvent');
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const scanFile = async () => {
    setLoading(true);
    try {
      const res = await bridge.security.scanFile(path);
      setOutput(res);
    } catch (err) {
      setOutput({ error: String(err) });
    }
    setLoading(false);
  };

  const scanArchive = async () => {
    setLoading(true);
    try {
      const res = await bridge.security.scanArchive(path);
      setOutput(res);
    } catch (err) {
      setOutput({ error: String(err) });
    }
    setLoading(false);
  };

  const scanScript = async () => {
    setLoading(true);
    try {
      const res = await bridge.security.scanScript(path);
      setOutput(res);
    } catch (err) {
      setOutput({ error: String(err) });
    }
    setLoading(false);
  };

  const analyzeCode = async () => {
    setLoading(true);
    try {
      const res = await bridge.security.analyzePapyrusScript(code);
      setOutput(res);
    } catch (err) {
      setOutput({ error: String(err) });
    }
    setLoading(false);
  };

  const generateChecksum = async () => {
    setLoading(true);
    try {
      const res = await bridge.security.generateChecksum(path, 'sha256');
      setOutput({ checksum: res });
    } catch (err) {
      setOutput({ error: String(err) });
    }
    setLoading(false);
  };

  const updateDb = async () => {
    setLoading(true);
    try {
      const res = await bridge.security.updateThreatDatabase();
      setOutput(res);
    } catch (err) {
      setOutput({ error: String(err) });
    }
    setLoading(false);
  };

  const checkDb = async () => {
    setLoading(true);
    try {
      const res = await bridge.security.checkAgainstDatabase(hash);
      setOutput(res);
    } catch (err) {
      setOutput({ error: String(err) });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 min-h-full bg-[#07100a] text-slate-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Security Scanner</h1>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 bg-[#08120c] border border-slate-800 rounded">
            <label className="text-sm text-slate-300">Path / File</label>
            <input className="w-full mt-2 p-2 bg-black/10 border border-slate-800 rounded text-sm" value={path} onChange={e => setPath(e.target.value)} placeholder="C:/path/to/file.dll or script.psc" />

            <div className="mt-4 flex gap-2">
              <button className="px-3 py-2 bg-emerald-700/10 rounded text-sm" onClick={scanFile} disabled={loading || !path}>Scan File</button>
              <button className="px-3 py-2 bg-purple-700/10 rounded text-sm" onClick={scanArchive} disabled={loading || !path}>Scan Archive</button>
              <button className="px-3 py-2 bg-amber-700/10 rounded text-sm" onClick={scanScript} disabled={loading || !path}>Scan Script</button>
            </div>

            <div className="mt-6">
              <label className="text-sm text-slate-300">Checksum</label>
              <div className="flex gap-2 mt-2">
                <input className="flex-1 p-2 bg-black/10 border border-slate-800 rounded text-sm" value={hash} onChange={e => setHash(e.target.value)} placeholder="optional hash to check" />
                <button className="px-3 py-2 bg-sky-700/10 rounded text-sm" onClick={generateChecksum} disabled={!path || loading}>Generate</button>
                <button className="px-3 py-2 bg-sky-700/10 rounded text-sm" onClick={checkDb} disabled={!hash || loading}>Check DB</button>
              </div>
            </div>

            <div className="mt-6">
              <button className="px-3 py-2 bg-rose-700/10 rounded text-sm" onClick={updateDb} disabled={loading}>Update Threat DB</button>
            </div>
          </div>

          <div className="p-4 bg-[#08120c] border border-slate-800 rounded">
            <label className="text-sm text-slate-300">Papyrus / Script Analyzer</label>
            <textarea className="w-full mt-2 p-2 bg-black/10 border border-slate-800 rounded text-sm h-40" value={code} onChange={e => setCode(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <button className="px-3 py-2 bg-emerald-700/10 rounded text-sm" onClick={analyzeCode} disabled={loading}>Analyze Code</button>
              <button className="px-3 py-2 bg-slate-700/10 rounded text-sm" onClick={() => setCode('')}>Clear</button>
            </div>

            <div className="mt-6 text-xs text-slate-400">Note: this panel uses a stubbed security engine for UI/testing. Replace with real scanners before production.</div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-[#06100a] border border-slate-800 rounded">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Result</div>
            <div className="text-xs text-slate-500">{loading ? 'Scanning…' : 'Idle'}</div>
          </div>
          <pre className="text-xs text-slate-300 max-h-96 overflow-auto whitespace-pre-wrap">{output ? JSON.stringify(output, null, 2) : 'No result yet'}</pre>
        </div>
      </div>
    </div>
  );
};

export default SecurityPanel;
