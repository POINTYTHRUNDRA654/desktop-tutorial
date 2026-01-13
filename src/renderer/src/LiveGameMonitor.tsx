import React, { useState, useEffect, useRef } from 'react';
import { Activity, Cpu, Zap, Eye, RefreshCw, Play, Square, AlertTriangle, TrendingUp } from 'lucide-react';

interface GameMetrics {
  fps: number;
  frameTime: number;
  vram: { used: number; total: number };
  ram: { used: number; total: number };
  scriptTime: number;
  scriptCount: number;
  activeScripts: ScriptMetric[];
  consoleLog: ConsoleEntry[];
  variables: VariableWatch[];
}

interface ScriptMetric {
  name: string;
  time: number;
  calls: number;
  percentage: number;
}

interface ConsoleEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

interface VariableWatch {
  script: string;
  variable: string;
  value: string;
  type: string;
}

export const LiveGameMonitor: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<GameMetrics | null>(null);
  const [watching, setWatching] = useState<string[]>([]);
  const [newWatch, setNewWatch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connected) {
      const interval = setInterval(pollMetrics, 100); // 10 updates per second
      return () => clearInterval(interval);
    }
  }, [connected]);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [metrics?.consoleLog, autoScroll]);

  const connectToGame = async () => {
    try {
      const response = await fetch('http://localhost:21337/game/connect', {
        method: 'POST'
      });

      if (response.ok) {
        setConnected(true);
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      // Demo mode
      setConnected(true);
      startDemoMetrics();
    }
  };

  const disconnect = () => {
    setConnected(false);
    setMetrics(null);
  };

  const pollMetrics = async () => {
    try {
      const response = await fetch('http://localhost:21337/game/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      // Demo continues
    }
  };

  const startDemoMetrics = () => {
    let frameCount = 0;
    
    const interval = setInterval(() => {
      frameCount++;
      
      const baseFps = 58 + Math.sin(frameCount * 0.05) * 4;
      const demoMetrics: GameMetrics = {
        fps: Math.floor(baseFps),
        frameTime: 1000 / baseFps,
        vram: { 
          used: 3200 + Math.sin(frameCount * 0.1) * 200, 
          total: 8192 
        },
        ram: { 
          used: 12800 + Math.sin(frameCount * 0.08) * 400, 
          total: 16384 
        },
        scriptTime: 5.2 + Math.sin(frameCount * 0.15) * 2,
        scriptCount: 342,
        activeScripts: [
          { name: 'QuestScript_MainQuest', time: 2.1, calls: 120, percentage: 40 },
          { name: 'SpawnerScript_Enemies', time: 1.3, calls: 85, percentage: 25 },
          { name: 'WeatherController', time: 0.9, calls: 60, percentage: 17 },
          { name: 'PlayerTracker', time: 0.6, calls: 120, percentage: 11 },
          { name: 'LightingManager', time: 0.3, calls: 30, percentage: 7 }
        ],
        consoleLog: metrics?.consoleLog || [],
        variables: [
          { script: 'QuestScript_MainQuest', variable: 'Stage', value: '50', type: 'Int' },
          { script: 'QuestScript_MainQuest', variable: 'IsActive', value: 'True', type: 'Bool' },
          { script: 'PlayerTracker', variable: 'LastLocation', value: 'CommonwealthCell04', type: 'String' }
        ]
      };

      // Random console messages
      if (frameCount % 50 === 0) {
        const messages = [
          { level: 'info' as const, message: 'Save game created: Save 42' },
          { level: 'warning' as const, message: 'Script warning: Property "MyRef" not found on SpawnerScript' },
          { level: 'error' as const, message: 'Cannot call GetDistance() on a None reference' },
          { level: 'info' as const, message: 'Quest stage advanced: MainQuest stage 50' }
        ];
        
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        demoMetrics.consoleLog = [
          ...demoMetrics.consoleLog.slice(-50),
          {
            timestamp: new Date().toLocaleTimeString(),
            ...randomMsg
          }
        ];
      } else {
        demoMetrics.consoleLog = metrics?.consoleLog || [];
      }

      setMetrics(demoMetrics);
    }, 100);

    return () => clearInterval(interval);
  };

  const addWatch = () => {
    if (newWatch && !watching.includes(newWatch)) {
      setWatching([...watching, newWatch]);
      setNewWatch('');
    }
  };

  const removeWatch = (watch: string) => {
    setWatching(watching.filter(w => w !== watch));
  };

  const hotReload = async () => {
    try {
      await fetch('http://localhost:21337/game/hotreload', { method: 'POST' });
      alert('Scripts hot-reloaded!');
    } catch (error) {
      alert('Hot reload triggered (demo mode - requires Desktop Bridge)');
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-red-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Live Game Monitor</h1>
              <p className="text-sm text-slate-400">Real-time Fallout 4 debugging</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connected && (
              <button
                onClick={hotReload}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Hot Reload
              </button>
            )}
            
            <button
              onClick={connected ? disconnect : connectToGame}
              className={`px-4 py-2 ${connected ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white font-bold rounded flex items-center gap-2 transition-colors`}
            >
              {connected ? (
                <>
                  <Square className="w-4 h-4" />
                  Disconnect
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Connect to Game
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {!connected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Game Not Connected</h2>
            <p className="text-slate-400 mb-6">Launch Fallout 4 and click Connect to start monitoring</p>
            <button
              onClick={connectToGame}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Play className="w-5 h-5" />
              Start Demo Mode
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden p-6 grid grid-cols-3 gap-4">
          {/* Left Column - Performance */}
          <div className="space-y-4 overflow-y-auto">
            {/* FPS */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">FPS</h3>
                <TrendingUp className={`w-4 h-4 ${metrics && metrics.fps >= 55 ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <div className={`text-5xl font-bold ${metrics && metrics.fps >= 55 ? 'text-green-400' : metrics && metrics.fps >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                {metrics?.fps}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {metrics?.frameTime.toFixed(2)}ms frame time
              </div>
            </div>

            {/* Memory */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h3 className="font-bold text-white mb-3">Memory Usage</h3>
              
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">VRAM</span>
                  <span className="text-white">{metrics?.vram.used.toFixed(0)} / {metrics?.vram.total} MB</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${metrics ? (metrics.vram.used / metrics.vram.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">RAM</span>
                  <span className="text-white">{metrics?.ram.used.toFixed(0)} / {metrics?.ram.total} MB</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${metrics ? (metrics.ram.used / metrics.ram.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Script Performance */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Script Load
              </h3>
              <div className={`text-3xl font-bold mb-1 ${metrics && metrics.scriptTime < 10 ? 'text-green-400' : metrics && metrics.scriptTime < 16 ? 'text-amber-400' : 'text-red-400'}`}>
                {metrics?.scriptTime.toFixed(1)}ms
              </div>
              <div className="text-xs text-slate-400">
                {metrics?.scriptCount} scripts loaded
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-xs font-bold text-slate-400 mb-2">Top Scripts:</div>
                {metrics?.activeScripts.slice(0, 5).map((script, idx) => (
                  <div key={idx} className="bg-slate-950 rounded p-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-mono truncate">{script.name}</span>
                      <span className="text-amber-400">{script.time.toFixed(1)}ms</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${script.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Variable Watch */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                Variables
              </h3>

              {metrics?.variables.map((v, idx) => (
                <div key={idx} className="mb-2 bg-slate-950 rounded p-2">
                  <div className="text-xs text-slate-400">{v.script}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white font-mono">{v.variable}</span>
                    <span className="text-sm text-cyan-400 font-mono">{v.value}</span>
                  </div>
                </div>
              ))}

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newWatch}
                  onChange={(e) => setNewWatch(e.target.value)}
                  placeholder="Script.Variable"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500"
                />
                <button
                  onClick={addWatch}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded transition-colors"
                >
                  Watch
                </button>
              </div>
            </div>
          </div>

          {/* Middle + Right Columns - Console */}
          <div className="col-span-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white">Console Output</h3>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-3 h-3"
                />
                Auto-scroll
              </label>
            </div>

            <div
              ref={consoleRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-slate-950"
            >
              {metrics?.consoleLog.length === 0 && (
                <div className="text-slate-500 text-center py-8">
                  Waiting for console output...
                </div>
              )}
              
              {metrics?.consoleLog.map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${
                    entry.level === 'error' ? 'text-red-400' :
                    entry.level === 'warning' ? 'text-amber-400' :
                    'text-slate-400'
                  }`}
                >
                  <span className="text-slate-600">[{entry.timestamp}]</span>
                  <span className="flex-shrink-0 w-12">
                    {entry.level === 'error' && <span className="text-red-400">ERROR</span>}
                    {entry.level === 'warning' && <span className="text-amber-400">WARN</span>}
                    {entry.level === 'info' && <span className="text-blue-400">INFO</span>}
                  </span>
                  <span className="flex-1">{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
