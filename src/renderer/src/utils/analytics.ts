import { AnalyticsEvent } from '../../shared/types';

/**
 * Analytics tracking utility for Mossy
 * Provides centralized event tracking with privacy controls
 */

export class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private enabled = false;
  private userId: string | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  private async initialize() {
    try {
      const settings = await window.electronAPI?.getSettings?.();
      this.enabled = settings?.analytics?.enabled ?? false;
      this.userId = settings?.analytics?.userId || this.generateUserId();
    } catch (error) {
      console.warn('Analytics initialization failed:', error);
      this.enabled = false;
    }
  }

  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  async trackEvent(eventType: string, properties: Record<string, any> = {}) {
    if (!this.enabled) return;

    try {
      const event: AnalyticsEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: eventType,
        timestamp: new Date().toISOString(),
        userId: this.userId!,
        properties: {
          ...properties,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      };

      await window.electronAPI?.trackAnalyticsEvent?.(event);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  // Convenience methods for common events
  async trackPageView(page: string, properties: Record<string, any> = {}) {
    await this.trackEvent('page_view', { page, ...properties });
  }

  async trackFeatureUsage(feature: string, action: string, properties: Record<string, any> = {}) {
    await this.trackEvent('feature_usage', { feature, action, ...properties });
  }

  async trackProjectAction(action: string, projectId: string, properties: Record<string, any> = {}) {
    await this.trackEvent('project_action', { action, projectId, ...properties });
  }

  async trackCollaborationEvent(action: string, sessionId: string, properties: Record<string, any> = {}) {
    await this.trackEvent('collaboration', { action, sessionId, ...properties });
  }

  async trackError(errorType: string, errorMessage: string, properties: Record<string, any> = {}) {
    await this.trackEvent('error', { errorType, errorMessage, ...properties });
  }

  async trackPerformance(metric: string, value: number, properties: Record<string, any> = {}) {
    await this.trackEvent('performance', { metric, value, ...properties });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const analytics = AnalyticsTracker.getInstance();

// React hook for analytics tracking
export const useAnalytics = () => {
  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    trackProjectAction: analytics.trackProjectAction.bind(analytics),
    trackCollaborationEvent: analytics.trackCollaborationEvent.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    isEnabled: analytics.isEnabled.bind(analytics),
  };
};