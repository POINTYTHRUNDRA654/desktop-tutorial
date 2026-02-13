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
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-orange-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
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
                </div>
              </div>
            )}

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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            </div>
          </div>
        )}

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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CKCrashPrevention;
