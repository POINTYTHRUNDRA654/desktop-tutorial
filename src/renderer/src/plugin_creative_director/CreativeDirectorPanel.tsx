import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Brain, Play, Pause, RefreshCw, Folder, Trash2, Clock,
  CheckCircle, AlertTriangle, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react';

const api: any = (window as any).electron?.api || (window as any).electronAPI;

interface Project {
  id: string;
  title: string;
  summary?: string;
  outputDir?: string;
}

interface QueueEntry {
  id: string;
  position: number;
  title: string;
  summary?: string;
  completedProject: Project;
  userNotes?: string;
  queuedAt?: string;
}

interface DirectorState {
  enabled: boolean;
  tickInFlight: boolean;
  currentProject: Project | null;
  completedProjects: Project[];
  pendingQueue: QueueEntry[];
}

export function CreativeDirectorPanel() {
  const [state, setState] = useState<DirectorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [expandedQueue, setExpandedQueue] = useState<Record<string, boolean>>({});
  const [expandedCompleted, setExpandedCompleted] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await api?.creativeDirectorTeam?.getState?.();
      if (r?.success) setState(r);
    } catch (err) {
      console.error('[CreativeDirectorPanel] getState error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleToggleEnabled = async () => {
    if (!state) return;
    setTogglingEnabled(true);
    try {
      const r = await api?.creativeDirectorTeam?.setEnabled?.(!state.enabled);
      if (r?.success) {
        setState(prev => prev ? { ...prev, enabled: r.enabled } : prev);
        toast.success(r.enabled ? 'Creative Director enabled' : 'Creative Director disabled');
      } else {
        toast.error(r?.error ?? 'Failed to toggle state');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Error toggling state');
    } finally {
      setTogglingEnabled(false);
    }
  };

  const handleReveal = async (outputDir: string) => {
    try {
      await api?.creativeDirectorTeam?.revealOutput?.(outputDir);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not reveal folder');
    }
  };

  const handleDequeue = async (entryId: string) => {
    try {
      const r = await api?.creativeDirectorTeam?.dequeueProject?.(entryId);
      if (r?.success) {
        toast.success('Removed from queue');
        void refresh();
      } else {
        toast.error(r?.error ?? 'Failed to dequeue');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Error dequeuing project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 gap-2">
        <Loader2 className="animate-spin w-5 h-5" />
        <span>Loading Creative Director…</span>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <span>Creative Director unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
        <Brain className="w-6 h-6 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-none">Vault-Tec Creative Director</h1>
          <p className="text-xs text-slate-400 mt-0.5">Autonomous AI mod-building team</p>
        </div>
        <div className="flex items-center gap-2">
          {state.tickInFlight && (
            <span className="flex items-center gap-1 text-xs text-cyan-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Running…
            </span>
          )}
          <button
            onClick={() => void refresh()}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => void handleToggleEnabled()}
            disabled={togglingEnabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              state.enabled
                ? 'bg-red-900/50 hover:bg-red-900 text-red-300'
                : 'bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300'
            }`}
          >
            {togglingEnabled ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : state.enabled ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {state.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-4 space-y-6 overflow-auto">
        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          {state.enabled ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Pause className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <span className={state.enabled ? 'text-emerald-300' : 'text-slate-500'}>
            {state.enabled ? 'Active — team is running' : 'Disabled — enable to start the team'}
          </span>
        </div>

        {/* Current project */}
        {state.currentProject && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Current Project</h2>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-cyan-300">{state.currentProject.title}</span>
                {state.currentProject.outputDir && (
                  <button
                    onClick={() => void handleReveal(state.currentProject!.outputDir!)}
                    className="shrink-0 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                    title="Reveal in Explorer"
                  >
                    <Folder className="w-4 h-4" />
                  </button>
                )}
              </div>
              {state.currentProject.summary && (
                <p className="text-sm text-slate-300 leading-relaxed">{state.currentProject.summary}</p>
              )}
            </div>
          </section>
        )}

        {/* Queue */}
        {state.pendingQueue.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Queue ({state.pendingQueue.length})
            </h2>
            <div className="space-y-2">
              {state.pendingQueue.map(entry => (
                <div key={entry.id} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <span className="text-xs text-slate-500 font-mono w-5 text-right shrink-0">
                      {entry.position}.
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">{entry.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {entry.queuedAt && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(entry.queuedAt).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        onClick={() => setExpandedQueue(p => ({ ...p, [entry.id]: !p[entry.id] }))}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                      >
                        {expandedQueue[entry.id] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => void handleDequeue(entry.id)}
                        className="p-1 rounded hover:bg-red-900/50 text-slate-500 hover:text-red-300 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {expandedQueue[entry.id] && entry.summary && (
                    <div className="px-4 pb-3 text-sm text-slate-400 border-t border-slate-800 pt-2">
                      {entry.summary}
                      {entry.userNotes && (
                        <p className="mt-1 text-xs text-amber-400 italic">Notes: {entry.userNotes}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Completed projects */}
        {state.completedProjects.length > 0 && (
          <section>
            <button
              onClick={() => setExpandedCompleted(p => !p)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 hover:text-slate-200 transition-colors"
            >
              {expandedCompleted ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              Completed ({state.completedProjects.length})
            </button>
            {expandedCompleted && (
              <div className="space-y-2">
                {state.completedProjects.map(proj => (
                  <div
                    key={proj.id}
                    className="bg-slate-900 rounded-lg border border-slate-800 p-3 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-200 block truncate">{proj.title}</span>
                      {proj.summary && (
                        <span className="text-xs text-slate-500 line-clamp-2">{proj.summary}</span>
                      )}
                    </div>
                    {proj.outputDir && (
                      <button
                        onClick={() => void handleReveal(proj.outputDir!)}
                        className="shrink-0 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                        title="Reveal in Explorer"
                      >
                        <Folder className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
        {!state.currentProject && state.pendingQueue.length === 0 && state.completedProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <Brain className="w-10 h-10 opacity-30" />
            <p className="text-sm">No projects yet.</p>
            <p className="text-xs text-center max-w-xs">
              Enable the Creative Director and provide a mod concept via the AI Chat to start building.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreativeDirectorPanel;
