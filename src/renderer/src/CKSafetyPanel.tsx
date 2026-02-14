/**
 * CK Safety Panel - UI for Creation Kit crash prevention
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Activity, 
  Zap, Clock, TrendingUp, AlertCircle, Play, Square 
} from 'lucide-react';
import { 
  CKCrashPreventionEngine, 
  CKValidationResult, 
  CKHealthMetrics, 
  ModData,
  PreventionPlan,
  CrashDiagnosis
} from './CKCrashPreventionEngine';

const ckEngine = new CKCrashPreventionEngine();

interface CKSafetyPanelProps {
  pluginPath?: string;
  onLaunchCK?: () => void;
}

export const CKSafetyPanel: React.FC<CKSafetyPanelProps> = ({ pluginPath, onLaunchCK }) => {
  const [validationResult, setValidationResult] = useState<CKValidationResult | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<CKHealthMetrics | null>(null);
  const [preventionPlan, setPreventionPlan] = useState<PreventionPlan | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [crashHistory, setCrashHistory] = useState<CrashDiagnosis[]>([]);

  // Auto-validate when plugin path changes
  useEffect(() => {
    if (pluginPath) {
      validatePlugin();
    }
  }, [pluginPath]);

  const validatePlugin = async () => {
    if (!pluginPath) return;

    setIsValidating(true);
    try {
      // In real implementation, get mod data from plugin
      const modData: ModData = {
        pluginPath,
        pluginName: pluginPath.split(/[/\\]/).pop() || 'Unknown',
        masters: ['Fallout4.esm'], // Would extract from plugin
        recordCount: 2500,
        fileSize: 15 * 1024 * 1024,
        lastModified: new Date(),
        hasScripts: true,
        hasNavmesh: false,
        hasPrecombines: true
      };

      const result = await ckEngine.validateBeforeCK(modData);
      setValidationResult(result);

      // Generate prevention plan
      const plan = ckEngine.generatePreventionPlan({
        plugin: modData,
        loadOrder: ['Fallout4.esm', modData.pluginName],
        installedMods: [],
        ckVersion: '1.10.163',
        systemMemoryGB: 16,
        previousCrashes: crashHistory
      });
      setPreventionPlan(plan);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const startMonitoring = (pid: number) => {
    setIsMonitoring(true);
    ckEngine.monitorCKProcess(pid, (metrics) => {
      setHealthMetrics(metrics);
    });
  };

  const stopMonitoring = (pid: number) => {
    ckEngine.stopMonitoring(pid);
    setIsMonitoring(false);
    setHealthMetrics(null);
  };

  const analyzeCrash = async (logPath: string) => {
    const diagnosis = await ckEngine.analyzeCrashLog(logPath);
    setCrashHistory(prev => [diagnosis, ...prev].slice(0, 5)); // Keep last 5
  };

  const getSeverityColor = (severity: 'safe' | 'warning' | 'danger') => {
    switch (severity) {
      case 'safe': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'danger': return 'text-red-400';
    }
  };

  const getSeverityIcon = (severity: 'safe' | 'warning' | 'danger') => {
    switch (severity) {
      case 'safe': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'danger': return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-4 p-4 bg-mossy-darker rounded-lg border border-mossy-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-mossy-accent" />
          <h2 className="text-xl font-bold text-mossy-text">CK Safety Monitor</h2>
        </div>
        {pluginPath && (
          <button
            onClick={validatePlugin}
            disabled={isValidating}
            className="px-3 py-1 bg-mossy-accent hover:bg-mossy-accent-hover rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isValidating ? 'Validating...' : 'Re-validate'}
          </button>
        )}
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="space-y-3">
          {/* Risk Score */}
          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            validationResult.severity === 'safe' ? 'bg-green-500/10 border-green-500/30' :
            validationResult.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              <span className={getSeverityColor(validationResult.severity)}>
                {getSeverityIcon(validationResult.severity)}
              </span>
              <span className="font-medium text-mossy-text">Crash Risk Assessment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getSeverityColor(validationResult.severity)}`}>
                {validationResult.estimatedCrashRisk}%
              </span>
              <span className="text-sm text-mossy-text-muted">risk</span>
            </div>
          </div>

          {/* Issues List */}
          {validationResult.issues.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-mossy-text-muted">Detected Issues:</h3>
              {validationResult.issues.map((issue, idx) => (
                <div key={idx} className="p-3 bg-mossy-bg rounded border border-mossy-border">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                      issue.severity === 'critical' ? 'text-red-400' :
                      issue.severity === 'high' ? 'text-orange-400' :
                      issue.severity === 'medium' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-mossy-text">{issue.message}</span>
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
            </div>
          )}

          {/* Recommendations */}
          {validationResult.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-mossy-text-muted">Recommendations:</h3>
              <div className="space-y-1">
                {validationResult.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-mossy-text">
                    <Zap className="w-3 h-3 mt-1 text-mossy-accent flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prevention Plan */}
      {preventionPlan && (
        <div className="space-y-3 p-3 bg-mossy-bg rounded border border-mossy-border">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-mossy-text">Prevention Plan</h3>
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
          <div className="space-y-2">
            {preventionPlan.steps.map((step) => (
              <div key={step.order} className="flex items-start gap-3 p-2 bg-mossy-darker rounded">
                <div className="w-6 h-6 rounded-full bg-mossy-accent/20 text-mossy-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {step.order}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-mossy-text">{step.action}</span>
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
          </div>
        </div>
      )}

      {/* Real-time Monitoring */}
      {isMonitoring && healthMetrics && (
        <div className="space-y-3 p-3 bg-mossy-bg rounded border border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400 animate-pulse" />
              <h3 className="font-medium text-mossy-text">Live Monitoring</h3>
            </div>
            <button
              onClick={() => stopMonitoring(0)} // Would use actual PID
              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-colors"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-mossy-text-muted">Memory</div>
              <div className={`text-lg font-bold ${
                healthMetrics.memoryUsageMB > 3500 ? 'text-red-400' :
                healthMetrics.memoryUsageMB > 2500 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {healthMetrics.memoryUsageMB.toFixed(0)} MB
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-mossy-text-muted">CPU</div>
              <div className="text-lg font-bold text-blue-400">
                {healthMetrics.cpuPercent.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-mossy-text-muted">Handles</div>
              <div className={`text-lg font-bold ${
                healthMetrics.handleCount > 10000 ? 'text-red-400' :
                healthMetrics.handleCount > 7000 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {healthMetrics.handleCount.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-mossy-text-muted">Status</div>
              <div className={`text-lg font-bold ${
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
            <div className="space-y-1 p-2 bg-red-500/10 rounded border border-red-500/30">
              {healthMetrics.warningSignals.map((signal, idx) => (
                <div key={idx} className="text-sm text-red-400 font-medium">
                  {signal}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Launch Button */}
      {validationResult && onLaunchCK && (
        <button
          onClick={onLaunchCK}
          disabled={!validationResult.isValid}
          className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            validationResult.isValid
              ? 'bg-mossy-accent hover:bg-mossy-accent-hover text-white'
              : 'bg-mossy-border text-mossy-text-muted cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4" />
          {validationResult.isValid ? 'Launch Creation Kit Safely' : 'Fix Issues Before Launch'}
        </button>
      )}

      {/* Crash History */}
      {crashHistory.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-mossy-text-muted">Recent Crash Analysis:</h3>
          {crashHistory.map((crash, idx) => (
            <div key={idx} className="p-3 bg-mossy-bg rounded border border-mossy-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-mossy-text">
                  {crash.crashType.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  crash.preventable 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {crash.preventable ? 'Preventable' : 'Unavoidable'}
                </span>
              </div>
              <p className="text-xs text-mossy-text-muted">{crash.rootCause}</p>
              {crash.recommendations.length > 0 && (
                <div className="text-xs text-mossy-text space-y-1">
                  {crash.recommendations.slice(0, 2).map((rec, i) => (
                    <div key={i}>• {rec}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
