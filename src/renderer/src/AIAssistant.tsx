/**
 * AI Assistant Component - Comprehensive AI-Powered Modding Assistant UI
 * 
 * Features:
 * - Chat-based interface with 6 specialized modes
 * - Code generation with live preview
 * - Workflow automation and planning
 * - Asset naming and batch organization
 * - Documentation generation
 * - Learning hub with tutorials
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './AIAssistant.css';

// Type definitions for AI modes and state
type AIMode = 'general' | 'code-gen' | 'workflow' | 'troubleshoot' | 'learn' | 'organize' | 'mod-creation';
type AIMode = 'general' | 'code-gen' | 'workflow' | 'troubleshoot' | 'learn' | 'organize';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode?: AIMode;
  metadata?: Record<string, any>;
}

interface CodeGenSession {
  id: string;
  language: 'papyrus' | 'xml' | 'json' | 'python';
  description: string;
  generatedCode: string;
  history: Array<{ code: string; timestamp: number }>;
}

interface WorkflowSession {
  id: string;
  goal: string;
  steps: WorkflowStep[];
  currentStep: number;
  isExecuting: boolean;
  progress: number;
}

interface WorkflowStep {
  order: number;
  action: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

interface AssetRenameOperation {
  oldName: string;
  newName: string;
  type: string;
  reason: string;
  applied: boolean;
}

interface DocumentationDraft {
  type: 'readme' | 'changelog' | 'api';
  content: string;
  sections: Array<{ title: string; content: string }>;
  edited: boolean;
}

/**
 * AIAssistant - Main AI Assistant Component
 */
export const AIAssistant: React.FC = () => {
  // State management
  const [currentMode, setCurrentMode] = useState<AIMode>(() => {
    // Check URL params for mode
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    if (urlMode && ['general', 'code-gen', 'workflow', 'troubleshoot', 'learn', 'organize', 'mod-creation'].includes(urlMode)) {
      return urlMode as AIMode;
    }
    return 'general';
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'ready' | 'thinking' | 'error'>('ready');
  
  // Mode-specific state
  const [codeGenSession, setCodeGenSession] = useState<CodeGenSession | null>(null);
  const [workflowSession, setWorkflowSession] = useState<WorkflowSession | null>(null);
  const [assetOperations, setAssetOperations] = useState<AssetRenameOperation[]>([]);
  const [docDraft, setDocDraft] = useState<DocumentationDraft | null>(null);
  
  // References
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  /**
   * Handle mode switching
   */
  const handleModeChange = (newMode: AIMode) => {
    setCurrentMode(newMode);
    // Add system message about mode change
    const systemMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'system',
      content: `Switched to ${newMode === 'general' ? 'General Help' : getModeName(newMode)} mode`,
      timestamp: Date.now(),
      mode: newMode,
    };
    setChatHistory(prev => [...prev, systemMsg]);
  };

  /**
   * Send message based on current mode
   */
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    setStatus('thinking');
    setIsLoading(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
      mode: currentMode,
    };
    setChatHistory(prev => [...prev, userMsg]);
    setInputText('');

    try {
      // Route to appropriate handler based on mode
      switch (currentMode) {
        case 'code-gen':
          await handleCodeGeneration(inputText);
          break;
        case 'workflow':
          await handleWorkflowPlanning(inputText);
          break;
        case 'troubleshoot':
          await handleErrorDiagnosis(inputText);
          break;
        case 'learn':
          await handleLearning(inputText);
          break;
        case 'organize':
          await handleAssetOrganization(inputText);
          break;
        default:
          await handleGeneralQuery(inputText);
      }
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: Date.now(),
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, currentMode]);

  /**
   * Handle code generation
   */
  const handleCodeGeneration = async (description: string) => {
    try {
      const result = await window.electronAPI.aiGenerateScript({
        description,
        language: codeGenSession?.language || 'papyrus',
        context: { projectType: 'Fallout4 mod' },
        style: 'commented',
      });

      if (result.success && result.scripts && result.scripts.length > 0) {
        const script = result.scripts[0];
        
        // Update session
        setCodeGenSession(prev => ({
          ...prev!,
          id: `session_${Date.now()}`,
          language: result.scripts[0].language as any,
          description,
          generatedCode: script.code,
          history: [
            ...(prev?.history || []),
            { code: script.code, timestamp: Date.now() },
          ],
        }));

        // Add assistant response
        const response: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `I've generated ${script.language} code for you. Check the code preview panel below. ${
            script.warnings?.length ? `\n\nWarnings: ${script.warnings.join(', ')}` : ''
          }`,
          timestamp: Date.now(),
          metadata: { codeId: script.code.substring(0, 50) },
        };
        setChatHistory(prev => [...prev, response]);
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Handle workflow planning
   */
  const handleWorkflowPlanning = async (goal: string) => {
    try {
      const result = await window.electronAPI.aiPlanWorkflow({
        description: goal,
        goal,
        timeEstimate: 'medium',
      });

      if (result.success && result.plan) {
        setWorkflowSession({
          id: `workflow_${Date.now()}`,
          goal,
          steps: result.plan.steps || [],
          currentStep: 0,
          isExecuting: false,
          progress: 0,
        });

        const response: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `I've created a workflow with ${result.plan.steps?.length || 0} steps. Total estimated time: ${
            result.plan.totalEstimatedTime
          } minutes. Review it in the workflow panel and click "Execute" to begin.`,
          timestamp: Date.now(),
          metadata: { workflowId: result.plan.id },
        };
        setChatHistory(prev => [...prev, response]);
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Handle error diagnosis
   */
  const handleErrorDiagnosis = async (errorDescription: string) => {
    try {
      const result = await window.electronAPI.aiDiagnoseError({
        errorMessage: errorDescription,
      });

      if (result.success && result.diagnosis) {
        const diagnosis = result.diagnosis;
        
        const response: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `**Root Cause:** ${diagnosis.rootCause}\n\n**Severity:** ${diagnosis.severity}\n\n**Explanation:** ${
            diagnosis.explanation
          }\n\nTry these fixes:\n${diagnosis.possibleFixes
            ?.map((fix, i) => `${i + 1}. ${fix.fix} (Difficulty: ${fix.difficulty})`)
            .join('\n')}`,
          timestamp: Date.now(),
          metadata: { diagnosisId: diagnosis.errorType },
        };
        setChatHistory(prev => [...prev, response]);
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Handle learning requests
   */
  const handleLearning = async (topic: string) => {
    try {
      const result = await window.electronAPI.aiExplain({
        concept: topic,
        skillLevel: 'intermediate',
        includeExamples: true,
      });

      if (result.success && result.explanation) {
        const explanation = result.explanation;
        
        const response: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `**${explanation.title}**\n\n${explanation.summary}\n\n**Key Points:**\n${explanation.keyPoints
            ?.map((p: string) => `• ${p}`)
            .join('\n')}\n\nWant more details? Ask follow-up questions!`,
          timestamp: Date.now(),
          metadata: { explanationId: topic },
        };
        setChatHistory(prev => [...prev, response]);
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Handle asset organization
   */
  const handleAssetOrganization = async (assetDescription: string) => {
    try {
      const result = await window.electronAPI.aiSuggestNames({
        type: 'texture',
        description: assetDescription,
        enforceLdFormat: true,
      });

      if (result.success && result.suggestions) {
        const operations: AssetRenameOperation[] = result.suggestions.map(
          (suggestion, idx) => ({
            oldName: `asset_${idx}`,
            newName: suggestion.name,
            type: 'texture',
            reason: suggestion.explanation,
            applied: false,
          })
        );
        
        setAssetOperations(operations);

        const response: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `Suggested ${operations.length} naming options. Review them in the Asset Organizer panel. The top suggestion follows LD naming conventions.`,
          timestamp: Date.now(),
          metadata: { operationCount: operations.length },
        };
        setChatHistory(prev => [...prev, response]);
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Handle general queries
   */
  const handleGeneralQuery = async (query: string) => {
    try {
      const result = await window.electronAPI.aiExplain({
        concept: query,
        includeExamples: true,
      });

      if (result.success && result.explanation) {
        const response: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: result.explanation.fullExplanation,
          timestamp: Date.now(),
        };
        setChatHistory(prev => [...prev, response]);
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Utility function to get mode display name
   */
  const getModeName = (mode: AIMode): string => {
    const names: Record<AIMode, string> = {
      'general': 'General Help',
      'code-gen': 'Code Generation',
      'workflow': 'Workflow Composer',
      'troubleshoot': 'Troubleshooter',
      'learn': 'Learning Hub',
      'organize': 'Asset Organizer',
      'mod-creation': 'Mod Creation Wizard',
    };
    return names[mode];
  };

  /**
   * Handle code insertion
   */
  const handleInsertCode = async () => {
    if (!codeGenSession?.generatedCode) return;
    
    // This would open a file picker or target location selector
    console.log('Inserting code into file:', codeGenSession.generatedCode.substring(0, 50));
  };

  /**
   * Handle workflow execution
   */
  const handleExecuteWorkflow = async () => {
    if (!workflowSession) return;

    setWorkflowSession(prev => ({ ...prev!, isExecuting: true, progress: 0 }));

    try {
      const result = await window.electronAPI.aiExecuteWorkflow(workflowSession);
      
      if (result.success) {
        setWorkflowSession(prev => ({
          ...prev!,
          isExecuting: false,
          progress: 100,
          currentStep: workflowSession.steps.length,
        }));

        const response: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `✅ Workflow completed successfully! ${result.completedSteps}/${workflowSession.steps.length} steps executed.`,
          timestamp: Date.now(),
        };
        setChatHistory(prev => [...prev, response]);
      }
    } catch (error) {
      setWorkflowSession(prev => ({ ...prev!, isExecuting: false }));
      throw error;
    }
  };

  /**
   * Save custom workflow
   */
  const handleSaveWorkflow = async () => {
    if (!workflowSession) return;
    console.log('Saving workflow:', workflowSession.goal);
    // Workflow save logic here
  };

  /**
   * Apply asset renaming
   */
  const handleApplyRenames = async () => {
    const toApply = assetOperations.filter(op => !op.applied);
    console.log('Applying renames:', toApply.length, 'operations');
    
    setAssetOperations(prev => 
      prev.map(op => ({ ...op, applied: true }))
    );
  };

  /**
   * Undo asset renaming
   */
  const handleUndoRenames = () => {
    setAssetOperations([]);
  };

  return (
    <div className="ai-assistant">
      {/* Header */}
      <div className="ai-header">
        <h1>🤖 AI Assistant</h1>
        <p>Your intelligent modding companion powered by advanced AI</p>
      </div>

      {/* Mode Selector */}
      <div className="ai-modes">
        {(['general', 'code-gen', 'workflow', 'troubleshoot', 'learn', 'organize', 'mod-creation'] as AIMode[]).map(
          mode => (
            <button
              key={mode}
              className={`mode-button ${currentMode === mode ? 'active' : ''}`}
              onClick={() => handleModeChange(mode)}
              title={getModeName(mode)}
            >
              {getModeIcon(mode)} {getModeName(mode)}
            </button>
          )
        )}
      </div>

      {/* Main Content Area */}
      <div className="ai-container">
        {/* Chat Panel */}
        <div className="chat-panel">
          <div className="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="chat-welcome">
                <h2>Welcome to {getModeName(currentMode)}</h2>
                <p>Ask me anything about modding for Fallout 4. I can help you with:</p>
                <ul>
                  {getModeDescription(currentMode).split('\n').map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : (
              chatHistory.map(msg => (
                <div key={msg.id} className={`chat-message ${msg.role}`}>
                  <div className="message-header">
                    <span className="message-role">{msg.role === 'system' ? '⚙️' : msg.role === 'user' ? '👤' : '🤖'}</span>
                    <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="status-indicator" data-status={status}>
              {status === 'thinking' ? '⏳ Thinking...' : status === 'error' ? '❌ Error' : '✅ Ready'}
            </div>
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Type your message here..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
            />
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? '⏳ Processing...' : '➤ Send'}
            </button>
          </div>
        </div>

        {/* Mode-Specific Panels */}
        <div className="panel-area">
          {currentMode === 'code-gen' && (
            <CodeGenPanel session={codeGenSession} onInsert={handleInsertCode} />
          )}
          {currentMode === 'workflow' && (
            <WorkflowPanel
              session={workflowSession}
              onExecute={handleExecuteWorkflow}
              onSave={handleSaveWorkflow}
            />
          )}
          {currentMode === 'organize' && (
            <AssetOrganizerPanel
              operations={assetOperations}
              onApply={handleApplyRenames}
              onUndo={handleUndoRenames}
            />
          )}
          {currentMode === 'troubleshoot' && <TroubleshootPanel chatHistory={chatHistory} />}
          {currentMode === 'learn' && <LearningPanel />}
          {currentMode === 'general' && <GeneralPanel />}
          {currentMode === 'mod-creation' && <ModCreationPanel />}
        </div>
      </div>
    </div>
  );
};

/**
 * Code Generation Panel Component
 */
const CodeGenPanel: React.FC<{
  session: any | null;
  onInsert: () => void;
}> = ({ session, onInsert }) => {
  const [language, setLanguage] = useState<'papyrus' | 'xml' | 'json' | 'python'>('papyrus');

  if (!session) {
    return (
      <div className="panel code-gen-panel">
        <h3>📝 Code Generation</h3>
        <div className="placeholder">
          <p>Generate code by describing what you need in the chat.</p>
          <p>Try: "Create a simple quest start notification script"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel code-gen-panel">
      <div className="panel-header">
        <h3>📝 Generated Code</h3>
        <select
          className="language-selector"
          value={language}
          onChange={e => setLanguage(e.target.value as any)}
        >
          <option value="papyrus">Papyrus</option>
          <option value="xml">XML</option>
          <option value="json">JSON</option>
          <option value="python">Python</option>
        </select>
      </div>

      <div className="code-preview">
        <pre>
          <code>{session.generatedCode}</code>
        </pre>
      </div>

      <div className="panel-actions">
        <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(session.generatedCode)}>
          📋 Copy
        </button>
        <button className="btn-primary" onClick={onInsert}>
          ➕ Insert into File
        </button>
      </div>

      {session.history.length > 1 && (
        <div className="history">
          <h4>History ({session.history.length} versions)</h4>
          <div className="history-list">
            {session.history.map((entry: any, idx: number) => (
              <button key={idx} className="history-item">
                v{idx + 1} - {new Date(entry.timestamp).toLocaleTimeString()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Workflow Panel Component
 */
const WorkflowPanel: React.FC<{
  session: any | null;
  onExecute: () => void;
  onSave: () => void;
}> = ({ session, onExecute, onSave }) => {
  if (!session) {
    return (
      <div className="panel workflow-panel">
        <h3>🔄 Workflow Composer</h3>
        <div className="placeholder">
          <p>Create automated workflows by describing your goal in the chat.</p>
          <p>Try: "Create a complete armor set from modeling to ingame"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel workflow-panel">
      <div className="panel-header">
        <h3>🔄 Workflow: {session.goal.substring(0, 30)}...</h3>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${session.progress}%` }} />
        </div>
      </div>

      <div className="steps-list">
        {session.steps.map((step: WorkflowStep) => (
          <div key={step.order} className={`step ${step.status}`}>
            <div className="step-number">{step.order}</div>
            <div className="step-content">
              <h4>{step.action}</h4>
              <p>{step.description}</p>
            </div>
            <div className="step-status">{getStepStatusIcon(step.status)}</div>
          </div>
        ))}
      </div>

      <div className="panel-actions">
        <button
          className="btn-primary"
          onClick={onExecute}
          disabled={session.isExecuting}
        >
          {session.isExecuting ? '⏳ Executing...' : '▶️ Execute Workflow'}
        </button>
        <button className="btn-secondary" onClick={onSave}>
          💾 Save Workflow
        </button>
      </div>

      <div className="meta-info">
        <p>⏱️ Est. Time: {session.steps.reduce((sum: number, s: any) => sum + (s.estimatedTime || 0), 0)} min</p>
        <p>📊 Progress: {session.currentStep}/{session.steps.length}</p>
      </div>
    </div>
  );
};

/**
 * Asset Organizer Panel Component
 */
const AssetOrganizerPanel: React.FC<{
  operations: AssetRenameOperation[];
  onApply: () => void;
  onUndo: () => void;
}> = ({ operations, onApply, onUndo }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (operations.length === 0) {
    return (
      <div className="panel asset-panel">
        <h3>📦 Asset Organizer</h3>
        <div className="placeholder">
          <p>Get naming suggestions by describing your assets.</p>
          <p>Try: "Name my wood plank texture"</p>
        </div>
      </div>
    );
  }

  const currentOp = operations[selectedIndex];

  return (
    <div className="panel asset-panel">
      <div className="panel-header">
        <h3>📦 Asset Naming ({selectedIndex + 1}/{operations.length})</h3>
      </div>

      <div className="asset-rename-card">
        <div className="rename-pair">
          <div className="rename-old">
            <label>Current Name:</label>
            <code>{currentOp.oldName}</code>
          </div>
          <div className="rename-arrow">→</div>
          <div className="rename-new">
            <label>Suggested Name:</label>
            <code>{currentOp.newName}</code>
          </div>
        </div>
        <p className="rename-reason">{currentOp.reason}</p>
      </div>

      <div className="navigation">
        <button
          onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
          disabled={selectedIndex === 0}
        >
          ← Previous
        </button>
        <span>{selectedIndex + 1} of {operations.length}</span>
        <button
          onClick={() => setSelectedIndex(Math.min(operations.length - 1, selectedIndex + 1))}
          disabled={selectedIndex === operations.length - 1}
        >
          Next →
        </button>
      </div>

      <div className="panel-actions">
        <button className="btn-danger" onClick={onUndo}>
          🔙 Clear All
        </button>
        <button className="btn-primary" onClick={onApply}>
          ✅ Apply All {operations.length} Renames
        </button>
      </div>

      <div className="batch-info">
        Applied: {operations.filter(op => op.applied).length} / {operations.length}
      </div>
    </div>
  );
};

/**
 * Troubleshoot Panel Component
 */
const TroubleshootPanel: React.FC<{ chatHistory: ChatMessage[] }> = ({ chatHistory }) => {
  return (
    <div className="panel troubleshoot-panel">
      <h3>🔧 Troubleshoot</h3>
      <div className="placeholder">
        <p>Describe an error or issue you're experiencing in the chat above.</p>
        <p>I'll provide diagnostic steps and multiple solutions.</p>
      </div>
    </div>
  );
};

/**
 * Learning Panel Component
 */
const LearningPanel: React.FC = () => {
  return (
    <div className="panel learning-panel">
      <h3>📚 Learning Hub</h3>
      <div className="placeholder">
        <p>Ask about modding concepts, techniques, or best practices.</p>
        <p>I can also suggest tutorials based on your skill level.</p>
      </div>
    </div>
  );
};

/**
 * General Panel Component
 */
const GeneralPanel: React.FC = () => {
  return (
    <div className="panel general-panel">
      <h3>❓ General Help</h3>
      <div className="features">
        <h4>Quick Links:</h4>
        <ul>
          <li>Generate custom scripts</li>
          <li>Create automation workflows</li>
          <li>Troubleshoot issues</li>
          <li>Learn modding concepts</li>
          <li>Organize your assets</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Mod Creation Panel Component
 */
const ModCreationPanel: React.FC = () => {
  return (
    <div className="panel mod-creation-panel">
      <h3>🎮 Mod Creation Wizard</h3>
      <div className="placeholder">
        <p><strong>End-to-end mod creation assistance</strong></p>
        <p>Get help with:</p>
        <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '1rem auto' }}>
          <li>Project setup and structure</li>
          <li>Asset integration (meshes, textures, scripts)</li>
          <li>Plugin configuration</li>
          <li>Testing and iteration</li>
          <li>Packaging and distribution</li>
        </ul>
        <p>Try asking:</p>
        <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '1rem auto', fontSize: '0.9em', color: '#888' }}>
          <li>"Help me create a new weapon mod"</li>
          <li>"Set up a quest mod project structure"</li>
          <li>"Guide me through adding custom textures"</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Utility: Get mode icon
 */
function getModeIcon(mode: AIMode): string {
  const icons: Record<AIMode, string> = {
    'general': '❓',
    'code-gen': '📝',
    'workflow': '🔄',
    'troubleshoot': '🔧',
    'learn': '📚',
    'organize': '📦',
    'mod-creation': '🎮',
  };
  return icons[mode];
}

/**
 * Utility: Get mode description
 */
function getModeDescription(mode: AIMode): string {
  const descriptions: Record<AIMode, string> = {
    'general': 'Q&A and general help\nModding best practices\nConcept explanations',
    'code-gen': 'Papyrus/XML scripts\nCode refinement\nTemplate suggestions',
    'workflow': 'Multi-step automation\nWorkflow planning\nProgress tracking',
    'troubleshoot': 'Error analysis\nDiagnostic steps\nFix recommendations',
    'learn': 'Tutorials\nConcept guides\nResource suggestions',
    'organize': 'Asset naming\nBatch operations\nNaming conventions',
    'mod-creation': 'Project setup\nAsset pipeline\nIntegration & testing',
  };
  return descriptions[mode];
}

/**
 * Utility: Get step status icon
 */
function getStepStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    'pending': '⏳',
    'in-progress': '⚙️',
    'completed': '✅',
    'failed': '❌',
  };
  return icons[status] || '❓';
}

export default AIAssistant;
