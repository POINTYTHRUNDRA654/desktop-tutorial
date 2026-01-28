/**
 * SuggestionPanel.tsx
 * Displays Mossy's learning-based process improvement suggestions
 * Completely isolated from TTS/Avatar - just displays suggestions
 */

import React from 'react';
import { Lightbulb, TrendingUp, Clock, AlertCircle, Zap } from 'lucide-react';
import type { Suggestion } from '../../../shared/ProcessLearner';
import '../styles/SuggestionPanel.css';

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  onDismiss?: (id: string) => void;
  onAccept?: (id: string) => void;
  showAll?: boolean;
}

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  suggestions,
  onDismiss,
  onAccept,
  showAll = false,
}) => {
  const displaySuggestions = showAll ? suggestions : suggestions.slice(0, 3);

  if (displaySuggestions.length === 0) {
    return null;
  }

  const getCategoryIcon = (category: Suggestion['category']) => {
    switch (category) {
      case 'efficiency':
        return <Clock className="w-4 h-4" />;
      case 'order':
        return <TrendingUp className="w-4 h-4" />;
      case 'automation':
        return <Zap className="w-4 h-4" />;
      case 'safety':
        return <AlertCircle className="w-4 h-4" />;
      case 'quality':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f59e0b'; // amber
      case 'low':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  const getConfidenceBar = (confidence: number) => {
    return (
      <div className="suggestion-confidence-bar">
        <div
          className="suggestion-confidence-fill"
          style={{
            width: `${confidence * 100}%`,
            backgroundColor: confidence > 0.8 ? '#10b981' : confidence > 0.6 ? '#f59e0b' : '#ef4444',
          }}
        />
        <span className="suggestion-confidence-text">{(confidence * 100).toFixed(0)}%</span>
      </div>
    );
  };

  return (
    <div className="suggestion-panel">
      <div className="suggestion-panel-header">
        <Lightbulb className="w-5 h-5" />
        <h3>Mossy's Process Insights</h3>
        {suggestions.length > 3 && !showAll && (
          <span className="suggestion-count">+{suggestions.length - 3}</span>
        )}
      </div>

      <div className="suggestion-list">
        {displaySuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`suggestion-card priority-${suggestion.priority}`}
            style={{
              borderLeftColor: getPriorityColor(suggestion.priority),
            }}
          >
            <div className="suggestion-header">
              <div className="suggestion-icon-and-title">
                {getCategoryIcon(suggestion.category)}
                <span className="suggestion-category">{suggestion.category}</span>
                <h4 className="suggestion-title">{suggestion.title}</h4>
              </div>
              <span
                className="suggestion-priority-badge"
                style={{ backgroundColor: getPriorityColor(suggestion.priority) }}
              >
                {suggestion.priority}
              </span>
            </div>

            <p className="suggestion-description">{suggestion.description}</p>

            {suggestion.reasoning && (
              <p className="suggestion-reasoning">💭 {suggestion.reasoning}</p>
            )}

            <div className="suggestion-confidence">
              <label>Confidence</label>
              {getConfidenceBar(suggestion.confidence)}
            </div>

            {suggestion.potentialBenefit && (
              <div className="suggestion-benefit">
                <Zap className="w-4 h-4" />
                <span>{suggestion.potentialBenefit}</span>
              </div>
            )}

            {suggestion.actionToTake && (
              <div className="suggestion-action">
                <strong>💡 Next Step:</strong> {suggestion.actionToTake}
              </div>
            )}

            <div className="suggestion-actions">
              {onAccept && (
                <button
                  className="suggestion-btn suggestion-btn-accept"
                  onClick={() => onAccept(suggestion.id)}
                >
                  ✓ Got it
                </button>
              )}
              {onDismiss && (
                <button
                  className="suggestion-btn suggestion-btn-dismiss"
                  onClick={() => onDismiss(suggestion.id)}
                >
                  ✕ Dismiss
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!showAll && suggestions.length > 3 && (
        <div className="suggestion-panel-footer">
          <em>View more insights in settings</em>
        </div>
      )}
    </div>
  );
};
