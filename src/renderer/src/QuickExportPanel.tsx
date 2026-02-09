import React, { useState, useEffect } from 'react';
import { Zap, Package, CheckCircle, XCircle, AlertTriangle, Loader2, FileDown, Settings, Shield } from 'lucide-react';
import { assetExporter, ExportResult, ExportSettings } from './AssetExporter';
import { proactiveAssistant } from './ProactiveAssistant';

export const QuickExportPanel: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'NIF',
    targetGame: 'FO4',
    optimizeForPerformance: true,
    packTextures: true,
    validateBeforeExport: true,
    runAuditorAfterExport: true
  });

  useEffect(() => {
    // Load optimal settings on mount
    assetExporter.getOptimalSettings().then(settings => {
      setExportSettings(settings);
    });
  }, []);

  const handleQuickExport = async () => {
    setIsExporting(true);
    try {
      const result = await assetExporter.quickExport();
      setLastResult(result);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCustomExport = async () => {
    setIsExporting(true);
    try {
      const result = await assetExporter.exportAsset(exportSettings);
      setLastResult(result);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleValidate = async () => {
    const result = await proactiveAssistant.validateBeforeExport();
    console.log('Validation result:', result);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-900/30 rounded-lg">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">One-Click Export</h2>
            <p className="text-sm text-slate-400">Automated asset export with validation</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Settings className={`w-5 h-5 ${showSettings ? 'text-emerald-400' : 'text-slate-400'}`} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
          <h3 className="text-sm font-bold text-white mb-3">Export Settings</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Format</label>
              <select
                value={exportSettings.format}
                onChange={(e) => setExportSettings({ ...exportSettings, format: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="NIF">NIF (NetImmerse)</option>
                <option value="FBX">FBX</option>
                <option value="BA2">BA2 Archive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Game</label>
              <select
                value={exportSettings.targetGame}
                onChange={(e) => setExportSettings({ ...exportSettings, targetGame: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="FO4">Fallout 4</option>
                <option value="SSE">Skyrim SE</option>
                <option value="FO76">Fallout 76</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={exportSettings.optimizeForPerformance}
                onChange={(e) => setExportSettings({ ...exportSettings, optimizeForPerformance: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              Optimize for performance
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={exportSettings.packTextures}
                onChange={(e) => setExportSettings({ ...exportSettings, packTextures: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              Pack textures in file
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={exportSettings.validateBeforeExport}
                onChange={(e) => setExportSettings({ ...exportSettings, validateBeforeExport: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              Validate before export
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={exportSettings.runAuditorAfterExport}
                onChange={(e) => setExportSettings({ ...exportSettings, runAuditorAfterExport: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              Run Auditor after export
            </label>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={handleQuickExport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              <span>Quick Export</span>
            </>
          )}
        </button>

        <button
          onClick={handleCustomExport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Package className="w-5 h-5" />
          <span>Custom Export</span>
        </button>
      </div>

      <button
        onClick={handleValidate}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors mb-4"
      >
        <Shield className="w-4 h-4" />
        <span>Validate Asset</span>
      </button>

      {/* Last Export Result */}
      {lastResult && (
        <div className={`p-4 rounded-lg border ${
          lastResult.success 
            ? 'bg-emerald-900/20 border-emerald-500/30' 
            : 'bg-red-900/20 border-red-500/30'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            {lastResult.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <div className="flex-1">
              <h3 className="text-white font-medium">
                {lastResult.success ? 'Export Successful' : 'Export Failed'}
              </h3>
              <p className="text-xs text-slate-400">
                {(lastResult.exportTime / 1000).toFixed(2)}s • Quality: {lastResult.qualityScore}/100
              </p>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(lastResult.qualityScore)}`}>
              {lastResult.qualityScore}
            </div>
          </div>

          {lastResult.outputPath && (
            <div className="mb-3 p-2 bg-slate-900/50 rounded text-xs text-slate-300 font-mono break-all">
              {lastResult.outputPath}
            </div>
          )}

          {lastResult.errors.length > 0 && (
            <div className="mb-3 space-y-1">
              <h4 className="text-xs font-bold text-red-400 mb-1">Errors:</h4>
              {lastResult.errors.map((error, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-300">
                  <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}

          {lastResult.warnings.length > 0 && (
            <div className="mb-3 space-y-1">
              <h4 className="text-xs font-bold text-orange-400 mb-1">Warnings:</h4>
              {lastResult.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-orange-300">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {lastResult.recommendations.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-blue-400 mb-1">Recommendations:</h4>
              {lastResult.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-blue-300">
                  <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700">
        <p className="text-xs text-slate-400">
          <strong className="text-slate-300">Quick Export:</strong> Uses optimal settings based on current workflow.
          <br />
          <strong className="text-slate-300">Custom Export:</strong> Uses settings configured above.
        </p>
      </div>
    </div>
  );
};

export default QuickExportPanel;
