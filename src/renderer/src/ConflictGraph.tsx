import React, { useState, useEffect, useRef } from 'react';
import { Network, ZoomIn, ZoomOut, Maximize2, AlertTriangle, Info, RefreshCw } from 'lucide-react';

interface ModNode {
  id: string;
  name: string;
  type: 'master' | 'plugin' | 'light';
  x: number;
  y: number;
  conflicts: string[];
  overrides: string[];
}

interface ConflictEdge {
  from: string;
  to: string;
  severity: 'high' | 'medium' | 'low';
  records: string[];
}

export const ConflictGraph: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<ModNode[]>([]);
  const [edges, setEdges] = useState<ConflictEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<ModNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLoadOrder();
  }, []);

  useEffect(() => {
    drawGraph();
  }, [nodes, edges, zoom, pan, selectedNode]);

  const loadLoadOrder = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:21337/loadorder/graph');
      if (response.ok) {
        const data = await response.json();
        setNodes(data.nodes);
        setEdges(data.edges);
      } else {
        throw new Error('Bridge offline');
      }
    } catch (error) {
      console.warn('Conflict Bridge offline. Showing connection required state.');
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply transformations
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges (conflicts)
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      
      // Color by severity
      if (edge.severity === 'high') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
      } else if (edge.severity === 'medium') {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
      }
      
      ctx.stroke();
    });

    // Draw override connections (lighter)
    nodes.forEach(node => {
      node.overrides.forEach(targetId => {
        const target = nodes.find(n => n.id === targetId);
        if (target) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    });

    // Draw nodes
    nodes.forEach(node => {
      const isSelected = selectedNode?.id === node.id;
      const hasConflicts = node.conflicts.length > 0 || edges.some(e => e.from === node.id || e.to === node.id);
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, isSelected ? 35 : 30, 0, Math.PI * 2);
      
      // Color by type and state
      if (hasConflicts) {
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#dc2626';
      } else if (node.type === 'master') {
        ctx.fillStyle = '#1e3a8a';
        ctx.strokeStyle = '#3b82f6';
      } else if (node.type === 'light') {
        ctx.fillStyle = '#581c87';
        ctx.strokeStyle = '#a855f7';
      } else {
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#10b981';
      }
      
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = isSelected ? 'bold 14px sans-serif' : '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const shortName = node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name;
      ctx.fillText(shortName, node.x, node.y - 50);
      
      // Conflict indicator
      if (hasConflicts) {
        ctx.beginPath();
        ctx.arc(node.x + 20, node.y - 20, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('!', node.x + 20, node.y - 20);
      }
    });

    ctx.restore();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Find clicked node
    const clicked = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 30;
    });

    setSelectedNode(clicked || null);
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Visual Conflict Graph</h1>
              <p className="text-sm text-slate-400">Interactive mod conflict visualization</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={zoomOut} className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors">
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
            <button onClick={zoomIn} className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors">
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
            <button onClick={resetView} className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors">
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={loadLoadOrder} disabled={loading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded transition-colors">
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 flex gap-4 p-6">
        {/* Canvas */}
        <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl overflow-hidden relative">
          {nodes.length === 0 && !loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
              <Network className="w-16 h-16 text-slate-700 mb-4 animate-pulse" />
              <h3 className="text-xl font-bold text-white mb-2">Bridge Connection Required</h3>
              <p className="text-slate-400 text-center max-w-sm mb-6 px-4">
                Real-time conflict analysis requires the Volt Bridge to be active. 
                Please launch Fallout 4 via F4SE and ensure the bridge plugin is loaded.
              </p>
              <button 
                onClick={loadLoadOrder}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Attempt Sync
              </button>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            onClick={handleCanvasClick}
            className="cursor-pointer"
          />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-slate-700 rounded-lg p-4">
            <h4 className="font-bold text-white mb-3 text-sm">Legend</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-blue-400"></div>
                <span className="text-slate-300">Master File (.esm)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600 border-2 border-green-400"></div>
                <span className="text-slate-300">Plugin (.esp)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600 border-2 border-purple-400"></div>
                <span className="text-slate-300">Light Plugin (.esl)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-red-500"></div>
                <span className="text-slate-300">High Conflict</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-amber-500"></div>
                <span className="text-slate-300">Medium Conflict</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t border-dashed border-slate-500"></div>
                <span className="text-slate-300">Override Chain</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="w-80 space-y-4">
          {selectedNode ? (
            <>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h3 className="font-bold text-white mb-3">{selectedNode.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="text-white capitalize">{selectedNode.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overrides:</span>
                    <span className="text-white">{selectedNode.overrides.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Conflicts:</span>
                    <span className={selectedNode.conflicts.length > 0 ? 'text-red-400' : 'text-green-400'}>
                      {selectedNode.conflicts.length}
                    </span>
                  </div>
                </div>
              </div>

              {selectedNode.conflicts.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
                  <h4 className="font-bold text-red-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Conflicts
                  </h4>
                  <div className="space-y-1">
                    {selectedNode.conflicts.map((conflict, idx) => (
                      <div key={idx} className="text-xs text-red-200 bg-red-950/50 px-2 py-1 rounded">
                        {nodes.find(n => n.id === conflict)?.name || conflict}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Conflicts */}
              {edges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id).map((edge, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-2 text-sm">
                    Conflict with {nodes.find(n => n.id === (edge.from === selectedNode.id ? edge.to : edge.from))?.name}
                  </h4>
                  <div className="space-y-1">
                    {edge.records.slice(0, 5).map((record, ridx) => (
                      <div key={ridx} className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded">
                        {record}
                      </div>
                    ))}
                    {edge.records.length > 5 && (
                      <div className="text-xs text-slate-500 text-center pt-1">
                        +{edge.records.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start gap-2 text-slate-400 text-sm">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="mb-2">Click on any mod to see details and conflicts.</p>
                  <p className="text-xs">Lines show relationships between mods. Red lines indicate conflicts.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
