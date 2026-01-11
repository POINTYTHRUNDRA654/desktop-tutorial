import React, { useState, useEffect } from 'react';
import { Workflow, Play, Plus, Zap, ArrowRight, Github, MessageCircle, Mic, Terminal, Image as ImageIcon, Volume2, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface Node {
    id: string;
    type: 'trigger' | 'action' | 'logic';
    label: string;
    icon: React.ElementType;
    x: number;
    y: number;
    config?: string;
    status?: 'idle' | 'running' | 'success' | 'error';
}

interface Connection {
    from: string;
    to: string;
}

const initialNodes: Node[] = [
    { id: '1', type: 'trigger', label: 'GitHub: Push to Main', icon: Github, x: 100, y: 150, config: 'Repo: mossy-core' },
    { id: '2', type: 'action', label: 'Bridge: Run Build Script', icon: Terminal, x: 400, y: 150, config: 'npm run build' },
    { id: '3', type: 'action', label: 'TTS: Announce Status', icon: Volume2, x: 700, y: 150, config: 'Say "Build Started"' },
    { id: '4', type: 'trigger', label: 'Voice: "Computer, Protocol 7"', icon: Mic, x: 100, y: 350, config: 'Phrase Match' },
    { id: '5', type: 'action', label: 'Launch: Fallout 4 (F4SE)', icon: Zap, x: 400, y: 350, config: 'f4se_loader.exe' },
];

const initialConnections: Connection[] = [
    { from: '1', to: '2' },
    { from: '2', to: '3' },
    { from: '4', to: '5' },
];

const TheSynapse: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [connections, setConnections] = useState<Connection[]>(initialConnections);
    const [isSimulating, setIsSimulating] = useState(false);
    const [pulsePos, setPulsePos] = useState(0);

    const runSimulation = () => {
        if (isSimulating) return;
        setIsSimulating(true);
        setPulsePos(0);

        // Sequence simulation
        const sequence = async () => {
            // Reset status
            setNodes(n => n.map(x => ({ ...x, status: 'idle' })));

            // Step 1: Triggers
            await new Promise(r => setTimeout(r, 500));
            setNodes(n => n.map(x => x.type === 'trigger' ? { ...x, status: 'running' } : x));
            
            await new Promise(r => setTimeout(r, 1000));
            setNodes(n => n.map(x => x.type === 'trigger' ? { ...x, status: 'success' } : x));
            
            // Pulse moves
            setPulsePos(1);

            // Step 2: Actions linked to Triggers
            await new Promise(r => setTimeout(r, 500));
            setNodes(n => n.map(x => x.type === 'action' && (x.id === '2' || x.id === '5') ? { ...x, status: 'running' } : x));

            await new Promise(r => setTimeout(r, 1500));
            setNodes(n => n.map(x => x.type === 'action' && (x.id === '2' || x.id === '5') ? { ...x, status: 'success' } : x));
            
            setPulsePos(2);

            // Step 3: Secondary Actions
            await new Promise(r => setTimeout(r, 500));
            setNodes(n => n.map(x => x.id === '3' ? { ...x, status: 'running' } : x));

            await new Promise(r => setTimeout(r, 1000));
            setNodes(n => n.map(x => x.id === '3' ? { ...x, status: 'success' } : x));

            setIsSimulating(false);
            setPulsePos(0);
        };

        sequence();
    };

    return (
        <div className="h-full flex flex-col bg-forge-dark text-slate-200 overflow-hidden relative font-sans">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 bg-forge-panel flex justify-between items-center z-10 shadow-md">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Workflow className="w-6 h-6 text-forge-accent" />
                        The Synapse
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">Reflex Automation & Logic Circuits</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={runSimulation}
                        disabled={isSimulating}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                            isSimulating 
                            ? 'bg-slate-800 text-slate-500 cursor-wait' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)]'
                        }`}
                    >
                        {isSimulating ? <Zap className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4 fill-current" />}
                        {isSimulating ? 'Signal Active...' : 'Test Pulse'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Palette Sidebar */}
                <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Module Library
                    </div>
                    <div className="p-4 space-y-6 overflow-y-auto">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                                <Zap className="w-3 h-3 text-yellow-400" /> Triggers
                            </h4>
                            <div className="space-y-2">
                                <div className="p-2 bg-slate-800 border border-slate-700 rounded hover:border-forge-accent cursor-grab flex items-center gap-2">
                                    <Github className="w-4 h-4 text-slate-400" /> <span className="text-sm">GitHub Event</span>
                                </div>
                                <div className="p-2 bg-slate-800 border border-slate-700 rounded hover:border-forge-accent cursor-grab flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-slate-400" /> <span className="text-sm">Discord Msg</span>
                                </div>
                                <div className="p-2 bg-slate-800 border border-slate-700 rounded hover:border-forge-accent cursor-grab flex items-center gap-2">
                                    <Mic className="w-4 h-4 text-slate-400" /> <span className="text-sm">Voice Cmd</span>
                                </div>
                                <div className="p-2 bg-slate-800 border border-slate-700 rounded hover:border-forge-accent cursor-grab flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" /> <span className="text-sm">Schedule</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                                <Play className="w-3 h-3 text-emerald-400" /> Actions
                            </h4>
                            <div className="space-y-2">
                                <div className="p-2 bg-slate-800 border border-slate-700 rounded hover:border-forge-accent cursor-grab flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-slate-400" /> <span className="text-sm">Run Script</span>
                                </div>
                                <div className="p-2 bg-slate-800 border border-slate-700 rounded hover:border-forge-accent cursor-grab flex items-center gap-2">
                                    <Volume2 className="w-4 h-4 text-slate-400" /> <span className="text-sm">Speak (TTS)</span>
                                </div>
                                <div className="p-2 bg-slate-800 border border-slate-700 rounded hover:border-forge-accent cursor-grab flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-slate-400" /> <span className="text-sm">Gen Image</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-[#0b111a] relative overflow-hidden">
                    {/* Background Grid */}
                    <div 
                        className="absolute inset-0 opacity-20 pointer-events-none" 
                        style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}
                    />

                    {/* SVG Layer for Wires */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        {connections.map((conn, i) => {
                            const fromNode = nodes.find(n => n.id === conn.from);
                            const toNode = nodes.find(n => n.id === conn.to);
                            if (!fromNode || !toNode) return null;

                            // Simple curved path
                            const d = `M ${fromNode.x + 240} ${fromNode.y + 40} C ${fromNode.x + 300} ${fromNode.y + 40}, ${toNode.x - 60} ${toNode.y + 40}, ${toNode.x} ${toNode.y + 40}`;

                            return (
                                <g key={i}>
                                    {/* Base Wire */}
                                    <path d={d} stroke="#1e293b" strokeWidth="4" fill="none" />
                                    {/* Active Pulse Wire */}
                                    <path 
                                        d={d} 
                                        stroke={isSimulating && pulsePos > 0 ? "#10b981" : "#334155"} 
                                        strokeWidth="2" 
                                        fill="none" 
                                        className={isSimulating ? "animate-pulse" : ""}
                                    />
                                    {/* Moving Packet */}
                                    {isSimulating && (
                                        <circle r="4" fill="#fff">
                                            <animateMotion dur="1s" repeatCount="indefinite" path={d} />
                                        </circle>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* Nodes */}
                    {nodes.map(node => (
                        <div 
                            key={node.id}
                            className={`absolute w-60 rounded-xl border-2 shadow-xl p-4 transition-all duration-300 ${
                                node.status === 'running' ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)] bg-slate-800' :
                                node.status === 'success' ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-slate-800' :
                                node.status === 'error' ? 'border-red-500 bg-red-900/10' :
                                'border-slate-700 bg-slate-800/90 hover:border-slate-500'
                            }`}
                            style={{ left: node.x, top: node.y }}
                        >
                            {/* Input Port */}
                            {node.type !== 'trigger' && (
                                <div className="absolute top-1/2 -left-3 w-3 h-3 bg-slate-500 rounded-full border-2 border-slate-800"></div>
                            )}
                            
                            {/* Output Port */}
                            <div className="absolute top-1/2 -right-3 w-3 h-3 bg-slate-500 rounded-full border-2 border-slate-800"></div>

                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                    node.status === 'success' ? 'bg-emerald-500 text-white' :
                                    node.status === 'running' ? 'bg-yellow-500 text-black' :
                                    'bg-slate-700 text-slate-400'
                                }`}>
                                    <node.icon className={`w-5 h-5 ${node.status === 'running' ? 'animate-spin' : ''}`} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{node.type}</div>
                                    <div className="text-sm font-bold text-white leading-tight">{node.label}</div>
                                    {node.config && <div className="text-[10px] text-slate-400 mt-1 font-mono bg-black/30 px-1 py-0.5 rounded truncate max-w-[140px]">{node.config}</div>}
                                </div>
                            </div>
                            
                            {/* Status Indicator */}
                            {node.status && node.status !== 'idle' && (
                                <div className={`absolute -top-2 -right-2 rounded-full bg-slate-900 p-0.5 border ${
                                    node.status === 'success' ? 'border-emerald-500 text-emerald-500' :
                                    node.status === 'error' ? 'border-red-500 text-red-500' :
                                    'border-yellow-500 text-yellow-500'
                                }`}>
                                    {node.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                                     node.status === 'error' ? <XCircle className="w-4 h-4" /> :
                                     <Zap className="w-4 h-4" />}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* Add Button (Floating) */}
                    <button className="absolute bottom-8 right-8 w-14 h-14 bg-forge-accent rounded-full text-slate-900 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform hover:bg-white">
                        <Plus className="w-8 h-8" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TheSynapse;