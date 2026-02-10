import React, { useState, useEffect } from 'react';
import { FolderOpen, Eye, AlertTriangle, FileCode, FileImage, Box, Zap, CheckCircle2, Clock } from 'lucide-react';

interface WatchedFile {
  path: string;
  type: 'script' | 'mesh' | 'texture' | 'plugin' | 'unknown';
  lastModified: Date;
  suggestion?: string;
}

interface ContextSuggestion {
  title: string;
  message: string;
  action: string;
  route?: string;
}

export const FileWatcher: React.FC = () => {
  const [watchPath, setWatchPath] = useState('');
  const [watching, setWatching] = useState(false);
  const [recentFiles, setRecentFiles] = useState<WatchedFile[]>([]);
  const [suggestions, setSuggestions] = useState<ContextSuggestion[]>([]);
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  useEffect(() => {
    // Load saved watch path
    const saved = localStorage.getItem('mossy_watch_path');
    if (saved) setWatchPath(saved);
  }, []);

  const startWatching = async () => {
    if (!watchPath) return;
    
    localStorage.setItem('mossy_watch_path', watchPath);
    setWatching(true);

    // In real implementation, this would use Desktop Bridge to watch files
    try {
      const response = await fetch('http://localhost:21337/files/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: watchPath })
      });

      if (response.ok) {
        pollForChanges();
      }
    } catch (error) {
      console.error('File watcher connection failed:', error);
      alert('Connection Failed: The Desktop Bridge is not responding on port 21337. File watching requires the active VoltTech Wrapper.');
      setWatching(false);
    }
  };

  const stopWatching = () => {
    setWatching(false);
  };

  const pollForChanges = () => {
    const interval = setInterval(async () => {
      if (!watching) {
        clearInterval(interval);
        return;
      }

      try {
        const response = await fetch('http://localhost:21337/files/changes');
        if (response.ok) {
          const data = await response.json();
          if (data.files && data.files.length > 0) {
            const files = data.files.map((f: any) => ({
              path: f.path,
              type: detectFileType(f.path),
              lastModified: new Date(f.modified),
              suggestion: getSuggestionForFile(f.path)
            }));
            setRecentFiles(prev => [...files, ...prev].slice(0, 20));
            generateSuggestions(files);
          }
        }
      } catch (error) {
        // Continue silently
      }
    }, 2000);
  };

  const detectFileType = (path: string): WatchedFile['type'] => {
    const lower = path.toLowerCase();
    if (lower.endsWith('.psc') || lower.endsWith('.pex')) return 'script';
    if (lower.endsWith('.nif')) return 'mesh';
    if (lower.endsWith('.dds') || lower.endsWith('.tga')) return 'texture';
    if (lower.endsWith('.esp') || lower.endsWith('.esl') || lower.endsWith('.esm')) return 'plugin';
    return 'unknown';
  };

  const getSuggestionForFile = (path: string): string => {
    const type = detectFileType(path);
    switch (type) {
      case 'script':
        return 'Analyze for syntax errors and performance issues?';
      case 'mesh':
        return 'Check for collision, triangle count, and missing textures?';
      case 'texture':
        return 'Optimize size, format, and generate mipmaps?';
      case 'plugin':
        return 'Scan for conflicts and missing masters?';
      default:
        return 'Unknown file type';
    }
  };

  const generateSuggestions = (files: WatchedFile[]) => {
    const newSuggestions: ContextSuggestion[] = [];

    const scriptFiles = files.filter(f => f.type === 'script');
    if (scriptFiles.length > 0) {
      newSuggestions.push({
        title: 'Script Files Detected',
        message: `You're working on ${scriptFiles.length} Papyrus script${scriptFiles.length > 1 ? 's' : ''}. I can analyze them for errors.`,
        action: 'Analyze Scripts',
        route: '/devtools'
      });
    }

    const meshFiles = files.filter(f => f.type === 'mesh');
    if (meshFiles.length > 0) {
      newSuggestions.push({
        title: 'Mesh Files Modified',
        message: 'New or modified .nif files detected. Check for common issues?',
        action: 'Check Meshes',
        route: '/auditor'
      });
    }

    const textureFiles = files.filter(f => f.type === 'texture');
    if (textureFiles.length > 0) {
      newSuggestions.push({
        title: 'Texture Files Changed',
        message: `${textureFiles.length} texture file${textureFiles.length > 1 ? 's' : ''} modified. Optimize for game performance?`,
        action: 'Optimize Textures',
        route: '/images'
      });
    }

    const pluginFiles = files.filter(f => f.type === 'plugin');
    if (pluginFiles.length > 0) {
      newSuggestions.push({
        title: 'Plugin Modified',
        message: 'Your .esp file changed. Want to analyze for conflicts?',
        action: 'Check Load Order',
        route: '/load-order'
      });
    }

    setSuggestions(newSuggestions);
  };

  const getFileIcon = (type: WatchedFile['type']) => {
    switch (type) {
      case 'script': return <FileCode className="w-4 h-4 text-purple-400" />;
      case 'mesh': return <Box className="w-4 h-4 text-blue-400" />;
      case 'texture': return <FileImage className="w-4 h-4 text-green-400" />;
      case 'plugin': return <Zap className="w-4 h-4 text-amber-400" />;
      default: return <FileCode className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Context-Aware File Watcher</h1>
            <p className="text-sm text-slate-400">Mossy monitors your work and suggests next steps</p>
          </div>
        </div>

        {/* Watch Path Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={watchPath}
            onChange={(e) => setWatchPath(e.target.value)}
            placeholder="Path to your Fallout 4 Data folder..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          {!watching ? (
            <button
              onClick={startWatching}
              disabled={!watchPath}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
            >
              <Eye className="w-4 h-4" />
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

        {/* Auto-analyze toggle */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-analyze"
            checked={autoAnalyze}
            onChange={(e) => setAutoAnalyze(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-cyan-600"
          />
          <label htmlFor="auto-analyze" className="text-sm text-slate-400">
            Auto-analyze files when they change
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-6">
        {/* Left: Suggestions */}
        <div className="w-96 space-y-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Smart Suggestions
            </h3>

            {!watching && (
              <div className="text-center py-8 text-slate-500">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Start watching to get suggestions</p>
              </div>
            )}

            {watching && suggestions.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Watching for file changes...</p>
              </div>
            )}

            {suggestions.map((sug, idx) => (
              <div key={idx} className="mb-3 p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                <h4 className="font-bold text-cyan-300 text-sm mb-1">{sug.title}</h4>
                <p className="text-xs text-slate-400 mb-3">{sug.message}</p>
                <button
                  onClick={() => sug.route && (window.location.hash = sug.route)}
                  className="w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded transition-colors"
                >
                  {sug.action}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="font-bold text-white mb-3 text-sm">Status</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Watching:</span>
                <span className="text-white font-mono">{watching ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Files Detected:</span>
                <span className="text-white font-mono">{recentFiles.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auto-analyze:</span>
                <span className="text-white font-mono">{autoAnalyze ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Files */}
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Activity
            </h3>
          </div>

          {!watching && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Start watching to see file activity</p>
              </div>
            </div>
          )}

          {watching && recentFiles.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p>Monitoring for changes...</p>
              </div>
            </div>
          )}

          {recentFiles.length > 0 && (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
              {recentFiles.map((file, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start gap-3">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-white truncate">{file.path.split('\\').pop()}</span>
                        <span className="text-xs text-slate-500 shrink-0">{formatTime(file.lastModified)}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mb-2">{file.path}</div>
                      {file.suggestion && (
                        <div className="text-xs text-cyan-400 bg-cyan-900/20 px-2 py-1 rounded">
                          💡 {file.suggestion}
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
