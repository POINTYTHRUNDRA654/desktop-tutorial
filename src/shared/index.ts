/**
 * shared/index.ts
 * Central export point for shared modules
 */

// Activity Monitoring & Learning System
export { ActivityMonitor, activityMonitor } from './ActivityMonitor';
export type {
  ActivityEntry,
  WorkflowPattern,
  LearningInsight,
} from './ActivityMonitor';

export { ProcessLearner, processLearner } from './ProcessLearner';
export type { Suggestion } from './ProcessLearner';

// Existing exports
export * from './types';
export * from './FO4KnowledgeBase';
export * from './MossyQuickActions';
