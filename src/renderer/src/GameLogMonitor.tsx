import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Eye, FileText, Play, Square, TrendingUp } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'crash';
  message: string;
  mod?: string;
  category?: string;
}

interface CrashPrediction {
  risk: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  recommendation: string;
}

export default function GameLogMonitor() {
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logPath, setLogPath] = useState('');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [crashPrediction, setCrashPrediction] = useState<CrashPrediction | null>(null);
  const [stats, setStats] = useState({ total: 0, warnings: 0, errors: 0, crashes: 0 });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadLastLogPath();
  }, []);

  const loadLastLogPath = async () => {
    try {
      const path = await window.electron.api.gameLogMonitor.getLastLogPath();
      if (path) setLogPath(path);
    } catch (error) {
      console.error('Failed to load last log path:', error);
    }
  };

  const browseForLog = async () => {
    try {
      const result = await window.electron.api.gameLogMonitor.browseLogFile();
      if (result) {
        setLogPath(result);
        await window.electron.api.gameLogMonitor.saveLastLogPath(result);
      }
    } catch (error) {
      setMessage('Failed to browse for log file');
    }
  };

  const startMonitoring = async () => {
    if (!logPath) {
      setMessage('Please select a log file first');
      return;
    }

    try {
      await window.electron.api.gameLogMonitor.startMonitoring(logPath);
      setIsMonitoring(true);
      setMessage('Monitoring started');

      // Listen for log updates
      window.electron.api.gameLogMonitor.onLogUpdate((entry: LogEntry) => {
        setLogEntries(prev => [...prev, entry].slice(-1000)); // Keep last 1000 entries
        updateStats(entry);
        checkCrashPrediction([...logEntries, entry]);
      });
    } catch (error) {
      setMessage('Failed to start monitoring');
    }
  };

  const stopMonitoring = async () => {
    try {
      await window.electron.api.gameLogMonitor.stopMonitoring();
      setIsMonitoring(false);
      setMessage('Monitoring stopped');
    } catch (error) {
      setMessage('Failed to stop monitoring');
    }
  };

  const updateStats = (entry: LogEntry) => {
    setStats(prev => ({
      total: prev.total + 1,
      warnings: prev.warnings + (entry.level === 'warning' ? 1 : 0),
      errors: prev.errors + (entry.level === 'error' ? 1 : 0),
      crashes: prev.crashes + (entry.level === 'crash' ? 1 : 0)
    }));
  };

  const checkCrashPrediction = (entries: LogEntry[]) => {
    const recent = entries.slice(-50);
    const errorCount = recent.filter(e => e.level === 'error').length;
    const warningCount = recent.filter(e => e.level === 'warning').length;
    
    const indicators: string[] = [];
    let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let recommendation = 'System is stable';

    if (errorCount > 10) {
      indicators.push(`${errorCount} errors in last 50 entries`);
      risk = 'critical';
      recommendation = 'Save immediately! Crash likely imminent';
    } else if (errorCount > 5) {
      indicators.push(`${errorCount} errors detected`);
      risk = 'high';
      recommendation = 'Save your game soon';
    } else if (warningCount > 20) {
      indicators.push(`${warningCount} warnings detected`);
      risk = 'medium';
      recommendation = 'Monitor system closely';
    }

    // Check for specific crash patterns
    const memoryErrors = recent.filter(e => 
      e.message.toLowerCase().includes('memory') || 
      e.message.toLowerCase().includes('allocation')
    );
    if (memoryErrors.length > 3) {
      indicators.push('Memory allocation issues detected');
      risk = 'high';
      recommendation = 'Out of memory likely - save and restart';
    }

    if (indicators.length > 0) {
      setCrashPrediction({ risk, indicators, recommendation });
    } else {
      setCrashPrediction(null);
    }
  };

  const clearLogs = () => {
    setLogEntries([]);
    setStats({ total: 0, warnings: 0, errors: 0, crashes: 0 });
    setCrashPrediction(null);
    setMessage('Logs cleared');
  };

  const exportLogs = async () => {
    try {
      await window.electron.api.gameLogMonitor.exportLogs(logEntries);
      setMessage('Logs exported successfully');
    } catch (error) {
      setMessage('Failed to export logs');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-400 flex items-center gap-3">
              <Activity className="w-10 h-10" />
              Game Log Monitor
            </h1>
            <p className="text-slate-400 mt-2">Real-time Fallout 4 log monitoring with crash prediction</p>
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
          <div className="mb-4 p-4 bg-blue-900/50 border border-blue-500 rounded text-blue-200">
            {message}
          </div>
        )}

        {/* Crash Prediction Alert */}
        {crashPrediction && crashPrediction.risk !== 'low' && (
          <div className={`mb-6 p-6 rounded-lg border-2 ${
            crashPrediction.risk === 'critical' ? 'bg-red-900/50 border-red-500' :
            crashPrediction.risk === 'high' ? 'bg-orange-900/50 border-orange-500' :
            'bg-yellow-900/50 border-yellow-500'
          }`}>
            <div className="flex items-start gap-4">
              <AlertTriangle className={`w-8 h-8 ${
                crashPrediction.risk === 'critical' ? 'text-red-400' :
                crashPrediction.risk === 'high' ? 'text-orange-400' :
                'text-yellow-400'
              }`} />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  {crashPrediction.risk === 'critical' ? '🚨 CRITICAL: Crash Imminent!' :
                   crashPrediction.risk === 'high' ? '⚠️ HIGH RISK: Save Soon' :
                   '⚡ WARNING: Increased Risk'}
                </h3>
                <p className="text-white mb-3 font-semibold">{crashPrediction.recommendation}</p>
                <ul className="space-y-1">
                  {crashPrediction.indicators.map((indicator, idx) => (
                    <li key={idx} className="text-sm text-slate-200">• {indicator}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Log File Selection */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Log File
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={logPath}
              onChange={(e) => setLogPath(e.target.value)}
              placeholder="Documents/My Games/Fallout4/Fallout4.log"
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded border border-slate-600"
            />
            <button
              onClick={browseForLog}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Browse
            </button>
            {!isMonitoring ? (
              <button
                onClick={startMonitoring}
                disabled={!logPath}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            ) : (
              <button
                onClick={stopMonitoring}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-slate-400">Total Entries</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.warnings}</div>
                <div className="text-sm text-slate-400">Warnings</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-orange-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.errors}</div>
                <div className="text-sm text-slate-400">Errors</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.crashes}</div>
                <div className="text-sm text-slate-400">Crashes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Beginner Mode */}
        {skillLevel === 'beginner' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">What's Happening?</h2>
            <div className="space-y-4">
              {isMonitoring ? (
                <div className="flex items-center gap-3 text-green-400">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-semibold">Monitoring game logs in real-time</span>
                </div>
              ) : (
                <div className="text-slate-400">
                  <p className="mb-2">Click "Start" to begin monitoring your game.</p>
                  <p>I'll watch for problems and warn you before crashes happen!</p>
                </div>
              )}

              {logEntries.length > 0 && (
                <div className="bg-slate-700 rounded p-4">
                  <h3 className="font-semibold text-white mb-2">Recent Activity:</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {logEntries.slice(-10).reverse().map((entry, idx) => (
                      <div key={idx} className={`text-sm p-2 rounded ${
                        entry.level === 'error' ? 'bg-red-900/50 text-red-200' :
                        entry.level === 'warning' ? 'bg-yellow-900/50 text-yellow-200' :
                        'bg-slate-600 text-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{entry.timestamp}</span>
                          {entry.mod && <span className="text-xs bg-slate-800 px-2 py-1 rounded">{entry.mod}</span>}
                        </div>
                        <div className="mt-1">{entry.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Intermediate/Advanced Mode */}
        {(skillLevel === 'intermediate' || skillLevel === 'advanced') && (
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Log Stream
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={exportLogs}
                  disabled={logEntries.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                >
                  Export
                </button>
                <button
                  onClick={clearLogs}
                  disabled={logEntries.length === 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-slate-900 rounded p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {logEntries.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  No log entries yet. Start monitoring to see real-time logs.
                </div>
              ) : (
                <div className="space-y-1">
                  {logEntries.slice(-100).map((entry, idx) => (
                    <div key={idx} className={`${
                      entry.level === 'error' ? 'text-red-400' :
                      entry.level === 'warning' ? 'text-yellow-400' :
                      entry.level === 'crash' ? 'text-red-600 font-bold' :
                      'text-slate-300'
                    }`}>
                      <span className="text-slate-500">[{entry.timestamp}]</span>
                      {entry.level !== 'info' && <span className="font-bold"> [{entry.level.toUpperCase()}]</span>}
                      {entry.mod && <span className="text-blue-400"> [{entry.mod}]</span>}
                      {entry.category && <span className="text-purple-400"> ({entry.category})</span>}
                      <span> {entry.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {skillLevel === 'advanced' && (
              <div className="mt-6 p-4 bg-slate-700 rounded">
                <h3 className="text-lg font-bold text-white mb-3">Advanced Analysis</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Monitoring:</span>
                    <span className="text-white ml-2">{isMonitoring ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Log Path:</span>
                    <span className="text-white ml-2 text-xs">{logPath || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Buffer Size:</span>
                    <span className="text-white ml-2">{logEntries.length} entries</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Error Rate:</span>
                    <span className="text-white ml-2">
                      {stats.total > 0 ? ((stats.errors / stats.total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
