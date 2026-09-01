import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';

/**
 * Minimal, real toggle for Screen Awareness (Phase 2 "Seeing") -- see
 * BridgeServer.ts's startScreenAwareness() for what this actually turns on.
 * Deliberately not polished (no history view, no pattern editor) -- this
 * exists so testing the real capture -> recognition -> (speak | propose)
 * loop is a button click, not "open devtools and paste a JS call."
 */
export const ScreenAwarenessSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const api: any = (window as any).electron?.api || (window as any).electronAPI;

  const [active, setActive] = useState(false);
  const [program, setProgram] = useState('blender');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await api?.screenAwarenessStatus?.();
      if (status) {
        setActive(!!status.active);
        if (status.program) setProgram(status.program);
      }
    } catch { /* leave last-known state on a transient failure */ }
  }, [api]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleToggle = async () => {
    if (!api?.startScreenAwareness || !api?.stopScreenAwareness) {
      setError('Screen Awareness IPC is not available in this build.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (active) {
        await api.stopScreenAwareness();
      } else {
        await api.startScreenAwareness('blender');
      }
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || 'Failed to toggle Screen Awareness.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={'space-y-4 ' + (embedded ? 'text-sm' : 'text-base')}>
      <div className="p-3 rounded-md border border-cyan-700/30 bg-cyan-900/10 text-cyan-200 text-xs space-y-1">
        <div className="font-semibold flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" />
          Screen Awareness — real-time mistake watching (first slice: Blender only)
        </div>
        <p>
          When on, Mossy checks every ~5 seconds whether Blender has window focus. Only
          while it does, she takes a real screenshot and runs it past a vision model
          against a small set of known Blender mistakes — a matched one gets spoken as a
          live correction; anything else notable gets proposed as candidate knowledge,
          never applied automatically. Nothing is captured while Blender isn't focused.
        </p>
      </div>

      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {active ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
            <span className="font-semibold text-slate-200">
              {active ? `Active — watching for ${program}` : 'Off'}
            </span>
          </div>
          <button
            onClick={handleToggle}
            disabled={busy}
            className={
              'flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg border transition-all disabled:opacity-50 ' +
              (active
                ? 'bg-red-900/30 border-red-700/40 text-red-300 hover:bg-red-900/50'
                : 'bg-cyan-900/30 border-cyan-700/40 text-cyan-300 hover:bg-cyan-900/50')
            }
          >
            {busy ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
            {active ? 'Turn off' : 'Turn on'}
          </button>
        </div>
        {error && <div className="text-xs text-red-300">{error}</div>}
        <div className="text-[11px] text-slate-500">
          Every pass (matched, proposed, or nothing notable) logs to
          %APPDATA%/.mossy-desktop/ai-diagnostics.log under [screen-awareness].
          This setting is remembered — leaving it on restarts watching automatically
          the next time Mossy launches.
        </div>
      </div>
    </div>
  );
};

export default ScreenAwarenessSettings;
