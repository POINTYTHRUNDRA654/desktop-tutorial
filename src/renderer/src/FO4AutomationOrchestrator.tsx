import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Square, RefreshCw, RotateCcw, Activity, Settings2,
  FileSearch, Clock, Cpu, AlertCircle, CheckCircle2,
  ToggleLeft, ToggleRight, Zap, BarChart2, Timer,
  Shield, Layers, FolderSync, Gamepad2, XCircle,
  MousePointerClick, Package, FileCode2, Database,
  ChevronRight, Loader2, Eye, EyeOff, History, Inbox
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────────────

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: 'file-change' | 'process-start' | 'process-stop' | 'schedule' | 'manual';
  action: string;
  params?: Record<string, unknown>;
  watchExtensions?: string[];
  cooldownMs?: number;
  lastRun?: number;
  runCount?: number;
}

interface AutomationSettings {
  enabled: boolean;
  rules: AutomationRule[];
  schedules: { dailyMaintenance?: string; weeklyDeepScan?: string };
}

interface AutomationStats {
  isRunning: boolean;
  activeWatchers: number;
  activeIntervals: number;
  rules: Array<{
    id: string;
    name: string;
    enabled: boolean;
    runCount: number;
    lastRun?: number;
  }>;
}

interface ActivityEvent {
  id: string;
  ruleName: string;
  ruleId: string;
  timestamp: number;
  context: any;
}

// ─── Constants ──────────────────────────────────────────────────────────────────────────

const TRIGGER_META: Record<
  AutomationRule['trigger'],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  'file-change':   { label: 'File Watch',    icon: FolderSync,        color: 'text-blue-400',    bg: 'bg-blue-400/10'    },
  'process-start': { label: 'Process Start', icon: Gamepad2,          color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  'process-stop':  { label: 'Process Stop',  icon: XCircle,           color: 'text-red-400',     bg: 'bg-red-400/10'     },
  'schedule':      { label: 'Scheduled',     icon: Timer,             color: 'text-purple-400',  bg: 'bg-purple-400/10'  },
  'manual':        { label: 'Manual',        icon: MousePointerClick, color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
};

const ACTION_LABELS: Record<string, string> = {
  'scan-conflicts':        'Conflict Scan',
  'scan-duplicates':       'Duplicate Scan',
  'validate-load-order':   'Load Order Validate',
  'compile-papyrus':       'Papyrus Compile',
  'pack-ba2':              'BA2 Pack',
  'validate-hkx':          'HKX Validate',
  'start-log-monitor':     'Log Monitor',
  'track-ck-session':      'CK Session Tracker',
  'validate-f4se':         'F4SE Validate',
  'nightly-backup':        'Nightly Backup',
  'run-maintenance':       'Daily Maintenance',
  'sync-cosmos-pipeline':  'Cosmos Pipeline Sync',
};

const MAX_ACTIVITY = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────────────────

const fmtAgo = (ts?: number): string => {
  if (!ts) return 'Never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmtTime = (ts?: number): string => {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const api = (window as any).api?.automation;

// ─── Stat Card ──────────────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sub?: string;
}> = ({ label, value, icon: Icon, color, sub }) => (
  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex items-start gap-3">
    <div className="p-2 rounded-lg bg-slate-900/60">
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-100 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Rule Row ────────────────────────────────────────────────────────────────────────────────

const RuleRow: React.FC<{
  rule: AutomationRule;
  statRow?: { runCount: number; lastRun?: number };
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onTrigger: (id: string) => Promise<void>;
  triggering: boolean;
}> = ({ rule, statRow, onToggle, onTrigger, triggering }) => {
  const [toggling, setToggling] = useState(false);
  const meta = TRIGGER_META[rule.trigger];
  const TIcon = meta.icon;

  const handleToggle = async () => {
    setToggling(true);
    try { await onToggle(rule.id, !rule.enabled); } finally { setToggling(false); }
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
      rule.enabled
        ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600/50'
        : 'bg-slate-900/30 border-slate-800/40 opacity-60'
    }`}>
      <div className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${meta.color} ${meta.bg}`}>
        <TIcon className="w-3 h-3" />
        <span className="hidden xl:inline">{meta.label}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 truncate">{rule.name}</p>
        {rule.description && (
          <p className="text-xs text-slate-500 truncate">{rule.description}</p>
        )}
      </div>

      <span className="hidden lg:block text-xs text-slate-500 font-mono bg-slate-900/50 px-2 py-0.5 rounded">
        {ACTION_LABELS[rule.action] ?? rule.action}
      </span>

      <div className="hidden md:flex flex-col items-end gap-0.5 text-right min-w-[5rem]">
        <span className="text-xs text-slate-400 font-medium">
          {(statRow?.runCount ?? rule.runCount ?? 0)}× runs
        </span>
        <span className="text-xs text-slate-600">
          {fmtAgo(statRow?.lastRun ?? rule.lastRun)}
        </span>
      </div>

      <button
        onClick={() => onTrigger(rule.id)}
        disabled={triggering || !rule.enabled}
        title="Trigger manually"
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-amber-400/10 hover:text-amber-400 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
      </button>

      <button
        onClick={handleToggle}
        disabled={toggling}
        title={rule.enabled ? 'Disable rule' : 'Enable rule'}
        className={`flex-shrink-0 transition-colors ${toggling ? 'opacity-50' : ''}`}
      >
        {rule.enabled
          ? <ToggleRight className="w-5 h-5 text-emerald-400" />
          : <ToggleLeft  className="w-5 h-5 text-slate-600" />
        }
      </button>
    </div>
  );
};

// ─── Activity Feed ────────────────────────────────────────────────────────────────────

const ActivityFeed: React.FC<{ events: ActivityEvent[] }> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-600">
        <Inbox className="w-8 h-8 mb-2" />
        <p className="text-sm">No activity yet — events appear here as rules fire.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {events.map(ev => (
        <div key={ev.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/40 transition-colors">
          <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-slate-300 font-medium">{ev.ruleName}</span>
            {ev.context?.filename && (
              <span className="text-xs text-slate-500 ml-2 font-mono">{ev.context.filename}</span>
            )}
            {ev.context?.processName && (
              <span className="text-xs text-slate-500 ml-2 font-mono">{ev.context.processName}</span>
            )}
            {ev.context?.manual && (
              <span className="text-xs text-amber-400/60 ml-2">manual</span>
            )}
            {ev.context?.scheduled && (
              <span className="text-xs text-purple-400/60 ml-2">scheduled</span>
            )}
          </div>
          <span className="text-xs text-slate-600 flex-shrink-0">{fmtTime(ev.timestamp)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────────────

const FO4AutomationOrchestrator: React.FC = () => {
  const [settings, setSettings]         = useState<AutomationSettings | null>(null);
  const [stats, setStats]               = useState<AutomationStats | null>(null);
  const [activity, setActivity]         = useState<ActivityEvent[]>([]);
  const [loading, setLoading]           = useState(true);
  const [engineBusy, setEngineBusy]     = useState(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh]   = useState(Date.now());
  const [tab, setTab]                   = useState<'rules' | 'activity'>('rules');
  const [filterTrigger, setFilterTrigger] = useState<string>('all');
  const [showDisabled, setShowDisabled]   = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      const [s, st] = await Promise.all([api.getSettings(), api.getStatistics()]);
      setSettings(s);
      setStats(st);
    } catch (err) {
      console.error('[Orchestrator] refresh failed:', err);
    } finally {
      setLoading(false);
      setLastRefresh(Date.now());
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 15000);

    if (api?.onRuleExecuted) {
      unsubRef.current = api.onRuleExecuted((data: { rule: AutomationRule; context: any; timestamp: number }) => {
        const ev: ActivityEvent = {
          id: `${data.timestamp}-${data.rule.id}`,
          ruleName: data.rule.name,
          ruleId: data.rule.id,
          timestamp: data.timestamp,
          context: data.context,
        };
        setActivity(prev => [ev, ...prev].slice(0, MAX_ACTIVITY));
      });
    }

    return () => {
      clearInterval(poll);
      unsubRef.current?.();
    };
  }, [refresh]);

  const handleStart = async () => {
    if (!api || engineBusy) return;
    setEngineBusy(true);
    try { await api.start(); await refresh(); } finally { setEngineBusy(false); }
  };

  const handleStop = async () => {
    if (!api || engineBusy) return;
    setEngineBusy(true);
    try { await api.stop(); await refresh(); } finally { setEngineBusy(false); }
  };

  const handleResetStats = async () => {
    if (!api) return;
    await api.resetStatistics();
    await refresh();
  };

  const handleToggle = async (ruleId: string, enabled: boolean) => {
    if (!api) return;
    await api.toggleRule(ruleId, enabled);
    await refresh();
  };

  const handleTrigger = async (ruleId: string) => {
    if (!api || triggeringId) return;
    setTriggeringId(ruleId);
    try { await api.triggerRule(ruleId); await refresh(); }
    finally { setTriggeringId(null); }
  };

  const isRunning    = stats?.isRunning ?? false;
  const rules        = settings?.rules ?? [];
  const statsByRuleId = Object.fromEntries((stats?.rules ?? []).map(r => [r.id, r]));
  const totalRuns    = (stats?.rules ?? []).reduce((a, r) => a + (r.runCount ?? 0), 0);
  const enabledCount = rules.filter(r => r.enabled).length;

  const displayedRules = rules.filter(r => {
    if (!showDisabled && !r.enabled) return false;
    if (filterTrigger !== 'all' && r.trigger !== filterTrigger) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading automation engine…
      </div>
    );
  }

  if (!api) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="text-sm">Automation API unavailable — ensure you are running the packaged app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100">

      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/60">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-600'}`} />
            <h1 className="text-base font-bold text-slate-100">FO4 Automation Orchestrator</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isRunning ? 'bg-emerald-400/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} title="Refresh"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleResetStats} title="Reset all run statistics"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
            {isRunning ? (
              <button onClick={handleStop} disabled={engineBusy}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium disabled:opacity-50 transition-all">
                {engineBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                Stop Engine
              </button>
            ) : (
              <button onClick={handleStart} disabled={engineBusy}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium disabled:opacity-50 transition-all">
                {engineBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Start Engine
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Rules Active"    value={`${enabledCount} / ${rules.length}`} icon={Shield}    color="text-emerald-400" sub="enabled / total" />
          <StatCard label="File Watchers"   value={stats?.activeWatchers ?? 0}           icon={FolderSync} color="text-blue-400"    sub="paths monitored" />
          <StatCard label="Intervals"       value={stats?.activeIntervals ?? 0}          icon={Clock}     color="text-purple-400"  sub="process + schedule" />
          <StatCard label="Total Runs"      value={totalRuns}                            icon={BarChart2} color="text-amber-400"   sub="since last reset" />
        </div>

        <div className="flex items-center gap-1 border-b border-slate-800">
          <button onClick={() => setTab('rules')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'rules' ? 'border-blue-400 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            <Layers className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Rules ({rules.length})
          </button>
          <button onClick={() => setTab('activity')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'activity' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            <History className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Activity
            {activity.length > 0 && (
              <span className="ml-1.5 text-xs bg-amber-400/15 text-amber-400 px-1.5 py-0.5 rounded-full">{activity.length}</span>
            )}
          </button>
        </div>

        {tab === 'rules' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <select value={filterTrigger} onChange={e => setFilterTrigger(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
                <option value="all">All triggers</option>
                <option value="file-change">File Watch</option>
                <option value="process-start">Process Start</option>
                <option value="process-stop">Process Stop</option>
                <option value="schedule">Scheduled</option>
                <option value="manual">Manual</option>
              </select>
              <button onClick={() => setShowDisabled(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showDisabled ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                {showDisabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showDisabled ? 'Showing disabled' : 'Hiding disabled'}
              </button>
              <span className="text-xs text-slate-600 ml-auto">Last refresh: {fmtAgo(lastRefresh)}</span>
            </div>

            <div className="space-y-2">
              {displayedRules.length === 0 ? (
                <div className="text-center py-10 text-slate-600">
                  <Settings2 className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm">No rules match the current filter.</p>
                </div>
              ) : (
                displayedRules.map(rule => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    statRow={statsByRuleId[rule.id]}
                    onToggle={handleToggle}
                    onTrigger={handleTrigger}
                    triggering={triggeringId === rule.id}
                  />
                ))
              )}
            </div>

            {settings?.schedules && (
              <div className="mt-4 p-4 bg-slate-800/30 border border-slate-700/40 rounded-xl">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-purple-400" />
                  Engine Schedules
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>Daily maintenance:</span>
                    <span className="text-slate-300 font-mono ml-auto">{settings.schedules.dailyMaintenance ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>Weekly deep scan:</span>
                    <span className="text-slate-300 font-mono ml-auto">{settings.schedules.weeklyDeepScan ?? 'Off'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Live feed — rules fire events here in real time. Max {MAX_ACTIVITY} entries kept.
              </p>
              {activity.length > 0 && (
                <button onClick={() => setActivity([])} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Clear
                </button>
              )}
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl divide-y divide-slate-800/60 min-h-[12rem]">
              <ActivityFeed events={activity} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FO4AutomationOrchestrator;
