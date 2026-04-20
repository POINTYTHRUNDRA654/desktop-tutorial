import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const LOCAL_WHITELIST_KEY = 'security:whitelist';

interface WhitelistEntry {
  modName: string;
  author: string;
}

function readLocal(key: string, fallback: any) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

const SecurityValidator: React.FC = () => {
  const [modName, setModName] = useState('');
  const [author, setAuthor] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>(() => readLocal(LOCAL_WHITELIST_KEY, []));

  useEffect(() => {
    localStorage.setItem(LOCAL_WHITELIST_KEY, JSON.stringify(whitelist));
  }, [whitelist]);

  const addEntry = () => {
    if (!modName.trim()) { setNameError('Mod name is required'); return; }
    setNameError(null);
    const entry: WhitelistEntry = { modName: modName.trim(), author: author.trim() };
    const alreadyExists = whitelist.some(
      w => w.modName.toLowerCase() === entry.modName.toLowerCase() && w.author.toLowerCase() === entry.author.toLowerCase()
    );
    if (alreadyExists) { toast.error('This mod is already on the whitelist'); return; }
    setWhitelist(s => [entry, ...s]);
    setModName('');
    setAuthor('');
    toast.success(`"${entry.modName}" added to Mossy's do-not-touch list`);
  };

  const removeEntry = (index: number) => {
    setWhitelist(s => s.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 min-h-full bg-[#07100a] text-slate-100">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Whitelist Validator</h1>
        <p className="text-sm text-slate-400 mb-6">
          Add mods to Mossy's do-not-touch list. Mossy will not access or modify any information for whitelisted mods.
        </p>

        <div className="p-4 bg-[#08120c] border border-slate-800 rounded space-y-4">
          <div>
            <label className="text-sm text-slate-300">Mod Name <span className="text-rose-400">*</span></label>
            <input
              className="w-full mt-1 p-2 bg-black/10 border border-slate-800 rounded text-sm"
              value={modName}
              onChange={e => { setModName(e.target.value); setNameError(null); }}
              placeholder="e.g. Sim Settlements 2"
              onKeyDown={e => e.key === 'Enter' && addEntry()}
            />
            {nameError && <p className="mt-1 text-xs text-rose-400">{nameError}</p>}
          </div>

          <div>
            <label className="text-sm text-slate-300">Author</label>
            <input
              className="w-full mt-1 p-2 bg-black/10 border border-slate-800 rounded text-sm"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="e.g. kinggath"
              onKeyDown={e => e.key === 'Enter' && addEntry()}
            />
          </div>

          <button
            className="px-4 py-2 bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-700/50 rounded text-sm text-emerald-300 transition-colors"
            onClick={addEntry}
          >
            Add to Whitelist
          </button>
        </div>

        <div className="mt-6 p-4 bg-[#06100a] border border-slate-800 rounded">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Mossy's Do-Not-Touch List</div>
            <div className="text-xs text-slate-500">{whitelist.length} {whitelist.length === 1 ? 'entry' : 'entries'}</div>
          </div>

          {whitelist.length === 0 ? (
            <div className="text-xs text-slate-500">No whitelisted mods yet. Add one above.</div>
          ) : (
            <div className="space-y-2">
              {whitelist.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-black/20 rounded border border-slate-800/60">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{entry.modName}</div>
                    {entry.author && <div className="text-xs text-slate-500 truncate">by {entry.author}</div>}
                  </div>
                  <button
                    className="ml-4 px-2 py-1 bg-rose-700/10 hover:bg-rose-700/30 rounded text-xs text-rose-400 transition-colors shrink-0"
                    onClick={() => removeEntry(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityValidator;
