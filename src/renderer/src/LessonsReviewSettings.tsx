import React, { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Check, X, RefreshCw, Loader } from 'lucide-react';
import { LocalAIEngine } from './LocalAIEngine';

/**
 * Review queue for lessons proposed into Brain B's ChangeGate (by Screen
 * Awareness, or by Claude working alongside in a dev session). Nothing
 * becomes part of Mossy's knowledge until it's approved here. Approved
 * lessons are written to brain-b/knowledge/<program>_mistake_patterns.json
 * and from then on are folded into every matching chat/voice answer by
 * Brain B's /enrich (see change_gate.relevant_lessons).
 */

interface PendingLesson {
  id: string;
  program: string;
  observation: string;
  suggestedCorrection?: string | null;
  sourceContext?: { source?: string; verification?: string | null } & Record<string, unknown>;
  proposedAt?: number;
}

function getApi(): any {
  return (window as any).electron?.api || (window as any).electronAPI;
}

async function brainB(path: string, init?: RequestInit): Promise<any> {
  let base = 'http://127.0.0.1:8766';
  try {
    const s: any = await (LocalAIEngine as any).getLocalAiSettings();
    if (s?.brainBBaseUrl) base = String(s.brainBBaseUrl);
  } catch { /* default */ }
  const conn = await getApi()?.getBridgeConnection?.().catch(() => null);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (conn?.token) headers['X-Mossy-Token'] = String(conn.token);
  const res = await fetch(`${base}${path}`, { ...init, headers, signal: AbortSignal.timeout(8000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Brain B returned HTTP ${res.status}`);
  return data;
}

function isScreenAwareness(l: PendingLesson): boolean {
  return !!l.sourceContext && l.sourceContext.source !== 'claude-mcp' && 'capturedAt' in l.sourceContext;
}

function sourceLabel(l: PendingLesson): string {
  const src = l.sourceContext?.source;
  if (src === 'claude-mcp') return 'Proposed by Claude';
  if (l.sourceContext && 'capturedAt' in l.sourceContext) return 'Seen by Screen Awareness';
  return 'Proposed';
}

export const LessonsReviewSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [pending, setPending] = useState<PendingLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await brainB('/change-gate/pending');
      setPending(Array.isArray(data?.pending) ? data.pending : []);
    } catch (e: any) {
      setError(`Couldn't reach Brain B (${e?.message || e}). Start Brain B, then refresh.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const decide = async (lesson: PendingLesson, action: 'approve' | 'reject') => {
    setBusyId(lesson.id);
    setError(null);
    try {
      await brainB(`/change-gate/${action}`, {
        method: 'POST',
        body: JSON.stringify({ id: lesson.id, reviewerNote: notes[lesson.id]?.trim() || null }),
      });
      setLastAction(action === 'approve'
        ? `Approved — Mossy will use this in ${lesson.program} answers from now on.`
        : 'Rejected — it will not become part of her knowledge.');
      await refresh();
    } catch (e: any) {
      setError(`Couldn't ${action} that lesson: ${e?.message || e}`);
    } finally {
      setBusyId(null);
    }
  };

  const screenItems = pending.filter(isScreenAwareness);

  const rejectAllScreenAwareness = async () => {
    const targets = pending.filter(isScreenAwareness);
    setConfirmBulk(false);
    setError(null);
    setBusyId('__bulk__');
    setBulkProgress({ done: 0, total: targets.length });
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      try {
        await brainB('/change-gate/reject', {
          method: 'POST',
          body: JSON.stringify({ id: targets[i].id, reviewerNote: 'Bulk-rejected: unreviewed Screen Awareness observation' }),
        });
      } catch {
        failed++;
      }
      setBulkProgress({ done: i + 1, total: targets.length });
    }
    setBulkProgress(null);
    setBusyId(null);
    if (failed > 0) setError(`${failed} of ${targets.length} couldn't be rejected. Refresh and try again.`);
    else setLastAction(`Rejected ${targets.length} Screen Awareness observation${targets.length === 1 ? '' : 's'}.`);
    await refresh();
  };

  return (
    <div className={'space-y-4 ' + (embedded ? 'text-sm' : 'text-base')}>
      <div className="p-3 rounded-md border border-emerald-700/30 bg-emerald-900/10 text-emerald-200 text-xs space-y-1">
        <div className="font-semibold flex items-center gap-2">
          <GraduationCap className="w-3.5 h-3.5" />
          What Mossy is learning
        </div>
        <p>
          Lessons proposed while you work land here first. Nothing becomes part of Mossy's
          knowledge until you approve it. Approved lessons are used in her chat and voice
          answers whenever a question touches that topic. Reject anything that's wrong or
          only true for one specific file.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">
          {loading ? 'Loading…' : `${pending.length} lesson${pending.length === 1 ? '' : 's'} waiting for review`}
        </span>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/40 disabled:opacity-50"
        >
          <RefreshCw className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin' : '')} /> Refresh
        </button>
      </div>

      {screenItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-700 bg-slate-800/30 p-3 text-xs">
          <span className="text-slate-300">
            {screenItems.length} of these came from Screen Awareness.
          </span>
          {bulkProgress ? (
            <span className="flex items-center gap-1.5 text-slate-300 ml-auto">
              <Loader className="w-3.5 h-3.5 animate-spin" /> Rejecting {bulkProgress.done} / {bulkProgress.total}…
            </span>
          ) : confirmBulk ? (
            <span className="flex items-center gap-2 ml-auto">
              <span className="text-slate-300">Reject all {screenItems.length}? Claude's proposals are kept.</span>
              <button
                onClick={rejectAllScreenAwareness}
                className="px-3 py-1 font-bold rounded-lg border bg-red-900/30 border-red-700/40 text-red-300 hover:bg-red-900/50"
              >
                Yes, reject {screenItems.length}
              </button>
              <button
                onClick={() => setConfirmBulk(false)}
                className="px-3 py-1 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/40"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmBulk(true)}
              disabled={busyId !== null}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 font-bold rounded-lg border bg-red-900/30 border-red-700/40 text-red-300 hover:bg-red-900/50 disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" /> Reject all from Screen Awareness
            </button>
          )}
        </div>
      )}

      {error && <div className="text-xs text-red-300">{error}</div>}
      {lastAction && !error && <div className="text-xs text-emerald-300">{lastAction}</div>}

      {!loading && !error && pending.length === 0 && (
        <div className="text-xs text-slate-500 rounded-md border border-slate-700 bg-slate-800/30 p-4">
          Nothing waiting. New lessons show up here as they're proposed.
        </div>
      )}

      <div className="space-y-3">
        {pending.map((l) => (
          <div key={l.id} className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-full border border-emerald-700/40 bg-emerald-900/30 text-emerald-300 font-semibold">
                {l.program}
              </span>
              <span className="text-slate-400">{sourceLabel(l)}</span>
              {l.proposedAt ? (
                <span className="text-slate-500 ml-auto">{new Date(l.proposedAt * 1000).toLocaleString()}</span>
              ) : null}
            </div>
            <div className="text-xs text-slate-200">
              <span className="text-slate-400">Watch for: </span>{l.observation}
            </div>
            {l.suggestedCorrection && (
              <div className="text-xs text-slate-200">
                <span className="text-slate-400">Correct approach: </span>{l.suggestedCorrection}
              </div>
            )}
            {l.sourceContext?.verification && (
              <div className="text-[11px] text-slate-400">
                <span className="text-slate-500">How it was verified: </span>{String(l.sourceContext.verification)}
              </div>
            )}
            <input
              value={notes[l.id] || ''}
              onChange={(e) => setNotes((n) => ({ ...n, [l.id]: e.target.value }))}
              placeholder="Optional note (why you approved or rejected it)"
              aria-label="Reviewer note"
              className="w-full text-xs px-2 py-1.5 rounded border border-slate-600 bg-slate-900/60 text-slate-200 placeholder:text-slate-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => decide(l, 'approve')}
                disabled={busyId !== null}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border bg-emerald-900/30 border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-50"
              >
                {busyId === l.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
              </button>
              <button
                onClick={() => decide(l, 'reject')}
                disabled={busyId !== null}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border bg-red-900/30 border-red-700/40 text-red-300 hover:bg-red-900/50 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LessonsReviewSettings;
