import { useState } from 'react';
import { GitCompare, ArrowLeftRight } from 'lucide-react';

interface ModComparisonToolProps {
  embedded?: boolean;
}

export default function ModComparisonTool({ embedded = false }: ModComparisonToolProps) {
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [mod1, setMod1] = useState('');
  const [mod2, setMod2] = useState('');
  const [differences, setDifferences] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const compareMods = async () => {
    try {
      const result = await window.electron.api.modComparisonTool.compare(mod1, mod2);
      setDifferences(result.differences);
      setMessage(`Found ${result.differences.length} differences`);
    } catch (error) {
      setMessage('Failed to compare mods');
    }
  };

  return (
    <div className={embedded ? "p-4" : "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8"}>
      <div className="max-w-7xl mx-auto">
        {!embedded && (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-400 flex items-center gap-3">
              <GitCompare className="w-10 h-10" />
              Mod Comparison Tool
            </h1>
            <p className="text-slate-400 mt-2">Side-by-side mod comparison</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSkillLevel('beginner')} className={`px-4 py-2 rounded ${skillLevel === 'beginner' ? 'bg-green-600' : 'bg-slate-700'} text-white`}>🟢 Beginner</button>
            <button onClick={() => setSkillLevel('intermediate')} className={`px-4 py-2 rounded ${skillLevel === 'intermediate' ? 'bg-yellow-600' : 'bg-slate-700'} text-white`}>🟡 Intermediate</button>
            <button onClick={() => setSkillLevel('advanced')} className={`px-4 py-2 rounded ${skillLevel === 'advanced' ? 'bg-red-600' : 'bg-slate-700'} text-white`}>🔴 Advanced</button>
          </div>
        </div>
        )}

        {message && <div className="mb-4 p-4 bg-blue-900/50 border border-blue-500 rounded text-blue-200">{message}</div>}

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Select Mods to Compare</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input type="text" value={mod1} onChange={(e) => setMod1(e.target.value)} placeholder="Mod A" className="px-4 py-2 bg-slate-700 text-white rounded border border-slate-600" />
            <input type="text" value={mod2} onChange={(e) => setMod2(e.target.value)} placeholder="Mod B" className="px-4 py-2 bg-slate-700 text-white rounded border border-slate-600" />
          </div>
          <button onClick={compareMods} disabled={!mod1 || !mod2} className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-3">
            <ArrowLeftRight className="w-6 h-6" />
            Compare Mods
          </button>
        </div>

        {differences.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Differences ({differences.length})</h2>
            <div className="space-y-2">
              {differences.slice(0, 20).map((diff, idx) => (
                <div key={idx} className="p-3 bg-slate-700 rounded">
                  <div className="font-mono text-sm text-slate-300">{diff.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!embedded && (
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-700 rounded text-blue-200 text-sm">
          💡 Tip: Look for patterns in differences to identify compatibility issues early.
        </div>
        )}
      </div>
    </div>
  );
}
