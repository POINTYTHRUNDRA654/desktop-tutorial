import { useState } from 'react';
import { GitBranch, AlertTriangle, CheckCircle, Layers } from 'lucide-react';

interface Conflict {
  recordType: string;
  formId: string;
  winners: string[];
  losers: string[];
  severity: 'low' | 'medium' | 'high';
}

interface ModConflictVisualizerProps {
  embedded?: boolean;
}

export default function ModConflictVisualizer({ embedded = false }: ModConflictVisualizerProps) {
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [loadOrder, setLoadOrder] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState('');

  const scanLoadOrder = async () => {
    setIsAnalyzing(true);
    try {
      const result = await window.electron.api.modConflictVisualizer.scanLoadOrder();
      setLoadOrder(result.plugins);
      setConflicts(result.conflicts);
      setMessage(`Found ${result.conflicts.length} conflicts in ${result.plugins.length} plugins`);
    } catch (error) {
      setMessage('Failed to scan load order');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={embedded ? "p-4" : "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8"}>
      <div className="max-w-7xl mx-auto">
        {!embedded && (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-400 flex items-center gap-3">
              <GitBranch className="w-10 h-10" />
              Mod Conflict Visualizer
            </h1>
            <p className="text-slate-400 mt-2">Interactive conflict resolution</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSkillLevel('beginner')} className={`px-4 py-2 rounded ${skillLevel === 'beginner' ? 'bg-green-600' : 'bg-slate-700'} text-white`}>🟢 Beginner</button>
            <button onClick={() => setSkillLevel('intermediate')} className={`px-4 py-2 rounded ${skillLevel === 'intermediate' ? 'bg-yellow-600' : 'bg-slate-700'} text-white`}>🟡 Intermediate</button>
            <button onClick={() => setSkillLevel('advanced')} className={`px-4 py-2 rounded ${skillLevel === 'advanced' ? 'bg-red-600' : 'bg-slate-700'} text-white`}>🔴 Advanced</button>
          </div>
        </div>

        {message && <div className="mb-4 p-4 bg-blue-900/50 border border-blue-500 rounded text-blue-200">{message}</div>}

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <button onClick={scanLoadOrder} disabled={isAnalyzing} className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50">
            {isAnalyzing ? 'Analyzing...' : 'Scan Load Order for Conflicts'}
          </button>
        </div>

        {conflicts.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-6 h-6" />
              Conflicts Detected ({conflicts.length})
            </h2>
            <div className="space-y-3">
              {conflicts.slice(0, 10).map((conflict, idx) => (
                <div key={idx} className={`p-4 rounded border ${conflict.severity === 'high' ? 'bg-red-900/30 border-red-500' : conflict.severity === 'medium' ? 'bg-yellow-900/30 border-yellow-500' : 'bg-blue-900/30 border-blue-500'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{conflict.recordType} - {conflict.formId}</div>
                      <div className="text-sm text-slate-300 mt-1">Winner: {conflict.winners.join(', ')}</div>
                      <div className="text-sm text-slate-400">Overridden by: {conflict.losers.join(', ')}</div>
                    </div>
                    {conflict.severity === 'high' ? <AlertTriangle className="w-6 h-6 text-red-400" /> : <CheckCircle className="w-6 h-6 text-green-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!embedded && (
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-700 rounded text-blue-200 text-sm">
          💡 Tip: Review conflicts carefully. Not all conflicts are bad - some are intentional overrides.
        </div>
        )}
      </div>
    </div>
  );
}
