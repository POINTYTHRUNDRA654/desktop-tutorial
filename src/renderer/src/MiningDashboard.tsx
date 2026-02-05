/**
 * Mining Dashboard Component
 *
 * Comprehensive UI for real-time mining operations in Mossy
 */

import React, { useState, useEffect } from 'react';

interface MiningStatus {
  isActive: boolean;
  activeEngines: string[];
  lastUpdate: Date;
  totalSessionsMonitored: number;
  insightsGenerated: number;
  conflictsResolved: number;
  optimizationsApplied: number;
}

interface MiningResults {
  liveSessionData: any;
  collaborativeInsights: any;
  specializedAnalysis: any;
  automationResults: any;
  assetCorrelationData: any;
  patternRecognitionData: any;
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkActivity: number;
  };
  recommendations: Array<{
    type: 'optimization' | 'conflict' | 'workflow' | 'maintenance';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    action: string;
    estimatedImpact: string;
  }>;
}

interface BatchJob {
  id: string;
  type: 'texture_optimization' | 'mesh_optimization' | 'script_compilation' | 'archive_merge';
  files: string[];
  settings: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results: any[];
  errors: string[];
  startTime?: Date;
  endTime?: Date;
}

export const MiningDashboard: React.FC = () => {
  const [miningStatus, setMiningStatus] = useState<MiningStatus | null>(null);
  const [miningResults, setMiningResults] = useState<MiningResults | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'live-session' | 'collaborative' | 'specialized' | 'automation' | 'asset-correlation' | 'pattern-recognition' | 'system'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<{
    nif: string[];
    dds: string[];
    ba2: string[];
    papyrus: string[];
  }>({
    nif: [],
    dds: [],
    ba2: [],
    papyrus: []
  });

  // Load mining status on mount
  useEffect(() => {
    loadMiningStatus();
    const interval = setInterval(loadMiningStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMiningStatus = async () => {
    try {
      const status = await window.electronAPI?.invoke('mining-get-status');
      if (status) {
        setMiningStatus(status);
      }
    } catch (error) {
      console.error('Failed to load mining status:', error);
    }
  };

  const loadMiningResults = async () => {
    setIsLoading(true);
    try {
      const results = await window.electronAPI?.invoke('mining-get-results');
      if (results) {
        setMiningResults(results);
      }
    } catch (error) {
      console.error('Failed to load mining results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startMining = async () => {
    try {
      await window.electronAPI?.invoke('mining-start');
      await loadMiningStatus();
    } catch (error) {
      console.error('Failed to start mining:', error);
    }
  };

  const stopMining = async () => {
    try {
      await window.electronAPI?.invoke('mining-stop');
      await loadMiningStatus();
    } catch (error) {
      console.error('Failed to stop mining:', error);
    }
  };

  // Phase 1: Asset Correlation Engine Handlers
  const startAssetCorrelation = async () => {
    try {
      await window.electronAPI?.invoke('mining-asset-correlation-start');
      await loadMiningStatus();
    } catch (error) {
      console.error('Failed to start asset correlation:', error);
    }
  };

  const stopAssetCorrelation = async () => {
    try {
      await window.electronAPI?.invoke('mining-asset-correlation-stop');
      await loadMiningStatus();
    } catch (error) {
      console.error('Failed to stop asset correlation:', error);
    }
  };

  const loadAssetCorrelationResults = async () => {
    setIsLoading(true);
    try {
      const results = await window.electronAPI?.invoke('mining-asset-correlation-results');
      if (results) {
        setMiningResults(prev => prev ? { ...prev, assetCorrelationData: results } : { assetCorrelationData: results } as any);
      }
    } catch (error) {
      console.error('Failed to load asset correlation results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 1: Pattern Recognition Engine Handlers
  const startPatternRecognition = async () => {
    try {
      await window.electronAPI?.invoke('mining-pattern-recognition-start');
      await loadMiningStatus();
    } catch (error) {
      console.error('Failed to start pattern recognition:', error);
    }
  };

  const stopPatternRecognition = async () => {
    try {
      await window.electronAPI?.invoke('mining-pattern-recognition-stop');
      await loadMiningStatus();
    } catch (error) {
      console.error('Failed to stop pattern recognition:', error);
    }
  };

  const loadPatternRecognitionResults = async () => {
    setIsLoading(true);
    try {
      const results = await window.electronAPI?.invoke('mining-pattern-recognition-results');
      if (results) {
        setMiningResults(prev => prev ? { ...prev, patternRecognitionData: results } : { patternRecognitionData: results } as any);
      }
    } catch (error) {
      console.error('Failed to load pattern recognition results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const performDeepAnalysis = async () => {
    setIsLoading(true);
    try {
      const results = await window.electronAPI?.invoke('mining-deep-analysis', {
        nifFiles: selectedFiles.nif,
        ddsFiles: selectedFiles.dds,
        ba2Files: selectedFiles.ba2,
        papyrusFiles: selectedFiles.papyrus
      });
      if (results) {
        setMiningResults(prev => prev ? { ...prev, specializedAnalysis: results } : { specializedAnalysis: results } as any);
      }
    } catch (error) {
      console.error('Failed to perform deep analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeBatchJob = async (jobType: string, files: string[]) => {
    const job: BatchJob = {
      id: `job_${Date.now()}`,
      type: jobType as any,
      files,
      settings: {},
      status: 'pending',
      progress: 0,
      results: [],
      errors: []
    };

    setBatchJobs(prev => [...prev, job]);

    try {
      const result = await window.electronAPI?.invoke('mining-batch-job', job);
      if (result) {
        setBatchJobs(prev => prev.map(j => j.id === job.id ? { ...j, ...result } : j));
      }
    } catch (error) {
      console.error('Failed to execute batch job:', error);
      setBatchJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed', errors: [error.message] } : j));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="mining-dashboard p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mining Operations Dashboard</h1>
        <p className="text-gray-600">Real-time analysis and automation for Fallout 4 modding</p>
      </div>

      {/* Mining Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Mining Status</h2>
          <div className="flex space-x-2">
            {!miningStatus?.isActive ? (
              <button
                onClick={startMining}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Start Mining
              </button>
            ) : (
              <button
                onClick={stopMining}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop Mining
              </button>
            )}
            <button
              onClick={loadMiningResults}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh Results'}
            </button>
          </div>
        </div>

        {miningStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${miningStatus.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {miningStatus.isActive ? 'Active' : 'Inactive'}
              </div>
              <p className="text-sm text-gray-600 mt-1">Status</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{miningStatus.activeEngines.length}</div>
              <p className="text-sm text-gray-600">Active Engines</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{miningStatus.totalSessionsMonitored}</div>
              <p className="text-sm text-gray-600">Sessions Monitored</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{miningStatus.insightsGenerated}</div>
              <p className="text-sm text-gray-600">Insights Generated</p>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'live-session', label: 'Live Session' },
              { id: 'collaborative', label: 'Collaborative' },
              { id: 'specialized', label: 'Specialized Analysis' },
              { id: 'automation', label: 'Automation' },
              { id: 'asset-correlation', label: 'Asset Correlation' },
              { id: 'pattern-recognition', label: 'Pattern Recognition' },
              { id: 'system', label: 'System Health' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recommendations */}
              {miningResults?.recommendations && miningResults.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Priority Recommendations</h3>
                  <div className="space-y-3">
                    {miningResults.recommendations.slice(0, 5).map((rec, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                                {rec.priority.toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-600 capitalize">{rec.type}</span>
                            </div>
                            <h4 className="font-medium text-gray-900">{rec.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                            <p className="text-sm font-medium text-blue-600 mt-2">Action: {rec.action}</p>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {rec.estimatedImpact}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Conflicts Resolved</h4>
                  <div className="text-2xl font-bold text-green-600">{miningStatus?.conflictsResolved || 0}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Optimizations Applied</h4>
                  <div className="text-2xl font-bold text-blue-600">{miningStatus?.optimizationsApplied || 0}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Active Batch Jobs</h4>
                  <div className="text-2xl font-bold text-purple-600">{batchJobs.filter(j => j.status === 'running').length}</div>
                </div>
              </div>
            </div>
          )}

          {/* Live Session Tab */}
          {activeTab === 'live-session' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Live Session Monitoring</h3>
                {miningResults?.liveSessionData ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Active Processes</h4>
                      <div className="text-sm text-gray-600">
                        Monitoring Creation Kit, xEdit, NifSkope, and Blender sessions
                      </div>
                    </div>
                    {miningResults.liveSessionData.sessionInsights && (
                      <div>
                        <h4 className="font-medium mb-2">Session Insights</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {miningResults.liveSessionData.sessionInsights.map((insight: string, index: number) => (
                            <li key={index}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No live session data available</p>
                )}
              </div>
            </div>
          )}

          {/* Collaborative Tab */}
          {activeTab === 'collaborative' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Community Insights</h3>
                {miningResults?.collaborativeInsights ? (
                  <div className="space-y-4">
                    {miningResults.collaborativeInsights.insights && (
                      <div>
                        <h4 className="font-medium mb-2">Community Patterns</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {miningResults.collaborativeInsights.insights.map((insight: string, index: number) => (
                            <li key={index}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {miningResults.collaborativeInsights.trendingIssues && (
                      <div>
                        <h4 className="font-medium mb-2">Trending Issues</h4>
                        <div className="space-y-2">
                          {miningResults.collaborativeInsights.trendingIssues.slice(0, 3).map((issue: any, index: number) => (
                            <div key={index} className="border rounded p-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{issue.description}</span>
                                <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(issue.severity)}`}>
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Affected: {issue.affectedUsers} users, Growth: {issue.growthRate.toFixed(1)}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No collaborative insights available</p>
                )}
              </div>
            </div>
          )}

          {/* Specialized Analysis Tab */}
          {activeTab === 'specialized' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Deep Asset Analysis</h3>

                {/* File Selection */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Select Files for Analysis</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NIF Files</label>
                      <input
                        type="file"
                        multiple
                        accept=".nif"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).map(f => f.path);
                          setSelectedFiles(prev => ({ ...prev, nif: files }));
                        }}
                        className="w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">DDS Files</label>
                      <input
                        type="file"
                        multiple
                        accept=".dds"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).map(f => f.path);
                          setSelectedFiles(prev => ({ ...prev, dds: files }));
                        }}
                        className="w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">BA2 Files</label>
                      <input
                        type="file"
                        multiple
                        accept=".ba2"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).map(f => f.path);
                          setSelectedFiles(prev => ({ ...prev, ba2: files }));
                        }}
                        className="w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Papyrus Files</label>
                      <input
                        type="file"
                        multiple
                        accept=".psc"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).map(f => f.path);
                          setSelectedFiles(prev => ({ ...prev, papyrus: files }));
                        }}
                        className="w-full text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={performDeepAnalysis}
                    disabled={isLoading || Object.values(selectedFiles).every(arr => arr.length === 0)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Analyzing...' : 'Perform Deep Analysis'}
                  </button>
                </div>

                {/* Analysis Results */}
                {miningResults?.specializedAnalysis && (
                  <div className="space-y-4">
                    {miningResults.specializedAnalysis.optimizationReport && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Optimization Report</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Files Analyzed:</span>
                            <div className="font-medium">{miningResults.specializedAnalysis.optimizationReport.totalFiles}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Optimization Potential:</span>
                            <div className="font-medium text-orange-600">
                              {miningResults.specializedAnalysis.optimizationReport.optimizationPotential}%
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Estimated Savings:</span>
                            <div className="font-medium text-green-600">
                              {miningResults.specializedAnalysis.optimizationReport.estimatedSavings}
                            </div>
                          </div>
                        </div>
                        {miningResults.specializedAnalysis.optimizationReport.priorityActions.length > 0 && (
                          <div className="mt-3">
                            <span className="text-gray-600 text-sm">Priority Actions:</span>
                            <ul className="list-disc list-inside text-sm mt-1">
                              {miningResults.specializedAnalysis.optimizationReport.priorityActions.map((action: string, index: number) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {miningResults.specializedAnalysis.crossFileInsights && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Cross-File Insights</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {miningResults.specializedAnalysis.crossFileInsights.map((insight: string, index: number) => (
                            <li key={index}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Automation Tab */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Batch Processing & Automation</h3>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <button
                    onClick={() => executeBatchJob('texture_optimization', selectedFiles.dds)}
                    disabled={selectedFiles.dds.length === 0}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                  >
                    <div className="text-sm font-medium text-blue-900">Optimize Textures</div>
                    <div className="text-xs text-blue-700 mt-1">{selectedFiles.dds.length} files selected</div>
                  </button>
                  <button
                    onClick={() => executeBatchJob('mesh_optimization', selectedFiles.nif)}
                    disabled={selectedFiles.nif.length === 0}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
                  >
                    <div className="text-sm font-medium text-green-900">Optimize Meshes</div>
                    <div className="text-xs text-green-700 mt-1">{selectedFiles.nif.length} files selected</div>
                  </button>
                  <button
                    onClick={() => executeBatchJob('script_compilation', selectedFiles.papyrus)}
                    disabled={selectedFiles.papyrus.length === 0}
                    className="p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50"
                  >
                    <div className="text-sm font-medium text-purple-900">Compile Scripts</div>
                    <div className="text-xs text-purple-700 mt-1">{selectedFiles.papyrus.length} files selected</div>
                  </button>
                  <button
                    onClick={() => executeBatchJob('archive_merge', selectedFiles.ba2)}
                    disabled={selectedFiles.ba2.length === 0}
                    className="p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50"
                  >
                    <div className="text-sm font-medium text-orange-900">Merge Archives</div>
                    <div className="text-xs text-orange-700 mt-1">{selectedFiles.ba2.length} files selected</div>
                  </button>
                </div>

                {/* Active Jobs */}
                {batchJobs.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Active Batch Jobs</h4>
                    <div className="space-y-3">
                      {batchJobs.map(job => (
                        <div key={job.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className="font-medium capitalize">{job.type.replace('_', ' ')}</span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                                {job.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {job.files.length} files
                            </div>
                          </div>
                          {job.status === 'running' && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                          )}
                          {job.errors.length > 0 && (
                            <div className="text-sm text-red-600 mt-2">
                              Errors: {job.errors.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Automation Results */}
                {miningResults?.automationResults && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Automation Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">
                          {miningResults.automationResults.efficiencyReport?.totalJobsProcessed || 0}
                        </div>
                        <p className="text-sm text-gray-600">Jobs Processed</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {miningResults.automationResults.efficiencyReport?.timeSaved || 0}s
                        </div>
                        <p className="text-sm text-gray-600">Time Saved</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">
                          {miningResults.automationResults.efficiencyReport?.automationCoverage || 0}%
                        </div>
                        <p className="text-sm text-gray-600">Automation Coverage</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">
                          {miningResults.automationResults.efficiencyReport?.errorReduction || 0}%
                        </div>
                        <p className="text-sm text-gray-600">Error Reduction</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Asset Correlation Tab */}
          {activeTab === 'asset-correlation' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Asset Correlation Engine</h3>
                <p className="text-gray-600 mb-4">
                  Analyze relationships and dependencies between mod assets for optimization opportunities.
                </p>

                {/* Engine Controls */}
                <div className="flex space-x-2 mb-6">
                  <button
                    onClick={startAssetCorrelation}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Start Asset Correlation
                  </button>
                  <button
                    onClick={stopAssetCorrelation}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Stop Engine
                  </button>
                  <button
                    onClick={loadAssetCorrelationResults}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Load Results
                  </button>
                </div>

                {/* Correlation Results */}
                {miningResults?.assetCorrelationData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">
                          {miningResults.assetCorrelationData.metadata?.totalAssets || 0}
                        </div>
                        <p className="text-sm text-gray-600">Assets Analyzed</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {miningResults.assetCorrelationData.metadata?.totalCorrelations || 0}
                        </div>
                        <p className="text-sm text-gray-600">Correlations Found</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">
                          {miningResults.assetCorrelationData.metadata?.totalPatterns || 0}
                        </div>
                        <p className="text-sm text-gray-600">Patterns Identified</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">
                          {miningResults.assetCorrelationData.insights?.correlationSummary?.averageCorrelationsPerAsset?.toFixed(1) || 0}
                        </div>
                        <p className="text-sm text-gray-600">Avg Correlations/Asset</p>
                      </div>
                    </div>

                    {/* Top Patterns */}
                    {miningResults.assetCorrelationData.patterns && miningResults.assetCorrelationData.patterns.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Top Correlation Patterns</h4>
                        <div className="space-y-2">
                          {miningResults.assetCorrelationData.patterns.slice(0, 5).map((pattern: any, index: number) => (
                            <div key={index} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{pattern.description}</span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(pattern.metadata?.severity || 'low')}`}>
                                  {pattern.metadata?.severity || 'low'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                Confidence: {(pattern.confidence * 100).toFixed(1)}% | Assets: {pattern.assets?.length || 0}
                              </div>
                              {pattern.recommendations && pattern.recommendations.length > 0 && (
                                <div className="mt-2 text-sm text-blue-600">
                                  💡 {pattern.recommendations[0]}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Correlation Insights */}
                    {miningResults.assetCorrelationData.insights && (
                      <div>
                        <h4 className="font-medium mb-3">Correlation Insights</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">Asset Types Distribution</h5>
                            {miningResults.assetCorrelationData.insights.assetSummary?.assetTypes && (
                              <div className="space-y-1">
                                {Object.entries(miningResults.assetCorrelationData.insights.assetSummary.assetTypes).map(([type, count]: [string, any]) => (
                                  <div key={type} className="flex justify-between text-sm">
                                    <span className="capitalize">{type}:</span>
                                    <span>{count}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">Correlation Types</h5>
                            {miningResults.assetCorrelationData.insights.correlationSummary?.correlationTypes && (
                              <div className="space-y-1">
                                {Object.entries(miningResults.assetCorrelationData.insights.correlationSummary.correlationTypes).map(([type, count]: [string, any]) => (
                                  <div key={type} className="flex justify-between text-sm">
                                    <span className="capitalize">{type}:</span>
                                    <span>{count}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pattern Recognition Tab */}
          {activeTab === 'pattern-recognition' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Basic Pattern Recognition Engine</h3>
                <p className="text-gray-600 mb-4">
                  Identify structural, behavioral, performance, and compatibility patterns in your mod assets.
                </p>

                {/* Engine Controls */}
                <div className="flex space-x-2 mb-6">
                  <button
                    onClick={startPatternRecognition}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Start Pattern Recognition
                  </button>
                  <button
                    onClick={stopPatternRecognition}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Stop Engine
                  </button>
                  <button
                    onClick={loadPatternRecognitionResults}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Load Results
                  </button>
                </div>

                {/* Pattern Recognition Results */}
                {miningResults?.patternRecognitionData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">
                          {miningResults.patternRecognitionData.metadata?.totalAssets || 0}
                        </div>
                        <p className="text-sm text-gray-600">Assets Analyzed</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {miningResults.patternRecognitionData.metadata?.totalPatterns || 0}
                        </div>
                        <p className="text-sm text-gray-600">Patterns Detected</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">
                          {miningResults.patternRecognitionData.insights?.patternSummary?.averageConfidence?.toFixed(2) || 0}
                        </div>
                        <p className="text-sm text-gray-600">Avg Confidence</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">
                          {miningResults.patternRecognitionData.insights?.patternSummary?.highConfidencePatterns || 0}
                        </div>
                        <p className="text-sm text-gray-600">High Confidence</p>
                      </div>
                    </div>

                    {/* Detected Patterns */}
                    {miningResults.patternRecognitionData.patterns && miningResults.patternRecognitionData.patterns.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Detected Patterns</h4>
                        <div className="space-y-2">
                          {miningResults.patternRecognitionData.patterns.slice(0, 10).map((pattern: any, index: number) => (
                            <div key={index} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{pattern.description}</span>
                                <div className="flex space-x-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(pattern.metadata?.severity || 'low')}`}>
                                    {pattern.metadata?.severity || 'low'}
                                  </span>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {pattern.type}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                Confidence: {(pattern.confidence * 100).toFixed(1)}% | Rank: {pattern.metadata?.rank || 'N/A'}
                              </div>
                              {pattern.rules && pattern.rules.length > 0 && (
                                <div className="text-xs text-gray-500 mb-2">
                                  Rule: {pattern.rules[0].description}
                                </div>
                              )}
                              {pattern.recommendations && pattern.recommendations.length > 0 && (
                                <div className="text-sm text-blue-600">
                                  💡 {pattern.recommendations[0]}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pattern Analysis Insights */}
                    {miningResults.patternRecognitionData.insights && (
                      <div>
                        <h4 className="font-medium mb-3">Pattern Analysis Insights</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">Pattern Types Distribution</h5>
                            {miningResults.patternRecognitionData.insights.patternSummary?.patternTypes && (
                              <div className="space-y-1">
                                {Object.entries(miningResults.patternRecognitionData.insights.patternSummary.patternTypes).map(([type, count]: [string, any]) => (
                                  <div key={type} className="flex justify-between text-sm">
                                    <span className="capitalize">{type}:</span>
                                    <span>{count}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">Rule Effectiveness</h5>
                            {miningResults.patternRecognitionData.insights.ruleEffectiveness && (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {Object.entries(miningResults.patternRecognitionData.insights.ruleEffectiveness).slice(0, 3).map(([category, rules]: [string, any]) => (
                                  <div key={category} className="text-xs">
                                    <div className="font-medium capitalize">{category}:</div>
                                    <div className="ml-2">
                                      {Object.keys(rules).length} rules, avg effectiveness: {Object.values(rules).reduce((sum: number, rule: any) => sum + rule.effectiveness, 0) / Object.keys(rules).length || 0}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Health Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">System Health Monitoring</h3>
                {miningResults?.systemHealth ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="2"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeDasharray={`${miningResults.systemHealth.cpuUsage}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-medium">{miningResults.systemHealth.cpuUsage}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">CPU Usage</p>
                    </div>
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="2"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeDasharray={`${miningResults.systemHealth.memoryUsage}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-medium">{miningResults.systemHealth.memoryUsage}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Memory Usage</p>
                    </div>
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="2"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray={`${miningResults.systemHealth.diskUsage}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-medium">{miningResults.systemHealth.diskUsage}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Disk Usage</p>
                    </div>
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="2"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#8b5cf6"
                            strokeWidth="2"
                            strokeDasharray={`${miningResults.systemHealth.networkActivity}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-medium">{miningResults.systemHealth.networkActivity}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Network Activity</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No system health data available</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};