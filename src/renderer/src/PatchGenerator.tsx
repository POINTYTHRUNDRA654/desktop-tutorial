import React, { useEffect, useState } from 'react';
import { GitMerge, AlertTriangle, Check, Download, Zap, Info } from 'lucide-react';

interface Conflict {
  record: string;
  type: string;
  modA: { name: string; value: string };
  modB: { name: string; value: string };
  resolution?: 'keep-a' | 'keep-b' | 'merge' | 'average';
}

interface PatchResult {
  conflicts: Conflict[];
  resolved: number;
  unresolved: number;
  patchName: string;
}

export const PatchGenerator: React.FC = () => {
  const [modA, setModA] = useState('');
  const [modB, setModB] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PatchResult | null>(null);

  // Prefill from AI Copilot
  useEffect(() => {
    const prefillRaw = localStorage.getItem('mossy_patch_prefill');
    if (prefillRaw) {
      try {
        const prefill = JSON.parse(prefillRaw) as { recordTypes: string[]; mods: Array<{ name: string; usage: string; risk: string }>; demoConflicts?: any[] };
        if (prefill.mods?.length >= 2) {
          setModA(prefill.mods[0].name.replace(/\s+/g, '') + '.esp');
          setModB(prefill.mods[1].name.replace(/\s+/g, '') + '.esp');
        }
        
        // Use tailored conflicts from Copilot if available
        let demoConflicts: Conflict[] = [];
        if (prefill.demoConflicts && prefill.demoConflicts.length > 0) {
          demoConflicts = prefill.demoConflicts.map((c: any) => ({
            record: c.record,
            type: c.type,
            modA: c.modA,
            modB: c.modB,
            resolution: undefined
          }));
        } else {
          // Build generic conflicts from record types
          if (prefill.recordTypes.includes('WEAP')) {
            demoConflicts.push(
              { record: 'WEAP:0001F669 (10mm Pistol)', type: 'Weapon', modA: { name: modA || 'ModA.esp', value: 'Damage: 28 → 35' }, modB: { name: modB || 'ModB.esp', value: 'Weight: 5.0 → 3.5' } },
              { record: 'WEAP:0001F66A (Pipe Rifle)', type: 'Weapon', modA: { name: modA || 'ModA.esp', value: 'Damage: 20 → 30' }, modB: { name: modB || 'ModB.esp', value: 'Damage: 20 → 25' } },
            );
          }
          if (prefill.recordTypes.includes('ARMO')) {
            demoConflicts.push(
              { record: 'ARMO:000E5881 (Leather Armor)', type: 'Armor', modA: { name: modA || 'ModA.esp', value: 'ArmorRating: 15 → 25' }, modB: { name: modB || 'ModB.esp', value: 'Weight: 6.0 → 4.0' } }
            );
          }
          if (prefill.recordTypes.includes('NPC_')) {
            demoConflicts.push(
              { record: 'NPC_:00013478 (Preston Garvey)', type: 'NPC', modA: { name: modA || 'ModA.esp', value: 'Health: 100 → 150' }, modB: { name: modB || 'ModB.esp', value: 'Level: 10 → 15' } }
            );
          }
          if (prefill.recordTypes.includes('LVLI')) {
            demoConflicts.push(
              { record: 'LVLI:0001F66C (LootGeneral)', type: 'Leveled List', modA: { name: modA || 'ModA.esp', value: 'Added 5 items' }, modB: { name: modB || 'ModB.esp', value: 'Added 3 items' } }
            );
          }
        }
        if (demoConflicts.length) {
          setResult({ patchName: `${(modA || 'ModA').replace('.esp', '')}_${(modB || 'ModB').replace('.esp', '')}_Patch.esp`, conflicts: demoConflicts, resolved: 0, unresolved: demoConflicts.length });
        }
      } catch (e) {
        console.warn('Failed to parse patch prefill');
      } finally {
        localStorage.removeItem('mossy_patch_prefill');
      }
    }
  }, []);

  const analyzeConflicts = async () => {
    if (!modA || !modB) {
      alert('Please specify both mods');
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch('http://localhost:21337/patch/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modA, modB })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      // Demo mode
      generateDemoConflicts();
    } finally {
      setAnalyzing(false);
    }
  };

  const generateDemoConflicts = () => {
    const demoResult: PatchResult = {
      patchName: `${modA.replace('.esp', '')}_${modB.replace('.esp', '')}_Patch.esp`,
      conflicts: [
        {
          record: 'WEAP:0001F669 (10mm Pistol)',
          type: 'Weapon',
          modA: { name: modA, value: 'Damage: 28 → 35' },
          modB: { name: modB, value: 'Weight: 5.0 → 3.5' },
          resolution: 'merge'
        },
        {
          record: 'WEAP:0001F66A (Pipe Rifle)',
          type: 'Weapon',
          modA: { name: modA, value: 'Damage: 20 → 30' },
          modB: { name: modB, value: 'Damage: 20 → 25' },
          resolution: 'average'
        },
        {
          record: 'ARMO:000E5881 (Leather Armor)',
          type: 'Armor',
          modA: { name: modA, value: 'ArmorRating: 15 → 25' },
          modB: { name: modB, value: 'Weight: 6.0 → 4.0' },
          resolution: 'merge'
        },
        {
          record: 'NPC_:00013478 (Preston Garvey)',
          type: 'NPC',
          modA: { name: modA, value: 'Health: 100 → 150' },
          modB: { name: modB, value: 'Level: 10 → 15' },
          resolution: 'merge'
        },
        {
          record: 'LVLI:0001F66C (LootGeneral)',
          type: 'Leveled List',
          modA: { name: modA, value: 'Added 5 items' },
          modB: { name: modB, value: 'Added 3 items' },
          resolution: 'merge'
        }
      ],
      resolved: 0,
      unresolved: 5
    };

    setResult(demoResult);
  };

  const setResolution = (index: number, resolution: Conflict['resolution']) => {
    if (!result) return;

    const updatedConflicts = [...result.conflicts];
    updatedConflicts[index].resolution = resolution;

    const resolved = updatedConflicts.filter(c => c.resolution).length;

    setResult({
      ...result,
      conflicts: updatedConflicts,
      resolved,
      unresolved: updatedConflicts.length - resolved
    });
  };

  const generatePatch = async () => {
    if (!result) return;

    if (result.unresolved > 0) {
      const confirm = window.confirm(`${result.unresolved} conflicts still unresolved. Generate patch anyway?`);
      if (!confirm) return;
    }

    try {
      const response = await fetch('http://localhost:21337/patch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modA,
          modB,
          conflicts: result.conflicts
        })
      });

      if (response.ok) {
        alert(`Patch created: ${result.patchName}`);
      } else {
        throw new Error('Generation failed');
      }
    } catch (error) {
      // Demo download
      const patchContent = `; Compatibility Patch\n; Generated by Mossy AI\n\n${result.conflicts.map((c, i) => 
        `; ${c.record}\n; Resolution: ${c.resolution || 'unresolved'}\n`
      ).join('\n')}`;

      const blob = new Blob([patchContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.patchName;
      a.click();
      URL.revokeObjectURL(url);

      alert(`Patch downloaded: ${result.patchName} (demo mode)`);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <GitMerge className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Compatibility Patch Generator</h1>
            <p className="text-sm text-slate-400">Automatic conflict resolution</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Input */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Select Mods to Merge</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Mod A</label>
                <input
                  type="text"
                  value={modA}
                  onChange={(e) => setModA(e.target.value)}
                  placeholder="WeaponBalance.esp"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Mod B</label>
                <input
                  type="text"
                  value={modB}
                  onChange={(e) => setModB(e.target.value)}
                  placeholder="ArmorOverhaul.esp"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={analyzeConflicts}
              disabled={!modA || !modB || analyzing}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>Analyzing...</>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Analyze Conflicts
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Summary */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Conflict Analysis</h2>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">{result.resolved}</div>
                      <div className="text-xs text-slate-400">Resolved</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-amber-400">{result.unresolved}</div>
                      <div className="text-xs text-slate-400">Unresolved</div>
                    </div>
                  </div>
                </div>

                <div className="h-3 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(result.resolved / result.conflicts.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Conflicts */}
              <div className="space-y-3">
                {result.conflicts.map((conflict, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white mb-1">{conflict.record}</h3>
                        <span className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded">
                          {conflict.type}
                        </span>
                      </div>
                      {conflict.resolution && (
                        <Check className="w-5 h-5 text-green-400" />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                        <div className="text-xs font-bold text-blue-300 mb-1">{conflict.modA.name}</div>
                        <div className="text-sm text-blue-100">{conflict.modA.value}</div>
                      </div>

                      <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
                        <div className="text-xs font-bold text-purple-300 mb-1">{conflict.modB.name}</div>
                        <div className="text-sm text-purple-100">{conflict.modB.value}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setResolution(idx, 'keep-a')}
                        className={`flex-1 px-3 py-2 ${conflict.resolution === 'keep-a' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'} text-white text-sm rounded transition-colors`}
                      >
                        Keep Mod A
                      </button>
                      <button
                        onClick={() => setResolution(idx, 'keep-b')}
                        className={`flex-1 px-3 py-2 ${conflict.resolution === 'keep-b' ? 'bg-purple-600' : 'bg-slate-800 hover:bg-slate-700'} text-white text-sm rounded transition-colors`}
                      >
                        Keep Mod B
                      </button>
                      <button
                        onClick={() => setResolution(idx, 'merge')}
                        className={`flex-1 px-3 py-2 ${conflict.resolution === 'merge' ? 'bg-green-600' : 'bg-slate-800 hover:bg-slate-700'} text-white text-sm rounded transition-colors`}
                      >
                        Merge Both
                      </button>
                      {conflict.type === 'Weapon' && (
                        <button
                          onClick={() => setResolution(idx, 'average')}
                          className={`flex-1 px-3 py-2 ${conflict.resolution === 'average' ? 'bg-amber-600' : 'bg-slate-800 hover:bg-slate-700'} text-white text-sm rounded transition-colors`}
                        >
                          Average
                        </button>
                      )}
                    </div>

                    {conflict.resolution && (
                      <div className="mt-3 bg-green-900/20 border border-green-500/30 rounded p-2">
                        <div className="text-xs text-green-300">
                          <strong>Patch will:</strong>{' '}
                          {conflict.resolution === 'keep-a' && `Use changes from ${conflict.modA.name}`}
                          {conflict.resolution === 'keep-b' && `Use changes from ${conflict.modB.name}`}
                          {conflict.resolution === 'merge' && `Combine both changes into one record`}
                          {conflict.resolution === 'average' && `Calculate average of both values`}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Generate Button */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-300">
                    <p className="mb-2">The patch will be created as: <strong className="text-white">{result.patchName}</strong></p>
                    <p>Load it <strong>after</strong> both original mods in your load order.</p>
                  </div>
                </div>

                <button
                  onClick={generatePatch}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Generate Patch ESP
                </button>
              </div>
            </>
          )}

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4">
            <h3 className="font-bold text-blue-300 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              How It Works
            </h3>
            <div className="space-y-2 text-xs text-blue-200">
              <p><strong>1. Analysis:</strong> Mossy scans both mods and identifies overlapping records</p>
              <p><strong>2. Detection:</strong> Finds conflicts where both mods edit the same thing</p>
              <p><strong>3. Resolution:</strong> You choose how to merge each conflict</p>
              <p><strong>4. Generation:</strong> Creates a patch plugin combining your choices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
