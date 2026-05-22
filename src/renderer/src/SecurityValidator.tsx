import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Ban, AlertTriangle, Plus, X, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import { DEFAULT_SETTINGS, BlacklistEntry, Settings } from '../../shared/types';

// ── helpers ─────────────────────────────────────────────────────────────────

function getApi(): any {
  return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
}

async function loadSettings(): Promise<Settings> {
  const api = getApi();
  if (api?.getSettings) {
    try {
      const s = await api.getSettings();
      return {
        ...DEFAULT_SETTINGS,
        ...(s || {}),
        privacySettings: {
          ...DEFAULT_SETTINGS.privacySettings,
          ...(s?.privacySettings || {}),
        },
      } as Settings;
    } catch { /* fall through */ }
  }
  return { ...DEFAULT_SETTINGS };
}

async function savePrivacy(
  current: Settings,
  patch: Partial<Settings['privacySettings']>
): Promise<Settings> {
  const api = getApi();
  const next: Settings = {
    ...current,
    privacySettings: { ...current.privacySettings, ...patch },
  };
  if (api?.setSettings) await api.setSettings(next);
  return next;
}

// ── tab type ─────────────────────────────────────────────────────────────────
type Tab = 'whitelist' | 'mod-blacklist' | 'program-blacklist';

// ── component ────────────────────────────────────────────────────────────────
const SecurityValidator: React.FC = () => {
  const [tab, setTab] = useState<Tab>('mod-blacklist');

  // settings-backed blacklists
  const [settings, setSettings] = useState<Settings | null>(null);

  // whitelist (settings-backed)
  const [wlName, setWlName] = useState('');
  const [wlError, setWlError] = useState<string | null>(null);

  // mod blacklist fields
  const [mbName, setMbName] = useState('');
  const [mbReason, setMbReason] = useState('');

  // program blacklist fields
  const [pbName, setPbName] = useState('');
  const [pbReason, setPbReason] = useState('');

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const modBlacklist: BlacklistEntry[] = (settings?.privacySettings?.modContentBlacklist ?? []).map(
    (e: any) => (typeof e === 'string' ? { name: e } : e)
  );
  const programBlacklist: BlacklistEntry[] = (settings?.privacySettings?.programBlacklist ?? []).map(
    (e: any) => (typeof e === 'string' ? { name: e } : e)
  );
  const whitelist = useMemo(
    () => (settings?.privacySettings?.modContentWhitelist ?? []).map((e: any) => String(e || '').trim()).filter(Boolean),
    [settings]
  );

  // ── whitelist actions ───────────────────────────────────────────────────
  const addToWhitelist = () => {
    if (!wlName.trim() || !settings) { setWlError('Mod name is required'); return; }
    setWlError(null);
    const entry = wlName.trim();
    if (whitelist.some(w => w.toLowerCase() === entry.toLowerCase())) {
      toast.error('Already on the do-not-touch list');
      return;
    }
    void savePrivacy(settings, { modContentWhitelist: [entry, ...whitelist] }).then(setSettings);
    setWlName('');
    toast.success(`"${entry}" added to do-not-touch list`);
  };

  const removeFromWhitelist = async (entry: string) => {
    if (!settings) return;
    const next = await savePrivacy(settings, {
      modContentWhitelist: whitelist.filter((e) => e !== entry),
    });
    setSettings(next);
  };

  // ── mod blacklist actions ───────────────────────────────────────────────
  const addToModBlacklist = async () => {
    if (!mbName.trim() || !settings) return;
    const entry: BlacklistEntry = { name: mbName.trim(), reason: mbReason.trim() || undefined };
    if (modBlacklist.some(e => e.name.toLowerCase() === entry.name.toLowerCase())) {
      toast.error('Already on the mod blacklist'); return;
    }
    const next = await savePrivacy(settings, { modContentBlacklist: [...modBlacklist, entry] });
    setSettings(next);
    setMbName(''); setMbReason('');
    toast.success(`"${entry.name}" added to mod blacklist`);
  };

  const removeFromModBlacklist = async (name: string) => {
    if (!settings) return;
    const next = await savePrivacy(settings, {
      modContentBlacklist: modBlacklist.filter(e => e.name !== name),
    });
    setSettings(next);
  };

  // ── program blacklist actions ───────────────────────────────────────────
  const addToProgramBlacklist = async () => {
    if (!pbName.trim() || !settings) return;
    const entry: BlacklistEntry = { name: pbName.trim(), reason: pbReason.trim() || undefined };
    if (programBlacklist.some(e => e.name.toLowerCase() === entry.name.toLowerCase())) {
      toast.error('Already on the program blacklist'); return;
    }
    const next = await savePrivacy(settings, { programBlacklist: [...programBlacklist, entry] });
    setSettings(next);
    setPbName(''); setPbReason('');
    toast.success(`"${entry.name}" added to program blacklist`);
  };

  const removeFromProgramBlacklist = async (name: string) => {
    if (!settings) return;
    const next = await savePrivacy(settings, {
      programBlacklist: programBlacklist.filter(e => e.name !== name),
    });
    setSettings(next);
  };

  // ── shared styles ───────────────────────────────────────────────────────
  const inputCls = 'w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const addBtnCls = (color: string) =>
    `flex items-center gap-1.5 px-3 py-2 rounded text-sm font-semibold transition-colors ${color}`;

  const EntryList = ({
    entries,
    onRemove,
    emptyMsg,
    accent,
  }: {
    entries: BlacklistEntry[];
    onRemove: (name: string) => void;
    emptyMsg: string;
    accent: string;
  }) => (
    entries.length === 0
      ? <p className="text-xs text-slate-500 italic">{emptyMsg}</p>
      : <ul className="space-y-2">
          {entries.map(e => (
            <li key={e.name} className={`flex items-start justify-between gap-3 p-2.5 bg-slate-900/60 rounded border ${accent}`}>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">{e.name}</div>
                {e.reason && <div className="text-xs text-slate-400 mt-0.5 truncate">{e.reason}</div>}
              </div>
              <button
                onClick={() => onRemove(e.name)}
                className="shrink-0 p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-900/20 transition-colors"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
  );

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 min-h-full bg-[#07100a] text-slate-100">
      <div className="max-w-2xl mx-auto">

        {/* header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Blacklist Manager</h1>
          <p className="text-sm text-slate-400">
            Tell Mossy which mods and programs are known to cause issues with Fallout 4.
            She will warn users about them — but always respect the user's final choice.
            The do-not-touch list tells Mossy to never reference or recommend specific mods at all.
          </p>
        </div>

        {/* tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-800">
          {([
            { id: 'mod-blacklist', label: 'Mod Blacklist', icon: Ban, count: modBlacklist.length },
            { id: 'program-blacklist', label: 'Program Blacklist', icon: Cpu, count: programBlacklist.length },
            { id: 'whitelist', label: 'Do-Not-Touch', icon: Shield, count: whitelist.length },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count > 0 && (
                <span className="text-xs bg-slate-700 text-slate-300 rounded-full px-1.5 py-0.5 leading-none">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── MOD BLACKLIST ─────────────────────────────────────────────── */}
        {tab === 'mod-blacklist' && (
          <div className="space-y-6">
            <div className="flex items-start gap-2 p-3 bg-orange-900/20 border border-orange-700/40 rounded text-sm text-orange-200">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                Mods listed here are known to cause crashes, conflicts, or corruption.
                Mossy will warn users whenever they ask about them and suggest safer alternatives.
                If a user still wants to use one, Mossy will respect that choice.
              </span>
            </div>

            <div className="space-y-3 p-4 bg-[#08120c] border border-slate-800 rounded">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Mod Name <span className="text-rose-400">*</span></label>
                <input
                  className={inputCls}
                  value={mbName}
                  onChange={e => setMbName(e.target.value)}
                  placeholder="e.g. Unofficial Patch NIGHTMARE Edition"
                  onKeyDown={e => e.key === 'Enter' && addToModBlacklist()}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Reason <span className="text-slate-600">(optional — Mossy will cite this)</span></label>
                <input
                  className={inputCls}
                  value={mbReason}
                  onChange={e => setMbReason(e.target.value)}
                  placeholder="e.g. Causes CTD on save, incompatible with Sim Settlements 2"
                  onKeyDown={e => e.key === 'Enter' && addToModBlacklist()}
                />
              </div>
              <button
                className={addBtnCls('bg-orange-800/40 hover:bg-orange-700/50 border border-orange-700/50 text-orange-300')}
                onClick={addToModBlacklist}
                disabled={!mbName.trim()}
              >
                <Plus className="w-4 h-4" /> Add to Mod Blacklist
              </button>
            </div>

            <div className="p-4 bg-[#06100a] border border-slate-800 rounded">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Blacklisted Mods</span>
                <span className="text-xs text-slate-500">{modBlacklist.length} {modBlacklist.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              <EntryList
                entries={modBlacklist}
                onRemove={removeFromModBlacklist}
                emptyMsg="No mods blacklisted yet."
                accent="border-orange-800/50"
              />
            </div>
          </div>
        )}

        {/* ── PROGRAM BLACKLIST ─────────────────────────────────────────── */}
        {tab === 'program-blacklist' && (
          <div className="space-y-6">
            <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/40 rounded text-sm text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>
                Programs listed here are known to be outdated, incompatible, or dangerous to modding workflows.
                Mossy will actively discourage their use and recommend safer alternatives.
                If a user still wants to proceed, Mossy will respect that choice.
              </span>
            </div>

            <div className="space-y-3 p-4 bg-[#08120c] border border-slate-800 rounded">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Program Name <span className="text-rose-400">*</span></label>
                <input
                  className={inputCls}
                  value={pbName}
                  onChange={e => setPbName(e.target.value)}
                  placeholder="e.g. Wrye Bash (outdated version)"
                  onKeyDown={e => e.key === 'Enter' && addToProgramBlacklist()}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Reason <span className="text-slate-600">(optional — Mossy will cite this)</span></label>
                <input
                  className={inputCls}
                  value={pbReason}
                  onChange={e => setPbReason(e.target.value)}
                  placeholder="e.g. Corrupts load order on FO4 1.10.984+"
                  onKeyDown={e => e.key === 'Enter' && addToProgramBlacklist()}
                />
              </div>
              <button
                className={addBtnCls('bg-red-800/40 hover:bg-red-700/50 border border-red-700/50 text-red-300')}
                onClick={addToProgramBlacklist}
                disabled={!pbName.trim()}
              >
                <Plus className="w-4 h-4" /> Add to Program Blacklist
              </button>
            </div>

            <div className="p-4 bg-[#06100a] border border-slate-800 rounded">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Blacklisted Programs</span>
                <span className="text-xs text-slate-500">{programBlacklist.length} {programBlacklist.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              <EntryList
                entries={programBlacklist}
                onRemove={removeFromProgramBlacklist}
                emptyMsg="No programs blacklisted yet."
                accent="border-red-800/50"
              />
            </div>
          </div>
        )}

        {/* ── DO-NOT-TOUCH WHITELIST ────────────────────────────────────── */}
        {tab === 'whitelist' && (
          <div className="space-y-6">
            <div className="flex items-start gap-2 p-3 bg-emerald-900/20 border border-emerald-700/40 rounded text-sm text-emerald-200">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Mods listed here are completely off-limits for Mossy. She will never mention, recommend,
                reference, or interact with them in any way — no matter what the user asks.
              </span>
            </div>

            <div className="space-y-3 p-4 bg-[#08120c] border border-slate-800 rounded">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Mod Name <span className="text-rose-400">*</span></label>
                <input
                  className={inputCls}
                  value={wlName}
                  onChange={e => { setWlName(e.target.value); setWlError(null); }}
                  placeholder="e.g. Sim Settlements 2"
                  onKeyDown={e => e.key === 'Enter' && addToWhitelist()}
                />
                {wlError && <p className="mt-1 text-xs text-rose-400">{wlError}</p>}
              </div>
              <button
                className={addBtnCls('bg-emerald-800/40 hover:bg-emerald-700/50 border border-emerald-700/50 text-emerald-300')}
                onClick={addToWhitelist}
              >
                <Plus className="w-4 h-4" /> Add to Do-Not-Touch List
              </button>
            </div>

            <div className="p-4 bg-[#06100a] border border-slate-800 rounded">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Do-Not-Touch List</span>
                <span className="text-xs text-slate-500">{whitelist.length} {whitelist.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              {whitelist.length === 0
                ? <p className="text-xs text-slate-500 italic">No mods protected yet.</p>
                : (
                  <ul className="space-y-2">
                    {whitelist.map((e) => (
                      <li key={e} className="flex items-center justify-between gap-3 p-2.5 bg-slate-900/60 rounded border border-emerald-800/50">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-200 truncate">{e}</div>
                        </div>
                        <button
                          onClick={() => void removeFromWhitelist(e)}
                          className="shrink-0 p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-900/20 transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              }
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SecurityValidator;
