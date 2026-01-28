/**
 * ProcessLearner.ts
 * Analyzes activity patterns and generates smart suggestions for process improvement
 * Integrates with ActivityMonitor - completely independent from TTS/Avatar
 */

import {
  ActivityEntry,
  WorkflowPattern,
  LearningInsight,
  activityMonitor,
} from './ActivityMonitor';

export interface Suggestion {
  id: string;
  category:
    | 'efficiency'
    | 'order'
    | 'automation'
    | 'safety'
    | 'quality';
  title: string;
  description: string;
  reasoning: string;
  confidence: number; // 0-1
  potentialBenefit: string;
  relatedPattern?: WorkflowPattern;
  actionToTake?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export class ProcessLearner {
  private suggestions: Map<string, Suggestion> = new Map();
  private thresholdConfidence: number;

  constructor(thresholdConfidence: number = 0.75) {
    this.thresholdConfidence = thresholdConfidence;
  }

  /**
   * Analyze current workflows and generate suggestions
   */
  analyzeBehavior(): Suggestion[] {
    const insights = activityMonitor.generateInsights();
    const patterns = this.getPatterns();
    const newSuggestions: Suggestion[] = [];

    // === EFFICIENCY SUGGESTIONS ===
    for (const pattern of patterns) {
      if (pattern.avgDuration > 10000 && pattern.frequency >= 3) {
        newSuggestions.push({
          id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          category: 'efficiency',
          title: `Speed up: ${pattern.steps[0]} → ${pattern.steps[pattern.steps.length - 1]}`,
          description: `This workflow takes an average of ${(pattern.avgDuration / 1000).toFixed(1)}s per run. We've noticed you do this frequently.`,
          reasoning: `You've completed this sequence ${pattern.frequency} times. Optimizing it could save significant time.`,
          confidence: Math.min(0.95, 0.6 + pattern.frequency * 0.05),
          potentialBenefit: `Save ~${(pattern.avgDuration / 1000).toFixed(1)}s per execution`,
          relatedPattern: pattern,
          priority:
            pattern.frequency >= 5 && pattern.avgDuration > 20000
              ? 'high'
              : 'medium',
          actionToTake: `Consider batching these steps or using keyboard shortcuts.`,
          createdAt: Date.now(),
        });
      }
    }

    // === ORDER OPTIMIZATION ===
    for (const pattern of patterns) {
      if (pattern.steps.length >= 3 && pattern.successRate < 0.9) {
        newSuggestions.push({
          id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          category: 'order',
          title: `Reorder steps: ${pattern.name}`,
          description: `This sequence has a ${(pattern.successRate * 100).toFixed(0)}% success rate. The order might need adjustment.`,
          reasoning: `High-frequency pattern with room for improvement in reliability.`,
          confidence: 0.6 + pattern.successRate * 0.2,
          potentialBenefit: `Increase success rate from ${(pattern.successRate * 100).toFixed(0)}% to 95%+`,
          relatedPattern: pattern,
          priority: pattern.successRate < 0.7 ? 'high' : 'medium',
          actionToTake: `Try rearranging: ${pattern.steps.reverse().join(' → ')}`,
          createdAt: Date.now(),
        });
      }
    }

    // === AUTOMATION SUGGESTIONS ===
    for (const pattern of patterns) {
      if (pattern.frequency >= 5 && pattern.steps.length >= 2) {
        newSuggestions.push({
          id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          category: 'automation',
          title: `Automate workflow: ${pattern.name}`,
          description: `You've performed this ${pattern.frequency} times. This is a candidate for automation.`,
          reasoning: `High-frequency, consistent workflow that repeats regularly.`,
          confidence: Math.min(0.9, 0.5 + pattern.frequency * 0.08),
          potentialBenefit: `Eliminate repetitive work, save time on subsequent runs`,
          relatedPattern: pattern,
          priority: pattern.frequency >= 8 ? 'high' : 'medium',
          actionToTake: `Record this as a macro or script for future use.`,
          createdAt: Date.now(),
        });
      }
    }

    // === SAFETY/QUALITY SUGGESTIONS ===
    const failedActivities = activityMonitor.getActivities(24).filter((a) => !a.success);
    for (const activity of failedActivities.slice(0, 3)) {
      newSuggestions.push({
        id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: 'safety',
        title: `Safety check: ${activity.actionName}`,
        description: `This action failed. Let's prevent that next time.`,
        reasoning: `Recent failure detected. Adding a verification step could help.`,
        confidence: 0.8,
        potentialBenefit: `Prevent similar failures in the future`,
        priority: 'high',
        actionToTake: `Double-check prerequisites before running this action.`,
        createdAt: Date.now(),
      });
    }

    // Store suggestions
    for (const sugg of newSuggestions) {
      this.suggestions.set(sugg.id, sugg);
    }

    return newSuggestions.filter(
      (s) => s.confidence >= this.thresholdConfidence
    );
  }

  /**
   * Get suggestion for specific activity
   */
  getSuggestionFor(
    actionName: string
  ): Suggestion | undefined {
    const values = Array.from(this.suggestions.values());
    return values.find((s) =>
      s.relatedPattern?.steps.some((step) =>
        step.toLowerCase().includes(actionName.toLowerCase())
      )
    );
  }

  /**
   * Get high-priority suggestions
   */
  getTopPrioritySuggestions(count: number = 5): Suggestion[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return Array.from(this.suggestions.values())
      .sort((a, b) => {
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, count);
  }

  /**
   * Get all active suggestions
   */
  getAllSuggestions(): Suggestion[] {
    return Array.from(this.suggestions.values()).sort(
      (a, b) => b.confidence - a.confidence
    );
  }

  /**
   * Get patterns from monitor
   */
  private getPatterns(): WorkflowPattern[] {
    return (activityMonitor as any).detectPatterns?.() || [];
  }

  /**
   * Format suggestion as human-readable text (for display or logging)
   */
  formatSuggestion(suggestion: Suggestion): string {
    return `${suggestion.priority.toUpperCase()} [${suggestion.category}] ${suggestion.title}\n${suggestion.description}\n→ ${suggestion.actionToTake}`;
  }

  /**
   * Clear suggestions
   */
  clearSuggestions(): void {
    this.suggestions.clear();
  }

  /**
   * Set confidence threshold
   */
  setThreshold(threshold: number): void {
    this.thresholdConfidence = Math.max(0, Math.min(1, threshold));
  }
}

// Export singleton - configuration handled in hook layer
export const processLearner = new ProcessLearner(0.75); // default threshold
