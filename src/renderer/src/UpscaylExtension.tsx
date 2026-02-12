import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2, Play, RefreshCw, AlertTriangle, CheckCircle2, Image, Upload, Download, Settings, FolderOpen, Grid3x3 } from 'lucide-react';

interface UpscaleJob {
  id: string;
  fileName: string;
  originalSize: string;
  targetScale: number;
  model: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  progress: number;
  outputPath?: string;
}

interface UpscaleModel {
  id: string;
  name: string;
  type: 'general' | 'anime' | 'photo' | 'face';
  description: string;
}

const UPSCALE_MODELS: UpscaleModel[] = [
  {
    id: 'realesrgan-x4plus',
    name: 'RealESRGAN x4plus',
    type: 'general',
    description: 'Best for general images and textures'
  },
  {
    id: 'realesrgan-anime',
    name: 'RealESRGAN Anime',
    type: 'anime',
    description: 'Optimized for anime and manga art'
  },
  {
    id: 'remacri',
    name: 'Remacri',
    type: 'general',
    description: 'High quality for photos and renders'
  },
  {
    id: 'ultramix-balanced',
    name: 'Ultramix Balanced',
    type: 'general',
    description: 'Balanced quality for all content'
  },
];

export const UpscaylExtension: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(UPSCALE_MODELS[0].id);
  const [selectedScale, setSelectedScale] = useState<2 | 3 | 4>(4);
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [jobs, setJobs] = useState<UpscaleJob[]>([]);
  const [batchMode, setBatchMode] = useState(false);

  // Check if Upscayl is running via Neural Link
  useEffect(() => {
    const checkUpscayl = () => {
      try {
        const activeTools = localStorage.getItem('mossy_active_tools');
        if (activeTools) {
          const data = JSON.parse(activeTools);
          const upscaylRunning = data.tools?.some((t: any) => 
            t.name.toLowerCase().includes('upscayl')
          );
          setIsConnected(upscaylRunning);
        }
      } catch (error) {
        console.error('Error checking Upscayl status:', error);
      }
    };

    checkUpscayl();
    const interval = setInterval(checkUpscayl, 5000);
    return () => clearInterval(interval);
  }, []);

  const startUpscale = () => {
    const mockFiles = batchMode 
      ? ['texture_diffuse.png', 'texture_normal.png', 'texture_specular.png']
      : ['fallout4_screenshot.png'];

    mockFiles.forEach((fileName, index) => {
      setTimeout(() => {
        const job: UpscaleJob = {
          id: `${Date.now()}-${index}`,
          fileName,
          originalSize: '1024x1024',
          targetScale: selectedScale,
          model: selectedModel,
          status: 'queued',
          progress: 0,
        };

        setJobs(prev => [...prev, job]);

        // Simulate processing
        setTimeout(() => {
          setJobs(prev => 
            prev.map(j => j.id === job.id ? { ...j, status: 'processing', progress: 25 } : j)
          );

          setTimeout(() => {
            setJobs(prev => 
              prev.map(j => j.id === job.id ? { ...j, progress: 50 } : j)
            );

            setTimeout(() => {
              setJobs(prev => 
                prev.map(j => j.id === job.id ? { ...j, progress: 75 } : j)
              );

              setTimeout(() => {
                setJobs(prev => 
                  prev.map(j => j.id === job.id ? { 
                    ...j, 
                    status: 'complete', 
                    progress: 100,
                    outputPath: `upscaled_${fileName}`
                  } : j)
                );
              }, 1000);
            }, 1000);
          }, 1000);
        }, 500);
      }, index * 300);
    });
  };

  const queuedCount = jobs.filter(j => j.status === 'queued').length;
  const processingCount = jobs.filter(j => j.status === 'processing').length;
  const completedCount = jobs.filter(j => j.status === 'complete').length;

  const selectedModelInfo = UPSCALE_MODELS.find(m => m.id === selectedModel);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Maximize2 className="w-8 h-8 text-emerald-400" />
                Upscayl Extension
              </h1>
              <p className="text-slate-300 mt-2">
                AI-powered image upscaling for textures and assets
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isConnected 
                  ? 'bg-green-900/30 border border-green-500/30 text-green-300'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'Upscayl Detected' : 'Upscayl Not Running'}
              </div>
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
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
                  <h3 className="text-lg font-bold text-amber-300 mb-2">Upscayl Not Detected</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    Start Upscayl to enable this extension. Neural Link will automatically detect it.
                  </p>
                  <div className="text-xs text-slate-400">
                    <p className="mb-1">Detection looks for: Upscayl.exe, upscayl.exe</p>
                    <p>Supported versions: Upscayl 2.0+</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upscale Configuration */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Grid3x3 className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Upscale Configuration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">AI Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white"
                    >
                      {UPSCALE_MODELS.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.type})
                        </option>
                      ))}
                    </select>
                    {selectedModelInfo && (
                      <p className="text-xs text-slate-400 mt-2">{selectedModelInfo.description}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Scale Factor</label>
                    <div className="flex gap-2">
                      {[2, 3, 4].map(scale => (
                        <button
                          key={scale}
                          onClick={() => setSelectedScale(scale as 2 | 3 | 4)}
                          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                            selectedScale === scale
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-900/50 border border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {scale}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Output Format</label>
                    <div className="flex gap-2">
                      {['png', 'jpg', 'webp'].map(format => (
                        <button
                          key={format}
                          onClick={() => setOutputFormat(format as 'png' | 'jpg' | 'webp')}
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            outputFormat === format
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-900/50 border border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <h4 className="text-sm font-bold text-white mb-3">File Selection</h4>
                    <button className="w-full px-4 py-3 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2 mb-3">
                      <Upload className="w-4 h-4" />
                      Select Images
                    </button>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="batch-mode"
                        checked={batchMode}
                        onChange={(e) => setBatchMode(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="batch-mode" className="text-sm text-slate-300">
                        Batch Mode (Multiple Files)
                      </label>
                    </div>
                    <p className="text-xs text-slate-400">
                      {batchMode ? 'Process multiple images at once' : 'Process single image'}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                    <h4 className="text-sm font-bold text-emerald-300 mb-2">Output Preview</h4>
                    <div className="text-xs text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span>Original:</span>
                        <span className="font-mono">1024 × 1024</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Upscaled:</span>
                        <span className="font-mono text-emerald-400">
                          {1024 * selectedScale} × {1024 * selectedScale}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Format:</span>
                        <span className="font-mono">{outputFormat.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={startUpscale}
                className="w-full mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Upscaling
              </button>
            </div>
          )}

          {/* Processing Queue */}
          {isConnected && jobs.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Processing Queue</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-blue-400">Queued: {queuedCount}</span>
                  <span className="text-yellow-400">Processing: {processingCount}</span>
                  <span className="text-green-400">Complete: {completedCount}</span>
                </div>
              </div>

              <div className="space-y-3">
                {jobs.slice(-10).reverse().map((job) => (
                  <div
                    key={job.id}
                    className={`p-4 rounded-lg border ${
                      job.status === 'complete' ? 'bg-green-900/20 border-green-500/30' :
                      job.status === 'processing' ? 'bg-yellow-900/20 border-yellow-500/30' :
                      job.status === 'error' ? 'bg-red-900/20 border-red-500/30' :
                      'bg-blue-900/20 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Image className="w-5 h-5 text-slate-400" />
                          <div>
                            <div className="text-sm font-medium text-white">{job.fileName}</div>
                            <div className="text-xs text-slate-400">
                              {job.originalSize} → {job.targetScale}x with {job.model}
                            </div>
                          </div>
                        </div>
                        {job.status === 'processing' && (
                          <div className="w-full bg-slate-900/50 rounded-full h-2">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          job.status === 'complete' ? 'bg-green-500/20 text-green-300' :
                          job.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
                          job.status === 'error' ? 'bg-red-500/20 text-red-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {job.status}
                        </span>
                        {job.status === 'processing' && (
                          <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
                        )}
                        {job.status === 'complete' && (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
                  <Upload className="w-4 h-4" />
                  Batch Upload
                </button>
                <button className="px-4 py-3 bg-cyan-900/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Download className="w-4 h-4" />
                  Export All
                </button>
                <button className="px-4 py-3 bg-emerald-900/20 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          )}

          {/* Model Comparison */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Available Models</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {UPSCALE_MODELS.map((model) => (
                  <div
                    key={model.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedModel === model.id
                        ? 'bg-emerald-900/30 border-emerald-500/50'
                        : 'bg-slate-900/50 border-slate-700/50 hover:border-emerald-500/30'
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{model.name}</h4>
                      <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded capitalize">
                        {model.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{model.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-200 mb-2">💡 Upscayl Extension Features</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• AI-powered upscaling (2x, 3x, 4x)</li>
              <li>• Multiple model options for different content types</li>
              <li>• Batch processing for multiple images</li>
              <li>• Format conversion (PNG, JPG, WebP)</li>
              <li>• Real-time progress tracking</li>
              <li>• Perfect for texture enhancement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
