import { useState } from 'react';
import { Hash, RefreshCw } from 'lucide-react';

export default function FormIdRemapper() {
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [pluginPath, setPluginPath] = useState('');
  const [conflictCount, setConflictCount] = useState(0);
  const [message, setMessage] = useState('');

  const scanForConflicts = async () => {
    try {
      const result = await window.electron.api.formIdRemapper.scanConflicts(pluginPath);
      setConflictCount(result.count);
      setMessage(`Found ${result.count} FormID conflicts`);
    } catch (error) {
      setMessage('Failed to scan for conflicts');
    }
  };

  const remapFormIds = async () => {
    try {
      await window.electron.api.formIdRemapper.remapFormIds(pluginPath);
      setMessage('FormIDs remapped successfully');
    } catch (error) {
      setMessage('Failed to remap FormIDs');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-400 flex items-center gap-3">
              <Hash className="w-10 h-10" />
              FormID Remapper
            </h1>
            <p className="text-slate-400 mt-2">Batch FormID conflict resolution</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSkillLevel('beginner')} className={`px-4 py-2 rounded ${skillLevel === 'beginner' ? 'bg-green-600' : 'bg-slate-700'} text-white`}>🟢 Beginner</button>
            <button onClick={() => setSkillLevel('intermediate')} className={`px-4 py-2 rounded ${skillLevel === 'intermediate' ? 'bg-yellow-600' : 'bg-slate-700'} text-white`}>🟡 Intermediate</button>
            <button onClick={() => setSkillLevel('advanced')} className={`px-4 py-2 rounded ${skillLevel === 'advanced' ? 'bg-red-600' : 'bg-slate-700'} text-white`}>🔴 Advanced</button>
          </div>
        </div>

        {message && <div className="mb-4 p-4 bg-blue-900/50 border border-blue-500 rounded text-blue-200">{message}</div>}

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Plugin Selection</h2>
          <div className="flex gap-4 mb-4">
            <input type="text" value={pluginPath} onChange={(e) => setPluginPath(e.target.value)} placeholder="MyMod.esp" className="flex-1 px-4 py-2 bg-slate-700 text-white rounded border border-slate-600" />
            <button onClick={scanForConflicts} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Scan</button>
          </div>
          {conflictCount > 0 && (
            <div className="mt-4">
              <div className="p-4 bg-yellow-900/30 border border-yellow-500 rounded mb-4">
                <p className="text-yellow-200">Found {conflictCount} FormID conflicts that need remapping</p>
              </div>
              <button onClick={remapFormIds} className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6" />
                Remap All Conflicts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
