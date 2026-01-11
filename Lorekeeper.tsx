import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Network, Search, Plus, Save, Share2, AlertTriangle, Wand2, RefreshCw, ZoomIn, ZoomOut, User, MapPin, Box, Shield, Scroll, Activity } from 'lucide-react';

// --- Types ---
interface Node {
  id: string;
  label: string;
  type: 'character' | 'location' | 'item' | 'faction' | 'quest';
  x: number;
  y: number;
  vx: number;
  vy: number;
  description?: string;
}

interface Link {
  source: string;
  target: string;
  label: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const initialGraph: GraphData = {
  nodes: [
    { id: '1', label: 'The Player', type: 'character', x: 400, y: 300, vx: 0, vy: 0, description: 'The protagonist of the story.' },
    { id: '2', label: 'Rusty Sword', type: 'item', x: 500, y: 200, vx: 0, vy: 0, description: 'An old blade found in the ruins.' },
    { id: '3', label: 'Old Ruins', type: 'location', x: 300, y: 200, vx: 0, vy: 0, description: 'A dangerous dungeon filled with goblins.' },
  ],
  links: [
    { source: '1', target: '2', label: 'owns' },
    { source: '1', target: '3', label: 'explores' },
    { source: '2', target: '3', label: 'found in' },
  ]
};

const Lorekeeper: React.FC = () => {
  const [graph, setGraph] = useState<GraphData>(initialGraph);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [integrityIssues, setIntegrityIssues] = useState<string[]>([]);
  const [wikiContent, setWikiContent] = useState<string>('');

  const svgRef = useRef<SVGSVGElement>(null);

  // --- Physics Simulation ---
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setGraph(prev => {
        const nodes = prev.nodes.map(n => ({ ...n }));
        const links = prev.links;
        
        // Constants
        const repulsion = 5000;
        const attraction = 0.05;
        const centerPull = 0.02;
        const damping = 0.85;

        // Apply Forces
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            
            // Repulsion (Coulomb)
            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx*dx + dy*dy + 0.1;
                const force = repulsion / distSq;
                const dist = Math.sqrt(distSq);
                
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                a.vx += fx;
                a.vy += fy;
                b.vx -= fx;
                b.vy -= fy;
            }

            // Center Pull
            const cx = 400; // Center X
            const cy = 300; // Center Y
            a.vx += (cx - a.x) * centerPull;
            a.vy += (cy - a.y) * centerPull;
        }

        // Attraction (Springs)
        links.forEach(link => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            if (source && target) {
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // Ideal length = 150
                const force = (dist - 150) * attraction;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                source.vx += fx;
                source.vy += fy;
                target.vx -= fx;
                target.vy -= fy;
            }
        });

        // Update Positions & Velocity Damping
        return {
            ...prev,
            nodes: nodes.map(n => ({
                ...n,
                x: n.x + n.vx,
                y: n.y + n.vy,
                vx: n.vx * damping,
                vy: n.vy * damping
            }))
        };
      });
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // --- Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(3, z * scale)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
     setIsDragging(true);
     setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
  };

  const handleMouseUp = () => setIsDragging(false);

  // --- AI Features ---

  const populateFromContext = async () => {
      setIsGenerating(true);
      
      // Simulate reading "Project Context" from local storage or app state
      const savedProject = localStorage.getItem('mossy_project');
      const context = savedProject ? JSON.parse(savedProject).notes : "A generic fantasy RPG setting.";

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze this project context: "${context}". 
              Create a Knowledge Graph in JSON format with 'nodes' (id, label, type, description) and 'links' (source, target, label).
              Types can be: character, location, item, faction, quest.
              Limit to 8 key entities.
              Ensure node IDs are strings.
              Start positions (x, y) should be around 400, 300.`,
              config: { responseMimeType: 'application/json' }
          });
          
          const data = JSON.parse(response.text);
          if (data.nodes && data.links) {
              // Merge with current, randomize positions slightly to avoid stacking
              const newNodes = data.nodes.map((n: any) => ({
                  ...n,
                  x: 400 + (Math.random() - 0.5) * 200,
                  y: 300 + (Math.random() - 0.5) * 200,
                  vx: 0,
                  vy: 0
              }));
              
              setGraph({ nodes: newNodes, links: data.links });
          }
      } catch (e) {
          console.error(e);
          alert("Failed to auto-populate graph.");
      } finally {
          setIsGenerating(false);
          setIsSimulating(true); // Re-enable physics to settle new nodes
      }
  };

  const checkIntegrity = async () => {
      setIsGenerating(true);
      try {
          // Serialize graph for AI
          const graphStr = JSON.stringify(graph);
          
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze this knowledge graph for logical contradictions or missing connections: ${graphStr}.
              Return a JSON list of strings describing issues. e.g. ["Character X is in Location Y but Location Y does not exist", "Quest Z has no start point"].
              If good, return empty list.`,
              config: { responseMimeType: 'application/json' }
          });
          
          const issues = JSON.parse(response.text);
          setIntegrityIssues(issues);
          if (issues.length === 0) {
              setIntegrityIssues(["No logic errors detected. The timeline is stable."]);
          }

      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  const generateWiki = async (node: Node) => {
      setWikiContent("Generating...");
      try {
           const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
           const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Write a detailed RPG Wiki entry for the entity: "${node.label}" (${node.type}).
              Description: ${node.description || "None"}.
              Include: Lore, Stats/Properties, and Trivia. Use Markdown.`
          });
          setWikiContent(response.text);
      } catch (e) {
          setWikiContent("Error generating wiki.");
      }
  };

  // Auto-generate wiki when selecting node
  useEffect(() => {
      if (selectedNode) {
          generateWiki(selectedNode);
      } else {
          setWikiContent('');
      }
  }, [selectedNode]);

  return (
    <div className="h-full flex flex-col bg-forge-dark text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-forge-panel flex justify-between items-center z-10 shadow-md">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Network className="w-6 h-6 text-forge-accent" />
                    The Lorekeeper
                </h2>
                <p className="text-xs text-slate-400 font-mono">Neural Knowledge Graph & Wiki Engine</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={checkIntegrity}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs transition-colors"
                >
                    <Shield className="w-3 h-3 text-orange-400" />
                    {isGenerating ? 'Analyzing...' : 'Integrity Check'}
                </button>
                <button 
                    onClick={populateFromContext}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-3 py-1.5 bg-forge-accent hover:bg-sky-400 text-slate-900 font-bold rounded text-xs transition-colors shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                >
                    {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    {isGenerating ? 'Dreaming...' : 'Auto-Populate'}
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            {/* Graph Area */}
            <div 
                className="flex-1 bg-[#050b14] relative overflow-hidden cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                {/* Background Grid */}
                <div 
                    className="absolute inset-0 opacity-20 pointer-events-none" 
                    style={{ 
                        backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
                        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                        backgroundPosition: `${offset.x}px ${offset.y}px`
                    }}
                />

                <svg 
                    ref={svgRef}
                    className="w-full h-full pointer-events-none"
                >
                    <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
                        {/* Links */}
                        {graph.links.map((link, i) => {
                            const source = graph.nodes.find(n => n.id === link.source);
                            const target = graph.nodes.find(n => n.id === link.target);
                            if (!source || !target) return null;
                            return (
                                <g key={i}>
                                    <line 
                                        x1={source.x} y1={source.y} 
                                        x2={target.x} y2={target.y} 
                                        stroke="#475569" 
                                        strokeWidth="1"
                                        opacity="0.6"
                                    />
                                    <text 
                                        x={(source.x + target.x)/2} 
                                        y={(source.y + target.y)/2} 
                                        fill="#94a3b8" 
                                        fontSize="10" 
                                        textAnchor="middle"
                                        className="select-none bg-black"
                                    >
                                        {link.label}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Nodes */}
                        {graph.nodes.map((node) => (
                            <g 
                                key={node.id} 
                                transform={`translate(${node.x}, ${node.y})`}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent drag start
                                    setSelectedNode(node);
                                }}
                                className="pointer-events-auto cursor-pointer transition-transform hover:scale-110"
                            >
                                <circle 
                                    r="15" 
                                    fill={
                                        node.type === 'character' ? '#3b82f6' : 
                                        node.type === 'location' ? '#10b981' : 
                                        node.type === 'item' ? '#f59e0b' : 
                                        node.type === 'faction' ? '#ef4444' : '#a855f7'
                                    }
                                    stroke={selectedNode?.id === node.id ? '#fff' : 'none'}
                                    strokeWidth="2"
                                    className="shadow-lg"
                                />
                                <text 
                                    y="28" 
                                    fill="#e2e8f0" 
                                    fontSize="12" 
                                    fontWeight="bold" 
                                    textAnchor="middle"
                                    className="select-none text-shadow-sm"
                                >
                                    {node.label}
                                </text>
                                {/* Icon based on type */}
                                <foreignObject x="-8" y="-8" width="16" height="16" className="pointer-events-none">
                                    <div className="text-white/80 flex items-center justify-center">
                                        {node.type === 'character' ? <User size={16} /> :
                                         node.type === 'location' ? <MapPin size={16} /> :
                                         node.type === 'item' ? <Box size={16} /> :
                                         node.type === 'faction' ? <Shield size={16} /> :
                                         <Scroll size={16} />}
                                    </div>
                                </foreignObject>
                            </g>
                        ))}
                    </g>
                </svg>

                {/* Controls Overlay */}
                <div className="absolute bottom-6 left-6 flex flex-col gap-2">
                    <button onClick={() => setZoom(z => z + 0.1)} className="p-2 bg-slate-800 rounded-full border border-slate-700 hover:text-white text-slate-400">
                        <ZoomIn className="w-5 h-5" />
                    </button>
                    <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 bg-slate-800 rounded-full border border-slate-700 hover:text-white text-slate-400">
                        <ZoomOut className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setIsSimulating(!isSimulating)} 
                        className={`p-2 rounded-full border border-slate-700 hover:text-white ${isSimulating ? 'bg-forge-accent text-slate-900' : 'bg-slate-800 text-slate-400'}`}
                        title={isSimulating ? "Pause Physics" : "Resume Physics"}
                    >
                        <Activity className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Integrity Panel (Floating) */}
                {integrityIssues.length > 0 && (
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur p-4 rounded-xl border border-red-500/30 max-w-sm z-20 shadow-2xl animate-fade-in">
                        <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-2">
                            <AlertTriangle className="w-4 h-4" /> Logic Analysis
                        </div>
                        <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                            {integrityIssues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                            ))}
                        </ul>
                        <button 
                            onClick={() => setIntegrityIssues([])}
                            className="mt-3 text-[10px] text-slate-500 hover:text-white underline w-full text-center"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
            </div>

            {/* Right: Wiki / Details Panel */}
            <div className={`w-80 bg-slate-900 border-l border-slate-800 flex flex-col transition-all ${selectedNode ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
                {selectedNode ? (
                    <>
                        <div className="p-6 border-b border-slate-800 bg-slate-800/50">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                    selectedNode.type === 'character' ? 'bg-blue-500/20 text-blue-400' :
                                    selectedNode.type === 'location' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-purple-500/20 text-purple-400'
                                }`}>
                                    {selectedNode.type}
                                </span>
                                <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white">x</button>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">{selectedNode.label}</h2>
                            <p className="text-sm text-slate-400 italic">{selectedNode.description}</p>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            {wikiContent ? (
                                <div className="prose prose-invert prose-sm">
                                    <div className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed">
                                        {wikiContent}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="text-xs">Generating Wiki Entry...</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-800 grid grid-cols-2 gap-2">
                            <button className="flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold transition-colors">
                                <Save className="w-3 h-3" /> Save to DB
                            </button>
                            <button className="flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold transition-colors">
                                <Share2 className="w-3 h-3" /> Export MD
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                        <Network className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">Select a node to view its Codex entry.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

// Helper component for loading
const Loader2 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

export default Lorekeeper;