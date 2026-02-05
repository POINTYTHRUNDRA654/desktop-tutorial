/**
 * ActivityMonitor.ts
 * Tracks user actions, tool usage, and workflow patterns for Mossy's learning system
 * NO TTS/AVATAR DEPENDENCIES - completely isolated
 */

export interface ActivityEntry {
  id: string;
  timestamp: number;
  actionType: 'tool_use' | 'file_operation' | 'ai_query' | 'decision' | 'workflow_step';
  actionName: string;
  description: string;
  duration?: number; // milliseconds
  success: boolean;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface WorkflowPattern {
  id: string;
  name: string;
  steps: string[];
  frequency: number;
  avgDuration: number;
  successRate: number;
  lastUsed: number;
}

export interface LearningInsight {
  id: string;
  type: 'improvement' | 'pattern' | 'suggestion';
  title: string;
  description: string;
  confidence: number; // 0-1
  relatedActions: string[];
  potentialTimeSaved?: number; // milliseconds
  createdAt: number;
}

export class ActivityMonitor {
  private activities: ActivityEntry[] = [];
  private patterns: Map<string, WorkflowPattern> = new Map();
  private insights: LearningInsight[] = [];
  private maxRetentionDays: number;
  private enabled: boolean;

  constructor(retentionDays: number = 30, enabled: boolean = true) {
    this.maxRetentionDays = retentionDays;
    this.enabled = enabled;
  }

  /**
   * Log a new activity
   */
  logActivity(
    actionType: ActivityEntry['actionType'],
    actionName: string,
    description: string,
    options?: {
      duration?: number;
      success?: boolean;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): ActivityEntry {
    if (!this.enabled) return null as any;

    const entry: ActivityEntry = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      actionType,
      actionName,
      description,
      duration: options?.duration,
      success: options?.success !== undefined ? options.success : true,
      metadata: options?.metadata,
      tags: options?.tags,
    };

    this.activities.push(entry);
    this.pruneOldActivities();
    return entry;
  }

  /**
   * Get activities within a time window
   */
  getActivities(
    hours: number = 24,
    actionType?: ActivityEntry['actionType']
  ): ActivityEntry[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.activities.filter(
      (a) =>
        a.timestamp >= cutoff &&
        (!actionType || a.actionType === actionType)
    );
  }

  /**
   * Detect workflow patterns
   */
  detectPatterns(): WorkflowPattern[] {
    const recentActivities = this.getActivities(24);
    const actionSequences: Map<string, ActivityEntry[]> = new Map();

    // Group consecutive actions by tags/type
    let currentSequence: ActivityEntry[] = [];
    for (const activity of recentActivities) {
      currentSequence.push(activity);

      // If we hit a decision point, save the sequence
      if (activity.actionType === 'decision' && currentSequence.length > 1) {
        const key = currentSequence.map((a) => a.actionName).join(' -> ');
        if (!actionSequences.has(key)) {
          actionSequences.set(key, []);
        }
        actionSequences.get(key)!.push(...currentSequence);
        currentSequence = [];
      }
    }

    // Convert to patterns
    const patterns: WorkflowPattern[] = [];
    for (const [sequence, entries] of actionSequences) {
      if (entries.length < 2) continue; // Ignore single occurrences

      const durations = entries
        .filter((e) => e.duration)
        .map((e) => e.duration!);
      const avgDuration =
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;

      const successCount = entries.filter((e) => e.success).length;
      const successRate = entries.length > 0 ? successCount / entries.length : 0;

      const pattern: WorkflowPattern = {
        id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: sequence,
        steps: sequence.split(' -> '),
        frequency: entries.length,
        avgDuration,
        successRate,
        lastUsed: Math.max(...entries.map((e) => e.timestamp)),
      };

      patterns.push(pattern);
    }

    // Store patterns
    for (const pattern of patterns) {
      this.patterns.set(pattern.id, pattern);
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate learning insights
   */
  generateInsights(): LearningInsight[] {
    if (!this.enabled) return [];

    const patterns = this.detectPatterns();
    const newInsights: LearningInsight[] = [];

    // Insight: High-success patterns
    for (const pattern of patterns) {
      if (pattern.successRate > 0.9 && pattern.frequency >= 3) {
        newInsights.push({
          id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'pattern',
          title: `Effective workflow detected: ${pattern.name}`,
          description: `You've successfully completed this sequence ${pattern.frequency} times with a ${(pattern.successRate * 100).toFixed(0)}% success rate.`,
          confidence: Math.min(pattern.successRate, pattern.frequency / 10),
          relatedActions: pattern.steps,
          createdAt: Date.now(),
        });
      }

      // Insight: Potential improvements
      if (pattern.frequency >= 3 && pattern.successRate < 0.8) {
        newInsights.push({
          id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'improvement',
          title: `Pattern needing refinement: ${pattern.name}`,
          description: `This workflow has a ${(pattern.successRate * 100).toFixed(0)}% success rate. Consider adjusting your approach.`,
          confidence: 0.6,
          relatedActions: pattern.steps,
          createdAt: Date.now(),
        });
      }
    }

    // Insight: Time savings opportunity
    const activities = this.getActivities(24);
    const slowActivities = activities
      .filter((a) => a.duration && a.duration > 5000)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 3);

    for (const activity of slowActivities) {
      newInsights.push({
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'suggestion',
        title: `Optimization opportunity: ${activity.actionName}`,
        description: `This action typically takes ${(activity.duration! / 1000).toFixed(1)}s. There might be a faster way.`,
        confidence: 0.5,
        relatedActions: [activity.actionName],
        potentialTimeSaved: activity.duration,
        createdAt: Date.now(),
      });
    }

    this.insights.push(...newInsights);
    return newInsights;
  }

  /**
   * Get insights matching confidence threshold
   */
  getInsights(minConfidence: number = 0.75): LearningInsight[] {
    return this.insights.filter((i) => i.confidence >= minConfidence);
  }

  /**
   * Remove old activities beyond retention period
   */
  private pruneOldActivities(): void {
    const cutoff = Date.now() - this.maxRetentionDays * 24 * 60 * 60 * 1000;
    this.activities = this.activities.filter((a) => a.timestamp >= cutoff);
  }

  /**
   * Export activity data
   */
  exportData() {
    return {
      activities: this.activities,
      patterns: Array.from(this.patterns.values()),
      insights: this.insights,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Clear all monitoring data
   */
  clearData(): void {
    this.activities = [];
    this.patterns.clear();
    this.insights = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Export singleton instance for app-wide use
// Note: Configuration is now handled in the hook/renderer layer
export const activityMonitor = new ActivityMonitor(
  30, // retention days - default
  false // disabled by default, enabled via hook configuration
);
