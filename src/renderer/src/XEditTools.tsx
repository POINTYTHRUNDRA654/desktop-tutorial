/**
 * XEditTools - Unified xEdit/FO4Edit interface
 * Combines XEditExtension and XEditScriptExecutor functionality
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Database, Play, RefreshCw, AlertTriangle, CheckCircle2, 
  Code, Zap, FileText, Terminal, Search, Download, Save, 
  CheckCircle, AlertCircle, Loader, Settings 
} from 'lucide-react';

interface XEditScript {
  id: string;
  name: string;
  description: string;
  category: 'Cleaning' | 'Analysis' | 'Utility' | 'Advanced' | 'Batch' | 'Conversion';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  icon: React.ElementType;
  estimatedTime: string;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  duration: number;
}

const XEDIT_SCRIPTS: XEditScript[] = [
  // Cleaning Scripts
  {
    id: 'clean-itm',
    name: 'Clean ITMs (Identical to Master)',
    description: 'Removes records that are identical to masters - essential mod cleaning step',
    category: 'Cleaning',
    difficulty: 'beginner',
    icon: CheckCircle2,
    estimatedTime: '1-5 min'
  },
  {
    id: 'clean-udr',
    name: 'Clean UDRs (Undelete and Disable References)',
    description: 'Fixes deleted references by undeleting and disabling them properly',
    category: 'Cleaning',
    difficulty: 'beginner',
    icon: CheckCircle2,
    estimatedTime: '2-10 min'
  },
  {
    id: 'remove-itms',
    name: 'Remove ITMs',
    description: 'Remove Identical To Master records',
    category: 'Cleaning',
    difficulty: 'beginner',
    icon: CheckCircle2,
    estimatedTime: '1-3 min'
  },
  {
    id: 'undelete-refs',
    name: 'Undelete References',
    description: 'Fix deleted references',
    category: 'Cleaning',
    difficulty: 'beginner',
    icon: CheckCircle2,
    estimatedTime: '2-4 min'
  },
  // Analysis Scripts
  {
    id: 'find-conflicts',
    name: 'Find Conflicts',
    description: 'Scans for record conflicts between plugins',
    category: 'Analysis',
    difficulty: 'intermediate',
    icon: Search,
    estimatedTime: '5-15 min'
  },
  {
    id: 'conflict-analysis',
    name: 'Conflict Analysis',
    description: 'Analyze record conflicts between plugins',
    category: 'Analysis',
    difficulty: 'intermediate',
    icon: Search,
    estimatedTime: '3-10 min'
  },
  {
    id: 'export-cells',
    name: 'Export Cell Data',
    description: 'Export cell information to CSV',
    category: 'Analysis',
    difficulty: 'intermediate',
    icon: Database,
    estimatedTime: '1-2 min'
  },
  // Utility Scripts
  {
    id: 'export-formids',
    name: 'Export FormIDs',
    description: 'Exports all FormIDs to a text file for reference',
    category: 'Utility',
    difficulty: 'intermediate',
    icon: FileText,
    estimatedTime: '1-3 min'
  },
  {
    id: 'batch-rename',
    name: 'Batch Rename Records',
    description: 'Rename multiple records at once',
    category: 'Batch',
    difficulty: 'intermediate',
    icon: FileText,
    estimatedTime: '< 1 min'
  },
  // Conversion Scripts
  {
    id: 'esm-to-esp',
    name: 'Convert ESM to ESP',
    description: 'Convert master file to plugin',
    category: 'Conversion',
    difficulty: 'beginner',
    icon: Code,
    estimatedTime: '< 1 min'
  },
  {
    id: 'esp-to-esm',
    name: 'Convert ESP to ESM',
    description: 'Convert plugin to master file',
    category: 'Conversion',
    difficulty: 'beginner',
    icon: Code,
    estimatedTime: '< 1 min'
  },
  // Advanced Scripts
  {
    id: 'merge-plugins',
    name: 'Merge Plugins',
    description: 'Combines multiple plugins into one (advanced users only)',
    category: 'Advanced',
    difficulty: 'advanced',
    icon: Zap,
    estimatedTime: '10-30 min'
  }
];

export const XEditTools: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'scripts' | 'settings'>('scripts');
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  
  // Script execution state
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [xEditPath, setXEditPath] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState('');
  const [selectedScript, setSelectedScript] = useState<XEditScript | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [message, setMessage] = useState('');
  const [availablePlugins, setAvailablePlugins] = useState<string[]>([]);
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scriptOutput, setScriptOutput] = useState<string[]>([]);

  const api = (window as any).electron?.api || (window as any).electronAPI;

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

  // Load xEdit configuration
  useEffect(() => {
    loadXEditPath();
    loadPluginList();
  }, []);

  const loadXEditPath = async () => {
    try {
      if (api?.xEditScriptExecutor?.getXEditPath) {
        const path = await api.xEditScriptExecutor.getXEditPath();
        if (path) setXEditPath(path);
      }
    } catch (error) {
      console.error('Failed to load xEdit path:', error);
    }
  };

  const loadPluginList = async () => {
    try {
      if (api?.xEditScriptExecutor?.getPluginList) {
        const plugins = await api.xEditScriptExecutor.getPluginList();
        setAvailablePlugins(plugins);
      }
    } catch (error) {
      console.error('Failed to load plugin list:', error);
    }
  };

  const browseForXEdit = async () => {
    try {
      if (api?.xEditScriptExecutor?.browseForXEdit) {
        const path = await api.xEditScriptExecutor.browseForXEdit();
        if (path) {
          setXEditPath(path);
          setMessage('xEdit path updated successfully');
        }
      }
    } catch (error) {
      console.error('Failed to browse for xEdit:', error);
      setMessage('Failed to browse for xEdit');
    }
  };

  const browseForPlugin = async () => {
    try {
      if (api?.xEditScriptExecutor?.browseForPlugin) {
        const plugin = await api.xEditScriptExecutor.browseForPlugin();
        if (plugin) {
          setSelectedPlugin(plugin);
        }
      }
    } catch (error) {
      console.error('Failed to browse for plugin:', error);
    }
  };

  const executeScript = async () => {
    if (!selectedScript) {
      setMessage('Please select a script to execute');
      return;
    }

    if (!selectedPlugin) {
      setMessage('Please select a plugin to process');
      return;
    }

    if (!xEditPath) {
      setMessage('Please configure xEdit path in Settings tab');
      return;
    }

    setIsExecuting(true);
    setProgress(0);
    setProgressText('Initializing...');
    setExecutionResult(null);
    setScriptOutput([]);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      if (api?.xEditScriptExecutor?.executeScript) {
        const result = await api.xEditScriptExecutor.executeScript({
          scriptId: selectedScript.id,
          pluginPath: selectedPlugin,
          xEditPath: xEditPath
        });

        clearInterval(progressInterval);
        setProgress(100);
        setProgressText('Complete');
        setExecutionResult(result);
        setScriptOutput(result.output ? [result.output] : []);
        
        if (result.success) {
          setMessage(`Script executed successfully in ${result.duration}s`);
        } else {
          setMessage(`Script failed: ${result.errors.join(', ')}`);
        }
      } else {
        // Fallback mock execution
        clearInterval(progressInterval);
        setProgress(100);
        setProgressText('Complete');
        
        const mockResult: ExecutionResult = {
          success: true,
          output: `Executed ${selectedScript.name} on ${selectedPlugin}\nProcessing complete.`,
          errors: [],
          warnings: [],
          duration: 2.5
        };
        
        setExecutionResult(mockResult);
        setScriptOutput([mockResult.output]);
        setMessage('Script executed successfully (mock mode)');
      }
    } catch (error: any) {
      console.error('Script execution failed:', error);
      setMessage(`Execution failed: ${error.message || error}`);
      setExecutionResult({
        success: false,
        output: '',
        errors: [error.message || 'Unknown error'],
        warnings: [],
        duration: 0
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(XEDIT_SCRIPTS.map(s => s.category)))];

  const filteredScripts = XEDIT_SCRIPTS.filter(script => {
    const matchesCategory = filterCategory === 'all' || script.category === filterCategory;
    const matchesSearch = !searchQuery || 
      script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill = !script.difficulty || 
      script.difficulty === 'beginner' ||
      (skillLevel === 'intermediate' && script.difficulty !== 'advanced') ||
      skillLevel === 'advanced';
    return matchesCategory && matchesSearch && matchesSkill;
  });

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-green-400 flex items-center gap-2">
                <Database className="w-8 h-8" />
                xEdit Tools
              </h1>
              <p className="text-slate-400 mt-1">
                Execute xEdit/FO4Edit scripts and manage plugins
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                isConnected ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-500'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-slate-500'}`} />
                {isConnected ? 'xEdit Connected' : 'xEdit Not Running'}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('scripts')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                activeTab === 'scripts'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Code className="w-4 h-4 inline mr-2" />
              Scripts
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Message banner */}
          {message && (
            <div className="mb-4 p-4 rounded-lg border bg-blue-900/20 border-blue-700 text-blue-300">
              {message}
            </div>
          )}

          {/* Scripts Tab */}
          {activeTab === 'scripts' && (
            <div className="space-y-6">
              {/* Skill Level Selector */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <label className="block text-sm font-bold text-green-300 mb-2">
                  Skill Level
                </label>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => setSkillLevel(level)}
                      className={`px-4 py-2 rounded text-sm font-bold ${
                        skillLevel === level
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plugin Selection */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <label className="block text-sm font-bold text-green-300 mb-2">
                  Target Plugin
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedPlugin}
                    onChange={(e) => setSelectedPlugin(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300"
                  >
                    <option value="">Select a plugin...</option>
                    {availablePlugins.map(plugin => (
                      <option key={plugin} value={plugin}>{plugin}</option>
                    ))}
                  </select>
                  <button
                    onClick={browseForPlugin}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold"
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search scripts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-sm text-slate-300"
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-sm text-slate-300"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scripts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredScripts.map(script => {
                  const Icon = script.icon;
                  const isSelected = selectedScript?.id === script.id;
                  
                  return (
                    <button
                      key={script.id}
                      onClick={() => setSelectedScript(script)}
                      className={`text-left p-4 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-green-900/30 border-green-600'
                          : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          isSelected ? 'text-green-400' : 'text-slate-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm mb-1">{script.name}</h3>
                          <p className="text-xs text-slate-400 mb-2">{script.description}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300">
                              {script.category}
                            </span>
                            {script.difficulty && (
                              <span className={`px-2 py-0.5 rounded ${
                                script.difficulty === 'beginner' ? 'bg-green-900/30 text-green-400' :
                                script.difficulty === 'intermediate' ? 'bg-yellow-900/30 text-yellow-400' :
                                'bg-red-900/30 text-red-400'
                              }`}>
                                {script.difficulty}
                              </span>
                            )}
                            <span className="text-slate-500">{script.estimatedTime}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Execute Button */}
              {selectedScript && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white">Ready to execute:</h3>
                      <p className="text-sm text-slate-400">{selectedScript.name}</p>
                    </div>
                    <button
                      onClick={executeScript}
                      disabled={isExecuting || !selectedPlugin}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 rounded-lg font-bold flex items-center gap-2"
                    >
                      {isExecuting ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Execute Script
                        </>
                      )}
                    </button>
                  </div>

                  {/* Progress */}
                  {isExecuting && (
                    <div>
                      <div className="text-sm text-slate-300 mb-2">{progressText}</div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Execution Result */}
                  {executionResult && (
                    <div className={`mt-4 p-4 rounded-lg border ${
                      executionResult.success
                        ? 'bg-green-900/20 border-green-700'
                        : 'bg-red-900/20 border-red-700'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {executionResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span className="font-bold">
                          {executionResult.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      
                      {executionResult.output && (
                        <pre className="text-xs bg-black/30 p-3 rounded overflow-x-auto">
                          {executionResult.output}
                        </pre>
                      )}
                      
                      {executionResult.errors.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-bold text-red-400 mb-1">Errors:</div>
                          <ul className="text-xs text-red-300 list-disc list-inside">
                            {executionResult.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {executionResult.warnings.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-bold text-yellow-400 mb-1">Warnings:</div>
                          <ul className="text-xs text-yellow-300 list-disc list-inside">
                            {executionResult.warnings.map((warn, i) => (
                              <li key={i}>{warn}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <label className="block text-sm font-bold text-green-300 mb-2">
                  xEdit/FO4Edit Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={xEditPath}
                    onChange={(e) => setXEditPath(e.target.value)}
                    placeholder="C:\\Program Files\\xEdit\\FO4Edit.exe"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300"
                  />
                  <button
                    onClick={browseForXEdit}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-bold text-sm"
                  >
                    Browse
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Path to your xEdit executable (FO4Edit.exe, SSEEdit.exe, TES5Edit.exe, etc.)
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h3 className="font-bold text-blue-300 mb-2">About xEdit Tools</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  xEdit is a powerful tool for editing Fallout 4 plugins. This interface provides quick access to
                  common cleaning, analysis, and conversion scripts. Make sure to back up your plugins before running
                  any scripts.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <h3 className="font-bold text-white mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <a
                    href="https://www.nexusmods.com/fallout4/mods/2737"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 transition-colors"
                  >
                    <span className="font-bold text-white">Download FO4Edit</span>
                    <span className="block text-xs text-slate-500">Official Nexus Mods page</span>
                  </a>
                  <a
                    href="https://tes5edit.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 transition-colors"
                  >
                    <span className="font-bold text-white">xEdit Documentation</span>
                    <span className="block text-xs text-slate-500">Official documentation and guides</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default XEditTools;
