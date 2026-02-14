/**
 * Mining Hub - Unified Mining & Analysis Interface
 * Consolidates MiningPanel, MiningDashboard, and AdvancedAnalysisPanel
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Activity, Zap, TrendingUp, Settings } from 'lucide-react';
import type { DataSource, MiningResult, ExtendedMiningResult } from '../../shared/types';

type TabType = 'pipeline' | 'dashboard' | 'analysis' | 'system';

interface MiningHubProps {
  embedded?: boolean;
}

export const MiningHub: React.FC<MiningHubProps> = ({ embedded = false }) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Check URL params for tab
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['pipeline', 'dashboard', 'analysis', 'system'].includes(tab)) {
      return tab as TabType;
    }
    return 'pipeline';
  });

  return (
    <div className={embedded ? "p-4" : "min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-white"}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        {!embedded && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-green-400 flex items-center gap-2">
                  <Database className="w-8 h-8" />
                  Mining & Analysis Hub
                </h1>
                <p className="text-slate-400 mt-1">
                  Unified interface for asset mining, batch operations, and advanced analysis
                </p>
              </div>
              <Link
                to="/learn"
                className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-slate-900/40 border border-slate-700 text-slate-200 hover:bg-slate-900/60 transition-colors"
              >
                Help
              </Link>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-700 pb-2">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'pipeline'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Database className="w-4 h-4" />
                Pipeline
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Activity className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'analysis'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Zap className="w-4 h-4" />
                Advanced Analysis
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'system'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Settings className="w-4 h-4" />
                System
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-6">
          {activeTab === 'pipeline' && <PipelineTab />}
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'analysis' && <AnalysisTab />}
          {activeTab === 'system' && <SystemTab />}
        </div>
      </div>
    </div>
  );
};

/**
 * Pipeline Tab - Asset discovery and mining operations
 */
const PipelineTab: React.FC = () => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [miningResult, setMiningResult] = useState<any>(null);
  const [isMining, setIsMining] = useState(false);

  const addDataSource = () => {
    const newSource: DataSource = {
      type: 'esp',
      path: '',
      priority: 1
    };
    setSources([...sources, newSource]);
  };

  const updateSource = (index: number, updates: Partial<DataSource>) => {
    const updatedSources = [...sources];
    updatedSources[index] = { ...updatedSources[index], ...updates };
    setSources(updatedSources);
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const startMining = async () => {
    if (!window.electronAPI?.startMiningPipeline) {
      alert('Mining pipeline not available');
      return;
    }

    setIsMining(true);
    try {
      const result = await window.electronAPI.startMiningPipeline(sources);
      setMiningResult(result);
    } catch (error) {
      console.error('Mining error:', error);
      alert('Mining failed: ' + (error as Error).message);
    } finally {
      setIsMining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Asset Mining Pipeline</h3>
        <p className="text-sm text-slate-400 mb-4">
          Configure data sources and run mining operations to discover assets, dependencies, and optimization opportunities.
        </p>
      </div>

      {/* Data Sources */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white">Data Sources</h4>
          <button
            onClick={addDataSource}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-bold"
          >
            + Add Source
          </button>
        </div>

        {sources.length === 0 && (
          <div className="p-4 bg-slate-800 rounded border border-slate-700 text-slate-400 text-sm">
            No data sources configured. Click "Add Source" to get started.
          </div>
        )}

        {sources.map((source, index) => (
          <div key={index} className="p-4 bg-slate-800 rounded border border-slate-700 space-y-2">
            <div className="flex gap-2">
              <select
                value={source.type}
                onChange={(e) => updateSource(index, { type: e.target.value as any })}
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm"
              >
                <option value="esp">ESP Plugin</option>
                <option value="ba2">BA2 Archive</option>
                <option value="folder">Folder</option>
              </select>
              <input
                type="text"
                placeholder="Path..."
                value={source.path}
                onChange={(e) => updateSource(index, { path: e.target.value })}
                className="flex-[2] bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={() => removeSource(index)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-bold"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Start Mining */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="text-sm text-slate-400">
          {sources.length} source(s) configured
        </div>
        <button
          onClick={startMining}
          disabled={isMining || sources.length === 0}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 rounded-lg font-bold flex items-center gap-2"
        >
          {isMining ? (
            <>
              <Activity className="w-5 h-5 animate-spin" />
              Mining...
            </>
          ) : (
            <>
              <Database className="w-5 h-5" />
              Start Mining
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {miningResult && (
        <div className="mt-6 p-4 bg-green-900/20 border border-green-700 rounded">
          <h4 className="font-bold text-green-300 mb-2">Mining Complete</h4>
          <pre className="text-xs text-slate-300 overflow-x-auto">
            {JSON.stringify(miningResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

/**
 * Dashboard Tab - Real-time monitoring and batch operations
 */
const DashboardTab: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [batchJobs, setBatchJobs] = useState<any[]>([]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    if (!window.electronAPI?.getMiningStatus) return;
    try {
      const data = await window.electronAPI.getMiningStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Real-Time Dashboard</h3>
        <p className="text-sm text-slate-400 mb-4">
          Monitor active mining operations, batch jobs, and system health.
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800 rounded border border-slate-700">
          <div className="text-2xl font-bold text-green-400">{status?.totalSessionsMonitored || 0}</div>
          <div className="text-xs text-slate-400">Sessions Monitored</div>
        </div>
        <div className="p-4 bg-slate-800 rounded border border-slate-700">
          <div className="text-2xl font-bold text-blue-400">{status?.insightsGenerated || 0}</div>
          <div className="text-xs text-slate-400">Insights Generated</div>
        </div>
        <div className="p-4 bg-slate-800 rounded border border-slate-700">
          <div className="text-2xl font-bold text-amber-400">{status?.conflictsResolved || 0}</div>
          <div className="text-xs text-slate-400">Conflicts Resolved</div>
        </div>
        <div className="p-4 bg-slate-800 rounded border border-slate-700">
          <div className="text-2xl font-bold text-purple-400">{status?.optimizationsApplied || 0}</div>
          <div className="text-xs text-slate-400">Optimizations Applied</div>
        </div>
      </div>

      {/* Batch Jobs */}
      <div>
        <h4 className="font-bold text-white mb-3">Batch Operations</h4>
        {batchJobs.length === 0 ? (
          <div className="p-4 bg-slate-800 rounded border border-slate-700 text-slate-400 text-sm">
            No active batch jobs. Start mining to see operations here.
          </div>
        ) : (
          <div className="space-y-2">
            {batchJobs.map((job, i) => (
              <div key={i} className="p-3 bg-slate-800 rounded border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">{job.type}</span>
                  <span className="text-xs text-slate-400">{job.status}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Analysis Tab - ML-powered pattern recognition and predictions
 */
const AnalysisTab: React.FC = () => {
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Mock analysis for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAnalysisResults({
        patterns: [
          { type: 'texture_redundancy', severity: 'medium', count: 12 },
          { type: 'mesh_optimization', severity: 'low', count: 5 },
          { type: 'script_conflicts', severity: 'high', count: 3 },
        ],
        predictions: [
          { type: 'performance_bottleneck', location: 'WorldSpace', confidence: 0.87 },
          { type: 'memory_leak', location: 'ScriptEngine', confidence: 0.65 },
        ],
        recommendations: [
          { action: 'Optimize textures', impact: 'high', effort: 'medium' },
          { action: 'Merge mesh LODs', impact: 'medium', effort: 'low' },
          { action: 'Refactor quest scripts', impact: 'high', effort: 'high' },
        ]
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Advanced Analysis</h3>
        <p className="text-sm text-slate-400 mb-4">
          ML-powered pattern recognition, conflict prediction, and performance optimization suggestions.
        </p>
      </div>

      <button
        onClick={runAnalysis}
        disabled={isAnalyzing}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 rounded-lg font-bold"
      >
        {isAnalyzing ? 'Analyzing...' : 'Run Advanced Analysis'}
      </button>

      {analysisResults && (
        <div className="space-y-4">
          {/* Patterns */}
          <div>
            <h4 className="font-bold text-white mb-2">Detected Patterns</h4>
            <div className="space-y-2">
              {analysisResults.patterns.map((pattern: any, i: number) => (
                <div key={i} className={`p-3 rounded border ${
                  pattern.severity === 'high' ? 'bg-red-900/20 border-red-700' :
                  pattern.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-700' :
                  'bg-blue-900/20 border-blue-700'
                }`}>
                  <div className="font-bold">{pattern.type.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-slate-400">{pattern.count} instances found</div>
                </div>
              ))}
            </div>
          </div>

          {/* Predictions */}
          <div>
            <h4 className="font-bold text-white mb-2">Predictions</h4>
            <div className="space-y-2">
              {analysisResults.predictions.map((pred: any, i: number) => (
                <div key={i} className="p-3 bg-slate-800 rounded border border-slate-700">
                  <div className="flex justify-between">
                    <span className="font-bold">{pred.type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-400">{Math.round(pred.confidence * 100)}% confidence</span>
                  </div>
                  <div className="text-sm text-slate-400">{pred.location}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="font-bold text-white mb-2">Recommendations</h4>
            <div className="space-y-2">
              {analysisResults.recommendations.map((rec: any, i: number) => (
                <div key={i} className="p-3 bg-green-900/20 border border-green-700 rounded">
                  <div className="font-bold text-green-300">{rec.action}</div>
                  <div className="text-sm text-slate-400">
                    Impact: {rec.impact} • Effort: {rec.effort}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * System Tab - System health and configuration
 */
const SystemTab: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    // Mock system health for now
    setSystemHealth({
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      networkActivity: Math.random() * 10,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-3">System Health</h3>
        <p className="text-sm text-slate-400 mb-4">
          Monitor system resources and mining infrastructure status.
        </p>
      </div>

      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800 rounded border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-white">CPU Usage</span>
              <span className="text-sm text-slate-400">{Math.round(systemHealth.cpuUsage)}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${systemHealth.cpuUsage}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-800 rounded border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-white">Memory Usage</span>
              <span className="text-sm text-slate-400">{Math.round(systemHealth.memoryUsage)}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${systemHealth.memoryUsage}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-800 rounded border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-white">Disk Usage</span>
              <span className="text-sm text-slate-400">{Math.round(systemHealth.diskUsage)}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all"
                style={{ width: `${systemHealth.diskUsage}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-800 rounded border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-white">Network Activity</span>
              <span className="text-sm text-slate-400">{systemHealth.networkActivity.toFixed(1)} MB/s</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(systemHealth.networkActivity * 10, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiningHub;
