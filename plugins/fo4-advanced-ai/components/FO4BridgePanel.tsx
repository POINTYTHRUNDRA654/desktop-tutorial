import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wifi, WifiOff, Activity, Brain, Database, MessageSquare,
  RefreshCw, ChevronDown, ChevronRight, User, Heart, Clock,
  AlertTriangle, CheckCircle, Cpu, Bug, Shield, Zap, Search
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

const BRIDGE_URL = 'http://localhost:28485';

interface BridgeStatus {
  connected: boolean;
  game_running: boolean;
  mod_enabled: boolean;
  actors_overridden: number;
  session_errors: number;
  modules: {
    creatures: boolean;
    npcs: boolean;
    companions: boolean;
    robots: boolean;
    group_tactics: boolean;
  };
  last_log_line: string;
  last_update: string;
  bridge_version: string;
}

interface LogLine {
  time: string;
  line: string;
}

interface NPCSummary {
  npc_id: string;
  npc_name: string;
  npc_race: string;
  npc_faction: string;
  first_met: string;
  last_seen: string;
  affinity: number;
  emotion: number;
  relationship: string;
  total_encounters: number;
  memory_count: number;
  dialogue_count: number;
}

interface NPCMemory {
  found: boolean;
  npc_id: string;
  identity: Record<string, any>;
  memories: Array<{ event_label: string; detail: string; real_time: string }>;
  dialogue: Array<{ speaker: string; line: string; topic: string; real_time: string }>;
  relationship: Record<string, any> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const EMOTION_LABELS = ['Neutral', 'Happy', 'Concerned', 'Angry'];
const EMOTION_COLORS = ['text-slate-400', 'text-emerald-400', 'text-amber-400', 'text-red-400'];

function affinityLabel(val: number): string {
  if (val >= 750)  return 'Idolizes';
  if (val >= 250)  return 'Likes';
  if (val <= -750) return 'Loathes';
  if (val <= -250) return 'Dislikes';
  return 'Neutral';
}

function affinityColor(val: number): string {
  if (val >= 750)  return 'text-emerald-400';
  if (val >= 250)  return 'text-blue-400';
  if (val <= -750) return 'text-red-400';
  if (val <= -250) return 'text-amber-400';
  return 'text-slate-400';
}

async function bridgeFetch(endpoint: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(`${BRIDGE_URL}${endpoint}`, {
    ...opts,
    signal: AbortSignal.timeout(3000),
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const ModuleChip: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-mono
    ${active
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : 'text-slate-600 bg-slate-800/40 border-slate-700/30'}`}
  >
    <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
    {label}
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title, icon, children, defaultOpen = true
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-mono text-emerald-400">{icon} {title}</div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="p-4 bg-slate-900/40">{children}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const FO4BridgePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'log' | 'memory' | 'npc'>('status');
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [npcs, setNpcs] = useState<NPCSummary[]>([]);
  const [selectedNPC, setSelectedNPC] = useState<NPCMemory | null>(null);
  const [selectedNPCId, setSelectedNPCId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [npcSearch, setNpcSearch] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Connect / Poll ─────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const data = await bridgeFetch('/status');
      setStatus(data);
      setBridgeOnline(true);
    } catch {
      setBridgeOnline(false);
      setStatus(null);
    }
  }, []);

  const fetchLog = useCallback(async () => {
    if (!bridgeOnline) return;
    try {
      const data = await bridgeFetch('/log?n=100');
      setLogLines(data.lines || []);
    } catch {}
  }, [bridgeOnline]);

  const fetchNPCs = useCallback(async () => {
    if (!bridgeOnline) return;
    try {
      const data = await bridgeFetch('/memory/npcs');
      setNpcs(data.npcs || []);
    } catch {}
  }, [bridgeOnline]);

  const fetchNPCDetail = useCallback(async (npcId: string) => {
    try {
      const data = await bridgeFetch(`/memory/npc?id=${encodeURIComponent(npcId)}`);
      setSelectedNPC(data);
      setSelectedNPCId(npcId);
      setActiveTab('npc');
    } catch {}
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    await fetchStatus();
    setConnecting(false);
  }, [fetchStatus]);

  // Auto-poll
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
      if (activeTab === 'log') fetchLog();
      if (activeTab === 'memory') fetchNPCs();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchLog, fetchNPCs, activeTab]);

  // Auto-scroll log
  useEffect(() => {
    if (activeTab === 'log') {
      fetchLog();
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (activeTab === 'memory') fetchNPCs();
  }, [activeTab, fetchLog, fetchNPCs]);

  const filteredNPCs = npcs.filter(n =>
    !npcSearch || n.npc_name.toLowerCase().includes(npcSearch.toLowerCase())
  );

  const tabs = [
    { id: 'status', label: 'Status',  icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'log',    label: 'Live Log', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'memory', label: 'NPC Memory', icon: <Database className="w-3.5 h-3.5" />, badge: npcs.length || undefined },
    ...(selectedNPC ? [{ id: 'npc', label: selectedNPC.identity?.npc_name || 'NPC', icon: <User className="w-3.5 h-3.5" /> }] : []),
  ] as const;

  return (
    <div className="flex flex-col h-full bg-[#050910] text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${bridgeOnline
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-slate-800/60 border-slate-700/40'}`}
          >
            {bridgeOnline ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-slate-500" />}
          </div>
          <div>
            <h1 className="text-base font-mono font-semibold text-slate-100">FO4 Advanced AI Bridge</h1>
            <p className="text-xs text-slate-500">
              {bridgeOnline
                ? `Connected — v${status?.bridge_version || '...'} | ${status?.game_running ? 'Game running' : 'Game not detected'}`
                : 'Not connected — run start_fo4_bridge.bat'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!bridgeOnline && (
            <div className="px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
              <p className="text-[10px] font-mono text-amber-400">
                Run: bridge/start_fo4_bridge.bat
              </p>
            </div>
          )}
          <button
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
                       bg-emerald-500/10 border border-emerald-500/30 rounded-md
                       text-emerald-400 hover:bg-emerald-500/20 transition-colors
                       disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${connecting ? 'animate-spin' : ''}`} />
            {connecting ? 'Connecting...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 flex-shrink-0 border-b border-slate-800/60">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-t transition-colors
              ${activeTab === tab.id
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab.icon} {tab.label}
            {'badge' in tab && tab.badge ? (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/20 text-emerald-400 rounded-full">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* STATUS TAB */}
        {activeTab === 'status' && (
          <div className="max-w-2xl space-y-4">
            {!bridgeOnline ? (
              <div className="p-6 rounded-xl border border-slate-700/40 bg-slate-900/30 text-center space-y-4">
                <WifiOff className="w-10 h-10 text-slate-600 mx-auto" />
                <div>
                  <p className="text-sm font-mono text-slate-300 mb-1">Bridge Offline</p>
                  <p className="text-xs text-slate-500">Start the bridge server to connect Mossy to Fallout 4.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/40 text-left">
                  <p className="text-[10px] font-mono text-slate-500 mb-2 uppercase tracking-wider">How to start:</p>
                  <code className="text-xs font-mono text-emerald-400 block">
                    Double-click: bridge/start_fo4_bridge.bat
                  </code>
                  <p className="text-[10px] text-slate-500 mt-1">Requires Python 3.10+</p>
                </div>
              </div>
            ) : status ? (
              <>
                {/* Live stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Actors Enhanced', value: status.actors_overridden, color: 'text-emerald-400' },
                    { label: 'Session Errors',  value: status.session_errors,    color: status.session_errors > 0 ? 'text-red-400' : 'text-slate-400' },
                    { label: 'NPC Memories',    value: npcs.length,              color: 'text-blue-400' },
                  ].map(s => (
                    <div key={s.label} className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/40 text-center">
                      <div className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Mod status */}
                <Section title="Mod Status" icon={<Activity className="w-3.5 h-3.5" />}>
                  <div className="flex items-center gap-2 mb-3">
                    {status.mod_enabled
                      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                      : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    <span className={`text-xs font-mono ${status.mod_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {status.mod_enabled ? 'Advanced AI Active' : 'Mod not detected in game'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ModuleChip label="Creatures"    active={status.modules.creatures} />
                    <ModuleChip label="Humanoid NPCs" active={status.modules.npcs} />
                    <ModuleChip label="Companions"   active={status.modules.companions} />
                    <ModuleChip label="Robots/Synths" active={status.modules.robots} />
                    <ModuleChip label="Group Tactics" active={status.modules.group_tactics} />
                  </div>
                  {status.last_log_line && (
                    <p className="mt-3 text-[10px] font-mono text-slate-500 truncate">
                      Last: {status.last_log_line}
                    </p>
                  )}
                </Section>

                {/* Why external memory is powerful */}
                <Section title="External Memory System" icon={<Database className="w-3.5 h-3.5" />}>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                      <p className="text-xs font-mono text-emerald-400 mb-1 flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5" /> How this advances the AI
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Papyrus scripts can only hold a handful of integer memory slots per NPC.
                        The Mossy Bridge stores <span className="text-emerald-400">unlimited conversation history</span> on
                        your PC — every action, dialogue exchange, and affinity change.
                        NPCs can query this database to recall specific events and respond
                        naturally, like a real conversation partner.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                      <Database className="w-3 h-3" />
                      <span>Database: Documents\My Games\Fallout4\AdvancedAI_Memory.db</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                      <MessageSquare className="w-3 h-3" />
                      <span>{npcs.length} NPCs tracked | {npcs.reduce((a, n) => a + n.dialogue_count, 0)} dialogue lines stored</span>
                    </div>
                  </div>
                </Section>
              </>
            ) : null}
          </div>
        )}

        {/* LOG TAB */}
        {activeTab === 'log' && (
          <div className="max-w-3xl">
            {logLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Zap className="w-8 h-8 text-slate-700" />
                <p className="text-xs font-mono text-slate-500">
                  {bridgeOnline ? 'No [AAI] log lines yet — enable debug logging in MCM' : 'Bridge offline'}
                </p>
              </div>
            ) : (
              <div className="font-mono text-xs space-y-px">
                {logLines.map((line, i) => (
                  <div key={i} className="flex gap-3 px-3 py-1.5 rounded hover:bg-slate-800/40 transition-colors">
                    <span className="text-slate-600 flex-shrink-0 w-20 truncate">
                      {line.time.slice(11, 19)}
                    </span>
                    <span className={
                      line.line.includes('ERROR') || line.line.includes('error')
                        ? 'text-red-400'
                        : line.line.includes('ENRAGE') || line.line.includes('Ambush')
                        ? 'text-amber-400'
                        : line.line.includes('Memory') || line.line.includes('dialogue')
                        ? 'text-blue-400'
                        : 'text-slate-300'
                    }>{line.line}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        )}

        {/* MEMORY TAB */}
        {activeTab === 'memory' && (
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text" placeholder="Search NPCs..."
                  value={npcSearch}
                  onChange={e => setNpcSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700/50
                             rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <button onClick={fetchNPCs}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-slate-700 rounded
                           text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {filteredNPCs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Database className="w-8 h-8 text-slate-700" />
                <p className="text-xs font-mono text-slate-500">
                  No NPC memories yet. Play with the mod active and talk to companions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNPCs.map(npc => (
                  <button key={npc.npc_id} onClick={() => fetchNPCDetail(npc.npc_id)}
                    className="w-full text-left p-4 rounded-lg border border-slate-700/40 bg-slate-800/30
                               hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-slate-700/60 border border-slate-600/40">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-mono text-slate-200 group-hover:text-emerald-400 transition-colors">
                            {npc.npc_name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {npc.npc_race || 'Unknown race'} · {npc.npc_faction || 'No faction'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className={`text-xs font-mono ${affinityColor(npc.affinity)}`}>
                            {affinityLabel(npc.affinity)}
                          </p>
                          <p className={`text-[9px] font-mono ${EMOTION_COLORS[npc.emotion] || 'text-slate-500'}`}>
                            {EMOTION_LABELS[npc.emotion] || 'Neutral'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-slate-500">
                      <span className="flex items-center gap-1">
                        <Brain className="w-3 h-3" /> {npc.memory_count} memories
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {npc.dialogue_count} dialogue lines
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {npc.total_encounters} encounters
                      </span>
                      <span className="capitalize">{npc.relationship || 'stranger'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NPC DETAIL TAB */}
        {activeTab === 'npc' && selectedNPC && (
          <div className="max-w-2xl space-y-4">
            {!selectedNPC.found ? (
              <p className="text-xs font-mono text-slate-500">NPC not found in memory database.</p>
            ) : (
              <>
                {/* Identity */}
                <div className="p-4 rounded-xl border border-slate-700/40 bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <User className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-mono font-semibold text-slate-100">
                        {selectedNPC.identity.npc_name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {selectedNPC.identity.npc_race} · {selectedNPC.identity.npc_faction}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className={`text-sm font-mono font-bold ${affinityColor(selectedNPC.identity.affinity)}`}>
                        {affinityLabel(selectedNPC.identity.affinity)}
                      </p>
                      <p className={`text-[10px] font-mono ${EMOTION_COLORS[selectedNPC.identity.emotion] || ''}`}>
                        {EMOTION_LABELS[selectedNPC.identity.emotion] || 'Neutral'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-500">
                    <div>First met: <span className="text-slate-400">{selectedNPC.identity.first_met?.slice(0,10) || '—'}</span></div>
                    <div>Last seen: <span className="text-slate-400">{selectedNPC.identity.last_seen?.slice(0,10) || '—'}</span></div>
                    <div>Relationship: <span className="text-slate-400 capitalize">{selectedNPC.relationship?.relationship || 'stranger'}</span></div>
                  </div>
                </div>

                {/* Affinity bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>Loathe (-750)</span>
                    <span className={`${affinityColor(selectedNPC.identity.affinity)} font-semibold`}>
                      {selectedNPC.identity.affinity.toFixed(0)}
                    </span>
                    <span>Idolize (+750)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 border border-slate-700/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        selectedNPC.identity.affinity >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.abs(selectedNPC.identity.affinity / 750) * 50}%`, marginLeft: selectedNPC.identity.affinity >= 0 ? '50%' : `${50 - Math.abs(selectedNPC.identity.affinity / 750) * 50}%` }}
                    />
                  </div>
                </div>

                {/* Memories */}
                <Section title="Memory Events" icon={<Brain className="w-3.5 h-3.5" />}>
                  {selectedNPC.memories.length === 0 ? (
                    <p className="text-xs text-slate-500">No memory events recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedNPC.memories.map((m, i) => (
                        <div key={i} className="flex items-start gap-3 p-2.5 rounded bg-slate-800/60 border border-slate-700/40">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-slate-300">{m.event_label || `Event`}</p>
                            {m.detail && <p className="text-[10px] text-slate-500 mt-0.5">{m.detail}</p>}
                          </div>
                          <span className="text-[9px] font-mono text-slate-600 flex-shrink-0">
                            {m.real_time?.slice(0, 16) || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Dialogue History */}
                <Section title="Dialogue History" icon={<MessageSquare className="w-3.5 h-3.5" />} defaultOpen={false}>
                  {selectedNPC.dialogue.length === 0 ? (
                    <p className="text-xs text-slate-500">No dialogue recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...selectedNPC.dialogue].reverse().map((d, i) => (
                        <div key={i} className={`p-3 rounded-lg ${
                          d.speaker === 'player'
                            ? 'bg-blue-500/5 border border-blue-500/15 ml-6'
                            : 'bg-slate-800/50 border border-slate-700/40 mr-6'
                        }`}>
                          <p className={`text-[9px] font-mono uppercase tracking-wider mb-1 ${
                            d.speaker === 'player' ? 'text-blue-400' : 'text-emerald-400'
                          }`}>{d.speaker === 'player' ? 'Player' : selectedNPC.identity.npc_name}</p>
                          <p className="text-xs text-slate-300 italic">"{d.line}"</p>
                          {d.topic && <p className="text-[9px] text-slate-600 mt-1">[{d.topic}]</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default FO4BridgePanel;
