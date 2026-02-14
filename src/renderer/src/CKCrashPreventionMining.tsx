/**
 * CK Crash Prevention UI Component
 * Three-tab design: Pre-Flight, Live Monitoring, Post-Crash Analysis
 * Integrates with mining/ckCrashPrevention.ts engine
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Activity, 
  Zap, Clock, TrendingUp, AlertCircle, Play, Square,
  FileText, Brain, Lightbulb, Download, XCircle, 
  RefreshCw, FolderOpen, ShieldCheck
} from 'lucide-react';

// Types from mining engine
interface ValidationIssue {
  type: 'file_not_found' | 'file_too_large' | 'memory_risk' | 'master_missing' | 
        'precombine' | 'previs' | 'navmesh' | 'problematic_mod' | 'script_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  solution: string;
  affectedRecords: string[];
}

interface ESPValidationResult {
  valid: boolean;
  crashRisk: number;
  memoryEstimateMB: number;
  issues: ValidationIssue[];
  warnings: string[];
  recommendations: string[];
}

interface CrashDiagnosis {
  crashType: 'memory_overflow' | 'access_violation' | 'stack_overflow' | 
             'navmesh_conflict' | 'precombine_mismatch' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  likelyPlugin: string;
  recommendations: string[];
  preventable: boolean;
  stackTrace: string[];
  memoryAddress: string;
  timestamp: string;
}

interface PreventionStep {
  description: string;
  command?: string;
  estimatedTime: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface PreventionPlan {
  steps: PreventionStep[];
  estimatedRiskReduction: number;
  estimatedTime: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ProcessMetrics {
  cpuPercent: number;
  memoryMB: number;
  handleCount: number;
  threadCount: number;
}

type Tab = 'preflight' | 'monitoring' | 'postcrash';
type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';
type MonitoringStatus = 'idle' | 'monitoring' | 'crashed';

export const CKCrashPrevention: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('preflight');
  
  // Pre-flight state
  const [espPath, setEspPath] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationResult, setValidationResult] = useState<ESPValidationResult | null>(null);
  const [preventionPlan, setPreventionPlan] = useState<PreventionPlan | null>(null);
  
  // Monitoring state
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>('idle');
  const [ckPid, setCkPid] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<ProcessMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<ProcessMetrics[]>([]);
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Post-crash state
  const [crashLogPath, setCrashLogPath] = useState<string>('');
  const [crashDiagnosis, setCrashDiagnosis] = useState<CrashDiagnosis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
    };
  }, []);

  /**
   * PRE-FLIGHT TAB: ESP File Validation
   */
  const handlePickESP = async () => {
    try {
      const result = await window.electron.api.openDialog({
        title: 'Select ESP/ESM File',
        filters: [
          { name: 'Plugin Files', extensions: ['esp', 'esm', 'esl'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result && result.length > 0) {
        setEspPath(result[0]);
        setValidationStatus('idle');
        setValidationResult(null);
        setPreventionPlan(null);
      }
    } catch (error) {
      console.error('File picker error:', error);
      alert('Failed to open file picker');
    }
  };

  const handleValidate = async () => {
    if (!espPath) {
      alert('Please select an ESP file first');
      return;
    }

    setValidationStatus('validating');
    setValidationResult(null);
    setPreventionPlan(null);

    try {
      // Call mining engine via IPC
      const result: ESPValidationResult = await (window.electron.api as any).ckValidate(espPath);
      setValidationResult(result);
      setValidationStatus(result.valid ? 'valid' : 'invalid');

      // Generate prevention plan
      const plan: PreventionPlan = await (window.electron.api as any).ckGeneratePreventionPlan(result);
      setPreventionPlan(plan);
    } catch (error) {
      console.error('Validation error:', error);
      alert('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setValidationStatus('idle');
    }
  };

  /**
   * MONITORING TAB: Live CK Process Monitoring
   */
  const handleStartMonitoring = async () => {
    // Check if CK is running
    const processes = window.electron.api.listProcesses ? 
      await window.electron.api.listProcesses('CreationKit') : [];
    
    if (processes.length === 0) {
      alert('Creation Kit is not running. Please launch CK first.');
      return;
    }

    const ckProcess = processes[0];
    setCkPid(ckProcess.pid);
    setMonitoringStatus('monitoring');
    setMetricsHistory([]);

    // Start polling metrics
    monitorIntervalRef.current = setInterval(async () => {
      try {
        const metricsResult = await window.electron.api.getProcessMetrics(ckProcess.pid);
        if (metricsResult.success && metricsResult.metrics) {
          const newMetrics: ProcessMetrics = {
            cpuPercent: metricsResult.metrics.cpuPercent || 0,
            memoryMB: metricsResult.metrics.memoryMB || 0,
            handleCount: metricsResult.metrics.handleCount || 0,
            threadCount: metricsResult.metrics.threadCount || 0
          };
          setMetrics(newMetrics);
          setMetricsHistory(prev => [...prev.slice(-59), newMetrics]); // Keep last 60 samples
        }
      } catch (error) {
        console.error('Metrics polling error:', error);
        handleStopMonitoring();
      }
    }, 1000);
  };

  const handleStopMonitoring = () => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    setMonitoringStatus('idle');
    setCkPid(null);
    setMetrics(null);
  };

  /**
   * POST-CRASH TAB: Crash Log Analysis
   */
  const handlePickCrashLog = async () => {
    try {
      const result = await (window.electron.api as any).ckPickLogFile();
      
      if (result.success && result.path) {
        setCrashLogPath(result.path);
        setCrashDiagnosis(null);
        
        // Auto-analyze
        await handleAnalyzeCrash(result.path);
      }
    } catch (error) {
      console.error('Log file picker error:', error);
      alert('Failed to open log file');
    }
  };

  const handleAnalyzeCrash = async (logPath?: string) => {
    const pathToAnalyze = logPath || crashLogPath;
    
    if (!pathToAnalyze) {
      alert('Please select a crash log file first');
      return;
    }

    setIsAnalyzing(true);
    setCrashDiagnosis(null);

    try {
      const diagnosis: CrashDiagnosis = await (window.electron.api as any).ckAnalyzeCrash(pathToAnalyze);
      setCrashDiagnosis(diagnosis);
    } catch (error) {
      console.error('Crash analysis error:', error);
      alert('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Render helpers
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return 'text-red-600';
    if (risk >= 50) return 'text-orange-600';
    if (risk >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  /**
   * RENDER: Tab Navigation
   */
  const renderTabs = () => (
    <div className="flex border-b border-gray-700 mb-6">
      <button
        className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
          activeTab === 'preflight'
            ? 'text-cyan-400 border-b-2 border-cyan-400'
            : 'text-gray-400 hover:text-gray-200'
        }`}
        onClick={() => setActiveTab('preflight')}
      >
        <ShieldCheck className="w-5 h-5" />
        Pre-Flight Checks
      </button>
      <button
        className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
          activeTab === 'monitoring'
            ? 'text-cyan-400 border-b-2 border-cyan-400'
            : 'text-gray-400 hover:text-gray-200'
        }`}
        onClick={() => setActiveTab('monitoring')}
      >
        <Activity className="w-5 h-5" />
        Live Monitoring
      </button>
      <button
        className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
          activeTab === 'postcrash'
            ? 'text-cyan-400 border-b-2 border-cyan-400'
            : 'text-gray-400 hover:text-gray-200'
        }`}
        onClick={() => setActiveTab('postcrash')}
      >
        <FileText className="w-5 h-5" />
        Post-Crash Analysis
      </button>
    </div>
  );

  /**
   * RENDER: Pre-Flight Tab
   */
  const renderPreFlightTab = () => (
    <div className="space-y-6">
      {/* File Selection */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-cyan-400" />
          Select ESP/ESM File
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={espPath}
            onChange={(e) => setEspPath(e.target.value)}
            placeholder="Path to ESP/ESM file..."
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
          />
          <button
            onClick={handlePickESP}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Browse
          </button>
          <button
            onClick={handleValidate}
            disabled={!espPath || validationStatus === 'validating'}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            {validationStatus === 'validating' ? 'Validating...' : 'Validate'}
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <>
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              {validationResult.valid ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              Validation Results
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-900/50 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Crash Risk</div>
                <div className={`text-2xl font-bold ${getRiskColor(validationResult.crashRisk)}`}>
                  {validationResult.crashRisk}%
                </div>
              </div>
              <div className="bg-gray-900/50 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Memory Est.</div>
                <div className="text-2xl font-bold text-white">
                  {validationResult.memoryEstimateMB} MB
                </div>
              </div>
              <div className="bg-gray-900/50 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Issues Found</div>
                <div className="text-2xl font-bold text-white">
                  {validationResult.issues.length}
                </div>
              </div>
            </div>

            {/* Issues List */}
            {validationResult.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-white text-sm mb-2">Issues:</h4>
                {validationResult.issues.map((issue, idx) => (
                  <div key={idx} className="bg-gray-900/50 rounded p-3 border-l-4 border-orange-500">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-4 h-4 mt-1 ${getSeverityColor(issue.severity)}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{issue.type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded border ${getSeverityBadge(issue.severity)}`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-1">{issue.message}</p>
                        <p className="text-xs text-cyan-400">{issue.solution}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {validationResult.recommendations.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  Recommendations:
                </h4>
                {validationResult.recommendations.map((rec, idx) => (
                  <div key={idx} className="text-sm text-gray-300 pl-6">
                    • {rec}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prevention Plan */}
          {preventionPlan && preventionPlan.steps.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Prevention Plan
              </h3>
              
              <div className="mb-4 flex gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Risk Reduction: </span>
                  <span className="text-green-400 font-semibold">{preventionPlan.estimatedRiskReduction}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Est. Time: </span>
                  <span className="text-white font-semibold">{preventionPlan.estimatedTime}</span>
                </div>
                <div>
                  <span className="text-gray-400">Priority: </span>
                  <span className={`font-semibold ${getSeverityColor(preventionPlan.priority)}`}>
                    {preventionPlan.priority.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {preventionPlan.steps.map((step, idx) => (
                  <div key={idx} className="bg-gray-900/50 rounded p-3 border-l-4 border-purple-500">
                    <div className="flex items-start gap-3">
                      <div className="flex-none w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white mb-1">{step.description}</p>
                        {step.command && (
                          <code className="text-xs text-cyan-400 bg-gray-800 px-2 py-1 rounded block mt-1">
                            {step.command}
                          </code>
                        )}
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="text-gray-400">
                            Time: <span className="text-white">{step.estimatedTime}</span>
                          </span>
                          <span className={getSeverityColor(step.priority)}>
                            Priority: {step.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  /**
   * RENDER: Monitoring Tab
   */
  const renderMonitoringTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          CK Process Monitor
        </h3>

        <div className="flex gap-3 mb-4">
          {monitoringStatus === 'idle' ? (
            <button
              onClick={handleStartMonitoring}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Monitoring
            </button>
          ) : (
            <button
              onClick={handleStopMonitoring}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop Monitoring
            </button>
          )}
        </div>

        {monitoringStatus === 'monitoring' && metrics && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">CPU Usage</div>
              <div className="text-2xl font-bold text-cyan-400">
                {metrics.cpuPercent.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Memory</div>
              <div className="text-2xl font-bold text-purple-400">
                {metrics.memoryMB.toFixed(0)} MB
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Handles</div>
              <div className="text-2xl font-bold text-green-400">
                {metrics.handleCount}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Threads</div>
              <div className="text-2xl font-bold text-yellow-400">
                {metrics.threadCount}
              </div>
            </div>
          </div>
        )}

        {monitoringStatus === 'idle' && (
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Start monitoring to track CK process health</p>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * RENDER: Post-Crash Tab
   */
  const renderPostCrashTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-400" />
          Crash Log Analysis
        </h3>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={crashLogPath}
            onChange={(e) => setCrashLogPath(e.target.value)}
            placeholder="Path to crash log file..."
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
          />
          <button
            onClick={handlePickCrashLog}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Browse
          </button>
          <button
            onClick={() => handleAnalyzeCrash()}
            disabled={!crashLogPath || isAnalyzing}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {crashDiagnosis && (
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className={`w-5 h-5 ${getSeverityColor(crashDiagnosis.severity)}`} />
            Crash Diagnosis
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Crash Type</div>
              <div className="text-lg font-bold text-white">{crashDiagnosis.crashType}</div>
            </div>
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Severity</div>
              <div className={`text-lg font-bold ${getSeverityColor(crashDiagnosis.severity)}`}>
                {crashDiagnosis.severity.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Root Cause:</h4>
              <p className="text-white">{crashDiagnosis.rootCause}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Likely Plugin:</h4>
              <p className="text-cyan-400 font-mono">{crashDiagnosis.likelyPlugin}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Recommendations:
              </h4>
              <div className="space-y-2">
                {crashDiagnosis.recommendations.map((rec, idx) => (
                  <div key={idx} className="text-sm text-gray-300 pl-6">
                    • {rec}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Preventable:</span>
              {crashDiagnosis.preventable ? (
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Yes
                </span>
              ) : (
                <span className="text-red-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> No
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Main Render
   */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            CK Crash Prevention Engine
          </h1>
          <p className="text-gray-400">
            Validate plugins, monitor Creation Kit health, and analyze crashes
          </p>
        </div>

        {/* Tab Navigation */}
        {renderTabs()}

        {/* Tab Content */}
        {activeTab === 'preflight' && renderPreFlightTab()}
        {activeTab === 'monitoring' && renderMonitoringTab()}
        {activeTab === 'postcrash' && renderPostCrashTab()}
      </div>
    </div>
  );
};
