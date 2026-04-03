import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownToLine, GitBranch, Play, Plus, Trash2 } from 'lucide-react';
import './QuestEditor.css';

type Stage = {
  id: string;
  index: number;
  description: string;
  x: number;
  y: number;
  objectives: string[];
  conditions: string[];
  actions: string[];
};

type Connection = {
  from: string;
  to: string;
};

const gridSize = 50;

const QuestEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [questName, setQuestName] = useState('MyQuest');
  const [stages, setStages] = useState<Stage[]>([
    { id: 's0', index: 0, description: 'Start Quest', x: 80, y: 120, objectives: ['Talk to NPC'], conditions: [], actions: [] },
    { id: 's10', index: 10, description: 'Find the artifact', x: 320, y: 120, objectives: ['Retrieve artifact'], conditions: [], actions: [] },
    { id: 's20', index: 20, description: 'Return to NPC', x: 560, y: 120, objectives: ['Return item'], conditions: [], actions: [] },
  ]);
  const [connections, setConnections] = useState<Connection[]>([
    { from: 's0', to: 's10' },
    { from: 's10', to: 's20' },
  ]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>('s0');
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const selectedStage = useMemo(() => stages.find((s) => s.id === selectedStageId) || null, [selectedStageId, stages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // connections
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#3b82f6';
    connections.forEach((conn) => {
      const from = stages.find((s) => s.id === conn.from);
      const to = stages.find((s) => s.id === conn.to);
      if (!from || !to) return;

      const startX = from.x + 75;
      const startY = from.y + 40;
      const endX = to.x + 75;
      const endY = to.y + 40;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // arrow head
      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowX = endX - 15 * Math.cos(angle);
      const arrowY = endY - 15 * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 10 * Math.cos(angle - Math.PI / 6), arrowY - 10 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(arrowX - 10 * Math.cos(angle + Math.PI / 6), arrowY - 10 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    });

    // temporary connection while dragging
    if (connectingFrom) {
      const from = stages.find((s) => s.id === connectingFrom);
      if (from) {
        ctx.beginPath();
        ctx.moveTo(from.x + 75, from.y + 40);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // stages
    stages.forEach((stage) => {
      const isSelected = stage.id === selectedStageId;
      ctx.fillStyle = isSelected ? '#1e3a8a' : '#1e293b';
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#334155';
      ctx.lineWidth = isSelected ? 3 : 2;

      ctx.fillRect(stage.x, stage.y, 150, 80);
      ctx.strokeRect(stage.x, stage.y, 150, 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`Stage ${stage.index}`, stage.x + 10, stage.y + 24);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      const desc = stage.description.length > 20 ? `${stage.description.slice(0, 17)}...` : stage.description;
      ctx.fillText(desc, stage.x + 10, stage.y + 44);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${stage.objectives.length} obj, ${stage.conditions.length} cond`, stage.x + 10, stage.y + 62);
    });
  }, [connections, connectingFrom, mousePos, selectedStageId, stages]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitStage = stages.find((s) => x >= s.x && x <= s.x + 150 && y >= s.y && y <= s.y + 80);
    if (!hitStage) {
      setSelectedStageId(null);
      return;
    }

    setSelectedStageId(hitStage.id);

    if (e.shiftKey) {
      setConnectingFrom(hitStage.id);
      return;
    }

    setDraggingId(hitStage.id);
    setDragOffset({ x: x - hitStage.x, y: y - hitStage.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (draggingId) {
      setStages((prev) =>
        prev.map((s) => (s.id === draggingId ? { ...s, x: x - dragOffset.x, y: y - dragOffset.y } : s))
      );
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (connectingFrom) {
      const target = stages.find((s) => x >= s.x && x <= s.x + 150 && y >= s.y && y <= s.y + 80 && s.id !== connectingFrom);
      if (target && !connections.some((c) => c.from === connectingFrom && c.to === target.id)) {
        setConnections((prev) => [...prev, { from: connectingFrom, to: target.id }]);
      }
    }

    setConnectingFrom(null);
    setDraggingId(null);
  };

  const addStage = (template?: 'Start' | 'Fetch' | 'Kill') => {
    const id = `s${Date.now()}`;
    let description = 'New Stage';
    let objectives: string[] = [];
    let actions: string[] = [];

    if (template === 'Start') {
      description = 'Start';
      objectives = ['Talk to NPC'];
      actions = ['SetStage quest 10'];
    } else if (template === 'Fetch') {
      description = 'Fetch';
      objectives = ['Collect item'];
      actions = ['SetStage quest 20'];
    } else if (template === 'Kill') {
      description = 'Kill';
      objectives = ['Eliminate target'];
      actions = ['SetStage quest 30'];
    }

    const nextIndex = (Math.max(0, ...stages.map((s) => s.index)) + 10);
    const newStage: Stage = {
      id,
      index: nextIndex,
      description,
      x: 120 + stages.length * 60,
      y: 200,
      objectives,
      conditions: [],
      actions,
    };

    setStages((prev) => [...prev, newStage]);
    setSelectedStageId(id);
  };

  const deleteStage = () => {
    if (!selectedStageId) return;
    setStages((prev) => prev.filter((s) => s.id !== selectedStageId));
    setConnections((prev) => prev.filter((c) => c.from !== selectedStageId && c.to !== selectedStageId));
    setSelectedStageId(null);
  };

  const exportCode = () => {
    let code = `Scriptname ${questName} extends Quest\n\n`;
    stages
      .sort((a, b) => a.index - b.index)
      .forEach((stage) => {
        code += `; Stage ${stage.index}: ${stage.description}\n`;
        stage.objectives.forEach((obj) => {
          code += `;   Objective: ${obj}\n`;
        });
        code += '\n';
      });
    code += 'Function SetStage(Int aiStage)\n';
    code += '    ; Quest stage logic here\n';
    code += 'EndFunction\n';

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${questName}.psc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const testQuest = () => {
    toast.success(`Quest Test. Stages: ${stages.length}. Connections: ${connections.length}`);
  };

  return (
    <div className="h-full bg-slate-900 text-white flex flex-col">
      <div className="p-4 border-b border-slate-800 bg-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-8 h-8 text-blue-400" />
          <div>
            <input
              type="text"
              value={questName}
              onChange={(e) => setQuestName(e.target.value)}
              className="text-2xl font-bold bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
            />
            <p className="text-sm text-slate-400">Visual Quest Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={testQuest} className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded flex items-center gap-2 text-sm">
            <Play className="w-4 h-4" /> Test
          </button>
          <button onClick={exportCode} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded flex items-center gap-2 text-sm">
            <ArrowDownToLine className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/40 flex items-center gap-2">
        <button onClick={() => addStage('Start')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Start
        </button>
        <button onClick={() => addStage('Fetch')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Fetch
        </button>
        <button onClick={() => addStage('Kill')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Kill
        </button>
        <button onClick={() => addStage()} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Custom
        </button>
        <button
          onClick={deleteStage}
          disabled={!selectedStageId}
          className="px-3 py-1.5 bg-red-800 hover:bg-red-700 disabled:opacity-40 rounded text-sm flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
        <div className="flex-1" />
        <span className="text-xs text-slate-400">Shift+Click to connect stages</span>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
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

        <div className="w-80 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto">
          {selectedStage ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Stage {selectedStage.index}</h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  value={selectedStage.description}
                  onChange={(e) =>
                    setStages((prev) => prev.map((s) => (s.id === selectedStage.id ? { ...s, description: e.target.value } : s)))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Stage Index</label>
                <input
                  type="number"
                  value={selectedStage.index}
                  onChange={(e) =>
                    setStages((prev) => prev.map((s) => (s.id === selectedStage.id ? { ...s, index: parseInt(e.target.value, 10) || 0 } : s)))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Objectives</label>
                  <button
                    onClick={() =>
                      setStages((prev) =>
                        prev.map((s) =>
                          s.id === selectedStage.id ? { ...s, objectives: [...s.objectives, 'New Objective'] } : s
                        )
                      )
                    }
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedStage.objectives.map((obj, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={obj}
                        onChange={(e) =>
                          setStages((prev) =>
                            prev.map((s) => {
                              if (s.id !== selectedStage.id) return s;
                              const next = [...s.objectives];
                              next[idx] = e.target.value;
                              return { ...s, objectives: next };
                            })
                          )
                        }
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() =>
                          setStages((prev) =>
                            prev.map((s) => {
                              if (s.id !== selectedStage.id) return s;
                              const next = s.objectives.filter((_, i) => i !== idx);
                              return { ...s, objectives: next };
                            })
                          )
                        }
                        className="px-2 py-1 bg-red-900 hover:bg-red-800 text-xs rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Conditions</label>
                <p className="text-xs text-slate-500">{selectedStage.conditions.length} condition(s)</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Actions</label>
                <p className="text-xs text-slate-500">{selectedStage.actions.length} action(s)</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Select a stage to edit properties.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestEditor;
