import { useState } from 'react';
import { Zap, TrendingUp } from 'lucide-react';

export default function PrecombineGenerator() {
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [worldspace, setWorldspace] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const generatePrecombines = async () => {
    setIsGenerating(true);
    try {
      await window.electron.api.precombineGenerator.generate(worldspace);
      setMessage('Precombines generated successfully');
    } catch (error) {
      setMessage('Failed to generate precombines');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-400 flex items-center gap-3">
              <Zap className="w-10 h-10" />
              Precombine/PRP Generator
            </h1>
            <p className="text-slate-400 mt-2">FPS optimization through precombines</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSkillLevel('beginner')} className={`px-4 py-2 rounded ${skillLevel === 'beginner' ? 'bg-green-600' : 'bg-slate-700'} text-white`}>�� Beginner</button>
            <button onClick={() => setSkillLevel('intermediate')} className={`px-4 py-2 rounded ${skillLevel === 'intermediate' ? 'bg-yellow-600' : 'bg-slate-700'} text-white`}>🟡 Intermediate</button>
            <button onClick={() => setSkillLevel('advanced')} className={`px-4 py-2 rounded ${skillLevel === 'advanced' ? 'bg-red-600' : 'bg-slate-700'} text-white`}>🔴 Advanced</button>
          </div>
        </div>

        {message && <div className="mb-4 p-4 bg-blue-900/50 border border-blue-500 rounded text-blue-200">{message}</div>}

        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Generate Precombines</h2>
          <div className="space-y-4">
            <input type="text" value={worldspace} onChange={(e) => setWorldspace(e.target.value)} placeholder="Commonwealth" className="w-full px-4 py-2 bg-slate-700 text-white rounded border border-slate-600" />
            <button onClick={generatePrecombines} disabled={!worldspace || isGenerating} className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-3">
              <TrendingUp className="w-6 h-6" />
              {isGenerating ? 'Generating...' : 'Generate Precombines'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
