import React, { useState, useRef, useEffect } from 'react';
import { GitBranch, Plus, Trash2, Link2, Play, Download, Save, Undo, Redo } from 'lucide-react';

interface QuestStage {
  id: string;
  index: number;
  description: string;
  x: number;
  y: number;
  conditions: Condition[];
  actions: Action[];
  objectives: string[];
}

interface Condition {
  type: string;
  target: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  target: string;
  value: string;
}

interface Connection {
  from: string;
  to: string;
}

export const QuestEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stages, setStages] = useState<QuestStage[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedStage, setSelectedStage] = useState<QuestStage | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [questName, setQuestName] = useState('MyNewQuest');
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    drawCanvas();
  }, [stages, connections, selectedStage, connecting]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw connections
    connections.forEach(conn => {
      const fromStage = stages.find(s => s.id === conn.from);
      const toStage = stages.find(s => s.id === conn.to);
      if (!fromStage || !toStage) return;

      ctx.beginPath();
      ctx.moveTo(fromStage.x + 75, fromStage.y + 40);
      ctx.lineTo(toStage.x + 75, toStage.y + 40);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(toStage.y - fromStage.y, toStage.x - fromStage.x);
      const arrowX = toStage.x + 75 - 15 * Math.cos(angle);
      const arrowY = toStage.y + 40 - 15 * Math.sin(angle);
      
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - 10 * Math.cos(angle - Math.PI / 6),
        arrowY - 10 * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowX - 10 * Math.cos(angle + Math.PI / 6),
        arrowY - 10 * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
    });

    // Draw stages
    stages.forEach(stage => {
      const isSelected = selectedStage?.id === stage.id;
      
      // Box
      ctx.fillStyle = isSelected ? '#1e40af' : '#1e3a8a';
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#2563eb';
      ctx.lineWidth = isSelected ? 3 : 2;
      
      ctx.fillRect(stage.x, stage.y, 150, 80);
      ctx.strokeRect(stage.x, stage.y, 150, 80);

      // Stage number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`Stage ${stage.index}`, stage.x + 10, stage.y + 25);

      // Description
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#93c5fd';
      const desc = stage.description.length > 18 ? stage.description.substring(0, 15) + '...' : stage.description;
      ctx.fillText(desc, stage.x + 10, stage.y + 45);

      // Stats
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#60a5fa';
      ctx.fillText(`${stage.objectives.length} obj, ${stage.conditions.length} cond`, stage.x + 10, stage.y + 65);
    });

    // Draw connecting line
    if (connecting) {
      const fromStage = stages.find(s => s.id === connecting);
      if (fromStage) {
        ctx.beginPath();
        ctx.moveTo(fromStage.x + 75, fromStage.y + 40);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a stage
    const clickedStage = stages.find(
      s => x >= s.x && x <= s.x + 150 && y >= s.y && y <= s.y + 80
    );

    if (clickedStage) {
      if (e.shiftKey) {
        // Start connection
        setConnecting(clickedStage.id);
      } else {
        // Start drag
        setDragging(clickedStage.id);
        setDragOffset({ x: x - clickedStage.x, y: y - clickedStage.y });
        setSelectedStage(clickedStage);
      }
    } else {
      setSelectedStage(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    if (dragging) {
      setStages(stages.map(s => 
        s.id === dragging 
          ? { ...s, x: x - dragOffset.x, y: y - dragOffset.y }
          : s
      ));
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (connecting) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const targetStage = stages.find(
        s => x >= s.x && x <= s.x + 150 && y >= s.y && y <= s.y + 80 && s.id !== connecting
      );

      if (targetStage) {
        setConnections([...connections, { from: connecting, to: targetStage.id }]);
      }

      setConnecting(null);
    }

    setDragging(null);
  };

  const addStage = (template?: string) => {
    const newStage: QuestStage = {
      id: Date.now().toString(),
      index: stages.length * 10,
      description: template || 'New Stage',
      x: 100 + stages.length * 50,
      y: 100,
      conditions: [],
      actions: [],
      objectives: []
    };

    if (template === 'Start') {
      newStage.objectives = ['Talk to NPC'];
      newStage.actions = [{ type: 'SetStage', target: questName, value: '10' }];
    } else if (template === 'Fetch') {
      newStage.objectives = ['Collect Item'];
      newStage.conditions = [{ type: 'GetItemCount', target: 'Item', operator: '>=', value: '1' }];
      newStage.actions = [{ type: 'SetStage', target: questName, value: '20' }];
    } else if (template === 'Kill') {
      newStage.objectives = ['Kill Target'];
      newStage.conditions = [{ type: 'GetDead', target: 'Enemy', operator: '==', value: '1' }];
      newStage.actions = [{ type: 'SetStage', target: questName, value: '30' }];
    }

    setStages([...stages, newStage]);
    setSelectedStage(newStage);
  };

  const deleteStage = () => {
    if (!selectedStage) return;
    
    setStages(stages.filter(s => s.id !== selectedStage.id));
    setConnections(connections.filter(c => c.from !== selectedStage.id && c.to !== selectedStage.id));
    setSelectedStage(null);
  };

  const exportCode = () => {
    let code = `Scriptname ${questName} extends Quest\n\n`;
    
    stages.forEach(stage => {
      code += `; Stage ${stage.index}: ${stage.description}\n`;
      stage.objectives.forEach(obj => {
        code += `;   Objective: ${obj}\n`;
      });
      code += `\n`;
    });

    code += `Function SetStage(Int aiStage)\n`;
    code += `    ; Quest stage logic here\n`;
    code += `EndFunction\n`;

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${questName}.psc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const testQuest = () => {
    alert(`Quest Test:\n\nStages: ${stages.length}\nConnections: ${connections.length}\n\nThis would simulate quest flow in a test environment.`);
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-blue-400" />
            <div>
              <input
                type="text"
                value={questName}
                onChange={(e) => setQuestName(e.target.value)}
                className="text-2xl font-bold text-white bg-transparent border-b-2 border-transparent hover:border-blue-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-sm text-slate-400">Visual Quest Editor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={testQuest}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Test
            </button>
            <button
              onClick={exportCode}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-slate-700 bg-slate-800/30 flex items-center gap-2">
        <button
          onClick={() => addStage('Start')}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Start
        </button>
        <button
          onClick={() => addStage('Fetch')}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Fetch
        </button>
        <button
          onClick={() => addStage('Kill')}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Kill
        </button>
        <button
          onClick={() => addStage()}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Custom
        </button>

        <div className="h-6 w-px bg-slate-600 mx-2"></div>

        <button
          onClick={deleteStage}
          disabled={!selectedStage}
          className="px-3 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-30 text-white text-sm rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex-1"></div>

        <div className="text-xs text-slate-400">
          <kbd className="px-2 py-1 bg-slate-800 rounded">Shift+Click</kbd> to connect stages
        </div>
      </div>

      {/* Canvas + Properties */}
      <div className="flex-1 flex gap-4 p-6 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1200}
            height={700}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="cursor-crosshair"
          />
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-slate-900 border border-slate-700 rounded-xl p-4 overflow-y-auto">
          {selectedStage ? (
            <>
              <h3 className="font-bold text-white mb-4">Stage {selectedStage.index}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={selectedStage.description}
                    onChange={(e) => setStages(stages.map(s => 
                      s.id === selectedStage.id ? { ...s, description: e.target.value } : s
                    ))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Stage Index</label>
                  <input
                    type="number"
                    value={selectedStage.index}
                    onChange={(e) => setStages(stages.map(s => 
                      s.id === selectedStage.id ? { ...s, index: parseInt(e.target.value) } : s
                    ))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-2">Objectives</h4>
                  {selectedStage.objectives.map((obj, idx) => (
                    <div key={idx} className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={obj}
                        onChange={(e) => {
                          const newObjs = [...selectedStage.objectives];
                          newObjs[idx] = e.target.value;
                          setStages(stages.map(s => 
                            s.id === selectedStage.id ? { ...s, objectives: newObjs } : s
                          ));
                        }}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                      />
                      <button
                        onClick={() => {
                          const newObjs = selectedStage.objectives.filter((_, i) => i !== idx);
                          setStages(stages.map(s => 
                            s.id === selectedStage.id ? { ...s, objectives: newObjs } : s
                          ));
                        }}
                        className="px-2 py-1 bg-red-900 hover:bg-red-800 text-white text-xs rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setStages(stages.map(s => 
                        s.id === selectedStage.id 
                          ? { ...s, objectives: [...s.objectives, 'New Objective'] }
                          : s
                      ));
                    }}
                    className="w-full px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white text-xs rounded"
                  >
                    + Add Objective
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-2">Conditions</h4>
                  <div className="text-xs text-slate-400">
                    {selectedStage.conditions.length} condition(s)
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-2">Actions</h4>
                  <div className="text-xs text-slate-400">
                    {selectedStage.actions.length} action(s)
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <GitBranch className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Select a stage to edit properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
