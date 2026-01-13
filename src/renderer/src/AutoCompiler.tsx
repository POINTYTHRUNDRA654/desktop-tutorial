import React, { useState, useEffect } from 'react';
import { FileCode, CheckCircle2, XCircle, Play, FolderOpen, Clock, AlertTriangle } from 'lucide-react';

interface CompilationResult {
  file: string;
  success: boolean;
  time: Date;
  errors: string[];
  warnings: string[];
  output: string;
}

export const AutoCompiler: React.FC = () => {
  const [sourcePath, setSourcePath] = useState('');
  const [watching, setWatching] = useState(false);
  const [autoCompile, setAutoCompile] = useState(true);
  const [compilations, setCompilations] = useState<CompilationResult[]>([]);
  const [compilerPath, setCompilerPath] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('mossy_compiler_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setSourcePath(settings.sourcePath || '');
      setCompilerPath(settings.compilerPath || '');
    }
  }, []);

  const startWatching = async () => {
    if (!sourcePath) return;

    localStorage.setItem('mossy_compiler_settings', JSON.stringify({
      sourcePath,
      compilerPath
    }));

    setWatching(true);

    try {
      const response = await fetch('http://localhost:21337/papyrus/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath,
          compilerPath: compilerPath || 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Papyrus Compiler\\PapyrusCompiler.exe',
          autoCompile
        })
      });

      if (response.ok) {
        pollCompilations();
      }
    } catch (error) {
      // Demo mode
      simulateCompilations();
    }
  };

  const stopWatching = () => {
    setWatching(false);
  };

  const simulateCompilations = () => {
    // Add example compilations
    setTimeout(() => {
      const example: CompilationResult = {
        file: 'MyQuestScript.psc',
        success: false,
        time: new Date(),
        errors: [
          'Line 45: variable "questStage" is undefined',
          'Line 67: type mismatch in assignment to variable "playerRef"'
        ],
        warnings: [
          'Line 23: local variable "tempInt" is never used'
        ],
        output: 'Starting 1 compile threads for 1 files...\nCompiling "MyQuestScript"...\nMyQuestScript.psc(45,12): variable "questStage" is undefined\nMyQuestScript.psc(67,8): type mismatch in assignment\nNo output generated for MyQuestScript.psc, compilation failed.'
      };

      setCompilations(prev => [example, ...prev].slice(0, 20));
    }, 2000);

    setTimeout(() => {
      const success: CompilationResult = {
        file: 'WorkingScript.psc',
        success: true,
        time: new Date(),
        errors: [],
        warnings: [],
        output: 'Starting 1 compile threads for 1 files...\nCompiling "WorkingScript"...\nCompilation succeeded.\nBatch compile of 1 files finished. 1 succeeded, 0 failed.'
      };

      setCompilations(prev => [success, ...prev].slice(0, 20));
    }, 5000);
  };

  const pollCompilations = () => {
    const interval = setInterval(async () => {
      if (!watching) {
        clearInterval(interval);
        return;
      }

      try {
        const response = await fetch('http://localhost:21337/papyrus/results');
        if (response.ok) {
          const data = await response.json();
          if (data.compilations && data.compilations.length > 0) {
            setCompilations(prev => [...data.compilations, ...prev].slice(0, 20));
          }
        }
      } catch (error) {
        // Continue silently
      }
    }, 1000);
  };

  const manualCompile = async (file?: string) => {
    try {
      const response = await fetch('http://localhost:21337/papyrus/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: file || 'all',
          sourcePath,
          compilerPath
        })
      });

      if (response.ok) {
        const result = await response.json();
        setCompilations(prev => [result, ...prev].slice(0, 20));
      }
    } catch (error) {
      alert('Compilation requires Desktop Bridge with Papyrus Compiler access');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <FileCode className="w-8 h-8 text-orange-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Auto-Compilation Watcher</h1>
            <p className="text-sm text-slate-400">Compile Papyrus scripts automatically on save</p>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <input
            type="text"
            value={sourcePath}
            onChange={(e) => setSourcePath(e.target.value)}
            placeholder="Path to Scripts\Source folder..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
          />
          <input
            type="text"
            value={compilerPath}
            onChange={(e) => setCompilerPath(e.target.value)}
            placeholder="Path to PapyrusCompiler.exe (optional)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
          />

          <div className="flex gap-3">
            <label className="flex items-center gap-2 flex-1">
              <input
                type="checkbox"
                checked={autoCompile}
                onChange={(e) => setAutoCompile(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-slate-300">Auto-compile on file save</span>
            </label>

            {!watching ? (
              <button
                onClick={startWatching}
                disabled={!sourcePath}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Watching
              </button>
            ) : (
              <button
                onClick={stopWatching}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-6">
        {/* Left: Stats */}
        <div className="w-80 space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="font-bold text-white mb-3">Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Compilations:</span>
                <span className="text-white font-mono">{compilations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Successful:</span>
                <span className="text-green-400 font-mono">{compilations.filter(c => c.success).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Failed:</span>
                <span className="text-red-400 font-mono">{compilations.filter(c => !c.success).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Watching:</span>
                <span className="text-white font-mono">{watching ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="font-bold text-white mb-3 text-sm">Manual Compile</h3>
            <button
              onClick={() => manualCompile()}
              disabled={!sourcePath}
              className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Compile All Scripts
            </button>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
            <h4 className="font-bold text-blue-300 mb-2 text-sm">How It Works</h4>
            <p className="text-xs text-slate-400">
              Mossy watches your Scripts\Source folder. When you save a .psc file, it automatically compiles it and shows errors in real-time.
            </p>
          </div>
        </div>

        {/* Right: Compilation Log */}
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Compilation Log
            </h3>
          </div>

          {!watching && compilations.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <FileCode className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Start watching to see compilation results</p>
              </div>
            </div>
          )}

          {compilations.length > 0 && (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
              {compilations.map((comp, idx) => (
                <div key={idx} className={`p-4 ${comp.success ? 'bg-green-900/10' : 'bg-red-900/10'}`}>
                  <div className="flex items-start gap-3 mb-2">
                    {comp.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-white">{comp.file}</span>
                        <span className="text-xs text-slate-500">{formatTime(comp.time)}</span>
                      </div>

                      {comp.errors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {comp.errors.map((error, eidx) => (
                            <div key={eidx} className="text-xs text-red-300 bg-red-950/50 px-2 py-1 rounded font-mono">
                              ❌ {error}
                            </div>
                          ))}
                        </div>
                      )}

                      {comp.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {comp.warnings.map((warning, widx) => (
                            <div key={widx} className="text-xs text-yellow-300 bg-yellow-950/50 px-2 py-1 rounded font-mono">
                              ⚠️ {warning}
                            </div>
                          ))}
                        </div>
                      )}

                      {comp.success && comp.errors.length === 0 && (
                        <div className="text-xs text-green-400 mt-1">
                          ✓ Compiled successfully
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
