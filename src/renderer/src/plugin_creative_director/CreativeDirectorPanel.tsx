import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wand2, Scroll, MessageSquare, User, BookOpen, Map, Radio, Bug,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Plus, Trash2,
  Search, Pin, Download,
  Cpu, Zap, FileText,
  Play, AlertTriangle, Info, Copy, FlaskConical,
  Folder, FolderOpen, File, Image, Volume2, Code2, Package,
  Sparkles, Eye, EyeOff, ChevronRight, ChevronDown, X, FolderSearch,
  Monitor, TestTube2, Send, Film, Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestStage {
  index: number;
  description: string;
  objectives: string[];
}

interface Quest {
  id: string;
  name: string;
  type: 'main' | 'side' | 'misc' | 'radiant';
  description: string;
  location: string;
  stages: QuestStage[];
  rewards: { xp: number; caps: number };
}

interface DialogueLine {
  id: string;
  speaker: 'player' | 'npc';
  text: string;
  condition: string;
}

interface NPC {
  id: string;
  name: string;
  race: string;
  gender: string;
  factions: string[];
  backstory: string;
  personalityTraits: string[];
  voiceType: string;
  special: Record<string, number>;
  behaviorFlags: string[];
}

interface LoreEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  category: 'faction' | 'location' | 'character' | 'technology' | 'event' | 'custom';
}

type CreativeTab = 'quest' | 'dialogue' | 'npc' | 'lore' | 'world' | 'network' | 'debug' | 'handoff' | 'personalrd';

const BACKEND_PORT = 8767;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function backendFetch(path: string, body?: object): Promise<any> {
  const url = `http://localhost:${BACKEND_PORT}${path}`;
  const opts: RequestInit = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' };
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  return res.json();
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Quest Builder ────────────────────────────────────────────────────────────

const QuestBuilder: React.FC<{ backendOnline: boolean }> = ({ backendOnline }) => {
  const [quest, setQuest] = useState<Quest>({
    id: uid(), name: '', type: 'side', description: '', location: '',
    stages: [], rewards: { xp: 100, caps: 0 },
  });
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const addStage = () => setQuest(q => ({
    ...q, stages: [...q.stages, { index: q.stages.length * 10, description: '', objectives: [''] }],
  }));
  const removeStage = (i: number) => setQuest(q => ({ ...q, stages: q.stages.filter((_, idx) => idx !== i) }));
  const updateStage = (i: number, patch: Partial<QuestStage>) =>
    setQuest(q => ({ ...q, stages: q.stages.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));

  const generateScript = async () => {
    setGenerating(true);
    const localScript = () => {
      const name = quest.name || 'MyQuest';
      const stages = quest.stages.map(s =>
        `  ; Stage ${s.index}: ${s.description}\n  SetStage(${name}, ${s.index})`
      ).join('\n');
      return `Scriptname ${name}QuestScript extends Quest\n\nEvent OnInit()\n  Debug.Trace("[${name}] Quest initialized")\nEndEvent\n\n${stages}\n\nFunction GiveRewards()\n  PlayerRef.AddItem(Caps001, ${quest.rewards.caps})\nEndFunction`;
    };
    if (backendOnline) {
      try {
        const data = await backendFetch('/api/quest/generate', quest);
        setOutput(data.script ?? localScript());
      } catch { setOutput(localScript()); }
    } else {
      setOutput(localScript());
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Quest Name</label>
          <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={quest.name} onChange={e => setQuest(q => ({ ...q, name: e.target.value }))} placeholder="The Forgotten Vault" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Type</label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={quest.type} onChange={e => setQuest(q => ({ ...q, type: e.target.value as Quest['type'] }))}>
            <option value="main">Main Quest</option>
            <option value="side">Side Quest</option>
            <option value="misc">Misc Quest</option>
            <option value="radiant">Radiant Quest</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Synopsis</label>
        <textarea className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none resize-none"
          rows={2} value={quest.description} onChange={e => setQuest(q => ({ ...q, description: e.target.value }))}
          placeholder="The player discovers an abandoned Vault hidden beneath Quincy Ruins..." />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Location</label>
          <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={quest.location} onChange={e => setQuest(q => ({ ...q, location: e.target.value }))} placeholder="Quincy Ruins" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">XP Reward</label>
          <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={quest.rewards.xp} onChange={e => setQuest(q => ({ ...q, rewards: { ...q.rewards, xp: +e.target.value } }))} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Caps Reward</label>
          <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={quest.rewards.caps} onChange={e => setQuest(q => ({ ...q, rewards: { ...q.rewards, caps: +e.target.value } }))} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Quest Stages</span>
          <button onClick={addStage} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 px-2 py-1 rounded transition-colors">
            <Plus className="w-3 h-3" /> Add Stage
          </button>
        </div>
        <div className="space-y-2">
          {quest.stages.map((stage, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-amber-400 font-mono w-8">#{stage.index}</span>
                <input className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-amber-500 outline-none"
                  value={stage.description} onChange={e => updateStage(i, { description: e.target.value })} placeholder="Stage description..." />
                <button onClick={() => removeStage(i)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {stage.objectives.map((obj, oi) => (
                <div key={oi} className="flex gap-2 mb-1">
                  <input className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-amber-500 outline-none"
                    value={obj}
                    onChange={e => updateStage(i, { objectives: stage.objectives.map((o, idx) => idx === oi ? e.target.value : o) })}
                    placeholder="Investigate the distress signal" />
                  <button onClick={() => updateStage(i, { objectives: stage.objectives.filter((_, idx) => idx !== oi) })}
                    className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => updateStage(i, { objectives: [...stage.objectives, ''] })}
                className="text-xs text-slate-500 hover:text-amber-400 transition-colors">+ objective</button>
            </div>
          ))}
          {quest.stages.length === 0 && (
            <div className="text-center text-slate-600 text-sm py-4 border border-dashed border-slate-700 rounded">
              No stages yet — click Add Stage to begin
            </div>
          )}
        </div>
      </div>
      <button onClick={generateScript} disabled={generating || !quest.name}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded transition-colors">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        Generate Papyrus Script
      </button>
      {output && (
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-mono">Generated Script</span>
            <button onClick={() => navigator.clipboard.writeText(output)} className="text-xs text-slate-500 hover:text-white flex items-center gap-1">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
          <pre className="bg-slate-950 border border-slate-700 rounded p-3 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
};

// ─── Dialogue Writer ──────────────────────────────────────────────────────────

const DialogueWriter: React.FC<{ backendOnline: boolean }> = ({ backendOnline }) => {
  const [npcName, setNpcName] = useState('');
  const [voiceType, setVoiceType] = useState('MaleBoston');
  const [lines, setLines] = useState<DialogueLine[]>([]);
  const [generating, setGenerating] = useState(false);
  const [context, setContext] = useState('');

  const VOICE_TYPES = ['MaleBoston','FemaleBoston','MaleNordic','FemaleNordic','MaleRobot','FemaleRobot','MaleGhoul','MaleEvenToned','FemaleEvenToned'];

  const addLine = (speaker: 'player' | 'npc') =>
    setLines(l => [...l, { id: uid(), speaker, text: '', condition: '' }]);
  const updateLine = (id: string, patch: Partial<DialogueLine>) =>
    setLines(l => l.map(ln => ln.id === id ? { ...ln, ...patch } : ln));
  const removeLine = (id: string) => setLines(l => l.filter(ln => ln.id !== id));

  const generateDialogue = async () => {
    if (!backendOnline || !npcName || !context) return;
    setGenerating(true);
    try {
      const data = await backendFetch('/api/dialogue/generate', { npcName, voiceType, context, existingLines: lines });
      if (data.lines) setLines(l => [...l, ...data.lines]);
    } catch { /* backend offline */ }
    setGenerating(false);
  };

  const exportCK = () => {
    const out = lines.map(l =>
      `; ${l.speaker.toUpperCase()} [${voiceType}]${l.condition ? ` [Cond: ${l.condition}]` : ''}\n${l.text}`
    ).join('\n\n');
    const blob = new Blob([out], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${npcName || 'dialogue'}.txt`; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">NPC Name</label>
          <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={npcName} onChange={e => setNpcName(e.target.value)} placeholder="Vault Overseer Chen" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Voice Type</label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={voiceType} onChange={e => setVoiceType(e.target.value)}>
            {VOICE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Scene Context</label>
        <textarea className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none resize-none"
          rows={2} value={context} onChange={e => setContext(e.target.value)}
          placeholder="The player meets the overseer after discovering she has been hiding survivors..." />
      </div>
      {backendOnline && (
        <button onClick={generateDialogue} disabled={generating || !npcName || !context}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 rounded transition-colors text-sm">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          AI Generate Dialogue
        </button>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Dialogue Tree</span>
        <div className="flex gap-2">
          <button onClick={() => addLine('player')} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 px-2 py-1 rounded flex items-center gap-1">
            <Plus className="w-3 h-3" /> Player
          </button>
          <button onClick={() => addLine('npc')} className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 px-2 py-1 rounded flex items-center gap-1">
            <Plus className="w-3 h-3" /> NPC
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={line.id} className={`border rounded p-3 ${line.speaker === 'player' ? 'border-blue-500/30 bg-blue-900/10' : 'border-emerald-500/30 bg-emerald-900/10'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold uppercase ${line.speaker === 'player' ? 'text-blue-400' : 'text-emerald-400'}`}>{line.speaker}</span>
              <span className="text-xs text-slate-600 font-mono">{idx + 1}</span>
              <input className="flex-1 bg-transparent border-b border-slate-700 px-1 text-sm text-white outline-none focus:border-amber-500"
                value={line.text} onChange={e => updateLine(line.id, { text: e.target.value })} placeholder="Dialogue text..." />
              <button onClick={() => removeLine(line.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <input className="w-full bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-400 outline-none focus:border-amber-500/50"
              value={line.condition} onChange={e => updateLine(line.id, { condition: e.target.value })} placeholder="Condition: GetQuestStage(...) >= 20" />
          </div>
        ))}
        {lines.length === 0 && (
          <div className="text-center text-slate-600 text-sm py-4 border border-dashed border-slate-700 rounded">Add Player and NPC lines to build the tree</div>
        )}
      </div>
      {lines.length > 0 && (
        <button onClick={exportCK} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded transition-colors">
          <Download className="w-4 h-4" /> Export for Creation Kit
        </button>
      )}
    </div>
  );
};

// ─── NPC Creator ──────────────────────────────────────────────────────────────

const NPCCreator: React.FC<{ backendOnline: boolean }> = ({ backendOnline }) => {
  const [npc, setNpc] = useState<NPC>({
    id: uid(), name: '', race: 'Human', gender: 'Male', factions: [],
    backstory: '', personalityTraits: [], voiceType: 'MaleBoston',
    special: { S: 5, P: 5, E: 5, C: 5, I: 5, A: 5, L: 5 },
    behaviorFlags: [],
  });
  const [generating, setGenerating] = useState(false);
  const [traitInput, setTraitInput] = useState('');
  const [factionInput, setFactionInput] = useState('');

  const RACES = ['Human','Ghoul','Synth','Super Mutant','Robot','Creature'];
  const BEHAVIOR_FLAGS = ['Aggro','Friendly','Neutral','Cowardly','Brave','Talkative','Silent','Merchant','Guard','Wanderer'];
  const SPECIAL_LABELS: Record<string, string> = { S:'Strength',P:'Perception',E:'Endurance',C:'Charisma',I:'Intelligence',A:'Agility',L:'Luck' };

  const generateBackstory = async () => {
    if (!backendOnline || !npc.name) return;
    setGenerating(true);
    try {
      const data = await backendFetch('/api/npc/backstory', npc);
      setNpc(n => ({ ...n, backstory: data.backstory ?? '' }));
    } catch { /* offline */ }
    setGenerating(false);
  };

  const addTrait = () => { if (!traitInput.trim()) return; setNpc(n => ({ ...n, personalityTraits: [...n.personalityTraits, traitInput.trim()] })); setTraitInput(''); };
  const addFaction = () => { if (!factionInput.trim()) return; setNpc(n => ({ ...n, factions: [...n.factions, factionInput.trim()] })); setFactionInput(''); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Name</label>
          <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={npc.name} onChange={e => setNpc(n => ({ ...n, name: e.target.value }))} placeholder="Overseer Chen" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Race</label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={npc.race} onChange={e => setNpc(n => ({ ...n, race: e.target.value }))}>
            {RACES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Gender</label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={npc.gender} onChange={e => setNpc(n => ({ ...n, gender: e.target.value }))}>
            <option>Male</option><option>Female</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 block">S.P.E.C.I.A.L.</label>
        <div className="grid grid-cols-7 gap-1.5">
          {Object.entries(npc.special).map(([key, val]) => (
            <div key={key} className="text-center">
              <div className="text-xs text-slate-400 mb-1" title={SPECIAL_LABELS[key]}>{key}</div>
              <input type="number" min={1} max={10}
                className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-1 text-sm text-center text-white focus:border-amber-500 outline-none"
                value={val} onChange={e => setNpc(n => ({ ...n, special: { ...n.special, [key]: Math.min(10, Math.max(1, +e.target.value)) } }))} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 block">Personality Traits</label>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-amber-500 outline-none"
            value={traitInput} onChange={e => setTraitInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTrait()}
            placeholder="Suspicious, Resourceful, Loyal..." />
          <button onClick={addTrait} className="text-xs text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-2 rounded transition-colors"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {npc.personalityTraits.map((t, i) => (
            <span key={i} className="flex items-center gap-1 bg-amber-400/10 text-amber-300 text-xs px-2 py-0.5 rounded-full">
              {t}
              <button onClick={() => setNpc(n => ({ ...n, personalityTraits: n.personalityTraits.filter((_, idx) => idx !== i) }))}
                className="hover:text-red-300"><Trash2 className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 block">Faction Affiliations</label>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-amber-500 outline-none"
            value={factionInput} onChange={e => setFactionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFaction()}
            placeholder="Brotherhood of Steel, Railroad..." />
          <button onClick={addFaction} className="text-xs text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 px-2 rounded transition-colors"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {npc.factions.map((f, i) => (
            <span key={i} className="flex items-center gap-1 bg-blue-400/10 text-blue-300 text-xs px-2 py-0.5 rounded-full">
              {f}
              <button onClick={() => setNpc(n => ({ ...n, factions: n.factions.filter((_, idx) => idx !== i) }))}
                className="hover:text-red-300"><Trash2 className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 block">Behavior Flags</label>
        <div className="flex flex-wrap gap-1.5">
          {BEHAVIOR_FLAGS.map(flag => (
            <button key={flag} onClick={() => setNpc(n => ({
              ...n, behaviorFlags: n.behaviorFlags.includes(flag) ? n.behaviorFlags.filter(f => f !== flag) : [...n.behaviorFlags, flag],
            }))}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${npc.behaviorFlags.includes(flag) ? 'bg-emerald-400/20 border-emerald-500/50 text-emerald-300' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}>
              {flag}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">Backstory</label>
          {backendOnline && (
            <button onClick={generateBackstory} disabled={generating || !npc.name}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50">
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} AI Generate
            </button>
          )}
        </div>
        <textarea className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none resize-none"
          rows={4} value={npc.backstory} onChange={e => setNpc(n => ({ ...n, backstory: e.target.value }))}
          placeholder="Born before the war in Boston South End, Chen grew up believing Vault-Tec promises..." />
      </div>
    </div>
  );
};

// ─── Lore Vault ───────────────────────────────────────────────────────────────

const LoreCard: React.FC<{
  entry: LoreEntry;
  colors: Record<string, string>;
  onTogglePin: () => void;
  onDelete: () => void;
}> = ({ entry, colors, onTogglePin, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
      <div className="flex items-start gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[entry.category] ?? colors.custom}`}>{entry.category}</span>
            <span className="text-sm text-white font-medium">{entry.title}</span>
          </div>
          {!expanded && <p className="text-xs text-slate-500 mt-1 truncate">{entry.content}</p>}
        </button>
        <button onClick={onTogglePin} className={`transition-colors ${entry.pinned ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}><Pin className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      {expanded && <p className="text-sm text-slate-300 mt-2 leading-relaxed">{entry.content}</p>}
      {entry.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {entry.tags.map(t => <span key={t} className="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">#{t}</span>)}
        </div>
      )}
    </div>
  );
};

const LoreVault: React.FC<{ backendOnline: boolean }> = ({ backendOnline }) => {
  const [entries, setEntries] = useState<LoreEntry[]>([
    { id: uid(), title: 'Institute — Synth Program', content: 'The Institute creates Synths in three generations. Gen 3 Synths are indistinguishable from humans and possess full consciousness.', tags: ['faction','technology','institute'], pinned: true, category: 'faction' },
    { id: uid(), title: 'Commonwealth — Geography', content: 'Post-nuclear Boston area. Key locations: Diamond City (Fenway Park), Goodneighbor (Scollay Square), The Glowing Sea (southwest crater).', tags: ['location','commonwealth'], pinned: false, category: 'location' },
    { id: uid(), title: 'Railroad — Safehouses', content: 'The Railroad uses a network of safehouses marked with painted symbols. HQ is below the Old North Church, accessed via the Freedom Trail.', tags: ['faction','railroad','secret'], pinned: false, category: 'faction' },
  ]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<LoreEntry>>({ title: '', content: '', tags: [], category: 'custom' });
  const [searching, setSearching] = useState(false);
  const [semanticResults, setSemanticResults] = useState<string[]>([]);

  const CATEGORY_COLORS: Record<string, string> = {
    faction: 'text-red-400 bg-red-400/10', location: 'text-blue-400 bg-blue-400/10',
    character: 'text-purple-400 bg-purple-400/10', technology: 'text-cyan-400 bg-cyan-400/10',
    event: 'text-amber-400 bg-amber-400/10', custom: 'text-slate-400 bg-slate-400/10',
  };

  const filtered = entries.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.content.toLowerCase().includes(search.toLowerCase()) ||
    e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const pinned = filtered.filter(e => e.pinned);
  const rest = filtered.filter(e => !e.pinned);

  const semanticSearch = async () => {
    if (!backendOnline || !search) return;
    setSearching(true);
    try {
      const data = await backendFetch('/api/lore/search', { query: search });
      setSemanticResults(data.results ?? []);
    } catch { setSemanticResults([]); }
    setSearching(false);
  };

  const saveEntry = () => {
    if (!newEntry.title) return;
    setEntries(e => [...e, { id: uid(), pinned: false, tags: [], category: 'custom', content: '', ...newEntry } as LoreEntry]);
    setNewEntry({ title: '', content: '', tags: [], category: 'custom' });
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lore..." />
        </div>
        {backendOnline && (
          <button onClick={semanticSearch} disabled={searching || !search}
            className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 px-3 py-2 rounded text-xs transition-colors disabled:opacity-50">
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />} Semantic
          </button>
        )}
        <button onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 px-3 py-2 rounded text-xs transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      {adding && (
        <div className="bg-slate-800 border border-amber-500/30 rounded p-3 space-y-2">
          <input className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-amber-500 outline-none"
            value={newEntry.title} onChange={e => setNewEntry(n => ({ ...n, title: e.target.value }))} placeholder="Entry title" />
          <textarea className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-amber-500 outline-none resize-none"
            rows={3} value={newEntry.content} onChange={e => setNewEntry(n => ({ ...n, content: e.target.value }))} placeholder="Lore content..." />
          <div className="flex gap-2">
            <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
              value={newEntry.category} onChange={e => setNewEntry(n => ({ ...n, category: e.target.value as LoreEntry['category'] }))}>
              {['faction','location','character','technology','event','custom'].map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={saveEntry} className="ml-auto text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded transition-colors">Save</button>
          </div>
        </div>
      )}
      {semanticResults.length > 0 && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
          <div className="text-xs text-purple-400 font-semibold mb-2 flex items-center gap-1"><Cpu className="w-3 h-3" /> Semantic Results</div>
          {semanticResults.map((r, i) => <div key={i} className="text-xs text-slate-300 py-1 border-b border-purple-500/10 last:border-0">{r}</div>)}
        </div>
      )}
      {pinned.length > 0 && (
        <div>
          <div className="text-xs text-amber-400 font-semibold flex items-center gap-1 mb-2"><Pin className="w-3 h-3" /> Pinned</div>
          {pinned.map(e => <LoreCard key={e.id} entry={e} colors={CATEGORY_COLORS}
            onTogglePin={() => setEntries(prev => prev.map(p => p.id === e.id ? { ...p, pinned: !p.pinned } : p))}
            onDelete={() => setEntries(prev => prev.filter(p => p.id !== e.id))} />)}
        </div>
      )}
      <div className="space-y-2">
        {rest.map(e => <LoreCard key={e.id} entry={e} colors={CATEGORY_COLORS}
          onTogglePin={() => setEntries(prev => prev.map(p => p.id === e.id ? { ...p, pinned: !p.pinned } : p))}
          onDelete={() => setEntries(prev => prev.filter(p => p.id !== e.id))} />)}
        {filtered.length === 0 && <div className="text-center text-slate-600 text-sm py-6">No lore entries match</div>}
      </div>
    </div>
  );
};

// ─── World Design ─────────────────────────────────────────────────────────────

const WorldDesign: React.FC<{ backendOnline: boolean }> = ({ backendOnline }) => {
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState('interior');
  const [cellId, setCellId] = useState('');
  const [encounterZone, setEncounterZone] = useState('');
  const [enemies, setEnemies] = useState('');
  const [atmosphere, setAtmosphere] = useState('');
  const [storytellingNotes, setStorytellingNotes] = useState('');
  const [navmeshNotes, setNavmeshNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const generate = async () => {
    setGenerating(true);
    const localOut = `; World Design Brief: ${locationName}\n; Type: ${locationType}\n; Cell ID: ${cellId || 'TBD'}\n; Encounter Zone: ${encounterZone || 'None'}\n;\n; Atmosphere: ${atmosphere}\n;\n; Environmental Storytelling:\n;   ${storytellingNotes}\n;\n; Navmesh Notes:\n;   ${navmeshNotes}\n;\n; Enemy Placement: ${enemies}`;
    if (backendOnline) {
      try {
        const data = await backendFetch('/api/world/design', { locationName, locationType, cellId, encounterZone, atmosphere, storytellingNotes, enemies });
        setOutput(data.brief ?? localOut);
      } catch { setOutput(localOut); }
    } else { setOutput(localOut); }
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">Location Name</label>
          <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Vault 118 Underwater Entrance" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Type</label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={locationType} onChange={e => setLocationType(e.target.value)}>
            <option value="interior">Interior</option>
            <option value="exterior">Exterior</option>
            <option value="worldspace">Worldspace</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Cell EditorID</label>
          <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none font-mono"
            value={cellId} onChange={e => setCellId(e.target.value)} placeholder="MYMODVault118Entry01" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Encounter Zone</label>
          <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={encounterZone} onChange={e => setEncounterZone(e.target.value)} placeholder="ezVault118 (min lvl 20)" />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Atmosphere and Mood</label>
        <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
          value={atmosphere} onChange={e => setAtmosphere(e.target.value)} placeholder="Dark, claustrophobic, dripping water, flickering lights, pre-war decor frozen in time" />
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Environmental Storytelling</label>
        <textarea className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none resize-none"
          rows={3} value={storytellingNotes} onChange={e => setStorytellingNotes(e.target.value)}
          placeholder="Scattered journals near entrance airlock. Child toy in maintenance crawlspace. Scorched chalk outline near reactor..." />
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Enemy Placement</label>
        <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
          value={enemies} onChange={e => setEnemies(e.target.value)} placeholder="Feral Ghouls (corridor ambush), Mr. Handy boss in overseer suite" />
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Navmesh Considerations</label>
        <textarea className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none resize-none"
          rows={2} value={navmeshNotes} onChange={e => setNavmeshNotes(e.target.value)}
          placeholder="Disable navmesh in flooded section. Cut mesh at raised catwalks. Add portal pairs at every door." />
      </div>
      <button onClick={generate} disabled={generating || !locationName}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2.5 rounded transition-colors">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Generate Design Brief
      </button>
      {output && (
        <div className="relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Design Brief</span>
            <button onClick={() => navigator.clipboard.writeText(output)} className="text-xs text-slate-500 hover:text-white flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
          </div>
          <pre className="bg-slate-950 border border-slate-700 rounded p-3 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
};

// ─── AI Team ──────────────────────────────────────────────────────────────────
// Real in-process team: Creative Director + Quest/Dialogue/World specialists
// take turns on a shared project, entirely on this desktop (Groq if configured,
// else local KoboldCpp). No external servers, no fake peer ports.

const AGENT_COLORS: Record<string, string> = {
  director:       'text-amber-400',
  quest:          'text-emerald-400',
  dialogue:       'text-sky-400',
  world:          'text-purple-400',
  planner:        'text-cyan-400',
  reviewer:       'text-rose-400',
  analyst:        'text-violet-400',
  builder:        'text-emerald-400',
  verifier:       'text-orange-400',
  script_writer:  'text-lime-400',
  record_builder: 'text-teal-400',
  esp_builder:    'text-indigo-400',
};

const AI_TEAM_NAMES: Record<string, string> = {
  director:       'Creative Director',
  quest:          'Quest & Systems Designer',
  dialogue:       'Dialogue & Lore Writer',
  world:          'World & NPC Builder',
  planner:        'Mod Planner',
  reviewer:       'Plan Reviewer',
  analyst:        'Game Data Analyst',
  builder:        'Mod Builder',
  verifier:       'Build Verifier',
  script_writer:  'Script Writer',
  record_builder: 'Record Builder',
  esp_builder:    'xEdit Script Builder',
};

const PHASE_STEPS = [
  { key: 'planning',          label: 'Planning'  },
  { key: 'reviewing',         label: 'Review'    },
  { key: 'analyzing',         label: 'Analysis'  },
  { key: 'awaiting_approval', label: 'Approval'  },
  { key: 'building',          label: 'Building'  },
  { key: 'verifying',         label: 'Verifying' },
  { key: 'done',              label: 'Done'       },
] as const;

function phaseIndex(phase: string): number {
  return PHASE_STEPS.findIndex(s => s.key === phase);
}

const AITeamPanel: React.FC = () => {
  const [state, setState] = useState<{ enabled: boolean; tickInFlight?: boolean; currentProject: any; completedProjects: any[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [buildStarted, setBuildStarted] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanInfo, setScanInfo] = useState<{ scanned: boolean; generatedAt?: string; totalNames?: number; source?: string } | null>(null);
  const [scanMsg, setScanMsg] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  const api = () => (window as any).electronAPI ?? (window as any).electron?.api;

  const refresh = useCallback(async () => {
    try {
      const res = await api()?.creativeDirectorTeam?.getState?.();
      if (res?.success !== false) setState(res);
    } catch { /* ignore */ }
  }, []);

  const refreshScanInfo = useCallback(async () => {
    try {
      const res = await api()?.creativeDirectorTeam?.getWorldScanInfo?.();
      if (res?.success) setScanInfo(res);
    } catch { /* ignore */ }
  }, []);

  const runWorldScan = async () => {
    setScanBusy(true);
    setScanMsg('Scanning FO4 game files (this takes ~5 seconds)...');
    try {
      const res = await api()?.creativeDirectorTeam?.scanFo4World?.();
      if (res?.success) {
        setScanMsg('Scan complete — world data loaded.');
        await refreshScanInfo();
      } else {
        setScanMsg('Scan failed: ' + (res?.error || 'unknown error'));
      }
    } catch (e: any) {
      setScanMsg('Error: ' + (e as Error).message);
    } finally {
      setScanBusy(false);
    }
  };

  useEffect(() => {
    refresh();
    refreshScanInfo();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh, refreshScanInfo]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [state?.currentProject?.turns?.length]);

  const toggleEnabled = async () => {
    setBusy(true);
    try {
      await api()?.creativeDirectorTeam?.setEnabled?.(!state?.enabled);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const resetAll = async () => {
    if (!window.confirm('Delete ALL projects — current, queued, and completed? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api()?.creativeDirectorTeam?.resetAll?.();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const approvePlan = async () => {
    setApprovalBusy(true);
    setApprovalError(null);
    try {
      const result = await api()?.creativeDirectorTeam?.approvePlan?.();
      if (result?.success === false) {
        setApprovalError(result.error || 'Failed to start build');
        return;
      }
      if (result?.teamEnabled === false) {
        setApprovalError('The AI team is disabled — click Enable at the top to activate it first.');
        return;
      }
      setShowRejectInput(false);
      setRejectFeedback('');
      setBuildStarted(true);
      await refresh();
    } catch (e: any) {
      setApprovalError('Unexpected error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setApprovalBusy(false);
    }
  };

  const rejectPlan = async () => {
    if (!rejectFeedback.trim()) return;
    setApprovalBusy(true);
    try {
      await api()?.creativeDirectorTeam?.rejectPlan?.(rejectFeedback);
      setShowRejectInput(false);
      setRejectFeedback('');
      await refresh();
    } finally {
      setApprovalBusy(false);
    }
  };

  const project = state?.currentProject;
  const phase: string = project?.phase ?? '';
  const currentPhaseIdx = phaseIndex(phase);

  return (
    <div className="space-y-4">

      {/* Header — enable/disable */}
      <div className="flex items-center justify-between gap-3 bg-slate-800/60 border border-slate-700 rounded p-3">
        <div>
          <div className="text-sm font-semibold text-white">Autonomous Team</div>
          <div className="text-xs text-slate-500">
            {state?.enabled ? 'Working — plan → review → analysis → YOUR APPROVAL → build.' : 'Disabled — no AI calls are made while off.'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetAll} disabled={busy} title="Delete all projects and start fresh"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-slate-400 bg-slate-700/50 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Reset All
          </button>
          <button onClick={toggleEnabled} disabled={busy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${state?.enabled ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {state?.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {/* FO4 World Scan */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-400" /> FO4 World Scan
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {scanInfo?.scanned
                ? `${(scanInfo.totalNames ?? 0).toLocaleString()} real game names loaded.`
                : 'Not scanned yet — scan to load real FO4 names.'}
            </div>
          </div>
          <button onClick={runWorldScan} disabled={scanBusy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${scanInfo?.scanned ? 'bg-slate-700/50 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'} disabled:opacity-50`}>
            {scanBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {scanInfo?.scanned ? 'Re-scan' : 'Scan FO4 World'}
          </button>
        </div>
        {scanMsg && <div className="text-xs text-slate-400 bg-slate-900/60 rounded px-2 py-1">{scanMsg}</div>}
      </div>

      {!project && (
        <div className="text-center py-10 border border-dashed border-slate-700 rounded-lg">
          <Cpu className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <div className="text-slate-500 text-sm font-semibold">{state?.enabled ? 'Picking a new project shortly...' : 'Team is disabled'}</div>
          <div className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">
            Enable the team. The AI will plan a small mod, review it, analyze it, then pause for your approval before building.
          </div>
        </div>
      )}

      {project && (
        <div className="bg-slate-950 border border-slate-700 rounded overflow-hidden">

          {/* Project header */}
          <div className="px-3 py-2 border-b border-slate-800">
            <div className="text-sm font-semibold text-white">{project.title}</div>
            <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{project.brief}</div>
          </div>

          {/* Phase pipeline progress */}
          <div className="px-3 pt-3 pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-0.5">
              {PHASE_STEPS.map((step, idx) => {
                const isDone  = currentPhaseIdx > idx;
                const isActive = currentPhaseIdx === idx;
                const isApproval = step.key === 'awaiting_approval';
                return (
                  <React.Fragment key={step.key}>
                    <div className={`flex flex-col items-center min-w-0 flex-1`}>
                      <div className={`w-full h-1.5 rounded-full transition-colors ${isDone ? 'bg-emerald-500' : isActive ? (isApproval ? 'bg-amber-400 animate-pulse' : 'bg-sky-500') : 'bg-slate-700'}`} />
                      <div className={`text-[9px] mt-1 font-medium truncate w-full text-center transition-colors ${isDone ? 'text-emerald-400' : isActive ? (isApproval ? 'text-amber-400' : 'text-sky-400') : 'text-slate-600'}`}>
                        {step.label}
                      </div>
                    </div>
                    {idx < PHASE_STEPS.length - 1 && (
                      <div className={`w-2 h-px flex-shrink-0 mb-3 ${isDone ? 'bg-emerald-700' : 'bg-slate-700'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Approval gate */}
          {phase === 'awaiting_approval' && (
            <div className="m-3 border border-amber-500/40 bg-amber-500/5 rounded-lg p-3 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-amber-300">Plan ready for your review</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    The team has planned and analyzed a small mod. Review the transcript below, then approve to start building or send it back with feedback.
                  </div>
                </div>
              </div>
              {!showRejectInput ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                  <button onClick={approvePlan} disabled={approvalBusy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 disabled:opacity-50 transition-colors">
                    {approvalBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {approvalBusy ? 'Starting...' : 'Approve — Start Building'}
                  </button>
                  <button onClick={() => setShowRejectInput(true)} disabled={approvalBusy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-rose-600/10 text-rose-400 border border-rose-500/20 hover:bg-rose-600/20 disabled:opacity-50 transition-colors">
                    <X className="w-3.5 h-3.5" /> Send Back with Feedback
                  </button>
                  </div>
                  {buildStarted && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2">
                      <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                      Build launched — the AI team is now writing scripts and records. Progress appears in the transcript below (may take 2–5 minutes per section).
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={rejectFeedback}
                    onChange={e => setRejectFeedback(e.target.value)}
                    placeholder="What needs to change? Be specific — the Planner will use this to revise."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-rose-500 outline-none resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={rejectPlan} disabled={approvalBusy || !rejectFeedback.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 disabled:opacity-50 transition-colors">
                      {approvalBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Feedback
                    </button>
                    <button onClick={() => { setShowRejectInput(false); setRejectFeedback(''); }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {approvalError && (
                <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{approvalError}</span>
                </div>
              )}
            </div>
          )}

          {/* Build section progress (only during building/verifying) */}
          {(phase === 'building' || phase === 'verifying') && (
            <div className="px-3 py-2 border-b border-slate-800/60 space-y-2">
              <div className="text-xs text-slate-500 font-medium">Build Progress</div>
              <div className="flex gap-1.5">
                {['Papyrus Scripts', 'ESP Records', 'xEdit Script'].map((s, i) => {
                  const done = i < (project.buildSectionIdx ?? 0);
                  const active = i === (project.buildSectionIdx ?? 0);
                  return (
                    <div key={s} className={`flex-1 rounded px-1.5 py-1 text-center text-[9px] font-medium transition-colors ${done ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : active ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' : 'bg-slate-800 text-slate-600 border border-slate-700/50'}`}>
                      {done ? <Check className="w-3 h-3 mx-auto" /> : s.split(' ')[0]}
                    </div>
                  );
                })}
              </div>
              {state?.tickInFlight && (
                <div className="flex items-center gap-2 text-xs text-sky-400 pt-0.5">
                  <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                  <span>AI team is processing — may take up to 3 minutes...</span>
                </div>
              )}
            </div>
          )}

          {/* Transcript */}
          <div ref={transcriptRef} className="p-3 space-y-3 max-h-96 overflow-y-auto">
            {(project.turns || []).map((t: any, i: number) => {
              const isError = t.message?.startsWith?.('[ERROR]');
              return (
                <div key={i} className={`text-xs ${isError ? 'bg-red-500/5 border border-red-500/20 rounded p-2' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isError ? 'text-red-400' : (AGENT_COLORS[t.agent] || 'text-slate-400')}`}>
                      {isError ? 'Error' : (AI_TEAM_NAMES[t.agent] || t.agent)}
                    </span>
                    <span className="text-slate-600 font-mono">{new Date(t.timestamp).toLocaleTimeString()}</span>
                    {t.agent === 'reviewer' && /APPROVED/i.test(t.message) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">APPROVED</span>
                    )}
                    {t.agent === 'reviewer' && /NEEDS_REVISION/i.test(t.message) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">NEEDS REVISION</span>
                    )}
                    {t.agent === 'verifier' && /PASSED/i.test(t.message) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">PASSED</span>
                    )}
                    {t.agent === 'verifier' && /FAILED/i.test(t.message) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">FAILED</span>
                    )}
                  </div>
                  <div className={`whitespace-pre-wrap mt-1 ${isError ? 'text-red-300' : 'text-slate-300'}`}>{t.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Narrative Debug ──────────────────────────────────────────────────────────

const NarrativeDebug: React.FC<{ backendOnline: boolean }> = ({ backendOnline }) => {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<{ level: 'ok' | 'warn' | 'error'; msg: string }[]>([]);
  const [questScript, setQuestScript] = useState('');

  const runDiagnostics = async () => {
    setChecking(true);
    if (backendOnline) {
      try {
        const data = await backendFetch('/api/debug/narrative', { script: questScript });
        setResults(data.results ?? []);
        setChecking(false);
        return;
      } catch { /* fall through */ }
    }
    const r: typeof results = [];
    if (questScript.includes('GetCurrentStageID') && !questScript.includes('SetStage')) r.push({ level: 'warn', msg: 'Reading stage but no SetStage call found — stages may never advance.' });
    if (questScript.includes('PlayerRef') && !questScript.includes('import')) r.push({ level: 'warn', msg: 'PlayerRef used without explicit import — may fail in standalone scripts.' });
    if ((questScript.match(/RegisterForSingleUpdate/g) || []).length > 3) r.push({ level: 'warn', msg: 'Multiple RegisterForSingleUpdate calls — risk of overlapping timer chains.' });
    if (questScript.includes('Game.GetForm(0x')) r.push({ level: 'error', msg: 'Hardcoded FormID in Game.GetForm() — use persistent reference instead.' });
    if (questScript.length > 0 && r.length === 0) r.push({ level: 'ok', msg: 'No issues detected.' });
    if (questScript.length === 0) r.push({ level: 'error', msg: 'No script provided — paste your Papyrus script above.' });
    setResults(r);
    setChecking(false);
  };

  const ICONS = {
    ok: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    warn: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  };
  const COLORS = { ok: 'border-emerald-500/20 bg-emerald-900/5', warn: 'border-amber-500/20 bg-amber-900/5', error: 'border-red-500/20 bg-red-900/10' };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Paste Papyrus Script</label>
        <textarea className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-green-400 font-mono focus:border-amber-500 outline-none resize-none"
          rows={10} value={questScript} onChange={e => setQuestScript(e.target.value)}
          placeholder="; Paste your Papyrus quest script here for analysis..." />
      </div>
      <button onClick={runDiagnostics} disabled={checking}
        className="w-full flex items-center justify-center gap-2 bg-red-700/80 hover:bg-red-600/80 text-white font-semibold py-2.5 rounded transition-colors">
        {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
        Run Narrative Diagnostics
      </button>
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Results ({results.length})</div>
          {results.map((r, i) => (
            <div key={i} className={`flex items-start gap-2.5 p-2.5 border rounded ${COLORS[r.level]}`}>
              {ICONS[r.level]}
              <span className="text-sm text-slate-300">{r.msg}</span>
            </div>
          ))}
        </div>
      )}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded p-3">
        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1"><Info className="w-3 h-3" /> Common Papyrus Pitfalls</div>
        <ul className="space-y-1 text-xs text-slate-500">
          <li>Never call blocking functions (Wait, Utility.Wait) from OnInit</li>
          <li>Always guard quest stage checks: GetCurrentStageID() returns -1 if quest not started</li>
          <li>RegisterForSingleUpdate replaces itself — avoid double-registering</li>
          <li>Use PersistentRef aliases instead of Game.GetForm for actor refs</li>
          <li>Papyrus is single-threaded per script — avoid long-running loops</li>
        </ul>
      </div>
    </div>
  );
};

// ─── Asset Browser ────────────────────────────────────────────────────────────

type AssetItem = { name: string; rel: string; isDir: boolean; type: string; ext: string };

const ASSET_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  dir: Folder, mesh: Package, texture: Image, sound: Volume2, script: Code2, plugin: File, file: File,
};

const ASSET_TYPE_COLOR: Record<string, string> = {
  dir: 'text-amber-400', mesh: 'text-blue-400', texture: 'text-purple-400',
  sound: 'text-emerald-400', script: 'text-cyan-400', plugin: 'text-red-400', file: 'text-slate-400',
};

const AssetBrowser: React.FC<{
  selected: string[];
  onToggle: (rel: string) => void;
  compact?: boolean;
}> = ({ selected, onToggle, compact = false }) => {
  const [path, setPath] = useState('');
  const [items, setItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; rel: string }[]>([]);

  const api = () => (window as any).electronAPI ?? (window as any).electron?.api;

  const browse = useCallback(async (rel: string) => {
    setLoading(true); setError('');
    try {
      const res = await api()?.creativeDirectorTeam?.listAssets?.(rel);
      if (!res?.success) { setError(res?.error || 'Browse failed'); setLoading(false); return; }
      setItems(res.items || []);
      setPath(rel);
      const parts = rel ? rel.split('\\').filter(Boolean) : [];
      setBreadcrumbs([{ label: 'FO4 Assets', rel: '' }, ...parts.map((p, i) => ({
        label: p, rel: parts.slice(0, i + 1).join('\\'),
      }))]);
    } catch (e: any) { setError(String(e)); }
    setLoading(false);
  }, []);

  useEffect(() => { browse(''); }, [browse]);

  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`space-y-2 ${compact ? '' : 'border border-slate-700 rounded p-3 bg-slate-900/40'}`}>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 flex-wrap">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={b.rel}>
            {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
            <button onClick={() => browse(b.rel)}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors truncate max-w-[120px]">{b.label}</button>
          </React.Fragment>
        ))}
      </div>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded pl-7 pr-3 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
          placeholder="Filter assets..." />
      </div>
      {/* List */}
      {loading && <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-500 mx-auto" /></div>}
      {error && <div className="text-xs text-red-400 px-2 py-1 bg-red-400/10 rounded">{error}</div>}
      {!loading && filtered.length === 0 && !error && (
        <div className="text-center text-slate-600 text-xs py-3">No items</div>
      )}
      <div className={`space-y-0.5 ${compact ? 'max-h-48' : 'max-h-64'} overflow-y-auto`}>
        {filtered.map(item => {
          const Icon = ASSET_TYPE_ICON[item.type] || File;
          const color = ASSET_TYPE_COLOR[item.type] || 'text-slate-400';
          const isSelected = selected.includes(item.rel);
          return (
            <div key={item.rel}
              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${isSelected ? 'bg-amber-400/10' : 'hover:bg-slate-800'}`}
              onClick={() => item.isDir ? browse(item.rel) : onToggle(item.rel)}>
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
              <span className={`text-xs flex-1 truncate ${item.isDir ? 'text-amber-300 font-medium' : 'text-slate-300'}`}>{item.name}</span>
              {!item.isDir && isSelected && <CheckCircle2 className="w-3 h-3 text-amber-400 flex-shrink-0" />}
              {item.isDir && <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="text-xs text-amber-400 px-1">{selected.length} asset{selected.length !== 1 ? 's' : ''} selected</div>
      )}
    </div>
  );
};

// ─── Buildability Assessor ────────────────────────────────────────────────────

function assessBuildability(guide: string): { score: number; checks: { pass: boolean; label: string }[] } {
  const checks = [
    { pass: /WEAP|ARMO|NPC_|QUST|CELL|LVLI|MISC|BOOK|AMMO|CONT/i.test(guide), label: 'CK record types specified' },
    { pass: /EditorID|editorid|Editor ID/i.test(guide), label: 'EditorIDs defined' },
    { pass: /Papyrus|\.psc|Scriptname|extends Quest/i.test(guide), label: 'Papyrus script included' },
    { pass: /navmesh|NavMesh/i.test(guide), label: 'Navmesh requirements addressed' },
    { pass: /\.nif|\.dds|Meshes\\|Textures\\/i.test(guide), label: 'Asset paths referenced' },
    { pass: /Step [0-9]|##.*Step|Creation Kit|xEdit|FO4Edit/i.test(guide), label: 'Step-by-step instructions' },
    { pass: /Test|play-test|in-game|load order/i.test(guide), label: 'Testing checklist present' },
  ];
  const score = Math.round((checks.filter(c => c.pass).length / checks.length) * 5);
  return { score, checks };
}

// ─── Lab Handoff ──────────────────────────────────────────────────────────────

const HandoffProjectCard: React.FC<{ c: any; onRefresh: () => void; queueInfo?: { id: string; position: number; userNotes: string } }> = ({ c, onRefresh, queueInfo }) => {
  const [expanded, setExpanded] = useState(false);
  const [guideContent, setGuideContent] = useState('');
  const [guideLoading, setGuideLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceNotes, setEnhanceNotes] = useState('');
  const [enhanceError, setEnhanceError] = useState('');
  const [buildability, setBuildability] = useState<{ score: number; checks: { pass: boolean; label: string; detail?: string }[] } | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileMsg, setCompileMsg] = useState('');
  const [compileErr, setCompileErr] = useState('');
  const [packaging, setPackaging] = useState(false);
  const [packageMsg, setPackageMsg] = useState('');
  const [packageErr, setPackageErr] = useState('');
  const [prevising, setPrevising] = useState(false);
  const [previsMsg, setPrevisMsg] = useState('');
  const [previsErr, setPrevisErr] = useState('');
  const [scaffolding, setScaffolding] = useState(false);
  const [scaffoldError, setScaffoldError] = useState('');
  const [scaffoldResult, setScaffoldResult] = useState<{ modName: string; createdFiles: string[]; scaffoldDir: string; questCount: number; npcCount: number; folderCount: number } | null>(null);
  const [xeditGenerating, setXeditGenerating] = useState(false);
  const [xeditError, setXeditError] = useState('');
  const [xeditDone, setXeditDone] = useState(false);
  const [espName, setEspName] = useState('MyMod.esp');
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState('');
  const [reopenedToQueue, setReopenedToQueue] = useState(false);
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackNotes, setSendBackNotes] = useState('');
  const [dequeuing, setDequeuing] = useState(false);

  // Virtual World VR lab state
  const [vrStatus, setVrStatus] = useState<'loading' | 'no_lab' | 'not_submitted' | 'pending' | 'passed' | 'failed' | 'error'>('loading');
  const [vrReport, setVrReport] = useState<any>(null);
  const [vrBugTicket, setVrBugTicket] = useState<any>(null);
  const [vrSending, setVrSending] = useState(false);
  const [vrError, setVrError] = useState('');

  // Concept Art Studio state
  type ConceptArtPrompt = { id: string; label: string; category: string; prompt: string; negative: string };
  const [artPrompts, setArtPrompts] = useState<ConceptArtPrompt[]>([]);
  const [artImages, setArtImages] = useState<Record<string, string>>({});
  const [artErrors, setArtErrors] = useState<Record<string, string>>({});
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [artExpanded, setArtExpanded] = useState(false);
  const [sdUrl, setSdUrl] = useState<string>('http://127.0.0.1:8188');
  const [sdOnline, setSdOnline] = useState<boolean | null>(null);
  const [sdChecking, setSdChecking] = useState(false);
  const [comfyModel, setComfyModel] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<any>(null);
  const [animExpanded, setAnimExpanded] = useState(false);
  const [animGenerating, setAnimGenerating] = useState(false);
  const [animError, setAnimError] = useState('');
  const [animScriptCopied, setAnimScriptCopied] = useState(false);

  const api = () => (window as any).electronAPI ?? (window as any).electron?.api;

  // Score REAL artifacts (does an .esp exist? are scripts compiled? are QUST records
  // present?) via the backend. Falls back to the old doc heuristic only if the real
  // assessor is unavailable.
  const refreshBuildability = useCallback(async () => {
    try {
      const b = await api()?.creativeDirectorTeam?.assessBuild?.(c.outputDir);
      if (b?.success) { setBuildability({ score: b.score, checks: b.checks }); return; }
    } catch { /* fall through to heuristic */ }
    try {
      const g = await api()?.creativeDirectorTeam?.readGuide?.(c.outputDir);
      if (g?.success) setBuildability(assessBuildability(g.content));
    } catch { /* ignore */ }
  }, [c.outputDir]);

  const loadGuide = useCallback(async () => {
    if (!c.outputDir) return;
    setGuideLoading(true);
    try {
      const res = await api()?.creativeDirectorTeam?.readGuide?.(c.outputDir);
      if (res?.success) {
        setGuideContent(res.content);
        await refreshBuildability();
      } else {
        setGuideContent('(no BUILD_GUIDE.md found)');
        setBuildability(null);
      }
    } catch { setGuideContent('(error reading guide)'); }
    setGuideLoading(false);
  }, [c.outputDir, refreshBuildability]);

  useEffect(() => { loadGuide(); }, [loadGuide]);

  const loadArtPrompts = useCallback(async () => {
    if (!c.outputDir) return;
    const res = await api()?.creativeDirectorTeam?.readConceptArtPrompts?.(c.outputDir);
    if (res?.success && Array.isArray(res.prompts) && res.prompts.length > 0) {
      setArtPrompts(res.prompts);
    }
  }, [c.outputDir]);

  useEffect(() => { loadArtPrompts(); }, [loadArtPrompts]);

  const loadAnimationDirection = useCallback(async () => {
    if (!c.outputDir) return;
    const res = await api()?.creativeDirectorTeam?.readAnimationDirection?.(c.outputDir);
    if (res?.success && res.data) setAnimDir(res.data);
  }, [c.outputDir]);

  useEffect(() => { loadAnimationDirection(); }, [loadAnimationDirection]);

  const generateAnimationDirection = async () => {
    setAnimGenerating(true);
    setAnimError('');
    try {
      const res = await api()?.creativeDirectorTeam?.generateAnimationDirection?.(c.outputDir, c.title);
      if (res?.success && res.data) {
        setAnimDir(res.data);
        setAnimExpanded(true);
      } else {
        setAnimError(res?.error || 'Generation failed');
      }
    } catch (e: any) { setAnimError(String(e)); }
    setAnimGenerating(false);
  };

  const launchIClone = async () => {
    const res = await api()?.creativeDirectorTeam?.launchIClone?.();
    if (!res?.success) setAnimError(res?.error || 'Could not launch iClone 8');
  };

  const copyScript = async () => {
    if (!animDir?.scriptContent) return;
    try {
      await navigator.clipboard.writeText(animDir.scriptContent);
      setAnimScriptCopied(true);
      setTimeout(() => setAnimScriptCopied(false), 2500);
    } catch { /* clipboard may fail silently */ }
  };

  const loadVrStatus = useCallback(async () => {
    if (!c.questId) { setVrStatus('not_submitted'); return; }
    setVrStatus('loading');
    try {
      const res = await api()?.creativeDirectorTeam?.vrStatus?.(c.questId);
      if (res?.success) {
        setVrStatus(res.status as any);
        setVrReport(res.report);
        setVrBugTicket(res.bugTicket);
      } else {
        setVrStatus('error');
        setVrError(res?.error || 'Failed to load VR status');
      }
    } catch (e: any) { setVrStatus('error'); setVrError(String(e)); }
  }, [c.questId]);

  useEffect(() => { loadVrStatus(); }, [loadVrStatus]);

  const sendToVrLab = async () => {
    setVrSending(true); setVrError('');
    try {
      const res = await api()?.creativeDirectorTeam?.vrSendToLab?.(c.id);
      if (res?.success) {
        setVrStatus('pending');
        setVrReport(null);
        setVrBugTicket(null);
      } else {
        setVrError(res?.error || 'Failed to send to VR lab');
      }
    } catch (e: any) { setVrError(String(e)); }
    setVrSending(false);
  };

  const sendBackWithVrIssues = async () => {
    if (!vrBugTicket) return;
    const issueText = (vrBugTicket.issues || [])
      .map((i: any) => `[${i.category}] ${i.description}${i.suggested_fix ? ` — Fix: ${i.suggested_fix}` : ''}`)
      .join('\n');
    setSendBackNotes(`VR Lab failed — fix these issues before re-testing:\n${issueText}`);
    setSendBackOpen(true);
  };

  const checkSdStatus = async () => {
    setSdChecking(true);
    const res = await api()?.creativeDirectorTeam?.sdStatus?.(sdUrl);
    const online = res?.online ?? false;
    setSdOnline(online);
    if (res?.model) setComfyModel(res.model);
    setSdChecking(false);
    return online;
  };

  // Auto-check ComfyUI when prompts arrive, then auto-generate if none yet done
  useEffect(() => {
    if (artPrompts.length === 0) return;
    if (sdOnline !== null) return;
    checkSdStatus().then(online => {
      if (online && Object.keys(artImages).length === 0 && generatingIds.size === 0) {
        generateAll();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artPrompts]);

  const generateArt = async (p: ConceptArtPrompt) => {
    setGeneratingIds(prev => new Set(prev).add(p.id));
    setArtErrors(prev => ({ ...prev, [p.id]: '' }));
    try {
      const res = await api()?.creativeDirectorTeam?.generateConceptArt?.({
        prompt: p.prompt,
        negativePrompt: p.negative,
        width: 768,
        height: 768,
        steps: 30,
        cfgScale: 7,
        model: comfyModel || undefined,
      });
      if (res?.success && res.imageData) {
        setArtImages(prev => ({ ...prev, [p.id]: `data:image/png;base64,${res.imageData}` }));
      } else {
        setArtErrors(prev => ({ ...prev, [p.id]: res?.error || 'Generation failed' }));
      }
    } catch (e: any) {
      setArtErrors(prev => ({ ...prev, [p.id]: String(e) }));
    }
    setGeneratingIds(prev => { const n = new Set(prev); n.delete(p.id); return n; });
  };

  const generateAll = async () => {
    for (const p of artPrompts) {
      if (!artImages[p.id]) await generateArt(p);
    }
  };

  const reveal = async () => {
    await api()?.creativeDirectorTeam?.revealOutput?.(c.outputDir);
  };

  const toggleAsset = (rel: string) =>
    setSelectedAssets(prev => prev.includes(rel) ? prev.filter(a => a !== rel) : [...prev, rel]);

  const enhance = async () => {
    setEnhancing(true); setEnhanceError('');
    try {
      const res = await api()?.creativeDirectorTeam?.enhanceGuide?.(c.outputDir, selectedAssets, enhanceNotes);
      if (res?.success) {
        setGuideContent(res.content);
        await refreshBuildability();
        setShowGuide(true);
        onRefresh();
      } else {
        setEnhanceError(res?.error || 'Enhancement failed');
      }
    } catch (e: any) { setEnhanceError(String(e)); }
    setEnhancing(false);
  };

  const reopen = async () => {
    setReopening(true); setReopenError('');
    try {
      const res = await api()?.creativeDirectorTeam?.reopenProject?.(c.id, sendBackNotes);
      if (res?.success) {
        setReopenedToQueue(true);
        setSendBackOpen(false);
        onRefresh();
      } else {
        setReopenError(res?.error || 'Could not send back project');
      }
    } catch (e: any) { setReopenError(String(e)); }
    setReopening(false);
  };

  const scaffold = async () => {
    setScaffolding(true); setScaffoldError(''); setScaffoldResult(null);
    try {
      const res = await api()?.creativeDirectorTeam?.scaffoldMod?.(c.outputDir);
      if (res?.success) {
        setScaffoldResult(res);
        refreshBuildability();
      } else {
        setScaffoldError(res?.error || 'Scaffold failed');
      }
    } catch (e: any) { setScaffoldError(String(e)); }
    setScaffolding(false);
  };

  const compileScripts = async () => {
    setCompiling(true); setCompileErr(''); setCompileMsg('');
    try {
      const r = await api()?.creativeDirectorTeam?.compileScripts?.(c.outputDir);
      if (r?.success) { setCompileMsg(r.message || `Compiled ${r.compiled}/${r.total}`); refreshBuildability(); }
      else setCompileErr(r?.error || `Compiled ${r?.compiled ?? 0}/${r?.total ?? 0} — a script failed to compile`);
    } catch (e: any) { setCompileErr(String(e)); }
    setCompiling(false);
  };

  const packageMod = async () => {
    setPackaging(true); setPackageErr(''); setPackageMsg('');
    try {
      const name = scaffoldResult?.modName || espName.replace(/\.(esp|esl|esm)$/i, '') || 'MyMod';
      const r = await api()?.creativeDirectorTeam?.packageMod?.(c.outputDir, name);
      if (r?.success) setPackageMsg(r.message || `Packed ${r.ba2Path}`);
      else setPackageErr(r?.error || 'Packaging failed');
    } catch (e: any) { setPackageErr(String(e)); }
    setPackaging(false);
  };

  const rebuildPrevis = async () => {
    setPrevising(true); setPrevisErr(''); setPrevisMsg('');
    try {
      const s = await api()?.getSettings?.();
      const fo4 = String(s?.fallout4Path || '').trim();
      const name = espName.trim() || 'MyMod.esp';
      if (!fo4) { setPrevisErr('Set your Fallout 4 path in Settings — previs runs against the plugin installed in Data.'); setPrevising(false); return; }
      const espPath = `${fo4.replace(/[\\/]+$/, '')}\\Data\\${name}`;
      const r = await api()?.ckAutofixRebuildPrecombines?.(espPath, s?.xeditPath || undefined);
      if (r?.success) setPrevisMsg(r.message || 'Previs rebuild started'); else setPrevisErr(r?.error || 'Could not start previs rebuild');
    } catch (e: any) { setPrevisErr(String(e)); }
    setPrevising(false);
  };

  const revealScaffold = async () => {
    if (!scaffoldResult?.scaffoldDir) return;
    await api()?.creativeDirectorTeam?.revealOutput?.(scaffoldResult.scaffoldDir);
  };

  const generateXEditScript = async () => {
    setXeditGenerating(true);
    setXeditError('');
    setXeditDone(false);
    try {
      const res = await api()?.creativeDirectorTeam?.generateXEditScript?.(
        c.outputDir, selectedAssets, guideContent, espName.trim() || 'MyMod.esp'
      );
      if (res?.success) {
        setXeditDone(true);
      } else {
        setXeditError(res?.error || 'Script generation failed');
      }
    } catch (e: any) { setXeditError(String(e)); }
    setXeditGenerating(false);
  };

  const dequeue = async () => {
    if (!queueInfo) return;
    setDequeuing(true);
    try {
      await api()?.creativeDirectorTeam?.dequeueProject?.(queueInfo.id);
      onRefresh();
    } finally {
      setDequeuing(false);
    }
  };

  const score = buildability?.score ?? 0;
  const scoreColor = score >= 4 ? 'text-emerald-400' : score >= 2 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = score >= 4 ? 'bg-emerald-400/10' : score >= 2 ? 'bg-amber-400/10' : 'bg-red-400/10';

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded overflow-hidden">
      {/* Header row */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate">{c.title}</span>
              {queueInfo ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-violet-500/15 text-violet-300">
                  QUEUED #{queueInfo.position}
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${c.incomplete ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
                  {c.incomplete ? 'INCOMPLETE' : 'READY'}
                </span>
              )}
              {buildability && !queueInfo && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${scoreBg} ${scoreColor}`}>
                  Buildability {score}/5
                </span>
              )}
              {!queueInfo && vrStatus === 'pending' && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-500/15 text-blue-300">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> VR Testing
                </span>
              )}
              {!queueInfo && vrStatus === 'passed' && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-400/15 text-emerald-400">
                  <Monitor className="w-2.5 h-2.5" /> VR Passed
                </span>
              )}
              {!queueInfo && vrStatus === 'failed' && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-red-400/15 text-red-400">
                  <Monitor className="w-2.5 h-2.5" /> VR Failed{vrBugTicket ? ` · ${vrBugTicket.issues?.length ?? 0} issue${vrBugTicket.issues?.length !== 1 ? 's' : ''}` : ''}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{new Date(c.completedAt).toLocaleString()} · {c.turnCount} turns</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {queueInfo ? (
              <button onClick={dequeue} disabled={dequeuing}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-2 py-1.5 rounded transition-colors"
                title="Cancel — pull this project out of the queue and return it to the Finished list">
                {dequeuing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Cancel Queue
              </button>
            ) : reopenedToQueue ? (
              <span className="flex items-center gap-1 text-xs text-violet-300 bg-violet-500/10 px-2 py-1.5 rounded">
                <CheckCircle2 className="w-3 h-3" /> Queued
              </span>
            ) : (
              <button onClick={() => { setSendBackOpen(!sendBackOpen); setReopenError(''); }}
                className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded transition-colors ${sendBackOpen ? 'text-violet-200 bg-violet-500/25' : 'text-violet-300 bg-violet-500/10 hover:bg-violet-500/20'}`}
                title="Send back to the AI team with your notes">
                <RefreshCw className="w-3 h-3" /> Send Back
              </button>
            )}
            <button onClick={reveal}
              className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-2 py-1.5 rounded transition-colors">
              <Download className="w-3 h-3" /> Reveal
            </button>
            <button onClick={() => setExpanded(!expanded)}
              className="text-slate-500 hover:text-white p-1.5 rounded hover:bg-slate-700 transition-colors">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Queue notes — shown when card is in the pending queue */}
        {queueInfo && queueInfo.userNotes && (
          <div className="border border-violet-500/20 rounded px-3 py-2 bg-violet-500/5 text-xs text-slate-400">
            <span className="text-violet-300 font-semibold">Your notes: </span>{queueInfo.userNotes}
          </div>
        )}

        {/* Send Back panel — expands inline when button is clicked */}
        {!queueInfo && sendBackOpen && !reopenedToQueue && (
          <div className="border border-violet-500/20 rounded-lg p-3 bg-violet-500/5 space-y-2">
            <div className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Send Back to the Team
            </div>
            <p className="text-xs text-slate-500">
              {c.incomplete ? 'Missing sections will be filled in. ' : ''}
              Add your notes below — the team will treat them as top-priority feedback.
            </p>
            <textarea
              value={sendBackNotes}
              onChange={(e) => setSendBackNotes(e.target.value)}
              placeholder="What needs work? (optional — leave blank to just finish the missing sections)"
              rows={3}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-400 resize-none"
            />
            {reopenError && (
              <div className="text-xs text-red-400">{reopenError}</div>
            )}
            <div className="flex gap-2">
              <button onClick={reopen} disabled={reopening}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-3 py-1.5 rounded transition-colors">
                {reopening ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {reopening ? 'Sending...' : 'Send to Team'}
              </button>
              <button onClick={() => { setSendBackOpen(false); setReopenError(''); }}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-700 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 leading-relaxed">{c.summary}</p>

        {/* Buildability checks (collapsed to top 3 fails) */}
        {buildability && (
          <div className="space-y-1">
            {buildability.checks.filter(ch => !ch.pass).slice(0, 3).map((ch, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-amber-400/80">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>Missing: {ch.label}</span>
              </div>
            ))}
            {buildability.checks.every(c => c.pass) && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> All buildability checks pass
              </div>
            )}
          </div>
        )}

        {c.incomplete && Array.isArray(c.missingSections) && c.missingSections.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-amber-400/10 text-amber-400">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            Ran out of rounds before covering: {c.missingSections.join(', ')}
          </div>
        )}

        {c.verification && (
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${c.verification.compiled ? 'bg-emerald-400/10 text-emerald-400' : c.verification.attempted ? 'bg-red-400/10 text-red-400' : 'bg-slate-700/60 text-slate-400'}`}>
            {c.verification.compiled ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {c.verification.detail || 'Not verified'}
          </div>
        )}
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-slate-700 p-3 space-y-3">
          {/* Full buildability checklist */}
          {buildability && (
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Buildability Checklist</div>
              <div className="grid grid-cols-1 gap-1">
                {buildability.checks.map((ch, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs ${ch.pass ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {ch.pass ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <AlertCircle className="w-3 h-3 flex-shrink-0 text-amber-400/60" />}
                    <span>{ch.label}</span>
                    {ch.detail && <span className="text-[10px] text-slate-600 font-mono">— {ch.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Virtual World VR Lab */}
          <div className="border border-blue-500/20 rounded-lg overflow-hidden bg-blue-500/5">
            <div className="px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Virtual World Lab</span>
                <span className="text-[10px] text-slate-500 normal-case font-normal">— Unity headless validation</span>
              </div>
              <button onClick={loadVrStatus} title="Refresh VR status" className="text-slate-500 hover:text-blue-300">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <div className="border-t border-blue-500/20 p-3 space-y-2">
              {vrStatus === 'loading' && (
                <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-3 h-3 animate-spin" /> Checking VR lab...</div>
              )}
              {vrStatus === 'no_lab' && (
                <div className="text-xs text-slate-500">Virtual World lab not found — start the orchestrator at <span className="font-mono text-slate-400">E:\Fallout 4 virtual world\orchestrator\orchestrator.py</span></div>
              )}
              {vrStatus === 'not_submitted' && !c.questId && (
                <div className="text-xs text-slate-500">No VR spec — this project predates VR integration. Projects finalized from now on are submitted automatically.</div>
              )}
              {vrStatus === 'not_submitted' && c.questId && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">Quest spec exists but hasn't been picked up yet — the orchestrator may not be running.</div>
                  <button onClick={sendToVrLab} disabled={vrSending}
                    className="flex items-center gap-1.5 text-xs text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 px-3 py-1.5 rounded transition-colors">
                    {vrSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    {vrSending ? 'Submitting...' : 'Re-submit to VR Lab'}
                  </button>
                </div>
              )}
              {vrStatus === 'pending' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-blue-300">
                    <Loader2 className="w-3 h-3 animate-spin" /> Waiting for Unity to run navmesh, interaction, and quest-flow tests...
                  </div>
                  <p className="text-[10px] text-slate-500">Run <span className="font-mono">orchestrator.py</span> to kick off the test. Results appear here automatically.</p>
                </div>
              )}
              {vrStatus === 'passed' && vrReport && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All VR tests passed — navmesh paths clear, all interactions found, quest flow complete
                  </div>
                  {vrReport.fps_min > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/70">
                      <Monitor className="w-2.5 h-2.5" /> {vrReport.fps_min}–{vrReport.fps_max} fps
                    </div>
                  )}
                  <div className="text-[10px] text-emerald-400/60">0 issues detected — Unity headless validation passed.</div>
                  <button onClick={sendToVrLab} disabled={vrSending}
                    className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-1.5 rounded transition-colors">
                    {vrSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube2 className="w-3 h-3" />} Re-test
                  </button>
                </div>
              )}
              {vrStatus === 'failed' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-red-400 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> VR validation failed
                  </div>
                  {vrReport && (vrReport.issues || []).length > 0 && (
                    <div className="space-y-1 mb-1">
                      {(vrReport.issues as string[]).map((issue, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-red-300">
                          <AlertCircle className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </div>
                      ))}
                      {vrReport.fps_min > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                          <Monitor className="w-2.5 h-2.5" /> {vrReport.fps_min}–{vrReport.fps_max} fps
                        </div>
                      )}
                    </div>
                  )}
                  {vrBugTicket && (vrBugTicket.issues || []).length > 0 && (
                    <div className="bg-red-400/10 rounded p-2 space-y-1.5">
                      <div className="text-[10px] font-semibold text-red-300 uppercase tracking-wider">Bug Ticket #{vrBugTicket.ticket_id}</div>
                      {(vrBugTicket.issues || []).map((issue: any, i: number) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex items-start gap-1.5 text-xs text-red-300">
                            <Bug className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>[{issue.category}] {issue.description}</span>
                          </div>
                          {issue.suggested_fix && (
                            <div className="flex items-start gap-1.5 text-[10px] text-slate-400 pl-4.5">
                              <span className="text-amber-400">Fix:</span> {issue.suggested_fix}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={sendBackWithVrIssues}
                      className="flex items-center gap-1.5 text-xs text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded transition-colors">
                      <RefreshCw className="w-3 h-3" /> Send Back with Issues
                    </button>
                    <button onClick={sendToVrLab} disabled={vrSending}
                      className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-1.5 rounded transition-colors">
                      {vrSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube2 className="w-3 h-3" />} Re-test
                    </button>
                  </div>
                </div>
              )}
              {vrError && <div className="text-xs text-red-400">{vrError}</div>}
            </div>
          </div>

          {/* Enhance with assets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Enhance Build Guide
              </div>
              <button onClick={() => setShowAssets(!showAssets)}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                <FolderSearch className="w-3.5 h-3.5" />
                {showAssets ? 'Hide' : 'Pick'} Assets ({selectedAssets.length})
              </button>
            </div>

            {showAssets && (
              <div className="mb-3">
                <div className="text-xs text-slate-500 mb-1.5">Browse F:\FO4 WORKING FLODER — click files to attach them to the enhanced guide</div>
                <AssetBrowser selected={selectedAssets} onToggle={toggleAsset} compact />
                {selectedAssets.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedAssets.map(a => (
                      <span key={a} className="flex items-center gap-1 bg-amber-400/10 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                        {a.split('\\').slice(-2).join('\\')}
                        <button onClick={() => toggleAsset(a)} className="hover:text-red-300"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <textarea value={enhanceNotes} onChange={e => setEnhanceNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:border-amber-500 outline-none resize-none mb-2"
              rows={2} placeholder="Optional notes: specific CK workflow, extra requirements, complexity target..." />

            {enhanceError && (
              <div className="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1 mb-2">{enhanceError}</div>
            )}

            <button onClick={enhance} disabled={enhancing || guideLoading}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2 rounded text-sm transition-colors">
              {enhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {enhancing ? 'Enhancing with AI...' : 'Enhance Guide with AI + Assets'}
            </button>
          </div>

          {/* Build Mod Structure */}
          <div className="border border-emerald-500/20 rounded-lg p-3 bg-emerald-500/5">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Package className="w-3.5 h-3.5" /> Build Mod Structure
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Generates real files from this guide: Papyrus <code className="text-emerald-300">.psc</code> scripts for every quest and NPC, a FOMOD installer skeleton, and the correct <code className="text-emerald-300">Data/</code> folder structure — ready to open in CK.
            </p>

            {scaffoldError && (
              <div className="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1 mb-2">{scaffoldError}</div>
            )}

            {scaffoldResult ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Built — {scaffoldResult.modName} · {scaffoldResult.questCount} quest script{scaffoldResult.questCount !== 1 ? 's' : ''} · {scaffoldResult.npcCount} NPC script{scaffoldResult.npcCount !== 1 ? 's' : ''} · {scaffoldResult.folderCount} folders
                </div>
                <div className="bg-slate-900 rounded p-2 max-h-32 overflow-y-auto space-y-0.5">
                  {scaffoldResult.createdFiles.filter(f => !f.endsWith('.gitkeep')).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      <File className="w-2.5 h-2.5 text-emerald-400/60 flex-shrink-0" />{f}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={revealScaffold}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 rounded transition-colors">
                    <FolderOpen className="w-3 h-3" /> Open in Explorer
                  </button>
                  <button onClick={scaffold} disabled={scaffolding}
                    className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors">
                    <RefreshCw className="w-3 h-3" /> Rebuild
                  </button>
                </div>
                <button onClick={compileScripts} disabled={compiling}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-1.5 rounded text-xs transition-colors">
                  {compiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Code2 className="w-3.5 h-3.5" />}
                  {compiling ? 'Compiling Papyrus…' : 'Compile Scripts (.psc → .pex)'}
                </button>
                {compileMsg && <div className="text-[10px] text-emerald-400">{compileMsg}</div>}
                {compileErr && <div className="text-[10px] text-red-400">{compileErr}</div>}
              </div>
            ) : (
              <button onClick={scaffold} disabled={scaffolding || guideLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 rounded text-sm transition-colors">
                {scaffolding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                {scaffolding ? 'Generating mod files...' : 'Build Mod Structure'}
              </button>
            )}
          </div>

          {/* xEdit Script Generator */}
          <div className="border border-cyan-500/20 rounded-lg overflow-hidden bg-cyan-500/5">
            <div className="px-3 py-2.5 flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Export xEdit Script</span>
              <span className="text-[10px] text-slate-500 normal-case font-normal">
                — generates a .pas script that pre-populates your ESP with all selected vanilla assets
              </span>
            </div>
            <div className="border-t border-cyan-500/20 p-3 space-y-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Run this script in FO4Edit to auto-create TXST texture sets, STAT statics, and other base records
                pre-wired to the asset paths you picked. Then place objects in CK — the building blocks are already there.
                Swap in your custom meshes and adjusted textures at any point.
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 whitespace-nowrap">ESP filename</label>
                <input
                  value={espName}
                  onChange={e => setEspName(e.target.value)}
                  placeholder="MyMod.esp"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <p className="text-[10px] text-slate-600">
                {selectedAssets.length > 0
                  ? `${selectedAssets.length} asset${selectedAssets.length !== 1 ? 's' : ''} selected from Asset Browser — these will be wired into the script.`
                  : 'No assets selected yet — use Pick Assets above to choose meshes and textures first, or the script will infer from the Build Guide.'}
              </p>
              {xeditError && (
                <div className="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1">{xeditError}</div>
              )}
              {xeditDone ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    xedit_setup.pas written to project folder
                  </div>
                  <div className="text-[10px] text-slate-500 leading-relaxed">
                    1. Open FO4Edit and load your ESP<br />
                    2. Scripts → Apply Script → select xedit_setup.pas<br />
                    3. Run — records are created in your ESP<br />
                    4. Open CK, place the objects, swap custom assets as needed
                  </div>
                  <div className="flex gap-2">
                    <button onClick={reveal}
                      className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 px-3 py-1.5 rounded transition-colors">
                      <FolderOpen className="w-3 h-3" /> Open Project Folder
                    </button>
                    <button onClick={generateXEditScript} disabled={xeditGenerating}
                      className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors">
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={generateXEditScript} disabled={xeditGenerating || guideLoading}
                  className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 rounded text-sm transition-colors">
                  {xeditGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
                  {xeditGenerating ? 'AI is writing the Pascal script...' : 'Generate xEdit Script'}
                </button>
              )}
            </div>
          </div>

          {/* Finalize — Package BA2 + Rebuild Previs (reuses the CK platform pipeline) */}
          <div className="border border-fuchsia-500/20 rounded-lg p-3 bg-fuchsia-500/5 space-y-2">
            <div className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Finalize — Package &amp; Previs
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pack the scaffold&apos;s <code className="text-fuchsia-300">Data/</code> into a <code className="text-fuchsia-300">.ba2</code>, and rebuild precombines/previs for the installed plugin (reuses the CK platform&apos;s GeneratePrevisibines pipeline). Both need your Fallout&nbsp;4 path set in Settings.
            </p>
            <div className="flex gap-2">
              <button onClick={packageMod} disabled={packaging}
                className="flex-1 flex items-center justify-center gap-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-1.5 rounded text-xs transition-colors">
                {packaging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                {packaging ? 'Packing…' : 'Package BA2'}
              </button>
              <button onClick={rebuildPrevis} disabled={prevising}
                className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-1.5 rounded text-xs transition-colors">
                {prevising ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {prevising ? 'Starting…' : 'Rebuild Previs'}
              </button>
            </div>
            {packageMsg && <div className="text-[10px] text-fuchsia-300">{packageMsg}</div>}
            {packageErr && <div className="text-[10px] text-red-400">{packageErr}</div>}
            {previsMsg && <div className="text-[10px] text-amber-300">{previsMsg}</div>}
            {previsErr && <div className="text-[10px] text-red-400">{previsErr}</div>}
          </div>

          {/* Guide viewer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> BUILD_GUIDE.md
              </div>
              <button onClick={() => setShowGuide(!showGuide)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                {showGuide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showGuide ? 'Hide' : 'View'}
              </button>
            </div>
            {showGuide && (
              <div className="relative">
                {guideLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-slate-500" /></div>
                ) : (
                  <>
                    <button onClick={() => navigator.clipboard.writeText(guideContent)}
                      className="absolute top-2 right-2 text-xs text-slate-500 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded z-10">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <pre className="bg-slate-950 border border-slate-700 rounded p-3 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">{guideContent}</pre>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Animation Studio */}
          <div className="border border-violet-500/20 rounded-lg overflow-hidden bg-violet-500/5">
            <button onClick={() => setAnimExpanded(!animExpanded)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-violet-500/10 transition-colors text-left">
              <div className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Animation Studio</span>
                {animDir && (
                  <span className="text-[10px] text-violet-500 font-normal normal-case">
                    {(animDir.animations || []).length} animation{(animDir.animations || []).length !== 1 ? 's' : ''} · iClone 8
                  </span>
                )}
              </div>
              {animExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {animExpanded && (
              <div className="border-t border-violet-500/20 p-3 space-y-3">
                {/* Generate / regenerate */}
                <div className="flex items-center gap-2">
                  <button onClick={generateAnimationDirection} disabled={animGenerating}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors">
                    {animGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    {animDir ? 'Regenerate Direction' : 'Generate Animation Direction'}
                  </button>
                  <button onClick={launchIClone}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-slate-800 border border-slate-600 hover:border-violet-500 text-slate-300 hover:text-violet-300 transition-colors">
                    <Zap className="w-3 h-3" />
                    Launch iClone 8
                  </button>
                </div>

                {animError && <div className="text-[10px] text-red-400">{animError}</div>}

                {!animDir && !animGenerating && (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The AI team will analyze your mod's BUILD_GUIDE and determine exactly which custom
                    animations are needed — or confirm that vanilla animations are sufficient.
                    Generates an iClone 8 Python script with stubs for each animation.
                  </p>
                )}

                {animDir && (
                  <>
                    {/* Character + export info */}
                    <div className="bg-slate-900/60 border border-slate-700 rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider">Character</span>
                        <span className="text-[10px] text-slate-300 font-mono">{animDir.character?.type || 'human'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{animDir.character?.skeleton || ''}</div>
                      {animDir.character?.notes && <div className="text-[10px] text-slate-400">{animDir.character.notes}</div>}
                      {animDir.exportSettings?.hkxNotes && (
                        <div className="text-[10px] text-amber-400/80 leading-relaxed pt-1 border-t border-slate-700">
                          {animDir.exportSettings.hkxNotes}
                        </div>
                      )}
                    </div>

                    {/* Animation list */}
                    <div className="space-y-2">
                      {(animDir.animations || []).map((a: any) => (
                        <div key={a.id} className="bg-slate-900/60 border border-slate-700 rounded p-2.5 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-white">{a.name}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              a.type === 'loop' ? 'bg-sky-900/40 text-sky-300 border-sky-500/30' :
                              a.type === 'one_shot' ? 'bg-amber-900/40 text-amber-300 border-amber-500/30' :
                              'bg-slate-800 text-slate-400 border-slate-600'
                            }`}>{a.type}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              a.priority === 'high' ? 'bg-red-900/40 text-red-300 border-red-500/30' :
                              a.priority === 'medium' ? 'bg-violet-900/40 text-violet-300 border-violet-500/30' :
                              'bg-slate-800 text-slate-400 border-slate-600'
                            }`}>{a.priority}</span>
                            {a.durationSec > 0 && <span className="text-[10px] text-slate-500">{a.durationSec}s</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{a.description}</p>
                          {a.technicalNotes && (
                            <p className="text-[10px] text-violet-400/70 leading-relaxed">{a.technicalNotes}</p>
                          )}
                          {(a.targetBones || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {a.targetBones.map((b: string) => (
                                <span key={b} className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{b}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Python script copy */}
                    {animDir.scriptContent && (
                      <button onClick={copyScript}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded bg-slate-800 border border-slate-600 hover:border-violet-500 text-slate-300 hover:text-violet-300 transition-colors">
                        {animScriptCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {animScriptCopied ? 'Copied!' : 'Copy iClone Python Script'}
                      </button>
                    )}

                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Script saved to <span className="font-mono text-slate-400">iclone_animations.py</span> in your project folder.
                      Open iClone 8, import your character, then run Script → Load Script.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Concept Art Studio */}
          <div className="border border-sky-500/20 rounded-lg overflow-hidden bg-sky-500/5">
            <button onClick={() => setArtExpanded(!artExpanded)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-sky-500/10 transition-colors text-left">
              <div className="flex items-center gap-2">
                <Image className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Concept Art Studio</span>
                {artPrompts.length > 0 && (
                  <span className="text-[10px] text-sky-500 font-normal normal-case">
                    {artPrompts.length} prompt{artPrompts.length !== 1 ? 's' : ''}
                    {Object.keys(artImages).length > 0 && ` · ${Object.keys(artImages).length} generated`}
                  </span>
                )}
              </div>
              {artExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {artExpanded && (
              <div className="border-t border-sky-500/20 p-3 space-y-3">
                {/* ComfyUI status */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1.5 px-2 py-1 bg-slate-900/60 border border-slate-700 rounded text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sdOnline === true ? 'bg-emerald-400' : sdOnline === false ? 'bg-red-400' : 'bg-slate-500'}`} />
                    <span className="text-slate-400 font-mono">ComfyUI :8188</span>
                    {comfyModel && <span className="text-slate-500 truncate">· {comfyModel}</span>}
                  </div>
                  <button onClick={checkSdStatus} disabled={sdChecking}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-sky-300 disabled:opacity-50 transition-colors whitespace-nowrap">
                    {sdChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    {sdChecking ? 'Checking…' : sdOnline === null ? 'Check' : sdOnline ? 'Online' : 'Offline'}
                  </button>
                  {sdOnline === false && (
                    <span className="text-[10px] text-red-400">ComfyUI not running — launch it or use AI Image Studio</span>
                  )}
                </div>

                {artPrompts.length === 0 ? (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No concept art prompts yet. The AI team generates these when they write the
                    Art Direction and Creature &amp; Object Concepts sections. Send this project
                    back to the team or wait for a new project to include them automatically.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">768×768 · 30 steps · ComfyUI</span>
                      <button onClick={generateAll}
                        disabled={generatingIds.size > 0}
                        className="flex items-center gap-1.5 text-xs font-semibold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-50 px-3 py-1 rounded transition-colors">
                        {generatingIds.size > 0 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        Generate All
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {artPrompts.map(p => {
                        const isGenerating = generatingIds.has(p.id);
                        const img = artImages[p.id];
                        const err = artErrors[p.id];
                        const catColor: Record<string, string> = {
                          location: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30',
                          architecture: 'bg-amber-900/40 text-amber-300 border-amber-500/30',
                          creature: 'bg-red-900/40 text-red-300 border-red-500/30',
                          vegetation: 'bg-teal-900/40 text-teal-300 border-teal-500/30',
                        };
                        return (
                          <div key={p.id} className="bg-slate-900/60 border border-slate-700 rounded-lg overflow-hidden">
                            {img ? (
                              <img src={img} alt={p.label}
                                className="w-full aspect-square object-cover bg-slate-800" />
                            ) : (
                              <div className="w-full aspect-square bg-slate-800/60 flex items-center justify-center">
                                {isGenerating
                                  ? <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                                  : <Image className="w-8 h-8 text-slate-600" />}
                              </div>
                            )}
                            <div className="p-2 space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-white">{p.label}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${catColor[p.category] || 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                                  {p.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{p.prompt}</p>
                              {err && <div className="text-[10px] text-red-400">{err}</div>}
                              <div className="flex gap-1.5">
                                <button onClick={() => generateArt(p)} disabled={isGenerating}
                                  className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors">
                                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                  {img ? 'Regenerate' : 'Generate'}
                                </button>
                                <button onClick={() => navigator.clipboard.writeText(p.prompt)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-sky-300 transition-colors"
                                  title="Copy prompt">
                                  <Copy className="w-3 h-3" />
                                </button>
                                {img && (
                                  <a href={img} download={`${c.id}_${p.id}.png`}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 transition-colors"
                                    title="Download image">
                                    <Download className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const HandoffPanel: React.FC = () => {
  const [completed, setCompleted] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const api = () => (window as any).electronAPI ?? (window as any).electron?.api;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api()?.creativeDirectorTeam?.getState?.();
      if (Array.isArray(res?.completedProjects)) setCompleted(res.completedProjects);
      if (Array.isArray(res?.pendingQueue)) setQueue(res.pendingQueue);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          Each project gets a buildability score (1–5) based on REAL artifacts — whether an .esp exists, whether its Papyrus is compiled to .pex, and whether quest/dialogue records and script attachments are actually present. Expand any card to see the full checklist, build the mod structure, compile scripts, generate the xEdit records, and package + rebuild previs.
        </p>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1.5 rounded transition-colors flex-shrink-0">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Refresh
        </button>
      </div>

      {/* Sent-back projects — compact status bar only (they're with the team, not "finished" yet) */}
      {queue.length > 0 && (
        <div className="flex items-center gap-3 border border-violet-500/20 rounded px-3 py-2 bg-violet-500/5">
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-violet-300">{queue.length} project{queue.length !== 1 ? 's' : ''} back with the team</span>
            <span className="text-xs text-slate-500 ml-2">Revision in progress — they'll appear here as finished when the team is done.</span>
          </div>
          <button onClick={refresh} disabled={loading} className="text-slate-500 hover:text-violet-300 flex-shrink-0" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {completed.length === 0 && queue.length === 0 && (
        <div className="text-center py-10 border border-dashed border-slate-700 rounded-lg">
          <FlaskConical className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <div className="text-slate-500 text-sm font-semibold">No finished projects yet</div>
          <div className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">Enable the AI Team tab — when the team finishes a project it appears here with a buildability assessment.</div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          {completed.map(c => (
            <HandoffProjectCard key={c.id} c={c} onRefresh={refresh} />
          ))}
        </div>
      )}

      <div className="bg-slate-800/40 border border-slate-700/50 rounded p-3">
        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1"><Info className="w-3 h-3" /> How This Works</div>
        <ul className="space-y-1 text-xs text-slate-500">
          <li><span className="text-amber-400 font-semibold">Buildability score</span> — checks the guide for CK record types, EditorIDs, Papyrus scripts, navmesh notes, asset paths, step-by-step instructions, and a testing checklist</li>
          <li><span className="text-amber-400 font-semibold">Pick Assets</span> — browse F:\FO4 WORKING FLODER to select real vanilla mesh/texture paths and attach them to the enhanced guide</li>
          <li><span className="text-amber-400 font-semibold">Enhance</span> — AI rewrites the BUILD_GUIDE with full CK steps, the selected assets, and a testing checklist you can follow</li>
          <li>The team still can't place objects in CK or pack ESPs — every project is a design + guide, you build it</li>
          <li>Click Reveal to open the project folder in Explorer</li>
        </ul>
      </div>
    </div>
  );
};

// ─── Personal R&D Network (dev-only) ───────────────────────────────────────────
// Proxies to the user's own separate local AI stack (AI Helper / VirtualModLab /
// a Python Creative Director hub) if it happens to be running. Not part of the
// shipped feature set - the panel only renders if that real stack is reachable.

const PersonalRdNetworkPanel: React.FC = () => {
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  const api = () => (window as any).electronAPI ?? (window as any).electron?.api;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api()?.personalRdNetwork?.getStatus?.();
      setStatus(s?.status || null);
      const q = await api()?.personalRdNetwork?.getQueue?.();
      if (Array.isArray(q?.items)) setQueueItems(q.items);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const setItemStatus = async (id: string, newStatus: string) => {
    await api()?.personalRdNetwork?.setItemStatus?.(id, newStatus, feedbackMap[id] || '');
    await refresh();
  };

  const pending = queueItems.filter((i) => i.status === 'pending_review');
  const others = queueItems.filter((i) => i.status !== 'pending_review');

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
        <div className="text-sm font-semibold text-white">Your Personal R&D Network</div>
        <div className="text-xs text-slate-500 mt-0.5">
          Connected to your own AI Helper / VirtualModLab / Creative Director stack on this machine — not part of what ships with Mossy.
          {status && <span className="text-emerald-400"> AI Helper: {status.network?.ai_helper?.connected ? 'online' : 'offline'} · VirtualModLab: {status.network?.virtual_mod_lab?.connected ? 'online' : 'offline'}</span>}
        </div>
      </div>

      {pending.length === 0 && others.length === 0 && (
        <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
          <div className="text-slate-500 text-sm">{loading ? 'Loading...' : 'Queue is empty - findings from AI Helper/VirtualModLab will show up here.'}</div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Review ({pending.length})</div>
          {pending.map((item) => (
            <div key={item.id} className="bg-slate-800/60 border border-slate-700 rounded p-3 space-y-2">
              <div className="text-sm font-semibold text-white">{item.title}</div>
              <p className="text-xs text-slate-400">{item.description}</p>
              <div className="text-[10px] text-slate-500">by {item.created_by} · {item.mod_type} · {new Date(item.created_at * 1000).toLocaleString()}</div>
              <div className="flex items-center gap-2">
                <input className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-amber-500 outline-none"
                  placeholder="Feedback..." value={feedbackMap[item.id] ?? ''}
                  onChange={(e) => setFeedbackMap((m) => ({ ...m, [item.id]: e.target.value }))} />
                <button onClick={() => setItemStatus(item.id, 'tested')} className="text-xs px-2 py-1 rounded bg-amber-400/10 text-amber-400 hover:bg-amber-400/20">Tested</button>
                <button onClick={() => setItemStatus(item.id, 'published')} className="text-xs px-2 py-1 rounded bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20">Published</button>
                <button onClick={() => setItemStatus(item.id, 'rejected')} className="text-xs px-2 py-1 rounded bg-red-400/10 text-red-400 hover:bg-red-400/20">Rejected</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reviewed ({others.length})</div>
          {others.map((item) => (
            <div key={item.id} className="bg-slate-800/30 border border-slate-700/60 rounded p-2.5 text-xs text-slate-400 flex items-center justify-between">
              <span>{item.title}</span>
              <span className="text-slate-500">{item.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TAB_DEFS: { id: CreativeTab; icon: React.ComponentType<{ className?: string }>; label: string; sublabel: string }[] = [
  { id: 'quest',    icon: Scroll,        label: 'Quest Builder',   sublabel: 'Stages · Objectives · Scripts' },
  { id: 'dialogue', icon: MessageSquare, label: 'Dialogue Writer', sublabel: 'Trees · Conditions · Export' },
  { id: 'npc',      icon: User,          label: 'NPC Creator',     sublabel: 'SPECIAL · Traits · Backstory' },
  { id: 'lore',     icon: BookOpen,      label: 'Lore Vault',      sublabel: 'Semantic Search · Knowledge' },
  { id: 'world',    icon: Map,           label: 'World Design',    sublabel: 'Cells · Navmesh · Storytelling' },
  { id: 'network',  icon: Radio,         label: 'AI Team',         sublabel: 'Director + Specialists · Live Transcript' },
  { id: 'debug',    icon: Bug,           label: 'Debug',           sublabel: 'Script Analysis · Pitfalls' },
  { id: 'handoff',  icon: FlaskConical,  label: 'Lab Handoff',     sublabel: 'Finished Projects · Retrieve & Test' },
];

const CreativeDirectorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CreativeTab>('quest');
  const [backendOnline, setBackendOnline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [personalRdReachable, setPersonalRdReachable] = useState(false);

  const checkBackend = useCallback(async () => {
    setChecking(true);
    try {
      await fetch(`http://localhost:${BACKEND_PORT}/status`, { signal: AbortSignal.timeout(1500) });
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    const pollTeam = async () => {
      try {
        const api = (window as any).electronAPI ?? (window as any).electron?.api;
        const res = await api?.creativeDirectorTeam?.getState?.();
        setTeamEnabled(Boolean(res?.enabled));
      } catch { /* ignore */ }
    };
    pollTeam();
    const interval = setInterval(pollTeam, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  // Dev-only: probe the user's personal R&D stack. Most installs won't have it
  // running, so the tab below stays hidden by default - nothing required.
  useEffect(() => {
    const probe = async () => {
      try {
        const api = (window as any).electronAPI ?? (window as any).electron?.api;
        const res = await api?.personalRdNetwork?.getStatus?.();
        setPersonalRdReachable(Boolean(res?.reachable));
      } catch { setPersonalRdReachable(false); }
    };
    probe();
    const interval = setInterval(probe, 15000);
    return () => clearInterval(interval);
  }, []);

  const visibleTabs = personalRdReachable
    ? [...TAB_DEFS, { id: 'personalrd' as CreativeTab, icon: Cpu, label: 'Personal R&D', sublabel: 'Your AI Helper Network · Dev Only' }]
    : TAB_DEFS;

  const active = visibleTabs.find(t => t.id === activeTab)!;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Vault-Tec Creative Director</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">FO4 Narrative Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={checkBackend} disabled={checking} className="text-slate-500 hover:text-white transition-colors">
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ${backendOnline ? 'bg-emerald-400/10 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            {backendOnline ? 'Backend Online' : 'Offline Mode'}
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-slate-800 flex-shrink-0">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 whitespace-nowrap text-xs font-medium border-b-2 transition-colors flex-shrink-0 ${isActive ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 border-b border-slate-800/50 flex-shrink-0 bg-slate-900/50">
        <div className="text-xs text-slate-500">{active.sublabel}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'quest'    && <QuestBuilder    backendOnline={backendOnline} />}
        {activeTab === 'dialogue' && <DialogueWriter  backendOnline={backendOnline} />}
        {activeTab === 'npc'      && <NPCCreator      backendOnline={backendOnline} />}
        {activeTab === 'lore'     && <LoreVault       backendOnline={backendOnline} />}
        {activeTab === 'world'    && <WorldDesign     backendOnline={backendOnline} />}
        {activeTab === 'network'  && <AITeamPanel />}
        {activeTab === 'debug'    && <NarrativeDebug  backendOnline={backendOnline} />}
        {activeTab === 'handoff'  && <HandoffPanel />}
        {activeTab === 'personalrd' && <PersonalRdNetworkPanel />}
      </div>

      {!teamEnabled && (
        <div className="px-4 py-2 bg-slate-800/60 border-t border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3 h-3 flex-shrink-0" />
            <span>The AI Team tab is disabled — enable it there to let the Creative Director and specialists start working autonomously.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreativeDirectorPanel;
