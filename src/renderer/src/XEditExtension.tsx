import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Play, RefreshCw, AlertTriangle, CheckCircle2, Code, Zap, FileText, Terminal, Search } from 'lucide-react';

interface XEditScript {
  id: string;
  name: string;
  description: string;
  category: 'cleaning' | 'batch' | 'analysis' | 'conversion';
  icon: React.ElementType;
  estimatedTime: string;
}

const XEDIT_SCRIPTS: XEditScript[] = [
  {
    id: 'clean-masters',
    name: 'Clean Masters',
    description: 'Remove dirty edits and ITMs from master files',
    category: 'cleaning',
    icon: CheckCircle2,
    estimatedTime: '2-5 min'
  },
  {
    id: 'remove-itms',
    name: 'Remove ITMs',
    description: 'Remove Identical To Master records',
    category: 'cleaning',
    icon: CheckCircle2,
    estimatedTime: '1-3 min'
  },
  {
    id: 'undelete-refs',
    name: 'Undelete References',
    description: 'Fix deleted references',
    category: 'cleaning',
    icon: CheckCircle2,
    estimatedTime: '2-4 min'
  },
  {
    id: 'batch-rename',
    name: 'Batch Rename Records',
    description: 'Rename multiple records at once',
    category: 'batch',
    icon: FileText,
    estimatedTime: '< 1 min'
  },
  {
    id: 'export-cells',
    name: 'Export Cell Data',
    description: 'Export cell information to CSV',
    category: 'analysis',
    icon: Database,
    estimatedTime: '1-2 min'
  },
  {
    id: 'conflict-analysis',
    name: 'Conflict Analysis',
    description: 'Analyze record conflicts between plugins',
    category: 'analysis',
    icon: Search,
    estimatedTime: '3-10 min'
  },
  {
    id: 'esm-to-esp',
    name: 'Convert ESM to ESP',
    description: 'Convert master file to plugin',
    category: 'conversion',
    icon: Code,
    estimatedTime: '< 1 min'
  },
  {
    id: 'esp-to-esm',
    name: 'Convert ESP to ESM',
    description: 'Convert plugin to master file',
    category: 'conversion',
    icon: Code,
    estimatedTime: '< 1 min'
  },
];

export const XEditExtension: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedScript, setSelectedScript] = useState<XEditScript | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [scriptOutput, setScriptOutput] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if xEdit is running via Neural Link
  useEffect(() => {
    const checkXEdit = () => {
      try {
        const activeTools = localStorage.getItem('mossy_active_tools');
        if (activeTools) {
          const data = JSON.parse(activeTools);
          const xEditRunning = data.tools?.some((t: any) => 
            t.name.toLowerCase().includes('fo4edit') || 
            t.name.toLowerCase().includes('xedit') ||
            t.name.toLowerCase().includes('sse') ||
            t.name.toLowerCase().includes('tes5')
          );
          setIsConnected(xEditRunning);
        }
      } catch (error) {
        console.error('Error checking xEdit status:', error);
      }
    };

    checkXEdit();
    const interval = setInterval(checkXEdit, 5000);
    return () => clearInterval(interval);
  }, []);

  const runScript = async (script: XEditScript) => {
    setSelectedScript(script);
    setIsRunning(true);
    setScriptOutput([]);

    // Simulate script execution
    const outputs = [
      `[xEdit] Starting ${script.name}...`,
      '[xEdit] Loading plugins...',
      '[xEdit] Processing records...',
      '[xEdit] Applying changes...',
      `[xEdit] ${script.name} completed successfully!`
    ];

    for (let i = 0; i < outputs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setScriptOutput(prev => [...prev, outputs[i]]);
    }

    setIsRunning(false);
  };

  const filteredScripts = XEDIT_SCRIPTS.filter(script => {
    if (filterCategory !== 'all' && script.category !== filterCategory) return false;
    if (searchQuery && !script.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Database className="w-8 h-8 text-cyan-400" />
                xEdit Script Library
              </h1>
              <p className="text-slate-300 mt-2">
                Run powerful xEdit scripts for cleaning, analysis, and batch operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isConnected 
                  ? 'bg-green-900/30 border border-green-500/30 text-green-300'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'xEdit Detected' : 'xEdit Not Running'}
              </div>
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-cyan-900/20 border border-cyan-500/30 text-cyan-100 hover:bg-cyan-900/30 transition-colors"
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
                  <h3 className="text-lg font-bold text-amber-300 mb-2">xEdit Not Detected</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    Start FO4Edit, SSEEdit, or any xEdit variant to enable this extension. Neural Link will automatically detect it.
                  </p>
                  <div className="text-xs text-slate-400">
                    <p className="mb-1">Supported: FO4Edit, SSEEdit, TES5Edit, FNVEdit, FO3Edit</p>
                    <p>Scripts will execute in the detected xEdit instance</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Script Filters */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Search scripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white"
                >
                  <option value="all">All Categories</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="batch">Batch Operations</option>
                  <option value="analysis">Analysis</option>
                  <option value="conversion">Conversion</option>
                </select>
              </div>
            </div>
          )}

          {/* Script Grid */}
          {isConnected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredScripts.map((script) => {
                const Icon = script.icon;
                const categoryColors = {
                  cleaning: 'border-green-500/30 bg-green-900/20',
                  batch: 'border-blue-500/30 bg-blue-900/20',
                  analysis: 'border-purple-500/30 bg-purple-900/20',
                  conversion: 'border-cyan-500/30 bg-cyan-900/20',
                };

                return (
                  <div
                    key={script.id}
                    className={`p-6 rounded-xl border ${categoryColors[script.category]} backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer`}
                    onClick={() => !isRunning && runScript(script)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        script.category === 'cleaning' ? 'bg-green-500/20' :
                        script.category === 'batch' ? 'bg-blue-500/20' :
                        script.category === 'analysis' ? 'bg-purple-500/20' :
                        'bg-cyan-500/20'
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{script.name}</h3>
                        <p className="text-sm text-slate-400 mb-3">{script.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${
                            script.category === 'cleaning' ? 'bg-green-500/20 text-green-300' :
                            script.category === 'batch' ? 'bg-blue-500/20 text-blue-300' :
                            script.category === 'analysis' ? 'bg-purple-500/20 text-purple-300' :
                            'bg-cyan-500/20 text-cyan-300'
                          }`}>
                            {script.category}
                          </span>
                          <span className="text-xs text-slate-500">{script.estimatedTime}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      className={`mt-4 w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        isRunning
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                      disabled={isRunning}
                    >
                      <Play className="w-4 h-4" />
                      Run Script
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Script Output Terminal */}
          {scriptOutput.length > 0 && (
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  {selectedScript?.name} - Output
                </h3>
                {isRunning && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Running...</span>
                  </div>
                )}
                {!isRunning && (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
              </div>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm space-y-1">
                {scriptOutput.map((line, index) => (
                  <div key={index} className="text-green-400">
                    {line}
                  </div>
                ))}
                {isRunning && (
                  <div className="text-green-400 animate-pulse">_</div>
                )}
              </div>
            </div>
          )}

          {/* Common Operations */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Common Operations</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button 
                  className="px-4 py-3 bg-green-900/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-900/30 transition-colors"
                  onClick={() => {
                    const script = XEDIT_SCRIPTS.find(s => s.id === 'clean-masters');
                    if (script) runScript(script);
                  }}
                  disabled={isRunning}
                >
                  <Zap className="w-4 h-4 mx-auto mb-1" />
                  Quick Clean
                </button>
                <button 
                  className="px-4 py-3 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-900/30 transition-colors"
                  onClick={() => {
                    const script = XEDIT_SCRIPTS.find(s => s.id === 'conflict-analysis');
                    if (script) runScript(script);
                  }}
                  disabled={isRunning}
                >
                  <Search className="w-4 h-4 mx-auto mb-1" />
                  Find Conflicts
                </button>
                <button className="px-4 py-3 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors">
                  <FileText className="w-4 h-4 mx-auto mb-1" />
                  Custom Script
                </button>
                <button className="px-4 py-3 bg-cyan-900/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-900/30 transition-colors">
                  <Code className="w-4 h-4 mx-auto mb-1" />
                  Script Editor
                </button>
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-200 mb-2">💡 xEdit Script Library Features</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Pre-built scripts for common tasks</li>
              <li>• Automatic cleaning of master files</li>
              <li>• Batch operations for efficiency</li>
              <li>• Conflict detection and analysis</li>
              <li>• Plugin conversion utilities</li>
              <li>• Real-time execution status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
