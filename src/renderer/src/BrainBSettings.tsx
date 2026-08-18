import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Play, AlertCircle, Check, Loader, Save, Database, Download, Square, HardDrive, ShieldCheck } from 'lucide-react';

interface BrainBHealth {
  status?: string;
  curated_docs?: number;
  runtime_docs?: number;
  backend_configured?: boolean;
  edition?: string;
  /** "waitress" (production) or "flask-dev" (fallback used when waitress isn't installed —
   *  see gemma_service_enhanced.py's __main__). Surfaced here specifically because a log line
   *  at server startup is not a signal anyone actually receives. */
  server?: string;
}

interface BrainBStatus {
  ok: boolean;
  health?: BrainBHealth;
  error?: string;
}

interface BrainBScan {
  ok: boolean;
  freeDiskBytes: number | null;
  installed: boolean;
  installedVersion: string | null;
  destDir: string;
}

interface BrainBManifest {
  version: string;
  filename: string;
  sha256: string;
  size_bytes: number;
  built_at: string;
}

interface InstallProgress {
  phase: 'manifest' | 'downloading' | 'retrying' | 'verifying' | 'extracting' | 'done' | 'error';
  percent: number;
  message?: string;
  bytesReceived?: number;
  totalBytes?: number;
}

function formatBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return "couldn't determine";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const BrainBSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const api: any = (window as any).electron?.api || (window as any).electronAPI;

  // ── Install / lifecycle state ──
  const [scan, setScan] = useState<BrainBScan | null>(null);
  const [manifest, setManifest] = useState<BrainBManifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [serverRunning, setServerRunning] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  // ── Server connection / health-check state (unchanged from before — still
  //    valid once running, regardless of how it was launched) ──
  const [status, setStatus] = useState<BrainBStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:8766');
  const [saving, setSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const runScan = useCallback(async () => {
    try {
      const result = await api?.brainBScan?.();
      if (result?.ok) setScan(result);
    } catch { /* leave scan null — UI shows a fallback state */ }
  }, [api]);

  const runCheckLatest = useCallback(async () => {
    try {
      const result = await api?.brainBCheckLatest?.();
      if (result?.ok) { setManifest(result.manifest); setManifestError(null); }
      else setManifestError(result?.error || 'Could not reach GitHub');
    } catch (e: any) {
      setManifestError(e?.message || 'Could not reach GitHub');
    }
  }, [api]);

  const refreshServerStatus = useCallback(async () => {
    try {
      const result = await api?.brainBStatus?.();
      setServerRunning(!!result?.running);
    } catch { setServerRunning(null); }
  }, [api]);

  useEffect(() => {
    void runScan();
    void runCheckLatest();
    void refreshServerStatus();
  }, [runScan, runCheckLatest, refreshServerStatus]);

  useEffect(() => {
    if (!api?.onBrainBInstallProgress) return;
    const unsubscribe = api.onBrainBInstallProgress((data: InstallProgress) => {
      setInstallProgress(data);
      if (data.phase === 'done') {
        setInstalling(false);
        void runScan();
        toast.success('Brain B installed');
      } else if (data.phase === 'error') {
        setInstalling(false);
        toast.error(data.message || 'Brain B install failed');
      }
    });
    return unsubscribe;
  }, [api, runScan]);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    setInstallProgress({ phase: 'manifest', percent: 0, message: 'Starting…' });
    try {
      const result = await api?.brainBInstall?.();
      if (!result?.success) {
        setInstalling(false);
        toast.error(result?.error || 'Install failed');
      }
    } catch (e: any) {
      setInstalling(false);
      toast.error(e?.message || 'Install failed');
    }
  }, [api]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      const result = await api?.startBrainB?.();
      if (result?.ok) { setServerRunning(true); toast.success('Brain B started'); }
      else toast.error(result?.error || 'Failed to start Brain B');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start Brain B');
    } finally {
      setStarting(false);
    }
  }, [api]);

  const handleStop = useCallback(async () => {
    setStopping(true);
    try {
      await api?.stopBrainB?.();
      setServerRunning(false);
      toast.success('Brain B stopped');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to stop Brain B');
    } finally {
      setStopping(false);
    }
  }, [api]);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await api?.getSettings?.();
        if (s?.brainBBaseUrl) setBaseUrl(s.brainBBaseUrl);
        setSettingsLoaded(true);
      } catch {
        setSettingsLoaded(true);
      }
    };
    void load();
  }, [api]);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Direct renderer fetch, not IPC — Brain B's Flask server already sends CORS headers
      // (see brain-b/gemma_service_enhanced.py: CORS(app)), matching the existing pattern for
      // the FO4 bridge probe in LocalAIEngine.ts rather than needing new main-process plumbing.
      const resp = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
      if (!resp.ok) {
        setStatus({ ok: false, error: `HTTP ${resp.status}` });
        return;
      }
      const health: BrainBHealth = await resp.json();
      setStatus({ ok: health?.status === 'ok', health });
    } catch (error: any) {
      setStatus({ ok: false, error: error?.message || 'Connection failed' });
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (settingsLoaded) void checkStatus();
  }, [settingsLoaded]); // eslint-disable-line

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await api?.setSettings?.({ brainBBaseUrl: baseUrl });
      toast.success('Brain B settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save Brain B settings');
    } finally {
      setSaving(false);
    }
  }, [api, baseUrl]);

  const needsInstall = scan ? !scan.installed : false;
  const upToDate = scan?.installed && manifest && scan.installedVersion === manifest.version;

  return (
    <div className={'space-y-4 ' + (embedded ? 'text-sm' : 'text-base')}>
      {/* Info Banner */}
      <div className="p-3 rounded-md border border-violet-700/30 bg-violet-900/10 text-violet-200 text-xs space-y-1">
        <div className="font-semibold flex items-center gap-2">
          <Database className="w-3.5 h-3.5" />
          Brain B — Mossy's Local RAG Tutor
        </div>
        <p>
          An optional service — CPU-only, no GPU required, works the same on either Mossy edition —
          that answers from a curated Fallout 4 modding knowledge base (Creation Kit wiki, Papyrus
          reference, F4SE docs) instead of guessing from memory, and follows a structured tutoring
          contract: it diagnoses before answering, says "I don't know" honestly when nothing in the
          knowledge base matches, and checks in with a follow-up question while teaching.
        </p>
      </div>

      {/* Install / Enable */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-200 text-xs">Setup</span>
        </div>

        {/* Local scan — always local, no network */}
        <div className="text-xs text-slate-300 space-y-1">
          <div className="flex items-start gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              This check runs entirely on your computer — free disk space and whether Brain B is
              already installed. Nothing here is sent anywhere.
            </span>
          </div>
          {scan ? (
            <>
              <div><strong>Install location:</strong> <code className="font-mono bg-black/30 px-1 rounded text-[11px]">{scan.destDir}</code></div>
              <div><strong>Free disk space:</strong> {formatBytes(scan.freeDiskBytes)}</div>
              <div><strong>Currently installed:</strong> {scan.installed ? `yes (v${scan.installedVersion || 'unknown'})` : 'no'}</div>
            </>
          ) : (
            <div className="text-slate-500">Scanning…</div>
          )}
        </div>

        {/* Latest version check — a small network call, labeled as such */}
        <div className="text-xs text-slate-300 space-y-1 border-t border-slate-700/60 pt-3">
          <div className="text-slate-400">
            Checking GitHub for the current release (~200 bytes of version info — not the package itself):
          </div>
          {manifest ? (
            <>
              <div><strong>Latest version:</strong> {manifest.version}</div>
              <div><strong>Download size:</strong> {formatBytes(manifest.size_bytes)}</div>
            </>
          ) : manifestError ? (
            <div className="text-red-300">{manifestError}</div>
          ) : (
            <div className="text-slate-500">Checking…</div>
          )}
        </div>

        {/* Install progress */}
        {installing && installProgress && (
          <div className="rounded border border-violet-700/40 bg-violet-900/10 p-3 text-xs text-violet-200 space-y-1.5">
            <div className="flex items-center gap-2">
              <Loader className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span>{installProgress.message || installProgress.phase}</span>
            </div>
            {installProgress.phase === 'downloading' && (
              <div className="w-full h-1.5 rounded bg-black/30 overflow-hidden">
                <div className="h-full bg-violet-500 transition-all" style={{ width: `${installProgress.percent}%` }} />
              </div>
            )}
            {typeof installProgress.bytesReceived === 'number' && typeof installProgress.totalBytes === 'number' && installProgress.totalBytes > 0 && (
              <div className="text-[11px] text-violet-300/80">
                {formatBytes(installProgress.bytesReceived)} / {formatBytes(installProgress.totalBytes)}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {(needsInstall || (scan?.installed && manifest && !upToDate)) && (
            <button
              type="button"
              onClick={() => void handleInstall()}
              disabled={installing || !manifest}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {installing ? 'Installing…' : needsInstall ? 'Enable Brain B' : `Update to v${manifest?.version}`}
            </button>
          )}
          {scan?.installed && (
            <>
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting || serverRunning === true}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
              >
                {starting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Start
              </button>
              <button
                type="button"
                onClick={() => void handleStop()}
                disabled={stopping || serverRunning !== true}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
              >
                {stopping ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                Stop
              </button>
              <span className={'text-xs ' + (serverRunning ? 'text-emerald-400' : 'text-slate-500')}>
                {serverRunning === null ? '' : serverRunning ? '● Running' : '○ Not running'}
              </span>
            </>
          )}
        </div>

        <p className="text-[11px] text-slate-500 border-t border-slate-700/60 pt-2">
          Once running, retrieval and tutoring logic execute locally on your computer. Generating an
          actual answer routes through Mossy's own backend (the same one the app itself uses) — no
          separate API key of yours is used or needed.
        </p>
      </div>

      {/* Connection Settings */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-200 text-xs">Brain B Base URL</label>
          <button
            onClick={() => void checkStatus()}
            disabled={loading}
            className="px-3 py-1 rounded text-xs bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? <Loader className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Check Status
          </button>
        </div>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full px-3 py-2 rounded bg-black/30 border border-slate-700 text-sm text-white font-mono"
          placeholder="http://127.0.0.1:8766"
        />
        <p className="text-[11px] text-slate-500">
          Only needed if you're pointing Mossy at a Brain B instance running somewhere other than
          the one managed above — the default is correct for almost everyone.
        </p>

        {status && (
          <div
            className={
              'rounded p-3 text-xs flex items-start gap-2 ' +
              (status.ok
                ? 'border border-emerald-600/50 bg-emerald-900/20 text-emerald-200'
                : 'border border-red-600/50 bg-red-900/20 text-red-200')
            }
          >
            {status.ok ? (
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <div>
              {status.ok ? (
                <>
                  <div className="font-semibold">Connected to Brain B</div>
                  <div className="mt-1 space-y-0.5">
                    <div>
                      <strong>Knowledge base:</strong> {status.health?.curated_docs ?? 0} curated documents
                      {typeof status.health?.runtime_docs === 'number' && `, ${status.health.runtime_docs} runtime`}
                    </div>
                    <div>
                      <strong>Cloud generation:</strong> {status.health?.backend_configured ? 'configured' : 'not configured'}
                    </div>
                  </div>
                  {status.health?.server === 'flask-dev' && (
                    <div className="mt-2 flex items-start gap-1.5 text-amber-300 border-t border-emerald-800/40 pt-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Running Flask's development server, not a production one.</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-semibold">Not connected</div>
                  <div className="mt-1">{status.error || 'Unable to reach Brain B at ' + baseUrl}</div>
                  <div className="mt-1 text-[11px] text-red-300/80">
                    Not an error to worry about if you don't use Brain B — Mossy falls back to the
                    cloud model automatically when it's unreachable.
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
        >
          <Save className="w-3 h-3" />
          {saving ? 'Saving…' : 'Save Brain B Settings'}
        </button>
      </div>

      {/* Integration Info */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4">
        <div className="font-semibold text-slate-200 text-xs mb-2">Mossy Integration</div>
        <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
          <li>Not a provider choice — there's nothing to select in AI Engine. If it's installed and running, it enriches every turn automatically; whichever provider you've picked there (cloud or Ollama) still generates the actual answer text</li>
          <li>When Brain B has no documentation covering a question, Mossy says so plainly instead of guessing — you'll see a distinct notice on that message rather than a normal answer</li>
          <li>While teaching (not answering a quick lookup), Brain B may follow up with a short check-in question — shown as a highlighted prompt below its answer, arriving a moment after the answer itself since it's a separate step</li>
          <li>Any failure (not running, timeout, error) is silent — chat never breaks and no enrichment features appear for that turn, exactly as if Brain B weren't installed</li>
        </ul>
      </div>
    </div>
  );
};

export default BrainBSettings;
