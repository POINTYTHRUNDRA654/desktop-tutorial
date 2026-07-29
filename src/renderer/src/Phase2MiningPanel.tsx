/**
 * Phase 2 Mining Panel
 *
 * Container that polls the real Phase 2 mining engines (Contextual, ML Conflict
 * Prediction, Performance Bottleneck Detection, Hardware-Aware, Longitudinal)
 * over IPC and feeds live results into Phase2MiningDashboard.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Phase2MiningDashboard } from './components/mining/Phase2MiningDashboard';

type Phase2EngineName = 'contextual' | 'mlConflict' | 'performance' | 'hardware' | 'longitudinal';

interface EngineSlot {
  isActive: boolean;
  status?: any;
  results?: any;
}

type EngineMap = Record<Phase2EngineName, EngineSlot>;

const EMPTY_ENGINES: EngineMap = {
  contextual: { isActive: false },
  mlConflict: { isActive: false },
  performance: { isActive: false },
  hardware: { isActive: false },
  longitudinal: { isActive: false }
};

const POLL_INTERVAL_MS = 15000;

export const Phase2MiningPanel: React.FC = () => {
  const [engines, setEngines] = useState<EngineMap>(EMPTY_ENGINES);

  const refreshAll = useCallback(async () => {
    const api = window.electronAPI?.phase2Mining;
    if (!api) return;
    const response = await api.getAll();
    if (response?.success && response.data) {
      setEngines(response.data as EngineMap);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshAll]);

  const handleEngineToggle = useCallback(async (engine: string, active: boolean) => {
    const api = window.electronAPI?.phase2Mining;
    if (!api) return;
    const response = active ? await api.startEngine(engine) : await api.stopEngine(engine);
    if (response?.success && response.data) {
      setEngines(prev => ({ ...prev, [engine]: response.data }));
    }
  }, []);

  const handleStartAll = useCallback(async () => {
    const api = window.electronAPI?.phase2Mining;
    if (!api) return;
    const response = await api.startAll();
    if (response?.success && response.data) {
      setEngines(response.data as EngineMap);
    }
  }, []);

  const handleStopAll = useCallback(async () => {
    const api = window.electronAPI?.phase2Mining;
    if (!api) return;
    const response = await api.stopAll();
    if (response?.success && response.data) {
      setEngines(response.data as EngineMap);
    }
  }, []);

  return (
    <Phase2MiningDashboard
      engines={engines}
      onEngineToggle={handleEngineToggle}
      onStartAll={handleStartAll}
      onStopAll={handleStopAll}
      onRefreshAll={refreshAll}
    />
  );
};

export default Phase2MiningPanel;
