import { useState, useEffect } from 'react';
import { Code, Play, Download, Save, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface Script {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  duration: number;
}

const BUILTIN_SCRIPTS: Script[] = [
  {
    id: 'clean-itm',
    name: 'Clean ITMs (Identical to Master)',
    description: 'Removes records that are identical to masters - essential mod cleaning step',
    category: 'Cleaning',
    difficulty: 'beginner',
    estimatedTime: '1-5 min'
  },
  {
    id: 'clean-udr',
    name: 'Clean UDRs (Undelete and Disable References)',
    description: 'Fixes deleted references by undeleting and disabling them properly',
    category: 'Cleaning',
    difficulty: 'beginner',
    estimatedTime: '2-10 min'
  },
  {
    id: 'find-conflicts',
    name: 'Find Conflicts',
    description: 'Scans for record conflicts between plugins',
    category: 'Analysis',
    difficulty: 'intermediate',
    estimatedTime: '5-15 min'
  },
  {
    id: 'export-formids',
    name: 'Export FormIDs',
    description: 'Exports all FormIDs to a text file for reference',
    category: 'Utility',
    difficulty: 'intermediate',
    estimatedTime: '1-3 min'
  },
  {
    id: 'merge-plugins',
    name: 'Merge Plugins',
    description: 'Combines multiple plugins into one (advanced users only)',
    category: 'Advanced',
    difficulty: 'advanced',
    estimatedTime: '10-30 min'
  }
];

export default function XEditScriptExecutor() {
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [xEditPath, setXEditPath] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState('');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [message, setMessage] = useState('');
  const [availablePlugins, setAvailablePlugins] = useState<string[]>([]);

  useEffect(() => {
    loadXEditPath();
    loadPluginList();
  }, []);

  const loadXEditPath = async () => {
    try {
      const path = await window.electron.api.xEditScriptExecutor.getXEditPath();
      if (path) setXEditPath(path);
    } catch (error) {
      console.error('Failed to load xEdit path:', error);
    }
  };

  const loadPluginList = async () => {
    try {
      const plugins = await window.electron.api.xEditScriptExecutor.getPluginList();
      setAvailablePlugins(plugins);
    } catch (error) {
      console.error('Failed to load plugin list:', error);
    }
  };

  const browseForXEdit = async () => {
    try {
      const result = await window.electron.api.xEditScriptExecutor.browseXEdit();
      if (result) {
        setXEditPath(result);
        await window.electron.api.xEditScriptExecutor.saveXEditPath(result);
      }
    } catch (error) {
      setMessage('Failed to browse for xEdit');
    }
  };

  const browseForPlugin = async () => {
    try {
      const result = await window.electron.api.xEditScriptExecutor.browsePlugin();
      if (result) {
        setSelectedPlugin(result);
      }
    } catch (error) {
      setMessage('Failed to browse for plugin');
    }
  };

  const executeScript = async () => {
    if (!xEditPath || !selectedPlugin || !selectedScript) {
      setMessage('Please select xEdit path, plugin, and script');
      return;
    }

    setIsExecuting(true);
    setProgress(0);
    setProgressText('Initializing...');
    setExecutionResult(null);

    try {
      // Listen for progress updates
      window.electron.api.xEditScriptExecutor.onProgress((data: { progress: number; text: string }) => {
        setProgress(data.progress);
        setProgressText(data.text);
      });

      const result = await window.electron.api.xEditScriptExecutor.executeScript(
        xEditPath,
        selectedPlugin,
        selectedScript.id
      );

      setExecutionResult(result);
      setMessage(result.success ? 'Script executed successfully!' : 'Script execution failed');
    } catch (error) {
      setMessage('Failed to execute script');
      setExecutionResult({
        success: false,
        output: '',
        errors: ['Script execution failed: ' + error],
        warnings: [],
        duration: 0
      });
    } finally {
      setIsExecuting(false);
      setProgress(100);
    }
  };

  const filteredScripts = BUILTIN_SCRIPTS.filter(script => {
    if (skillLevel === 'beginner') return script.difficulty === 'beginner';
    if (skillLevel === 'intermediate') return script.difficulty !== 'advanced';
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-400 flex items-center gap-3">
              <Code className="w-10 h-10" />
              xEdit Script Executor
            </h1>
            <p className="text-slate-400 mt-2">Automated mod cleaning and analysis</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSkillLevel('beginner')}
              className={`px-4 py-2 rounded ${skillLevel === 'beginner' ? 'bg-green-600' : 'bg-slate-700'} text-white`}
            >
              🟢 Beginner
            </button>
            <button
              onClick={() => setSkillLevel('intermediate')}
              className={`px-4 py-2 rounded ${skillLevel === 'intermediate' ? 'bg-yellow-600' : 'bg-slate-700'} text-white`}
            >
              🟡 Intermediate
            </button>
            <button
              onClick={() => setSkillLevel('advanced')}
              className={`px-4 py-2 rounded ${skillLevel === 'advanced' ? 'bg-red-600' : 'bg-slate-700'} text-white`}
            >
              🔴 Advanced
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded border ${
            message.includes('success') ? 'bg-green-900/50 border-green-500 text-green-200' :
            message.includes('failed') ? 'bg-red-900/50 border-red-500 text-red-200' :
            'bg-blue-900/50 border-blue-500 text-blue-200'
          }`}>
            {message}
          </div>
        )}

        {/* Configuration */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">xEdit Location</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={xEditPath}
                  onChange={(e) => setXEditPath(e.target.value)}
                  placeholder="C:/Program Files/xEdit/FO4Edit.exe"
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded border border-slate-600"
                />
                <button
                  onClick={browseForXEdit}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Browse
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Target Plugin</label>
              <div className="flex gap-2">
                {availablePlugins.length > 0 ? (
                  <select
                    value={selectedPlugin}
                    onChange={(e) => setSelectedPlugin(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded border border-slate-600"
                  >
                    <option value="">Select a plugin...</option>
                    {availablePlugins.map(plugin => (
                      <option key={plugin} value={plugin}>{plugin}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedPlugin}
                    onChange={(e) => setSelectedPlugin(e.target.value)}
                    placeholder="MyMod.esp"
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded border border-slate-600"
                  />
                )}
                <button
                  onClick={browseForPlugin}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Browse
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Beginner Mode */}
        {skillLevel === 'beginner' && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <p className="text-slate-300 mb-4">
              These are essential maintenance tasks every mod author should run:
            </p>
            <div className="grid grid-cols-2 gap-4">
              {filteredScripts.map(script => (
                <button
                  key={script.id}
                  onClick={() => {
                    setSelectedScript(script);
                    executeScript();
                  }}
                  disabled={!xEditPath || !selectedPlugin || isExecuting}
                  className="p-6 bg-slate-700 hover:bg-slate-600 rounded-lg text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <h3 className="font-bold text-white text-lg mb-2">{script.name}</h3>
                  <p className="text-slate-300 text-sm mb-3">{script.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>⏱️ {script.estimatedTime}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Intermediate/Advanced Mode */}
        {(skillLevel === 'intermediate' || skillLevel === 'advanced') && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Available Scripts</h2>
            <div className="grid gap-4">
              {filteredScripts.map(script => (
                <div
                  key={script.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedScript?.id === script.id
                      ? 'bg-green-900/30 border-green-500'
                      : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => setSelectedScript(script)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-white text-lg">{script.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          script.difficulty === 'beginner' ? 'bg-green-600' :
                          script.difficulty === 'intermediate' ? 'bg-yellow-600' :
                          'bg-red-600'
                        } text-white`}>
                          {script.difficulty}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-slate-600 text-slate-200">
                          {script.category}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mb-2">{script.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>⏱️ Estimated: {script.estimatedTime}</span>
                      </div>
                    </div>
                    {selectedScript?.id === script.id && (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={executeScript}
                disabled={!xEditPath || !selectedPlugin || !selectedScript || isExecuting}
                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isExecuting ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Executing... {progress}%
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    Execute Selected Script
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        {isExecuting && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Execution Progress</h2>
            <div className="space-y-3">
              <div className="w-full bg-slate-700 rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-slate-300 text-center">{progressText}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {executionResult && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              {executionResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400" />
              )}
              Execution Results
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-slate-300">
                <span>Duration: {executionResult.duration.toFixed(1)}s</span>
                <span>Status: {executionResult.success ? '✅ Success' : '❌ Failed'}</span>
              </div>

              {executionResult.warnings.length > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-600 rounded p-4">
                  <h3 className="font-bold text-yellow-400 mb-2">Warnings ({executionResult.warnings.length})</h3>
                  <ul className="space-y-1 text-sm text-yellow-200">
                    {executionResult.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {executionResult.errors.length > 0 && (
                <div className="bg-red-900/30 border border-red-600 rounded p-4">
                  <h3 className="font-bold text-red-400 mb-2">Errors ({executionResult.errors.length})</h3>
                  <ul className="space-y-1 text-sm text-red-200">
                    {executionResult.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {executionResult.output && (
                <div className="bg-slate-900 rounded p-4">
                  <h3 className="font-bold text-white mb-2">Output</h3>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                    {executionResult.output}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
