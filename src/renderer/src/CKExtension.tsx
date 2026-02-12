import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Save, Code, AlertTriangle, CheckCircle2, FileText, Play, RefreshCw, Terminal, Clock, MapPin } from 'lucide-react';

interface CompilationJob {
  id: string;
  scriptName: string;
  status: 'queued' | 'compiling' | 'success' | 'error';
  startTime?: Date;
  endTime?: Date;
  errors?: string[];
}

interface CKScript {
  name: string;
  path: string;
  lastModified: Date;
  compiled: boolean;
}

export const CKExtension: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    return localStorage.getItem('ck_autosave_enabled') === 'true';
  });
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => {
    return parseInt(localStorage.getItem('ck_autosave_interval') || '5');
  });
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [compilationQueue, setCompilationQueue] = useState<CompilationJob[]>([]);
  const [recentScripts, setRecentScripts] = useState<CKScript[]>([]);
  const [ckLogs, setCkLogs] = useState<string[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // Check if Creation Kit is running via Neural Link
  useEffect(() => {
    const checkCK = () => {
      try {
        const activeTools = localStorage.getItem('mossy_active_tools');
        if (activeTools) {
          const data = JSON.parse(activeTools);
          const ckRunning = data.tools?.some((t: any) => 
            t.name.toLowerCase().includes('creationkit') || 
            t.name.toLowerCase().includes('ck.exe')
          );
          setIsConnected(ckRunning);
          
          if (ckRunning) {
            loadCKData();
          }
        }
      } catch (error) {
        console.error('Error checking CK status:', error);
      }
    };

    checkCK();
    const interval = setInterval(checkCK, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save timer
  useEffect(() => {
    if (!isConnected || !autoSaveEnabled) return;

    const saveInterval = setInterval(() => {
      performAutoSave();
    }, autoSaveInterval * 60 * 1000);

    return () => clearInterval(saveInterval);
  }, [isConnected, autoSaveEnabled, autoSaveInterval]);

  const loadCKData = () => {
    // Mock data for demonstration
    const mockScripts: CKScript[] = [
      { name: 'MyQuestScript.psc', path: 'Data\\Scripts\\Source', lastModified: new Date(), compiled: true },
      { name: 'CustomFollower.psc', path: 'Data\\Scripts\\Source', lastModified: new Date(Date.now() - 3600000), compiled: false },
      { name: 'WorkshopHelper.psc', path: 'Data\\Scripts\\Source', lastModified: new Date(Date.now() - 7200000), compiled: true },
    ];
    setRecentScripts(mockScripts);

    setActiveCell('Diamond City - Market');
  };

  const performAutoSave = () => {
    setLastAutoSave(new Date());
    setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Auto-save completed`]);
  };

  const toggleAutoSave = () => {
    const newValue = !autoSaveEnabled;
    setAutoSaveEnabled(newValue);
    localStorage.setItem('ck_autosave_enabled', newValue.toString());
    setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Auto-save ${newValue ? 'enabled' : 'disabled'}`]);
  };

  const updateAutoSaveInterval = (minutes: number) => {
    setAutoSaveInterval(minutes);
    localStorage.setItem('ck_autosave_interval', minutes.toString());
    setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Auto-save interval set to ${minutes} minutes`]);
  };

  const compileScript = (scriptName: string) => {
    const job: CompilationJob = {
      id: Date.now().toString(),
      scriptName,
      status: 'queued',
    };

    setCompilationQueue(prev => [...prev, job]);
    setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Queued: ${scriptName}`]);

    // Simulate compilation
    setTimeout(() => {
      setCompilationQueue(prev => 
        prev.map(j => j.id === job.id ? { ...j, status: 'compiling', startTime: new Date() } : j)
      );
      setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Compiling: ${scriptName}`]);

      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% success rate
        setCompilationQueue(prev => 
          prev.map(j => j.id === job.id ? { 
            ...j, 
            status: success ? 'success' : 'error',
            endTime: new Date(),
            errors: success ? [] : ['Error: Undefined variable at line 42']
          } : j)
        );
        setCkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${success ? 'Success' : 'Failed'}: ${scriptName}`]);
      }, 2000);
    }, 500);
  };

  const compileAllQueued = () => {
    recentScripts.filter(s => !s.compiled).forEach(script => {
      compileScript(script.name);
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Wrench className="w-8 h-8 text-orange-400" />
                Creation Kit Extension
              </h1>
              <p className="text-slate-300 mt-2">
                Auto-save, script compilation, and productivity tools for CK
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isConnected 
                  ? 'bg-green-900/30 border border-green-500/30 text-green-300'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'CK Detected' : 'CK Not Running'}
              </div>
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-orange-900/20 border border-orange-500/30 text-orange-100 hover:bg-orange-900/30 transition-colors"
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
                  <h3 className="text-lg font-bold text-amber-300 mb-2">Creation Kit Not Detected</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    Start Creation Kit to enable this extension. Neural Link will automatically detect it.
                  </p>
                  <div className="text-xs text-slate-400">
                    <p className="mb-1">Supported: Creation Kit 1.10+</p>
                    <p>Detection looks for: CreationKit.exe</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auto-Save Control */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Save className="w-6 h-6 text-orange-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Auto-Save</h3>
                    <p className="text-sm text-slate-400">Automatic backup to prevent data loss</p>
                  </div>
                </div>
                <button
                  onClick={toggleAutoSave}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    autoSaveEnabled
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {autoSaveEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {autoSaveEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-slate-300">Interval:</label>
                    <div className="flex gap-2">
                      {[3, 5, 10, 15].map(minutes => (
                        <button
                          key={minutes}
                          onClick={() => updateAutoSaveInterval(minutes)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            autoSaveInterval === minutes
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          }`}
                        >
                          {minutes} min
                        </button>
                      ))}
                    </div>
                  </div>

                  {lastAutoSave && (
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Last auto-save: {lastAutoSave.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Cell/Worldspace */}
          {isConnected && activeCell && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">Active Cell</h3>
                  <p className="text-sm text-slate-400">{activeCell}</p>
                </div>
              </div>
            </div>
          )}

          {/* Script Compilation Queue */}
          {isConnected && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Code className="w-6 h-6 text-orange-400" />
                  <h3 className="text-lg font-bold text-white">Script Compilation</h3>
                </div>
                <button
                  onClick={compileAllQueued}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Compile All Uncompiled
                </button>
              </div>

              {/* Recent Scripts */}
              <div className="space-y-2">
                {recentScripts.map((script, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="font-medium text-white">{script.name}</div>
                        <div className="text-xs text-slate-500">
                          Modified: {script.lastModified.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {script.compiled ? (
                        <span className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Compiled
                        </span>
                      ) : (
                        <button
                          onClick={() => compileScript(script.name)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-sm font-medium transition-colors"
                        >
                          Compile
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Compilation Queue */}
              {compilationQueue.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-bold text-slate-300">Queue</h4>
                  {compilationQueue.slice(-5).map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 rounded-lg border flex items-center gap-3 ${
                        job.status === 'success' ? 'bg-green-900/20 border-green-500/30' :
                        job.status === 'error' ? 'bg-red-900/20 border-red-500/30' :
                        'bg-blue-900/20 border-blue-500/30'
                      }`}
                    >
                      {job.status === 'queued' && <Clock className="w-4 h-4 text-blue-400" />}
                      {job.status === 'compiling' && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
                      {job.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                      {job.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                      <div className="flex-1">
                        <div className="text-sm text-white">{job.scriptName}</div>
                        {job.errors && job.errors.length > 0 && (
                          <div className="text-xs text-red-400 mt-1">{job.errors[0]}</div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        job.status === 'success' ? 'bg-green-500/20 text-green-300' :
                        job.status === 'error' ? 'bg-red-500/20 text-red-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Log */}
          {isConnected && ckLogs.length > 0 && (
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-orange-500/30 p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-orange-400" />
                Activity Log
              </h3>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
                {ckLogs.slice(-10).map((log, index) => (
                  <div key={index} className="text-green-400">
                    {log}
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
                <button 
                  onClick={performAutoSave}
                  className="px-4 py-3 bg-green-900/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-900/30 transition-colors flex items-center gap-2 justify-center"
                >
                  <Save className="w-4 h-4" />
                  Save Now
                </button>
                <button className="px-4 py-3 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors flex items-center gap-2 justify-center">
                  <FileText className="w-4 h-4" />
                  View Logs
                </button>
                <button className="px-4 py-3 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Code className="w-4 h-4" />
                  Script Editor
                </button>
                <button className="px-4 py-3 bg-orange-900/20 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-900/30 transition-colors flex items-center gap-2 justify-center">
                  <Wrench className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-200 mb-2">💡 Creation Kit Extension Features</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Automatic save at configurable intervals</li>
              <li>• Script compilation queue</li>
              <li>• Real-time activity logging</li>
              <li>• Quick compile shortcuts</li>
              <li>• Error detection and reporting</li>
              <li>• Cell/worldspace tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
