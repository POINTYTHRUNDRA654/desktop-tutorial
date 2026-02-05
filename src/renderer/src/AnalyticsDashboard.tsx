import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, FileText, Clock, Activity } from 'lucide-react';
import { UsageMetrics } from '../../shared/types';

interface AnalyticsDashboardProps {
  onOpenFullAnalytics?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onOpenFullAnalytics }) => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      if (window.electronAPI?.getAnalyticsMetrics) {
        const data = await window.electronAPI.getAnalyticsMetrics();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load analytics metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <div className="text-center py-8 text-gray-400">
          Analytics not available
        </div>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Analytics Overview</h3>
        </div>
        {onOpenFullAnalytics && (
          <button
            onClick={onOpenFullAnalytics}
            className="text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            View Details →
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-700/30 rounded">
          <Clock className="w-6 h-6 text-blue-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-blue-400">{formatDuration(metrics.sessionDuration)}</div>
          <div className="text-xs text-gray-400">Session Time</div>
        </div>

        <div className="text-center p-3 bg-gray-700/30 rounded">
          <Activity className="w-6 h-6 text-green-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-green-400">{metrics.featuresUsed.length}</div>
          <div className="text-xs text-gray-400">Features Used</div>
        </div>

        <div className="text-center p-3 bg-gray-700/30 rounded">
          <FileText className="w-6 h-6 text-purple-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-purple-400">{metrics.filesProcessed}</div>
          <div className="text-xs text-gray-400">Files Processed</div>
        </div>

        <div className="text-center p-3 bg-gray-700/30 rounded">
          <Users className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-orange-400">{metrics.toolsLaunched.length}</div>
          <div className="text-xs text-gray-400">Tools Launched</div>
        </div>
      </div>

      {metrics.errorsEncountered > 0 && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
          <div className="flex items-center gap-2 text-red-400">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-sm font-medium">{metrics.errorsEncountered} errors encountered</span>
          </div>
        </div>
      )}

      {metrics.featuresUsed.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-400 mb-2">Recent Features</div>
          <div className="flex flex-wrap gap-1">
            {metrics.featuresUsed.slice(-5).map((feature, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};