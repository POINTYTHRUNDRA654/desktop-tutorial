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
  
  // Pre-Flight state
  const [espPath, setEspPath] = useState<string>('');
  const [modName, setModName] = useState<string>('');
  const [cellCount, setCellCount] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CKValidationResult | null>(null);
  const [preventionPlan, setPreventionPlan] = useState<PreventionPlan | null>(null);
  
  // Post-Crash state
  const [logPath, setLogPath] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<CrashDiagnosis | null>(null);

  const bridge = (window as any).electron?.api || (window as any).electronAPI;

  const handlePickEspFile = async () => {
    try {
      if (!bridge) {
        alert('File picker not available. Please use the desktop app.');
        return;
      }
      
      const result = await bridge.pickEspFile();
      if (result) {
        setEspPath(result);
        // Try to extract mod name from file name
        const fileName = result.split(/[\\\/]/).pop() || '';
        const nameWithoutExt = fileName.replace(/\.(esp|esm|esl)$/i, '');
        setModName(nameWithoutExt);
      }
    } catch (error) {
      console.error('Failed to pick ESP file:', error);
      alert('Failed to pick file. Please try again.');
    }
  };

  const handleValidation = async () => {
    if (!espPath) {
      alert('Please select an ESP file first.');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    setPreventionPlan(null);

    try {
      if (!bridge || !bridge.ckCrashValidate) {
        alert('CK Crash Prevention not available. Please use the desktop app.');
        return;
      }

      const cellCountNum = cellCount ? parseInt(cellCount) : undefined;
      const response = await bridge.ckCrashValidate(espPath, modName || undefined, cellCountNum);
      
      if (response.success) {
        setValidationResult(response.result);
        
        // Generate prevention plan
        const planResponse = await bridge.ckCrashGeneratePlan(response.result);
        if (planResponse.success) {
          setPreventionPlan(planResponse.plan);
        }
      } else {
        alert(`Validation failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert('An error occurred during validation.');
    } finally {
      setIsValidating(false);
    }
  };

  const handlePickLogFile = async () => {
    try {
      if (!bridge || !bridge.ckCrashPickLog) {
        alert('File picker not available. Please use the desktop app.');
        return;
      }

      const result = await bridge.ckCrashPickLog();
      if (result.success && result.path) {
        setLogPath(result.path);
      }
    } catch (error) {
      console.error('Failed to pick log file:', error);
      alert('Failed to pick log file. Please try again.');
    }
  };

  const handleAnalyzeCrash = async () => {
    if (!logPath) {
      alert('Please select a crash log file first.');
      return;
    }

    setIsAnalyzing(true);
    setDiagnosis(null);

    try {
      if (!bridge || !bridge.ckCrashAnalyze) {
        alert('Crash analysis not available. Please use the desktop app.');
        return;
      }

      const response = await bridge.ckCrashAnalyze(logPath);
      
      if (response.success) {
        setDiagnosis(response.diagnosis);
      } else {
        alert(`Analysis failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('An error occurred during analysis.');
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

      {/* Tabs */}
      <div className="border-b border-slate-800 bg-slate-900">
        <div className="flex gap-1 px-4">
          <button
            onClick={() => setActiveTab('preflight')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'preflight'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Pre-Flight Checks
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'monitoring'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Live Monitoring
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Post-Crash Analysis
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Pre-Flight Tab */}
        {activeTab === 'preflight' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">File Selection</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    ESP/ESM File
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={espPath}
                      readOnly
                      placeholder="No file selected"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500"
                    />
                    <button
                      onClick={handlePickEspFile}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Browse
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Mod Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={modName}
                    onChange={(e) => setModName(e.target.value)}
                    placeholder="Enter mod name"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cell Count (Optional)
                  </label>
                  <input
                    type="number"
                    value={cellCount}
                    onChange={(e) => setCellCount(e.target.value)}
                    placeholder="Approximate number of cells"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500"
                  />
                </div>

                <button
                  onClick={handleValidation}
                  disabled={!espPath || isValidating}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded font-medium flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Run Validation
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Validation Results */}
            {validationResult && (
              <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Validation Results</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Risk Level:</span>
                    <span className={`font-bold uppercase ${getRiskLevelColor(validationResult.riskLevel)}`}>
                      {validationResult.riskLevel}
                    </span>
                  </div>
                </div>

                {/* Safety Status */}
                <div className={`p-4 rounded-lg mb-4 ${
                  validationResult.safe ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'
                }`}>
                  <div className="flex items-center gap-2">
                    {validationResult.safe ? (
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                    <span className={`font-semibold ${validationResult.safe ? 'text-green-400' : 'text-red-400'}`}>
                      {validationResult.safe ? 'File is safe for CK operations' : 'Issues detected - review before proceeding'}
                    </span>
                  </div>
                </div>

                {/* Issues */}
                {validationResult.issues.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Issues</h3>
                    <div className="space-y-2">
                      {validationResult.issues.map((issue, index) => (
                        <div key={index} className="bg-slate-800 p-4 rounded border border-slate-700">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1">
                              <p className="text-white font-medium">{issue.message}</p>
                              {issue.fix && (
                                <p className="text-sm text-slate-400 mt-1">Fix: {issue.fix}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Warnings</h3>
                    <div className="space-y-2">
                      {validationResult.warnings.map((warning, index) => (
                        <div key={index} className="bg-slate-800 p-4 rounded border border-slate-700">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-white font-medium">{warning.message}</p>
                              <p className="text-sm text-slate-400 mt-1">{warning.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
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
                </div>

                <div className="space-y-3">
                  {preventionPlan.steps.map((step, index) => (
                    <div key={step.id} className="bg-slate-800 p-4 rounded border border-slate-700">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-white font-medium">{step.title}</p>
                          <p className="text-sm text-slate-400 mt-1">{step.description}</p>
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
                  ))}
                </div>
              </div>
            )}
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

                <button
                  onClick={handleAnalyzeCrash}
                  disabled={!logPath || isAnalyzing}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded font-medium flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      Analyze Crash
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Diagnosis Results */}
            {diagnosis && (
              <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                <h2 className="text-xl font-semibold text-white mb-4">Crash Diagnosis</h2>

                {/* Exception Info */}
                {diagnosis.exceptionCode && (
                  <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg mb-4">
                    <p className="text-red-400 font-semibold">
                      Exception Code: {diagnosis.exceptionCode}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Type: {diagnosis.exceptionType.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                )}

                {/* Problematic Cell */}
                {diagnosis.problematicCell && (
                  <div className="bg-slate-800 p-4 rounded border border-slate-700 mb-4">
                    <p className="text-white">
                      <span className="text-slate-400">Problematic Cell:</span>{' '}
                      <span className="font-mono font-semibold text-yellow-400">{diagnosis.problematicCell}</span>
                    </p>
                  </div>
                )}

                {/* Root Cause */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Root Cause</h3>
                  <p className="text-slate-300 bg-slate-800 p-4 rounded border border-slate-700">
                    {diagnosis.rootCause}
                  </p>
                </div>

                {/* Fix Steps */}
                {diagnosis.fixSteps.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Fix Steps</h3>
                    <ol className="space-y-2">
                      {diagnosis.fixSteps.map((step, index) => (
                        <li key={index} className="flex items-start gap-3 bg-slate-800 p-4 rounded border border-slate-700">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="text-slate-300">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Related Articles */}
                {diagnosis.relatedKnowledgeArticles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Related Knowledge Articles</h3>
                    <ul className="space-y-2">
                      {diagnosis.relatedKnowledgeArticles.map((article, index) => (
                        <li key={index} className="text-blue-400 hover:text-blue-300 cursor-pointer">
                          📄 {article}
                        </li>
                      ))}
                    </ul>
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
        )}
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
