import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Sparkles, 
  Cpu, 
  Box, 
  Users, 
  Zap, 
  Package, 
  TestTube, 
  Bug, 
  Gauge,
  Lightbulb
} from 'lucide-react';
import { contextAwareAIService, AIContext, WorkflowStage } from './ContextAwareAIService';

const stageIcons: Record<WorkflowStage, React.ComponentType<any>> = {
  planning: Lightbulb,
  modeling: Box,
  rigging: Users,
  animation: Zap,
  texturing: Sparkles,
  export: Package,
  testing: TestTube,
  debugging: Bug,
  optimizing: Gauge,
  packaging: Package
};

const stageColors: Record<WorkflowStage, string> = {
  planning: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  modeling: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
  rigging: 'text-purple-400 bg-purple-900/20 border-purple-500/30',
  animation: 'text-green-400 bg-green-900/20 border-green-500/30',
  texturing: 'text-pink-400 bg-pink-900/20 border-pink-500/30',
  export: 'text-orange-400 bg-orange-900/20 border-orange-500/30',
  testing: 'text-cyan-400 bg-cyan-900/20 border-cyan-500/30',
  debugging: 'text-red-400 bg-red-900/20 border-red-500/30',
  optimizing: 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30',
  packaging: 'text-indigo-400 bg-indigo-900/20 border-indigo-500/30'
};

const stageLabels: Record<WorkflowStage, string> = {
  planning: 'Planning',
  modeling: 'Modeling',
  rigging: 'Rigging',
  animation: 'Animation',
  texturing: 'Texturing',
  export: 'Export',
  testing: 'Testing',
  debugging: 'Debugging',
  optimizing: 'Optimizing',
  packaging: 'Packaging'
};

export const WorkflowStageIndicator: React.FC = () => {
  const [context, setContext] = useState<AIContext>(contextAwareAIService.getCurrentContext());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = contextAwareAIService.onContextUpdate((newContext) => {
      setContext(newContext);
    });

    return unsubscribe;
  }, []);

  const Icon = stageIcons[context.workflowStage];
  const colorClass = stageColors[context.workflowStage];
  const label = stageLabels[context.workflowStage];

  const confidencePercentage = Math.round(context.stageConfidence * 100);

  return (
    <div className="relative">
      {/* Compact indicator */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${colorClass} hover:opacity-80`}
        title="Click to see workflow details"
      >
        <Brain className="w-4 h-4 animate-pulse" />
        <Icon className="w-4 h-4" />
        <span>{label}</span>
        {context.blenderWorkflowStage && (
          <span className="text-xs opacity-70">({context.blenderWorkflowStage})</span>
        )}
        <span className="text-xs opacity-60">{confidencePercentage}%</span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4 min-w-80 z-50 animate-slide-down">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              AI Context Awareness
            </h3>
            <button
              onClick={() => setExpanded(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Workflow Stage */}
            <div>
              <div className="text-slate-400 mb-1">Workflow Stage</div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded border ${colorClass}`}>
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
                <span className="ml-auto text-xs opacity-70">{confidencePercentage}% confident</span>
              </div>
            </div>

            {/* Blender Pipeline Stage */}
            {context.blenderWorkflowStage && (
              <div>
                <div className="text-slate-400 mb-1">Blender Pipeline</div>
                <div className="text-emerald-400 font-medium capitalize">
                  {context.blenderWorkflowStage}
                </div>
              </div>
            )}

            {/* Active Tools */}
            {context.activeTools.length > 0 && (
              <div>
                <div className="text-slate-400 mb-1">Active Tools</div>
                <div className="flex flex-wrap gap-1">
                  {context.activeTools.filter(t => t.isActive).map(tool => (
                    <span
                      key={tool.name}
                      className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                    >
                      {tool.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* File Types */}
            {context.detectedFileTypes.length > 0 && (
              <div>
                <div className="text-slate-400 mb-1">Working With</div>
                <div className="flex flex-wrap gap-1">
                  {context.detectedFileTypes.map(type => (
                    <span
                      key={type}
                      className="px-2 py-1 bg-slate-800 text-blue-400 rounded text-xs font-mono"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* User Intent */}
            <div>
              <div className="text-slate-400 mb-1">Detected Activity</div>
              <div className="text-slate-300 capitalize">
                {context.userIntent.replace(/-/g, ' ')}
              </div>
            </div>

            {/* Session Info */}
            <div className="pt-2 border-t border-slate-700 text-slate-400 text-xs">
              <div className="flex justify-between">
                <span>Time of Day:</span>
                <span className="text-slate-300 capitalize">{context.timeOfDay}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Session Duration:</span>
                <span className="text-slate-300">
                  {Math.floor(context.sessionDuration / 60)}m
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowStageIndicator;
