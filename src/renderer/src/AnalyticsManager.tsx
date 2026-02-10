import React, { useState, useEffect } from 'react';
import { BarChart3, ArrowDownToLine, Settings, Eye, EyeOff, Trash2 } from 'lucide-react';
import { AnalyticsConfig, UsageMetrics, AnalyticsEvent } from '../../shared/types';

interface AnalyticsManagerProps {
  embedded?: boolean;
  onClose?: () => void;
}

export const AnalyticsManager: React.FC<AnalyticsManagerProps> = ({ embedded = false, onClose }) => {
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const settings = await window.electronAPI?.getSettings?.();
      if (settings?.analytics) {
        setConfig(settings.analytics);
      }

      if (window.electronAPI?.getAnalyticsMetrics) {
        const metricsData = await window.electronAPI.getAnalyticsMetrics();
        setMetrics(metricsData);
      }

      if (window.electronAPI?.exportAnalyticsData) {
        const rawData = await window.electronAPI.exportAnalyticsData();
        setEvents(JSON.parse(rawData));
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async (updates: Partial<AnalyticsConfig>) => {
    try {
      if (window.electronAPI?.updateAnalyticsConfig) {
        await window.electronAPI.updateAnalyticsConfig(updates);
        // Reload config to get updated values
        const settings = await window.electronAPI?.getSettings?.();
        if (settings?.analytics) {
          setConfig(settings.analytics);
        }
      }
    } catch (error) {
      console.error('Failed to update analytics config:', error);
    }
  };

  const handleExportData = async () => {
    try {
      if (window.electronAPI?.exportAnalyticsData) {
        const data = await window.electronAPI.exportAnalyticsData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mossy-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export analytics data:', error);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all analytics data? This action cannot be undone.')) {
      return;
    }

    try {
      // In a real implementation, you'd have a clear method
      // For now, we'll just reload
      await loadAnalyticsData();
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const containerClassName = embedded ? 'p-4 space-y-6' : 'p-6 space-y-6';

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-green-400" />
          <h2 className="text-2xl font-bold text-green-400">Analytics & Privacy</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            {showRawData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showRawData ? 'Hide' : 'Show'} Raw Data
          </button>
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleClearData}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear Data
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-400 mb-2">Privacy-First Analytics</h3>
        <p className="text-gray-300 text-sm">
          Mossy collects anonymous usage data to improve the product. All data is stored locally by default
          and never contains personal information, file contents, or sensitive data. You can opt-out at any time.
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Analytics Configuration
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Enable Analytics</label>
              <p className="text-gray-400 text-sm">Allow anonymous usage data collection</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config?.enabled || false}
                onChange={(e) => handleConfigUpdate({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-1">Data Retention (Days)</label>
              <select
                value={config?.dataRetentionDays || 90}
                onChange={(e) => handleConfigUpdate({ dataRetentionDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:outline-none"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-1">Anonymous ID</label>
              <input
                type="text"
                value={config?.anonymousId || 'Not generated'}
                readOnly
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-white font-medium">Data Categories</label>
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const categories = config?.categories || {
                  usage: false,
                  performance: false,
                  errors: false,
                  features: false,
                };

                return Object.entries(categories).map(([category, enabled]) => (
                  <label key={category} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        const nextCategories = {
                          ...categories,
                          [category]: e.target.checked,
                        } as AnalyticsConfig['categories'];

                        handleConfigUpdate({ categories: nextCategories });
                      }}
                      className="rounded border-gray-600 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-300 capitalize">{category}</span>
                  </label>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Usage Metrics</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{Math.round(metrics.sessionDuration / 1000 / 60)}m</div>
              <div className="text-gray-400 text-sm">Session Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{metrics.featuresUsed.length}</div>
              <div className="text-gray-400 text-sm">Features Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{metrics.filesProcessed}</div>
              <div className="text-gray-400 text-sm">Files Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{metrics.errorsEncountered}</div>
              <div className="text-gray-400 text-sm">Errors</div>
            </div>
          </div>

          {metrics.toolsLaunched.length > 0 && (
            <div className="mt-4">
              <h4 className="text-white font-medium mb-2">Tools Launched</h4>
              <div className="flex flex-wrap gap-2">
                {metrics.toolsLaunched.map((tool, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raw Data */}
      {showRawData && events.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Raw Analytics Data</h3>
          <div className="bg-gray-900 rounded p-4 max-h-96 overflow-y-auto">
            <pre className="text-green-400 text-xs whitespace-pre-wrap">
              {JSON.stringify(events.slice(-50), null, 2)}
            </pre>
          </div>
          {events.length > 50 && (
            <p className="text-gray-400 text-sm mt-2">
              Showing last 50 events out of {events.length} total
            </p>
          )}
        </div>
      )}
    </div>
  );
};