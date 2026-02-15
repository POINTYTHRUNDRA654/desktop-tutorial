import React, { useState, useRef, useEffect } from 'react';
import { GitBranch, ArrowDownToLine, ChevronDown, ChevronRight, Plus, Trash2, Copy, Settings, Save, Play } from 'lucide-react';
import './QuestEditor.css';

// ============================================================================
// TYPES
// ============================================================================

interface QuestStage {
  index: number;
  logEntry?: string;
  objectives: QuestObjective[];
  conditions: any[];
  resultScript?: string;
  flags: StageFlags;
}

interface StageFlags {
  startUpStage?: boolean;
  shutDownStage?: boolean;
  completeAllObjectives?: boolean;
  run?: boolean;
}

interface QuestObjective {
  id: string;
  displayText: string;
  target?: string;
  targetCount?: number;
  completed: boolean;
  conditions: any[];
}

interface DialogueNode {
  id: string;
  speaker: 'player' | 'npc' | 'other';
  text: string;
  prompt?: string;
  responses: DialogueResponse[];
  conditions: any[];
  actions: DialogueAction[];
  emotions?: string;
  animation?: string;
}

interface DialogueResponse {
  targetNodeId: string;
  conditions: any[];
  chance?: number;
}

interface DialogueAction {
  type: 'script' | 'set-stage' | 'give-item' | 'add-perk' | 'start-combat';
  parameters: Record<string, any>;
}

interface QuestAlias {
  name: string;
  type: 'reference' | 'location' | 'item';
  fillType: 'specific' | 'unique' | 'find' | 'create';
  conditions: any[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const QuestEditor: React.FC = () => {
  // State Management
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [questName, setQuestName] = useState('MyQuest');
  const [questDescription, setQuestDescription] = useState('Quest Description');
  const [questType] = useState('side');
  const [questPriority, setQuestPriority] = useState(50);

  const [stages, setStages] = useState<QuestStage[]>([
    { index: 0, logEntry: 'Start Quest', objectives: [], conditions: [], flags: { startUpStage: true } },
    { index: 10, logEntry: 'Find the ancient artifact', objectives: [], conditions: [], flags: {} },
    { index: 20, logEntry: 'Return to NPC', objectives: [], conditions: [], flags: {} },
    { index: 30, logEntry: 'Complete', objectives: [], conditions: [], flags: { shutDownStage: true } },
  ]);

  const [aliases, setAliases] = useState<QuestAlias[]>([
    { name: 'NPC1', type: 'reference', fillType: 'specific', conditions: [] },
    { name: 'Item1', type: 'item', fillType: 'find', conditions: [] },
  ]);

  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set([0, 10]));

  const [dialogueNodes, setDialogueNodes] = useState<DialogueNode[]>([
    {
      id: 'greeting',
      speaker: 'npc',
      text: 'Hello, traveler...',
      responses: [{ targetNodeId: 'response1', conditions: [] }],
      conditions: [],
      actions: [],
    },
    {
      id: 'response1',
      speaker: 'player',
      text: 'What brings you here?',
      prompt: '>What brings you here?',
      responses: [{ targetNodeId: 'info1', conditions: [] }],
      conditions: [],
      actions: [],
    },
    {
      id: 'info1',
      speaker: 'npc',
      text: 'I am looking for an ancient artifact...',
      responses: [{ targetNodeId: 'response2', conditions: [] }],
      conditions: [],
      actions: [{ type: 'set-stage', parameters: { stage: 10 } }],
    },
    {
      id: 'response2',
      speaker: 'player',
      prompt: '>Goodbye.',
      text: 'Goodbye.',
      responses: [],
      conditions: [],
      actions: [],
    },
  ]);

  const [selectedDialogueNode, setSelectedDialogueNode] = useState('greeting');
  const [expandedDialogueNodes, setExpandedDialogueNodes] = useState<Set<string>>(new Set(['greeting']));

  // Canvas Drawing
  useEffect(() => {
    drawQuestGraph();
  }, [stages, selectedStageIndex]);

  const drawQuestGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw connections
    for (let i = 0; i < stages.length - 1; i++) {
      const start = 60 + i * 120;
      const end = 60 + (i + 1) * 120;

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(start, 80);
      ctx.lineTo(end, 80);
      ctx.stroke();

      // Arrow
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(end, 80);
      ctx.lineTo(end - 15, 75);
      ctx.lineTo(end - 15, 85);
      ctx.fill();
    }

    // Draw stages
    stages.forEach((stage, i) => {
      const x = 60 + i * 120;
      const y = 50;
      const isSelected = selectedStageIndex === i;

      ctx.fillStyle = isSelected ? '#1e40af' : '#1e3a8a';
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#1e40af';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.fillRect(x - 30, y, 60, 60);
      ctx.strokeRect(x - 30, y, 60, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Stage ${stage.index}`, x, y + 30);
    });
  };

  // ============================================================================
  // STAGE MANAGEMENT
  // ============================================================================

  const handleAddStage = () => {
    const maxIndex = Math.max(...stages.map((s) => s.index), 0);
    const newStage: QuestStage = {
      index: maxIndex + 10,
      logEntry: `New Stage`,
      objectives: [],
      conditions: [],
      flags: {},
    };
    setStages([...stages, newStage].sort((a, b) => a.index - b.index));
  };

  const handleDeleteStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
    setSelectedStageIndex(Math.max(0, selectedStageIndex - 1));
  };

  const toggleStageExpanded = (stageIndex: number) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageIndex)) {
      newExpanded.delete(stageIndex);
    } else {
      newExpanded.add(stageIndex);
    }
    setExpandedStages(newExpanded);
  };

  // ============================================================================
  // DIALOGUE MANAGEMENT
  // ============================================================================

  const toggleDialogueExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedDialogueNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedDialogueNodes(newExpanded);
  };

  const getDialogueNodeChildren = (nodeId: string): DialogueNode[] => {
    const node = dialogueNodes.find((n) => n.id === nodeId);
    if (!node) return [];
    return node.responses
      .map((r) => dialogueNodes.find((n) => n.id === r.targetNodeId))
      .filter((n) => n !== undefined) as DialogueNode[];
  };

  const getCurrentStage = () => stages[selectedStageIndex];

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderQuestStructure = () => (
    <div className="quest-structure-panel">
      <h3 className="panel-title">Quest Structure</h3>

      <div className="structure-tree">
        {stages.map((stage, idx) => (
          <div key={stage.index} className="tree-item">
            <div
              className={`tree-node ${selectedStageIndex === idx ? 'selected' : ''}`}
              onClick={() => setSelectedStageIndex(idx)}
            >
              <button
                className="tree-expand-btn"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  toggleStageExpanded(stage.index);
                }}
              >
                {expandedStages.has(stage.index) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <span className="tree-label">▶ Stage {stage.index}</span>
            </div>

            {expandedStages.has(stage.index) && stage.objectives.length > 0 && (
              <div className="tree-children">
                {stage.objectives.map((obj) => (
                  <div key={obj.id} className="tree-node">
                    <span className="tree-label">○ {obj.displayText}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel-actions">
        <button className="btn btn-secondary" onClick={handleAddStage}>
          <Plus size={14} /> Add Stage
        </button>
      </div>

      <div className="section-divider"></div>

      <h3 className="panel-title">Aliases</h3>
      <div className="aliases-list">
        {aliases.map((alias) => (
          <div key={alias.name} className="alias-item">
            <div className="alias-name">{alias.name}</div>
            <div className="alias-type">{alias.type}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProperties = () => {
    const currentStage = getCurrentStage();
    return (
      <div className="properties-panel">
        <h3 className="panel-title">Properties</h3>

        {currentStage && (
          <>
            <div className="property-section">
              <label>Stage {currentStage.index}</label>
              <input
                type="text"
                placeholder="Log Entry"
                value={currentStage.logEntry || ''}
                onChange={(e) => {
                  const updated = [...stages];
                  updated[selectedStageIndex].logEntry = e.target.value;
                  setStages(updated);
                }}
                className="form-input"
              />
            </div>

            <div className="property-section">
              <label>Objectives</label>
              <button className="btn btn-secondary btn-small">
                <Plus size={12} /> Add
              </button>
              <div className="objectives-mini-list">
                {currentStage.objectives.map((obj) => (
                  <div key={obj.id} className="objective-mini">
                    {obj.displayText}
                  </div>
                ))}
              </div>
            </div>

            <div className="property-section">
              <label>Conditions</label>
              <button className="btn btn-secondary btn-small">
                <Plus size={12} /> Add
              </button>
            </div>

            <div className="property-section">
              <label>Stage Flags</label>
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked={currentStage.flags.startUpStage} />
                Start Up Stage
              </label>
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked={currentStage.flags.shutDownStage} />
                Shut Down Stage
              </label>
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked={currentStage.flags.completeAllObjectives} />
                Complete All Objectives
              </label>
            </div>

            <div className="property-section">
              <label>Result Script</label>
              <button className="btn btn-secondary btn-small">
                <Settings size={12} /> Edit
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderQuestGraph = () => (
    <div className="quest-graph-panel">
      <h3 className="panel-title">Visual Quest Graph</h3>
      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        className="quest-canvas"
        onClick={(e) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const x = e.clientX - rect.left;
            stages.forEach((stage, i) => {
              const stageX = 60 + i * 120;
              if (x >= stageX - 30 && x <= stageX + 30) {
                setSelectedStageIndex(i);
              }
            });
          }
        }}
      />
    </div>
  );

  const renderDialogueTree = () => (
    <div className="dialogue-tree-panel">
      <h3 className="panel-title">Dialogue Tree</h3>

      <div className="dialogue-controls">
        <select className="form-select" defaultValue="Guard">
          <option>Guard</option>
          <option>Merchant</option>
          <option>Inn Keeper</option>
        </select>
        <select className="form-select" defaultValue="Greeting">
          <option>Greeting</option>
          <option>Combat</option>
          <option>Faction</option>
        </select>
      </div>

      <div className="dialogue-tree">
        {dialogueNodes
          .filter((node) => node.speaker === 'npc' && !dialogueNodes.some((n) => n.responses.some((r) => r.targetNodeId === node.id && n.speaker === 'npc')))
          .map((rootNode) => (
            <div key={rootNode.id} className="dialogue-branch">
              <div
                className={`dialogue-node ${selectedDialogueNode === rootNode.id ? 'selected' : ''}`}
                onClick={() => setSelectedDialogueNode(rootNode.id)}
              >
                <button
                  className="dialogue-expand-btn"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    toggleDialogueExpanded(rootNode.id);
                  }}
                >
                  {expandedDialogueNodes.has(rootNode.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <span className={`dialogue-speaker ${rootNode.speaker}`}>{rootNode.speaker}</span>
                <span className="dialogue-text">{rootNode.text.substring(0, 30)}...</span>
              </div>

              {expandedDialogueNodes.has(rootNode.id) && (
                <div className="dialogue-children">
                  {getDialogueNodeChildren(rootNode.id).map((childNode) => (
                    <div key={childNode.id} className="dialogue-child-node">
                      <span className={`dialogue-speaker ${childNode.speaker}`}>{childNode.speaker}</span>
                      <span className="dialogue-text">{childNode.prompt || childNode.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      <div className="panel-actions">
        <button className="btn btn-secondary">
          <Plus size={14} /> Add Node
        </button>
        <button className="btn btn-secondary">
          <Play size={14} /> Test Dialogue
        </button>
      </div>
    </div>
  );

  return (
    <div className="quest-editor-layout">
      {/* Header */}
      <div className="quest-editor-header">
        <div className="header-left">
          <h1>{questName}</h1>
          <input
            type="text"
            value={questName}
            onChange={(e) => setQuestName(e.target.value)}
            className="quest-name-input"
            placeholder="Quest Name"
          />
          <span className={`quest-type type-${questType}`}>{questType}</span>
        </div>
        <div className="header-right">
          <button className="btn btn-primary">
            <Save size={16} /> Save
          </button>
          <button className="btn btn-secondary">
            <Play size={16} /> Generate Script
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="quest-editor-main">
        {/* Left Panel - Quest Structure */}
        <div className="left-panel">
          {renderQuestStructure()}
        </div>

        {/* Center - Quest Graph */}
        <div className="center-panel">
          {renderQuestGraph()}
        </div>

        {/* Right Panel - Properties */}
        <div className="right-panel">
          {renderProperties()}
        </div>
      </div>

      {/* Bottom - Dialogue Editor */}
      <div className="bottom-panel">
        {renderDialogueTree()}
      </div>
    </div>
  );
};

export default QuestEditor;