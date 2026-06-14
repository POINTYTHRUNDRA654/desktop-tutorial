import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wand2, Scroll, MessageSquare, User, BookOpen, Map, Radio, Bug,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Plus, Trash2,
  Send, Search, Pin, Download,
  Cpu, Wifi, WifiOff, Zap, FileText,
  Play, AlertTriangle, Info, Copy, FlaskConical,
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

interface PeerStatus {
  name: string;
  port: number;
  connected: boolean;
  lastMessage: string;
}

type CreativeTab = 'quest' | 'dialogue' | 'npc' | 'lore' | 'world' | 'network' | 'debug' | 'handoff';

type ArtifactStatus = 'pending' | 'testing' | 'approved' | 'rejected';
type ArtifactType = 'script' | 'esp' | 'texture' | 'mesh' | 'tool' | 'config';

interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  agent: string;
  timestamp: string;
  status: ArtifactStatus;
  notes: string;
  filePath: string;
  size: string;
}

const BACKEND_PORT = 8767;
const AI_HELPER_PORT = 8766;
const VML_PORT = 8768;

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

// ─── Network Feed ─────────────────────────────────────────────────────────────

const NetworkFeed: React.FC<{ backendOnline: boolean }> = ({ backendOnline }) => {
  const [peers, setPeers] = useState<PeerStatus[]>([
    { name: 'AI Helper', port: AI_HELPER_PORT, connected: false, lastMessage: '' },
    { name: 'VirtualModLab', port: VML_PORT, connected: false, lastMessage: '' },
  ]);
  const [messages, setMessages] = useState<{ from: string; text: string; ts: string }[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [checking, setChecking] = useState(false);

  const checkPeers = useCallback(async () => {
    setChecking(true);
    const updated = await Promise.all(peers.map(async p => {
      try {
        const r = await fetch(`http://localhost:${p.port}/status`, { signal: AbortSignal.timeout(1500) });
        const data = await r.json();
        return { ...p, connected: true, lastMessage: data.status ?? 'online' };
      } catch {
        return { ...p, connected: false, lastMessage: '' };
      }
    }));
    setPeers(updated);
    setChecking(false);
  }, [peers]);

  useEffect(() => { checkPeers(); }, []);

  const broadcast = async () => {
    if (!msgInput.trim()) return;
    const msg = { from: 'Creative Director', text: msgInput, ts: new Date().toISOString() };
    setMessages(m => [...m, msg]);
    const connected = peers.filter(p => p.connected);
    for (const peer of connected) {
      try {
        await fetch(`http://localhost:${peer.port}/narrative/event`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg),
          signal: AbortSignal.timeout(2000),
        });
      } catch { /* peer offline */ }
    }
    setMsgInput('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {peers.map(p => (
          <div key={p.port} className={`flex items-center gap-3 p-3 rounded border ${p.connected ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-slate-700 bg-slate-800/40'}`}>
            {p.connected ? <Wifi className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <WifiOff className="w-4 h-4 text-slate-600 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{p.name}</div>
              <div className="text-xs text-slate-500">port {p.port}{p.lastMessage ? ` · ${p.lastMessage}` : ''}</div>
            </div>
            <span className={`text-xs font-semibold ${p.connected ? 'text-emerald-400' : 'text-slate-600'}`}>
              {p.connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        ))}
      </div>
      <button onClick={checkPeers} disabled={checking}
        className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm transition-colors">
        {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Check Peer Status
      </button>
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Narrative Broadcast</div>
        <div className="bg-slate-950 border border-slate-700 rounded p-3 h-32 overflow-y-auto mb-2 space-y-1">
          {messages.length === 0 && <div className="text-xs text-slate-600">No messages. Broadcast narrative events to connected peers.</div>}
          {messages.map((m, i) => (
            <div key={i} className="text-xs">
              <span className="text-slate-500 font-mono">[{new Date(m.ts).toLocaleTimeString()}]</span>{' '}
              <span className="text-amber-400">{m.from}:</span>{' '}
              <span className="text-slate-300">{m.text}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && broadcast()}
            placeholder="Broadcast narrative event to peers..." />
          <button onClick={broadcast} className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-2 rounded transition-colors"><Send className="w-4 h-4" /></button>
        </div>
      </div>
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

// ─── Lab Handoff ──────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<ArtifactType, string> = {
  script:  'text-amber-400 bg-amber-400/10',
  esp:     'text-purple-400 bg-purple-400/10',
  texture: 'text-blue-400 bg-blue-400/10',
  mesh:    'text-cyan-400 bg-cyan-400/10',
  tool:    'text-emerald-400 bg-emerald-400/10',
  config:  'text-slate-400 bg-slate-400/10',
};

const STATUS_COLORS: Record<ArtifactStatus, string> = {
  pending:  'text-slate-400 bg-slate-700',
  testing:  'text-amber-400 bg-amber-400/20',
  approved: 'text-emerald-400 bg-emerald-400/20',
  rejected: 'text-red-400 bg-red-400/20',
};

const ArtifactRow: React.FC<{
  art: Artifact;
  feedback: string;
  onFeedbackChange: (val: string) => void;
  onStatus: (status: ArtifactStatus) => void;
}> = ({ art, feedback, onFeedbackChange, onStatus }) => (
  <div className="bg-slate-800/60 border border-slate-700 rounded p-3 space-y-2">
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${TYPE_COLORS[art.type]}`}>{art.type.toUpperCase()}</span>
          <span className="text-sm font-semibold text-white truncate">{art.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[art.status]}`}>{art.status}</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          by <span className="text-amber-400">{art.agent}</span> · {new Date(art.timestamp).toLocaleString()}{art.size ? ` · ${art.size}` : ''}
        </div>
      </div>
      {art.filePath && (
        <button
          onClick={() => (window as any).electronAPI?.shell?.openPath?.(art.filePath)}
          className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
          title="Open file location"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
    </div>
    {art.notes && <p className="text-xs text-slate-400 italic">{art.notes}</p>}
    {art.filePath && (
      <div className="flex items-center gap-1 font-mono text-xs text-slate-600 bg-slate-900/60 rounded px-2 py-1 truncate">{art.filePath}</div>
    )}
    <div className="flex items-center gap-2">
      <input
        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-amber-500 outline-none"
        placeholder="Feedback / test notes..."
        value={feedback}
        onChange={e => onFeedbackChange(e.target.value)}
      />
      <button onClick={() => onStatus('testing')} disabled={art.status === 'testing'}
        className="text-xs px-2 py-1 rounded bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-40 transition-colors whitespace-nowrap">Test</button>
      <button onClick={() => onStatus('approved')} disabled={art.status === 'approved'}
        className="text-xs px-2 py-1 rounded bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 disabled:opacity-40 transition-colors">
        <CheckCircle2 className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onStatus('rejected')} disabled={art.status === 'rejected'}
        className="text-xs px-2 py-1 rounded bg-red-400/10 text-red-400 hover:bg-red-400/20 disabled:opacity-40 transition-colors">
        <AlertCircle className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

const HandoffPanel: React.FC<{ backendOnline: boolean }> = ({ backendOnline }) => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [polling, setPolling] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newArt, setNewArt] = useState<{ name: string; type: ArtifactType; agent: string; filePath: string; size: string; notes: string }>({
    name: '', type: 'script', agent: 'Mossy', filePath: '', size: '', notes: '',
  });

  const pollQueue = useCallback(async () => {
    if (!backendOnline) return;
    setPolling(true);
    try {
      const data = await backendFetch('/api/handoff/queue');
      if (Array.isArray(data.artifacts)) {
        setArtifacts(prev => {
          const ids = new Set(prev.map(a => a.id));
          const fresh = data.artifacts.filter((a: Artifact) => !ids.has(a.id));
          return [...prev, ...fresh];
        });
      }
    } catch {}
    setPolling(false);
  }, [backendOnline]);

  useEffect(() => {
    pollQueue();
    const interval = setInterval(pollQueue, 30000);
    return () => clearInterval(interval);
  }, [pollQueue]);

  const setStatus = async (id: string, status: ArtifactStatus) => {
    setArtifacts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (backendOnline) {
      try { await backendFetch('/api/handoff/feedback', { id, status, notes: feedbackMap[id] ?? '' }); } catch {}
    }
  };

  const addManual = () => {
    if (!newArt.name.trim()) return;
    setArtifacts(prev => [...prev, {
      id: uid(), timestamp: new Date().toISOString(), status: 'pending',
      name: newArt.name, type: newArt.type, agent: newArt.agent || 'Manual',
      filePath: newArt.filePath, size: newArt.size, notes: newArt.notes,
    }]);
    setNewArt({ name: '', type: 'script', agent: 'Mossy', filePath: '', size: '', notes: '' });
    setShowAdd(false);
  };

  const pending  = artifacts.filter(a => a.status === 'pending');
  const testing  = artifacts.filter(a => a.status === 'testing');
  const done     = artifacts.filter(a => a.status === 'approved' || a.status === 'rejected');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          {backendOnline
            ? <span className="text-emerald-400">Backend online — AI agents can push completed work here automatically via POST /api/handoff/deliver.</span>
            : 'When AI agents finish a mod, script, or tool they push it here for you to download and test in FO4 / MO2. Add entries manually while in offline mode.'}
        </p>
        <div className="flex gap-2 flex-shrink-0">
          {backendOnline && (
            <button onClick={pollQueue} disabled={polling}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1.5 rounded transition-colors">
              {polling ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Poll
            </button>
          )}
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-2 py-1.5 rounded transition-colors">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-slate-800 border border-amber-500/30 rounded p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-amber-500 outline-none"
              placeholder="Artifact name" value={newArt.name} onChange={e => setNewArt(n => ({ ...n, name: e.target.value }))} />
            <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-amber-500 outline-none"
              value={newArt.type} onChange={e => setNewArt(n => ({ ...n, type: e.target.value as ArtifactType }))}>
              {(['script','esp','texture','mesh','tool','config'] as ArtifactType[]).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-amber-500 outline-none"
              placeholder="Agent name (e.g. Mossy)" value={newArt.agent} onChange={e => setNewArt(n => ({ ...n, agent: e.target.value }))} />
            <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-amber-500 outline-none"
              placeholder="Size (e.g. 24 KB)" value={newArt.size} onChange={e => setNewArt(n => ({ ...n, size: e.target.value }))} />
          </div>
          <input className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-amber-500 outline-none font-mono"
            placeholder="File path — e.g. D:\FO4Mods\MyMod\Scripts\MyQuest.psc" value={newArt.filePath}
            onChange={e => setNewArt(n => ({ ...n, filePath: e.target.value }))} />
          <textarea className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-amber-500 outline-none resize-none"
            rows={2} placeholder="Notes from the agent about what was built and how to test it..." value={newArt.notes}
            onChange={e => setNewArt(n => ({ ...n, notes: e.target.value }))} />
          <button onClick={addManual} className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded transition-colors">Add to Queue</button>
        </div>
      )}

      {artifacts.length === 0 && !showAdd && (
        <div className="text-center py-10 border border-dashed border-slate-700 rounded-lg">
          <FlaskConical className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <div className="text-slate-500 text-sm font-semibold">Queue is empty</div>
          <div className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">AI agents push completed scripts, ESPs, textures, and tools here when they finish. You download, test in FO4/MO2, then approve or send feedback.</div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Test ({pending.length})</div>
          {pending.map(a => <ArtifactRow key={a.id} art={a} feedback={feedbackMap[a.id] ?? ''} onFeedbackChange={v => setFeedbackMap(m => ({ ...m, [a.id]: v }))} onStatus={s => setStatus(a.id, s)} />)}
        </div>
      )}

      {testing.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">In Testing ({testing.length})</div>
          {testing.map(a => <ArtifactRow key={a.id} art={a} feedback={feedbackMap[a.id] ?? ''} onFeedbackChange={v => setFeedbackMap(m => ({ ...m, [a.id]: v }))} onStatus={s => setStatus(a.id, s)} />)}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed ({done.length})</div>
          {done.map(a => <ArtifactRow key={a.id} art={a} feedback={feedbackMap[a.id] ?? ''} onFeedbackChange={v => setFeedbackMap(m => ({ ...m, [a.id]: v }))} onStatus={s => setStatus(a.id, s)} />)}
        </div>
      )}

      <div className="bg-slate-800/40 border border-slate-700/50 rounded p-3">
        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1"><Info className="w-3 h-3" /> Handoff Workflow</div>
        <ul className="space-y-1 text-xs text-slate-500">
          <li>AI agents POST to /api/handoff/deliver with name, type, filePath, notes</li>
          <li>Artifact appears as Pending — click Test when you start evaluating it in FO4</li>
          <li>Load via MO2 loose files or drop in Data\ folder, then play-test the feature</li>
          <li>Approve or Reject with feedback notes — result is sent back to the originating agent</li>
          <li>Approved work moves to the Packaging & Release hub for final BA2 packing</li>
        </ul>
      </div>
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
  { id: 'network',  icon: Radio,         label: 'Network Feed',    sublabel: 'Peer Agents · Broadcast' },
  { id: 'debug',    icon: Bug,           label: 'Debug',           sublabel: 'Script Analysis · Pitfalls' },
  { id: 'handoff',  icon: FlaskConical,  label: 'Lab Handoff',     sublabel: 'Agent Output · Testing Queue' },
];

const CreativeDirectorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CreativeTab>('quest');
  const [backendOnline, setBackendOnline] = useState(false);
  const [checking, setChecking] = useState(false);

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
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  const active = TAB_DEFS.find(t => t.id === activeTab)!;

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
        {TAB_DEFS.map(tab => {
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
        {activeTab === 'network'  && <NetworkFeed     backendOnline={backendOnline} />}
        {activeTab === 'debug'    && <NarrativeDebug  backendOnline={backendOnline} />}
        {activeTab === 'handoff'  && <HandoffPanel    backendOnline={backendOnline} />}
      </div>

      {!backendOnline && (
        <div className="px-4 py-2 bg-slate-800/60 border-t border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3 h-3 flex-shrink-0" />
            <span>Run <code className="text-amber-400 font-mono">python creative_director.py</code> on port {BACKEND_PORT} to enable AI generation.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreativeDirectorPanel;
