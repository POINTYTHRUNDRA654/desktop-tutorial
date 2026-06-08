import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Settings,
  Clock,
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  FolderSync,
  Gamepad2,
  Timer,
  MousePointerClick,
  Package,
  Database,
  Layers,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  Trash2,
  Pencil,
  X,
  Save,
} from 'lucide-react';

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

const TRIGGER_META: Record<
  AutomationRule['trigger'],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  'file-change':   { label: 'File Watch',      icon: FolderSync,        color: 'text-blue-400'   },
  'process-start': { label: 'Process Start',   icon: Gamepad2,          color: 'text-emerald-400'},
  'process-stop':  { label: 'Process Stop',    icon: XCircle,           color: 'text-red-400'    },
  'schedule':      { label: 'Scheduled',       icon: Timer,             color: 'text-purple-400' },
  'manual':        { label: 'Manual',          icon: MousePointerClick,  color: 'text-amber-400'  },
};

const AVAILABLE_ACTIONS: { value: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'scan-conflicts',      label: 'Scan Conflicts',       icon: AlertTriangle },
  { value: 'scan-duplicates',     label: 'Scan Duplicates',      icon: Database      },
  { value: 'validate-load-order', label: 'Validate Load Order',  icon: Layers        },
  { value: 'compile-papyrus',     label: 'Compile Papyrus',      icon: FileCode2     },
  { value: 'pack-ba2',            label: 'Pack BA2',             icon: Package       },
  { value: 'validate-hkx',        label: 'Validate HKX',         icon: RefreshCw     },
  { value: 'start-log-monitor',   label: 'Start Log Monitor',    icon: Settings      },
  { value: 'nightly-backup',      label: 'Nightly Backup',       icon: Clock         },
  { value: 'run-maintenance',     label: 'Daily Maintenance',    icon: RefreshCw     },
  { value: 'validate-f4se',       label: 'Validate F4SE',        icon: CheckCircle2  },
  { value: 'track-ck-session',    label: 'Track CK Session',     icon: Settings      },
  { value: 'sync-cosmos-pipeline',label: 'Sync Cosmos Pipeline', icon: RefreshCw     },
];

const newId = () => `rule_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

const formatLastRun = (timestamp?: number): string => {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'Just now';
};

const formatCooldown = (ms?: number): string => {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${ms / 1000}s`;
  return `${Math.floor(ms / 60000)}m`;
};

const EMPTY_RULE: Omit<AutomationRule, 'id'> = {
  name: '',
  description: '',
  enabled: true,
  trigger: 'file-change',
  action: 'scan-conflicts',
  watchExtensions: ['.esp', '.esm', '.esl'],
  cooldownMs: 5000,
  params: {},
};

// ─── Rule Editor Modal ────────────────────────────────────────────────────────

interface RuleEditorProps {
  rule: AutomationRule | null; // null = new
  onSave: (rule: AutomationRule) => void;
  onCancel: () => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ rule, onSave, onCancel }) => {
  const isNew = !rule;
  const [form, setForm] = useState<Omit<AutomationRule, 'id'>>(() =>
    rule ? { ...rule } : { ...EMPTY_RULE }
  );
  const [extInput, setExtInput] = useState<string>(() =>
    (rule?.watchExtensions ?? EMPTY_RULE.watchExtensions ?? []).join(', ')
  );
  const [errors, setErrors] = useState<string[]>([]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Name is required.');
    if (!form.action) errs.push('Action is required.');
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const exts = extInput
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)
      .map(e => (e.startsWith('.') ? e : '.' + e));
    const saved: AutomationRule = {
      id: rule?.id ?? newId(),
      ...form,
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      watchExtensions: exts.length > 0 ? exts : undefined,
      runCount: rule?.runCount ?? 0,
      lastRun: rule?.lastRun,
    };
    onSave(saved);
  };

  const triggerKeys = Object.keys(TRIGGER_META) as AutomationRule['trigger'][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            {isNew ? <Plus className="w-4 h-4 text-emerald-400" /> : <Pencil className="w-4 h-4 text-blue-400" />}
            {isNew ? 'Create Automation Rule' : 'Edit Automation Rule'}
          </h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-800 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/40 text-xs text-red-300 space-y-0.5">
              {errors.map(e => <div key={e}>• {e}</div>)}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Auto Conflict Scan"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</label>
            <input
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional — what does this rule do?"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Trigger *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {triggerKeys.map(k => {
                const meta = TRIGGER_META[k];
                const Icon = meta.icon;
                const active = form.trigger === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set('trigger', k)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs font-semibold transition-colors ${
                      active
                        ? 'border-emerald-600/60 bg-emerald-900/20 text-emerald-200'
                        : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${active ? meta.color : 'text-slate-500'}`} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Action *</label>
            <select
              value={form.action}
              onChange={e => set('action', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              {AVAILABLE_ACTIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Watched extensions (only for file-change) */}
          {form.trigger === 'file-change' && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Watch Extensions <span className="text-slate-600 font-normal">(comma-separated, e.g. .esp, .esl)</span>
              </label>
              <input
                value={extInput}
                onChange={e => setExtInput(e.target.value)}
                placeholder=".esp, .esm, .esl"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Watch path param */}
          {(form.trigger === 'file-change') && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Watch Path</label>
              <input
                value={String((form.params as any)?.path ?? '')}
                onChange={e => set('params', { ...form.params, path: e.target.value })}
                placeholder="Data  or  Data/Scripts/Source"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-600 mt-0.5">Relative to the Fallout 4 install directory. Leave blank for Data/.</p>
            </div>
          )}

          {/* Process name param */}
          {(form.trigger === 'process-start' || form.trigger === 'process-stop') && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Process Name</label>
              <input
                value={String((form.params as any)?.process ?? '')}
                onChange={e => set('params', { ...form.params, process: e.target.value })}
                placeholder="Fallout4.exe  or  CreationKit.exe"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Schedule time param */}
          {form.trigger === 'schedule' && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Schedule Time (HH:MM, 24h)</label>
              <input
                value={String((form.params as any)?.time ?? '03:00')}
                onChange={e => set('params', { ...form.params, time: e.target.value })}
                placeholder="03:00"
                className="w-48 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Cooldown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cooldown (ms)</label>
              <input
                type="number"
                value={form.cooldownMs ?? 5000}
                onChange={e => set('cooldownMs', Number(e.target.value) || 0)}
                min={0}
                step={1000}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-600 mt-0.5">Min time between triggers (0 = no limit)</p>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={e => set('enabled', e.target.checked)}
                  className="accent-emerald-500"
                />
                Enabled on creation
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5"
          >
            <Save className="w-3 h-3" />
            {isNew ? 'Create Rule' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AutomationManager() {
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [liveEvents, setLiveEvents] = useState<Array<{ id: string; ruleId: string; ruleName: string; action: string; ts: number }>>([]);

  // Editor state
  const [editorRule, setEditorRule] = useState<AutomationRule | null | 'new'>('new' as any);
  const [editorOpen, setEditorOpen] = useState(false);

  const api = (window.electron?.api as any) ?? (window as any).electronAPI;

  const showMsg = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadSettings = useCallback(async () => {
    try {
      const settings = await api?.automation?.getSettings?.();
      if (settings) setRules(settings.rules ?? []);
    } catch (err) {
      console.error('[AutomationManager] loadSettings:', err);
    }
  }, [api]);

  const loadStatistics = useCallback(async () => {
    try {
      const s = await api?.automation?.getStatistics?.();
      if (s) setStats(s);
    } catch (err) {
      console.error('[AutomationManager] loadStatistics:', err);
    }
  }, [api]);

  useEffect(() => {
    loadSettings();
    loadStatistics();
    const interval = setInterval(loadStatistics, 5000);
    return () => clearInterval(interval);
  }, [loadSettings, loadStatistics]);

  // ── Live rule-executed notifications ────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = api?.automation?.onRuleExecuted?.((data: any) => {
      setLiveEvents(prev => [
        { id: `${Date.now()}-${Math.random()}`, ruleId: data.ruleId, ruleName: data.ruleName ?? data.ruleId, action: data.action ?? 'triggered', ts: Date.now() },
        ...prev.slice(0, 49), // keep last 50
      ]);
      // Refresh stats so counters update immediately on rule execution
      void loadStatistics();
    });
    return () => { unsubscribe?.(); };
  }, [api, loadStatistics]);

  const toggleEngine = async () => {
    try {
      if (stats?.isRunning) {
        await api?.automation?.stop?.();
        showMsg('Automation engine stopped.');
      } else {
        await api?.automation?.start?.();
        showMsg('Automation engine started.');
      }
      await loadStatistics();
    } catch {
      showMsg('Failed to toggle automation engine.', 'err');
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await api?.automation?.toggleRule?.(ruleId, enabled);
      await loadSettings();
      showMsg(`Rule ${enabled ? 'enabled' : 'disabled'}.`);
    } catch {
      showMsg('Failed to toggle rule.', 'err');
    }
  };

  const triggerRule = async (ruleId: string) => {
    try {
      await api?.automation?.triggerRule?.(ruleId);
      showMsg('Rule triggered.');
      await loadStatistics();
    } catch {
      showMsg('Failed to trigger rule.', 'err');
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const next = rules.filter(r => r.id !== ruleId);
      await api?.automation?.updateSettings?.({ rules: next });
      setRules(next);
      showMsg('Rule deleted.');
      if (stats?.isRunning) {
        await api?.automation?.stop?.();
        await api?.automation?.start?.();
      }
    } catch {
      showMsg('Failed to delete rule.', 'err');
    }
  };

  const saveRule = async (rule: AutomationRule) => {
    try {
      const existing = rules.find(r => r.id === rule.id);
      let next: AutomationRule[];
      if (existing) {
        next = rules.map(r => (r.id === rule.id ? rule : r));
      } else {
        next = [...rules, rule];
      }
      await api?.automation?.updateSettings?.({ rules: next });
      setRules(next);
      setEditorOpen(false);
      showMsg(existing ? 'Rule saved.' : 'Rule created.');
      if (stats?.isRunning) {
        await api?.automation?.stop?.();
        await api?.automation?.start?.();
      }
    } catch {
      showMsg('Failed to save rule.', 'err');
    }
  };

  const resetStatistics = async () => {
    try {
      setRefreshing(true);
      await api?.automation?.resetStatistics?.();
      await loadStatistics();
      showMsg('Statistics reset.');
    } catch {
      showMsg('Failed to reset statistics.', 'err');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalRuns = stats?.rules.reduce((sum, r) => sum + (r.runCount || 0), 0) ?? 0;
  const enabledRules = rules.filter(r => r.enabled).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Editor Modal */}
      {editorOpen && (
        <RuleEditor
          rule={editorRule === 'new' ? null : (editorRule as AutomationRule)}
          onSave={saveRule}
          onCancel={() => setEditorOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Settings className="w-6 h-6 text-emerald-400" />
            Automation Manager
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Background rules that watch your mod files and respond automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setRefreshing(true); loadStatistics().finally(() => setRefreshing(false)); }}
            className="p-2 rounded border border-slate-700 hover:bg-slate-800 transition text-slate-400"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditorRule('new' as any); setEditorOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-indigo-700 hover:bg-indigo-600 text-white border border-indigo-500 transition"
          >
            <Plus className="w-4 h-4" /> New Rule
          </button>
          <button
            onClick={toggleEngine}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition ${
              stats?.isRunning
                ? 'bg-red-700/80 hover:bg-red-700 text-white border border-red-600/50'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500'
            }`}
          >
            {stats?.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {stats?.isRunning ? 'Stop Engine' : 'Start Engine'}
          </button>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${
          message.type === 'ok'
            ? 'bg-emerald-900/20 border-emerald-600/30 text-emerald-300'
            : 'bg-red-900/20 border-red-600/30 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            icon: stats?.isRunning ? CheckCircle2 : AlertTriangle,
            color: stats?.isRunning ? 'text-emerald-400' : 'text-yellow-400',
            label: 'Engine',
            value: stats?.isRunning ? 'Running' : 'Stopped',
          },
          {
            icon: FolderSync,
            color: 'text-blue-400',
            label: 'File Watchers',
            value: stats?.activeWatchers ?? 0,
          },
          {
            icon: Timer,
            color: 'text-purple-400',
            label: 'Scheduled',
            value: stats?.activeIntervals ?? 0,
          },
          {
            icon: RefreshCw,
            color: 'text-emerald-400',
            label: 'Total Executions',
            value: totalRuns,
          },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-slate-400 text-xs font-medium">{label}</span>
            </div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Rules list */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-100">Automation Rules</h2>
            <span className="text-[11px] text-slate-500">{enabledRules}/{rules.length} enabled</span>
          </div>
          <button
            onClick={resetStatistics}
            className="text-xs text-slate-500 hover:text-slate-300 transition underline"
          >
            Reset run counts
          </button>
        </div>

        {rules.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            No automation rules configured.{' '}
            <button
              onClick={() => { setEditorRule('new' as any); setEditorOpen(true); }}
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Create your first rule.
            </button>
          </div>
        )}

        <div className="divide-y divide-slate-800/60">
          {rules.map(rule => {
            const ruleStats = stats?.rules.find(r => r.id === rule.id);
            const trigMeta = TRIGGER_META[rule.trigger] ?? TRIGGER_META['manual'];
            const TrigIcon = trigMeta.icon;
            const actMeta = AVAILABLE_ACTIONS.find(a => a.value === rule.action);
            const ActIcon = actMeta?.icon ?? Settings;
            const isExpanded = expandedRules.has(rule.id);

            return (
              <div key={rule.id} className={`transition-colors ${rule.enabled ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-3 px-5 py-4">

                  {/* Trigger icon */}
                  <div className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
                    <TrigIcon className={`w-4 h-4 ${trigMeta.color}`} />
                  </div>

                  {/* Rule info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-100">{rule.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        rule.enabled
                          ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}>
                        {rule.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`text-[11px] flex items-center gap-1 ${trigMeta.color}`}>
                        <TrigIcon className="w-3 h-3" />
                        {trigMeta.label}
                      </span>
                      {actMeta && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <ActIcon className="w-3 h-3" />
                          {actMeta.label}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        Runs: <span className="text-slate-300">{ruleStats?.runCount ?? 0}</span>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Last: <span className="text-slate-300">{formatLastRun(ruleStats?.lastRun)}</span>
                      </span>
                      {rule.cooldownMs ? (
                        <span className="text-[11px] text-slate-500">
                          Cooldown: <span className="text-slate-400">{formatCooldown(rule.cooldownMs)}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleExpand(rule.id)}
                      className="p-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-400 transition"
                      title="Show details"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => { setEditorRule(rule); setEditorOpen(true); }}
                      className="p-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-400 transition"
                      title="Edit rule"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => triggerRule(rule.id)}
                      disabled={!stats?.isRunning}
                      className="px-3 py-1.5 text-xs bg-blue-700/80 hover:bg-blue-700 text-white rounded border border-blue-600/50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      title={stats?.isRunning ? 'Trigger now' : 'Engine must be running'}
                    >
                      Run
                    </button>
                    <button
                      onClick={() => toggleRule(rule.id, !rule.enabled)}
                      className={`px-3 py-1.5 text-xs rounded border transition font-semibold ${
                        rule.enabled
                          ? 'bg-emerald-800/60 hover:bg-emerald-700/60 border-emerald-700/50 text-emerald-200'
                          : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-300'
                      }`}
                    >
                      {rule.enabled ? 'On' : 'Off'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete rule "${rule.name}"?`)) {
                          deleteRule(rule.id);
                        }
                      }}
                      className="p-1.5 rounded border border-red-800/40 hover:bg-red-900/20 text-red-500 transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-4 ml-11">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 space-y-2">
                      {rule.description && (
                        <div className="flex gap-2 text-xs text-slate-300">
                          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span>{rule.description}</span>
                        </div>
                      )}
                      {rule.watchExtensions && rule.watchExtensions.length > 0 && (
                        <div className="text-[11px] text-slate-400">
                          <span className="text-slate-500">Watches: </span>
                          {rule.watchExtensions.map(ext => (
                            <span key={ext} className="inline-block mr-1.5 px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">{ext}</span>
                          ))}
                        </div>
                      )}
                      {rule.params && Object.keys(rule.params).length > 0 && (
                        <div className="text-[11px] text-slate-400">
                          <span className="text-slate-500">Params: </span>
                          {Object.entries(rule.params).map(([k, v]) => (
                            <span key={k} className="mr-3">
                              <span className="text-slate-500">{k}:</span>{' '}
                              <span className="text-slate-300 font-mono">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500">ID: <span className="font-mono text-slate-400">{rule.id}</span></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live rule execution feed */}
      {liveEvents.length > 0 && (
        <div className="mt-5 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Activity
            </h2>
            <button onClick={() => setLiveEvents([])} className="text-xs text-slate-500 hover:text-slate-300 transition underline">Clear</button>
          </div>
          <div className="divide-y divide-slate-800/40 max-h-48 overflow-y-auto">
            {liveEvents.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 px-5 py-2.5 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-slate-300 font-medium truncate">{ev.ruleName}</span>
                <span className="text-slate-500">→</span>
                <span className="text-emerald-400 font-mono">{ev.action}</span>
                <span className="ml-auto text-slate-600 tabular-nums shrink-0">
                  {new Date(ev.ts).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info cards */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-950/20 border border-blue-700/20 rounded-lg">
          <h3 className="font-semibold text-blue-300 text-sm mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" /> Trigger Types
          </h3>
          <div className="space-y-1.5 text-xs text-slate-300">
            {Object.entries(TRIGGER_META).map(([k, v]) => {
              const Icon = v.icon;
              return (
                <div key={k} className="flex items-start gap-2">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${v.color}`} />
                  <div><span className="text-white">{v.label}</span> — {
                    k === 'file-change'   ? 'Fires when monitored file extensions change in the watch path.' :
                    k === 'process-start' ? 'Fires when a target process (e.g., Fallout4.exe, CreationKit.exe) launches.' :
                    k === 'process-stop'  ? 'Fires when a monitored process exits.' :
                    k === 'schedule'      ? 'Fires on a repeating time schedule (daily/weekly).' :
                                           'Fires only when manually triggered from this panel.'
                  }</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-emerald-950/20 border border-emerald-700/20 rounded-lg">
          <h3 className="font-semibold text-emerald-300 text-sm mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Common Automations
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li>• Conflict-scan whenever a plugin is added to the Data folder</li>
            <li>• Start log monitoring the moment Fallout4.exe launches</li>
            <li>• Run nightly maintenance to detect duplicates and orphaned assets</li>
            <li>• Auto-validate load order when plugins.txt changes</li>
            <li>• Auto-compile Papyrus scripts on .psc file save (opt-in)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
