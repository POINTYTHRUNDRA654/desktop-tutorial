import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Brain, Globe, TrendingUp, Shield,
  Zap, RefreshCw, ChevronDown, ChevronRight, Activity,
  Search, Clock, Users, Map, Star, AlertTriangle,
  ArrowUp, ArrowDown, Minus, Database, Cpu
} from 'lucide-react';

const BRIDGE_URL = 'http://localhost:28485';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ConversationLine {
  speaker_id: string;
  speaker_name: string;
  line: string;
}

interface Conversation {
  conversation_id: string;
  location: string;
  location_type: string;
  topic: string;
  npc_a_name: string;
  npc_b_name: string;
  lines: ConversationLine[];
  generated_at: string;
  ai_generated: boolean;
  delivered: boolean;
}

interface WorldEvent {
  event_type: string;
  event_subject: string;
  event_location: string;
  game_time: number;
  real_time: string;
}

interface ReputationEntry {
  faction: string;
  location: string;
  reputation: number;
  label: string;
}

interface TacticEntry {
  enemy_type: string;
  recommended_tactic: string;
  win_rate: number;
  confidence: number;
}

interface PlayerStyle {
  primary_weapon: string;
  primary_approach: string;
  recommended_counter_tactic: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function bridgeFetch(endpoint: string): Promise<any> {
  const res = await fetch(`${BRIDGE_URL}${endpoint}`, {
    signal: AbortSignal.timeout(3000)
  });
  return res.json();
}

const TOPIC_LABELS: Record<string, string> = {
  daily_life: 'Daily Life', resources: 'Resources', threats: 'Threats',
  relationships: 'Relationships', past: 'Pre-War', gossip: 'Gossip',
  rumors: 'Rumors', complaints: 'Complaints', stories: 'Stories',
  politics: 'Faction Politics', trade: 'Trade', news: 'News',
  factions: 'Factions', crime: 'Crime', weather: 'Weather',
  fear: 'Fear', mission: 'Mission', survival: 'Survival',
};

const REP_COLOR = (rep: number) =>
  rep >= 750 ? 'text-emerald-400' : rep >= 250 ? 'text-blue-400' :
  rep <= -750 ? 'text-red-400'   : rep <= -250 ? 'text-amber-400' : 'text-slate-400';

const REP_BAR_COLOR = (rep: number) =>
  rep >= 0 ? 'bg-emerald-500' : 'bg-red-500';

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string; defaultOpen?: boolean }> = ({
  title, icon, children, accent = 'text-emerald-400', defaultOpen = true
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left">
        <div className={`flex items-center gap-2 text-sm font-mono ${accent}`}>{icon} {title}</div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="p-4 bg-slate-900/40">{children}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const NPCConversationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'conversations' | 'world' | 'reputation' | 'tactics' | 'lore'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [reputation, setReputation] = useState<ReputationEntry[]>([]);
  const [playerStyle, setPlayerStyle] = useState<PlayerStyle | null>(null);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [stats, setStats] = useState({ convCount: 0, aiGenerated: 0, locationsVisited: 0 });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Status ping
      await bridgeFetch('/ping');
      setBridgeOnline(true);

      // Conversations
      const convData = await bridgeFetch('/conversations').catch(() => ({ conversations: [] }));
      const convList: Conversation[] = convData.conversations || [];
      setConversations(convList.slice(-50).reverse()); // Last 50, newest first
      setStats({
        convCount: convList.length,
        aiGenerated: convList.filter(c => c.ai_generated).length,
        locationsVisited: new Set(convList.map(c => c.location)).size,
      });

      // World events
      const worldData = await bridgeFetch('/world/events?n=30').catch(() => ({ events: [] }));
      setWorldEvents(worldData.events || []);

      // Reputation
      const repData = await bridgeFetch('/reputation/all').catch(() => ({ reputations: [] }));
      setReputation(repData.reputations || []);

      // Player style
      const styleData = await bridgeFetch('/combat/style').catch(() => null);
      if (styleData) setPlayerStyle(styleData);

    } catch {
      setBridgeOnline(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const filteredConvs = conversations.filter(c =>
    !searchTerm ||
    c.npc_a_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.npc_b_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'conversations', label: 'Conversations', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'world',         label: 'World State',   icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'reputation',    label: 'Reputation',    icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'tactics',       label: 'Enemy Tactics', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'lore',          label: 'Lore Archive',  icon: <Star className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-[#050910] text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${bridgeOnline
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-slate-800/60 border-slate-700/40'}`}>
            <MessageSquare className={`w-5 h-5 ${bridgeOnline ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
          <div>
            <h1 className="text-base font-mono font-semibold text-slate-100">NPC Conversation & World Memory</h1>
            <p className="text-xs text-slate-500">
              {bridgeOnline ? 'Live — AI-generated NPC conversations & world state tracking' : 'Bridge offline'}
            </p>
          </div>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
                     bg-emerald-500/10 border border-emerald-500/30 rounded-md
                     text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-0 border-b border-slate-800/60 flex-shrink-0">
        {[
          { label: 'Conversations',  value: stats.convCount,        color: 'text-emerald-400' },
          { label: 'AI Generated',   value: stats.aiGenerated,      color: 'text-blue-400' },
          { label: 'Locations',      value: stats.locationsVisited, color: 'text-purple-400' },
          { label: 'World Events',   value: worldEvents.length,     color: 'text-amber-400' },
        ].map((s, i) => (
          <div key={s.label} className={`px-4 py-3 text-center ${i < 3 ? 'border-r border-slate-800/60' : ''}`}>
            <div className={`text-lg font-mono font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 flex-shrink-0 border-b border-slate-800/60">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-t transition-colors
              ${activeTab === tab.id
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-slate-500 hover:text-slate-300'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex">

        {/* CONVERSATIONS TAB */}
        {activeTab === 'conversations' && (
          <div className="flex flex-1 overflow-hidden">
            {/* List */}
            <div className="w-80 flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-800/60">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                  <input type="text" placeholder="Search..." value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-slate-800/60 border border-slate-700/50
                               rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredConvs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
                    <MessageSquare className="w-6 h-6 text-slate-700" />
                    <p className="text-[10px] font-mono text-slate-600">
                      {bridgeOnline ? 'No conversations yet — enter a location in-game' : 'Bridge offline'}
                    </p>
                  </div>
                ) : filteredConvs.map(conv => (
                  <button key={conv.conversation_id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-800/40 transition-colors
                      ${selectedConv?.conversation_id === conv.conversation_id
                        ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
                        : 'hover:bg-slate-800/40'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span className="text-xs font-mono text-slate-300 truncate">
                          {conv.npc_a_name} & {conv.npc_b_name}
                        </span>
                      </div>
                      {conv.ai_generated && (
                        <span className="text-[8px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 rounded">AI</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                      <Map className="w-2.5 h-2.5" />
                      <span className="truncate">{conv.location}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono bg-slate-800/60 border border-slate-700/40 text-slate-500 px-1.5 rounded">
                        {TOPIC_LABELS[conv.topic] || conv.topic}
                      </span>
                      {conv.delivered && (
                        <span className="text-[9px] font-mono text-emerald-600">delivered</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detail */}
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedConv ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-700" />
                  <p className="text-xs font-mono text-slate-500">Select a conversation to read</p>
                  <p className="text-[10px] text-slate-600 max-w-xs">
                    AI-generated conversations appear here as NPCs talk in-game.
                    Walk into Diamond City, a settlement, or a bar.
                  </p>
                </div>
              ) : (
                <div className="max-w-lg space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-mono font-semibold text-slate-100">
                        {selectedConv.npc_a_name} & {selectedConv.npc_b_name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedConv.location} · {TOPIC_LABELS[selectedConv.topic] || selectedConv.topic}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedConv.ai_generated ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                          <Zap className="w-2.5 h-2.5" /> AI Generated
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 border border-slate-700/40 px-2 py-0.5 rounded">
                          Template
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conversation lines */}
                  <div className="space-y-3">
                    {selectedConv.lines.map((line, i) => {
                      const isA = line.speaker_id === 'npc_a';
                      return (
                        <div key={i} className={`flex items-start gap-3 ${isA ? '' : 'flex-row-reverse'}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-mono font-bold
                            ${isA ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {line.speaker_name.charAt(0)}
                          </div>
                          <div className={`flex-1 ${isA ? 'mr-8' : 'ml-8'}`}>
                            <p className={`text-[10px] font-mono mb-1 ${isA ? 'text-emerald-400' : 'text-blue-400'}`}>
                              {line.speaker_name}
                            </p>
                            <div className={`px-3 py-2.5 rounded-lg text-xs text-slate-300 italic
                              ${isA
                                ? 'bg-slate-800/60 border border-slate-700/40 rounded-tl-none'
                                : 'bg-slate-800/40 border border-slate-700/30 rounded-tr-none'}`}>
                              "{line.line}"
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[9px] font-mono text-slate-600 pt-2 border-t border-slate-800/40">
                    Generated: {selectedConv.generated_at.slice(0,16)} · {selectedConv.lines.length} lines · {selectedConv.location_type}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WORLD STATE TAB */}
        {activeTab === 'world' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-4">
              <Section title="Recent World Events" icon={<Globe className="w-3.5 h-3.5" />}>
                {worldEvents.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500">No world events yet. Play the game with the mod active.</p>
                ) : (
                  <div className="space-y-2">
                    {worldEvents.map((e, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-slate-700/60 text-slate-400 px-1.5 rounded">
                              {e.event_type.replace(/_/g, ' ')}
                            </span>
                            {e.event_location && (
                              <span className="text-[10px] font-mono text-slate-500 truncate">{e.event_location}</span>
                            )}
                          </div>
                          {e.event_subject && (
                            <p className="text-xs font-mono text-slate-300 mt-0.5">{e.event_subject}</p>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-600 flex-shrink-0">
                          {e.real_time?.slice(11,16) || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="How World Memory Works" icon={<Brain className="w-3.5 h-3.5" />} defaultOpen={false}>
                <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                  <p>Every time the player does something notable — clears a location, joins a faction, levels up — a world event is logged here.</p>
                  <p>The conversation generator uses these events to make NPC dialogue feel <span className="text-emerald-400">grounded in reality</span>. A settler at Sanctuary might mention that raiders attacked Concord. A guard at Diamond City might have heard about a vault being opened.</p>
                  <p>NPCs within knowledge range of events gradually learn about them, and can reference them in generated conversations.</p>
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* REPUTATION TAB */}
        {activeTab === 'reputation' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-4">
              <Section title="Faction Reputation (Time-Decayed)" icon={<Shield className="w-3.5 h-3.5" />}>
                {reputation.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500">No reputation data yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reputation.map(rep => (
                      <div key={rep.faction + rep.location}>
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-xs font-mono text-slate-300">{rep.faction}</span>
                            {rep.location !== 'global' && (
                              <span className="text-[10px] font-mono text-slate-500 ml-2">@ {rep.location}</span>
                            )}
                          </div>
                          <span className={`text-xs font-mono font-bold ${REP_COLOR(rep.reputation)}`}>
                            {rep.label} ({rep.reputation > 0 ? '+' : ''}{rep.reputation.toFixed(0)})
                          </span>
                        </div>
                        <div className="relative h-2 rounded-full bg-slate-800 border border-slate-700/50 overflow-hidden">
                          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600" />
                          <div
                            className={`absolute top-0 bottom-0 rounded-full ${REP_BAR_COLOR(rep.reputation)}`}
                            style={{
                              width: `${Math.min(Math.abs(rep.reputation) / 10, 50)}%`,
                              left: rep.reputation >= 0 ? '50%' : `${50 - Math.min(Math.abs(rep.reputation) / 10, 50)}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="How Reputation Works" icon={<Activity className="w-3.5 h-3.5" />} defaultOpen={false}>
                <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                  <p>Reputation is tracked <span className="text-emerald-400">per faction, per location</span> — not a single global number. Your standing with the Brotherhood in the Glowing Sea might differ from their HQ at the Prydwen.</p>
                  <p>Reputation <span className="text-emerald-400">decays toward zero over time</span>. Old grudges fade. Recent actions matter more. This creates a dynamic where NPCs respond to who you've been lately, not just the sum of your whole playthrough.</p>
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* ENEMY TACTICS TAB */}
        {activeTab === 'tactics' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-4">
              {playerStyle && (
                <Section title="Your Combat Profile" icon={<Activity className="w-3.5 h-3.5" />}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
                      <p className="text-[10px] font-mono text-slate-500 mb-1">Primary Weapon</p>
                      <p className="text-sm font-mono text-emerald-400 capitalize">{playerStyle.primary_weapon}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
                      <p className="text-[10px] font-mono text-slate-500 mb-1">Fight Style</p>
                      <p className="text-sm font-mono text-emerald-400 capitalize">{playerStyle.primary_approach}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] font-mono text-amber-400 mb-1">Enemy Counter-Strategy</p>
                    <p className="text-xs text-slate-300 capitalize">{playerStyle.recommended_counter_tactic?.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Enemies will increasingly adopt this tactic as they "learn" your style
                    </p>
                  </div>
                </Section>
              )}

              <Section title="Behavioral Learning" icon={<Brain className="w-3.5 h-3.5" />} defaultOpen={false}>
                <div className="text-xs text-slate-400 leading-relaxed space-y-2">
                  <p>The bridge tracks <span className="text-emerald-400">which tactics work against you and which fail</span> for each enemy type.</p>
                  <p>After enough encounters, the system recommends that enemy type use its most effective tactic — meaning enemies feel smarter as you play longer.</p>
                  <p>A Raider who keeps getting flanked will start taking cover more. A Deathclaw that always loses when it charges might start waiting for you to come to it.</p>
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* LORE ARCHIVE TAB */}
        {activeTab === 'lore' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-4">
              <Section title="Cross-Playthrough Lore" icon={<Star className="w-3.5 h-3.5" />} accent="text-amber-400">
                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/15 mb-4">
                  <p className="text-xs font-mono text-amber-400 mb-2 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5" /> How Lore Archive Works
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Significant events from your current playthrough are archived as legends and rumors.
                    In a new game, these can be injected into NPC conversations as things "people have heard about."
                    Your past Sole Survivor becomes a legend that the next one can hear about.
                  </p>
                </div>
                <p className="text-xs text-slate-500 text-center py-4">
                  Lore entries are generated automatically as you play.
                  Check back after completing significant quests or events.
                </p>
              </Section>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NPCConversationPanel;
