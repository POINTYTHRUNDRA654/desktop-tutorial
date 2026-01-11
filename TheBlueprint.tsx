import React, { useState, useRef } from 'react';
import { DraftingCompass, Database, Globe, Server, Cloud, Layers, FileCode, Hammer, Save, Download, Cpu, Box, Smartphone, Shield, Zap, RefreshCw, CheckCircle2, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Node {
    id: string;
    type: 'frontend' | 'backend' | 'database' | 'cloud' | 'service';
    label: string;
    icon: React.ElementType;
    x: number;
    y: number;
    config: Record<string, string>;
}

interface Edge {
    from: string;
    to: string;
    label?: string;
}

const initialNodes: Node[] = [
    { id: '1', type: 'frontend', label: 'React Client', icon: Globe, x: 150, y: 150, config: { framework: 'React 19', port: '3000' } },
    { id: '2', type: 'backend', label: 'Node API', icon: Server, x: 450, y: 150, config: { runtime: 'Node 20', framework: 'Express' } },
    { id: '3', type: 'database', label: 'Postgres DB', icon: Database, x: 450, y: 350, config: { version: '16', port: '5432' } },
];

const initialEdges: Edge[] = [
    { from: '1', to: '2', label: 'REST / JSON' },
    { from: '2', to: '3', label: 'SQL' },
];

const TheBlueprint: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [scaffoldResult, setScaffoldResult] = useState<string | null>(null);

    // --- Actions ---

    const addNode = (type: Node['type']) => {
        const id = Date.now().toString();
        const baseConfig = type === 'database' ? { type: 'Postgres' } : type === 'frontend' ? { framework: 'React' } : { runtime: 'Node' };
        
        const newNode: Node = {
            id,
            type,
            label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            icon: type === 'database' ? Database : type === 'frontend' ? Globe : type === 'cloud' ? Cloud : Server,
            x: 100 + Math.random() * 50,
            y: 100 + Math.random() * 50,
            config: baseConfig
        };
        setNodes(prev => [...prev, newNode]);
        setSelectedNode(newNode);
    };

    const updateNodeConfig = (key: string, value: string) => {
        if (!selectedNode) return;
        const updated = { ...selectedNode, config: { ...selectedNode.config, [key]: value } };
        setNodes(prev => prev.map(n => n.id === selectedNode.id ? updated : n));
        setSelectedNode(updated);
    };

    const handleMaterialize = async () => {
        setIsGenerating(true);
        setScaffoldResult(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const architectureJson = JSON.stringify({ nodes, edges });
            
            const prompt = `
            Act as a Senior DevOps Engineer. Analyze this system architecture: ${architectureJson}.
            Generate a detailed project scaffolding plan.
            Output a JSON object with:
            1. "summary": A brief description of the stack.
            2. "files": An array of objects { path: string, content: string } representing key config files (e.g., docker-compose.yml, package.json, schema.sql).
            Limit file content to 5-10 lines of pseudocode or key config for brevity.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const result = JSON.parse(response.text);
            
            // Artificial delay for effect
            setTimeout(() => {
                setScaffoldResult(JSON.stringify(result, null, 2));
                setIsGenerating(false);
            }, 1000);

        } catch (e) {
            console.error(e);
            setScaffoldResult(JSON.stringify({ error: "Failed to generate scaffold plan." }));
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-10 shadow-md">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <DraftingCompass className="w-6 h-6 text-blue-400" />
                        The Blueprint
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">System Architecture & AI Scaffolding</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleMaterialize}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50"
                    >
                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4 fill-current" />}
                        {isGenerating ? 'Architecting...' : 'Materialize Code'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Palette */}
                <div className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-4 z-10">
                    <button onClick={() => addNode('frontend')} className="p-3 bg-slate-800 hover:bg-blue-900/30 text-blue-400 rounded-xl transition-colors tooltip-trigger" title="Frontend">
                        <Globe className="w-6 h-6" />
                    </button>
                    <button onClick={() => addNode('backend')} className="p-3 bg-slate-800 hover:bg-emerald-900/30 text-emerald-400 rounded-xl transition-colors" title="Backend">
                        <Server className="w-6 h-6" />
                    </button>
                    <button onClick={() => addNode('database')} className="p-3 bg-slate-800 hover:bg-amber-900/30 text-amber-400 rounded-xl transition-colors" title="Database">
                        <Database className="w-6 h-6" />
                    </button>
                    <button onClick={() => addNode('cloud')} className="p-3 bg-slate-800 hover:bg-purple-900/30 text-purple-400 rounded-xl transition-colors" title="Cloud Service">
                        <Cloud className="w-6 h-6" />
                    </button>
                    <div className="h-px w-10 bg-slate-800 my-2"></div>
                    <button className="p-3 hover:text-white text-slate-500 transition-colors" title="Settings">
                        <Layers className="w-6 h-6" />
                    </button>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative bg-[#0f172a] overflow-hidden">
                    {/* Blueprint Grid Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" 
                         style={{ 
                             backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', 
                             backgroundSize: '40px 40px' 
                         }}>
                    </div>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                            </marker>
                        </defs>
                        {edges.map((edge, i) => {
                            const from = nodes.find(n => n.id === edge.from);
                            const to = nodes.find(n => n.id === edge.to);
                            if (!from || !to) return null;
                            return (
                                <g key={i}>
                                    <line 
                                        x1={from.x + 80} y1={from.y + 40} 
                                        x2={to.x + 80} y2={to.y + 40} 
                                        stroke="#475569" 
                                        strokeWidth="2"
                                        strokeDasharray="5,5"
                                        markerEnd="url(#arrowhead)"
                                    />
                                    {edge.label && (
                                        <text x={(from.x + to.x + 160)/2} y={(from.y + to.y + 80)/2 - 10} fill="#94a3b8" fontSize="10" textAnchor="middle" className="bg-slate-900">
                                            {edge.label}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {nodes.map(node => (
                        <div 
                            key={node.id}
                            className={`absolute w-40 p-4 rounded-xl border-2 backdrop-blur-sm transition-all cursor-move shadow-lg ${
                                selectedNode?.id === node.id 
                                ? 'border-blue-400 bg-blue-900/20 shadow-blue-900/20' 
                                : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                            }`}
                            style={{ left: node.x, top: node.y }}
                            onClick={() => setSelectedNode(node)}
                        >
                            <div className="flex justify-center mb-2">
                                <node.icon className={`w-8 h-8 ${
                                    node.type === 'frontend' ? 'text-blue-400' : 
                                    node.type === 'backend' ? 'text-emerald-400' :
                                    node.type === 'database' ? 'text-amber-400' : 'text-purple-400'
                                }`} />
                            </div>
                            <div className="text-center">
                                <div className="text-xs font-bold text-slate-300 truncate">{node.label}</div>
                                <div className="text-[10px] text-slate-500 uppercase mt-1">{node.type}</div>
                            </div>
                            
                            {/* Connectors */}
                            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-slate-500 rounded-full"></div>
                            <div className="absolute top-1/2 -left-1 w-2 h-2 bg-slate-500 rounded-full"></div>
                        </div>
                    ))}
                </div>

                {/* Right Panel: Properties or Results */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
                    {scaffoldResult ? (
                        <div className="flex-1 flex flex-col h-full">
                            <div className="p-4 border-b border-slate-800 bg-emerald-900/20">
                                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Scaffolding Ready
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {(() => {
                                    try {
                                        const data = JSON.parse(scaffoldResult);
                                        return (
                                            <>
                                                <div className="text-xs text-slate-300 italic mb-4">{data.summary}</div>
                                                {data.files.map((file: any, i: number) => (
                                                    <div key={i} className="bg-black rounded-lg border border-slate-800 overflow-hidden">
                                                        <div className="px-3 py-2 border-b border-slate-800 text-xs font-mono text-blue-300 flex justify-between items-center bg-slate-900/50">
                                                            {file.path}
                                                            <FileCode className="w-3 h-3 text-slate-500" />
                                                        </div>
                                                        <pre className="p-3 text-[10px] font-mono text-slate-400 overflow-x-auto custom-scrollbar">
                                                            {file.content}
                                                        </pre>
                                                    </div>
                                                ))}
                                            </>
                                        );
                                    } catch (e) { return <div className="text-red-400 text-xs">Parsing Error</div>; }
                                })()}
                            </div>
                            <div className="p-4 border-t border-slate-800">
                                <button 
                                    onClick={() => setScaffoldResult(null)}
                                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded flex items-center justify-center gap-2"
                                >
                                    Back to Editor
                                </button>
                                <button className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2">
                                    <Download className="w-3 h-3" /> Export Project
                                </button>
                            </div>
                        </div>
                    ) : selectedNode ? (
                        <div className="p-6">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Component Config</div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Label</label>
                                    <input 
                                        type="text" 
                                        value={selectedNode.label} 
                                        onChange={(e) => {
                                            const updated = { ...selectedNode, label: e.target.value };
                                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? updated : n));
                                            setSelectedNode(updated);
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                
                                {Object.entries(selectedNode.config).map(([key, val]) => (
                                    <div key={key}>
                                        <label className="block text-xs text-slate-400 mb-1 capitalize">{key}</label>
                                        <input 
                                            type="text" 
                                            value={val} 
                                            onChange={(e) => updateNodeConfig(key, e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none font-mono"
                                        />
                                    </div>
                                ))}

                                <div className="pt-4 border-t border-slate-800">
                                    <button 
                                        onClick={() => {
                                            setNodes(prev => prev.filter(n => n.id !== selectedNode.id));
                                            setEdges(prev => prev.filter(e => e.from !== selectedNode.id && e.to !== selectedNode.id));
                                            setSelectedNode(null);
                                        }}
                                        className="text-red-400 text-xs hover:underline flex items-center gap-1"
                                    >
                                        Remove Component
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                            <DraftingCompass className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">Select a component to configure properties.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TheBlueprint;