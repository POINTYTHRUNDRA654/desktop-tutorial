import React, { useState, useEffect, useRef } from 'react';
import { Hexagon, Play, Pause, Bot, MessageSquare, Terminal, RefreshCw, Cpu, Activity, Send, CheckCircle2, Shield, Search } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Agent {
    id: string;
    role: string;
    name: string;
    status: 'idle' | 'thinking' | 'working' | 'waiting' | 'done';
    task: string;
    load: number; // 0-100
    icon: React.ElementType;
    color: string;
}

interface Log {
    id: string;
    from: string;
    to: string;
    message: string;
    timestamp: string;
}

const TheHive: React.FC = () => {
    const [directive, setDirective] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([
        { id: '1', role: 'Architect', name: 'Alpha-1', status: 'idle', task: 'Awaiting directive...', load: 5, icon: Bot, color: 'text-purple-400' },
        { id: '2', role: 'Engineer', name: 'Beta-Dev', status: 'idle', task: 'Standby', load: 2, icon: Terminal, color: 'text-emerald-400' },
        { id: '3', role: 'Designer', name: 'Gamma-UX', status: 'idle', task: 'Standby', load: 3, icon: Activity, color: 'text-pink-400' },
        { id: '4', role: 'Researcher', name: 'Delta-Search', status: 'idle', task: 'Standby', load: 1, icon: Search, color: 'text-blue-400' },
    ]);
    const [logs, setLogs] = useState<Log[]>([
        { id: '0', from: 'System', to: 'All', message: 'Swarm Cluster initialized. Nodes 1-4 online.', timestamp: new Date().toLocaleTimeString() }
    ]);
    
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Simulation Loop
    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            setAgents(prev => prev.map(a => {
                // Fluctuate load based on status
                if (a.status === 'thinking' || a.status === 'working') {
                    return { ...a, load: Math.min(100, Math.max(20, a.load + (Math.random() * 20 - 10))) };
                }
                return { ...a, load: Math.max(0, a.load - 5) };
            }));

            // Random Chat Simulation based on directive
            if (Math.random() > 0.6) {
                simulateAgentChat();
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [isActive, directive]);

    const simulateAgentChat = () => {
        const activeAgents = agents.filter(a => a.status !== 'idle');
        if (activeAgents.length < 2) return;

        const sender = activeAgents[Math.floor(Math.random() * activeAgents.length)];
        const receiver = activeAgents.find(a => a.id !== sender.id) || activeAgents[0];
        
        const topics = [
            "Optimizing vector path...",
            "Requesting API schema validation.",
            "Visual assets compiled. Transferring...",
            "Code block verified. Running tests...",
            "Memory buffer at 80%. Garbage collection advised.",
            "Cross-referencing documentation...",
            "User constraint detected. Adjusting parameters."
        ];
        
        const msg = topics[Math.floor(Math.random() * topics.length)];

        setLogs(prev => [...prev, {
            id: Date.now().toString(),
            from: sender.role,
            to: receiver.role,
            message: msg,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const handleExecute = async () => {
        if (!directive.trim()) return;
        setIsActive(true);
        setLogs(prev => [...prev, { id: 'dir', from: 'User', to: 'Architect', message: `Directive: ${directive}`, timestamp: new Date().toLocaleTimeString() }]);

        // 1. Architect analyzes
        setAgents(prev => prev.map(a => a.role === 'Architect' ? { ...a, status: 'thinking', task: 'Analyzing directive...' } : a));
        
        setTimeout(() => {
            setLogs(prev => [...prev, { id: Date.now().toString(), from: 'Architect', to: 'All', message: 'Directive decomposed. Assigning sub-tasks.', timestamp: new Date().toLocaleTimeString() }]);
            
            // 2. Distribute tasks
            setAgents(prev => prev.map(a => {
                if (a.role === 'Architect') return { ...a, status: 'working', task: 'Orchestrating workflow' };
                if (a.role === 'Engineer') return { ...a, status: 'working', task: 'Generating boilerplate code' };
                if (a.role === 'Designer') return { ...a, status: 'thinking', task: 'Synthesizing UI concepts' };
                if (a.role === 'Researcher') return { ...a, status: 'working', task: 'Fetching documentation' };
                return a;
            }));
        }, 2000);
    };

    const handleStop = () => {
        setIsActive(false);
        setAgents(prev => prev.map(a => ({ ...a, status: 'idle', task: 'Standby', load: 0 })));
        setLogs(prev => [...prev, { id: Date.now().toString(), from: 'System', to: 'All', message: 'Swarm execution halted.', timestamp: new Date().toLocaleTimeString() }]);
    };

    return (
        <div className="h-full flex flex-col bg-forge-dark text-slate-200 overflow-hidden font-sans">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 bg-forge-panel flex justify-between items-center z-10 shadow-md">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Hexagon className="w-6 h-6 text-forge-accent" />
                        The Hive
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">Multi-Agent Swarm Intelligence & Delegation</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
                        {isActive ? 'SWARM ACTIVE' : 'SWARM IDLE'}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Agent Grid */}
                <div className="flex-1 bg-[#0b111a] p-8 overflow-y-auto relative">
                     {/* Background Grid */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 max-w-4xl mx-auto">
                        {agents.map(agent => (
                            <div 
                                key={agent.id} 
                                className={`bg-slate-900/80 backdrop-blur border rounded-2xl p-6 transition-all duration-500 ${
                                    agent.status !== 'idle' ? 'border-forge-accent shadow-[0_0_20px_rgba(56,189,248,0.15)]' : 'border-slate-800'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-xl bg-slate-800 border border-slate-700 ${agent.color}`}>
                                            <agent.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{agent.role}</h3>
                                            <div className="text-xs text-slate-500 font-mono">ID: {agent.name}</div>
                                        </div>
                                    </div>
                                    <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                                        agent.status === 'working' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' :
                                        agent.status === 'thinking' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' :
                                        'bg-slate-800 text-slate-500 border-slate-700'
                                    }`}>
                                        {agent.status}
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <div className="text-xs text-slate-500 mb-1 font-mono uppercase">Current Process</div>
                                    <div className={`text-sm font-medium ${agent.status === 'idle' ? 'text-slate-600' : 'text-slate-200'}`}>
                                        {agent.task}
                                        {agent.status !== 'idle' && <span className="animate-pulse ml-1">_</span>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Neural Load</span>
                                        <span>{agent.load.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-300 ${
                                                agent.load > 80 ? 'bg-red-500' : agent.load > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                                            }`} 
                                            style={{ width: `${agent.load}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Comms Log */}
                <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <MessageSquare className="w-3 h-3" /> Inter-Agent Comms
                        </span>
                        <div className="text-[10px] text-slate-600 font-mono">CH: ENCRYPTED</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {logs.map((log) => (
                            <div key={log.id} className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold ${
                                        log.from === 'User' ? 'text-white' :
                                        log.from === 'System' ? 'text-slate-500' :
                                        log.from === 'Architect' ? 'text-purple-400' :
                                        'text-forge-accent'
                                    }`}>
                                        {log.from}
                                    </span>
                                    {log.to !== 'All' && (
                                        <>
                                            <span className="text-[10px] text-slate-600">to</span>
                                            <span className="text-xs font-bold text-slate-400">{log.to}</span>
                                        </>
                                    )}
                                    <span className="text-[10px] text-slate-700 ml-auto font-mono">{log.timestamp}</span>
                                </div>
                                <div className={`text-sm p-3 rounded-lg border ${
                                    log.from === 'System' ? 'bg-transparent border-transparent text-slate-500 italic px-0' :
                                    log.from === 'User' ? 'bg-slate-800 border-slate-700 text-slate-200' :
                                    'bg-slate-800/50 border-slate-700/50 text-slate-300'
                                }`}>
                                    {log.message}
                                </div>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-black border-t border-slate-800">
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                disabled={isActive}
                                value={directive}
                                onChange={(e) => setDirective(e.target.value)}
                                placeholder="Enter Swarm Directive (e.g., 'Research and prototype a login page')..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-forge-accent disabled:opacity-50"
                                onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                            />
                            {isActive ? (
                                <button 
                                    onClick={handleStop}
                                    className="px-4 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 rounded-lg"
                                >
                                    <Pause className="w-5 h-5" />
                                </button>
                            ) : (
                                <button 
                                    onClick={handleExecute}
                                    disabled={!directive}
                                    className="px-4 bg-forge-accent hover:bg-sky-400 text-slate-900 rounded-lg disabled:opacity-50"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheHive;