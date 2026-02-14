import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Settings, Clock, FileCheck, AlertTriangle, CheckCircle } from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'file-change' | 'process-start' | 'schedule' | 'manual';
  action: string;
  params?: any;
  lastRun?: number;
  runCount?: number;
}

interface AutomationStats {
  isRunning: boolean;
  activeWatchers: number;
  activeIntervals: number;
  rules: Array<{
    id: string;
    name: string;
    enabled: boolean;
    runCount: number;
    lastRun?: number;
  }>;
}

export default function AutomationManager() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [message, setMessage] = useState('');

  // Load automation settings on mount
  useEffect(() => {
    loadSettings();
    loadStatistics();

    // Refresh statistics every 10 seconds
    const interval = setInterval(loadStatistics, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await window.api.automation.getSettings();
      setIsEnabled(settings.enabled);
      setRules(settings.rules);
    } catch (error) {
      console.error('Failed to load automation settings:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const statistics = await window.api.automation.getStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const toggleEngine = async () => {
    try {
      if (stats?.isRunning) {
        await window.api.automation.stop();
        showMessage('Automation engine stopped');
      } else {
        await window.api.automation.start();
        showMessage('Automation engine started');
      }
      await loadStatistics();
    } catch (error) {
      showMessage('Failed to toggle automation engine');
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await window.api.automation.toggleRule(ruleId, enabled);
      await loadSettings();
      showMessage(`Rule ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      showMessage('Failed to toggle rule');
    }
  };

  const triggerRule = async (ruleId: string) => {
    try {
      await window.api.automation.triggerRule(ruleId);
      showMessage('Rule triggered manually');
      await loadStatistics();
    } catch (error) {
      showMessage('Failed to trigger rule');
    }
  };

  const resetStatistics = async () => {
    try {
      await window.api.automation.resetStatistics();
      await loadStatistics();
      showMessage('Statistics reset');
    } catch (error) {
      showMessage('Failed to reset statistics');
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const formatLastRun = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'file-change': return '📁';
      case 'process-start': return '🎮';
      case 'schedule': return '⏰';
      case 'manual': return '👆';
      default: return '❓';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-8 h-8 text-green-400" />
            Automation Manager
          </h1>
          <p className="text-slate-400 mt-1">
            Automatic background processes for Fallout 4 modding
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={toggleEngine}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              stats?.isRunning
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {stats?.isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Stop Engine
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Engine
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400">
          {message}
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            {stats?.isRunning ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            )}
            <span className="text-slate-400 text-sm">Engine Status</span>
          </div>
          <div className={`text-2xl font-bold ${stats?.isRunning ? 'text-green-400' : 'text-yellow-400'}`}>
            {stats?.isRunning ? 'Running' : 'Stopped'}
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">Active Watchers</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {stats?.activeWatchers || 0}
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400 text-sm">Scheduled Tasks</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {stats?.activeIntervals || 0}
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">Total Executions</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {stats?.rules.reduce((sum, r) => sum + r.runCount, 0) || 0}
          </div>
        </div>
      </div>

      {/* Automation Rules */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100">Automation Rules</h2>
          <button
            onClick={resetStatistics}
            className="text-sm text-slate-400 hover:text-slate-200 underline"
          >
            Reset Statistics
          </button>
        </div>

        <div className="divide-y divide-slate-700">
          {rules.map((rule) => {
            const ruleStats = stats?.rules.find(r => r.id === rule.id);
            return (
              <div key={rule.id} className="p-4 hover:bg-slate-750 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl">{getTriggerIcon(rule.trigger)}</div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-100 mb-1">{rule.name}</h3>
                      <div className="flex gap-4 text-sm text-slate-400">
                        <span>Trigger: <span className="text-slate-300">{rule.trigger}</span></span>
                        <span>Action: <span className="text-slate-300">{rule.action}</span></span>
                        <span>Runs: <span className="text-green-400">{ruleStats?.runCount || 0}</span></span>
                        <span>Last: <span className="text-slate-300">{formatLastRun(ruleStats?.lastRun)}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerRule(rule.id)}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                      disabled={!stats?.isRunning}
                    >
                      Trigger Now
                    </button>
                    
                    <button
                      onClick={() => toggleRule(rule.id, !rule.enabled)}
                      className={`px-3 py-1 text-sm rounded transition ${
                        rule.enabled
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Information */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h3 className="font-semibold text-blue-400 mb-2">ℹ️ How Automation Works</h3>
        <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
          <li><strong>File Change:</strong> Monitors directories for new/modified files</li>
          <li><strong>Process Start:</strong> Detects when Fallout 4 or other tools launch</li>
          <li><strong>Schedule:</strong> Runs tasks at specific times (e.g., nightly maintenance)</li>
          <li><strong>Manual:</strong> Triggered by user action or other automation</li>
        </ul>
      </div>

      {/* Examples */}
      <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
        <h3 className="font-semibold text-green-400 mb-2">✨ Automation Examples</h3>
        <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
          <li>Automatically scan for conflicts when you add a new mod to Data folder</li>
          <li>Start log monitoring when Fallout 4 launches</li>
          <li>Run nightly maintenance to check for duplicates and clean up</li>
          <li>Auto-backup before any file modifications</li>
          <li>Notify you of potential issues before they cause crashes</li>
        </ul>
      </div>
    </div>
  );
}
