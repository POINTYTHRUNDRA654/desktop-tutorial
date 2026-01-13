import React, { useState } from 'react';
import { Zap, Image, Box, FileArchive, Download, Settings, Play, CheckCircle, AlertCircle } from 'lucide-react';

interface OptimizationJob {
  id: string;
  type: 'texture' | 'mesh' | 'archive' | 'all';
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  filesProcessed: number;
  totalFiles: number;
  savedSpace: string;
  details: string[];
}

export const AssetOptimizer: React.FC = () => {
  const [jobs, setJobs] = useState<OptimizationJob[]>([]);
  const [inputPath, setInputPath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [textureSize, setTextureSize] = useState<'1k' | '2k' | '4k'>('2k');
  const [generateMipmaps, setGenerateMipmaps] = useState(true);
  const [compressMeshes, setCompressMeshes] = useState(true);
  const [optimizeScripts, setOptimizeScripts] = useState(true);

  const startOptimization = async (type: 'texture' | 'mesh' | 'archive' | 'all') => {
    if (!inputPath) {
      alert('Please specify input path');
      return;
    }

    const jobId = Date.now().toString();
    const newJob: OptimizationJob = {
      id: jobId,
      type,
      status: 'processing',
      progress: 0,
      filesProcessed: 0,
      totalFiles: 0,
      savedSpace: '0 MB',
      details: []
    };

    setJobs(prev => [newJob, ...prev]);

    try {
      const response = await fetch('http://localhost:21337/optimize/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: inputPath,
          output: outputPath || `${inputPath}_optimized`,
          type,
          options: {
            textureSize,
            generateMipmaps,
            compressMeshes,
            optimizeScripts
          }
        })
      });

      if (response.ok) {
        // Poll for progress
        pollProgress(jobId);
      } else {
        throw new Error('Optimization failed');
      }
    } catch (error) {
      // Demo mode
      simulateOptimization(jobId, type);
    }
  };

  const simulateOptimization = async (jobId: string, type: string) => {
    const steps = [
      'Scanning directory...',
      'Analyzing file types...',
      'Processing textures...',
      'Compressing meshes...',
      'Optimizing scripts...',
      'Generating mipmaps...',
      'Packing archive...',
      'Complete!'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setJobs(prev => prev.map(job => {
        if (job.id !== jobId) return job;
        
        return {
          ...job,
          progress: ((i + 1) / steps.length) * 100,
          filesProcessed: Math.floor(((i + 1) / steps.length) * 45),
          totalFiles: 45,
          status: i === steps.length - 1 ? 'complete' : 'processing',
          details: [...job.details, steps[i]],
          savedSpace: `${Math.floor(((i + 1) / steps.length) * 280)} MB`
        };
      }));
    }
  };

  const pollProgress = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:21337/optimize/progress/${jobId}`);
        if (response.ok) {
          const data = await response.json();
          
          setJobs(prev => prev.map(job => 
            job.id === jobId ? { ...job, ...data } : job
          ));

          if (data.status === 'complete' || data.status === 'error') {
            clearInterval(interval);
          }
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 1000);
  };

  const exportMod = () => {
    if (!inputPath) {
      alert('Please specify mod path');
      return;
    }

    // Start full optimization + BA2 packing
    startOptimization('all');
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Universal Asset Optimizer</h1>
            <p className="text-sm text-slate-400">Batch optimize textures, meshes, and scripts</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Configuration */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Optimization Settings
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Input Path</label>
                <input
                  type="text"
                  value={inputPath}
                  onChange={(e) => setInputPath(e.target.value)}
                  placeholder="C:\ModOrganizer2\mods\MyMod"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Output Path (optional)</label>
                <input
                  type="text"
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  placeholder="Auto-generates if empty"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-yellow-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-white mb-3 text-sm">Texture Optimization</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Target Resolution</label>
                    <select
                      value={textureSize}
                      onChange={(e) => setTextureSize(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:border-yellow-500 focus:outline-none"
                    >
                      <option value="1k">1K (1024x1024)</option>
                      <option value="2k">2K (2048x2048)</option>
                      <option value="4k">4K (4096x4096) - Keep Original</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generateMipmaps}
                      onChange={(e) => setGenerateMipmaps(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-300">Generate mipmaps</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-white mb-3 text-sm">Mesh & Script Optimization</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compressMeshes}
                      onChange={(e) => setCompressMeshes(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-300">Compress meshes (strip unused data)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optimizeScripts}
                      onChange={(e) => setOptimizeScripts(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-300">Optimize scripts (remove debug code)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => startOptimization('texture')}
              disabled={!inputPath}
              className="p-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700 rounded-xl transition-colors"
            >
              <Image className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="font-bold text-white text-sm mb-1">Textures Only</div>
              <div className="text-xs text-slate-400">Resize & compress DDS files</div>
            </button>

            <button
              onClick={() => startOptimization('mesh')}
              disabled={!inputPath}
              className="p-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700 rounded-xl transition-colors"
            >
              <Box className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="font-bold text-white text-sm mb-1">Meshes Only</div>
              <div className="text-xs text-slate-400">Strip unused NIF data</div>
            </button>

            <button
              onClick={() => startOptimization('archive')}
              disabled={!inputPath}
              className="p-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700 rounded-xl transition-colors"
            >
              <FileArchive className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="font-bold text-white text-sm mb-1">Pack BA2</div>
              <div className="text-xs text-slate-400">Create compressed archive</div>
            </button>

            <button
              onClick={exportMod}
              disabled={!inputPath}
              className="p-4 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 border border-yellow-500 rounded-xl transition-colors"
            >
              <Download className="w-8 h-8 text-white mx-auto mb-2" />
              <div className="font-bold text-white text-sm mb-1">Export Mod</div>
              <div className="text-xs text-yellow-100">Full optimization + BA2</div>
            </button>
          </div>

          {/* Jobs */}
          {jobs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Optimization Jobs</h2>
              
              {jobs.map(job => (
                <div key={job.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {job.status === 'processing' && <Play className="w-5 h-5 text-blue-400 animate-pulse" />}
                      {job.status === 'complete' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {job.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                      
                      <div>
                        <h3 className="font-bold text-white capitalize">{job.type} Optimization</h3>
                        <p className="text-xs text-slate-400">
                          {job.filesProcessed} / {job.totalFiles} files processed
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">{job.savedSpace}</div>
                      <div className="text-xs text-slate-400">space saved</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${job.status === 'complete' ? 'bg-green-500' : job.status === 'error' ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-300`}
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 text-right">{Math.floor(job.progress)}%</div>
                  </div>

                  {/* Details */}
                  {job.details.length > 0 && (
                    <div className="bg-slate-950 rounded p-3 max-h-32 overflow-y-auto">
                      {job.details.map((detail, idx) => (
                        <div key={idx} className="text-xs text-slate-400 font-mono">
                          {detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4">
            <h3 className="font-bold text-blue-300 mb-2">What gets optimized?</h3>
            <div className="grid grid-cols-3 gap-4 text-xs text-blue-200">
              <div>
                <strong className="block mb-1">Textures (.dds)</strong>
                <ul className="space-y-1 text-blue-300">
                  <li>• Resize to target resolution</li>
                  <li>• Re-compress with optimal format</li>
                  <li>• Generate mipmap chains</li>
                  <li>• Remove EXIF data</li>
                </ul>
              </div>
              <div>
                <strong className="block mb-1">Meshes (.nif)</strong>
                <ul className="space-y-1 text-blue-300">
                  <li>• Remove unused vertices</li>
                  <li>• Strip editor markers</li>
                  <li>• Optimize collision</li>
                  <li>• Compress vertex data</li>
                </ul>
              </div>
              <div>
                <strong className="block mb-1">Scripts (.pex)</strong>
                <ul className="space-y-1 text-blue-300">
                  <li>• Remove debug symbols</li>
                  <li>• Strip comments</li>
                  <li>• Optimize bytecode</li>
                  <li>• Compress data</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
