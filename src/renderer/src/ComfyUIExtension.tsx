import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Network, Play, RefreshCw, AlertTriangle, CheckCircle2, Image, Zap, Grid3x3, Sparkles, FolderOpen, Download, Settings } from 'lucide-react';

interface ComfyWorkflow {
  id: string;
  name: string;
  description: string;
  category: 'txt2img' | 'img2img' | 'upscale' | 'controlnet';
  icon: React.ElementType;
  nodes: number;
}

interface GenerationJob {
  id: string;
  prompt: string;
  status: 'queued' | 'generating' | 'complete' | 'error';
  progress: number;
  imageUrl?: string;
  startTime?: Date;
}

const WORKFLOWS: ComfyWorkflow[] = [
  {
    id: 'txt2img-basic',
    name: 'Text to Image (Basic)',
    description: 'Simple text-to-image generation',
    category: 'txt2img',
    icon: Sparkles,
    nodes: 5
  },
  {
    id: 'txt2img-advanced',
    name: 'Text to Image (Advanced)',
    description: 'Advanced workflow with LoRA and refinement',
    category: 'txt2img',
    icon: Sparkles,
    nodes: 12
  },
  {
    id: 'img2img-basic',
    name: 'Image to Image',
    description: 'Transform existing images',
    category: 'img2img',
    icon: Image,
    nodes: 7
  },
  {
    id: 'upscale-4x',
    name: '4x Upscale',
    description: 'Upscale images 4x with AI',
    category: 'upscale',
    icon: Grid3x3,
    nodes: 4
  },
  {
    id: 'controlnet-pose',
    name: 'ControlNet Pose',
    description: 'Generate from pose reference',
    category: 'controlnet',
    icon: Network,
    nodes: 10
  },
];

export const ComfyUIExtension: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ComfyWorkflow | null>(null);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [queue, setQueue] = useState<GenerationJob[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [availableModels, setAvailableModels] = useState<string[]>([
    'sd_xl_base_1.0.safetensors',
    'sd_xl_refiner_1.0.safetensors',
    'v1-5-pruned.ckpt',
    'anything-v5-PrtRE.safetensors',
  ]);
  const [selectedModel, setSelectedModel] = useState(availableModels[0]);

  // Check if ComfyUI is running via Neural Link
  useEffect(() => {
    const checkComfyUI = () => {
      try {
        const activeTools = localStorage.getItem('mossy_active_tools');
        if (activeTools) {
          const data = JSON.parse(activeTools);
          const comfyRunning = data.tools?.some((t: any) => 
            t.name.toLowerCase().includes('comfyui') || 
            t.name.toLowerCase().includes('comfy')
          );
          setIsConnected(comfyRunning);
        }
      } catch (error) {
        console.error('Error checking ComfyUI status:', error);
      }
    };

    checkComfyUI();
    const interval = setInterval(checkComfyUI, 5000);
    return () => clearInterval(interval);
  }, []);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    const job: GenerationJob = {
      id: Date.now().toString(),
      prompt,
      status: 'queued',
      progress: 0,
      startTime: new Date(),
    };

    setQueue(prev => [...prev, job]);

    // Simulate generation
    setTimeout(() => {
      setQueue(prev => 
        prev.map(j => j.id === job.id ? { ...j, status: 'generating', progress: 25 } : j)
      );

      setTimeout(() => {
        setQueue(prev => 
          prev.map(j => j.id === job.id ? { ...j, progress: 50 } : j)
        );

        setTimeout(() => {
          setQueue(prev => 
            prev.map(j => j.id === job.id ? { ...j, progress: 75 } : j)
          );

          setTimeout(() => {
            setQueue(prev => 
              prev.map(j => j.id === job.id ? { 
                ...j, 
                status: 'complete', 
                progress: 100,
                imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzFhMWExYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzhhOGE4YSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+R2VuZXJhdGVkIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
              } : j)
            );
          }, 1000);
        }, 1000);
      }, 1000);
    }, 500);

    // Clear prompt after queuing
    setPrompt('');
  };

  const filteredWorkflows = WORKFLOWS.filter(w => 
    filterCategory === 'all' || w.category === filterCategory
  );

  const queuedCount = queue.filter(j => j.status === 'queued').length;
  const generatingCount = queue.filter(j => j.status === 'generating').length;
  const completedCount = queue.filter(j => j.status === 'complete').length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Network className="w-8 h-8 text-pink-400" />
                ComfyUI Extension
              </h1>
              <p className="text-slate-300 mt-2">
                Node-based AI image generation with powerful workflows
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isConnected 
                  ? 'bg-green-900/30 border border-green-500/30 text-green-300'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'ComfyUI Detected' : 'ComfyUI Not Running'}
              </div>
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-pink-900/20 border border-pink-500/30 text-pink-100 hover:bg-pink-900/30 transition-colors"
              >
                Help
              </Link>
            </div>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-300 mb-2">ComfyUI Not Detected</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    Start ComfyUI to enable this extension. Neural Link will automatically detect it.
                  </p>
                  <div className="text-xs text-slate-400">
                    <p className="mb-1">Detection looks for: ComfyUI.exe, comfyui.exe, python.exe with ComfyUI</p>
                    <p>Default port: http://127.0.0.1:8188</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Generate */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-pink-400" />
                <h3 className="text-lg font-bold text-white">Quick Generate</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white"
                  >
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white min-h-[100px] resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Negative Prompt</label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to avoid in the image..."
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white min-h-[60px] resize-none"
                  />
                </div>

                <button
                  onClick={generateImage}
                  disabled={!prompt.trim()}
                  className="w-full px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5" />
                  Generate Image
                </button>
              </div>
            </div>
          )}

          {/* Queue Status */}
          {isConnected && queue.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Generation Queue</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-blue-400">Queued: {queuedCount}</span>
                  <span className="text-yellow-400">Generating: {generatingCount}</span>
                  <span className="text-green-400">Complete: {completedCount}</span>
                </div>
              </div>

              <div className="space-y-3">
                {queue.slice(-5).reverse().map((job) => (
                  <div
                    key={job.id}
                    className={`p-4 rounded-lg border ${
                      job.status === 'complete' ? 'bg-green-900/20 border-green-500/30' :
                      job.status === 'generating' ? 'bg-yellow-900/20 border-yellow-500/30' :
                      job.status === 'error' ? 'bg-red-900/20 border-red-500/30' :
                      'bg-blue-900/20 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {job.imageUrl && (
                        <img 
                          src={job.imageUrl} 
                          alt="Generated"
                          className="w-20 h-20 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-sm text-white font-medium mb-1">{job.prompt}</div>
                        {job.status === 'generating' && (
                          <div className="w-full bg-slate-900/50 rounded-full h-2 mb-2">
                            <div 
                              className="bg-pink-500 h-2 rounded-full transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            job.status === 'complete' ? 'bg-green-500/20 text-green-300' :
                            job.status === 'generating' ? 'bg-yellow-500/20 text-yellow-300' :
                            job.status === 'error' ? 'bg-red-500/20 text-red-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {job.status}
                          </span>
                          {job.status === 'generating' && (
                            <span className="text-xs text-slate-400">{job.progress}%</span>
                          )}
                        </div>
                      </div>
                      {job.status === 'complete' && (
                        <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors">
                          <Download className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflow Library */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Workflow Library</h3>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
                >
                  <option value="all">All Workflows</option>
                  <option value="txt2img">Text to Image</option>
                  <option value="img2img">Image to Image</option>
                  <option value="upscale">Upscale</option>
                  <option value="controlnet">ControlNet</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWorkflows.map((workflow) => {
                  const Icon = workflow.icon;
                  return (
                    <div
                      key={workflow.id}
                      className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-pink-500/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedWorkflow(workflow)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-pink-500/20 rounded">
                          <Icon className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1">{workflow.name}</h4>
                          <p className="text-xs text-slate-400 mb-2">{workflow.description}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                              {workflow.nodes} nodes
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded capitalize">
                              {workflow.category.replace('2', ' to ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button className="px-4 py-3 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-900/30 transition-colors flex items-center gap-2 justify-center">
                  <FolderOpen className="w-4 h-4" />
                  Open Output
                </button>
                <button className="px-4 py-3 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors flex items-center gap-2 justify-center">
                  <RefreshCw className="w-4 h-4" />
                  Refresh Models
                </button>
                <button className="px-4 py-3 bg-cyan-900/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Download className="w-4 h-4" />
                  Batch Export
                </button>
                <button className="px-4 py-3 bg-pink-900/20 border border-pink-500/30 text-pink-300 rounded-lg hover:bg-pink-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-200 mb-2">💡 ComfyUI Extension Features</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Quick generation with prompt interface</li>
              <li>• Pre-built workflow library</li>
              <li>• Real-time queue monitoring</li>
              <li>• Model selection and management</li>
              <li>• Batch image generation</li>
              <li>• Output gallery with downloads</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
