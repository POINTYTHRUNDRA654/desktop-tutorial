import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Lightbulb, CheckCircle, AlertTriangle, Target, FileText, Code, Download } from 'lucide-react';
import { selfImprovementEngine, ImprovementOpportunity, ScriptGenerationRequest, GeneratedScript } from '../SelfImprovementEngine';

interface SelfImprovementPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SelfImprovementPanel: React.FC<SelfImprovementPanelProps> = ({ isVisible, onClose }) => {
  const [opportunities, setOpportunities] = useState<ImprovementOpportunity[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ImprovementOpportunity | null>(null);
  const [generatedScripts, setGeneratedScripts] = useState<GeneratedScript[]>([]);
  const [scriptRequest, setScriptRequest] = useState<ScriptGenerationRequest>({
    type: 'papyrus',
    name: '',
    description: '',
    requirements: []
  });
  const [showScriptGenerator, setShowScriptGenerator] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadData();
    }
  }, [isVisible]);

  const loadData = () => {
    setOpportunities(selfImprovementEngine.generateImprovementSuggestions());
    setMetrics(selfImprovementEngine.getPerformanceMetrics());
    setGeneratedScripts(selfImprovementEngine.getGeneratedScripts());
  };

  const implementOpportunity = (opportunityId: string) => {
    selfImprovementEngine.implementImprovement(opportunityId);
    loadData(); // Refresh data
  };

  const generateScript = () => {
    try {
      const generatedScript = selfImprovementEngine.generateScript(scriptRequest);
      setGeneratedScripts(selfImprovementEngine.getGeneratedScripts());
      setScriptRequest({
        type: 'papyrus',
        name: '',
        description: '',
        requirements: []
      });
      alert(`Script "${generatedScript.name}" generated successfully!`);
    } catch (error) {
      alert(`Error generating script: ${error}`);
    }
  };

  const downloadScript = (script: GeneratedScript) => {
    const blob = new Blob([script.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.name}.${getFileExtension(script.type)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteScript = (scriptId: string) => {
    if (confirm('Are you sure you want to delete this script?')) {
      selfImprovementEngine.deleteScript(scriptId);
      setGeneratedScripts(selfImprovementEngine.getGeneratedScripts());
    }
  };

  const getFileExtension = (type: string): string => {
    switch (type) {
      case 'papyrus': return 'psc';
      case 'xedit': return 'pas';
      case 'blender': return 'py';
      case 'quest': return 'psc';
      case 'automation': return 'py';
      default: return 'txt';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'knowledge_gap': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'response_improvement': return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'new_feature': return <Lightbulb className="w-4 h-4 text-purple-400" />;
      case 'efficiency_gain': return <Target className="w-4 h-4 text-green-400" />;
      default: return <Brain className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Mossy's Self-Improvement Center</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Performance Metrics */}
        {metrics && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Performance Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{metrics.totalInteractions}</div>
                <div className="text-sm text-gray-300">Total Interactions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{metrics.totalPatterns}</div>
                <div className="text-sm text-gray-300">Learned Patterns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{(metrics.averageSuccessRate * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-300">Avg Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{metrics.averageFeedbackRating.toFixed(1)}/5</div>
                <div className="text-sm text-gray-300">Avg User Rating</div>
              </div>
            </div>
          </div>
        )}

        {/* Improvement Opportunities */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Suggested Improvements ({opportunities.length})
          </h3>

          {opportunities.length === 0 ? (
            <div className="bg-gray-700 rounded-lg p-4 text-center text-gray-400">
              No improvement opportunities identified yet. Keep interacting with Mossy to generate suggestions!
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
                  onClick={() => setSelectedOpportunity(opportunity)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getTypeIcon(opportunity.type)}
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{opportunity.description}</h4>
                        <p className="text-gray-300 text-sm mb-2">{opportunity.proposedSolution}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">
                            Confidence: {(opportunity.confidence * 100).toFixed(0)}%
                          </span>
                          <span className={`font-medium ${getImpactColor(opportunity.impact)}`}>
                            Impact: {opportunity.impact}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        implementOpportunity(opportunity.id);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Implement
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Opportunity Details */}
        {selectedOpportunity && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">Improvement Details</h4>
            <div className="text-gray-300 text-sm space-y-2">
              <p><strong>Type:</strong> {selectedOpportunity.type.replace('_', ' ')}</p>
              <p><strong>Description:</strong> {selectedOpportunity.description}</p>
              <p><strong>Proposed Solution:</strong> {selectedOpportunity.proposedSolution}</p>
              <p><strong>Confidence:</strong> {(selectedOpportunity.confidence * 100).toFixed(0)}%</p>
              <p><strong>Impact:</strong> {selectedOpportunity.impact}</p>
              <p><strong>Created:</strong> {new Date(selectedOpportunity.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* Learning Insights */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Current Learning Insights</h3>
          <div className="text-gray-300 text-sm whitespace-pre-line">
            {selfImprovementEngine.getLearningInsights() || 'No insights available yet. Continue interacting to generate learning data!'}
          </div>
        </div>

        {/* Script Generation */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-400" />
              Autonomous Script Generation
            </h3>
            <button
              onClick={() => setShowScriptGenerator(!showScriptGenerator)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              {showScriptGenerator ? 'Hide Generator' : 'Generate Script'}
            </button>
          </div>

          {showScriptGenerator && (
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Script Type</label>
                  <select
                    value={scriptRequest.type}
                    onChange={(e) => setScriptRequest({...scriptRequest, type: e.target.value as any})}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  >
                    <option value="papyrus">Papyrus (Fallout 4)</option>
                    <option value="xedit">xEdit Script</option>
                    <option value="blender">Blender Python</option>
                    <option value="quest">Quest Script</option>
                    <option value="automation">Automation Script</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Script Name (Optional)</label>
                  <input
                    type="text"
                    value={scriptRequest.name}
                    onChange={(e) => setScriptRequest({...scriptRequest, name: e.target.value})}
                    placeholder="Auto-generated if empty"
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={scriptRequest.description}
                  onChange={(e) => setScriptRequest({...scriptRequest, description: e.target.value})}
                  placeholder="Describe what the script should do..."
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white h-20 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Requirements (Optional)</label>
                <input
                  type="text"
                  value={scriptRequest.requirements?.join(', ') || ''}
                  onChange={(e) => setScriptRequest({
                    ...scriptRequest,
                    requirements: e.target.value.split(',').map(r => r.trim()).filter(r => r)
                  })}
                  placeholder="quest, combat, dialogue (comma-separated)"
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                />
              </div>

              <button
                onClick={generateScript}
                disabled={!scriptRequest.description.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate Script
              </button>
            </div>
          )}

          {/* Generated Scripts List */}
          {generatedScripts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-md font-medium text-white mb-2">Generated Scripts ({generatedScripts.length})</h4>
              {generatedScripts.slice(0, 5).map((script) => (
                <div key={script.id} className="bg-gray-600 rounded p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-medium">{script.name}</div>
                    <div className="text-gray-300 text-sm">{script.description}</div>
                    <div className="text-gray-400 text-xs">
                      {script.type} • Confidence: {(script.confidence * 100).toFixed(0)}% • {new Date(script.generatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadScript(script)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                      title="Download Script"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteScript(script.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                      title="Delete Script"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};