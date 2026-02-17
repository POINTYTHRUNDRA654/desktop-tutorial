<<<<<<< Updated upstream
import React, { useState } from 'react';
import { Shield, Upload, FileText, AlertTriangle, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import type {
  ValidationIssue,
  ValidationWarning,
  CKValidationResult,
  PreventionStep,
  PreventionPlan,
  CrashDiagnosis
} from '../../shared/types';

const CKCrashPrevention: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'preflight' | 'monitoring' | 'analysis'>('preflight');
  
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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';

=======
/**
 * CK Crash Prevention Component
 * Full-featured UI for Creation Kit crash prevention, monitoring, and recovery
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Activity, 
  Zap, Clock, TrendingUp, AlertCircle, Play, Square,
  Pause, SkipForward, FileText, Brain, Lightbulb,
  Download, XCircle, RefreshCw, Database
} from 'lucide-react';
import { 
  CKValidationResult, 
  CKHealthMetrics, 
  CrashDiagnosis,
  PreventionPlan,
  ModData
} from './CKCrashPreventionEngine';

interface CKCrashPreventionProps {
  pluginPath?: string;
  onClose?: () => void;
}

type Phase = 'idle' | 'validating' | 'ready' | 'monitoring' | 'crashed';

export const CKCrashPrevention: React.FC<CKCrashPreventionProps> = ({ 
  pluginPath, 
  onClose 
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [validationResult, setValidationResult] = useState<CKValidationResult | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<CKHealthMetrics | null>(null);
  const [preventionPlan, setPreventionPlan] = useState<PreventionPlan | null>(null);
  const [crashDiagnosis, setCrashDiagnosis] = useState<CrashDiagnosis | null>(null);
  const [monitoringSessionId, setMonitoringSessionId] = useState<string | null>(null);
  const [knowledgeRecommendations, setKnowledgeRecommendations] = useState<string[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [ckProcessPid, setCkProcessPid] = useState<number | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<string>(pluginPath || '');
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-validate when plugin path changes
  useEffect(() => {
    if (selectedPlugin && phase === 'idle') {
      handleValidate();
    }
  }, [selectedPlugin]);

  // Cleanup monitoring on unmount
  useEffect(() => {
    return () => {
      if (monitoringSessionId) {
        stopMonitoring();
      }
    };
  }, [monitoringSessionId]);

  /**
   * Pre-flight validation before CK launch
   */
  const handleValidate = async () => {
    if (!selectedPlugin) {
      alert('Please select a plugin file first');
      return;
    }

    setPhase('validating');
    setValidationResult(null);
    setPreventionPlan(null);
    setKnowledgeRecommendations([]);

    try {
      // Get plugin metadata from Electron
      const metadataResult = await window.electron.api.getPluginMetadata(selectedPlugin);
      
      if (!metadataResult.success || !metadataResult.metadata) {
        alert(`Failed to read plugin: ${metadataResult.error || 'Unknown error'}`);
        setPhase('idle');
        return;
      }

      const modData: ModData = metadataResult.metadata;

      // Validate using IPC handler
      const result = await (window.electron.api as any).ckValidate(modData);
      setValidationResult(result);

      // Generate prevention plan
      const plan = await (window.electron.api as any).ckGeneratePreventionPlan({
        plugin: modData,
        loadOrder: [modData.pluginName],
        installedMods: [],
        ckVersion: '1.10.163',
        systemMemoryGB: 16,
        previousCrashes: []
      });
      setPreventionPlan(plan);

      // Query knowledge base for CK-specific recommendations
      await queryKnowledgeBase(result);

      setPhase('ready');
    } catch (error) {
      console.error('Validation error:', error);
      alert('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setPhase('idle');
    }
  };

  /**
   * Query knowledge base for relevant CK crash prevention tips
   */
  const queryKnowledgeBase = async (validation: CKValidationResult) => {
    setIsLoadingKnowledge(true);
    try {
      const issues = validation.issues.map(i => i.type).join(' ');
      const query = `Creation Kit crash prevention ${issues} best practices`;
      
      // Check if knowledge search is available
      if ((window.electron.api as any).searchKnowledge) {
        const results = await (window.electron.api as any).searchKnowledge(query, 3);
        if (results && results.length > 0) {
          const recommendations = results.map((r: any) => 
            `${r.title}: ${r.snippet || r.content.substring(0, 100)}...`
          );
          setKnowledgeRecommendations(recommendations);
        }
      }
    } catch (error) {
      console.error('Knowledge query failed:', error);
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  /**
   * Launch CK with monitoring
   */
  const handleLaunchCK = async () => {
    if (!validationResult?.isValid) {
      const confirmed = window.confirm(
        `This plugin has a ${validationResult?.estimatedCrashRisk}% crash risk. Launch anyway?`
      );
      if (!confirmed) return;
    }

    try {
      // Launch CK via Desktop Bridge
      await window.electron.api.openProgram('CreationKit.exe');
      
      // Wait a moment for CK to start
      setTimeout(async () => {
        // Find CK process
        const processes = await window.electron.api.getRunningProcesses();
        const ckProcess = processes.find(p => 
          p.name?.toLowerCase().includes('creationkit') ||
          p.name?.toLowerCase().includes('ck64')
        );

        if (ckProcess && ckProcess.pid) {
          setCkProcessPid(ckProcess.pid);
          await startMonitoring(ckProcess.pid);
        } else {
          console.warn('Could not find CK process for monitoring');
        }
      }, 3000); // 3 second delay for CK startup
    } catch (error) {
      console.error('Failed to launch CK:', error);
      alert('Failed to launch Creation Kit');
    }
  };

  /**
   * Start real-time monitoring of CK process
   */
  const startMonitoring = async (pid: number) => {
    const sessionId = `ck-monitor-${Date.now()}`;
    setMonitoringSessionId(sessionId);
    setPhase('monitoring');

    // Poll metrics every 2 seconds
    monitorIntervalRef.current = setInterval(async () => {
      try {
        const result = await window.electron.api.getProcessMetrics(pid);
        
        if (result.success && result.metrics) {
          setHealthMetrics(result.metrics);

          // Auto-generate warnings
          const warnings = [...result.metrics.warningSignals];
          
          if (result.metrics.memoryUsageMB > 3500) {
            warnings.push('⚠️ Memory approaching 4GB limit - save immediately!');
          }
          
          if (result.metrics.handleCount > 10000) {
            warnings.push('⚠️ High handle count detected - resource leak possible');
          }

          if (result.metrics.responsiveness === 'frozen') {
            warnings.push('🚨 CK appears frozen - prepare to force quit');
          }

          if (warnings.length > result.metrics.warningSignals.length) {
            result.metrics.warningSignals = warnings;
            setHealthMetrics({...result.metrics});
          }
        } else {
          // Process may have exited
          console.log('Process monitoring stopped - CK may have closed or crashed');
          await stopMonitoring();
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 2000);
  };

  /**
   * Stop monitoring CK process
   */
  const stopMonitoring = async () => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    setMonitoringSessionId(null);
    setHealthMetrics(null);
    setPhase('ready');
  };

  /**
   * Analyze crash log after CK crash
   */
  const handleAnalyzeCrash = async () => {
    const crashLogPath = await window.electron.api.openFileDialog({
      title: 'Select Crash Log',
      filters: [
        { name: 'Log Files', extensions: ['log', 'txt', 'dmp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!crashLogPath || !crashLogPath.filePaths || crashLogPath.filePaths.length === 0) {
      return;
    }

    const logPath = crashLogPath.filePaths[0];

    try {
      const result = await window.electron.api.readCrashLog(logPath);
      
      if (result.success && result.content) {
        // Analyze crash using IPC handler
        const diagnosis = await (window.electron.api as any).ckAnalyzeCrash(result.content);
        setCrashDiagnosis(diagnosis);
        setPhase('crashed');

        // Query knowledge base for crash-specific solutions
        await queryCrashSolutions(diagnosis);
      } else {
        alert('Failed to read crash log: ' + result.error);
      }
    } catch (error) {
      console.error('Crash analysis error:', error);
      alert('Failed to analyze crash log');
    }
  };

  /**
   * Query knowledge base for crash-specific solutions
   */
  const queryCrashSolutions = async (diagnosis: CrashDiagnosis) => {
    setIsLoadingKnowledge(true);
    try {
      const query = `Creation Kit ${diagnosis.crashType} crash fix solution ${diagnosis.affectedComponent}`;
      
      if ((window.electron.api as any).searchKnowledge) {
        const results = await (window.electron.api as any).searchKnowledge(query, 5);
        if (results && results.length > 0) {
          const solutions = results.map((r: any) => 
            `${r.title}: ${r.snippet || r.content.substring(0, 150)}...`
          );
          setKnowledgeRecommendations(solutions);
        }
      }
    } catch (error) {
      console.error('Knowledge query failed:', error);
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  /**
   * Select plugin file
   */
  const handleSelectPlugin = async () => {
    const result = await window.electron.api.openFileDialog({
      title: 'Select Plugin File',
      filters: [
        { name: 'Fallout 4 Plugins', extensions: ['esp', 'esm', 'esl'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.filePaths && result.filePaths.length > 0) {
      setSelectedPlugin(result.filePaths[0]);
      setPhase('idle');
      setValidationResult(null);
      setPreventionPlan(null);
      setCrashDiagnosis(null);
    }
  };

  /**
   * Get status color based on phase
   */
  const getStatusColor = () => {
    switch (phase) {
      case 'idle': return 'text-gray-400';
      case 'validating': return 'text-yellow-400';
      case 'ready': return validationResult?.severity === 'danger' ? 'text-red-400' : 
                          validationResult?.severity === 'warning' ? 'text-yellow-400' : 'text-green-400';
      case 'monitoring': return 'text-blue-400 animate-pulse';
      case 'crashed': return 'text-red-400';
>>>>>>> Stashed changes
      default: return 'text-gray-400';
    }
  };

<<<<<<< Updated upstream
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-orange-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
=======
  const getStatusIcon = () => {
    switch (phase) {
      case 'idle': return <Shield className="w-6 h-6" />;
      case 'validating': return <RefreshCw className="w-6 h-6 animate-spin" />;
      case 'ready': return validationResult?.isValid ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />;
      case 'monitoring': return <Activity className="w-6 h-6 animate-pulse" />;
      case 'crashed': return <XCircle className="w-6 h-6" />;
      default: return <Shield className="w-6 h-6" />;
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'idle': return 'Ready';
      case 'validating': return 'Validating...';
      case 'ready': return validationResult?.isValid ? 'Safe to Launch' : 'High Risk';
      case 'monitoring': return 'Monitoring CK...';
      case 'crashed': return 'Crash Detected';
      default: return 'Unknown';
>>>>>>> Stashed changes
    }
  };

  return (
<<<<<<< Updated upstream
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 p-6 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">CK Crash Prevention</h1>
            <p className="text-sm text-slate-400 mt-1">
              Prevent and diagnose Creation Kit crashes
            </p>
          </div>
        </div>
      </div>

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
                )}

                {/* Recommendations */}
                {validationResult.recommendations.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Recommendations</h3>
                    <ul className="space-y-2">
                      {validationResult.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-300">
                          <span className="text-blue-400">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Memory Usage */}
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <p className="text-sm text-slate-400">
                    Estimated Memory Usage: <span className="text-white font-medium">{validationResult.estimatedMemoryUsage.toFixed(2)} MB</span>
                  </p>
=======
    <div className="flex flex-col h-full bg-mossy-darker text-mossy-text">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-mossy-border">
        <div className="flex items-center gap-3">
          <span className={getStatusColor()}>
            {getStatusIcon()}
          </span>
          <div>
            <h1 className="text-xl font-bold">Creation Kit Crash Prevention</h1>
            <p className="text-sm text-mossy-text-muted">{getPhaseLabel()}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-mossy-border rounded transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Plugin Selection */}
        <div className="bg-mossy-bg p-4 rounded-lg border border-mossy-border">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-mossy-accent" />
            Plugin Selection
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedPlugin}
              onChange={(e) => setSelectedPlugin(e.target.value)}
              placeholder="Plugin file path..."
              className="flex-1 px-3 py-2 bg-mossy-darker border border-mossy-border rounded text-sm"
            />
            <button
              onClick={handleSelectPlugin}
              className="px-4 py-2 bg-mossy-accent hover:bg-mossy-accent-hover rounded font-medium transition-colors"
            >
              Browse
            </button>
            <button
              onClick={handleValidate}
              disabled={!selectedPlugin || phase === 'validating'}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Validate
            </button>
          </div>
        </div>

        {/* Validation Results */}
        {validationResult && phase !== 'crashed' && (
          <div className="bg-mossy-bg p-4 rounded-lg border border-mossy-border space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-mossy-accent" />
              Validation Results
            </h2>

            {/* Risk Score */}
            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              validationResult.severity === 'safe' ? 'bg-green-500/10 border-green-500/30' :
              validationResult.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.severity === 'safe' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                 validationResult.severity === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-400" /> :
                 <AlertCircle className="w-5 h-5 text-red-400" />}
                <span className="font-medium">Crash Risk Assessment</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-bold ${
                  validationResult.severity === 'safe' ? 'text-green-400' :
                  validationResult.severity === 'warning' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {validationResult.estimatedCrashRisk}%
                </span>
              </div>
            </div>

            {/* Issues */}
            {validationResult.issues.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-mossy-text-muted">Detected Issues:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {validationResult.issues.map((issue, idx) => (
                    <div key={idx} className="p-3 bg-mossy-darker rounded border border-mossy-border">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          issue.severity === 'critical' ? 'text-red-400' :
                          issue.severity === 'high' ? 'text-orange-400' :
                          issue.severity === 'medium' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`} />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{issue.message}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              issue.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                              issue.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-xs text-mossy-text-muted">💡 {issue.solution}</p>
                        </div>
                      </div>
                    </div>
                  ))}
>>>>>>> Stashed changes
                </div>
              </div>
            )}

<<<<<<< Updated upstream
            {/* Prevention Plan */}
            {preventionPlan && (
              <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Prevention Plan</h2>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">
                      Priority: <span className={`font-bold ${
                        preventionPlan.priority === 'high' ? 'text-red-400' :
                        preventionPlan.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                      }`}>{preventionPlan.priority.toUpperCase()}</span>
                    </span>
                    <span className="text-sm text-slate-400">
                      Est. Time: <span className="text-white font-medium">{preventionPlan.estimatedTime} min</span>
                    </span>
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
=======
            {/* Recommendations */}
            {validationResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-mossy-text-muted">Recommendations:</h3>
                <div className="space-y-1">
                  {validationResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Zap className="w-3 h-3 mt-1 text-mossy-accent flex-shrink-0" />
                      <span>{rec}</span>
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-900 rounded-lg p-12 border border-slate-800 text-center">
              <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Live Monitoring</h2>
              <p className="text-slate-400">
                Real-time CK process monitoring is coming soon. This feature will track memory usage, 
                detect freezes, and alert you to potential crashes before they happen.
              </p>
=======
        {/* Prevention Plan */}
        {preventionPlan && phase !== 'crashed' && (
          <div className="bg-mossy-bg p-4 rounded-lg border border-mossy-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-mossy-accent" />
                Prevention Plan
              </h2>
              <div className="flex items-center gap-3 text-xs text-mossy-text-muted">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  -{preventionPlan.estimatedRiskReduction}% risk
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {preventionPlan.estimatedTime}
                </span>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {preventionPlan.steps.map((step) => (
                <div key={step.order} className="flex items-start gap-3 p-3 bg-mossy-darker rounded">
                  <div className="w-6 h-6 rounded-full bg-mossy-accent/20 text-mossy-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {step.order}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{step.action}</span>
                      {step.automated && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                          Auto
                        </span>
                      )}
                      {step.tool && (
                        <span className="text-xs text-mossy-text-muted">
                          via {step.tool}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-mossy-text-muted">{step.description}</p>
                  </div>
                </div>
              ))}
>>>>>>> Stashed changes
            </div>
          </div>
        )}
      </div>
    </div>
  );

<<<<<<< Updated upstream
        {/* Post-Crash Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">Crash Log Analysis</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    CK Crash Log File
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={logPath}
                      readOnly
                      placeholder="No log file selected"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500"
                    />
                    <button
                      onClick={handlePickLogFile}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Browse
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Typically found in Documents\My Games\Fallout 4 Creation Kit\
                  </p>
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
                )}
=======
        {/* Real-time Monitoring */}
        {phase === 'monitoring' && healthMetrics && (
          <div className="bg-mossy-bg p-4 rounded-lg border border-green-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                Live Monitoring
              </h2>
              <button
                onClick={() => stopMonitoring()}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Square className="w-3 h-3" />
                Stop
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-mossy-darker rounded space-y-1">
                <div className="text-xs text-mossy-text-muted">Memory</div>
                <div className={`text-xl font-bold ${
                  healthMetrics.memoryUsageMB > 3500 ? 'text-red-400' :
                  healthMetrics.memoryUsageMB > 2500 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {healthMetrics.memoryUsageMB.toFixed(0)} MB
                </div>
                <div className="text-xs text-mossy-text-muted">/ 4096 MB</div>
              </div>
              <div className="p-3 bg-mossy-darker rounded space-y-1">
                <div className="text-xs text-mossy-text-muted">CPU</div>
                <div className="text-xl font-bold text-blue-400">
                  {healthMetrics.cpuPercent.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 bg-mossy-darker rounded space-y-1">
                <div className="text-xs text-mossy-text-muted">Handles</div>
                <div className={`text-xl font-bold ${
                  healthMetrics.handleCount > 10000 ? 'text-red-400' :
                  healthMetrics.handleCount > 7000 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {healthMetrics.handleCount.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-mossy-darker rounded space-y-1">
                <div className="text-xs text-mossy-text-muted">Status</div>
                <div className={`text-xl font-bold ${
                  healthMetrics.responsiveness === 'frozen' ? 'text-red-400' :
                  healthMetrics.responsiveness === 'slow' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {healthMetrics.responsiveness}
                </div>
              </div>
            </div>

            {/* Warning Signals */}
            {healthMetrics.warningSignals.length > 0 && (
              <div className="space-y-1 p-3 bg-red-500/10 rounded border border-red-500/30">
                {healthMetrics.warningSignals.map((signal, idx) => (
                  <div key={idx} className="text-sm text-red-400 font-medium">
                    {signal}
                  </div>
                ))}
>>>>>>> Stashed changes
              </div>
            )}
          </div>
        )}
<<<<<<< Updated upstream
=======

        {/* Crash Diagnosis */}
        {crashDiagnosis && phase === 'crashed' && (
          <div className="bg-mossy-bg p-4 rounded-lg border border-red-500/30 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Crash Analysis
            </h2>

            {/* Crash Type */}
            <div className="p-3 bg-red-500/10 rounded border border-red-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-400">
                  {crashDiagnosis.crashType.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  crashDiagnosis.preventable 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {crashDiagnosis.preventable ? 'Preventable' : 'Unavoidable'}
                </span>
              </div>
              <p className="text-sm text-mossy-text mb-2">
                <span className="font-medium">Root Cause:</span> {crashDiagnosis.rootCause}
              </p>
              <p className="text-xs text-mossy-text-muted">
                <span className="font-medium">Affected Component:</span> {crashDiagnosis.affectedComponent}
              </p>
            </div>

            {/* Recommendations */}
            {crashDiagnosis.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-mossy-text-muted">Recommended Actions:</h3>
                <div className="space-y-1">
                  {crashDiagnosis.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-mossy-darker rounded">
                      <Zap className="w-4 h-4 mt-0.5 text-mossy-accent flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stack Trace */}
            {crashDiagnosis.stackTrace && crashDiagnosis.stackTrace.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-mossy-text-muted">Stack Trace:</h3>
                <div className="p-3 bg-mossy-darker rounded border border-mossy-border font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto">
                  {crashDiagnosis.stackTrace.map((line, idx) => (
                    <div key={idx} className="text-mossy-text-muted">{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Knowledge Base Recommendations */}
        {knowledgeRecommendations.length > 0 && (
          <div className="bg-mossy-bg p-4 rounded-lg border border-mossy-border space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-mossy-accent" />
              Knowledge Base Insights
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {knowledgeRecommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-mossy-darker rounded border border-mossy-border">
                  <p className="text-sm text-mossy-text">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoadingKnowledge && (
          <div className="flex items-center justify-center gap-2 text-mossy-text-muted p-4">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Searching knowledge base...</span>
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

      {/* Action Bar */}
      <div className="p-4 border-t border-mossy-border bg-mossy-bg">
        <div className="flex gap-2 flex-wrap">
          {phase === 'ready' && validationResult && (
            <button
              onClick={handleLaunchCK}
              className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                validationResult.isValid
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-black'
              }`}
            >
              <Play className="w-4 h-4" />
              {validationResult.isValid ? 'Launch CK Safely' : 'Launch with Caution'}
            </button>
          )}
          
          <button
            onClick={handleAnalyzeCrash}
            className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Analyze Crash Log
          </button>

          {phase === 'monitoring' && (
            <button
              onClick={() => stopMonitoring()}
              className="px-4 py-3 bg-mossy-border hover:bg-mossy-accent text-mossy-text rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Stop Monitoring
            </button>
          )}
        </div>
>>>>>>> Stashed changes
      </div>
    </div>
  );
};
<<<<<<< Updated upstream

export default CKCrashPrevention;
=======
>>>>>>> Stashed changes
