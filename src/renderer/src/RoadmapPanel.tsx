import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Plus, 
  Zap, 
  Target,
  Wrench,
  Cpu,
  Palette,
  FileCode,
  Box
} from 'lucide-react';

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  tool?: string;
  order: number;
}

interface Roadmap {
  id: string;
  title: string;
  goal: string;
  steps: RoadmapStep[];
  currentStepId?: string;
}

const RoadmapPanel: React.FC = () => {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    loadRoadmaps();
  }, []);

  const loadRoadmaps = async () => {
    try {
      setLoading(true);
      // @ts-expect-error: Dynamic IPC invoke for roadmap
      const result = await window.electron.api.invoke('roadmap-get-all');
      setRoadmaps(result || []);
      if (result && result.length > 0) {
        setActiveRoadmap(result[0]);
      }
    } catch (error) {
      console.error('Failed to load roadmaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!newGoal.trim()) return;
    
    try {
      setGenerating(true);
      // @ts-expect-error: Dynamic IPC invoke for roadmap AI
      const result = await window.electron.api.invoke('roadmap-generate-ai', { 
        prompt: newGoal,
        projectId: 'default' // For demo
      });
      
      if (result.ok) {
        setRoadmaps([result.roadmap, ...roadmaps]);
        setActiveRoadmap(result.roadmap);
        setNewGoal('');
      }
    } catch (error) {
      console.error('AI Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  const updateStepStatus = async (roadmapId: string, stepId: string, status: string) => {
    try {
      // @ts-expect-error: Dynamic IPC invoke for roadmap step update
      const result = await window.electron.api.invoke('roadmap-update-step', { 
        roadmapId, 
        stepId, 
        status 
      });
      
      if (result.ok) {
        // Optimistic update
        if (activeRoadmap && activeRoadmap.id === roadmapId) {
          const updatedSteps = activeRoadmap.steps.map(s => 
            s.id === stepId ? { ...s, status: status as any } : s
          );
          setActiveRoadmap({ ...activeRoadmap, steps: updatedSteps });
        }
      }
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'in-progress': return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
      case 'blocked': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Circle className="w-5 h-5 text-slate-500" />;
    }
  };

  const getToolIcon = (tool?: string) => {
    switch (tool) {
      case 'blender': return <Box className="w-4 h-4 text-orange-400" />;
      case 'image-suite': return <Palette className="w-4 h-4 text-pink-400" />;
      case 'ck': return <Zap className="w-4 h-4 text-purple-400" />;
      case 'scribe': return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'nifskope': return <Wrench className="w-4 h-4 text-cyan-400" />;
      default: return <Cpu className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Modding Roadmaps</h1>
              <p className="text-sm text-slate-400">Step-by-step guidance from Mossy</p>
            </div>
          </div>
          <button 
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-sm transition-colors border border-slate-700"
            onClick={() => setActiveRoadmap(null)}
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>

        {/* AI Input */}
        {!activeRoadmap && (
          <div className="relative">
            <input 
              type="text"
              placeholder="What do you want to create? (e.g., 'A custom plasma rifle')"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-200"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}
            />
            <button 
              className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
              onClick={handleGenerateAI}
              disabled={generating}
            >
              {generating ? <Clock className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeRoadmap ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold uppercase tracking-wider mb-1">
                <span>Active Objective</span>
              </div>
              <h2 className="text-2xl font-bold text-white capitalize">{activeRoadmap.title}</h2>
              <p className="text-slate-400 mt-2">"{activeRoadmap.goal}"</p>
            </div>

            <div className="space-y-4 relative">
              {/* Vertical Guide Line */}
              <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-800" />

              {activeRoadmap.steps.sort((a,b) => a.order - b.order).map((step, idx) => (
                <div 
                  key={step.id} 
                  className={`relative flex gap-6 p-4 rounded-xl border transition-all ${
                    step.status === 'in-progress' 
                      ? 'bg-blue-500/5 border-blue-500/30' 
                      : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="relative z-10 p-1 flex items-start mt-1">
                    <button 
                      onClick={() => updateStepStatus(activeRoadmap.id, step.id, step.status === 'completed' ? 'not-started' : 'completed')}
                      className="hover:scale-110 transition-transform"
                    >
                      {getStatusIcon(step.status)}
                    </button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold ${step.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                        {step.title}
                      </h3>
                      <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-400 uppercase">
                        {step.tool && getToolIcon(step.tool)}
                        {step.tool || 'General'}
                      </div>
                    </div>
                    <p className={`text-sm ${step.status === 'completed' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              className="mt-12 w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors flex items-center justify-center gap-2"
              onClick={() => setActiveRoadmap(null)}
            >
              Back to Roadmap List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roadmaps.map(rm => (
              <div 
                key={rm.id} 
                className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl hover:border-blue-500/50 cursor-pointer transition-all group"
                onClick={() => setActiveRoadmap(rm)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-slate-800 group-hover:bg-blue-500/20 rounded-lg transition-colors">
                    <Target className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400" />
                </div>
                <h3 className="font-bold text-lg mb-1 capitalize truncate">{rm.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4">{rm.goal}</p>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${(rm.steps.filter(s => s.status === 'completed').length / rm.steps.length) * 100}%` }} 
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {rm.steps.filter(s => s.status === 'completed').length}/{rm.steps.length}
                  </span>
                </div>
              </div>
            ))}
            
            {roadmaps.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No roadmaps yet. Create your first modding goal above!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoadmapPanel;