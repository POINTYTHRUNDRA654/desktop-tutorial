/**
 * Advanced Analysis Panel Component
 * Provides UI for the Advanced Analysis Engine capabilities:
 * - Pattern Recognition Engine
 * - Mod Conflict Prediction (ML-based)
 * - Performance Bottleneck Mining
 * - Memory Usage Analysis
 * - Compatibility Matrix Mining
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  AlertTriangle,
  TrendingDown,
  MemoryStick,
  Network,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  BarChart3,
  Cpu,
  HardDrive,
  Zap
} from 'lucide-react';
import {
  AdvancedAnalysisEngine,
  ConflictPrediction,
  BottleneckAnalysis,
  MemoryAnalysis,
  CompatibilityMatrix,
  AnalysisData,
  PatternRecognitionResult,
  HardwareProfile,
  PerformanceData,
  MemoryData
} from '../../shared/types';

interface AdvancedAnalysisPanelProps {
  onClose?: () => void;
}

export const AdvancedAnalysisPanel: React.FC<AdvancedAnalysisPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'patterns' | 'conflicts' | 'bottlenecks' | 'memory' | 'compatibility'>('patterns');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    patterns?: PatternRecognitionResult;
    conflicts?: ConflictPrediction[];
    bottlenecks?: BottleneckAnalysis;
    memory?: MemoryAnalysis;
    compatibility?: CompatibilityMatrix;
  }>({});

  const defaultHardwareProfile: HardwareProfile = {
    cpu: { model: 'Unknown', cores: 8, threads: 16, baseClock: 3.5, boostClock: 4.2, cache: 16 },
    gpu: { model: 'Unknown', vram: 8192, driverVersion: 'unknown', dxVersion: '12', rayTracing: false },
    ram: { total: 32768, speed: 3200, type: 'DDR4', channels: 2 },
    storage: { type: 'SSD', readSpeed: 3500, writeSpeed: 3000, totalSpace: 1000000, availableSpace: 500000 },
    os: { name: 'Windows', version: 'unknown', architecture: 'x64' }
  };

  // Get analysis engine from electron API
  const getAnalysisEngine = async (): Promise<AdvancedAnalysisEngine | null> => {
    const api = (window as any).electronAPI;
    if (typeof api?.getAdvancedAnalysisEngine === 'function') {
      return await api.getAdvancedAnalysisEngine();
    }
    return null;
  };

  // Run pattern recognition analysis
  const runPatternAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const engine = await getAnalysisEngine();
      if (!engine?.patternRecognition) return;

      // Get current mod data
      const analysisData: AnalysisData = {
        mods: [], // TODO: Get from current load order
        performanceMetrics: [],
        conflicts: [],
        loadOrder: [],
        systemInfo: defaultHardwareProfile
      };

      const result = await engine.patternRecognition.analyze(analysisData);
      setAnalysisResults(prev => ({ ...prev, patterns: result }));
    } catch (error) {
      console.error('Pattern analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run conflict prediction
  const runConflictPrediction = async () => {
    setIsAnalyzing(true);
    try {
      const engine = await getAnalysisEngine();
      if (!engine?.conflictPrediction) return;

      // Get mod pairs to analyze from current load order
      // TODO: Get from current load order instead of hardcoded examples
      const modPairs = [
        { modA: 'Unofficial Fallout 4 Patch', modB: 'F4SE' },
        { modA: 'Armor and Weapon Keywords Community Resource', modB: 'Valdacils Item Sorting' }
      ];

      const predictions: ConflictPrediction[] = [];
      for (const pair of modPairs) {
        const prediction = await engine.conflictPrediction.predict(pair.modA, pair.modB);
        predictions.push(prediction);
      }

      setAnalysisResults(prev => ({ ...prev, conflicts: predictions }));
    } catch (error) {
      console.error('Conflict prediction failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run bottleneck analysis
  const runBottleneckAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const engine = await getAnalysisEngine();
      if (!engine?.bottleneckMining) return;

      const performanceData: PerformanceData = {
        metrics: [], // TODO: Get from performance monitoring
        systemInfo: defaultHardwareProfile,
        loadOrder: [],
        sessionDuration: 3600
      };

      const result = await engine.bottleneckMining.analyze(performanceData);
      setAnalysisResults(prev => ({ ...prev, bottlenecks: result }));
    } catch (error) {
      console.error('Bottleneck analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run memory analysis
  const runMemoryAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const engine = await getAnalysisEngine();
      if (!engine?.memoryAnalysis) return;

      const memoryData: MemoryData = {
        vramSnapshots: [],
        ramSnapshots: [],
        modLoadOrder: [],
        sessionInfo: {
          sessionId: `session_${Date.now()}`,
          startTime: Date.now() - 3600000,
          endTime: Date.now(),
          mods: [],
          peakVRAM: 4096,
          peakRAM: 16384,
          averageFPS: 45,
          initialLoadOrder: [],
          finalLoadOrder: [],
          performanceSnapshots: [],
          events: [],
          userActions: []
        }
      };

      const result = await engine.memoryAnalysis.analyze(memoryData);
      setAnalysisResults(prev => ({ ...prev, memory: result }));
    } catch (error) {
      console.error('Memory analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run compatibility matrix mining
  const runCompatibilityAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const engine = await getAnalysisEngine();
      if (!engine?.compatibilityMining) return;

      const compatibilityData = [
        {
          modA: 'Unofficial Fallout 4 Patch',
          modB: 'F4SE',
          compatible: true,
          testedBy: 'Community',
          timestamp: Date.now(),
          versions: { modA: '4.2.5', modB: '5.8.0' }
        }
      ];

      const result = await engine.compatibilityMining.build(compatibilityData);
      setAnalysisResults(prev => ({ ...prev, compatibility: result }));
    } catch (error) {
      console.error('Compatibility analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const tabs = [
    { id: 'patterns', label: 'Pattern Recognition', icon: Brain, action: runPatternAnalysis },
    { id: 'conflicts', label: 'Conflict Prediction', icon: AlertTriangle, action: runConflictPrediction },
    { id: 'bottlenecks', label: 'Bottleneck Mining', icon: TrendingDown, action: runBottleneckAnalysis },
    { id: 'memory', label: 'Memory Analysis', icon: MemoryStick, action: runMemoryAnalysis },
    { id: 'compatibility', label: 'Compatibility Matrix', icon: Network, action: runCompatibilityAnalysis }
  ];

  return (
    <div className="advanced-analysis-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Brain className="panel-icon" />
          Advanced Analysis Engine
        </h2>
        <div className="panel-controls">
          <Link
            to="/reference"
            className="control-button"
            title="Open help"
          >
            Help
          </Link>
          <button
            className="control-button"
            onClick={() => tabs.find(t => t.id === activeTab)?.action()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? <RefreshCw className="spinning" /> : <Play />}
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
          {onClose && (
            <button className="control-button close" onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>

      <div className="analysis-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon className="tab-icon" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="analysis-content">
        {activeTab === 'patterns' && (
          <div className="analysis-section">
            <h3>Pattern Recognition Engine</h3>
            <p>ML-based analysis of modding patterns and optimization opportunities</p>

            {analysisResults.patterns && (
              <div className="results-grid">
                <div className="result-card">
                  <h4>Detected Patterns</h4>
                  <div className="patterns-list">
                    {analysisResults.patterns.patterns.map((pattern, idx) => (
                      <div key={idx} className="pattern-item">
                        <span className="pattern-type">{pattern.type}</span>
                        <span className="pattern-confidence">Frequency: {pattern.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="result-card">
                  <h4>Recommendations</h4>
                  <div className="recommendations-list">
                    {analysisResults.patterns.recommendations.map((rec, idx) => (
                      <div key={idx} className="recommendation-item">
                        <span className="rec-type">{rec.type}</span>
                        <p>{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'conflicts' && (
          <div className="analysis-section">
            <h3>Mod Conflict Prediction</h3>
            <p>ML-based prediction of potential conflicts before installation</p>

            {analysisResults.conflicts && (
              <div className="conflicts-list">
                {analysisResults.conflicts.map((prediction, idx) => (
                  <div key={idx} className="conflict-card">
                    <div className="conflict-header">
                      <span className="mod-pair">
                        {prediction.modA} ↔ {prediction.modB}
                      </span>
                      <span className={`severity ${prediction.severity}`}>
                        {prediction.severity}
                      </span>
                    </div>

                    <div className="conflict-details">
                      <div className="probability-bar">
                        <div
                          className="probability-fill"
                          style={{ width: `${prediction.probability * 100}%` }}
                        />
                        <span className="probability-text">
                          {Math.round(prediction.probability * 100)}% conflict risk
                        </span>
                      </div>

                      <div className="conflict-types">
                        {prediction.conflictTypes.map((conflictType, typeIdx) => (
                          <span key={typeIdx} className="conflict-type">
                            {conflictType}
                          </span>
                        ))}
                      </div>

                      <div className="recommendations">
                        <h5>Recommendations:</h5>
                        <ul>
                          {prediction.mitigationStrategies.map((rec, recIdx) => (
                            <li key={recIdx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'bottlenecks' && (
          <div className="analysis-section">
            <h3>Performance Bottleneck Mining</h3>
            <p>Identify mods causing the most FPS drops and performance issues</p>

            {analysisResults.bottlenecks && (
              <div className="bottlenecks-grid">
                <div className="result-card">
                  <h4>Critical Path</h4>
                  <div className="critical-path">
                    {analysisResults.bottlenecks.criticalPath.map((mod, idx) => (
                      <div key={idx} className="path-item">
                        <span className="mod-name">{mod}</span>
                        <span className="path-arrow">→</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="result-card">
                  <h4>Performance Bottlenecks</h4>
                  <div className="bottlenecks-list">
                    {[...analysisResults.bottlenecks.primaryBottlenecks, ...analysisResults.bottlenecks.secondaryBottlenecks].map((bottleneck, idx) => (
                      <div key={idx} className="bottleneck-item">
                        <div className="bottleneck-header">
                          <span className="mod-name">{bottleneck.affectedMods.join(', ') || 'Unknown mods'}</span>
                          <span className="impact">-{bottleneck.impact.fps} FPS</span>
                        </div>
                        <div className="bottleneck-details">
                          <span className="bottleneck-type">{bottleneck.type}</span>
                          <div className="mitigation-strategies">
                            {bottleneck.mitigationStrategies.map((strategy, stratIdx) => (
                              <span key={stratIdx} className="strategy">{strategy.description}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="result-card">
                  <h4>Optimization Opportunities</h4>
                  <div className="opportunities-list">
                    {analysisResults.bottlenecks.optimizationOpportunities.map((opp, idx) => (
                      <div key={idx} className="opportunity-item">
                        <div className="opportunity-header">
                          <span className="opp-type">{opp.type}</span>
                          <span className="potential-gain">+{opp.potentialGain.fps} FPS</span>
                        </div>
                        <p className="opp-description">{opp.description}</p>
                        <div className="affected-mods">
                          {opp.affectedMods.map((mod, modIdx) => (
                            <span key={modIdx} className="affected-mod">{mod}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="analysis-section">
            <h3>Memory Usage Analysis</h3>
            <p>Track VRAM/VRAM usage patterns across load orders</p>

            {analysisResults.memory && (
              <div className="memory-grid">
                <div className="result-card">
                  <h4>VRAM Usage</h4>
                  <div className="memory-stats">
                    <div className="stat-item">
                      <HardDrive className="stat-icon" />
                      <div className="stat-details">
                        <span className="stat-value">{Math.round(analysisResults.memory.vramUsage.total)} MB</span>
                        <span className="stat-label">Total VRAM</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <TrendingDown className="stat-icon" />
                      <div className="stat-details">
                        <span className="stat-value">{Math.round(analysisResults.memory.vramUsage.peakUsage)} MB</span>
                        <span className="stat-label">Peak Usage</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="result-card">
                  <h4>RAM Usage</h4>
                  <div className="memory-stats">
                    <div className="stat-item">
                      <MemoryStick className="stat-icon" />
                      <div className="stat-details">
                        <span className="stat-value">{Math.round(analysisResults.memory.systemRamUsage.total)} MB</span>
                        <span className="stat-label">Total RAM</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <TrendingDown className="stat-icon" />
                      <div className="stat-details">
                        <span className="stat-value">{Math.round(analysisResults.memory.systemRamUsage.peakUsage)} MB</span>
                        <span className="stat-label">Peak Usage</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="result-card">
                  <h4>Memory Recommendations</h4>
                  <div className="recommendations-list">
                    {analysisResults.memory.recommendations.map((rec, idx) => (
                      <div key={idx} className="recommendation-item">
                        <span className="rec-type">{rec.type}</span>
                        <p>{rec.description}</p>
                        <span className="savings">Save {rec.potentialSavings} MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compatibility' && (
          <div className="analysis-section">
            <h3>Compatibility Matrix Mining</h3>
            <p>Build dynamic compatibility databases from community data</p>

            {analysisResults.compatibility && (
              <div className="compatibility-content">
                <div className="matrix-stats">
                  <div className="stat-item">
                    <Network className="stat-icon" />
                    <div className="stat-details">
                      <span className="stat-value">{analysisResults.compatibility.matrix.size}</span>
                      <span className="stat-label">Mod Pairs Analyzed</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <BarChart3 className="stat-icon" />
                    <div className="stat-details">
                      <span className="stat-value">{analysisResults.compatibility.dataPoints}</span>
                      <span className="stat-label">Data Points</span>
                    </div>
                  </div>
                </div>

                <div className="compatibility-clusters">
                  <h4>Compatibility Clusters</h4>
                  <div className="clusters-list">
                    {analysisResults.compatibility.clusters.map((cluster, idx) => (
                      <div key={idx} className="cluster-item">
                        <div className="cluster-header">
                          <span className="cluster-id">{cluster.id}</span>
                          <span className="compatibility-score">
                            {Math.round(cluster.compatibility * 100)}% compatible
                          </span>
                        </div>
                        <p className="cluster-description">{cluster.description}</p>
                        <div className="cluster-mods">
                          {cluster.mods.slice(0, 5).map((mod, modIdx) => (
                            <span key={modIdx} className="cluster-mod">{mod}</span>
                          ))}
                          {cluster.mods.length > 5 && (
                            <span className="more-mods">+{cluster.mods.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        .advanced-analysis-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .panel-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: var(--accent-color);
        }

        .panel-controls {
          display: flex;
          gap: 0.5rem;
        }

        .control-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .control-button:hover:not(:disabled) {
          background: var(--bg-hover);
        }

        .control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-button.close {
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: none;
          font-size: 1.25rem;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .analysis-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .tab-button.active {
          border-bottom-color: var(--accent-color);
          color: var(--accent-color);
        }

        .tab-icon {
          width: 1rem;
          height: 1rem;
        }

        .analysis-content {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
        }

        .analysis-section h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
        }

        .analysis-section p {
          margin: 0 0 1rem 0;
          color: var(--text-secondary);
        }

        .results-grid, .bottlenecks-grid, .memory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .result-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .result-card h4 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .patterns-list, .recommendations-list, .opportunities-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .pattern-item, .recommendation-item, .opportunity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border-radius: 0.25rem;
        }

        .pattern-type, .rec-type, .opp-type {
          font-weight: 500;
          color: var(--accent-color);
        }

        .pattern-confidence {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .conflicts-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .conflict-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .conflict-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .mod-pair {
          font-weight: 500;
          color: var(--text-primary);
        }

        .severity {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .severity.minor { background: #fef3c7; color: #92400e; }
        .severity.major { background: #fed7aa; color: #9a3412; }
        .severity.critical { background: #fecaca; color: #991b1b; }

        .probability-bar {
          position: relative;
          height: 1.5rem;
          background: var(--bg-tertiary);
          border-radius: 0.25rem;
          margin-bottom: 1rem;
          overflow: hidden;
        }

        .probability-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%);
          transition: width 0.3s ease;
        }

        .probability-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: 500;
          color: var(--text-primary);
        }

        .critical-path {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .path-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .path-arrow {
          color: var(--text-secondary);
        }

        .bottlenecks-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .bottleneck-item {
          padding: 0.75rem;
          background: var(--bg-tertiary);
          border-radius: 0.375rem;
        }

        .bottleneck-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .impact {
          color: #ef4444;
          font-weight: 600;
        }

        .bottleneck-type {
          color: var(--accent-color);
          font-size: 0.875rem;
        }

        .mitigation-strategies {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-top: 0.5rem;
        }

        .strategy {
          padding: 0.125rem 0.375rem;
          background: var(--bg-primary);
          border-radius: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .memory-stats {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .stat-icon {
          width: 2rem;
          height: 2rem;
          color: var(--accent-color);
        }

        .stat-details {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .matrix-stats {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .clusters-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .cluster-item {
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
        }

        .cluster-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .cluster-id {
          font-weight: 500;
          color: var(--text-primary);
        }

        .compatibility-score {
          color: #10b981;
          font-weight: 500;
        }

        .cluster-description {
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .cluster-mods, .affected-mods {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .cluster-mod, .affected-mod {
          padding: 0.125rem 0.375rem;
          background: var(--bg-tertiary);
          border-radius: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .more-mods {
          color: var(--text-tertiary);
          font-style: italic;
        }

        .savings {
          color: #10b981;
          font-weight: 500;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};