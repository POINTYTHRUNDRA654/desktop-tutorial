import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Play, AlertCircle, Check, Loader, Save, Database } from 'lucide-react';

interface BrainBHealth {
  status?: string;
  model?: string;
  model_loaded?: boolean;
  curated_docs?: number;
  runtime_docs?: number;
  /** "waitress" (production) or "flask-dev" (fallback used when waitress isn't installed —
   *  see gemma_service_enhanced.py's __main__). Surfaced here specifically because a log line
   *  at server startup is not a signal anyone actually receives. */
  server?: string;
  gpu?: { name?: string; vram_gb?: number; vram_used_gb?: number };
}

interface BrainBStatus {
  ok: boolean;
  health?: BrainBHealth;
  error?: string;
}

export const BrainBSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const api: any = (window as any).electron?.api || (window as any).electronAPI;

  const [status, setStatus] = useState<BrainBStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:8766');
  const [saving, setSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

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

  return (
    <div className={'space-y-4 ' + (embedded ? 'text-sm' : 'text-base')}>
      {/* Info Banner */}
      <div className="p-3 rounded-md border border-violet-700/30 bg-violet-900/10 text-violet-200 text-xs space-y-1">
        <div className="font-semibold flex items-center gap-2">
          <Database className="w-3.5 h-3.5" />
          Brain B — Mossy's Local RAG Tutor
        </div>
        <p>
          An optional local Python service (NVIDIA Edition, GPU required) that answers from a
          curated Fallout 4 modding knowledge base — the Creation Kit wiki, Papyrus reference, and
          F4SE docs — instead of the model's own memory, and follows a structured tutoring contract
          (diagnosis before answering, honest "I don't know" when nothing matches, check-in
          questions while teaching). It does not run automatically; start it yourself:
        </p>
        <pre className="bg-black/40 border border-violet-800/40 rounded px-3 py-2 text-[11px] text-violet-300 font-mono overflow-x-auto mt-1">
{`cd D:\\Mossy-AI
python gemma_service_enhanced.py`}
        </pre>
        <p>
          Defaults to port <code className="font-mono bg-black/30 px-1 rounded">8766</code>, not
          8765 — that port is already used by Mossy's own F4SE NPC-dialogue relay.
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
                    {status.health?.model && <div><strong>Model:</strong> {status.health.model} {status.health.model_loaded ? '(loaded)' : '(not yet loaded — loads on first question)'}</div>}
                    <div>
                      <strong>Knowledge base:</strong> {status.health?.curated_docs ?? 0} curated documents
                      {typeof status.health?.runtime_docs === 'number' && `, ${status.health.runtime_docs} runtime`}
                    </div>
                    {status.health?.gpu?.name && (
                      <div><strong>GPU:</strong> {status.health.gpu.name} ({status.health.gpu.vram_used_gb ?? 0}GB / {status.health.gpu.vram_gb ?? '?'}GB VRAM used)</div>
                    )}
                  </div>
                  {status.health?.server === 'flask-dev' && (
                    <div className="mt-2 flex items-start gap-1.5 text-amber-300 border-t border-emerald-800/40 pt-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        Running Flask's development server, not a production one — fine solo, not
                        recommended once you're not the only person relying on this. Run{' '}
                        <code className="font-mono bg-black/30 px-1 rounded">pip install waitress</code> and
                        restart Brain B to switch automatically.
                      </span>
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
          <li>Set AI Engine provider to <strong>Local Only (Brain B)</strong> to force Mossy to always use it</li>
          <li>Set to <strong>Auto</strong> and Mossy uses the cloud by default, but prefers Brain B over Ollama when both are running (a specialized RAG/tutor service over a raw local model)</li>
          <li>When Brain B has no documentation covering a question, Mossy says so plainly instead of guessing — you'll see a distinct notice on that message rather than a normal answer</li>
          <li>While teaching (not answering a quick lookup), Brain B may follow up with a short check-in question — shown as a highlighted prompt below its answer</li>
          <li>Any failure (not running, timeout, error) falls through to the cloud model silently — chat never breaks because Brain B is off</li>
        </ul>
      </div>
    </div>
  );
};

export default BrainBSettings;
