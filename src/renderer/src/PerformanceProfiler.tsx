import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  PerformanceMetrics,
  Bottleneck,
  Optimization,
  LagSpike,
  PerformanceProfilerEngine,
} from '../../shared/types';
import './PerformanceProfiler.css';

interface ProfilingSession {
  id: string;
  startTime: number;
  metrics: PerformanceMetrics[];
  bottlenecks: Bottleneck[];
  optimizations: Optimization[];
}

interface ProfilerUIState {
  mode: 'live' | 'file';
  isRunning: boolean;
  sessionId?: string;
  duration: number;
  metrics: PerformanceMetrics[];
  bottlenecks: Bottleneck[];
  optimizations: Optimization[];
  selectedBottleneck?: Bottleneck;
  showOptimizationWizard: boolean;
  sessions: ProfilingSession[];
}

export const PerformanceProfiler: React.FC = () => {
  const [state, setState] = useState<ProfilerUIState>({
    mode: 'live',
    isRunning: false,
    duration: 0,
    metrics: [],
    bottlenecks: [],
    optimizations: [],
    showOptimizationWizard: false,
    sessions: [],
  });

  const timerRef = useRef<NodeJS.Timeout>();
  const metricsIntervalRef = useRef<NodeJS.Timeout>();

  // Mock data generator for live profiling
  const generateMockMetrics = (): PerformanceMetrics => ({
    fps: {
      average: Math.random() * 30 + 40,
      min: Math.random() * 20 + 20,
      max: Math.random() * 20 + 60,
      percentile95: Math.random() * 30 + 45,
      frameTimeMs: Array.from({ length: 100 }, () => Math.random() * 33 + 16),
    },
    memory: {
      totalUsed: Math.random() * 1000 + 2000,
      textureMemory: Math.random() * 500 + 800,
      meshMemory: Math.random() * 300 + 400,
      scriptMemory: Math.random() * 200 + 100,
      peak: Math.random() * 1500 + 3000,
    },
    cpu: {
      totalUsage: Math.random() * 60 + 20,
      mainThread: Math.random() * 40 + 15,
      renderThread: Math.random() * 30 + 10,
      scriptThread: Math.random() * 20 + 5,
    },
    gpu: {
      usage: Math.random() * 80 + 10,
      memoryUsed: Math.random() * 2048 + 1024,
      drawCalls: Math.floor(Math.random() * 3000 + 1000),
      triangles: Math.floor(Math.random() * 5000000 + 2000000),
      shaders: Math.floor(Math.random() * 500 + 200),
    },
    scripts: {
      stackDumps: Math.floor(Math.random() * 20),
      suspendedStacks: Math.floor(Math.random() * 10),
      eventsPerSecond: Math.random() * 100 + 50,
      lagSpikes: Array.from({ length: Math.floor(Math.random() * 3) }, () => ({
        timestamp: Date.now(),
        duration: Math.random() * 100 + 50,
        scriptName: `Script_${Math.floor(Math.random() * 10)}`,
        functionName: `Function_${Math.floor(Math.random() * 20)}`,
        stackTrace: ['call_1', 'call_2', 'call_3'],
      })),
    },
  });

  // Mock bottlenecks
  const mockBottlenecks: Bottleneck[] = [
    {
      type: 'gpu',
      severity: 'high',
      description: 'High poly mesh: weapon.nif (250k triangles)',
      component: 'weapon.nif',
      impact: 0.85,
    },
    {
      type: 'memory',
      severity: 'high',
      description: 'Large texture: armor_diffuse.dds (8192x8192)',
      component: 'armor_diffuse.dds',
      impact: 0.72,
    },
    {
      type: 'script',
      severity: 'medium',
      description: 'Script lag: MyScript.psc (25ms average)',
      component: 'MyScript.psc',
      impact: 0.65,
    },
    {
      type: 'cpu',
      severity: 'medium',
      description: 'CPU spike during NPC spawning',
      component: 'NPC Manager',
      impact: 0.58,
    },
    {
      type: 'io',
      severity: 'low',
      description: 'Disk I/O during asset loading',
      component: 'Asset Manager',
      impact: 0.42,
    },
  ];

  const handleStartProfiling = () => {
    const sessionId = `session-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      isRunning: true,
      sessionId,
      duration: 0,
      metrics: [],
      bottlenecks: [],
      optimizations: [],
    }));

    // Timer for duration display
    timerRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        duration: prev.duration + 1,
      }));
    }, 1000);

    // Metrics collection
    metricsIntervalRef.current = setInterval(() => {
      const newMetrics = generateMockMetrics();
      setState((prev) => ({
        ...prev,
        metrics: [...prev.metrics, newMetrics].slice(-300), // Keep last 300 samples
      }));
    }, 100);
  };

  const handleStopProfiling = () => {
    clearInterval(timerRef.current);
    clearInterval(metricsIntervalRef.current);

    setState((prev) => ({
      ...prev,
      isRunning: false,
      bottlenecks: mockBottlenecks,
      optimizations: [],
      sessions: [
        ...prev.sessions,
        {
          id: prev.sessionId || `session-${Date.now()}`,
          startTime: Date.now() - prev.duration * 1000,
          metrics: prev.metrics,
          bottlenecks: mockBottlenecks,
          optimizations: [],
        },
      ],
    }));
  };

  const handleExportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      duration: state.duration,
      metrics: state.metrics,
      bottlenecks: state.bottlenecks,
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-report-${Date.now()}.json`;
    link.click();
  };

  const handleLoadFile = async () => {
    // Placeholder for file loading functionality
    console.log('Load papyrus log or NIF file');
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(
      2,
      '0'
    )}`;
  };

  // Prepare chart data
  const fpsChartData = state.metrics.map((m, i) => ({
    time: i,
    avg: Math.round(m.fps.average * 10) / 10,
    min: Math.round(m.fps.min * 10) / 10,
    max: Math.round(m.fps.max * 10) / 10,
  }));

  const memoryChartData = state.metrics.map((m, i) => ({
    time: i,
    texture: Math.round(m.memory.textureMemory),
    mesh: Math.round(m.memory.meshMemory),
    script: Math.round(m.memory.scriptMemory),
  }));

  const cpuGpuChartData = state.metrics.map((m, i) => ({
    time: i,
    cpu: Math.round(m.cpu.totalUsage * 10) / 10,
    gpu: Math.round(m.gpu.usage * 10) / 10,
  }));

  const scriptChartData = state.metrics
    .slice(-10)
    .map((m) => m.scripts.lagSpikes)
    .flat()
    .slice(0, 10)
    .map((spike, i) => ({
      name: `${spike.scriptName}.${spike.functionName}`,
      duration: Math.round(spike.duration),
      index: i,
    }));

  return (
    <div className="profiler-container">
      {/* Header */}
      <div className="profiler-header">
        <h1>Performance Profiler</h1>
        <div className="mode-indicator">
          {state.isRunning && <span className="recording-badge">● RECORDING</span>}
        </div>
      </div>

      <div className="profiler-layout">
        {/* Left Control Panel */}
        <div className="profiler-sidebar">
          <div className="control-section">
            <h3>Profiling Mode</h3>
            <div className="mode-toggle">
              <label className="radio-option">
                <input
                  type="radio"
                  checked={state.mode === 'live'}
                  onChange={() => setState((prev) => ({ ...prev, mode: 'live' }))}
                  disabled={state.isRunning}
                />
                <span>Live Profiling</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  checked={state.mode === 'file'}
                  onChange={() => setState((prev) => ({ ...prev, mode: 'file' }))}
                  disabled={state.isRunning}
                />
                <span>File Analysis</span>
              </label>
            </div>
          </div>

          <div className="control-section">
            <h3>Session Control</h3>
            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={handleStartProfiling}
                disabled={state.isRunning}
              >
                Start
              </button>
              <button
                className="btn btn-danger"
                onClick={handleStopProfiling}
                disabled={!state.isRunning}
              >
                Stop
              </button>
            </div>
            <button className="btn btn-secondary" onClick={handleExportReport}>
              Export
            </button>
            {state.mode === 'file' && (
              <button className="btn btn-secondary" onClick={handleLoadFile}>
                Load File
              </button>
            )}
          </div>

          <div className="control-section">
            <h3>Duration</h3>
            <div className="duration-display">{formatDuration(state.duration)}</div>
          </div>

          <div className="control-section">
            <h3>Session History</h3>
            <div className="session-list">
              {state.sessions.length === 0 ? (
                <p className="no-sessions">No sessions yet</p>
              ) : (
                state.sessions.slice(-5).map((session) => (
                  <div key={session.id} className="session-item">
                    <small>{new Date(session.startTime).toLocaleTimeString()}</small>
                    <small className="session-duration">{formatDuration(session.metrics.length / 10)}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="profiler-content">
          {/* FPS Graph */}
          <div className="chart-widget">
            <h3>FPS Performance</h3>
            {fpsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={fpsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    name="Average"
                  />
                  <Line type="monotone" dataKey="min" stroke="#F59E0B" strokeWidth={1} dot={false} name="Min" />
                  <Line type="monotone" dataKey="max" stroke="#EF4444" strokeWidth={1} dot={false} name="Max" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-placeholder">Start profiling to see FPS data...</div>
            )}
          </div>

          {/* Memory Usage */}
          <div className="chart-widget">
            <h3>Memory Usage</h3>
            {memoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={memoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="texture"
                    stackId="1"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    name="Texture Memory"
                  />
                  <Area
                    type="monotone"
                    dataKey="mesh"
                    stackId="1"
                    stroke="#06B6D4"
                    fill="#06B6D4"
                    name="Mesh Memory"
                  />
                  <Area
                    type="monotone"
                    dataKey="script"
                    stackId="1"
                    stroke="#EC4899"
                    fill="#EC4899"
                    name="Script Memory"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-placeholder">Start profiling to see memory data...</div>
            )}
          </div>

          {/* CPU & GPU */}
          <div className="chart-widget">
            <h3>CPU &amp; GPU Usage</h3>
            {cpuGpuChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={cpuGpuChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="cpu" stroke="#F59E0B" strokeWidth={2} dot={false} name="CPU %" />
                  <Line type="monotone" dataKey="gpu" stroke="#10B981" strokeWidth={2} dot={false} name="GPU %" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-placeholder">Start profiling to see CPU/GPU data...</div>
            )}
          </div>

          {/* Script Performance Table */}
          <div className="chart-widget">
            <h3>Script Performance (Top 10 Lag Spikes)</h3>
            {scriptChartData.length > 0 ? (
              <div className="script-table">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Script.Function</th>
                      <th>Duration (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scriptChartData.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td className="script-name">{item.name}</td>
                        <td className="duration-cell">{item.duration.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="chart-placeholder">No lag spikes detected...</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottlenecks Section */}
      {state.bottlenecks.length > 0 && (
        <div className="bottlenecks-section">
          <div className="bottlenecks-header">
            <h2>⚠️ Bottlenecks Detected: {state.bottlenecks.length}</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setState((prev) => ({ ...prev, showOptimizationWizard: true }))}
            >
              View Recommendations
            </button>
          </div>

          <div className="bottlenecks-list">
            {state.bottlenecks.map((bottleneck, idx) => (
              <div
                key={idx}
                className={`bottleneck-item severity-${bottleneck.severity}`}
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    selectedBottleneck: bottleneck,
                    showOptimizationWizard: true,
                  }))
                }
              >
                <div className="bottleneck-icon">
                  {bottleneck.severity === 'critical' && '🔴'}
                  {bottleneck.severity === 'high' && '🟠'}
                  {bottleneck.severity === 'medium' && '🟡'}
                  {bottleneck.severity === 'low' && '🟢'}
                </div>
                <div className="bottleneck-info">
                  <strong>{bottleneck.description}</strong>
                  <small>Type: {bottleneck.type} | Impact: {Math.round(bottleneck.impact * 100)}%</small>
                </div>
                <div className="impact-bar">
                  <div className="impact-fill" style={{ width: `${bottleneck.impact * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Wizard Modal */}
      {state.showOptimizationWizard && (
        <div className="modal-overlay" onClick={() => setState((prev) => ({ ...prev, showOptimizationWizard: false }))}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Optimization Recommendations</h2>
              <button
                className="close-btn"
                onClick={() => setState((prev) => ({ ...prev, showOptimizationWizard: false }))}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {state.selectedBottleneck ? (
                <div className="recommendation-card">
                  <h3>{state.selectedBottleneck.description}</h3>
                  <div className="recommendation-details">
                    <p>
                      <strong>Type:</strong> {state.selectedBottleneck.type}
                    </p>
                    <p>
                      <strong>Severity:</strong> {state.selectedBottleneck.severity}
                    </p>
                    <p>
                      <strong>Impact Score:</strong> {Math.round(state.selectedBottleneck.impact * 100)}%
                    </p>
                  </div>

                  <div className="optimization-steps">
                    <h4>Recommended Optimizations:</h4>
                    <ol>
                      <li>
                        <strong>Reduce Polygon Count:</strong> Consider LOD (Level of Detail) models or mesh
                        optimization
                      </li>
                      <li>
                        <strong>Optimize Textures:</strong> Use smaller resolutions or compressed formats
                      </li>
                      <li>
                        <strong>Material Consolidation:</strong> Reduce material count and draw calls
                      </li>
                      <li>
                        <strong>Script Optimization:</strong> Profile and optimize hot code paths
                      </li>
                    </ol>
                  </div>

                  <button className="btn btn-primary btn-lg">Apply Optimization</button>
                  <button className="btn btn-secondary btn-lg">Go to File</button>
                </div>
              ) : (
                <div className="recommendation-list">
                  {state.bottlenecks.slice(0, 5).map((bottleneck, idx) => (
                    <div
                      key={idx}
                      className="recommendation-item"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          selectedBottleneck: bottleneck,
                        }))
                      }
                    >
                      <span className="rec-severity" data-severity={bottleneck.severity}>
                        {bottleneck.severity.toUpperCase()}
                      </span>
                      <span className="rec-description">{bottleneck.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setState((prev) => ({ ...prev, showOptimizationWizard: false }))}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceProfiler;
