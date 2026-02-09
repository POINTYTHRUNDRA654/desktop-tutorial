import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, Zap, Shield, X } from 'lucide-react';
import { proactiveAssistant, ProactiveWarning } from './ProactiveAssistant';

const severityIcons = {
  critical: XCircle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle
};

const severityColors = {
  critical: 'text-red-400 bg-red-900/20 border-red-500/30',
  high: 'text-orange-400 bg-orange-900/20 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-900/20 border-blue-500/30'
};

export const ProactiveWarningsPanel: React.FC = () => {
  const [warnings, setWarnings] = useState<ProactiveWarning[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);

  useEffect(() => {
    // Load initial warnings
    setWarnings(proactiveAssistant.getCurrentWarnings());

    // Subscribe to updates
    const unsubscribe = proactiveAssistant.onWarningsUpdate((newWarnings) => {
      setWarnings(newWarnings);
    });

    return unsubscribe;
  }, []);

  const handleDismiss = (warningId: string) => {
    proactiveAssistant.dismissWarning(warningId);
  };

  const handleAutoFix = async (warning: ProactiveWarning) => {
    if (!warning.autoFixAction) return;

    setFixing(warning.id);
    try {
      await warning.autoFixAction();
      // Warning should be removed automatically after fix
    } catch (error) {
      console.error('Auto-fix failed:', error);
    } finally {
      setFixing(null);
    }
  };

  const handleFixAll = async () => {
    setFixing('all');
    try {
      const result = await proactiveAssistant.autoFixAll();
      console.log(`Fixed ${result.fixed} issues, ${result.failed} failed`);
    } finally {
      setFixing(null);
    }
  };

  const criticalCount = warnings.filter(w => w.severity === 'critical').length;
  const highCount = warnings.filter(w => w.severity === 'high').length;

  if (warnings.length === 0) {
    return null; // No warnings to show
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {/* Compact header when collapsed */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl hover:border-slate-600 transition-colors"
        >
          <Shield className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="text-white font-medium">Proactive Warnings</span>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {criticalCount}
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
              {highCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-bold">Proactive Assistant</h3>
              <span className="text-xs text-slate-400">
                {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {warnings.some(w => w.autoFixAvailable) && (
                <button
                  onClick={handleFixAll}
                  disabled={fixing !== null}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {fixing === 'all' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Fixing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3" />
                      <span>Fix All</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Warnings list */}
          <div className="max-h-96 overflow-y-auto">
            {warnings.map((warning) => {
              const Icon = severityIcons[warning.severity];
              const colorClass = severityColors[warning.severity];

              return (
                <div
                  key={warning.id}
                  className={`p-4 border-b border-slate-700 ${colorClass} hover:bg-opacity-80 transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white mb-1">
                        {warning.title}
                      </h4>
                      <p className="text-sm text-slate-300 mb-2">
                        {warning.message}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {warning.autoFixAvailable && (
                          <button
                            onClick={() => handleAutoFix(warning)}
                            disabled={fixing === warning.id}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {fixing === warning.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Fixing...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3" />
                                <span>Auto-Fix</span>
                              </>
                            )}
                          </button>
                        )}

                        {warning.learnMoreUrl && (
                          <a
                            href={warning.learnMoreUrl}
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded transition-colors"
                          >
                            Learn More
                          </a>
                        )}

                        <button
                          onClick={() => handleDismiss(warning.id)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded transition-colors ml-auto"
                        >
                          Dismiss
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <span className="capitalize">{warning.type.replace('-', ' ')}</span>
                        <span>•</span>
                        <span className="capitalize">{warning.stage}</span>
                        <span>•</span>
                        <span className="capitalize">{warning.severity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer with stats */}
          <div className="p-3 bg-slate-800/50 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {criticalCount > 0 && (
                  <span className="text-red-400">
                    {criticalCount} Critical
                  </span>
                )}
                {highCount > 0 && (
                  <span className="text-orange-400">
                    {highCount} High
                  </span>
                )}
                {criticalCount === 0 && highCount === 0 && (
                  <span className="text-emerald-400">
                    ✓ No critical issues
                  </span>
                )}
              </div>
              <span className="text-slate-400">
                Preventing errors in real-time
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProactiveWarningsPanel;
