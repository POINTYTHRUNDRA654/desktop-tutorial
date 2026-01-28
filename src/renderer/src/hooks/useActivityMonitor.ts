/**
 * useActivityMonitor.ts
 * React hook for integrating ActivityMonitor and ProcessLearner into components
 * Optimized to not block rendering or TTS
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import type { ActivityEntry } from '../../../shared/ActivityMonitor';
import { activityMonitor } from '../../../shared/ActivityMonitor';
import type { Suggestion } from '../../../shared/ProcessLearner';
import { processLearner } from '../../../shared/ProcessLearner';

// Read config safely
const isMonitorEnabled = () => {
  try {
    return import.meta.env.VITE_ENABLE_ACTIVITY_MONITOR === 'true';
  } catch {
    return false;
  }
};

export function useActivityMonitor() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const isEnabledRef = useRef(isMonitorEnabled());
  const [isEnabled] = useState(isEnabledRef.current);

  // Log an activity (non-blocking)
  const logActivity = useCallback(
    (
      actionType: ActivityEntry['actionType'],
      actionName: string,
      description: string,
      options?: {
        duration?: number;
        success?: boolean;
        metadata?: Record<string, unknown>;
        tags?: string[];
      }
    ) => {
      if (!isEnabled) return;
      
      // Defer to next microtask to avoid blocking
      try {
        Promise.resolve().then(() => {
          activityMonitor.logActivity(actionType, actionName, description, options);
        }).catch(e => console.error('[ActivityMonitor] Log error:', e));
      } catch (e) {
        console.error('[ActivityMonitor] Error logging activity:', e);
        return null;
      }
    },
    [isEnabled]
  );

  // Generate and update suggestions (non-blocking)
  const updateSuggestions = useCallback(() => {
    if (!isEnabled) return;
    try {
      Promise.resolve().then(() => {
        const newSuggestions = processLearner.analyzeBehavior();
        setSuggestions(newSuggestions);
      }).catch(e => console.error('[ProcessLearner] Analysis error:', e));
    } catch (e) {
      console.error('[ActivityMonitor] Error generating suggestions:', e);
      return [];
    }
  }, [isEnabled]);

  // Generate suggestions periodically (only if enabled)
  useEffect(() => {
    if (!isEnabled) return;

    // Generate initial suggestions after a delay to not block startup
    const initialTimer = setTimeout(updateSuggestions, 2000);

    // Update every 5 minutes
    const interval = setInterval(updateSuggestions, 5 * 60 * 1000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isEnabled, updateSuggestions]);

  return {
    logActivity,
    updateSuggestions,
    suggestions,
    isEnabled,
    setIsEnabled: (enabled: boolean) => {
      isEnabledRef.current = enabled;
    },
    getTopSuggestions: (count: number = 3) =>
      suggestions.slice(0, count),
  };
}
