import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, ArrowDownToLine, Settings, Eye, EyeOff, Trash2,
  Cpu, Code2, Hammer, BookOpen, Zap, MessageSquare, Sparkles,
  RefreshCw, TrendingUp, Calendar, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnalyticsConfig } from '../../shared/types';

interface AnalyticsManagerProps {
  embedded?: boolean;
  onClose?: () => void;
}

// FO4 tool display names and colors
const FO4_TOOL_META: Record<string, { label: string; color: string; icon: string }> = {
  ck:            { label: 'Creation Kit',    color: '#4ade80', icon: '🏗️' },
  blender:       { label: 'Blender',         color: '#fb923c', icon: '🎨' },
  nifskope:      { label: 'NifSkope',        color: '#60a5fa', icon: '🔷' },
  xedit:         { label: 'xEdit',           color: '#a78bfa', icon: '📝' },
  scribe:        { label: 'Papyrus Scribe',  color: '#f472b6', icon: '📜' },
  'image-suite': { label: 'Image Suite',     color: '#facc15', icon: '🖼️' },
  ba2manager:    { label: 'BA2 Manager',     color: '#34d399', icon: '📦' },
  general:       { label: 'General',         color: '#94a3b8', icon: '⚙️' },
};

interface FO4Stats {
  chatMessages: number;
  papyrusInstalls: number;
  xeditSessions: number;
  toolExecutions: number;
  neuralLinks: number;
  knowledgeIngested: number;
  toolBreakdown: Record<string, number>;
  recentActivity: any[];
  totalActions: number;
  activeDays: number;
  streakDays: number;
  firstSeen: number | null;
}

function readFO4Stats(): FO4Stats {
  const raw = localStorage.getItem('mossy_ml_history');
  const history: any[] = raw ? JSON.parse(raw) : [];

  const toolBreakdown: Record<string, number> = {};
  history.forEach(h => {
    if (h.action === 'tool_execution' && h.tool) {
      const key = String(h.tool).toLowerCase().replace(/\s+/g, '_');
      toolBreakdown[key] = (toolBreakdown[key] || 0) + 1;
    }
  });

  // Active days
  const daySet = new Set(
    history
      .filter(h => h.timestamp)
      .map(h => new Date(h.timestamp).toDateString())
  );
  // Streak: consecutive days ending today
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (daySet.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }

  const sorted = [...history].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return {
    chatMessages:    history.filter(h => h.action === 'chat_message').length,
    papyrusInstalls: history.filter(h => h.action === 'scribe_install_papyrus_script').length,
    xeditSessions:   history.filter(h => h.action === 'xedit_script_execution').length,
    toolExecutions:  history.filter(h => h.action === 'tool_execution').length,
    neuralLinks:     history.filter(h => h.action === 'neural_link').length,
    knowledgeIngested: history.filter(h => h.action === 'knowledge_ingested').length,
    toolBreakdown,
    recentActivity:  [...history].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 8),
    totalActions:    history.length,
    activeDays:      daySet.size,
    streakDays:      streak,
    firstSeen:       sorted[0]?.timestamp || null,
  };
}

// Minimal inline bar chart
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{value}</span>
    </div>
  );
}

// Activity heatmap: last 35 days as a 5-row grid
function ActivityHeatmap({ history }: { history: any[] }) {
  const dayCounts: Record<string, number> = {};
  history.forEach(h => {
    if (h.timestamp) {
      const key = new Date(h.timestamp).toDateString();
      dayCounts[key] = (dayCounts[key] || 0) + 1;
    }
  });
  const days: { date: Date; count: number }[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ date: d, count: dayCounts[d.toDateString()] || 0 });
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);
  function intensity(count: number) {
    if (count === 0) return '#1f2937';
    const pct = count / maxCount;
    if (pct < 0.25) return '#14532d';
    if (pct < 0.5)  return '#166534';
    if (pct < 0.75) return '#15803d';
    return '#22c55e';
  }
  return (
    <div>
      <div className="flex flex-wrap gap-[3px]">
        {days.map((d, i) => (
          <div
            key={i}
            title={`${d.date.toLocaleDateString()}: ${d.count} action${d.count !== 1 ? 's' : ''}`}
            className="w-[14px] h-[14px] rounded-sm cursor-default"
            style={{ backgroundColor: intensity(d.count) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
        <span>Less</span>
        {['#1f2937','#14532d','#166534','#15803d','#22c55e'].map((c,i) => (
          <div key={i} className="w-[10px] h-[10px] rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export const AnalyticsManager: React.FC<AnalyticsManagerProps> = ({ embedded = false }) => {
  const [config, setConfig]               = useState<AnalyticsConfig | null>(null);
  const [metrics, setMetrics]             = useState<any>(null);
  const [events, setEvents]               = useState<any[]>([]);
  const [fo4Stats, setFo4Stats]           = useState<FO4Stats | null>(null);
  const [loading, setLoading]             = useState(true);
  const [showRawData, setShowRawData]     = useState(false);
  const [showConfig, setShowConfig]       = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorText, setAdvisorText]     = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // FO4 stats — direct localStorage (real data, no IPC needed)
      setFo4Stats(readFO4Stats());

      // Config from main process (now wired correctly)
      if (window.electronAPI?.getAnalyticsConfig) {
        const cfg = await window.electronAPI.getAnalyticsConfig();
        if (cfg) {
          setConfig({
            enabled:          !!cfg.enabled,
            anonymousId:      cfg.anonymousId || 'Not generated',
            dataRetentionDays: cfg.dataRetentionDays || cfg.dataRetention || 90,
            categories:       cfg.categories || { usage: true, performance: true, errors: true, features: true },
            destinations:     cfg.destinations || { local: true, remote: false },
          });
        }
      }

      // Generic metrics
      if (window.electronAPI?.getAnalyticsMetrics) {
        const m = await window.electronAPI.getAnalyticsMetrics();
        setMetrics(m);
      }

      // Raw events for export
      if (window.electronAPI?.exportAnalyticsData) {
        try {
          const raw = await window.electronAPI.exportAnalyticsData();
          setEvents(JSON.parse(raw));
        } catch { /* no events yet */ }
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleConfigUpdate = async (updates: Partial<AnalyticsConfig>) => {
    try {
      if (window.electronAPI?.updateAnalyticsConfig) {
        await window.electronAPI.updateAnalyticsConfig(updates);
        await loadData();
        toast.success('Settings saved');
      }
    } catch { toast.error('Failed to save settings'); }
  };

  const handleExportData = async () => {
    try {
      const raw = localStorage.getItem('mossy_ml_history') || '[]';
      const blob = new Blob([raw], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `mossy-fo4-activity-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Activity log exported');
    } catch { toast.error('Export failed'); }
  };

  const handleClearData = async () => {
    if (!confirmingClear) { setConfirmingClear(true); return; }
    setConfirmingClear(false);
    try {
      if (window.electronAPI?.clearAnalyticsData) {
        await window.electronAPI.clearAnalyticsData();
      }
      localStorage.removeItem('mossy_ml_history');
      setEvents([]);
      setMetrics(null);
      setFo4Stats(readFO4Stats());
      toast.success('All analytics data cleared');
    } catch { toast.error('Failed to clear data'); }
  };

  const runAdvisor = async () => {
    if (!fo4Stats) return;
    setAdvisorLoading(true);
    setAdvisorText(null);
    try {
      const summary = [
        `AI Chat Messages: ${fo4Stats.chatMessages}`,
        `Papyrus Scripts Installed: ${fo4Stats.papyrusInstalls}`,
        `xEdit Sessions: ${fo4Stats.xeditSessions}`,
        `Tool Launches: ${fo4Stats.toolExecutions}`,
        `Neural Links (Blender): ${fo4Stats.neuralLinks}`,
        `Knowledge Ingested: ${fo4Stats.knowledgeIngested}`,
        `Active Days: ${fo4Stats.activeDays}`,
        `Current Streak: ${fo4Stats.streakDays} days`,
        `Tool Breakdown: ${Object.entries(fo4Stats.toolBreakdown).map(([k,v]) => `${k}=${v}`).join(', ') || 'none yet'}`,
      ].join('\n');

      const prompt = `You are Mossy, an expert AI assistant for Fallout 4 modding.

Here is a summary of this modder's activity in the Mossy AI tool:
${summary}

Based on this data, give them:
1. A brief "Modding Profile" assessment (1-2 sentences) — what kind of modder they are (scripter, artist, quest designer, optimizer, etc.)
2. Their top strength based on most-used tools
3. One specific actionable suggestion to level up their FO4 modding workflow, tailored to their actual usage pattern
4. One FO4 modding skill they might want to explore next

Be specific, encouraging, and use real FO4 terminology. Keep it under 200 words total.`;

      let text = '';
      // Try backend proxy first
      try {
        const resp = await fetch('https://mossy.onrender.com/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            max_tokens: 350,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          text = data?.choices?.[0]?.message?.content
            || data?.content?.[0]?.text
            || data?.text
            || '';
        }
      } catch { /* fallback */ }

      // Fallback: generate a basic profile locally
      if (!text) {
        const top = Object.entries(fo4Stats.toolBreakdown).sort((a, b) => b[1] - a[1])[0];
        const topTool = top ? (FO4_TOOL_META[top[0]]?.label || top[0]) : null;
        if (fo4Stats.papyrusInstalls > fo4Stats.toolExecutions) {
          text = `You're primarily a scripter — your heavy Papyrus usage shows you're building complex mod logic. ${topTool ? `Your most-used tool is ${topTool}.` : ''} Consider using the Creation Kit's Object Window more to wire your scripts to in-game objects. Next skill to explore: Quest scripting with GetActorRef and SetStage.`;
        } else if (fo4Stats.neuralLinks > 0 || (fo4Stats.toolBreakdown['blender'] || 0) > 0) {
          text = `You're a 3D artist — your Blender/NifSkope usage puts you in the asset creation space. ${topTool ? `Your main tool is ${topTool}.` : ''} Make sure your mesh LODs are baked in Blender before NifSkope export to avoid pop-in. Next skill: custom armor slots using ArmorAddon records in xEdit.`;
        } else if (fo4Stats.chatMessages > 10) {
          text = `You're an AI-assisted modder — you're leveraging Mossy heavily for guidance. ${topTool ? `Your main tool is ${topTool}.` : ''} Try adding more mods to the Knowledge Vault so Mossy can give you even more targeted FO4 advice. Next skill: using xEdit to clean master files and patch conflicts.`;
        } else {
          text = `You're just getting started with Mossy! Try the Papyrus Scribe for your first script, or use the Chat to ask about any FO4 modding topic. Your modding journey begins here.`;
        }
      }

      setAdvisorText(text);
    } catch (err) {
      toast.error('Advisor unavailable — check your connection');
    } finally {
      setAdvisorLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    );
  }

  const s = fo4Stats!;
  const toolEntries = Object.entries(s.toolBreakdown).sort((a, b) => b[1] - a[1]);
  const maxToolUsage = Math.max(...toolEntries.map(([, v]) => v), 1);
  const rawHistory: any[] = JSON.parse(localStorage.getItem('mossy_ml_history') || '[]');

  return (
    <div className={embedded ? 'p-4 space-y-5' : 'p-6 space-y-5'}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-green-400" />
          <h2 className="text-2xl font-bold text-green-400">FO4 Modding Analytics</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button
            onClick={handleExportData}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
          >
            <ArrowDownToLine className="w-3 h-3" /> Export
          </button>
          {confirmingClear ? (
            <div className="flex items-center gap-1">
              <span className="text-red-400 text-sm font-semibold">Sure?</span>
              <button onClick={handleClearData} className="px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded text-sm font-bold">
                Yes, Clear
              </button>
              <button onClick={() => setConfirmingClear(false)} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleClearData}
              className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── FO4 Activity Stats (the real stuff) ── */}
      <div className="bg-gray-800/50 border border-green-500/20 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Your FO4 Modding Activity
        </h3>

        {/* Big stat cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
          {[
            { icon: <MessageSquare className="w-4 h-4" />, label: 'AI Chats',         value: s.chatMessages,    color: 'text-green-400' },
            { icon: <Code2 className="w-4 h-4" />,         label: 'Papyrus Scripts',  value: s.papyrusInstalls, color: 'text-pink-400' },
            { icon: <BookOpen className="w-4 h-4" />,      label: 'xEdit Sessions',   value: s.xeditSessions,   color: 'text-purple-400' },
            { icon: <Hammer className="w-4 h-4" />,        label: 'Tool Launches',    value: s.toolExecutions,  color: 'text-orange-400' },
            { icon: <Zap className="w-4 h-4" />,           label: 'Neural Links',     value: s.neuralLinks,     color: 'text-blue-400' },
            { icon: <BookOpen className="w-4 h-4" />,      label: 'Knowledge Added',  value: s.knowledgeIngested, color: 'text-yellow-400' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="bg-gray-900/60 rounded-lg p-3 text-center">
              <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-gray-500 text-xs leading-tight mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Streak / active days */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-gray-900/60 rounded-lg p-3 flex items-center gap-3">
            <Award className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <div className="text-yellow-400 font-bold text-lg">{s.streakDays} day{s.streakDays !== 1 ? 's' : ''}</div>
              <div className="text-gray-500 text-xs">Current streak</div>
            </div>
          </div>
          <div className="flex-1 bg-gray-900/60 rounded-lg p-3 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-cyan-400 font-bold text-lg">{s.activeDays}</div>
              <div className="text-gray-500 text-xs">Active days total</div>
            </div>
          </div>
          <div className="flex-1 bg-gray-900/60 rounded-lg p-3 flex items-center gap-3">
            <Cpu className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <div className="text-green-400 font-bold text-lg">{s.totalActions}</div>
              <div className="text-gray-500 text-xs">Total actions</div>
            </div>
          </div>
        </div>

        {/* Activity heatmap */}
        <div className="mb-5">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Activity — Last 35 Days</h4>
          <ActivityHeatmap history={rawHistory} />
        </div>

        {/* Tool breakdown */}
        {toolEntries.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Tool Usage Breakdown</h4>
            <div className="space-y-2">
              {toolEntries.map(([key, count]) => {
                const meta = FO4_TOOL_META[key] || { label: key, color: '#94a3b8', icon: '🔧' };
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center shrink-0">{meta.icon}</span>
                    <span className="text-gray-300 text-sm w-32 shrink-0">{meta.label}</span>
                    <MiniBar value={count} max={maxToolUsage} color={meta.color} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {s.totalActions === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No activity recorded yet. Start using Mossy's tools and your stats will appear here!
          </div>
        )}
      </div>

      {/* ── AI Modding Advisor ── */}
      <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Mossy AI Modding Advisor
          </h3>
          <button
            onClick={runAdvisor}
            disabled={advisorLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors text-sm font-medium"
          >
            {advisorLoading ? (
              <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-3 h-3" /> Analyze My Workflow</>
            )}
          </button>
        </div>

        {advisorText ? (
          <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
            {advisorText}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            Click <strong className="text-purple-300">Analyze My Workflow</strong> to get a personalized FO4 modding assessment based on your actual activity — what kind of modder you are, your strengths, and what to learn next.
          </p>
        )}
      </div>

      {/* ── Recent Activity Feed ── */}
      {s.recentActivity.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {s.recentActivity.map((item, i) => {
              const ts = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown time';
              const action = item.action || item.event || 'action';
              const tool   = item.tool   ? ` · ${item.tool}` : '';
              return (
                <div key={i} className="flex items-start gap-2 text-sm py-1 border-b border-gray-700/50 last:border-0">
                  <span className="text-gray-500 text-xs shrink-0 pt-0.5 w-36">{ts}</span>
                  <span className="text-gray-300">
                    <span className="text-green-400 font-mono">{action}</span>
                    {tool && <span className="text-gray-500">{tool}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Privacy & Config (collapsed by default) ── */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2 text-white font-semibold">
            <Settings className="w-5 h-5" />
            Privacy & Analytics Config
          </span>
          {showConfig ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showConfig && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-700">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-4">
              <p className="text-blue-300 text-sm font-semibold mb-1">Privacy-First Analytics</p>
              <p className="text-gray-400 text-xs">
                All activity data is stored locally on your machine only. Nothing is sent externally without your explicit consent.
                Your mod files, scripts, and project contents are never logged.
              </p>
            </div>

            {config && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-medium text-sm">Enable Event Tracking</label>
                    <p className="text-gray-400 text-xs">Tracks which Mossy features you use (locally only)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={e => handleConfigUpdate({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium text-sm mb-1">Data Retention</label>
                    <select
                      value={config.dataRetentionDays || 90}
                      onChange={e => handleConfigUpdate({ dataRetentionDays: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-green-500 focus:outline-none"
                    >
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>6 months</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white font-medium text-sm mb-1">Anonymous ID</label>
                    <input
                      type="text"
                      value={config.anonymousId || 'Not generated'}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-400 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white font-medium text-sm">Tracked Categories</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(config.categories || {}).map(([cat, enabled]) => (
                      <label key={cat} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!enabled}
                          onChange={e => {
                            const next = { ...config.categories, [cat]: e.target.checked } as AnalyticsConfig['categories'];
                            handleConfigUpdate({ categories: next });
                          }}
                          className="rounded border-gray-600 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-gray-300 capitalize">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Raw Data (collapsed by default) ── */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg">
        <button
          onClick={() => setShowRawData(!showRawData)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2 text-white font-medium text-sm">
            {showRawData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Raw Event Log {events.length > 0 && `(${events.length} events)`}
          </span>
          {showRawData ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showRawData && (
          <div className="px-4 pb-4 border-t border-gray-700">
            {events.length > 0 ? (
              <>
                <div className="bg-gray-900 rounded p-3 max-h-64 overflow-y-auto mt-3">
                  <pre className="text-green-400 text-xs whitespace-pre-wrap">
                    {JSON.stringify(events.slice(-30), null, 2)}
                  </pre>
                </div>
                {events.length > 30 && (
                  <p className="text-gray-500 text-xs mt-1">Showing last 30 of {events.length} events</p>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm py-3">No IPC-tracked events yet. Activity from FO4 tools is tracked in the sections above.</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
