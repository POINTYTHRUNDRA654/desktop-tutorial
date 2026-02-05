/**
 * Mining Panel Component
 * Provides UI for the Core Mining Infrastructure
 */

import React, { useState, useEffect } from 'react';
import { DataSource, MiningResult, ExtendedMiningResult, ESPFile, ModDependencyGraph } from '../../shared/types';

interface MiningPanelProps {
  // No props needed for route-based component
}

export const MiningPanel = () => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [miningResult, setMiningResult] = useState<ExtendedMiningResult | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'pipeline' | 'esp' | 'dependencies' | 'performance' | 'unused-assets' | 'lod' | 'textures' | 'animations'>('pipeline');

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
    if (!window.electronAPI?.startMiningPipeline) return;

    setIsMining(true);
    try {
      const result = await window.electronAPI.startMiningPipeline(sources);
      if (result.success) {
        setMiningResult(result.result);
      } else {
        console.error('Mining failed:', result.error);
      }
    } catch (error) {
      console.error('Mining error:', error);
    } finally {
      setIsMining(false);
    }
  };

  const parseESPFile = async (filePath: string) => {
    if (!window.electronAPI?.parseESPFile) return;

    try {
      const result = await window.electronAPI.parseESPFile(filePath);
      if (result.success) {
        console.log('ESP parsed:', result.result);
      }
    } catch (error) {
      console.error('ESP parsing error:', error);
    }
  };

  return (
    <div className="mining-panel">
      <div className="mining-panel-header">
        <h2>Core Mining Infrastructure</h2>
      </div>

      <div className="mining-panel-tabs">
        <button
          className={selectedTab === 'pipeline' ? 'active' : ''}
          onClick={() => setSelectedTab('pipeline')}
        >
          Data Pipeline
        </button>
        <button
          className={selectedTab === 'esp' ? 'active' : ''}
          onClick={() => setSelectedTab('esp')}
        >
          ESP Analysis
        </button>
        <button
          className={selectedTab === 'dependencies' ? 'active' : ''}
          onClick={() => setSelectedTab('dependencies')}
        >
          Dependencies
        </button>
        <button
          className={selectedTab === 'performance' ? 'active' : ''}
          onClick={() => setSelectedTab('performance')}
        >
          Performance
        </button>
        <button
          className={selectedTab === 'unused-assets' ? 'active' : ''}
          onClick={() => setSelectedTab('unused-assets')}
        >
          Unused Assets
        </button>
        <button
          className={selectedTab === 'lod' ? 'active' : ''}
          onClick={() => setSelectedTab('lod')}
        >
          LOD Optimization
        </button>
        <button
          className={selectedTab === 'textures' ? 'active' : ''}
          onClick={() => setSelectedTab('textures')}
        >
          Texture Resolution
        </button>
        <button
          className={selectedTab === 'animations' ? 'active' : ''}
          onClick={() => setSelectedTab('animations')}
        >
          Animation Frames
        </button>
      </div>

      <div className="mining-panel-content">
        {selectedTab === 'pipeline' && (
          <div className="pipeline-tab">
            <h3>Multi-Source Data Pipeline</h3>

            <div className="data-sources">
              <h4>Data Sources</h4>
              {sources.map((source, index) => (
                <div key={index} className="data-source-item">
                  <select
                    value={source.type}
                    onChange={(e) => updateSource(index, { type: e.target.value as DataSource['type'] })}
                  >
                    <option value="esp">ESP/ESM Files</option>
                    <option value="nif">NIF Meshes</option>
                    <option value="dds">DDS Textures</option>
                    <option value="hkx">Havok Animations</option>
                    <option value="bsa">BSA Archives</option>
                    <option value="seq">Animation Sequences</option>
                    <option value="log">Log Files</option>
                    <option value="benchmark">Benchmark Data</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Path to data source..."
                    value={source.path}
                    onChange={(e) => updateSource(index, { path: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Priority"
                    value={source.priority}
                    onChange={(e) => updateSource(index, { priority: parseInt(e.target.value) })}
                    min="1"
                    max="10"
                  />
                  <button onClick={() => removeSource(index)}>Remove</button>
                </div>
              ))}
              <button onClick={addDataSource}>Add Data Source</button>
            </div>

            <div className="mining-controls">
              <button
                onClick={startMining}
                disabled={isMining || sources.length === 0}
                className="start-mining-button"
              >
                {isMining ? 'Mining...' : 'Start Mining Pipeline'}
              </button>
            </div>

            {miningResult && (
              <div className="mining-results">
                <h4>Mining Results</h4>
                <div className="result-summary">
                  <p>ESP Files: {miningResult.espData.size}</p>
                  <p>Correlations: {miningResult.correlations.length}</p>
                  <p>Dependencies: {miningResult.dependencyGraph.edges.length}</p>
                  <p>Errors: {miningResult.errors.length}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'esp' && (
          <div className="esp-tab">
            <h3>ESP/ESM File Analysis</h3>
            <div className="esp-controls">
              <input
                type="text"
                placeholder="Enter ESP file path..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    parseESPFile((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <button onClick={() => {
                const input = document.querySelector('.esp-controls input') as HTMLInputElement;
                if (input) parseESPFile(input.value);
              }}>
                Parse ESP
              </button>
            </div>
          </div>
        )}

        {selectedTab === 'dependencies' && (
          <div className="dependencies-tab">
            <h3>Mod Dependency Graph</h3>
            {miningResult?.dependencyGraph && (
              <div className="dependency-graph">
                <p>Nodes: {miningResult.dependencyGraph.nodes.size}</p>
                <p>Edges: {miningResult.dependencyGraph.edges.length}</p>
                <p>Cycles: {miningResult.dependencyGraph.cycles.length}</p>
                <p>Load Order: {miningResult.dependencyGraph.loadOrder.join(' → ')}</p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'performance' && (
          <div className="performance-tab">
            <h3>Performance Metrics Mining</h3>
            {miningResult?.performanceReport && (
              <div className="performance-report">
                <h4>Baseline Metrics</h4>
                <p>FPS: {miningResult.performanceReport.baselineMetrics.fps}</p>
                <p>Memory: {miningResult.performanceReport.baselineMetrics.memoryUsage} MB</p>
                <p>Load Time: {miningResult.performanceReport.baselineMetrics.loadTime}s</p>

                <h4>Recommendations</h4>
                {miningResult.performanceReport.recommendations.map((rec, index) => (
                  <div key={index} className="recommendation">
                    <p><strong>{rec.type.toUpperCase()}</strong>: {rec.description}</p>
                    <p>Confidence: {rec.expectedImprovement.fpsDelta > 0 ? '+' : ''}{rec.expectedImprovement.fpsDelta.toFixed(1)} FPS</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'unused-assets' && (
          <div className="unused-assets-tab">
            <h3>Unused Asset Detection</h3>
            {miningResult?.assetDiscovery?.unusedAssets && (
              <div className="unused-assets-report">
                <div className="summary-stats">
                  <p>Total Assets: {miningResult.assetDiscovery.unusedAssets.totalAssets}</p>
                  <p>Unused Assets: {miningResult.assetDiscovery.unusedAssets.unusedAssets.length}</p>
                  <p>Potential Savings: {(miningResult.assetDiscovery.unusedAssets.potentialSpaceSavings / (1024 * 1024)).toFixed(1)} MB</p>
                </div>

                <h4>Unused Assets by Type</h4>
                <div className="asset-list">
                  {miningResult.assetDiscovery.unusedAssets.unusedAssets.slice(0, 20).map((asset, index) => (
                    <div key={index} className="asset-item">
                      <span className="asset-type">{asset.type}</span>
                      <span className="asset-path">{asset.path}</span>
                      <span className="asset-size">{(asset.size / 1024).toFixed(1)} KB</span>
                      <span className="asset-reason">{asset.reason}</span>
                    </div>
                  ))}
                </div>

                <h4>Recommendations</h4>
                <ul className="recommendations-list">
                  {miningResult.assetDiscovery.unusedAssets.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'lod' && (
          <div className="lod-tab">
            <h3>LOD Optimization Analysis</h3>
            {miningResult?.assetDiscovery?.lodOptimizations && (
              <div className="lod-report">
                <div className="summary-stats">
                  <p>Total Meshes: {miningResult.assetDiscovery.lodOptimizations.totalMeshes}</p>
                  <p>Need Optimization: {miningResult.assetDiscovery.lodOptimizations.optimizedMeshes.length}</p>
                </div>

                <h4>LOD Optimization Opportunities</h4>
                <div className="lod-list">
                  {miningResult.assetDiscovery.lodOptimizations.optimizedMeshes.slice(0, 10).map((opt, index) => (
                    <div key={index} className="lod-item">
                      <h5>{opt.meshPath}</h5>
                      <p>Triangles Saved: {opt.potentialSavings.triangles.toLocaleString()}</p>
                      <p>Issues: {opt.issues.length}</p>
                      <div className="suggestions">
                        {opt.suggestions.slice(0, 2).map((suggestion, sIndex) => (
                          <p key={sIndex}>• {suggestion}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <h4>General Recommendations</h4>
                <ul className="recommendations-list">
                  {miningResult.assetDiscovery.lodOptimizations.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'textures' && (
          <div className="textures-tab">
            <h3>Texture Resolution Analysis</h3>
            {miningResult?.assetDiscovery?.textureResolutions && (
              <div className="texture-report">
                <div className="summary-stats">
                  <p>Total Textures: {miningResult.assetDiscovery.textureResolutions.totalTextures}</p>
                  <p>Need Upscaling: {miningResult.assetDiscovery.textureResolutions.lowResTextures.length}</p>
                  <p>Avg Quality Improvement: {miningResult.assetDiscovery.textureResolutions.potentialQualityImprovement.toFixed(1)}%</p>
                </div>

                <h4>Texture Upscale Opportunities</h4>
                <div className="texture-list">
                  {miningResult.assetDiscovery.textureResolutions.lowResTextures.slice(0, 15).map((texture, index) => (
                    <div key={index} className="texture-item">
                      <span className="texture-type">{texture.texture.usage}</span>
                      <span className="texture-path">{texture.texture.path.split('/').pop()}</span>
                      <span className="current-res">{texture.texture.width}x{texture.texture.height}</span>
                      <span className="target-res">→ {texture.recommendedResolution.width}x{texture.recommendedResolution.height}</span>
                      <span className="priority">{texture.priority}</span>
                      <span className="quality">+{texture.qualityImprovement}%</span>
                    </div>
                  ))}
                </div>

                <h4>Recommendations</h4>
                <ul className="recommendations-list">
                  {miningResult.assetDiscovery.textureResolutions.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'animations' && (
          <div className="animations-tab">
            <h3>Animation Frame Optimization</h3>
            {miningResult?.assetDiscovery?.animationOptimizations && (
              <div className="animation-report">
                <div className="summary-stats">
                  <p>Total Animations: {miningResult.assetDiscovery.animationOptimizations.totalAnimations}</p>
                  <p>Can Optimize: {miningResult.assetDiscovery.animationOptimizations.optimizableAnimations.length}</p>
                  <p>Potential File Savings: {(miningResult.assetDiscovery.animationOptimizations.potentialSavings.totalFileSize / 1024).toFixed(1)} KB</p>
                </div>

                <h4>Animation Optimization Opportunities</h4>
                <div className="animation-list">
                  {miningResult.assetDiscovery.animationOptimizations.optimizableAnimations.slice(0, 10).map((opt, index) => (
                    <div key={index} className="animation-item">
                      <h5>{opt.animation.path.split('/').pop()}</h5>
                      <p>Duration: {opt.animation.duration.toFixed(1)}s</p>
                      <p>Keyframes: {opt.animation.keyframeCount} → {Math.floor(opt.animation.keyframeCount * opt.recommendedKeyframeReduction)}</p>
                      <p>Quality Impact: {opt.qualityImpact}%</p>
                      <div className="suggestions">
                        {opt.suggestions.slice(0, 2).map((suggestion, sIndex) => (
                          <p key={sIndex}>• {suggestion}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <h4>General Recommendations</h4>
                <ul className="recommendations-list">
                  {miningResult.assetDiscovery.animationOptimizations.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};