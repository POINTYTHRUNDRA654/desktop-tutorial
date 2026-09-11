import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';

// Display names for BridgeServer.KNOWN_MODDING_TOOLS' keys -- kept here
// rather than imported since this is a renderer file and that constant
// lives in the main-process BridgeServer.ts. If a tool is ever added there,
// add its display name here too (an unrecognized key still renders fine,
// just as its raw key, so this list going stale is cosmetic, not broken).
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  blender: 'Blender',
  xedit: 'xEdit',
  creationkit: 'Creation Kit',
  nifskope: 'NifSkope',
  archive2: 'Archive2',
  modorganizer: 'Mod Organizer 2',
  gimp: 'GIMP',
  bae: 'BAE',
  meshlab: 'MeshLab',
  packerio: 'Packer-IO',
};

function toolLabel(key: string | null): string {
  if (!key) return '';
  return TOOL_DISPLAY_NAMES[key] || key;
}

/**
 * Minimal, real toggle for Screen Awareness (Phase 2 "Seeing") -- see
 * BridgeServer.ts's startScreenAwareness() for what this actually turns on.
 * GENERALIZED from the original Blender-only first slice: now watches any
 * of Mossy's known FO4 modding tools (Blender, xEdit, Creation Kit,
 * NifSkope, Archive2, Mod Organizer 2, GIMP, BAE), not just Blender --
 * still curated to modding tools specifically, not "whatever has focus"
 * (see KNOWN_MODDING_TOOLS's own comment in BridgeServer.ts for why).
 * Deliberately not heavily polished (no per-tool checkboxes yet, no
 * pattern editor) -- this exists so testing the real capture -> recognition
 * -> (speak | propose) loop is a button click, not "open devtools and paste
 * a JS call." Watching all tools at once, with no way to narrow the list
 * from this UI yet, is a real simplification -- the IPC layer underneath
 * already accepts a specific subset (see startScreenAwareness(tools?)),
 * so a per-tool picker is a follow-up to this UI, not a backend change.
 */
export const ScreenAwarenessSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const api: any = (window as any).electron?.api || (window as any).electronAPI;

  const [active, setActive] = useState(false);
  const [watching, setWatching] = useState<string[]>([]);
  const [currentProgram, setCurrentProgram] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await api?.screenAwarenessStatus?.();
      if (status) {
        setActive(!!status.active);
        if (Array.isArray(status.watching)) setWatching(status.watching);
        setCurrentProgram(status.currentProgram ?? null);
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
        await api.startScreenAwareness(); // no arg -> watch all known modding tools
      }
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || 'Failed to toggle Screen Awareness.');
    } finally {
      setBusy(false);
    }
  };

  const watchedLabel = watching.length > 0
    ? watching.map(toolLabel).join(', ')
    : 'Blender, xEdit, Creation Kit, NifSkope, Archive2, Mod Organizer 2, GIMP, BAE, MeshLab, Packer-IO';

  return (
    <div className={'space-y-4 ' + (embedded ? 'text-sm' : 'text-base')}>
      <div className="p-3 rounded-md border border-cyan-700/30 bg-cyan-900/10 text-cyan-200 text-xs space-y-1">
        <div className="font-semibold flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" />
          Screen Awareness — real-time mistake watching
        </div>
        <p>
          When on, Mossy checks every ~5 seconds whether one of your FO4 modding tools
          and pipeline utilities ({watchedLabel}) has window focus. Only while one does, she takes a real
          screenshot and runs it past a vision model against known mistakes for that
          tool — a matched one gets spoken as a live correction; anything else notable
          gets proposed as candidate knowledge, never applied automatically. Nothing is
          captured while none of those tools are focused — email, browsers, and
          unrelated work are never watched.
        </p>
      </div>

      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {active ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
            <span className="font-semibold text-slate-200">
              {active
                ? (currentProgram ? `Active — watching ${toolLabel(currentProgram)} right now` : 'Active — watching for a known modding tool')
                : 'Off'}
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
