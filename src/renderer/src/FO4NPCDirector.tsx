import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Brain, Users, MessageSquare, BookOpen, Settings2, RefreshCw,
  Play, Save, Trash2, Plus, ChevronRight, ChevronDown, Download,
  AlertTriangle, CheckCircle, Cpu, Folder, HardDrive, Zap, User
} from 'lucide-react';

const api: any = (window as any).electron?.api || (window as any).electronAPI;

type Tab = 'memory' | 'conversations' | 'linewriter' | 'catalogue' | 'setup';

interface NPCSummary {
  npc_id: string; name: string; archetype: string; location: string;
  player_rep: string; player_trust: number; conversation_count: number;
  last_interaction: string;
}

interface StoreStatus {
  configured_path: string; exists: boolean; npc_count: number;
  conversation_count: number; catalogue_archetypes: string[];
}

const REP_COLOR: Record<string, string> = {
  allied: 'text-cyan-400', friendly: 'text-emerald-400', neutral: 'text-slate-300',
  unfriendly: 'text-amber-400', hostile: 'text-red-400',
};

const ARCHETYPES = [
  'settler_male','settler_female','minuteman','super_mutant',
  'raider','feral_ghoul','ghoul_nonferal','synth','named_npcs',
];

const CONTEXTS = [
  'greeting','idle','warning','combat_start','combat_taunt',
  'death','player_helps','player_hostile','hardship','hope',
  'rare_thoughtful','on_patrol','threatening','about_minutemen',
];

// ── Memory Tab ──────────────────────────────────────────────────────────────
function MemoryTab() {
  const [npcs, setNpcs] = useState<NPCSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    const r = await api?.f4aiListNpcs?.();
    if (r?.ok) setNpcs(r.npcs || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectNpc = async (id: string) => {
    setSelected(id); setLoading(true);
    const r = await api?.f4aiGetNpc?.(id);
    if (r?.ok) setMemory(r.memory);
    setLoading(false);
  };

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  return (
    <div className="flex h-full gap-4">
      {/* NPC List */}
      <div className="w-56 flex-shrink-0 space-y-1 overflow-y-auto pr-1">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider px-1 mb-2">NPC Memory Files</div>
        {npcs.length === 0 && (
          <div className="text-slate-500 text-xs p-2">No NPCs found. Initialize the store in Setup.</div>
        )}
        {npcs.map(n => (
          <button key={n.npc_id} onClick={() => selectNpc(n.npc_id)}
            className={'w-full text-left px-3 py-2 rounded-md text-xs transition-colors ' +
              (selected === n.npc_id ? 'bg-emerald-900/40 border border-emerald-700/60 text-emerald-200' : 'bg-slate-800/40 border border-slate-700/40 text-slate-300 hover:border-slate-600')}>
            <div className="font-semibold truncate">{n.name}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{n.archetype} · <span className={REP_COLOR[n.player_rep] || 'text-slate-400'}>{n.player_rep}</span></div>
            <div className="text-[10px] text-slate-600">{n.conversation_count} convs</div>
          </button>
        ))}
      </div>

      {/* Memory Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected && <div className="text-slate-500 text-sm p-4">Select an NPC to view their memory.</div>}
        {loading && <div className="flex items-center gap-2 text-slate-400 text-sm p-4"><RefreshCw className="w-4 h-4 animate-spin" />Loading...</div>}
        {memory && !loading && (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{memory.name}</h2>
                <div className="text-xs text-slate-500">{memory.archetype} · {memory.location}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Trust</div>
                <div className="text-2xl font-bold text-emerald-400">{memory.relationship?.player_trust ?? 50}</div>
              </div>
            </div>

            {/* Personality */}
            <Section title="Personality" icon={<Brain className="w-3.5 h-3.5"/>} expanded={expanded.personality} onToggle={() => toggle('personality')}>
              <div className="text-xs text-slate-300 leading-relaxed">{memory.personality?.speech_notes}</div>
              {(memory.personality?.catchphrases || []).length > 0 && (
                <div className="mt-2 space-y-1">
                  {memory.personality.catchphrases.map((p: string, i: number) => (
                    <div key={i} className="text-[11px] text-emerald-300 italic px-2 py-1 bg-emerald-900/20 rounded">"{p}"</div>
                  ))}
                </div>
              )}
            </Section>

            {/* Conversation History */}
            <Section title={`Conversations (${(memory.conversation_history||[]).length})`} icon={<MessageSquare className="w-3.5 h-3.5"/>} expanded={expanded.convs} onToggle={() => toggle('convs')}>
              {(memory.conversation_history || []).length === 0 && <div className="text-xs text-slate-500">No conversations recorded yet.</div>}
              {[...(memory.conversation_history || [])].reverse().slice(0,5).map((c: any, i: number) => (
                <div key={i} className="mb-3 border border-slate-700/50 rounded-md p-2">
                  <div className="text-[10px] text-slate-500 mb-1">{c.date} · with {c.partner} at {c.location}</div>
                  {(c.exchanges || []).slice(-4).map((ex: any, j: number) => (
                    <div key={j} className="text-[11px] mb-0.5">
                      <span className={ex.speaker === 'player' ? 'text-cyan-400' : 'text-amber-300'}>{ex.speaker}: </span>
                      <span className="text-slate-300">{ex.text}</span>
                    </div>
                  ))}
                </div>
              ))}
            </Section>

            {/* Event Log */}
            <Section title={`Event Log (${(memory.event_log||[]).length})`} icon={<Zap className="w-3.5 h-3.5"/>} expanded={expanded.events} onToggle={() => toggle('events')}>
              {(memory.event_log || []).length === 0 && <div className="text-xs text-slate-500">No events logged yet.</div>}
              {[...(memory.event_log || [])].reverse().slice(0,10).map((e: any, i: number) => (
                <div key={i} className="text-[11px] text-slate-400 border-l-2 border-slate-700 pl-2 mb-1">
                  <span className="text-slate-600 text-[10px]">{e.date?.slice(0,10)} </span>{e.event}
                </div>
              ))}
            </Section>

            {/* Known Facts */}
            <Section title="Known Facts" icon={<BookOpen className="w-3.5 h-3.5"/>} expanded={expanded.facts} onToggle={() => toggle('facts')}>
              {(memory.known_facts || []).length === 0 && <div className="text-xs text-slate-500">No facts recorded.</div>}
              {(memory.known_facts || []).map((f: string, i: number) => (
                <div key={i} className="text-[11px] text-slate-300 py-0.5">• {f}</div>
              ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, expanded, onToggle, children }: { title: string; icon: React.ReactNode; expanded?: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-slate-700/50 rounded-md overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/60 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
        {icon}{title}
        {expanded ? <ChevronDown className="w-3 h-3 ml-auto"/> : <ChevronRight className="w-3 h-3 ml-auto"/>}
      </button>
      {expanded && <div className="p-3 space-y-1 bg-slate-900/40">{children}</div>}
    </div>
  );
}

// ── Conversations Tab ───────────────────────────────────────────────────────
function ConversationsTab() {
  const [npcA, setNpcA] = useState('');
  const [npcB, setNpcB] = useState('player');
  const [location, setLocation] = useState('Sanctuary Hills');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(6);
  const [tone, setTone] = useState('neutral');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Array<{speaker:string;text:string}> | null>(null);
  const [npcs, setNpcs] = useState<NPCSummary[]>([]);

  useEffect(() => { api?.f4aiListNpcs?.().then((r: any) => { if (r?.ok) setNpcs(r.npcs || []); }); }, []);

  const generate = async () => {
    if (!npcA || !topic) { toast.error('Set NPC A and topic'); return; }
    setGenerating(true); setResult(null);
    const r = await api?.f4aiGenerateConversation?.({ npc_a: npcA, npc_b: npcB, location, topic, exchange_count: count, tone });
    if (r?.ok) { setResult(r.exchanges); toast.success(`Generated ${r.exchanges.length} exchanges. Saved to H drive.`); }
    else toast.error(r?.error || 'Generation failed');
    setGenerating(false);
  };

  const npcOptions = [{ value: 'player', label: 'Player (Sole Survivor)' }, ...npcs.map(n => ({ value: n.npc_id, label: n.name })), ...ARCHETYPES.map(a => ({ value: a, label: `[Archetype] ${a}` }))];

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">NPC A</label>
          <select value={npcA} onChange={e => setNpcA(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            <option value="">Select NPC or archetype...</option>
            {npcOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">NPC B</label>
          <select value={npcB} onChange={e => setNpcB(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {npcOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" placeholder="e.g. Sanctuary Hills"/>
        </div>
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Tone</label>
          <select value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {['neutral','friendly','tense','hostile','philosophical'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[11px] text-slate-400 block mb-1">Topic / Context</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" placeholder="e.g. defending the settlement from Raiders, water pump repair, missing caravan..."/>
      </div>
      <div className="flex items-center gap-4">
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Exchanges</label>
          <select value={count} onChange={e => setCount(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {[4,6,8,10,12,16,20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={generating} className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold mt-4">
          {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Play className="w-3.5 h-3.5"/>}
          {generating ? 'Generating...' : 'Generate Conversation'}
        </button>
      </div>

      {result && (
        <div className="border border-slate-700 rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-slate-800/60 text-xs font-semibold text-slate-300 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400"/>Generated conversation — saved to H:/F4AI/conversations/
          </div>
          <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
            {result.map((ex, i) => (
              <div key={i} className="text-[12px]">
                <span className="font-semibold text-amber-300">{ex.speaker}: </span>
                <span className="text-slate-200">{ex.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Line Writer Tab ─────────────────────────────────────────────────────────
function LineWriterTab() {
  const [archetype, setArchetype] = useState('settler_male');
  const [context, setContext] = useState('idle');
  const [count, setCount] = useState(10);
  const [styleNotes, setStyleNotes] = useState('');
  const [npcId, setNpcId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [npcs, setNpcs] = useState<NPCSummary[]>([]);

  useEffect(() => { api?.f4aiListNpcs?.().then((r: any) => { if (r?.ok) setNpcs(r.npcs || []); }); }, []);

  const generate = async () => {
    setGenerating(true); setLines([]);
    const r = await api?.f4aiGenerateLines?.({ archetype, context, count, style_notes: styleNotes || undefined, npc_id: npcId || undefined });
    if (r?.ok) { setLines(r.lines || []); toast.success(`${r.lines.length} lines generated and saved to H drive.`); }
    else toast.error(r?.error || 'Generation failed');
    setGenerating(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Archetype</label>
          <select value={archetype} onChange={e => setArchetype(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Context / Situation</label>
          <select value={context} onChange={e => setContext(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {CONTEXTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Named NPC (optional)</label>
          <select value={npcId} onChange={e => setNpcId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            <option value="">Generic archetype</option>
            {npcs.map(n => <option key={n.npc_id} value={n.npc_id}>{n.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Count</label>
          <select value={count} onChange={e => setCount(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {[5,10,15,20,30,50].map(n => <option key={n} value={n}>{n} lines</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[11px] text-slate-400 block mb-1">Style Notes (optional)</label>
        <input value={styleNotes} onChange={e => setStyleNotes(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" placeholder="e.g. more hopeful tone, references to Quincy, mentions water scarcity..."/>
      </div>
      <button onClick={generate} disabled={generating} className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold">
        {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Zap className="w-3.5 h-3.5"/>}
        {generating ? 'Writing Lines...' : 'Write Lines'}
      </button>

      {lines.length > 0 && (
        <div className="border border-slate-700 rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-slate-800/60 text-xs font-semibold text-slate-300 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400"/>{lines.length} lines — saved to H:/F4AI/catalogue/generated/{archetype}.json
          </div>
          <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
            {lines.map((line, i) => (
              <div key={i} className="text-[12px] text-slate-200 py-0.5 border-b border-slate-800/50">
                <span className="text-slate-600 text-[10px] mr-2">{i+1}.</span>{line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Catalogue Tab ───────────────────────────────────────────────────────────
function CatalogueTab() {
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [catalogue, setCatalogue] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openCtx, setOpenCtx] = useState<string>('');

  useEffect(() => {
    api?.f4aiListArchetypes?.().then((r: any) => {
      if (r?.ok) { setArchetypes(r.archetypes || []); if (r.archetypes?.length > 0) setSelected(r.archetypes[0]); }
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    api?.f4aiGetCatalogue?.(selected).then((r: any) => {
      if (r?.ok) setCatalogue(r.catalogue);
      setLoading(false);
    });
  }, [selected]);

  const contexts = catalogue ? Object.keys(catalogue.contexts || {}) : [];

  return (
    <div className="flex h-full gap-4">
      <div className="w-44 flex-shrink-0 space-y-1">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider px-1 mb-2">Archetypes</div>
        {archetypes.map(a => (
          <button key={a} onClick={() => setSelected(a)}
            className={'w-full text-left px-3 py-2 rounded-md text-xs transition-colors ' +
              (selected === a ? 'bg-emerald-900/40 border border-emerald-700/60 text-emerald-200' : 'bg-slate-800/40 border border-slate-700/40 text-slate-300 hover:border-slate-600')}>
            {a}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex items-center gap-2 text-slate-400 text-sm p-4"><RefreshCw className="w-4 h-4 animate-spin"/>Loading...</div>}
        {catalogue && !loading && (
          <div className="space-y-2">
            <div className="mb-2">
              <h3 className="text-sm font-bold text-slate-200">{catalogue.archetype}</h3>
              <div className="text-[11px] text-slate-500 italic mt-0.5">{catalogue.speech_notes}</div>
            </div>
            {contexts.map(ctx => (
              <div key={ctx} className="border border-slate-700/50 rounded-md overflow-hidden">
                <button onClick={() => setOpenCtx(openCtx === ctx ? '' : ctx)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/60 text-xs font-semibold text-slate-300 hover:bg-slate-800">
                  {openCtx === ctx ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                  {ctx} <span className="text-slate-600 ml-auto">{catalogue.contexts[ctx].length} lines</span>
                </button>
                {openCtx === ctx && (
                  <div className="p-2 space-y-0.5 bg-slate-900/40">
                    {catalogue.contexts[ctx].map((line: string, i: number) => (
                      <div key={i} className="text-[11px] text-slate-300 py-0.5 border-b border-slate-800/30 last:border-0">
                        <span className="text-slate-600 text-[10px] mr-1">{i+1}.</span>{line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Setup Tab ───────────────────────────────────────────────────────────────
function SetupTab() {
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [storePath, setStorePath] = useState('H:/F4AI');
  const [initializing, setInitializing] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    const r = await api?.f4aiStoreStatus?.();
    if (r?.ok) { setStatus(r); setStorePath(r.configured_path || 'H:/F4AI'); }
    setLoading(false);
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  const init = async () => {
    setInitializing(true);
    const r = await api?.f4aiInitMemoryStore?.({ storePath });
    if (r?.ok) {
      toast.success(`Store initialized at ${r.store_path}. Seeded ${r.npcs_seeded} NPCs.`);
      await refreshStatus();
    } else {
      toast.error(r?.error || 'Initialization failed. Is H: drive connected?');
    }
    setInitializing(false);
  };

  return (
    <div className="space-y-5 max-w-xl">
      {/* Status */}
      <div className="border border-slate-700 rounded-md p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <HardDrive className="w-4 h-4 text-emerald-400"/>NPC Memory Store Status
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs"><RefreshCw className="w-3 h-3 animate-spin"/>Checking...</div>
        ) : status ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {status.exists ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400"/> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400"/>}
              <span className="text-slate-400">Path:</span>
              <span className="font-mono text-slate-200">{status.configured_path}</span>
              <span className={status.exists ? 'text-emerald-400' : 'text-amber-400'}>{status.exists ? 'EXISTS' : 'NOT FOUND'}</span>
            </div>
            {status.exists && (
              <>
                <div className="flex gap-4">
                  <div><span className="text-slate-500">NPCs: </span><span className="text-emerald-400 font-bold">{status.npc_count}</span></div>
                  <div><span className="text-slate-500">Conversations: </span><span className="text-emerald-400 font-bold">{status.conversation_count}</span></div>
                  <div><span className="text-slate-500">Archetypes: </span><span className="text-emerald-400 font-bold">{status.catalogue_archetypes.length}</span></div>
                </div>
              </>
            )}
            {!status.exists && (
              <div className="text-amber-400/80 text-[11px]">H: drive not found. Connect H: drive or change the store path below to an existing location.</div>
            )}
          </div>
        ) : null}
      </div>

      {/* Configure Path */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"><Folder className="w-3.5 h-3.5"/>Store Path</label>
        <input value={storePath} onChange={e => setStorePath(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:border-emerald-600 outline-none"/>
        <div className="text-[11px] text-slate-500">Default: H:/F4AI — NPC memories, conversations, and generated dialogue are stored here. Must be accessible when Mossy is running.</div>
      </div>

      {/* Init Button */}
      <button onClick={init} disabled={initializing}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold">
        {initializing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
        {initializing ? 'Initializing...' : 'Initialize Memory Store'}
      </button>

      {/* xEdit Export Info */}
      <div className="border border-slate-700/60 rounded-md p-4 space-y-2">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"><Download className="w-3.5 h-3.5"/>Expand with xEdit Export</div>
        <div className="text-[11px] text-slate-500 space-y-1">
          <p>Run the included xEdit script to export all vanilla dialogue from Fallout4.esm into the catalogue:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
            <li>Open xEdit (FO4Edit)</li>
            <li>Load Fallout4.esm</li>
            <li>Scripts menu <span className="text-slate-400">→</span> Apply Script</li>
            <li>Select <span className="font-mono text-emerald-400">MOSSY_ExportDialogue.pas</span></li>
            <li>Output goes to <span className="font-mono text-slate-300">{storePath}/export/xedit_dump/</span></li>
          </ol>
          <p className="text-slate-600">The script is at <span className="font-mono text-emerald-400">scripts/MOSSY_ExportDialogue.pas</span> in the Mossy install directory.</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
const FO4NPCDirector: React.FC = () => {
  const [tab, setTab] = useState<Tab>('memory');

  const TABS: Array<{id: Tab; label: string; icon: React.ReactNode}> = [
    { id: 'memory',        label: 'Memory',        icon: <Brain className="w-3.5 h-3.5"/> },
    { id: 'conversations', label: 'Conversations',  icon: <MessageSquare className="w-3.5 h-3.5"/> },
    { id: 'linewriter',    label: 'Line Writer',    icon: <Zap className="w-3.5 h-3.5"/> },
    { id: 'catalogue',     label: 'Catalogue',      icon: <BookOpen className="w-3.5 h-3.5"/> },
    { id: 'setup',         label: 'Setup',          icon: <Settings2 className="w-3.5 h-3.5"/> },
  ];

  return (
    <div className="min-h-full bg-[#0b0f0b] text-slate-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-emerald-400"/>
          <div>
            <h1 className="text-base font-bold text-slate-100">FO4 NPC Director</h1>
            <p className="text-[11px] text-slate-500">Persistent NPC memories, AI-generated dialogue, and vanilla catalogue</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ' +
                (tab === t.id ? 'bg-emerald-900/40 border border-emerald-700/60 text-emerald-200' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40')}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {tab === 'memory'        && <MemoryTab/>}
        {tab === 'conversations' && <ConversationsTab/>}
        {tab === 'linewriter'    && <LineWriterTab/>}
        {tab === 'catalogue'     && <CatalogueTab/>}
        {tab === 'setup'         && <SetupTab/>}
      </div>
    </div>
  );
};

export default FO4NPCDirector;
